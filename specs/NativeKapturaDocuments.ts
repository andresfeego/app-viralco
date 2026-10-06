import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export type DocumentPage = { uri: string; width: number; height: number; pageCount: number };
export interface Spec extends TurboModule {
  renderPdfPage(path: string, page: number): Promise<DocumentPage>;
}
export default TurboModuleRegistry.get<Spec>('NativeKapturaDocuments');
