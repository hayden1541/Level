/* ===== Collectible backgrounds + decoration items =====
   Backgrounds replace the stage background (desk/props stay per stage).
   Items are drawn in two layers: 'back' (behind the character) and 'front'. */
let SCENE_BG = null;      // equipped background id, or null for the stage default
let SCENE_ITEMS = [];     // equipped item ids

// deterministic pseudo-random for star fields etc.
function prand(seed) { let x = seed * 9301 + 49297; return () => { x = (x * 9301 + 49297) % 233280; return x / 233280; }; }
function bands(R, cols, y0, h) { cols.forEach((c, i) => R(0, y0 + i * h, SW, h, c)); }
function stars(R, seed, n, y1, f, cols = ['#fff6c8', '#cfd8ff']) {
  const r = prand(seed);
  for (let i = 0; i < n; i++) { const x = Math.floor(r() * SW), y = Math.floor(r() * y1), on = (i + Math.floor(f / 3)) % 5 !== 0; if (on) R(x, y, 1, 1, cols[i % cols.length]); }
}
function ptext(ctx, txt, x, y, size, color, align = 'center', bold = true) {
  if (!ctx) return;
  ctx.save();
  ctx.font = `${size}px ${bold ? '"Galmuri11 Bold", ' : ''}"Galmuri11", sans-serif`;
  ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.fillText(txt, x, y);
  ctx.restore();
}

const BGS = [
  // tier 0 — 백수 거지
  { id: 'subway',   tier: 0, name: '지하철역' },
  { id: 'hangang',  tier: 0, name: '한강 야경' },
  { id: 'cvs',      tier: 0, name: '편의점 앞' },
  // tier 1 — 알바생
  { id: 'forest',   tier: 1, name: '숲속' },
  { id: 'rain',     tier: 1, name: '비 오는 거리' },
  { id: 'cherry',   tier: 1, name: '벚꽃길' },
  // tier 2 — 대학생
  { id: 'library',  tier: 2, name: '도서관' },
  { id: 'beach',    tier: 2, name: '노을 바다' },
  { id: 'snow',     tier: 2, name: '눈 오는 밤' },
  // tier 3 — 직장인
  { id: 'cafe',     tier: 3, name: '창가 카페' },
  { id: 'mountain', tier: 3, name: '산 정상 일출' },
  { id: 'train',    tier: 3, name: '기차 창가' },
  // tier 4 — 사장님
  { id: 'space',    tier: 4, name: '우주 정거장' },
  { id: 'aurora',   tier: 4, name: '오로라' },
  { id: 'island',   tier: 4, name: '열대 섬' },
];

