import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../hooks/useAuth';

export function ResetPasswordScreen({ onGoLogin }) {
  const { resetPassword } = useAuth();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const payload = await resetPassword(token, newPassword);
      setMessage(payload.message || 'Contrasena actualizada');
    } catch (err) {
      setError(err?.message || 'No se pudo restablecer contrasena');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset password</Text>
      <TextInput placeholder="Token" style={styles.input} value={token} onChangeText={setToken} />
      <TextInput
        placeholder="Nueva contrasena"
        style={styles.input}
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {message ? <Text style={styles.ok}>{message}</Text> : null}
      <Pressable style={styles.button} onPress={onSubmit} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Procesando...' : 'Actualizar contrasena'}</Text>
      </Pressable>
      <Pressable onPress={onGoLogin}>
        <Text style={styles.link}>Volver a login</Text>
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
