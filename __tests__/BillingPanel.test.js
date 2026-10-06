import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { BillingPanel } from '../src/components/BillingPanel';
import { AppButton } from '../src/design-system/components/AppButton';
import { billingRequest } from '../src/services/api/billing';
import { getTheme } from '../src/design-system/theme';
import { DestructiveConfirmationModal } from '../src/components/DestructiveConfirmationModal';
import { SelectableChipGroup } from '../src/components/SelectableChipGroup';
import { FormModal } from '../src/components/FormModal';
import { PrivateReceiptModal } from '../src/components/PrivateReceiptModal';
import { ManagementCard } from '../src/components/ManagementCard';
import { TransferBankCarousel } from '../src/components/TransferBankCarousel';
import { TransferBankList } from '../src/components/TransferBankCard';
import { ScrollView, RefreshControl, Switch as NativeSwitch, Text } from 'react-native';
import { pick } from '@react-native-documents/picker';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
const mockToast = jest.fn();
const mockBank = { id: '1', revision: 1, bank: 'Bank', holder: 'Holder', identification: '123', accountType: 'Savings', accountNumber: '000123', instructions: '', active: true };
const openBankEditor = tree => {
  act(() => tree.root.findByProps({ testID: 'billing-bank-open' }).props.onPress());
  act(() => tree.root.findByProps({ testID: 'billing-banks-admin-edit-1' }).props.onPress());
};
jest.mock('../src/providers/ToastProvider', () => ({ ToastViewport: () => null, useToast: () => ({ showToast: mockToast }) }));
jest.mock('@react-native-vector-icons/fontawesome6', () => 'Icon');
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View, useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }) }));
jest.mock('../src/services/api/billing', () => ({ billingRequest: jest.fn() }));
jest.mock('../src/components/PrivateReceiptModal', () => ({ PrivateReceiptModal: 'PrivateReceiptModal' }));
jest.mock('react-native-paper', () => {
  const ReactModule = require('react');
  const MockMenu = props => ReactModule.createElement(require('react-native').View, null, props.anchor, props.visible ? props.children : null);
  MockMenu.Item = 'MenuItem';
  return { Checkbox: { Item: 'CheckboxItem' }, Switch: 'Switch', Menu: MockMenu, Portal: { Host: ReactModule.Fragment } };
});
jest.mock('react-native-image-picker', () => ({ launchCamera: jest.fn(), launchImageLibrary: jest.fn() }));
jest.mock('../src/components/PaperFormInput', () => ({ PaperFormInput: 'Input' }));
beforeEach(() => { jest.clearAllMocks(); });

it.each(['account', 'catalog', 'reports'])('replaces the manual refresh with pull-to-refresh in %s', async section => {
  billingRequest.mockImplementation(async path => path.includes('/admin/bank') ? { banks: [] } : { catalog: [], reports: [], orders: [], periods: [] });
  let tree;
  await act(async () => { tree = renderer.create(<BillingPanel section={section} accountId="12" theme={getTheme('dark')} />); });
  expect(tree.root.findAllByType(AppButton).some(button => button.props.label === 'Actualizar')).toBe(false);
  const scroll = tree.root.findByType(ScrollView);
  expect(scroll.props.alwaysBounceVertical).toBe(true);
  const before = billingRequest.mock.calls.length;
  await act(async () => tree.root.findByType(RefreshControl).props.onRefresh());
  expect(billingRequest.mock.calls.length).toBeGreaterThan(before);
  expect(billingRequest.mock.calls.every(call => call.length === 1)).toBe(true);
  expect(tree.root.findByType(RefreshControl).props.refreshing).toBe(false);
  await act(async () => tree.unmount());
});

it('refreshes the filtered reports without overwriting unsaved bank details', async () => {
  billingRequest.mockImplementation(async path => path.startsWith('/admin/reports') ? { reports: [] } : { banks: [{ ...mockBank, bank: 'Server bank' }] });
  let tree;
  await act(async () => { tree = renderer.create(<BillingPanel section="reports" theme={getTheme('light')} />); });
  await act(async () => tree.root.findByProps({ testID: 'billing-reports-status-filter-approved' }).props.onPress());
  openBankEditor(tree);
  const bankInput = () => tree.root.findAllByType('Input').find(input => input.props.label === 'Banco');
  act(() => bankInput().props.onChangeText('Unsaved bank'));
  await act(async () => tree.root.findByType(RefreshControl).props.onRefresh());
  expect(bankInput().props.value).toBe('Unsaved bank');
  expect(billingRequest).toHaveBeenCalledWith('/admin/reports?status=approved&search=');
  expect(tree.root.findByType(SelectableChipGroup).props.value).toBe('approved');
  expect(billingRequest.mock.calls.every(call => call.length === 1)).toBe(true);
  await act(async () => tree.unmount());
});

