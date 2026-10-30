/** Calculate a bounded estimate using only server timestamps. */
export function activityTiming(now: number, lastVisit: number | null, previousStudy: number | null, studying: boolean) {
  const newVisit = lastVisit === null || now - lastVisit >= 30 * 60_000;
  const elapsed = studying && previousStudy !== null ? now - previousStudy : 0;
  const seconds = elapsed > 0 && elapsed <= 25_000 ? Math.min(20, Math.floor(elapsed / 1000)) : 0;
  return { newVisit, seconds };
}
