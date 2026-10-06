import { NativeModules, Platform, TurboModuleRegistry } from 'react-native';
import type { TurboModule } from 'react-native';
import { resolveApiBaseUrl } from './resolveApiBaseUrl';

interface SourceCodeModule extends TurboModule {
  getConstants(): { scriptURL: string };
}

export const API_BASE_URL = resolveApiBaseUrl({
  explicitUrl: process.env.VIRALCO_API_URL,
  // SourceCode exposes constants through its TurboModule on the new architecture.
  scriptURL: TurboModuleRegistry.get<SourceCodeModule>('SourceCode')?.getConstants?.().scriptURL
    ?? NativeModules.SourceCode?.scriptURL,
  platform: Platform.OS,
  development: __DEV__,
});
