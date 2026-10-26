// Level up your life — iOS shell: a full-screen WKWebView running the bundled web app,
// plus a small native bridge (notifications, keep-awake, haptics, background audio, state backup).
#import <UIKit/UIKit.h>
#import <WebKit/WebKit.h>
#import <AVFoundation/AVFoundation.h>
#import <UserNotifications/UserNotifications.h>
#import <AudioToolbox/AudioToolbox.h>

static UIColor *Ink(void) { return [UIColor colorWithRed:0x17/255.0 green:0x15/255.0 blue:0x2a/255.0 alpha:1]; }

@interface RootVC : UIViewController
@end
@implementation RootVC
- (UIStatusBarStyle)preferredStatusBarStyle { return UIStatusBarStyleLightContent; }
@end

@interface AppDelegate : UIResponder <UIApplicationDelegate, WKScriptMessageHandler, WKUIDelegate, UNUserNotificationCenterDelegate>
@property (strong, nonatomic) UIWindow *window;
@property (strong, nonatomic) WKWebView *web;
@property (strong, nonatomic) AVAudioPlayer *player;
@end

@implementation AppDelegate

- (NSURL *)stateFile {
  NSURL *docs = [[NSFileManager defaultManager] URLsForDirectory:NSDocumentDirectory inDomains:NSUserDomainMask].firstObject;
  return [docs URLByAppendingPathComponent:@"luyl-state.json"];
}

