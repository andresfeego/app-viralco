import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, Share as NativeShare, StyleSheet, Text, View } from 'react-native';
import Share from 'react-native-share';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import QRCode from 'react-native-qrcode-svg';
import { API_BASE_URL } from '../config/api';
import { AppButton } from '../design-system/components/AppButton';
import { SurfaceCard } from '../design-system/components/SurfaceCard';
import { MediaPreview } from '../design-system/components/MediaPreview';
import { tokens } from '../design-system/tokens';
import { getTheme } from '../design-system/theme';
import { IconTextButton } from '../components/IconTextButton';
import { MirrorRuntimeCamera } from '../components/MirrorRuntimeCamera';
import { MirrorOutputComposer } from '../components/MirrorOutputComposer';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../providers/ToastProvider';
import { t } from '../i18n';
import {
  captureCount,
  createClientUuid,
  createMirrorRuntimeState,
  evaluateMirrorPreflight,
  LOCAL_SYNC_STATUSES,
  MIRROR_RUNTIME_STAGES,
} from '../domain/mirrorRuntime';
import {
  endMagicMirrorSessionApi,
  forceEndMagicMirrorSessionApi,
  getActiveMagicMirrorSessionApi,
  getMagicMirrorSessionPackageApi,
  recordMagicMirrorDeliveryApi,
  startMagicMirrorSessionApi,
  updateMagicMirrorSessionApi,
} from '../services/api/events';
import { recordClientTechnicalError, userErrorMessage } from '../services/errorHandling';
import {
  cacheMirrorPackage,
  clearMirrorRuntime,
  getMirrorInstallationId,
  getMirrorStorageInfo,
  loadMirrorRuntime,
  persistMirrorCapture,
  persistMirrorOutput,
  saveMirrorRuntime,
} from '../services/mirrorRuntimeStorage';
import { isMirrorRuntimeOnline, subscribeMirrorConnectivity, syncMirrorRun } from '../services/mirrorRuntimeSync';

const ANIMATION_FALLBACK_MS = 2500;

function stageResource(runtime, stage) {
  return (runtime?.localManifest || []).find((item) => item.purpose === 'animation' && item.placement === stage) || null;
}

function animationDuration(resource) {
  const duration = Number(resource?.metadata?.durationMs || resource?.asset?.metadata?.durationMs || 0);
  return duration > 0 ? duration : ANIMATION_FALLBACK_MS;
}

function PreflightCard({ theme, checks }) {
  return (
    <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
      <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{t('runtime_003')}</Text>
      <View style={styles.stackSmall}>
        {checks.map((check) => (
          <View key={check.key} style={styles.checkRow}>
            <StatusBadge theme={theme} label={check.ok ? t('runtime_004') : t('runtime_005')} flag={check.ok ? 'success' : 'warn'} />
            <Text style={[styles.rowText, { color: theme.textPrimary }]}>{t(check.labelKey)}</Text>
          </View>
        ))}
      </View>
    </SurfaceCard>
  );
}

function StageAnimation({ runtime, stage, theme }) {
  const resource = stageResource(runtime, stage);
  if (!resource) return null;
  return (
    <MediaPreview
      uri={resource.uri}
      mediaType={resource.mimeType || 'video/mp4'}
      borderColor={theme.border}
      textColor={theme.textPrimary}
      resizeMode="contain"
      aspectRatio={tokens.layout.verticalVideoAspectRatio}
      autoPlay
      repeat
      controls={false}
    />
  );
}

