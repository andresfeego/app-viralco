jest.mock('../specs/NativeKapturaPrinter', () => null);

import { detectedPrinterProfileInput, parsePrinterIdentity } from '../src/services/printers';

describe('printer profile helpers', () => {
  it('normaliza una Canon detectada sin duplicar el fabricante', () => {
    expect(parsePrinterIdentity('Canon SELPHY CP1500')).toEqual({ manufacturer: 'Canon', model: 'SELPHY CP1500' });
  });

  it('crea una configuración editable 100 × 148 mm para una impresora local', () => {
    const input = detectedPrinterProfileInput({ manufacturer: 'Canon', model: 'SELPHY CP1500' });
    expect(input.profile.paper).toMatchObject({ widthMm: 100, heightMm: 148, orientation: 'portrait' });
    expect(input.profile.output).toMatchObject({ dpi: 300, defaultCopies: 1, fit: 'contain' });
    expect(input.profile.compatibility.transports).toEqual(['airprint']);
  });
});
