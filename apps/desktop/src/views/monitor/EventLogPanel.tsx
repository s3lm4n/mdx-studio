import type { JobEvent } from "@mdx-studio/protocol";
import { Panel, StatusDot } from "@mdx-studio/ui";
import { formatTimestamp } from "../../services/format";

function timeOf(iso: string): string {
  // "2026-01-15 12:00:00 UTC" -> "12:00:00"
  return formatTimestamp(iso).slice(11, 19);
}

function EventText({ event }: { event: JobEvent }) {
  if (event.type === "state-changed") {
    return (
      <span className="mon-event__state">
        {event.from} → {event.to}
        {event.reason === null ? null : (
          <span className="mon-event__reason"> ({event.reason})</span>
        )}
      </span>
    );
  }
  if (event.type === "error") {
    return (
      <span className="mon-event__error">
        <StatusDot tone="fail">Error</StatusDot> {event.error.message}
      </span>
    );
  }
  return <span className={`mon-event__log mon-event__log--${event.level}`}>{event.message}</span>;
}

/** Runtime job events, newest first. Times are UTC. */
export function EventLogPanel({ events }: { events: readonly JobEvent[] }) {
  const newestFirst = [...events].reverse();
  return (
    <Panel
      title="Event log"
      description="Runtime job events, newest first (UTC)"
      className="mon-card mon-events"
      flush
    >
      {newestFirst.length === 0 ? (
        <p className="mon-events__empty">No events yet.</p>
      ) : (
        <ol className="mon-events__list" aria-label="Job events">
          {newestFirst.map((event) => (
            <li key={event.sequence} className={`mon-event mon-event--${event.type}`}>
              <time className="mon-event__time mdx-num" dateTime={event.timestamp}>
                {timeOf(event.timestamp)}
              </time>
              <EventText event={event} />
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
