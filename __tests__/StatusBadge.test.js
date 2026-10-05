import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { StyleSheet, View } from 'react-native';
import { StatusBadge } from '../src/components/StatusBadge';
import { tokens } from '../src/design-system/tokens';

it('reduces vertical space only when dense is explicitly selected', () => {
  let tree;
  act(() => { tree = renderer.create(<StatusBadge label="Activo" compact />); });
  const normal = StyleSheet.flatten(tree.root.findByType(View).props.style);
  act(() => tree.update(<StatusBadge label="Activo" compact dense />));
  const dense = StyleSheet.flatten(tree.root.findByType(View).props.style);
  expect(dense.paddingVertical).toBe(tokens.spacing.none);
  expect(dense.paddingVertical).toBeLessThan(normal.paddingVertical);
  expect(dense.alignSelf).toBe('flex-start');
  act(() => tree.unmount());
});
