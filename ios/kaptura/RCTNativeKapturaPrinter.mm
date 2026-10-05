#import "RCTNativeKapturaPrinter.h"

#import <ReactCommon/RCTTurboModule.h>
#import <UIKit/UIKit.h>
#import <React/RCTUtils.h>

// The renderer refuses incompatible media instead of silently scaling/cropping a job.
@interface KapturaPDFRenderer : UIPrintPageRenderer <UIPrintInteractionControllerDelegate>
@property(nonatomic) CGPDFDocumentRef document;
@property(nonatomic) CGSize requestedSize;
@property(nonatomic) CGFloat requestedMargin;
@property(nonatomic, copy) NSString *failure;
@end

@implementation KapturaPDFRenderer
- (void)dealloc { if (_document) CGPDFDocumentRelease(_document); }
- (UIPrintPaper *)printInteractionController:(UIPrintInteractionController *)controller choosePaper:(NSArray<UIPrintPaper *> *)papers {
  for (UIPrintPaper *paper in papers) {
    CGSize s = paper.paperSize, r = self.requestedSize;
    if (fabs(MIN(s.width,s.height)-MIN(r.width,r.height)) <= 2 && fabs(MAX(s.width,s.height)-MAX(r.width,r.height)) <= 2) return paper;
  }
  self.failure = @"PRINT_PAPER_UNSUPPORTED";
  return papers.firstObject;
}
- (BOOL)usablePaper {
  if (self.failure) return NO;
  CGRect paper = self.paperRect;
  if (paper.size.width <= 0 || paper.size.height <= 0) return YES; // UIKit first asks for page count before selecting media.
  if (fabs(paper.size.width-self.requestedSize.width)>2 || fabs(paper.size.height-self.requestedSize.height)>2) {
    self.failure = @"PRINT_PAPER_UNSUPPORTED"; return NO;
  }
  CGRect needed = CGRectInset(paper, self.requestedMargin, self.requestedMargin);
  if (!CGRectContainsRect(CGRectInset(self.printableRect, -1, -1), needed)) { self.failure = @"PRINT_MARGIN_UNSUPPORTED"; return NO; }
  return YES;
}
- (NSInteger)numberOfPages { return [self usablePaper] && self.document ? CGPDFDocumentGetNumberOfPages(self.document) : 0; }
- (void)drawPageAtIndex:(NSInteger)index inRect:(CGRect)rect {
  if (![self usablePaper]) return;
  CGPDFPageRef page = CGPDFDocumentGetPage(self.document, index+1);
  if (!page) return;
  CGContextRef context = UIGraphicsGetCurrentContext();
  CGContextSaveGState(context);
  CGContextTranslateCTM(context, 0, self.requestedSize.height);
  CGContextScaleCTM(context, 1, -1);
  CGContextDrawPDFPage(context, page);
  CGContextRestoreGState(context);
}
@end

@interface RCTNativeKapturaPrinter () <UIDocumentInteractionControllerDelegate>
@property(nonatomic) BOOL busy;
@property(nonatomic, strong) UIDocumentInteractionController *manualController;
@property(nonatomic, weak) UIViewController *manualPresenter;
@property(nonatomic, copy) RCTPromiseResolveBlock manualResolve;
@end

@implementation RCTNativeKapturaPrinter

- (void)openManual:(NSString *)path resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  dispatch_async(dispatch_get_main_queue(), ^{
    NSString *root = [[[NSHomeDirectory() stringByAppendingPathComponent:@"Documents/kaptura-print-manuals"] stringByResolvingSymlinksInPath] stringByAppendingString:@"/"];
    NSString *safe = path.stringByResolvingSymlinksInPath;
    if (self.manualController || ![safe hasPrefix:root] || ![safe.pathExtension isEqualToString:@"pdf"] || ![[NSFileManager defaultManager] fileExistsAtPath:safe]) { reject(@"MANUAL_UNAVAILABLE", @"MANUAL_UNAVAILABLE", nil); return; }
    self.manualPresenter = RCTPresentedViewController();
    self.manualController = [UIDocumentInteractionController interactionControllerWithURL:[NSURL fileURLWithPath:safe]];
    self.manualController.delegate = self;
    self.manualResolve = resolve;
    if (![self.manualController presentPreviewAnimated:YES]) { self.manualController = nil; self.manualResolve = nil; reject(@"MANUAL_UNAVAILABLE", @"MANUAL_UNAVAILABLE", nil); }
  });
}
- (UIViewController *)documentInteractionControllerViewControllerForPreview:(UIDocumentInteractionController *)controller { return self.manualPresenter; }
- (void)documentInteractionControllerDidEndPreview:(UIDocumentInteractionController *)controller {
  if (self.manualResolve) self.manualResolve(@YES);
  self.manualResolve = nil; self.manualController = nil; self.manualPresenter = nil;
}

