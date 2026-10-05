export function resolveApiBaseUrl({ explicitUrl, scriptURL, platform, development }) {
  const configured = String(explicitUrl || '').trim().replace(/\/+$/, '');
  if (configured) return configured;
  if (development && /^https?:\/\//i.test(scriptURL || '')) {
    // Metro and the API normally run on the same computer. Keep IPv6 brackets.
    const host = scriptURL.match(/^https?:\/\/(\[[^\]]+\]|[^/:]+)(?::\d+)?(?:\/|$)/i)?.[1];
    if (host) return `http://${host}:4000`;
  }
  return `http://${platform === 'android' ? '10.0.2.2' : 'localhost'}:4000`;
}
