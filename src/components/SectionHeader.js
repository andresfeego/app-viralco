import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/fontawesome6';
import { tokens } from '../design-system/tokens';
import { IconTextButton } from './IconTextButton';

export function SectionHeader({ title, subtitle = '', iconName, theme, onBack = null, backLabel = 'Volver' }) {
  return (
    <View style={[styles.wrap, { borderBottomColor: theme.primary, backgroundColor: theme.primary }]}>
      <View testID="section-header-content" style={styles.leftCol}>
        {onBack ? (
          <IconTextButton
            testID="section-header-back"
            theme={theme}
            label={backLabel}
            icon="arrow-left"
            variant="ghost"
            iconColor={theme.buttonText}
            onPress={onBack}
            style={styles.backButton}
          />
        ) : null}
        <Text testID="section-header-title" numberOfLines={1} ellipsizeMode="tail" style={[styles.title, { color: theme.buttonText }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text testID="section-header-subtitle" numberOfLines={1} ellipsizeMode="tail" style={[styles.subtitle, { color: theme.tertiary }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.iconWrap}>
        <Icon name={iconName} iconStyle="solid" size={tokens.typography.heading} color={theme.buttonText} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: tokens.spacing.xl * 2 + tokens.typography.caption,
    borderBottomWidth: tokens.border.thin,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacing.sm,
  },
  leftCol: {
    flex: 1,
    minWidth: tokens.spacing.none,
    paddingLeft: tokens.spacing.xxs,
    gap: tokens.spacing.xxs,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  title: {
    fontSize: tokens.typography.heading,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: tokens.typography.caption,
    fontWeight: '600',
  },
  iconWrap: {
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: tokens.spacing.xl + tokens.spacing.sm,
    minWidth: tokens.spacing.lg,
  },
});
