import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('@react-native-vector-icons/fontawesome6', () => 'Icon');
jest.mock('react-native-paper', () => ({ TextInput: 'PaperTextInput', HelperText: 'HelperText' }));

import { ResourceFilters } from '../src/components/ResourceFilters';
import { SelectableChipGroup } from '../src/components/SelectableChipGroup';
import { getTheme } from '../src/design-system/theme';

const baseProps = {
  theme: getTheme('light'), tab: 'pool', onTabChange: jest.fn(), search: '', onSearchChange: jest.fn(),
  type: '', onTypeChange: jest.fn(), eventTypes: [{ id: '1', slug: 'boda', name: 'Boda' }], eventType: '', onEventTypeChange: jest.fn(),
  motion: '', onMotionChange: jest.fn(), showTabs: false, horizontalTypes: true,
};

test('renders resource and event filters in the required independent order', () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<ResourceFilters {...baseProps} />); });
  const rows = renderer!.root.findAllByType(SelectableChipGroup);
  expect(rows).toHaveLength(2);
  expect(rows[0].props.options.map((item: any) => item.value)).toEqual(['', 'background', 'frame', 'sticker', 'template', 'animation', 'font']);
  expect(rows[1].props.options.map((item: any) => item.value)).toEqual(['', 'boda']);
});

test('adds the contextual movement filter only for stickers', () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<ResourceFilters {...baseProps} type="sticker" />); });
  const rows = renderer!.root.findAllByType(SelectableChipGroup);
  expect(rows).toHaveLength(3);
  expect(rows[2].props.options.map((item: any) => item.value)).toEqual(['', 'animated', 'static']);
});
