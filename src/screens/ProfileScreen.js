import React, { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { getTheme } from '../design-system/theme';
import { tokens } from '../design-system/tokens';
import { AppButton } from '../design-system/components/AppButton';
import { ManagementCard } from '../components/ManagementCard';
import { InformationRow } from '../components/InformationRow';
import { CopyActionButton } from '../components/CopyActionButton';
import { StatusBadge } from '../components/StatusBadge';
import { SelectableChipGroup } from '../components/SelectableChipGroup';
import { t } from '../i18n';
import { userErrorMessage } from '../services/errorHandling';
import { PullToRefreshControl } from '../components/PullToRefreshControl';
import { usePullToRefresh } from '../hooks/usePullToRefresh';

export function ProfileScreen({ onLogout }) {
  const { user, reloadMe, updateThemeMode } = useAuth();
  const mode = user?.themeMode || 'dark';
  const theme = useMemo(() => getTheme(mode), [mode]);
  const [loadingMode, setLoadingMode] = useState(false);
  const [error, setError] = useState('');
  const changingTheme = useRef(false);
  const roleLabels = { super_admin: t('login_preset_superadmin'), admin: t('account_017'), owner: t('account_044'), operario: t('account_018'), cliente: t('account_019') };
  const roleNames = (user?.globalRoles || []).map(role => roleLabels[role.slug] || role.name || role.slug).filter(Boolean);
  const statusLabels = { active: t('status_001'), pending: t('status_000'), suspended: t('admin_suspended') };

  const onChangeTheme = async nextMode => {
    if (nextMode === mode || changingTheme.current) return;
    changingTheme.current = true;
    setLoadingMode(true);
    setError('');
    try { await updateThemeMode(nextMode); }
    catch (err) { setError(userErrorMessage(err, t('settings_theme_failed'))); }
    finally { changingTheme.current = false; setLoadingMode(false); }
  };
  const refresh = usePullToRefresh(async () => {
    setError('');
    try { await reloadMe(); }
    catch (err) { setError(userErrorMessage(err, t('settings_profile_failed'))); }
  }, { disabled: loadingMode });

  return <ScrollView testID="profile-scroll" style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content} alwaysBounceVertical refreshControl={<PullToRefreshControl theme={theme} {...refresh} disabled={loadingMode} />}>
    <ManagementCard testID="settings-profile" theme={theme} title={user?.name || t('settings_profile')} icon="user" prominent
      badge={<StatusBadge compact label={statusLabels[user?.status?.slug] || user?.status?.name || '—'} flag={user?.status?.slug === 'active' ? 'success' : 'warn'} />}>
      <View>
        <InformationRow theme={theme} icon="envelope" label={t('auth_003')} value={user?.email}
          action={user?.email ? <CopyActionButton testID="settings-copy-email" theme={theme} value={user.email} iconOnly accessibilityLabel={t('settings_copy_email')} /> : null} />
        <InformationRow theme={theme} icon="phone" label={t('profile_001')} value={user?.phone} last={!roleNames.length} />
        {roleNames.length ? <InformationRow theme={theme} icon="shield-halved" label={t('settings_roles')} value={roleNames.join(', ')} last /> : null}
      </View>
    </ManagementCard>
    <ManagementCard testID="settings-appearance" theme={theme} title={t('settings_appearance')} icon={mode === 'dark' ? 'moon' : 'sun'} prominent>
      <SelectableChipGroup testID="settings-theme" theme={theme} backgroundColor={theme.surface} variant="outlined" options={[{ value: 'light', label: t('settings_light') }, { value: 'dark', label: t('settings_dark') }]} value={mode} onChange={onChangeTheme} disabled={loadingMode || refresh.refreshing} />
      {loadingMode ? <Text accessibilityLiveRegion="polite" style={[styles.feedback, { color: theme.textSecondary }]}>{t('settings_updating')}</Text> : null}
    </ManagementCard>
    {error ? <Text accessibilityRole="alert" style={[styles.feedback, { color: theme.alert }]}>{error}</Text> : null}
    {onLogout ? <View style={styles.logout}>
      <AppButton testID="settings-logout" label={t('auth_014')} onPress={onLogout} variant="outlined" borderColor={theme.buttonSecondaryBorder} backgroundColor={theme.surface} pressedColor={theme.background} textColor={theme.alert} />
    </View> : null}
  </ScrollView>;
}
const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flexGrow: 1, padding: tokens.spacing.md, gap: tokens.spacing.lg, paddingBottom: tokens.spacing.xl },
  feedback: { fontSize: tokens.typography.caption },
  logout: { paddingTop: tokens.spacing.xs },
});
