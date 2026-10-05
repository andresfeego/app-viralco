import React, { useState } from 'react';
import { Linking, Platform, StyleSheet, Text } from 'react-native';
import { pick } from '@react-native-documents/picker';
import { SurfaceCard } from '../design-system/components/SurfaceCard';
import { AppButton } from '../design-system/components/AppButton';
import { PaperFormInput } from './PaperFormInput';
import { tokens } from '../design-system/tokens';
import { t } from '../i18n';
import { guideForProfile, openPrinterManual, openPrinterWifiSettings, savePrinterGuide } from '../services/printerGuide';
import { recordClientTechnicalError } from '../services/errorHandling';
import { useToast } from '../providers/ToastProvider';
import { FormModal } from './FormModal';

export function PrinterGuideModal({ metadata, assetId, theme, canEdit = false, onClose, onSaved, onSelectPrinter }) {
  const { showToast } = useToast();
  const [guide, setGuide] = useState(() => guideForProfile(metadata));
  const [editing, setEditing] = useState(false);
  const [steps, setSteps] = useState(guide.steps.join('\n'));
  const [iosSteps, setIosSteps] = useState((guide.stepsByPlatform?.ios || []).join('\n'));
  const [androidSteps, setAndroidSteps] = useState((guide.stepsByPlatform?.android || []).join('\n'));
  const [sourceUrl, setSourceUrl] = useState(guide.sourceUrl);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const visibleSteps = [...guide.steps, ...(guide.stepsByPlatform?.[Platform.OS] || [])];
  const lines = text => text.split('\n').map(s => s.trim()).filter(Boolean);
  const run = async operation => {
    if (busy) return;
    setBusy(true);
    try { await operation(); } catch (error) {
      if (!['OPERATION_CANCELED', 'DOCUMENT_PICKER_CANCELED'].includes(error?.code)) {
        recordClientTechnicalError({ code: 'PRINTER_GUIDE_FAILED', detail: String(error?.message) }).catch(() => {});
        showToast({ type: 'error', message: t('guide_error') });
      }
    } finally { setBusy(false); }
  };
  const button = (label, action) => <AppButton label={t(label)} onPress={() => run(action)} disabled={busy} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} />;
  return <FormModal theme={theme} title={t('guide_title')} onClose={() => !busy && onClose()} testID="printer-guide" actions={<>
    <AppButton variant="outlined" borderColor={theme.buttonSecondaryBorder} label={t(editing ? 'common_cancel' : 'resource_048')} onPress={() => editing ? setEditing(false) : onClose()} disabled={busy} backgroundColor={theme.surface} pressedColor={theme.background} textColor={theme.textPrimary} />
    {editing ? button('guide_publish', async () => {
      const result = await savePrinterGuide(assetId, { ...guide, sourceUrl, steps: lines(steps), stepsByPlatform: { ios: lines(iosSteps), android: lines(androidSteps) } }, file);
      setGuide(result.guide); setEditing(false); setFile(null); onSaved?.(result.guide);
    }) : null}
  </>}>
        {editing ? <>
          <PaperFormInput theme={theme} label={t('guide_steps')} multiline value={steps} onChangeText={setSteps} editable={!busy} />
          <PaperFormInput theme={theme} label={t('guide_steps_ios')} multiline value={iosSteps} onChangeText={setIosSteps} editable={!busy} />
          <PaperFormInput theme={theme} label={t('guide_steps_android')} multiline value={androidSteps} onChangeText={setAndroidSteps} editable={!busy} />
          <PaperFormInput theme={theme} label={t('guide_source')} value={sourceUrl} onChangeText={setSourceUrl} autoCapitalize="none" editable={!busy} />
          {button('guide_upload', async () => { const [selected] = await pick({ type: ['application/pdf'], mode: 'import' }); if (selected?.size > 25 * 1024 * 1024) throw new Error('MANUAL_TOO_LARGE'); setFile(selected); })}
          <Text style={{ color: theme.textSecondary }}>{file?.name || (guide.manual ? t('guide_pdf_attached') : t('guide_pdf_optional'))}</Text>
        </> : <>
          {visibleSteps.length ? visibleSteps.map((step, index) => <SurfaceCard key={index} surfaceColor={theme.surface} borderColor={theme.border}><Text style={[styles.body, { color: theme.textPrimary }]}>{index + 1}. {step}</Text></SurfaceCard>) : <Text style={{ color: theme.textSecondary }}>{t('guide_empty')}</Text>}
          <Text style={[styles.body, { color: theme.textSecondary }]}>{t(Platform.OS === 'ios' ? 'guide_wifi_ios' : 'guide_wifi_android')}</Text>
          {button('guide_settings', openPrinterWifiSettings)}
          {onSelectPrinter ? button('print_destination', onSelectPrinter) : null}
          {guide.manual ? button('guide_manual', () => openPrinterManual(guide.manual)) : null}
          {guide.sourceUrl ? button('guide_source', () => Linking.openURL(guide.sourceUrl)) : null}
          {canEdit ? button('guide_edit', () => setEditing(true)) : null}
        </>}
        {busy ? <Text accessibilityLiveRegion="polite" style={{ color: theme.textSecondary }}>{t('guide_working')}</Text> : null}
  </FormModal>;
}
const styles = StyleSheet.create({
  body: { fontSize: tokens.typography.body, flexShrink: 1 },
});
