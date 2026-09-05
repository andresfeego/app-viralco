import React from 'react';
import { StyleSheet, View } from 'react-native';
import { tokens } from '../design-system/tokens';
import { IconTextButton } from './IconTextButton';

export function MirrorEditorToolbar({ actions, theme, disabled = false }) {
  return (
    <View style={[styles.palette, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {actions.map((action) => (
        <IconTextButton
          key={action.key}
          theme={theme}
          icon={action.icon}
          iconStyle={action.iconStyle || 'solid'}
          denseIconOnly
          iconOnlyShape="square"
          iconSize={tokens.typography.caption}
          variant="ghost"
          backgroundColor={action.selected ? theme.primary : theme.surface}
          pressedBackgroundColor={theme.background}
          iconColor={action.selected ? theme.buttonText : theme.primary}
          accessibilityLabel={action.label}
          selected={Boolean(action.selected)}
          onPress={action.onPress}
          disabled={(!action.allowReadOnly && disabled) || Boolean(action.disabled)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  palette: {
    marginLeft: -tokens.spacing.md,
    alignItems: 'center',
    gap: tokens.spacing.none,
    paddingHorizontal: tokens.spacing.none,
    paddingVertical: tokens.spacing.xxs,
    borderWidth: tokens.spacing.none,
    borderTopWidth: tokens.border.thin,
    borderBottomWidth: tokens.border.thin,
    borderTopRightRadius: tokens.radius.md,
    borderBottomRightRadius: tokens.radius.md,
  },
});
