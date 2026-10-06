import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Switch } from 'react-native';
import { BillingReviewForm, paymentReviewBlockers } from '../src/components/BillingReviewForm';
import { getTheme } from '../src/design-system/theme';
import { setLocale, t } from '../src/i18n';

jest.mock('../src/components/PaperFormInput', () => ({ PaperFormInput: 'Input' }));
const report = { expectedAmountCop: 50000, amountCop: 50000, duplicateCount: 0 };
const ready = { receivedAmountCop: '50000', bankReference: 'BANK-1', receivedConfirmed: true, duplicatesAcknowledged: false, reason: '', observations: '' };
afterEach(() => setLocale('es'));

test('approval does not require notes or a rejection reason', () => {
  expect(paymentReviewBlockers(ready, report)).toEqual([]);
  expect(paymentReviewBlockers({ ...ready, reason: 'unused', observations: 'Optional' }, report)).toEqual([]);
});
test.each([
  [{ receivedAmountCop: '' }, {}, 'reviewAmountMismatch'],
  [{ receivedAmountCop: '50001' }, {}, 'reviewAmountMismatch'],
  [{ receivedAmountCop: '49999.9' }, {}, 'reviewAmountMismatch'],
  [{}, { amountCop: 40000 }, 'reviewReportedMismatch'],
  [{ bankReference: '   ' }, {}, 'reviewReferenceRequired'],
  [{ bankReference: 'X'.repeat(161) }, {}, 'reviewReferenceRequired'],
  [{ receivedConfirmed: false }, {}, 'reviewConfirmRequired'],
  [{}, { duplicateCount: 1 }, 'reviewDuplicateRequired'],
  [{ observations: 'X'.repeat(2001) }, {}, 'reviewNotesTooLong'],
])('explains every approval blocker %#', (changes, reportChanges, expected) => {
  expect(paymentReviewBlockers({ ...ready, ...changes }, { ...report, ...reportChanges })).toContain(expected);
});
test.each([['light', 'es'], ['dark', 'en']])('uses visible native confirmations and multiline notes in %s/%s', (mode, language) => {
  setLocale(language);
  let tree;
  const onChange = jest.fn();
  act(() => { tree = renderer.create(<BillingReviewForm theme={getTheme(mode)} report={{ ...report, duplicateCount: 1 }} review={{ ...ready, receivedConfirmed: false }} onChange={onChange} />); });
  const toggles = tree.root.findAllByType(Switch);
  expect(toggles).toHaveLength(2);
  expect(toggles[0].props.value).toBe(false);
  expect(toggles[0].props.accessibilityLabel).toBe(t('billing_receivedConfirm'));
  expect(toggles[0].props.trackColor).toMatchObject({ true: getTheme(mode).primary });
  act(() => toggles[0].props.onValueChange(true));
  expect(onChange.mock.calls[0][0](ready).receivedConfirmed).toBe(true);
  expect(tree.root.findByProps({ testID: 'billing-review-observations' }).props).toMatchObject({ multiline: true, value: '', label: t('billing_observationsOptional') });
  expect(JSON.stringify(tree.toJSON())).toContain(t('billing_reviewConfirmRequired'));
  act(() => tree.unmount());
});
