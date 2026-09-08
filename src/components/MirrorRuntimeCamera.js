import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../design-system/components/AppButton';
import { tokens } from '../design-system/tokens';
import { t } from '../i18n';
import { recordClientTechnicalError } from '../services/errorHandling';

let cameraModule = {};
try { cameraModule = require('react-native-vision-camera') || {}; } catch { cameraModule = {}; }
const { Camera, useCameraPermission, usePhotoOutput, VisionCamera } = cameraModule;

const ZOOM_BY_LENS = { normal: 2, wide: 1.5, 'ultra-wide': 1 };

function CameraState({ theme, children }) {
  return (
    <View style={[styles.frame, { backgroundColor: theme.background, borderColor: theme.border }]}> 
      <View style={styles.state}>{children}</View>
    </View>
  );
}

const NativeRuntimeCamera = forwardRef(function NativeRuntimeCamera({ active, flashEnabled, lens, theme, onAvailabilityChange }, ref) {
  const { hasPermission, requestPermission } = useCameraPermission();
  const photoOutput = usePhotoOutput({ containerFormat: 'jpeg', quality: 0.92, qualityPrioritization: 'quality' });
  const [ready, setReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);

  useEffect(() => { onAvailabilityChange?.({ permission: hasPermission, ready: hasPermission && ready && !cameraError }); }, [cameraError, hasPermission, onAvailabilityChange, ready]);

  useImperativeHandle(ref, () => ({
    requestPermission,
    takePhoto: async () => {
      if (!hasPermission || !ready || cameraError) throw new Error('MIRROR_CAMERA_NOT_READY');
      const file = await photoOutput.capturePhotoToFile({ flashMode: flashEnabled ? 'on' : 'off' }, {});
      return { path: file.filePath, width: file.width, height: file.height, orientation: file.orientation };
    },
  }), [cameraError, flashEnabled, hasPermission, photoOutput, ready, requestPermission]);

  const reportError = (error) => {
    setCameraError(true);
    recordClientTechnicalError({ code: 'MIRROR_RUNTIME_CAMERA_ERROR', detail: error?.message || error });
  };

  if (!hasPermission) {
    return (
      <CameraState theme={theme}>
        <Text style={[styles.stateText, { color: theme.textSecondary }]}>{t('runtime_camera_permission')}</Text>
        <AppButton label={t('runtime_camera_allow')} onPress={requestPermission} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} />
      </CameraState>
    );
  }

  if (cameraError) return <CameraState theme={theme}><Text style={[styles.stateText, { color: theme.textSecondary }]}>{t('runtime_camera_failed')}</Text></CameraState>;

  return (
    <View style={[styles.frame, { backgroundColor: theme.background, borderColor: theme.border }]}> 
      <Camera
        style={StyleSheet.absoluteFill}
        device="back"
        outputs={[photoOutput]}
        isActive={active}
        zoom={ZOOM_BY_LENS[lens] || ZOOM_BY_LENS.wide}
        resizeMode="cover"
        orientationSource="custom"
        onPreviewStarted={() => setReady(true)}
        onPreviewStopped={() => setReady(false)}
        onError={reportError}
      />
    </View>
  );
});

export const MirrorRuntimeCamera = forwardRef(function MirrorRuntimeCamera(props, ref) {
  const nativeAvailable = Boolean(Camera && typeof useCameraPermission === 'function' && typeof usePhotoOutput === 'function' && VisionCamera?.createDeviceFactory);
  const onAvailabilityChange = props.onAvailabilityChange;
  useEffect(() => {
    if (!nativeAvailable) {
      onAvailabilityChange?.({ permission: false, ready: false });
      recordClientTechnicalError({ code: 'MIRROR_RUNTIME_CAMERA_MODULE_UNAVAILABLE' });
    }
  }, [nativeAvailable, onAvailabilityChange]);
  if (!nativeAvailable) {
    return <CameraState theme={props.theme}><Text style={[styles.stateText, { color: props.theme.textSecondary }]}>{t('runtime_camera_update')}</Text></CameraState>;
  }
  return <NativeRuntimeCamera {...props} ref={ref} />;
});

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    flex: 1,
    minHeight: tokens.spacing.xl * 8,
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.lg,
    overflow: 'hidden',
  },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: tokens.spacing.md, padding: tokens.spacing.lg },
  stateText: { fontSize: tokens.typography.body, textAlign: 'center' },
});
