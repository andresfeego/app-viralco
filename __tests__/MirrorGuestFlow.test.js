import React from 'react';
jest.mock('../src/services/offlineBillingGrant', () => ({ beginBillingLaunch: jest.fn(async () => {}), endBillingLaunch: jest.fn(), billingLiveHeaders: () => ({}) }));
import renderer, { act } from 'react-test-renderer';
import { Alert, AppState, Modal } from 'react-native';
import { MagicMirrorLaunchScreen } from '../src/screens/MagicMirrorLaunchScreen';
import * as storage from '../src/services/mirrorRuntimeStorage';
import * as api from '../src/services/api/events';
import { syncMirrorRun } from '../src/services/mirrorRuntimeSync';
import { printCompositions } from '../src/services/mirrorPrinting';
import { recordClientTechnicalError } from '../src/services/errorHandling';
import { captureCount, chooseStageAnimation, guestSequenceReducer, mergeRunAcknowledgements, nextMissingPhoto, recoverGuestStage, runtimeQuality } from '../src/domain/mirrorRuntime';

jest.mock('react-native-share', () => ({ open: jest.fn() }));
jest.mock('../src/services/mirrorPrinting', () => ({ printCompositions: jest.fn(), recoverPrintJobs: jest.fn(async () => {}) }));
jest.mock('../src/components/LaunchPatternGate', () => ({ LaunchPatternGate: (props) => require('react').createElement('Pattern', props) }));
jest.mock('../src/components/MirrorOfflinePreparation', () => ({ MirrorOfflinePreparation: props => require('react').createElement('Preparation', props) }));
jest.mock('../src/components/IconTextButton', () => ({ IconTextButton: (props) => require('react').createElement('Action', { ...props, label: props.label || props.accessibilityLabel }) }));
jest.mock('../src/services/mirrorGalleryZip', () => ({ createMirrorGalleryZip: jest.fn() }));
jest.mock('@react-native-camera-roll/camera-roll', () => ({ CameraRoll: { saveAsset: jest.fn() } }));
jest.mock('react-native-qrcode-svg', () => 'QR');
jest.mock('../src/hooks/useAuth', () => ({ useAuth: () => ({ user: { themeMode: 'dark' } }) }));
jest.mock('../src/providers/ToastProvider', () => ({ useToast: () => ({ showToast: mockToast }) }));
const mockToast = jest.fn();
jest.mock('../src/services/errorHandling', () => ({ recordClientTechnicalError: jest.fn(), userErrorMessage: (_error, message) => message }));
jest.mock('../src/services/api/events', () => ({
  getPublishedMagicMirrorConfigApi: jest.fn(), getActiveMagicMirrorSessionApi: jest.fn(), startMagicMirrorSessionApi: jest.fn(), getMagicMirrorSessionPackageApi: jest.fn(),
  updateMagicMirrorSessionApi: jest.fn(), endMagicMirrorSessionApi: jest.fn(), forceEndMagicMirrorSessionApi: jest.fn(), recordMagicMirrorDeliveryApi: jest.fn(),
}));
jest.mock('../src/services/mirrorRuntimeStorage', () => ({
  archiveMirrorRuntime: jest.fn(), loadMirrorArchives: jest.fn(), cleanGuestOriginals: jest.fn(), cacheMirrorPackage: jest.fn(), clearMirrorRuntime: jest.fn(),
  getMirrorInstallationId: jest.fn(), getMirrorStorageInfo: jest.fn(), loadMirrorRuntime: jest.fn(), persistMirrorCapture: jest.fn(), persistMirrorOutput: jest.fn(), saveMirrorRuntime: jest.fn(),
}));
jest.mock('../src/services/mirrorRuntimeSync', () => ({
  isMirrorRuntimeOnline: async () => true, subscribeMirrorConnectivity: () => () => {},
  syncMirrorRun: jest.fn(async (_runtime, run) => ({ ...run, syncStatus: 'synced' })),
}));
const mockShutter = jest.fn();
const mockCompose = jest.fn();
jest.mock('../src/components/MirrorRuntimeCamera', () => {
  const R = require('react');
  return { MirrorRuntimeCamera: R.forwardRef(({ onAvailabilityChange }, ref) => {
    R.useEffect(() => { onAvailabilityChange({ permission: true, ready: true }); }, [onAvailabilityChange]);
    R.useImperativeHandle(ref, () => ({ takePhoto: mockShutter }));
    return R.createElement('Camera');
  }) };
});
jest.mock('../src/components/MirrorOutputComposer', () => {
  const R = require('react');
  return { MirrorOutputComposer: R.forwardRef((_props, ref) => {
    R.useImperativeHandle(ref, () => ({ compose: mockCompose }));
    return R.createElement('Composer');
  }) };
});
jest.mock('../src/components/MirrorGuestScene', () => {
  const R = require('react');
  return {
    GuestAction: (props) => R.createElement('Action', props),
    GuestCapturePrompt: (props) => R.createElement('Action', props),
    GuestWelcome: (props) => R.createElement('Action', { label: 'Toca para comenzar', onPress: props.onStart }),
    GuestModal: ({ children, ...props }) => R.createElement('GuestModal', props, children),
    GuestStage: ({ children, footer, overlay, ...props }) => R.createElement('Stage', props, children, overlay, footer),
    GuestAnimation: (props) => R.createElement('Animation', props),
    GuestGallery: (props) => R.createElement('Gallery', props),
    GuestResult: (props) => R.createElement('Result', props),
  };
});

