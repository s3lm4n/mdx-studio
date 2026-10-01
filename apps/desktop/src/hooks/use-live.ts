import type { JobEvent, JobRecord, MdxDeviceStatus, TelemetrySnapshot } from "@mdx-studio/protocol";
import { useEffect, useState } from "react";
import { useRuntime } from "../app/runtime-context";

const MAX_TELEMETRY = 300;
const MAX_EVENTS = 200;

/**
 * All jobs, kept current from runtime job-change notifications. State is keyed by the runtime
 * instance, so a replaced runtime (e.g. a demo reset) never shows the previous runtime's jobs.
 */
export function useJobs(): { jobs: JobRecord[]; loaded: boolean } {
  const runtime = useRuntime();
  const [state, setState] = useState<{ runtime: object; jobs: JobRecord[]; loaded: boolean }>();

  useEffect(() => {
    let active = true;
    const unsubscribe = runtime.subscribeJobs((updated) => {
      setState((prev) => {
        const current = prev?.runtime === runtime ? prev : { runtime, jobs: [], loaded: false };
        const index = current.jobs.findIndex((job) => job.id === updated.id);
        const jobs =
          index < 0
            ? [...current.jobs, updated]
            : current.jobs.map((job, i) => (i === index ? updated : job));
        return { ...current, jobs };
      });
    });
    void runtime.listJobs().then((initial) => {
      if (!active) return;
      setState((prev) => {
        const current = prev?.runtime === runtime ? prev.jobs : [];
        const byId = new Map(initial.map((job) => [job.id, job]));
        for (const job of current) byId.set(job.id, job);
        return { runtime, jobs: [...byId.values()], loaded: true };
      });
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [runtime]);

  return state?.runtime === runtime
    ? { jobs: state.jobs, loaded: state.loaded }
    : { jobs: EMPTY, loaded: false };
}

export function useDeviceStatus(): MdxDeviceStatus | undefined {
  const runtime = useRuntime();
  const [status, setStatus] = useState<MdxDeviceStatus>();

  useEffect(() => {
    let active = true;
    const unsubscribe = runtime.subscribeDeviceStatus(setStatus);
    void runtime.getDeviceStatus().then((initial) => {
      if (active) setStatus((current) => current ?? initial);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [runtime]);

  return status;
}

interface Keyed<T> {
  jobId: string;
  items: T[];
}

/**
 * Rolling telemetry history for one job: pre-rolled history plus live samples. State is keyed by
 * job id, so switching jobs shows an empty history immediately without resetting in an effect.
 */
export function useTelemetry(jobId: string | undefined): TelemetrySnapshot[] {
  const runtime = useRuntime();
  const [state, setState] = useState<Keyed<TelemetrySnapshot>>();

  useEffect(() => {
    if (jobId === undefined) return undefined;
    let active = true;
    const unsubscribe = runtime.subscribeTelemetry(jobId, (snapshot) => {
      setState((current) => {
        const existing = current?.jobId === jobId ? current.items : [];
        return { jobId, items: [...existing, snapshot].slice(-MAX_TELEMETRY) };
      });
    });
    void runtime.getTelemetryHistory(jobId, MAX_TELEMETRY).then((initial) => {
      if (!active) return;
      setState((current) => {
        const live = current?.jobId === jobId ? current.items : [];
        const lastKnown = initial[initial.length - 1]?.sequence ?? -1;
        return {
          jobId,
          items: [...initial, ...live.filter((s) => s.sequence > lastKnown)].slice(-MAX_TELEMETRY),
        };
      });
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [runtime, jobId]);

  return state !== undefined && state.jobId === jobId ? state.items : EMPTY;
}

const EMPTY: never[] = [];

export function useJobEvents(jobId: string | undefined): JobEvent[] {
  const runtime = useRuntime();
  const [state, setState] = useState<Keyed<JobEvent>>();

  useEffect(() => {
    if (jobId === undefined) return undefined;
    let active = true;
    const unsubscribe = runtime.subscribeJobEvents(jobId, (event) => {
      setState((current) => {
        const existing = current?.jobId === jobId ? current.items : [];
        return { jobId, items: [...existing, event].slice(-MAX_EVENTS) };
      });
    });
    void runtime.getJobEvents(jobId).then((initial) => {
      if (!active) return;
      setState((current) => {
        const live = current?.jobId === jobId ? current.items : [];
        const lastKnown = initial[initial.length - 1]?.sequence ?? -1;
        return {
          jobId,
          items: [...initial, ...live.filter((e) => e.sequence > lastKnown)].slice(-MAX_EVENTS),
        };
      });
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [runtime, jobId]);

  return state !== undefined && state.jobId === jobId ? state.items : EMPTY;
}
