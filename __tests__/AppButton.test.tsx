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

  const nativeGradient = renderer!.root.findByType('LinearGradient');

  expect(nativeGradient.props.colors).toEqual(
    theme.gradients.primaryToSecondary.colors,
  );
  expect(nativeGradient.props.useAngle).toBe(true);
  expect(nativeGradient.props.angle).toBe(45);
  expect(nativeGradient.props.angleCenter).toEqual({ x: 0.5, y: 0.5 });
});
