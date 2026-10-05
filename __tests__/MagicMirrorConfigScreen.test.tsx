import React from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { LaunchPatternGate } from '../src/components/LaunchPatternGate';
import { setMirrorRecoveryApi } from '../src/services/api/events';
import ReactTestRenderer from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';

jest.mock('@react-native-vector-icons/fontawesome6', () => 'Icon');
jest.mock('react-native-video', () => 'Video');
jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map();
  return { getItem: jest.fn((key) => Promise.resolve(store.get(key) || null)), setItem: jest.fn((key, value) => { store.set(key, value); return Promise.resolve(); }), removeItem: jest.fn((key) => { store.delete(key); return Promise.resolve(); }), clear: jest.fn(() => { store.clear(); return Promise.resolve(); }) };
});
jest.mock('react-native-paper', () => {
  const actual = jest.requireActual('react-native-paper');
  return { ...actual, TextInput: 'PaperTextInput', HelperText: 'HelperText' };
});
jest.mock('../src/hooks/useAuth', () => ({ useAuth: jest.fn() }));
jest.mock('../src/providers/ToastProvider', () => ({ useToast: jest.fn(), ToastViewport: () => null }));
jest.mock('../src/services/api/events', () => ({
  createAccountPhotoLayoutTemplateApi: jest.fn(),
  createEventResourceApi: jest.fn(), deleteEventResourceApi: jest.fn(),
  getMagicMirrorConfigApi: jest.fn(), getPublishedMagicMirrorConfigApi: jest.fn(), getAccountPhotoLayoutTemplateApi: jest.fn(),
  listAccountLibraryApi: jest.fn(), listEventResourcesApi: jest.fn(), listEventTypesApi: jest.fn(() => Promise.resolve({ types: [] })),
  publishMagicMirrorConfigApi: jest.fn(), saveMagicMirrorConfigApi: jest.fn(),
  setMirrorRecoveryApi: jest.fn(),
  updateAccountLibraryFavoriteApi: jest.fn(), uploadAccountLibraryFileApi: jest.fn(),
  validateMagicMirrorConfigApi: jest.fn(),
}));
jest.mock('../src/services/media/documentPicker', () => ({ pickLibraryResourceFile: jest.fn() }));
jest.mock('../src/services/media/resourcePicker', () => ({ ...jest.requireActual('../src/services/media/resourcePicker'), pickResourceFromDevice: jest.fn() }));

import { DesignAssetCarousel } from '../src/components/DesignAssetCarousel';
import { DesignAssetGrid } from '../src/components/DesignAssetGrid';
import { BackgroundColorPicker } from '../src/components/BackgroundColorPicker';
import { MirrorBackgroundEditor } from '../src/components/MirrorBackgroundEditor';
import { MirrorFrameEditor } from '../src/components/MirrorFrameEditor';
import { MirrorConfigPreview } from '../src/components/MirrorConfigPreview';
import { MirrorLayoutEditor } from '../src/components/MirrorLayoutEditor';
import { MirrorStickerEditor } from '../src/components/MirrorStickerEditor';
import { MirrorTextLayerEditor } from '../src/components/MirrorTextLayerEditor';
import { MirrorAnimationStageCard } from '../src/components/MirrorAnimationStageCard';
import { MirrorConfigurationSummary } from '../src/components/MirrorConfigurationSummary';
import { HorizontalSubMenu } from '../src/components/HorizontalSubMenu';
import { CaptureTimeSlider } from '../src/components/CaptureTimeSlider';
import { CameraLensPreview } from '../src/components/CameraLensPreview';
import { ResourceUploadModal } from '../src/components/ResourceUploadModal';
import { pickResourceFromDevice } from '../src/services/media/resourcePicker';
import { applyMirrorFormat, defaultMirrorConfig, moveSlots } from '../src/domain/magicMirrorConfig';
import { useAuth } from '../src/hooks/useAuth';
import { useToast } from '../src/providers/ToastProvider';
import {
  createAccountPhotoLayoutTemplateApi,
  createEventResourceApi,
  deleteEventResourceApi,
  getMagicMirrorConfigApi,
  getAccountPhotoLayoutTemplateApi,
  getPublishedMagicMirrorConfigApi,
  listAccountLibraryApi,
  listEventResourcesApi,
  publishMagicMirrorConfigApi,
  saveMagicMirrorConfigApi,
  validateMagicMirrorConfigApi,
  uploadAccountLibraryFileApi,
  updateAccountLibraryFavoriteApi,
} from '../src/services/api/events';
import { MagicMirrorConfigScreen } from '../src/screens/MagicMirrorConfigScreen';
import { tokens } from '../src/design-system/tokens';
import { getTheme } from '../src/design-system/theme';

const account = { id: '10', name: 'Cuenta' };
const event = { id: '20', accountId: '10', name: 'Boda', eventDate: '2026-09-01' };
const eventMode = { id: '30', mode: { slug: 'espejo' }, isActive: true };
const mockedAuth = useAuth as jest.Mock;
const mockedToast = useToast as jest.Mock;
const safeAreaMetrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

function screen() {
  return (
    <SafeAreaProvider initialMetrics={safeAreaMetrics}>
      <MagicMirrorConfigScreen event={event} eventMode={eventMode} accountId="10" onBack={jest.fn()} />
    </SafeAreaProvider>
  );
}

