import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { ProgressBar } from 'react-native-paper';
import { CompositionSyncCard } from '../src/components/CompositionSyncCard';
import { getTheme } from '../src/design-system/theme';
import { IconTextButton } from '../src/components/IconTextButton';
import { tokens } from '../src/design-system/tokens';
jest.mock('@react-native-vector-icons/fontawesome6', () => 'Icon');
const run = { output: { uri: 'file:///photo.jpg', syncStatus: 'local' } };
it('archives without opening the image using a compact top-aligned red trash icon', () => {
  const onView = jest.fn(); const onArchive = jest.fn(); const stopPropagation = jest.fn(); let tree;
  act(() => { tree = renderer.create(<CompositionSyncCard run={run} theme={getTheme('dark')} onView={onView} onArchive={onArchive} />); });
  const button = tree.root.findByType(IconTextButton);
  expect(button.props.icon).toBe('trash-can');
  expect(button.props.variant).toBe('ghost');
  expect(button.props.iconColor).toBe(tokens.colors.error[400]);
  expect(button.props.iconSize).toBe(tokens.typography.body);
  expect(button.props.style).toMatchObject({ alignItems: 'flex-start' });
  act(() => button.props.onPress({ stopPropagation }));
  expect(stopPropagation).toHaveBeenCalled(); expect(onArchive).toHaveBeenCalledTimes(1); expect(onView).not.toHaveBeenCalled();
  act(() => tree.unmount());
});
it.each(['pending', 'failed', 'synced'])('shows state without progress when %s', (stage) => {
  let tree; act(() => { tree = renderer.create(<CompositionSyncCard run={run} state={{ stage, percent: 70 }} theme={getTheme('dark')} onView={() => {}} />); });
  expect(tree.root.findAllByType(ProgressBar)).toHaveLength(0);
  expect(tree.root.findAllByType('Icon')[0].props.name).not.toBe('eye');
  expect(tree.root.findAllByType(Text).some((node) => String(node.props.children).includes('%'))).toBe(false);
  act(() => tree.unmount());
});
it.each(['light', 'dark'])('opens from the entire card and shows active progress in %s', (mode) => {
  const onView = jest.fn(); let tree;
  act(() => { tree = renderer.create(<CompositionSyncCard run={run} state={{ stage: 'uploading', percent: 42 }} theme={getTheme(mode)} onView={onView} />); });
  expect(tree.root.findByType(ProgressBar).props.progress).toBe(0.42);
  act(() => tree.root.findAllByProps({ accessibilityRole: 'button' })[0].props.onPress());
  expect(onView).toHaveBeenCalledTimes(1);
  act(() => tree.unmount());
});
