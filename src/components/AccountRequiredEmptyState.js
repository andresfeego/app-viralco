import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../design-system/components/AppButton';
import { SurfaceCard } from '../design-system/components/SurfaceCard';
import { tokens } from '../design-system/tokens';
import { t } from '../i18n';

export function AccountRequiredEmptyState({ theme, onCreateAccount, testID = 'account-required-empty-state' }) {
  return (
    <View testID={testID} style={styles.wrap}>
      <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>{t('account_075')}</Text>
        <Text style={[styles.description, { color: theme.textSecondary }]}>{t('account_076')}</Text>
        <AppButton
          testID={`${testID}-action`}
          label={t('account_024')}
          onPress={onCreateAccount}
          backgroundColor={theme.buttonBg}
          pressedColor={theme.buttonBgPressed}
          textColor={theme.buttonText}
          style={styles.action}
        />
      </SurfaceCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', padding: tokens.spacing.md },
  title: { fontSize: tokens.typography.heading, fontWeight: '700', textAlign: 'center' },
  description: { fontSize: tokens.typography.body, textAlign: 'center' },
  action: { width: '100%' },
});
