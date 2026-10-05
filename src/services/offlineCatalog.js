import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

let subject = '';
let generation = 0;
export function setOfflineUser(id) { if (subject !== String(id || '')) generation += 1; subject = String(id || ''); }
export const offlineIdentity = () => ({ subject, generation });
export const sameOfflineIdentity = value => value.subject === subject && value.generation === generation;
export function cacheablePath(path) {
  return /^\/api\/(accounts(?:\/\d+(?:\/events)?)?|permissions\/me|events\/(?:types|modes|\d+(?:\/modes\/\d+\/config\/published)?))$/.test(path);
}
const key = (id, path) => `@kaptura/catalog:v1:${id}:${path}`;
export async function readCatalog(id, path) {
  if (!id) return null;
  try { return JSON.parse(await AsyncStorage.getItem(key(id, path)) || 'null'); } catch { return null; }
}
export async function writeCatalog(id, path, data) {
  if (id) await AsyncStorage.setItem(key(id, path), JSON.stringify({ data, savedAt: new Date().toISOString() }));
}
export async function removeCatalog(id, path) { if (id) await AsyncStorage.removeItem(key(id, path)); }
export async function networkAvailable() {
  let timer;
  try {
    const state = await Promise.race([NetInfo.fetch(), new Promise(resolve => { timer = setTimeout(() => resolve(null), 1500); })]);
    return Boolean(state?.isConnected && state.isInternetReachable !== false);
  } catch { return false; } finally { clearTimeout(timer); }
}
