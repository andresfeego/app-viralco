import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../design-system/components/AppButton';
import { tokens } from '../design-system/tokens';
import { t } from '../i18n';
import { recordClientTechnicalError } from '../services/errorHandling';

let visionCameraModule = {};
try {
  visionCameraModule = require('react-native-vision-camera') || {};
} catch (_error) {
  visionCameraModule = {};
}
const { Camera, useCameraPermission, VisionCamera } = visionCameraModule;

const ZOOM_BY_LENS = { normal: 2, wide: 1.5, 'ultra-wide': 1 };

function CameraUnavailableState({ theme, message }) {
  return (
    <View style={[styles.frame, { backgroundColor: theme.background, borderColor: theme.border }]}>
      <View style={styles.state}>
        <Text style={[styles.stateText, { color: theme.textSecondary }]}>{message}</Text>
      </View>
    </View>
  );
}

function NativeCameraLensPreview({ lens, theme, active }) {
  const { hasPermission, requestPermission } = useCameraPermission();
  const [cameraError, setCameraError] = useState(false);
  const zoom = ZOOM_BY_LENS[lens] || ZOOM_BY_LENS.wide;

  useEffect(() => {
    if (!hasPermission && active) requestPermission();
  }, [active, hasPermission, requestPermission]);

  const reportCameraError = (error) => {
    setCameraError(true);
    recordClientTechnicalError({ code: 'CAMERA_PREVIEW_ERROR', detail: error?.message || error });
  };

  return (
    <View style={[styles.frame, { backgroundColor: theme.background, borderColor: theme.border }]}>
      {hasPermission && !cameraError ? (
        <Camera
          style={StyleSheet.absoluteFill}
          device="back"
          isActive={active}
          zoom={zoom}
          resizeMode="cover"
          orientationSource="custom"
          onError={reportCameraError}
        />
      ) : (
        <View style={styles.state}>
          <Text style={[styles.stateText, { color: theme.textSecondary }]}>{cameraError ? t('mirror_camera_error') : t('mirror_camera_permission')}</Text>
          {!hasPermission ? <AppButton label={t('mirror_camera_enable')} onPress={requestPermission} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} /> : null}
        </View>
      )}
    </View>
  );
}

export function CameraLensPreview({ lens, theme, active = true }) {
  const nativeCameraAvailable = Boolean(
    Camera
    && typeof useCameraPermission === 'function'
    && VisionCamera
    && typeof VisionCamera.createDeviceFactory === 'function',
  );
  useEffect(() => {
    if (!nativeCameraAvailable) recordClientTechnicalError({ code: 'CAMERA_NATIVE_MODULE_UNAVAILABLE' });
  }, [nativeCameraAvailable]);
  if (!nativeCameraAvailable) {
    return <CameraUnavailableState theme={theme} message={t('mirror_camera_update_required')} />;
  }
  return <NativeCameraLensPreview lens={lens} theme={theme} active={active} />;
}

const styles = StyleSheet.create({
  frame: { width: '100%', aspectRatio: tokens.layout.cameraPreviewAspectRatio, borderWidth: tokens.border.thin, borderRadius: tokens.radius.md, overflow: 'hidden' },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: tokens.spacing.sm, padding: tokens.spacing.md },
  stateText: { fontSize: tokens.typography.caption, textAlign: 'center' },
});