it('stops refreshing and preserves loaded information when the network fails', async () => {
  billingRequest.mockResolvedValueOnce({ catalog: [{ modeId: '9', name: 'Existing mode', features: [], prices: {} }] });
  let tree;
  await act(async () => { tree = renderer.create(<BillingPanel section="catalog" theme={getTheme('light')} />); });
  billingRequest.mockRejectedValueOnce(new Error('Offline'));
  await act(async () => tree.root.findByType(RefreshControl).props.onRefresh());
  expect(tree.root.findByType(RefreshControl).props.refreshing).toBe(false);
  expect(tree.root.findAllByProps({ testID: 'catalog-remove-9' }).length).toBeGreaterThan(0);
  expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
  await act(async () => tree.unmount());
});
it.each(['light', 'dark'])('confirms bank details only after the server saves them in %s', async mode => {
  let resolveSave;
  billingRequest.mockImplementation(async (path, method) => {
    if (method === 'PUT') return new Promise(resolve => { resolveSave = resolve; });
    return path.startsWith('/admin/reports') ? { reports: [] } : { banks: [mockBank] };
  });
  let tree;
  await act(async () => { tree = renderer.create(<BillingPanel section="reports" theme={getTheme(mode)} />); });
  const save = () => tree.root.findAllByType(AppButton).find(button => button.props.label === 'Guardar datos bancarios');
  openBankEditor(tree);
  await act(async () => { save().props.onPress(); });
  expect(save().props.disabled).toBe(true);
  expect(mockToast).not.toHaveBeenCalled();
  await act(async () => { resolveSave({ bank: { ...mockBank, revision: 2, bank: 'Saved bank' } }); });
  expect(mockToast).toHaveBeenCalledWith({ type: 'success', message: 'Datos de transferencia guardados correctamente' });
  openBankEditor(tree);
  expect(tree.root.findAllByType('Input').some(input => input.props.value === 'Saved bank')).toBe(true);
  await act(async () => tree.unmount());
});
it('shows an error instead of success when saving bank details fails', async () => {
  billingRequest.mockImplementation(async (path, method) => {
    if (method === 'PUT') throw new Error('Save failed');
    return path.startsWith('/admin/reports') ? { reports: [] } : { banks: [mockBank] };
  });
  let tree;
  await act(async () => { tree = renderer.create(<BillingPanel section="reports" theme={getTheme('dark')} />); });
  openBankEditor(tree);
  await act(async () => { tree.root.findAllByType(AppButton).find(button => button.props.label === 'Guardar datos bancarios').props.onPress(); });
  expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
  expect(mockToast).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
  await act(async () => tree.unmount());
});
it.each(['light', 'dark'])('confirms server-decided removal and can restore archived modes in %s', async mode => {
  const entry = { modeId: '8', name: 'Test mode', features: [], available: false, prices: { 30: 100, 365: 1000 } };
  billingRequest.mockImplementation(async path => {
    if (path.endsWith('/impact')) return { modeId: '8', name: entry.name, action: 'archive', revision: 'fresh' };
    if (path.includes('archived=true')) return { catalog: [{ ...entry, archivedAt: '2026-10-05' }] };
    return { catalog: [entry] };
  });
  let tree;
  await act(async () => { tree = renderer.create(<BillingPanel section="catalog" theme={getTheme(mode)} />); });
  await act(async () => { await tree.root.findByProps({ testID: 'catalog-remove-8' }).props.onPress(); });
  const modal = tree.root.findByType(DestructiveConfirmationModal);
  expect(modal.props.message).toContain('historial');
  expect(billingRequest).not.toHaveBeenCalledWith('/admin/catalog/8/remove', expect.anything(), expect.anything());
  await act(async () => { await modal.props.onConfirm(); });
  expect(billingRequest).toHaveBeenCalledWith('/admin/catalog/8/remove', 'POST', { action: 'archive', revision: 'fresh' });
  const catalogFilter = () => tree.root.findByType(SelectableChipGroup);
  expect(catalogFilter().props).toMatchObject({ testID: 'catalog-status-filter', variant: 'outlined', value: false });
  await act(async () => { tree.root.findByProps({ testID: 'catalog-status-filter-true' }).props.onPress(); });
  expect(catalogFilter().props.value).toBe(true);
  expect(billingRequest).toHaveBeenCalledWith('/admin/catalog?archived=true');
  await act(async () => { await tree.root.findAllByType(AppButton).find(button => button.props.label === 'Restaurar sin habilitar ventas').props.onPress(); });
  expect(billingRequest).toHaveBeenCalledWith('/admin/catalog/8/restore', 'POST', {});
  await act(async () => { tree.root.findByProps({ testID: 'catalog-status-filter-false' }).props.onPress(); });
  expect(catalogFilter().props.value).toBe(false);
  expect(billingRequest).toHaveBeenLastCalledWith('/admin/catalog?archived=false');
  await act(async () => tree.unmount());
});

