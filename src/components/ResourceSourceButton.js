import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppButton } from '../design-system/components/AppButton';
import { DeviceSourceMenu } from './DeviceSourceMenu';
import { tokens } from '../design-system/tokens';
import { t } from '../i18n';
import { resourceSources } from '../services/media/resourcePicker';

export function ResourceSourceButton({ theme, purpose, onSelect, disabled = false, active = true, label, style, singleLine = true }) {
  const sources = resourceSources(purpose);
  const { paddingHorizontal = tokens.spacing.sm, ...layout } = StyleSheet.flatten(style) || {};
  return <View style={[styles.wrap, layout]}>
    <DeviceSourceMenu theme={theme} sources={sources} resetKey={purpose} active={active} disabled={disabled || !purpose} video={purpose === 'animation'} testID="resource-source"
      onSelect={source => onSelect(purpose, source)} renderAnchor={onPress => <AppButton testID="resource-source-button" label={label || t(purpose === 'print_profile' ? 'print_007' : 'resource_059')} singleLine={singleLine}
        onPress={onPress} disabled={disabled || !active || !purpose}
        backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} style={{ paddingHorizontal }} />} />
  </View>;
}

const styles = StyleSheet.create({
  wrap: { minWidth: tokens.spacing.none },
});
