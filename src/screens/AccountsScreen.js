import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AccountLogoPicker } from '../components/AccountLogoPicker';
import { AccountLogoPreview } from '../components/AccountLogoPreview';
import { PaperFormInput } from '../components/PaperFormInput';
import { AppButton } from '../design-system/components/AppButton';
import { SurfaceCard } from '../design-system/components/SurfaceCard';
import { useAuth } from '../hooks/useAuth';
import { t } from '../i18n';
import { createAccountApi as createAdminAccountApi } from '../services/api/admin';
import { createAccountApi, createAccountLogoAssetApi, listAccountsApi, updateAccountApi } from '../services/api/accounts';
import { listEventModesApi } from '../services/api/events';
import { pickLogoImage } from '../services/media/imagePicker';
import { getTheme } from '../design-system/theme';
import { tokens } from '../design-system/tokens';
import { ToastViewport, useToast } from '../providers/ToastProvider';

const MODAL_TOAST_TOP_OFFSET = tokens.spacing.xl * 3;
const EMPTY_STATE_MIN_HEIGHT = tokens.spacing.xl + tokens.spacing.xl + tokens.spacing.xl + tokens.spacing.xl + tokens.spacing.xl + tokens.spacing.xl + tokens.spacing.lg + tokens.spacing.lg;

function logoPreviewUrl(account) {
  return account?.logoAsset?.variants?.thumb?.signedUrl
    || account?.logoAsset?.variants?.thumb?.fileUrl
    || account?.logoAsset?.previewSignedUrl
    || account?.logoAsset?.previewUrl
    || account?.logoAsset?.fileSignedUrl
    || account?.logoAsset?.fileUrl
    || '';
}

function isValidEmail(value) {
  const text = String(value || '').trim();
  return !text || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
}

function isValidSlug(value) {
  return /^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(String(value || '').trim());
}

