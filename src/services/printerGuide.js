import { DocumentDirectoryPath, mkdir, exists, hash, downloadFile, moveFile, unlink, stopDownload } from '@dr.pogodin/react-native-fs';
import { Platform, Linking } from 'react-native';
import NativeKapturaPrinter from '../../specs/NativeKapturaPrinter';
import { apiRequest } from './api/http';
import { t } from '../i18n';

const ROOT = `${DocumentDirectoryPath}/kaptura-print-manuals`;
const manualPath = manual => /^[a-f0-9]{64}$/.test(manual?.sha256 || '') ? `${ROOT}/${manual.sha256}.pdf` : null;
const downloads = new Map();
export function guideForProfile(metadata) {
  if (metadata?.printGuide) return metadata.printGuide;
  const profile = metadata?.printProfile;
  if (/canon/i.test(profile?.manufacturer || '') && /\bCP\s*1500\b/i.test(profile?.model || '')) return {
    steps: [],
    stepsByPlatform: { ios: t('guide_cp_ios').split('\n'), android: t('guide_cp_android').split('\n') },
    sourceUrl: 'https://cam.start.canon/en/P001/manual/html/index.html',
    revision: '',
  };
  return { steps: [], sourceUrl: '', revision: '' };
}
export async function cachePrinterManual(manual) {
  const path = manualPath(manual);
  if (!path || !manual.url?.startsWith('https://')) return null;
  if (downloads.has(path)) return downloads.get(path);
  const work = (async () => {
    if (await exists(path) && await hash(path, 'sha256') === manual.sha256) return path;
    await mkdir(ROOT);
    const partial = `${path}.part`;
    const task = downloadFile({ fromUrl: manual.url, toFile: partial, connectionTimeout: 10000, readTimeout: 20000 });
    let timer;
    try {
      const result = await Promise.race([task.promise, new Promise((_, reject) => { timer = setTimeout(() => { stopDownload(task.jobId); reject(new Error('MANUAL_TIMEOUT')); }, 30000); })]);
      if (result.statusCode !== 200 || await hash(partial, 'sha256') !== manual.sha256) throw new Error('MANUAL_INVALID');
      if (await exists(path)) await unlink(path);
      await moveFile(partial, path);
      return path;
    } finally { clearTimeout(timer); if (await exists(partial)) await unlink(partial); }
  })();
  downloads.set(path, work);
  try { return await work; } finally { downloads.delete(path); }
}
export async function openPrinterManual(manual) {
  const path = await cachePrinterManual(manual);
  if (!path || !NativeKapturaPrinter?.openManual) throw new Error('MANUAL_UNAVAILABLE');
  await NativeKapturaPrinter.openManual(path);
}
export async function openPrinterWifiSettings() {
  if (Platform.OS === 'android') await Linking.sendIntent('android.settings.WIFI_SETTINGS');
  else await Linking.openSettings(); // iOS has no public URL that opens the Wi-Fi pane directly.
}
export async function savePrinterGuide(assetId, guide, file) {
  const body = new FormData();
  body.append('guide', JSON.stringify(guide));
  if (file) body.append('file', { uri: file.uri, name: file.name || 'manual.pdf', type: 'application/pdf' });
  return apiRequest(`/api/admin/library/print-profiles/${assetId}/guide`, { method: 'POST', body }, { timeoutMs: 90000 });
}
