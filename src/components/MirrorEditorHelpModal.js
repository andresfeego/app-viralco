import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/fontawesome6';
import { ModalSafeArea } from '../design-system/components/ModalSafeArea';
import { SurfaceCard } from '../design-system/components/SurfaceCard';
import { tokens } from '../design-system/tokens';
import { t } from '../i18n';
import { IconTextButton } from './IconTextButton';

export function MirrorEditorHelpModal({ visible, items, theme, onClose }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ModalSafeArea style={[styles.safeArea, { backgroundColor: theme.background }]} testID="mirror-editor-help-modal">
        <View style={styles.header}>
          <Text style={[styles.heading, { color: theme.textPrimary }]}>{t('mirror_158')}</Text>
          <IconTextButton theme={theme} icon="xmark" compactIconOnly variant="ghost" accessibilityLabel={t('resource_048')} onPress={onClose} />
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          {items.map((item) => (
            <SurfaceCard key={item.key} surfaceColor={theme.surface} borderColor={theme.border}>
              <View style={styles.row}>
                <View style={[styles.iconBox, { backgroundColor: theme.background }]}>
                  <Icon name={item.icon} iconStyle={item.iconStyle || 'solid'} size={tokens.typography.body} color={theme.primary} />
                </View>
                <View style={styles.copy}>
                  <Text style={[styles.label, { color: theme.textPrimary }]}>{item.label}</Text>
                  <Text style={[styles.description, { color: theme.textSecondary }]}>{item.description}</Text>
                </View>
              </View>
            </SurfaceCard>
          ))}
        </ScrollView>
      </ModalSafeArea>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: tokens.spacing.md, paddingBottom: tokens.spacing.sm },
  heading: { flex: 1, fontSize: tokens.typography.heading, fontWeight: '700' },
  content: { paddingHorizontal: tokens.spacing.md, paddingBottom: tokens.spacing.xl, gap: tokens.spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm },
  iconBox: { width: tokens.spacing.xl, height: tokens.spacing.xl, borderRadius: tokens.radius.sm, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: tokens.spacing.xxs },
  label: { fontSize: tokens.typography.body, fontWeight: '700' },
  description: { fontSize: tokens.typography.caption },
});
