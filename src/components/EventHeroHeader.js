import React from 'react';
import { Image, ImageBackground, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/fontawesome6';
import { tokens } from '../design-system/tokens';

const HERO_HEIGHT = tokens.spacing.xl * 5;
const LOGO_SIZE = tokens.spacing.xl * 2 + tokens.spacing.lg;
const LOGO_OFFSET = LOGO_SIZE / 2;

export function EventHeroHeader({ theme, title, subtitle, backgroundImageUrl = '', logoImageUrl = '', fallbackIcon = 'image', backgroundAction = null, logoAction = null }) {
  const heroContent = (
    <View style={styles.heroContent}>
      {!backgroundImageUrl ? (
        <View style={styles.placeholderIconWrap}>
          <Icon name={fallbackIcon} iconStyle="regular" size={tokens.spacing.xl + tokens.spacing.xxs} color={theme.textSecondary} />
        </View>
      ) : null}
      <View style={[styles.titleBlock, { backgroundColor: theme.surface }]}>
        <Text numberOfLines={2} style={[styles.title, { color: theme.textPrimary }]}>{title || '-'}</Text>
        {subtitle ? <Text numberOfLines={1} style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text> : null}
      </View>
    </View>
  );

  return (
    <View style={styles.wrap}>
      {backgroundImageUrl ? (
        <ImageBackground
          testID="event-hero-frame"
          source={{ uri: backgroundImageUrl }}
          style={[styles.hero, { backgroundColor: theme.surface }]}
        >
          {heroContent}
          {backgroundAction ? <View testID="event-hero-background-action" style={styles.backgroundAction}>{backgroundAction}</View> : null}
        </ImageBackground>
      ) : (
        <View testID="event-hero-frame" style={[styles.hero, { backgroundColor: theme.surface }]}>
          {heroContent}
          {backgroundAction ? <View testID="event-hero-background-action" style={styles.backgroundAction}>{backgroundAction}</View> : null}
        </View>
      )}
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', paddingBottom: tokens.spacing.xl, position: 'relative' },
  hero: { width: '100%', minHeight: HERO_HEIGHT, overflow: 'hidden', justifyContent: 'center' },
  heroContent: { alignItems: 'center', justifyContent: 'center', gap: tokens.spacing.sm, padding: tokens.spacing.lg },
  titleBlock: { alignItems: 'center', gap: tokens.spacing.xxs, padding: tokens.spacing.sm, borderRadius: tokens.radius.md },
  title: { fontSize: tokens.typography.heading, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: tokens.typography.caption, fontWeight: '700', textAlign: 'center' },
  logoWrap: { position: 'absolute', left: '50%', bottom: tokens.spacing.none, width: LOGO_SIZE, height: LOGO_SIZE, marginLeft: -LOGO_OFFSET, borderRadius: tokens.radius.lg, borderWidth: tokens.border.thin, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logoImage: { width: '100%', height: '100%' },
  backgroundAction: { position: 'absolute', right: tokens.spacing.sm, top: tokens.spacing.sm },
  logoAction: { position: 'absolute', right: tokens.spacing.sm, bottom: tokens.spacing.sm },
  placeholderIconWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
});
