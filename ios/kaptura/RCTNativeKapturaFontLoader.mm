#import "RCTNativeKapturaFontLoader.h"

#import <CoreText/CoreText.h>
#import <ReactCommon/RCTTurboModule.h>

@implementation RCTNativeKapturaFontLoader

- (void)loadFont:(NSString *)fontId
       sourceUrl:(NSString *)sourceUrl
         resolve:(RCTPromiseResolveBlock)resolve
          reject:(RCTPromiseRejectBlock)reject
{
  dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
    @autoreleasepool {
      NSCharacterSet *invalidCharacters = [[NSCharacterSet alphanumericCharacterSet] invertedSet];
      NSString *safeId = [[fontId componentsSeparatedByCharactersInSet:invalidCharacters] componentsJoinedByString:@"_"];
      NSURL *remoteURL = [NSURL URLWithString:sourceUrl];
      if (!remoteURL || !safeId.length) {
        reject(@"RUNTIME_FONT_INPUT_INVALID", @"La fuente no tiene una URL válida", nil);
        return;
      }

      NSURL *cacheDirectory = [[[NSFileManager defaultManager] URLsForDirectory:NSCachesDirectory inDomains:NSUserDomainMask] firstObject];
      NSURL *fontDirectory = [cacheDirectory URLByAppendingPathComponent:@"kaptura-fonts" isDirectory:YES];
      NSError *directoryError = nil;
      if (![[NSFileManager defaultManager] createDirectoryAtURL:fontDirectory withIntermediateDirectories:YES attributes:nil error:&directoryError]) {
        reject(@"RUNTIME_FONT_CACHE_FAILED", @"No se pudo preparar la caché de fuentes", directoryError);
        return;
      }

      NSURL *fontURL = [fontDirectory URLByAppendingPathComponent:[safeId stringByAppendingPathExtension:@"font"]];
      if (![[NSFileManager defaultManager] fileExistsAtPath:fontURL.path]) {
        NSError *downloadError = nil;
        NSData *fontData = [NSData dataWithContentsOfURL:remoteURL options:NSDataReadingMappedIfSafe error:&downloadError];
        if (!fontData.length || ![fontData writeToURL:fontURL options:NSDataWritingAtomic error:&downloadError]) {
          reject(@"RUNTIME_FONT_DOWNLOAD_FAILED", @"No se pudo descargar la fuente", downloadError);
          return;
        }
      }

      CFArrayRef descriptors = CTFontManagerCreateFontDescriptorsFromURL((__bridge CFURLRef)fontURL);
      CTFontDescriptorRef descriptor = descriptors && CFArrayGetCount(descriptors) > 0
        ? (CTFontDescriptorRef)CFArrayGetValueAtIndex(descriptors, 0)
        : nil;
      if (!descriptor) {
        if (descriptors) CFRelease(descriptors);
        [[NSFileManager defaultManager] removeItemAtURL:fontURL error:nil];
        reject(@"RUNTIME_FONT_INVALID", @"El archivo de fuente no es válido", nil);
        return;
      }
      NSString *postScriptName = descriptor
        ? CFBridgingRelease(CTFontDescriptorCopyAttribute(descriptor, kCTFontNameAttribute))
        : nil;

      CFErrorRef registrationError = NULL;
      BOOL registered = CTFontManagerRegisterFontsForURL((__bridge CFURLRef)fontURL, kCTFontManagerScopeProcess, &registrationError);
      BOOL alreadyRegistered = registrationError && CFErrorGetCode(registrationError) == kCTFontManagerErrorAlreadyRegistered;
      if (!registered && !alreadyRegistered) {
        NSError *error = registrationError ? CFBridgingRelease(registrationError) : nil;
        if (descriptors) CFRelease(descriptors);
        reject(@"RUNTIME_FONT_REGISTER_FAILED", @"No se pudo registrar la fuente", error);
        return;
      }
      if (registrationError) CFRelease(registrationError);
      if (descriptors) CFRelease(descriptors);

      if (!postScriptName.length) {
        reject(@"RUNTIME_FONT_NAME_FAILED", @"No se pudo resolver el nombre de la fuente", nil);
        return;
      }
      dispatch_async(dispatch_get_main_queue(), ^{ resolve(postScriptName); });
    }
  });
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeKapturaFontLoaderSpecJSI>(params);
}

+ (NSString *)moduleName
{
  return @"NativeKapturaFontLoader";
}

@end
