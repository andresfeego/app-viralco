import React from 'react';
import Renderer from 'react-test-renderer';
import { View } from 'react-native';
import { addFrameLayer, defaultMirrorConfig, movePhotoFrameLayer, normalizeMirrorConfig, photoFrameLayers, removeFrameLayer } from '../src/domain/magicMirrorConfig';
import { CanvasContent } from '../src/components/MirrorConfigPreview';
import { getTheme } from '../src/design-system/theme';

const setup = () => addFrameLayer(addFrameLayer(defaultMirrorConfig(), '40'), '41');
const ids = (config) => photoFrameLayers(config.layout).map(layer => layer.slotId);

test('legacy stacking is preserved and slots can move above frames without changing capture order', () => {
  const config = setup();
  const order = ids(config);
  const next = movePhotoFrameLayer(config, 'slot', [config.layout.slots[0].slotId], 1);
  expect(ids(next)).toEqual([order[1], order[0], order[2]]);
  expect(next.layout.order).toEqual(config.layout.order);
  expect(next.layout.slots[0]).toEqual(config.layout.slots[0]);
  expect(ids(normalizeMirrorConfig(JSON.parse(JSON.stringify(next))).config)).toEqual(ids(next));
  expect(ids(movePhotoFrameLayer(next, 'slot', [config.layout.slots[0].slotId], -1))).toEqual(order);
});

test('frames move below slots, selection moves as a group and stale removed references are ignored', () => {
  const config = setup();
  const order = ids(config);
  const next = movePhotoFrameLayer(config, 'frame', config.layout.frameLayers.map(layer => layer.id), -1);
  expect(ids(next)).toEqual([order[1], order[2], order[0]]);
  expect(movePhotoFrameLayer(next, 'frame', config.layout.frameLayers.map(layer => layer.id), -1)).toBe(next);
  expect(ids(removeFrameLayer(next, config.layout.frameLayers[0].id))).toEqual([order[2], order[0]]);
});

test.each(['light', 'dark'])('shared preview/output canvas renders interleaved siblings in %s theme', (mode) => {
  const config = setup();
  const next = movePhotoFrameLayer(config, 'frame', [config.layout.frameLayers[0].id], -1);
  let renderer;
  Renderer.act(() => { renderer = Renderer.create(<CanvasContent config={next} theme={getTheme(mode)} resourcesById={{}}
    renderSlot={slot => <View key={slot.slotId} testID={`slot:${slot.slotId}`} />}
    renderFrameLayer={frame => <View key={frame.id} testID={`frame:${frame.id}`} />} />); });
  expect(renderer.root.findAllByType(View).filter(node => node.props.testID).map(node => node.props.testID)).toEqual(ids(next));
});
