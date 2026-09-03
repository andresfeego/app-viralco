import React, { useMemo, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { SurfaceCard } from '../design-system/components/SurfaceCard';
import { AppButton } from '../design-system/components/AppButton';
import { getTheme } from '../design-system/theme';
import { tokens } from '../design-system/tokens';
import { ENABLE_DEBUG_LOGIN_PRESETS } from '../config/debug';

const logoKaptura = require('../assets/branding/logo_kaptura.png');
const QUICK_CREDENTIALS = {
  SA: { email: 'superadmin@viralco.local', password: 'superadmin1234' },
  AUA: {
    email: 'adminuseractivo@viralco.local',
    password: 'adminuseractivo1234',
  },
  AUP: {
    email: 'useradminpendiente@viralco.local',
    password: 'useradminpendiente1234',
  },
};

function LoginField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  autoComplete,
  theme,
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        style={[
          styles.input,
          {
            color: theme.textPrimary,
            borderColor: theme.border,
            backgroundColor: theme.background,
          },
        ]}
      />
    </View>
  );
}

export function LoginScreen({ onGoRegister, onGoForgot }) {
  const { login } = useAuth();
  const mode = 'dark';
  const theme = useMemo(() => getTheme(mode), [mode]);

  const [email, setEmail] = useState('superadmin@viralco.local');
  const [password, setPassword] = useState('superadmin1234');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const applyQuickCredentials = key => {
    const preset = QUICK_CREDENTIALS[key];
    if (!preset) {
      return;
    }
    setEmail(preset.email);
    setPassword(preset.password);
    setError('');
  };

  const onSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      await login(email, password);
    } catch (err) {
      setError(err?.message || 'No se pudo iniciar sesion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.keyboardWrap, { backgroundColor: theme.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.shell}>
          {ENABLE_DEBUG_LOGIN_PRESETS ? (
            <View
              testID="debug-login-presets-container"
              accessibilityLabel="debug-login-presets-container"
              style={[
                styles.debugQuickAccessWrap,
                {
                  borderColor: theme.border,
                  backgroundColor: tokens.colors.yellow[500],
                },
              ]}
            >
              {Object.keys(QUICK_CREDENTIALS).map(key => (
                <Pressable
                  key={key}
                  testID={`debug-login-preset-${key.toLowerCase()}`}
                  accessibilityLabel={`debug-login-preset-${key.toLowerCase()}`}
                  onPress={() => applyQuickCredentials(key)}
                  style={[
                    styles.debugQuickAccessButton,
                    {
                      borderColor: theme.border,
                      backgroundColor: tokens.colors.yellow[500],
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.debugQuickAccessLabel,
                      { color: tokens.colors.gray[9] },
                    ]}
                  >
                    {key}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <View style={styles.brandHeader}>
            <Image
              source={logoKaptura}
              resizeMode="contain"
              accessibilityLabel="Kaptura"
              style={styles.logo}
            />
          </View>

          <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
            <View style={styles.formWrap}>
              <LoginField
                label="Correo"
                value={email}
                onChangeText={setEmail}
                placeholder="tu@correo.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                theme={theme}
              />

              <LoginField
                label="Contrasena"
                value={password}
                onChangeText={setPassword}
                placeholder="Tu contrasena"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
                theme={theme}
              />

              {error ? (
                <Text
                  style={[styles.errorText, { color: theme.buttonBgPressed }]}
                >
                  {error}
                </Text>
              ) : null}

              <AppButton
                label={loading ? 'Ingresando...' : 'Iniciar sesion'}
                onPress={onSubmit}
                backgroundColor={theme.buttonBg}
                pressedColor={theme.buttonBgPressed}
                textColor={theme.buttonText}
                style={styles.submitButton}
              />

              <View style={styles.actionsRow}>
                <Pressable onPress={onGoForgot}>
                  <Text style={[styles.linkText, { color: theme.buttonBg }]}>
                    Olvide mi contrasena
                  </Text>
                </Pressable>
                <Pressable onPress={onGoRegister}>
                  <Text style={[styles.linkText, { color: theme.buttonBg }]}>
                    Crear cuenta
                  </Text>
                </Pressable>
              </View>
            </View>
          </SurfaceCard>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardWrap: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  shell: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    padding: tokens.spacing.xl,
    gap: tokens.spacing.lg,
  },
  debugQuickAccessWrap: {
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.xs,
    flexDirection: 'row',
    gap: tokens.spacing.xs,
  },
  debugQuickAccessButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: tokens.spacing.xs,
  },
  debugQuickAccessLabel: {
    fontSize: tokens.typography.caption,
    fontWeight: '700',
  },
  brandHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.sm,
  },
  logo: {
    width: tokens.spacing.xl * 8,
    height: tokens.spacing.xl * 5,
  },
  formWrap: {
    gap: tokens.spacing.md,
  },
  fieldWrap: {
    gap: tokens.spacing.xs,
  },
  fieldLabel: {
    fontSize: tokens.typography.caption,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.sm,
    fontSize: tokens.typography.body,
  },
  errorText: {
    fontSize: tokens.typography.caption,
    fontWeight: '600',
  },
  submitButton: {
    marginTop: tokens.spacing.xl,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.sm,
  },
  linkText: {
    fontSize: tokens.typography.caption,
    fontWeight: '700',
  },
});
