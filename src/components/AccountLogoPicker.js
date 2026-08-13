import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/fontawesome6';
import { AppButton } from '../design-system/components/AppButton';
import { SurfaceCard } from '../design-system/components/SurfaceCard';
import { tokens } from '../design-system/tokens';

export function AccountLogoPicker({ theme, title, imageUri = '', buttonLabel, onPress, testID }) {
  return (
    <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
      <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
      <View style={styles.previewWrap}>
        <View style={[styles.preview, { borderColor: theme.border, backgroundColor: theme.background }]}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} resizeMode="cover" style={styles.image} />
          ) : (
            <Icon name="building" iconStyle="regular" size={tokens.spacing.xl} color={theme.textSecondary} />
          )}
        </View>
      </View>
      <AppButton
        testID={testID}
        label={buttonLabel}
        onPress={onPress}
        backgroundColor={theme.buttonBg}
        pressedColor={theme.buttonBgPressed}
        textColor={theme.buttonText}
        style={styles.button}
      />
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: tokens.typography.body, fontWeight: '700' },
  previewWrap: {
    alignItems: 'center',
  },
  preview: {
    width: '50%',
    aspectRatio: 1,
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  button: { width: '100%' },
});
