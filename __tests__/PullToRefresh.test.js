import React from 'react';
import { RefreshControl } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import { usePullToRefresh } from '../src/hooks/usePullToRefresh';
import { PullToRefreshControl } from '../src/components/PullToRefreshControl';
import { getTheme } from '../src/design-system/theme';
import { recordClientTechnicalError } from '../src/services/errorHandling';

jest.mock('../src/services/errorHandling', () => ({ recordClientTechnicalError: jest.fn() }));
function Harness({ load, disabled = false, theme, onError }) {
  const refresh = usePullToRefresh(load, { disabled, onError });
  return <PullToRefreshControl theme={theme} {...refresh} disabled={disabled} />;
}
beforeEach(() => jest.clearAllMocks());

it.each(['light', 'dark'])('uses theme colors and a controlled spinner in %s', async mode => {
  const theme = getTheme(mode);
  let finish;
  const load = jest.fn(() => new Promise(resolve => { finish = resolve; }));
  let tree;
  act(() => { tree = renderer.create(<Harness theme={theme} load={load} />); });
  const control = () => tree.root.findByType(RefreshControl);
  expect(control().props).toMatchObject({ refreshing: false, colors: [theme.primary], tintColor: theme.primary, progressBackgroundColor: theme.surface });
  let request;
  act(() => { request = control().props.onRefresh(); control().props.onRefresh(); });
  expect(control().props.refreshing).toBe(true);
  expect(load).toHaveBeenCalledTimes(1);
  await act(async () => { finish(); await request; });
  expect(control().props.refreshing).toBe(false);
  act(() => tree.unmount());
});

it('does not reload when disabled and always releases the spinner after failure', async () => {
  const load = jest.fn().mockRejectedValue(new Error('Offline'));
  const onError = jest.fn();
  let tree;
  act(() => { tree = renderer.create(<Harness theme={getTheme('dark')} disabled load={load} onError={onError} />); });
  await act(async () => tree.root.findByType(RefreshControl).props.onRefresh());
  expect(load).not.toHaveBeenCalled();
  expect(tree.root.findByType(RefreshControl).props.enabled).toBe(false);
  act(() => tree.update(<Harness theme={getTheme('dark')} load={load} onError={onError} />));
  await act(async () => tree.root.findByType(RefreshControl).props.onRefresh());
  expect(tree.root.findByType(RefreshControl).props.refreshing).toBe(false);
  expect(onError).toHaveBeenCalledWith(expect.any(Error));
  expect(recordClientTechnicalError).toHaveBeenCalledWith(expect.objectContaining({ code: 'PULL_REFRESH_FAILED' }));
  act(() => tree.unmount());
});

it('allows an in-flight refresh to finish after its screen closes', async () => {
  let finish;
  let tree;
  act(() => { tree = renderer.create(<Harness theme={getTheme('light')} load={() => new Promise(resolve => { finish = resolve; })} />); });
  let request;
  act(() => { request = tree.root.findByType(RefreshControl).props.onRefresh(); });
  act(() => tree.unmount());
  await act(async () => { finish(); await request; });
  expect(recordClientTechnicalError).not.toHaveBeenCalled();
});
