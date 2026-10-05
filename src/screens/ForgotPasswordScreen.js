import React, { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { AuthForm } from '../components/AuthForm';
import { PaperFormInput } from '../components/PaperFormInput';
import { getTheme } from '../design-system/theme';
import { t } from '../i18n';
import { useAuth } from '../hooks/useAuth';
import { userErrorMessage } from '../services/errorHandling';

export function ForgotPasswordScreen({ onGoLogin, onGoReset }) {
  const { forgotPassword, user } = useAuth();
  const theme = getTheme(user?.themeMode || 'dark');
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
      setError(userErrorMessage(err, 'No se pudo procesar la solicitud'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthForm theme={theme} title={t('auth_recover_title')} error={error} message={message} loading={loading} submitLabel={t(loading ? 'auth_sending' : 'auth_request_token')} onSubmit={onSubmit} links={<>
      <Pressable accessibilityRole="button" onPress={onGoReset}><Text style={{ color: theme.primary }}>{t('auth_has_token')}</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={onGoLogin}><Text style={{ color: theme.primary }}>{t('auth_007')}</Text></Pressable>
    </>}>
      <PaperFormInput theme={theme} label={t('auth_003')} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
    </AuthForm>
  );
}
