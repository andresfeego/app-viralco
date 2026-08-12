import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { t } from '../i18n';

export function RegisterScreen({ onGoLogin }) {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const payload = await register({ email, password, name, phone: phone || undefined });
      setMessage(payload.message || t('auth_009'));
    } catch (err) {
      setError(err?.message || t('auth_010'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('auth_000')}</Text>
      <TextInput placeholder={t('auth_001')} style={styles.input} value={name} onChangeText={setName} />
      <TextInput placeholder={t('auth_002')} style={styles.input} keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
      <TextInput placeholder={t('auth_003')} style={styles.input} autoCapitalize="none" value={email} onChangeText={setEmail} />
      <TextInput
        placeholder={t('auth_004')}
        style={styles.input}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {message ? <Text style={styles.ok}>{message}</Text> : null}
      <Pressable style={styles.button} onPress={onSubmit} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? t('auth_005') : t('auth_006')}</Text>
      </Pressable>
      <Pressable onPress={onGoLogin}>
        <Text style={styles.link}>{t('auth_007')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, gap: 10 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  button: { backgroundColor: '#1f6feb', borderRadius: 10, padding: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
  link: { color: '#1f6feb', fontWeight: '600' },
  error: { color: '#dc2626' },
  ok: { color: '#047857' },
});