async function flush() {
  await ReactTestRenderer.act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
}

function owner() {
  mockedAuth.mockReturnValue({ user: { themeMode: 'light', globalRoles: [], accounts: [{ account, status: 'active', role: { slug: 'owner' } }] } });
}

function changeFormat(renderer: ReactTestRenderer.ReactTestRenderer, format: string) {
  const editor = renderer.root.findByType(MirrorLayoutEditor);
  ReactTestRenderer.act(() => editor.props.onChange(applyMirrorFormat(editor.props.config, format)));
}

beforeEach(() => {
  jest.clearAllMocks();
  AsyncStorage.clear();
  owner();
  mockedToast.mockReturnValue({ showToast: jest.fn(), hideToast: jest.fn() });
  (getMagicMirrorConfigApi as jest.Mock).mockResolvedValue({ config: { revision: 2, config: defaultMirrorConfig(), publishedVersionId: null } });
  (getPublishedMagicMirrorConfigApi as jest.Mock).mockResolvedValue({ version: { id: '90', version: 1, config: defaultMirrorConfig() }, manifest: [] });
  (listEventResourcesApi as jest.Mock).mockResolvedValue({ resources: [] });
  (listAccountLibraryApi as jest.Mock).mockResolvedValue({ library: [], pagination: { page: 1, pageCount: 0 } });
  (deleteEventResourceApi as jest.Mock).mockResolvedValue({ deleted: true });
  (saveMagicMirrorConfigApi as jest.Mock).mockImplementation((_eventId, _modeId, input) => Promise.resolve({ config: { revision: input.expectedRevision + 1, config: input.config } }));
  (validateMagicMirrorConfigApi as jest.Mock).mockResolvedValue({ valid: true, errors: [], warnings: [] });
  (publishMagicMirrorConfigApi as jest.Mock).mockResolvedValue({ version: { id: '91', version: 2, config: defaultMirrorConfig() } });
  (getAccountPhotoLayoutTemplateApi as jest.Mock).mockResolvedValue({
    asset: { id: '329', name: 'Recuerdo clasico', type: 'template' },
    template: {
      contentHash: 'preset-hash',
      config: { baseFormat: 'personalizar-5x15', output: { width: 2000, height: 2960 }, shotCount: 2, order: [1, 2], slots: [{ slotId: 'slot-1', photoNumber: 1, x: 10, y: 10, width: 80, height: 35, rotation: 0 }, { slotId: 'slot-2', photoNumber: 2, x: 10, y: 55, width: 80, height: 35, rotation: 0 }], duplicateStrip: false },
    },
  });
  (createAccountPhotoLayoutTemplateApi as jest.Mock).mockResolvedValue({ asset: { id: '100', type: 'template' } });
});

test.each(['sticker', 'frame', 'background', 'animation', 'font'])('routes %s device uploads by purpose without changing the event draft', async purpose => {
  const file = { uri: 'file:///resource.png', fileName: 'resource.png', type: 'image/png', fileSize: 100 };
  (pickResourceFromDevice as jest.Mock).mockResolvedValue(file);
  (uploadAccountLibraryFileApi as jest.Mock).mockResolvedValue({ id: '99' });
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(screen()); });
  await flush();
  const source = purpose === 'font' ? 'files' : 'gallery';
  await ReactTestRenderer.act(async () => renderer!.root.findByType(ResourceUploadModal).props.onUpload(purpose, source));
  expect(pickResourceFromDevice).toHaveBeenCalledWith(purpose, source, { staticOnly: purpose === 'sticker' });
  expect(uploadAccountLibraryFileApi).toHaveBeenCalledWith('10', file, purpose, expect.any(Function));
  expect(updateAccountLibraryFavoriteApi).toHaveBeenCalledWith('10', '99', true);
  expect(saveMagicMirrorConfigApi).not.toHaveBeenCalled();
  expect(renderer!.root.findByType(ResourceUploadModal).props.disabled).toBe(false);
  await ReactTestRenderer.act(async () => renderer!.unmount());
});

test('uses the event name as the configurator header title', async () => {
  const onHeaderChange = jest.fn();
  await ReactTestRenderer.act(async () => {
    ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <MagicMirrorConfigScreen
          event={event}
          eventMode={eventMode}
          accountId="10"
          onBack={jest.fn()}
          onHeaderChange={onHeaderChange}
        />
      </SafeAreaProvider>,
    );
  });
  expect(onHeaderChange).toHaveBeenCalledWith(expect.objectContaining({
    title: 'Boda',
    subtitle: 'Configurar Espejo magico',
  }));
});

test('owner sets recovery from Operation independently of saving or publishing the design', async () => {
  (setMirrorRecoveryApi as jest.Mock).mockResolvedValue({ configured: true });
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(screen()); });
  await flush();
  ReactTestRenderer.act(() => renderer!.root.findByProps({ selectedKey: 'design' }).props.onSelect('operation'));
  const action = renderer!.root.findAll(node => node.props.label === 'Recuperación de acceso' && typeof node.props.onPress === 'function')[0];
  ReactTestRenderer.act(() => action.props.onPress());
  await ReactTestRenderer.act(async () => renderer!.root.findByType(LaunchPatternGate).props.onReady([0, 1, 2, 5]));
  expect(setMirrorRecoveryApi).toHaveBeenCalledWith('20', '30', [0, 1, 2, 5]);
  expect(saveMagicMirrorConfigApi).not.toHaveBeenCalled();
  expect(publishMagicMirrorConfigApi).not.toHaveBeenCalled();
});

