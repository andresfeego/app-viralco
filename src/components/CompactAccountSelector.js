import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AccountLogoPreview } from './AccountLogoPreview';
import { AppButton } from '../design-system/components/AppButton';
import { SurfaceCard } from '../design-system/components/SurfaceCard';
import { tokens } from '../design-system/tokens';
import { t } from '../i18n';
import { IconTextButton } from './IconTextButton';

const MENU_BAR_HEIGHT = tokens.spacing.xl + tokens.spacing.xs + tokens.spacing.xxs / 2;

function accountLogoPreviewUrl(account) {
  return account?.logoAsset?.variants?.thumb?.signedUrl
    || account?.logoAsset?.variants?.thumb?.fileUrl
    || account?.logoAsset?.previewSignedUrl
    || account?.logoAsset?.previewUrl
    || account?.logoAsset?.fileSignedUrl
    || account?.logoAsset?.fileUrl
    || '';
}

export function CompactAccountSelector({ accounts, value, onChange, theme, roleLabel = '' }) {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const selected = useMemo(
    () => (accounts || []).find((account) => String(account.id) === String(value)),
    [accounts, value],
  );
  if ((accounts || []).length <= 1) return null;
  return (
    <>
      <View style={[styles.selectorRow, { borderBottomColor: theme.border }]}>
        <AccountLogoPreview theme={theme} imageUri={accountLogoPreviewUrl(selected)} size="bar" borderless />
        <View style={styles.data}>
          <Text numberOfLines={1} style={[styles.name, { color: theme.textPrimary }]}>{selected?.name || '-'}</Text>
          <Text numberOfLines={1} style={[styles.helper, { color: theme.textSecondary }]}>
            {selected?.slug || '-'}{roleLabel ? ` - ${roleLabel}` : ''}
          </Text>
        </View>
        <IconTextButton
          testID="resource-account-selector"
          theme={theme}
          label={t('event_095')}
          icon="shuffle"
          order="text-first"
          variant="ghost"
          onPress={() => setVisible(true)}
          style={styles.changeButton}
        />
      </View>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: theme.background, borderColor: theme.border, paddingTop: insets.top + tokens.spacing.xl }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{t('event_096')}</Text>
            <ScrollView contentContainerStyle={[styles.list, styles.editModalList]}>
              {(accounts || []).map((account) => {
                const active = String(account.id) === String(value);
                return (
                  <Pressable
                    key={account.id}
                    testID={`resource-account-option-${account.id}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => { onChange(String(account.id)); setVisible(false); }}
                    style={styles.pressableCard}
                  >
                    <SurfaceCard surfaceColor={theme.surface} borderColor={active ? theme.primary : theme.border}>
                      <View style={styles.optionRow}>
                        <View style={styles.data}>
                          <Text numberOfLines={1} style={[styles.name, { color: theme.textPrimary }]}>{account.name || '-'}</Text>
                          <Text numberOfLines={1} style={[styles.helper, { color: theme.textSecondary }]}>{account.slug || '-'}</Text>
                        </View>
                        <AccountLogoPreview theme={theme} imageUri={accountLogoPreviewUrl(account)} size="md" />
                      </View>
                    </SurfaceCard>
                  </Pressable>
                );
              })}
            </ScrollView>
            <AppButton
              label={t('account_028')}
              onPress={() => setVisible(false)}
              backgroundColor={theme.surface}
              pressedColor={theme.background}
              textColor={theme.textPrimary}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selectorRow: { height: MENU_BAR_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm, borderBottomWidth: 1 },
  data: { flex: 1, minWidth: 0 },
  name: { fontSize: tokens.typography.caption, fontWeight: '700' },
  helper: { fontSize: tokens.typography.caption },
  changeButton: { minWidth: 0, paddingRight: tokens.spacing.md },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  modal: { flex: 1, marginTop: tokens.spacing.xl, borderTopWidth: 1, borderTopLeftRadius: tokens.radius.lg, borderTopRightRadius: tokens.radius.lg, padding: tokens.spacing.md, gap: tokens.spacing.sm },
  modalTitle: { fontSize: tokens.typography.heading, fontWeight: '700' },
  list: { gap: tokens.spacing.sm, paddingBottom: tokens.spacing.md },
  editModalList: { paddingTop: tokens.spacing.lg },
  pressableCard: { width: '100%' },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.spacing.sm },
});
