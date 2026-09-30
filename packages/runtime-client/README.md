# Runtime Client Package

`RuntimeClient` — the typed interface through which GUI (and a future CLI) reach a runtime — and
`MockRuntimeClient`, an in-process **simulated** implementation for Phase 1.

The mock composes explicit mock providers (device, telemetry, validation, provenance), runs on an
injectable clock (`ManualClock` in tests), tags every record `origin: "simulated"`, and executes
nothing. Its numbers (including validation-profile tolerances) are placeholders, never measurements.
Scenario and fault controls exist only on `MockRuntimeClient`, not on the interface.
