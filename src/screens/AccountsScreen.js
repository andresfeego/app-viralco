import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AccountLogoPicker } from '../components/AccountLogoPicker';
import { AccountLogoPreview } from '../components/AccountLogoPreview';
import { IconTextButton } from '../components/IconTextButton';
import { PaperFormInput } from '../components/PaperFormInput';
import { AppButton } from '../design-system/components/AppButton';
import { FormModal } from '../components/FormModal';
import { SurfaceCard } from '../design-system/components/SurfaceCard';
import { useAuth } from '../hooks/useAuth';
import { t } from '../i18n';
import { createAccountApi as createAdminAccountApi } from '../services/api/admin';
import { createAccountApi, createAccountLogoAssetApi, listAccountsApi, updateAccountApi } from '../services/api/accounts';
import { billingRequest } from '../services/api/billing';
import { BillingPeriodSwitch } from '../components/BillingPeriodSwitch';
import { pickLogoImage } from '../services/media/imagePicker';
import { getTheme } from '../design-system/theme';
import { tokens } from '../design-system/tokens';
import { ToastViewport, useToast } from '../providers/ToastProvider';
import { userErrorMessage } from '../services/errorHandling';

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

export function AccountsScreen({ onOpenAccount = () => {}, openCreateOnMount = false, openCreateRequest = 0 }) {
  const { user, reloadMe } = useAuth();
  const { showToast } = useToast();
  const theme = useMemo(() => getTheme(user?.themeMode || 'dark'), [user?.themeMode]);
  const isSuperAdmin = (user?.globalRoles || []).some((role) => role.slug === 'super_admin');
  const [accounts, setAccounts] = useState([]);
  const [subscriptionModes, setSubscriptionModes] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [durationDays, setDurationDays] = useState(30);
  const [error, setError] = useState('');
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const [accountForm, setAccountForm] = useState({ slug: '', name: '', phone: '', email: '', modeSlugs: [], ownerUserId: '' });
  const [formErrors, setFormErrors] = useState({});
  const [selectedLogo, setSelectedLogo] = useState(null);

  useEffect(() => {
    if (openCreateOnMount || openCreateRequest > 0) setCreateModalVisible(true);
  }, [openCreateOnMount, openCreateRequest]);

  const loadAccounts = useCallback(async () => {
    try {
      const payload = await listAccountsApi();
      setAccounts(Array.isArray(payload?.accounts) ? payload.accounts : []);
    } catch (err) { setError(userErrorMessage(err, t('account_006'))); }
  }, []);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  const loadSubscriptionModes = useCallback(async () => {
    setCatalogLoading(true);
    setSubscriptionModes([]);
    try {
      const payload = await billingRequest('/catalog');
      const rows = (Array.isArray(payload?.catalog) ? payload.catalog : []).filter(mode =>
        mode.available && mode.implemented && [30, 365].every(days => Number.isSafeInteger(mode.prices?.[days]) && mode.prices[days] > 0));
      setSubscriptionModes(rows);
      setAccountForm(current => {
        const selected = current.modeSlugs.filter(slug => rows.some(mode => mode.slug === slug));
        return { ...current, modeSlugs: selected.length ? selected : rows.slice(0, 1).map(mode => mode.slug) };
      });
    } catch (err) {
      setAccountForm(current => ({ ...current, modeSlugs: [] }));
      setError(userErrorMessage(err, t('account_071')));
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => { if (isCreateModalVisible) loadSubscriptionModes(); }, [isCreateModalVisible, loadSubscriptionModes]);

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
    if (catalogLoading || !accountForm.modeSlugs.length || accountForm.modeSlugs.some(slug => !subscriptionModes.some(mode => mode.slug === slug))) nextErrors.modeSlugs = t('account_072');
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
        created = await createAdminAccountApi({ ...accountForm, durationDays });
      } else {
        created = await createAccountApi({ name: accountForm.name, slug: accountForm.slug, phone: accountForm.phone || undefined, email: accountForm.email || undefined, modeSlugs: accountForm.modeSlugs, durationDays });
      }
      const accountId = created?.account?.id;
      if (accountId && selectedLogo) {
        try {
          const logoAsset = await createAccountLogoAssetApi(accountId, selectedLogo);
          if (logoAsset?.id) await updateAccountApi(accountId, { logoAssetId: logoAsset.id });
        } catch (err) {
          showToast({ message: userErrorMessage(err, t('account_059')), type: 'error' });
        }
      }
      setAccountForm({ slug: '', name: '', phone: '', email: '', modeSlugs: [], ownerUserId: '' });
      setSelectedLogo(null);
      setCreateModalVisible(false);
      setDurationDays(30);
      await loadAccounts();
      await reloadMe();
    } catch (err) {
      const message = userErrorMessage(err, t('account_008'));
      setError(message);
      showToast({ message, type: 'error' });
    }
  };

  const selectLogo = async () => {
    try {
      const image = await pickLogoImage();
      if (image) setSelectedLogo(image);
    } catch (err) {
      showToast({ message: userErrorMessage(err, t('account_058')), type: 'error' });
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

  const renderServiceCards = () => (
    <View style={styles.planGrid}>
      {catalogLoading ? <ActivityIndicator color={theme.primary} /> : null}
      {!catalogLoading && !subscriptionModes.length ? <Text style={[styles.helperText, { color: theme.textSecondary }]}>{t('billing_pricesMissing')}</Text> : null}
      {subscriptionModes.map((mode) => {
        const selectedMode = accountForm.modeSlugs.includes(mode.slug);
        return (
          <Pressable key={mode.slug} testID={`account-mode-${mode.slug}`} accessibilityRole="checkbox" accessibilityState={{ checked: selectedMode }} onPress={() => updateFormField('modeSlugs', selectedMode ? accountForm.modeSlugs.filter((slug) => slug !== mode.slug) : [...accountForm.modeSlugs, mode.slug])} style={styles.pressableCard}>
            <SurfaceCard
              surfaceColor={theme.surface}
              borderColor={theme.border}
              gradientBorder={selectedMode ? theme.gradients.primaryToSecondary : undefined}
            >
              <View style={styles.planHeader}>
                <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{mode.name}</Text>
              </View>
              <Text style={[styles.helperText, { color: theme.textSecondary }]}>{mode.description || '-'}</Text>
              <View style={styles.tariffs}>
                <Text style={[styles.planPrice, { color: theme.primary }]}>{t(`billing_price${durationDays}`)}: {new Intl.NumberFormat('es-CO').format(mode.prices[durationDays])}</Text>
              </View>
            </SurfaceCard>
          </Pressable>
        );
      })}
      {formErrors.modeSlugs ? <Text style={[styles.errorText, { color: theme.alert }]}>{formErrors.modeSlugs}</Text> : null}
      {subscriptionModes.length ? <Text style={[styles.planTotal, { color: theme.textPrimary }]}>{t('billing_total')}: {new Intl.NumberFormat('es-CO').format(subscriptionModes.filter(mode => accountForm.modeSlugs.includes(mode.slug)).reduce((sum, mode) => sum + mode.prices[durationDays], 0))} COP</Text> : null}
    </View>
  );

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <IconTextButton testID="account-create-open" theme={theme} icon="plus" label={t('account_024')} onPress={() => setCreateModalVisible(true)} style={styles.compactCreateButton} />
        {error ? <Text style={[styles.errorText, { color: theme.alert }]}>{error}</Text> : null}

        {accounts.length === 0 ? (
          <View style={styles.emptyWrap}>
            <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>{t('account_023')}</Text>
              <Text style={[styles.helperText, { color: theme.textSecondary }]}>{t('account_032')}</Text>
              <IconTextButton testID="account-empty-create-open" theme={theme} icon="plus" label={t('account_024')} onPress={() => setCreateModalVisible(true)} style={styles.fullButton} />
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
                  {account.subscription?.billingNotice?.kind === 'expiring' ? <Text style={[styles.helperText, { color: theme.textSecondary }]}>{t('billing_expiresSoon')}: {account.subscription.billingNotice.daysRemaining}</Text> : null}
                </View>
                <AccountLogoPreview theme={theme} imageUri={logoPreviewUrl(account)} size="md" />
              </View>
            </SurfaceCard>
          </Pressable>
        ))}
      </ScrollView>

      <FormModal visible={isCreateModalVisible} theme={theme} title={isSuperAdmin ? t('account_010') : t('account_024')} onClose={closeCreateModal} testID="account-create-modal" sheetTestID="account-create-modal-card" overlay={<ToastViewport theme={theme} topOffset={MODAL_TOAST_TOP_OFFSET} />} actions={<>
        <AppButton variant="outlined" borderColor={theme.buttonSecondaryBorder} label={t('account_028')} onPress={closeCreateModal} backgroundColor={theme.surface} pressedColor={theme.background} textColor={theme.textPrimary} />
        <AppButton testID="account-create-save" label={t('account_013')} disabled={catalogLoading || !subscriptionModes.length || !accountForm.modeSlugs.length} onPress={createAccount} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} />
      </>}>
              <Text style={[styles.helperText, { color: theme.textSecondary }]}>{t('account_026')}</Text>
              {error ? <Text style={[styles.errorText, { color: theme.alert }]}>{error}</Text> : null}
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
              <BillingPeriodSwitch theme={theme} durationDays={durationDays} onChange={setDurationDays} disabled={catalogLoading} />
              {renderServiceCards()}
              <Text style={[styles.helperText, { color: theme.textSecondary }]}>{t('account_027')}</Text>
      </FormModal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, width: '100%' },
  container: { flex: 1, width: '100%' },
  content: { flexGrow: 1, gap: tokens.spacing.sm, padding: tokens.spacing.sm, paddingBottom: tokens.spacing.xl },
  compactCreateButton: { alignSelf: 'flex-end', minWidth: tokens.spacing.none },
  title: { fontSize: tokens.typography.heading, fontWeight: '700' },
  pressableCard: { width: '100%' },
  accountCardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.spacing.sm },
  accountCardData: { flex: 1, minWidth: 0, gap: tokens.spacing.xxs },
  emptyWrap: { justifyContent: 'center', minHeight: EMPTY_STATE_MIN_HEIGHT },
  emptyTitle: { fontSize: tokens.typography.body, fontWeight: '700' },
  planGrid: { gap: tokens.spacing.sm },
  tariffs: { gap: tokens.spacing.xxs, minWidth: 0 },
  planHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.spacing.sm },
  planPrice: { fontSize: tokens.typography.caption, fontWeight: '700' },
  planTotal: { fontSize: tokens.typography.body, fontWeight: '700', textAlign: 'center' },
  helperText: { fontSize: tokens.typography.caption, fontWeight: '600' },
  errorText: { fontSize: tokens.typography.caption, fontWeight: '700' },


  fullButton: { width: '100%' },
  cardTitle: { fontSize: tokens.typography.body, fontWeight: '700' },
});
