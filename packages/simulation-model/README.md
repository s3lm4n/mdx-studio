# Simulation Model Package

Pure domain logic: job and device state machines (`JOB_MACHINE`, `DEVICE_MACHINE`), the lossless MDP
document model (`parseMdp` / `serializeMdp` round-trip byte-for-byte; line-local edits; CRLF-aware),
MDP field catalogue and non-authoritative lint, run-mode metadata and progress helpers.

State-machine policy is **runtime-owned**: the desktop UI must not import the transition functions
(lint-enforced); it displays the state and `allowedActions` the runtime reports.
