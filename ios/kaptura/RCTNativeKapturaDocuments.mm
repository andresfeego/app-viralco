#import "RCTNativeKapturaDocuments.h"
#import <UIKit/UIKit.h>
#import <ReactCommon/RCTTurboModule.h>

@implementation RCTNativeKapturaDocuments
- (void)renderPdfPage:(NSString *)path page:(double)pageIndex resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
    @autoreleasepool {
      NSString *cache = NSSearchPathForDirectoriesInDomains(NSCachesDirectory, NSUserDomainMask, YES).firstObject;
      NSString *root = [[[cache stringByAppendingPathComponent:@"kaptura-private-receipts"] stringByResolvingSymlinksInPath] stringByAppendingString:@"/"];
      NSString *safe = path.stringByResolvingSymlinksInPath;
      if (![safe hasPrefix:root] || ![safe.lastPathComponent isEqualToString:@"receipt.pdf"] || !isfinite(pageIndex) || pageIndex < 0 || floor(pageIndex) != pageIndex) {
        reject(@"DOCUMENT_INVALID", @"DOCUMENT_INVALID", nil); return;
      }
      CGPDFDocumentRef document = CGPDFDocumentCreateWithURL((__bridge CFURLRef)[NSURL fileURLWithPath:safe]);
      if (!document) { reject(@"DOCUMENT_INVALID", @"DOCUMENT_INVALID", nil); return; }
      size_t count = CGPDFDocumentGetNumberOfPages(document);
      if (pageIndex >= count || CGPDFDocumentIsEncrypted(document)) {
        CGPDFDocumentRelease(document); reject(@"DOCUMENT_INVALID", @"DOCUMENT_INVALID", nil); return;
      }
      CGPDFPageRef page = CGPDFDocumentGetPage(document, (size_t)pageIndex + 1);
      CGRect box = CGPDFPageGetBoxRect(page, kCGPDFCropBox);
      CGSize source = box.size;
      if (abs(CGPDFPageGetRotationAngle(page)) % 180 == 90) source = CGSizeMake(source.height, source.width);
      if (!isfinite(source.width) || !isfinite(source.height) || source.width <= 0 || source.height <= 0) {
        CGPDFDocumentRelease(document); reject(@"DOCUMENT_INVALID", @"DOCUMENT_INVALID", nil); return;
      }
      CGFloat factor = 3072.0 / MAX(source.width, source.height);
      CGSize size = CGSizeMake(MAX(1, ceil(source.width * factor)), MAX(1, ceil(source.height * factor)));
      UIGraphicsImageRendererFormat *format = [UIGraphicsImageRendererFormat defaultFormat];
      format.scale = 1; format.opaque = YES;
      UIGraphicsImageRenderer *renderer = [[UIGraphicsImageRenderer alloc] initWithSize:size format:format];
      NSData *png = [renderer PNGDataWithActions:^(UIGraphicsImageRendererContext *context) {
        [UIColor.whiteColor setFill]; UIRectFill((CGRect){CGPointZero, size});
        CGContextRef cg = context.CGContext;
        CGContextTranslateCTM(cg, 0, size.height); CGContextScaleCTM(cg, factor, -factor);
        // CoreGraphics fits oversized pages but does not enlarge small pages.
        // Apply raster resolution explicitly, then align the original page box.
        CGContextConcatCTM(cg, CGPDFPageGetDrawingTransform(page, kCGPDFCropBox, (CGRect){CGPointZero, source}, 0, YES));
        CGContextDrawPDFPage(cg, page);
      }];
      CGPDFDocumentRelease(document);
      NSString *output = [safe.stringByDeletingLastPathComponent stringByAppendingPathComponent:[NSString stringWithFormat:@"page-%.0f.png", pageIndex]];
      NSError *error;
      if (![png writeToFile:output options:NSDataWritingAtomic | NSDataWritingFileProtectionComplete error:&error]) {
        reject(@"DOCUMENT_RENDER_FAILED", @"DOCUMENT_RENDER_FAILED", error); return;
      }
      resolve(@{@"uri": [NSURL fileURLWithPath:output].absoluteString, @"width": @(size.width), @"height": @(size.height), @"pageCount": @(count)});
    }
  });
}
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeKapturaDocumentsSpecJSI>(params);
}
+ (NSString *)moduleName { return @"NativeKapturaDocuments"; }
@end
