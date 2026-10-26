'use strict';
/* ================= utils ================= */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const pad = n => String(n).padStart(2, '0');
const DAY = 86400000;
const WD = ['일', '월', '화', '수', '목', '금', '토'];

function dayKey(t) { const d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function startOfDay(t) { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); }
function addDays(t, n) { const d = new Date(t); d.setDate(d.getDate() + n); return d.getTime(); }
function parseDay(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d).getTime(); }
function fmtHM(min) {
  min = Math.max(0, Math.round(min));
  const h = Math.floor(min / 60), m = min % 60;
  if (!h) return `${m}분`;
  return m ? `${h}시간 ${m}분` : `${h}시간`;
}
function fmtShort(min) { min = Math.round(min); const h = Math.floor(min / 60), m = min % 60; return h ? `${h}h ${pad(m)}m` : `${m}m`; }
function fmtClock(ms, up) {
  ms = Math.max(0, ms);
  const total = up ? Math.floor(ms / 1000) : Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
function josa(word, withBatchim, without) {
  const ch = word.charCodeAt(word.length - 1);
  if (ch < 0xac00 || ch > 0xd7a3) return without;
  const b = (ch - 0xac00) % 28;
  if (withBatchim === '으로') return (b === 0 || b === 8) ? without : withBatchim;
  return b === 0 ? without : withBatchim;
}
function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

/* ================= storage ================= */
const KEY = 'luyl.v1';
const COLORS = ['#f2c14e', '#5ec2b7', '#e8615a', '#8fb3ff', '#c48cf0', '#7fd36b', '#ff9f5a', '#f07fb0', '#e8e3d3', '#4fb0e0'];
function defaults() {
  return {
    v: 1,
    categories: [
      { id: 'c1', name: '영어', color: '#5ec2b7' },
      { id: 'c2', name: 'SQL', color: '#f2c14e' },
      { id: 'c3', name: '전공', color: '#e8615a' },
    ],
    sessions: [],
    ddays: [],
    settings: { mode: 'pomo', focus: 25, rest: 5, cycles: 4, goal: 180, sound: true, vibrate: true, awake: true, autoNext: true, notify: true, lockShow: true, clockLink: false, splash: true, lastCat: 'c1', music: true, track: 'lofi', vol: 70, charStyle: 'chibi', silentPlay: false, bgPlay: true, font: 'system', longRest: 15, longEvery: 4, remind: false, remindAt: '21:00' },
    seenStage: 0, seenLevel: 1, timer: null,
    bgs: [], bg: null, bgRolls: 0, items: [], itemOn: [], itemRolls: 0, codes: [],
    decks: [], fc: { order: 'random', size: 10 },
  };
}
let S;
function load() {
  let d = null;
  try { const raw = localStorage.getItem(KEY); if (raw) d = JSON.parse(raw); } catch (e) { d = null; }
  const base = defaults();
  if (d && Array.isArray(d.sessions)) {
    S = Object.assign(base, d);
    S.settings = Object.assign(defaults().settings, d.settings || {});
  } else S = base;
}
let nativeSaveT = null;
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ }
  // iPhone app keeps a file copy too, in case WebKit clears its storage
  if (window.IOSBridge && IOSBridge.save) { clearTimeout(nativeSaveT); nativeSaveT = setTimeout(() => { try { IOSBridge.save(JSON.stringify(S)); } catch (e) {} }, 800); }
}

/* ================= progress ================= */
// EXP = timer-recorded minutes only. Manually added records count for stats and streaks, not EXP.
const totalMin = () => S.sessions.reduce((a, s) => a + (s.manual ? 0 : s.sec), 0) / 60;
const allMin = () => S.sessions.reduce((a, s) => a + s.sec, 0) / 60;
const STREAK_MIN = 30; // a day counts toward a streak with 30+ minutes
function levelInfo(min) {
  let L = 1;
  while (30 * L * (L + 1) <= min) L++;
  const base = 30 * (L - 1) * L, next = 30 * L * (L + 1);
  return { L, into: min - base, need: next - base };
}
function bestStreak() {
  const m = dayTotals();
  const days = Object.keys(m).filter(k => m[k] >= STREAK_MIN).map(parseDay).sort((x, y) => x - y);
  let best = 0, run = 0, prev = null;
  for (const t of days) { run = prev !== null && Math.round((t - prev) / DAY) === 1 ? run + 1 : 1; best = Math.max(best, run); prev = t; }
  return best;
}
function stageOf(min, best) {
  if (best === undefined) best = bestStreak();
  let s = 0;
  for (let i = 1; i < STAGES.length; i++) { if (min >= STAGES[i].hours * 60 && best >= STAGES[i].streak) s = i; else break; }
  return s;
}
const curStage = () => stageOf(totalMin());
const catById = id => S.categories.find(c => c.id === id) || { id, name: '삭제된 과목', color: '#6b6690' };

function dayTotals() {
  const m = {};
  for (const s of S.sessions) { const k = dayKey(s.s); m[k] = (m[k] || 0) + s.sec / 60; }
  return m;
}
function todayMin() { const k = dayKey(Date.now()); return S.sessions.filter(s => dayKey(s.s) === k).reduce((a, s) => a + s.sec, 0) / 60; }
function streak() {
  const m = dayTotals();
  let t = startOfDay(Date.now());
  if (!(m[dayKey(t)] >= STREAK_MIN)) t = addDays(t, -1);
  let n = 0;
  while (m[dayKey(t)] >= STREAK_MIN) { n++; t = addDays(t, -1); }
  return n;
}

