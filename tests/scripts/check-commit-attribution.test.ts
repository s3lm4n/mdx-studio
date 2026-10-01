import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  attributionFindings,
  findViolations,
  identifiesClaudeOrAnthropic,
  isAnthropicEmail,
  parseGitLog,
  parseRevisionArgs,
  run,
  UsageError,
} from "../../scripts/lib/commit-attribution.mjs";
import { REPO_ROOT, read } from "../architecture/helpers";

interface Ident {
  name: string;
  email: string;
}

const OWNER: Ident = {
  name: "Selman Ali Dokumacı",
  email: "52416901+s3lm4n@users.noreply.github.com",
};
const GITHUB: Ident = { name: "GitHub", email: "noreply@github.com" };
const CLAUDE: Ident = { name: "Claude", email: "noreply@anthropic.com" };
const SHA = "0123456789abcdef0123456789abcdef01234567";

function commit(message: string, author: Ident = OWNER, committer: Ident = author) {
  return {
    sha: SHA,
    authorName: author.name,
    authorEmail: author.email,
    committerName: committer.name,
    committerEmail: committer.email,
    message,
  };
}

const rules = (...args: Parameters<typeof commit>) =>
  attributionFindings(commit(...args)).map((finding) => finding.rule);

describe("identity predicates", () => {
  it.each([
    "Claude",
    "claude",
    " CLAUDE ",
    "claude[bot]",
    "Anthropic",
    "Anthropic PBC",
    "Claude Opus 5.5",
    "Claude Sonnet 4.5",
    "Claude 3.5 Sonnet",
    "Claude Code",
    "claude-code",
    "claude-opus-4-5",
  ])("%j identifies Claude/Anthropic", (name) => {
    expect(identifiesClaudeOrAnthropic(name)).toBe(true);
  });

  it.each([
    OWNER.name,
    "GitHub",
    "Claude Dupont",
    "Claude-Henri Rivière",
    "Jean-Claude Van Damme",
    "Claudette",
    "",
  ])("%j is not a Claude/Anthropic identity", (name) => {
    expect(identifiesClaudeOrAnthropic(name)).toBe(false);
  });

  it.each(["noreply@anthropic.com", "NoReply@Anthropic.COM", "bot@mail.anthropic.com"])(
    "%j is an anthropic.com address",
    (email) => {
      expect(isAnthropicEmail(email)).toBe(true);
    },
  );

  it.each([
    OWNER.email,
    GITHUB.email,
    "user@notanthropic.com",
    "user@anthropic.com.example.org",
    "anthropic.com",
    "",
  ])("%j is not an anthropic.com address", (email) => {
    expect(isAnthropicEmail(email)).toBe(false);
  });
});

describe("attribution policy: allowed", () => {
  it("accepts the repository owner's identity", () => {
    expect(rules("feat: establish MDX Studio Phase 1 baseline\n")).toEqual([]);
  });

  it("accepts ordinary commit prose that mentions Claude", () => {
    const message =
      "docs: describe how Claude Code reads CLAUDE.md\n\n" +
      "Claude drafted the first brief. CI now rejects Co-Authored-By trailers that name Claude\n" +
      "and Claude-Session lines, but not prose like this.\n";
    expect(rules(message)).toEqual([]);
  });

  it("accepts merge messages naming a claude/ source branch", () => {
    expect(
      rules(
        "Merge pull request #2 from s3lm4n/claude/loving-allen-9snykg\n\n" +
          "feat: Patina UI foundation and Windows stabilization\n",
        OWNER,
        GITHUB,
      ),
    ).toEqual([]);
    expect(rules("Merge branch 'claude/loving-allen-9snykg' into main\n")).toEqual([]);
  });

  it("accepts co-author trailers for people, including a person named Claude", () => {
    const message =
      "feat: pair-programmed change\n\n" +
      `Co-Authored-By: ${OWNER.name} <${OWNER.email}>\n` +
      "Co-Authored-By: Claude Dupont <claude.dupont@example.org>\n";
    expect(rules(message)).toEqual([]);
  });

  it("ignores indented, quoted examples (not trailers)", () => {
    const message =
      "docs: document the attribution check\n\nRejected trailers look like:\n\n" +
      "    Co-Authored-By: Claude <noreply@anthropic.com>\n" +
      "    Claude-Session: https://claude.ai/code/session_example\n";
    expect(rules(message)).toEqual([]);
  });
});

