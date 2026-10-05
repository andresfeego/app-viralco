import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Image, StyleSheet } from 'react-native';
import { EventListCard } from '../src/components/EventListCard';
import { getTheme } from '../src/design-system/theme';
jest.mock('@react-native-vector-icons/fontawesome6', () => 'Icon');
jest.mock('../src/components/StatusBadge', () => ({ StatusBadge: 'StatusBadge' }));

it.each(['light', 'dark'])('shows the complete logo and preserves navigation in %s', (mode) => {
  let tree;
  const onPress = jest.fn();
  act(() => { tree = renderer.create(<EventListCard item={{ id: '1', name: 'Fiesta' }} theme={getTheme(mode)} logoImageUrl="https://example.test/logo.png" onPress={onPress} />); });
  expect(tree.root.findByType(Image).props.source.uri).toBe('https://example.test/logo.png');
  expect(tree.root.findByType(Image).props.resizeMode).toBe('contain');
  const badge = tree.root.findByType('StatusBadge');
  expect(badge.props).toMatchObject({ compact: true, dense: true });
  expect(badge.parent.children.indexOf(badge)).toBe(2);
  expect(StyleSheet.flatten(badge.parent.props.style).position).toBeUndefined();
  act(() => tree.root.findAll((node) => node.type !== EventListCard && node.props.onPress === onPress)[0].props.onPress());
  expect(onPress).toHaveBeenCalledTimes(1);
  act(() => tree.unmount());
});

it('falls back on missing or failed logos and retries a changed URL', () => {
  let tree;
  const props = { item: { id: '1' }, theme: getTheme('light') };
  act(() => { tree = renderer.create(<EventListCard {...props} />); });
  expect(tree.root.findAllByType(Image)).toHaveLength(0);
  act(() => tree.update(<EventListCard {...props} logoImageUrl="https://example.test/first.png" />));
  act(() => tree.root.findByType(Image).props.onError());
  expect(tree.root.findAllByType(Image)).toHaveLength(0);
  expect(tree.root.findAllByType('Icon').some((icon) => icon.props.name === 'image')).toBe(true);
  act(() => tree.update(<EventListCard {...props} logoImageUrl="https://example.test/new.png" />));
  expect(tree.root.findByType(Image).props.source.uri).toBe('https://example.test/new.png');
  act(() => tree.unmount());
});
