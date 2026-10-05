import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { tokens } from '../design-system/tokens';
import { t } from '../i18n';

export function MirrorInstanceLabel({ kind, number, theme }) {
  return <View pointerEvents="none" style={[styles.label, { backgroundColor: theme.surface }]}>
    <Text style={[styles.text, { color: theme.textPrimary }]}>{t(kind === 'frame' ? 'mirror_instance_frame' : 'mirror_instance_sticker')} {number}</Text>
  </View>;
}
const styles = StyleSheet.create({
  label: { position: 'absolute', left: tokens.spacing.xxs, bottom: tokens.spacing.xxs, borderRadius: tokens.radius.sm, paddingHorizontal: tokens.spacing.xxs },
  text: { fontSize: tokens.typography.caption, fontWeight: '700' },
});
