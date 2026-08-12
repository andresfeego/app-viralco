import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Picker } from '@react-native-picker/picker';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { t } from '../i18n';
import { createAccountApi } from '../services/api/admin';
import {
  addAccountMemberApi,
  getAccountMembersApi,
  listAccountsApi,
  removeAccountMemberApi,
  updateAccountMemberApi,
} from '../services/api/accounts';
import { getTheme } from '../design-system/theme';
import { tokens } from '../design-system/tokens';

export function AccountsScreen() {
  const { user, reloadMe } = useAuth();
  const theme = useMemo(() => getTheme(user?.themeMode || 'dark'), [user?.themeMode]);
  const isSuperAdmin = (user?.globalRoles || []).some((role) => role.slug === 'super_admin');
  const [accounts, setAccounts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [members, setMembers] = useState([]);
  const [error, setError] = useState('');
  const [accountForm, setAccountForm] = useState({ slug: '', name: '', ownerUserId: '' });
  const [memberForm, setMemberForm] = useState({ userId: '', roleSlug: 'cliente' });

  const loadAccounts = useCallback(async () => {
    try {
      const payload = await listAccountsApi();
      setAccounts(Array.isArray(payload?.accounts) ? payload.accounts : []);
    } catch (err) { setError(err?.message || t('account_006')); }
  }, []);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  const openAccount = async (account) => {
    setSelected(account);
    try {
      const payload = await getAccountMembersApi(account.id);
      setMembers(Array.isArray(payload?.members) ? payload.members : []);
    } catch (err) { setError(err?.message || t('account_007')); }
  };

  const createAccount = async () => {
    try {
      await createAccountApi(accountForm);
      setAccountForm({ slug: '', name: '', ownerUserId: '' });
      await loadAccounts();
      await reloadMe();
    } catch (err) { setError(err?.message || t('account_008')); }
  };

  const addMember = async () => {
    if (!selected) return;
    try {
      const payload = await addAccountMemberApi(selected.id, memberForm);
      setMembers(Array.isArray(payload?.members) ? payload.members : []);
      setMemberForm({ userId: '', roleSlug: 'cliente' });
      await reloadMe();
    } catch (err) { setError(err?.message || t('account_009')); }
  };

  const updateMember = async (membershipId, input) => {
    if (!selected) return;
    try {
      const payload = await updateAccountMemberApi(selected.id, membershipId, input);
      setMembers(Array.isArray(payload?.members) ? payload.members : []);
      await reloadMe();
    } catch (err) { setError(err?.message || t('account_015')); }
  };

  const removeMember = async (membershipId) => {
    if (!selected) return;
    try {
      const payload = await removeAccountMemberApi(selected.id, membershipId);
      setMembers(Array.isArray(payload?.members) ? payload.members : []);
      await reloadMe();
    } catch (err) { setError(err?.message || t('account_016')); }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: theme.textPrimary }]}>{t('account_000')}</Text>
      {error ? <Text style={{ color: theme.alert }}>{error}</Text> : null}
      {accounts.length === 0 ? <Text style={{ color: theme.textSecondary }}>{t('account_001')}</Text> : null}
      {accounts.map((account) => (
        <Pressable key={account.id} onPress={() => openAccount(account)} style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{account.name}</Text>
          <Text style={{ color: theme.textSecondary }}>{account.slug} · {account.status}</Text>
        </Pressable>
      ))}

      {isSuperAdmin ? (
        <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{t('account_010')}</Text>
          <TextInput style={[styles.input, { borderColor: theme.border, color: theme.textPrimary }]} placeholder={t('account_011')} placeholderTextColor={theme.textSecondary} value={accountForm.name} onChangeText={(name) => setAccountForm((v) => ({ ...v, name }))} />
          <TextInput style={[styles.input, { borderColor: theme.border, color: theme.textPrimary }]} placeholder="slug" placeholderTextColor={theme.textSecondary} value={accountForm.slug} autoCapitalize="none" onChangeText={(slug) => setAccountForm((v) => ({ ...v, slug }))} />
          <TextInput style={[styles.input, { borderColor: theme.border, color: theme.textPrimary }]} placeholder={t('account_012')} placeholderTextColor={theme.textSecondary} value={accountForm.ownerUserId} keyboardType="number-pad" onChangeText={(ownerUserId) => setAccountForm((v) => ({ ...v, ownerUserId }))} />
          <Pressable style={[styles.button, { backgroundColor: theme.primary }]} onPress={createAccount}><Text style={styles.buttonText}>{t('account_013')}</Text></Pressable>
        </View>
      ) : null}

      {selected ? (
        <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}> 
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{t('account_002')}: {selected.name}</Text>
          {members.map((member) => (
            <View key={member.id} style={[styles.member, { borderColor: theme.border }]}> 
              <Text style={{ color: theme.textPrimary }}>{member.user.name} · {member.status}</Text>
              {member.role.slug === 'owner' ? (
                <Text style={{ color: theme.textSecondary }}>{member.role.name}</Text>
              ) : (
                <>
                  <Picker
                    selectedValue={member.role.slug}
                    onValueChange={(roleSlug) => updateMember(member.id, { roleSlug })}
                    style={{ color: theme.textPrimary }}
                  >
                    <Picker.Item label={t('account_017')} value="admin" />
                    <Picker.Item label={t('account_018')} value="operario" />
                    <Picker.Item label={t('account_019')} value="cliente" />
                  </Picker>
                  <View style={styles.actions}>
                    <Pressable style={[styles.smallButton, { backgroundColor: theme.primary }]} onPress={() => updateMember(member.id, { status: member.status === 'active' ? 'suspended' : 'active' })}>
                      <Text style={styles.buttonText}>{member.status === 'active' ? t('account_020') : t('account_021')}</Text>
                    </Pressable>
                    <Pressable style={[styles.smallButton, { backgroundColor: theme.alert }]} onPress={() => removeMember(member.id)}>
                      <Text style={styles.buttonText}>{t('account_022')}</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          ))}
          <TextInput style={[styles.input, { borderColor: theme.border, color: theme.textPrimary }]} placeholder={t('account_004')} placeholderTextColor={theme.textSecondary} value={memberForm.userId} keyboardType="number-pad" onChangeText={(userId) => setMemberForm((v) => ({ ...v, userId }))} />
          <Text style={{ color: theme.textSecondary }}>{t('account_005')}</Text>
          <View style={[styles.picker, { borderColor: theme.border }]}> 
            <Picker selectedValue={memberForm.roleSlug} onValueChange={(roleSlug) => setMemberForm((v) => ({ ...v, roleSlug }))} style={{ color: theme.textPrimary }}>
              <Picker.Item label={t('account_017')} value="admin" />
              <Picker.Item label={t('account_018')} value="operario" />
              <Picker.Item label={t('account_019')} value="cliente" />
            </Picker>
          </View>
          <Pressable style={[styles.button, { backgroundColor: theme.primary }]} onPress={addMember}><Text style={styles.buttonText}>{t('account_003')}</Text></Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', maxHeight: 520 }, content: { gap: tokens.spacing.sm, padding: tokens.spacing.sm },
  title: { fontSize: tokens.typography.heading, fontWeight: '700' },
  card: { borderWidth: 1, borderRadius: tokens.radius.md, padding: tokens.spacing.sm, gap: tokens.spacing.xs },
  member: { borderTopWidth: 1, paddingVertical: tokens.spacing.xs, gap: tokens.spacing.xs },
  actions: { flexDirection: 'row', gap: tokens.spacing.xs },
  smallButton: { flex: 1, borderRadius: tokens.radius.sm, padding: tokens.spacing.xs, alignItems: 'center' },
  picker: { borderWidth: 1, borderRadius: tokens.radius.sm, overflow: 'hidden' },
  cardTitle: { fontWeight: '700' }, input: { borderWidth: 1, borderRadius: tokens.radius.sm, padding: tokens.spacing.xs },
  button: { borderRadius: tokens.radius.sm, padding: tokens.spacing.sm, alignItems: 'center' }, buttonText: { color: '#fff', fontWeight: '700' },
});
