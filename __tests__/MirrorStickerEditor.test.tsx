import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('@react-native-vector-icons/fontawesome6', () => 'Icon');

import { MirrorConfigPreview } from '../src/components/MirrorConfigPreview';
import { MirrorEditorToolbar } from '../src/components/MirrorEditorToolbar';
import { MirrorStickerEditor } from '../src/components/MirrorStickerEditor';
import { addStickerLayer, defaultMirrorConfig } from '../src/domain/magicMirrorConfig';
import { getTheme } from '../src/design-system/theme';
import { tokens } from '../src/design-system/tokens';
import { t } from '../src/i18n';

function configured() {
  return addStickerLayer(addStickerLayer(defaultMirrorConfig(), '90'), '91');
}

test('uses the shared canvas and exposes sticker layer tools', () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<MirrorStickerEditor config={configured()} onChange={jest.fn()} resourcesById={{}} theme={getTheme('dark')} />);
  });
  const preview = renderer!.root.findByType(MirrorConfigPreview);
  expect(preview.props.canvasBackgroundColor).toBe(tokens.colors.gray[3]);
  expect(preview.props.testID).toBe('mirror-sticker-canvas');
  const labels = renderer!.root.findByType(MirrorEditorToolbar).props.actions.map((action: any) => action.label);
  expect(labels).toEqual([
    t('mirror_150'), t('mirror_151'), t('mirror_040'), t('mirror_sticker_raise'), t('mirror_sticker_lower'),
    t('mirror_153'), t('mirror_154'), t('mirror_sticker_copy'), t('mirror_sticker_clear'), t('mirror_158'),
  ]);
});

test('duplicates and clears sticker layers', () => {
  const onChange = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<MirrorStickerEditor config={configured()} onChange={onChange} resourcesById={{}} theme={getTheme('light')} />);
  });
  const actions = () => renderer!.root.findByType(MirrorEditorToolbar).props.actions;
  ReactTestRenderer.act(() => actions().find((action: any) => action.label === t('mirror_sticker_copy')).onPress());
  expect(onChange.mock.calls[0][0].layout.stickerLayers).toHaveLength(3);
  ReactTestRenderer.act(() => actions().find((action: any) => action.label === t('mirror_sticker_clear')).onPress());
  expect(onChange.mock.calls.at(-1)[0].layout.stickerLayers).toEqual([]);
});
