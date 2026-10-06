import { NativeModules, Platform, TurboModuleRegistry } from 'react-native';
import { resolveApiBaseUrl } from './resolveApiBaseUrl';

export const API_BASE_URL = resolveApiBaseUrl({
  explicitUrl: process.env.VIRALCO_API_URL,
  // SourceCode exposes constants through its TurboModule on the new architecture.
  scriptURL: TurboModuleRegistry.get('SourceCode')?.getConstants?.().scriptURL
    ?? NativeModules.SourceCode?.scriptURL,
  platform: Platform.OS,
  development: __DEV__,
});
