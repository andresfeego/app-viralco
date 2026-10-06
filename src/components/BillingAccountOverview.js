import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ManagementCard, ManagementEmptyState } from './ManagementCard';
import { InformationRow } from './InformationRow';
import { TransferBankCarousel } from './TransferBankCarousel';
import { StatusBadge } from './StatusBadge';
import { tokens } from '../design-system/tokens';
import { t } from '../i18n';

const label = key => t(`billing_${key}`);
const money = value => `${Number(value || 0).toLocaleString()} COP`;
const date = value => value ? new Date(value).toLocaleString() : '—';

export function BillingAccountOverview({ theme, data, disabled, onOpenOrder }) {
  const contract = data.contract;
  const status = data.active ? (data.current?.source === 'provisional' ? 'provisional' : 'active') : 'expired';
  return <View testID="billing-account-overview" style={styles.stack}>
    <Text accessibilityRole="header" style={[styles.heading, { color: theme.textPrimary }]}>{label('bankDetails')}</Text>
    <TransferBankCarousel testID="billing-bank-information" theme={theme} banks={data.banks || (data.bank ? [data.bank] : [])} />
    <ManagementCard theme={theme} testID="billing-contract" icon="file-contract" title={label('contract')} badge={<StatusBadge compact label={label(status)} flag={status === 'active' ? 'success' : 'warn'} />}>
      {contract ? <View>
        <InformationRow theme={theme} icon="shapes" label={label('services')} value={contract.items.map(item => item.name).join(', ')} />
        <InformationRow theme={theme} icon="calendar" label={label('periodicity')} value={label(contract.durationDays === 365 ? 'annual' : 'monthly')} />
        <InformationRow theme={theme} icon="coins" label={label('total')} value={money(contract.amountCop)} />
        <InformationRow theme={theme} icon="calendar-check" label={label('expires')} value={date(data.current?.endsAt || data.periods?.at(-1)?.endsAt)} last />
      </View> : <Text style={[styles.body, { color: theme.textSecondary }]}>{label('contractUnavailable')}</Text>}
      {data.provisional ? <Text style={[styles.body, { color: theme.textSecondary }]}>{label('pending_review')} · {label('reviewDeadline')}: {date(data.provisional.endsAt)}</Text> : null}
      {data.periods?.filter(period => new Date(period.startsAt) > new Date(data.serverTime || Date.now())).map(period => <Text key={period.id} style={[styles.body, { color: theme.textSecondary }]}>{label('scheduled')}: {date(period.startsAt)} — {date(period.endsAt)}</Text>)}
    </ManagementCard>
    <Text accessibilityRole="header" style={[styles.heading, { color: theme.textPrimary }]}>{label('paymentHistory')}</Text>
    {!data.orders?.length ? <ManagementEmptyState theme={theme} icon="receipt" label={label('noReceipts')} /> : null}
    {data.orders?.map(order => {
      const report = data.reports?.find(item => item.orderId === order.id);
      const submitted = order.status !== 'awaiting_payment' && report?.periodStartsAt;
      const period = data.periods?.find(item => item.orderId === order.id);
      const notice = data.notices?.some(item => item.orderId === order.id);
      return <Pressable key={order.id} testID={`billing-receipt-${order.id}`} accessibilityRole="button" accessibilityLabel={`${label('order')} ${order.id}, ${label(order.status)}`} disabled={disabled} onPress={() => onOpenOrder(order)}>
        <ManagementCard theme={theme} icon="receipt" title={`${label('order')} #${order.id}`} subtitle={`${label(order.durationDays === 365 ? 'annual' : 'monthly')} · ${money(order.amountCop)}`} badge={<StatusBadge compact label={label(order.status)} flag={order.status === 'approved' ? 'success' : 'warn'} />}>
          {notice ? <Text style={[styles.body, { color: theme.primary }]}>{label('renewalReady')}</Text> : null}
          <InformationRow theme={theme} icon="calendar-day" label={label(period || submitted ? 'periodStarts' : 'expectedStart')} value={date(period?.startsAt || submitted || order.expectedStart)} last />
          {report?.reason ? <Text style={[styles.body, { color: theme.alert }]}>{report.reason}</Text> : null}
        </ManagementCard>
      </Pressable>;
    })}
  </View>;
}
const styles = StyleSheet.create({
  stack: { gap: tokens.spacing.lg, minWidth: tokens.spacing.none },
  heading: { fontSize: tokens.typography.heading, fontWeight: '700', flexShrink: 1 },
  body: { fontSize: tokens.typography.body, flexShrink: 1 },
});
