import { describe, expect, it } from "vitest";
import {
  REPO_ROOT,
  calledNames,
  importSpecifiers,
  isSource,
  isTest,
  read,
  rel,
  textLiterals,
  walk,
  type Finding,
} from "./helpers";

/**
 * Executable form of the non-negotiable architecture rules in CLAUDE.md:
 * the frontend never constructs/executes shell or raw GROMACS commands, and the GUI reaches the
 * runtime only through the typed RuntimeClient.
 */

const PROCESS_SPEC =
  /^(node:)?(child_process|worker_threads)$|^(cross-spawn|execa|shelljs)$|^@tauri-apps\/plugin-(shell|process)$/;
const RAW_COMMAND = /\b(gmx|mdrun|grompp)\b/i;
// Bare calls (`exec(...)`). `regex.exec(...)` is a method call and is fine.
const DANGEROUS_BARE_CALLS = new Set([
  "eval",
  "Function",
  "exec",
  "execSync",
  "spawn",
  "spawnSync",
  "execFile",
  "fork",
]);
// Method calls that are dangerous regardless of receiver (e.g. `cp.spawn`, `shell.execSync`).
const DANGEROUS_METHOD_CALLS = new Set(["execSync", "spawn", "spawnSync", "execFile"]);

const inDir = (dir: string) => walk(`${REPO_ROOT}/${dir}`, isSource);

// Layers that must be free of raw command text. runtime-client/src/mock is excluded on purpose:
// it plays the backend and fabricates display-only provenance (see its tests and docs).
const COMMAND_FREE_FILES = [
  ...inDir("apps/desktop/src"),
  ...inDir("packages/ui/src"),
  ...inDir("packages/simulation-model/src"),
  ...inDir("packages/protocol/src"),
  ...inDir("packages/runtime-client/src").filter((f) => !rel(f).includes("/src/mock/")),
].filter((f) => !isTest(f));

const NO_PROCESS_FILES = [
  ...inDir("apps/desktop/src"),
  ...inDir("packages/ui/src"),
  ...inDir("packages/simulation-model/src"),
  ...inDir("packages/protocol/src"),
  ...inDir("packages/runtime-client/src"),
].filter((f) => !isTest(f));

export function findProcessUse(source: string, file: string): Finding[] {
  const findings: Finding[] = [];
  for (const { spec, line } of importSpecifiers(source, file)) {
    if (PROCESS_SPEC.test(spec)) findings.push({ file, line, text: `import of '${spec}'` });
  }
  for (const { name, line, method } of calledNames(source, file)) {
    const dangerous = method ? DANGEROUS_METHOD_CALLS.has(name) : DANGEROUS_BARE_CALLS.has(name);
    if (dangerous) findings.push({ file, line, text: `call to ${name}()` });
  }
  return findings;
}

export function findRawCommandText(source: string, file: string): Finding[] {
  return textLiterals(source, file)
    .filter(({ text }) => RAW_COMMAND.test(text))
    .map(({ text, line }) => ({ file, line, text: text.trim().slice(0, 60) }));
}

describe("scanner self-checks (the guards must be able to fail)", () => {
  it("flags process imports and dangerous calls", () => {
    const bad = `import { exec } from "node:child_process";\nexec("ls");\ncp.spawn("ls");\nconst f = new Function("return 1");\nawait import("@tauri-apps/plugin-shell");`;
    const findings = findProcessUse(bad, "x.ts").map((f) => f.text);
    expect(findings).toEqual(
      expect.arrayContaining([
        "import of 'node:child_process'",
        "import of '@tauri-apps/plugin-shell'",
        "call to exec()",
        "call to spawn()",
        "call to Function()",
      ]),
    );
  });

  it("does not mistake RegExp.exec for process execution", () => {
    expect(findProcessUse("const m = /a/.exec('a'); pattern.exec(text);", "x.ts")).toEqual([]);
  });

  it("flags raw GROMACS command text in strings, templates and JSX", () => {
    const bad =
      'const a = "gmx mdrun -s x.tpr";\nconst b = `run ${1} grompp`;\nconst c = <p>gmx grompp</p>;';
    expect(findRawCommandText(bad, "x.tsx")).toHaveLength(3);
  });

  it("ignores comments and identifiers that merely contain the words", () => {
    const fine =
      '// gmx mdrun is built by the runtime\nconst gmxVersion = "GROMACS";\n/* grompp */';
    expect(findRawCommandText(fine, "x.ts")).toEqual([]);
  });
});

