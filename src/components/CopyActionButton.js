import React from 'react';
import { StyleSheet } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { IconTextButton } from './IconTextButton';
import { tokens } from '../design-system/tokens';
import { useToast } from '../providers/ToastProvider';
import { t } from '../i18n';

export function CopyActionButton({ theme, value, iconOnly = false, accessibilityLabel, testID, disabled = false, copied = false, onPress = () => {} }) {
  const { showToast } = useToast();
  const unavailable = disabled || (value != null && !String(value).trim());
  const copy = () => {
    if (unavailable) return;
    if (value == null) { onPress(); return; }
    try {
      // Preserve the exact text, including leading zeros in bank account numbers.
      Clipboard.setString(String(value));
      showToast({ type: 'info', message: t('common_copied') });
    } catch {
      showToast({ type: 'error', message: t('common_copy_failed') });
    }
  };
  return <IconTextButton theme={theme} testID={testID} icon="copy" iconStyle="regular"
    label={iconOnly ? '' : t(copied ? 'common_copied' : 'common_copy')}
    accessibilityLabel={accessibilityLabel || t('common_copy')}
    variant={iconOnly ? 'ghost' : 'outlined'} iconColor={theme.textSecondary}
    iconSize={tokens.typography.body} style={iconOnly ? styles.iconButton : undefined}
    borderColor={theme.border} disabled={Boolean(unavailable)} onPress={copy} />;
}

const styles = StyleSheet.create({
  iconButton: { width: tokens.spacing.xl + tokens.spacing.sm, height: tokens.spacing.xl + tokens.spacing.sm, minHeight: tokens.spacing.xl + tokens.spacing.sm, flexShrink: 0 },
});
