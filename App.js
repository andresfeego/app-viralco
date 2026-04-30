import React, { useMemo, useState } from 'react';
import { StatusBar, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthProvider } from './src/providers/AuthProvider';
import { PermissionProvider } from './src/providers/PermissionProvider';
import { useAuth } from './src/hooks/useAuth';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { ForgotPasswordScreen } from './src/screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from './src/screens/ResetPasswordScreen';
import { PendingApprovalScreen } from './src/screens/PendingApprovalScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { SuperAdminUsersScreen } from './src/screens/SuperAdminUsersScreen';
import { EventsScreen } from './src/screens/EventsScreen';
import { SectionHeader } from './src/components/SectionHeader';
import { BottomMainMenu } from './src/components/BottomMainMenu';
import { getTheme } from './src/design-system/theme';
import { tokens } from './src/design-system/tokens';
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

function MainFlow() {
  const { initializing, isAuthenticated, user, logout } = useAuth();
  const mode = user?.themeMode || 'dark';
  const [screen, setScreen] = useState('eventos');
  const [eventsHeaderConfig, setEventsHeaderConfig] = useState({
    title: t('menu_002'),
    subtitle: '',
    iconName: 'champagne-glasses',
    onBack: null,
    backLabel: 'Volver',
  });
  const theme = useMemo(() => getTheme(mode), [mode]);

  const isSuperAdmin = useMemo(
    () => (user?.roles || []).some((role) => role.slug === 'super_admin'),
    [user]
  );

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

  if (!user || user.estado !== 'active') {
    return <PendingApprovalScreen />;
  }

  const menuItems = [
    ...(isSuperAdmin
      ? [{ key: 'superadmin', label: t('menu_000'), iconName: 'shield-halved', headerTitle: t('menu_000') }]
      : []),
    { key: 'cuenta', label: t('menu_001'), iconName: 'user', headerTitle: t('menu_001') },
    { key: 'eventos', label: t('menu_002'), iconName: 'champagne-glasses', headerTitle: t('menu_002') },
    { key: 'configuracion', label: t('config_000'), iconName: 'gear', headerTitle: t('config_000') },
  ];

  const defaultKey = isSuperAdmin ? 'superadmin' : 'eventos';
  const selectedKey = menuItems.some((item) => item.key === screen) ? screen : defaultKey;
  const selectedItem = menuItems.find((item) => item.key === selectedKey) || menuItems[0];

  const headerTitle = selectedKey === 'eventos' ? eventsHeaderConfig.title : selectedItem.headerTitle;
  const headerSubtitle = selectedKey === 'eventos' ? eventsHeaderConfig.subtitle : '';
  const headerIconName = selectedKey === 'eventos' ? eventsHeaderConfig.iconName : selectedItem.iconName;
  const headerOnBack = selectedKey === 'eventos' ? eventsHeaderConfig.onBack : null;
  const headerBackLabel = selectedKey === 'eventos' ? eventsHeaderConfig.backLabel : 'Volver';

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
        {selectedKey === 'cuenta' ? (
          <View style={styles.placeholderWrap}>
            <ProfileScreen />
            <Pressable style={[styles.dangerButton, { backgroundColor: theme.alert }]} onPress={logout}>
              <Text style={styles.primaryText}>Cerrar sesion</Text>
            </Pressable>
          </View>
        ) : null}
        {selectedKey === 'eventos' ? (
          <EventsScreen
            allowedSections={['list', 'create', 'overlays']}
            onHeaderChange={setEventsHeaderConfig}
          />
        ) : null}
        {selectedKey === 'configuracion' ? (
          <EventsScreen initialSection="branding" allowedSections={['branding']} showKpi={false} />
        ) : null}
      </View>
      <BottomMainMenu items={menuItems} selectedKey={selectedKey} onSelect={setScreen} theme={theme} />
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
      <AuthProvider>
        <PermissionProvider>
          <AppContainer />
        </PermissionProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  page: { flex: 1 },
  panelBody: { flex: 1 },
  placeholderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing.lg,
    gap: tokens.spacing.xs,
  },
  placeholderTitle: { fontSize: tokens.typography.heading, fontWeight: '700' },
  placeholderText: { fontSize: tokens.typography.body },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontWeight: '700' },
  dangerButton: {
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.sm,
    alignItems: 'center',
  },
});
