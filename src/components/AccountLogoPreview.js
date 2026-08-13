import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Icon from '@react-native-vector-icons/fontawesome6';
import { tokens } from '../design-system/tokens';

const BAR_SIZE = tokens.spacing.xl + tokens.spacing.xs + tokens.spacing.xxs / 2;

export function AccountLogoPreview({ theme, imageUri = '', size = 'md', borderless = false }) {
  const frameStyle = size === 'lg' ? styles.frameLg : size === 'bar' ? styles.frameBar : styles.frameMd;
  const borderStyle = borderless ? styles.borderless : null;
  return (
    <View style={[styles.frame, frameStyle, borderStyle, { borderColor: theme.border, backgroundColor: theme.background }]}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} resizeMode="cover" style={styles.image} />
      ) : (
        <Icon name="building" iconStyle="regular" size={size === 'lg' ? tokens.spacing.xl : tokens.spacing.lg} color={theme.textSecondary} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  frameMd: {
    width: tokens.spacing.xl * 3,
    aspectRatio: 1,
  },
  frameBar: {
    width: BAR_SIZE,
    height: BAR_SIZE,
    borderRadius: 0,
  },
  frameLg: {
    width: '100%',
    aspectRatio: 1,
  },
  borderless: {
    borderWidth: 0,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
