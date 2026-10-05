import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

jest.mock('@react-native-vector-icons/fontawesome6', () => 'Icon');

import { MirrorConfigPreview } from '../src/components/MirrorConfigPreview';
import { MirrorEditorHelpModal } from '../src/components/MirrorEditorHelpModal';
import { MirrorEditorToolbar } from '../src/components/MirrorEditorToolbar';
import { MirrorFrameEditor } from '../src/components/MirrorFrameEditor';
import { addFrameLayer, defaultMirrorConfig } from '../src/domain/magicMirrorConfig';
import { getTheme } from '../src/design-system/theme';
import { tokens } from '../src/design-system/tokens';
import { t } from '../src/i18n';

const safeAreaMetrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

function configured() {
  return addFrameLayer(addFrameLayer(defaultMirrorConfig(), '40'), '41');
}

test('uses the photo canvas and exposes only frame editing actions', () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <MirrorFrameEditor config={configured()} onChange={jest.fn()} resourcesById={{}} theme={getTheme('dark')} />
      </SafeAreaProvider>,
    );
  });
  const preview = renderer!.root.findByType(MirrorConfigPreview);
  expect(preview.props.canvasBackgroundColor).toBe(tokens.colors.gray[3]);
  expect(preview.props.renderSlot).toBeUndefined();
  expect(preview.props.renderFrameLayer).toBeUndefined();
  expect(preview.props.canvasHandlers).toBeUndefined();
  expect(preview.props.canvasOverlay.props.onStartShouldSetResponder).toEqual(expect.any(Function));
  const labels = renderer!.root.findByType(MirrorEditorToolbar).props.actions.map((action: any) => action.label);
  expect(labels).toEqual([
    t('mirror_150'), t('mirror_151'), t('mirror_040'), t('mirror_frame_raise'), t('mirror_frame_lower'),
    t('mirror_153'), t('mirror_154'), t('mirror_frame_copy'), t('mirror_frame_clear'), t('mirror_158'),
  ]);
  expect(labels).not.toContain(t('mirror_173'));
});

test('duplicates one frame layer and can clear every frame', () => {
  const config = configured();
  const onChange = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<MirrorFrameEditor config={config} onChange={onChange} resourcesById={{}} theme={getTheme('light')} />);
  });
  const actions = () => renderer!.root.findByType(MirrorEditorToolbar).props.actions;
  ReactTestRenderer.act(() => actions().find((action: any) => action.label === t('mirror_frame_copy')).onPress());
  expect(onChange.mock.calls[0][0].layout.frameLayers).toHaveLength(3);
  ReactTestRenderer.act(() => actions().find((action: any) => action.label === t('mirror_frame_clear')).onPress());
  expect(onChange.mock.calls.at(-1)[0].layout.frameLayers).toEqual([]);
});

test('opens contextual frame help', () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <MirrorFrameEditor config={configured()} onChange={jest.fn()} resourcesById={{}} theme={getTheme('light')} />
      </SafeAreaProvider>,
    );
  });
  const help = renderer!.root.findByType(MirrorEditorToolbar).props.actions.find((action: any) => action.label === t('mirror_158'));
  ReactTestRenderer.act(() => help.onPress());
  expect(renderer!.root.findByType(MirrorEditorHelpModal).props.visible).toBe(true);
});

test('lowering a frame crosses the photo layer and undo/redo restores the shared order', () => {
  function Editor() {
    const [config, setConfig] = React.useState(configured());
    return <MirrorFrameEditor config={config} onChange={setConfig} theme={getTheme('dark')} />;
  }
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<Editor />); });
  const action = (key: string) => renderer!.root.findByType(MirrorEditorToolbar).props.actions.find((item: any) => item.key === key);
  const layout = () => renderer!.root.findByType(MirrorConfigPreview).props.config.layout;
  expect(action('lower').disabled).toBe(false);
  ReactTestRenderer.act(() => action('lower').onPress());
  const ordered = layout().photoFrameOrder;
  expect(ordered[0]).toBe('frame:frame-40');
  expect(ordered[1]).toBe('slot:slot-1');
  ReactTestRenderer.act(() => action('undo').onPress());
  expect(layout().photoFrameOrder).toBeUndefined();
  ReactTestRenderer.act(() => action('redo').onPress());
  expect(layout().photoFrameOrder).toEqual(ordered);
});
