import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export type PrinterSelection = {
  name: string;
  url: string;
};

export interface Spec extends TurboModule {
  pickPrinter(): Promise<PrinterSelection>;
}

export default TurboModuleRegistry.get<Spec>('NativeKapturaPrinter');
