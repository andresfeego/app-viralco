import React from 'react';
import { StyleSheet } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('@react-native-vector-icons/fontawesome6', () => 'Icon');

import { IconTextButton } from '../src/components/IconTextButton';
import { SectionHeader } from '../src/components/SectionHeader';
import { getTheme } from '../src/design-system/theme';

test.each(['light', 'dark'] as const)('uses the shared back icon and flexible title in %s mode', (mode) => {
  const theme = getTheme(mode);
  const onBack = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;

  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <SectionHeader
        title="Nombre muy largo de cuenta o evento"
        subtitle="Detalle de cuenta"
        iconName="building"
        theme={theme}
        onBack={onBack}
        backLabel="Volver a cuentas"
      />,
    );
  });

  const backButton = renderer!.root.findByType(IconTextButton);
  expect(backButton.props).toEqual(expect.objectContaining({ icon: 'arrow-left', label: 'Volver a cuentas', variant: 'ghost' }));
  ReactTestRenderer.act(() => backButton.props.onPress());
  expect(onBack).toHaveBeenCalledTimes(1);
  expect(StyleSheet.flatten(renderer!.root.findByProps({ testID: 'section-header-content' }).props.style).flex).toBe(1);
  expect(StyleSheet.flatten(renderer!.root.findByProps({ testID: 'section-header-subtitle' }).props.style).color).toBe(theme.tertiary);
});
