import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('@react-native-vector-icons/fontawesome6', () => 'Icon');
jest.mock('react-native-paper', () => {
  const actual = jest.requireActual('react-native-paper');
  return { ...actual, TextInput: 'PaperTextInput', HelperText: 'HelperText' };
});

import { MirrorTextLayerEditor } from '../src/components/MirrorTextLayerEditor';
import { MirrorEditorToolbar } from '../src/components/MirrorEditorToolbar';
import { TextLayerList } from '../src/components/TextLayerList';
import { defaultMirrorConfig } from '../src/domain/magicMirrorConfig';
import { getTheme } from '../src/design-system/theme';

function renderEditor(mode: 'light' | 'dark' = 'light') {
  const onChange = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <MirrorTextLayerEditor
        config={defaultMirrorConfig()}
        onChange={onChange}
        theme={getTheme(mode)}
        event={{ name: 'Boda Ana', eventDate: '2026-09-05' }}
      />,
    );
  });
  return { renderer: renderer!, onChange };
}

test.each(['light', 'dark'] as const)('creates a text layer from the main input in %s mode', (mode) => {
  const { renderer, onChange } = renderEditor(mode);
  ReactTestRenderer.act(() => renderer.root.findByProps({ testID: 'mirror-text-input' }).props.onChangeText('Bienvenidos'));
  expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
    layout: expect.objectContaining({ textLayers: [expect.objectContaining({ text: 'Bienvenidos', order: 0, rotation: 0 })] }),
  }));
  expect(renderer.root.findByType(TextLayerList).props.layers).toEqual([expect.objectContaining({ text: 'Bienvenidos' })]);
});

test.each(['light', 'dark'] as const)('selects outlined event and date shortcuts without duplicating text in %s', mode => {
  const { renderer, onChange } = renderEditor(mode);
  expect(renderer.root.findByProps({ testID: 'mirror-text-shortcuts' }).props.variant).toBe('outlined');
  expect(renderer.root.findByProps({ testID: 'mirror-text-shortcuts' }).props.backgroundColor).toBe(getTheme(mode).surface);
  ReactTestRenderer.act(() => renderer.root.findByProps({ testID: 'mirror-text-shortcuts-event' }).props.onPress());
  expect(renderer.root.findByType(TextLayerList).props.layers).toEqual([expect.objectContaining({ id: 'event', text: 'Boda Ana' })]);
  expect(renderer.root.findByProps({ testID: 'mirror-text-shortcuts' }).props.value).toBe('event');
  ReactTestRenderer.act(() => renderer.root.findByProps({ testID: 'mirror-text-shortcuts-date' }).props.onPress());
  expect(renderer.root.findByProps({ testID: 'mirror-text-shortcuts' }).props.value).toBe('date');
  expect(renderer.root.findByType(TextLayerList).props.layers).toContainEqual(expect.objectContaining({ id: 'date', text: '2026-09-05' }));
  ReactTestRenderer.act(() => renderer.root.findByProps({ testID: 'mirror-text-shortcuts-event' }).props.onPress());
  expect(renderer.root.findByType(TextLayerList).props.layers).toHaveLength(2);
  ReactTestRenderer.act(() => renderer.root.findByType(TextLayerList).props.onRemove('date'));
  ReactTestRenderer.act(() => renderer.root.findByType(TextLayerList).props.onRemove('event'));
  expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ layout: expect.objectContaining({ textLayers: [] }) }));
});

test('exposes the same visual editing toolbar used by other layer editors', () => {
  const { renderer } = renderEditor();
  expect(renderer.root.findByType(MirrorEditorToolbar).props.actions.map((action: { key: string }) => action.key)).toEqual([
    'move', 'rotate', 'multi', 'raise', 'lower', 'undo', 'redo', 'copy', 'clear', 'help',
  ]);
});
