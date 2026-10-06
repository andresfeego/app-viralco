import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Modal, StyleSheet, Text, View } from 'react-native';
import { ModalSafeArea } from '../design-system/components/ModalSafeArea';
import { AppButton } from '../design-system/components/AppButton';
import { IconTextButton } from './IconTextButton';
import { ZoomableImage } from './ZoomableImage';
import { tokens } from '../design-system/tokens';
import { t } from '../i18n';
import { createPrivateReceiptSession } from '../services/privateReceipt';
import { recordClientTechnicalError } from '../services/errorHandling';

export function PrivateReceiptModal({ reportId, theme, onClose }) {
  const [attempt, setAttempt] = useState(0);
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [uri, setUri] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const session = useRef(null);
  const generation = useRef(0);
  const mounted = useRef(true);
  const close = useRef(onClose);
  close.current = onClose;
  const fail = useCallback(errorValue => {
    setUri(''); setLoading(false);
    setError(t(errorValue?.code === 'RECEIPT_VIEW_UPDATE_REQUIRED' ? 'viewer_update_required' : 'viewer_load_failed'));
    // Do not log signed URLs or native errors that could contain those URLs.
    recordClientTechnicalError({ code: 'RECEIPT_VIEW_FAILED', detail: String(errorValue?.code || 'DOCUMENT_UNAVAILABLE') }).catch(() => {});
  }, []);
  useEffect(() => {
    mounted.current = true;
    const listener = AppState.addEventListener('change', state => {
      if (state !== 'active') close.current();
    });
    return () => { mounted.current = false; listener.remove(); };
  }, []);
  useEffect(() => {
    const current = createPrivateReceiptSession(reportId);
    session.current = current;
    const version = ++generation.current;
    setUri(''); setError(''); setLoading(true); setPage(0); setPageCount(1);
    current.load().then(() => current.page(0)).then(result => {
      if (!mounted.current || generation.current !== version) return;
      setUri(result.uri); setPageCount(result.pageCount); setLoading(false);
    }).catch(value => { if (mounted.current && generation.current === version) fail(value); });
    return () => { current.dispose(); };
  }, [reportId, attempt, fail]);
  const changePage = async next => {
    if (loading || next < 0 || next >= pageCount) return;
    const version = ++generation.current;
    setLoading(true); setUri('');
    try {
      const result = await session.current.page(next);
      if (!mounted.current || generation.current !== version) return;
      setPage(next); setUri(result.uri); setLoading(false);
    } catch (value) { if (mounted.current && generation.current === version) fail(value); }
  };
  return <Modal visible animationType="slide" onRequestClose={onClose} testID="private-receipt-modal">
    <ModalSafeArea style={{ backgroundColor: theme.background }} testID="private-receipt-safe-area">
      <View style={styles.stack}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={[styles.title, { color: theme.textPrimary }]}>{t('billing_receipt')}</Text>
          <IconTextButton testID="private-receipt-close" theme={theme} icon="xmark" variant="outlined" borderColor={theme.buttonSecondaryBorder} accessibilityLabel={t('resource_048')} onPress={onClose} />
        </View>
        {error ? <View style={styles.state}>
          <Text accessibilityRole="alert" style={[styles.message, { color: theme.textPrimary }]}>{error}</Text>
          <AppButton testID="private-receipt-retry" label={t('viewer_retry')} onPress={() => setAttempt(value => value + 1)} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} />
        </View> : loading ? <View style={styles.state}><ActivityIndicator color={theme.primary} accessibilityLabel={t('viewer_loading')} /></View>
          : <ZoomableImage uri={uri} theme={theme} onError={fail} />}
        {pageCount > 1 && !error ? <View style={styles.pages}>
          <IconTextButton testID="private-receipt-previous" theme={theme} icon="chevron-left" variant="outlined" borderColor={theme.buttonSecondaryBorder} accessibilityLabel={t('viewer_previous_page')} disabled={loading || page === 0} onPress={() => changePage(page - 1)} />
          <Text style={[styles.message, { color: theme.textPrimary }]}>{page + 1} / {pageCount}</Text>
          <IconTextButton testID="private-receipt-next" theme={theme} icon="chevron-right" variant="outlined" borderColor={theme.buttonSecondaryBorder} accessibilityLabel={t('viewer_next_page')} disabled={loading || page + 1 === pageCount} onPress={() => changePage(page + 1)} />
        </View> : null}
      </View>
    </ModalSafeArea>
  </Modal>;
}

const styles = StyleSheet.create({
  stack: { flex: 1, minHeight: tokens.spacing.none, padding: tokens.spacing.md, gap: tokens.spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm },
  title: { flex: 1, minWidth: tokens.spacing.none, fontSize: tokens.typography.heading, fontWeight: '700' },
  state: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: tokens.spacing.md },
  message: { fontSize: tokens.typography.body, textAlign: 'center', flexShrink: 1 },
  pages: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: tokens.spacing.md },
});
