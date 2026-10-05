import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { AppButton } from '../design-system/components/AppButton';
import { FormModal } from './FormModal';
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
    <FormModal visible={visible} theme={theme} title={title} onClose={onCancel} testID={testID} overlay={<ToastViewport theme={theme} />} actions={<>
      <AppButton variant="outlined" borderColor={theme.buttonSecondaryBorder} label={cancelLabel} onPress={onCancel} backgroundColor={theme.surface} pressedColor={theme.background} textColor={theme.textPrimary} disabled={busy} />
      <AppButton testID={`${testID}-confirm`} label={confirmLabel} onPress={onConfirm} backgroundColor={theme.alert} pressedColor={theme.alert} textColor={theme.buttonText} disabled={!canConfirm} />
    </>}>
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
    </FormModal>
  );
}

const styles = StyleSheet.create({
  message: { fontSize: tokens.typography.caption, fontWeight: '600' },


});