test('shows only the four supported animation stages and excludes countdown', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(screen()); });
  await flush();
  const mainMenu = renderer!.root.findAllByType(HorizontalSubMenu)[0];
  ReactTestRenderer.act(() => mainMenu.props.onSelect('experience'));
  const stages = renderer!.root.findAllByType(MirrorAnimationStageCard).map((node) => node.props.stage);
  expect(stages).toEqual(['start', 'beforeCountdown', 'afterCapture', 'processing']);
  expect(stages).not.toContain('countdown');
});

test('presents capture settings in timing, lens, quality and other cards without roaming mode', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(screen()); });
  await flush();
  ReactTestRenderer.act(() => renderer!.root.findAllByType(HorizontalSubMenu)[0].props.onSelect('capture'));
  expect(renderer!.root.findAllByType(CaptureTimeSlider)).toHaveLength(3);
  expect(renderer!.root.findAllByType(CameraLensPreview)).toHaveLength(1);
  const cameraPreview = renderer!.root.findByProps({ testID: 'camera-preview' });
  expect(cameraPreview.props.device).toBe('back');
  expect(cameraPreview.props.orientationSource).toBe('custom');
  expect(cameraPreview.props.enableDistortionCorrection).toBeUndefined();
  const text = renderer!.root.findAllByType(Text).map((node) => node.props.children).flat(Infinity).join(' ');
  expect(text).toContain('Tiempos');
  expect(text).toContain('Otros');
  expect(text).not.toContain('Modo itinerante');
});

test('no longer offers automatic reset in operator configuration', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(screen()); });
  await flush();
  ReactTestRenderer.act(() => renderer!.root.findAllByType(HorizontalSubMenu)[0].props.onSelect('operation'));
  const slider = renderer!.root.findAllByType(CaptureTimeSlider).find((node) => node.props.testID === 'runtime-auto-reset');
  expect(slider).toBeUndefined();
});

test.each(['light', 'dark'])('keeps capture and print selections editable with outlined chips in %s', async themeMode => {
  mockedAuth.mockReturnValue({ user: { themeMode, globalRoles: [], accounts: [{ account, status: 'active', role: { slug: 'owner' } }] } });
  const config = defaultMirrorConfig();
  config.print.profileResourceId = '71';
  (getMagicMirrorConfigApi as jest.Mock).mockResolvedValue({ config: { revision: 2, config } });
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(screen()); });
  await flush();
  ReactTestRenderer.act(() => renderer!.root.findAllByType(HorizontalSubMenu)[0].props.onSelect('capture'));
  for (const [id, value] of [['mirror-capture-lens', 'ultra-wide'], ['mirror-capture-quality', 'superior']]) {
    expect(renderer!.root.findByProps({ testID: id }).props).toMatchObject({ variant: 'outlined', disabled: false, backgroundColor: getTheme(themeMode).surface });
    ReactTestRenderer.act(() => renderer!.root.findByProps({ testID: `${id}-${value}` }).props.onPress());
    expect(renderer!.root.findByProps({ testID: id }).props.value).toBe(value);
  }
  expect(renderer!.root.findByType(CameraLensPreview).props.lens).toBe('ultra-wide');
  ReactTestRenderer.act(() => renderer!.root.findAllByType(HorizontalSubMenu)[0].props.onSelect('operation'));
  for (const [id, value] of [['mirror-print-orientation', 'landscape'], ['mirror-print-fit', 'cover']]) {
    expect(renderer!.root.findByProps({ testID: id }).props).toMatchObject({ variant: 'outlined', disabled: false, backgroundColor: getTheme(themeMode).surface });
    ReactTestRenderer.act(() => renderer!.root.findByProps({ testID: `${id}-${value}` }).props.onPress());
    expect(renderer!.root.findByProps({ testID: id }).props.value).toBe(value);
  }
  ReactTestRenderer.act(() => renderer!.root.findAllByType(HorizontalSubMenu)[0].props.onSelect('review'));
  await ReactTestRenderer.act(async () => renderer!.root.findByProps({ testID: 'mirror-save' }).props.onPress());
  expect(saveMagicMirrorConfigApi).toHaveBeenCalledWith('20', '30', expect.objectContaining({ config: expect.objectContaining({
    capture: expect.objectContaining({ lens: 'ultra-wide', quality: 'superior' }),
    print: expect.objectContaining({ orientation: 'landscape', fit: 'cover', profileResourceId: '71' }),
  }) }));
  ReactTestRenderer.act(() => renderer!.unmount());
});

test('keeps outlined capture and print selectors disabled for operators', async () => {
  mockedAuth.mockReturnValue({ user: { themeMode: 'dark', globalRoles: [], accounts: [{ account, status: 'active', role: { slug: 'operator' } }] } });
  const config = defaultMirrorConfig();
  config.print.profileResourceId = '71';
  (getPublishedMagicMirrorConfigApi as jest.Mock).mockResolvedValue({ version: { id: '90', version: 1, config }, manifest: [] });
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(screen()); });
  await flush();
  for (const [section, ids] of [['capture', ['mirror-capture-lens', 'mirror-capture-quality']], ['operation', ['mirror-print-orientation', 'mirror-print-fit']]] as const) {
    ReactTestRenderer.act(() => renderer!.root.findAllByType(HorizontalSubMenu)[0].props.onSelect(section));
    ids.forEach(testID => expect(renderer!.root.findByProps({ testID }).props).toMatchObject({ variant: 'outlined', disabled: true }));
  }
  expect(saveMagicMirrorConfigApi).not.toHaveBeenCalled();
  ReactTestRenderer.act(() => renderer!.unmount());
});

