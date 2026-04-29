import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../hooks/useAuth';

export function ForgotPasswordScreen({ onGoLogin, onGoReset }) {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const payload = await forgotPassword(email);
      setMessage(payload.message || 'Si existe, se enviaron instrucciones');
    } catch (err) {
      setError(err?.message || 'No se pudo procesar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recuperar contrasena</Text>
      <TextInput placeholder="Correo" style={styles.input} autoCapitalize="none" value={email} onChangeText={setEmail} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {message ? <Text style={styles.ok}>{message}</Text> : null}
      <Pressable style={styles.button} onPress={onSubmit} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Enviando...' : 'Solicitar token'}</Text>
      </Pressable>
      <Pressable onPress={onGoReset}>
        <Text style={styles.link}>Ya tengo token de reset</Text>
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
