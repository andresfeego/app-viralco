import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

jest.mock('@react-native-vector-icons/fontawesome6', () => 'Icon');

const safeAreaMetrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

import { MirrorConfigPreview } from '../src/components/MirrorConfigPreview';
import { hitTestMirrorGesture, MirrorLayoutEditor } from '../src/components/MirrorLayoutEditor';
import { MirrorEditorHelpModal } from '../src/components/MirrorEditorHelpModal';
import { IconTextButton } from '../src/components/IconTextButton';
import { applyMirrorFormat, defaultMirrorConfig, moveSlots, slotIdentity } from '../src/domain/magicMirrorConfig';
import { getTheme } from '../src/design-system/theme';
import { tokens } from '../src/design-system/tokens';
import { t } from '../src/i18n';

test('keeps drag geometry local and commits it once when the gesture ends', () => {
  const config = defaultMirrorConfig();
  const onChange = jest.fn();
  const onInteractionChange = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<MirrorLayoutEditor config={config} onChange={onChange} onInteractionChange={onInteractionChange} theme={getTheme('light')} />);
  });

  const preview = renderer!.root.findByType(MirrorConfigPreview);
  expect(preview.props.canvasBackgroundColor).toBe(tokens.colors.gray[3]);
  const slot = preview.props.renderSlot(preview.props.config.layout.slots[0]);
  const moved = moveSlots(config.layout.slots, [slotIdentity(config.layout.slots[0])], 3, 4);

  ReactTestRenderer.act(() => {
    slot.props.onInteractionStart();
    slot.props.onSlotsChange(moved);
  });
  expect(onChange).not.toHaveBeenCalled();
  expect(onInteractionChange).toHaveBeenLastCalledWith(true);
  expect(renderer!.root.findByType(MirrorConfigPreview).props.config.layout.slots[0]).toEqual(expect.objectContaining({ x: 10, y: 21 }));

  ReactTestRenderer.act(() => slot.props.onInteractionEnd());
  expect(onChange).toHaveBeenCalledTimes(1);
  expect(onChange.mock.calls[0][0].layout.slots[0]).toEqual(expect.objectContaining({ x: 10, y: 21 }));
  expect(onInteractionChange).toHaveBeenLastCalledWith(false);
});

test('toggles cards on repeated taps in simple and multiple selection', () => {
  const config = defaultMirrorConfig();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<MirrorLayoutEditor config={config} onChange={jest.fn()} theme={getTheme('light')} />);
  });

  const selectedSlotIds = () => {
    const preview = renderer!.root.findByType(MirrorConfigPreview);
    return preview.props.renderSlot(preview.props.config.layout.slots[0]).props.selectedSlotIds;
  };
  const select = (slotId: string) => {
    const preview = renderer!.root.findByType(MirrorConfigPreview);
    ReactTestRenderer.act(() => preview.props.renderSlot(preview.props.config.layout.slots[0]).props.onSelect(slotId));
  };

  expect(selectedSlotIds()).toEqual(['slot-1']);
  select('slot-1');
  expect(selectedSlotIds()).toEqual([]);
  select('slot-2');
  expect(selectedSlotIds()).toEqual(['slot-2']);
  select('slot-2');
  expect(selectedSlotIds()).toEqual([]);

  const multipleButton = renderer!.root.findAllByType(IconTextButton).find((button) => button.props.accessibilityLabel === t('mirror_040'))!;
  ReactTestRenderer.act(() => multipleButton.props.onPress());
  select('slot-1');
  select('slot-2');
  expect(selectedSlotIds()).toEqual(['slot-1', 'slot-2']);
  select('slot-1');
  expect(selectedSlotIds()).toEqual(['slot-2']);
  select('slot-2');
  expect(selectedSlotIds()).toEqual([]);
});

