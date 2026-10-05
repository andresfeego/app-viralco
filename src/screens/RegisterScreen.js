import React, { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { AuthForm } from '../components/AuthForm';
import { PaperFormInput } from '../components/PaperFormInput';
import { getTheme } from '../design-system/theme';
import { useAuth } from '../hooks/useAuth';
import { t } from '../i18n';
import { userErrorMessage } from '../services/errorHandling';

export function RegisterScreen({ onGoLogin }) {
  const { register, user } = useAuth();
  const theme = getTheme(user?.themeMode || 'dark');
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
      setError(userErrorMessage(err, t('auth_010')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthForm theme={theme} title={t('auth_000')} error={error} message={message} loading={loading} submitLabel={loading ? t('auth_005') : t('auth_006')} onSubmit={onSubmit} links={<Pressable accessibilityRole="button" onPress={onGoLogin}><Text style={{ color: theme.primary }}>{t('auth_007')}</Text></Pressable>}>
      <PaperFormInput theme={theme} label={t('auth_001')} value={name} onChangeText={setName} />
      <PaperFormInput theme={theme} label={t('auth_002')} keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
      <PaperFormInput theme={theme} label={t('auth_003')} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <PaperFormInput theme={theme}
        label={t('auth_004')}
        secureTextEntry
        autoCapitalize="none"
        value={password}
        onChangeText={setPassword}
      />
    </AuthForm>
  );
}
