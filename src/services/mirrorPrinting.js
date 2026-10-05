import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { exists, readFile } from '@dr.pogodin/react-native-fs';
import NativeKapturaPrinter from '../../specs/NativeKapturaPrinter';
import { canPrintComposition, printOptions, groupPrintItems } from '../domain/mirrorPrint';
import { detectPrinter, getPrinterBinding } from './printers';
import { assertOfflineOperation, authorizeMirrorOperation } from './mirrorOperationAccess';
import { offlineIdentity, sameOfflineIdentity, networkAvailable } from './offlineCatalog';
import { recordClientTechnicalError } from './errorHandling';
import { createClientUuid } from '../domain/mirrorRuntime';

const KEY = '@kaptura/print-jobs:v1';
let busy = false;
let writes = Promise.resolve();
async function record(job) {
  writes = writes.catch(() => {}).then(async () => {
    const entries = JSON.parse(await AsyncStorage.getItem(KEY) || '[]');
    await AsyncStorage.setItem(KEY, JSON.stringify([job, ...entries.filter(e => e.id !== job.id)].slice(0, 100)));
  });
  await writes;
}
export async function recoverPrintJobs() {
  if (busy) return;
  writes = writes.catch(() => {}).then(async () => {
    const entries = JSON.parse(await AsyncStorage.getItem(KEY) || '[]');
    await AsyncStorage.setItem(KEY, JSON.stringify(entries.map(e => ['preparing', 'sending'].includes(e.status) ? { ...e, status: 'unknown' } : e)));
  });
  await writes;
}

async function checkAccess(scope, identity) {
  if (!sameOfflineIdentity(identity)) throw new Error('MIRROR_SESSION_USER_CHANGED');
  if (await networkAvailable()) await authorizeMirrorOperation(scope);
  else await assertOfflineOperation(scope.eventId, scope.eventModeId, scope.clientSessionId || scope.sessionId, scope.runStartedAt);
  if (!sameOfflineIdentity(identity)) throw new Error('MIRROR_SESSION_USER_CHANGED');
}

export async function printCompositions(runs, scope, onStatus = () => {}) {
  if (busy) throw new Error('PRINT_BUSY');
  if (!NativeKapturaPrinter?.printDocument) throw new Error('PRINT_UNAVAILABLE');
  busy = true;
  const identity = offlineIdentity();
  let job;
  try {
    const snapshots = JSON.parse(JSON.stringify(runs));
    if (!snapshots.length || snapshots.some(run => !canPrintComposition(run))) throw new Error('PRINT_NOT_AVAILABLE');
    const items = [];
    for (const run of snapshots) {
      const context = { ...scope, eventModeId: run.eventModeId || scope.eventModeId, clientSessionId: run.clientSessionId, sessionId: run.sessionId, runStartedAt: run.startedAt };
      await checkAccess(context, identity);
      const path = decodeURI(run.output.uri.slice(7));
      if (!(await exists(path))) throw new Error('PRINT_FILE_MISSING');
      const resource = run.printManifest?.find(file => String(file.eventResourceId) === String(run.configSnapshot.print.profileResourceId));
      let profile = resource?.metadata?.printProfile;
      if (!profile && resource?.path) {
        const parsed = JSON.parse(await readFile(resource.path, 'utf8'));
        profile = parsed.profile || parsed;
      }
      items.push({ id: run.output.clientAssetId || run.clientRunId, path, options: printOptions(run.configSnapshot, profile), context });
    }
    let binding;
    if (Platform.OS === 'ios') {
      binding = await getPrinterBinding(scope.accountId);
      if (!binding?.url) binding = await detectPrinter(scope.accountId);
      if (!binding) return 'cancelled';
    }
    for (const group of groupPrintItems(items)) {
      job = null;
      // Recheck every group; never automatically resume a previously sent job.
      for (const item of items.filter(i => group.items.some(g => g.id === i.id))) await checkAccess(item.context, identity);
      job = { id: createClientUuid(), userId: identity.subject, eventId: scope.eventId, createdAt: new Date().toISOString(), status: 'preparing', assetIds: group.items.map(i => i.id) };
      await record(job); onStatus('preparing');
      const payload = { schemaVersion: 1, id: job.id, name: `Kaptura · ${group.items.length * group.options.copies}`, ...group, printerUrl: binding?.url || '' };
      job = { ...job, status: 'sending' }; await record(job); onStatus('sending');
      const result = JSON.parse(await NativeKapturaPrinter.printDocument(JSON.stringify(payload)));
      const status = ['completed', 'submitted', 'cancelled', 'unknown', 'failed'].includes(result.status) ? result.status : 'unknown';
      job = { ...job, status, nativeJobId: result.jobId || null }; await record(job); onStatus(status);
      if (!['completed', 'submitted'].includes(status)) return status;
    }
    return 'submitted';
  } catch (error) {
    if (job) await record({ ...job, status: job.status === 'sending' ? 'unknown' : 'failed' });
    await recordClientTechnicalError({ code: 'PRINT_FAILED', detail: `${error.code || ''} ${error.message || ''}` });
    throw error;
  } finally { busy = false; }
}
