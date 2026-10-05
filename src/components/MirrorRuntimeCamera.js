import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../design-system/components/AppButton';
import { tokens } from '../design-system/tokens';
import { t } from '../i18n';
import { recordClientTechnicalError } from '../services/errorHandling';
import { runtimeQuality } from '../domain/mirrorRuntime';
import { MirrorSimulatorCamera } from './MirrorSimulatorCamera';

let simulator = false;
try { simulator = __DEV__ && require('react-native-device-info').default.isEmulatorSync(); } catch { /* Older binaries never pretend to be a simulator. */ }

let cameraModule = {};
try { cameraModule = require('react-native-vision-camera') || {}; } catch { cameraModule = {}; }
const { Camera, useCameraPermission, usePhotoOutput, useCameraDevice, VisionCamera } = cameraModule;

function CameraState({ theme, children }) {
  return (
    <View style={[styles.frame, { backgroundColor: theme.background, borderColor: theme.border }]}> 
      <View style={styles.state}>{children}</View>
    </View>
  );
}

const NativeRuntimeCamera = forwardRef(function NativeRuntimeCamera({ active, lens, quality = 'high', position = 'front', theme, onAvailabilityChange }, ref) {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice(position, { physicalDevices: [lens === 'ultra-wide' ? 'ultra-wide-angle' : 'wide-angle'] });
  const photoOutput = usePhotoOutput({ containerFormat: 'jpeg', quality: runtimeQuality(quality), qualityPrioritization: quality === 'medium' ? 'speed' : 'quality' });
  const [ready, setReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);

  const lensFallback = lens === 'ultra-wide' && ![device?.type, ...(device?.physicalDevices || []).map((item) => item.type)].includes('ultra-wide-angle');
  useEffect(() => { onAvailabilityChange?.({ permission: hasPermission, ready: hasPermission && ready && !cameraError, lensFallback }); }, [cameraError, hasPermission, lensFallback, onAvailabilityChange, ready]);

  useImperativeHandle(ref, () => ({
    requestPermission,
    takePhoto: async () => {
      if (!hasPermission || !ready || cameraError) throw new Error('MIRROR_CAMERA_NOT_READY');
      const file = await photoOutput.capturePhotoToFile({ flashMode: 'off' }, {});
      return { path: file.filePath, width: file.width, height: file.height, orientation: file.orientation };
    },
  }), [cameraError, hasPermission, photoOutput, ready, requestPermission]);

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
        style={[StyleSheet.absoluteFill, position === 'front' ? styles.mirrored : null]}
        device={device || position}
        mirrorMode="off"
        outputs={[photoOutput]}
        isActive={active}
        zoom={Math.max(device?.minZoom || 1, Math.min(device?.maxZoom || 1, lens === 'normal' ? 2 : 1))}
        resizeMode="cover"
        implementationMode="compatible"
        orientationSource="interface"
        onPreviewStarted={() => setReady(true)}
        onPreviewStopped={() => setReady(false)}
        onError={reportError}
      />
    </View>
  );
});

export const MirrorRuntimeCamera = forwardRef(function MirrorRuntimeCamera(props, ref) {
  const nativeAvailable = Boolean(Camera && typeof useCameraDevice === 'function' && typeof useCameraPermission === 'function' && typeof usePhotoOutput === 'function' && VisionCamera?.createDeviceFactory);
  const onAvailabilityChange = props.onAvailabilityChange;
  useEffect(() => {
    if (!nativeAvailable && !simulator) {
      onAvailabilityChange?.({ permission: false, ready: false });
      recordClientTechnicalError({ code: 'MIRROR_RUNTIME_CAMERA_MODULE_UNAVAILABLE' });
    }
  }, [nativeAvailable, onAvailabilityChange]);
  if (simulator) return <MirrorSimulatorCamera ref={ref} {...props} />;
  if (!nativeAvailable) {
    return <CameraState theme={props.theme}><Text style={[styles.stateText, { color: props.theme.textSecondary }]}>{t('runtime_camera_update')}</Text></CameraState>;
  }
  return <NativeRuntimeCamera {...props} ref={ref} />;
});

const styles = StyleSheet.create({
  frame: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  mirrored: { transform: [{ scaleX: -1 }] },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: tokens.spacing.md, padding: tokens.spacing.lg },
  stateText: { fontSize: tokens.typography.body, textAlign: 'center' },
});
