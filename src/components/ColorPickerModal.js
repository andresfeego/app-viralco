import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/fontawesome6';
import LinearGradient from 'react-native-linear-gradient';
import { AppButton } from '../design-system/components/AppButton';
import { ModalSafeArea } from '../design-system/components/ModalSafeArea';
import { SurfaceCard } from '../design-system/components/SurfaceCard';
import { tokens } from '../design-system/tokens';
import { t } from '../i18n';
import { IconTextButton } from './IconTextButton';
import { PaperFormInput } from './PaperFormInput';

const COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function hsvToHex(hue, saturation, brightness) {
  const chroma = brightness * saturation;
  const sector = (((hue % 360) + 360) % 360) / 60;
  const secondary = chroma * (1 - Math.abs((sector % 2) - 1));
  const offset = brightness - chroma;
  const channels = sector < 1 ? [chroma, secondary, 0]
    : sector < 2 ? [secondary, chroma, 0]
      : sector < 3 ? [0, chroma, secondary]
        : sector < 4 ? [0, secondary, chroma]
          : sector < 5 ? [secondary, 0, chroma]
            : [chroma, 0, secondary];
  return `#${channels.map((channel) => Math.round((channel + offset) * 255).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

export function hexToHsv(color) {
  const normalized = String(color || '').replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return { hue: 0, saturation: 1, brightness: 1 };
  const [red, green, blue] = [0, 2, 4].map((index) => parseInt(normalized.slice(index, index + 2), 16) / 255);
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const hue = delta === 0 ? 0
    : max === red ? 60 * (((green - blue) / delta) % 6)
      : max === green ? 60 * (((blue - red) / delta) + 2)
        : 60 * (((red - green) / delta) + 4);
  return { hue: (hue + 360) % 360, saturation: max === 0 ? 0 : delta / max, brightness: max };
}

function SaturationBrightnessField({ hue, saturation, brightness, onChange, theme }) {
  const size = useRef({ width: 1, height: 1 });
  const update = useCallback((eventValue) => {
    const { locationX, locationY } = eventValue.nativeEvent;
    onChange(clamp(locationX / size.current.width, 0, 1), clamp(1 - (locationY / size.current.height), 0, 1));
  }, [onChange]);
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: update,
    onPanResponderMove: update,
    onShouldBlockNativeResponder: () => true,
  }), [update]);
  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel={t('color_picker_area')}
      onLayout={({ nativeEvent }) => { size.current = nativeEvent.layout; }}
      style={[styles.colorField, { backgroundColor: hsvToHex(hue, 1, 1), borderColor: theme.border }]}
      {...responder.panHandlers}
    >
      <LinearGradient colors={[tokens.colors.gray[0], `${tokens.colors.gray[0]}00`]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={[`${tokens.colors.gray[9]}00`, tokens.colors.gray[9]]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={[styles.marker, { left: `${saturation * 100}%`, top: `${(1 - brightness) * 100}%`, borderColor: theme.surface }]} />
    </View>
  );
}

function HueField({ hue, onChange, theme }) {
  const width = useRef(1);
  const update = useCallback((eventValue) => onChange(clamp(eventValue.nativeEvent.locationX / width.current, 0, 1) * 359), [onChange]);
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: update,
    onPanResponderMove: update,
    onShouldBlockNativeResponder: () => true,
  }), [update]);
  return (
    <View accessibilityRole="adjustable" accessibilityLabel={t('color_picker_hue')} onLayout={({ nativeEvent }) => { width.current = nativeEvent.layout.width; }} style={styles.hueWrap} {...responder.panHandlers}>
      <LinearGradient colors={[...tokens.colors.colorPickerHue]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.hue} />
      <View pointerEvents="none" style={[styles.hueMarker, { left: `${(hue / 359) * 100}%`, borderColor: theme.surface }]} />
    </View>
  );
}

export function ColorPickerTrigger({ theme, disabled = false, selected = false, accessibilityLabel = t('color_picker_open'), onPress }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled, selected }} accessibilityLabel={accessibilityLabel} disabled={disabled} onPress={onPress} style={[styles.trigger, { borderColor: selected ? theme.primary : theme.border }]}> 
      <LinearGradient colors={[...tokens.colors.colorPickerHue]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.triggerFill}>
        <Icon name="palette" iconStyle="solid" size={tokens.typography.caption} color={tokens.colors.gray[0]} />
      </LinearGradient>
    </Pressable>
  );
}

export function ColorPickerModal({ visible, initialColor, theme, onClose, onSelect }) {
  const initial = hexToHsv(initialColor);
  const [hue, setHue] = useState(initial.hue);
  const [saturation, setSaturation] = useState(initial.saturation);
  const [brightness, setBrightness] = useState(initial.brightness);
  const [hexValue, setHexValue] = useState(hsvToHex(initial.hue, initial.saturation, initial.brightness));
  const color = hsvToHex(hue, saturation, brightness);

  useEffect(() => {
    if (!visible) return;
    const next = hexToHsv(initialColor);
    setHue(next.hue); setSaturation(next.saturation); setBrightness(next.brightness);
    setHexValue(hsvToHex(next.hue, next.saturation, next.brightness));
  }, [initialColor, visible]);
  useEffect(() => { setHexValue(color); }, [color]);

  const changeHex = (value) => {
    const normalized = value.startsWith('#') ? value.toUpperCase() : `#${value.toUpperCase()}`;
    setHexValue(value.toUpperCase());
    if (COLOR_PATTERN.test(normalized)) {
      const next = hexToHsv(normalized);
      setHue(next.hue); setSaturation(next.saturation); setBrightness(next.brightness);
    }
  };
  const normalizedHex = hexValue.startsWith('#') ? hexValue : `#${hexValue}`;
  const valid = COLOR_PATTERN.test(normalizedHex);
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ModalSafeArea style={[styles.safeArea, { backgroundColor: theme.background }]} testID="color-picker-modal">
        <View style={styles.header}>
          <Text style={[styles.heading, { color: theme.textPrimary }]}>{t('color_picker_title')}</Text>
          <IconTextButton theme={theme} icon="xmark" compactIconOnly variant="ghost" accessibilityLabel={t('resource_048')} onPress={onClose} />
        </View>
        <View style={styles.content}>
          <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
            <SaturationBrightnessField hue={hue} saturation={saturation} brightness={brightness} onChange={(nextSaturation, nextBrightness) => { setSaturation(nextSaturation); setBrightness(nextBrightness); }} theme={theme} />
            <HueField hue={hue} onChange={setHue} theme={theme} />
            <View style={styles.valueCluster}>
              <View style={[styles.colorPreview, { backgroundColor: color, borderColor: theme.border }]} />
              <View style={styles.hexField}><PaperFormInput theme={theme} label={t('mirror_background_hex')} value={hexValue} onChangeText={changeHex} autoCapitalize="characters" errorText={hexValue && !valid ? t('mirror_background_hex_invalid') : ''} /></View>
            </View>
          </SurfaceCard>
          <View style={styles.actions}>
            <AppButton label={t('common_cancel')} onPress={onClose} backgroundColor={theme.surface} pressedColor={theme.background} textColor={theme.textPrimary} style={styles.action} />
            <AppButton label={t('color_picker_apply')} onPress={() => { onSelect(normalizedHex.toUpperCase()); onClose(); }} disabled={!valid} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} style={styles.action} />
          </View>
        </View>
      </ModalSafeArea>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: tokens.spacing.md, paddingBottom: tokens.spacing.sm },
  heading: { flex: 1, minWidth: tokens.spacing.none, fontSize: tokens.typography.heading, fontWeight: '700' },
  content: { paddingHorizontal: tokens.spacing.md, paddingBottom: tokens.spacing.xl, gap: tokens.spacing.md },
  colorField: { height: tokens.spacing.xl * 6, overflow: 'hidden', borderWidth: tokens.border.thin, borderRadius: tokens.radius.md },
  marker: { position: 'absolute', width: tokens.spacing.lg, height: tokens.spacing.lg, borderRadius: tokens.radius.pill, borderWidth: tokens.border.medium, transform: [{ translateX: -tokens.spacing.sm }, { translateY: -tokens.spacing.sm }] },
  hueWrap: { height: tokens.spacing.lg, justifyContent: 'center' },
  hue: { height: tokens.spacing.sm, borderRadius: tokens.radius.pill },
  hueMarker: { position: 'absolute', width: tokens.spacing.md, height: tokens.spacing.lg, borderRadius: tokens.radius.pill, borderWidth: tokens.border.medium, transform: [{ translateX: -tokens.spacing.xs }] },
  valueCluster: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm },
  colorPreview: { width: tokens.spacing.xl * 2, height: tokens.spacing.xl * 2, borderRadius: tokens.radius.pill, borderWidth: tokens.border.thin },
  hexField: { flex: 1, minWidth: tokens.spacing.none },
  actions: { flexDirection: 'row', gap: tokens.spacing.sm },
  action: { flex: 1 },
  trigger: { width: tokens.spacing.xl, height: tokens.spacing.xl, borderRadius: tokens.radius.pill, borderWidth: tokens.border.medium, padding: tokens.spacing.xxs, overflow: 'hidden' },
  triggerFill: { flex: 1, borderRadius: tokens.radius.pill, alignItems: 'center', justifyContent: 'center' },
});