test('applies a photo layout template locally without saving or creating an event resource', async () => {
  const item = { id: '', libraryAssetId: '329', displayName: null, asset: { id: '329', name: 'Recuerdo clasico', type: 'template', mimeType: 'application/vnd.kaptura.photo-layout+json' } };
  (listAccountLibraryApi as jest.Mock).mockImplementation((_accountId, query) => Promise.resolve({ library: query.type === 'template' ? [item] : [], pagination: { page: 1, pageCount: 1 } }));
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(screen()); });
  await flush();
  expect(renderer!.root.findAllByType(DesignAssetCarousel).map((node) => node.props.label)).toContain('Global');
  expect(renderer!.root.findAllByType(DesignAssetGrid).map((node) => node.props.label)).toContain('Favoritos');
  const globalTemplates = renderer!.root.findAllByType(DesignAssetCarousel).find((node) => node.props.label === 'Global');
  await ReactTestRenderer.act(async () => globalTemplates!.props.onSelect(item));
  expect(getAccountPhotoLayoutTemplateApi).toHaveBeenCalledWith('10', '329');
  expect(saveMagicMirrorConfigApi).not.toHaveBeenCalled();
  expect(createEventResourceApi).not.toHaveBeenCalled();
  expect(renderer!.root.findByType(MirrorConfigPreview).props.config.layout.format).toBe('personalizar-5x15');
  expect(renderer!.root.findByType(MirrorConfigPreview).props.config.layout.shotCount).toBe(2);
  expect(renderer!.root.findByType(MirrorConfigPreview).props.config.layout.presetOrigin).toEqual(expect.objectContaining({ libraryAssetId: '329', source: 'global' }));
  const favoriteTemplates = renderer!.root.findAllByType(DesignAssetGrid).find((node) => node.props.label === 'Favoritos');
  await ReactTestRenderer.act(async () => favoriteTemplates!.props.onSelect(item));
  expect(renderer!.root.findByType(MirrorConfigPreview).props.config.layout.presetOrigin).toEqual(expect.objectContaining({ libraryAssetId: '329', source: 'favorite' }));
});

test('owner changes a prototype format and saves with the expected revision', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(screen()); });
  await flush();
  changeFormat(renderer!, 'collage');
  ReactTestRenderer.act(() => renderer!.root.findByProps({ selectedKey: 'design' }).props.onSelect('review'));
  await ReactTestRenderer.act(async () => renderer!.root.findByProps({ testID: 'mirror-save' }).props.onPress());
  expect(saveMagicMirrorConfigApi).toHaveBeenCalledWith('20', '30', expect.objectContaining({ expectedRevision: 2, config: expect.objectContaining({ layout: expect.objectContaining({ format: 'personalizar-5x15', shotCount: 4, output: { width: 2000, height: 2960 } }) }) }));
});

test('moving an applied template immediately turns it into a personalized layout', async () => {
  const applied = applyMirrorFormat(defaultMirrorConfig(), 'personalizar-5x15');
  applied.layout.presetOrigin = { libraryAssetId: '329', name: 'Recuerdo clasico', source: 'global', contentHash: 'preset-hash' };
  (getMagicMirrorConfigApi as jest.Mock).mockResolvedValue({ config: { revision: 2, config: applied, publishedVersionId: null } });
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(screen()); });
  await flush();
  const editor = renderer!.root.findByType(MirrorLayoutEditor);
  const movedSlots = moveSlots(editor.props.config.layout.slots, [1], 2, 0);
  ReactTestRenderer.act(() => editor.props.onChange({ ...editor.props.config, layout: { ...editor.props.config.layout, slots: movedSlots } }));
  const previewConfig = renderer!.root.findByType(MirrorConfigPreview).props.config;
  expect(previewConfig.resources.layoutTemplateResourceId).toBeNull();
  expect(previewConfig.layout.presetOrigin).toBeNull();
  expect(previewConfig.layout.format).toBe('personalizar-5x15');
});

test('disables parent scrolling only while the canvas owns a gesture', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(screen()); });
  await flush();
  const editor = renderer!.root.findByType(MirrorLayoutEditor);
  const configScroll = () => renderer!.root.findAllByType(ScrollView).find((node) => node.props.scrollEnabled !== undefined);
  expect(configScroll()!.props.scrollEnabled).toBe(true);
  ReactTestRenderer.act(() => editor.props.onInteractionChange(true));
  expect(configScroll()!.props.scrollEnabled).toBe(false);
  ReactTestRenderer.act(() => editor.props.onInteractionChange(false));
  expect(configScroll()!.props.scrollEnabled).toBe(true);
});