function buildSuggestedSlug(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

function isNumericId(value) {
  const text = String(value || '').trim();
  return !text || /^\d+$/.test(text);
}

export function AccountsScreen({ onOpenAccount = () => {} }) {
  const { user, reloadMe } = useAuth();
  const { showToast } = useToast();
  const theme = useMemo(() => getTheme(user?.themeMode || 'dark'), [user?.themeMode]);
  const isSuperAdmin = (user?.globalRoles || []).some((role) => role.slug === 'super_admin');
  const [accounts, setAccounts] = useState([]);
  const [subscriptionModes, setSubscriptionModes] = useState([]);
  const [error, setError] = useState('');
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const [accountForm, setAccountForm] = useState({ slug: '', name: '', phone: '', email: '', modeSlugs: [], ownerUserId: '' });
  const [formErrors, setFormErrors] = useState({});
  const [selectedLogo, setSelectedLogo] = useState(null);

  const loadAccounts = useCallback(async () => {
    try {
      const payload = await listAccountsApi();
      setAccounts(Array.isArray(payload?.accounts) ? payload.accounts : []);
    } catch (err) { setError(err?.message || t('account_006')); }
  }, []);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  const loadSubscriptionModes = useCallback(async () => {
    try {
      const payload = await listEventModesApi();
      const rows = Array.isArray(payload?.modes) ? payload.modes : [];
      setSubscriptionModes(rows);
      const defaults = rows.filter((mode) => mode.isDefault).map((mode) => mode.slug);
      if (defaults.length) setAccountForm((current) => ({ ...current, modeSlugs: current.modeSlugs.length ? current.modeSlugs : defaults }));
    } catch (err) {
      setError(err?.message || t('account_071'));
    }
  }, []);

  useEffect(() => { loadSubscriptionModes(); }, [loadSubscriptionModes]);

  const closeCreateModal = () => {
    setSelectedLogo(null);
    setFormErrors({});
    setCreateModalVisible(false);
  };

  const clearFormError = (field) => {
    setFormErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const updateFormField = (field, value) => {
    clearFormError(field);
    setAccountForm((current) => {
      if (field !== 'name') return { ...current, [field]: value };
      const previousSuggestion = buildSuggestedSlug(current.name);
      const shouldSuggestSlug = !current.slug || current.slug === previousSuggestion;
      return { ...current, name: value, slug: shouldSuggestSlug ? buildSuggestedSlug(value) : current.slug };
    });
  };

  const validateCreateForm = () => {
    const nextErrors = {};
    if (!accountForm.name.trim()) nextErrors.name = t('account_064');
    if (!accountForm.slug.trim()) nextErrors.slug = t('account_065');
    else if (!isValidSlug(accountForm.slug)) nextErrors.slug = t('account_066');
    if (!isValidEmail(accountForm.email)) nextErrors.email = t('account_067');
    if (!isNumericId(accountForm.ownerUserId)) nextErrors.ownerUserId = t('account_069');
    if (!accountForm.modeSlugs.length) nextErrors.modeSlugs = t('account_072');
    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const createAccount = async () => {
    setError('');
    if (!validateCreateForm()) {
      showToast({ message: t('account_070'), type: 'error' });
      return;
    }
    try {
      let created;
      if (isSuperAdmin && accountForm.ownerUserId) {
        created = await createAdminAccountApi(accountForm);
      } else {
        created = await createAccountApi({ name: accountForm.name, slug: accountForm.slug, phone: accountForm.phone || undefined, email: accountForm.email || undefined, modeSlugs: accountForm.modeSlugs });
      }
      const accountId = created?.account?.id;
      if (accountId && selectedLogo) {
        try {
          const logoAsset = await createAccountLogoAssetApi(accountId, selectedLogo);
          if (logoAsset?.id) await updateAccountApi(accountId, { logoAssetId: logoAsset.id });
        } catch (err) {
          showToast({ message: `${t('account_059')}: ${err?.message || '-'}`, type: 'error' });
        }
      }
      setAccountForm({ slug: '', name: '', phone: '', email: '', modeSlugs: subscriptionModes.filter((mode) => mode.isDefault).map((mode) => mode.slug), ownerUserId: '' });
      setSelectedLogo(null);
      setCreateModalVisible(false);
      await loadAccounts();
      await reloadMe();
    } catch (err) { setError(err?.message || t('account_008')); }
  };

  const selectLogo = async () => {
    try {
      const image = await pickLogoImage();
      if (image) setSelectedLogo(image);
    } catch (err) {
      showToast({ message: err?.message || t('account_058'), type: 'error' });
    }
  };

  const copyUserPhone = () => {
    clearFormError('phone');
    setAccountForm((value) => ({ ...value, phone: user?.phone || '' }));
  };

  const copyUserEmail = () => {
    clearFormError('email');
    setAccountForm((value) => ({ ...value, email: user?.email || '' }));
  };

  const renderFormInput = ({ testID, label, value, onChangeText, keyboardType = 'default', autoCapitalize = 'sentences', helperAction = null, errorText = '' }) => (
    <PaperFormInput
      testID={testID}
      theme={theme}
      label={label}
      value={value}
      onChangeText={onChangeText}
      errorText={errorText}
      helperAction={helperAction}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
    />
  );

  const formatModePrice = (mode) => `${mode.priceCurrency || 'USD'} ${mode.priceAmount || 0}`;
  const selectedSubscriptionTotal = useMemo(
    () => subscriptionModes
      .filter((mode) => accountForm.modeSlugs.includes(mode.slug))
      .reduce((sum, mode) => sum + Number(mode.priceAmount || 0), 0),
    [accountForm.modeSlugs, subscriptionModes]
  );
  const selectedSubscriptionCurrency = subscriptionModes.find((mode) => accountForm.modeSlugs.includes(mode.slug))?.priceCurrency || 'USD';

  const renderServiceCards = () => (
    <View style={styles.planGrid}>
      {subscriptionModes.map((mode) => {
        const selectedMode = accountForm.modeSlugs.includes(mode.slug);
        return (
          <Pressable key={mode.slug} onPress={() => updateFormField('modeSlugs', selectedMode ? accountForm.modeSlugs.filter((slug) => slug !== mode.slug) : [...accountForm.modeSlugs, mode.slug])} style={styles.pressableCard}>
            <SurfaceCard surfaceColor={theme.surface} borderColor={selectedMode ? theme.primary : theme.border}>
              <View style={styles.planHeader}>
                <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{mode.name}</Text>
                <Text style={[styles.planPrice, { color: selectedMode ? theme.primary : theme.textSecondary }]}>{formatModePrice(mode)}</Text>
              </View>
              <Text style={[styles.helperText, { color: theme.textSecondary }]}>{mode.description || '-'}</Text>
            </SurfaceCard>
          </Pressable>
        );
      })}
      {formErrors.modeSlugs ? <Text style={[styles.errorText, { color: theme.alert }]}>{formErrors.modeSlugs}</Text> : null}
      <Text style={[styles.planTotal, { color: theme.textPrimary }]}>
        {t('account_074')} ${selectedSubscriptionTotal} {selectedSubscriptionCurrency}
      </Text>
    </View>
  );

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>{t('account_000')}</Text>
          <AppButton testID="account-create-open" label={t('account_024')} onPress={() => setCreateModalVisible(true)} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} style={styles.headerButton} />
        </View>
        {error ? <Text style={[styles.errorText, { color: theme.alert }]}>{error}</Text> : null}

        {accounts.length === 0 ? (
          <View style={styles.emptyWrap}>
            <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>{t('account_023')}</Text>
              <Text style={[styles.helperText, { color: theme.textSecondary }]}>{t('account_032')}</Text>
              <AppButton testID="account-empty-create-open" label={t('account_024')} onPress={() => setCreateModalVisible(true)} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} style={styles.fullButton} />
            </SurfaceCard>
          </View>
        ) : null}

        {accounts.map((account) => (
          <Pressable key={account.id} testID={`account-card-${account.id}`} onPress={() => onOpenAccount(account)} style={styles.pressableCard}>
            <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
              <View style={styles.accountCardRow}>
                <View style={styles.accountCardData}>
                  <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{account.name}</Text>
                  <Text style={[styles.helperText, { color: theme.textSecondary }]}>{account.slug} - {account.status}</Text>
                  <Text style={[styles.helperText, { color: theme.textSecondary }]}>{t('account_073')}: {account.subscription?.totalAmount ?? '-'} {account.subscription?.currency || ''} - {account.subscription?.statusLabel || account.subscription?.status || t('account_039')}</Text>
                </View>
                <AccountLogoPreview theme={theme} imageUri={logoPreviewUrl(account)} size="md" />
              </View>
            </SurfaceCard>
          </Pressable>
        ))}
      </ScrollView>

      <Modal visible={isCreateModalVisible} animationType="slide" transparent onRequestClose={closeCreateModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <Text style={[styles.title, { color: theme.textPrimary }]}>{isSuperAdmin ? t('account_010') : t('account_024')}</Text>
              <Text style={[styles.helperText, { color: theme.textSecondary }]}>{t('account_026')}</Text>
              {renderFormInput({ testID: 'account-create-name-input', label: t('account_011'), value: accountForm.name, errorText: formErrors.name, onChangeText: (name) => updateFormField('name', name) })}
              {renderFormInput({ testID: 'account-create-slug-input', label: t('account_029'), value: accountForm.slug, errorText: formErrors.slug, autoCapitalize: 'none', onChangeText: (slug) => updateFormField('slug', slug) })}
              {renderFormInput({ label: t('account_041'), value: accountForm.phone, keyboardType: 'phone-pad', onChangeText: (phone) => updateFormField('phone', phone), helperAction: { label: t('account_043'), onPress: copyUserPhone } })}
              {renderFormInput({ testID: 'account-create-email-input', label: t('account_042'), value: accountForm.email, errorText: formErrors.email, keyboardType: 'email-address', autoCapitalize: 'none', onChangeText: (email) => updateFormField('email', email), helperAction: { label: t('account_043'), onPress: copyUserEmail } })}
              <AccountLogoPicker
                testID="account-create-logo-picker"
                theme={theme}
                title={t('account_056')}
                imageUri={selectedLogo?.uri || ''}
                buttonLabel={selectedLogo ? t('account_057') : t('account_060')}
                onPress={selectLogo}
              />
              {isSuperAdmin ? renderFormInput({ testID: 'account-create-owner-input', label: t('account_012'), value: accountForm.ownerUserId, errorText: formErrors.ownerUserId, keyboardType: 'number-pad', onChangeText: (ownerUserId) => updateFormField('ownerUserId', ownerUserId) }) : null}
              <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{t('account_025')}</Text>
              {renderServiceCards()}
              <Text style={[styles.helperText, { color: theme.textSecondary }]}>{t('account_027')}</Text>
              <View style={styles.actions}>
                <AppButton label={t('account_028')} onPress={closeCreateModal} backgroundColor={theme.surface} pressedColor={theme.surface} textColor={theme.textPrimary} style={styles.smallButton} />
                <AppButton testID="account-create-save" label={t('account_013')} onPress={createAccount} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} style={styles.smallButton} />
              </View>
            </ScrollView>
          </View>
          <ToastViewport theme={theme} topOffset={MODAL_TOAST_TOP_OFFSET} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, width: '100%' },
  container: { flex: 1, width: '100%' },
  content: { flexGrow: 1, gap: tokens.spacing.sm, padding: tokens.spacing.sm, paddingBottom: tokens.spacing.xl },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.spacing.sm },
  headerButton: { minWidth: 0 },
  title: { fontSize: tokens.typography.heading, fontWeight: '700' },
  pressableCard: { width: '100%' },
  accountCardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.spacing.sm },
  accountCardData: { flex: 1, minWidth: 0, gap: tokens.spacing.xxs },
  emptyWrap: { justifyContent: 'center', minHeight: EMPTY_STATE_MIN_HEIGHT },
  emptyTitle: { fontSize: tokens.typography.body, fontWeight: '700' },
  planGrid: { gap: tokens.spacing.sm },
  planHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.spacing.sm },
  planPrice: { fontSize: tokens.typography.caption, fontWeight: '700' },
  planTotal: { fontSize: tokens.typography.body, fontWeight: '700', textAlign: 'center' },
  helperText: { fontSize: tokens.typography.caption, fontWeight: '600' },
  errorText: { fontSize: tokens.typography.caption, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: tokens.spacing.xs },
  smallButton: { flex: 1, minWidth: 0 },
  fullButton: { width: '100%' },
  cardTitle: { fontSize: tokens.typography.body, fontWeight: '700' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalCard: { maxHeight: '86%', borderTopWidth: 1, borderTopLeftRadius: tokens.radius.lg, borderTopRightRadius: tokens.radius.lg },
  modalContent: { gap: tokens.spacing.sm, padding: tokens.spacing.md, paddingBottom: tokens.spacing.lg },
});
