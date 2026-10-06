import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { HelperText, TextInput as PaperTextInput } from 'react-native-paper';
import { AccountLogoPicker } from '../components/AccountLogoPicker';
import { AccountInformationCards } from '../components/AccountInformationCards';
import { IconTextButton } from '../components/IconTextButton';
import { PullToRefreshControl } from '../components/PullToRefreshControl';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { DestructiveConfirmationModal } from '../components/DestructiveConfirmationModal';
import { AppButton } from '../design-system/components/AppButton';
import { ModalSafeArea } from '../design-system/components/ModalSafeArea';
import { FormModal } from '../components/FormModal';
import { useAuth } from '../hooks/useAuth';
import { t } from '../i18n';
import {
  createAccountLogoAssetApi,
  deleteAccountApi,
  getAccountApi,
  updateAccountApi,
} from '../services/api/accounts';
import { pickLogoImage } from '../services/media/imagePicker';
import { getTheme } from '../design-system/theme';
import { tokens } from '../design-system/tokens';
import { ToastViewport, useToast } from '../providers/ToastProvider';
import { userErrorMessage } from '../services/errorHandling';
import { BillingPanel } from '../components/BillingPanel';

const NOOP = () => {};
const MODAL_TOAST_TOP_OFFSET = tokens.spacing.xl * 3;

function logoDetailUrl(account) {
  return account?.logoAsset?.variants?.card?.signedUrl
    || account?.logoAsset?.variants?.card?.fileUrl
    || account?.logoAsset?.variants?.full?.signedUrl
    || account?.logoAsset?.variants?.full?.fileUrl
    || account?.logoAsset?.fileSignedUrl
    || account?.logoAsset?.fileUrl
    || '';
}

function isValidEmail(value) {
  const text = String(value || '').trim();
  return !text || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
}

