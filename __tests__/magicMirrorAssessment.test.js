import { assessMagicMirrorConfig, mirrorIssueTarget, normalizeMirrorValidationResult } from '../src/domain/magicMirrorAssessment';
import { defaultMirrorConfig } from '../src/domain/magicMirrorConfig';
import { setLocale, t } from '../src/i18n';

test('does not require a template or frame for publication', () => {
  const assessment = assessMagicMirrorConfig({ config: defaultMirrorConfig(), issues: [{ path: 'resources', code: 'FRAME_REQUIRED' }], resourcesById: {}, translate: t });
  expect(assessment.invalid).toHaveLength(0);
  expect(assessment.missing).toHaveLength(0);
});

test('only requires videos for enabled animation stages', () => {
  const config = defaultMirrorConfig();
  config.experience.animationEnabledByStage.start = true;
  let assessment = assessMagicMirrorConfig({ config, issues: [], resourcesById: {}, translate: t });
  expect(assessment.missing).toContainEqual(expect.objectContaining({ code: 'ANIMATION_STAGE_RESOURCE_REQUIRED' }));

  config.resources.animationResourceIds = ['44'];
  assessment = assessMagicMirrorConfig({
    config,
    issues: [],
    resourcesById: { 44: { id: '44', purpose: 'animation', placement: 'start' } },
    translate: t,
  });
  expect(assessment.missing.some((entry) => entry.code === 'ANIMATION_STAGE_RESOURCE_REQUIRED')).toBe(false);

  config.experience.animationEnabledByStage.start = false;
  config.resources.animationResourceIds = [];
  assessment = assessMagicMirrorConfig({ config, issues: [], resourcesById: {}, translate: t });
  expect(assessment.missing.some((entry) => entry.code === 'ANIMATION_STAGE_RESOURCE_REQUIRED')).toBe(false);
});

test('routes resource validation failures by their actual purpose', () => {
  expect(mirrorIssueTarget(
    { path: 'resources.77', code: 'RESOURCE_INACTIVE' },
    { 77: { id: '77', purpose: 'frame' } },
  )).toEqual({ section: 'design', designSection: 'frame' });
  expect(mirrorIssueTarget(
    { path: 'resources.88', code: 'RESOURCE_MIME_MISMATCH' },
    { 88: { id: '88', purpose: 'animation' } },
  )).toEqual({ section: 'experience' });

  const config = defaultMirrorConfig();
  config.layout.frameLayers = [{ id: 'frame-99', resourceId: '99', x: 0, y: 0, width: 100, height: 100, rotation: 0, order: 0 }];
  expect(mirrorIssueTarget(
    { path: 'resources.99', code: 'RESOURCE_NOT_AVAILABLE' },
    {},
    config,
  )).toEqual({ section: 'design', designSection: 'frame' });
});

test('produces localized user-facing guidance', () => {
  setLocale('en');
  const config = defaultMirrorConfig();
  config.experience.animationEnabledByStage.start = true;
  const assessment = assessMagicMirrorConfig({ config, issues: [], resourcesById: {}, translate: t });
  expect(assessment.missing[0]).toEqual(expect.objectContaining({
    reason: 'The stage is enabled but does not have a selected video yet.',
  }));
  setLocale('es');
});

test('shows preset origin only as applied format information', () => {
  setLocale('es');
  const config = defaultMirrorConfig();
  config.layout.presetOrigin = { libraryAssetId: '329', name: 'Recuerdo clásico', source: 'global', contentHash: 'hash' };
  const assessment = assessMagicMirrorConfig({ config, issues: [], resourcesById: {}, translate: t });
  expect(assessment.applied.find((item) => item.id === 'applied-format')?.detail).toContain('Plantilla: Recuerdo clásico · Global');
  expect(assessment.missing).toHaveLength(0);
});

test('normalizes obsolete or empty validation failures without leaving an unexplained invalid state', () => {
  expect(normalizeMirrorValidationResult({ valid: false, errors: [{ path: 'resources', code: 'FRAME_REQUIRED' }] })).toEqual(expect.objectContaining({ valid: true, errors: [] }));
  expect(normalizeMirrorValidationResult({ valid: false, errors: [] })).toEqual(expect.objectContaining({
    valid: false,
    errors: [expect.objectContaining({ code: 'CONFIG_VALIDATION_INCOMPLETE' })],
  }));
});