it.each(['light', 'dark'])('filters collection reports with outlined chips and disables them while loading in %s', async mode => {
  let finishLoading;
  billingRequest.mockImplementation(async path => {
    if (path.includes('status=approved')) return new Promise(resolve => { finishLoading = resolve; });
    return path.startsWith('/admin/reports') ? { reports: [] } : { banks: [] };
  });
  let tree;
  await act(async () => { tree = renderer.create(<BillingPanel section="reports" theme={getTheme(mode)} />); });
  const statusFilter = () => tree.root.findByType(SelectableChipGroup);
  expect(statusFilter().props).toMatchObject({ testID: 'billing-reports-status-filter', variant: 'outlined', value: 'pending_review', disabled: false });
  expect(statusFilter().props.options.map(option => option.value)).toEqual(['pending_review', 'approved', 'rejected']);
  await act(async () => { tree.root.findByProps({ testID: 'billing-reports-status-filter-approved' }).props.onPress(); });
  expect(statusFilter().props.value).toBe('approved');
  expect(statusFilter().props.disabled).toBe(true);
  expect(billingRequest).toHaveBeenCalledWith('/admin/reports?status=approved&search=');
  await act(async () => finishLoading({ reports: [] }));
  expect(statusFilter().props.disabled).toBe(false);
  await act(async () => { tree.root.findByProps({ testID: 'billing-reports-status-filter-rejected' }).props.onPress(); });
  expect(statusFilter().props.value).toBe('rejected');
  expect(billingRequest).toHaveBeenCalledWith('/admin/reports?status=rejected&search=');
  await act(async () => tree.unmount());
});
it('explains permanent deletion, allows cancellation and discards stale confirmations', async () => {
  billingRequest.mockImplementation(async path => {
    if (path.endsWith('/impact')) return { modeId: '9', name: 'Unused', action: 'delete', revision: 'old' };
    if (path.endsWith('/remove')) throw Object.assign(new Error('changed'), { code: 'CATALOG_IMPACT_CHANGED' });
    return { catalog: [{ modeId: '9', name: 'Unused', features: [], prices: {} }] };
  });
  let tree;
  await act(async () => { tree = renderer.create(<BillingPanel section="catalog" theme={getTheme('dark')} />); });
  const open = async () => { await tree.root.findByProps({ testID: 'catalog-remove-9' }).props.onPress(); };
  await act(open);
  expect(tree.root.findByType(DestructiveConfirmationModal).props.message).toContain('no se puede deshacer');
  await act(async () => { tree.root.findByType(DestructiveConfirmationModal).props.onCancel(); });
  expect(tree.root.findAllByType(DestructiveConfirmationModal)).toHaveLength(0);
  expect(billingRequest).not.toHaveBeenCalledWith('/admin/catalog/9/remove', expect.anything(), expect.anything());
  await act(open);
  await act(async () => { await tree.root.findByType(DestructiveConfirmationModal).props.onConfirm(); });
  expect(tree.root.findAllByType(DestructiveConfirmationModal)).toHaveLength(0);
  expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Vuelve a pulsar') }));
  await act(async () => tree.unmount());
});
it('keeps the signup contract read-only and displays its first receipt', async () => {
  billingRequest.mockResolvedValue({ active: false, periods: [], orders: [{ id: '9', status: 'awaiting_payment', amountCop: 700000, durationDays: 365, snapshot: { items: [{ name: 'Espejo' }] } }], reports: [], banks: [], contract: { durationDays: 365, amountCop: 700000, items: [{ name: 'Espejo' }] } });
  let tree;
  await act(async () => { tree = renderer.create(<BillingPanel theme={getTheme('dark')} accountId="12" />); });
  expect(tree.root.findAllByProps({ testID: 'billing-period-switch' })).toHaveLength(0);
  expect(tree.root.findAllByType(AppButton).some(button => button.props.label === 'Solicitar activación o renovación')).toBe(false);
  await act(async () => tree.root.findByProps({ testID: 'billing-receipt-9' }).props.onPress());
  expect(tree.root.findByType(FormModal).props.testID).toBe('billing-receipt-modal');
  expect(tree.root.findByType(FormModal).props.portalHost).toBe(true);
  expect(tree.root.findAllByType('Input').find(input => input.props.label === 'Importe transferido (COP)').props.value).toBe('700000');
  expect(tree.root.findAllByType(AppButton).find(button => button.props.label === 'Enviar comprobante').props.disabled).toBe(true);
  expect(billingRequest.mock.calls.every(call => call.length === 1)).toBe(true);
  await act(async () => tree.unmount());
});
it('sends a proof from the receipt without selecting a bank or changing the contract', async () => {
  const order = { id: '9', status: 'awaiting_payment', amountCop: 50000, durationDays: 30, snapshot: { items: [{ name: 'Espejo' }] } };
  billingRequest.mockImplementation(async (_path, method) => {
    if (method === 'POST') { order.status = 'pending_review'; return { status: 'pending_review' }; }
    return { active: order.status === 'pending_review', periods: [], banks: [mockBank], orders: [order], reports: [], contract: { durationDays: 30, amountCop: 50000, items: order.snapshot.items } };
  });
  pick.mockResolvedValueOnce([{ uri: 'file:///proof.pdf', name: 'proof.pdf', type: 'application/pdf', size: 100 }]);
  let tree;
  await act(async () => { tree = renderer.create(<BillingPanel theme={getTheme('light')} accountId="12" />); });
  expect(tree.root.findByType(TransferBankCarousel).props.onSelect).toBeUndefined();
  await act(async () => tree.root.findByProps({ testID: 'billing-receipt-9' }).props.onPress());
  const button = label => tree.root.findAllByType(AppButton).find(item => item.props.label === label);
  await act(async () => tree.root.findByProps({ testID: 'billing-receipt-pick' }).props.onPress());
  expect(pick).not.toHaveBeenCalled();
  await act(async () => tree.root.findByProps({ testID: 'billing-receipt-source-files' }).props.onPress());
  expect(tree.root.findAllByType('Input').some(input => input.props.label === 'Referencia de transferencia')).toBe(false);
  expect(button('Enviar comprobante').props.disabled).toBe(false);
  await act(async () => button('Enviar comprobante').props.onPress());
  expect(billingRequest).toHaveBeenCalledWith('/accounts/12/orders/9/reports', 'POST', expect.any(FormData));
  expect(button('Enviar comprobante')).toBeUndefined();
  expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
  await act(async () => tree.unmount());
});
it('keeps a bank switch stable while saving and restores its server value on failure', async () => {
  let rejectSave;
  billingRequest.mockImplementation(async (path, method) => {
    if (method === 'PATCH') return new Promise((_resolve, reject) => { rejectSave = reject; });
    return path.startsWith('/admin/reports') ? { reports: [] } : { banks: [mockBank] };
  });
  let tree;
  await act(async () => { tree = renderer.create(<BillingPanel section="reports" theme={getTheme('dark')} />); });
  act(() => tree.root.findByProps({ testID: 'billing-bank-open' }).props.onPress());
  const toggle = () => tree.root.findByType(NativeSwitch);
  const label = toggle().props.accessibilityLabel;
  await act(async () => { toggle().props.onValueChange(false); });
  expect(toggle().props.disabled).toBe(true);
  expect(toggle().props.value).toBe(true);
  await act(async () => rejectSave(new Error('Network unavailable')));
  expect(toggle().props.disabled).toBe(false);
  expect(toggle().props.value).toBe(true);
  expect(toggle().props.accessibilityLabel).toBe(label);
  expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
  await act(async () => tree.unmount());
});
it('keeps the receipt draft after picker cancellation and a failed submission', async () => {
  const order = { id: '9', status: 'awaiting_payment', amountCop: 50000, durationDays: 30, snapshot: { items: [{ name: 'Espejo' }] } };
  billingRequest.mockImplementation(async (_path, method) => {
    if (method === 'POST') throw new Error('Offline');
    return { active: false, periods: [], banks: [], orders: [order], reports: [] };
  });
  let tree;
  await act(async () => { tree = renderer.create(<BillingPanel theme={getTheme('light')} accountId="12" />); });
  act(() => tree.root.findByProps({ testID: 'billing-receipt-9' }).props.onPress());
  pick.mockRejectedValueOnce(Object.assign(new Error('Cancelled'), { code: 'OPERATION_CANCELED' }));
  await act(async () => tree.root.findByProps({ testID: 'billing-receipt-pick' }).props.onPress());
  await act(async () => tree.root.findByProps({ testID: 'billing-receipt-source-files' }).props.onPress());
  expect(mockToast).not.toHaveBeenCalled();
  pick.mockResolvedValueOnce([{ uri: 'file:///proof.pdf', name: 'proof.pdf', type: 'application/pdf', size: 100 }]);
  await act(async () => tree.root.findByProps({ testID: 'billing-receipt-pick' }).props.onPress());
  await act(async () => tree.root.findByProps({ testID: 'billing-receipt-source-files' }).props.onPress());
  const amount = () => tree.root.findAllByType('Input').find(input => input.props.label === 'Importe transferido (COP)');
  act(() => amount().props.onChangeText('50000'));
  await act(async () => tree.root.findAllByType(AppButton).find(button => button.props.label === 'Enviar comprobante').props.onPress());
  expect(amount().props.value).toBe('50000');
  expect(tree.root.findByProps({ testID: 'billing-receipt-file' })).toBeTruthy();
  expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
  const submissions = billingRequest.mock.calls.filter(call => call[1] === 'POST').length;
  act(() => tree.root.findByType(FormModal).props.onClose());
  expect(tree.root.findAllByType(FormModal)).toHaveLength(0);
  expect(billingRequest.mock.calls.filter(call => call[1] === 'POST')).toHaveLength(submissions);
  await act(async () => tree.unmount());
});
it.each(['camera', 'gallery'])('attaches from %s without submitting and keeps the file after cancellation or error', async source => {
  const order = { id: '9', status: 'awaiting_payment', amountCop: 50000, durationDays: 30, snapshot: { items: [{ name: 'Espejo' }] } };
  billingRequest.mockResolvedValue({ active: false, periods: [], banks: [], orders: [order], reports: [] });
  const nativePicker = source === 'camera' ? launchCamera : launchImageLibrary;
  nativePicker.mockResolvedValueOnce({ assets: [{ uri: 'file:///proof.jpg', fileName: 'proof.jpg', type: 'image/jpeg', fileSize: 100 }] })
    .mockResolvedValueOnce({ didCancel: true })
    .mockResolvedValueOnce({ errorCode: 'permission', errorMessage: 'Native diagnostic detail' });
  let tree;
  await act(async () => { tree = renderer.create(<BillingPanel theme={getTheme('dark')} accountId="12" />); });
  act(() => tree.root.findByProps({ testID: 'billing-receipt-9' }).props.onPress());
  const select = async () => {
    act(() => tree.root.findByProps({ testID: 'billing-receipt-pick' }).props.onPress());
    await act(async () => tree.root.findByProps({ testID: `billing-receipt-source-${source}` }).props.onPress());
  };
  await select();
  expect(tree.root.findByProps({ testID: 'billing-receipt-file' })).toBeTruthy();
  expect(billingRequest.mock.calls.every(call => call.length === 1)).toBe(true);
  await select();
  expect(mockToast).not.toHaveBeenCalled();
  expect(tree.root.findByProps({ testID: 'billing-receipt-file' })).toBeTruthy();
  await select();
  expect(mockToast).toHaveBeenCalledWith({ type: 'error', message: expect.stringContaining('Permite el acceso') });
  expect(tree.root.findByProps({ testID: 'billing-receipt-file' })).toBeTruthy();
  expect(tree.root.findAllByType(AppButton).find(button => button.props.label === 'Enviar comprobante').props.disabled).toBe(false);
  await act(async () => tree.unmount());
});

