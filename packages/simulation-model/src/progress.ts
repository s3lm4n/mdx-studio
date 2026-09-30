/** Seconds until completion at the current throughput, or `null` when it cannot be estimated. */
export function estimateEtaSeconds(remainingNs: number, nsPerDay: number): number | null {
  if (!(nsPerDay > 0) || !(remainingNs >= 0)) return null;
  return (remainingNs / nsPerDay) * 86_400;
}

/** Fraction in [0, 1]. */
export function progressFraction(timeNs: number, targetTimeNs: number): number {
  if (!(targetTimeNs > 0)) return 0;
  return Math.min(1, Math.max(0, timeNs / targetTimeNs));
}
