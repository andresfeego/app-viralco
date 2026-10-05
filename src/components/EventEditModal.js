import React from 'react';
import { AppButton } from '../design-system/components/AppButton';
import { ToastViewport } from '../providers/ToastProvider';
import { FormModal } from './FormModal';

export function EventEditModal({
  visible,
  theme,
  title,
  cancelLabel,
  saveLabel,
  onClose,
  onSave,
  saving = false,
  children,
  footerContent = null,
  testID,
}) {
  return (
    <FormModal visible={visible} theme={theme} title={title} onClose={onClose} testID={testID} overlay={<ToastViewport theme={theme} />} actions={<>
            <AppButton testID={`${testID}-close`} variant="outlined" borderColor={theme.buttonSecondaryBorder}
              label={cancelLabel}
              onPress={onClose}
              backgroundColor={theme.surface}
              pressedColor={theme.background}
              textColor={theme.textPrimary}

              disabled={saving}
 />
            <AppButton
              testID={`${testID}-save`}
              label={saveLabel}
              onPress={onSave}
              backgroundColor={theme.buttonBg}
              pressedColor={theme.buttonBgPressed}
              textColor={theme.buttonText}

              disabled={saving}
 />
    </>}>
      {children}
      {footerContent}
    </FormModal>
  );
}