test('shows unsaved changes beside the floating preview without exposing the server revision', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(screen()); });
  await flush();

  expect(renderer!.root.findAll((node) => node.type === Text && node.props.children === 'r2')).toHaveLength(0);
  changeFormat(renderer!, 'collage');

  const floatingControls = renderer!.root.findByProps({ testID: 'mirror-floating-controls' });
  const floatingText = floatingControls.findAllByType(Text).map((node) => node.props.children).flat(Infinity).join(' ');
  expect(floatingText).toContain('Cambios sin guardar');
});

test('a real tab press reveals the selected configurator section', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(screen()); });
  await flush();

  ReactTestRenderer.act(() => renderer!.root.findByProps({ testID: 'horizontal-submenu-design' }).props.onPress());

  expect(renderer!.root.findByProps({ testID: 'horizontal-submenu-design' }).props.accessibilityState).toEqual({ selected: true });
  expect(renderer!.root.findAll((node) => node.props.accessibilityLabel === 'Seleccion multiple').length).toBeGreaterThan(0);
});

test('starts in design without an event tab and opens the transversal preview modal', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(screen()); });
  await flush();

  expect(renderer!.root.findAllByProps({ testID: 'horizontal-submenu-event' })).toHaveLength(0);
  expect(renderer!.root.findByProps({ testID: 'horizontal-submenu-design' }).props.accessibilityState).toEqual({ selected: true });
  expect(renderer!.root.findByProps({ testID: 'horizontal-submenu-format' })).toBeTruthy();
  expect(renderer!.root.findByType(MirrorConfigPreview)).toBeTruthy();
  expect(renderer!.root.findAllByType(MirrorLayoutEditor)).toHaveLength(1);
  ['Mover y redimensionar', 'Rotar', 'Seleccion multiple', 'Deshacer', 'Rehacer', 'Duplicar como nueva toma', 'Repetir la misma toma', 'Agregar', 'Tira duplicada', 'Restaurar preset'].forEach((label) => {
    expect(renderer!.root.findAll((node) => node.props.accessibilityLabel === label).length).toBeGreaterThan(0);
  });
  expect(renderer!.root.findAllByProps({ testID: 'mirror-preview-modal' })).toHaveLength(0);

  ReactTestRenderer.act(() => renderer!.root.findByProps({ testID: 'mirror-preview-open' }).props.onPress());

  expect(renderer!.root.findByProps({ testID: 'mirror-preview-modal' })).toBeTruthy();
  expect(StyleSheet.flatten(renderer!.root.findByProps({ testID: 'mirror-preview-header' }).props.style).paddingTop).toBe(safeAreaMetrics.insets.top + tokens.spacing.md);
  const text = renderer!.root.findAllByType(Text).map((node) => node.props.children).flat(Infinity).join(' ');
  expect(text).toContain('Asi quedaria');
  expect(text).toContain('Dimensiones');
  expect(text).toContain('Numero de tomas');
  expect(renderer!.root.findAllByType(MirrorConfigurationSummary)).toHaveLength(1);
});

test('validation ignores the obsolete template-or-frame requirement without leaving an empty invalid state', async () => {
  (validateMagicMirrorConfigApi as jest.Mock).mockResolvedValue({
    valid: false,
    errors: [{ path: 'resources', code: 'FRAME_REQUIRED', message: 'Regla heredada' }],
    warnings: [],
  });
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(screen()); });
  await flush();
  ReactTestRenderer.act(() => renderer!.root.findAllByType(HorizontalSubMenu)[0].props.onSelect('review'));
  await ReactTestRenderer.act(async () => renderer!.root.findByProps({ testID: 'mirror-validate' }).props.onPress());
  await flush();

  expect(renderer!.root.findByProps({ testID: 'horizontal-submenu-review' }).props.accessibilityState).toEqual({ selected: true });
  const text = renderer!.root.findAllByType(Text).map((node) => node.props.children).flat(Infinity).join(' ');
  expect(text).toContain('Configuracion valida');
  expect(text).not.toContain('Configuraciones faltantes');
});

test('design submenu switches between the five focused editors', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(screen()); });
  await flush();
  ['format', 'frame', 'background', 'text', 'sticker'].forEach((key) => expect(renderer!.root.findByProps({ testID: `horizontal-submenu-${key}` })).toBeTruthy());
  ReactTestRenderer.act(() => renderer!.root.findByProps({ testID: 'horizontal-submenu-text' }).props.onPress());
  expect(renderer!.root.findByType(MirrorTextLayerEditor)).toBeTruthy();
  expect(renderer!.root.findAllByType(MirrorConfigPreview)).toHaveLength(1);
});

test('adds a token color as an editable background layer without creating a resource', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(screen()); });
  await flush();
  ReactTestRenderer.act(() => renderer!.root.findByProps({ testID: 'horizontal-submenu-background' }).props.onPress());
  expect(renderer!.root.findByType(MirrorBackgroundEditor)).toBeTruthy();
  ReactTestRenderer.act(() => renderer!.root.findByType(BackgroundColorPicker).props.onSelect('#2D3047'));
  expect(renderer!.root.findByType(MirrorBackgroundEditor).props.config.layout.backgroundLayers).toEqual([
    expect.objectContaining({ kind: 'color', color: '#2D3047', x: 0, y: 0, width: 100, height: 100, order: 0 }),
  ]);
  expect(createEventResourceApi).not.toHaveBeenCalled();
});

