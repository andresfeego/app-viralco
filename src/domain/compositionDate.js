export function compositionDate(run) {
  const candidates = [run.output?.capturedAt, run.output?.createdAt, run.startedAt, run.asset?.createdAt];
  return candidates.find((value) => value && Number.isFinite(Date.parse(value))) || null;
}
export function newestCompositionsFirst(entries) {
  return [...entries].sort((a, b) => (Date.parse(compositionDate(b.run)) || 0) - (Date.parse(compositionDate(a.run)) || 0));
}
