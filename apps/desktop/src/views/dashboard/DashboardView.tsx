import { isMockRuntime } from "@mdx-studio/runtime-client";
import { Button } from "@mdx-studio/ui";
import { Link } from "react-router-dom";
import { useRuntime } from "../../app/runtime-context";
import { useAsync } from "../../hooks/use-async";
import { useDeviceStatus, useJobs, useTelemetry } from "../../hooks/use-live";
import { ErrorNotice, PageHeader } from "../common";
import { AcceleratorCard } from "./AcceleratorCard";
import { ActiveRunCard } from "./ActiveRunCard";
import { RecentRunsCard } from "./RecentRunsCard";
import { RuntimeStatusCard } from "./RuntimeStatusCard";
import { ThroughputCard } from "./ThroughputCard";
import { ValidationSummaryCard } from "./ValidationSummaryCard";
import "./dashboard.css";

const TERMINAL = ["COMPLETED", "FAILED", "ABORTED"];

export function DashboardView() {
  const runtime = useRuntime();
  const { jobs } = useJobs();
  const device = useDeviceStatus();
  const jobsKey = jobs.map((job) => `${job.id}:${job.state}`).join("|");

  const health = useAsync(() => runtime.getHealth(), [runtime]);
  const capabilities = useAsync(() => runtime.getCapabilities(), [runtime]);
  const runs = useAsync(() => runtime.listRuns(), [runtime, jobsKey], { keepPrevious: true });

  const live = jobs.find((job) => !TERMINAL.includes(job.state));
  const telemetry = useTelemetry(live?.id);
  const latest = telemetry[telemetry.length - 1];
  const lastRun = runs.data?.find((run) => run.status !== "running");

  return (
    <div className="stack dash">
      <PageHeader
        eyebrow="Workstation overview"
        title="Dashboard"
        actions={
          <>
            <Button disabled title="Project creation needs the Phase 2 runtime service.">
              New project
            </Button>
            <Link className="mdx-button" to="/simulation/setup?mode=validation">
              Validation run
            </Link>
            <Link className="mdx-button mdx-button--primary" to="/simulation/setup">
              New simulation
            </Link>
          </>
        }
      />

      {health.error !== undefined ? (
        <ErrorNotice error={health.error} title="Runtime unreachable" />
      ) : null}
      {capabilities.error !== undefined ? <ErrorNotice error={capabilities.error} /> : null}

      <div className="dash-grid">
        <ActiveRunCard
          job={live}
          progress={latest?.simulation ?? null}
          lastRun={lastRun}
          demoRuntime={isMockRuntime(runtime)}
        />
        <AcceleratorCard
          device={device}
          mdx={latest?.mdx ?? null}
          live={live?.state === "RUNNING" && latest?.mdx != null}
        />
        <ThroughputCard job={live} history={telemetry} />
        <RuntimeStatusCard health={health.data} capabilities={capabilities.data} device={device} />
        <RecentRunsCard runs={runs.data} />
        <ValidationSummaryCard runs={runs.data} />
      </div>
    </div>
  );
}
