import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { tokens } from '../design-system/tokens';
import { ManagementCard, ManagementEmptyState } from './ManagementCard';
import { InformationRow } from './InformationRow';
import { IconTextButton } from './IconTextButton';
import { MirrorToggleRow } from './MirrorToggleRow';
import { CopyActionButton } from './CopyActionButton';
import { t } from '../i18n';

export function TransferBankCard({ theme, bank, onEdit, onToggle, onSelect, selectedId, disabled = false, testID = 'transfer-banks' }) {
  return <ManagementCard theme={theme} title={bank.bank} subtitle={bank.accountType} icon="building-columns" actions={onEdit || onSelect ? <>
    {onEdit ? <IconTextButton testID={`${testID}-edit-${bank.id}`} theme={theme} icon="pencil" variant="outlined" borderColor={theme.buttonSecondaryBorder} accessibilityLabel={`${t('billing_edit')}: ${bank.bank}`} disabled={disabled} onPress={() => onEdit(bank)} /> : null}
    {onSelect ? <IconTextButton testID={`${testID}-select-${bank.id}`} theme={theme} icon={String(selectedId) === String(bank.id) ? 'check' : 'arrow-right'} label={t(String(selectedId) === String(bank.id) ? 'billing_bankSelected' : 'billing_selectBank')} selected={String(selectedId) === String(bank.id)} variant="outlined" borderColor={String(selectedId) === String(bank.id) ? theme.primary : theme.buttonSecondaryBorder} disabled={disabled} onPress={() => onSelect(bank.id)} /> : null}
  </> : null}>
    <View>
      <InformationRow theme={theme} icon="hashtag" label={t('billing_accountNumber')} value={bank.accountNumber}
        action={bank.accountNumber ? <CopyActionButton testID={`${testID}-copy-account-${bank.id || 'historical'}`} theme={theme} value={bank.accountNumber} iconOnly accessibilityLabel={t('billing_copy_account_number')} /> : null} />
      <InformationRow theme={theme} icon="user" label={t('billing_holder')} value={bank.holder} />
      <InformationRow theme={theme} icon="id-card" label={t('billing_identification')} value={bank.identification} last />
    </View>
    {bank.instructions ? <Text selectable style={[styles.caption, { color: theme.textSecondary }]}>{bank.instructions}</Text> : null}
    {onToggle ? <MirrorToggleRow testID={`${testID}-active-${bank.id}`} theme={theme} label={t('billing_bankEnabled')} value={bank.active} disabled={disabled} onChange={value => onToggle(bank, value)} /> : null}
  </ManagementCard>;
}

export function TransferBankList({ banks = [], theme, testID = 'transfer-banks-list', ...props }) {
  if (!banks.length) return <ManagementEmptyState theme={theme} icon="building-columns" label={t('billing_noBanks')} />;
  return <View testID={testID} style={styles.stack}>
    {banks.map(bank => <TransferBankCard key={bank.id} {...props} theme={theme} bank={bank} testID={testID} />)}
  </View>;
}

const styles = StyleSheet.create({
  stack: { alignSelf: 'stretch', gap: tokens.spacing.md, minWidth: tokens.spacing.none },
  caption: { fontSize: tokens.typography.caption, flexShrink: 1 },
});