// ---- study music: pre-rendered WAV loops played natively (Web Audio is suspended in the background)
- (NSURL *)loopURL:(NSString *)key {
  NSURL *dir = [[NSFileManager defaultManager] URLsForDirectory:NSCachesDirectory inDomains:NSUserDomainMask].firstObject;
  NSString *safe = [[key componentsSeparatedByCharactersInSet:[[NSCharacterSet alphanumericCharacterSet] invertedSet]] componentsJoinedByString:@"_"];
  return [dir URLByAppendingPathComponent:[NSString stringWithFormat:@"luyl-loop-%@.wav", safe]];
}
- (void)fadeOutPlayer {
  AVAudioPlayer *old = self.player;
  self.player = nil;
  if (!old) return;
  [old setVolume:0 fadeDuration:0.8];
  dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.9 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{ [old stop]; });
}
- (void)startLoop:(NSURL *)url volume:(float)v {
  [self fadeOutPlayer];
  [[AVAudioSession sharedInstance] setActive:YES error:nil];
  AVAudioPlayer *p = [[AVAudioPlayer alloc] initWithContentsOfURL:url error:nil];
  if (!p) { [[NSFileManager defaultManager] removeItemAtURL:url error:nil]; return; }
  p.numberOfLoops = -1;
  p.volume = 0;
  [p prepareToPlay];
  [p play];
  [p setVolume:v fadeDuration:1.2];
  self.player = p;
}
- (void)audioInterrupted:(NSNotification *)n {
  NSUInteger type = [n.userInfo[AVAudioSessionInterruptionTypeKey] unsignedIntegerValue];
  if (type == AVAudioSessionInterruptionTypeEnded && self.player) {
    [[AVAudioSession sharedInstance] setActive:YES error:nil];
    [self.player play];
  }
}

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
  // keep study sounds playing with the screen off / in the background, alongside other audio
  AVAudioSession *session = [AVAudioSession sharedInstance];
  [session setCategory:AVAudioSessionCategoryPlayback withOptions:AVAudioSessionCategoryOptionMixWithOthers error:nil];
  [session setActive:YES error:nil];
  [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(audioInterrupted:) name:AVAudioSessionInterruptionNotification object:session];

  UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
  center.delegate = self;
  [center requestAuthorizationWithOptions:(UNAuthorizationOptionAlert | UNAuthorizationOptionSound | UNAuthorizationOptionBadge)
                        completionHandler:^(BOOL granted, NSError *error) {}];

  WKUserContentController *uc = [WKUserContentController new];
  [uc addScriptMessageHandler:self name:@"ios"];

  // the same bridge names the Android build uses, so the web app needs no special casing
  NSMutableString *js = [NSMutableString stringWithString:
    @"window.IOSBridge={"
     "scheduleIn:function(s,t,b){webkit.messageHandlers.ios.postMessage({a:'schedule',s:s,t:String(t),b:String(b)})},"
     "cancelSchedule:function(){webkit.messageHandlers.ios.postMessage({a:'cancel'})},"
     "keepScreenOn:function(on){webkit.messageHandlers.ios.postMessage({a:'awake',on:!!on})},"
     "vibrate:function(ms){webkit.messageHandlers.ios.postMessage({a:'vibrate'})},"
     "save:function(d){webkit.messageHandlers.ios.postMessage({a:'save',d:String(d)})},"
     "open:function(u){webkit.messageHandlers.ios.postMessage({a:'open',u:String(u)})},"
     "scheduleAt:function(slot,at,t,b){webkit.messageHandlers.ios.postMessage({a:'at',slot:slot,at:String(at),t:String(t),b:String(b)})},"
     "cancelAt:function(slot){webkit.messageHandlers.ios.postMessage({a:'unat',slot:slot})},"
     "shareFile:function(n,d,m){webkit.messageHandlers.ios.postMessage({a:'share',n:String(n),d:String(d),m:String(m)});return 'ok'},"
     "audioPlay:function(k,v){webkit.messageHandlers.ios.postMessage({a:'aplay',k:String(k),v:+v})},"
     "audioData:function(k,d,v){webkit.messageHandlers.ios.postMessage({a:'adata',k:String(k),d:String(d),v:+v})},"
     "audioStop:function(){webkit.messageHandlers.ios.postMessage({a:'astop'})},"
     "audioVol:function(v){webkit.messageHandlers.ios.postMessage({a:'avol',v:+v})}"
     "};"];
  // restore the native backup if WebKit storage came back empty
  NSData *saved = [NSData dataWithContentsOfURL:[self stateFile]];
  if (saved.length) {
    NSString *json = [[NSString alloc] initWithData:saved encoding:NSUTF8StringEncoding];
    NSData *quoted = [NSJSONSerialization dataWithJSONObject:@[json] options:0 error:nil];
    NSString *arr = [[NSString alloc] initWithData:quoted encoding:NSUTF8StringEncoding];
    [js appendFormat:@"try{if(!localStorage.getItem('luyl.v1')){localStorage.setItem('luyl.v1',%@[0]);}}catch(e){}", arr];
  }
  [uc addUserScript:[[WKUserScript alloc] initWithSource:js injectionTime:WKUserScriptInjectionTimeAtDocumentStart forMainFrameOnly:YES]];

  WKWebViewConfiguration *cfg = [WKWebViewConfiguration new];
  cfg.userContentController = uc;
  cfg.allowsInlineMediaPlayback = YES;
  cfg.mediaTypesRequiringUserActionForPlayback = WKAudiovisualMediaTypeNone;
  cfg.websiteDataStore = [WKWebsiteDataStore defaultDataStore];

  RootVC *vc = [RootVC new];
  vc.view.backgroundColor = Ink();
  self.web = [[WKWebView alloc] initWithFrame:vc.view.bounds configuration:cfg];
  self.web.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
  self.web.opaque = NO;
  self.web.backgroundColor = Ink();
  self.web.scrollView.backgroundColor = Ink();
  self.web.scrollView.bounces = NO;
  self.web.scrollView.contentInsetAdjustmentBehavior = UIScrollViewContentInsetAdjustmentNever;
  self.web.allowsBackForwardNavigationGestures = YES;
  self.web.UIDelegate = self;
  [vc.view addSubview:self.web];

  self.window = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];
  self.window.backgroundColor = Ink();
  self.window.rootViewController = vc;
  [self.window makeKeyAndVisible];

  NSURL *index = [[NSBundle mainBundle] URLForResource:@"index" withExtension:@"html" subdirectory:@"www"];
  [self.web loadFileURL:index allowingReadAccessToURL:[index URLByDeletingLastPathComponent]];
  return YES;
}