const configFor = (count) => ({
  layout: { shotCount: count, order: Array.from({ length: count }, (_, i) => i + 1), output: { width: 1200, height: 1500 }, slots: Array.from({ length: count }, (_, i) => ({ slotId: String(i), photoNumber: i + 1, x: 0, y: 0, width: 100, height: 100 })) },
  capture: { firstCountdownSeconds: 1, nextCountdownSeconds: 1, reviewSeconds: 0, flashEnabled: false },
  experience: { animationEnabledByStage: { start: true }, randomByStage: {} }, delivery: { qr: true }, runtime: { autoResetSeconds: 15, operatorMenuEnabled: true },
});
const flush = async () => { for (let i = 0; i < 15; i += 1) await Promise.resolve(); };
let tree;
let appStateListener;
async function tap(label) {
  const button = tree.root.findAllByType('Action').find((item) => item.props.label === label);
  expect(button).toBeTruthy();
  expect(button.props.disabled).toBeFalsy();
  await act(async () => { button.props.onPress(); await flush(); });
}
async function advance(ms) { await act(async () => { jest.advanceTimersByTime(ms); await flush(); }); }

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  AppState.currentState = 'active';
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => { appStateListener = listener; return { remove: jest.fn() }; });
  storage.loadMirrorRuntime.mockResolvedValue(null);
  storage.loadMirrorArchives.mockResolvedValue([]);
  storage.getMirrorInstallationId.mockResolvedValue('phone');
  storage.cacheMirrorPackage.mockResolvedValue([]);
  storage.getMirrorStorageInfo.mockResolvedValue({ freeSpace: 500 * 1024 * 1024 });
  storage.saveMirrorRuntime.mockResolvedValue();
  storage.persistMirrorCapture.mockResolvedValue({ uri: 'file:///photo.jpg', path: '/photo.jpg', mimeType: 'image/jpeg' });
  storage.persistMirrorOutput.mockResolvedValue({ uri: 'file:///output.jpg', path: '/output.jpg', mimeType: 'image/jpeg' });
  storage.cleanGuestOriginals.mockImplementation(async (_runtime, run) => run);
  api.getActiveMagicMirrorSessionApi.mockResolvedValue({});
  api.updateMagicMirrorSessionApi.mockResolvedValue({ session: { id: 'session', status: 'running' } });
  mockShutter.mockResolvedValue({ path: '/camera.jpg' });
  mockCompose.mockResolvedValue('/output.jpg');
});
afterEach(() => { if (tree) act(() => tree.unmount()); tree = null; jest.useRealTimers(); jest.restoreAllMocks(); });
async function open(count, config = configFor(count), manifest = [], extraProps = {}, offline = false) {
  const start = { eventResourceId: 'start', purpose: 'animation', placement: 'start', uri: 'file:///start.mp4' };
  const cached = await storage.cacheMirrorPackage();
  manifest = [start, ...manifest];
  storage.cacheMirrorPackage.mockResolvedValue([start, ...cached]);
  const recoveredPayload = await api.getMagicMirrorSessionPackageApi();
  if (recoveredPayload) api.getMagicMirrorSessionPackageApi.mockResolvedValue({ ...recoveredPayload, manifest });
  api.startMagicMirrorSessionApi.mockResolvedValue({ session: { id: 'session', status: 'preparing', configVersionId: 'published' }, version: { id: 'published', config }, manifest });
  api.getPublishedMagicMirrorConfigApi.mockResolvedValue({ version: { id: 'published', config }, manifest });
  await act(async () => { tree = renderer.create(<MagicMirrorLaunchScreen event={{ id: 'event' }} eventMode={{ id: 'mode' }} accountId="account" onBack={jest.fn()} {...extraProps} />); await flush(); });
  await act(async () => { tree.root.findByType('Preparation').props.onLaunch({ package: { version: { id: 'published', version: 1, config }, manifest, localManifest: [start, ...cached] }, offline }); await flush(); });
  const confirmation = tree.root.findAllByType('Action').find(item => item.props.label === 'Continuar');
  if (confirmation) await act(async () => { confirmation.props.onPress(); await flush(); });
  if (tree.root.findAllByType('Pattern').length) await act(async () => { tree.root.findByType('Pattern').props.onReady([0, 1, 2, 5]); await flush(); });
}

