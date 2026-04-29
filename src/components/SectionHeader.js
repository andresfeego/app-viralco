import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/fontawesome6';
import { tokens } from '../design-system/tokens';

export function SectionHeader({ title, iconName, theme }) {
  return (
    <View style={[styles.wrap, { borderBottomColor: theme.primary, backgroundColor: theme.primary }]}>
      <Text style={[styles.title, { color: theme.buttonText }]}>{title}</Text>
      <Icon name={iconName} iconStyle="solid" size={20} color={theme.buttonText} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 64,
    borderBottomWidth: 1,
    paddingHorizontal: tokens.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: tokens.typography.heading,
    fontWeight: '700',
  },
});
