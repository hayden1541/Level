#!/bin/bash
# Build + align + sign the APK. Usage: tools/build_apk.sh
set -e
cd "$(dirname "$0")/.."
OUT=out
mkdir -p $OUT
python3 web/build.py
cp dist/index.html android/assets/index.html
rm -rf android/build
java -jar tools/apktool.jar b android -o $OUT/unsigned.apk
python3 tools/zipalign.py $OUT/unsigned.apk $OUT/aligned.apk
if [ ! -f tools/release.keystore ]; then
  keytool -genkeypair -keystore tools/release.keystore -storepass levelup123 -keypass levelup123 \
    -alias levelup -keyalg RSA -keysize 2048 -validity 10000 \
    -dname "CN=Level up your life, O=Personal, C=KR" >/dev/null 2>&1
fi
java -jar tools/apksigner.jar sign --ks tools/release.keystore --ks-pass pass:levelup123 \
  --ks-key-alias levelup --key-pass pass:levelup123 --out $OUT/LevelUpYourLife.apk $OUT/aligned.apk
java -jar tools/apksigner.jar verify --verbose $OUT/LevelUpYourLife.apk | head -5
ls -la $OUT/LevelUpYourLife.apk
