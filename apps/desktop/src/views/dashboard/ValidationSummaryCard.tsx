import type { RunSummary } from "@mdx-studio/protocol";
import { FilamentsMotif, Panel, StatusDot } from "@mdx-studio/ui";
import { Loading } from "../common";
import { VALIDATION_TONE, ValidationStatusBadge, type ValidationStatusValue } from "../state-tone";
import { DashLink } from "./DashLink";

const ORDER: readonly ValidationStatusValue[] = ["passed", "failed", "pending", "not-run"];
const LEGEND: Record<ValidationStatusValue, string> = {
  passed: "Passed",
  failed: "Failed",
  pending: "Pending",
  "not-run": "Not run",
};

/** Count of the runtime-reported validation status per run. Pure display aggregation. */
export function countValidation(
  runs: readonly RunSummary[],
): Record<ValidationStatusValue, number> {
  const counts: Record<ValidationStatusValue, number> = {
    passed: 0,
    failed: 0,
    pending: 0,
    "not-run": 0,
  };
  for (const run of runs) counts[run.validationStatus] += 1;
  return counts;
}

/** Most recently started run for which the runtime reports a validation verdict. */
export function latestVerdict(runs: readonly RunSummary[]): RunSummary | undefined {
  let latest: RunSummary | undefined;
  for (const run of runs) {
    if (run.validationStatus !== "passed" && run.validationStatus !== "failed") continue;
    if (latest === undefined || run.startedAt > latest.startedAt) latest = run;
  }
  return latest;
}

export function ValidationSummaryCard({ runs }: { runs: readonly RunSummary[] | undefined }) {
  const counts = runs === undefined ? undefined : countValidation(runs);
  const total = runs?.length ?? 0;
  const latest = latestVerdict(runs ?? []);
  return (
    <Panel
      title="Validation"
      className="dash-card dash-validation"
      description={runs === undefined ? undefined : `Status across ${total} recorded runs`}
      motif={
        <FilamentsMotif className="dash-validation__filaments" fade="left" strength="strong" />
      }
    >
      {counts === undefined ? (
        <Loading what="validation status" />
      ) : (
        <div className="dash-validation__body">
          <div className="dash-validation__bar" aria-hidden="true">
            {ORDER.filter((status) => counts[status] > 0).map((status) => (
              <span
                key={status}
                className={`dash-validation__segment dash-validation__segment--${status}`}
                style={{ flexGrow: counts[status] }}
              />
            ))}
          </div>
          <ul className="dash-validation__legend">
            {ORDER.map((status) => (
              <li key={status}>
                <StatusDot tone={VALIDATION_TONE[status]}>{LEGEND[status]}</StatusDot>
                <span className="dash-validation__count mdx-num">{counts[status]}</span>
              </li>
            ))}
          </ul>
          <div className="dash-validation__latest">
            <p className="mdx-eyebrow dash-validation__latest-label">Latest result</p>
            {latest === undefined ? (
              <p className="mdx-muted dash-validation__latest-row">No validation results yet.</p>
            ) : (
              <p className="dash-validation__latest-row">
                <span className="dash-validation__run mdx-mono">{latest.runId}</span>
                <span className="mdx-faint">{latest.stage}</span>
                <ValidationStatusBadge status={latest.validationStatus} appearance="plain" />
              </p>
            )}
            <DashLink to="/validation">Open validation</DashLink>
          </div>
        </div>
      )}
    </Panel>
  );
}