it.each(['light', 'dark'])('shows unpaid status and disables purchase without COP tariffs in %s', async mode => {
  billingRequest.mockResolvedValue({ active: false, current: null, periods: [], catalog: [], orders: [], reports: [], bank: null, notice: { kind: 'unpaid' } });
  let tree;
  await act(async () => { tree = renderer.create(<BillingPanel theme={getTheme(mode)} accountId="12" />); });
  expect(billingRequest).toHaveBeenCalledWith('/accounts/12');
  const create = tree.root.findAllByType(AppButton).find(button => button.props.label === 'Solicitar activación o renovación');
  expect(create).toBeUndefined();
  await act(async () => tree.unmount());
});
it.each(['account', 'reports'])('opens private receipts inside the app from %s', async section => {
  billingRequest.mockImplementation(async path => path === '/admin/banks' ? { banks: [] } : {
    reports: [{ id: '7', orderId: '9', accountName: 'Account', amountCop: 50000, expectedAmountCop: 50000, status: 'pending_review' }],
    orders: [{ id: '9', status: 'pending_review', amountCop: 50000, durationDays: 30, snapshot: { items: [{ name: 'Espejo' }] } }], periods: [], banks: [],
  });
  let tree;
  await act(async () => { tree = renderer.create(<BillingPanel section={section} accountId="12" theme={getTheme('dark')} />); });
  if (section === 'account') act(() => tree.root.findByProps({ testID: 'billing-receipt-9' }).props.onPress());
  const view = tree.root.findAllByType(AppButton).find(button => button.props.label === 'Ver comprobante privado');
  await act(async () => view.props.onPress());
  expect(tree.root.findByType(PrivateReceiptModal).props.reportId).toBe('7');
  act(() => tree.root.findByType(PrivateReceiptModal).props.onClose());
  expect(tree.root.findAllByType(PrivateReceiptModal)).toHaveLength(0);
  if (section === 'account') expect(tree.root.findByType(FormModal)).toBeTruthy();
  await act(async () => tree.unmount());
});

