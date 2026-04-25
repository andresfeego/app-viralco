import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Video from 'react-native-video';
import { tokens } from '../tokens';

interface MediaPreviewProps {
  uri: string;
  mediaType: string;
  borderColor: string;
  textColor: string;
}

function isVideoType(mediaType: string) {
  return mediaType.toLowerCase().startsWith('video/');
}

function isImageType(mediaType: string) {
  return mediaType.toLowerCase().startsWith('image/');
}

export function MediaPreview({ uri, mediaType, borderColor, textColor }: MediaPreviewProps) {
  if (isVideoType(mediaType)) {
    return (
      <View style={[styles.frame, { borderColor }]}>
        <Video
          source={{ uri }}
          style={styles.media}
          controls
          paused
          resizeMode="cover"
        />
      </View>
    );
  }

  if (isImageType(mediaType)) {
    return (
      <View style={[styles.frame, { borderColor }]}>
        <Image source={{ uri }} style={styles.media} resizeMode="cover" />
      </View>
    );
  }

  return (
    <View style={[styles.fallback, { borderColor }]}> 
      <Text style={[styles.fallbackText, { color: textColor }]}>Tipo no soportado: {mediaType}</Text>
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
    aspectRatio: 16 / 9,
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
