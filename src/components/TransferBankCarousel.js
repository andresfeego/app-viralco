import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Checkbox } from 'react-native-paper';
import { tokens } from '../design-system/tokens';
import { ManagementCard, ManagementEmptyState } from './ManagementCard';
import { InformationRow } from './InformationRow';
import { IconTextButton } from './IconTextButton';
import { HorizontalReel } from './HorizontalReel';
import { t } from '../i18n';

export function TransferBankCarousel({ theme, banks = [], backgroundColor = theme.background, selectedId, onSelect, onEdit, onToggle, disabled = false, testID = 'transfer-banks' }) {
  if (!banks.length) return <ManagementEmptyState theme={theme} icon="building-columns" label={t(onEdit ? 'billing_noBanks' : 'billing_noActiveBanks')} />;
  return <HorizontalReel testID={testID} backgroundColor={backgroundColor} contentContainerStyle={styles.reel}>
    {width => banks.map(bank => <View key={bank.id || 'historical'} testID={`${testID}-card-${bank.id || 'historical'}`} style={[styles.card, { width: width > 0 ? Math.min(tokens.spacing.xl * 10, Math.max(tokens.spacing.none, width - (banks.length > 1 ? tokens.spacing.lg : tokens.spacing.none))) : tokens.spacing.xl * 8 }]}>
      <ManagementCard theme={theme} title={bank.bank} subtitle={bank.accountType} icon="building-columns" actions={onToggle || onEdit || onSelect ? <>
        {onToggle ? <View style={styles.check}><Checkbox.Item testID={`${testID}-active-${bank.id}`} label={t(bank.active ? 'billing_bankActive' : 'billing_bankInactive')} labelStyle={[styles.caption, { color: theme.textPrimary }]} color={theme.primary} status={bank.active ? 'checked' : 'unchecked'} disabled={disabled} onPress={() => onToggle(bank, !bank.active)} /></View> : null}
        {onEdit ? <IconTextButton testID={`${testID}-edit-${bank.id}`} theme={theme} icon="pencil" variant="outlined" borderColor={theme.buttonSecondaryBorder} accessibilityLabel={`${t('billing_edit')}: ${bank.bank}`} disabled={disabled} onPress={() => onEdit(bank)} /> : null}
        {onSelect ? <IconTextButton testID={`${testID}-select-${bank.id}`} theme={theme} icon={String(selectedId) === String(bank.id) ? 'check' : 'arrow-right'} label={t(String(selectedId) === String(bank.id) ? 'billing_bankSelected' : 'billing_selectBank')} selected={String(selectedId) === String(bank.id)} variant="outlined" borderColor={String(selectedId) === String(bank.id) ? theme.primary : theme.buttonSecondaryBorder} disabled={disabled} onPress={() => onSelect(bank.id)} /> : null}
      </> : null}>
        <View>
          <InformationRow theme={theme} icon="hashtag" label={t('billing_accountNumber')} value={bank.accountNumber} />
          <InformationRow theme={theme} icon="user" label={t('billing_holder')} value={bank.holder} />
          <InformationRow theme={theme} icon="id-card" label={t('billing_identification')} value={bank.identification} last />
        </View>
        {bank.instructions ? <Text selectable style={[styles.caption, { color: theme.textSecondary }]}>{bank.instructions}</Text> : null}
      </ManagementCard>
    </View>)}
  </HorizontalReel>;
}
const styles = StyleSheet.create({
  reel: { gap: tokens.spacing.md, alignItems: 'flex-start' },
  card: { flexShrink: 0, minWidth: tokens.spacing.none },
  check: { flex: 1, minWidth: tokens.spacing.none },
  caption: { fontSize: tokens.typography.caption },
});