- (void)pickPrinter:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  dispatch_async(dispatch_get_main_queue(), ^{
    if (self.busy) { reject(@"PRINT_BUSY", @"PRINT_BUSY", nil); return; }
    self.busy = YES;
    UIPrinterPickerController *picker = [UIPrinterPickerController printerPickerControllerWithInitiallySelectedPrinter:nil];
    BOOL presented = [picker presentAnimated:YES completionHandler:^(UIPrinterPickerController *controller, BOOL userDidSelect, NSError *error) {
      self.busy = NO;
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
    if (!presented) { self.busy = NO; reject(@"PRINTER_PICKER_FAILED", @"No se pudo abrir el selector de impresoras", nil); }
  });
}

- (void)printDocument:(NSString *)jobJson resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  dispatch_async(dispatch_get_main_queue(), ^{
    if (self.busy) { reject(@"PRINT_BUSY", @"PRINT_BUSY", nil); return; }
    if (UIApplication.sharedApplication.applicationState != UIApplicationStateActive) { reject(@"PRINT_NOT_ACTIVE", @"PRINT_NOT_ACTIVE", nil); return; }
    self.busy = YES;
    NSError *parseError;
    id parsed = [NSJSONSerialization JSONObjectWithData:[jobJson dataUsingEncoding:NSUTF8StringEncoding] options:0 error:&parseError];
    NSDictionary *job = [parsed isKindOfClass:NSDictionary.class] ? parsed : @{};
    NSDictionary *o = [job[@"options"] isKindOfClass:NSDictionary.class] ? job[@"options"] : @{};
    NSArray *items = job[@"items"];
    double w = [o[@"widthMm"] doubleValue], h = [o[@"heightMm"] doubleValue], margin = [o[@"marginMm"] doubleValue], dpi = [o[@"dpi"] doubleValue];
    NSInteger copies = [o[@"copies"] integerValue];
    NSURL *printerURL = [NSURL URLWithString:job[@"printerUrl"] ?: @""];
    if (parseError || ![o isKindOfClass:NSDictionary.class] || ![items isKindOfClass:NSArray.class] || !items.count || items.count*copies>500 || copies<1 || copies>100 ||
        !isfinite(w) || !isfinite(h) || !isfinite(margin) || w<20 || h<20 || w>2000 || h>2000 || margin<0 || margin>=MIN(w,h)/2 || dpi<72 || dpi>1200 ||
        ![@[@"contain",@"cover"] containsObject:o[@"fit"]] || ![@[@"color",@"grayscale"] containsObject:o[@"colorMode"]] || !printerURL.host ||
        ![@[@"ipp",@"ipps",@"http",@"https"] containsObject:printerURL.scheme.lowercaseString]) {
      self.busy = NO; reject(@"PRINT_SETTINGS_INVALID", @"PRINT_SETTINGS_INVALID", nil); return;
    }
    const CGFloat pointsPerMm = 72.0/25.4;
    CGSize size = CGSizeMake(w*pointsPerMm,h*pointsPerMm);
    CGFloat inset = margin*pointsPerMm;
    NSString *path = [NSTemporaryDirectory() stringByAppendingPathComponent:[NSString stringWithFormat:@"kaptura-print-%@.pdf",NSUUID.UUID.UUIDString]];
    dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED,0), ^{
      __block NSString *failure = nil;
      UIGraphicsPDFRenderer *pdf = [[UIGraphicsPDFRenderer alloc] initWithBounds:(CGRect){CGPointZero,size}];
      NSError *pdfError;
      BOOL written = [pdf writePDFToURL:[NSURL fileURLWithPath:path] withActions:^(UIGraphicsPDFRendererContext *context) {
        for (NSDictionary *item in items) { @autoreleasepool {
          NSString *source = [item[@"path"] stringByResolvingSymlinksInPath];
          if (![source hasPrefix:[NSHomeDirectory() stringByAppendingString:@"/"]]) { failure=@"PRINT_FILE_MISSING"; break; }
          UIImage *image = [UIImage imageWithContentsOfFile:source];
          if (!image || image.size.width<=0 || image.size.height<=0) { failure=@"PRINT_FILE_MISSING"; break; }
          if ([o[@"colorMode"] isEqual:@"grayscale"]) {
            CGColorSpaceRef gray = CGColorSpaceCreateDeviceGray();
            CGContextRef bitmap = CGBitmapContextCreate(NULL, CGImageGetWidth(image.CGImage), CGImageGetHeight(image.CGImage),8,0,gray,kCGImageAlphaNone);
            CGColorSpaceRelease(gray);
            if (!bitmap) { failure=@"PRINT_PREPARE_FAILED"; break; }
            CGContextDrawImage(bitmap, CGRectMake(0,0,CGImageGetWidth(image.CGImage),CGImageGetHeight(image.CGImage)),image.CGImage);
            CGImageRef grayImage = CGBitmapContextCreateImage(bitmap);
            image = [UIImage imageWithCGImage:grayImage scale:image.scale orientation:image.imageOrientation];
            CGImageRelease(grayImage); CGContextRelease(bitmap);
          }
          for (NSInteger copy=0;copy<copies;copy++) {
            [context beginPage];
            [[UIColor whiteColor] setFill]; UIRectFill((CGRect){CGPointZero,size});
            BOOL two = [o[@"twoPerPage"] boolValue];
            CGRect cell = CGRectInset((CGRect){CGPointZero,size},inset,inset);
            if (two) { if (size.width>=size.height) cell.size.width/=2; else cell.size.height/=2; }
            for (NSInteger n=0;n<(two?2:1);n++) {
              CGRect targetCell=cell;
              if (size.width>=size.height) targetCell.origin.x+=n*cell.size.width; else targetCell.origin.y+=n*cell.size.height;
              CGFloat sx=cell.size.width/image.size.width, sy=cell.size.height/image.size.height;
              CGFloat scale=[o[@"fit"] isEqual:@"cover"]?MAX(sx,sy):MIN(sx,sy);
              CGSize draw=CGSizeMake(image.size.width*scale,image.size.height*scale);
              CGContextSaveGState(context.CGContext); CGContextClipToRect(context.CGContext,targetCell);
              [image drawInRect:CGRectMake(CGRectGetMidX(targetCell)-draw.width/2,CGRectGetMidY(targetCell)-draw.height/2,draw.width,draw.height)];
              CGContextRestoreGState(context.CGContext);
            }
          }
        } }
      } error:&pdfError];
      dispatch_async(dispatch_get_main_queue(), ^{
        if (!written || failure || UIApplication.sharedApplication.applicationState != UIApplicationStateActive) {
          [[NSFileManager defaultManager] removeItemAtPath:path error:nil]; self.busy=NO;
          reject(failure ?: @"PRINT_PREPARE_FAILED", failure ?: @"PRINT_PREPARE_FAILED",pdfError); return;
        }
        UIPrinter *printer = [UIPrinter printerWithURL:printerURL];
        __block BOOL contacted=NO;
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW,15*NSEC_PER_SEC),dispatch_get_main_queue(), ^{
          if (contacted) return;
          contacted=YES; self.busy=NO; [[NSFileManager defaultManager] removeItemAtPath:path error:nil];
          reject(@"PRINT_PRINTER_UNAVAILABLE",@"PRINT_PRINTER_UNAVAILABLE",nil);
        });
        [printer contactPrinter:^(BOOL available) {
          dispatch_async(dispatch_get_main_queue(), ^{
            if (contacted) return; contacted=YES;
            if (!available || UIApplication.sharedApplication.applicationState != UIApplicationStateActive) {
              self.busy=NO; [[NSFileManager defaultManager] removeItemAtPath:path error:nil]; reject(@"PRINT_PRINTER_UNAVAILABLE",@"PRINT_PRINTER_UNAVAILABLE",nil); return;
            }
            KapturaPDFRenderer *renderer=[KapturaPDFRenderer new]; renderer.requestedSize=size; renderer.requestedMargin=inset;
            renderer.document=CGPDFDocumentCreateWithURL((__bridge CFURLRef)[NSURL fileURLWithPath:path]);
            UIPrintInteractionController *controller=UIPrintInteractionController.sharedPrintController;
            UIPrintInfo *info=[UIPrintInfo printInfo]; info.jobName=job[@"name"] ?: @"Kaptura";
            info.orientation=size.width>size.height?UIPrintInfoOrientationLandscape:UIPrintInfoOrientationPortrait;
            info.outputType=[o[@"colorMode"] isEqual:@"grayscale"]?UIPrintInfoOutputGrayscale:UIPrintInfoOutputPhoto;
            info.duplex=UIPrintInfoDuplexNone;
            controller.printInfo=info; controller.printingItem=nil; controller.printingItems=nil;
            controller.printPageRenderer=renderer; controller.delegate=renderer;
            __block BOOL settled=NO;
            void (^finish)(BOOL,NSError *)=^(BOOL completed,NSError *error) {
              if (settled) return; settled=YES; self.busy=NO;
              controller.printPageRenderer=nil; controller.delegate=nil;
              [[NSFileManager defaultManager] removeItemAtPath:path error:nil];
              if (renderer.failure || error) reject(renderer.failure ?: @"PRINT_SEND_FAILED",renderer.failure ?: @"PRINT_SEND_FAILED",error);
              else resolve(completed?@"{\"status\":\"completed\"}":@"{\"status\":\"cancelled\"}");
            };
            BOOL started=[controller printToPrinter:printer completionHandler:^(UIPrintInteractionController *c,BOOL completed,NSError *error) { finish(completed,error); }];
            if (!started) finish(NO,[NSError errorWithDomain:@"KapturaPrint" code:1 userInfo:nil]);
          });
        }];
      });
    });
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