it('opens a fresh downloaded configuration without a server session when offline', async () => {
  await open(1, configFor(1), [], {}, true);
  expect(api.startMagicMirrorSessionApi).not.toHaveBeenCalled();
  expect(api.getActiveMagicMirrorSessionApi).not.toHaveBeenCalled();
  expect(storage.saveMirrorRuntime.mock.calls.at(-1)[0]).toMatchObject({ offlineSession: true, version: { id: 'published' } });
  await tap('Toca para comenzar');
  await advance(100); await advance(1000);
  expect(mockShutter).toHaveBeenCalledTimes(1);
});

it('keeps the same native modal through offline preparation, confirmation and pattern', async () => {
  await act(async () => { tree = renderer.create(<MagicMirrorLaunchScreen event={{ id: 'event' }} eventMode={{ id: 'mode' }} accountId="account" onBack={jest.fn()} />); await flush(); });
  const host = tree.root.findByType(Modal);
  expect(host.props.visible).toBe(true);
  expect(tree.root.findByType('Preparation').props.embedded).toBe(true);
  let finishLoading;
  storage.loadMirrorRuntime.mockImplementation(() => new Promise(resolve => { finishLoading = resolve; }));
  await act(async () => {
    tree.root.findByType('Preparation').props.onLaunch({ package: { version: { id: 'published', version: 5, config: configFor(1) }, manifest: [], localManifest: [] }, offline: true });
    await flush();
  });
  expect(tree.root.findByType(Modal)).toBe(host);
  expect(tree.root.findByType('GuestModal').props.embedded).toBe(true);
  await act(async () => { finishLoading(null); await flush(); });
  expect(tree.root.findByType(Modal)).toBe(host);
  expect(tree.root.findByType('GuestModal').props.title).toContain('5');
  await tap('Continuar');
  expect(tree.root.findByType(Modal)).toBe(host);
  expect(tree.root.findByType('Pattern').props.embedded).toBe(true);
  await act(async () => { tree.root.findByType('Pattern').props.onReady([0, 1, 2, 5]); await flush(); });
  expect(tree.root.findByType(Modal).props.visible).toBe(false);
  // Without a start video the existing flow proceeds directly to the camera.
  expect(tree.root.findAllByType('Camera')).toHaveLength(1);
});

it('starts capture on the only welcome touch and never captures before it', async () => {
  await open(1);
  expect(tree.root.findAllByType('Camera')).toHaveLength(0);
  await advance(5000);
  expect(mockShutter).not.toHaveBeenCalled();
  expect(storage.saveMirrorRuntime.mock.calls.at(-1)[0].stage).toMatch(/waiting|welcome/);
  await tap('Toca para comenzar');
  expect(tree.root.findAllByType('Camera')).toHaveLength(1);
  await advance(100);
  await advance(100); await advance(1000);
  expect(mockShutter).toHaveBeenCalledTimes(1);
});

it('keeps processing for three seconds between shots, then loops welcome', async () => {
  await open(2);
  await tap('Toca para comenzar');
  await advance(100); await advance(1000);
  expect(mockShutter).toHaveBeenCalledTimes(1);
  expect(storage.saveMirrorRuntime.mock.calls.at(-1)[0].stage).toBe('processing');
  await advance(2999);
  expect(storage.saveMirrorRuntime.mock.calls.at(-1)[0].stage).toBe('processing');
  await advance(1);
  expect(storage.saveMirrorRuntime.mock.calls.at(-1)[0].stage).toBe('welcome');
  expect(mockCompose).not.toHaveBeenCalled();
});

