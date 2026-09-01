import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Video from 'react-native-video';
import { t } from '../../i18n';
import { AppButton } from './AppButton';
import { tokens } from '../tokens';

interface MediaPreviewProps {
  uri: string;
  posterUri?: string;
  mediaType: string;
  borderColor: string;
  textColor: string;
  resizeMode?: 'cover' | 'contain';
  aspectRatio?: number;
  buttonBackgroundColor?: string;
  buttonPressedColor?: string;
  buttonTextColor?: string;
}

function isVideoType(mediaType: string) {
  return mediaType.toLowerCase().startsWith('video/');
}

function isImageType(mediaType: string) {
  return mediaType.toLowerCase().startsWith('image/');
}

export function MediaPreview({
  uri,
  posterUri = '',
  mediaType,
  borderColor,
  textColor,
  resizeMode = 'cover',
  aspectRatio = 16 / 9,
  buttonBackgroundColor,
  buttonPressedColor,
  buttonTextColor,
}: MediaPreviewProps) {
  const [paused, setPaused] = useState(true);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setPaused(true);
    setLoading(false);
    setFailed(false);
    setReloadKey(0);
  }, [uri]);

  if (isVideoType(mediaType)) {
    const canRenderAction = Boolean(buttonBackgroundColor && buttonPressedColor && buttonTextColor);
    const retry = () => {
      setFailed(false);
      setLoading(true);
      setPaused(false);
      setReloadKey((current) => current + 1);
    };
    return (
      <View style={styles.videoWrap}>
        <View style={[styles.frame, { borderColor }]}>
          {posterUri && paused && !failed ? (
            <Image source={{ uri: posterUri }} style={[styles.media, { aspectRatio }]} resizeMode={resizeMode} />
          ) : (
            <Video
              key={`${uri}-${reloadKey}`}
              source={{ uri }}
              style={[styles.media, { aspectRatio }]}
              controls={!posterUri}
              paused={paused}
              resizeMode={resizeMode}
              onLoadStart={() => setLoading(true)}
              onLoad={() => setLoading(false)}
              onError={() => { setLoading(false); setFailed(true); setPaused(true); }}
              onEnd={() => setPaused(true)}
            />
          )}
          {loading ? <View pointerEvents="none" style={styles.stateOverlay}><Text style={[styles.stateText, { color: textColor }]}>{t('resource_050')}</Text></View> : null}
          {failed ? <View pointerEvents="none" style={styles.stateOverlay}><Text style={[styles.stateText, { color: textColor }]}>{t('resource_051')}</Text></View> : null}
        </View>
        {canRenderAction && !failed && paused ? (
          <AppButton
            testID="media-preview-play"
            label={t('resource_049')}
            onPress={() => setPaused(false)}
            backgroundColor={buttonBackgroundColor!}
            pressedColor={buttonPressedColor!}
            textColor={buttonTextColor!}
            style={styles.action}
          />
        ) : null}
        {canRenderAction && failed ? (
          <AppButton
            testID="media-preview-retry"
            label={t('resource_052')}
            onPress={retry}
            backgroundColor={buttonBackgroundColor!}
            pressedColor={buttonPressedColor!}
            textColor={buttonTextColor!}
            style={styles.action}
          />
        ) : null}
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
  videoWrap: { gap: tokens.spacing.sm },
  media: {
    width: '100%',
  },
  stateOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 1, alignItems: 'center', justifyContent: 'center', padding: tokens.spacing.md },
  stateText: { fontSize: tokens.typography.caption, fontWeight: '700', textAlign: 'center' },
  action: { width: '100%' },
  fallback: {
    borderWidth: 1,
    borderRadius: tokens.radius.sm,
    padding: tokens.spacing.md,
  },
  fallbackText: {
    fontSize: tokens.typography.caption,
  },
});