- (void)userContentController:(WKUserContentController *)uc didReceiveScriptMessage:(WKScriptMessage *)message {
  if (![message.body isKindOfClass:[NSDictionary class]]) return;
  NSDictionary *d = message.body;
  NSString *a = d[@"a"];
  UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
  if ([a isEqualToString:@"schedule"]) {
    [center removePendingNotificationRequestsWithIdentifiers:@[@"luyl-timer"]];
    double s = [d[@"s"] doubleValue];
    if (s < 1) return;
    UNMutableNotificationContent *c = [UNMutableNotificationContent new];
    c.title = d[@"t"] ?: @"Level up your life";
    c.body = d[@"b"] ?: @"";
    c.sound = [UNNotificationSound defaultSound];
    if (@available(iOS 15.0, *)) c.interruptionLevel = UNNotificationInterruptionLevelTimeSensitive;
    UNTimeIntervalNotificationTrigger *tr = [UNTimeIntervalNotificationTrigger triggerWithTimeInterval:s repeats:NO];
    [center addNotificationRequest:[UNNotificationRequest requestWithIdentifier:@"luyl-timer" content:c trigger:tr] withCompletionHandler:nil];
  } else if ([a isEqualToString:@"cancel"]) {
    [center removePendingNotificationRequestsWithIdentifiers:@[@"luyl-timer"]];
  } else if ([a isEqualToString:@"awake"]) {
    [UIApplication sharedApplication].idleTimerDisabled = [d[@"on"] boolValue];
  } else if ([a isEqualToString:@"vibrate"]) {
    AudioServicesPlaySystemSound(kSystemSoundID_Vibrate);
  } else if ([a isEqualToString:@"at"]) {
    // daily reminder slot
    NSString *rid = [NSString stringWithFormat:@"luyl-rem-%@", d[@"slot"]];
    [center removePendingNotificationRequestsWithIdentifiers:@[rid]];
    double at = [d[@"at"] doubleValue] / 1000.0, s = at - [[NSDate date] timeIntervalSince1970];
    if (s < 1) return;
    UNMutableNotificationContent *c = [UNMutableNotificationContent new];
    c.title = d[@"t"] ?: @"Level up your life";
    c.body = d[@"b"] ?: @"";
    c.sound = [UNNotificationSound defaultSound];
    UNTimeIntervalNotificationTrigger *tr = [UNTimeIntervalNotificationTrigger triggerWithTimeInterval:s repeats:NO];
    [center addNotificationRequest:[UNNotificationRequest requestWithIdentifier:rid content:c trigger:tr] withCompletionHandler:nil];
  } else if ([a isEqualToString:@"unat"]) {
    [center removePendingNotificationRequestsWithIdentifiers:@[[NSString stringWithFormat:@"luyl-rem-%@", d[@"slot"]]]];
  } else if ([a isEqualToString:@"share"]) {
    // write the file to tmp and open the share sheet (save to Files, KakaoTalk, mail ...)
    NSString *name = [d[@"n"] stringByReplacingOccurrencesOfString:@"/" withString:@"_"];
    NSData *data = [[NSData alloc] initWithBase64EncodedString:d[@"d"] ?: @"" options:0];
    if (!data || !name.length) return;
    NSURL *url = [[NSURL fileURLWithPath:NSTemporaryDirectory()] URLByAppendingPathComponent:name];
    [data writeToURL:url atomically:YES];
    UIActivityViewController *av = [[UIActivityViewController alloc] initWithActivityItems:@[url] applicationActivities:nil];
    UIViewController *top = self.window.rootViewController;
    while (top.presentedViewController) top = top.presentedViewController;
    av.popoverPresentationController.sourceView = top.view;
    [top presentViewController:av animated:YES completion:nil];
  } else if ([a isEqualToString:@"open"]) {
    // e.g. shortcuts://x-callback-url/run-shortcut?... to start the Clock timer (shows on the lock screen)
    NSURL *u = [NSURL URLWithString:d[@"u"] ?: @""];
    if (u) [[UIApplication sharedApplication] openURL:u options:@{} completionHandler:nil];
  } else if ([a isEqualToString:@"aplay"]) {
    NSString *k = d[@"k"] ?: @"";
    NSURL *url = [self loopURL:k];
    if ([[NSFileManager defaultManager] fileExistsAtPath:url.path]) [self startLoop:url volume:[d[@"v"] floatValue]];
    else {
      [self fadeOutPlayer];
      NSData *q = [NSJSONSerialization dataWithJSONObject:@[k] options:0 error:nil];
      NSString *arg = [[NSString alloc] initWithData:q encoding:NSUTF8StringEncoding];
      [self.web evaluateJavaScript:[NSString stringWithFormat:@"window.luylLoopNeed&&luylLoopNeed(%@[0])", arg] completionHandler:nil];
    }
  } else if ([a isEqualToString:@"adata"]) {
    NSData *data = [[NSData alloc] initWithBase64EncodedString:d[@"d"] ?: @"" options:0];
    if (!data.length) return;
    NSURL *url = [self loopURL:d[@"k"] ?: @""];
    [data writeToURL:url atomically:YES];
    float v = [d[@"v"] floatValue];
    if (v >= 0) [self startLoop:url volume:v];
  } else if ([a isEqualToString:@"astop"]) {
    [self fadeOutPlayer];
  } else if ([a isEqualToString:@"avol"]) {
    if (self.player) self.player.volume = [d[@"v"] floatValue];
  } else if ([a isEqualToString:@"save"]) {
    NSString *json = d[@"d"];
    if (json.length) [[json dataUsingEncoding:NSUTF8StringEncoding] writeToURL:[self stateFile] atomically:YES];
  }
}

