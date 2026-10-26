"""Assemble the single-file app.
dist/app-artifact.html : page content only (artifact skeleton is added by the host)
dist/index.html        : full HTML document for the Android WebView (assets/index.html)"""
import base64, os, pathlib, json

here = pathlib.Path(__file__).parent
root = here.parent
dist = root / 'dist'
dist.mkdir(exist_ok=True)
font_dir = pathlib.Path(os.environ.get('GALMURI_DIR', root / 'fonts'))

def face(family, file):
    data = base64.b64encode((font_dir / file).read_bytes()).decode()
    return f"@font-face{{font-family:'{family}';src:url(data:font/woff2;base64,{data}) format('woff2');font-display:block;}}"

fonts = face('Galmuri11', 'Galmuri11.woff2') + face('Galmuri11 Bold', 'Galmuri11-Bold.woff2')
# selectable text fonts (Settings → 글씨체), OFL, subset to KS X 1001 Hangul — see fonts/FONTS-LICENSE.txt
def face_w(family, file, weight):
    data = base64.b64encode((root / 'fonts' / file).read_bytes()).decode()
    return f"@font-face{{font-family:'{family}';src:url(data:font/woff2;base64,{data}) format('woff2');font-weight:{weight};font-display:swap;}}"
fonts += (face_w('LU Pretendard', 'Pretendard-Regular.woff2', 400) + face_w('LU Pretendard', 'Pretendard-Bold.woff2', 700)
          + face_w('LU NanumGothic', 'NanumGothic.woff2', 400) + face_w('LU NanumGothic', 'NanumGothic-Bold.woff2', 700)
          + face_w('LU Gowun', 'GowunDodum.woff2', 400) + face_w('LU Myeongjo', 'NanumMyeongjo.woff2', 400) + face_w('LU Jua', 'Jua.woff2', 400))
css = (here / 'style.css').read_text()
body = (here / 'body.html').read_text()
js = '/* fflate 0.8.2 (MIT) https://github.com/101arrowz/fflate */\n' + (here / 'vendor' / 'fflate.min.js').read_text() + ';\n' + (here / 'sprites.js').read_text() + '\n' + (here / 'decor.js').read_text() + '\n' + (here / 'cute.js').read_text() + '\n' + (here / 'music.js').read_text() + '\n' + (here / 'flash.js').read_text() + '\n' + (here / 'app.js').read_text()

content = f"""<title>Level up your life</title>
<style>{fonts}
{css}</style>
{body}
<script>
{js}
</script>
"""
(dist / 'app-artifact.html').write_text(content)
full = f"""<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<meta name="theme-color" content="#17152a">
<style>#app{{padding-top:env(safe-area-inset-top,0px)}}</style>
</head>
<body>
{content}
</body>
</html>
"""
(dist / 'index.html').write_text(full)
print('built', len(full) // 1024, 'KB')

# ---- iPhone / PWA build: dist-pwa/ (host the folder anywhere, then "Add to Home Screen" in Safari)
pwa = dist.parent / 'dist-pwa'
pwa.mkdir(exist_ok=True)
head_pwa = """<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<meta name="theme-color" content="#17152a">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Level up">
<link rel="apple-touch-icon" href="icon-180.png">
<link rel="icon" href="icon-192.png">
<link rel="manifest" href="manifest.webmanifest">
<style>html{background:#17152a}#app{padding-top:env(safe-area-inset-top,0px)}</style>"""
sw_reg = """<script>if('serviceWorker' in navigator){addEventListener('load',()=>{navigator.serviceWorker.register('sw.js').catch(()=>{});});}</script>"""
(pwa / 'index.html').write_text(f"""<!doctype html>
<html lang="ko">
<head>
{head_pwa}
</head>
<body>
{content}
{sw_reg}
</body>
</html>
""")
(pwa / 'manifest.webmanifest').write_text(json.dumps({
  "name": "Level up your life", "short_name": "Level up", "lang": "ko",
  "start_url": "./", "scope": "./", "display": "standalone", "orientation": "portrait",
  "background_color": "#17152a", "theme_color": "#17152a",
  "icons": [{"src": "icon-192.png", "sizes": "192x192", "type": "image/png"},
            {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable"}]
}, ensure_ascii=False, indent=1))
(pwa / 'sw.js').write_text("""// offline cache: the whole app is one HTML file
const C = 'luyl-v' + '__VER__';
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'])).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // network first so updates show up, cache as fallback for offline
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
""".replace('__VER__', str(len(content))))
print('pwa built')