it('keeps approval behind review and an explicit received-money confirmation', async () => {
  billingRequest.mockImplementation(async path => path.startsWith('/admin/reports') ? { reports: [{ id: '7', accountName: 'Account', amountCop: 50000, expectedAmountCop: 50000, status: 'pending_review', duplicateCount: 1 }] } : { banks: [] });
  let tree;
  await act(async () => { tree = renderer.create(<BillingPanel section="reports" theme={getTheme('dark')} />); });
  const button = name => tree.root.findAllByType(AppButton).find(item => item.props.label === name);
  expect(button('Verificar pago')).toBeUndefined();
  await act(async () => { await button('Revisar pago').props.onPress(); });
  expect(button('Verificar pago').props.disabled).toBe(true);
  expect(button('Rechazar reporte').props.disabled).toBe(true);
  act(() => {
    tree.root.findAllByType('Input').find(input => input.props.label === 'Referencia bancaria confirmada').props.onChangeText('BANK-TEST');
    tree.root.findAllByType(NativeSwitch).find(item => item.props.testID === 'billing-review-received').props.onValueChange(true);
    tree.root.findAllByType('Input').find(input => input.props.testID === 'billing-review-observations').props.onChangeText('Revisado contra movimiento bancario');
  });
  expect(button('Verificar pago').props.disabled).toBe(true);
  act(() => tree.root.findAllByType(NativeSwitch).find(item => item.props.testID === 'billing-review-duplicates').props.onValueChange(true));
  expect(button('Verificar pago').props.disabled).toBe(false);
  expect(tree.root.findAllByProps({ testID: 'billing-review-requirements' })).toHaveLength(0);
  await act(async () => button('Verificar pago').props.onPress());
  expect(billingRequest).toHaveBeenCalledWith('/admin/reports/7/review', 'POST', expect.objectContaining({ decision: 'approved', receivedAmountCop: 50000, bankReference: 'BANK-TEST', receivedConfirmed: true, duplicatesAcknowledged: true, observations: 'Revisado contra movimiento bancario' }));
  expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'success', message: 'Revisión del pago guardada.' }));
  await act(async () => tree.unmount());
});

