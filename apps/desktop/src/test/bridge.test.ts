import { afterEach, describe, expect, it, vi } from "vitest";

const invoke = vi.fn<(command: string) => Promise<unknown>>();
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

afterEach(() => {
  delete (window as unknown as Record<string, unknown>)["__TAURI_INTERNALS__"];
  invoke.mockReset();
});

describe("desktop bridge", () => {
  it("falls back to browser info and never calls Tauri outside the desktop shell", async () => {
    const { getAppInfo, isTauri } = await import("../app/bridge");
    expect(isTauri()).toBe(false);
    await expect(getAppInfo()).resolves.toEqual({
      appVersion: "0.0.0-test",
      shell: "browser",
      os: null,
      arch: null,
      tauriVersion: null,
    });
    expect(invoke).not.toHaveBeenCalled();
  });

  it("calls only the read-only get_app_info command inside Tauri", async () => {
    (window as unknown as Record<string, unknown>)["__TAURI_INTERNALS__"] = {};
    invoke.mockResolvedValue({
      appVersion: "1.2.3",
      tauriVersion: "2.0.0",
      os: "windows",
      arch: "x86_64",
    });
    const { getAppInfo } = await import("../app/bridge");
    await expect(getAppInfo()).resolves.toEqual({
      appVersion: "1.2.3",
      tauriVersion: "2.0.0",
      os: "windows",
      arch: "x86_64",
      shell: "tauri",
    });
    expect(invoke.mock.calls).toEqual([["get_app_info"]]);
  });

  it("rejects malformed responses from the shell", async () => {
    (window as unknown as Record<string, unknown>)["__TAURI_INTERNALS__"] = {};
    invoke.mockResolvedValue({ appVersion: 1 });
    const { getAppInfo } = await import("../app/bridge");
    await expect(getAppInfo()).rejects.toThrow(/Unexpected get_app_info response/);
  });
});
