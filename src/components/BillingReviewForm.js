import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PaperFormInput } from './PaperFormInput';
import { MirrorToggleRow } from './MirrorToggleRow';
import { tokens } from '../design-system/tokens';
import { t } from '../i18n';

export const REVIEW_TEXT_LIMIT = 2000;
const label = key => t(`billing_${key}`);

export function paymentReviewBlockers(review, report) {
  if (!review || !report) return [];
  const blockers = [];
  const amount = Number(review.receivedAmountCop);
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount !== Number(report.expectedAmountCop)) blockers.push('reviewAmountMismatch');
  if (Number(report.amountCop) !== Number(report.expectedAmountCop)) blockers.push('reviewReportedMismatch');
  const reference = review.bankReference.trim();
  if (!reference || reference.length > 160) blockers.push('reviewReferenceRequired');
  if (!review.receivedConfirmed) blockers.push('reviewConfirmRequired');
  if (report.duplicateCount > 0 && !review.duplicatesAcknowledged) blockers.push('reviewDuplicateRequired');
  if (review.observations.trim().length > REVIEW_TEXT_LIMIT) blockers.push('reviewNotesTooLong');
  return blockers;
}

export function BillingReviewForm({ theme, review, report, onChange, busy = false }) {
  const update = (key, value) => onChange(current => ({ ...current, [key]: value }));
  const blockers = paymentReviewBlockers(review, report);
  return <View style={styles.stack}>
    <PaperFormInput theme={theme} label={label('receivedAmount')} value={review.receivedAmountCop} onChangeText={value => update('receivedAmountCop', value)} keyboardType="number-pad" editable={!busy} />
    <PaperFormInput theme={theme} label={label('bankReference')} value={review.bankReference} onChangeText={value => update('bankReference', value)} editable={!busy} />
    <MirrorToggleRow testID="billing-review-received" theme={theme} label={label('receivedConfirm')} value={review.receivedConfirmed} onChange={value => update('receivedConfirmed', value)} disabled={busy} />
    {report.duplicateCount > 0 ? <View style={styles.stack}>
      <Text style={[styles.message, { color: theme.alert }]}>{label('duplicates')}</Text>
      <MirrorToggleRow testID="billing-review-duplicates" theme={theme} label={label('duplicatesConfirm')} value={review.duplicatesAcknowledged} onChange={value => update('duplicatesAcknowledged', value)} disabled={busy} />
    </View> : null}
    <PaperFormInput testID="billing-review-observations" theme={theme} label={label('observationsOptional')} value={review.observations} onChangeText={value => update('observations', value)} multiline editable={!busy}
      errorText={review.observations.trim().length > REVIEW_TEXT_LIMIT ? label('reviewNotesTooLong') : ''} />
    <PaperFormInput theme={theme} label={label('reason')} value={review.reason} onChangeText={value => update('reason', value)} multiline editable={!busy}
      errorText={review.reason.trim().length > REVIEW_TEXT_LIMIT ? label('reviewReasonTooLong') : ''} />
    {blockers.length ? <View testID="billing-review-requirements" style={styles.stack}>
      <Text style={[styles.requirementTitle, { color: theme.textPrimary }]}>{label('reviewRequirements')}</Text>
      <Text accessibilityLiveRegion="polite" style={[styles.message, { color: theme.textSecondary }]}>{blockers.map(label).join('\n')}</Text>
    </View> : null}
  </View>;
}

const styles = StyleSheet.create({
  stack: { gap: tokens.spacing.md, minWidth: tokens.spacing.none },
  requirementTitle: { fontSize: tokens.typography.body, fontWeight: '700', flexShrink: 1 },
  message: { fontSize: tokens.typography.caption, flexShrink: 1 },
});
