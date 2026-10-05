import { NativeModules, Platform } from 'react-native';
import { resolveApiBaseUrl } from './resolveApiBaseUrl';

export const API_BASE_URL = resolveApiBaseUrl({
  explicitUrl: process.env.VIRALCO_API_URL,
  scriptURL: NativeModules.SourceCode?.scriptURL,
  platform: Platform.OS,
  development: __DEV__,
});
