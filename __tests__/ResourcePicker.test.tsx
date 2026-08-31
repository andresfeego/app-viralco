import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text } from 'react-native';

jest.mock('@react-native-vector-icons/fontawesome6', () => 'Icon');
jest.mock('react-native-video', () => 'Video');

import { ResourcePicker } from '../src/components/ResourcePicker';
import { AppButton } from '../src/design-system/components/AppButton';
import { getTheme } from '../src/design-system/theme';

const filters = { tab: 'pool', search: '', type: '', page: 1 };

function renderPicker(overrides: Record<string, unknown> = {}, mode: 'light' | 'dark' = 'light') {
  return ReactTestRenderer.create(
    <ResourcePicker
      items={[]}
      theme={getTheme(mode)}
      canManage
      loading={false}
      error=""
      filters={filters}
      onFiltersChange={jest.fn()}
      selectedId=""
      onSelect={jest.fn()}
      onToggleFavorite={jest.fn()}
      onRetry={jest.fn()}
      pagination={{ page: 1, pageCount: 0 }}
      onPageChange={jest.fn()}
      {...overrides}
    />,
  );
}

test.each(['light', 'dark'] as const)('renders the empty pool in %s mode', (mode) => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => { renderer = renderPicker({}, mode); });
  const text = renderer!.root.findAllByType(Text).map((node) => node.props.children).flat().join(' ');
  expect(text).toContain('El pool esta vacio');
});

test('marks incompatible assets and disables selection', () => {
  const item = { id: '1', libraryAssetId: '8', displayName: 'Audio demo', asset: { type: 'audio', mimeType: 'audio/mpeg', ownerType: 'viralco' } };
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => { renderer = renderPicker({ items: [item] }); });
  const selection = renderer!.root.findAllByType(AppButton).find((button) => button.props.label === 'Seleccionar');
  expect(selection?.props.disabled).toBe(true);
  const text = renderer!.root.findAllByType(Text).map((node) => node.props.children).flat().join(' ');
  expect(text).toContain('Incompatible con Espejo');
});

test('allows retry after a library error', () => {
  const onRetry = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => { renderer = renderPicker({ error: 'fallo', onRetry }); });
  const retry = renderer!.root.findAllByType(AppButton).find((button) => button.props.label === 'Reintentar');
  ReactTestRenderer.act(() => retry?.props.onPress());
  expect(onRetry).toHaveBeenCalledTimes(1);
});
