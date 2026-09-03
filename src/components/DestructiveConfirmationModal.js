import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../design-system/components/AppButton';
import { SurfaceCard } from '../design-system/components/SurfaceCard';
import { tokens } from '../design-system/tokens';
import { ToastViewport } from '../providers/ToastProvider';
import { PaperFormInput } from './PaperFormInput';

export function DestructiveConfirmationModal({
  visible,
  theme,
  title,
  message,
  cancelLabel,
  confirmLabel,
  confirmationLabel = '',
  confirmationValue = '',
  expectedValue = '',
  onChangeConfirmation = () => {},
  onCancel,
  onConfirm,
  busy = false,
  testID = 'destructive-confirmation',
}) {
  const requiresText = Boolean(expectedValue);
  const canConfirm = !busy && (!requiresText || confirmationValue === expectedValue);
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <View style={[styles.overlay, { backgroundColor: theme.background }]}>
        <View style={styles.sheet}>
          <SurfaceCard surfaceColor={theme.background} borderColor={theme.border}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
            <Text style={[styles.message, { color: theme.textSecondary }]}>{message}</Text>
            {requiresText ? (
              <PaperFormInput
                testID={`${testID}-input`}
                theme={theme}
                label={confirmationLabel}
                value={confirmationValue}
                onChangeText={onChangeConfirmation}
                autoCapitalize="sentences"
                editable={!busy}
              />
            ) : null}
            <View style={styles.actions}>
              <AppButton label={cancelLabel} onPress={onCancel} backgroundColor={theme.surface} pressedColor={theme.surface} textColor={theme.textPrimary} style={styles.action} disabled={busy} />
              <AppButton testID={`${testID}-confirm`} label={confirmLabel} onPress={onConfirm} backgroundColor={theme.alert} pressedColor={theme.alert} textColor={theme.buttonText} style={styles.action} disabled={!canConfirm} />
            </View>
          </SurfaceCard>
        </View>
        <ToastViewport theme={theme} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { padding: tokens.spacing.md },
  title: { fontSize: tokens.typography.body, fontWeight: '700' },
  message: { fontSize: tokens.typography.caption, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: tokens.spacing.xs },
  action: { flex: 1, minWidth: tokens.spacing.none },
});
