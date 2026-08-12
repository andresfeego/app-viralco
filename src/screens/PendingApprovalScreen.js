import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { t } from '../i18n';

export function PendingApprovalScreen() {
  const { user, logout } = useAuth();

  const message =
    user?.status?.slug === 'suspended' ? t('auth_012') : t('auth_011');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('auth_013')}</Text>
      <Text style={styles.text}>{message}</Text>
      <Pressable style={styles.button} onPress={logout}>
        <Text style={styles.buttonText}>{t('auth_014')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: '700' },
  text: { textAlign: 'center', fontSize: 16, color: '#374151' },
  button: { backgroundColor: '#1f6feb', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12 },
  buttonText: { color: '#fff', fontWeight: '700' },
});
