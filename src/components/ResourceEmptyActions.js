import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppButton } from '../design-system/components/AppButton';
import { tokens } from '../design-system/tokens';

export function ResourceEmptyActions({ theme, primaryLabel, onPrimary, secondaryLabel, onSecondary, disabled = false }) {
  return (
    <View style={styles.actions}>
      <AppButton label={primaryLabel} onPress={onPrimary} disabled={disabled} backgroundColor={theme.surface} pressedColor={theme.background} textColor={theme.primary} style={styles.action} />
      <AppButton label={secondaryLabel} onPress={onSecondary} disabled={disabled} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} style={styles.action} />
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.xs },
  action: { flexGrow: 1, minWidth: tokens.spacing.xl * 4 },
});