/* ================= sound / vibration / native ================= */
let AC = null;
function ac() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } }
  if (AC && AC.state !== 'running' && AC.state !== 'closed') AC.resume().catch(() => {});
  return AC;
}
// iPhone: let Web Audio play even with the silent switch on (iOS 16.4+)
// iPhone: 'playback' keeps sound in silent mode / screen off but shows a speaker badge in the Dynamic Island;
// 'ambient' hides the badge and follows the silent switch.
function applyAudioSession() { try { if (navigator.audioSession) navigator.audioSession.type = S && S.settings && S.settings.silentPlay ? 'playback' : 'ambient'; } catch (e) {} }
// iPhone only starts audio inside a real tap (touchend/click), and needs a sound played in that tap
let audioUnlocked = false;
function unlockAudio() {
  const a = ac(); if (!a) return;
  if (!audioUnlocked || a.state !== 'running') {
    try { const b = a.createBuffer(1, 1, 22050), src = a.createBufferSource(); src.buffer = b; src.connect(a.destination); src.start(0); audioUnlocked = true; } catch (e) {}
  }
  if (typeof Music !== 'undefined' && Music.current() === null && desiredTrack()) updateMusic();
}
['touchend', 'click', 'keydown'].forEach(ev => document.addEventListener(ev, unlockAudio, true));
function tone(freq, start, dur, vol = 0.05) {
  const a = ac(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = 'square'; o.frequency.value = freq;
  const t0 = a.currentTime + start;
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(a.destination);
  o.start(t0); o.stop(t0 + dur + 0.03);
}
const SFX = {
  tap: [[880, 0, .04]],
  start: [[523, 0, .08], [784, .09, .14]],
  focusEnd: [[784, 0, .12], [659, .14, .12], [523, .28, .22], [784, .62, .12], [659, .76, .12], [523, .9, .28]],
  restEnd: [[523, 0, .1], [659, .12, .1], [784, .24, .1], [1047, .36, .28]],
  level: [[523, 0, .08], [659, .08, .08], [784, .16, .08], [1047, .24, .34]],
  evo: [[392, 0, .1], [523, .1, .1], [659, .2, .1], [784, .3, .1], [1047, .4, .1], [1319, .5, .55]],
  done: [[659, 0, .1], [784, .12, .1], [1047, .24, .1], [1319, .36, .45]],
};
function sfx(k) { if (S.settings.sound) (SFX[k] || []).forEach(([f, s, d]) => tone(f, s, d)); }
const NB = window.AndroidBridge || window.IOSBridge || null; // native shells: Android APK or iPhone app
function buzz(ms) {
  if (!S.settings.vibrate) return;
  if (NB) { try { NB.vibrate(ms); } catch (e) {} }
  else if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} }
}
let wakeLock = null;
function keepAwake(on) {
  on = on && S.settings.awake;
  if (NB) { try { NB.keepScreenOn(!!on); } catch (e) {} return; }
  if (on && !wakeLock && navigator.wakeLock) {
    navigator.wakeLock.request('screen').then(l => { wakeLock = l; l.addEventListener('release', () => { wakeLock = null; }); }).catch(() => {});
  } else if (!on && wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
}
function scheduleNotify(sec, title, body) {
  if (!NB) return;
  try { NB.cancelSchedule(); if (S.settings.notify && sec > 1) NB.scheduleIn(Math.round(sec), title, body); } catch (e) {}
}
function cancelNotify() { if (NB) { try { NB.cancelSchedule(); } catch (e) {} } }

/* ================= music ================= */
let previewTrack = null;
let screenOff = false; // true while the page is hidden because the phone screen went off (not an app switch)
function desiredTrack() {
  if (!S.settings.music) return null;
  if (document.hidden && !S.timer && !screenOff) return null;
  if (previewTrack) return previewTrack;
  const t = S.timer;
  if (t) { if (t.pausedAt) return null; return t.phase === 'focus' ? (t.track || 'none') : 'title'; }
  return 'title';
}
// iPhone app: music goes through the native player (pre-rendered loops) so it keeps playing outside the app
const NATIVE_MUSIC = !!(window.IOSBridge && window.IOSBridge.audioPlay);
const useNativeMusic = () => NATIVE_MUSIC && S.settings.bgPlay !== false;
const NativeMusic = (() => {
  const VER = 1;
  let cur = null, vol = 0.7;
  const busy = {};
  const key = id => `${id}.v${VER}`;
  let made = {};
  try { made = JSON.parse(localStorage.getItem('luyl.loops') || '{}') || {}; } catch (e) {}
  const mark = id => { made[key(id)] = 1; try { localStorage.setItem('luyl.loops', JSON.stringify(made)); } catch (e) {} };
  // render once, hand the WAV to the native side; start it right away if it is still the wanted track
  const render = id => {
    busy[id] = true;
    return Music.render(id).then(b64 => {
      busy[id] = false; mark(id);
      const now = cur === id;
      if (now) { try { Music.play(null, ac); } catch (e) {} }
      IOSBridge.audioData(key(id), b64, now ? vol : -1);
    }).catch(() => { busy[id] = false; });
  };
  // native asks for the audio when it has no cached file yet
  window.luylLoopNeed = k => {
    const id = String(k).split('.v')[0];
    delete made[k];
    if (cur === id && !document.hidden) { try { Music.setVolume(vol, ac); Music.play(id, ac); } catch (e) {} } // Web Audio stands in meanwhile
    if (!busy[id]) setTimeout(() => render(id), 50);
  };
  // render likely tracks ahead of time, so locking the phone right after START still has music
  const queue = [];
  const pump = () => {
    const id = queue.shift(); if (!id) return;
    if (made[key(id)] || busy[id]) { pump(); return; }
    render(id).then(() => setTimeout(pump, 1500));
  };
  return {
    busy: id => !!busy[id],
    warm(...ids) { if (!useNativeMusic()) return; const idle = !queue.length; ids.forEach(id => { if (id && id !== 'none' && !queue.includes(id)) queue.push(id); }); if (idle) setTimeout(pump, 2500); },
    play(id, v) {
      if (!id || id === 'none') id = null;
      vol = v;
      if (id === cur) { if (id) IOSBridge.audioVol(v); return; }
      cur = id;
      if (!id) IOSBridge.audioStop(); else IOSBridge.audioPlay(key(id), v);
    },
    current: () => cur,
  };
})();
function updateMusic() {
  try {
    const want = desiredTrack(), v = S.settings.vol / 100;
    if (useNativeMusic() && !previewTrack) {
      if (!NativeMusic.busy(want)) Music.play(null, ac);
      NativeMusic.play(want, v);
    } else {
      if (NATIVE_MUSIC) NativeMusic.play(null, v);
      Music.setVolume(v, ac); Music.play(want, ac);
    }
  } catch (e) {}
  renderMusicBtn();
}
function renderMusicBtn() { const b = $('#musicBtn'); if (b) { b.textContent = S.settings.music ? '♪ ON' : '♪ OFF'; b.setAttribute('aria-pressed', S.settings.music); } }
function trackChips(sel, attr) {
  const groups = ['', '음악', '자연', '노이즈'];
  return groups.map(g => {
    const list = TRACKS.filter(t => t.kind === g);
    return `<div class="field"><span class="label">${g || '선택 안 함'}</span><div class="chips">${list.map(t =>
      `<button class="chip" ${attr}="${t.id}" aria-pressed="${t.id === sel}" title="${esc(t.desc)}">${esc(t.name)}</button>`).join('')}</div></div>`;
  }).join('');
}
function openTrackPicker(sel, onPick) {
  previewTrack = sel; updateMusic();
  openSheet(`<h2 class="sheet-title">공부 사운드 <button class="btn sm ghost" data-close>닫기</button></h2>
    <div class="stack" style="gap:10px">${trackChips(sel, 'data-tr')}
    <p class="small muted" id="trDesc" style="margin:0">${esc((TRACKS.find(t => t.id === sel) || TRACKS[0]).desc)} · 누르면 미리 들어볼 수 있어요</p>
    <button class="btn gold block" id="trOk">이걸로</button></div>`, p => {
    $$('[data-tr]', p).forEach(b => b.onclick = () => {
      sel = b.dataset.tr; previewTrack = sel; updateMusic();
      $$('[data-tr]', p).forEach(x => x.setAttribute('aria-pressed', x === b));
      $('#trDesc', p).textContent = (TRACKS.find(t => t.id === sel) || TRACKS[0]).desc + ' · 누르면 미리 들어볼 수 있어요';
    });
    $('#trOk', p).onclick = () => { previewTrack = null; onPick(sel); closeSheet(); };
  }, () => { previewTrack = null; updateMusic(); });
}

/* ================= character style ================= */
const CHAR_STYLES = [
  { id: 'chibi', name: '2등신 치비' }, { id: 'cat', name: '고양이' }, { id: 'bear', name: '곰돌이' },
  { id: 'mochi', name: '찹쌀떡' }, { id: 'bunny', name: '토끼' }, { id: 'frog', name: '개구리' }, { id: 'squirrel', name: '다람쥐' }, { id: 'classic', name: '오리지널 도트' },
];
const FONTS = [
  { id: 'system', name: '기본 (폰 글꼴)', css: '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif' },
  { id: 'pretendard', name: '프리텐다드', css: '"LU Pretendard", sans-serif' },
  { id: 'nanumgothic', name: '나눔고딕', css: '"LU NanumGothic", sans-serif' },
  { id: 'gowun', name: '고운돋움', css: '"LU Gowun", sans-serif' },
  { id: 'myeongjo', name: '나눔명조', css: '"LU Myeongjo", serif' },
  { id: 'jua', name: '주아', css: '"LU Jua", sans-serif' },
  { id: 'dot', name: '도트 (갈무리)', css: '"Galmuri11", sans-serif' },
];
function applyFont() { const f = S.settings.font || 'system'; document.documentElement.dataset.font = FONTS.some(x => x.id === f) ? f : 'system'; }
function openFontPicker() {
  const draw = () => openSheet(`
    <h2 class="sheet-title">글씨체 <button class="btn sm ghost" data-close>닫기</button></h2>
    <div class="stack" style="gap:10px">
      ${FONTS.map(f => `<button class="font-opt" data-font="${f.id}" aria-pressed="${(S.settings.font || 'system') === f.id}"><span class="fo-name">${esc(f.name)}${(S.settings.font || 'system') === f.id ? ' · 사용 중' : ''}</span><span class="fo-sample" style='font-family:${f.css}'>컬럼 반정규화 · 오늘도 레벨업 2026</span></button>`).join('')}
      <p class="small muted" style="margin:0">로고, 타이머 숫자, 배지는 도트 느낌을 살리려고 그대로 둬요.</p>
    </div>`, p => {
    $$('[data-font]', p).forEach(b => b.onclick = () => { S.settings.font = b.dataset.font; save(); applyFont(); sfx('tap'); draw(); if (curTab === 'settings') renderSettings(); });
  });
  draw();
}
function applyCharStyle() { CHAR_STYLE = S.settings.charStyle || 'chibi'; }
function openStylePicker() {
  const cur = curStage();
  let sel = S.settings.charStyle;
  openSheet(`<h2 class="sheet-title">캐릭터 고르기 <button class="btn sm ghost" data-close>닫기</button></h2>
    <div class="dex">${CHAR_STYLES.map(c => `<button class="px stylebtn" data-sty="${c.id}" aria-pressed="${c.id === sel}"><canvas class="scene" data-sc="${c.id}"></canvas><div class="cap"><span>${esc(c.name)}</span><span class="muted">${c.id === sel ? '사용 중' : ''}</span></div></button>`).join('')}</div>
    <p class="small muted">지금 단계(${esc(STAGES[cur].name)}) 모습으로 보여줘요. 바꿔도 기록과 진화 단계는 그대로예요.</p>`, p => {
    $$('[data-sc]', p).forEach(cv => { const id = cv.dataset.sc; bindScene(cv, () => [curStage(), 'study', null, id], 3); });
    $$('[data-sty]', p).forEach(b => b.onclick = () => {
      S.settings.charStyle = b.dataset.sty; save(); applyCharStyle(); closeSheet(); render();
      { const nm = CHAR_STYLES.find(c => c.id === b.dataset.sty).name; toast(`${nm}${josa(nm, '으로', '로')} 바꿨어요`); }
    });
  });
}

/* ================= iPhone: Clock timer via Shortcuts (lock screen + Dynamic Island) ================= */
const CLOCK_SHORTCUT = '레벨업타이머';
const IS_IOS_APP = !!(window.IOSBridge && window.IOSBridge.open);
function clockTimer(sec, force) {
  if (!IS_IOS_APP || (!S.settings.clockLink && !force) || !(sec > 3)) return;
  const back = encodeURIComponent('levelup://done');
  const url = `shortcuts://x-callback-url/run-shortcut?name=${encodeURIComponent(CLOCK_SHORTCUT)}&input=text&text=${Math.round(sec)}&x-success=${back}&x-cancel=${back}&x-error=${back}`;
  try { IOSBridge.open(url); } catch (e) {}
}
// seconds left in the current phase (pomodoro only; the stopwatch has no end)
function phaseLeftSec() { const t = S.timer; if (!t) return 0; const d = phaseDur(t); return d ? (d - elapsed(t)) / 1000 : 0; }
function openClockGuide() {
  openSheet(`<h2 class="sheet-title">잠금화면 타이머 설정 <button class="btn sm ghost" data-close>닫기</button></h2>
    <div class="stack" style="gap:10px">
      <p class="small muted" style="margin:0;line-height:1.7">아이폰 시계 앱 타이머를 같이 켜서, 잠금화면과 다이내믹 아일랜드에 남은 시간이 보이게 해요. 단축어를 한 번만 만들어 두면 돼요.</p>
      <ol class="small" style="margin:0;padding-left:18px;line-height:1.9">
        <li><b>단축어</b> 앱 → 오른쪽 위 <b>+</b></li>
        <li>맨 위 이름을 <b>${CLOCK_SHORTCUT}</b> 로 바꾸기 (띄어쓰기 없이)</li>
        <li><b>동작 추가</b> → 검색에 "타이머" → <b>타이머 시작</b></li>
        <li>숫자 부분을 눌러 <b>단축어 입력</b> 선택, 단위는 <b>초</b>로</li>
        <li>완료 누르고 이 화면으로 돌아와서 아래 테스트</li>
      </ol>
      <p class="small muted" style="margin:0">공부를 중간에 끝내거나 일시정지하면 시계 타이머는 따로 멈춰야 해요. 잠금화면 타이머를 길게 눌러 끄면 돼요.</p>
      <button class="btn block" id="clkTest">10초 테스트</button>
      <button class="btn gold block" data-close>확인</button>
    </div>`, p => { $('#clkTest', p).onclick = () => clockTimer(10, true); });
}

/* ================= collectibles: backgrounds (every 10h) + items (every 5-day streak) ================= */
const BG_EVERY_MIN = 600;
function applyDecor() {
  SCENE_BG = S.bg && S.bgs.includes(S.bg) ? S.bg : null;
  SCENE_ITEMS = (S.itemOn || []).filter(id => S.items.includes(id));
}
// every run of consecutive study days (30+ min) earns one block per 5 days
function streakBlocks() {
  const m = dayTotals();
  const days = Object.keys(m).filter(k => m[k] >= STREAK_MIN).map(parseDay).sort((x, y) => x - y);
  let blocks = 0, run = 0, prev = null;
  for (const t of days) { run = prev !== null && Math.round((t - prev) / DAY) === 1 ? run + 1 : 1; if (run % 5 === 0) blocks++; prev = t; }
  return blocks;
}
let pendingRewards = [], holdRewards = false;
function checkRewards() {
  const stage = curStage();
  const target = Math.floor(allMin() / BG_EVERY_MIN);
  while (S.bgRolls < target) {
    // anything from this stage's tier or below that is still missing, so earlier misses carry over
    const pool = BGS.filter(b => b.tier <= stage && !S.bgs.includes(b.id));
    if (!pool.length) break;
    const b = pool[Math.floor(Math.random() * pool.length)];
    S.bgs.push(b.id); S.bgRolls++; pendingRewards.push({ kind: 'bg', id: b.id });
  }
  const itTarget = Math.min(ITEMS.length, streakBlocks());
  while (S.itemRolls < itTarget) {
    const pool = ITEMS.filter(i => !S.items.includes(i.id));
    if (!pool.length) break;
    const it = pool[Math.floor(Math.random() * pool.length)];
    S.items.push(it.id); if (!S.itemOn.includes(it.id)) S.itemOn.push(it.id); S.itemRolls++;
    pendingRewards.push({ kind: 'item', id: it.id });
  }
  if (pendingRewards.length) { save(); applyDecor(); }
}
function rewardName(r) { return (r.kind === 'bg' ? BGS : ALL_ITEMS).find(x => x.id === r.id).name; }
function flushRewards() {
  if (!pendingRewards.length || holdRewards || !$('#evo').hidden || !$('#sheet').hidden) return;
  const list = pendingRewards.splice(0);
  sfx('level'); buzz(300);
  openSheet(`<h2 class="sheet-title">새 보상 획득! <button class="btn sm ghost" data-close>닫기</button></h2>
    <div class="stack" style="gap:12px">
      ${list.map((r, i) => `<div class="px" style="padding:0;overflow:hidden"><canvas class="scene" data-rw="${i}"></canvas>
        <div class="row between" style="padding:8px 10px"><span><span class="label" style="display:block">${r.kind === 'bg' ? '배경' : '치장 아이템'}</span>${esc(rewardName(r))}</span>
        ${r.kind === 'bg' ? `<button class="btn sm gold" data-eq="${r.id}">바로 적용</button>` : '<span class="small muted">적용됨</span>'}</div></div>`).join('')}
      <button class="btn block" id="rwDeco">꾸미기에서 보기</button>
    </div>`, p => {
    $$('[data-rw]', p).forEach(cv => { const r = list[Number(cv.dataset.rw)];
      bindScene(cv, () => [curStage(), 'study', null, undefined, false, r.kind === 'bg' ? { bg: r.id } : {}], 3); });
    $$('[data-eq]', p).forEach(b => b.onclick = () => { S.bg = b.dataset.eq; save(); applyDecor(); render(); b.textContent = '적용됨'; b.disabled = true; });
    $('#rwDeco', p).onclick = () => { closeSheet(); setTimeout(openDecor, 150); };
  });
}
function redeemCode(raw) {
  const code = String(raw || '').trim().toLowerCase();
  const it = SPECIAL_ITEMS.find(i => i.code === code);
  if (!it) { toast('없는 코드예요'); return false; }
  if (S.items.includes(it.id)) { toast('이미 받은 아이템이에요'); return false; }
  S.items.push(it.id); S.itemOn.push(it.id); if (!S.codes.includes(code)) S.codes.push(code);
  save(); applyDecor(); render();
  pendingRewards.push({ kind: 'item', id: it.id });
  return true;
}
function openDecor() {
  const st = curStage();
  const left = BG_EVERY_MIN - (allMin() % BG_EVERY_MIN);
  const poolNow = BGS.filter(b => b.tier <= st && !S.bgs.includes(b.id)).length;
  const blocks = streakBlocks(), curRun = streak();
  const tierName = t => STAGES[t].name;
  const bgTile = b => {
    const own = !b || S.bgs.includes(b.id), on = b ? S.bg === b.id : !S.bg;
    if (!own) return `<div class="px deco-tile locked"><div class="deco-lock">?</div><div class="cap"><span>???</span><span class="muted">${esc(tierName(b.tier))}~</span></div></div>`;
    return `<button class="px deco-tile" data-bg="${b ? b.id : ''}" aria-pressed="${on}"><canvas class="scene" data-pv="${b ? b.id : ''}"></canvas><div class="cap"><span>${b ? esc(b.name) : '기본 배경'}</span><span class="muted">${on ? '사용 중' : ''}</span></div></button>`;
  };
  const itTile = it => {
    const own = S.items.includes(it.id), on = S.itemOn.includes(it.id);
    if (!own) return `<div class="px deco-tile locked"><div class="deco-lock">?</div><div class="cap"><span>???</span><span class="muted">${it.code ? '비밀 코드' : '연속 5일'}</span></div></div>`;
    return `<button class="px deco-tile" data-it="${it.id}" aria-pressed="${on}"><canvas class="scene" data-pi="${it.id}"></canvas><div class="cap"><span>${esc(it.name)}</span><span class="muted">${on ? 'ON' : 'OFF'}</span></div></button>`;
  };
  openSheet(`<h2 class="sheet-title">꾸미기 <button class="btn sm ghost" data-close>닫기</button></h2>
    <div class="stack" style="gap:14px">
      <div class="px card small" style="line-height:1.8">
        <div>배경 <b class="num" style="color:var(--gold);font-weight:normal">${S.bgs.length}/${BGS.length}</b> · 공부 10시간마다 하나 (직접 추가한 시간 포함)</div>
        <div class="muted">${S.bgs.length >= BGS.length ? '배경을 전부 모았어요!' : poolNow ? `다음 배경까지 ${fmtHM(left)}` : `지금 단계 배경은 다 모았어요. ${esc(STAGES[Math.min(st + 1, 5)].name)} 단계가 되면 새 배경이 열려요.`}</div>
        <div style="margin-top:6px">치장 아이템 <b class="num" style="color:var(--gold);font-weight:normal">${S.items.filter(id => ITEMS.some(i => i.id === id)).length}/${ITEMS.length}</b> · 연속 5일마다 하나</div>
        <div class="muted">${S.itemRolls >= ITEMS.length ? '아이템을 전부 모았어요!' : `지금 연속 ${curRun}일 · 다음 아이템까지 연속 ${5 - (curRun % 5)}일`}</div>
      </div>
      <h3 class="h">배경</h3>
      <div class="deco-grid">${bgTile(null)}${BGS.map(bgTile).join('')}</div>
      <p class="small muted" style="margin:0">물음표 아래는 열리는 단계예요. 앞 단계에서 못 받은 배경도 다음 단계에서 계속 나와요.</p>
      <h3 class="h">치장 아이템</h3>
      <div class="deco-grid">${ALL_ITEMS.filter(i => !i.code || S.items.includes(i.id)).map(itTile).join('')}</div>
      <p class="small muted" style="margin:0">누르면 켜고 끌 수 있어요. 여러 개를 같이 둘 수 있어요.</p>
      <div class="px card stack" style="gap:8px">
        <span class="label">코드 입력</span>
        <form class="row" id="codeForm"><input class="input grow" id="codeIn" autocomplete="off" autocapitalize="none" placeholder="코드를 입력하세요"><button class="btn gold" type="submit">등록</button></form>
      </div>
    </div>`, p => {
    $$('[data-pv]', p).forEach(cv => { const id = cv.dataset.pv || null; bindScene(cv, () => [curStage(), 'study', null, undefined, false, { bg: id, items: [] }], 2); });
    $$('[data-pi]', p).forEach(cv => { const id = cv.dataset.pi; bindScene(cv, () => [curStage(), 'study', null, undefined, false, { items: [id] }], 2); });
    $$('[data-bg]', p).forEach(b => b.onclick = () => { S.bg = b.dataset.bg || null; save(); applyDecor(); render(); openDecor(); });
    $$('[data-it]', p).forEach(b => b.onclick = () => { const id = b.dataset.it; S.itemOn = S.itemOn.includes(id) ? S.itemOn.filter(x => x !== id) : S.itemOn.concat(id); save(); applyDecor(); render(); openDecor(); });
    $('#codeForm', p).onsubmit = e => { e.preventDefault(); if (redeemCode($('#codeIn', p).value)) { closeSheet(); } };
  });
}

/* ================= daily reminder (native apps) ================= */
function canRemind() { return !!((window.AndroidBridge && AndroidBridge.scheduleAt) || (window.IOSBridge && IOSBridge.scheduleAt)); }
// book the next 7 evenings; today is skipped once something is recorded. Re-planned whenever the app is used.
function planReminders() {
  if (!canRemind()) return;
  const NB2 = window.AndroidBridge && AndroidBridge.scheduleAt ? AndroidBridge : IOSBridge;
  for (let i = 0; i < 7; i++) { try { NB2.cancelAt(i); } catch (e) {} }
  if (!S.settings.remind) return;
  const [hh, mm] = String(S.settings.remindAt || '21:00').split(':').map(Number);
  const now = Date.now(), studied = todayMin() > 0, st = streak();
  for (let i = 0; i < 7; i++) {
    const at = startOfDay(addDays(Date.now(), i)) + ((hh || 0) * 60 + (mm || 0)) * 60000;
    if (at <= now + 30000 || (i === 0 && studied)) continue;
    const body = i === 0 && st > 0 ? `연속 ${st}일째예요. 끊기기 전에 25분만 앉아볼까요?` : '오늘 공부 기록이 아직 없어요. 25분만 책상에 앉아볼까요?';
    try { NB2.scheduleAt(i, String(at), '오늘 공부 아직 0분', body); } catch (e) {}
  }
}

/* ================= quotes ================= */
const QUOTES = [
  ['오늘 걷지 않으면 내일은 뛰어야 한다.', '속담'],
  ['천 리 길도 한 걸음부터.', '속담'],
  ['시작이 반이다.', '속담'],
  ['티끌 모아 태산.', '속담'],
  ['배움에는 왕도가 없다.', '에우클레이데스'],
  ['아는 것이 힘이다.', '프랜시스 베이컨'],
  ['배우고 때때로 익히면 또한 기쁘지 아니한가.', '논어'],
  ['천재는 1%의 영감과 99%의 땀으로 이루어진다.', '토머스 에디슨'],
  ['물방울이 바위를 뚫는 건 힘이 아니라 꾸준함이다.', '오비디우스'],
  ['고생 끝에 낙이 온다.', '속담'],
  ['지금 자면 꿈을 꾸지만, 지금 공부하면 꿈을 이룬다.', '도서관 낙서'],
  ['공부의 고통은 잠깐이지만, 못 배운 고통은 평생이다.', '도서관 낙서'],
  ['늦었다고 생각할 때가 가장 빠를 때다.', '속담'],
  ['오늘 할 일을 내일로 미루지 마라.', '벤저민 프랭클린'],
  ['EXP는 거짓말을 안 한다. 앉아 있던 시간만큼 오른다.', 'Level up your life'],
  ['만수르도 처음엔 박스 책상이었다. 아마도.', 'Level up your life'],
  ['딱 25분만. 그 다음은 그때 생각하자.', 'Level up your life'],
  ['폰 내려놓은 지금 이 순간이 레벨업 구간이다.', 'Level up your life'],
  ['어제의 나보다 1분만 더.', 'Level up your life'],
  ['하기 싫은 날 한 공부가 제일 많이 남는다.', 'Level up your life'],
  ['완벽한 계획보다 지금 펼친 한 페이지.', 'Level up your life'],
  ['진화는 하루아침에 안 된다. 근데 하루씩은 된다.', 'Level up your life'],
  ['집중이 안 되면 자세부터 고쳐 앉자.', 'Level up your life'],
  ['남이 노는 시간에 쌓은 시간은 티가 난다. 나중에.', 'Level up your life'],
  ['모르는 걸 아는 게 공부의 시작이다.', '소크라테스의 말로 전해짐'],
  ['노력은 배신하지 않는다. 다만 시간이 좀 걸릴 뿐.', 'Level up your life'],
  ['합격 수기는 남이 쓰는 게 아니라 내가 쓰는 거다.', 'Level up your life'],
  ['쉬는 것도 계획의 일부다. 단, 타이머 안에서.', 'Level up your life'],
  ['한 번에 다 하려 하지 말고, 매일 조금씩.', 'Level up your life'],
  ['D-day는 다가오고, 나는 강해진다.', 'Level up your life'],
];
function pickQuote(prev) {
  let i; do { i = Math.floor(Math.random() * QUOTES.length); } while (QUOTES.length > 1 && i === prev);
  return i;
}

/* ================= toast / layers (back button) ================= */
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2300); }
const layers = [];
let armed = false, ignorePop = 0, disarmT = null;
// One "guard" history entry while any layer (sheet, tab, timer) is open, so the Android back button closes layers first.
function arm() {
  clearTimeout(disarmT);
  if (!armed) { try { history.pushState({ g: 1 }, ''); armed = true; } catch (e) {} }
}
function maybeDisarm() {
  clearTimeout(disarmT);
  disarmT = setTimeout(() => {
    if (!layers.length && armed) { armed = false; ignorePop++; try { history.back(); } catch (e) { ignorePop--; } }
  }, 60);
}
function pushLayer(kind, close) { layers.push({ kind, close }); arm(); }
function popLayerUI() { const l = layers.pop(); if (!l) return; l.close(); maybeDisarm(); }
window.addEventListener('popstate', () => {
  if (ignorePop > 0) { ignorePop--; return; }
  armed = false;
  const l = layers.pop(); if (l) l.close();
  if (layers.length) arm();
});

