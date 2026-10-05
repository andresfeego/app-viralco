import { canPrintComposition, printOptions, printCells, fittedPrintRect, groupPrintItems } from '../src/domain/mirrorPrint';

const profile = { kind: 'print-profile', output: { maxCopies: 20, supportsTwoPerPage: true, colorMode: 'color' } };
const config = { print: { enabled: true, paperWidthCm: 10, paperHeightCm: 15, marginCm: 0.2, dpi: 300, copies: 2, orientation: 'portrait', fit: 'contain', twoPerPage: true }, delivery: { print: true } };
it('uses the historical settings and counts copies as sheets, not photo cells', () => {
  expect(printOptions(config, profile)).toMatchObject({ widthMm: 100, heightMm: 150, marginMm: 2, copies: 2, twoPerPage: true });
  expect(printOptions({ ...config, print: { ...config.print, orientation: 'landscape' } }, profile)).toMatchObject({ widthMm: 150, heightMm: 100 });
});
it('divides the printable area along its longest axis without duplicating the output image itself', () => {
  expect(printCells(100, 150, 5, true)).toEqual([{ x: 5, y: 5, width: 90, height: 70 }, { x: 5, y: 75, width: 90, height: 70 }]);
  expect(printCells(150, 100, 5, true)).toEqual([{ x: 5, y: 5, width: 70, height: 90 }, { x: 75, y: 5, width: 70, height: 90 }]);
  expect(printCells(100, 150, 0, false)).toHaveLength(1);
});
it('centers contain and cover, leaving cropping to the cell clipping', () => {
  const cell = { x: 0, y: 0, width: 100, height: 100 };
  expect(fittedPrintRect(200, 100, cell, 'contain')).toEqual({ x: 0, y: 25, width: 100, height: 50 });
  expect(fittedPrintRect(200, 100, cell, 'cover')).toEqual({ x: -50, y: 0, width: 200, height: 100 });
});
it('requires a local final image and explicit publication permission', () => {
  const run = { configSnapshot: config, output: { uri: 'file:///photo.jpg' } };
  expect(canPrintComposition(run)).toBe(true);
  expect(canPrintComposition({ ...run, output: { uri: 'https://example.test/photo.jpg' } })).toBe(false);
  expect(canPrintComposition({ ...run, output: { uri: 'file:///photo.jpg', localAvailable: false } })).toBe(false);
  expect(canPrintComposition({ ...run, configSnapshot: {} })).toBe(false);
});
it('rejects invalid media, copy limits and unsupported duplication', () => {
  for (const change of [{ copies: 0 }, { copies: 21 }, { paperWidthCm: NaN }, { marginCm: 10 }, { dpi: 0 }, { fit: 'stretch' }]) {
    expect(() => printOptions({ ...config, print: { ...config.print, ...change } }, profile)).toThrow('PRINT_SETTINGS_INVALID');
  }
  expect(() => printOptions(config, { ...profile, output: { ...profile.output, supportsTwoPerPage: false } })).toThrow();
});
it('groups only identical historical print settings', () => {
  const options = printOptions(config, profile);
  const groups = groupPrintItems([{ path: '/a', id: 'a', options }, { path: '/b', id: 'b', options: { ...options, copies: 1 } }, { path: '/c', id: 'c', options }]);
  expect(groups).toHaveLength(2);
  expect(groups[0].items.map(i => i.id)).toEqual(['a', 'c']);
});