it('saves optional notes separately from the required rejection reason and shows them in admin history', async () => {
  const report = { id: '7', accountName: 'Account', amountCop: 50000, expectedAmountCop: 50000, status: 'pending_review', duplicateCount: 0 };
  billingRequest.mockImplementation(async (path, method, payload) => {
    if (method === 'POST') { Object.assign(report, { status: 'rejected', reason: payload.reason, observations: payload.observations }); return { status: 'rejected' }; }
    return path.startsWith('/admin/reports') ? { reports: [report] } : { banks: [] };
  });
  let tree;
  await act(async () => { tree = renderer.create(<BillingPanel section="reports" theme={getTheme('light')} />); });
  const button = name => tree.root.findAllByType(AppButton).find(item => item.props.label === name);
  const input = name => tree.root.findAllByType('Input').find(item => item.props.label === name);
  await act(async () => button('Revisar pago').props.onPress());
  act(() => input('Observaciones (opcional)').props.onChangeText('Volver a revisar con el banco'));
  expect(button('Rechazar reporte').props.disabled).toBe(true);
  act(() => input('Motivo de rechazo').props.onChangeText('No se recibió la transferencia'));
  expect(button('Rechazar reporte').props.disabled).toBe(false);
  await act(async () => button('Rechazar reporte').props.onPress());
  expect(billingRequest).toHaveBeenCalledWith('/admin/reports/7/review', 'POST', { decision: 'rejected', reason: 'No se recibió la transferencia', observations: 'Volver a revisar con el banco' });
  expect(tree.root.findAllByType(Text).some(item => item.props.children === 'Observaciones: Volver a revisar con el banco')).toBe(true);
  await act(async () => tree.unmount());
});

