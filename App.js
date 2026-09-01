import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { AuthProvider } from './src/providers/AuthProvider';
import { PermissionProvider } from './src/providers/PermissionProvider';
import { ToastProvider } from './src/providers/ToastProvider';
import { useAuth } from './src/hooks/useAuth';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { ForgotPasswordScreen } from './src/screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from './src/screens/ResetPasswordScreen';
import { PendingApprovalScreen } from './src/screens/PendingApprovalScreen';
import { AccountsScreen } from './src/screens/AccountsScreen';
import { AccountDetailScreen } from './src/screens/AccountDetailScreen';
import { ConfigurationScreen } from './src/screens/ConfigurationScreen';
import { SuperAdminUsersScreen } from './src/screens/SuperAdminUsersScreen';
import { EventsScreen } from './src/screens/EventsScreen';
import { ResourceLibraryScreen } from './src/screens/ResourceLibraryScreen';
import { MagicMirrorConfigScreen } from './src/screens/MagicMirrorConfigScreen';
import { SectionHeader } from './src/components/SectionHeader';
import { BottomMainMenu } from './src/components/BottomMainMenu';
import { getTheme } from './src/design-system/theme';
import { t } from './src/i18n';

function AuthFlow() {
  const [screen, setScreen] = useState('login');

  if (screen === 'register') {
    return <RegisterScreen onGoLogin={() => setScreen('login')} />;
  }

  if (screen === 'forgot') {
    return <ForgotPasswordScreen onGoLogin={() => setScreen('login')} onGoReset={() => setScreen('reset')} />;
  }

  if (screen === 'reset') {
    return <ResetPasswordScreen onGoLogin={() => setScreen('login')} />;
  }

  return <LoginScreen onGoRegister={() => setScreen('register')} onGoForgot={() => setScreen('forgot')} />;
}

