import * as RNFS from '@dr.pogodin/react-native-fs';
import NativeKapturaDocuments from '../../specs/NativeKapturaDocuments';
import { billingRequest } from './api/billing';
import { recordClientTechnicalError } from './errorHandling';

const ROOT = `${RNFS.CachesDirectoryPath}/kaptura-private-receipts`;
const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'application/pdf': 'pdf' };
const activeDirectories = new Set();
const fail = code => Object.assign(new Error(code), { code });

export function createPrivateReceiptSession(reportId) {
  const directory = `${ROOT}/${Date.now()}-${Math.random().toString(36).slice(2)}`;
  activeDirectories.add(directory);
  const pending = new Set();
  let disposed = false;
  let jobId;
  let document;
  let renderedPage;
  const check = () => { if (disposed) throw fail('RECEIPT_VIEW_CANCELLED'); };
  const track = work => {
    const task = work();
    pending.add(task);
    task.then(() => pending.delete(task), () => pending.delete(task));
    return task;
  };
  return {
    load: () => track(async () => {
      check();
      // Reauthorize every opening/retry; never persist the signed URL.
      const link = await billingRequest(`/reports/${encodeURIComponent(reportId)}/receipt`);
      check();
      if (!link.url?.startsWith('https://') || !TYPES[link.contentType] || !/^[a-f0-9]{64}$/.test(link.sha256) || !Number.isFinite(link.sizeBytes) || link.sizeBytes <= 0 || link.sizeBytes > 10 * 1024 * 1024) throw fail('RECEIPT_VIEW_INVALID');
      await RNFS.mkdir(directory, { NSURLIsExcludedFromBackupKey: true });
      check();
      // Only discard this viewer's abandoned caches from earlier processes.
      const entries = await RNFS.readDir(ROOT);
      await Promise.all(entries.filter(entry => /^\d+-[a-z0-9]+$/.test(entry.name) && entry.isDirectory() && !activeDirectories.has(`${ROOT}/${entry.name}`))
        .map(entry => RNFS.unlink(`${ROOT}/${entry.name}`).catch(() => {})));
      check();
      const path = `${directory}/receipt.${TYPES[link.contentType]}`;
      const task = RNFS.downloadFile({ fromUrl: link.url, toFile: path, cacheable: false, connectionTimeout: 10000, readTimeout: 20000 });
      jobId = task.jobId;
      let timer;
      try {
        const result = await Promise.race([task.promise, new Promise((_, reject) => {
          timer = setTimeout(() => { RNFS.stopDownload(task.jobId); reject(fail('RECEIPT_VIEW_TIMEOUT')); }, 30000);
        })]);
        check();
        if (result.statusCode !== 200 || Number((await RNFS.stat(path)).size) !== link.sizeBytes || await RNFS.hash(path, 'sha256') !== link.sha256) throw fail('RECEIPT_VIEW_INVALID');
        check();
        document = { path, contentType: link.contentType };
        return document;
      } finally { clearTimeout(timer); jobId = undefined; }
    }),
    page: page => track(async () => {
      check();
      if (!document || !Number.isInteger(page) || page < 0) throw fail('RECEIPT_VIEW_INVALID');
      if (document.contentType !== 'application/pdf') return { uri: `file://${document.path}`, pageCount: 1 };
      if (!NativeKapturaDocuments?.renderPdfPage) throw fail('RECEIPT_VIEW_UPDATE_REQUIRED');
      const result = await NativeKapturaDocuments.renderPdfPage(document.path, page);
      check();
      // Keep only the current rendered page; a long PDF must not accumulate images.
      const output = `${directory}/page-${page}.png`;
      if (result.uri !== `file://${output}`) throw fail('RECEIPT_VIEW_INVALID');
      if (renderedPage && renderedPage !== output && await RNFS.exists(renderedPage)) await RNFS.unlink(renderedPage);
      renderedPage = output;
      check();
      return result;
    }),
    dispose: async () => {
      disposed = true;
      if (jobId !== undefined) RNFS.stopDownload(jobId);
      await Promise.allSettled([...pending]);
      try { if (await RNFS.exists(directory)) await RNFS.unlink(directory); }
      catch { recordClientTechnicalError({ code: 'RECEIPT_CACHE_CLEANUP_FAILED' }).catch(() => {}); }
      finally { activeDirectories.delete(directory); }
    },
  };
}
