import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { getTheme } from '../design-system/theme';
import { tokens } from '../design-system/tokens';

export function ProfileScreen() {
  const { user, reloadMe, updateThemeMode } = useAuth();
  const mode = user?.themeMode || 'dark';
  const theme = useMemo(() => getTheme(mode), [mode]);
  const [loadingMode, setLoadingMode] = useState(false);
  const [error, setError] = useState('');

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

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.textPrimary }]}>Perfil</Text>
      <Text style={[styles.row, { color: theme.textPrimary }]}>Email: {user?.email || '-'}</Text>
      <Text style={[styles.row, { color: theme.textPrimary }]}>Estado: {user?.estado || '-'}</Text>
      <Text style={[styles.row, { color: theme.textPrimary }]}>Tema: {mode}</Text>
      <Text style={[styles.row, { color: theme.textPrimary }]}>Roles: {(user?.roles || []).map((r) => r.slug).join(', ') || '-'}</Text>
      {error ? <Text style={[styles.error, { color: theme.alert }]}>{error}</Text> : null}
      <Pressable style={[styles.button, { backgroundColor: theme.buttonBg }]} onPress={onToggleTheme}>
        <Text style={[styles.buttonText, { color: theme.buttonText }]}>
          {loadingMode ? 'Actualizando tema...' : 'Cambiar tema'}
        </Text>
      </Pressable>
      <Pressable style={[styles.button, { backgroundColor: theme.buttonBg }]} onPress={reloadMe}>
        <Text style={[styles.buttonText, { color: theme.buttonText }]}>Recargar perfil</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: tokens.spacing.md, gap: tokens.spacing.sm },
  title: { fontSize: tokens.typography.heading, fontWeight: '700', marginBottom: tokens.spacing.xs },
  row: { fontSize: tokens.typography.body },
  button: {
    borderRadius: tokens.radius.md,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    alignItems: 'center',
    marginTop: tokens.spacing.xs,
  },
  buttonText: { fontWeight: '700' },
  error: { fontSize: tokens.typography.caption, fontWeight: '600' },
});
