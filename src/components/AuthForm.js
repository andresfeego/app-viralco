import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../design-system/components/AppButton';
import { FormLayout } from '../design-system/components/FormLayout';
import { SurfaceCard } from '../design-system/components/SurfaceCard';
import { tokens } from '../design-system/tokens';

export function AuthForm({ theme, title, children, error, message, submitLabel, onSubmit, loading, links }) {
  return <KeyboardAvoidingView style={[styles.screen, { backgroundColor: theme.background }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>
      <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
        <View style={styles.stack}>
          <FormLayout testID="auth-form" actions={<AppButton label={submitLabel} onPress={onSubmit} disabled={loading} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} />}>
            <Text accessibilityRole="header" style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
            {children}
            {error ? <Text style={[styles.feedback, { color: theme.alert }]}>{error}</Text> : null}
            {message ? <Text style={[styles.feedback, { color: tokens.colors.success[500] }]}>{message}</Text> : null}
          </FormLayout>
          {links}
        </View>
      </SurfaceCard>
    </ScrollView>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  page: { flexGrow: 1, justifyContent: 'center', padding: tokens.spacing.lg },
  stack: { gap: tokens.spacing.md, minWidth: tokens.spacing.none },
  title: { fontSize: tokens.typography.heading, fontWeight: '700' },
  feedback: { fontSize: tokens.typography.caption },
});
