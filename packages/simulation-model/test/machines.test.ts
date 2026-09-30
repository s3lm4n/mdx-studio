import { DEVICE_STATES, JOB_STATES } from "@mdx-studio/protocol";
import { describe, expect, it } from "vitest";
import {
  DEVICE_MACHINE,
  JOB_MACHINE,
  allowedJobActions,
  availableEvents,
  deviceAcceptsJobs,
  isTerminal,
  reachableStates,
  transition,
} from "../src";

describe("job state machine", () => {
  it("defines a transition row for every protocol state", () => {
    expect(Object.keys(JOB_MACHINE.transitions).sort()).toEqual([...JOB_STATES].sort());
  });

  it("reaches every state from CREATED", () => {
    expect([...reachableStates(JOB_MACHINE)].sort()).toEqual([...JOB_STATES].sort());
  });

  it("follows the documented happy path", () => {
    let state = JOB_MACHINE.initial;
    for (const event of [
      "begin-validation",
      "validation-passed",
      "start",
      "started",
      "complete",
    ] as const) {
      const result = transition(JOB_MACHINE, state, event);
      expect(result.ok).toBe(true);
      if (result.ok) state = result.state;
    }
    expect(state).toBe("COMPLETED");
  });

  it("cannot skip validation or start straight from CREATED", () => {
    expect(transition(JOB_MACHINE, "CREATED", "start").ok).toBe(false);
    expect(transition(JOB_MACHINE, "CREATED", "started").ok).toBe(false);
    expect(transition(JOB_MACHINE, "VALIDATING", "start").ok).toBe(false);
    expect(transition(JOB_MACHINE, "READY", "started").ok).toBe(false);
  });

  it("has no outgoing transitions from terminal states", () => {
    for (const state of JOB_MACHINE.terminal) {
      expect(availableEvents(JOB_MACHINE, state)).toEqual([]);
      expect(isTerminal(JOB_MACHINE, state)).toBe(true);
    }
    expect(transition(JOB_MACHINE, "COMPLETED", "abort").ok).toBe(false);
  });

  it("allows stop exactly while a job is still live", () => {
    for (const state of JOB_STATES) {
      const live = !isTerminal(JOB_MACHINE, state);
      expect(allowedJobActions(state)).toEqual(live ? ["stop"] : []);
    }
  });

  it("reports the rejected event in a failed transition", () => {
    const result = transition(JOB_MACHINE, "CREATED", "complete");
    expect(result).toMatchObject({ ok: false, from: "CREATED", event: "complete" });
  });
});

describe("device state machine", () => {
  it("defines a transition row for every protocol state", () => {
    expect(Object.keys(DEVICE_MACHINE.transitions).sort()).toEqual([...DEVICE_STATES].sort());
  });

  it("reaches every state from DISCONNECTED", () => {
    expect([...reachableStates(DEVICE_MACHINE)].sort()).toEqual([...DEVICE_STATES].sort());
  });

  it("only admits jobs in READY", () => {
    for (const state of DEVICE_STATES) {
      expect(deviceAcceptsJobs(state)).toBe(state === "READY");
    }
  });

  it("cannot start a job from any non-READY state", () => {
    for (const state of DEVICE_STATES) {
      expect(transition(DEVICE_MACHINE, state, "job-started").ok).toBe(state === "READY");
    }
  });

  it("returns through ABORTING after an abort", () => {
    const aborting = transition(DEVICE_MACHINE, "RUNNING", "abort");
    expect(aborting).toMatchObject({ ok: true, state: "ABORTING" });
    expect(transition(DEVICE_MACHINE, "ABORTING", "abort-complete")).toMatchObject({
      ok: true,
      state: "READY",
    });
  });

  it("requires an explicit reset to leave ERROR for DISCONNECTED", () => {
    expect(transition(DEVICE_MACHINE, "ERROR", "connected").ok).toBe(false);
    expect(transition(DEVICE_MACHINE, "ERROR", "reset")).toMatchObject({
      ok: true,
      state: "DISCONNECTED",
    });
  });
});
