import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SurfaceCard } from '../design-system/components/SurfaceCard';
import { tokens } from '../design-system/tokens';
import { t } from '../i18n';
import { AccountLogoPreview } from './AccountLogoPreview';
import { InformationRow } from './InformationRow';
import { IconTextButton } from './IconTextButton';
import { StatusBadge } from './StatusBadge';

function statusFlag(status) {
  if (['active', 'trialing'].includes(status)) return 'success';
  if (['suspended', 'past_due'].includes(status)) return 'warn';
  if (status === 'canceled') return 'error';
  return 'info';
}

export function AccountInformationCards({ account, logoUri, theme, onEdit, onBilling, canManageBilling }) {
  const subscription = account?.subscription;
  const titleStyle = [styles.title, { color: theme.textPrimary }];
  return <>
    <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
      <View style={styles.stack} testID="account-information-card">
        <View style={styles.header}>
          <Text style={titleStyle}>{t('account_045')}</Text>
          <IconTextButton testID="account-detail-edit-open" theme={theme} icon="pencil" variant="outlined" borderColor={theme.border} iconColor={theme.primary} accessibilityLabel={t('account_048')} onPress={onEdit} />
        </View>
        <View style={styles.identity}>
          <AccountLogoPreview theme={theme} imageUri={logoUri} size="md" />
          <View style={styles.identityCopy}>
            <Text selectable style={titleStyle}>{account?.name || '—'}</Text>
            <View style={styles.badges}><StatusBadge label={account?.status || '-'} flag={statusFlag(account?.status)} compact /></View>
          </View>
        </View>
        <View>
          <InformationRow theme={theme} icon="fingerprint" label={t('account_029')} value={account?.slug} />
          <InformationRow theme={theme} icon="phone" label={t('account_041')} value={account?.phone} />
          <InformationRow theme={theme} icon="envelope" label={t('account_042')} value={account?.email} last />
        </View>
      </View>
    </SurfaceCard>
    <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
      <View style={styles.stack} testID="account-subscription-card">
        <Text style={titleStyle}>{t('account_subscription')}</Text>
        <View>
          <InformationRow theme={theme} icon="layer-group" label={t('account_025')} value={(subscription?.modes || []).map(item => item.mode?.name).filter(Boolean).join(', ')} />
          <InformationRow theme={theme} icon="coins" label={t('account_073')} value={subscription ? `${subscription.totalAmount ?? '-'} ${subscription.currency || ''}` : t('account_039')} />
          <InformationRow theme={theme} icon="circle-check" label={t('event_010')} last>
            <View style={styles.badges}><StatusBadge label={subscription?.statusLabel || subscription?.status || t('account_039')} flag={statusFlag(subscription?.status)} compact /></View>
          </InformationRow>
        </View>
        {canManageBilling && !account?.isSystem ? <View style={styles.actions}>
          <IconTextButton testID="account-billing-open" theme={theme} icon="credit-card" label={t('billing_title')} variant="outlined" borderColor={theme.border} iconColor={theme.primary} onPress={onBilling} />
        </View> : null}
      </View>
    </SurfaceCard>
  </>;
}
const styles = StyleSheet.create({
  stack: { gap: tokens.spacing.md, minWidth: tokens.spacing.none },
  header: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm },
  title: { flexShrink: 1, flexGrow: 1, minWidth: tokens.spacing.none, fontSize: tokens.typography.heading, fontWeight: '700' },
  identity: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: tokens.spacing.md },
  identityCopy: { flexGrow: 1, flexBasis: tokens.spacing.xl * 4, minWidth: tokens.spacing.none, gap: tokens.spacing.xs },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: tokens.spacing.xs },
});
