// Git attribution policy (CLAUDE.md, "Git attribution policy"): commits must not carry
// Claude/Anthropic attribution metadata. Only precise metadata is rejected — author/committer
// identities, Co-Authored-By trailers and Claude-Session trailers. Branch names such as
// `claude/...`, file names and prose that merely mention Claude are fine.
//
// Plain Node (no dependencies, no install step) so CI and Windows hosts run it directly.

import { execFileSync } from "node:child_process";

/**
 * @typedef {object} CommitRecord
 * @property {string} sha
 * @property {string} authorName
 * @property {string} authorEmail
 * @property {string} committerName
 * @property {string} committerEmail
 * @property {string} message Raw message (subject and body).
 */

/**
 * @typedef {"author-identity" | "author-email" | "committer-identity" | "committer-email"
 *   | "co-authored-by-identity" | "co-authored-by-email" | "claude-session-trailer"} RuleId
 */

/** @typedef {{ rule: RuleId, reason: string }} Finding */

/** @typedef {{ sha: string, findings: Finding[] }} Violation */

const FIELD_COUNT = 6;
const LOG_FORMAT = ["%H", "%an", "%ae", "%cn", "%ce", "%B"].join("%x00");
const SHA = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;

/**
 * Second words that turn a name starting with "Claude" into the product rather than a person
 * ("Claude Opus 5.5", "Claude Code", "claude-3-5-sonnet"); any token containing a digit counts too.
 * A person called e.g. "Claude Dupont" is not matched.
 */
const CLAUDE_PRODUCT_WORDS = new Set([
  "ai",
  "assistant",
  "bot",
  "code",
  "fable",
  "haiku",
  "instant",
  "opus",
  "sonnet",
]);

/**
 * True when a Git identity name identifies Claude or Anthropic: exactly "Claude"/"Anthropic"
 * (case-insensitive, optionally as a GitHub App "[bot]"), any name starting with "Anthropic", or
 * "Claude" followed by a model/product designation.
 *
 * @param {string} name
 * @returns {boolean}
 */
export function identifiesClaudeOrAnthropic(name) {
  const words = name
    .trim()
    .toLowerCase()
    .split(/[\s_-]+/)
    .map((word) => word.replace(/\[bot\]$/, "").replace(/[^\p{L}\p{N}.]/gu, ""))
    .filter((word) => word !== "");
  const [first, second] = words;
  if (first === "anthropic") return true;
  if (first !== "claude") return false;
  if (second === undefined) return true;
  return CLAUDE_PRODUCT_WORDS.has(second) || /\d/.test(second);
}

/**
 * True when an email address is at anthropic.com or one of its subdomains (case-insensitive).
 *
 * @param {string} email
 * @returns {boolean}
 */
export function isAnthropicEmail(email) {
  const at = email.lastIndexOf("@");
  if (at === -1) return false;
  const domain = email
    .slice(at + 1)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.-]+$/, "")
    .replace(/\.$/, "");
  return domain === "anthropic.com" || domain.endsWith(".anthropic.com");
}

const CO_AUTHORED_BY = /^co-authored-by[ \t]*:(.*)$/i;
const CLAUDE_SESSION = /^claude-session[ \t]*:/i;
const EMAIL_TOKEN = /[^\s<>]+@[^\s<>]+/g;

/**
 * Trailer lines that carry attribution. Trailers start at column 0 (as in `git interpret-trailers`),
 * so indented lines — quoted examples, continuation lines — are not trailers themselves; a folded
 * Co-Authored-By value is unfolded.
 *
 * @param {string} message
 * @returns {Finding[]}
 */