test('routes move, resize and rotation through one canvas gesture hit test', () => {
  const canvas = { width: 200, height: 300 };
  const slots = [{ photoNumber: 1, x: 10, y: 10, width: 40, height: 40, rotation: 0 }];
  expect(hitTestMirrorGesture(slots, ['1'], 'move', { x: 60, y: 90 }, canvas)).toEqual({ mode: 'move', slotId: '1' });
  expect(hitTestMirrorGesture(slots, ['1'], 'move', { x: 100, y: 150 }, canvas)).toEqual({ mode: 'resize', slotId: '1' });
  expect(hitTestMirrorGesture(slots, ['1'], 'rotate', { x: 60, y: 22 }, canvas)).toEqual({ mode: 'rotate', slotId: '1' });
  expect(hitTestMirrorGesture(slots, [], 'move', { x: 60, y: 90 }, canvas)).toEqual({ mode: 'move', slotId: '1' });
  expect(hitTestMirrorGesture(slots, ['1'], 'move', { x: 180, y: 280 }, canvas)).toEqual({ mode: 'none', slotId: null });
});

test('owns editable gestures at canvas level instead of nesting responders in slots', () => {
  const config = defaultMirrorConfig();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<MirrorLayoutEditor config={config} onChange={jest.fn()} theme={getTheme('light')} />);
  });
  const preview = renderer!.root.findByType(MirrorConfigPreview);
  expect(preview.props.canvasHandlers.onStartShouldSetResponder).toEqual(expect.any(Function));
  const slot = preview.props.renderSlot(preview.props.config.layout.slots[0]);
  expect(slot.props.onStartShouldSetResponder).toBeUndefined();
  expect(slot.props.onMoveShouldSetResponder).toBeUndefined();
});

test('changes shot layers as a selected group and exposes favorite and help actions', () => {
  const config = applyMirrorFormat(defaultMirrorConfig(), 'collage');
  const onChange = jest.fn();
  const onSaveTemplate = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <MirrorLayoutEditor config={config} onChange={onChange} onSaveTemplate={onSaveTemplate} theme={getTheme('light')} />
      </SafeAreaProvider>,
    );
  });
  const button = (label: string) => renderer!.root.findAllByType(IconTextButton).find((item) => item.props.accessibilityLabel === label)!;
  const preview = () => renderer!.root.findByType(MirrorConfigPreview);

  ReactTestRenderer.act(() => button(t('mirror_040')).props.onPress());
  ReactTestRenderer.act(() => preview().props.renderSlot(preview().props.config.layout.slots[2]).props.onSelect('slot-3'));
  ReactTestRenderer.act(() => button(t('mirror_155')).props.onPress());
  expect(onChange.mock.calls[0][0].layout.slots.map((slot: any) => slot.photoNumber)).toEqual([2, 1, 4, 3]);

  ReactTestRenderer.act(() => button(t('mirror_157')).props.onPress());
  expect(onSaveTemplate).toHaveBeenCalledTimes(1);
  ReactTestRenderer.act(() => button(t('mirror_158')).props.onPress());
  expect(renderer!.root.findByType(MirrorEditorHelpModal).props.visible).toBe(true);
});

test('offers a separate action that repeats the selected capture number', () => {
  const config = applyMirrorFormat(defaultMirrorConfig(), 'personalizar-5x15');
  const onChange = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<MirrorLayoutEditor config={config} onChange={onChange} theme={getTheme('light')} />);
  });
  const repeat = renderer!.root.findAllByType(IconTextButton).find((item) => item.props.accessibilityLabel === t('mirror_173'))!;
  expect(repeat.props.icon).toBe('copy');
  expect(repeat.props.iconStyle).toBe('regular');
  ReactTestRenderer.act(() => repeat.props.onPress());
  const next = onChange.mock.calls[0][0];
  expect(next.layout.shotCount).toBe(3);
  expect(next.layout.slots).toHaveLength(4);
  expect(next.layout.slots.filter((slot: any) => slot.photoNumber === 1)).toHaveLength(2);
});
