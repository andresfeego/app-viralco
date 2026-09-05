import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('@react-native-vector-icons/fontawesome6', () => 'Icon');

import { MirrorBackgroundEditor } from '../src/components/MirrorBackgroundEditor';
import { MirrorConfigPreview } from '../src/components/MirrorConfigPreview';
import { MirrorEditorToolbar } from '../src/components/MirrorEditorToolbar';
import { addBackgroundColorLayer, addBackgroundResourceLayer, defaultMirrorConfig } from '../src/domain/magicMirrorConfig';
import { getTheme } from '../src/design-system/theme';
import { tokens } from '../src/design-system/tokens';
import { t } from '../src/i18n';

function configured() {
  return addBackgroundResourceLayer(addBackgroundColorLayer(defaultMirrorConfig(), '#2D3047'), '80');
}

test('uses a dedicated gesture overlay while the preview renders backgrounds below photos', () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<MirrorBackgroundEditor config={configured()} onChange={jest.fn()} resourcesById={{}} theme={getTheme('dark')} />); });
  const preview = renderer!.root.findByType(MirrorConfigPreview);
  expect(preview.props.canvasBackgroundColor).toBe(tokens.colors.gray[3]);
  expect(preview.props.canvasHandlers).toBeUndefined();
  expect(preview.props.canvasOverlay.props.onStartShouldSetResponder).toEqual(expect.any(Function));
  const labels = renderer!.root.findByType(MirrorEditorToolbar).props.actions.map((action: any) => action.label);
  expect(labels).toEqual([t('mirror_150'), t('mirror_151'), t('mirror_040'), t('mirror_background_raise'), t('mirror_background_lower'), t('mirror_153'), t('mirror_154'), t('mirror_background_copy'), t('mirror_background_clear'), t('mirror_158')]);
});

test('duplicates and clears color or image background layers', () => {
  const onChange = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<MirrorBackgroundEditor config={configured()} onChange={onChange} resourcesById={{}} theme={getTheme('light')} />); });
  const actions = () => renderer!.root.findByType(MirrorEditorToolbar).props.actions;
  ReactTestRenderer.act(() => actions().find((action: any) => action.label === t('mirror_background_copy')).onPress());
  expect(onChange.mock.calls[0][0].layout.backgroundLayers).toHaveLength(3);
  ReactTestRenderer.act(() => actions().find((action: any) => action.label === t('mirror_background_clear')).onPress());
  expect(onChange.mock.calls.at(-1)[0].layout.backgroundLayers).toEqual([]);
});