it('omits disabled welcome and previous video stages without a second touch', async () => {
  const config = configFor(1); config.experience.animationEnabledByStage = {};
  await open(1, config);
  await advance(100); await advance(1000);
  expect(mockShutter).toHaveBeenCalledTimes(1);
});

it('never opens operator actions before the temporary pattern is verified', async () => {
  await open(1, configFor(1), [], { canManage: true, onConfigure: jest.fn() });
  await act(async () => { tree.root.findByType('Stage').props.onOperator(); await flush(); });
  expect(tree.root.findAllByType('Pattern')).toHaveLength(1);
  expect(tree.root.findAllByType('Action').some((item) => item.props.label === 'Configurar evento')).toBe(false);
  await act(async () => { tree.root.findByType('Pattern').props.onReady([0, 1, 2, 5]); await flush(); });
  expect(tree.root.findAllByType('Action').some((item) => item.props.label === 'Configurar evento')).toBe(true);
  expect(JSON.stringify(storage.saveMirrorRuntime.mock.calls)).not.toContain('pattern');
});

it('archives the session before opening the full configurator', async () => {
  const configure = jest.fn();
  jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => buttons.at(-1).onPress());
  await open(1, configFor(1), [], { canManage: true, onConfigure: configure });
  await act(async () => { tree.root.findByType('Stage').props.onOperator(); await flush(); });
  await act(async () => { tree.root.findByType('Pattern').props.onReady([0, 1, 2, 5]); await flush(); });
  await tap('Configurar evento');
  expect(storage.archiveMirrorRuntime).toHaveBeenCalled();
  expect(api.endMagicMirrorSessionApi).toHaveBeenCalled();
  expect(configure).toHaveBeenCalledTimes(1);
});

it.each([1, 3, 8])('captures %i photos with one tap per photo and composes automatically', async (count) => {
  await open(count);
  for (let i = 0; i < count; i += 1) {
    await tap(i ? 'Toca para comenzar' : 'Toca para comenzar');
    expect(mockShutter).toHaveBeenCalledTimes(i);
    await advance(100); await advance(1000);
    await advance(0); await advance(100); await advance(3000);
    expect(mockShutter).toHaveBeenCalledTimes(i + 1);
  }
  await advance(100);
  expect(tree.root.findAllByType('Result')).toHaveLength(1);
  expect(mockToast).not.toHaveBeenCalled();
});

it.each([1, 2, 3])('replaces only photo %i and returns directly to the result', async (number) => {
  await open(3);
  for (let i = 0; i < 3; i += 1) { await tap(i ? 'Toca para comenzar' : 'Toca para comenzar'); await advance(100); await advance(1000); await advance(0); await advance(100); await advance(3000); }
  await advance(100);
  await act(async () => { tree.root.findByType('Result').props.onRetake(number); await flush(); });
  await tap('Toca para comenzar');
  await advance(100); await advance(1000); await advance(0); await advance(100); await advance(3000); await advance(100);
  expect(mockShutter).toHaveBeenCalledTimes(4);
  expect(tree.root.findAllByType('Result')).toHaveLength(1);
  const saved = storage.saveMirrorRuntime.mock.calls.at(-1)[0];
  expect(saved.activeRun.captures.filter((p) => p.selected).map((p) => p.photoNumber).sort()).toEqual([1, 2, 3]);
});

it('interrupts a countdown without an unexpected shutter on resume', async () => {
  await open(1);
  await tap('Toca para comenzar');
  await act(async () => { AppState.currentState = 'background'; appStateListener('background'); await flush(); });
  await advance(5000);
  await act(async () => { AppState.currentState = 'active'; appStateListener('active'); await flush(); });
  expect(mockShutter).not.toHaveBeenCalled();
  expect(storage.saveMirrorRuntime.mock.calls.at(-1)[0].stage).toMatch(/waiting|welcome/);
  await tap('Toca para comenzar');
  await advance(100); await advance(1000); await advance(0); await advance(100); await advance(3000); await advance(100);
  expect(mockShutter).toHaveBeenCalledTimes(1);
});

it('waits for video completion and respects zero countdown/review times', async () => {
  const config = configFor(1);
  config.capture.firstCountdownSeconds = 0;
  config.experience.animationEnabledByStage.beforeCountdown = true;
  const resource = { eventResourceId: 'video', purpose: 'animation', placement: 'beforeCountdown', uri: 'file:///video.mp4' };
  storage.cacheMirrorPackage.mockResolvedValue([resource]);
  await open(1, config, [{ asset: { sizeBytes: 100 } }]);
  await tap('Toca para comenzar');
  await advance(2000);
  expect(mockShutter).not.toHaveBeenCalled();
  await act(async () => { tree.root.findByType('Animation').props.onDone(); await flush(); });
  await advance(0); await advance(100); await advance(3000); await advance(100);
  expect(mockShutter).toHaveBeenCalledTimes(1);
  expect(tree.root.findAllByType('Result')).toHaveLength(1);
});

