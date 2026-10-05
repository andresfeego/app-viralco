import React from 'react';
import { FlatList, StyleSheet } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import { SuperAdminUsersScreen } from '../src/screens/SuperAdminUsersScreen';
import { SelectableChipGroup } from '../src/components/SelectableChipGroup';
import { HorizontalSubMenu } from '../src/components/HorizontalSubMenu';
import { useAuth } from '../src/hooks/useAuth';
import { useCan } from '../src/hooks/useCan';
import { createAdminUserApi, listAdminUsersApi, listBitacoraApi, updateUserStatusApi } from '../src/services/api/admin';
import { PaperFormInput } from '../src/components/PaperFormInput';
import { PaperDateInput } from '../src/components/PaperDateInput';
import { FormModal } from '../src/components/FormModal';
import { AppButton } from '../src/design-system/components/AppButton';
import { ManagementCard } from '../src/components/ManagementCard';
import { setLocale, t } from '../src/i18n';

jest.mock('@react-native-vector-icons/fontawesome6', () => 'Icon');
jest.mock('../src/providers/ToastProvider', () => ({ ToastViewport: () => null, useToast: () => ({ showToast: jest.fn() }) }));
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View, useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }) }));
jest.mock('../src/hooks/useAuth', () => ({ useAuth: jest.fn() }));
jest.mock('../src/hooks/useCan', () => ({ useCan: jest.fn() }));
jest.mock('../src/components/BillingPanel', () => ({ BillingPanel: 'BillingPanel' }));
jest.mock('../src/services/api/admin', () => ({ createAdminUserApi: jest.fn(), listAdminUsersApi: jest.fn(), listBitacoraApi: jest.fn(), updateUserStatusApi: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  useCan.mockReturnValue(true);
  listAdminUsersApi.mockResolvedValue({ users: [] });
  listBitacoraApi.mockResolvedValue({ items: [{ id: '1', resultado: 'success', accion: 'Acción correcta' }, { id: '2', resultado: 'fail', accion: 'Acción fallida' }], page: 1, hasMore: false });
});
afterEach(() => setLocale('es'));

it.each(['light', 'dark'])('filters audit results with the shared outlined chips in %s', async themeMode => {
  useAuth.mockReturnValue({ user: { id: '1', themeMode, globalRoles: [{ slug: 'super_admin' }] } });
  let tree;
  await act(async () => { tree = renderer.create(<SuperAdminUsersScreen />); });
  await act(async () => tree.root.findByType(HorizontalSubMenu).props.onSelect('bitacora'));
  const filter = () => tree.root.findByType(SelectableChipGroup);
  expect(filter().props).toMatchObject({ testID: 'audit-result-filter', variant: 'outlined', value: 'all' });
  expect(filter().props.options.map(option => option.value)).toEqual(['all', 'success', 'fail']);
  expect(tree.root.findByType(FlatList).props.data).toHaveLength(2);
  for (const result of ['success', 'fail']) {
    await act(async () => tree.root.findByProps({ testID: `audit-result-filter-${result}` }).props.onPress());
    expect(filter().props.value).toBe(result);
    expect(tree.root.findByType(FlatList).props.data.map(item => item.resultado)).toEqual([result]);
  }
  await act(async () => tree.root.findByProps({ testID: 'audit-result-filter-all' }).props.onPress());
  expect(tree.root.findByType(FlatList).props.data).toHaveLength(2);
  expect(listBitacoraApi).toHaveBeenCalledTimes(1);
  await act(async () => tree.root.findByProps({ testID: 'audit-result-filter-fail' }).props.onPress());
  expect(tree.root.findByType(FlatList).props.alwaysBounceVertical).toBe(true);
  await act(async () => tree.root.findByType(FlatList).props.refreshControl.props.onRefresh());
  expect(listBitacoraApi).toHaveBeenCalledTimes(2);
  expect(listBitacoraApi).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }));
  expect(filter().props.value).toBe('fail');
  expect(tree.root.findByType(FlatList).props.data.map(item => item.resultado)).toEqual(['fail']);
  await act(async () => tree.unmount());
});

