import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useCan } from '../hooks/useCan';
import { useAuth } from '../hooks/useAuth';
import { getTheme } from '../design-system/theme';
import { tokens } from '../design-system/tokens';

export function ProtectedScreen({ permission, children }) {
  const allowed = useCan(permission);
  const { user } = useAuth();
  const mode = user?.themeMode || 'dark';
  const theme = getTheme(mode);

  if (!allowed) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.text, { color: theme.textSecondary }]}>No tienes permisos para ver esta vista.</Text>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing.lg,
  },
  text: {
    fontSize: tokens.typography.body,
    textAlign: 'center',
  },
});
