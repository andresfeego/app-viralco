export const dictionary = {
  menu_000: { es: 'Superadmin', en: 'Superadmin' },
  menu_001: { es: 'Cuenta', en: 'Account' },
  menu_002: { es: 'Eventos', en: 'Events' },
  config_000: { es: 'Configuracion', en: 'Settings' },
  submenu_000: { es: 'Usuarios administradores', en: 'Admin users' },
  submenu_001: { es: 'Crear usuario admin', en: 'Create admin user' },
  submenu_002: { es: 'Bitacora', en: 'Logbook' },
  status_000: { es: 'Pendiente', en: 'Pending' },
  status_001: { es: 'Activo', en: 'Active' },
  status_002: { es: 'Inactivo', en: 'Inactive' },
  status_003: { es: 'Desconocido', en: 'Unknown' },
  event_000: { es: 'Listado de eventos', en: 'Event list' },
  event_001: { es: 'Crear evento', en: 'Create event' },
  event_002: { es: 'Detalle', en: 'Detail' },
  event_003: { es: 'Branding', en: 'Branding' },
  event_004: { es: 'Overlays', en: 'Overlays' },
  event_010: { es: 'Estado', en: 'Status' },
  event_011: { es: 'Fecha', en: 'Date' },
  event_012: { es: 'Evento activo', en: 'Active event' },
  event_020: { es: 'Guardando...', en: 'Saving...' },
  event_021: { es: 'Cargando eventos...', en: 'Loading events...' },
  event_022: { es: 'No hay eventos todavia', en: 'No events yet' },
  event_023: { es: 'Selecciona un evento para ver detalle', en: 'Select an event to view details' },
  event_024: { es: 'Cargando detalle...', en: 'Loading detail...' },
  event_025: { es: 'Valores permitidos', en: 'Allowed values' },
  event_026: { es: 'Tipos permitidos', en: 'Allowed types' },
  event_027: { es: 'No hay overlays registrados', en: 'No overlays found' },
  event_028: { es: 'Orden de capa', en: 'Layer order' },
  event_029: { es: 'Activo', en: 'Active' },
  event_030: { es: 'Sin evento seleccionado', en: 'No selected event' },
  event_040: { es: 'No se pudo cargar eventos', en: 'Could not load events' },
  event_041: { es: 'No se pudo cargar detalle del evento', en: 'Could not load event detail' },
  event_042: { es: 'No se pudo cargar overlays', en: 'Could not load overlays' },
  event_050: { es: 'Nombre de evento es requerido', en: 'Event name is required' },
  event_051: { es: 'Fecha del evento es requerida', en: 'Event date is required' },
  event_052: { es: 'Telefono invalido', en: 'Invalid phone number' },
  event_053: { es: 'Las URLs de branding deben ser http(s) validas', en: 'Branding URLs must be valid http(s)' },
  event_054: { es: 'Nombre de overlay es requerido', en: 'Overlay name is required' },
  event_055: { es: 'URL de archivo invalida', en: 'Invalid file URL' },
  event_056: { es: 'El orden de capa debe ser numerico', en: 'Layer order must be numeric' },
  event_060: { es: 'No tienes permisos para editar eventos', en: 'No permission to edit events' },
  event_061: { es: 'Evento creado correctamente', en: 'Event created successfully' },
  event_062: { es: 'No se pudo crear evento', en: 'Could not create event' },
  event_063: { es: 'Evento actualizado correctamente', en: 'Event updated successfully' },
  event_064: { es: 'No se pudo actualizar evento', en: 'Could not update event' },
  event_065: { es: 'Branding actualizado correctamente', en: 'Branding updated successfully' },
  event_066: { es: 'No se pudo actualizar branding', en: 'Could not update branding' },
  event_067: { es: 'Overlay creado correctamente', en: 'Overlay created successfully' },
  event_068: { es: 'No se pudo crear overlay', en: 'Could not create overlay' },
  event_069: { es: 'Orden de capas actualizado', en: 'Layer order updated' },
  event_070: { es: 'No se pudo actualizar orden de capas', en: 'Could not update layer order' },
  event_071: { es: 'Nombre del evento', en: 'Event name' },
  event_072: { es: 'Slug o clave publica', en: 'Slug or public key' },
  event_073: { es: 'Fecha del evento (YYYY-MM-DD)', en: 'Event date (YYYY-MM-DD)' },
  event_074: { es: 'Telefono opcional', en: 'Optional phone' },
  event_075: { es: 'Descripcion opcional', en: 'Optional description' },
  event_076: { es: 'Crear evento', en: 'Create event' },
  event_077: { es: 'Guardar cambios', en: 'Save changes' },
  event_078: { es: 'URL logo', en: 'Logo URL' },
  event_079: { es: 'URL fondo', en: 'Background URL' },
  event_080: { es: 'Color primario', en: 'Primary color' },
  event_081: { es: 'Color secundario', en: 'Secondary color' },
  event_082: { es: 'Color de texto', en: 'Text color' },
  event_083: { es: 'Guardar branding', en: 'Save branding' },
  event_084: { es: 'Nombre overlay', en: 'Overlay name' },
  event_085: { es: 'URL archivo overlay', en: 'Overlay file URL' },
  event_086: { es: 'Tipo (frame, overlay, background, logo, other)', en: 'Type (frame, overlay, background, logo, other)' },
  event_087: { es: 'Orden de capa', en: 'Layer order' },
  event_088: { es: 'Overlay activo', en: 'Active overlay' },
  event_089: { es: 'Agregar overlay', en: 'Add overlay' },
  event_090: { es: 'Overlays registrados', en: 'Registered overlays' },
  event_091: { es: 'Si', en: 'Yes' },
  event_092: { es: 'No', en: 'No' },
  event_093: { es: 'Subir', en: 'Move up' },
  event_094: { es: 'Bajar', en: 'Move down' },
};

let activeLocale = 'es';

export function setLocale(locale) {
  activeLocale = locale || 'es';
}

export function getLocale() {
  return activeLocale;
}

export function t(messageId) {
  const entry = dictionary[messageId];
  if (!entry) {
    return 'dicc_undefined';
  }
  const value = entry[activeLocale];
  if (typeof value === 'string' && value.trim()) {
    return value;
  }
  return 'dicc_undefined';
}