function trailerFindings(message) {
  const lines = message.split(/\r?\n/);
  /** @type {Finding[]} */
  const findings = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const lineNumber = index + 1;
    if (CLAUDE_SESSION.test(line)) {
      findings.push({
        rule: "claude-session-trailer",
        reason: `Claude-Session trailer on message line ${lineNumber}`,
      });
      continue;
    }
    const coAuthor = CO_AUTHORED_BY.exec(line);
    if (coAuthor === null) continue;
    let value = coAuthor[1] ?? "";
    while (/^[ \t]+\S/.test(lines[index + 1] ?? "")) {
      index += 1;
      value += ` ${(lines[index] ?? "").trim()}`;
    }
    value = value.trim();
    const name = (value.split("<")[0] ?? "").trim();
    if (!name.includes("@") && identifiesClaudeOrAnthropic(name)) {
      findings.push({
        rule: "co-authored-by-identity",
        reason: `Co-Authored-By trailer on message line ${lineNumber} names ${JSON.stringify(name)}`,
      });
    }
    const anthropicEmail = (value.match(EMAIL_TOKEN) ?? []).find(isAnthropicEmail);
    if (anthropicEmail !== undefined) {
      findings.push({
        rule: "co-authored-by-email",
        reason: `Co-Authored-By trailer on message line ${lineNumber} uses ${JSON.stringify(anthropicEmail)}`,
      });
    }
  }
  return findings;
}

/**
 * Every attribution-policy finding for one commit, in a stable order.
 *
 * @param {CommitRecord} commit
 * @returns {Finding[]}
 */
export function attributionFindings(commit) {
  /** @type {Finding[]} */
  const findings = [];
  for (const role of /** @type {const} */ (["author", "committer"])) {
    const name = role === "author" ? commit.authorName : commit.committerName;
    const email = role === "author" ? commit.authorEmail : commit.committerEmail;
    if (identifiesClaudeOrAnthropic(name)) {
      findings.push({
        rule: `${role}-identity`,
        reason: `${role} name ${JSON.stringify(name)} identifies Claude/Anthropic`,
      });
    }
    if (isAnthropicEmail(email)) {
      findings.push({
        rule: `${role}-email`,
        reason: `${role} email ${JSON.stringify(email)} is an anthropic.com address`,
      });
    }
  }
  findings.push(...trailerFindings(commit.message));
  return findings;
}

/**
 * Commits that violate the policy, in input order.
 *
 * @param {readonly CommitRecord[]} commits
 * @returns {Violation[]}
 */
export function findViolations(commits) {
  return commits
    .map((commit) => ({ sha: commit.sha, findings: attributionFindings(commit) }))
    .filter((violation) => violation.findings.length > 0);
}

/**
 * Parses `git log -z --format=<LOG_FORMAT>` output: NUL-terminated records of NUL-separated
 * fields. Git refuses NUL bytes in identities and messages, so anything malformed is an error
 * (fail closed) rather than a silently skipped commit.
 *
 * @param {string} raw
 * @returns {CommitRecord[]}
 */
export function parseGitLog(raw) {
  if (raw === "") return [];
  if (!raw.endsWith("\0")) throw new Error("unexpected git log output: missing record terminator");
  const fields = raw.slice(0, -1).split("\0");
  if (fields.length % FIELD_COUNT !== 0) {
    throw new Error("unexpected git log output: field count mismatch");
  }
  /** @type {CommitRecord[]} */
  const commits = [];
  for (let offset = 0; offset < fields.length; offset += FIELD_COUNT) {
    const [sha, authorName, authorEmail, committerName, committerEmail, message] = fields.slice(
      offset,
      offset + FIELD_COUNT,
    );
    if (
      sha === undefined ||
      !SHA.test(sha) ||
      authorName === undefined ||
      authorEmail === undefined ||
      committerName === undefined ||
      committerEmail === undefined ||
      message === undefined
    ) {
      throw new Error("unexpected git log output: malformed commit record");
    }
    commits.push({ sha, authorName, authorEmail, committerName, committerEmail, message });
  }
  return commits;
}

export class UsageError extends Error {}

/**
 * Validates revision arguments. The range must be bounded — `<base>..<head>`, or a head plus at
 * least one `^<exclude>` — so commits already reachable from the base are never inspected.
 *
 * @param {readonly string[]} args
 * @returns {string[]}
 */
