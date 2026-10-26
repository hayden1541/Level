# Level up your life

공부한 시간만큼 도트 캐릭터가 백수 거지에서 만수르까지 진화하는 공부 타이머 앱.

자격증 공부하면서 동기부여가 안 돼서 직접 만들어 쓰는 앱이에요. 안드로이드 앱(APK), 아이폰 앱(IPA), 웹앱 세 가지로 돌아가고, 기록은 서버 없이 각자 기기 안에만 저장됩니다.

## 바로 써보기

| | 방법 |
|---|---|
| 웹앱 | **https://hayden1541.github.io/Level/** — 브라우저로 바로 열면 돼요. 아이폰 Safari에서 공유 → 홈 화면에 추가하면 앱처럼 쓸 수 있어요 |
| 안드로이드 | [`download/LevelUpYourLife.apk`](download/LevelUpYourLife.apk) 받아서 설치 (출처를 알 수 없는 앱 허용 필요) |
| 아이폰 | [`download/LevelUpYourLife.ipa`](download/LevelUpYourLife.ipa) — AltStore나 Sideloadly로 설치, 무료 애플 ID면 7일마다 갱신 |

새 버전은 기존 앱을 지우지 말고 위에 덮어서 설치하면 기록이 그대로 남아요. 혹시 모르니 업데이트 전에 설정 → 백업 코드 복사는 해두는 게 좋습니다.

## 뭘 할 수 있나

**공부 타이머**
- 과목 고르고 뽀모도로(공부·휴식 반복, 긴 휴식 포함) 또는 스톱워치로 시작
- 공부 중엔 캐릭터가 책상에서 공부하고, 쉬는 시간엔 쉬는 모습으로 바뀜. 타이머 밑에 공부 명언
- 화면 꺼져도 계속 돌아가고 잠금화면에 남은 시간 표시, 끝나면 알림
- 공부 사운드 10종 — 로파이·피아노·오르골·8비트, 빗소리·파도·모닥불, 화이트·핑크·브라운 노이즈

**레벨업과 진화**
- 1분 = 1 EXP. 레벨과 별개로 캐릭터가 6단계 진화 (백수 거지 → 알바생 → 대학생 → 직장인 → 사장님 → 만수르)
- 첫 진화는 시간만, 그다음부턴 시간 + 연속 공부일(하루 30분 이상)이 같이 차야 올라감. 하루 몰아서는 안 됨
- 캐릭터 7종(2등신·고양이·곰돌이·찹쌀떡·토끼·개구리·다람쥐), 공부 10시간마다 배경 15종 중 하나, 5일 연속마다 치장 아이템

**통계**
- 주간·월간 추이, 하루 평균, 과목별 합계, 26주 잔디 달력
- 기록마다 한 줄 메모. 타이머 없이 한 공부는 직접 추가 가능 (통계·연속일엔 들어가고 EXP엔 안 들어감)

**플래시카드**
- 과목별 묶음. 직접 추가하거나 엑셀(키워드·요약·의미 3칸)로 한 번에 업로드
- 키워드 먼저, 누르면 뜻. 모르겠어요 카드는 따로 모아서 다시
- 망각곡선 복습 — 맞히면 1·3·7·14·30일 뒤, 틀리면 다음 날 다시
- 랜덤 / 순서대로 / 모르는 것 위주 / 적게 본 순 / 오래 안 본 순, 거꾸로 모드, 엑셀 내보내기
- 카드 보는 시간도 공부 시간으로 기록

**그 밖에**
- D-day, 매일 공부 알림(그날 공부했으면 안 옴), 글씨체 7종 선택, 백업 코드로 기록 옮기기

## 구조

전부 웹 기술(HTML·CSS·JavaScript) 한 덩어리로 만들고, 폰 앱은 그걸 감싸는 얇은 껍데기예요. 도트 그림은 이미지 파일 없이 캔버스에 점을 찍어 그리고, 음악도 Web Audio로 그 자리에서 합성합니다.

```
web/        앱 본체 (app.js 화면·기능, flash.js 카드, sprites/cute/decor.js 그림, music.js 사운드)
android/    안드로이드 껍데기 — apktool 프로젝트 (smali로 작성: 알림, 잠금화면, 백그라운드 타이머, 파일 저장)
ios/        아이폰 껍데기 — Objective-C WKWebView (알림, 백그라운드 음악, 공유)
fonts/      번들 글꼴 (SIL OFL)
tools/      APK 빌드·정렬·서명 스크립트
docs/       GitHub Pages로 서비스되는 웹앱 (빌드 결과물)
download/   설치 파일
```

## 직접 빌드하기

필요한 것: Python 3 + Pillow, Java 17 이상

```bash
python3 web/build.py          # dist/ (앱용 단일 HTML), dist-pwa/ (웹앱) 생성
cp dist-pwa/* docs/           # 웹앱 갱신
```

**안드로이드 APK** — [apktool 2.9.3](https://github.com/iBotPeaches/Apktool/releases) 을 `tools/apktool.jar`, Android SDK build-tools의 `apksigner.jar` 를 `tools/apksigner.jar` 로 넣고:

```bash
bash tools/build_apk.sh       # out/LevelUpYourLife.apk
```

서명 키(`tools/release.keystore`)는 저장소에 없어요. 없으면 새로 만들어지는데, 그 경우 기존에 설치된 앱 위에 덮어 설치가 안 됩니다 (지우고 새로 설치해야 함).

**아이폰 IPA** — clang + lld, iPhoneOS SDK([theos/sdks](https://github.com/theos/sdks))가 필요하고 맥 없이 빌드돼요. 서명 안 된 IPA라 AltStore·Sideloadly가 설치하면서 서명합니다.

```bash
SDK=/path/to/iPhoneOS16.5.sdk bash ios/build_ipa.sh   # out/LevelUpYourLife.ipa
```

## 라이선스 참고

- 글꼴: 갈무리11, 프리텐다드, 나눔고딕, 나눔명조, 고운돋움, 주아 — 모두 SIL Open Font License 1.1 ([fonts/FONTS-LICENSE.txt](fonts/FONTS-LICENSE.txt))
- [fflate](https://github.com/101arrowz/fflate) (MIT) — 엑셀 파일 읽기·쓰기
