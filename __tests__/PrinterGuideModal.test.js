import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { PrinterGuideModal } from '../src/components/PrinterGuideModal';
import { AppButton } from '../src/design-system/components/AppButton';
import { PaperFormInput } from '../src/components/PaperFormInput';
import { getTheme } from '../src/design-system/theme';
import { savePrinterGuide } from '../src/services/printerGuide';
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView', useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }) }));
jest.mock('../src/providers/ToastProvider', () => ({ useToast: () => ({ showToast: jest.fn() }) }));
jest.mock('../src/services/printerGuide', () => ({
  guideForProfile: () => ({ steps: ['Connect'], stepsByPlatform: { ios: ['AirPrint'], android: ['Mopria'] }, sourceUrl: '', revision: 'r1' }),
  savePrinterGuide: jest.fn(async (_id, guide) => ({ guide })), openPrinterManual: jest.fn(), openPrinterWifiSettings: jest.fn(),
}));
it.each(['light', 'dark'])('shows read-only help without publishing controls in %s', async mode => {
  let tree;
  await act(async () => { tree = renderer.create(<PrinterGuideModal theme={getTheme(mode)} onClose={() => {}} />); });
  expect(tree.root.findAllByType(AppButton).map(b => b.props.label)).not.toContain('Editar guía y manual');
  await act(async () => tree.unmount());
});
it('lets superadmin edit both platforms without losing the other platform steps', async () => {
  let tree;
  await act(async () => { tree = renderer.create(<PrinterGuideModal assetId="7" canEdit theme={getTheme('dark')} onClose={() => {}} />); });
  await act(async () => { await tree.root.findAllByType(AppButton).find(b => b.props.label === 'Editar guía y manual').props.onPress(); });
  expect(tree.root.findAllByType(PaperFormInput)).toHaveLength(4);
  await act(async () => { await tree.root.findAllByType(AppButton).find(b => b.props.label === 'Guardar y publicar guía').props.onPress(); });
  expect(savePrinterGuide).toHaveBeenCalledWith('7', expect.objectContaining({ revision: 'r1', stepsByPlatform: { ios: ['AirPrint'], android: ['Mopria'] } }), null);
  await act(async () => tree.unmount());
});