describe("attribution policy: rejected", () => {
  it("rejects author Claude <noreply@anthropic.com>", () => {
    expect(rules("feat: x\n", CLAUDE, OWNER)).toEqual(["author-identity", "author-email"]);
  });

  it("rejects committer Claude", () => {
    expect(rules("feat: x\n", OWNER, { name: "Claude", email: "claude@example.com" })).toEqual([
      "committer-identity",
    ]);
  });

  it("rejects any author/committer email under anthropic.com", () => {
    expect(rules("feat: x\n", { name: "Jane Doe", email: "jane@anthropic.com" }, OWNER)).toEqual([
      "author-email",
    ]);
    expect(rules("feat: x\n", OWNER, { name: "Release", email: "Bot@Mail.Anthropic.com" })).toEqual(
      ["committer-email"],
    );
  });

  it.each([
    [
      "Co-Authored-By: Claude <noreply@anthropic.com>",
      ["co-authored-by-identity", "co-authored-by-email"],
    ],
    [
      "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>",
      ["co-authored-by-identity", "co-authored-by-email"],
    ],
    ["co-authored-by: claude", ["co-authored-by-identity"]],
    ["Co-Authored-By: Claude Code <assistant@example.com>", ["co-authored-by-identity"]],
    ["Co-authored-by: Build Helper <helper@anthropic.com>", ["co-authored-by-email"]],
    ["Co-Authored-By: noreply@anthropic.com", ["co-authored-by-email"]],
    ["Co-Authored-By: Helper\n  <helper@anthropic.com>", ["co-authored-by-email"]],
    ["Claude-Session: https://claude.ai/code/session_example", ["claude-session-trailer"]],
    ["claude-session:session_example", ["claude-session-trailer"]],
  ])("rejects trailer %j", (trailer, expected) => {
    expect(rules(`feat: x\n\nBody text.\n\n${trailer}\n`)).toEqual(expected);
  });

  it("detects trailers in CRLF messages", () => {
    expect(rules("feat: x\r\n\r\nCo-Authored-By: Claude <noreply@anthropic.com>\r\n")).toEqual([
      "co-authored-by-identity",
      "co-authored-by-email",
    ]);
  });

  it("reports every rule a historical Claude commit breaks, without dumping its contents", () => {
    const findings = attributionFindings(
      commit(
        "feat: Patina shell\n\nLong description.\n\n" +
          "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\n" +
          "Claude-Session: https://claude.ai/code/session_example\n",
        CLAUDE,
      ),
    );
    expect(findings.map((finding) => finding.rule)).toEqual([
      "author-identity",
      "author-email",
      "committer-identity",
      "committer-email",
      "co-authored-by-identity",
      "co-authored-by-email",
      "claude-session-trailer",
    ]);
    const reasons = findings.map((finding) => finding.reason).join("\n");
    expect(reasons).toContain("message line 5");
    expect(reasons).not.toContain("session_example");
    expect(reasons).not.toContain("Long description");
  });

  it("returns only offending commits, keyed by SHA", () => {
    const bad = { ...commit("feat: x\n", CLAUDE), sha: "f".repeat(40) };
    expect(findViolations([commit("feat: ok\n"), bad]).map((v) => v.sha)).toEqual([bad.sha]);
  });
});

describe("git log parsing", () => {
  it("parses NUL-terminated records, including an empty message", () => {
    const raw =
      [SHA, OWNER.name, OWNER.email, GITHUB.name, GITHUB.email, "subject\n\nbody\n"].join("\0") +
      "\0" +
      ["f".repeat(40), "A", "a@example.com", "C", "c@example.com", ""].join("\0") +
      "\0";
    expect(parseGitLog(raw)).toEqual([
      {
        sha: SHA,
        authorName: OWNER.name,
        authorEmail: OWNER.email,
        committerName: GITHUB.name,
        committerEmail: GITHUB.email,
        message: "subject\n\nbody\n",
      },
      {
        sha: "f".repeat(40),
        authorName: "A",
        authorEmail: "a@example.com",
        committerName: "C",
        committerEmail: "c@example.com",
        message: "",
      },
    ]);
    expect(parseGitLog("")).toEqual([]);
  });

  it("fails closed on malformed output", () => {
    expect(() => parseGitLog(`${SHA}\0A\0a@x\0C\0c@x\0msg`)).toThrow(/terminator/);
    expect(() => parseGitLog(`${SHA}\0A\0a@x\0C\0msg\0`)).toThrow(/field count/);
    expect(() => parseGitLog("not-a-sha\0A\0a@x\0C\0c@x\0msg\0")).toThrow(/malformed/);
  });
});

