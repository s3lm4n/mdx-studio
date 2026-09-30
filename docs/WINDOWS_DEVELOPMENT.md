# Windows 11 + WSL2 Development Notes

MDX Studio deliberately spans two execution domains:

- Windows 11: Tauri desktop application, GUI, user interaction.
- WSL2/Linux: GROMACS and the MDX runtime service.

## Recommended prerequisites

Windows:
- Git
- Node.js LTS
- pnpm
- Rust toolchain (`rustup`, `cargo`)
- Tauri 2 prerequisites / WebView2
- WSL2

WSL:
- Python 3 (initial runtime-service option)
- GROMACS when Phase 3 begins
- normal Linux build/debug tooling

## Boundary rule

Do not make the desktop application invoke arbitrary WSL shell text supplied by React. Desktop code should call typed Tauri/application-service methods, which call a typed runtime client, which talks to the WSL runtime service.

## Paths

Never commit absolute paths such as `C:\Users\...` or `/home/<user>/...`. Use configurable project/workspace locations and normalize path ownership explicitly at the Windows↔WSL boundary.
