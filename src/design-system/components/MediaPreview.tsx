import React, { useEffect, useRef, useState } from 'react';
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
  const [ready, setReady] = useState(false);
  const [layoutReady, setLayoutReady] = useState(false);
  const [playRequested, setPlayRequested] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const layoutSize = useRef({ width: 0, height: 0 });

  useEffect(() => {
    setPaused(true);
    setReady(false);
    setLayoutReady(false);
    setPlayRequested(false);
    setFailed(false);
    setReloadKey(0);
  }, [uri]);

  useEffect(() => {
    if (!playRequested || !ready || !layoutReady || failed) return;

    const frame = requestAnimationFrame(() => {
      setPaused(false);
    });
    return () => cancelAnimationFrame(frame);
  }, [failed, layoutReady, playRequested, ready]);

  if (isVideoType(mediaType)) {
    const canRenderAction = Boolean(buttonBackgroundColor && buttonPressedColor && buttonTextColor);
    const retry = () => {
      setFailed(false);
      setReady(false);
      setPlayRequested(true);
      setPaused(true);
      setReloadKey((current) => current + 1);
    };
    return (
      <View style={styles.videoWrap}>
        <View
          style={[styles.frame, { borderColor, aspectRatio }]}
          onLayout={({ nativeEvent }) => {
            const { width, height } = nativeEvent.layout;
            layoutSize.current = { width, height };
            if (width <= 0 || height <= 0) {
              setLayoutReady(false);
              return;
            }
            requestAnimationFrame(() => {
              const latest = layoutSize.current;
              setLayoutReady(latest.width > 0 && latest.height > 0);
            });
          }}
        >
          <Video
            key={`${uri}-${reloadKey}`}
            source={{ uri }}
            style={styles.mediaFill}
            controls={!posterUri}
            paused={paused}
            resizeMode={resizeMode}
            onLoadStart={() => setReady(false)}
            onLoad={() => setReady(true)}
            onReadyForDisplay={() => setReady(true)}
            onError={() => { setFailed(true); setPlayRequested(false); setPaused(true); }}
            onEnd={() => { setPlayRequested(false); setPaused(true); }}
          />
          {posterUri && paused && !failed ? (
            <Image source={{ uri: posterUri }} style={styles.mediaFill} resizeMode={resizeMode} />
          ) : null}
          {playRequested && paused && !failed ? <View pointerEvents="none" style={styles.stateOverlay}><Text style={[styles.stateText, { color: textColor }]}>{t('resource_050')}</Text></View> : null}
          {failed ? <View pointerEvents="none" style={styles.stateOverlay}><Text style={[styles.stateText, { color: textColor }]}>{t('resource_051')}</Text></View> : null}
        </View>
        {canRenderAction && !failed && paused && !playRequested ? (
          <AppButton
            testID="media-preview-play"
            label={t('resource_049')}
            onPress={() => setPlayRequested(true)}
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
  mediaFill: StyleSheet.absoluteFill,
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
