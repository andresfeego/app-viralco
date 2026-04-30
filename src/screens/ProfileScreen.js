import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { getTheme } from '../design-system/theme';
import { tokens } from '../design-system/tokens';
import { SurfaceCard } from '../design-system/components/SurfaceCard';
import { AppButton } from '../design-system/components/AppButton';

export function ProfileScreen() {
  const { user, reloadMe, updateThemeMode } = useAuth();
  const mode = user?.themeMode || 'dark';
  const theme = useMemo(() => getTheme(mode), [mode]);
  const [loadingMode, setLoadingMode] = useState(false);
  const [loadingReload, setLoadingReload] = useState(false);
  const [error, setError] = useState('');
  const roleNames = (user?.roles || []).map((r) => r.slug).filter(Boolean);

  const onToggleTheme = async () => {
    const nextMode = mode === 'dark' ? 'light' : 'dark';
    setLoadingMode(true);
    setError('');
    try {
      await updateThemeMode(nextMode);
    } catch (err) {
      setError(err?.message || 'No se pudo cambiar el tema');
    } finally {
      setLoadingMode(false);
    }
  };

  const onReloadProfile = async () => {
    setLoadingReload(true);
    setError('');
    try {
      await reloadMe();
    } catch (err) {
      setError(err?.message || 'No se pudo recargar el perfil');
    } finally {
      setLoadingReload(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: theme.textPrimary }]}>Perfil</Text>

      <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Informacion de cuenta</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Email</Text>
            <Text numberOfLines={1} style={[styles.value, { color: theme.textPrimary }]}>
              {user?.email || '-'}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Estado</Text>
            <Text style={[styles.value, { color: theme.textPrimary }]}>{user?.estado || '-'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Tema</Text>
            <Text style={[styles.value, { color: theme.textPrimary }]}>{mode}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Roles</Text>
            <Text numberOfLines={1} style={[styles.value, { color: theme.textPrimary }]}>
              {roleNames.join(', ') || '-'}
            </Text>
          </View>
        </View>
      </SurfaceCard>

      {error ? <Text style={[styles.error, { color: theme.alert }]}>{error}</Text> : null}

      <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Acciones</Text>
        <View style={styles.actionList}>
          <AppButton
            label={loadingMode ? 'Actualizando tema...' : 'Cambiar tema'}
            onPress={onToggleTheme}
            backgroundColor={theme.buttonBg}
            pressedColor={theme.buttonBgPressed}
            textColor={theme.buttonText}
            style={styles.actionButton}
          />
          <AppButton
            label={loadingReload ? 'Recargando perfil...' : 'Recargar perfil'}
            onPress={onReloadProfile}
            backgroundColor={theme.buttonBg}
            pressedColor={theme.buttonBgPressed}
            textColor={theme.buttonText}
            style={styles.actionButton}
          />
        </View>
      </SurfaceCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: tokens.spacing.md,
    gap: tokens.spacing.md,
  },
  title: {
    fontSize: tokens.typography.heading,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: tokens.typography.body,
    fontWeight: '700',
  },
  infoGrid: {
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.xs,
  },
  infoItem: {
    gap: 2,
  },
  label: {
    fontSize: tokens.typography.caption,
    fontWeight: '700',
  },
  value: {
    fontSize: tokens.typography.body,
    fontWeight: '600',
  },
  actionList: {
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.xs,
  },
  actionButton: {
    width: '100%',
  },
  error: { fontSize: tokens.typography.caption, fontWeight: '600' },
});