describe("revision arguments", () => {
  it.each([
    { args: ["base..head"] },
    { args: ["HEAD", "^main"] },
    { args: ["main..claude/loving-allen-9snykg"] },
  ])("accepts bounded range $args", ({ args }) => {
    expect(parseRevisionArgs(args)).toEqual(args);
  });

  it.each([
    { args: [] },
    { args: ["HEAD"] },
    { args: ["--all"] },
    { args: ["a...b"] },
    { args: ["..b"] },
    { args: ["a.."] },
    { args: ["a b"] },
    { args: [""] },
  ])("rejects $args", ({ args }) => {
    expect(() => parseRevisionArgs(args)).toThrow(UsageError);
  });
});

describe("checking a real git range", { timeout: 60_000 }, () => {
  let tmp = "";
  let repo = "";
  const savedEnv = new Map<string, string | undefined>();
  const sha = {
    tree: "",
    old: "",
    base: "",
    docs: "",
    topic: "",
    merge: "",
    coAuthored: "",
    claudeAuthored: "",
  };

  // Throwaway repository: identities come from per-command environment variables; no Git config
  // (repository or global) is written, and the user's global/system config is not read.
  const git = (
    args: string[],
    options: { cwd?: string; input?: string; env?: Record<string, string> } = {},
  ) =>
    execFileSync("git", args, {
      cwd: options.cwd ?? repo,
      input: options.input ?? "",
      encoding: "utf8",
      env: { ...process.env, ...options.env },
    }).trim();

  const commitTree = (message: string, parents: string[], author = OWNER, committer = author) =>
    git(["commit-tree", sha.tree, ...parents.flatMap((parent) => ["-p", parent])], {
      input: message,
      env: {
        GIT_AUTHOR_NAME: author.name,
        GIT_AUTHOR_EMAIL: author.email,
        GIT_AUTHOR_DATE: "2026-01-01T00:00:00Z",
        GIT_COMMITTER_NAME: committer.name,
        GIT_COMMITTER_EMAIL: committer.email,
        GIT_COMMITTER_DATE: "2026-01-01T00:00:00Z",
      },
    });

  const check = (...argv: string[]) => {
    let out = "";
    let err = "";
    const code = run(argv, {
      cwd: repo,
      out: (text) => (out += text),
      err: (text) => (err += text),
    });
    const reported = [
      ...new Set(err.split("\n").flatMap((line) => /^[0-9a-f]{40}(?= )/.exec(line) ?? [])),
    ].sort();
    return { code, out, err, reported };
  };

  beforeAll(() => {
    // Keep an enclosing hook's GIT_DIR/GIT_WORK_TREE etc. from redirecting git to this checkout.
    for (const key of Object.keys(process.env)) {
      if (key.toUpperCase().startsWith("GIT_")) {
        savedEnv.set(key, process.env[key]);
        Reflect.deleteProperty(process.env, key);
      }
    }
    tmp = mkdtempSync(join(tmpdir(), "mdx-attribution-"));
    repo = join(tmp, "repo");
    const globalConfig = join(tmp, "empty.gitconfig");
    writeFileSync(globalConfig, "");
    for (const [key, value] of [
      ["GIT_CONFIG_NOSYSTEM", "1"],
      ["GIT_CONFIG_GLOBAL", globalConfig],
    ] as const) {
      if (!savedEnv.has(key)) savedEnv.set(key, undefined);
      process.env[key] = value;
    }

    git(["-c", "init.defaultBranch=main", "init", "-q", repo], { cwd: tmp });
    sha.tree = git(["mktree"]);
    // Pre-existing history that still carries attribution: reachable from the base, never inspected.
    sha.old = commitTree(
      "feat: pre-rewrite history\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\n" +
        "Claude-Session: https://claude.ai/code/session_example\n",
      [],
      CLAUDE,
    );
    sha.base = commitTree("chore: baseline\n", [sha.old]);
    sha.docs = commitTree("docs: explain what Claude Code changed\n", [sha.base]);
    sha.topic = commitTree("feat: Patina polish\n", [sha.base]);
    sha.merge = commitTree(
      "Merge pull request #2 from s3lm4n/claude/loving-allen-9snykg\n",
      [sha.docs, sha.topic],
      OWNER,
      GITHUB,
    );
    sha.coAuthored = commitTree(
      "feat: assisted change\n\nCo-Authored-By: Claude <noreply@anthropic.com>\n",
      [sha.merge],
    );
    sha.claudeAuthored = commitTree("fix: follow-up\n", [sha.coAuthored], CLAUDE, OWNER);
    git(["update-ref", "refs/heads/main", sha.base]);
    git(["update-ref", "refs/heads/claude/loving-allen-9snykg", sha.topic]);
  }, 60_000);

  afterAll(() => {
    for (const [key, value] of savedEnv) {
      if (value === undefined) Reflect.deleteProperty(process.env, key);
      else process.env[key] = value;
    }
    // Best effort: Git writes objects read-only, which Windows may refuse to delete.
    try {
      if (tmp !== "") rmSync(tmp, { recursive: true, force: true, maxRetries: 3 });
    } catch {
      // Leftovers in the OS temp directory are harmless.
    }
  });

  it("passes clean commits, including a merge from a claude/ branch", () => {
    const result = check(`${sha.base}..${sha.merge}`);
    expect(result.code).toBe(0);
    expect(result.out).toContain("3 commit(s)");
    expect(result.err).toBe("");
  });

  it("accepts branch names containing claude/ as revisions", () => {
    expect(check("main..claude/loving-allen-9snykg").code).toBe(0);
  });

  it("reports only the offending commits the range introduces", () => {
    const result = check(`${sha.base}..${sha.claudeAuthored}`);
    expect(result.code).toBe(1);
    expect(result.reported).toEqual([sha.claudeAuthored, sha.coAuthored].sort());
    expect(result.err).toContain(`${sha.coAuthored} co-authored-by-identity:`);
    expect(result.err).toContain(`${sha.claudeAuthored} author-email:`);
    expect(result.err).not.toContain(sha.old);
    expect(check(sha.claudeAuthored, `^${sha.base}`).reported).toEqual(result.reported);
  });

  it("exits 2 on unknown revisions and unbounded ranges", () => {
    expect(check("does-not-exist..main").code).toBe(2);
    expect(check("main").code).toBe(2);
  });

  it("refuses shallow clones instead of widening the range", () => {
    const shallow = join(tmp, "shallow");
    git(["clone", "-q", "--depth", "1", pathToFileURL(repo).href, shallow], { cwd: tmp });
    let err = "";
    const code = run(["HEAD..HEAD"], {
      cwd: shallow,
      out: () => undefined,
      err: (t) => (err += t),
    });
    expect(code).toBe(2);
    expect(err).toContain("shallow repository");
  });

  it("runs as a CLI with policy exit codes", () => {
    const cli = join(REPO_ROOT, "scripts", "check-commit-attribution.mjs");
    const node = (range: string) =>
      spawnSync(process.execPath, [cli, range], { cwd: repo, encoding: "utf8" });
    expect(node(`${sha.base}..${sha.merge}`).status).toBe(0);
    const failing = node(`${sha.merge}..${sha.coAuthored}`);
    expect(failing.status).toBe(1);
    expect(failing.stderr).toContain(sha.coAuthored);
  });
});

describe("CI wiring", () => {
  const workflow = read(`${REPO_ROOT}/.github/workflows/foundation.yml`);
  const job = /^ {2}commit-attribution:\n(?: {4}.*\n|\n)+/m.exec(workflow)?.[0] ?? "";

  it("runs the checker on the commits each push or pull request introduces", () => {
    expect(job).toContain("fetch-depth: 0");
    expect(job).toContain("github.event.pull_request.base.sha");
    expect(job).toContain("github.event.pull_request.head.sha");
    expect(job).toContain("github.event.before");
    expect(job).toContain("node scripts/check-commit-attribution.mjs");
  });

  it("is documented in CLAUDE.md", () => {
    const contract = read(`${REPO_ROOT}/CLAUDE.md`);
    expect(contract).toMatch(/^## Git attribution policy$/m);
    expect(contract).toContain("scripts/check-commit-attribution.mjs");
  });
});
