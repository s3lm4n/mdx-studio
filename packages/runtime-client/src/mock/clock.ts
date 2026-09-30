import type { Unsubscribe } from "../emitter";

/** Time source for the mock runtime, injectable so tests are deterministic. */
export interface Clock {
  nowMs(): number;
  every(intervalMs: number, callback: () => void): Unsubscribe;
}

export const systemClock: Clock = {
  nowMs: () => Date.now(),
  every: (intervalMs, callback) => {
    const handle = setInterval(callback, intervalMs);
    return () => {
      clearInterval(handle);
    };
  },
};

/** Test clock: time only moves when {@link advance} is called. */
export class ManualClock implements Clock {
  private current: number;
  private readonly timers = new Map<number, { interval: number; next: number; run: () => void }>();
  private nextId = 1;

  constructor(startMs = Date.parse("2026-01-15T12:00:00.000Z")) {
    this.current = startMs;
  }

  nowMs(): number {
    return this.current;
  }

  every(intervalMs: number, callback: () => void): Unsubscribe {
    const id = this.nextId++;
    this.timers.set(id, { interval: intervalMs, next: this.current + intervalMs, run: callback });
    return () => {
      this.timers.delete(id);
    };
  }

  advance(ms: number): void {
    const target = this.current + ms;
    for (;;) {
      let due: { interval: number; next: number; run: () => void } | undefined;
      for (const timer of this.timers.values()) {
        if (timer.next <= target && (due === undefined || timer.next < due.next)) due = timer;
      }
      if (due === undefined) break;
      this.current = due.next;
      due.next += due.interval;
      due.run();
    }
    this.current = target;
  }
}