/* ================= sheet ================= */
let sheetOnClose = null;
function openSheet(html, mount, onClose) {
  const sh = $('#sheet'), p = $('#sheetPanel');
  p.innerHTML = html; p.scrollTop = 0;
  if (onClose) sheetOnClose = onClose;
  if (sh.hidden) {
    if (!onClose) sheetOnClose = null;
    sh.hidden = false;
    pushLayer('sheet', () => { sh.hidden = true; p.innerHTML = ''; const f = sheetOnClose; sheetOnClose = null; if (f) f(); setTimeout(flushRewards, 120); });
  }
  if (mount) mount(p);
  $$('[data-close]', p).forEach(x => { x.onclick = closeSheet; });
}
function closeSheet() { if (!$('#sheet').hidden) { const top = layers[layers.length - 1]; if (top && top.kind === 'sheet') popLayerUI(); else { $('#sheet').hidden = true; } } }
function confirmSheet(title, msg, okLabel, danger, onOk) {
  openSheet(`<h2 class="sheet-title">${esc(title)}</h2><p class="muted" style="margin:0">${msg}</p>
    <div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn ghost" data-close>취소</button><button class="btn ${danger ? 'red' : 'gold'}" id="cfOk">${esc(okLabel)}</button></div>`,
    p => { p.querySelector('#cfOk').onclick = () => { closeSheet(); onOk(); }; });
}
$('#sheet').addEventListener('click', e => { if (e.target.id === 'sheet') closeSheet(); });

/* ================= scene loop ================= */
let scenes = [];
function drawFrom(ctx, arr, f) {
  const [s, p, sil, sty, plain, deco] = arr;
  if (!deco) return drawScene(ctx, s, p, f, sil, sty, plain);
  const kb = SCENE_BG, ki = SCENE_ITEMS;
  SCENE_BG = 'bg' in deco ? deco.bg : kb; SCENE_ITEMS = deco.items || ki;
  try { drawScene(ctx, s, p, f, sil, sty, plain); } finally { SCENE_BG = kb; SCENE_ITEMS = ki; }
}
function bindScene(canvas, get, scale) {
  const ctx = makeSceneCanvas(canvas, scale);
  const o = { canvas, ctx, get };
  scenes.push(o);
  drawFrom(ctx, get(), frame);
  return o;
}
let frame = 0, lastF = -1, lastTick = 0;
function loop(ts) {
  const f = Math.floor(ts / 170);
  if (f !== lastF) {
    lastF = f; frame = f;
    scenes = scenes.filter(o => o.canvas.isConnected);
    for (const o of scenes) if (o.canvas.offsetParent !== null) drawFrom(o.ctx, o.get(), f);
  }
  if (ts - lastTick > 250) { lastTick = ts; tick(); }
  requestAnimationFrame(loop);
}
setInterval(() => { if (document.hidden) tick(); }, 1000);

/* ================= tabs / render ================= */
let curTab = 'home';
function switchTab(t, fromPop) {
  if (t === curTab) { if (t === 'cards' && fcDeckId) { fcCloseDeck(); return; } $('#view').scrollTop = 0; return; }
  if (curTab === 'cards' && fcDeckId) { const i = layers.findIndex(l => l.kind === 'deck'); if (i >= 0) layers.splice(i, 1); fcDeckId = null; }
  const top = layers[layers.length - 1];
  if (t === 'home' && !fromPop && top && top.kind === 'tab') { popLayerUI(); return; }
  if (t !== 'home' && !layers.some(l => l.kind === 'tab')) pushLayer('tab', () => switchTab('home', true));
  curTab = t;
  render();
  $('#view').scrollTop = 0;
}
$$('.tab').forEach(b => b.addEventListener('click', () => { sfx('tap'); switchTab(b.dataset.tab); }));

function render() {
  $$('.tab').forEach(b => b.setAttribute('aria-current', b.dataset.tab === curTab ? 'page' : 'false'));
  renderDdayChip();
  ({ home: renderHome, stats: renderStats, cards: renderCards, cats: renderCats, dday: renderDday, settings: renderSettings })[curTab]();
}

function nextDday() {
  const today = startOfDay(Date.now());
  const list = S.ddays.map(d => ({ ...d, diff: Math.round((parseDay(d.date) - today) / DAY) }));
  return list.find(d => d.pinned) || list.filter(d => d.diff >= 0).sort((a, b) => a.diff - b.diff)[0] || null;
}
function ddayLabel(diff) { return diff > 0 ? `D-${diff}` : diff === 0 ? 'D-DAY' : `D+${-diff}`; }
function renderDdayChip() {
  const c = $('#ddayChip'), d = nextDday();
  if (!d) { c.hidden = true; return; }
  c.hidden = false;
  c.innerHTML = `<b>${ddayLabel(d.diff)}</b> ${esc(d.name)}`;
}
$('#ddayChip').onclick = () => switchTab('dday');