it('keeps the result until Another photo returns to capture without preparation', async () => {
  await open(1);
  await tap('Toca para comenzar');
  await advance(100); await advance(1000); await advance(0); await advance(100); await advance(3000); await advance(100); await advance(15000);
  expect(tree.root.findAllByType('GuestModal')).toHaveLength(0);
  expect(tree.root.findAllByType('Result')).toHaveLength(1);
  await tap('Otra foto');
  expect(tree.root.findAllByType('Action').some((item) => item.props.label === 'Toca para comenzar')).toBe(true);
});

it('resumes a pending result and synchronizes it without another photo or network change', async () => {
  const config = configFor(1);
  const session = { id: 'session', status: 'running', configVersionId: 'published', deviceInstallationId: 'phone' };
  const payload = { session, version: { id: 'published', config }, manifest: [] };
  storage.loadMirrorRuntime.mockResolvedValue({ ...payload, config, completedRuns: [], activeRun: { clientRunId: 'saved', captures: [{ photoNumber: 1 }], output: { clientAssetId: 'pending', uri: 'file:///output.jpg' }, syncStatus: 'pending' } });
  api.getActiveMagicMirrorSessionApi.mockResolvedValue({ session });
  api.getMagicMirrorSessionPackageApi.mockResolvedValue(payload);
  await open(1, config);
  expect(tree.root.findAllByType('Result')).toHaveLength(1);
  expect(mockShutter).not.toHaveBeenCalled();
  expect(syncMirrorRun).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ clientRunId: 'saved' }), expect.any(Function));
});

it('rejects double taps and pauses reset while delivery is open', async () => {
  await open(1);
  const button = tree.root.findAllByType('Action').find((item) => item.props.label === 'Toca para comenzar');
  await act(async () => { button.props.onPress(); button.props.onPress(); await flush(); });
  await advance(100); await advance(1000); await advance(0); await advance(100); await advance(3000); await advance(100);
  expect(mockShutter).toHaveBeenCalledTimes(1);
  await tap('Opciones de entrega');
  await advance(20000);
  expect(tree.root.findAllByType('Result')).toHaveLength(1);
});

it('prints the finished composition once and pauses reset during the native operation', async () => {
  const config = configFor(1);
  config.print = { enabled: true, copies: 2, profileResourceId: 7 };
  config.delivery.print = true;
  let finishPrint;
  printCompositions.mockImplementation(() => new Promise(resolve => { finishPrint = resolve; }));
  await open(1, config);
  await tap('Toca para comenzar');
  await advance(100); await advance(1000); await advance(0); await advance(100); await advance(3000); await advance(100);
  await tap('Opciones de entrega');
  const print = tree.root.findAllByType('Action').find(item => item.props.label === 'Imprimir');
  expect(print).toBeTruthy();
  await act(async () => { print.props.onPress(); print.props.onPress(); await flush(); });
  expect(printCompositions).toHaveBeenCalledTimes(1);
  expect(printCompositions.mock.calls[0][0][0]).toEqual(expect.objectContaining({ configSnapshot: expect.objectContaining({ print: config.print }), output: expect.objectContaining({ uri: 'file:///output.jpg' }) }));
  await advance(20000);
  expect(tree.root.findAllByType('Result')).toHaveLength(1);
  await act(async () => { finishPrint('cancelled'); await flush(); });
  expect(tree.root.findAllByType('Result')).toHaveLength(1);
});

it('merges stale uploads without restoring an old selection or output', () => {
  const current = { clientRunId: 'r', captures: [{ clientCaptureId: 'a', selected: false }, { clientCaptureId: 'b', selected: true }], output: { clientAssetId: 'new' } };
  const old = { clientRunId: 'r', captures: [{ clientCaptureId: 'a', selected: true, syncStatus: 'synced' }], output: { clientAssetId: 'old', publicHash: 'old-qr' } };
  const result = mergeRunAcknowledgements(current, old);
  expect(result.captures[0].selected).toBe(false);
  expect(result.captures).toHaveLength(2);
  expect(result.output).toEqual({ clientAssetId: 'new' });
});

