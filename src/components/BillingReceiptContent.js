import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/fontawesome6';
import { SurfaceCard } from '../design-system/components/SurfaceCard';
import { MediaPreview } from '../design-system/components/MediaPreview';
import { PaperFormInput } from './PaperFormInput';
import { IconTextButton } from './IconTextButton';
import { DeviceSourceMenu } from './DeviceSourceMenu';
import { StatusBadge } from './StatusBadge';
import { tokens } from '../design-system/tokens';
import { getLocale, t } from '../i18n';

const label = key => t(`billing_${key}`);
const money = value => `${Number(value || 0).toLocaleString(getLocale())} COP`;
const date = (value, includeTime = false) => value
  ? includeTime
    ? new Date(value).toLocaleString(getLocale())
    : new Date(value).toLocaleDateString(getLocale(), { day: 'numeric', month: 'short', year: 'numeric' })
  : '—';
const statusFlag = status => status === 'approved' ? 'success' : status === 'rejected' ? 'error' : 'warn';

// Receipt-specific presentation; submission, permissions and picker stay with the caller.
export function BillingReceiptContent({ theme, order, report, file, busy, onChangeReport, onPickFile, children }) {
  const awaitingPayment = order.status === 'awaiting_payment';
  const field = (key, property, keyboardType = 'default') => <PaperFormInput
    theme={theme}
    label={label(key)}
    value={String(report[property] ?? '')}
    editable={!busy}
    keyboardType={keyboardType}
    autoCapitalize="none"
    onChangeText={value => onChangeReport(current => ({ ...current, [property]: value }))}
  />;

  return <View testID="billing-receipt-content" style={styles.stack}>
    <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
      <View testID="billing-receipt-summary" style={styles.section}>
        <View style={styles.statusCluster}>
          <Text style={[styles.caption, { color: theme.textSecondary }]}>{label(order.durationDays === 365 ? 'annual' : 'monthly')}</Text>
          <StatusBadge compact label={label(order.status)} flag={statusFlag(order.status)} />
        </View>
        <View style={styles.amountStack}>
          <Text style={[styles.caption, { color: theme.textSecondary }]}>{label('total')}</Text>
          <Text selectable style={[styles.amount, { color: theme.textPrimary }]}>{money(order.amountCop)}</Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>{order.snapshot.items.map(mode => mode.name).join(', ')}</Text>
        </View>
        <View style={[styles.dateCluster, { borderTopColor: theme.border }]}>
          <View style={styles.dateField}>
            <Text style={[styles.caption, { color: theme.textSecondary }]}>{label('createdAt')}</Text>
            <Text style={[styles.body, { color: theme.textPrimary }]}>{date(order.createdAt)}</Text>
          </View>
          {awaitingPayment ? <View style={styles.dateField}>
            <Text style={[styles.caption, { color: theme.textSecondary }]}>{label('expectedStart')}</Text>
            <Text style={[styles.body, { color: theme.textPrimary }]}>{date(order.expectedStart)}</Text>
          </View> : null}
          {order.status === 'pending_review' && order.provisionalUntil ? <View style={styles.dateField}>
            <Text style={[styles.caption, { color: theme.textSecondary }]}>{label('reviewDeadline')}</Text>
            <Text style={[styles.body, { color: theme.textPrimary }]}>{date(order.provisionalUntil, true)}</Text>
          </View> : null}
        </View>
      </View>
    </SurfaceCard>

    {awaitingPayment ? <>
      <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
        <View testID="billing-receipt-transfer" style={styles.section}>
          <Text accessibilityRole="header" style={[styles.title, { color: theme.textPrimary }]}>{label('transferDetails')}</Text>
          {field('amount', 'amountCop', 'number-pad')}
          {field('transferDate', 'transferDate')}
        </View>
      </SurfaceCard>
      <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
        <View testID="billing-receipt-attachment" style={styles.section}>
          <View style={styles.amountStack}>
            <Text accessibilityRole="header" style={[styles.title, { color: theme.textPrimary }]}>{label('attachment')}</Text>
            <Text style={[styles.caption, { color: theme.textSecondary }]}>{label('receiptFormats')}</Text>
          </View>
          {file ? <View testID="billing-receipt-file" style={styles.section}>
            {file.type?.startsWith('image/') ? <MediaPreview
              uri={file.uri} mediaType={file.type} resizeMode="contain"
              aspectRatio={tokens.layout.cameraPreviewAspectRatio}
              borderColor={theme.border} textColor={theme.textPrimary}
            /> : null}
            <View style={styles.fileRow}>
              <Icon name={file.type === 'application/pdf' ? 'file-pdf' : 'file-image'} iconStyle="solid" size={tokens.typography.heading} color={theme.primary} accessible={false} />
              <Text selectable style={[styles.fileName, styles.body, { color: theme.textPrimary }]}>{file.name}</Text>
            </View>
          </View> : null}
          <DeviceSourceMenu theme={theme} sources={['files', 'camera', 'gallery']} disabled={busy} resetKey={order.id} testID="billing-receipt-source" onSelect={onPickFile}
            renderAnchor={onPress => <IconTextButton testID="billing-receipt-pick" theme={theme} icon={file ? 'arrows-rotate' : 'paperclip'}
              label={label(file ? 'replaceFile' : 'selectFile')} variant="outlined"
              borderColor={theme.buttonSecondaryBorder} disabled={busy} onPress={onPress} />} />
        </View>
      </SurfaceCard>
      <Text style={[styles.caption, { color: theme.textSecondary }]}>{label('pendingHelp')}</Text>
    </> : null}
    {children}
  </View>;
}

const styles = StyleSheet.create({
  stack: { gap: tokens.spacing.lg, minWidth: tokens.spacing.none },
  section: { gap: tokens.spacing.md, minWidth: tokens.spacing.none },
  amountStack: { gap: tokens.spacing.xxs, minWidth: tokens.spacing.none },
  statusCluster: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: tokens.spacing.xs },
  dateCluster: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.md, borderTopWidth: tokens.border.thin, paddingTop: tokens.spacing.md },
  dateField: { flexGrow: 1, flexBasis: tokens.spacing.xl * 4, minWidth: tokens.spacing.none, gap: tokens.spacing.xxs },
  amount: { fontSize: tokens.typography.heading, fontWeight: '700', flexShrink: 1 },
  title: { fontSize: tokens.typography.body, fontWeight: '700', flexShrink: 1 },
  body: { fontSize: tokens.typography.body, flexShrink: 1 },
  caption: { fontSize: tokens.typography.caption, flexShrink: 1 },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm, minWidth: tokens.spacing.none },
  fileName: { flex: 1, minWidth: tokens.spacing.none },
});
