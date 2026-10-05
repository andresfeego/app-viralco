import React, { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { AuthForm } from '../components/AuthForm';
import { PaperFormInput } from '../components/PaperFormInput';
import { getTheme } from '../design-system/theme';
import { t } from '../i18n';
import { useAuth } from '../hooks/useAuth';
import { userErrorMessage } from '../services/errorHandling';

export function ResetPasswordScreen({ onGoLogin }) {
  const { resetPassword, user } = useAuth();
  const theme = getTheme(user?.themeMode || 'dark');
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
      setError(userErrorMessage(err, 'No se pudo restablecer contrasena'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthForm theme={theme} title={t('auth_reset_title')} error={error} message={message} loading={loading} submitLabel={t(loading ? 'auth_processing' : 'auth_update_password')} onSubmit={onSubmit} links={<Pressable accessibilityRole="button" onPress={onGoLogin}><Text style={{ color: theme.primary }}>{t('auth_007')}</Text></Pressable>}>
      <PaperFormInput theme={theme} label="Token" autoCapitalize="none" value={token} onChangeText={setToken} />
      <PaperFormInput theme={theme}
        label={t('auth_new_password')}
        secureTextEntry
        autoCapitalize="none"
        value={newPassword}
        onChangeText={setNewPassword}
      />
    </AuthForm>
  );
}
