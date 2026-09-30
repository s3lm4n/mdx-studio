# Runtime Protocol Baseline

The desktop must communicate with the WSL runtime through a versioned structured protocol.

## Requirements

- typed request/response/event contracts
- no arbitrary shell execution endpoint
- explicit protocol/runtime version reporting
- capability discovery
- structured error model
- event/log streaming for long-running jobs
- stable IDs for projects/runs/jobs
- runtime-provided validation profiles
- provenance records for generated commands, hashes, versions, and results

## Initial endpoint/resource sketch

This is intentionally non-binding until Phase 2:

- `GET /health`
- `GET /version`
- `GET /capabilities`
- `POST /preflight`
- `POST /jobs`
- `GET /jobs/{id}`
- `POST /jobs/{id}/stop`
- `GET /jobs/{id}/events` or equivalent event stream
- `GET /validation/profiles`
- `POST /validation/runs`

A production implementation must define schemas before wiring process execution.