/* ----- home ----- */
function renderHome() {
  const min = totalMin(), st = stageOf(min), lv = levelInfo(min), next = STAGES[st + 1];
  const tMin = todayMin(), goal = S.settings.goal, gp = goal ? clamp(tMin / goal * 100, 0, 100) : 0;
  const t = S.timer;
  const k = dayKey(Date.now());
  const today = S.sessions.filter(s => dayKey(s.s) === k).sort((a, b) => b.s - a.s);
  const best = bestStreak();
  const hPct = next ? clamp(min / (next.hours * 60) * 100, 0, 100) : 100;
  const sPct = next && next.streak ? clamp(best / next.streak * 100, 0, 100) : 100;
  const req = next ? `
        <div class="small muted">다음 진화 <b style="color:var(--teal);font-weight:normal">${esc(next.name)}</b> 조건</div>
        <div class="req"><span class="small">누적 공부</span><div class="bar thin teal"><i style="width:${hPct.toFixed(1)}%"></i></div><span class="small num ${hPct >= 100 ? 'ok' : ''}">${Math.floor(min / 60)} / ${next.hours}h</span></div>
        ${next.streak ? `<div class="req"><span class="small">최장 연속</span><div class="bar thin teal"><i style="width:${sPct.toFixed(1)}%"></i></div><span class="small num ${sPct >= 100 ? 'ok' : ''}">${best} / ${next.streak}일</span></div>
        <div class="small muted">연속은 하루 ${STREAK_MIN}분 이상 공부한 날이 끊기지 않고 이어진 기록이에요.</div>` : ''}`
    : `<div class="small muted">최종 진화 완료. 이제 즐기면 된다.</div>`;
  $('#view').innerHTML = `
  <div class="stack">
    <div class="px stage-card">
      <canvas id="hScene" class="scene" aria-label="${esc(STAGES[st].name)} 캐릭터"></canvas>
      <div class="stage-info">
        <div class="row between">
          <div class="row"><span class="lv num">Lv.${lv.L}</span><span class="stage-name">${esc(STAGES[st].name)}</span></div>
          <div class="row" style="gap:6px"><button class="btn sm" id="decoBtn">꾸미기</button><button class="btn sm" id="dexBtn">도감</button></div>
        </div>
        <div class="bar" title="레벨 경험치"><i style="width:${(lv.into / lv.need * 100).toFixed(1)}%"></i></div>
        <div class="row between small muted num"><span>EXP ${Math.floor(lv.into)} / ${lv.need}</span><span>1분 = 1 EXP</span></div>
        ${req}
      </div>
    </div>
    ${t ? `<button class="btn teal block start" id="startBtn">${t.phase === 'focus' ? '공부 중' : '휴식 중'} · <span id="miniClock" class="num"></span></button>`
        : `<button class="btn gold block start" id="startBtn"><span class="arrow">▶</span>&nbsp;START</button>`}
    <div class="stats3">
      <div class="px stat"><div class="v num">${fmtShort(tMin)}</div><div class="k">오늘 공부</div></div>
      <div class="px stat"><div class="v num">${Math.round(gp)}%</div><div class="k">목표 ${fmtShort(goal)}</div></div>
      <div class="px stat"><div class="v num">${streak()}일</div><div class="k">연속 (${STREAK_MIN}분+)</div></div>
    </div>
    ${typeof fcAllDue === 'function' && fcAllDue() ? `<button class="px item" id="homeDue" style="text-align:left;width:calc(100% - 6px)"><span class="grow"><span style="display:block">오늘 복습할 카드 <b class="num" style="color:var(--gold);font-weight:normal">${fcAllDue()}장</b></span><span class="small muted">잊어버리기 전에 한 번 더 보면 오래 가요</span></span><span class="small" style="color:var(--gold)">복습하기 ▶</span></button>` : ''}
    <div class="px card stack" style="gap:10px">
      <div class="row between"><h3 class="h">오늘 기록</h3><button class="btn sm ghost" id="addRec">+ 직접 추가</button></div>
      ${today.length ? `<ul class="log">${today.map(s => {
        const c = catById(s.cat); const a = new Date(s.s), b = new Date(s.e);
        return `<li data-id="${s.id}"><span class="dot" style="background:${c.color}"></span><span class="grow">${esc(c.name)}${s.manual ? ' <span class="tag">직접</span>' : ''}</span><span class="muted small num">${pad(a.getHours())}:${pad(a.getMinutes())}–${pad(b.getHours())}:${pad(b.getMinutes())}</span><span class="num">${fmtShort(s.sec / 60)}</span>${s.memo ? `<span class="memo">${esc(s.memo)}</span>` : ''}</li>`;
      }).join('')}</ul><div class="small muted">기록을 누르면 메모를 남기거나 지울 수 있어요.</div>`
      : `<div class="empty">아직 오늘 기록이 없어요.<br>START 누르면 캐릭터가 책상 앞에 앉습니다.</div>`}
    </div>
  </div>`;
  bindScene($('#hScene'), () => {
    const tt = S.timer;
    const pose = tt && tt.phase === 'focus' && !tt.pausedAt ? 'study' : 'rest';
    return [curStage(), pose];
  });
  $('#startBtn').onclick = () => { if (S.timer) openTimer(); else openStartSheet(); };
  $('#dexBtn').onclick = openDex;
  $('#decoBtn').onclick = openDecor;
  $('#addRec').onclick = openManualRecord;
  $$('.log li').forEach(li => li.onclick = () => openRecord(li.dataset.id));
  if ($('#homeDue')) $('#homeDue').onclick = () => { switchTab('cards'); setTimeout(() => fcSetup(null, 'due'), 80); };
  updateMiniClock();
}
function openRecord(id) {
  const s = S.sessions.find(x => x.id === id); if (!s) return;
  const c = catById(s.cat), a = new Date(s.s), b = new Date(s.e);
  openSheet(`<h2 class="sheet-title">공부 기록 <button class="btn sm ghost" data-close>닫기</button></h2>
    <div class="stack" style="gap:12px">
      <div class="row"><span class="dot" style="background:${c.color}"></span><span class="grow">${esc(c.name)}${s.manual ? ' <span class="tag">직접</span>' : ''}</span>
        <span class="small muted num">${a.getMonth() + 1}/${a.getDate()} ${pad(a.getHours())}:${pad(a.getMinutes())}–${pad(b.getHours())}:${pad(b.getMinutes())}</span><span class="num">${fmtHM(s.sec / 60)}</span></div>
      <label class="field"><span class="label">한 줄 메모</span><input class="input" id="rcMemo" maxlength="80" value="${esc(s.memo || '')}" placeholder="뭘 공부했는지 적어두면 나중에 보기 좋아요"></label>
      <div class="row" style="gap:10px"><button class="btn red grow" id="rcDel">기록 삭제</button><button class="btn gold grow" id="rcSave">저장</button></div>
    </div>`, p => {
    $('#rcSave', p).onclick = () => { s.memo = $('#rcMemo', p).value.trim(); save(); closeSheet(); render(); toast('저장했어요'); };
    $('#rcDel', p).onclick = () => confirmSheet('기록 삭제', `${esc(c.name)} ${fmtHM(s.sec / 60)} 기록을 지울까요?${s.manual ? '' : ' EXP도 같이 빠집니다.'}`, '삭제', true, () => {
      S.sessions = S.sessions.filter(x => x.id !== s.id); syncSeen(); save(); render(); toast('기록을 지웠어요');
    });
  });
}
function updateMiniClock() {
  const el = $('#miniClock'), t = S.timer; if (!el || !t) return;
  const d = phaseDur(t);
  el.textContent = d ? fmtClock(d - elapsed(t)) : fmtClock(elapsed(t), true);
}

/* ----- start sheet ----- */
function openStartSheet() {
  const st = S.settings;
  if (!S.categories.length) { toast('과목을 먼저 하나 만들어 주세요'); openCatEdit(null, () => openStartSheet()); return; }
  let cat = S.categories.some(c => c.id === st.lastCat) ? st.lastCat : S.categories[0].id;
  let mode = st.mode, focus = st.focus, rest = st.rest, cycles = st.cycles, track = st.track, longRest = st.longRest || 0;
  const every = st.longEvery || 4;
  const totalPlan = () => { let m = focus * cycles; for (let c = 1; c < cycles; c++) m += (longRest > 0 && c % every === 0) ? longRest : rest; return m; };
  const draw = () => {
    openSheet(`
      <h2 class="sheet-title">무슨 과목 할까? <button class="btn sm ghost" data-close>닫기</button></h2>
      <div class="stack">
        <div class="chips" id="catChips">
          ${S.categories.map(c => `<button class="chip" data-cat="${c.id}" aria-pressed="${c.id === cat}"><span class="dot" style="background:${c.color}"></span>${esc(c.name)}</button>`).join('')}
          <button class="chip" id="newCat">+ 새 과목</button>
        </div>
        <div class="seg"><button data-mode="pomo" aria-pressed="${mode === 'pomo'}">뽀모도로</button><button data-mode="free" aria-pressed="${mode === 'free'}">스톱워치</button></div>
        ${mode === 'pomo' ? `
        <div class="px card" style="padding:4px 12px">
          ${stepper('focus', '공부 시간', focus, '분')}
          ${stepper('rest', '휴식 시간', rest, '분')}
          ${stepper('cycles', '반복', cycles, '세트')}
          ${stepper('longRest', `긴 휴식 (${every}세트마다)`, longRest, longRest ? '분' : '분 · 끔')}
        </div>
        <div class="presets">
          <button class="btn sm" data-pre="25,5,4">25 / 5</button>
          <button class="btn sm" data-pre="50,10,3">50 / 10</button>
          <button class="btn sm" data-pre="90,20,2">90 / 20</button>
        </div>
        <div class="small muted">총 ${fmtHM(totalPlan())} · 순수 공부 ${fmtHM(focus * cycles)} (EXP +${focus * cycles})${longRest && cycles <= every ? ` · 긴 휴식은 ${every + 1}세트 이상일 때 들어가요` : ''}</div>`
        : `<div class="px card small muted" style="line-height:1.7">멈출 때까지 시간이 올라갑니다. 쉬고 싶을 때 <b style="color:var(--teal);font-weight:normal">휴식하기</b>를 누르면 그때까지 공부한 시간이 저장되고, 캐릭터도 쉬는 모습으로 바뀌어요.</div>`}
        <div class="px card row between" style="padding:10px 12px">
          <span><span class="label" style="display:block">공부 사운드</span>${esc(trackName(track))}</span>
          <button class="btn sm" id="pickTr">바꾸기</button>
        </div>
        <button class="btn gold block start" id="goBtn"><span class="arrow">▶</span>&nbsp;START</button>
      </div>`, p => {
      $('#pickTr', p).onclick = () => openTrackPicker(track, id => { track = id; NativeMusic.warm(id); setTimeout(draw, 0); });
      $$('[data-cat]', p).forEach(b => b.onclick = () => { cat = b.dataset.cat; sfx('tap'); draw(); });
      $('#newCat', p).onclick = () => openCatEdit(null, id => { if (id) cat = id; draw(); });
      $$('[data-mode]', p).forEach(b => b.onclick = () => { mode = b.dataset.mode; draw(); });
      $$('[data-pre]', p).forEach(b => b.onclick = () => { [focus, rest, cycles] = b.dataset.pre.split(',').map(Number); draw(); });
      $$('[data-step]', p).forEach(b => b.onclick = () => {
        const [k, dir] = b.dataset.step.split(':'); const d = Number(dir);
        if (k === 'focus') focus = clamp(focus + d * ((d > 0 ? focus >= 60 : focus > 60) ? 10 : 5), 5, 180);
        if (k === 'rest') rest = clamp(rest + d * ((d > 0 ? rest >= 10 : rest > 10) ? 5 : 1), 0, 60);
        if (k === 'cycles') cycles = clamp(cycles + d, 1, 12);
        if (k === 'longRest') longRest = clamp(longRest + d * 5, 0, 60);
        draw();
      });
      $('#goBtn', p).onclick = () => {
        Object.assign(S.settings, { lastCat: cat, mode, focus, rest, cycles, track, longRest }); save();
        closeSheet();
        startTimer({ cat, mode, focus, rest, cycles, track, longRest });
      };
    });
  };
  draw();
}
function stepper(key, label, val, unit) {
  return `<div class="stepper"><span>${label}</span><div class="ctl">
    <button class="btn sm" data-step="${key}:-1" aria-label="${label} 줄이기">−</button>
    <span class="val num">${val}<span class="small muted"> ${unit}</span></span>
    <button class="btn sm" data-step="${key}:1" aria-label="${label} 늘리기">+</button></div></div>`;
}

