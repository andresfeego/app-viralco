import React from 'react';
import { StyleSheet, Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('../specs/NativeKapturaFontLoader', () => ({
  __esModule: true,
  default: { loadFont: jest.fn(() => Promise.resolve('Yesteryear-Regular')) },
}));

import { RuntimeFontText } from '../src/components/RuntimeFontText';
import { clearRuntimeFontCacheForTests } from '../src/services/runtimeFonts';
import NativeKapturaFontLoader from '../specs/NativeKapturaFontLoader';

const mockLoadFont = NativeKapturaFontLoader!.loadFont as jest.Mock;

beforeEach(() => {
  clearRuntimeFontCacheForTests();
  mockLoadFont.mockClear();
});

test('loads and applies a remote resource font family', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <RuntimeFontText
        layer={{ font: 'resource', fontResourceId: '12' }}
        resource={{ id: '12', asset: { id: '44', fileUrl: 'https://example.test/yesteryear.ttf', fileSignedUrl: 'https://signed.example.test/temporary.ttf', metadata: { sha256: 'font-hash' } } }}
      >
        Tu evento
      </RuntimeFontText>,
    );
    await Promise.resolve();
  });
  expect(mockLoadFont).toHaveBeenCalledWith('44:font-hash', 'https://example.test/yesteryear.ttf');
  expect(StyleSheet.flatten(renderer!.root.findByType(Text).props.style)).toEqual(expect.objectContaining({ fontFamily: 'Yesteryear-Regular', fontWeight: 'normal' }));
});
