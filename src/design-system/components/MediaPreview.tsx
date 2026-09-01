import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Video from 'react-native-video';
import { t } from '../../i18n';
import { tokens } from '../tokens';

interface MediaPreviewProps {
  uri: string;
  mediaType: string;
  borderColor: string;
  textColor: string;
  resizeMode?: 'cover' | 'contain';
  aspectRatio?: number;
}

function isVideoType(mediaType: string) {
  return mediaType.toLowerCase().startsWith('video/');
}

function isImageType(mediaType: string) {
  return mediaType.toLowerCase().startsWith('image/');
}

export function MediaPreview({ uri, mediaType, borderColor, textColor, resizeMode = 'cover', aspectRatio = 16 / 9 }: MediaPreviewProps) {
  if (isVideoType(mediaType)) {
    return (
      <View style={[styles.frame, { borderColor }]}>
        <Video
          source={{ uri }}
          style={[styles.media, { aspectRatio }]}
          controls
          paused
          resizeMode={resizeMode}
        />
      </View>
    );
  }

  if (isImageType(mediaType)) {
    return (
      <View style={[styles.frame, { borderColor }]}>
        <Image source={{ uri }} style={[styles.media, { aspectRatio }]} resizeMode={resizeMode} />
      </View>
    );
  }

  return (
    <View style={[styles.fallback, { borderColor }]}>
      <Text style={[styles.fallbackText, { color: textColor }]}>{t('resource_041')}: {mediaType}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: tokens.radius.sm,
  },
  media: {
    width: '100%',
  },
  fallback: {
    borderWidth: 1,
    borderRadius: tokens.radius.sm,
    padding: tokens.spacing.md,
  },
  fallbackText: {
    fontSize: tokens.typography.caption,
  },
});