export function MainFlow() {
  const { initializing, isAuthenticated, user } = useAuth();
  const mode = user?.themeMode || 'dark';
  const [screen, setScreen] = useState('eventos');
  const [accountRoute, setAccountRoute] = useState({ name: 'list', account: null, openCreateRequest: 0 });
  const [eventRoute, setEventRoute] = useState({ name: 'list', event: null, eventMode: null, accountId: '' });
  const [eventsHeaderConfig, setEventsHeaderConfig] = useState({
    title: t('menu_002'),
    subtitle: '',
    iconName: 'champagne-glasses',
    onBack: null,
    backLabel: 'Volver',
  });
  const theme = useMemo(() => getTheme(mode), [mode]);
  const openAccountDetail = useCallback((account) => setAccountRoute({ name: 'detail', account, openCreateRequest: 0 }), []);
  const closeAccountDetail = useCallback(() => setAccountRoute({ name: 'list', account: null, openCreateRequest: 0 }), []);
  const openAccountCreation = useCallback(() => {
    setAccountRoute((current) => ({ name: 'list', account: null, openCreateRequest: (current.openCreateRequest || 0) + 1 }));
    setScreen('cuenta');
  }, []);
  const openMirrorConfig = useCallback(({ event, eventMode, accountId }) => setEventRoute({ name: 'mirror-config', event, eventMode, accountId: String(accountId || event?.accountId || '') }), []);
  const closeMirrorConfig = useCallback(() => setEventRoute((current) => ({ name: 'detail', event: current.event, eventMode: null, accountId: current.accountId })), []);

  const isSuperAdmin = useMemo(
    () => (user?.globalRoles || []).some((role) => role.slug === 'super_admin'),
    [user]
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    setScreen('eventos');
    setAccountRoute({ name: 'list', account: null, openCreateRequest: 0 });
    setEventRoute({ name: 'list', event: null, eventMode: null, accountId: '' });
  }, [isAuthenticated, user?.id]);

  if (initializing) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.textPrimary }}>Cargando sesion...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return <AuthFlow />;
  }

  if (!user || user.status?.slug !== 'active') {
    return <PendingApprovalScreen />;
  }

  const menuItems = [
    ...(isSuperAdmin
      ? [{ key: 'superadmin', label: t('menu_000'), iconName: 'shield-halved', headerTitle: t('menu_000') }]
      : []),
    { key: 'cuenta', label: t('menu_001'), iconName: 'building', headerTitle: t('menu_001') },
    { key: 'eventos', label: t('menu_002'), iconName: 'champagne-glasses', headerTitle: t('menu_002') },
    { key: 'recursos', label: t('menu_004'), iconName: 'images', headerTitle: t('menu_004') },
    { key: 'configuracion', label: t('config_000'), iconName: 'gear', headerTitle: t('config_000') },
  ];

  const defaultKey = isSuperAdmin ? 'superadmin' : 'eventos';
  const selectedKey = menuItems.some((item) => item.key === screen) ? screen : defaultKey;
  const selectedItem = menuItems.find((item) => item.key === selectedKey) || menuItems[0];

  const isAccountDetail = selectedKey === 'cuenta' && accountRoute.name === 'detail';
  const usesEventsHeader = selectedKey === 'eventos' || selectedKey === 'recursos';
  const headerTitle = isAccountDetail ? t('account_054') : usesEventsHeader ? eventsHeaderConfig.title : selectedItem.headerTitle;
  const headerSubtitle = isAccountDetail ? accountRoute.account?.name || '' : usesEventsHeader ? eventsHeaderConfig.subtitle : '';
  const headerIconName = isAccountDetail ? 'building' : usesEventsHeader ? eventsHeaderConfig.iconName : selectedItem.iconName;
  const headerOnBack = isAccountDetail ? closeAccountDetail : usesEventsHeader ? eventsHeaderConfig.onBack : null;
  const headerBackLabel = isAccountDetail ? t('account_055') : usesEventsHeader ? eventsHeaderConfig.backLabel : 'Volver';

  const selectMenuItem = (key) => {
    if (key === 'cuenta') {
      setAccountRoute({ name: 'list', account: null, openCreateRequest: 0 });
    }
    if (key === 'eventos') {
      setEventRoute({ name: 'list', event: null, eventMode: null, accountId: '' });
    }
    setScreen(key);
  };

  return (
    <View style={[styles.page, { backgroundColor: theme.background }]}>
      <SectionHeader
        title={headerTitle}
        subtitle={headerSubtitle}
        iconName={headerIconName}
        onBack={headerOnBack}
        backLabel={headerBackLabel}
        theme={theme}
      />
      <View style={styles.panelBody}>
        {selectedKey === 'superadmin' ? <SuperAdminUsersScreen /> : null}
        {selectedKey === 'cuenta' && accountRoute.name === 'list' ? (
          <AccountsScreen
            onOpenAccount={openAccountDetail}
            openCreateRequest={accountRoute.openCreateRequest}
          />
        ) : null}
        {selectedKey === 'cuenta' && accountRoute.name === 'detail' ? (
          <AccountDetailScreen
            accountId={accountRoute.account?.id}
            initialAccount={accountRoute.account}
            onAccountUpdated={openAccountDetail}
          />
        ) : null}
        {selectedKey === 'eventos' && eventRoute.name !== 'mirror-config' ? (
          <EventsScreen
            initialSection={eventRoute.name === 'detail' ? 'detail' : 'list'}
            initialEventId={eventRoute.event?.id || ''}
            allowedSections={['list', 'create', 'detail']}
            onHeaderChange={setEventsHeaderConfig}
            onConfigureMirror={openMirrorConfig}
            onCreateAccount={openAccountCreation}
          />
        ) : null}
        {selectedKey === 'eventos' && eventRoute.name === 'mirror-config' ? (
          <MagicMirrorConfigScreen
            event={eventRoute.event}
            eventMode={eventRoute.eventMode}
            accountId={eventRoute.accountId}
            onBack={closeMirrorConfig}
            onHeaderChange={setEventsHeaderConfig}
          />
        ) : null}
        {selectedKey === 'recursos' ? (
          <ResourceLibraryScreen onHeaderChange={setEventsHeaderConfig} onCreateAccount={openAccountCreation} />
        ) : null}
        {selectedKey === 'configuracion' ? <ConfigurationScreen onCreateAccount={openAccountCreation} /> : null}
      </View>
      <BottomMainMenu items={menuItems} selectedKey={selectedKey} onSelect={selectMenuItem} theme={theme} />
    </View>
  );
}

function AppContainer() {
  const { user, isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const mode = isAuthenticated ? user?.themeMode || 'dark' : 'dark';
  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <View style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={{ height: insets.top, backgroundColor: theme.primary }} />
      <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />
      <MainFlow />
      </SafeAreaView>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider>
        <AuthProvider>
          <ToastProvider>
            <PermissionProvider>
              <AppContainer />
            </PermissionProvider>
          </ToastProvider>
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  page: { flex: 1 },
  panelBody: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