export function parseRevisionArgs(args) {
  if (args.length === 0) throw new UsageError("missing commit range");
  for (const arg of args) {
    if (arg === "" || arg.startsWith("-") || /[\s\p{Cc}]/u.test(arg)) {
      throw new UsageError(`invalid revision argument ${JSON.stringify(arg)}`);
    }
    if (arg.includes("...")) {
      throw new UsageError(`symmetric ranges are not supported: ${JSON.stringify(arg)}`);
    }
    if (arg.includes("..")) {
      const [base, head] = arg.split("..");
      if (base === "" || head === "") {
        throw new UsageError(`range needs both a base and a head: ${JSON.stringify(arg)}`);
      }
    }
  }
  if (!args.some((arg) => arg.includes("..") || arg.startsWith("^"))) {
    throw new UsageError("unbounded range: pass <base>..<head> or <head> ^<base>");
  }
  return [...args];
}

/**
 * @param {readonly string[]} args
 * @param {string} cwd
 * @returns {string}
 */
function git(args, cwd) {
  // No pager, no replace refs; output is parsed, never shown.
  return execFileSync("git", ["--no-pager", "--no-replace-objects", ...args], {
    cwd,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

/**
 * Reads the commits in a validated range exactly as recorded: no mailmap, no replace refs.
 *
 * @param {readonly string[]} revisions
 * @param {string} cwd
 * @returns {CommitRecord[]}
 */
export function readCommits(revisions, cwd) {
  // In a shallow clone, commits at the depth boundary look like roots, so the range would silently
  // grow into history the base already contains (or miss objects). Require full history.
  if (git(["rev-parse", "--is-shallow-repository"], cwd).trim() === "true") {
    throw new Error("shallow repository: fetch full history (actions/checkout `fetch-depth: 0`)");
  }
  const raw = git(
    [
      "log",
      "-z",
      `--format=${LOG_FORMAT}`,
      "--no-color",
      "--no-use-mailmap",
      "--no-show-signature",
      "--encoding=UTF-8",
      "--end-of-options",
      ...revisions,
      "--",
    ],
    cwd,
  );
  return parseGitLog(raw);
}

const USAGE = `Usage: node scripts/check-commit-attribution.mjs <base>..<head>
       node scripts/check-commit-attribution.mjs <head> ^<base> [^<exclude>...]

Rejects Claude/Anthropic attribution metadata (author/committer identity or anthropic.com
email, Co-Authored-By trailers, Claude-Session trailers) in the commits the range introduces.
Exit status: 0 clean, 1 policy violation, 2 usage or git error.`;

/**
 * @typedef {object} RunIO
 * @property {string} [cwd]
 * @property {(text: string) => void} [out]
 * @property {(text: string) => void} [err]
 */

/**
 * CLI entry point. Prints only SHAs and reasons, never full commit contents.
 *
 * @param {readonly string[]} argv
 * @param {RunIO} [io]
 * @returns {0 | 1 | 2}
 */
export function run(argv, io = {}) {
  const cwd = io.cwd ?? process.cwd();
  const out = io.out ?? ((text) => process.stdout.write(text));
  const err = io.err ?? ((text) => process.stderr.write(text));

  if (argv.includes("--help") || argv.includes("-h")) {
    out(`${USAGE}\n`);
    return 0;
  }

  /** @type {CommitRecord[]} */
  let commits;
  try {
    commits = readCommits(parseRevisionArgs(argv), cwd);
  } catch (error) {
    const detail =
      error instanceof Error && "stderr" in error && typeof error.stderr === "string"
        ? error.stderr.trim() || error.message
        : error instanceof Error
          ? error.message
          : String(error);
    err(`commit-attribution: ${detail}\n`);
    if (error instanceof UsageError) err(`\n${USAGE}\n`);
    return 2;
  }

  const range = argv.join(" ");
  const violations = findViolations(commits);
  if (violations.length === 0) {
    out(
      `commit-attribution: ${commits.length} commit(s) in ${range}: no Claude/Anthropic attribution metadata.\n`,
    );
    return 0;
  }
  for (const { sha, findings } of violations) {
    for (const { rule, reason } of findings) err(`${sha} ${rule}: ${reason}\n`);
  }
  err(
    `commit-attribution: ${violations.length} of ${commits.length} commit(s) in ${range} violate the Git attribution policy (CLAUDE.md).\n` +
      "Rewrite them with the repository owner's identity and without Claude/Anthropic trailers.\n",
  );
  return 1;
}
