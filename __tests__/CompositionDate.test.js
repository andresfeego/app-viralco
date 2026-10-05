import { compositionDate, newestCompositionsFirst } from '../src/domain/compositionDate';
it('merges local and remote photos by capture time, not upload time', () => {
  const entries = [
    { run: { output: { createdAt: '2026-09-09T10:00:00Z' } } },
    { run: { output: { capturedAt: '2026-09-08T10:00:00Z', createdAt: '2026-09-10T10:00:00Z' } } },
    { run: { output: { createdAt: '2026-09-09T11:00:00Z' } } },
  ];
  expect(newestCompositionsFirst(entries)).toEqual([entries[2], entries[0], entries[1]]);
  expect(entries[0].run.output.createdAt).toBe('2026-09-09T10:00:00Z');
});
it('ignores invalid dates and falls back to the original run time', () => {
  expect(compositionDate({ output: { createdAt: 'invalid' }, startedAt: '2026-09-09T10:00:00Z' })).toBe('2026-09-09T10:00:00Z');
});
