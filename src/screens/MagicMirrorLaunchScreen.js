import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { PrinterGuideModal } from '../components/PrinterGuideModal';
import { ActivityIndicator, Alert, AppState, Image, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Share from 'react-native-share';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import QRCode from 'react-native-qrcode-svg';
import { tokens } from '../design-system/tokens';
import { getTheme } from '../design-system/theme';
import { MirrorRuntimeCamera } from '../components/MirrorRuntimeCamera';
import { MirrorCaptureMask } from '../components/MirrorCaptureMask';
import { MirrorOutputComposer } from '../components/MirrorOutputComposer';
import { GuestAction, GuestAnimation, GuestGallery, GuestModal, GuestResult, GuestStage, GuestWelcome } from '../components/MirrorGuestScene';
import { LaunchPatternGate } from '../components/LaunchPatternGate';
import { MirrorOfflinePreparation } from '../components/MirrorOfflinePreparation';
import { canPrintComposition } from '../domain/mirrorPrint';
import { printCompositions, recoverPrintJobs } from '../services/mirrorPrinting';
import { detectPrinter, getPrinterBinding } from '../services/printers';
import { authorizeMirrorOperation, assertOfflineOperation, subscribeOperationAccess, readOperationAccess } from '../services/mirrorOperationAccess';
import { beginBillingLaunch, endBillingLaunch } from '../services/offlineBillingGrant';
import { refreshMirrorRecovery, verifyMirrorAccess } from '../services/mirrorRecoveryAccess';
import { IconTextButton } from '../components/IconTextButton';
import { collectLocalCompositions, compositionKey, loadArchivedCompositions, setCompositionArchived, syncCompositionArchives } from '../services/mirrorLocalGallery';
import { createMirrorGalleryZip } from '../services/mirrorGalleryZip';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../providers/ToastProvider';
import { t } from '../i18n';
import { captureCount, createClientUuid, createMirrorRuntimeState, evaluateMirrorPreflight, GUEST_STAGE as S, guestSequenceReducer, recoverGuestStage, nextMissingPhoto, selectedPhotos, chooseStageAnimation, mergeRunAcknowledgements } from '../domain/mirrorRuntime';
import { endMagicMirrorSessionApi, forceEndMagicMirrorSessionApi, updateMagicMirrorSessionApi, recordMagicMirrorDeliveryApi } from '../services/api/events';
import { resolveMirrorLaunchPackage } from '../services/mirrorLaunchPackage';
import { recordClientTechnicalError } from '../services/errorHandling';
import { cacheMirrorPackage, archiveMirrorRuntime, loadMirrorArchives, cleanGuestOriginals, clearMirrorRuntime, getMirrorInstallationId, getMirrorStorageInfo, loadMirrorRuntime, persistMirrorCapture, persistMirrorOutput, saveMirrorRuntime } from '../services/mirrorRuntimeStorage';
import { isMirrorRuntimeOnline, subscribeMirrorConnectivity, syncMirrorRun } from '../services/mirrorRuntimeSync';

export function MagicMirrorLaunchScreen({ event, eventMode, accountId, canManage = false, onBack, onConfigure }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const theme = useMemo(() => getTheme(user?.themeMode || 'dark'), [user?.themeMode]);
  const eventId = String(event?.id || '');
  const eventModeId = String(eventMode?.id || '');
  const backRef = useRef(onBack);
  backRef.current = onBack;
  const camera = useRef(null);
  const composer = useRef(null);
  const current = useRef(null);
  const mounted = useRef(true);
  const epoch = useRef(0);
  const inFlight = useRef(false);
  const operation = useRef('start');
  const closing = useRef(false);
  const exiting = useRef(false);
  const shutterBarrier = useRef(Promise.resolve());
  const [archives, setArchives] = useState([]);
  const [hiddenCompositions, setHiddenCompositions] = useState({});
  const [selectedCompositions, setSelectedCompositions] = useState([]);
  const [galleryBusy, setGalleryBusy] = useState(false);
  const [printing, setPrinting] = useState(false);
  const printLock = useRef(false);
  const [printerName, setPrinterName] = useState('');
  const [pattern, setPattern] = useState(null);
  const [patternVisible, setPatternVisible] = useState(false);
  const [replacePatternVisible, setReplacePatternVisible] = useState(false);
  const recoveryScope = useMemo(() => ({ userId: String(user?.id || ''), accountId: String(accountId || event?.accountId || ''), eventId, eventModeId }), [user?.id, accountId, event?.accountId, eventId, eventModeId]);
  useEffect(() => {
    let active = true;
    recoverPrintJobs().catch(() => {});
    getPrinterBinding(recoveryScope.accountId).then(value => { if (active) setPrinterName(value?.name || ''); }).catch(() => {});
    return () => { active = false; };
  }, [recoveryScope.accountId]);
  const cameraAvailability = useRef(null);
  const writes = useRef(Promise.resolve());
  const uploads = useRef(Promise.resolve());
  const animationWait = useRef(null);
  const delays = useRef(new Set());
  const [runtime, setRuntime] = useState(null);
  const [sequence, dispatch] = useReducer(guestSequenceReducer, { stage: S.WELCOME, countdown: 0 });
  const sequenceRef = useRef(sequence);
  sequenceRef.current = sequence;
  const [preparing, setPreparing] = useState(true);
  const [preparationOpen, setPreparationOpen] = useState(true);
  const [accessRevoked, setAccessRevoked] = useState(false);
  const [publicationConfirmed, setPublicationConfirmed] = useState(false);
  const launchSelection = useRef(null);
  const [accepted, setAccepted] = useState(false);
  const [progress, setProgress] = useState(null);
  const [storage, setStorage] = useState({ freeSpace: 0 });
  const [cameraState, setCameraState] = useState({ permission: false, ready: false });
  const [cameraKey, setCameraKey] = useState(0);
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [online, setOnline] = useState(true);
  const [conflict, setConflict] = useState(null);
  const [modal, setModal] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [nativeDialog, setNativeDialog] = useState(false);
  const [flash, setFlash] = useState(false);
  const [counterHeight, setCounterHeight] = useState(0);
  const [animation, setAnimation] = useState(null);
  const [resumeNeeded, setResumeNeeded] = useState(false);
  useEffect(() => {
    if (!foreground || !online || !recoveryScope.userId) return;
    const refresh = () => { refreshMirrorRecovery(recoveryScope).catch(() => {}); };
    refresh();
    const timer = setInterval(refresh, 30000);
    return () => clearInterval(timer);
  }, [recoveryScope, foreground, online, patternVisible]);
  cameraAvailability.current = cameraState;

  const report = useCallback((error, code, label) => {
    recordClientTechnicalError({ code, detail: error?.details ? JSON.stringify({ message: error.message, ...error.details }) : error?.message || String(error) });
    // Guest operations expose only our stage-specific message, never arbitrary
    // native/driver text that might evade a technical-message pattern.
    if (mounted.current && label) showToast({ type: 'error', message: t(String(error?.code || error?.message || '').startsWith('BILLING_') || error?.code === 'MIRROR_OPERATION_NOT_AUTHORIZED' ? 'billing_accessHelp' : label) });
  }, [showToast]);
  const persist = useCallback((updater) => {
    if (closing.current) return current.current;
    const next = typeof updater === 'function' ? updater(current.current) : updater;
    current.current = next;
    if (mounted.current) setRuntime(next);
    if (next) writes.current = writes.current.catch(() => {}).then(() => saveMirrorRuntime(next)).catch((error) => report(error, 'MIRROR_RUNTIME_SAVE_FAILED'));
    return next;
  }, [report]);
  const transition = useCallback((action) => {
    sequenceRef.current = guestSequenceReducer(sequenceRef.current, action);
    dispatch(action);
    persist((value) => value ? { ...value, stage: sequenceRef.current.stage } : value);
  }, [persist]);
  const invalidate = useCallback(() => {
    epoch.current += 1;
    delays.current.forEach((cancel) => cancel());
    animationWait.current?.();
    animationWait.current = null;
    setFlash(false);
  }, []);
  useEffect(() => {
    mounted.current = true;
    const pendingDelays = delays.current;
    return () => { endBillingLaunch(); mounted.current = false; epoch.current += 1; pendingDelays.forEach((cancel) => cancel()); animationWait.current?.(); };
  }, []);

  const acknowledge = useCallback((remote) => !closing.current && persist((value) => {
    if (!value) return value;
    return { ...value, activeRun: mergeRunAcknowledgements(value.activeRun, remote),
      completedRuns: (value.completedRuns || []).map((run) => mergeRunAcknowledgements(run, remote)) };
  }), [persist]);
  const sync = useCallback((run) => {
    if (closing.current) return uploads.current;
    const context = current.current;
    uploads.current = uploads.current.catch(() => {}).then(async () => {
      const latest = current.current;
      if (closing.current || !latest || latest.session.id !== context.session.id) return;
      const target = latest.activeRun?.clientRunId === run.clientRunId ? latest.activeRun : latest.completedRuns.find((item) => item.clientRunId === run.clientRunId);
      if (!target) return;
      try {
        const remote = await syncMirrorRun(latest, target, acknowledge);
        if (closing.current) return;
        acknowledge(remote);
        const completed = current.current?.completedRuns.find((item) => item.clientRunId === run.clientRunId);
        if (completed) {
          const cleaned = await cleanGuestOriginals(latest, completed);
          persist((value) => ({ ...value, completedRuns: value.completedRuns.map((item) => item.clientRunId === cleaned.clientRunId ? cleaned : item) }));
        }
      } catch (error) { report(error, 'MIRROR_RUNTIME_SYNC_FAILED'); }
    });
    return uploads.current;
  }, [acknowledge, persist, report]);

  const initialize = useCallback(async (selection = launchSelection.current) => {
    if (!selection?.package) return;
    launchSelection.current = selection;
    setPreparationOpen(false); setPublicationConfirmed(false);
    setPreparing(true);
    try {
      if (await isMirrorRuntimeOnline()) {
        try { await authorizeMirrorOperation(recoveryScope); }
        catch (error) {
          if (error.status && error.status < 500) throw error;
          await assertOfflineOperation(eventId, eventModeId);
        }
      } else await assertOfflineOperation(eventId, eventModeId);
      const installationId = await getMirrorInstallationId();
      let local = await loadMirrorRuntime(eventModeId);
      let connected = !selection.offline && await isMirrorRuntimeOnline();
      setOnline(connected);
      if (local?.pendingSessionAction === 'end') {
        await archiveMirrorRuntime(local);
        if (connected && !local.offlineSession) {
          try {
            await endMagicMirrorSessionApi(eventId, eventModeId, local.session.id);
            await archiveMirrorRuntime({ ...local, pendingSessionAction: null });
          } catch (failure) {
            if (failure.status !== 0 && failure.code !== 'NETWORK_ERROR') throw failure;
            connected = false; setOnline(false);
          }
        }
        local = null;
      }
      if (local && (local.offlineSession || !connected) && String(local.version?.id) !== String(selection.package.version.id)) {
        await archiveMirrorRuntime({ ...local, pendingSessionAction: local.offlineSession ? null : 'end' });
        local = null;
      }
      // Resume pending deliveries even when a previous session was explicitly closed.
      let next = local;
      if (connected && !local?.offlineSession) {
        try {
        const { payload, reuseLocal, reuseFiles } = await resolveMirrorLaunchPackage({ eventId, eventModeId, installationId, local, preparedVersionId: selection.package.version.id,
          choosePrevious: async () => false,
        });
        next = createMirrorRuntimeState({ ...(reuseLocal ? local : {}), eventId, eventModeId, eventName: event?.name, accountId, installationId, session: payload.session, version: payload.version, manifest: payload.manifest, clientSessionId: payload.session.clientSessionId });
        if (String(payload.version.id) !== String(selection.package.version.id) && !reuseLocal) throw new Error('MIRROR_PUBLISHED_VERSION_CHANGED');
        next.localManifest = reuseFiles ? local.localManifest : String(payload.version.id) === String(selection.package.version.id)
          ? selection.package.localManifest : await cacheMirrorPackage(payload, setProgress);
        } catch (failure) {
          if (failure.status !== 0 && failure.code !== 'NETWORK_ERROR') throw failure;
          connected = false; setOnline(false);
        }
      }
      if (!connected || local?.offlineSession) {
        const reusable = local?.session?.id && local?.config && local.localManifest?.length === local.manifest?.length && !local.localManifest?.some((item) => item.localAvailable === false);
        if (reusable) next = local;
        else {
          if (local) await archiveMirrorRuntime(local);
          const id = createClientUuid();
          next = createMirrorRuntimeState({ eventId, eventModeId, eventName: event?.name, accountId, installationId, ...selection.package,
            clientSessionId: id, offlineSession: true,
            session: { id: `offline-${id}`, clientSessionId: id, configVersionId: selection.package.version.id, status: 'running', startedAt: new Date().toISOString() },
          });
        }
      }
      next = { ...next, userId: String(user?.id || ''), stage: recoverGuestStage(next) };
      await beginBillingLaunch(next, (await readOperationAccess(eventId, eventModeId))?.grant);
      persist(next);
      setArchives((await loadMirrorArchives()).filter((item) => String(item.eventId) === eventId && String(item.session.id) !== String(next.session.id)));
      if (connected) syncCompositionArchives(eventId, [eventModeId]).catch((error) => report(error, 'MIRROR_ARCHIVE_SYNC_PENDING'));
      setHiddenCompositions(await loadArchivedCompositions());
      setStorage(await getMirrorStorageInfo());
      setProgress(null);
    } catch (error) { if (error.session) setConflict(error.session); else { report(error, 'MIRROR_PREPARE_FAILED', 'runtime_006'); setPreparationOpen(true); } }
    finally { if (mounted.current) setPreparing(false); }
  }, [accountId, event?.name, eventId, eventModeId, persist, report, recoveryScope, user?.id]);
  useEffect(() => subscribeOperationAccess(state => {
    if (String(state.eventId) === eventId && String(state.eventModeId) === eventModeId) setAccessRevoked(!state.allowed);
  }), [eventId, eventModeId]);
  useEffect(() => subscribeMirrorConnectivity((connected) => {
    setOnline(connected);
    if (connected && current.current) {
      authorizeMirrorOperation(current.current || recoveryScope).catch(error => report(error, 'MIRROR_OPERATION_RECHECK_FAILED'));
      if (current.current.activeRun) sync(current.current.activeRun);
      current.current.completedRuns.filter((run) => run.syncStatus !== 'synced').forEach(sync);
    }
  }), [sync, recoveryScope, report]);
  useEffect(() => {
    if (!online || !runtime?.session?.id || preparing) return;
    let cancelled = false;
    const synchronize = async () => {
      const value = current.current;
      if (value?.activeRun) sync(value.activeRun);
      (value?.completedRuns || []).filter(run => run.syncStatus !== 'synced').forEach(sync);
      for (const archive of await loadMirrorArchives()) {
        if (cancelled) return;
        if (String(archive.eventModeId) !== eventModeId || String(archive.session.id) === String(value?.session?.id)) continue;
        try {
          const completedRuns = [];
          for (const run of archive.completedRuns || []) completedRuns.push(run.syncStatus === 'synced' ? run : await syncMirrorRun(archive, run));
          if (archive.pendingSessionAction === 'end' && !archive.offlineSession) await endMagicMirrorSessionApi(archive.eventId, archive.eventModeId, archive.session.id);
          await archiveMirrorRuntime({ ...archive, completedRuns, pendingSessionAction: null });
        } catch (error) { report(error, 'MIRROR_ARCHIVE_SYNC_FAILED'); }
      }
    };
    synchronize().catch(error => report(error, 'MIRROR_ARCHIVE_SYNC_FAILED'));
    return () => { cancelled = true; };
  }, [online, preparing, runtime?.session?.id, eventModeId, sync, report]);
  useEffect(() => {
    if (!runtime?.session?.id || runtime.offlineSession || !online) return undefined;
    const timer = setInterval(() => updateMagicMirrorSessionApi(eventId, eventModeId, runtime.session.id, { status: runtime.session.status }).catch((error) => report(error, 'MIRROR_HEARTBEAT_FAILED')), 15000);
    return () => clearInterval(timer);
  }, [eventId, eventModeId, online, report, runtime?.session?.id, runtime?.session?.status, runtime?.offlineSession]);

  const config = runtime?.config;
  const preflight = evaluateMirrorPreflight({ runtime, freeSpace: storage.freeSpace, cameraPermission: cameraState.permission, cameraReady: cameraState.ready });
  const alive = (token) => mounted.current && !closing.current && !exiting.current && epoch.current === token && AppState.currentState === 'active';
  const pause = (ms) => new Promise((resolve) => {
    const finishDelay = () => { clearTimeout(timer); delays.current.delete(finishDelay); resolve(); };
    const timer = setTimeout(finishDelay, ms);
    delays.current.add(finishDelay);
  });
  const animationDone = useCallback(() => { animationWait.current?.(); animationWait.current = null; }, []);
  const playStage = async (stage, token) => {
    const resource = chooseStageAnimation(current.current, stage);
    if (!resource || !alive(token)) return;
    setAnimation(resource);
    transition({ type: stage === S.BEFORE ? 'BEGIN' : 'AFTER' });
    await new Promise((resolve) => {
      // Advance on the actual video end/error, not an estimated duration.
      animationWait.current = resolve;
    });
    animationWait.current = null;
    if (alive(token)) setAnimation(null);
  };
  const composeRun = async (token) => {
    const processingStarted = Date.now();
    operation.current = 'compose';
    if (nextMissingPhoto(current.current.config, current.current.activeRun)) throw new Error('MIRROR_CAPTURES_INCOMPLETE');
    transition({ type: 'PROCESS' });
    setAnimation(chooseStageAnimation(current.current, 'processing'));
    // Allow the dedicated output surface to commit its current photos before capture.
    await pause(100);
    if (!alive(token)) return;
    const run = current.current.activeRun;
    const sourcePath = await composer.current.compose();
    if (!alive(token) || current.current.activeRun?.clientRunId !== run.clientRunId) return;
    const clientAssetId = createClientUuid();
    operation.current = 'saveOutput';
    const output = await persistMirrorOutput({ sessionId: current.current.session.id, runId: run.clientRunId, clientAssetId, sourcePath });
    await pause(Math.max(0, 3000 - (Date.now() - processingStarted)));
    if (!alive(token)) return;
    const nextRun = { ...current.current.activeRun, retakePhotoNumber: null, output: { ...output, clientAssetId, createdAt: new Date().toISOString(), syncStatus: 'local' }, syncStatus: 'pending' };
    persist((value) => ({ ...value, activeRun: nextRun }));
    setAnimation(null);
    transition({ type: 'RESULT' });
    sync(nextRun);
  };
  const handleFailure = (error) => {
    const failures = {
      start: ['MIRROR_GUEST_START_FAILED', 'guest_start_failed'],
      camera: ['MIRROR_GUEST_CAMERA_FAILED', 'guest_camera_failed'],
      saveCapture: ['MIRROR_GUEST_CAPTURE_SAVE_FAILED', 'guest_capture_save_failed'],
      compose: ['MIRROR_GUEST_COMPOSE_FAILED', 'runtime_008'],
      saveOutput: ['MIRROR_GUEST_OUTPUT_SAVE_FAILED', 'guest_output_save_failed'],
    };
    const [code, label] = failures[operation.current] || failures.start;
    report(error, code, label);
    setAnimation(null);
    setFlash(false);
    setResumeNeeded(true);
    transition({ type: 'WAIT', welcome: !current.current?.activeRun });
  };
  const begin = async () => {
    if (accessRevoked) return;
    if (inFlight.current || exiting.current || modal || nativeDialog || !pattern || patternVisible || !foreground || preparing) return;
    if (![S.WELCOME, S.WAITING].includes(sequenceRef.current.stage)) return;
    if (preflight.checks.some((check) => !['cameraPermission', 'camera'].includes(check.key) && !check.ok)) return;
    setAccepted(true);
    inFlight.current = true;
    const token = ++epoch.current;
    operation.current = 'start';
    setResumeNeeded(false);
    try {
      await assertOfflineOperation(eventId, eventModeId, current.current?.clientSessionId);
      if (!current.current.activeRun) {
        let session = current.current.session;
        if (online && !current.current?.offlineSession && session.status === 'preparing') session = (await updateMagicMirrorSessionApi(eventId, eventModeId, session.id, { status: 'running' })).session;
        if (!alive(token)) return;
        persist((value) => ({ ...value, session, activeRun: { clientRunId: createClientUuid(), startedAt: new Date().toISOString(), captures: [], retentionPolicyVersion: 2, syncStatus: 'local' } }));
      }
      const run = current.current.activeRun;
      const photoNumber = run.retakePhotoNumber || nextMissingPhoto(config, run);
      if (!photoNumber) { await composeRun(token); return; }
      await playStage(S.BEFORE, token);
      if (!alive(token)) return;
      transition({ type: 'COUNT', seconds: 0 });
      const cameraDeadline = Date.now() + 20000;
      while (!cameraAvailability.current.ready) {
        if (!alive(token)) return;
        if (Date.now() > cameraDeadline) throw new Error('MIRROR_CAMERA_NOT_READY');
        await pause(100);
      }
      if (!alive(token)) return;
      const seconds = Number(!run.retakePhotoNumber && selectedPhotos(run).length === 0 ? config.capture.firstCountdownSeconds : config.capture.nextCountdownSeconds);
      for (let count = seconds; count > 0; count -= 1) {
        transition({ type: 'COUNT', seconds: count });
        await pause(1000);
        if (!alive(token)) return;
      }
      transition({ type: 'CAPTURE' });
      operation.current = 'camera';
      if (config.capture.flashEnabled) { setFlash(true); await pause(120); }
      if (!alive(token)) return;
      let releaseShutter;
      const captureContext = current.current;
      shutterBarrier.current = new Promise((resolve) => { releaseShutter = resolve; });
      try {
      const raw = await camera.current.takePhoto();
      setFlash(false);
      const clientCaptureId = createClientUuid();
      operation.current = 'saveCapture';
      const file = await persistMirrorCapture({ sessionId: current.current.session.id, runId: run.clientRunId, clientCaptureId, sourcePath: raw.path });
      // Persist a completed shutter even if the app was interrupted, without advancing.
      const captures = run.captures.map((photo) => photo.photoNumber === photoNumber ? { ...photo, selected: false } : photo);
      const capture = { ...file, clientCaptureId, photoNumber, previewAspectRatio: viewport.width > 0 && viewport.height > 0 ? viewport.width / viewport.height : undefined, simulated: raw.simulated === true, attempt: captures.filter((photo) => photo.photoNumber === photoNumber).length + 1, capturedAt: new Date().toISOString(), selected: true, syncStatus: 'local' };
      if (closing.current || !mounted.current) {
        await archiveMirrorRuntime({ ...captureContext, pendingSessionAction: 'end', activeRun: { ...run, captures: [...captures, capture], output: null, syncStatus: 'pending' } });
        return;
      }
      persist((value) => ({ ...value, activeRun: { ...value.activeRun, captures: [...captures, capture], latestCaptureId: clientCaptureId, output: null, syncStatus: 'pending', retakePhotoNumber: null } }));
      } finally { releaseShutter(); }
      if (!alive(token)) return;
      if (nextMissingPhoto(config, current.current.activeRun)) {
        transition({ type: 'PROCESS' });
        setAnimation(chooseStageAnimation(current.current, 'processing'));
        await pause(3000);
        if (alive(token)) { setAnimation(null); transition({ type: 'WAIT', welcome: true }); }
      } else await composeRun(token);
    } catch (error) { if (alive(token)) handleFailure(error); }
    finally { inFlight.current = false; }
  };

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setForeground(state === 'active');
      if (state === 'active' && current.current) {
        assertOfflineOperation(eventId, eventModeId, current.current.clientSessionId).catch(error => { setAccessRevoked(true); report(error, 'BILLING_FOREGROUND_CHECK_FAILED'); });
      }
      if (state !== 'active') {
        epoch.current += 1;
        delays.current.forEach((cancel) => cancel());
        animationWait.current?.();
        if (![S.WELCOME, S.WAITING, S.RESULT].includes(sequenceRef.current.stage)) {
          setAnimation(null); setFlash(false); setResumeNeeded(true);
          transition({ type: 'WAIT', welcome: !current.current?.activeRun });
        }
      }
    });
    return () => subscription.remove();
  }, [transition, eventId, eventModeId, report]);

  const enterGuests = async () => {
    if (exiting.current || modal || nativeDialog || preparing || !pattern) return;
    if (preflight.checks.some((check) => !['cameraPermission', 'camera'].includes(check.key) && !check.ok)) {
      showToast({ type: 'error', message: t(preflight.checks.find((check) => !['cameraPermission', 'camera'].includes(check.key) && !check.ok).labelKey) });
      return;
    }
    setCameraState({ permission: true, ready: false });
    setAccepted(true);
    const recovered = recoverGuestStage(current.current);
    if (recovered === S.RESULT) {
      transition({ type: 'RESULT' });
      if (current.current.activeRun.syncStatus !== 'synced') sync(current.current.activeRun);
    }
    else if (recovered === S.PROCESS) {
      inFlight.current = true;
      const token = ++epoch.current;
      try { await composeRun(token); }
      catch (error) { if (alive(token)) handleFailure(error); }
      finally { inFlight.current = false; }
    } else transition({ type: 'WAIT', welcome: true });
    current.current.completedRuns.filter((run) => run.syncStatus !== 'synced').forEach(sync);
  };
  useEffect(() => {
    if (!preparing && pattern && runtime?.activeRun && !accepted) enterGuests();
    // Recovery is decided once after initialization, not on sync acknowledgements.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preparing, pattern]);
  const finish = useCallback(() => {
    invalidate();
    const run = current.current?.activeRun;
    if (run) {
      persist((value) => ({ ...value, activeRun: null, completedRuns: [...value.completedRuns, { ...run, configSnapshot: value.config }] }));
      sync(run);
    }
    setViewing(null); setAnimation(null); setModal(null); setResumeNeeded(false);
    transition({ type: 'WAIT', welcome: true });
  }, [invalidate, persist, sync, transition]);
  const closeSession = (configure = false) => {
    if (printLock.current) return;
    setNativeDialog(true);
    Alert.alert(t('runtime_009'), t('runtime_010'), [
      { text: t('account_028'), style: 'cancel', onPress: () => setNativeDialog(false) },
      { text: t('runtime_011'), style: 'destructive', onPress: async () => {
        if (closing.current || exiting.current) return;
        exiting.current = true;
        invalidate();
        try {
          // Wait only for the atomic shutter+local save, never for network sync.
          await new Promise((resolve) => {
            const timer = setTimeout(() => { report(new Error('MIRROR_SHUTTER_EXIT_TIMEOUT'), 'MIRROR_SHUTTER_EXIT_TIMEOUT'); resolve(); }, 15000);
            shutterBarrier.current.then(() => { clearTimeout(timer); resolve(); });
          });
          closing.current = true;
          const value = current.current;
          if (!value) { backRef.current(); return; }
          const archived = { ...value, completedRuns: [...value.completedRuns, ...(value.activeRun ? [value.activeRun] : [])], activeRun: null, pendingSessionAction: 'end' };
          await writes.current;
          await archiveMirrorRuntime(archived);
          await saveMirrorRuntime(archived);
          // The backend accepts uploads from runs started before the session ended.
          if (online && !value.offlineSession) {
            try {
              await endMagicMirrorSessionApi(eventId, eventModeId, value.session.id);
              await archiveMirrorRuntime({ ...archived, pendingSessionAction: null });
              await clearMirrorRuntime(eventModeId);
            } catch (error) { report(error, 'MIRROR_END_PENDING'); }
          }
          if (configure && canManage && onConfigure) onConfigure(); else backRef.current();
        } catch (error) { closing.current = false; exiting.current = false; report(error, 'MIRROR_END_FAILED', 'runtime_012'); }
        finally { setNativeDialog(false); }
      } },
    ], { cancelable: false });
  };
  const operator = () => {
    if (!pattern || preparing || closing.current || printLock.current) return;
    if (inFlight.current) {
      invalidate();
      setAnimation(null); setResumeNeeded(true);
      transition({ type: 'WAIT' });
    }
    setPatternVisible(true);
  };
  const retake = (photoNumber) => {
    if (inFlight.current || accessRevoked || printLock.current) return;
    invalidate();
    persist((value) => ({ ...value, activeRun: { ...value.activeRun, retakePhotoNumber: photoNumber } }));
    transition({ type: 'WAIT', welcome: true });
  };
  const galleryRuns = collectLocalCompositions([...archives, runtime], eventId).filter((item) => !hiddenCompositions[compositionKey(item)]);
  const displayRun = viewing ? galleryRuns.find((run) => run.clientRunId === viewing) : runtime?.activeRun;
  const output = displayRun?.output?.localAvailable === false ? null : displayRun?.output;
  const printableRun = displayRun ? { ...displayRun, sessionId: displayRun.sessionId || String(runtime?.session?.id), clientSessionId: displayRun.clientSessionId || runtime?.clientSessionId, configSnapshot: displayRun.configSnapshot || config, printManifest: displayRun.printManifest || runtime?.localManifest } : null;
  const printPhotos = async (photos) => {
    if (printLock.current || accessRevoked || galleryBusy) return;
    printLock.current = true; setPrinting(true); setNativeDialog(true);
    try {
      const status = await printCompositions(photos, recoveryScope);
      if (status !== 'cancelled') showToast({ type: ['unknown', 'failed'].includes(status) ? 'error' : 'success', message: t(status === 'unknown' ? 'print_unknown' : status === 'failed' ? 'print_failed' : 'print_submitted') });
      const binding = await getPrinterBinding(recoveryScope.accountId);
      if (mounted.current) setPrinterName(binding?.name || '');
    } catch (error) {
      const key = ['PRINT_PAPER_UNSUPPORTED', 'PRINT_MARGIN_UNSUPPORTED'].includes(error.code) ? 'print_paper_error'
        : error.code === 'PRINT_PRINTER_UNAVAILABLE' ? 'print_unavailable' : 'print_failed';
      report(error, 'MIRROR_PRINT_FAILED', key);
    } finally { printLock.current = false; if (mounted.current) { setPrinting(false); setNativeDialog(false); } }
  };
  const selectPrinter = async () => {
    if (printLock.current) return;
    if (Platform.OS === 'android') { showToast({ type: 'info', message: t('print_android_destination') }); return; }
    printLock.current = true; setPrinting(true); setNativeDialog(true);
    try { const binding = await detectPrinter(recoveryScope.accountId); if (binding && mounted.current) setPrinterName(binding.name); }
    catch (error) { report(error, 'MIRROR_PRINTER_FAILED', 'print_unavailable'); }
    finally { printLock.current = false; if (mounted.current) { setPrinting(false); setNativeDialog(false); } }
  };
  const deliver = async (method) => {
    if (!output || printLock.current) return;
    setNativeDialog(true);
    try {
      if (method === 'whatsapp') await Share.shareSingle({ url: output.uri, type: output.mimeType, social: Share.Social.WHATSAPP });
      else if (method === 'share') await Share.open({ url: output.uri, type: output.mimeType, failOnCancel: false });
      else { await CameraRoll.saveAsset(output.uri, { type: 'photo', album: 'Kaptura' }); showToast({ type: 'success', message: t('runtime_014') }); }
      if (online && output.publicHash) await recordMagicMirrorDeliveryApi(output.publicHash, method === 'whatsapp' ? 'share' : method);
    } catch (error) { report(error, 'MIRROR_DELIVERY_FAILED', 'runtime_015'); }
    finally { setNativeDialog(false); }
  };
  const closeModal = () => { if (!printLock.current) { setModal(null); setViewing(null); } };
  const galleryAction = async (zip = false) => {
    if (galleryBusy || printLock.current) return;
    setGalleryBusy(true); setNativeDialog(true);
    try {
      // ZIP exports the normal event gallery; archived items never leak into sharing.
      const runs = zip || !selectedCompositions.length ? galleryRuns : galleryRuns.filter((item) => selectedCompositions.includes(compositionKey(item)));
      if (zip) await Share.open({ url: await createMirrorGalleryZip(runs), type: 'application/zip', failOnCancel: false });
      else await Share.open({ urls: runs.map((item) => item.output.uri), type: 'image/jpeg', failOnCancel: false });
    } catch (error) { report(error, 'MIRROR_GALLERY_EXPORT_FAILED', 'gallery_failed'); }
    finally { setGalleryBusy(false); setNativeDialog(false); }
  };
  const archiveComposition = async (item) => {
    if (printLock.current) return;
    try {
      setHiddenCompositions(await setCompositionArchived(item, true, { eventId, eventModeId }));
      setSelectedCompositions((value) => value.filter((key) => key !== compositionKey(item)));
      if (item.clientRunId === current.current?.activeRun?.clientRunId) { finish(); setModal('gallery'); }
    } catch (error) { report(error, 'MIRROR_ARCHIVE_COMPOSITION_FAILED', 'gallery_failed'); }
  };
  const action = (label, onPress, disabled = false) => <GuestAction label={t(label)} onPress={() => { if (!printLock.current) onPress(); }} disabled={disabled || printing} theme={theme} />;
  const publicUrl = output?.publicUrl || '';
  const deliveryActions = <View style={styles.actions}>
    {canPrintComposition(printableRun) ? action('print_action', () => printPhotos([printableRun]), printing || accessRevoked) : null}
    {printing ? <Text accessibilityLiveRegion="polite" style={{ color: theme.textSecondary }}>{t('print_working')}</Text> : null}
    {(displayRun?.configSnapshot || config)?.delivery.share ? <><IconTextButton theme={theme} icon="whatsapp" iconStyle="brand" label="WhatsApp" onPress={() => deliver('whatsapp')} />{action('runtime_032', () => deliver('share'))}</> : null}
    {(displayRun?.configSnapshot || config)?.delivery.download ? action('runtime_033', () => deliver('download')) : null}
    {(displayRun?.configSnapshot || config)?.delivery.qr ? action('guest_qr', () => setModal('qr'), !publicUrl || output?.syncStatus !== 'synced') : null}
  </View>;
  const run = runtime?.activeRun;
  const stage = sequence.stage;
  const awaiting = [S.WELCOME, S.WAITING].includes(stage);
  const photoNumber = run?.retakePhotoNumber || nextMissingPhoto(config, run) || captureCount(config);
  const welcomeVideo = useMemo(() => chooseStageAnimation(runtime, 'start'), [runtime?.session?.id, runtime?.activeRun?.clientRunId, runtime?.activeRun?.latestCaptureId, runtime?.activeRun?.retakePhotoNumber]); // eslint-disable-line react-hooks/exhaustive-deps
  const slot = config?.layout.slots.find((item) => item.photoNumber === photoNumber);
  const slotRatio = slot ? config.layout.output.width * slot.width / (config.layout.output.height * slot.height) / (config.layout.duplicateStrip ? 2 : 1) : 1;
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (pattern && !preparing && config && awaiting && !welcomeVideo && !modal && !patternVisible && !resumeNeeded) begin();
    // Start only on entry to a welcome phase, not on synchronization updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pattern, preparing, stage, modal, patternVisible, Boolean(welcomeVideo)]);
  return <GuestStage theme={theme} eventName="" progress="" onOperator={operator} menuEnabled={config?.runtime.operatorMenuEnabled}
    overlay={accepted && stage === S.RESULT && run?.output ? <GuestResult output={run.output} config={config} theme={theme} onRetake={retake} /> : null}
    footer={accepted && stage === S.RESULT ? <View style={styles.resultActions}>
      <View style={styles.resultLeft}>
        <View style={styles.galleryShortcut}>{galleryRuns.slice(0, 3).map((item) => <Pressable key={compositionKey(item)} accessibilityRole="button" accessibilityLabel={t('guest_gallery')} onPress={() => setModal('gallery')}><Image source={{ uri: item.output.uri }} style={styles.galleryThumb} resizeMode="contain" /></Pressable>)}</View>
        <IconTextButton theme={theme} icon="plus" label={t('guest_again')} onPress={finish} />
      </View>
      {config.delivery.share || config.delivery.download || config.delivery.qr ? <IconTextButton theme={theme} icon="share-nodes" accessibilityLabel={t('guest_delivery')} onPress={() => setModal('delivery')} /> : null}
    </View> : null}>
    {config && accepted ? <View style={StyleSheet.absoluteFill} onLayout={(layoutEvent) => setViewport(layoutEvent.nativeEvent.layout)}>
      <MirrorRuntimeCamera key={cameraKey + runtime.cameraPosition} ref={camera} active={foreground && ![S.RESULT, S.PROCESS].includes(stage)} position={runtime.cameraPosition} quality={config.capture.quality} lens={config.capture.lens} theme={theme} onAvailabilityChange={setCameraState} />
      {accepted && awaiting && !cameraState.ready ? <Text style={[styles.cameraWait, { color: theme.textPrimary, backgroundColor: theme.surface }]}>{t('guest_camera_wait')}</Text> : null}
      {accepted && [S.COUNTDOWN, S.CAPTURE].includes(stage) ? <MirrorCaptureMask width={viewport.width} height={viewport.height} ratio={slotRatio} theme={theme} /> : null}
      {accepted && [S.BEFORE, S.AFTER].includes(stage) ? <GuestAnimation key={stage + animation?.eventResourceId} stage={stage} versionId={runtime.version.id} resource={animation} onDone={animation ? animationDone : undefined} paused={!foreground || Boolean(modal)} label={t('guest_photo_saved')} theme={theme} /> : null}
      {accepted && stage === S.COUNTDOWN && sequence.countdown > 0 ? <View pointerEvents="none" onLayout={(e) => setCounterHeight(e.nativeEvent.layout.height)} style={[styles.counterPosition, { transform: [{ translateY: counterHeight / 2 }] }]}><Text accessibilityLiveRegion="assertive" style={styles.countdown}>{sequence.countdown}</Text></View> : null}
      {accepted && stage === S.PROCESS ? <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.background }]}>
        {!nextMissingPhoto(config, run) ? <MirrorOutputComposer ref={composer} config={config} captures={selectedPhotos(run)} localManifest={runtime.localManifest} theme={theme} /> : null}
        <GuestAnimation resource={animation} stage="processing" versionId={runtime.version.id} loop paused={!foreground || Boolean(modal)} label={t('guest_processing')} theme={theme} effect={config.experience.style} />
      </View> : null}
      {accepted && stage === S.RESULT ? <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.background }]} /> : null}
    </View> : null}
    {flash ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flash]} /> : null}
    {awaiting && pattern && !preparing && config && !conflict ? <>
      <GuestWelcome theme={theme} video={welcomeVideo} versionId={runtime.version.id} paused={!foreground || Boolean(modal) || patternVisible} onStart={begin} />
      {!online ? <Text style={[styles.cameraWait, { color: theme.textSecondary }]}>{t('guest_offline_version')}</Text> : null}
    </> : null}
    {/* Keep one native presenter while preparation, confirmation and pattern change content. */}
    <Modal testID="mirror-launch-preparation" visible={!pattern} transparent animationType="fade" onRequestClose={() => current.current ? closeSession() : backRef.current()}>
    {preparationOpen ? <MirrorOfflinePreparation embedded scope={recoveryScope} theme={theme} onLaunch={initialize} onClose={() => backRef.current()} /> : null}
    {accessRevoked && !preparationOpen && !pattern ? <GuestModal embedded theme={theme} title={t('offline_access_denied')} onClose={() => closeSession()}>
      <Text style={{ color: theme.textSecondary }}>{t('offline_revoked_photos_kept')}</Text>
      {action('guest_exit_event', () => closeSession())}
    </GuestModal> : null}
    {!accessRevoked && !preparationOpen && !accepted && (preparing || !config || conflict) ? <GuestModal embedded scroll title={t('runtime_000')} theme={theme} onClose={() => current.current ? closeSession() : backRef.current()}>
      {preparing ? <><ActivityIndicator color={theme.primary} /><Text style={{ color: theme.textPrimary }}>{progress ? t('runtime_001') + ' ' + progress.item + '/' + progress.total : t('runtime_000')}</Text></> : conflict ? <>
        <Text style={{ color: theme.textPrimary }}>{t('runtime_017')}</Text>
        {canManage ? action('runtime_018', async () => { try { await forceEndMagicMirrorSessionApi(eventId, eventModeId, conflict.id); setConflict(null); await initialize(); } catch (error) { report(error, 'MIRROR_TAKEOVER_FAILED', 'runtime_013'); } }) : null}
      </> : action('resource_045', () => initialize())}
    </GuestModal> : null}
    {!accessRevoked && !preparationOpen && !preparing && config && !conflict && !publicationConfirmed ? <GuestModal embedded theme={theme} title={`${t('offline_launch_confirm')} ${runtime.version.version}`} onClose={() => closeSession()}>
      {!online ? <Text style={{ color: theme.textSecondary }}>{t('offline_latest_unknown')}</Text> : null}
      {action('offline_continue', () => setPublicationConfirmed(true))}
    </GuestModal> : null}
    {!accessRevoked && !pattern && !preparing && config && !conflict && publicationConfirmed ? <LaunchPatternGate embedded theme={theme} onReady={(value) => setPattern(value)} onClose={() => closeSession()} /> : null}
    </Modal>
    {accessRevoked && pattern ? <GuestModal theme={theme} title={t('offline_access_denied')} onClose={() => closeSession()}>
      <Text style={{ color: theme.textSecondary }}>{t('offline_revoked_photos_kept')}</Text>
      {action('guest_exit_event', () => closeSession())}
    </GuestModal> : null}
    {patternVisible ? <LaunchPatternGate theme={theme} pattern={pattern} verifyPattern={(value) => verifyMirrorAccess(recoveryScope, value, pattern)} onReady={() => { setPatternVisible(false); setModal('operator'); }} onClose={() => setPatternVisible(false)} /> : null}
    {replacePatternVisible ? <LaunchPatternGate theme={theme} title={t('pattern_replace')} onReady={(value) => { setPattern(value); setReplacePatternVisible(false); setModal('operator'); }} onClose={() => { setReplacePatternVisible(false); setModal('operator'); }} /> : null}
    {modal === 'operator' ? <GuestModal scroll theme={theme} title={t('runtime_023')} onClose={closeModal}>
      {config?.print?.enabled ? <>
        {action('print_destination', selectPrinter, printing || accessRevoked)}
        {action('guide_title', () => setModal('printer-guide'))}
        <Text style={{ color: theme.textSecondary }}>{Platform.OS === 'android' ? t('print_android_destination') : printerName || t('print_destination_empty')}</Text>
      </> : null}
      {action('pattern_replace', () => { setModal('pattern-change'); setReplacePatternVisible(true); })}
      {action('guest_switch', () => { setCameraState({ permission: true, ready: false }); persist((value) => ({ ...value, cameraPosition: value.cameraPosition === 'front' ? 'back' : 'front' })); closeModal(); }, stage === S.RESULT || inFlight.current)}
      {action('guest_restart', () => { setCameraState({ permission: true, ready: false }); setCameraKey((value) => value + 1); closeModal(); }, stage === S.RESULT || inFlight.current)}
      {action('guest_cancel_action', () => { setNativeDialog(true); Alert.alert(t('guest_cancel'), t('guest_cancel_help'), [{ text: t('account_028'), onPress: () => setNativeDialog(false) }, { text: t('guest_cancel_action'), onPress: async () => { invalidate(); await shutterBarrier.current; setNativeDialog(false); finish(); } }], { cancelable: false }); }, !run)}
      {action('guest_gallery', () => setModal('gallery'))}
      {canManage && onConfigure ? action('guest_configure', () => closeSession(true)) : null}
      {action('guest_exit_event', () => closeSession(false))}
    </GuestModal> : null}
    {modal === 'printer-guide' ? <PrinterGuideModal theme={theme} metadata={runtime?.localManifest?.find(file => String(file.eventResourceId) === String(config?.print?.profileResourceId))?.metadata} onClose={() => setModal('operator')} onSelectPrinter={Platform.OS === 'ios' ? selectPrinter : null} /> : null}
    {modal === 'gallery' ? <GuestModal theme={theme} title={t('guest_gallery')} onClose={closeModal}>
      {galleryRuns.some(canPrintComposition) ? <IconTextButton theme={theme} icon="print" label={t('print_selected')} disabled={printing || accessRevoked || !selectedCompositions.length || galleryRuns.filter(item => selectedCompositions.includes(compositionKey(item))).some(item => !canPrintComposition(item))} onPress={() => printPhotos(galleryRuns.filter(item => selectedCompositions.includes(compositionKey(item))))} /> : null}
      {printing ? <Text accessibilityLiveRegion="polite" style={{ color: theme.textSecondary }}>{t('print_working')}</Text> : null}
      <View style={styles.galleryShortcut}><IconTextButton theme={theme} icon="share-nodes" accessibilityLabel={t('gallery_share')} disabled={galleryBusy || !galleryRuns.length} onPress={() => galleryAction()} /><IconTextButton theme={theme} icon="file-zipper" accessibilityLabel={t('gallery_zip')} disabled={galleryBusy || !galleryRuns.length} onPress={() => galleryAction(true)} /></View>
      {galleryBusy ? <Text style={{ color: theme.textPrimary }}>{t('gallery_busy')}</Text> : null}
      <GuestGallery runs={galleryRuns} theme={theme} selected={selectedCompositions} onToggle={(item) => { const key = compositionKey(item); setSelectedCompositions((value) => value.includes(key) ? value.filter((id) => id !== key) : [...value, key]); }} onArchive={archiveComposition} onPrint={(item) => printPhotos([item])} printing={printing || accessRevoked} onSelect={(item) => { if (!printLock.current) { setViewing(item.clientRunId); setModal('viewer'); } }} />
    </GuestModal> : null}
    {modal === 'viewer' && output ? <GuestModal theme={theme} title={t('guest_photo')} onClose={() => { if (!printLock.current) { setViewing(null); setModal('gallery'); } }}><GuestResult output={output} config={displayRun.configSnapshot || config} />{deliveryActions}</GuestModal> : null}
    {modal === 'delivery' ? <GuestModal theme={theme} title={t('guest_delivery')} onClose={closeModal}>{deliveryActions}</GuestModal> : null}
    {modal === 'qr' ? <GuestModal theme={theme} title={t('guest_qr')} onClose={() => setModal(viewing ? 'viewer' : 'delivery')}>
      {publicUrl ? <View style={styles.qr}><QRCode value={publicUrl} size={tokens.spacing.xl * 6} /></View> : <Text style={{ color: theme.textPrimary }}>{t('runtime_035')}</Text>}
    </GuestModal> : null}
  </GuestStage>;
}

const styles = StyleSheet.create({
  counterPosition: { position: 'absolute', bottom: '30%', width: '100%', alignItems: 'center' },
  resultActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: tokens.spacing.sm },
  resultLeft: { flexShrink: 1, minWidth: 0, gap: tokens.spacing.xs },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  centerText: { textAlign: 'center', fontSize: tokens.typography.body },
  countdown: { color: tokens.colors.gray[0], fontWeight: '900', fontSize: tokens.spacing.xl * 4 },
  flash: { backgroundColor: tokens.colors.gray[0] },
  actions: { gap: tokens.spacing.sm },
  guideRegion: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  galleryShortcut: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm },
  galleryThumb: { width: tokens.spacing.xl + tokens.spacing.md, aspectRatio: 1 },
  cameraWait: { textAlign: 'center', padding: tokens.spacing.md },
  qr: { alignSelf: 'center', padding: tokens.spacing.md, backgroundColor: tokens.colors.gray[0] },
});
