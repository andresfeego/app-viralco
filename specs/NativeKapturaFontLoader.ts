import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  loadFont(fontId: string, sourceUrl: string): Promise<string>;
}

export default TurboModuleRegistry.get<Spec>('NativeKapturaFontLoader');
