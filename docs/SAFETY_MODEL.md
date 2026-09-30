# Safety Model

MDX Studio currently has **no production MDX hardware integration**. The mock device models state
only. **No physical protection logic is implemented** (no thermal/power limiting, no real watchdog).
The safety model below defines interfaces, state machines and gating semantics so real policy can
be added to the runtime later without changing the GUI.

## Required execution sequence

`PRE-FLIGHT → DEVICE READY → WATCHDOG ARMED → SIMULATION START`

The mock runtime follows this order: a job only starts if pre-flight allowed it **and** the device
is `READY` at the moment of start; the watchdog is armed in `STARTING`, before `started`.

## Policy ownership

Critical run gating and stop conditions belong to the runtime/service/device layer. The GUI
visualises and requests actions; it is not the safety controller.

- `PreflightReport.startPermitted` is computed by the runtime: `false` iff any **critical** check
  FAILs. The Start control binds to it and never recomputes it.
- `submitJob` re-runs the gate inside the runtime; a stale or forged client report is irrelevant.
- `JobRecord.allowedActions` is derived from the job state machine; Stop is offered only when present.
- ESLint and an architecture test forbid UI code from importing the policy functions.

## Pre-flight checks (mock)

Pass / warn / fail with a `critical` flag per check; `SKIPPED` for checks not applicable to the run
mode (native runs skip device checks). Implemented checks: input files present, MDP parameters,
runtime version, GROMACS version, TPR compatibility, binary checksum, device detected, device ready,
firmware/bitstream checksum, PCIe/link, device temperature, device clock, watchdog, supported kernel,
runtime-policy compatibility. Thresholds in the mock are demo values owned by the mock runtime.

Verdict = worst non-skipped status. FAIL on a critical check blocks start; WARN does not.

## State machines

Defined as data in `packages/simulation-model` and covered by tests (every state defined, reachable;
terminal states have no exits; start impossible from non-READY device).

**Device**: `DISCONNECTED → CONNECTING → READY ⇄ RUNNING ⇄ THROTTLED`, any of `RUNNING/THROTTLED/READY →
ERROR`; `RUNNING/THROTTLED/ERROR → ABORTING → READY`; `ERROR → (reset) → DISCONNECTED`. Only `READY`
admits a job start. After a fault the device stays in `ERROR` until an explicit reset.

**Job**: `CREATED → VALIDATING → READY → STARTING → RUNNING → COMPLETED | FAILED | ABORTED`, with
`abort` available from every non-terminal state. `PAUSED` exists in the contract but no runtime may
use it until it advertises `supportsPause` (the mock reports `false`).

## Critical errors stop runs (mock behaviour)

When the mock device faults, runtime policy immediately stops every live device-dependent job
(`FAILED` with a structured error, `RUNNING` → `FAILED`; earlier states abort/fail as appropriate),
disarms the watchdog and leaves the device in `ERROR`. Starting an MDX run afterwards is blocked by a
critical FAIL until the device is reset. This is exercised by tests and by
Settings → Demo runtime controls.

## Future interfaces (not implemented)

Thermal and power limits, watchdog and PCIe timeouts, malformed-packet handling, retirement
timeouts, ECC/device errors. Until hardware exists these are interface/state concepts only.
