import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/fontawesome6';
import { AppButton } from '../design-system/components/AppButton';
import { ModalSafeArea } from '../design-system/components/ModalSafeArea';
import { SurfaceCard } from '../design-system/components/SurfaceCard';
import { tokens } from '../design-system/tokens';
import { t } from '../i18n';
import { IconTextButton } from './IconTextButton';
import { PaperFormInput } from './PaperFormInput';

const COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

function ColorSwatch({ color, selected, theme, disabled, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={`${t('mirror_background_color')} ${color}`}
      disabled={disabled}
      onPress={() => onPress(color)}
      style={[styles.swatchOuter, { borderColor: selected ? theme.primary : theme.border }]}
    >
      <View style={[styles.swatch, { backgroundColor: color }]} />
    </Pressable>
  );
}

function CustomColorModal({ visible, theme, onClose, onSelect }) {
  const [value, setValue] = useState(tokens.colors.backgroundPalette[0]);
  useEffect(() => { if (visible) setValue(tokens.colors.backgroundPalette[0]); }, [visible]);
  const normalized = value.startsWith('#') ? value.toUpperCase() : `#${value.toUpperCase()}`;
  const valid = COLOR_PATTERN.test(normalized);
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ModalSafeArea style={[styles.modalSafeArea, { backgroundColor: theme.background }]} testID="background-custom-color-modal">
        <View style={styles.modalHeader}>
          <Text style={[styles.heading, { color: theme.textPrimary }]}>{t('mirror_background_custom')}</Text>
          <IconTextButton theme={theme} icon="xmark" compactIconOnly variant="ghost" accessibilityLabel={t('resource_048')} onPress={onClose} />
        </View>
        <View style={styles.modalContent}>
          <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
            <View style={[styles.colorPreview, { backgroundColor: valid ? normalized : theme.background, borderColor: theme.border }]} />
            <PaperFormInput theme={theme} label={t('mirror_background_hex')} value={value} onChangeText={setValue} autoCapitalize="characters" errorText={value && !valid ? t('mirror_background_hex_invalid') : ''} />
          </SurfaceCard>
          <View style={styles.modalActions}>
            <AppButton label={t('common_cancel')} onPress={onClose} backgroundColor={theme.surface} pressedColor={theme.background} textColor={theme.textPrimary} style={styles.modalAction} />
            <AppButton label={t('mirror_background_add')} onPress={() => { onSelect(normalized); onClose(); }} disabled={!valid} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} style={styles.modalAction} />
          </View>
        </View>
      </ModalSafeArea>
    </Modal>
  );
}

export function BackgroundColorPicker({ theme, selectedColors = [], disabled = false, onSelect }) {
  const [customVisible, setCustomVisible] = useState(false);
  const selected = new Set(selectedColors.map((color) => String(color).toUpperCase()));
  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: theme.textPrimary }]}>{t('mirror_background_colors')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {tokens.colors.backgroundPalette.map((color) => <ColorSwatch key={color} color={color} selected={selected.has(color)} theme={theme} disabled={disabled} onPress={onSelect} />)}
        <Pressable accessibilityRole="button" accessibilityState={{ disabled }} accessibilityLabel={t('mirror_background_custom')} disabled={disabled} onPress={() => setCustomVisible(true)} style={[styles.swatchOuter, styles.custom, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Icon name="palette" iconStyle="solid" size={tokens.typography.heading} color={theme.primary} />
        </Pressable>
      </ScrollView>
      <CustomColorModal visible={customVisible} theme={theme} onClose={() => setCustomVisible(false)} onSelect={onSelect} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.spacing.xs },
  label: { fontSize: tokens.typography.body, fontWeight: '700' },
  row: { gap: tokens.spacing.sm, paddingVertical: tokens.spacing.xxs },
  swatchOuter: { width: tokens.spacing.xl * 2, height: tokens.spacing.xl * 2, padding: tokens.spacing.xxs, borderWidth: tokens.border.medium, borderRadius: tokens.radius.md },
  swatch: { width: '100%', height: '100%', borderRadius: tokens.radius.sm },
  custom: { alignItems: 'center', justifyContent: 'center' },
  modalSafeArea: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: tokens.spacing.md, paddingBottom: tokens.spacing.sm },
  heading: { flex: 1, fontSize: tokens.typography.heading, fontWeight: '700' },
  modalContent: { paddingHorizontal: tokens.spacing.md, paddingBottom: tokens.spacing.xl, gap: tokens.spacing.md },
  colorPreview: { height: tokens.spacing.xl * 4, borderWidth: tokens.border.thin, borderRadius: tokens.radius.md },
  modalActions: { flexDirection: 'row', gap: tokens.spacing.sm },
  modalAction: { flex: 1 },
});
