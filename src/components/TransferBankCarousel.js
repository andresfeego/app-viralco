import React from 'react';
import { StyleSheet, View } from 'react-native';
import { tokens } from '../design-system/tokens';
import { ManagementEmptyState } from './ManagementCard';
import { TransferBankCard } from './TransferBankCard';
import { HorizontalReel } from './HorizontalReel';
import { t } from '../i18n';

export function TransferBankCarousel({ theme, banks = [], backgroundColor = theme.background, selectedId, onSelect, onEdit, onToggle, disabled = false, testID = 'transfer-banks' }) {
  if (!banks.length) return <ManagementEmptyState theme={theme} icon="building-columns" label={t(onEdit ? 'billing_noBanks' : 'billing_noActiveBanks')} />;
  return <HorizontalReel testID={testID} backgroundColor={backgroundColor} contentContainerStyle={styles.reel}>
    {width => banks.map(bank => <View key={bank.id || 'historical'} testID={`${testID}-card-${bank.id || 'historical'}`} style={[styles.card, { width: width > 0 ? Math.min(tokens.spacing.xl * 10, Math.max(tokens.spacing.none, width - (banks.length > 1 ? tokens.spacing.lg : tokens.spacing.none))) : tokens.spacing.xl * 8 }]}>
      <TransferBankCard {...{ theme, bank, onEdit, onToggle, onSelect, selectedId, disabled, testID }} />
    </View>)}
  </HorizontalReel>;
}
const styles = StyleSheet.create({
  reel: { gap: tokens.spacing.md, alignItems: 'flex-start' },
  card: { flexShrink: 0, minWidth: tokens.spacing.none },
});