// show the timer notification as a banner even while the app is open
- (void)userNotificationCenter:(UNUserNotificationCenter *)center willPresentNotification:(UNNotification *)notification
         withCompletionHandler:(void (^)(UNNotificationPresentationOptions))completionHandler {
  if (@available(iOS 14.0, *)) completionHandler(UNNotificationPresentationOptionBanner | UNNotificationPresentationOptionSound);
  else completionHandler(UNNotificationPresentationOptionSound);
}

// levelup:// — Shortcuts sends us back here after starting the Clock timer
- (BOOL)application:(UIApplication *)app openURL:(NSURL *)url options:(NSDictionary<UIApplicationOpenURLOptionsKey, id> *)options {
  return YES;
}

// keep audio alive when returning to the foreground after an interruption
- (void)applicationDidBecomeActive:(UIApplication *)application {
  [[AVAudioSession sharedInstance] setActive:YES error:nil];
}

// web confirm()/alert() are not used by the app, but answer them so WebKit never stalls
- (void)webView:(WKWebView *)webView runJavaScriptAlertPanelWithMessage:(NSString *)message initiatedByFrame:(WKFrameInfo *)frame completionHandler:(void (^)(void))completionHandler { completionHandler(); }
- (void)webView:(WKWebView *)webView runJavaScriptConfirmPanelWithMessage:(NSString *)message initiatedByFrame:(WKFrameInfo *)frame completionHandler:(void (^)(BOOL))completionHandler { completionHandler(NO); }

@end

int main(int argc, char *argv[]) {
  @autoreleasepool {
    return UIApplicationMain(argc, argv, nil, NSStringFromClass([AppDelegate class]));
  }
}
