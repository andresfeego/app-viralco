import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export type PrinterSelection = {
  name: string;
  url: string;
};

export interface Spec extends TurboModule {
  pickPrinter(): Promise<PrinterSelection>;
  // JSON keeps the native job contract versioned independently of MirrorConfigV1.
  printDocument(jobJson: string): Promise<string>;
  openManual(path: string): Promise<boolean>;
}

export default TurboModuleRegistry.get<Spec>('NativeKapturaPrinter');