it.each([['light', 'es'], ['dark', 'en']])('groups users, searches without writes and creates from the shared modal in %s/%s', async (themeMode, locale) => {
  setLocale(locale);
  useAuth.mockReturnValue({ user: { id: '1', themeMode, globalRoles: [{ slug: 'super_admin' }] } });
  listAdminUsersApi.mockResolvedValue({ users: [{ id: '1', name: 'Ana', email: 'a-very-long-email@long-company.example', status: { slug: 'active' } }, { id: '2', name: 'Bob', email: 'bob@example.com', status: { slug: 'suspended' } }] });
  let tree;
  await act(async () => { tree = renderer.create(<SuperAdminUsersScreen />); });
  expect(tree.root.findByType(HorizontalSubMenu).props.items.map(item => item.key)).toEqual(['usuarios', 'catalog', 'reports', 'bitacora']);
  expect(tree.root.findAllByType(ManagementCard)).toHaveLength(2);
  act(() => tree.root.findByProps({ testID: 'admin-user-search' }).props.onChangeText('ANA'));
  expect(tree.root.findByType(FlatList).props.data.map(item => item.id)).toEqual(['1']);
  expect(updateUserStatusApi).not.toHaveBeenCalled();
  await act(async () => tree.root.findByProps({ testID: 'admin-status-1' }).props.onPress());
  expect(updateUserStatusApi).toHaveBeenCalledWith('1', 'suspended');
  act(() => tree.root.findByProps({ testID: 'admin-user-create-open' }).props.onPress());
  const form = () => tree.root.findByType(FormModal);
  expect(form().props).toMatchObject({ visible: true, testID: 'admin-user-create' });
  const values = [t('auth_001'), t('auth_002'), t('auth_003'), t('auth_temporary_password')];
  act(() => values.forEach((label, index) => form().findAllByType(PaperFormInput).find(input => input.props.label === label).props.onChangeText(['New admin', '123', 'new@example.com', 'test-password'][index])));
  expect(createAdminUserApi).not.toHaveBeenCalled();
  await act(async () => form().findAllByType(AppButton).find(button => button.props.label === t('auth_admin_create')).props.onPress());
  expect(createAdminUserApi).toHaveBeenCalledWith({ name: 'New admin', phone: '123', email: 'new@example.com', password: 'test-password' });
  expect(form().props.visible).toBe(false);
  await act(async () => tree.unmount());
});

it('keeps audit filters inside the scroll, supports date reset and hides technical data until requested', async () => {
  useAuth.mockReturnValue({ user: { id: '1', themeMode: 'dark', globalRoles: [{ slug: 'super_admin' }] } });
  let tree;
  await act(async () => { tree = renderer.create(<SuperAdminUsersScreen />); });
  await act(async () => tree.root.findByType(HorizontalSubMenu).props.onSelect('bitacora'));
  const list = tree.root.findByType(FlatList);
  expect(list.props.ListHeaderComponent).toBeTruthy();
  await act(async () => tree.root.findAllByType(PaperDateInput).find(input => input.props.testID === 'audit-from').props.onChangeDate('2026-10-01'));
  expect(listBitacoraApi).toHaveBeenLastCalledWith(expect.objectContaining({ startDate: '2026-10-01' }));
  act(() => tree.root.findByProps({ testID: 'audit-open-1' }).props.onPress());
  expect(tree.root.findAllByProps({ testID: 'audit-technical-data' })).toHaveLength(0);
  act(() => tree.root.findByProps({ testID: 'audit-technical-toggle' }).props.onPress());
  expect(tree.root.findAllByProps({ testID: 'audit-technical-data' }).length).toBeGreaterThan(0);
  const modal = tree.root.findAllByType(FormModal).find(item => item.props.testID === 'admin-audit-detail');
  expect(StyleSheet.flatten(modal.findByProps({ testID: 'admin-audit-detail-sheet' }).props.style).flex).toBe(1);
  await act(async () => tree.unmount());
});

it('does not expose admin filters to a normal account owner', async () => {
  useAuth.mockReturnValue({ user: { id: '2', themeMode: 'light', globalRoles: [] } });
  let tree;
  await act(async () => { tree = renderer.create(<SuperAdminUsersScreen />); });
  expect(tree.root.findAllByType(SelectableChipGroup)).toHaveLength(0);
  expect(listBitacoraApi).not.toHaveBeenCalled();
  await act(async () => tree.unmount());
});
