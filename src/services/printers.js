import AsyncStorage from '@react-native-async-storage/async-storage';
import NativeKapturaPrinter from '../../specs/NativeKapturaPrinter';

const bindingKey = (accountId) => `printer-binding:v1:${accountId}`;

export function parsePrinterIdentity(name) {
  const value = String(name || '').trim();
  const canon = /canon/i.test(value);
  return {
    manufacturer: canon ? 'Canon' : (value.split(/\s+/)[0] || 'Otra'),
    model: canon ? value.replace(/^canon\s*/i, '').trim() || value : value || 'Impresora detectada',
  };
}

export async function detectPrinter(accountId) {
  if (!NativeKapturaPrinter) throw new Error('PRINTER_PICKER_UNAVAILABLE');
  let selected;
  try {
    selected = await NativeKapturaPrinter.pickPrinter();
  } catch (error) {
    if (error?.code === 'PRINTER_PICKER_CANCELLED' || String(error?.message || '').includes('PRINTER_PICKER_CANCELLED')) return null;
    throw error;
  }
  const identity = parsePrinterIdentity(selected?.name);
  const binding = { ...identity, name: selected?.name || identity.model, url: selected?.url || '', selectedAt: new Date().toISOString() };
  await AsyncStorage.setItem(bindingKey(accountId), JSON.stringify(binding));
  return binding;
}

export async function getPrinterBinding(accountId) {
  const raw = await AsyncStorage.getItem(bindingKey(accountId));
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function detectedPrinterProfileInput(binding) {
  return {
    name: `${binding.manufacturer} ${binding.model} · Postal 100 × 148 mm`,
    appliesToAllEventTypes: true,
    // Discovery identifies a destination, not supported media or borderless capabilities.
    metadata: { source: 'native-printer-detection', capabilitiesVerified: false },
    profile: {
      schemaVersion: 1,
      kind: 'print-profile',
      manufacturer: binding.manufacturer,
      model: binding.model,
      paper: { name: 'Postal', widthMm: 100, heightMm: 148, orientation: 'portrait', borderless: true, safeMarginMm: 1.8 },
      output: { dpi: 300, fit: 'contain', defaultCopies: 1, maxCopies: 20, supportsTwoPerPage: true, colorMode: 'color' },
      compatibility: { transports: ['airprint'], platforms: ['ios'] },
    },
  };
}
