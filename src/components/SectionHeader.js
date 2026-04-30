import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/fontawesome6';
import { tokens } from '../design-system/tokens';

export function SectionHeader({ title, subtitle = '', iconName, theme, onBack = null, backLabel = 'Volver' }) {
  return (
    <View style={[styles.wrap, { borderBottomColor: theme.primary, backgroundColor: theme.primary }]}>
      <View style={styles.leftCol}>
        {onBack ? (
          <Pressable onPress={onBack} style={styles.backButton}>
            <Text style={[styles.backText, { color: theme.buttonText }]}>{'<'} {backLabel}</Text>
          </Pressable>
        ) : null}
        <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.title, { color: theme.buttonText }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={[styles.subtitle, { color: theme.textSecondary }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.iconWrap}>
        <Icon name={iconName} iconStyle="solid" size={20} color={theme.buttonText} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 78,
    borderBottomWidth: 1,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftCol: {
    width: '55%',
    paddingLeft: 4,
    gap: 2,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 1,
    marginBottom: 1,
  },
  backText: {
    fontSize: tokens.typography.caption,
    fontWeight: '700',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 21,
    marginLeft: 6,
  },
  subtitle: {
    fontSize: tokens.typography.caption,
    fontWeight: '600',
  },
  iconWrap: {
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
    minWidth: 24,
  },
});