it.each(['light', 'dark'])('keeps catalog editing in a safe modal, cancels locally and saves the existing contract in %s', async mode => {
  const entry = { modeId: '8', name: 'Espejo', features: ['A', 'B'], description: 'Mode', order: 1, implemented: true, available: true, prices: { 30: 50000, 365: 500000 } };
  billingRequest.mockResolvedValue({ catalog: [entry] });
  let tree;
  await act(async () => { tree = renderer.create(<BillingPanel section="catalog" theme={getTheme(mode)} />); });
  expect(tree.root.findByType(ManagementCard).props.title).toBe('Espejo');
  const edit = () => tree.root.findAllByType(AppButton).find(button => button.props.label === 'Editar');
  await act(async () => edit().props.onPress());
  const modal = () => tree.root.findByType(FormModal);
  expect(modal().props.testID).toBe('catalog-edit');
  act(() => modal().findAllByType('Input').find(input => input.props.label === 'Nombre').props.onChangeText('Updated'));
  expect(tree.root.findByType(ManagementCard).props.title).toBe('Espejo');
  act(() => modal().props.onClose());
  expect(billingRequest.mock.calls.every(call => call.length === 1)).toBe(true);
  await act(async () => edit().props.onPress());
  expect(modal().findAllByType('Input').find(input => input.props.label === 'Nombre').props.value).toBe('Espejo');
  act(() => modal().findAllByType('Input').find(input => input.props.label === 'Nombre').props.onChangeText('Updated'));
  await act(async () => modal().findAllByType(AppButton).find(button => button.props.label === 'Guardar').props.onPress());
  expect(billingRequest).toHaveBeenCalledWith('/admin/catalog/8', 'PUT', expect.objectContaining({ name: 'Updated', features: ['A', 'B'], prices: { 30: 50000, 365: 500000 } }));
  expect(tree.root.findAllByType(FormModal)).toHaveLength(0);
  await act(async () => tree.unmount());
});

it('cancels bank changes without writes and restores the last saved values on reopen', async () => {
  billingRequest.mockImplementation(async path => path.startsWith('/admin/reports') ? { reports: [] } : { banks: [{ ...mockBank, bank: 'Saved' }] });
  let tree;
  await act(async () => { tree = renderer.create(<BillingPanel section="reports" theme={getTheme('dark')} />); });
  expect(tree.root.findAllByType(FormModal)).toHaveLength(0);
  openBankEditor(tree);
  const bank = () => tree.root.findAllByType('Input').find(input => input.props.label === 'Banco');
  act(() => bank().props.onChangeText('Draft'));
  act(() => tree.root.findByType(FormModal).props.onClose());
  openBankEditor(tree);
  expect(bank().props.value).toBe('Saved');
  expect(billingRequest.mock.calls.every(call => call.length === 1)).toBe(true);
  await act(async () => tree.unmount());
});

it('creates a mode only after the modal is submitted', async () => {
  billingRequest.mockResolvedValue({ catalog: [] });
  let tree;
  await act(async () => { tree = renderer.create(<BillingPanel section="catalog" theme={getTheme('light')} />); });
  act(() => tree.root.findByProps({ testID: 'catalog-create-open' }).props.onPress());
  const modal = () => tree.root.findByType(FormModal);
  expect(modal().props.testID).toBe('catalog-create');
  expect(modal().findAllByType(AppButton).find(button => button.props.label === 'Guardar').props.disabled).toBe(true);
  act(() => {
    modal().findAllByType('Input').find(input => input.props.label === 'Nombre').props.onChangeText('New mode');
    modal().findAllByType('Input').find(input => input.props.label === 'Identificador técnico').props.onChangeText('new-mode');
  });
  expect(billingRequest.mock.calls.every(call => call.length === 1)).toBe(true);
  await act(async () => modal().findAllByType(AppButton).find(button => button.props.label === 'Guardar').props.onPress());
  expect(billingRequest).toHaveBeenCalledWith('/admin/catalog', 'POST', { name: 'New mode', slug: 'new-mode' });
  expect(tree.root.findAllByType(FormModal)).toHaveLength(0);
  await act(async () => tree.unmount());
});

