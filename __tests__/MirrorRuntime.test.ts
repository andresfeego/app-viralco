import {
  captureCount,
  createClientUuid,
  createMirrorRuntimeState,
  evaluateMirrorPreflight,
  mirrorRuntimeReducer,
  MIRROR_RUNTIME_STAGES,
} from '../src/domain/mirrorRuntime';

describe('mirror runtime state', () => {
  it('creates stable-shaped local sessions and valid UUIDs', () => {
    const state = createMirrorRuntimeState({ eventId: '10', eventModeId: '20' });
    expect(state.clientSessionId).toMatch(/^[0-9a-f-]{36}$/);
    expect(createClientUuid()).toMatch(/^[0-9a-f-]{36}$/);
    expect(state.stage).toBe(MIRROR_RUNTIME_STAGES.PREPARING);
  });

  it('requires publication, local resources, camera and storage before launch', () => {
    const runtime = createMirrorRuntimeState({
      version: { id: '1', config: { layout: { slots: [{}] } } },
      manifest: [{ asset: { sizeBytes: 10 } }],
      localManifest: [{}],
    });
    const assessment = evaluateMirrorPreflight({ runtime, freeSpace: 200 * 1024 * 1024, cameraPermission: true, cameraReady: true });
    expect(assessment.ready).toBe(true);
    expect(evaluateMirrorPreflight({ runtime, freeSpace: 0, cameraPermission: true, cameraReady: true }).ready).toBe(false);
  });

  it('keeps many guest runs under one event session', () => {
    const state = createMirrorRuntimeState({ eventModeId: '20' });
    const running = mirrorRuntimeReducer(state, { type: 'START_RUN', run: { clientRunId: 'a' } });
    const ready = mirrorRuntimeReducer(running, { type: 'COMPLETE_RUN', run: running.activeRun });
    expect(ready.completedRuns).toHaveLength(1);
    expect(ready.stage).toBe(MIRROR_RUNTIME_STAGES.READY);
  });

  it('uses the configured number of photos with safe limits', () => {
    expect(captureCount({ layout: { shotCount: 3 } })).toBe(3);
    expect(captureCount({ layout: { slots: Array(10).fill({}) } })).toBe(8);
  });
});
