import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SurfaceCard } from '../design-system/components/SurfaceCard';
import { AppButton } from '../design-system/components/AppButton';
import { IconTextButton } from './IconTextButton';
import { FormModal } from './FormModal';
import { PaperFormInput } from './PaperFormInput';
import { SelectableChipGroup } from './SelectableChipGroup';
import { MirrorToggleRow } from './MirrorToggleRow';
import { StatusBadge } from './StatusBadge';
import { DestructiveConfirmationModal } from './DestructiveConfirmationModal';
import { ToastViewport, useToast } from '../providers/ToastProvider';
import { addEventMemberApi, listEventMembersApi, removeEventMemberApi, updateEventMemberApi } from '../services/api/events';
import { userErrorMessage } from '../services/errorHandling';
import { tokens } from '../design-system/tokens';
import { t } from '../i18n';

const roles = { admin: 'account_017', operario: 'account_018', cliente: 'account_019' };
export function EventMembersCard({ eventId, theme, userId }) {
  const { showToast } = useToast();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const lock = useRef(false);
  const load = useCallback(async () => {
    setLoading(true);
    try { const result = await listEventMembersApi(eventId); setMembers(result.members || []); setError(''); }
    catch (err) { setError(userErrorMessage(err, t('account_007'))); }
    finally { setLoading(false); }
  }, [eventId]);
  useEffect(() => { load(); }, [load]);
  const run = async action => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { const result = await action(); setMembers(result.members || []); setEditing(null); setRemoving(null); showToast({ type: 'success', message: t('event_members_saved') }); }
    catch (err) { const message = userErrorMessage(err, t('account_015')); setError(message); showToast({ type: 'error', message }); }
    finally { lock.current = false; setBusy(false); }
  };
  const close = () => { if (!busy) { setEditing(null); setError(''); } };
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editing?.email?.trim() || '');
  return <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
    <View testID="event-members" style={styles.stack}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.textPrimary }]}>{t('event_members_title')}</Text>
        <IconTextButton testID="event-member-add" theme={theme} icon="plus" label={t('account_003')} disabled={busy || loading} onPress={() => { setError(''); setEditing({ email: '', roleSlug: 'cliente', status: 'active' }); }} />
      </View>
      {loading ? <ActivityIndicator color={theme.primary} /> : null}
      {!loading && !members.length ? <Text style={[styles.body, { color: theme.textSecondary }]}>{t('event_members_empty')}</Text> : null}
      {error && !editing ? <Text accessibilityRole="alert" style={[styles.body, { color: theme.alert }]}>{error}</Text> : null}
      {members.map(member => <View key={member.id} style={[styles.member, { borderTopColor: theme.border }]}>
        <View style={styles.header}>
          <View style={styles.copy}>
            <Text style={[styles.name, { color: theme.textPrimary }]}>{member.user.name}</Text>
            <Text selectable style={[styles.body, { color: theme.textSecondary }]}>{member.user.email}</Text>
          </View>
          {String(member.user.id) !== String(userId) ? <View style={styles.actions}>
            <IconTextButton testID={`event-member-edit-${member.id}`} theme={theme} icon="pencil" variant="outlined" borderColor={theme.buttonSecondaryBorder} accessibilityLabel={t('billing_edit')} disabled={busy} onPress={() => { setError(''); setEditing({ id: member.id, email: member.user.email, roleSlug: member.role.slug, status: member.status }); }} />
            <IconTextButton testID={`event-member-remove-${member.id}`} theme={theme} icon="trash-can" variant="outlined" borderColor={theme.buttonSecondaryBorder} iconColor={theme.alert} accessibilityLabel={t('account_022')} disabled={busy} onPress={() => setRemoving(member)} />
          </View> : null}
        </View>
        <View style={styles.actions}>
          <Text style={[styles.body, { color: theme.textSecondary }]}>{t(roles[member.role.slug])}</Text>
          <StatusBadge compact label={t(member.status === 'active' ? 'event_member_active' : 'event_member_suspended')} flag={member.status === 'active' ? 'success' : 'warn'} />
        </View>
      </View>)}
    </View>
    {editing ? <FormModal testID="event-member-modal" theme={theme} title={t(editing.id ? 'event_member_edit' : 'account_003')} onClose={close} overlay={<ToastViewport theme={theme} topOffset={tokens.spacing.xl * 3} />} actions={<>
      <AppButton label={t('common_cancel')} onPress={close} disabled={busy} variant="outlined" borderColor={theme.buttonSecondaryBorder} backgroundColor={theme.surface} pressedColor={theme.background} textColor={theme.textPrimary} />
      <AppButton testID="event-member-save" label={t(editing.id ? 'billing_save' : 'account_003')} disabled={busy || !validEmail} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} onPress={() => run(() => editing.id
        ? updateEventMemberApi(eventId, editing.id, { roleSlug: editing.roleSlug, status: editing.status })
        : addEventMemberApi(eventId, { email: editing.email.trim().toLowerCase(), roleSlug: editing.roleSlug }))} />
    </>}>
      <View style={styles.stack}>
        <PaperFormInput testID="event-member-email" theme={theme} label={t('event_member_email')} value={editing.email} keyboardType="email-address" autoCapitalize="none" editable={!busy && !editing.id} onChangeText={email => { setError(''); setEditing(current => ({ ...current, email })); }} errorText={error} />
        <SelectableChipGroup testID="event-member-role" theme={theme} label={t('account_005')} variant="outlined" options={Object.entries(roles).map(([value, key]) => ({ value, label: t(key) }))} value={editing.roleSlug} disabled={busy} onChange={roleSlug => { if (roles[roleSlug]) setEditing(current => ({ ...current, roleSlug })); }} />
        {editing.id ? <MirrorToggleRow theme={theme} label={t('event_member_active')} value={editing.status === 'active'} disabled={busy} onChange={active => setEditing(current => ({ ...current, status: active ? 'active' : 'suspended' }))} /> : null}
      </View>
    </FormModal> : null}
    <DestructiveConfirmationModal visible={Boolean(removing)} theme={theme} testID="event-member-removal" title={t('account_022')} message={t('event_member_remove_help')} cancelLabel={t('common_cancel')} confirmLabel={t('account_022')} busy={busy} onCancel={() => { if (!busy) setRemoving(null); }} onConfirm={() => run(() => removeEventMemberApi(eventId, removing.id))} />
  </SurfaceCard>;
}
const styles = StyleSheet.create({
  stack: { gap: tokens.spacing.md, minWidth: tokens.spacing.none },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: tokens.spacing.sm },
  title: { flexGrow: 1, flexShrink: 1, fontSize: tokens.typography.heading, fontWeight: '700' },
  member: { borderTopWidth: tokens.border.thin, paddingTop: tokens.spacing.md, gap: tokens.spacing.sm },
  copy: { flexGrow: 1, flexBasis: tokens.spacing.xl * 4, minWidth: tokens.spacing.none, gap: tokens.spacing.xxs },
  name: { fontSize: tokens.typography.body, fontWeight: '700' },
  body: { fontSize: tokens.typography.caption, flexShrink: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: tokens.spacing.xs },
});
