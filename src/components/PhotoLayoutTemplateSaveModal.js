import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../design-system/components/AppButton';
import { ModalSafeArea } from '../design-system/components/ModalSafeArea';
import { SurfaceCard } from '../design-system/components/SurfaceCard';
import { tokens } from '../design-system/tokens';
import { t } from '../i18n';
import { MirrorConfigPreview } from './MirrorConfigPreview';
import { PaperFormInput } from './PaperFormInput';

export function PhotoLayoutTemplateSaveModal({ visible, config, theme, name, onNameChange, saving, error, onCancel, onSave }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <ModalSafeArea style={[styles.safeArea, { backgroundColor: theme.background }]} testID="photo-layout-template-save-modal">
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[styles.heading, { color: theme.textPrimary }]}>{t('mirror_122')}</Text>
          <MirrorConfigPreview config={config} theme={theme} showMeta={false} compact />
          <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
            <PaperFormInput theme={theme} label={t('mirror_123')} value={name} onChangeText={onNameChange} errorText={error} autoCapitalize="sentences" />
            <Text style={[styles.meta, { color: theme.textSecondary }]}>{config.layout.shotCount} {t('mirror_027')} · {config.layout.output.width} × {config.layout.output.height}</Text>
          </SurfaceCard>
          <View style={styles.actions}>
            <AppButton label={t('common_cancel')} onPress={onCancel} disabled={saving} backgroundColor={theme.surface} pressedColor={theme.background} textColor={theme.textPrimary} style={styles.action} />
            <AppButton label={t('mirror_124')} onPress={onSave} disabled={saving || !name.trim()} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} style={styles.action} />
          </View>
        </ScrollView>
      </ModalSafeArea>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: tokens.spacing.md, paddingBottom: tokens.spacing.xl, gap: tokens.spacing.md },
  heading: { fontSize: tokens.typography.heading, fontWeight: '700' },
  meta: { fontSize: tokens.typography.caption },
  actions: { flexDirection: 'row', gap: tokens.spacing.sm },
  action: { flex: 1, minWidth: tokens.spacing.xl * 4 },
});
