import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('@react-native-vector-icons/fontawesome6', () => 'Icon');

import { IconTextButton } from '../src/components/IconTextButton';
import { getTheme } from '../src/design-system/theme';

test('icon text button supports text-first order and custom direction', () => {
  const onPress = jest.fn();
  const theme = getTheme('dark');
  let renderer: ReactTestRenderer.ReactTestRenderer;

  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <IconTextButton
        theme={theme}
        label="Cambiar"
        icon="shuffle"
        direction="column"
        order="text-first"
        onPress={onPress}
        testID="icon-text-button"
      />
    );
  });

  const button = renderer!.root.findByProps({ testID: 'icon-text-button' });
  ReactTestRenderer.act(() => {
    button.props.onPress();
  });

  expect(onPress).toHaveBeenCalledTimes(1);
});
