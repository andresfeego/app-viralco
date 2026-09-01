import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SurfaceCard } from '../design-system/components/SurfaceCard';
import { tokens } from '../design-system/tokens';
import { t } from '../i18n';
import { IconTextButton } from './IconTextButton';

export function CompactAccountSelector({ accounts, value, onChange, theme }) {
  const [visible, setVisible] = useState(false);
  const selected = useMemo(
    () => (accounts || []).find((account) => String(account.id) === String(value)),
    [accounts, value],
  );
  if ((accounts || []).length <= 1) return null;
  return (
    <>
      <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
        <View style={styles.row}>
          <View style={styles.data}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>{t('resource_037')}</Text>
            <Text numberOfLines={1} style={[styles.name, { color: theme.textPrimary }]}>{selected?.name || '-'}</Text>
          </View>
          <IconTextButton
            testID="resource-account-selector"
            theme={theme}
            label={t('event_095')}
            icon="shuffle"
            order="text-first"
            variant="ghost"
            onPress={() => setVisible(true)}
          />
        </View>
      </SurfaceCard>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{t('event_096')}</Text>
            <ScrollView contentContainerStyle={styles.list}>
              {(accounts || []).map((account) => {
                const active = String(account.id) === String(value);
                return (
                  <Pressable
                    key={account.id}
                    testID={`resource-account-option-${account.id}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => { onChange(String(account.id)); setVisible(false); }}
                  >
                    <SurfaceCard surfaceColor={theme.surface} borderColor={active ? theme.primary : theme.border}>
                      <Text numberOfLines={1} style={[styles.name, { color: theme.textPrimary }]}>{account.name}</Text>
                    </SurfaceCard>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm },
  data: { flex: 1, gap: tokens.spacing.xxs },
  label: { fontSize: tokens.typography.caption, fontWeight: '700' },
  name: { fontSize: tokens.typography.body, fontWeight: '700' },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  modal: { maxHeight: '70%', borderWidth: 1, borderTopLeftRadius: tokens.radius.lg, borderTopRightRadius: tokens.radius.lg, padding: tokens.spacing.md, gap: tokens.spacing.md },
  modalTitle: { fontSize: tokens.typography.heading, fontWeight: '700' },
  list: { gap: tokens.spacing.sm, paddingBottom: tokens.spacing.xl },
});
