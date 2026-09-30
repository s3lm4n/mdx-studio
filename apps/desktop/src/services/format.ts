/** Deterministic, locale-independent formatting helpers for scientific display. */

export function formatNs(value: number): string {
  return value.toFixed(3);
}

export function formatPercent(fraction: number, digits = 2): string {
  return `${(fraction * 100).toFixed(digits)} %`;
}

export function formatDuration(totalSeconds: number | null): string {
  if (totalSeconds === null || !Number.isFinite(totalSeconds)) return "—";
  const seconds = Math.max(0, Math.round(totalSeconds));
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ${seconds % 60} s`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} h ${minutes % 60} min`;
  const days = Math.floor(hours / 24);
  return `${days} d ${hours % 24} h`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KiB", "MiB", "GiB", "TiB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unit] ?? "TiB"}`;
}

/** `2026-01-15 12:00:00 UTC` - unambiguous and stable across locales and time zones. */
export function formatTimestamp(iso: string | null): string {
  if (iso === null) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${date.toISOString().replace("T", " ").slice(0, 19)} UTC`;
}

/** `2026-01-15 12:00` (UTC, minute precision) for dense tables; pair with a full-precision title. */
export function formatTimestampShort(iso: string | null): string {
  if (iso === null) return "\u2014";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toISOString().replace("T", " ").slice(0, 16);
}

export function shortDigest(digest: string, length = 16): string {
  return `${digest.slice(0, length)}…`;
}

/** Compact scientific notation for error magnitudes, e.g. `4.12e-4`. */
export function formatError(value: number | null): string {
  if (value === null) return "—";
  if (value === 0) return "0";
  return value.toExponential(2).replace("e-0", "e-").replace("e+0", "e+");
}
