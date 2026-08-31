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
          <Icon name={fallbackIcon} iconStyle="regular" size={36} color={theme.textSecondary} />
          {backgroundAction ? <View style={styles.placeholderAction}>{backgroundAction}</View> : null}
        </View>
      ) : null}
      <View style={styles.titleBlock}>
        <Text numberOfLines={2} style={[styles.title, { color: theme.textPrimary }]}>{title || '-'}</Text>
        {subtitle ? <Text numberOfLines={1} style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text> : null}
      </View>
    </View>
  );

  return (
    <View style={styles.wrap}>
      {backgroundImageUrl ? (
        <ImageBackground source={{ uri: backgroundImageUrl }} imageStyle={styles.heroImage} style={[styles.hero, { backgroundColor: theme.surfaceSoft }]}>
          {heroContent}
          {backgroundAction ? <View style={styles.frameAction}>{backgroundAction}</View> : null}
        </ImageBackground>
      ) : (
        <View style={[styles.hero, { backgroundColor: theme.surfaceSoft, borderColor: theme.border }]}>
          {heroContent}
        </View>
      )}
      <View style={[styles.logoWrap, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {logoImageUrl ? (
          <Image source={{ uri: logoImageUrl }} style={styles.logoImage} />
        ) : (
          <View style={styles.placeholderIconWrap}>
            <Icon name="image" iconStyle="regular" size={24} color={theme.textSecondary} />
            {logoAction ? <View style={styles.placeholderAction}>{logoAction}</View> : null}
          </View>
        )}
        {logoImageUrl && logoAction ? <View style={styles.frameAction}>{logoAction}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: tokens.spacing.xl, position: 'relative' },
  hero: { minHeight: HERO_HEIGHT, borderRadius: tokens.radius.lg, borderWidth: 1, overflow: 'hidden', justifyContent: 'center' },
  heroImage: { borderRadius: tokens.radius.lg },
  heroContent: { alignItems: 'center', justifyContent: 'center', gap: tokens.spacing.sm, padding: tokens.spacing.lg },
  titleBlock: { alignItems: 'center', gap: tokens.spacing.xxs, padding: tokens.spacing.sm, borderRadius: tokens.radius.md },
  title: { fontSize: tokens.typography.heading, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: tokens.typography.caption, fontWeight: '700', textAlign: 'center' },
  logoWrap: { position: 'absolute', left: '50%', bottom: 0, width: LOGO_SIZE, height: LOGO_SIZE, marginLeft: -LOGO_OFFSET, borderRadius: tokens.radius.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logoImage: { width: '100%', height: '100%' },
  frameAction: { position: 'absolute', right: tokens.spacing.xs, bottom: tokens.spacing.xs },
  placeholderIconWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  placeholderAction: { position: 'absolute', right: -tokens.spacing.lg, bottom: -tokens.spacing.lg },
});
