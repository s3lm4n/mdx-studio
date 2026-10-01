import type { JobRecord } from "@mdx-studio/protocol";
import { Button } from "@mdx-studio/ui";
import { useState } from "react";
import { JobStateBadge } from "../state-tone";

/**
 * Run picker plus the actions the runtime currently allows. Stop is offered only when the job's
 * `allowedActions` contains it, and always asks for confirmation.
 */
export function RunControls({
  jobs,
  selected,
  onSelect,
  onStop,
}: {
  jobs: readonly JobRecord[];
  selected: JobRecord | undefined;
  onSelect: (jobId: string) => void;
  onStop: (job: JobRecord) => Promise<void>;
}) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const canStop = selected?.allowedActions.includes("stop") ?? false;
  const confirmingThis = confirming !== null && selected?.id === confirming;

  return (
    <div className="mon-controls">
      <label className="mon-select">
        <span className="mon-select__label">Run</span>
        <select
          className="mdx-select mon-select__control"
          value={selected?.id ?? ""}
          onChange={(event) => {
            setConfirming(null);
            onSelect(event.target.value);
          }}
        >
          {selected === undefined ? <option value="">No run selected</option> : null}
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.id} · {job.request.runMode} {job.request.stage} · {job.state}
            </option>
          ))}
        </select>
      </label>
      {selected === undefined ? null : <JobStateBadge state={selected.state} />}
      {selected !== undefined && canStop ? (
        confirmingThis ? (
          <>
            <Button
              variant="danger"
              onClick={() => {
                void onStop(selected).finally(() => {
                  setConfirming(null);
                });
              }}
            >
              Confirm stop
            </Button>
            <Button
              onClick={() => {
                setConfirming(null);
              }}
            >
              Cancel
            </Button>
          </>
        ) : (
          <Button
            variant="danger"
            onClick={() => {
              setConfirming(selected.id);
            }}
          >
            Stop run
          </Button>
        )
      ) : null}
    </div>
  );
}
