import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Checkbox, Switch } from 'react-native-paper';
import { pick } from '@react-native-documents/picker';
import { AppButton } from '../design-system/components/AppButton';
import { FormLayout } from '../design-system/components/FormLayout';
import { SurfaceCard } from '../design-system/components/SurfaceCard';
import { FormModal } from './FormModal';
import { ManagementCard, ManagementEmptyState } from './ManagementCard';
import { InformationRow } from './InformationRow';
import { TransferBankCarousel } from './TransferBankCarousel';
import { PaperFormInput } from './PaperFormInput';
import { StatusBadge } from './StatusBadge';
import { BillingPeriodSwitch } from './BillingPeriodSwitch';
import { IconTextButton } from './IconTextButton';
import { SelectableChipGroup } from './SelectableChipGroup';
import { DestructiveConfirmationModal } from './DestructiveConfirmationModal';
import { tokens } from '../design-system/tokens';
import { t } from '../i18n';
import { billingRequest } from '../services/api/billing';
import { ToastViewport, useToast } from '../providers/ToastProvider';
import { recordClientTechnicalError } from '../services/errorHandling';
import { PullToRefreshControl } from './PullToRefreshControl';
import { usePullToRefresh } from '../hooks/usePullToRefresh';

const label = key => t(`billing_${key}`);
const money = amount => `${Number(amount || 0).toLocaleString()} COP`;
const date = value => value ? new Date(value).toLocaleString() : '—';
const statusFlag = status => status === 'approved' || status === 'active' ? 'success' : status === 'rejected' || status === 'expired' ? 'error' : 'warn';