const BG_DRAW = {
  subway(R, f, ctx) {
    R(0, 0, SW, 58, '#dfe6e1');
    for (let y = 0; y < 58; y += 6) R(0, y, SW, 1, '#c9d3cd');
    for (let x = 0; x < SW; x += 8) R(x, 0, 1, 58, '#c9d3cd');
    R(0, 24, SW, 4, '#3eb049'); R(0, 28, SW, 1, '#2f8a39');
    R(4, 6, 34, 12, '#22305c'); R(5, 7, 32, 10, '#2c3d74');
    ptext(ctx, '레벨업역', 21, 12, 6, '#ffffff');
    R(40, 8, 6, 6, '#3eb049'); ptext(ctx, '2', 43, 11, 5, '#ffffff');
    R(70, 0, 8, 58, '#b8c2bc'); R(71, 0, 2, 58, '#cfd8d2');
    R(80, 6, 11, 11, OUT); R(81, 7, 9, 9, '#ffffff'); R(85, 8, 1, 4, OUT); R(85, 11, 3, 1, OUT);
    R(0, 58, SW, 14, '#8b9097'); R(0, 58, SW, 2, '#f2c14e');
    for (let x = 1; x < SW; x += 4) R(x, 61, 2, 1, '#a3a8af');
  },
  hangang(R, f) {
    bands(R, ['#0e1030', '#141640', '#1c1d52', '#262563'], 0, 9);
    stars(R, 3, 26, 30, f);
    R(78, 4, 6, 6, '#f6eec6'); R(80, 4, 4, 4, '#262563');
    const sk = [[0, 26, 8], [8, 22, 6], [14, 28, 9], [23, 18, 7], [30, 25, 10], [40, 20, 6], [46, 27, 8], [54, 16, 9], [63, 24, 8], [71, 21, 7], [78, 27, 9], [87, 23, 9]];
    for (const [x, y, w] of sk) { R(x, y, w, 36 - y, '#0b0c22'); for (let yy = y + 2; yy < 35; yy += 3) for (let xx = x + 1; xx < x + w - 1; xx += 2) if ((xx * 5 + yy * 3) % 7 < 2) R(xx, yy, 1, 1, '#f4d06b'); }
    R(0, 34, SW, 2, '#3a2f5a');
    for (let x = 4; x < SW; x += 10) { R(x, 30, 1, 4, '#8a7fb8'); R(x, 30, 1, 1, f % 6 < 3 ? '#ff7ab8' : '#7ae0ff'); }
    for (let x = 0; x < SW; x += 5) R(x, 31 + Math.round(Math.sin(x / 15) * 1), 3, 1, '#c9b8ff');
    R(0, 36, SW, 22, '#14183c');
    for (let i = 0; i < 18; i++) { const x = (i * 23 + f) % SW, y = 38 + (i * 7) % 18; R(x, y, 3 + (i % 3), 1, i % 2 ? '#f4d06b' : '#3c4890'); }
    R(0, 58, SW, 14, '#1d3b26'); for (let x = 0; x < SW; x += 3) R(x, 57, 1, 2, '#2f5a3a');
  },
  cvs(R, f, ctx) {
    R(0, 0, SW, 58, '#1d1b33');
    R(4, 6, 88, 10, '#2f6fd1'); R(4, 14, 88, 2, '#1f4fa0');
    ptext(ctx, '24시', 18, 11, 6, '#ffe28a'); ptext(ctx, '편의점', 78, 11, 6, '#ffffff');
    R(4, 16, 88, 42, '#3a3f52');
    R(7, 19, 38, 36, '#e9f4ff'); R(51, 19, 38, 36, '#e9f4ff');
    for (const x0 of [7, 51]) for (let y = 25; y < 55; y += 9) { R(x0, y, 38, 2, '#9aa6bd'); for (let x = x0 + 2; x < x0 + 36; x += 4) R(x, y - 5, 3, 5, ['#ff6b6b', '#ffd166', '#06d6a0', '#7aa7ff', '#f78fb3'][(x + y) % 5]); }
    R(45, 19, 6, 39, '#2b2f3e');
    R(0, 58, SW, 14, '#55596a'); for (let x = 0; x < SW; x += 12) R(x, 58, 1, 14, '#4a4e5e'); R(0, 64, SW, 1, '#4a4e5e');
  },
  forest(R, f) {
    bands(R, ['#cfeee6', '#bfe6dc', '#addcd0', '#9cd1c3'], 0, 8);
    R(0, 32, SW, 26, '#8cc4b2');
    const tree = (x, y, w, c, t) => { for (let i = 0; i < w / 2; i++) R(x - i, y + i * 2, i * 2 + 1, 2, c); R(x, y + w, 2, 58 - y - w, t); };
    [[8, 14, 18], [24, 8, 22], [44, 12, 20], [64, 6, 24], [84, 12, 20]].forEach(([x, y, w]) => tree(x, y, w, '#4f8f6a', '#5a3d2a'));
    [[0, 22, 22], [16, 26, 20], [36, 24, 22], [56, 28, 18], [76, 22, 24], [94, 26, 20]].forEach(([x, y, w]) => tree(x, y, w, '#2f6f4a', '#4a2f1f'));
    for (let i = 0; i < 4; i++) R(30 + i * 14, 0, 2, 40, 'rgba(255,255,220,.18)');
    R(0, 58, SW, 14, '#5aa05e'); for (let x = 1; x < SW; x += 7) { R(x, 57, 1, 2, '#7cc27a'); if (x % 3 === 0) R(x + 2, 62, 2, 2, x % 2 ? '#ffd1e8' : '#fff4a3'); }
    for (let i = 0; i < 5; i++) if ((f + i * 3) % 8 < 5) R((i * 19 + 7) % SW, 36 + (i * 5) % 16, 1, 1, '#fff7a8');
  },
  rain(R, f) {
    bands(R, ['#2a3248', '#2f3850', '#353f58', '#3b4660'], 0, 10);
    [[0, 14, 16], [18, 8, 14], [34, 18, 12], [48, 6, 16], [66, 12, 14], [82, 16, 14]].forEach(([x, y, w]) => {
      R(x, y, w, 58 - y, '#1f2536');
      for (let yy = y + 3; yy < 54; yy += 5) for (let xx = x + 2; xx < x + w - 2; xx += 4) R(xx, yy, 2, 3, (xx + yy) % 3 ? '#f2c66b' : '#2e3550');
    });
    for (let i = 0; i < 40; i++) { const x = (i * 37 + f * 2) % SW, y = (i * 23 + f * 5) % 58; R(x, y, 1, 3, 'rgba(190,210,255,.55)'); }
    R(0, 58, SW, 14, '#2c3346');
    for (let i = 0; i < 6; i++) R((i * 17 + 3) % SW, 62 + (i % 3) * 3, 10, 1, (f + i) % 4 < 2 ? '#f2c66b' : '#4a5578');
  },
  cherry(R, f) {
    bands(R, ['#ffe6ef', '#ffdce9', '#fdd2e2', '#f8c8dc'], 0, 10);
    R(0, 40, SW, 18, '#e9b8cf');
    const tree = (x, s) => { R(x, 22, 3, 36, '#7a4b3a'); R(x - 3, 30, 3, 2, '#7a4b3a'); R(x + 3, 28, 3, 2, '#7a4b3a');
      [[-10, 6, 14], [-2, 0, 14], [4, 8, 14], [-8, 16, 10], [6, 18, 10]].forEach(([dx, dy, w]) => { R(x + dx, dy + s, w, 10, '#f7a8c4'); R(x + dx + 2, dy + s + 2, w - 4, 6, '#ffc9dc'); }); };
    tree(10, 2); tree(86, 0); tree(30, 10); tree(68, 8);
    for (let i = 0; i < 14; i++) { const x = (i * 29 + f) % SW, y = (i * 13 + f * 2) % 58; R(x, y, 2, 1, '#ff9fc0'); }
    R(0, 58, SW, 14, '#e8d6b8'); R(0, 58, SW, 1, '#f7b3cc'); for (let x = 5; x < SW; x += 9) R(x, 64, 2, 1, '#f7b3cc');
  },
  library(R, f) {
    R(0, 0, SW, 58, '#5b3b2a');
    const cols = ['#c0504d', '#4f81bd', '#9bbb59', '#f2c14e', '#8064a2', '#e8e3d3', '#3a8c84'];
    for (const x0 of [0, 66]) { R(x0, 0, 30, 58, '#4a2f1f');
      for (let r = 0; r < 5; r++) { R(x0, 10 + r * 11, 30, 2, '#6b4426'); for (let i = 0; i < 13; i++) R(x0 + 1 + i * 2 + (i > 6 ? 1 : 0), 2 + r * 11, 2, 8 - (i % 3), cols[(i + r * 3) % 7]); } }
    R(36, 4, 24, 34, '#d8c9a8'); R(38, 6, 20, 30, '#2a3a6a'); R(47, 6, 2, 30, '#d8c9a8'); R(38, 20, 20, 2, '#d8c9a8');
    R(36, 0, 24, 6, '#d8c9a8'); R(40, 2, 16, 4, '#2a3a6a');
    R(30, 0, 36, 58, 'rgba(255,220,150,.08)');
    R(44, 8, 1, 1, '#fff6c8'); R(53, 14, 1, 1, '#fff6c8');
    R(0, 58, SW, 14, '#6e4a2e'); for (let x = 0; x < SW; x += 10) R(x, 58, 1, 14, '#5a3c24');
  },
  beach(R, f) {
    bands(R, ['#3d2a6b', '#6b3a7a', '#a8467a', '#e0607a', '#f58a63', '#f9b35e'], 0, 6);
    R(0, 36, SW, 2, '#fcd27a');
    R(36, 28, 24, 8, '#ffe28a'); R(40, 25, 16, 3, '#ffe28a'); R(44, 23, 8, 2, '#fff1b8');
    R(0, 38, SW, 20, '#3a4c8a');
    for (let i = 0; i < 16; i++) { const y = 39 + (i * 5) % 18, x = 30 + ((i * 11 + f) % 36); R(x, y, 4 + (i % 3) * 2, 1, i % 2 ? '#ffcf8a' : '#f58a63'); }
    for (let x = 0; x < SW; x += 6) R(x, 56 + ((x + f) % 12 < 6 ? 0 : 1), 4, 1, '#cfe3ff');
    R(0, 58, SW, 14, '#e8c78e'); for (let x = 3; x < SW; x += 11) R(x, 63, 2, 1, '#d4ad6e');
    R(12, 12, 3, 1, '#2a1f3d'); R(15, 11, 2, 1, '#2a1f3d'); R(70, 8, 3, 1, '#2a1f3d'); R(73, 7, 2, 1, '#2a1f3d');
  },
  snow(R, f) {
    bands(R, ['#0f1838', '#16214a', '#1e2b5c'], 0, 12);
    R(0, 36, SW, 22, '#1e2b5c');
    stars(R, 9, 14, 30, f);
    [[2, 26, 20], [26, 20, 18], [48, 28, 16], [68, 22, 26]].forEach(([x, y, w]) => {
      R(x, y, w, 58 - y, '#3b3f5e'); R(x - 2, y - 3, w + 4, 4, '#f4f7ff');
      for (let yy = y + 5; yy < 54; yy += 7) for (let xx = x + 3; xx < x + w - 3; xx += 6) R(xx, yy, 3, 3, '#ffd77a');
    });
    for (let i = 0; i < 34; i++) { const x = (i * 31 + Math.floor(f / 2)) % SW, y = (i * 17 + f) % 58; R(x, y, 1, 1, '#ffffff'); }
    R(0, 58, SW, 14, '#e9eef8'); R(0, 58, SW, 1, '#ffffff'); for (let x = 4; x < SW; x += 13) R(x, 63, 3, 1, '#cfd8ea');
  },
  cafe(R, f) {
    R(0, 0, SW, 58, '#e8dcc6');
    R(6, 6, 84, 40, '#7a5434'); R(8, 8, 80, 36, '#a8dcae');
    R(8, 30, 80, 14, '#7cc27a'); [[12, 18], [30, 14], [56, 16], [76, 12]].forEach(([x, y]) => { R(x, y, 10, 14, '#4f9f5a'); R(x + 4, y + 14, 2, 4, '#5a3d2a'); });
    R(8, 8, 80, 6, '#cdeefc');
    R(47, 8, 2, 36, '#7a5434'); R(8, 25, 80, 2, '#7a5434');
    for (const x of [22, 72]) { R(x, 0, 1, 6, '#3a2a1e'); R(x - 3, 6, 7, 3, '#2c2a2a'); R(x - 2, 9, 5, 1, (f % 10 < 9) ? '#ffe08a' : '#ffd060'); R(x - 6, 10, 13, 6, 'rgba(255,224,138,.15)'); }
    R(6, 46, 84, 3, '#7a5434'); [[10, 'pot'], [80, 'pot']].forEach(([x]) => { R(x, 41, 6, 5, '#c9673d'); R(x - 1, 37, 8, 4, '#3f9a5a'); });
    R(0, 58, SW, 14, '#8a5a36'); for (let x = 0; x < SW; x += 8) R(x, 58, 1, 14, '#74492a');
  },
  mountain(R, f) {
    bands(R, ['#2b3a78', '#4a4f9a', '#8a6aa8', '#e08a8a', '#f7b27a', '#fbd59a'], 0, 6);
    R(42, 30, 12, 6, '#fff1b8'); R(44, 28, 8, 2, '#fff7d6');
    for (let i = 0; i < 5; i++) R(48 - 20 - i * 4, 30 - i * 3, 1, 1, 'rgba(255,255,220,.0)');
    const ridge = (base, amp, col, ph) => { for (let x = 0; x < SW; x++) { const h = Math.round(Math.sin(x / 9 + ph) * amp + Math.sin(x / 4 + ph * 2) * (amp / 3)); R(x, base + h, 1, 58 - base - h, col); } };
    ridge(30, 5, '#6a5a9a', 0.3); ridge(38, 4, '#4a3f7a', 1.4); ridge(46, 3, '#2f2a55', 2.2);
    for (let i = 0; i < 6; i++) { const x = (i * 19 + Math.floor(f / 2)) % (SW + 20) - 10; R(x, 40 + (i % 3) * 3, 14, 2, 'rgba(255,240,240,.55)'); }
    R(0, 58, SW, 14, '#5e5866'); for (let x = 0; x < SW; x += 7) R(x, 58, 4, 2, '#77707f');
  },
  train(R, f) {
    R(0, 0, SW, 58, '#c9b28e'); R(0, 0, SW, 4, '#a68d68');
    for (const x0 of [4, 52]) {
      R(x0, 8, 40, 30, '#6a5a44'); R(x0 + 2, 10, 36, 26, '#a8d8ff');
      for (let i = 0; i < 4; i++) { const x = x0 + 2 + ((i * 13 - f * 2) % 36 + 36) % 36; R(x, 22, 6, 6, '#5a9a5a'); }
      R(x0 + 2, 28, 36, 8, '#7cc27a'); for (let x = 0; x < 36; x += 6) R(x0 + 2 + ((x - f * 3) % 36 + 36) % 36, 30, 3, 1, '#f2e06a');
      R(x0 + 2, 10, 36, 4, '#d6efff');
    }
    R(0, 40, SW, 18, '#b23a3a'); for (let x = 2; x < SW; x += 16) R(x, 40, 14, 3, '#cf5050');
    R(0, 58, SW, 14, '#3f3a44'); R(0, 58, SW, 1, '#5a5460');
  },
  space(R, f) {
    R(0, 0, SW, 58, '#0b0820');
    R(10, 8, 30, 14, 'rgba(160,80,200,.25)'); R(16, 12, 24, 10, 'rgba(90,160,255,.22)');
    stars(R, 21, 40, 56, f, ['#ffffff', '#ffd6f5', '#bfe1ff']);
    R(66, 10, 16, 16, '#e0905a'); R(68, 10, 12, 16, '#f0a86a'); R(66, 14, 16, 2, '#c2703e'); R(66, 20, 16, 2, '#c2703e');
    R(58, 17, 32, 2, '#e8d6a8'); R(60, 16, 28, 1, '#c9b885');
    R(0, 52, SW, 6, '#2a2f44'); for (let x = 0; x < SW; x += 12) R(x, 52, 1, 6, '#3c4260');
    R(0, 58, SW, 14, '#3a4058'); for (let x = 0; x < SW; x += 16) { R(x, 58, 1, 14, '#2c3146'); R(x + 6, 63, 3, 1, (f + x) % 8 < 4 ? '#5ef0c8' : '#2c3146'); }
  },
  aurora(R, f) {
    bands(R, ['#06102a', '#0a1636', '#0e1c42', '#132250'], 0, 10);
    stars(R, 33, 24, 36, f);
    for (let x = 0; x < SW; x++) { const y = 8 + Math.round(Math.sin((x + f) / 10) * 4 + Math.sin(x / 5) * 2); R(x, y, 1, 10, 'rgba(90,240,170,.35)'); R(x, y + 4, 1, 4, 'rgba(160,255,200,.35)'); const y2 = 18 + Math.round(Math.sin((x - f) / 12) * 3); R(x, y2, 1, 6, 'rgba(190,110,255,.25)'); }
    const mt = (x, w, h) => { for (let i = 0; i < w / 2; i++) R(x - i, 58 - h + i * 2 * h / w, i * 2 + 1, 2, '#2a3560'); for (let i = 0; i < w / 8; i++) R(x - i, 58 - h + i * 2 * h / w, i * 2 + 1, 2, '#e8f0ff'); };
    mt(16, 40, 22); mt(52, 50, 28); mt(86, 36, 20);
    R(0, 58, SW, 14, '#dfe8f6'); R(0, 58, SW, 1, '#ffffff');
  },
  island(R, f) {
    bands(R, ['#5ec2ff', '#7fd0ff', '#a3ddff'], 0, 10);
    R(78, 6, 10, 10, '#fff1a0'); R(80, 4, 6, 14, '#fff1a0'); R(76, 8, 14, 6, '#fff1a0');
    [[10, 8], [40, 4]].forEach(([x, y]) => { R(x + ((f / 4) | 0) % 6, y, 14, 3, '#ffffff'); R(x + 3 + ((f / 4) | 0) % 6, y - 2, 8, 2, '#ffffff'); });
    R(0, 30, SW, 28, '#2cc6c0'); R(0, 30, SW, 3, '#7fe8de');
    for (let i = 0; i < 12; i++) R((i * 17 + f) % SW, 36 + (i * 7) % 18, 4, 1, '#bff6ee');
    R(56, 26, 30, 6, '#f2dca0'); R(60, 24, 22, 2, '#f2dca0');
    const palm = (x, y) => { R(x, y, 2, 12, '#8a5a32'); [[-6, -1], [-3, -2], [2, -2], [5, -1]].forEach(([dx, dy]) => R(x + dx, y + dy, 5, 2, '#2f9a4a')); R(x - 2, y - 3, 6, 2, '#3fb05a'); };
    palm(64, 14); palm(76, 16);
    R(0, 58, SW, 14, '#f4e2b0'); for (let x = 2; x < SW; x += 9) R(x, 62 + (x % 3), 2, 1, '#e3c98a'); R(0, 58, SW, 1, '#bff6ee');
  },
};

