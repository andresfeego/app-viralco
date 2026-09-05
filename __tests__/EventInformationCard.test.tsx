import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text } from 'react-native';
import { EventInformationCard } from '../src/components/EventInformationCard';
import { IconTextButton } from '../src/components/IconTextButton';
import { StatusBadge } from '../src/components/StatusBadge';
import { getTheme } from '../src/design-system/theme';

jest.mock('@react-native-vector-icons/fontawesome6', () => 'Icon');

const labels = {
  type: 'Tipo de evento',
  date: 'Fecha',
  status: 'Estado',
  timezone: 'Zona horaria',
  identifier: 'Identificador',
  description: 'Descripción',
  edit: 'Editar datos',
};

test.each(['light', 'dark'] as const)('presents event information semantically in %s mode', (mode) => {
  const onEdit = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <EventInformationCard
        theme={getTheme(mode)}
        event={{
          eventType: { name: 'Boda' },
          eventDate: '2026-09-05',
          status: 'active',
          timezone: 'America/Bogota',
          slug: 'boda-demo',
          description: 'Celebración principal',
        }}
        title="Datos del evento"
        labels={labels}
        statusLabel="Activo"
        statusFlag="success"
        canEdit
        onEdit={onEdit}
      />,
    );
  });

  const text = renderer!.root.findAllByType(Text).map((node) => node.props.children).flat().join(' ');
  expect(text).toContain('Datos del evento');
  expect(text).toContain('Tipo de evento');
  expect(text).toContain('Boda');
  expect(text).toContain('2026-09-05');
  expect(text).not.toContain('Zona horaria');
  expect(text).not.toContain('America/Bogota');
  expect(renderer!.root.findByType(StatusBadge).props).toEqual(expect.objectContaining({ label: 'Activo', flag: 'success' }));
  ReactTestRenderer.act(() => renderer!.root.findByType(IconTextButton).props.onPress());
  expect(onEdit).toHaveBeenCalledTimes(1);
});