test('associates a favorite image as an editable background resource layer', async () => {
  const item = { id: '41', libraryAssetId: '51', displayName: 'Fondo', asset: { id: '51', name: 'Fondo', type: 'background', mimeType: 'image/png' } };
  (listAccountLibraryApi as jest.Mock).mockImplementation((_accountId, query) => Promise.resolve({ library: query.type === 'background' ? [item] : [], pagination: { page: 1, pageCount: 1 } }));
  (createEventResourceApi as jest.Mock).mockResolvedValue({ resource: { id: '61', libraryAssetId: '51', purpose: 'background', asset: item.asset } });
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(screen()); });
  await flush();
  ReactTestRenderer.act(() => renderer!.root.findByProps({ testID: 'horizontal-submenu-background' }).props.onPress());
  const grid = renderer!.root.findAllByType(DesignAssetGrid).find((node) => node.props.items.some((entry) => entry.libraryAssetId === '51'));
  await ReactTestRenderer.act(async () => grid!.props.onSelect(item));
  expect(renderer!.root.findByType(MirrorBackgroundEditor).props.config.layout.backgroundLayers).toEqual([
    expect.objectContaining({ kind: 'resource', resourceId: '61', order: 0 }),
  ]);
});

test('adds a favorite static sticker as a positioned design layer', async () => {
  const item = { id: '50', libraryAssetId: '70', isFavorite: true, asset: { id: '70', name: 'Sticker', type: 'sticker', motionType: 'static', mimeType: 'image/png' } };
  (listAccountLibraryApi as jest.Mock).mockImplementation((_accountId, query) => Promise.resolve({ library: query.type === 'sticker' ? [item] : [], pagination: { page: 1, pageCount: 1 } }));
  (createEventResourceApi as jest.Mock).mockResolvedValue({ resource: { id: '80', libraryAssetId: '70', purpose: 'sticker', asset: item.asset } });
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(screen()); });
  await flush();
  ReactTestRenderer.act(() => renderer!.root.findByProps({ testID: 'horizontal-submenu-sticker' }).props.onPress());
  const grid = renderer!.root.findAllByType(DesignAssetGrid).find((node) => node.props.items.some((entry) => entry.libraryAssetId === '70'));
  await ReactTestRenderer.act(async () => grid!.props.onSelect(item));
  expect(renderer!.root.findByType(MirrorStickerEditor).props.config.layout.stickerLayers).toEqual([
    expect.objectContaining({ resourceId: '80', width: 25, height: 25, rotation: 0, order: 0 }),
  ]);
});

test.each(['frame', 'sticker'])('counts, adds and cycles %s instances without removing them from the gallery', async (purpose) => {
  const item = { libraryAssetId: '70', asset: { id: '70', name: 'Recurso', type: purpose, motionType: 'static', mimeType: 'image/png' } };
  (listAccountLibraryApi as jest.Mock).mockImplementation((_id, query) => Promise.resolve({ library: query.type === purpose ? [item] : [] }));
  (createEventResourceApi as jest.Mock).mockResolvedValue({ resource: { id: '80', libraryAssetId: '70', purpose, asset: item.asset } });
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(screen()); });
  await flush();
  ReactTestRenderer.act(() => renderer!.root.findByProps({ testID: `horizontal-submenu-${purpose}` }).props.onPress());
  const grid = () => renderer!.root.findByType(DesignAssetGrid);
  const editor = () => renderer!.root.findByType(purpose === 'frame' ? MirrorFrameEditor : MirrorStickerEditor);
  await ReactTestRenderer.act(async () => grid().props.onSelect(item));
  expect(grid().props.instanceCounts['70']).toBe(1);
  expect(grid().props.onRemove).toBeUndefined();
  await ReactTestRenderer.act(async () => grid().props.onAddInstance(item));
  const layers = editor().props.config.layout[`${purpose}Layers`];
  expect(grid().props.instanceCounts['70']).toBe(2);
  expect(createEventResourceApi).toHaveBeenCalledTimes(1);
  expect(editor().props.selectionRequest.id).toBe(layers[1].id);
  ReactTestRenderer.act(() => grid().props.onSelect(item));
  expect(editor().props.selectionRequest.id).toBe(layers[0].id);
  expect(grid().props.instanceCounts['70']).toBe(2);
  ReactTestRenderer.act(() => editor().props.onChange({ ...editor().props.config, layout: { ...editor().props.config.layout, [`${purpose}Layers`]: [layers[1]] } }));
  expect(grid().props.instanceCounts['70']).toBe(1);
});

test('operator sees only the active publication', async () => {
  mockedAuth.mockReturnValue({ user: { themeMode: 'dark', globalRoles: [], accounts: [{ account, status: 'active', role: { slug: 'operator' } }] } });
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(screen()); });
  await flush();
  expect(getPublishedMagicMirrorConfigApi).toHaveBeenCalledWith('20', '30');
  expect(getMagicMirrorConfigApi).not.toHaveBeenCalled();
  expect(renderer!.root.findAllByProps({ testID: 'mirror-save' })).toHaveLength(0);
});

