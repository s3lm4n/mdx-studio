import { describe, expect, it } from "vitest";
import { REPO_ROOT, isSource, read, rel, walk } from "./helpers";

const TAURI = `${REPO_ROOT}/apps/desktop/src-tauri`;

interface Capability {
  identifier: string;
  windows: string[];
  permissions: (string | { identifier: string })[];
}

describe("Tauri shell least-privilege", () => {
  it("grants the main window only core defaults plus the single read-only command", () => {
    const capability = JSON.parse(read(`${TAURI}/capabilities/default.json`)) as Capability;
    expect(capability.windows).toEqual(["main"]);
    expect(capability.permissions).toEqual(["core:default", "allow-get-app-info"]);
  });

  it("has exactly one capability file (new ones must be reviewed)", () => {
    const files = walk(`${TAURI}/capabilities`, () => true).map(rel);
    expect(files).toEqual(["apps/desktop/src-tauri/capabilities/default.json"]);
  });

  it("registers exactly one app command, in both the manifest and the handler", () => {
    expect(read(`${TAURI}/build.rs`)).toMatch(/\.commands\(&\["get_app_info"\]\)/);
    expect(read(`${TAURI}/src/lib.rs`)).toMatch(/generate_handler!\[get_app_info\]/);
  });

  it("depends on no Tauri plugins and only the expected crates", () => {
    const cargo = read(`${TAURI}/Cargo.toml`);
    expect(cargo).not.toMatch(/tauri-plugin/);
    const deps = cargo.split("[dependencies]")[1]?.split("[dev-dependencies]")[0] ?? "";
    const names = [...deps.matchAll(/^([a-z0-9_-]+)\s*=/gm)].map((m) => m[1]);
    expect(names).toEqual(["tauri", "serde"]);
  });

  it("contains no process spawning or plugin use in Rust sources", () => {
    const offenders = walk(`${TAURI}/src`, (f) => f.endsWith(".rs"))
      .filter((file) => /std::process|Command::new|tokio::process|tauri_plugin/.test(read(file)))
      .map(rel);
    expect(offenders).toEqual([]);
  });

  it("ships a restrictive CSP with no eval and no remote origins", () => {
    const conf = JSON.parse(read(`${TAURI}/tauri.conf.json`)) as {
      app: {
        withGlobalTauri: boolean;
        security: { csp: string; devCsp: string; assetProtocol?: unknown };
      };
    };
    const { csp, devCsp } = conf.app.security;
    expect(conf.app.withGlobalTauri).toBe(false);
    expect(conf.app.security.assetProtocol).toBeUndefined();
    for (const policy of [csp, devCsp]) {
      expect(policy).toContain("default-src 'self'");
      expect(policy).not.toContain("unsafe-eval");
      expect(policy).not.toMatch(/https?:\/\/(?!ipc\.localhost|127\.0\.0\.1)/);
      expect(policy).not.toContain("*");
    }
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
  });

  it("the TypeScript side scans clean for the same command surface", () => {
    const sources = walk(`${REPO_ROOT}/apps/desktop/src`, isSource).map(read).join("\n");
    expect(sources).not.toMatch(/plugin-shell|plugin-process|plugin-fs/);
  });
});
