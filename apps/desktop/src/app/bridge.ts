/**
 * Desktop bridge: the only place the frontend touches Tauri. Phase 1 exposes one read-only
 * command (`get_app_info`). There is deliberately no command here that runs processes, reads
 * arbitrary files or forwards text to WSL; runtime access goes through `RuntimeClient`.
 */
export interface AppInfo {
  appVersion: string;
  shell: "tauri" | "browser";
  os: string | null;
  arch: string | null;
  tauriVersion: string | null;
}

interface RawAppInfo {
  appVersion: string;
  tauriVersion: string;
  os: string;
  arch: string;
}

function isRawAppInfo(value: unknown): value is RawAppInfo {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return ["appVersion", "tauriVersion", "os", "arch"].every(
    (key) => typeof record[key] === "string",
  );
}

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function getAppInfo(): Promise<AppInfo> {
  if (!isTauri()) {
    return {
      appVersion: __APP_VERSION__,
      shell: "browser",
      os: null,
      arch: null,
      tauriVersion: null,
    };
  }
  const { invoke } = await import("@tauri-apps/api/core");
  const raw: unknown = await invoke("get_app_info");
  if (!isRawAppInfo(raw)) {
    throw new Error("Unexpected get_app_info response from the desktop shell.");
  }
  return { ...raw, shell: "tauri" };
}
