# Safety Model Baseline

MDX Studio currently has no production MDX hardware integration. Do not implement fake physical protection logic.

## Required conceptual execution sequence

`PRE-FLIGHT → DEVICE READY → WATCHDOG ARMED → SIMULATION START`

## Device state model

`DISCONNECTED → CONNECTING → READY → RUNNING / THROTTLED / ERROR → ABORTING`

## Job state model

`CREATED → VALIDATING → READY → STARTING → RUNNING → COMPLETED / FAILED / ABORTED`

`PAUSED` may be added only when the runtime can guarantee correct semantics.

## Policy ownership

Critical run gating and stop conditions belong to the runtime/service/device layer. The GUI visualizes and requests actions; it is not the authoritative safety controller.

Future interfaces may represent thermal limits, power limits, watchdog/PCIe timeouts, malformed packets, retirement timeouts, and ECC/device errors. Until hardware exists, these are interface/state concepts only.
