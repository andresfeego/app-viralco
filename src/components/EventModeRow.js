import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { tokens } from '../design-system/tokens';
import { IconTextButton } from './IconTextButton';

export function EventModeRow({
  theme,
  name,
  configureLabel,
  launchLabel,
  canConfigure = false,
  canLaunch = false,
  showDivider = true,
  onConfigure = () => {},
  onLaunch = () => {},
  configureTestID,
  launchTestID,
}) {
  const launchColor = canLaunch ? tokens.colors.success[400] : tokens.colors.gray[4];

  return (
    <View
      testID="event-mode-row"
      style={[
        styles.row,
        {
          borderBottomColor: tokens.colors.gray[3],
          borderBottomWidth: showDivider ? tokens.border.thin : tokens.spacing.none,
        },
      ]}
    >
      <Text numberOfLines={1} style={[styles.name, { color: theme.textPrimary }]}>{name || '-'}</Text>
      <View style={styles.actions}>
        <IconTextButton
          testID={configureTestID}
          theme={theme}
          icon="gear"
          iconOnlyShape="rounded-square"
          variant="outlined"
          accessibilityLabel={configureLabel}
          backgroundColor={theme.surface}
          pressedBackgroundColor={theme.background}
          borderColor={theme.primary}
          iconColor={theme.primary}
          disabled={!canConfigure}
          onPress={onConfigure}
        />
        <IconTextButton
          testID={launchTestID}
          theme={theme}
          icon="play"
          iconOnlyShape="rounded-square"
          variant="outlined"
          accessibilityLabel={launchLabel}
          backgroundColor={theme.surface}
          pressedBackgroundColor={theme.background}
          borderColor={launchColor}
          iconColor={launchColor}
          disabled={!canLaunch}
          onPress={onLaunch}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: tokens.spacing.xl + tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  name: {
    flex: 1,
    fontSize: tokens.typography.body,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
  },
});
