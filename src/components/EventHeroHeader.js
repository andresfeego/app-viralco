import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/fontawesome6';
import { tokens } from '../design-system/tokens';

const LOGO_SIZE = tokens.spacing.xl * 2;

export function EventHeroHeader({ theme, title, subtitle, logoImageUrl = '', logoAction = null }) {
  return (
    <View testID="event-hero-frame" style={[styles.hero, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
      <View style={[styles.logoWrap, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {logoImageUrl ? (
          <Image source={{ uri: logoImageUrl }} style={styles.logoImage} />
        ) : (
          <View style={styles.placeholderIconWrap}>
            <Icon name="image" iconStyle="regular" size={tokens.spacing.lg} color={theme.textSecondary} />
          </View>
        )}
        {logoAction ? <View testID="event-hero-logo-action" style={styles.logoAction}>{logoAction}</View> : null}
      </View>
      <View style={styles.titleStack}>
        <Text numberOfLines={2} style={[styles.title, { color: theme.textPrimary }]}>{title || '-'}</Text>
        {subtitle ? <Text numberOfLines={1} style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { width: '100%', minWidth: tokens.spacing.none, flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm, padding: tokens.spacing.md, borderBottomWidth: tokens.border.thin },
  titleStack: { flex: 1, minWidth: tokens.spacing.none, gap: tokens.spacing.xxs },
  title: { fontSize: tokens.typography.heading, fontWeight: '800' },
  subtitle: { fontSize: tokens.typography.caption, fontWeight: '700' },
  logoWrap: { position: 'relative', width: LOGO_SIZE, height: LOGO_SIZE, borderRadius: tokens.radius.md, borderWidth: tokens.border.thin, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logoImage: { width: '100%', height: '100%' },
  logoAction: { position: 'absolute', right: tokens.spacing.sm, bottom: tokens.spacing.sm },
  placeholderIconWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
});
