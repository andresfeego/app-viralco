import React from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/fontawesome6';
import LinearGradient from 'react-native-linear-gradient';
import { tokens } from '../design-system/tokens';
import { IconTextButton } from './IconTextButton';

export function SectionHeader({ title, subtitle = '', iconName, theme, onBack = null, backLabel = 'Volver', gradient = theme.headerGradient, topInset = 0, startAccessory = null, endAccessory = null, statusBarStyle = 'light-content' }) {
  return (
    <View testID="section-header" style={[styles.wrap, {
      borderBottomColor: theme.primary,
      backgroundColor: theme.primary,
      minHeight: headerMinHeight + topInset,
      paddingTop: tokens.spacing.xs + topInset,
    }]}>
      {gradient ? <StatusBar barStyle={statusBarStyle} /> : null}
      {gradient ? (
        <LinearGradient
          pointerEvents="none"
          colors={[...gradient.colors]}
          start={gradient.start}
          end={gradient.end}
          locations={gradient.locations ? [...gradient.locations] : undefined}
          useAngle={typeof gradient.angle === 'number'}
          angle={gradient.angle}
          angleCenter={gradient.angleCenter}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {startAccessory}
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
      {endAccessory || iconName ? <View style={styles.iconWrap}>
        {endAccessory || <Icon name={iconName} iconStyle="solid" size={tokens.typography.heading} color={theme.buttonText} />}
      </View> : null}
    </View>
  );
}

const headerMinHeight = tokens.spacing.xl * 2 + tokens.typography.caption;
const styles = StyleSheet.create({
  wrap: {
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
