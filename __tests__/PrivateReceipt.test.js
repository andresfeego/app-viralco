import * as RNFS from '@dr.pogodin/react-native-fs';
import NativeKapturaDocuments from '../specs/NativeKapturaDocuments';
import { billingRequest } from '../src/services/api/billing';
import { createPrivateReceiptSession } from '../src/services/privateReceipt';

jest.mock('../src/services/api/billing', () => ({ billingRequest: jest.fn() }));
jest.mock('../specs/NativeKapturaDocuments', () => ({ __esModule: true, default: { renderPdfPage: jest.fn() } }));
jest.mock('../src/services/errorHandling', () => ({ recordClientTechnicalError: jest.fn(async () => {}) }));
jest.mock('@dr.pogodin/react-native-fs', () => ({ __esModule: true,
  CachesDirectoryPath: '/tmp/cache', readDir: jest.fn(), mkdir: jest.fn(async () => {}),
  downloadFile: jest.fn(), stat: jest.fn(), hash: jest.fn(), stopDownload: jest.fn(),
  exists: jest.fn(async () => true), unlink: jest.fn(async () => {}),
}));
const sha256 = 'a'.repeat(64);
const link = { url: 'https://private.test/receipt?signature=private', contentType: 'image/png', sizeBytes: 100, sha256 };
beforeEach(() => {
  jest.clearAllMocks();
  RNFS.readDir.mockResolvedValue([]);
  RNFS.downloadFile.mockImplementation(() => ({ jobId: 1, promise: Promise.resolve({ statusCode: 200 }) }));
  RNFS.stat.mockResolvedValue({ size: 100 }); RNFS.hash.mockResolvedValue(sha256);
  billingRequest.mockResolvedValue(link);
  NativeKapturaDocuments.renderPdfPage.mockImplementation(async (path, page) => ({ uri: `file://${path.replace('receipt.pdf', `page-${page}.png`)}`, width: 2000, height: 3000, pageCount: 2 }));
});

test('reauthorizes, checks integrity, uses only a temporary private copy, and removes it on close', async () => {
  const session = createPrivateReceiptSession('21');
  const document = await session.load();
  expect(billingRequest).toHaveBeenCalledWith('/reports/21/receipt');
  expect(document).toMatchObject({ contentType: 'image/png' });
  expect(document).not.toHaveProperty('url');
  expect(RNFS.downloadFile).toHaveBeenCalledWith(expect.objectContaining({ fromUrl: link.url, cacheable: false, toFile: expect.stringContaining('/kaptura-private-receipts/') }));
  expect(await session.page(0)).toEqual({ uri: `file://${document.path}`, pageCount: 1 });
  await session.dispose();
  expect(RNFS.unlink).toHaveBeenCalledWith(document.path.replace('/receipt.png', ''));
  const again = createPrivateReceiptSession('21'); await again.load(); await again.dispose();
  expect(billingRequest).toHaveBeenCalledTimes(2);
});

test('renders PDF pages locally and removes the preceding page without deleting the source PDF', async () => {
  billingRequest.mockResolvedValue({ ...link, contentType: 'application/pdf' });
  const session = createPrivateReceiptSession('22'); const document = await session.load();
  const first = await session.page(0), second = await session.page(1);
  expect(first.pageCount).toBe(2); expect(second.pageCount).toBe(2);
  expect(NativeKapturaDocuments.renderPdfPage).toHaveBeenCalledWith(document.path, 1);
  expect(RNFS.unlink).toHaveBeenCalledWith(first.uri.replace('file://', ''));
  expect(RNFS.unlink).not.toHaveBeenCalledWith(document.path);
  await session.dispose();
});

test.each(['forbidden', 'checksum', 'size', 'http'])('fails safely for %s and cleans only its viewer cache', async failure => {
  if (failure === 'forbidden') billingRequest.mockRejectedValueOnce(Object.assign(new Error('forbidden'), { code: 'FORBIDDEN' }));
  if (failure === 'checksum') RNFS.hash.mockResolvedValueOnce('wrong');
  if (failure === 'size') RNFS.stat.mockResolvedValueOnce({ size: 101 });
  if (failure === 'http') RNFS.downloadFile.mockReturnValueOnce({ jobId: 2, promise: Promise.resolve({ statusCode: 403 }) });
  const session = createPrivateReceiptSession('21');
  await expect(session.load()).rejects.toBeTruthy();
  await session.dispose();
  expect(RNFS.unlink.mock.calls.every(([path]) => /^\/tmp\/cache\/kaptura-private-receipts\/\d+-[a-z0-9]+$/.test(path))).toBe(true);
});

test('closing during download cancels it and ignores its late result', async () => {
  let finish;
  RNFS.downloadFile.mockReturnValueOnce({ jobId: 7, promise: new Promise(resolve => { finish = resolve; }) });
  const session = createPrivateReceiptSession('21');
  const load = session.load();
  const rejected = load.catch(error => error);
  for (let i = 0; i < 10; i++) await Promise.resolve();
  const disposing = session.dispose();
  expect(RNFS.stopDownload).toHaveBeenCalledWith(7);
  finish({ statusCode: 200 });
  expect(await rejected).toMatchObject({ code: 'RECEIPT_VIEW_CANCELLED' }); await disposing;
  await expect(session.page(0)).rejects.toMatchObject({ code: 'RECEIPT_VIEW_CANCELLED' });
});
