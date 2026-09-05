import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../design-system/components/AppButton';
import { ModalSafeArea } from '../design-system/components/ModalSafeArea';
import { tokens } from '../design-system/tokens';
import { ToastViewport } from '../providers/ToastProvider';
import { IconTextButton } from './IconTextButton';

export function EventEditModal({
  visible,
  theme,
  title,
  accessibilityCloseLabel,
  cancelLabel,
  saveLabel,
  onClose,
  onSave,
  saving = false,
  children,
  footerContent = null,
  testID,
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <ModalSafeArea testID={`${testID}-safe-area`} style={[styles.overlay, { backgroundColor: theme.background }]}>
        <View testID={`${testID}-sheet`} style={[styles.sheet, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <View style={[styles.headerCluster, { borderBottomColor: theme.border }]}>
            <Text numberOfLines={2} style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
            <IconTextButton
              theme={theme}
              icon="xmark"
              variant="outline"
              onPress={onClose}
              accessibilityLabel={accessibilityCloseLabel}
              testID={`${testID}-close`}
            />
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.contentStack}
          >
            {children}
            {footerContent}
          </ScrollView>
          <View style={[styles.actionCluster, { borderTopColor: theme.border }]}>
            <AppButton
              label={cancelLabel}
              onPress={onClose}
              backgroundColor={theme.surface}
              pressedColor={theme.background}
              textColor={theme.textPrimary}
              style={styles.action}
              disabled={saving}
            />
            <AppButton
              testID={`${testID}-save`}
              label={saveLabel}
              onPress={onSave}
              backgroundColor={theme.buttonBg}
              pressedColor={theme.buttonBgPressed}
              textColor={theme.buttonText}
              style={styles.action}
              disabled={saving}
            />
          </View>
        </View>
        <ToastViewport theme={theme} />
      </ModalSafeArea>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    flex: 1,
    minWidth: tokens.spacing.none,
    borderTopWidth: tokens.border.thin,
    borderTopLeftRadius: tokens.radius.lg,
    borderTopRightRadius: tokens.radius.lg,
    overflow: 'hidden',
  },
  headerCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacing.sm,
    padding: tokens.spacing.md,
    borderBottomWidth: tokens.border.thin,
  },
  title: {
    flex: 1,
    minWidth: tokens.spacing.none,
    fontSize: tokens.typography.heading,
    fontWeight: '700',
  },
  contentStack: {
    gap: tokens.spacing.md,
    padding: tokens.spacing.md,
  },
  actionCluster: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.xs,
    padding: tokens.spacing.md,
    borderTopWidth: tokens.border.thin,
  },
  action: {
    flexGrow: 1,
    flexBasis: tokens.spacing.xl * 4,
    minWidth: tokens.spacing.none,
  },
});
