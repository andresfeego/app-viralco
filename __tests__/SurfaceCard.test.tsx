import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { SurfaceCard } from '../src/design-system/components/SurfaceCard';
import { getTheme } from '../src/design-system/theme';

test('renders a token-driven gradient border', () => {
  const theme = getTheme('dark');
  let renderer: ReactTestRenderer.ReactTestRenderer;

  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <SurfaceCard
        surfaceColor={theme.surface}
        borderColor={theme.border}
        gradientBorder={theme.gradients.primaryToSecondary}
      >
        <Text>Espejo mágico</Text>
      </SurfaceCard>,
    );
  });

  const nativeGradient = renderer!.root.findByType('LinearGradient');
  expect(nativeGradient.props.colors).toEqual(
    theme.gradients.primaryToSecondary.colors,
  );
  expect(nativeGradient.props.angle).toBe(
    theme.gradients.primaryToSecondary.angle,
  );
  expect(nativeGradient.props.angleCenter).toEqual(
    theme.gradients.primaryToSecondary.angleCenter,
  );
  expect(nativeGradient.props.locations).toEqual(
    theme.gradients.primaryToSecondary.locations,
  );
});