export function AccountDetailScreen({ accountId, initialAccount = null, onAccountUpdated = NOOP, onAccountDeleted = NOOP }) {
  const { user, reloadMe } = useAuth();
  const { showToast } = useToast();
  const theme = useMemo(() => getTheme(user?.themeMode || 'dark'), [user?.themeMode]);
  const [account, setAccount] = useState(initialAccount);
  const [error, setError] = useState('');
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '', email: '', logo: null });
  const [editErrors, setEditErrors] = useState({});
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [billingVisible, setBillingVisible] = useState(false);
  const isSuperAdmin = (user?.globalRoles || []).some((role) => role.slug === 'super_admin');
  const isOwner = (user?.accounts || []).some((membership) => String(membership.account?.id) === String(accountId) && membership.status === 'active' && membership.role?.slug === 'owner');
  const canDeleteAccount = Boolean(account && !account.isSystem && (isSuperAdmin || isOwner));
  const canManageBilling = isSuperAdmin || (user?.accounts || []).some(membership => String(membership.account?.id) === String(accountId) && membership.status === 'active' && membership.role?.slug === 'owner');

  const loadAccount = useCallback(async () => {
    if (!accountId) return;
    try {
      const payload = await getAccountApi(accountId);
      const nextAccount = payload?.account || null;
      setAccount(nextAccount);
      if (nextAccount) onAccountUpdated(nextAccount);
    } catch (err) { setError(userErrorMessage(err, t('account_046'))); }
  }, [accountId, onAccountUpdated]);

  useEffect(() => {
    loadAccount();
  }, [loadAccount]);

  const refresh = usePullToRefresh(async () => {
    setError('');
    await loadAccount();
  }, { disabled: deleting || isEditModalVisible || billingVisible });

  const openEditModal = () => {
    setEditForm({ name: account?.name || '', phone: account?.phone || '', email: account?.email || '', logo: null });
    setEditErrors({});
    setEditModalVisible(true);
  };

  const closeEditModal = () => {
    setEditErrors({});
    setEditModalVisible(false);
  };

  const clearEditError = (field) => {
    setEditErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const updateEditField = (field, value) => {
    clearEditError(field);
    setEditForm((current) => ({ ...current, [field]: value }));
  };

  const selectLogo = async () => {
    try {
      const image = await pickLogoImage();
      if (image) setEditForm((value) => ({ ...value, logo: image }));
    } catch (err) {
      showToast({ message: userErrorMessage(err, t('account_058')), type: 'error' });
    }
  };

  const saveAccount = async () => {
    setError('');
    const nextErrors = {};
    if (!editForm.name.trim()) nextErrors.name = t('account_064');
    if (!isValidEmail(editForm.email)) nextErrors.email = t('account_067');
    setEditErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      showToast({ message: t('account_070'), type: 'error' });
      return;
    }
    try {
      let logoAssetId;
      if (editForm.logo) {
        const logoAsset = await createAccountLogoAssetApi(accountId, editForm.logo);
        logoAssetId = logoAsset?.id || logoAssetId;
      }
      const updatePayload = {
        name: editForm.name,
        phone: editForm.phone || undefined,
        email: editForm.email || undefined,
      };
      if (logoAssetId) updatePayload.logoAssetId = logoAssetId;
      const payload = await updateAccountApi(accountId, updatePayload);
      const nextAccount = payload?.account || null;
      if (nextAccount) {
        setAccount(nextAccount);
        onAccountUpdated(nextAccount);
      }
      closeEditModal();
      showToast({ message: t('account_049'), type: 'success' });
      await reloadMe();
    } catch (err) {
      const message = userErrorMessage(err, t('account_047'));
      setError(message);
      showToast({ message, type: 'error' });
    }
  };

  const removeAccount = async () => {
    setDeleting(true);
    setError('');
    try {
      const result = await deleteAccountApi(accountId, deleteConfirmation);
      setDeleteModalVisible(false);
      setDeleteConfirmation('');
      await reloadMe();
      showToast({ message: result?.archived ? t('account_081') : t('account_080'), type: 'success' });
      onAccountDeleted(result);
    } catch (err) {
      const message = userErrorMessage(err, t('account_082'));
      showToast({ message, type: 'error' });
    } finally { setDeleting(false); }
  };

  const renderFormInput = ({ testID, label, value, onChangeText, keyboardType = 'default', autoCapitalize = 'sentences', errorText = '' }) => (
    <View style={styles.inputGroup}>
      <PaperTextInput
        testID={testID}
        mode="outlined"
        label={label}
        value={value}
        onChangeText={onChangeText}
        error={Boolean(errorText)}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        textColor={theme.textPrimary}
        outlineColor={theme.border}
        activeOutlineColor={theme.primary}
        placeholderTextColor={theme.textSecondary}
        style={[styles.paperInput, { backgroundColor: theme.background }]}
        theme={{ colors: { onSurfaceVariant: theme.textSecondary, primary: theme.primary } }}
 />
      {errorText ? (
        <HelperText type="error" visible style={styles.fieldError}>
          {errorText}
        </HelperText>
      ) : null}
    </View>
  );

  return (
    <View style={styles.screen}>
      {billingVisible ? <Modal visible animationType="slide" onRequestClose={() => { setBillingVisible(false); loadAccount(); }}><ModalSafeArea style={[styles.screen, { backgroundColor: theme.background }]}>
        <View style={styles.billingHeader}>
          <Text accessibilityRole="header" style={[styles.title, { color: theme.textPrimary }]}>{t('billing_title')}</Text>
          <IconTextButton theme={theme} icon="xmark" variant="outlined" borderColor={theme.border} accessibilityLabel={t('resource_048')} onPress={() => { setBillingVisible(false); loadAccount(); }} />
        </View>
        <BillingPanel theme={theme} accountId={accountId} showTitle={false} /><ToastViewport theme={theme} topOffset={MODAL_TOAST_TOP_OFFSET} />
      </ModalSafeArea></Modal> : null}
      <ScrollView testID="account-detail-scroll" style={styles.container} contentContainerStyle={styles.content} alwaysBounceVertical refreshControl={<PullToRefreshControl theme={theme} {...refresh} />}>
        {error ? <Text style={[styles.errorText, { color: theme.alert }]}>{error}</Text> : null}

        <AccountInformationCards account={account} logoUri={logoDetailUrl(account)} theme={theme} onEdit={openEditModal} onBilling={() => setBillingVisible(true)} canManageBilling={canManageBilling} />

        {canDeleteAccount ? <View style={styles.secondaryActions}>
          <IconTextButton testID="account-delete-open" theme={theme} icon="trash-can" label={t('account_077')} variant="outlined" iconColor={theme.alert} borderColor={theme.buttonSecondaryBorder} onPress={() => setDeleteModalVisible(true)} />
        </View> : null}
      </ScrollView>

      <FormModal visible={isEditModalVisible} theme={theme} title={t('account_048')} onClose={closeEditModal} testID="account-edit-modal" sheetTestID="account-edit-modal-card" fillAvailableHeight topSpacing={tokens.spacing.xs} overlay={<ToastViewport theme={theme} topOffset={MODAL_TOAST_TOP_OFFSET} />} actions={<>
        <AppButton variant="outlined" borderColor={theme.buttonSecondaryBorder} label={t('account_028')} onPress={closeEditModal} backgroundColor={theme.surface} pressedColor={theme.background} textColor={theme.textPrimary} />
        <AppButton testID="account-edit-save" label={t('account_053')} onPress={saveAccount} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} />
      </>}>
              {renderFormInput({ testID: 'account-edit-name-input', label: t('account_011'), value: editForm.name, errorText: editErrors.name, onChangeText: (name) => updateEditField('name', name) })}
              {renderFormInput({ label: t('account_041'), value: editForm.phone, keyboardType: 'phone-pad', onChangeText: (phone) => updateEditField('phone', phone) })}
              {renderFormInput({ label: t('account_042'), value: editForm.email, errorText: editErrors.email, keyboardType: 'email-address', autoCapitalize: 'none', onChangeText: (email) => updateEditField('email', email) })}
              <AccountLogoPicker
                testID="account-edit-logo-picker"
                theme={theme}
                title={t('account_056')}
                imageUri={editForm.logo?.uri || logoDetailUrl(account)}
                buttonLabel={editForm.logo ? t('account_057') : t('account_060')}
                onPress={selectLogo}
 />
      </FormModal>

      <DestructiveConfirmationModal
        visible={isDeleteModalVisible}
        theme={theme}
        title={t('account_077')}
        message={t('account_078')}
        cancelLabel={t('common_cancel')}
        confirmLabel={t('common_confirm')}
        confirmationLabel={t('account_079')}
        confirmationValue={deleteConfirmation}
        expectedValue={account?.name || ''}
        onChangeConfirmation={setDeleteConfirmation}
        onCancel={() => { setDeleteModalVisible(false); setDeleteConfirmation(''); }}
        onConfirm={removeAccount}
        busy={deleting}
        testID="account-delete"
 />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, width: '100%' },
  container: { flex: 1, width: '100%' },
  content: { flexGrow: 1, gap: tokens.spacing.lg, padding: tokens.spacing.md, paddingBottom: tokens.spacing.xl },
  title: { flexGrow: 1, flexShrink: 1, minWidth: tokens.spacing.none, fontSize: tokens.typography.heading, fontWeight: '700' },
  cardHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: tokens.spacing.sm },
  billingHeader: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm, padding: tokens.spacing.md },
  secondaryActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: tokens.spacing.xs },
  helperText: { fontSize: tokens.typography.caption, fontWeight: '600' },
  errorText: { fontSize: tokens.typography.caption, fontWeight: '700' },
  member: { borderTopWidth: tokens.border.thin, paddingVertical: tokens.spacing.md, gap: tokens.spacing.sm },
  memberHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: tokens.spacing.sm },
  memberTextCol: { flex: 1, minWidth: tokens.spacing.none, gap: tokens.spacing.xxs },
  memberName: { fontSize: tokens.typography.body, fontWeight: '700' },


  picker: { borderWidth: tokens.border.thin, borderRadius: tokens.radius.sm, overflow: 'hidden' },
  inputGroup: { gap: tokens.spacing.xxs },
  paperInput: { fontSize: tokens.typography.body },
  fieldError: { marginVertical: tokens.spacing.none, paddingVertical: tokens.spacing.none },
});
