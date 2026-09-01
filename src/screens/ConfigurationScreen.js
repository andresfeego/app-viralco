import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppButton } from '../design-system/components/AppButton';
import { getTheme } from '../design-system/theme';
import { tokens } from '../design-system/tokens';
import { HorizontalSubMenu } from '../components/HorizontalSubMenu';
import { useAuth } from '../hooks/useAuth';
import { EventsScreen } from './EventsScreen';
import { ProfileScreen } from './ProfileScreen';

const CONFIG_SECTIONS = [
  { key: 'profile', label: 'Perfil' },
  { key: 'branding', label: 'Branding' },
];

export function ConfigurationScreen({ onCreateAccount = () => {} }) {
  const { logout, user } = useAuth();
  const theme = useMemo(() => getTheme(user?.themeMode || 'dark'), [user?.themeMode]);
  const [section, setSection] = useState('profile');

  return (
    <View style={styles.container}>
      <HorizontalSubMenu items={CONFIG_SECTIONS} selectedKey={section} onSelect={setSection} theme={theme} />
      <View style={styles.content}>
        {section === 'profile' ? <ProfileScreen /> : null}
        {section === 'branding' ? <EventsScreen initialSection="branding" allowedSections={['branding']} showKpi={false} onCreateAccount={onCreateAccount} /> : null}
        {section === 'profile' ? (
          <View style={styles.logoutWrap}>
            <AppButton
              label="Cerrar sesion"
              onPress={logout}
              backgroundColor={theme.alert}
              pressedColor={theme.alert}
              textColor={theme.buttonText}
              style={styles.logoutButton}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  logoutWrap: {
    paddingHorizontal: tokens.spacing.md,
    paddingBottom: tokens.spacing.md,
  },
  logoutButton: {
    width: '100%',
  },
});
