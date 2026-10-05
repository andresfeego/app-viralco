import AsyncStorage from '@react-native-async-storage/async-storage';
import { exists } from '@dr.pogodin/react-native-fs';
import Native from '../specs/NativeKapturaPrinter';
import { printCompositions, recoverPrintJobs } from '../src/services/mirrorPrinting';
import { detectPrinter, getPrinterBinding } from '../src/services/printers';
import { assertOfflineOperation, authorizeMirrorOperation } from '../src/services/mirrorOperationAccess';
import { networkAvailable, sameOfflineIdentity } from '../src/services/offlineCatalog';

jest.mock('../specs/NativeKapturaPrinter', () => ({ printDocument: jest.fn() }));
jest.mock('../src/services/printers', () => ({ detectPrinter: jest.fn(), getPrinterBinding: jest.fn() }));
jest.mock('../src/services/offlineCatalog', () => ({ offlineIdentity: () => ({ subject: '1' }), sameOfflineIdentity: jest.fn(() => true), networkAvailable: jest.fn() }));
const scope = { userId: '1', accountId: '2', eventId: '3', eventModeId: '4' };
const run = {
  clientRunId: 'run', output: { uri: 'file:///photo.jpg' },
  configSnapshot: { delivery: { print: true }, print: { enabled: true, profileResourceId: '6', paperWidthCm: 10, paperHeightCm: 15, marginCm: 0, dpi: 300, copies: 2, fit: 'contain', orientation: 'portrait', twoPerPage: false } },
  printManifest: [{ eventResourceId: '6', metadata: { printProfile: { kind: 'print-profile', output: { maxCopies: 20, colorMode: 'color', supportsTwoPerPage: true } } } }],
};
let data;
beforeEach(() => {
  jest.clearAllMocks(); data = new Map();
  AsyncStorage.getItem.mockImplementation(async k => data.get(k) || null);
  AsyncStorage.setItem.mockImplementation(async (k, v) => data.set(k, v));
  exists.mockResolvedValue(true);
  networkAvailable.mockResolvedValue(false); sameOfflineIdentity.mockReturnValue(true);
  getPrinterBinding.mockResolvedValue({ url: 'ipp://printer.local', name: 'Printer' });
  Native.printDocument.mockResolvedValue('{"status":"submitted"}');
});
it('prints locally without upload and pins settings to the original composition', async () => {
  await expect(printCompositions([run], scope)).resolves.toBe('submitted');
  expect(assertOfflineOperation).toHaveBeenCalledWith('3', '4', undefined, undefined);
  expect(authorizeMirrorOperation).not.toHaveBeenCalled();
  const payload = JSON.parse(Native.printDocument.mock.calls[0][0]);
  expect(payload.options).toMatchObject({ copies: 2, widthMm: 100, heightMm: 150 });
  expect(JSON.parse(data.get('@kaptura/print-jobs:v1'))[0].status).toBe('submitted');
});
it('requires fresh authorization when online and blocks a denied job', async () => {
  networkAvailable.mockResolvedValue(true);
  authorizeMirrorOperation.mockRejectedValueOnce(new Error('DENIED'));
  await expect(printCompositions([run], scope)).rejects.toThrow('DENIED');
  expect(Native.printDocument).not.toHaveBeenCalled();
});
it('does not send if the printer picker is cancelled', async () => {
  getPrinterBinding.mockResolvedValue(null); detectPrinter.mockResolvedValue(null);
  await expect(printCompositions([run], scope)).resolves.toBe('cancelled');
  expect(Native.printDocument).not.toHaveBeenCalled();
});
it('blocks repeated taps, retains unknown sends and never automatically retries', async () => {
  let settle;
  Native.printDocument.mockImplementationOnce(() => new Promise(resolve => { settle = resolve; }));
  const first = printCompositions([run], scope);
  await expect(printCompositions([run], scope)).rejects.toThrow('PRINT_BUSY');
  for (let n = 0; n < 40 && !settle; n++) await Promise.resolve();
  settle('{"status":"unknown"}');
  await expect(first).resolves.toBe('unknown');
  await recoverPrintJobs();
  expect(Native.printDocument).toHaveBeenCalledTimes(1);
  expect(JSON.parse(data.get('@kaptura/print-jobs:v1'))[0].status).toBe('unknown');
});
it('recovers interrupted work as unknown, not as a resend queue', async () => {
  data.set('@kaptura/print-jobs:v1', JSON.stringify([{ id: 'old', status: 'sending' }]));
  await recoverPrintJobs();
  expect(JSON.parse(data.get('@kaptura/print-jobs:v1'))[0].status).toBe('unknown');
  expect(Native.printDocument).not.toHaveBeenCalled();
});
it('rejects missing files and changed users', async () => {
  exists.mockResolvedValueOnce(false);
  await expect(printCompositions([run], scope)).rejects.toThrow('PRINT_FILE_MISSING');
  sameOfflineIdentity.mockReturnValueOnce(false);
  await expect(printCompositions([run], scope)).rejects.toThrow('MIRROR_SESSION_USER_CHANGED');
  expect(Native.printDocument).not.toHaveBeenCalled();
});
it('submits differing configurations sequentially and stops after cancellation', async () => {
  Native.printDocument.mockResolvedValueOnce('{"status":"cancelled"}');
  const other = { ...run, clientRunId: 'other', configSnapshot: { ...run.configSnapshot, print: { ...run.configSnapshot.print, copies: 1 } } };
  await expect(printCompositions([run, other], scope)).resolves.toBe('cancelled');
  expect(Native.printDocument).toHaveBeenCalledTimes(1);
});
