import { describe, expect, it } from "vitest";
import { REPO_ROOT, read, rel, walk } from "./helpers";

const TEXT = /\.(ts|tsx|js|mjs|json|css|html|rs|toml|yml|yaml|ps1|sh|py)$/;
const NOT_GENERATED = (file: string) => !/(Cargo\.lock|pnpm-lock\.yaml)$/.test(file);

// Mirrors .github/workflows/foundation.yml (which excludes markdown and itself).
const ABSOLUTE_PATH = /C:\\Users\\|\/home\/[A-Za-z0-9._-]+\//;
const IMPLEMENTATION_ROOTS = ["apps", "services", "packages", "scripts", "tests"];

const SECRET_PATTERNS: [string, RegExp][] = [
  ["private key block", /-----BEGIN (?:RSA |EC |OPENSSH |DSA |)PRIVATE KEY-----/],
  ["AWS access key id", /\bAKIA[0-9A-Z]{16}\b/],
  ["GitHub token", /\bgh[pousr]_[A-Za-z0-9]{36,}\b/],
  ["Slack token", /\bxox[baprs]-[A-Za-z0-9-]{10,}/],
  ["API secret key", /\bsk-[A-Za-z0-9]{32,}\b/],
];

describe("repository hygiene", () => {
  it("contains no machine-specific absolute paths in implementation files", () => {
    const offenders = IMPLEMENTATION_ROOTS.flatMap((root) =>
      walk(`${REPO_ROOT}/${root}`, (f) => TEXT.test(f) && NOT_GENERATED(f)),
    )
      .filter((file) => !rel(file).startsWith("tests/architecture/repo-hygiene"))
      .filter((file) => ABSOLUTE_PATH.test(read(file)))
      .map(rel);
    expect(offenders).toEqual([]);
  });

  it("contains no credentials or private keys", () => {
    const files = walk(REPO_ROOT, (f) => TEXT.test(f) || f.endsWith(".md")).filter(NOT_GENERATED);
    const offenders = files.flatMap((file) => {
      const text = read(file);
      return SECRET_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(
        ([name]) => `${rel(file)}: ${name}`,
      );
    });
    expect(offenders).toEqual([]);
  });

  it("keeps .env files out of version control", () => {
    const ignore = read(`${REPO_ROOT}/.gitignore`);
    expect(ignore).toMatch(/^\.env$/m);
    expect(ignore).toMatch(/^\*\.pem$/m);
  });
});

describe("honest status documentation", () => {
  it("README carries the required hardware disclosure", () => {
    expect(read(`${REPO_ROOT}/README.md`)).toContain(
      "MDX hardware integration is not yet implemented. Current MDX telemetry is simulated.",
    );
  });

  it("README covers every section the brief requires", () => {
    const readme = read(`${REPO_ROOT}/README.md`);
    for (const heading of [
      /^#+ .*What MDX Studio is/im,
      /^#+ .*Current status/im,
      /^#+ .*Architecture/im,
      /^#+ .*(Run|Running).*development/im,
      /^#+ .*(Project|Repository) (structure|layout)/im,
      /^#+ .*(Current )?limitations/im,
      /^#+ .*Roadmap/im,
    ]) {
      expect(readme, String(heading)).toMatch(heading);
    }
  });
});
