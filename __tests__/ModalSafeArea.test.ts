import { modalSurfaceTopOffset } from '../src/design-system/components/ModalSafeArea';
import { tokens } from '../src/design-system/tokens';

test('keeps every popup surface at least two extra-large spaces below the screen edge', () => {
  expect(modalSurfaceTopOffset()).toBe(tokens.spacing.xl * 2);
  expect(modalSurfaceTopOffset(tokens.spacing.md)).toBe(tokens.spacing.xl * 2);
});

test('adds clearance when the device top inset exceeds the default popup offset', () => {
  const tallInset = tokens.spacing.xl * 2;
  expect(modalSurfaceTopOffset(tallInset)).toBe(tallInset + tokens.spacing.xs);
});