test('revision conflict exposes both explicit recovery actions', async () => {
  (saveMagicMirrorConfigApi as jest.Mock).mockRejectedValue(Object.assign(new Error('CONFIG_REVISION_CONFLICT'), { status: 409, payload: { error: 'CONFIG_REVISION_CONFLICT', details: { currentRevision: 3 } } }));
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(screen()); });
  await flush();
  changeFormat(renderer!, 'postal');
  ReactTestRenderer.act(() => renderer!.root.findByProps({ selectedKey: 'design' }).props.onSelect('review'));
  await ReactTestRenderer.act(async () => renderer!.root.findByProps({ testID: 'mirror-save' }).props.onPress());
  const text = renderer!.root.findAllByType(Text).map((node) => node.props.children).flat(Infinity).join(' ');
  expect(text).toContain('Cargar servidor');
  expect(text).toContain('Conservar copia local');
});

test('publish saves dirty state, validates and creates an immutable version after confirmation', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => { buttons?.[1]?.onPress?.(); });
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(screen()); });
  await flush();
  changeFormat(renderer!, 'doble');
  ReactTestRenderer.act(() => renderer!.root.findByProps({ selectedKey: 'design' }).props.onSelect('review'));
  await ReactTestRenderer.act(async () => renderer!.root.findByProps({ testID: 'mirror-publish' }).props.onPress());
  await flush();
  expect(saveMagicMirrorConfigApi).toHaveBeenCalled();
  expect(validateMagicMirrorConfigApi).toHaveBeenCalledWith('20', '30', expect.objectContaining({ publish: true }));
  expect(publishMagicMirrorConfigApi).toHaveBeenCalledWith('20', '30', 3);
  alert.mockRestore();
});

test('validation preserves unsaved changes and publishing then saves the exact validated draft', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => { buttons?.[1]?.onPress?.(); });
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(screen()); });
  await flush();
  changeFormat(renderer!, 'doble');
  ReactTestRenderer.act(() => renderer!.root.findByProps({ selectedKey: 'design' }).props.onSelect('review'));
  await ReactTestRenderer.act(async () => renderer!.root.findByProps({ testID: 'mirror-validate' }).props.onPress());
  expect(saveMagicMirrorConfigApi).not.toHaveBeenCalled();
  const badgeText = renderer!.root.findByProps({ testID: 'mirror-config-status' }).findAllByType(Text).map(node => node.props.children).join(' ');
  expect(badgeText).toContain('Cambios sin guardar');
  expect(JSON.parse((await AsyncStorage.getItem('mirror-config-draft:v1:10:20:30'))!).config.layout.shotCount).toBe(2);
  await ReactTestRenderer.act(async () => renderer!.root.findByProps({ testID: 'mirror-publish' }).props.onPress());
  await flush();
  expect(saveMagicMirrorConfigApi).toHaveBeenCalledWith('20', '30', expect.objectContaining({ expectedRevision: 2, config: expect.objectContaining({ layout: expect.objectContaining({ shotCount: 2 }) }) }));
  expect(publishMagicMirrorConfigApi).toHaveBeenCalledWith('20', '30', 3);
  alert.mockRestore();
});

test('a new untouched configuration is persisted before publication', async () => {
  (getMagicMirrorConfigApi as jest.Mock).mockResolvedValue({ config: { revision: 0, config: defaultMirrorConfig(), status: 'draft' } });
  const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => { buttons?.[1]?.onPress?.(); });
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(screen()); });
  await flush();
  ReactTestRenderer.act(() => renderer!.root.findByProps({ selectedKey: 'design' }).props.onSelect('review'));
  await ReactTestRenderer.act(async () => renderer!.root.findByProps({ testID: 'mirror-publish' }).props.onPress());
  await flush();
  expect(saveMagicMirrorConfigApi).toHaveBeenCalled();
  expect(publishMagicMirrorConfigApi).toHaveBeenCalledWith('20', '30', 1);
  alert.mockRestore();
});

test('a previous publication does not label a newer server draft as published', async () => {
  (getMagicMirrorConfigApi as jest.Mock).mockResolvedValue({ config: { revision: 3, config: defaultMirrorConfig(), status: 'draft', publishedVersionId: '90' } });
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(screen()); });
  await flush();
  const text = renderer!.root.findByProps({ testID: 'mirror-config-status' }).findAllByType(Text).map(node => node.props.children).join(' ');
  expect(text).not.toContain('Publicado');
});

test('review shows the publication number, never the global id or draft revision, after saving', async () => {
  const draft = { revision: 19, config: defaultMirrorConfig(), status: 'draft', publishedVersionId: '987', publishedVersion: 3 };
  (getMagicMirrorConfigApi as jest.Mock).mockResolvedValue({ config: draft });
  (saveMagicMirrorConfigApi as jest.Mock).mockResolvedValue({ config: { ...draft, revision: 20 } });
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(screen()); });
  await flush();
  ReactTestRenderer.act(() => renderer!.root.findByProps({ selectedKey: 'design' }).props.onSelect('review'));
  const badgeText = () => renderer!.root.findByProps({ testID: 'mirror-publication-status' }).findAllByType(Text).map(node => node.props.children).join(' ');
  expect(badgeText()).toBe('Publicación 3');
  await ReactTestRenderer.act(async () => renderer!.root.findByProps({ testID: 'mirror-save' }).props.onPress());
  expect(badgeText()).toBe('Publicación 3');
});