/* ---------- decoration items ---------- */
const ITEMS = [
  { id: 'plant',   name: '몬스테라 화분', layer: 'front' },
  { id: 'cat',     name: '낮잠 고양이',   layer: 'front' },
  { id: 'clock',   name: '벽시계',        layer: 'back' },
  { id: 'lights',  name: '꼬마전구',      layer: 'back' },
  { id: 'frame',   name: '합격 액자',     layer: 'back' },
  { id: 'rug',     name: '러그',          layer: 'back' },
  { id: 'pennant', name: '응원 깃발',     layer: 'back' },
  { id: 'trophy',  name: '트로피',        layer: 'front' },
  { id: 'crown',   name: '왕관',          layer: 'front' },
  { id: 'sparkle', name: '반짝이',        layer: 'front' },
];
const SPECIAL_ITEMS = [
  { id: 'bosesa', name: '2026 보세사 전우회 현수막', layer: 'front', code: 'bosesa' },
];
const ALL_ITEMS = ITEMS.concat(SPECIAL_ITEMS);

const ITEM_DRAW = {
  rug(R) { R(10, 60, 76, 12, '#7a4b8c'); R(12, 62, 72, 8, '#9a64ad'); for (let x = 14; x < 82; x += 6) R(x, 65, 3, 2, '#f2c14e'); },
  lights(R, f) {
    for (let x = 0; x < SW; x++) R(x, 1 + Math.round(Math.abs(Math.sin(x / 12)) * 3), 1, 1, '#3a3a3a');
    const cols = ['#ff6b6b', '#ffd166', '#06d6a0', '#7aa7ff', '#f78fb3'];
    for (let x = 4, i = 0; x < SW; x += 8, i++) { const y = 2 + Math.round(Math.abs(Math.sin(x / 12)) * 3); R(x, y, 2, 3, (i + Math.floor(f / 3)) % 2 ? cols[i % 5] : '#5a5a5a'); }
  },
  pennant(R) {
    const cols = ['#e05a48', '#f2c14e', '#3eb049', '#4f81bd', '#c48cf0'];
    R(14, 8, 26, 1, '#5a4a3a');
    cols.forEach((c, i) => { const x = 15 + i * 5; for (let r = 0; r < 4; r++) R(x + r / 2, 9 + r, 4 - r, 1, c); });
  },
  clock(R) {
    R(81, 3, 11, 11, OUT); R(82, 4, 9, 9, '#fffaf0'); R(84, 3, 5, 1, OUT); R(84, 13, 5, 1, OUT);
    const d = new Date(), cx = 86, cy = 8;
    const hand = (ang, len, c) => { for (let k = 1; k <= len; k++) R(Math.round(cx + Math.sin(ang) * k), Math.round(cy - Math.cos(ang) * k), 1, 1, c); };
    hand((d.getHours() % 12 + d.getMinutes() / 60) / 12 * Math.PI * 2, 2, OUT);
    hand(d.getMinutes() / 60 * Math.PI * 2, 4, '#c8323c');
    R(cx, cy, 1, 1, OUT);
  },
  frame(R, f, ctx) {
    R(3, 13, 14, 12, '#c9962a'); R(4, 14, 12, 10, '#e8b93a'); R(5, 15, 10, 8, '#fffaf0');
    ptext(ctx, '합격', 10, 18.5, 3.6, '#c8323c');
    R(12, 21, 2, 2, '#e05a48');
  },
  plant(R) {
    R(1, 62, 10, 9, '#c9673d'); R(0, 61, 12, 2, '#a8532f'); R(2, 64, 8, 1, '#b55d36');
    [[0, 50, 6, 6], [5, 46, 7, 7], [1, 44, 5, 5], [7, 54, 5, 5]].forEach(([x, y, w, h]) => { R(x, y, w, h, '#3f9a5a'); R(x + 1, y + 1, 1, h - 2, '#2f7a46'); R(x + w - 2, y + 2, 1, 1, '#1f5a34'); });
    R(5, 52, 1, 9, '#2f7a46');
  },
  trophy(R, f) {
    R(11, 67, 9, 4, '#5e3a1e'); R(12, 66, 7, 1, '#7a4b28');
    R(14, 62, 3, 4, '#d8a52e'); R(11, 54, 9, 8, '#f3c845'); R(12, 55, 2, 5, '#fff1b0'); R(9, 55, 2, 4, '#d8a52e'); R(20, 55, 2, 4, '#d8a52e');
    R(14, 57, 3, 2, '#c8323c');
    if (f % 12 < 2) { R(19, 52, 1, 3, '#ffffff'); R(18, 53, 3, 1, '#ffffff'); }
  },
  cat(R, f) {
    const b = f % 16 < 8 ? 0 : 1;
    R(80, 64 - b, 14, 7 + b, '#8e94a3'); R(81, 63 - b, 12, 1, '#8e94a3');
    R(80, 60 - b, 6, 5, '#8e94a3'); R(80, 58 - b, 2, 2, '#8e94a3'); R(84, 58 - b, 2, 2, '#8e94a3');
    R(81, 62 - b, 1, 1, OUT); R(84, 62 - b, 1, 1, OUT); R(82, 63 - b, 2, 1, '#f7a1ad');
    R(93, 66, 2, 4, '#8e94a3'); R(88, 65 - b, 4, 1, '#6e7483');
    if (f % 24 < 12) R(88, 56 - b, 3, 1, 'rgba(239,231,210,.8)');
  },
  crown(R, f) {
    R(42, 6, 12, 3, '#f3c845'); R(42, 3, 2, 3, '#f3c845'); R(47, 2, 2, 4, '#f3c845'); R(52, 3, 2, 3, '#f3c845');
    R(42, 8, 12, 1, '#c99a2a'); R(45, 6, 1, 1, '#e05a48'); R(48, 6, 1, 1, '#5ec2ff'); R(51, 6, 1, 1, '#3eb049');
    if (f % 10 < 2) R(53, 1, 1, 1, '#ffffff');
  },
  sparkle(R, f) {
    [[30, 14], [66, 10], [24, 34], [72, 30], [36, 6], [60, 40]].forEach(([x, y], i) => {
      if ((f + i * 2) % 8 < 4) { R(x, y - 1, 1, 3, '#fff6c8'); R(x - 1, y, 3, 1, '#fff6c8'); } else R(x, y, 1, 1, '#f2c14e');
    });
  },
  bosesa(R, f, ctx) {
    // banner hung on the front of the desk
    R(20, 47, 1, 3, '#d8c9a8'); R(76, 47, 1, 3, '#d8c9a8');
    R(18, 50, 60, 12, '#8a1f2a'); R(19, 51, 58, 10, '#c8323c');
    R(19, 51, 58, 1, '#e05a68'); R(19, 60, 58, 1, '#a02632');
    for (const x of [19, 76]) R(x, 51, 1, 10, '#f2c14e');
    ptext(ctx, '2026 보세사 전우회', 48, 56.3, 5.6, '#ffffff');
  },
};

function drawItems(R, ctx, f, layer) {
  for (const id of SCENE_ITEMS) {
    const it = ALL_ITEMS.find(i => i.id === id);
    if (it && it.layer === layer && ITEM_DRAW[id]) ITEM_DRAW[id](R, f, ctx);
  }
}
// background layer (equipped background or stage default) + back items
function sceneBack(R, ctx, s, f, plain) {
  if (!plain && SCENE_BG && BG_DRAW[SCENE_BG]) BG_DRAW[SCENE_BG](R, f, ctx); else bg(R, s, f);
  if (!plain) drawItems(R, ctx, f, 'back');
}
function sceneFront(R, ctx, f, plain) { if (!plain) drawItems(R, ctx, f, 'front'); }
