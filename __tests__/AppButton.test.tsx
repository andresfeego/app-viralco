import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { getTheme } from '../src/design-system/theme';
import { AppButton } from '../src/design-system/components/AppButton';

test('renders the requested token gradient', () => {
  const theme = getTheme('dark');
  let renderer: ReactTestRenderer.ReactTestRenderer;

  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <AppButton
        label="Iniciar sesion"
        onPress={jest.fn()}
        backgroundColor={theme.buttonBg}
        pressedColor={theme.buttonBgPressed}
        textColor={theme.buttonText}
        gradient={theme.gradients.primaryToSecondary}
        testID="gradient-button"
      />,
    );
  });

  expect(renderer!.root.findByType('LinearGradient').props.colors).toEqual(
    theme.gradients.primaryToSecondary.colors,
  );
});