export function MagicMirrorLaunchScreen({ event, eventMode, accountId, canManage = false, onBack }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const theme = useMemo(() => getTheme(user?.themeMode || 'dark'), [user?.themeMode]);
  const eventId = String(event?.id || '');
  const eventModeId = String(eventMode?.id || '');
  const cameraRef = useRef(null);
  const composerRef = useRef(null);
  const runtimeRef = useRef(null);
  const syncQueueRef = useRef(Promise.resolve());
  const sequenceTimer = useRef(null);
  const [runtime, setRuntime] = useState(null);
  const [preparing, setPreparing] = useState(true);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [storage, setStorage] = useState({ freeSpace: 0 });
  const [cameraState, setCameraState] = useState({ permission: false, ready: false });
  const [online, setOnline] = useState(true);
  const [countdown, setCountdown] = useState(0);
  const [conflictingSession, setConflictingSession] = useState(null);
  const [operatorMenu, setOperatorMenu] = useState(false);
  const [busy, setBusy] = useState(false);

  const persistRuntime = useCallback((nextOrUpdater) => {
    setRuntime((current) => {
      const next = typeof nextOrUpdater === 'function' ? nextOrUpdater(current) : nextOrUpdater;
      runtimeRef.current = next;
      if (next) saveMirrorRuntime(next).catch((error) => recordClientTechnicalError({ code: 'MIRROR_RUNTIME_SAVE_FAILED', detail: error?.message }));
      return next;
    });
  }, []);

  const syncRun = useCallback(async (run) => {
    if (!run) return run;
    syncQueueRef.current = syncQueueRef.current.catch(() => null).then(async () => {
      const current = runtimeRef.current;
      const latest = current?.activeRun?.clientRunId === run.clientRunId
        ? current.activeRun
        : (current?.completedRuns || []).find((item) => item.clientRunId === run.clientRunId) || run;
      if (!current?.session?.id) return latest;
      try {
        return await syncMirrorRun(current, latest, (partial) => {
          persistRuntime((value) => value ? { ...value, activeRun: value.activeRun?.clientRunId === partial.clientRunId ? partial : value.activeRun } : value);
        });
      } catch (error) {
        recordClientTechnicalError({ code: 'MIRROR_RUNTIME_SYNC_FAILED', detail: error?.message });
        return { ...latest, syncStatus: LOCAL_SYNC_STATUSES.FAILED };
      }
    });
    return syncQueueRef.current;
  }, [persistRuntime]);

  const preparePackage = useCallback(async (payload, installationId, localBase = null) => {
    const base = createMirrorRuntimeState({
      ...(localBase || {}), eventId, eventModeId, eventName: event?.name, accountId,
      installationId, session: payload.session, version: payload.version, manifest: payload.manifest,
      clientSessionId: payload.session.clientSessionId,
    });
    const localManifest = await cacheMirrorPackage(payload, setDownloadProgress);
    const recoveredStage = localBase?.activeRun ? (localBase.stage || MIRROR_RUNTIME_STAGES.REVIEW) : MIRROR_RUNTIME_STAGES.READY;
    const ready = { ...base, localManifest, stage: recoveredStage, updatedAt: new Date().toISOString() };
    persistRuntime(ready);
    setStorage(await getMirrorStorageInfo());
    setDownloadProgress(null);
  }, [accountId, event?.name, eventId, eventModeId, persistRuntime]);

  const initialize = useCallback(async () => {
    setPreparing(true);
    try {
      const installationId = await getMirrorInstallationId();
      const local = await loadMirrorRuntime(eventModeId);
      if (local) { runtimeRef.current = local; setRuntime(local); }
      const connected = await isMirrorRuntimeOnline();
      setOnline(connected);
      if (connected && local?.pendingSessionAction === 'end' && local?.session?.id) {
        await endMagicMirrorSessionApi(eventId, eventModeId, local.session.id);
        await clearMirrorRuntime(eventModeId);
        onBack();
        return;
      }
      if (!connected) {
        if (!local?.session?.id || !local?.version?.id || !local?.localManifest?.length) throw new Error('MIRROR_FIRST_LAUNCH_REQUIRES_NETWORK');
        setStorage(await getMirrorStorageInfo());
        return;
      }
      const active = await getActiveMagicMirrorSessionApi(eventId, eventModeId);
      if (active?.session && active.session.deviceInstallationId !== installationId && active.session.clientSessionId !== local?.clientSessionId) {
        setConflictingSession(active.session);
        return;
      }
      let payload = active?.session ? active : null;
      if (!payload?.session) {
        payload = await startMagicMirrorSessionApi(eventId, eventModeId, {
          clientSessionId: local?.clientSessionId || createClientUuid(),
          deviceInstallationId: installationId,
          metadata: { platform: 'mobile-kaptura' },
        });
      } else {
        payload = await getMagicMirrorSessionPackageApi(eventId, eventModeId, payload.session.id);
      }
      await preparePackage(payload, installationId, local);
    } catch (error) {
      recordClientTechnicalError({ code: 'MIRROR_RUNTIME_PREPARE_FAILED', detail: error?.message });
      showToast({ type: 'error', message: userErrorMessage(error, t('runtime_006')) });
    } finally { setPreparing(false); }
  }, [eventId, eventModeId, onBack, preparePackage, showToast]);

  useEffect(() => { initialize(); }, [initialize]);
  useEffect(() => {
    const unsubscribe = subscribeMirrorConnectivity((connected) => {
      setOnline(connected);
      const current = runtimeRef.current;
      if (connected && current?.activeRun) syncRun(current.activeRun).then((synced) => persistRuntime((value) => value ? { ...value, activeRun: synced } : value));
      if (connected) (current?.completedRuns || []).filter((run) => run.syncStatus !== LOCAL_SYNC_STATUSES.SYNCED).forEach((run) => {
        syncRun(run).then((synced) => persistRuntime((value) => value ? { ...value, completedRuns: value.completedRuns.map((item) => item.clientRunId === synced.clientRunId ? synced : item) } : value));
      });
    });
    return unsubscribe;
  }, [persistRuntime, syncRun]);
  useEffect(() => () => { if (sequenceTimer.current) clearTimeout(sequenceTimer.current); }, []);
  useEffect(() => {
    if (!runtime?.session?.id || !online || !['preparing', 'running'].includes(runtime.session.status)) return undefined;
    const heartbeat = setInterval(() => updateMagicMirrorSessionApi(eventId, eventModeId, runtime.session.id, { status: runtime.session.status })
      .catch((error) => recordClientTechnicalError({ code: 'MIRROR_HEARTBEAT_FAILED', detail: error?.message })), 15000);
    return () => clearInterval(heartbeat);
  }, [eventId, eventModeId, online, runtime?.session?.id, runtime?.session?.status]);
  const config = runtime?.config;
  const preflight = useMemo(() => evaluateMirrorPreflight({ runtime, freeSpace: storage.freeSpace, cameraPermission: cameraState.permission, cameraReady: cameraState.ready }), [cameraState, runtime, storage.freeSpace]);

  const setStage = useCallback((stage) => persistRuntime((value) => value ? { ...value, stage, updatedAt: new Date().toISOString() } : value), [persistRuntime]);

  const runTimedStage = useCallback((stage, next) => {
    setStage(stage);
    const resource = stageResource(runtimeRef.current, stage);
    sequenceTimer.current = setTimeout(next, resource ? animationDuration(resource) : 0);
  }, [setStage]);

  const beginCountdown = useCallback((seconds) => {
    setStage(MIRROR_RUNTIME_STAGES.COUNTDOWN);
    setCountdown(seconds);
    const tick = (remaining) => {
      if (remaining <= 0) {
        setCountdown(0);
        setStage(MIRROR_RUNTIME_STAGES.CAPTURING);
        return;
      }
      setCountdown(remaining);
      sequenceTimer.current = setTimeout(() => tick(remaining - 1), 1000);
    };
    tick(seconds);
  }, [setStage]);

  const startExperience = useCallback(async () => {
    if (!preflight.ready || busy) return;
    setBusy(true);
    try {
      let session = runtimeRef.current.session;
      if (online && session.status === 'preparing') session = await updateMagicMirrorSessionApi(eventId, eventModeId, session.id, { status: 'running' }).then((payload) => payload.session);
      const run = {
        clientRunId: createClientUuid(),
        startedAt: new Date().toISOString(),
        captures: [],
        syncStatus: LOCAL_SYNC_STATUSES.LOCAL,
        nextPhotoNumber: 1,
      };
      persistRuntime((value) => ({ ...value, session, activeRun: run, stage: MIRROR_RUNTIME_STAGES.WELCOME }));
      runTimedStage('start', () => runTimedStage('beforeCountdown', () => beginCountdown(Number(config.capture.firstCountdownSeconds || 0))));
    } finally { setBusy(false); }
  }, [beginCountdown, busy, config?.capture?.firstCountdownSeconds, eventId, eventModeId, online, persistRuntime, preflight.ready, runTimedStage]);

  const takePhoto = useCallback(async () => {
    const current = runtimeRef.current;
    const run = current?.activeRun;
    if (!run || busy) return;
    setBusy(true);
    try {
      const raw = await cameraRef.current.takePhoto();
      const photoNumber = Number(run.nextPhotoNumber || 1);
      const previousAttempts = run.captures.filter((item) => item.photoNumber === photoNumber).length;
      const clientCaptureId = createClientUuid();
      const file = await persistMirrorCapture({ sessionId: current.session.id, runId: run.clientRunId, clientCaptureId, sourcePath: raw.path });
      const capture = { ...file, clientCaptureId, photoNumber, attempt: previousAttempts + 1, capturedAt: new Date().toISOString(), selected: true, syncStatus: LOCAL_SYNC_STATUSES.LOCAL };
      const captures = [...run.captures.map((item) => item.photoNumber === photoNumber ? { ...item, selected: false } : item), capture];
      const nextPhotoNumber = photoNumber + 1;
      const nextRun = { ...run, captures, nextPhotoNumber, syncStatus: LOCAL_SYNC_STATUSES.PENDING };
      persistRuntime((value) => ({ ...value, activeRun: nextRun }));
      syncRun(nextRun).then((synced) => persistRuntime((value) => value ? { ...value, activeRun: synced } : value));
      runTimedStage('afterCapture', () => {
        if (nextPhotoNumber <= captureCount(config)) beginCountdown(Number(config.capture.nextCountdownSeconds || 0));
        else setStage(MIRROR_RUNTIME_STAGES.REVIEW);
      });
    } catch (error) {
      recordClientTechnicalError({ code: 'MIRROR_CAPTURE_FAILED', detail: error?.message });
      showToast({ type: 'error', message: t('runtime_007') });
    } finally { setBusy(false); }
  }, [beginCountdown, busy, config, persistRuntime, runTimedStage, setStage, showToast, syncRun]);

  const retake = useCallback((photoNumber) => {
    persistRuntime((value) => ({ ...value, activeRun: { ...value.activeRun, nextPhotoNumber: photoNumber }, stage: MIRROR_RUNTIME_STAGES.COUNTDOWN }));
    beginCountdown(Number(config.capture.nextCountdownSeconds || 0));
  }, [beginCountdown, config?.capture?.nextCountdownSeconds, persistRuntime]);

  const processRun = useCallback(async () => {
    const current = runtimeRef.current;
    if (!current?.activeRun || busy) return;
    setBusy(true);
    setStage(MIRROR_RUNTIME_STAGES.PROCESSING);
    try {
      await new Promise((resolve) => setTimeout(resolve, 350));
      const temporaryPath = await composerRef.current.compose();
      const clientAssetId = createClientUuid();
      const file = await persistMirrorOutput({ sessionId: current.session.id, runId: current.activeRun.clientRunId, clientAssetId, sourcePath: temporaryPath });
      const output = { ...file, clientAssetId, createdAt: new Date().toISOString(), syncStatus: LOCAL_SYNC_STATUSES.LOCAL };
      const nextRun = { ...current.activeRun, output, syncStatus: LOCAL_SYNC_STATUSES.PENDING };
      persistRuntime((value) => ({ ...value, activeRun: nextRun, stage: MIRROR_RUNTIME_STAGES.DELIVERY }));
      const synced = await syncRun(nextRun);
      persistRuntime((value) => value ? { ...value, activeRun: synced, stage: MIRROR_RUNTIME_STAGES.DELIVERY } : value);
    } catch (error) {
      recordClientTechnicalError({ code: 'MIRROR_COMPOSE_FAILED', detail: error?.message });
      showToast({ type: 'error', message: t('runtime_008') });
      setStage(MIRROR_RUNTIME_STAGES.REVIEW);
    } finally { setBusy(false); }
  }, [busy, persistRuntime, setStage, showToast, syncRun]);

  const finishRun = useCallback(() => {
    const completed = runtimeRef.current?.activeRun;
    if (!completed) return;
    persistRuntime((value) => ({ ...value, activeRun: null, completedRuns: [...(value.completedRuns || []), completed], stage: MIRROR_RUNTIME_STAGES.READY }));
  }, [persistRuntime]);

  useEffect(() => {
    if (runtime?.stage !== MIRROR_RUNTIME_STAGES.DELIVERY || !runtime?.activeRun?.output) return undefined;
    const seconds = Number(runtime?.config?.runtime?.autoResetSeconds || 0);
    if (seconds <= 0) return undefined;
    const timer = setTimeout(() => finishRun(), seconds * 1000);
    return () => clearTimeout(timer);
  }, [finishRun, runtime?.activeRun?.output, runtime?.config?.runtime?.autoResetSeconds, runtime?.stage]);

  const closeSession = useCallback(() => {
    Alert.alert(t('runtime_009'), t('runtime_010'), [
      { text: t('account_028'), style: 'cancel' },
      { text: t('runtime_011'), style: 'destructive', onPress: async () => {
        try {
          if (online) {
            await endMagicMirrorSessionApi(eventId, eventModeId, runtimeRef.current.session.id);
            await clearMirrorRuntime(eventModeId);
          } else {
            persistRuntime((value) => ({ ...value, pendingSessionAction: 'end' }));
          }
          onBack();
        } catch (error) { showToast({ type: 'error', message: userErrorMessage(error, t('runtime_012')) }); }
      } },
    ]);
  }, [eventId, eventModeId, onBack, online, persistRuntime, showToast]);

  const takeOver = useCallback(async () => {
    if (!canManage || !conflictingSession) return;
    setBusy(true);
    try {
      await forceEndMagicMirrorSessionApi(eventId, eventModeId, conflictingSession.id);
      setConflictingSession(null);
      await initialize();
    } catch (error) { showToast({ type: 'error', message: userErrorMessage(error, t('runtime_013')) }); }
    finally { setBusy(false); }
  }, [canManage, conflictingSession, eventId, eventModeId, initialize, showToast]);

  const shareOutput = useCallback(async () => {
    const output = runtimeRef.current?.activeRun?.output;
    if (!output) return;
    try {
      await Share.open({ url: output.uri, type: output.mimeType, failOnCancel: false });
      if (online && output.publicHash) recordMagicMirrorDeliveryApi(output.publicHash, 'share').catch((error) => recordClientTechnicalError({ code: 'MIRROR_DELIVERY_LOG_FAILED', detail: error?.message }));
    }
    catch (error) {
      if (error?.message && !/cancel/i.test(error.message)) {
        recordClientTechnicalError({ code: 'MIRROR_SHARE_FAILED', detail: error.message });
        await NativeShare.share({ url: output.uri, message: event?.name || 'Kaptura' });
      }
    }
  }, [event?.name, online]);

  const saveOutput = useCallback(async () => {
    const output = runtimeRef.current?.activeRun?.output;
    if (!output) return;
    try {
      await CameraRoll.saveAsset(output.uri, { type: 'photo', album: 'Kaptura' });
      if (online && output.publicHash) recordMagicMirrorDeliveryApi(output.publicHash, 'download').catch((error) => recordClientTechnicalError({ code: 'MIRROR_DELIVERY_LOG_FAILED', detail: error?.message }));
      showToast({ type: 'success', message: t('runtime_014') });
    }
    catch (error) { recordClientTechnicalError({ code: 'MIRROR_SAVE_PHOTO_FAILED', detail: error?.message }); showToast({ type: 'error', message: t('runtime_015') }); }
  }, [online, showToast]);

  if (preparing) return <View style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator color={theme.primary} /><Text style={[styles.body, { color: theme.textSecondary }]}>{downloadProgress ? `${t('runtime_001')} ${downloadProgress.item}/${downloadProgress.total} · ${downloadProgress.percent}%` : t('runtime_000')}</Text></View>;

  if (conflictingSession) return (
    <View style={[styles.page, styles.centerPadding, { backgroundColor: theme.background }]}>
      <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{t('runtime_016')}</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>{t('runtime_017')}</Text>
        <View style={styles.buttonCluster}>
          <AppButton label={t('account_028')} onPress={onBack} backgroundColor={theme.surface} pressedColor={theme.background} textColor={theme.textPrimary} style={styles.flexButton} />
          {canManage ? <AppButton label={t('runtime_018')} onPress={takeOver} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} disabled={busy} style={styles.flexButton} /> : null}
        </View>
      </SurfaceCard>
    </View>
  );

  if (!runtime?.config) return <View style={[styles.center, { backgroundColor: theme.background }]}><Text style={[styles.body, { color: theme.textSecondary }]}>{t('runtime_006')}</Text><AppButton label={t('resource_045')} onPress={initialize} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} /></View>;

  const run = runtime.activeRun;
  const selectedCaptures = (run?.captures || []).filter((item) => item.selected !== false);
  const output = run?.output;
  const publicUrl = output?.publicHash ? `${API_BASE_URL}/api/public/assets/${output.publicHash}?method=qr` : '';
  const animationStage = [MIRROR_RUNTIME_STAGES.WELCOME, 'start'].includes(runtime.stage) ? 'start' : runtime.stage;

  return (
    <View style={[styles.page, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}> 
        <IconTextButton theme={theme} icon="arrow-left" variant="ghost" accessibilityLabel={t('runtime_019')} onPress={() => setOperatorMenu(true)} />
        <View style={styles.headerText}>
          <Text numberOfLines={1} style={[styles.headerTitle, { color: theme.textPrimary }]}>{event?.name || t('runtime_020')}</Text>
          <Text style={[styles.headerMeta, { color: online ? tokens.colors.success[400] : tokens.colors.warn[400] }]}>{online ? t('runtime_021') : t('runtime_022')}</Text>
        </View>
        <IconTextButton theme={theme} icon="bars" variant="outline" accessibilityLabel={t('runtime_023')} onPress={() => setOperatorMenu((value) => !value)} />
      </View>

      {operatorMenu ? (
        <View style={[styles.operatorPanel, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{t('runtime_023')}</Text>
          <AppButton label={t('runtime_024')} onPress={() => { setOperatorMenu(false); finishRun(); }} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} disabled={!run} />
          <AppButton label={t('runtime_011')} onPress={closeSession} backgroundColor={theme.surface} pressedColor={theme.background} textColor={theme.alert} />
          <AppButton label={t('account_028')} onPress={() => setOperatorMenu(false)} backgroundColor={theme.surface} pressedColor={theme.background} textColor={theme.textPrimary} />
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.content}>
        {runtime.stage === MIRROR_RUNTIME_STAGES.READY ? (
          <View style={styles.stack}>
            <PreflightCard theme={theme} checks={preflight.checks} />
            <View style={styles.preflightCamera}>
              <MirrorRuntimeCamera ref={cameraRef} active flashEnabled={config.capture.flashEnabled} lens={config.capture.lens} theme={theme} onAvailabilityChange={setCameraState} />
            </View>
            <AppButton label={t('runtime_025')} onPress={startExperience} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} disabled={!preflight.ready || busy} style={styles.primaryAction} />
          </View>
        ) : null}

        {[MIRROR_RUNTIME_STAGES.WELCOME, 'start', 'beforeCountdown', 'afterCapture'].includes(runtime.stage) ? (
          <View style={styles.mediaStage}><StageAnimation runtime={runtime} stage={animationStage} theme={theme} /></View>
        ) : null}

        {runtime.stage === MIRROR_RUNTIME_STAGES.COUNTDOWN ? (
          <View style={styles.countdownWrap}><Text accessibilityLiveRegion="assertive" style={[styles.countdown, { color: theme.tertiary }]}>{countdown}</Text></View>
        ) : null}

        {runtime.stage === MIRROR_RUNTIME_STAGES.CAPTURING ? (
          <View style={styles.captureCover}>
            <MirrorRuntimeCamera ref={cameraRef} active flashEnabled={config.capture.flashEnabled} lens={config.capture.lens} theme={theme} onAvailabilityChange={setCameraState} />
            <AppButton label={`${t('runtime_026')} ${run?.nextPhotoNumber || 1}/${captureCount(config)}`} onPress={takePhoto} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} disabled={busy || !cameraState.ready} style={styles.primaryAction} />
          </View>
        ) : null}

        {runtime.stage === MIRROR_RUNTIME_STAGES.REVIEW ? (
          <View style={styles.stack}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('runtime_028')}</Text>
            <View style={styles.photoGrid}>
              {selectedCaptures.map((capture) => (
                <View key={capture.clientCaptureId} style={styles.photoCell}>
                  <Image source={{ uri: capture.uri }} style={styles.photo} />
                  <IconTextButton theme={theme} icon="rotate" variant="filled" accessibilityLabel={t('runtime_029')} onPress={() => retake(capture.photoNumber)} style={styles.photoAction} />
                </View>
              ))}
            </View>
            <MirrorOutputComposer ref={composerRef} config={config} captures={selectedCaptures} localManifest={runtime.localManifest} theme={theme} />
            <AppButton label={t('runtime_030')} onPress={processRun} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} disabled={busy} style={styles.primaryAction} />
          </View>
        ) : null}

        {runtime.stage === MIRROR_RUNTIME_STAGES.PROCESSING ? (
          <View style={styles.processingStage}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('runtime_027')}</Text>
            <View style={styles.processingFrame}>
              <MirrorOutputComposer ref={composerRef} config={config} captures={selectedCaptures} localManifest={runtime.localManifest} theme={theme} />
              <View pointerEvents="none" style={[styles.processingCover, { backgroundColor: theme.background }]}>
                {stageResource(runtime, 'processing') ? <StageAnimation runtime={runtime} stage="processing" theme={theme} /> : <ActivityIndicator color={theme.primary} />}
              </View>
            </View>
          </View>
        ) : null}

        {runtime.stage === MIRROR_RUNTIME_STAGES.DELIVERY && output ? (
          <View style={styles.stack}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('runtime_031')}</Text>
            <Image source={{ uri: output.uri }} resizeMode="contain" style={[styles.result, { borderColor: theme.border }]} />
            <View style={styles.buttonCluster}>
              {config.delivery.share ? <AppButton label={t('runtime_032')} onPress={shareOutput} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} style={styles.flexButton} /> : null}
              {config.delivery.download ? <AppButton label={t('runtime_033')} onPress={saveOutput} backgroundColor={theme.surface} pressedColor={theme.background} textColor={theme.primary} style={styles.flexButton} /> : null}
            </View>
            {config.delivery.qr && publicUrl ? (
              <SurfaceCard surfaceColor={tokens.colors.gray[0]} borderColor={theme.border}>
                <View style={styles.qr}><QRCode value={publicUrl} size={tokens.spacing.xl * 5} /></View>
                <Text style={[styles.qrHelp, { color: tokens.colors.gray[8] }]}>{t('runtime_034')}</Text>
              </SurfaceCard>
            ) : config.delivery.qr ? <Text style={[styles.body, { color: theme.textSecondary }]}>{t('runtime_035')}</Text> : null}
            <AppButton label={t('runtime_036')} onPress={finishRun} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} style={styles.primaryAction} />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: tokens.spacing.md, padding: tokens.spacing.lg },
  centerPadding: { justifyContent: 'center', padding: tokens.spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm, paddingHorizontal: tokens.spacing.md, paddingVertical: tokens.spacing.sm, borderBottomWidth: tokens.border.thin },
  headerText: { flex: 1, minWidth: 0, gap: tokens.spacing.xxs },
  headerTitle: { fontSize: tokens.typography.heading, fontWeight: '800' },
  headerMeta: { fontSize: tokens.typography.caption, fontWeight: '700' },
  content: { flexGrow: 1, padding: tokens.spacing.md, gap: tokens.spacing.md },
  stack: { gap: tokens.spacing.md },
  stackSmall: { gap: tokens.spacing.xs },
  cardTitle: { fontSize: tokens.typography.heading, fontWeight: '800' },
  sectionTitle: { fontSize: tokens.typography.heading, fontWeight: '800' },
  body: { fontSize: tokens.typography.body, textAlign: 'center' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm },
  rowText: { flex: 1, minWidth: 0, fontSize: tokens.typography.body, fontWeight: '600' },
  primaryAction: { alignSelf: 'stretch' },
  captureCover: { flex: 1, minHeight: tokens.spacing.xl * 14, gap: tokens.spacing.md },
  mediaStage: { flex: 1, justifyContent: 'center' },
  processingStage: { flex: 1, minHeight: tokens.spacing.xl * 12, justifyContent: 'center', gap: tokens.spacing.md },
  processingFrame: { position: 'relative', width: '100%', minWidth: 0 },
  processingCover: { ...StyleSheet.absoluteFillObject, alignItems: 'stretch', justifyContent: 'center' },
  countdownWrap: { flex: 1, minHeight: tokens.spacing.xl * 12, alignItems: 'center', justifyContent: 'center' },
  countdown: { fontSize: tokens.spacing.xl * 4, fontWeight: '900' },
  preflightCamera: { minHeight: tokens.spacing.xl * 8 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.xs },
  photoCell: { width: '48%', aspectRatio: 1, position: 'relative' },
  photo: { width: '100%', height: '100%', borderRadius: tokens.radius.md },
  photoAction: { position: 'absolute', top: tokens.spacing.xs, right: tokens.spacing.xs },
  result: { width: '100%', aspectRatio: 1, borderWidth: tokens.border.thin, borderRadius: tokens.radius.md },
  buttonCluster: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm },
  flexButton: { flexGrow: 1, minWidth: tokens.spacing.xl * 5 },
  qr: { alignItems: 'center', padding: tokens.spacing.md },
  qrHelp: { fontSize: tokens.typography.caption, textAlign: 'center' },
  operatorPanel: { position: 'absolute', zIndex: 20, top: tokens.spacing.xl, left: tokens.spacing.md, right: tokens.spacing.md, borderWidth: tokens.border.thin, borderRadius: tokens.radius.lg, padding: tokens.spacing.md, gap: tokens.spacing.sm },
});
