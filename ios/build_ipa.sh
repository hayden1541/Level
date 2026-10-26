#!/bin/bash
# Build an unsigned .ipa (Sideloadly / AltStore re-sign it with your Apple ID).
set -e
cd "$(dirname "$0")"
SDK=${SDK:-/home/claude/theos/sdks/iPhoneOS16.5.sdk}
VER=$(grep versionName ../android/apktool.yml | awk '{print $2}')
BUILD=$(grep versionCode ../android/apktool.yml | awk '{print $2}')
python3 ../web/build.py >/dev/null
rm -rf build && mkdir -p build/Payload/LevelUp.app/www
APP=build/Payload/LevelUp.app

clang -target arm64-apple-ios15.0 -isysroot "$SDK" -fobjc-arc -fmodules -O2 -fuse-ld=lld \
  -Wno-unused-command-line-argument -Wl,-adhoc_codesign \
  -framework UIKit -framework WebKit -framework AVFoundation -framework UserNotifications \
  -framework AudioToolbox -framework Foundation -o "$APP/LevelUp" src/main.m

cp ../dist/index.html "$APP/www/index.html"
python3 - "$APP" <<'EOF'
import sys
from PIL import Image
app = sys.argv[1]
src = Image.open('../icon-512.png').convert('RGBA')
bg = Image.new('RGBA', src.size, (23, 21, 42, 255)); bg.alpha_composite(src)
for name, n in [('AppIcon60x60@2x.png', 120), ('AppIcon60x60@3x.png', 180), ('AppIcon76x76@2x~ipad.png', 152)]:
    bg.convert('RGB').resize((n, n), Image.NEAREST).save(f'{app}/{name}')
EOF
printf 'APPL????' > "$APP/PkgInfo"
cat > "$APP/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key><string>ko</string>
  <key>CFBundleDisplayName</key><string>Level up</string>
  <key>CFBundleName</key><string>Level up your life</string>
  <key>CFBundleExecutable</key><string>LevelUp</string>
  <key>CFBundleIdentifier</key><string>com.levelup.yourlife</string>
  <key>CFBundleInfoDictionaryVersion</key><string>6.0</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>${VER}</string>
  <key>CFBundleVersion</key><string>${BUILD}</string>
  <key>CFBundleSupportedPlatforms</key><array><string>iPhoneOS</string></array>
  <key>CFBundleIcons</key>
  <dict>
    <key>CFBundlePrimaryIcon</key>
    <dict>
      <key>CFBundleIconFiles</key><array><string>AppIcon60x60</string></array>
    </dict>
  </dict>
  <key>DTPlatformName</key><string>iphoneos</string>
  <key>DTPlatformVersion</key><string>16.5</string>
  <key>DTSDKName</key><string>iphoneos16.5</string>
  <key>LSRequiresIPhoneOS</key><true/>
  <key>MinimumOSVersion</key><string>15.0</string>
  <key>UIDeviceFamily</key><array><integer>1</integer></array>
  <key>UIRequiredDeviceCapabilities</key><array><string>arm64</string></array>
  <key>UISupportedInterfaceOrientations</key><array><string>UIInterfaceOrientationPortrait</string></array>
  <key>UILaunchScreen</key><dict/>
  <key>UIBackgroundModes</key><array><string>audio</string></array>
  <key>UIStatusBarStyle</key><string>UIStatusBarStyleLightContent</string>
  <key>UIViewControllerBasedStatusBarAppearance</key><true/>
  <key>ITSAppUsesNonExemptEncryption</key><false/>
  <key>CFBundleURLTypes</key>
  <array><dict>
    <key>CFBundleURLName</key><string>com.levelup.yourlife</string>
    <key>CFBundleURLSchemes</key><array><string>levelup</string></array>
  </dict></array>
  <key>LSApplicationQueriesSchemes</key><array><string>shortcuts</string></array>
</dict>
</plist>
EOF
mkdir -p ../out
(cd build && rm -f ../../out/LevelUpYourLife.ipa && zip -q -r -X ../../out/LevelUpYourLife.ipa Payload)
ls -la ../out/LevelUpYourLife.ipa
