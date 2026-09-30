//! Read-only application information exposed to the webview.
//!
//! This module is intentionally free of Tauri types so it stays trivially testable.

use serde::Serialize;

/// Shape returned by the `get_app_info` command. Field names are part of the desktop bridge
/// contract and are validated on the TypeScript side (`apps/desktop/src/app/bridge.ts`).
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    pub app_version: String,
    pub tauri_version: String,
    pub os: String,
    pub arch: String,
}

impl AppInfo {
    pub fn collect(app_version: &str, tauri_version: &str) -> Self {
        Self {
            app_version: app_version.to_owned(),
            tauri_version: tauri_version.to_owned(),
            os: std::env::consts::OS.to_owned(),
            arch: std::env::consts::ARCH.to_owned(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn serializes_with_the_camel_case_contract_keys_only() {
        let info = AppInfo::collect("1.2.3", "2.0.0");
        let value = serde_json::to_value(&info).expect("serializable");
        let mut keys: Vec<&str> = value
            .as_object()
            .expect("object")
            .keys()
            .map(String::as_str)
            .collect();
        keys.sort_unstable();
        assert_eq!(keys, ["appVersion", "arch", "os", "tauriVersion"]);
        assert_eq!(value["appVersion"], "1.2.3");
        assert_eq!(value["tauriVersion"], "2.0.0");
    }

    #[test]
    fn reports_the_host_platform() {
        let info = AppInfo::collect("0.0.0", "2.0.0");
        assert_eq!(info.os, std::env::consts::OS);
        assert_eq!(info.arch, std::env::consts::ARCH);
        assert!(!info.os.is_empty() && !info.arch.is_empty());
    }
}
