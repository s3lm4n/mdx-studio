//! MDX Studio desktop shell.
//!
//! Phase 1 scope: host the React UI and expose a single read-only command. All simulation and
//! hardware semantics live behind the typed runtime boundary (mock today, WSL2 service in
//! Phase 2) and are never reachable as shell text from here.

mod app_info;

use app_info::AppInfo;

#[tauri::command]
fn get_app_info(app: tauri::AppHandle) -> AppInfo {
    AppInfo::collect(&app.package_info().version.to_string(), tauri::VERSION)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_app_info])
        .run(tauri::generate_context!())
        .expect("error while running MDX Studio");
}
