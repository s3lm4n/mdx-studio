# Runtime Service

WSL2/Linux-side service for GROMACS orchestration and future MDX integration.

**Status: Phase 2A-1 implemented.** The standalone service reports its health and version, performs
real GROMACS discovery, and explicitly reports that MDX device integration remains simulated. It is
not connected to the desktop yet.

## Install in Ubuntu WSL

Use Python 3.12 and keep the local environment at `services/runtime/.venv`. For Ubuntu's standard
library `venv` method, install the matching OS package before creating the environment:

```bash
sudo apt install python3.12-venv
cd services/runtime # from the repository root mounted in WSL
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -e '.[dev]'
```

Verification used Python 3.12.3 with `uv` to create `.venv` because `python3.12-venv` was not
installed on the verification machine. With `uv` already installed, the alternative from the
repository root is:

```bash
cd services/runtime
uv venv --python python3.12 .venv
uv pip install --python .venv/bin/python -e '.[dev]'
source .venv/bin/activate
```

`uv` is an optional environment setup tool, not a runtime dependency. Architecture scans skip
`.venv` directories; ordinary source directories, including those named `venv`, are traversed.

## Verify

```bash
python -m pytest
ruff format --check .
ruff check .
mypy
```

CI runs these checks in the `python-runtime` job of `.github/workflows/foundation.yml`.

The Python fixtures under `tests/fixtures` are parsed by the TypeScript Zod schemas during
`pnpm check` from the repository root. Parsed values must deep-equal the raw fixtures, so unknown
top-level and nested fields fail conformance; fixture protocol versions must match `PROTOCOL_VERSION`.

Ruff enables the security (`S`) rules. Only `S101` is excluded for `tests/test_*.py`, where pytest
assertions are intentional; no security rules are suppressed in runtime source. Provider tests
check the exact argument list, `shell=False`, and finite timeout. A focused source guard also keeps
the injected discovery runner restricted to `[str(selected), "--version"]` with `shell=False`.

## Discover GROMACS

Inspect discovery without starting the server:

```bash
python -m mdx_runtime inspect
```

Discovery is deterministic and uses this precedence:

1. `MDX_GROMACS_BIN`, whenever the variable is present in the runtime environment. It must be an
   absolute path.
2. Only when `MDX_GROMACS_BIN` is absent: the exact result of `shutil.which("gmx")`, anchored to an
   absolute path before execution.
3. Otherwise, GROMACS is reported as not detected.

An invalid explicit override, including an empty or whitespace-only value and any relative path
such as `gmx` or `./gmx`, is reported as invalid and does not fall back to `PATH`. Unset the
variable to use `PATH` discovery. The selected path must exist, be a regular file, and be
executable; the same absolute path that was validated is executed. Discovery invokes only
`[binary, "--version"]`, without a shell, and applies a finite timeout. The candidate is reported
as GROMACS only if its output contains a `GROMACS version:` line; other metadata is optional and
reported as `null` when absent. No conventional directory probing or version-based preference is
implemented.

To select a particular runtime installation:

```bash
MDX_GROMACS_BIN=/path/to/gmx python -m mdx_runtime inspect
```

## Start the service

```bash
python -m mdx_runtime serve
```

Running `python -m mdx_runtime` without a subcommand also starts the service. It binds to
`127.0.0.1:8765` by default; only the port can be changed with `MDX_RUNTIME_PORT`. The discovery
timeout can be changed with `MDX_DISCOVERY_TIMEOUT_SECONDS`, which must be a finite number greater
than zero. Invalid configuration values stop the process with an error instead of falling back to a
default.

Current read-only endpoints:

- `GET /health` — service health, protocol version, and runtime version. Service health does not
  depend on whether GROMACS is installed.
- `GET /capabilities` — real GROMACS discovery plus truthful milestone capabilities.
- `GET /version` — service and protocol versions.

Unknown routes return a normal HTTP 404. There is no command-execution endpoint.

## Current capability boundary

- GROMACS discovery and version diagnostics are measured from the selected executable.
- No run mode is advertised because this milestone cannot launch simulations.
- Stop and pause are unsupported.
- MDX device integration remains `mock` with `origin: "simulated"`; no physical device values are
  produced.
- `grompp`, `mdrun`, jobs, process control, telemetry, GPU selection, project file operations,
  desktop/Tauri startup, and frontend wiring are not implemented.

The protocol remains implementation-independent and is defined by
[`packages/protocol`](../../packages/protocol) and
[`docs/RUNTIME_PROTOCOL.md`](../../docs/RUNTIME_PROTOCOL.md).
