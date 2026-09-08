#import "RCTNativeKapturaPrinter.h"

#import <ReactCommon/RCTTurboModule.h>
#import <UIKit/UIKit.h>

@implementation RCTNativeKapturaPrinter

- (void)pickPrinter:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  dispatch_async(dispatch_get_main_queue(), ^{
    UIPrinterPickerController *picker = [UIPrinterPickerController printerPickerControllerWithInitiallySelectedPrinter:nil];
    [picker presentAnimated:YES completionHandler:^(UIPrinterPickerController *controller, BOOL userDidSelect, NSError *error) {
      if (error) {
        reject(@"PRINTER_PICKER_FAILED", @"No se pudo abrir el selector de impresoras", error);
        return;
      }
      if (!userDidSelect || !controller.selectedPrinter) {
        reject(@"PRINTER_PICKER_CANCELLED", @"Seleccion cancelada", nil);
        return;
      }
      UIPrinter *printer = controller.selectedPrinter;
      resolve(@{
        @"name": printer.displayName ?: @"Impresora",
        @"url": printer.URL.absoluteString ?: @""
      });
    }];
  });
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeKapturaPrinterSpecJSI>(params);
}

+ (NSString *)moduleName
{
  return @"NativeKapturaPrinter";
}

@end
