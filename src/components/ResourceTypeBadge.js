import React from 'react';
import { StyleSheet, View } from 'react-native';
import Icon from '@react-native-vector-icons/fontawesome6';
import { tokens } from '../design-system/tokens';
import { t } from '../i18n';

const TYPE_DEFINITIONS = {
  background: { icon: 'image', label: 'resource_012' },
  frame: { icon: 'border-all', label: 'resource_008' },
  sticker: { icon: 'star', label: 'resource_053' },
  template: { icon: 'layer-group', label: 'resource_007' },
  animation: { icon: 'film', label: 'resource_009' },
  font: { icon: 'font', label: 'resource_011' },
};

export function resourceTypeDefinition(type) {
  return TYPE_DEFINITIONS[type] || { icon: 'file', label: 'resource_018' };
}

export function ResourceTypeBadge({ type, theme, testID }) {
  const definition = resourceTypeDefinition(type);
  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="image"
      accessibilityLabel={t(definition.label)}
      style={[styles.badge, { backgroundColor: theme.surface }]}
    >
      <Icon name={definition.icon} iconStyle="solid" size={tokens.typography.caption} color={theme.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: tokens.spacing.lg,
    height: tokens.spacing.lg,
    borderTopRightRadius: tokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
