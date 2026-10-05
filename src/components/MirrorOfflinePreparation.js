import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { GuestModal } from './MirrorGuestScene';
import { StatusBadge } from './StatusBadge';
import { AppButton } from '../design-system/components/AppButton';
import { getPublishedMagicMirrorConfigApi } from '../services/api/events';
import { clearOfflineMirrorPackage, loadOfflineMirrorPackage, prepareOfflineMirrorPackage } from '../services/mirrorOfflinePackage';
import { isMirrorRuntimeOnline, subscribeMirrorConnectivity } from '../services/mirrorRuntimeSync';
import { recordClientTechnicalError } from '../services/errorHandling';
import { t } from '../i18n';
import { authorizeMirrorOperation, assertOfflineOperation } from '../services/mirrorOperationAccess';

export function MirrorOfflinePreparation({ scope, theme, onLaunch, onClose, embedded = false }) {
  const [cached, setCached] = useState(null);
  const [latest, setLatest] = useState(null);
  const [busy, setBusy] = useState(true);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');
  const alive = useRef(true);
  const working = useRef(false);
  const check = useCallback(async () => {
    if (working.current) return;
    working.current = true; setBusy(true); setError(''); setLatest(null); setProgress(null);
    try {
      const local = await loadOfflineMirrorPackage(scope, value => { if (alive.current) setProgress(value); });
      if (alive.current) setCached(local);
      if (await isMirrorRuntimeOnline()) {
        await authorizeMirrorOperation(scope);
        const remote = await getPublishedMagicMirrorConfigApi(scope.eventId, scope.eventModeId, { requireOnline: true });
        if (alive.current) setLatest(remote.version);
        if (!local || String(local.version.id) !== String(remote.version.id)) {
          const updated = await prepareOfflineMirrorPackage(scope, value => { if (alive.current) setProgress(value); });
          if (alive.current) { setCached(updated); setLatest(updated.version); }
        }
      } else await assertOfflineOperation(scope.eventId, scope.eventModeId);
    } catch (failure) {
      recordClientTechnicalError({ code: 'MIRROR_OFFLINE_CHECK_FAILED', detail: failure.message }).catch(() => {});
      if ([401, 403, 404, 409].includes(failure.status) || failure.code === 'MIRROR_OPERATION_NOT_AUTHORIZED') {
        await clearOfflineMirrorPackage(scope);
        if (alive.current) { setCached(null); setError(t('offline_access_denied')); }
      } else if (alive.current) setError(t('offline_download_failed'));
    } finally { working.current = false; if (alive.current) setBusy(false); }
  }, [scope]);
  useEffect(() => {
    alive.current = true; check();
    const unsubscribe = subscribeMirrorConnectivity((online) => { if (online) check(); });
    return () => { alive.current = false; unsubscribe(); };
  }, [check]);
  const download = async () => {
    if (working.current) return;
    working.current = true; setBusy(true); setError(''); setProgress(null);
    try {
      const value = await prepareOfflineMirrorPackage(scope, (valueProgress) => { if (alive.current) setProgress(valueProgress); });
      if (alive.current) { setCached(value); setLatest(value.version); }
    } catch (failure) {
      recordClientTechnicalError({ code: 'MIRROR_OFFLINE_DOWNLOAD_FAILED', detail: failure.message }).catch(() => {});
      if ([401, 403, 404, 409].includes(failure.status)) {
        await clearOfflineMirrorPackage(scope);
        if (alive.current) { setCached(null); setLatest(null); setError(t('offline_access_denied')); }
      } else if (alive.current) setError(t('offline_download_failed'));
    }
    finally { working.current = false; if (alive.current) setBusy(false); }
  };
  const button = (label, onPress, disabled = false) => <AppButton label={label} onPress={onPress} disabled={disabled} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} />;
  return <GuestModal embedded={embedded} scroll theme={theme} title={t('offline_prepare')} onClose={onClose}>
    {busy ? <ActivityIndicator color={theme.primary} /> : null}
    {progress ? <Text style={{ color: theme.textPrimary }}>{t(progress.phase ? 'offline_verifying' : 'runtime_001')} {progress.item}/{progress.total} · {progress.percent}%</Text> : busy ? <Text style={{ color: theme.textSecondary }}>{t('offline_checking')}</Text> : null}
    {latest ? <Text style={{ color: theme.textPrimary }}>{t('offline_server_version')} {latest.version}</Text> : <Text style={{ color: theme.textSecondary }}>{t('offline_latest_unknown')}</Text>}
    {cached ? <>
      <StatusBadge flag="info" label={`${t('mirror_publication')} ${cached.version.version} · ${t('offline_available')}`} />
      <Text style={{ color: theme.textSecondary }}>{t(cached.recoveryAvailable ? 'offline_recovery_ready' : 'offline_recovery_unset')}</Text>
      {button(`${t('offline_launch_version')} ${cached.version.version}`, () => onLaunch({ package: cached, offline: !latest || String(latest.id) !== String(cached.version.id) }), busy)}
    </> : <Text style={{ color: theme.textSecondary }}>{t('offline_not_prepared')}</Text>}
    {error ? <Text accessibilityLiveRegion="polite" style={{ color: theme.alert }}>{error}</Text> : null}
    {error && latest ? button(t('offline_download'), download, busy) : null}
    {button(t('offline_check'), check, busy)}
  </GuestModal>;
}