it('toggles only the chosen transfer option and preserves its state on failure', async () => {
  let complete;
  billingRequest.mockImplementation(async (path, method) => {
    if (method === 'PATCH') return new Promise(resolve => { complete = resolve; });
    return path.startsWith('/admin/reports') ? { reports: [] } : { banks: [mockBank, { ...mockBank, id: '2', active: false }] };
  });
  let tree;
  await act(async () => { tree = renderer.create(<BillingPanel section="reports" theme={getTheme('light')} />); });
  act(() => tree.root.findByProps({ testID: 'billing-bank-open' }).props.onPress());
  const reel = () => tree.root.findByType(TransferBankList);
  await act(async () => { reel().props.onToggle(mockBank, false); });
  expect(billingRequest).toHaveBeenCalledWith('/admin/banks/1/active', 'PATCH', { active: false, revision: 1 });
  expect(reel().props.disabled).toBe(true);
  expect(reel().props.banks[0].active).toBe(true);
  await act(async () => complete({ bank: { ...mockBank, active: false, revision: 2 } }));
  expect(reel().props.banks.map(bank => bank.active)).toEqual([false, false]);
  billingRequest.mockRejectedValueOnce(new Error('Offline'));
  await act(async () => reel().props.onToggle(reel().props.banks[1], true));
  expect(reel().props.banks[1].active).toBe(false);
  expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
  await act(async () => tree.unmount());
});

it('adds a second destination without replacing the first', async () => {
  billingRequest.mockImplementation(async (path, method, body) => {
    if (method === 'POST') return { bank: { ...body, id: '2', revision: 1 } };
    return path.startsWith('/admin/reports') ? { reports: [] } : { banks: [mockBank] };
  });
  let tree;
  await act(async () => { tree = renderer.create(<BillingPanel section="reports" theme={getTheme('dark')} />); });
  act(() => tree.root.findByProps({ testID: 'billing-bank-open' }).props.onPress());
  act(() => tree.root.findByProps({ testID: 'billing-bank-add' }).props.onPress());
  const save = () => tree.root.findAllByType(AppButton).find(button => button.props.label === 'Guardar datos bancarios');
  expect(save().props.disabled).toBe(true);
  act(() => tree.root.findAllByType('Input').filter(input => input.props.label !== 'Buscar cuenta').forEach(input => input.props.onChangeText('New data')));
  await act(async () => save().props.onPress());
  expect(billingRequest).toHaveBeenCalledWith('/admin/banks', 'POST', expect.objectContaining({ active: true, bank: 'New data' }));
  expect(tree.root.findByType(TransferBankList).props.banks.map(bank => bank.id)).toEqual(['1', '2']);
  expect(tree.root.findByType(TransferBankList).props.banks[0]).toEqual(mockBank);
  await act(async () => tree.unmount());
});

it('shows multiple active destinations as information without selecting or creating an order', async () => {
  billingRequest.mockResolvedValue({ active: false, periods: [], reports: [], orders: [], banks: [mockBank, { ...mockBank, id: '2' }] });
  let tree;
  await act(async () => { tree = renderer.create(<BillingPanel section="account" accountId="12" theme={getTheme('light')} />); });
  const reel = tree.root.findByType(TransferBankCarousel);
  expect(reel.props.banks).toHaveLength(2);
  expect(reel.props.onSelect).toBeUndefined();
  expect(reel.props.onToggle).toBeUndefined();
  expect(billingRequest.mock.calls.every(call => call.length === 1)).toBe(true);
  await act(async () => tree.unmount());
});
it('does not offer a deactivated historical destination for new transfers', async () => {
  billingRequest.mockResolvedValue({ active: false, periods: [], reports: [], banks: [], orders: [{ id: '1', status: 'pending_review', durationDays: 30, amountCop: 50000, snapshot: { items: [{ name: 'Espejo' }], bank: mockBank } }] });
  let tree;
  await act(async () => { tree = renderer.create(<BillingPanel section="account" accountId="12" theme={getTheme('dark')} />); });
  const reel = tree.root.findByType(TransferBankCarousel);
  expect(reel.props.banks).toEqual([]);
  expect(reel.props.onSelect).toBeUndefined();
  expect(reel.props.onToggle).toBeUndefined();
  await act(async () => tree.unmount());
});