it('recovers without firing, honors disabled animation stages and differentiates quality', () => {
  const config = configFor(3);
  expect(captureCount(config)).toBe(3);
  expect(nextMissingPhoto(config, { captures: [{ photoNumber: 1 }] })).toBe(2);
  expect(recoverGuestStage({ config, activeRun: { captures: [{ photoNumber: 1 }] } })).toBe('waiting');
  expect(recoverGuestStage({ config, activeRun: { captures: [1, 2, 3].map((photoNumber) => ({ photoNumber })) } })).toBe('processing');
  const runtime = { config, localManifest: [{ purpose: 'animation', placement: 'start' }] };
  config.experience.animationEnabledByStage.start = false;
  expect(chooseStageAnimation(runtime, 'start')).toBe(null);
  config.experience.animationEnabledByStage.start = true;
  expect(chooseStageAnimation(runtime, 'start')).toBe(runtime.localManifest[0]);
  expect(runtimeQuality('medium')).toBeLessThan(runtimeQuality('high'));
  expect(runtimeQuality('high')).toBeLessThan(runtimeQuality('superior'));
  expect(guestSequenceReducer({ stage: 'countdown' }, { type: 'BEGIN' })).toEqual({ stage: 'countdown' });
});

it.each([
  ['start', 'MIRROR_GUEST_START_FAILED', 'No se pudo iniciar la experiencia. Intenta de nuevo.'],
  ['camera', 'MIRROR_GUEST_CAMERA_FAILED', 'No se pudo tomar la foto. Intenta de nuevo.'],
  ['captureStorage', 'MIRROR_GUEST_CAPTURE_SAVE_FAILED', 'No se pudo guardar esta toma. Revisa el espacio disponible e intenta de nuevo.'],
  ['compose', 'MIRROR_GUEST_COMPOSE_FAILED', 'No se pudo componer la foto. Tus tomas siguen guardadas.'],
  ['outputStorage', 'MIRROR_GUEST_OUTPUT_SAVE_FAILED', 'No se pudo guardar el resultado. Tus tomas siguen guardadas; revisa el espacio disponible.'],
])('reports %s failure at its actual stage, not always as composition', async (stage, code, message) => {
  await open(1);
  const target = { start: api.updateMagicMirrorSessionApi, camera: mockShutter, captureStorage: storage.persistMirrorCapture, compose: mockCompose, outputStorage: storage.persistMirrorOutput }[stage];
  target.mockRejectedValueOnce(new Error('Native driver detail that has no known technical pattern'));
  await tap('Toca para comenzar');
  await advance(100); await advance(1000); await advance(0); await advance(100); await advance(3000); await advance(100);
  expect(mockToast).toHaveBeenCalledWith({ type: 'error', message });
  expect(recordClientTechnicalError).toHaveBeenCalledWith(expect.objectContaining({ code }));
  expect(tree.root.findAllByType('Result')).toHaveLength(0);
  if (['compose', 'outputStorage'].includes(stage)) {
    expect(storage.saveMirrorRuntime.mock.calls.at(-1)[0].activeRun.captures).toHaveLength(1);
  }
});

it('does not compose before a shot when recovery marks one stored capture unavailable', async () => {
  const config = configFor(2);
  const session = { id: 'session', status: 'running', configVersionId: 'published', deviceInstallationId: 'phone' };
  const payload = { session, version: { id: 'published', config }, manifest: [] };
  storage.loadMirrorRuntime.mockResolvedValue({ ...payload, config, completedRuns: [], activeRun: { clientRunId: 'saved', captures: [{ photoNumber: 1, selected: true, localAvailable: true }, { photoNumber: 2, selected: true, localAvailable: false }], output: null } });
  api.getActiveMagicMirrorSessionApi.mockResolvedValue({ session });
  api.getMagicMirrorSessionPackageApi.mockResolvedValue(payload);
  await open(2, config);
  await advance(5000);
  expect(mockCompose).not.toHaveBeenCalled();
  expect(mockShutter).not.toHaveBeenCalled();
  expect(mockToast).not.toHaveBeenCalled();
  await tap('Toca para comenzar');
  await advance(100); await advance(1000); await advance(0); await advance(100); await advance(3000); await advance(100);
  expect(mockShutter).toHaveBeenCalledTimes(1);
  expect(mockCompose).toHaveBeenCalledTimes(1);
  expect(tree.root.findAllByType('Result')).toHaveLength(1);
});