export function BillingPanel({ theme, section = 'account', accountId, showTitle = true }) {
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [filter, setFilter] = useState('pending_review');
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [duration, setDuration] = useState(30);
  const [selected, setSelected] = useState([]);
  const initializedAccount = useRef(null);
  const [editing, setEditing] = useState(null);
  const [bank, setBank] = useState(null);
  const [banks, setBanks] = useState([]);
  const [selectedBankId, setSelectedBankId] = useState('');
  const [bankEditorVisible, setBankEditorVisible] = useState(false);
  const [report, setReport] = useState({ amountCop: '', reference: '', transferDate: new Date().toISOString().slice(0, 10) });
  const [file, setFile] = useState(null);
  const [review, setReview] = useState(null);
  const [newMode, setNewMode] = useState(null);
  const [archivedCatalog, setArchivedCatalog] = useState(false);
  const [removal, setRemoval] = useState(null);
  const load = useCallback(async () => {
    if (section === 'account') {
      const payload = await billingRequest(`/accounts/${accountId}`);
      setData(payload);
      const availableBanks = payload.banks || (payload.bank ? [{ ...payload.bank, id: payload.bank.id || 'legacy', active: true }] : []);
      setSelectedBankId(current => availableBanks.some(item => String(item.id) === String(current)) ? current : availableBanks.length === 1 ? String(availableBanks[0].id) : '');
      if (initializedAccount.current !== accountId) {
        const previous = payload.orders?.find(order => order.status !== 'canceled');
        const preference = previous ? { durationDays: previous.durationDays, modeSlugs: previous.snapshot.items.map(item => item.slug) } : payload.preference;
        const days = preference?.durationDays === 365 ? 365 : 30;
        setDuration(days);
        setSelected((payload.catalog || []).filter(mode => mode.available && mode.implemented && mode.prices[days] > 0 && preference?.modeSlugs?.includes(mode.slug)).map(mode => mode.modeId));
        initializedAccount.current = accountId;
      }
    }
    else if (section === 'catalog') setData(await billingRequest(`/admin/catalog?archived=${archivedCatalog}`));
    else {
      const [reports, details] = await Promise.all([billingRequest(`/admin/reports?status=${filter}&search=${encodeURIComponent(submittedSearch)}`), billingRequest('/admin/banks')]);
      setData(reports);
      // List updates never replace the independent editor draft.
      setBanks(details.banks || []);
    }
  }, [section, accountId, filter, submittedSearch, archivedCatalog]);
  const run = useCallback(async action => {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try { await action(); } catch (error) {
      if (!['OPERATION_CANCELED', 'DOCUMENT_PICKER_CANCELED'].includes(error.code)) {
        recordClientTechnicalError({ code: 'BILLING_ACTION_FAILED', detail: String(error.message) }).catch(() => {});
        const messageKey = { CATALOG_IMPACT_CHANGED: 'impactChanged', BANK_OPTION_CHANGED: 'bankChanged', BANK_OPTION_UNAVAILABLE: 'bankUnavailable' }[error.code] || 'error';
        showToast({ type: 'error', message: label(messageKey) });
      }
    } finally { lock.current = false; setBusy(false); }
  }, [showToast]);
  useEffect(() => { run(load); }, [load, run]);
  const refresh = usePullToRefresh(() => run(load), { disabled: busy });
  const button = (key, action, disabled = false) => {
    const secondary = ['cancelOrder', 'receipt', 'edit', 'restoreMode', 'more', 'search'].includes(key);
    return <AppButton label={label(key)} onPress={() => run(action)} disabled={busy || disabled} variant={secondary ? 'outlined' : 'filled'} borderColor={theme.buttonSecondaryBorder} backgroundColor={secondary ? theme.surface : key === 'reject' ? theme.alert : theme.buttonBg} pressedColor={secondary ? theme.background : key === 'reject' ? theme.alert : theme.buttonBgPressed} textColor={secondary ? theme.textPrimary : theme.buttonText} style={styles.action} />;
  };
  const cancel = close => <AppButton label={t('common_cancel')} onPress={() => { if (!busy) close(); }} disabled={busy} variant="outlined" borderColor={theme.buttonSecondaryBorder} backgroundColor={theme.surface} pressedColor={theme.background} textColor={theme.textPrimary} />;
  const modalToast = <ToastViewport theme={theme} topOffset={tokens.spacing.xl * 3} />;
  const content = (value, heading = false) => <Text style={[heading ? styles.heading : styles.body, { color: theme.textPrimary }]}>{value}</Text>;
  const field = (key, value, change, numeric = false, multiline = false) => <PaperFormInput theme={theme} label={label(key)} value={String(value ?? '')} onChangeText={change} editable={!busy} keyboardType={numeric ? 'number-pad' : 'default'} multiline={multiline} />;
  const card = (key, children, actions) => <SurfaceCard key={key} surfaceColor={theme.surface} borderColor={theme.border}><FormLayout testID={`billing-${key}-form`} contentGap={tokens.spacing.md} actions={actions}>{children}</FormLayout></SurfaceCard>;
  const paid = data?.current;
  const open = data?.orders?.find(order => ['awaiting_payment', 'pending_review'].includes(order.status));
  const tariffs = data?.catalog?.filter(mode => mode.available && mode.implemented && mode.prices[duration] > 0) || [];
  const total = tariffs.filter(mode => selected.includes(mode.modeId)).reduce((sum, mode) => sum + mode.prices[duration], 0);
  const bankFields = ['bank', 'holder', 'identification', 'accountType', 'accountNumber', 'instructions'];
  const toggle = modeId => setSelected(previous => previous.includes(modeId) ? previous.filter(value => value !== modeId) : [...previous, modeId]);
  const closeBank = () => { if (!busy) { setBank(null); setBankEditorVisible(false); } };
  const availableBanks = data?.banks || (data?.bank ? [{ ...data.bank, id: data.bank.id || 'legacy', active: true }] : []);
  const selectedBank = availableBanks.find(item => String(item.id) === String(selectedBankId));
  const upsertBank = saved => setBanks(current => current.some(item => item.id === saved.id) ? current.map(item => item.id === saved.id ? saved : item) : [...current, saved]);
  const reviewItem = data?.reports?.find(item => item.id === review?.id);

  return <ScrollView testID={`billing-${section}-scroll`} style={styles.scroll} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled" alwaysBounceVertical refreshControl={<PullToRefreshControl theme={theme} {...refresh} disabled={busy} />}>
    {showTitle ? content(label(section === 'catalog' ? 'catalog' : section === 'reports' ? 'collections' : 'title'), true) : null}
    {section === 'reports' ? <View style={styles.actions}><IconTextButton testID="billing-bank-open" theme={theme} icon="building-columns" label={label('bankDetails')} variant="outlined" borderColor={theme.buttonSecondaryBorder} disabled={busy} onPress={() => { setBank(null); setBankEditorVisible(true); }} /></View> : null}
    {busy && !refresh.refreshing ? <ActivityIndicator color={theme.primary} /> : null}
    {section === 'account' && data ? <>
      {card('state', <>
        <StatusBadge compact label={label(data.active ? 'active' : 'expired')} flag={data.active ? 'success' : 'warn'} />
        {content((paid?.services || []).map(mode => mode.name).join(', ') || label('unpaid'))}
        {content(`${label('expires')}: ${date(paid?.endsAt)}`)}
        {data.notice && content(data.notice.kind === 'expiring' ? `${label('expiresSoon')}: ${data.notice.daysRemaining}` : label(data.notice.kind === 'unpaid' ? 'unpaid' : 'expired'))}
        {data.periods?.filter(period => new Date(period.startsAt) > new Date()).map(period => <View key={period.id}>{content(`${label('scheduled')}: ${date(period.startsAt)} — ${date(period.endsAt)}`)}{content(period.services.map(mode => mode.name).join(', '))}</View>)}
      </>)}
      {!open ? card('order', <>
        {content(label('request'), true)}
        <BillingPeriodSwitch theme={theme} durationDays={duration} disabled={busy} onChange={days => {
          setDuration(days);
          setSelected(current => current.filter(id => data.catalog.some(mode => mode.modeId === id && mode.available && mode.implemented && mode.prices[days] > 0)));
        }} />
        {tariffs.map(mode => <Checkbox.Item key={mode.modeId} label={`${mode.name} · ${money(mode.prices[duration])}`} labelStyle={{ color: theme.textPrimary }} color={theme.primary} status={selected.includes(mode.modeId) ? 'checked' : 'unchecked'} onPress={() => toggle(mode.modeId)} disabled={busy} />)}
        {!tariffs.length && content(label('pricesMissing'))}
        {content(`${label('total')}: ${money(total)}`)}
        {content(label('bankDetails'), true)}
        <TransferBankCarousel testID="billing-bank-choice" theme={theme} backgroundColor={theme.surface} banks={availableBanks} selectedId={selectedBankId} onSelect={value => setSelectedBankId(String(value))} disabled={busy} />
      </>, button('request', async () => { if (!selectedBank) return; await billingRequest(`/accounts/${accountId}/orders`, 'POST', { durationDays: duration, modeIds: selected, ...(selectedBank.id !== 'legacy' ? { bankId: selectedBank.id } : {}) }); await load(); }, !selected.length || !selectedBank)) : card('open', <>
        {content(`${label('order')} #${open.id}`, true)}
        <StatusBadge label={label(open.status)} flag={statusFlag(open.status)} />
        {content(`${open.durationDays} ${label('days')} · ${money(open.amountCop)}`)}
        {content(open.snapshot.items.map(mode => mode.name).join(', '))}
        <TransferBankCarousel testID="billing-order-bank" theme={theme} backgroundColor={theme.surface} banks={open.snapshot.bank ? [open.snapshot.bank] : []} />
        {open.status === 'awaiting_payment' ? <>
          {field('amount', report.amountCop, value => setReport({ ...report, amountCop: value }), true)}
          {field('transferDate', report.transferDate, value => setReport({ ...report, transferDate: value }))}
          {field('reference', report.reference, value => setReport({ ...report, reference: value }))}
          {button('attach', async () => { const [picked] = await pick({ type: ['image/jpeg', 'image/png', 'application/pdf'], mode: 'import' }); if (picked.size > 10 * 1024 * 1024) throw new Error('RECEIPT_TOO_LARGE'); setFile(picked); })}
          {file ? content(file.name) : null}
        </> : content(label('pendingHelp'))}
      </>, open.status === 'awaiting_payment' ? <>
          {button('report', async () => {
            const form = new FormData();
            Object.entries(report).forEach(([key, value]) => form.append(key, value));
            form.append('receipt', { uri: file.uri, name: file.name, type: file.type });
            await billingRequest(`/accounts/${accountId}/orders/${open.id}/reports`, 'POST', form); setFile(null); await load();
          }, !file || !report.reference.trim() || !/^[1-9][0-9]*$/.test(report.amountCop))}
          {button('cancelOrder', async () => { await billingRequest(`/accounts/${accountId}/orders/${open.id}/cancel`, 'POST', {}); await load(); })}
      </> : null)}
      {data.reports?.map(item => card(item.id, <>
        <StatusBadge label={label(item.status)} flag={statusFlag(item.status)} />
        {content(`${money(item.amountCop)} · ${item.reference}`)}
        {item.reason && content(item.reason)}
        {button('receipt', async () => { const result = await billingRequest(`/reports/${item.id}/receipt`); await Linking.openURL(result.url); })}
      </>))}
    </> : null}
    {section === 'catalog' ? <>
      <SelectableChipGroup
        testID="catalog-status-filter"
        theme={theme}
        variant="outlined"
        options={[false, true].map(archived => ({ value: archived, label: label(archived ? 'archivedModes' : 'currentModes') }))}
        value={archivedCatalog}
        disabled={busy}
        onChange={archived => { if (archived === archivedCatalog) return; setArchivedCatalog(archived); setEditing(null); setNewMode(null); setData(null); }}
      />
      {!archivedCatalog ? <View style={styles.actions}><IconTextButton testID="catalog-create-open" theme={theme} icon="plus" label={label('newMode')} disabled={busy} onPress={() => setNewMode({ name: '', slug: '' })} /></View> : null}
      {!busy && data && !data.catalog?.length ? <ManagementEmptyState theme={theme} icon="layer-group" label={t('admin_no_modes')} /> : null}
      {data?.catalog?.map(mode => <ManagementCard key={mode.modeId} theme={theme} title={mode.name} subtitle={mode.description} icon="layer-group" prominent
        badge={<StatusBadge compact label={label(mode.archivedAt ? 'archivedMode' : mode.available ? 'available' : 'draft')} flag={mode.available && !mode.archivedAt ? 'success' : 'info'} />}
        actions={mode.archivedAt ? button('restoreMode', async () => { await billingRequest(`/admin/catalog/${mode.modeId}/restore`, 'POST', {}); await load(); }) : <>
          {button('edit', () => setEditing({ ...mode, prices: { ...mode.prices }, featureText: (mode.features || []).join('\n') }))}
          <IconTextButton testID={`catalog-remove-${mode.modeId}`} theme={theme} icon="trash-can" variant="outlined" borderColor={theme.buttonSecondaryBorder} iconColor={theme.alert} accessibilityLabel={label('removeMode')} disabled={busy} onPress={() => run(async () => { setRemoval(await billingRequest(`/admin/catalog/${mode.modeId}/impact`)); })} />
        </>}>
        <View style={styles.cluster}>
          {[30, 365].map(days => <View key={days} style={[styles.price, { backgroundColor: theme.background }]}>
            <Text style={[styles.caption, { color: theme.textSecondary }]}>{label(days === 30 ? 'monthly' : 'annual')}</Text>
            <Text style={[styles.priceValue, { color: theme.textPrimary }]}>{mode.prices[days] == null ? '—' : money(mode.prices[days])}</Text>
          </View>)}
        </View>
      </ManagementCard>)}
      {newMode ? <FormModal theme={theme} testID="catalog-create" title={label('newMode')} onClose={() => { if (!busy) setNewMode(null); }} overlay={modalToast} actions={<>
        {cancel(() => setNewMode(null))}
        {button('save', async () => { await billingRequest('/admin/catalog', 'POST', newMode); setNewMode(null); await load(); }, !newMode.name.trim() || !newMode.slug.trim())}
      </>}>
        {field('name', newMode.name, name => setNewMode(current => ({ ...current, name })))}
        {field('slug', newMode.slug, slug => setNewMode(current => ({ ...current, slug })))}
        {content(label('draftHelp'))}
      </FormModal> : null}
      {editing ? <FormModal theme={theme} testID="catalog-edit" title={editing.name || label('edit')} onClose={() => { if (!busy) setEditing(null); }} overlay={modalToast} actions={<>
        {cancel(() => setEditing(null))}
        {button('save', async () => {
          await billingRequest(`/admin/catalog/${editing.modeId}`, 'PUT', { ...editing, order: Number(editing.order), features: editing.featureText.split('\n').map(value => value.trim()).filter(Boolean), prices: { 30: editing.prices[30] ? Number(editing.prices[30]) : null, 365: editing.prices[365] ? Number(editing.prices[365]) : null } });
          setEditing(null); await load();
        }, !editing.name.trim())}
      </>}>
        {field('name', editing.name, name => setEditing(current => ({ ...current, name })))}
        {field('description', editing.description, description => setEditing(current => ({ ...current, description })), false, true)}
        {field('features', editing.featureText, featureText => setEditing(current => ({ ...current, featureText })), false, true)}
        {field('orderLabel', editing.order, order => setEditing(current => ({ ...current, order })), true)}
        {field('price30', editing.prices[30], value => setEditing(current => ({ ...current, prices: { ...current.prices, 30: value } })), true)}
        {field('price365', editing.prices[365], value => setEditing(current => ({ ...current, prices: { ...current.prices, 365: value } })), true)}
        <View style={styles.switchRow}><Text style={[styles.flexCopy, styles.body, { color: theme.textPrimary }]}>{label('available')}</Text><Switch accessibilityLabel={label('available')} color={theme.primary} value={editing.available} disabled={!editing.implemented || busy} onValueChange={available => setEditing(current => ({ ...current, available }))} /></View>
      </FormModal> : null}
      {removal ? <DestructiveConfirmationModal visible theme={theme} testID="catalog-removal" title={`${label(removal.action === 'archive' ? 'archiveMode' : 'deleteMode')}: ${removal.name}`} message={label(removal.action === 'archive' ? 'archiveModeHelp' : 'deleteModeHelp')} cancelLabel={label('cancelAction')} confirmLabel={label(removal.action === 'archive' ? 'archiveMode' : 'deleteMode')} busy={busy} onCancel={() => { if (!busy) setRemoval(null); }} onConfirm={() => run(async () => {
        const current = removal;
        // A rejected/stale confirmation is discarded; the user must request fresh impact.
        try { await billingRequest(`/admin/catalog/${current.modeId}/remove`, 'POST', { action: current.action, revision: current.revision }); }
        finally { setRemoval(null); }
        setEditing(null); await load();
      })} /> : null}
    </> : null}
    {section === 'reports' ? <>
      <SelectableChipGroup
        testID="billing-reports-status-filter"
        theme={theme}
        variant="outlined"
        options={['pending_review', 'approved', 'rejected'].map(value => ({ value, label: label(value) }))}
        value={filter}
        disabled={busy}
        onChange={setFilter}
      />
      <View style={styles.searchRow}><View style={styles.flexCopy}>{field('searchAccount', search, setSearch)}</View>{button('search', () => setSubmittedSearch(search))}</View>
      {!busy && data && !data.reports?.length ? <ManagementEmptyState theme={theme} icon="receipt" label={t('admin_no_payments')} /> : null}
      {data?.reports?.map(item => <ManagementCard key={item.id} theme={theme} title={item.accountName} icon="receipt" prominent
        badge={<StatusBadge compact label={label(item.status)} flag={statusFlag(item.status)} />}
        actions={<>
          {button('receipt', async () => { const result = await billingRequest(`/reports/${item.id}/receipt`); await Linking.openURL(result.url); })}
          {item.status === 'pending_review' && button('review', () => setReview({ id: item.id, receivedAmountCop: String(item.amountCop), bankReference: '', reason: '', receivedConfirmed: false, duplicatesAcknowledged: false }))}
        </>}>
        <View style={styles.cluster}>
          <View style={[styles.price, { backgroundColor: theme.background }]}><Text style={[styles.caption, { color: theme.textSecondary }]}>{label('amount')}</Text><Text style={[styles.priceValue, { color: theme.textPrimary }]}>{money(item.amountCop)}</Text></View>
          <View style={[styles.price, { backgroundColor: theme.background }]}><Text style={[styles.caption, { color: theme.textSecondary }]}>{label('expected')}</Text><Text style={[styles.priceValue, { color: theme.textPrimary }]}>{money(item.expectedAmountCop)}</Text></View>
        </View>
        <View>
          <InformationRow theme={theme} icon="hashtag" label={label('reference')} value={item.reference} />
          <InformationRow theme={theme} icon="calendar" label={t('event_011')} value={date(item.transferDate)} last />
        </View>
        {item.duplicateCount > 0 ? <Text style={[styles.caption, { color: theme.alert }]}>{label('duplicates')}</Text> : null}
        {item.reason && content(item.reason)}
        {item.reviewedAt && content(`${label('reviewed')}: ${item.reviewedBy} · ${date(item.reviewedAt)}`)}
      </ManagementCard>)}
      {data?.nextCursor ? button('more', async () => { const page = await billingRequest(`/admin/reports?status=${filter}&search=${encodeURIComponent(submittedSearch)}&cursor=${data.nextCursor}`); setData({ ...page, reports: [...data.reports, ...page.reports] }); }) : null}
      {review && reviewItem ? <FormModal theme={theme} testID="billing-review" title={label('review')} onClose={() => { if (!busy) setReview(null); }} overlay={modalToast} actions={<>
        {cancel(() => setReview(null))}
        {button('reject', async () => { await billingRequest(`/admin/reports/${review.id}/review`, 'POST', { decision: 'rejected', reason: review.reason }); setReview(null); await load(); }, !review.reason.trim())}
        {button('approve', async () => { await billingRequest(`/admin/reports/${review.id}/review`, 'POST', { ...review, receivedAmountCop: Number(review.receivedAmountCop), decision: 'approved' }); setReview(null); await load(); }, !review.receivedConfirmed || !review.bankReference.trim() || Number(review.receivedAmountCop) !== reviewItem.expectedAmountCop || reviewItem.amountCop !== reviewItem.expectedAmountCop || (reviewItem.duplicateCount > 0 && !review.duplicatesAcknowledged))}
      </>}>
        <ManagementCard theme={theme} icon="receipt" title={reviewItem.accountName} subtitle={`${label('expected')}: ${money(reviewItem.expectedAmountCop)}`} />
        {field('receivedAmount', review.receivedAmountCop, value => setReview(current => ({ ...current, receivedAmountCop: value })), true)}
        {field('bankReference', review.bankReference, value => setReview(current => ({ ...current, bankReference: value })))}
        <Checkbox.Item label={label('receivedConfirm')} labelStyle={{ color: theme.textPrimary }} color={theme.primary} disabled={busy} status={review.receivedConfirmed ? 'checked' : 'unchecked'} onPress={() => setReview(current => ({ ...current, receivedConfirmed: !current.receivedConfirmed }))} />
        {reviewItem.duplicateCount > 0 ? <>
          <Text style={[styles.caption, { color: theme.alert }]}>{label('duplicates')}</Text>
          <Checkbox.Item label={label('duplicatesConfirm')} labelStyle={{ color: theme.textPrimary }} color={theme.primary} disabled={busy} status={review.duplicatesAcknowledged ? 'checked' : 'unchecked'} onPress={() => setReview(current => ({ ...current, duplicatesAcknowledged: !current.duplicatesAcknowledged }))} />
        </> : null}
        {field('reason', review.reason, reason => setReview(current => ({ ...current, reason })), false, true)}
      </FormModal> : null}
      {bankEditorVisible ? <FormModal theme={theme} testID="billing-bank" title={label(bank ? (bank.id ? 'editBank' : 'addBank') : 'bankDetails')} onClose={closeBank} overlay={modalToast} actions={bank ? <>
        {cancel(() => setBank(null))}
        {button('saveBank', async () => {
          const saved = await billingRequest(bank.id ? `/admin/banks/${bank.id}` : '/admin/banks', bank.id ? 'PUT' : 'POST', bank);
          upsertBank(saved.bank);
          setBank(null);
          showToast({ type: 'success', message: label('bankSaved') });
        }, bankFields.filter(key => key !== 'instructions').some(key => !bank[key]?.trim()))}
      </> : <AppButton label={t('admin_close')} onPress={closeBank} disabled={busy} variant="outlined" borderColor={theme.buttonSecondaryBorder} backgroundColor={theme.surface} pressedColor={theme.background} textColor={theme.textPrimary} />}>
        {bank ? <>
          {bankFields.map(key => <View key={key}>{field(key, bank[key], value => setBank(current => ({ ...current, [key]: value })), false, key === 'instructions')}</View>)}
          <Checkbox.Item testID="billing-bank-form-active" label={label('bankActive')} labelStyle={{ color: theme.textPrimary }} color={theme.primary} disabled={busy} status={bank.active ? 'checked' : 'unchecked'} onPress={() => setBank(current => ({ ...current, active: !current.active }))} />
        </> : <>
          <View style={styles.actions}><IconTextButton testID="billing-bank-add" theme={theme} icon="plus" label={label('addBank')} disabled={busy} onPress={() => setBank({ active: true, bank: '', holder: '', identification: '', accountType: '', accountNumber: '', instructions: '' })} /></View>
          <TransferBankCarousel testID="billing-banks-admin" theme={theme} banks={banks} disabled={busy} onEdit={item => setBank({ ...item })} onToggle={(item, active) => run(async () => {
            const saved = await billingRequest(`/admin/banks/${item.id}/active`, 'PATCH', { active, revision: item.revision });
            upsertBank(saved.bank);
          })} />
        </>}
      </FormModal> : null}
    </> : null}
  </ScrollView>;
}
const styles = StyleSheet.create({
  scroll: { flex: 1 },
  page: { flexGrow: 1, padding: tokens.spacing.md, gap: tokens.spacing.lg, paddingBottom: tokens.spacing.xl },
  cluster: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: tokens.spacing.sm },
  heading: { fontSize: tokens.typography.heading, fontWeight: '700', flexShrink: 1 },
  body: { fontSize: tokens.typography.body, flexShrink: 1 },
  action: { flexShrink: 1, minWidth: tokens.spacing.none, maxWidth: '100%' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: tokens.spacing.sm },
  caption: { fontSize: tokens.typography.caption, flexShrink: 1 },
  priceValue: { fontSize: tokens.typography.body, fontWeight: '700', flexShrink: 1 },
  price: { flexGrow: 1, flexBasis: tokens.spacing.xl * 4, minWidth: tokens.spacing.none, padding: tokens.spacing.sm, borderRadius: tokens.radius.sm, gap: tokens.spacing.xs },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.md },
  flexCopy: { flex: 1, minWidth: tokens.spacing.none },
});
