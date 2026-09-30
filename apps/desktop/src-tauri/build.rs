fn main() {
    // Every command the webview may call must be listed here AND granted in
    // `capabilities/`. Phase 1 exposes exactly one read-only command. There is deliberately no
    // command that spawns processes, reads arbitrary files or forwards text to WSL: runtime
    // access is a typed client concern, not a shell one.
    tauri_build::try_build(
        tauri_build::Attributes::new()
            .app_manifest(tauri_build::AppManifest::new().commands(&["get_app_info"])),
    )
    .expect("failed to run tauri-build");
}
