import React from 'react';
import { AppButton } from '../design-system/components/AppButton';
import { ButtonRow } from '../design-system/components/ButtonRow';

export function ResourceEmptyActions({ theme, primaryLabel, onPrimary, secondaryLabel, onSecondary, disabled = false }) {
  return (
    <ButtonRow>
      <AppButton variant="outlined" borderColor={theme.textSecondary} label={primaryLabel} onPress={onPrimary} disabled={disabled} backgroundColor={theme.surface} pressedColor={theme.background} textColor={theme.primary} />
      <AppButton label={secondaryLabel} onPress={onSecondary} disabled={disabled} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} />
    </ButtonRow>
  );
}