/* ================= timer engine ================= */
// a long break replaces the normal one after every longEvery-th set
function isLongRest(t) { return t.mode === 'pomo' && t.longRest > 0 && t.longEvery > 0 && t.cycle % t.longEvery === 0; }
function restMin(t) { return isLongRest(t) ? t.longRest : t.rest; }
function phaseDur(t) { return t.mode === 'pomo' ? (t.phase === 'focus' ? t.focus : restMin(t)) * 60000 : 0; }
function elapsed(t) { return (t.pausedAt ?? Date.now()) - t.start; }
function record(catId, s, e) {
  const sec = Math.round((e - s) / 1000);
  if (sec < 60) return 0;
  const id = uid();
  S.sessions.push({ id, cat: catId, s, e, sec });
  if (S.timer) (S.timer.ids = S.timer.ids || []).push(id);
  return sec;
}
function startTimer(c) {
  ac();
  S.timer = { cat: c.cat, mode: c.mode, focus: c.focus, rest: c.rest, cycles: c.mode === 'pomo' ? c.cycles : 1, cycle: 1, phase: 'focus', start: Date.now(), pausedAt: null, waiting: false, distract: 0, earned: 0, quote: pickQuote(), created: Date.now(), track: c.track || 'none', longRest: c.longRest || 0, longEvery: S.settings.longEvery || 4, ids: [] };
  save();
  sfx('start'); buzz(60);
  openTimer();
  onPhaseChange();
  clockTimer(phaseLeftSec());
}
// status-bar / lock-screen notification with a live countdown (Android app only)
function sceneImage(pose) {
  try {
    const c = document.createElement('canvas'), k = 4;
    c.width = SW * k; c.height = SH * k;
    const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false; ctx.setTransform(k, 0, 0, k, 0, 0);
    drawScene(ctx, curStage(), pose, 2);
    return c.toDataURL('image/png').split(',')[1] || '';
  } catch (e) { return ''; }
}
function ongoing() {
  if (!NB || !NB.showOngoing) return;
  const t = S.timer;
  try {
    if (!t) { NB.hideOngoing(); NB.lockScreen(false); return; }
    NB.lockScreen(!!S.settings.lockShow);
    const name = catById(t.cat).name, d = phaseDur(t), el = elapsed(t), now = Date.now();
    const running = !t.pausedAt;
    const studying = t.phase === 'focus' && running;
    const state = t.waiting ? '대기 중' : !running ? '일시정지' : t.phase === 'focus' ? '공부 중' : '휴식 중';
    const lv = `Lv.${levelInfo(totalMin()).L} ${STAGES[curStage()].name}`;
    const sub = t.mode === 'pomo' ? `${t.cycle}/${t.cycles}세트 · ${lv}` : `스톱워치 · ${lv}`;
    // chronometer: count down to the phase end (pomodoro) or up from the start (stopwatch)
    const when = d ? (running ? t.start + d : now + (d - el)) : (running ? t.start : now - el);
    NB.showOngoing(`${name} · ${state}`, sub, String(Math.round(when)), !!d, running, sceneImage(studying ? 'study' : 'rest'));
  } catch (e) {}
}
function onPhaseChange() {
  const t = S.timer;
  updateMusic();
  ongoing();
  if (!t) { cancelNotify(); keepAwake(false); return; }
  keepAwake(true);
  const d = phaseDur(t);
  if (!d || t.pausedAt) { cancelNotify(); return; }
  const left = (d - elapsed(t)) / 1000;
  const name = catById(t.cat).name;
  if (t.phase === 'focus') {
    const last = t.cycle >= t.cycles;
    scheduleNotify(left, last ? '오늘 세트 완료!' : '집중 끝! 쉬는 시간', last ? `${name} ${t.cycles}세트 다 했어요. EXP 확인하러 가요.` : `${name} ${t.cycle}/${t.cycles}세트 끝. ${isLongRest(t) ? '긴 휴식 ' : ''}${restMin(t)}분 쉬어요.`);
  } else {
    scheduleNotify(left, '휴식 끝! 다시 책상으로', `${name} ${t.cycle + 1}세트 시작할 시간이에요.`);
  }
}
function tick() {
  let t = S.timer;
  if (t && t.mode === 'pomo' && !t.pausedAt) {
    let guard = 0;
    while ((t = S.timer) && !t.pausedAt && guard++ < 60) {
      const end = t.start + phaseDur(t);
      if (Date.now() < end) break;
      completePhase(end, Date.now() - end < 5000, false);
    }
  }
  if (S.timer) { updateTimerUI(); updateMiniClock(); }
}
function completePhase(end, live, manual) {
  const t = S.timer;
  const auto = S.settings.autoNext;
  if (t.phase === 'focus') {
    t.earned += record(t.cat, t.start, end);
    if (t.cycle >= t.cycles) { save(); finishTimer(true); return; }
    if (restMin(t) > 0) t.phase = 'rest'; else { t.cycle++; t.quote = pickQuote(t.quote); }
    if (live) { sfx('focusEnd'); buzz(700); }
  } else {
    t.cycle++; t.phase = 'focus'; t.quote = pickQuote(t.quote);
    if (live) { sfx('restEnd'); buzz(500); }
  }
  if (manual) { t.start = Date.now(); t.pausedAt = null; t.waiting = false; }
  else { t.start = end; t.pausedAt = auto ? null : end; t.waiting = !auto; }
  save();
  onPhaseChange();
  checkProgress();
}
function togglePause() {
  const t = S.timer; if (!t) return;
  const resumed = !!t.pausedAt;
  if (t.pausedAt) { t.start += Date.now() - t.pausedAt; t.pausedAt = null; t.waiting = false; sfx('start'); }
  else { t.pausedAt = Date.now(); sfx('tap'); }
  save(); onPhaseChange(); updateTimerUI();
  if (resumed) clockTimer(phaseLeftSec());
  else if (IS_IOS_APP && S.settings.clockLink) toast('잠금화면 시계 타이머는 ✕로 따로 멈춰주세요');
}
function skipPhase() {
  const t = S.timer; if (!t) return;
  const now = t.pausedAt ?? Date.now();
  if (t.mode === 'free') {
    if (t.phase === 'focus') { t.earned += record(t.cat, t.start, now); t.phase = 'rest'; sfx('restEnd'); }
    else { t.phase = 'focus'; t.quote = pickQuote(t.quote); sfx('start'); }
    t.start = Date.now(); t.pausedAt = null; t.waiting = false;
    save(); onPhaseChange(); checkProgress(); updateTimerUI();
    return;
  }
  completePhase(now, false, true);
  updateTimerUI();
  clockTimer(phaseLeftSec());
}
function stopTimer() {
  const t = S.timer; if (!t) return;
  if (t.phase === 'focus') t.earned += record(t.cat, t.start, t.pausedAt ?? Date.now());
  finishTimer(false);
}
function finishTimer(completed) {
  const t = S.timer;
  S.timer = null; save();
  cancelNotify(); keepAwake(false); updateMusic(); ongoing();
  closeTimer();
  if (completed) { sfx('done'); buzz(900); }
  render();
  holdRewards = true;
  const evolved = checkProgress();
  const min = t.earned / 60;
  const after = () => openSheet(`
    <h2 class="sheet-title">${completed ? '세트 완료!' : '수고했어요'} <button class="btn sm ghost" data-close>닫기</button></h2>
    <div class="stack" style="gap:10px">
      <div class="stats3">
        <div class="px stat"><div class="v num">${fmtShort(min)}</div><div class="k">이번 공부</div></div>
        <div class="px stat"><div class="v num">+${Math.floor(min)}</div><div class="k">EXP</div></div>
        <div class="px stat"><div class="v num">${t.distract}회</div><div class="k">앱 이탈</div></div>
      </div>
      <p class="small muted" style="margin:0">${min < 1 ? '1분이 안 돼서 기록에 남지 않았어요.' : `${esc(catById(t.cat).name)} 기록에 저장했어요. 오늘 누적 ${fmtHM(todayMin())}.`}</p>
      ${IS_IOS_APP && S.settings.clockLink && !completed ? '<p class="small" style="margin:0;color:var(--gold)">잠금화면 시계 타이머는 계속 돌고 있어요. 잠금화면 타이머의 ✕를 누르거나 다이내믹 아일랜드를 길게 눌러 꺼주세요.</p>' : ''}
      ${t.ids && t.ids.length ? `<label class="field"><span class="label">한 줄 메모 (뭘 공부했는지)</span><input class="input" id="sumMemo" maxlength="80" placeholder="예: SQLD 2과목 기출 30문제"></label>` : ''}
      <button class="btn gold block" data-close>확인</button>
    </div>`, p => {
    const m = $('#sumMemo', p); if (!m) return;
    m.oninput = () => { const v = m.value.trim(); S.sessions.forEach(x => { if (t.ids.includes(x.id)) x.memo = v; }); save(); };
  });
  if (evolved) pendingAfterEvo = after; else after();
  holdRewards = false;
}
function syncSeen() {
  const min = totalMin();
  S.seenStage = Math.min(S.seenStage, stageOf(min));
  S.seenLevel = Math.min(S.seenLevel, levelInfo(min).L);
}
function checkProgress() {
  checkRewards();
  planReminders();
  setTimeout(flushRewards, 200);
  const min = totalMin(), L = levelInfo(min).L, st = stageOf(min);
  if (st > S.seenStage) {
    const from = S.seenStage; S.seenStage = st; S.seenLevel = L; save();
    playEvolution(from, st);
    return true;
  }
  if (L > S.seenLevel) { S.seenLevel = L; save(); sfx('level'); toast(`LEVEL UP! Lv.${L}`); }
  return false;
}

/* ----- timer screen ----- */
let timerScene = null, shownQuote = -1;
function openTimer() {
  const el = $('#timer');
  if (!el.hidden) return;
  el.hidden = false;
  if (!timerScene) timerScene = bindScene($('#tScene'), () => {
    const t = S.timer;
    return [curStage(), t && t.phase === 'focus' && !t.pausedAt ? 'study' : 'rest'];
  });
  shownQuote = -1;
  pushLayer('timer', () => { $('#timer').hidden = true; render(); });
  updateTimerUI();
}
function closeTimer() {
  const top = layers[layers.length - 1];
  if (top && top.kind === 'timer') popLayerUI();
  else { const i = layers.findIndex(l => l.kind === 'timer'); if (i >= 0) layers.splice(i, 1); $('#timer').hidden = true; maybeDisarm(); }
}
function updateTimerUI() {
  const t = S.timer; if (!t || $('#timer').hidden) return;
  const d = phaseDur(t), el = elapsed(t), c = catById(t.cat);
  $('#tClock').textContent = d ? fmtClock(d - el) : fmtClock(el, true);
  const ph = $('#tPhase');
  ph.textContent = t.waiting ? (t.phase === 'focus' ? 'READY · 다음 세트' : 'READY · 휴식') : t.pausedAt ? 'PAUSE' : t.phase === 'focus' ? 'FOCUS · 공부 중' : isLongRest(t) ? 'BREAK · 긴 휴식' : 'BREAK · 휴식 중';
  ph.className = 'phase' + (t.waiting || t.pausedAt ? ' wait' : t.phase === 'rest' ? ' rest' : '');
  const tc = $('#tCat');
  if (tc.dataset.k !== t.cat) {
    tc.dataset.k = t.cat;
    tc.innerHTML = `<span class="dot" style="background:${c.color}"></span>${esc(c.name)}<button class="btn sm ghost" id="tMin" aria-label="타이머 작게 보기">▼ 작게</button>`;
    $('#tMin').onclick = () => closeTimer();
  }
  const pct = d ? el / d * 100 : (el % 3600000) / 36000;
  const bar = $('#tBar'); bar.className = 'bar thin' + (t.phase === 'rest' ? ' teal' : '');
  bar.firstElementChild.style.width = clamp(pct, 0, 100).toFixed(2) + '%';
  const sessionMin = t.earned / 60 + (t.phase === 'focus' ? el / 60000 : 0);
  $('#tInfo').textContent = t.mode === 'pomo' ? `${t.cycle}/${t.cycles}세트 · ${t.focus}분 공부 / ${t.rest}분 휴식${t.longRest && t.cycles > t.longEvery ? ` · ${t.longEvery}세트마다 ${t.longRest}분` : ''}` : `스톱워치 · 이번 공부 ${fmtHM(sessionMin)}`;
  $('#tDistract').textContent = t.distract ? `앱 이탈 ${t.distract}회` : '';
  const tm = $('#tMusic'), lbl = `♪ ${trackName(t.track || 'none')}`;
  if (tm.textContent !== lbl) tm.textContent = lbl;
  $('#tCycles').innerHTML = t.mode === 'pomo' ? Array.from({ length: t.cycles }, (_, i) => `<i class="${i + 1 < t.cycle ? 'done' : i + 1 === t.cycle ? 'now' : ''}"></i>`).join('') : '';
  $('#tPause').textContent = t.waiting ? '시작' : t.pausedAt ? '계속' : '일시정지';
  $('#tPause').className = 'btn' + (t.waiting || t.pausedAt ? ' gold' : '');
  $('#tSkip').textContent = t.mode === 'free' ? (t.phase === 'focus' ? '휴식하기' : '다시 집중') : (t.phase === 'focus' ? (t.cycle >= t.cycles ? '여기까지' : '휴식으로') : '집중으로');
  if (shownQuote !== t.quote) {
    shownQuote = t.quote;
    const [q, who] = QUOTES[t.quote] || QUOTES[0];
    $('#tQuote').innerHTML = `${esc(q)}<small>— ${esc(who)}</small>`;
  }
}
$('#tPause').onclick = togglePause;
$('#fcX').onclick = fcClose;
$('#tMusic').onclick = () => {
  const t = S.timer; if (!t) return;
  openTrackPicker(t.track || 'none', id => { if (!S.timer) return; S.timer.track = id; S.settings.track = id; save(); updateMusic(); updateTimerUI(); });
};
$('#musicBtn').onclick = () => { ac(); S.settings.music = !S.settings.music; save(); updateMusic(); toast(S.settings.music ? '음악 켰어요' : '음악 껐어요'); if (curTab === 'settings') renderSettings(); };
document.addEventListener('pointerdown', () => { const a = ac(); if (a && Music.current() === null && desiredTrack()) updateMusic(); }, true);
// coming back from the background (or a phone call) can leave the context 'interrupted'
document.addEventListener('visibilitychange', () => { if (!document.hidden) { ac(); planReminders(); } });
$('#tSkip').onclick = skipPhase;
$('#tStop').onclick = () => {
  const t = S.timer; if (!t) return;
  const now = t.pausedAt ?? Date.now();
  const m = t.phase === 'focus' ? (now - t.start) / 60000 : 0;
  confirmSheet('공부 끝낼까요?', m >= 1 ? `지금까지 공부한 ${fmtHM(m)}은 기록에 저장돼요.` : '이번 단계는 1분이 안 돼서 저장되지 않아요.', '끝내기', true, stopTimer);
};
document.addEventListener('visibilitychange', () => {
  const t = S.timer;
  if (document.hidden) {
    let interactive = true;
    if (NB && NB.isInteractive) { try { interactive = NB.isInteractive(); } catch (e) {} }
    screenOff = !interactive;
    if (t && !t.pausedAt && t.phase === 'focus' && !screenOff) { t.distract++; save(); }
    updateMusic();
  } else {
    screenOff = false;
    updateMusic();
    tick();
    if (S.timer) keepAwake(true);
    if (curTab === 'home' && !$('#view').querySelector('#hScene')) render();
  }
});

