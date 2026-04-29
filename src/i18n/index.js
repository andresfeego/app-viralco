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
