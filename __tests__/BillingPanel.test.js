import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { BillingPanel } from '../src/components/BillingPanel';
import { AppButton } from '../src/design-system/components/AppButton';
import { billingRequest } from '../src/services/api/billing';
import { getTheme } from '../src/design-system/theme';
import { DestructiveConfirmationModal } from '../src/components/DestructiveConfirmationModal';
import { SelectableChipGroup } from '../src/components/SelectableChipGroup';
import { FormModal } from '../src/components/FormModal';
import { ManagementCard } from '../src/components/ManagementCard';
import { TransferBankCarousel } from '../src/components/TransferBankCarousel';
import { ScrollView, RefreshControl } from 'react-native';
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
jest.mock('react-native-paper', () => ({ Checkbox: { Item: 'CheckboxItem' }, Switch: 'Switch' }));
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
it('restores the annual signup preference and submits that duration with the selected modes', async () => {
  billingRequest.mockResolvedValue({ active: false, periods: [], orders: [], reports: [], bank: {}, preference: { durationDays: 365, modeSlugs: ['espejo'] }, catalog: [{ modeId: '1', slug: 'espejo', name: 'Espejo', available: true, implemented: true, prices: { 30: 70000, 365: 700000 } }] });
  let tree;
  await act(async () => { tree = renderer.create(<BillingPanel theme={getTheme('dark')} accountId="12" />); });
  expect(tree.root.findByProps({ testID: 'billing-period-switch' }).props.value).toBe(true);
  const create = () => tree.root.findAllByType(AppButton).find(button => button.props.label === 'Solicitar activación o renovación');
  await act(async () => { await create().props.onPress(); });
  expect(billingRequest).toHaveBeenCalledWith('/accounts/12/orders', 'POST', { durationDays: 365, modeIds: ['1'] });
  await act(async () => { tree.root.findByProps({ testID: 'billing-period-switch' }).props.onValueChange(false); });
  await act(async () => { await create().props.onPress(); });
  expect(billingRequest).toHaveBeenCalledWith('/accounts/12/orders', 'POST', { durationDays: 30, modeIds: ['1'] });
  await act(async () => tree.unmount());
});
it.each(['light', 'dark'])('shows unpaid status and disables purchase without COP tariffs in %s', async mode => {
  billingRequest.mockResolvedValue({ active: false, current: null, periods: [], catalog: [], orders: [], reports: [], bank: null, notice: { kind: 'unpaid' } });
  let tree;
  await act(async () => { tree = renderer.create(<BillingPanel theme={getTheme(mode)} accountId="12" />); });
  expect(billingRequest).toHaveBeenCalledWith('/accounts/12');
  const create = tree.root.findAllByType(AppButton).find(button => button.props.label === 'Solicitar activación o renovación');
  expect(create.props.disabled).toBe(true);
  await act(async () => tree.unmount());
});
it('keeps approval behind review and an explicit received-money confirmation', async () => {
  billingRequest.mockImplementation(async path => path.startsWith('/admin/reports') ? { reports: [{ id: '7', accountName: 'Account', amountCop: 50000, expectedAmountCop: 50000, status: 'pending_review', duplicateCount: 1 }] } : { banks: [] });
  let tree;
  await act(async () => { tree = renderer.create(<BillingPanel section="reports" theme={getTheme('dark')} />); });
  const button = name => tree.root.findAllByType(AppButton).find(item => item.props.label === name);
  expect(button('Aprobar y conceder período')).toBeUndefined();
  await act(async () => { await button('Revisar pago').props.onPress(); });
  expect(button('Aprobar y conceder período').props.disabled).toBe(true);
  expect(button('Rechazar reporte').props.disabled).toBe(true);
  act(() => {
    tree.root.findAllByType('Input').find(input => input.props.label === 'Referencia bancaria confirmada').props.onChangeText('BANK-TEST');
    tree.root.findAllByType('CheckboxItem').find(item => item.props.label === 'Confirmo que recibimos el dinero en el banco').props.onPress();
  });
  expect(button('Aprobar y conceder período').props.disabled).toBe(true);
  act(() => tree.root.findAllByType('CheckboxItem').find(item => item.props.label === 'Revisé la advertencia de duplicados').props.onPress());
  expect(button('Aprobar y conceder período').props.disabled).toBe(false);
  await act(async () => button('Aprobar y conceder período').props.onPress());
  expect(billingRequest).toHaveBeenCalledWith('/admin/reports/7/review', 'POST', expect.objectContaining({ decision: 'approved', receivedAmountCop: 50000, bankReference: 'BANK-TEST', receivedConfirmed: true, duplicatesAcknowledged: true }));
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
  const reel = () => tree.root.findByType(TransferBankCarousel);
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
  expect(tree.root.findByType(TransferBankCarousel).props.banks.map(bank => bank.id)).toEqual(['1', '2']);
  expect(tree.root.findByType(TransferBankCarousel).props.banks[0]).toEqual(mockBank);
  await act(async () => tree.unmount());
});

it('requires choosing a destination when several are active and submits its ID', async () => {
  const payload = { active: false, periods: [], reports: [], orders: [], banks: [mockBank, { ...mockBank, id: '2' }], preference: { durationDays: 30, modeSlugs: ['espejo'] }, catalog: [{ modeId: '1', slug: 'espejo', name: 'Espejo', available: true, implemented: true, prices: { 30: 50000, 365: 500000 } }] };
  billingRequest.mockResolvedValue(payload);
  let tree;
  await act(async () => { tree = renderer.create(<BillingPanel section="account" accountId="12" theme={getTheme('light')} />); });
  const request = () => tree.root.findAllByType(AppButton).find(button => button.props.label === 'Solicitar activación o renovación');
  expect(request().props.disabled).toBe(true);
  act(() => tree.root.findByType(TransferBankCarousel).props.onSelect('2'));
  expect(request().props.disabled).toBe(false);
  await act(async () => request().props.onPress());
  expect(billingRequest).toHaveBeenCalledWith('/accounts/12/orders', 'POST', { durationDays: 30, modeIds: ['1'], bankId: '2' });
  billingRequest.mockResolvedValue({ ...payload, banks: [] });
  await act(async () => tree.root.findByType(RefreshControl).props.onRefresh());
  expect(request().props.disabled).toBe(true);
  await act(async () => tree.unmount());
});

it('shows an existing order destination even if no current transfer options remain active', async () => {
  billingRequest.mockResolvedValue({ active: false, periods: [], reports: [], banks: [], orders: [{ id: '1', status: 'pending_review', durationDays: 30, amountCop: 50000, snapshot: { items: [{ name: 'Espejo' }], bank: mockBank } }] });
  let tree;
  await act(async () => { tree = renderer.create(<BillingPanel section="account" accountId="12" theme={getTheme('dark')} />); });
  const reel = tree.root.findByType(TransferBankCarousel);
  expect(reel.props.banks).toEqual([mockBank]);
  expect(reel.props.onSelect).toBeUndefined();
  expect(reel.props.onToggle).toBeUndefined();
  await act(async () => tree.unmount());
});