describe("frontend and domain layers", () => {
  it("scans a meaningful set of files", () => {
    expect(COMMAND_FREE_FILES.length).toBeGreaterThan(40);
    expect(NO_PROCESS_FILES.length).toBeGreaterThan(COMMAND_FREE_FILES.length);
  });

  it("never import process/shell modules or call eval/exec/spawn", () => {
    const findings = NO_PROCESS_FILES.flatMap((file) => findProcessUse(read(file), file));
    expect(findings.map((f) => `${rel(f.file)}:${f.line} ${f.text}`)).toEqual([]);
  });

  it("never contain raw GROMACS command text", () => {
    const findings = COMMAND_FREE_FILES.flatMap((file) => findRawCommandText(read(file), file));
    expect(findings.map((f) => `${rel(f.file)}:${f.line} ${f.text}`)).toEqual([]);
  });

  it("only the bridge touches @tauri-apps, and only the core invoke API", () => {
    const offenders: string[] = [];
    for (const file of NO_PROCESS_FILES) {
      for (const { spec, line } of importSpecifiers(read(file), file)) {
        if (!spec.startsWith("@tauri-apps/")) continue;
        const ok =
          rel(file) === "apps/desktop/src/app/bridge.ts" && spec === "@tauri-apps/api/core";
        if (!ok) offenders.push(`${rel(file)}:${line} ${spec}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the bridge invokes exactly one command", () => {
    const source = read(`${REPO_ROOT}/apps/desktop/src/app/bridge.ts`);
    const invoked = [...source.matchAll(/\binvoke\s*(?:<[^>]*>)?\(\s*"([^"]+)"/g)].map((m) => m[1]);
    expect(invoked).toEqual(["get_app_info"]);
  });

  it("views and the ui package do not recompute runtime-owned policy", () => {
    const policy = [
      "transition",
      "canTransition",
      "availableEvents",
      "isTerminal",
      "reachableStates",
      "allowedJobActions",
      "deviceAcceptsJobs",
      "JOB_MACHINE",
    ];
    const offenders: string[] = [];
    for (const file of [...inDir("apps/desktop/src"), ...inDir("packages/ui/src")].filter(
      (f) => !isTest(f),
    )) {
      const source = read(file);
      for (const name of policy) {
        if (new RegExp(`\\b${name}\\b`).test(source)) offenders.push(`${rel(file)} uses ${name}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("mock runtime honesty", () => {
  const mockFiles = walk(`${REPO_ROOT}/packages/runtime-client/src/mock`, isSource);

  it("never emits measured data: no provider can claim origin 'measured'", () => {
    const offenders = mockFiles.flatMap((file) =>
      textLiterals(read(file), file)
        .filter(({ text }) => text === "measured")
        .map(({ line }) => `${rel(file)}:${line}`),
    );
    expect(offenders).toEqual([]);
  });

  it("does not touch processes, files or the network", () => {
    const offenders = mockFiles.flatMap((file) =>
      importSpecifiers(read(file), file)
        .filter(({ spec }) => /^(node:|fs$|path$|os$|net$|http|child_process)/.test(spec))
        .map(({ spec }) => `${rel(file)} imports ${spec}`),
    );
    expect(offenders).toEqual([]);
    for (const file of mockFiles) {
      const calls = calledNames(read(file), file).map((c) => c.name);
      expect(calls, rel(file)).not.toContain("fetch");
      expect(calls, rel(file)).not.toContain("XMLHttpRequest");
    }
  });
});