test('review displays unpublished until a publication is created', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => { buttons?.[1]?.onPress?.(); });
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(screen()); });
  await flush();
  ReactTestRenderer.act(() => renderer!.root.findByProps({ selectedKey: 'design' }).props.onSelect('review'));
  const badgeText = () => renderer!.root.findByProps({ testID: 'mirror-publication-status' }).findAllByType(Text).map(node => node.props.children).join(' ');
  expect(badgeText()).toBe('Sin publicar');
  await ReactTestRenderer.act(async () => renderer!.root.findByProps({ testID: 'mirror-publish' }).props.onPress());
  await flush();
  expect(badgeText()).toBe('Publicación 2');
  alert.mockRestore();
});

test('confirmation cannot publish a configuration edited after validation', async () => {
  let confirm: (() => void) | undefined;
  const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => { confirm = buttons?.[1]?.onPress; });
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(screen()); });
  await flush();
  ReactTestRenderer.act(() => renderer!.root.findByProps({ selectedKey: 'design' }).props.onSelect('review'));
  await ReactTestRenderer.act(async () => renderer!.root.findByProps({ testID: 'mirror-publish' }).props.onPress());
  ReactTestRenderer.act(() => renderer!.root.findByProps({ selectedKey: 'review' }).props.onSelect('design'));
  changeFormat(renderer!, 'doble');
  await ReactTestRenderer.act(async () => { await confirm?.(); });
  expect(publishMagicMirrorConfigApi).not.toHaveBeenCalled();
  alert.mockRestore();
});

test('restores a local draft after an app restart when the base revision still matches', async () => {
  const localConfig = applyMirrorFormat(defaultMirrorConfig(), 'collage');
  await AsyncStorage.setItem('mirror-config-draft:v1:10:20:30', JSON.stringify({ baseRevision: 2, config: localConfig }));
  const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => { buttons?.[1]?.onPress?.(); });
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(screen()); });
  await flush();
  expect(renderer!.root.findByType(MirrorConfigPreview).props.config.layout.format).toBe('collage');
  alert.mockRestore();
});

test('rolls back a newly associated resource when saving conflicts', async () => {
  const item = { id: '40', libraryAssetId: '50', displayName: 'Marco', asset: { id: '50', name: 'Marco', type: 'frame', mimeType: 'image/png', variants: { card: { signedUrl: 'https://cdn.test/frame-card.webp' } } } };
  (listAccountLibraryApi as jest.Mock).mockImplementation((_accountId, query) => Promise.resolve({ library: query.type === 'frame' ? [item] : [], pagination: { page: 1, pageCount: 1 } }));
  (createEventResourceApi as jest.Mock).mockResolvedValue({ resource: { id: '60', libraryAssetId: '50', purpose: 'frame', asset: { id: '50', name: 'Marco', type: 'frame', mimeType: 'image/png' } } });
  (saveMagicMirrorConfigApi as jest.Mock).mockRejectedValue(Object.assign(new Error('CONFIG_REVISION_CONFLICT'), { status: 409, payload: { error: 'CONFIG_REVISION_CONFLICT' } }));
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(screen()); });
  await flush();
  ReactTestRenderer.act(() => renderer!.root.findByProps({ testID: 'horizontal-submenu-frame' }).props.onPress());
  const frameGrid = renderer!.root.findAllByType(DesignAssetGrid).find((node) => node.props.items.some((entry) => entry.libraryAssetId === '50'));
  await ReactTestRenderer.act(async () => frameGrid!.props.onSelect(item));
  const frameEditor = renderer!.root.findByType(MirrorFrameEditor);
  expect(frameEditor.props.config.layout.frameLayers).toEqual([expect.objectContaining({ resourceId: '60' })]);
  expect(frameEditor.props.resourcesById['60'].asset.variants).toBe(item.asset.variants);
  ReactTestRenderer.act(() => renderer!.root.findByProps({ selectedKey: 'design' }).props.onSelect('review'));
  await ReactTestRenderer.act(async () => renderer!.root.findByProps({ testID: 'mirror-save' }).props.onPress());
  expect(deleteEventResourceApi).toHaveBeenCalledWith('20', '60');
});

test('restores the applied preset snapshot during the editing session', async () => {
  const applied = applyMirrorFormat(defaultMirrorConfig(), 'personalizar-5x15');
  applied.layout.presetOrigin = { libraryAssetId: '329', name: 'Recuerdo clasico', source: 'global', contentHash: 'preset-hash' };
  (getMagicMirrorConfigApi as jest.Mock).mockResolvedValue({ config: { revision: 2, config: applied, publishedVersionId: null } });
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(screen()); });
  await flush();
  const editor = renderer!.root.findByType(MirrorLayoutEditor);
  const movedSlots = moveSlots(editor.props.config.layout.slots, [1], 2, 0);
  ReactTestRenderer.act(() => editor.props.onChange({ ...editor.props.config, layout: { ...editor.props.config.layout, slots: movedSlots } }));
  expect(renderer!.root.findByType(MirrorConfigPreview).props.config.layout.presetOrigin).toBeNull();
  ReactTestRenderer.act(() => renderer!.root.findByType(MirrorLayoutEditor).props.onRestore());
  expect(renderer!.root.findByType(MirrorConfigPreview).props.config.layout.presetOrigin).toEqual(applied.layout.presetOrigin);
  expect(renderer!.root.findByType(MirrorConfigPreview).props.config.layout.slots).toEqual(applied.layout.slots.map((slot) => ({ ...slot, rotation: 0 })));
});