/* ================= evolution ================= */
let pendingAfterEvo = null;
function playEvolution(from, to) {
  const ev = $('#evo'), cv = $('#eScene');
  ev.hidden = false;
  const st = { s: from };
  ev._st = st;
  if (!ev._bound) { ev._bound = bindScene(cv, () => [ev._st.s, 'idle', ev._st.sil ? '#ffffff' : null]); }
  st.sil = false;
  $('#eOk').hidden = true;
  $('#eText').textContent = '...어라?';
  $('#eSub').textContent = `${STAGES[from].name}의 모습이 변하고 있다!`;
  sfx('evo');
  const delays = [700, 420, 380, 340, 300, 260, 220, 190, 160, 140, 120, 100, 90, 80, 70, 60];
  let i = 0;
  st.sil = true;
  const redraw = () => drawScene(ev._bound.ctx, st.s, 'idle', frame, st.sil ? '#ffffff' : null);
  redraw();
  const step = () => {
    if (i < delays.length) { st.s = i % 2 ? from : to; i++; redraw(); setTimeout(step, delays[i - 1]); return; }
    st.s = to; st.sil = false; redraw(); flash(); buzz(500); sfx('level');
    const nm = STAGES[to].name;
    $('#eText').textContent = `${nm}${josa(nm, '으로', '로')} 진화했다!`;
    $('#eSub').textContent = STAGES[to].line;
    $('#eOk').hidden = false;
    $('#eOk').focus();
  };
  setTimeout(step, 600);
}
$('#eOk').onclick = () => {
  $('#evo').hidden = true; render();
  if (pendingAfterEvo) { const f = pendingAfterEvo; pendingAfterEvo = null; f(); } else flushRewards();
};
function flash() { const f = $('#flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); }

/* ================= dex ================= */
function openDex() {
  const min = totalMin(), cur = stageOf(min);
  openSheet(`<h2 class="sheet-title">진화 도감 <button class="btn sm ghost" data-close>닫기</button></h2>
    <div class="dex">${STAGES.map((s, i) => `
      <div class="px ${i > cur ? 'locked' : ''}"><canvas class="scene" data-dex="${i}"></canvas>
      <div class="cap"><span>${i > cur ? '???' : esc(s.name)}</span><span class="muted num">${s.hours ? `${s.hours}h${s.streak ? ` + ${s.streak}일` : ''}` : '시작'}</span></div></div>`).join('')}</div>
    <p class="small muted">공부 1분이 EXP 1. 알바생까지는 누적 시간만, 그 뒤로는 누적 시간과 최장 연속 공부일(하루 ${STREAK_MIN}분 이상)을 둘 다 채워야 진화해요. 지금 ${fmtHM(min)}, 최장 연속 ${bestStreak()}일.</p>`,
    p => $$('[data-dex]', p).forEach(cv => { const i = Number(cv.dataset.dex); bindScene(cv, () => [i, i <= cur ? 'study' : 'idle', i <= cur ? null : '#0d0b1a', undefined, true], 3); }));
}

/* ================= stats ================= */
let statPeriod = 'week', statOffset = 0;
function periodRange() {
  const now = Date.now();
  if (statPeriod === 'week') {
    const d = new Date(startOfDay(now)); const dow = (d.getDay() + 6) % 7;
    const start = addDays(d.getTime(), -dow + statOffset * 7);
    return { start, end: addDays(start, 7), days: 7 };
  }
  const d = new Date(now); const s = new Date(d.getFullYear(), d.getMonth() + statOffset, 1);
  const e = new Date(s.getFullYear(), s.getMonth() + 1, 1);
  return { start: s.getTime(), end: e.getTime(), days: Math.round((e - s) / DAY) };
}
function periodTitle(r) {
  const a = new Date(r.start), b = new Date(addDays(r.end, -1));
  if (statPeriod === 'month') return `${a.getFullYear()}년 ${a.getMonth() + 1}월`;
  return `${a.getMonth() + 1}.${a.getDate()} – ${b.getMonth() + 1}.${b.getDate()}`;
}
function collect(r) {
  const days = [];
  for (let i = 0; i < r.days; i++) { const t = addDays(r.start, i); days.push({ t, k: dayKey(t), total: 0, by: {} }); }
  const idx = Object.fromEntries(days.map((d, i) => [d.k, i]));
  const byCat = {}, hours = new Array(24).fill(0);
  let total = 0;
  for (const s of S.sessions) {
    if (s.s < r.start || s.s >= r.end) continue;
    const m = s.sec / 60, d = days[idx[dayKey(s.s)]];
    if (!d) continue;
    d.total += m; d.by[s.cat] = (d.by[s.cat] || 0) + m;
    byCat[s.cat] = (byCat[s.cat] || 0) + m; total += m;
    let t = s.s; const end = s.s + s.sec * 1000;
    while (t < end) { const h = new Date(t).getHours(); const nx = Math.min(end, new Date(t).setMinutes(60, 0, 0)); hours[h] += (nx - t) / 60000; t = nx; }
  }
  return { days, byCat, hours, total };
}
function niceTop(maxMin) {
  const h = maxMin / 60;
  if (h <= 0) return 60;
  const steps = [0.5, 1, 2, 3, 4, 6, 8, 10, 12, 16, 20, 24];
  return (steps.find(x => x >= h) || Math.ceil(h)) * 60;
}
function barChart(days, opts) {
  const W = 340, H = 168, L = 30, Rr = 6, T = 12, B = 20;
  const cw = W - L - Rr, ch = H - T - B;
  const max = Math.max(opts.avg || 0, opts.goal && opts.showGoal ? opts.goal : 0, ...days.map(d => d.total));
  const top = niceTop(max);
  const y = v => T + ch - (v / top) * ch;
  const slot = cw / days.length, bw = Math.max(2, Math.min(26, slot * 0.64));
  const today = dayKey(Date.now());
  let g = '';
  [0, 0.5, 1].forEach(f => {
    const v = top * f, yy = y(v);
    const lb = v === 0 ? '0' : v < 60 ? `${Math.round(v)}m` : v % 60 ? `${(v / 60).toFixed(1)}h` : `${v / 60}h`;
    g += `<line class="grid" x1="${L}" x2="${W - Rr}" y1="${yy}" y2="${yy}"/><text x="${L - 4}" y="${yy + 3}" text-anchor="end">${lb}</text>`;
  });
  days.forEach((d, i) => {
    const x = L + i * slot + (slot - bw) / 2;
    let acc = 0;
    Object.entries(d.by).sort((a, b) => b[1] - a[1]).forEach(([cid, m]) => {
      const y0 = y(acc), y1 = y(acc + m); acc += m;
      g += `<rect x="${x.toFixed(1)}" y="${y1.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0, y0 - y1).toFixed(1)}" fill="${catById(cid).color}"/>`;
    });
    const showLbl = opts.labels(i, d);
    if (showLbl) g += `<text x="${(x + bw / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle" ${d.k === today ? 'style="fill:var(--gold)"' : ''}>${showLbl}</text>`;
  });
  if (opts.showGoal && opts.goal && opts.goal <= top) g += `<line x1="${L}" x2="${W - Rr}" y1="${y(opts.goal)}" y2="${y(opts.goal)}" stroke="var(--teal)" stroke-dasharray="1 3" stroke-width="1"/>`;
  if (opts.avg > 0) {
    const ay = y(opts.avg);
    g += `<line class="avg" x1="${L}" x2="${W - Rr}" y1="${ay}" y2="${ay}"/><text class="avgt" x="${W - Rr}" y="${ay - 4}" text-anchor="end">평균 ${fmtShort(opts.avg)}</text>`;
  }
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(opts.aria)}">${g}</svg>`;
}
function hourChart(hours) {
  const W = 340, H = 110, L = 8, Rr = 8, T = 8, B = 18;
  const cw = W - L - Rr, ch = H - T - B, max = Math.max(1, ...hours);
  const slot = cw / 24, bw = slot * 0.7;
  const best = hours.indexOf(Math.max(...hours));
  let g = '';
  hours.forEach((m, h) => {
    const hh = (m / max) * ch, x = L + h * slot + (slot - bw) / 2;
    g += `<rect x="${x.toFixed(1)}" y="${(T + ch - hh).toFixed(1)}" width="${bw.toFixed(1)}" height="${hh.toFixed(1)}" fill="${h === best && m > 0 ? 'var(--gold)' : 'var(--line)'}"/>`;
    if (h % 6 === 0) g += `<text x="${(x + bw / 2).toFixed(1)}" y="${H - 5}" text-anchor="middle">${h}시</text>`;
  });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="시간대별 공부량">${g}</svg>`;
}
// GitHub-style heatmap of daily study minutes; the darkest level means the daily goal was reached
function grassChart() {
  const m = dayTotals(), goal = S.settings.goal || 180, weeks = 26, cell = 11, gap = 2, top = 14, left = 16;
  const today = startOfDay(Date.now());
  const dow = (new Date(today).getDay() + 6) % 7; // Monday = 0
  const start = addDays(today, -dow - (weeks - 1) * 7);
  const lvl = v => !v ? 0 : v >= goal ? 4 : v >= goal * 0.5 ? 3 : v >= goal * 0.25 ? 2 : 1;
  const cols = ['var(--ink)', '#2d5a5a', '#3a8c84', '#5ec2b7', 'var(--gold)'];
  let g = '', lastMonth = -1;
  for (let w = 0; w < weeks; w++) {
    const wd = new Date(addDays(start, w * 7));
    if (wd.getMonth() !== lastMonth) { lastMonth = wd.getMonth(); g += `<text x="${left + w * (cell + gap)}" y="9">${wd.getMonth() + 1}월</text>`; }
    for (let d = 0; d < 7; d++) {
      const t = addDays(start, w * 7 + d); if (t > today) continue;
      const k = dayKey(t), v = m[k] || 0;
      g += `<rect data-day="${k}" x="${left + w * (cell + gap)}" y="${top + d * (cell + gap)}" width="${cell}" height="${cell}" fill="${cols[lvl(v)]}" stroke="${t === today ? 'var(--cream)' : 'var(--line)'}" stroke-width="${t === today ? 1.2 : 0.6}"/>`;
    }
  }
  ['월', '수', '금'].forEach((n, i) => { g += `<text x="0" y="${top + i * 2 * (cell + gap) + 9}">${n}</text>`; });
  const W = left + weeks * (cell + gap), H = top + 7 * (cell + gap);
  const legend = `<div class="legend" style="justify-content:flex-end">적음 ${cols.map(c => `<i style="display:inline-block;width:10px;height:10px;background:${c};box-shadow:0 0 0 1px var(--line)"></i>`).join('')} 목표 달성</div>`;
  return `<div class="chart-wrap" id="grassWrap"><svg class="chart grass" viewBox="0 0 ${W} ${H}" width="${W * 1.15}" height="${H * 1.15}" role="img" aria-label="최근 26주 공부 잔디">${g}</svg></div>${legend}`;
}
function renderStats() {
  const r = periodRange(), data = collect(r);
  const now = Date.now();
  const counted = statOffset === 0 ? Math.max(1, Math.floor((startOfDay(now) - r.start) / DAY) + 1) : r.days;
  const avg = data.total / counted;
  const best = data.days.reduce((a, d) => d.total > a.total ? d : a, { total: 0 });
  const goalDays = data.days.filter(d => d.total >= S.settings.goal).length;
  const prevR = (() => { const o = statOffset; statOffset = o - 1; const p = periodRange(); statOffset = o; return p; })();
  const prev = collect(prevR).total;
  const diff = data.total - prev;
  const cats = Object.entries(data.byCat).sort((a, b) => b[1] - a[1]);
  const catMax = cats.length ? cats[0][1] : 1;
  const usedCats = cats.map(([id]) => catById(id));
  const isWeek = statPeriod === 'week';
  const nDays = data.days.length;
  $('#view').innerHTML = `
  <div class="stack">
    <div class="seg"><button data-p="week" aria-pressed="${isWeek}">주간</button><button data-p="month" aria-pressed="${!isWeek}">월간</button></div>
    <button class="btn block" id="statAdd">+ 공부시간 직접 추가 <span class="small muted">(EXP 미반영)</span></button>
    <div class="periods">
      <button class="btn sm" id="prevP" aria-label="이전 기간">◀</button>
      <div class="h num">${periodTitle(r)}</div>
      <button class="btn sm" id="nextP" aria-label="다음 기간" ${statOffset >= 0 ? 'disabled' : ''}>▶</button>
    </div>
    <div class="stats3">
      <div class="px stat"><div class="v num">${fmtShort(data.total)}</div><div class="k">총 공부</div></div>
      <div class="px stat"><div class="v num">${fmtShort(avg)}</div><div class="k">하루 평균</div></div>
      <div class="px stat"><div class="v num">${goalDays}일</div><div class="k">목표 달성</div></div>
    </div>
    <div class="px card stack" style="gap:8px">
      <div class="row between"><h3 class="h">${isWeek ? '이번 주' : '이번 달'} 트렌드</h3>
        <span class="small num" style="color:${diff >= 0 ? 'var(--teal)' : 'var(--red)'}">${isWeek ? '지난주' : '지난달'} 대비 ${diff >= 0 ? '+' : '−'}${fmtShort(Math.abs(diff))}</span></div>
      <div class="chart-wrap">${barChart(data.days, {
        avg, goal: S.settings.goal, showGoal: isWeek, aria: `${periodTitle(r)} 날짜별 공부 시간`,
        labels: (i, d) => isWeek ? WD[new Date(d.t).getDay()] : ([0, 4, 9, 14, 19, 24].includes(i) || i === nDays - 1 ? String(i + 1) : ''),
      })}</div>
      ${usedCats.length ? `<div class="legend">${usedCats.map(c => `<span><i class="dot" style="background:${c.color}"></i>${esc(c.name)}</span>`).join('')}
        <span><i style="display:inline-block;width:12px;border-top:1px dashed var(--gold)"></i>평균</span>${isWeek ? `<span><i style="display:inline-block;width:12px;border-top:1px dotted var(--teal)"></i>목표</span>` : ''}</div>` : ''}
      ${best.total ? `<div class="small muted">최고 기록: ${new Date(best.t).getMonth() + 1}/${new Date(best.t).getDate()}(${WD[new Date(best.t).getDay()]}) ${fmtHM(best.total)}</div>` : ''}
    </div>
    <div class="px card stack" style="gap:8px">
      <div class="row between"><h3 class="h">잔디</h3><span class="small muted">최근 26주 · 칸을 누르면 날짜별 시간</span></div>
      ${grassChart()}
    </div>
    <div class="px card stack" style="gap:6px">
      <h3 class="h">과목별 합계</h3>
      ${cats.length ? cats.map(([id, m]) => { const c = catById(id); return `
        <div class="catrow"><span class="dot" style="background:${c.color}"></span><span>${esc(c.name)}</span>
          <span class="num small">${fmtHM(m)} · ${Math.round(m / data.total * 100)}%</span>
          <div class="bar thin"><i style="width:${(m / catMax * 100).toFixed(1)}%;background:${c.color}"></i></div></div>`; }).join('')
        : `<div class="empty">이 기간엔 기록이 없어요.</div>`}
    </div>
    <div class="px card stack" style="gap:6px">
      <div class="row between"><h3 class="h">집중 시간대</h3><span class="small muted">${data.total ? `가장 많이 한 시간: ${data.hours.indexOf(Math.max(...data.hours))}시` : ''}</span></div>
      ${hourChart(data.hours)}
    </div>
    <div class="px card stack" style="gap:6px">
      <h3 class="h">전체 누적</h3>
      <div class="small muted num">총 ${fmtHM(allMin())} (EXP 반영 ${fmtHM(totalMin())}) · 공부한 날 ${Object.keys(dayTotals()).length}일 · 기록 ${S.sessions.length}개</div>
    </div>
  </div>`;
  $$('[data-p]').forEach(b => b.onclick = () => { statPeriod = b.dataset.p; statOffset = 0; renderStats(); });
  $('#prevP').onclick = () => { statOffset--; renderStats(); };
  $('#statAdd').onclick = openManualRecord;
  const gw = $('#grassWrap'); if (gw) { gw.scrollLeft = gw.scrollWidth;
    gw.onclick = e => { const r = e.target.closest('[data-day]'); if (!r) return; const k = r.dataset.day, t = parseDay(k), v = dayTotals()[k] || 0;
      toast(`${new Date(t).getMonth() + 1}/${new Date(t).getDate()}(${WD[new Date(t).getDay()]}) ${v ? fmtHM(v) : '공부 기록 없음'}`); }; }
  $('#nextP').onclick = () => { if (statOffset < 0) { statOffset++; renderStats(); } };
}

/* ================= categories ================= */
function renderCats() {
  const totals = {}, wk = {};
  const weekAgo = addDays(startOfDay(Date.now()), -6);
  for (const s of S.sessions) { totals[s.cat] = (totals[s.cat] || 0) + s.sec / 60; if (s.s >= weekAgo) wk[s.cat] = (wk[s.cat] || 0) + s.sec / 60; }
  $('#view').innerHTML = `
  <div class="stack">
    <div class="row between"><h2 class="h">과목</h2><button class="btn gold sm" id="addCat">+ 과목 추가</button></div>
    ${S.categories.length ? S.categories.map(c => `
      <button class="px item" data-id="${c.id}" style="text-align:left;width:calc(100% - 6px)">
        <span class="dot" style="background:${c.color};width:14px;height:14px"></span>
        <span class="grow"><span style="display:block">${esc(c.name)}</span><span class="small muted num">최근 7일 ${fmtHM(wk[c.id] || 0)} · 누적 ${fmtHM(totals[c.id] || 0)}</span></span>
        <span class="small muted">편집</span>
      </button>`).join('') : `<div class="px empty">과목이 없어요. 위에서 하나 추가해 주세요.</div>`}
    <p class="small muted" style="margin:0">START를 누르면 여기 있는 과목 중에서 고를 수 있어요.</p>
  </div>`;
  const done = () => { closeSheet(); render(); };
  $('#addCat').onclick = () => openCatEdit(null, done);
  $$('[data-id]').forEach(b => b.onclick = () => openCatEdit(b.dataset.id, done));
}
function openCatEdit(id, done) {
  const c = id ? S.categories.find(x => x.id === id) : null;
  let color = c ? c.color : COLORS[S.categories.length % COLORS.length];
  openSheet(`
    <h2 class="sheet-title">${c ? '과목 편집' : '새 과목'} <button class="btn sm ghost" data-close>닫기</button></h2>
    <form class="stack" id="catForm">
      <label class="field"><span class="label">이름</span><input class="input" id="catName" maxlength="16" placeholder="예: 토익 RC" value="${c ? esc(c.name) : ''}" required></label>
      <div class="field"><span class="label">색깔</span><div class="palette">${COLORS.map(x => `<button type="button" class="swatch" data-c="${x}" style="background:${x}" aria-label="색 ${x}" aria-pressed="${x === color}"></button>`).join('')}</div></div>
      <div class="row" style="justify-content:space-between">${c ? '<button type="button" class="btn red sm" id="delCat">삭제</button>' : '<span></span>'}<button class="btn gold" type="submit">저장</button></div>
    </form>`, p => {
    $$('.swatch', p).forEach(s => s.onclick = () => { color = s.dataset.c; $$('.swatch', p).forEach(x => x.setAttribute('aria-pressed', x === s)); });
    $('#catForm', p).onsubmit = e => {
      e.preventDefault();
      const name = $('#catName', p).value.trim(); if (!name) return;
      let nid = id;
      if (c) Object.assign(c, { name, color }); else { nid = 'c' + uid(); S.categories.push({ id: nid, name, color }); }
      save(); toast(c ? '저장했어요' : `${name} 추가!`);
      if (done) done(nid); else closeSheet();
    };
    if (c) $('#delCat', p).onclick = () => confirmSheet('과목 삭제', `"${esc(c.name)}" 과목을 지울까요? 공부 기록과 EXP는 남고, 통계엔 '삭제된 과목'으로 보여요.`, '삭제', true, () => {
      S.categories = S.categories.filter(x => x.id !== c.id); save(); render(); toast('과목을 지웠어요');
    });
    if (!c) setTimeout(() => { try { $('#catName', p).focus(); } catch (e) {} }, 50);
  });
}

/* ================= D-day ================= */
function renderDday() {
  const today = startOfDay(Date.now());
  const list = S.ddays.map(d => ({ ...d, diff: Math.round((parseDay(d.date) - today) / DAY) }))
    .sort((a, b) => (a.diff < 0) - (b.diff < 0) || (a.diff >= 0 ? a.diff - b.diff : b.diff - a.diff));
  $('#view').innerHTML = `
  <div class="stack">
    <div class="row between"><h2 class="h">D-day</h2><button class="btn gold sm" id="addD">+ 일정 추가</button></div>
    ${list.length ? list.map(d => {
      const dt = new Date(parseDay(d.date));
      return `<button class="px item" data-id="${d.id}" style="text-align:left;width:calc(100% - 6px)">
        <span class="grow"><span style="display:block">${esc(d.name)} ${d.pinned ? '<span class="pin">고정</span>' : ''}</span>
        <span class="small muted num">${dt.getFullYear()}.${pad(dt.getMonth() + 1)}.${pad(dt.getDate())} (${WD[dt.getDay()]})${d.diff >= 7 ? ` · ${Math.floor(d.diff / 7)}주${d.diff % 7 ? ` ${d.diff % 7}일` : ''} 남음` : ''}</span></span>
        <span class="dday-num num ${d.diff < 0 ? 'past' : d.diff === 0 ? 'today' : ''}">${ddayLabel(d.diff)}</span></button>`;
    }).join('') : `<div class="px empty">시험, 자격증, 마감일을 등록해 두면<br>홈 상단에 남은 날짜가 계속 떠 있어요.</div>`}
    <p class="small muted" style="margin:0">고정한 일정이 상단에 표시되고, 고정이 없으면 가장 가까운 일정이 나와요.</p>
  </div>`;
  $('#addD').onclick = () => openDdayEdit(null);
  $$('[data-id]').forEach(b => b.onclick = () => openDdayEdit(b.dataset.id));
}
function openDdayEdit(id) {
  const d = id ? S.ddays.find(x => x.id === id) : null;
  const def = dayKey(addDays(Date.now(), 30));
  openSheet(`
    <h2 class="sheet-title">${d ? 'D-day 편집' : '새 D-day'} <button class="btn sm ghost" data-close>닫기</button></h2>
    <form class="stack" id="dForm">
      <label class="field"><span class="label">이름</span><input class="input" id="dName" maxlength="24" placeholder="예: SQLD 시험" value="${d ? esc(d.name) : ''}" required></label>
      <label class="field"><span class="label">날짜</span><input class="input" id="dDate" type="date" value="${d ? d.date : def}" required></label>
      <div class="set-row"><span>상단에 고정</span><button type="button" class="switch" role="switch" id="dPin" aria-checked="${d ? !!d.pinned : false}" aria-label="상단에 고정"></button></div>
      <div class="row" style="justify-content:space-between">${d ? '<button type="button" class="btn red sm" id="delD">삭제</button>' : '<span></span>'}<button class="btn gold" type="submit">저장</button></div>
    </form>`, p => {
    const pin = $('#dPin', p);
    pin.onclick = () => pin.setAttribute('aria-checked', pin.getAttribute('aria-checked') !== 'true');
    $('#dForm', p).onsubmit = e => {
      e.preventDefault();
      const name = $('#dName', p).value.trim(), date = $('#dDate', p).value;
      if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(date)) { toast('이름과 날짜를 확인해 주세요'); return; }
      const pinned = pin.getAttribute('aria-checked') === 'true';
      if (pinned) S.ddays.forEach(x => { x.pinned = false; });
      if (d) Object.assign(d, { name, date, pinned }); else S.ddays.push({ id: uid(), name, date, pinned });
      save(); closeSheet(); render(); toast('D-day 저장!');
    };
    if (d) $('#delD', p).onclick = () => confirmSheet('D-day 삭제', `"${esc(d.name)}" 일정을 지울까요?`, '삭제', true, () => { S.ddays = S.ddays.filter(x => x.id !== d.id); save(); render(); });
  });
}

/* ================= settings ================= */
function renderSettings() {
  const st = S.settings;
  const sw = (k, label, sub) => `<div class="set-row"><span class="grow">${label}${sub ? `<span class="small muted" style="display:block">${sub}</span>` : ''}</span><button class="switch" role="switch" data-sw="${k}" aria-checked="${!!st[k]}" aria-label="${label}"></button></div>`;
  $('#view').innerHTML = `
  <div class="stack">
    <h2 class="h">설정</h2>
    <div class="px card">
      <div class="stepper"><span>하루 목표</span><div class="ctl">
        <button class="btn sm" data-goal="-30" aria-label="목표 줄이기">−</button><span class="val num">${fmtShort(st.goal)}</span>
        <button class="btn sm" data-goal="30" aria-label="목표 늘리기">+</button></div></div>
    </div>
    <div class="px card" style="padding-block:0">
      ${sw('sound', '효과음', '타이머 끝, 레벨업, 진화 때 8비트 사운드')}
      ${sw('music', '배경음악', '앱 켜면 8비트 테마, 공부 중엔 고른 사운드')}
      <div class="stepper"><span>음악 볼륨</span><div class="ctl">
        <button class="btn sm" data-vol="-10" aria-label="볼륨 줄이기">−</button><span class="val num">${st.vol}%</span>
        <button class="btn sm" data-vol="10" aria-label="볼륨 늘리기">+</button></div></div>
      <div class="set-row"><span class="grow">기본 공부 사운드<span class="small muted" style="display:block">${esc(trackName(st.track))}</span></span><button class="btn sm" id="sTrack">바꾸기</button></div>
      ${NATIVE_MUSIC ? sw('bgPlay', '앱 밖·잠금화면에서도 음악', '켜면 다른 앱을 쓰거나 화면을 잠가도 공부 사운드가 계속 나와요. 무음 모드여도 소리가 나요') : ''}
      ${(navigator.audioSession || IS_IOS_APP) && !useNativeMusic() ? sw('silentPlay', '무음 모드에서도 소리 내기', '켜면 무음·화면 꺼짐에도 소리가 나는 대신, 다이내믹 아일랜드에 스피커 표시가 떠요') : ''}
      ${canRemind() ? sw('remind', '매일 공부 알림', '그날 공부 기록이 없으면 정한 시간에 알려줘요') : ''}
      ${canRemind() && st.remind ? `<div class="set-row"><span class="grow">알림 시간</span><input class="input" type="time" id="remAt" value="${esc(st.remindAt || '21:00')}" style="width:auto"></div>` : ''}
      ${sw('vibrate', '진동')}
      ${sw('awake', '타이머 중 화면 켜두기')}
      ${sw('autoNext', '다음 단계 자동 시작', '끄면 공부/휴식이 끝날 때마다 멈추고 기다려요')}
      ${NB ? sw('notify', '종료 알림', '앱을 나가 있어도 공부/휴식이 끝나면 알림') : ''}
      ${IS_IOS_APP ? sw('clockLink', '잠금화면 타이머 (시계 앱 연동)', '단축어 \'' + CLOCK_SHORTCUT + '\' 가 있어야 해요') + '<div class="set-row"><span class="grow small muted">처음이면 단축어부터 만들어 주세요</span><button class="btn sm" id="sClock">만드는 법</button></div>' : ''}
      ${NB && NB.lockScreen ? sw('lockShow', '잠금화면 위에 타이머 띄우기', '공부 중에 화면을 켜면 잠금 해제 없이 타이머가 보여요') : ''}
      ${sw('splash', '시작 애니메이션')}
    </div>
    <div class="px card stack" style="gap:10px">
      <button class="btn block" id="sDeco">꾸미기 (배경 · 치장 아이템 · 코드)</button>
      <button class="btn block" id="sFont">글씨체 바꾸기 (${esc((FONTS.find(f => f.id === (st.font || 'system')) || FONTS[0]).name)})</button>
      <button class="btn block" id="sStyle">캐릭터 바꾸기 (${esc((CHAR_STYLES.find(c => c.id === st.charStyle) || CHAR_STYLES[0]).name)})</button>
      <button class="btn block" id="sDex">진화 도감 보기</button>
      <button class="btn block" id="sRec">공부시간 직접 추가 (EXP 미반영)</button>
      <button class="btn block" id="sSplash">시작 애니메이션 다시 보기</button>
    </div>
    <div class="px card stack" style="gap:10px">
      <h3 class="h">데이터</h3>
      <p class="small muted" style="margin:0">기록은 이 폰 안에만 저장돼요. 폰 바꾸기 전이나 앱 지우기 전엔 백업 코드를 복사해서 메모장 같은 데 보관해 두세요.</p>
      <button class="btn block" id="sExport">백업 코드 복사</button>
      <button class="btn block" id="sImport">백업 코드로 복원</button>
      <button class="btn red block" id="sReset">모든 기록 초기화</button>
    </div>
    <p class="small muted" style="text-align:center;margin:0">Level up your life · v2.1.0<br><span style="font-size:10px">글꼴: 갈무리 · 프리텐다드 · 나눔고딕 · 나눔명조 · 고운돋움 · 주아 (SIL OFL)</span></p>
  </div>`;
  $$('[data-sw]').forEach(b => b.onclick = () => { const k = b.dataset.sw; st[k] = !st[k]; b.setAttribute('aria-checked', st[k]); save(); if (k === 'sound' && st[k]) sfx('tap'); if (k === 'music') { ac(); updateMusic(); } if (k === 'silentPlay') { applyAudioSession(); updateMusic(); } if (k === 'bgPlay') { updateMusic(); renderSettings(); } if (k === 'lockShow') ongoing(); if (k === 'clockLink' && st[k]) openClockGuide(); if (k === 'remind') { planReminders(); renderSettings(); if (st[k]) toast(`매일 ${st.remindAt} 알림을 켰어요`); } });
  if ($('#remAt')) $('#remAt').onchange = e => { if (/^\d{2}:\d{2}$/.test(e.target.value)) { st.remindAt = e.target.value; save(); planReminders(); toast(`${st.remindAt}에 알려줄게요`); } };
  $$('[data-vol]').forEach(b => b.onclick = () => { st.vol = clamp(st.vol + Number(b.dataset.vol), 0, 100); save(); ac(); updateMusic(); renderSettings(); });
  $('#sTrack').onclick = () => openTrackPicker(st.track, id => { st.track = id; save(); renderSettings(); });
  $$('[data-goal]').forEach(b => b.onclick = () => { st.goal = clamp(st.goal + Number(b.dataset.goal), 30, 960); save(); renderSettings(); });
  $('#sDex').onclick = openDex;
  $('#sStyle').onclick = openStylePicker;
  $('#sFont').onclick = openFontPicker;
  $('#sDeco').onclick = openDecor;
  if ($('#sClock')) $('#sClock').onclick = openClockGuide;
  $('#sRec').onclick = openManualRecord;
  $('#sSplash').onclick = () => runSplash(true);
  $('#sExport').onclick = openExport;
  $('#sImport').onclick = openImport;
  $('#sReset').onclick = () => confirmSheet('전부 초기화', '공부 기록, EXP, 진화 단계, 모은 배경과 아이템이 모두 사라져요. 과목, D-day, 코드로 받은 아이템은 남겨둘게요. 되돌릴 수 없어요.', '초기화', true, () => {
    S.sessions = []; S.seenStage = 0; S.seenLevel = 1;
    S.bgs = []; S.bg = null; S.bgRolls = 0; S.itemRolls = 0;
    S.items = S.items.filter(id => SPECIAL_ITEMS.some(i => i.id === id)); S.itemOn = S.itemOn.filter(id => S.items.includes(id));
    applyDecor(); save(); render(); toast('처음부터 다시. 백수 거지 모드');
  });
}
// example data was removed in v1.3; clearDemo() only cleans up records left by earlier versions
function clearDemo() {
  S.sessions = S.sessions.filter(s => !s.demo);
  S.ddays = S.ddays.filter(d => !d.demo);
  S.categories = S.categories.filter(c => !c.demo || S.sessions.some(s => s.cat === c.id));
  syncSeen();
}
function openManualRecord() {
  if (!S.categories.length) { toast('과목을 먼저 만들어 주세요'); return; }
  const now = new Date();
  openSheet(`
    <h2 class="sheet-title">공부시간 직접 추가 <button class="btn sm ghost" data-close>닫기</button></h2>
    <form class="stack" id="mForm">
      <p class="small muted" style="margin:0">타이머 없이 공부한 시간을 넣어요. 통계와 연속 공부일에는 들어가고, EXP·레벨·진화 시간에는 들어가지 않아요.</p>
      <label class="field"><span class="label">과목</span><select class="input" id="mCat">${S.categories.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label>
      <div class="row">
        <label class="field grow"><span class="label">날짜</span><input class="input" type="date" id="mDate" value="${dayKey(now)}" max="${dayKey(now)}"></label>
        <label class="field grow"><span class="label">시작 시각</span><input class="input" type="time" id="mTime" value="${pad(Math.max(0, now.getHours() - 1))}:00"></label>
      </div>
      <label class="field"><span class="label">공부한 시간 (분)</span><input class="input" type="number" id="mMin" min="1" max="720" value="60" inputmode="numeric"></label>
      <label class="field"><span class="label">한 줄 메모 (선택)</span><input class="input" id="mMemo" maxlength="80" placeholder="예: 학원 수업 2교시"></label>
      <button class="btn gold block" type="submit">추가</button>
    </form>`, p => {
    $('#mForm', p).onsubmit = e => {
      e.preventDefault();
      const date = $('#mDate', p).value, time = $('#mTime', p).value || '00:00', m = Number($('#mMin', p).value);
      if (!date || !(m >= 1 && m <= 720)) { toast('날짜와 시간을 확인해 주세요'); return; }
      const [hh, mm] = time.split(':').map(Number);
      const s = parseDay(date) + (hh * 60 + mm) * 60000;
      if (s > Date.now()) { toast('미래 기록은 넣을 수 없어요'); return; }
      const memo = $('#mMemo', p).value.trim();
      S.sessions.push({ id: uid(), cat: $('#mCat', p).value, s, e: s + m * 60000, sec: Math.round(m * 60), manual: true, ...(memo ? { memo } : {}) });
      save(); closeSheet(); render(); checkProgress(); toast(`${fmtHM(m)} 추가! 통계·연속일에 반영됐어요`);
    };
  });
}
function openExport() {
  const code = JSON.stringify({ app: 'levelupyourlife', ...S, timer: null });
  openSheet(`
    <h2 class="sheet-title">백업 코드 <button class="btn sm ghost" data-close>닫기</button></h2>
    <div class="stack">
      <textarea class="input" id="exArea" readonly>${esc(code)}</textarea>
      <button class="btn gold block" id="exCopy">전체 복사</button>
      <p class="small muted" style="margin:0">카톡 나에게 보내기나 메모장에 붙여넣어 두면 돼요.</p>
    </div>`, p => {
    $('#exCopy', p).onclick = () => {
      const ta = $('#exArea', p);
      const fallback = () => { ta.focus(); ta.select(); try { document.execCommand('copy'); toast('복사했어요'); } catch (e) { toast('길게 눌러서 직접 복사해 주세요'); } };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(() => toast('복사했어요'), fallback);
      else fallback();
    };
  });
}
function openImport() {
  openSheet(`
    <h2 class="sheet-title">백업 복원 <button class="btn sm ghost" data-close>닫기</button></h2>
    <div class="stack">
      <textarea class="input" id="imArea" placeholder="백업 코드를 여기 붙여넣기"></textarea>
      <button class="btn gold block" id="imGo">복원하기</button>
      <p class="small muted" style="margin:0">지금 폰에 있는 기록은 백업 내용으로 바뀌어요.</p>
    </div>`, p => {
    $('#imGo', p).onclick = () => {
      let d;
      try { d = JSON.parse($('#imArea', p).value); } catch (e) { toast('코드가 깨져 있어요. 전체를 다시 복사해 주세요'); return; }
      if (!d || !Array.isArray(d.sessions) || !Array.isArray(d.categories)) { toast('이 앱의 백업 코드가 아니에요'); return; }
      confirmSheet('복원할까요?', `기록 ${d.sessions.length}개, 과목 ${d.categories.length}개를 불러와요.`, '복원', false, () => {
        const keepTimer = S.timer;
        S = Object.assign(defaults(), d, { timer: keepTimer });
        S.settings = Object.assign(defaults().settings, d.settings || {});
        delete S.app;
        applyCharStyle(); applyDecor(); syncSeen(); save(); render(); toast('복원 완료!');
      });
    };
  });
}

/* ================= splash ================= */
let splashScene = null;
function runSplash(replay) {
  const sp = $('#splash');
  if (!replay && !S.settings.splash) { sp.hidden = true; return; }
  sp.hidden = false;
  const title = $('#sTitle'), tap = $('#sTap'), lbl = $('#sStage'), dots = $('#sDots');
  title.classList.remove('on');
  setTimeout(() => title.classList.add('on'), 80);
  tap.classList.add('on');
  const [q, who] = QUOTES[pickQuote()];
  $('#sQuote').innerHTML = `${esc(q)}<small>— ${esc(who)}</small>`;
  dots.innerHTML = STAGES.map(() => '<i></i>').join('');
  const paintDots = (upTo, now) => $$('i', dots).forEach((d, k) => { d.className = k < upTo ? 'on' : k === now ? 'now' : ''; });
  const st = { s: 0, pose: 'study' };
  sp._st = st;
  if (!splashScene) splashScene = bindScene($('#sScene'), () => [sp._st.s, sp._st.pose, null, undefined, !sp._st.done]);
  let i = 0, done = false, timers = [];
  lbl.textContent = `${STAGES[0].name} · 여기서 시작`;
  paintDots(0, 0);
  const finish = () => {
    if (done) return; done = true; timers.forEach(clearTimeout);
    const cur = curStage();
    if (st.s !== cur) flash();
    st.s = cur; st.pose = 'study'; st.done = true;
    drawScene(splashScene.ctx, st.s, st.pose, frame);
    lbl.textContent = `지금 나: Lv.${levelInfo(totalMin()).L} ${STAGES[cur].name}`;
    paintDots(cur, cur);
    timers.push(setTimeout(close, 3200));
  };
  const close = () => {
    timers.forEach(clearTimeout);
    sp.onclick = null; sp.hidden = true;
    if (S.timer && !replay) openTimer();
  };
  const step = () => {
    i++;
    if (i < STAGES.length) {
      st.s = i; flash(); drawScene(splashScene.ctx, st.s, st.pose, frame, null, undefined, true);
      lbl.textContent = `${STAGES[i].name} · ${STAGES[i].hours}시간${STAGES[i].streak ? ` + 연속 ${STAGES[i].streak}일` : ''}`;
      paintDots(i, i);
      timers.push(setTimeout(step, 560));
    } else finish();
  };
  timers.push(setTimeout(step, 900));
  sp.onclick = () => { ac(); updateMusic(); sfx('tap'); if (!done) finish(); else close(); };
}

/* ================= boot ================= */
load();
if (S.sessions.some(x => x.demo) || S.ddays.some(d => d.demo) || S.categories.some(c => c.demo)) {
  clearDemo(); const m = totalMin(); S.seenStage = stageOf(m); S.seenLevel = levelInfo(m).L; save();
}
delete S.demoSeeded;
delete S.block; // app lock (v2.0.0) was removed
applyCharStyle();
applyFont();
applyAudioSession();
applyDecor();
checkRewards(); // hours/streaks already earned before this version count right away
planReminders();
syncSeen();
render();
requestAnimationFrame(loop);
runSplash(false);
updateMusic();
NativeMusic.warm('title', S.settings.track);
if (S.timer) {
  tick();
  if (S.timer && !S.settings.splash) openTimer();
  onPhaseChange();
}
