/* ===== Cute (chibi) character styles — preview set =====
   Uses bg/desk/props/book from sprites.js; only the character changes. */
const CUTE_STYLES = [
  { id: 'chibi', name: 'A. 2등신 치비' },
  { id: 'cat',   name: 'B. 고양이' },
  { id: 'bear',  name: 'C. 곰돌이' },
  { id: 'mochi', name: 'D. 말랑 찹쌀떡' },
  { id: 'bunny', name: 'E. 토끼' },
  { id: 'frog',  name: 'F. 개구리' },
  { id: 'squirrel', name: 'G. 다람쥐' },
];
const OL = '#3a2b3f';
// rounded blob: insets per row from the top/bottom edge
function blob(R, x, y, w, h, c, ins = [4, 2, 1, 1]) {
  for (let r = 0; r < h; r++) {
    const i = Math.max(ins[r] || 0, ins[h - 1 - r] || 0);
    R(x + i, y + r, w - i * 2, 1, c);
  }
}
function blobO(R, x, y, w, h, c, ins) { blob(R, x - 1, y - 1, w + 2, h + 2, OL, ins && ins.map(v => v + 0)); blob(R, x, y, w, h, c, ins); }

const CUTE_OUTFIT = [
  { body: '#8f7a5c', shade: '#6f5d44' },
  { body: '#ffffff', shade: '#dcd9d2' },
  { body: '#5d72c4', shade: '#4659a3' },
  { body: '#f4f6fa', shade: '#cfd5df' },
  { body: '#34384a', shade: '#262a38' },
  { body: '#fbf9f2', shade: '#e3ddcd' },
];
const FUR = {
  chibi: { base: '#ffdcbc', shade: '#f2c19b' },
  cat:   { base: '#f6aa5e', shade: '#e08a3c' },
  bear:  { base: '#b07a50', shade: '#8f5f3b' },
  mochi: { base: '#fffaf1', shade: '#efe4d2' },
  bunny: { base: '#ffffff', shade: '#e9e6ef' },
  frog:  { base: '#8fd16a', shade: '#6db54f' },
  squirrel: { base: '#f3a35c', shade: '#d8823c' },
};

function cuteFace(R, style, pose, f, dy, ex = 0, s = 0) {
  if (style === 'frog') return frogFace(R, s, pose, f, dy);
  const y = 22 + dy;
  const lx = 41 + ex, rx = 52 - ex;
  if (pose === 'rest') {
    [lx, rx].forEach(x => { R(x, y + 1, 1, 1, OL); R(x + 1, y, 2, 1, OL); R(x + 3, y + 1, 1, 1, OL); });
  } else if (pose === 'study') {
    [lx, rx].forEach(x => { R(x, y + 2, 4, 2, OL); R(x + 1, y + 2, 1, 1, '#ffffff'); });
  } else {
    const blink = f % 22 === 0;
    [lx, rx].forEach(x => {
      if (blink) R(x, y + 2, 4, 1, OL);
      else { R(x, y, 4, 4, OL); R(x + 1, y, 1, 1, '#ffffff'); R(x + 2, y + 2, 1, 1, '#ffffff'); }
    });
  }
  R(39 + ex, y + 5, 3, 2, '#f7a1ad'); R(56 - ex, y + 5, 3, 2, '#f7a1ad');
  const my = y + 5;
  if (style === 'cat' || style === 'bunny' || style === 'mochi') {
    R(46, my, 1, 1, OL); R(47, my + 1, 1, 1, OL); R(48, my, 1, 1, OL); R(49, my + 1, 1, 1, OL); R(50, my, 1, 1, OL);
  } else if (style === 'bear') {
    // drawn with snout
  } else {
    R(47, my, 3, 1, OL); R(46, my - 1, 1, 1, OL); R(50, my - 1, 1, 1, OL);
  }
}

// frog face changes mood with each stage
function frogFace(R, s, pose, f, dy) {
  const y = 22 + dy, my = y + 5, L = 41, Rx = 52;
  const PINK = '#f7a1ad', BAG = '#6d5a8e', SWEAT = '#8fd3ff';
  const eyesOpen = (h = 4) => [L, Rx].forEach(x => { R(x, y + 4 - h, 4, h, OL); R(x + 1, y + 4 - h, 1, 1, '#ffffff'); });
  const eyesDown = () => [L, Rx].forEach(x => { R(x, y + 2, 4, 2, OL); R(x + 1, y + 2, 1, 1, '#ffffff'); });
  const eyesHappy = () => [L, Rx].forEach(x => { R(x, y + 1, 1, 1, OL); R(x + 1, y, 2, 1, OL); R(x + 3, y + 1, 1, 1, OL); });
  const sweat = (yy) => { R(59, yy, 1, 1, SWEAT); R(58, yy + 1, 3, 2, SWEAT); R(58, yy + 1, 1, 1, '#ffffff'); };
  const blush = () => { R(39, y + 5, 3, 2, PINK); R(56, y + 5, 3, 2, PINK); };
  const blink = pose === 'idle' && f % 22 === 0;

  if (s === 0) { // worn out: dark circles, wobbly mouth, sweat
    if (pose === 'rest') { [L, Rx].forEach(x => { R(x, y + 2, 4, 1, OL); }); }
    else { [L, Rx].forEach(x => { R(x, y + 1, 4, 1, OL); R(x + 1, y + 2, 2, 1, OL); }); }
    [L, Rx].forEach(x => R(x, y + 4, 4, 1, BAG));
    [0, 1, 2, 3, 4, 5].forEach(i => R(45 + i, my + (i % 2), 1, 1, OL));
    if (pose !== 'rest') sweat(17 + dy + (f % 6 < 3 ? 0 : 1));
  } else if (s === 1) { // hustling: wide eyes, small "o" mouth, sweat
    if (pose === 'rest') eyesHappy(); else if (blink) [L, Rx].forEach(x => R(x, y + 2, 4, 1, OL)); else eyesOpen(4);
    R(47, my, 2, 2, OL); R(47, my, 1, 1, '#c95d6b');
    blush();
    if (pose === 'study') sweat(16 + dy);
  } else if (s === 2) { // focused: angled brows, steam from the head while studying
    if (pose === 'rest') eyesHappy(); else if (pose === 'study') eyesDown(); else eyesOpen(4);
    R(41, y - 3, 2, 1, OL); R(43, y - 2, 2, 1, OL); R(52, y - 2, 2, 1, OL); R(54, y - 3, 2, 1, OL);
    R(45, my, 6, 1, OL);
    blush();
    if (pose === 'study') { const k = f % 6; R(61, 7 + dy - k, 2, 2, 'rgba(255,255,255,.55)'); R(63, 3 + dy - (k % 3), 2, 2, 'rgba(255,255,255,.35)'); }
  } else if (s === 3) { // calm: soft eyes, easy smile
    if (pose === 'rest' || pose === 'study') eyesHappy(); else if (blink) [L, Rx].forEach(x => R(x, y + 2, 4, 1, OL)); else eyesOpen(4);
    R(44, my, 8, 1, OL); R(43, my - 1, 1, 1, OL); R(52, my - 1, 1, 1, OL);
    blush();
  } else if (s === 4) { // smug: one raised brow, lopsided grin
    if (pose === 'rest') eyesHappy(); else { [L, Rx].forEach(x => { R(x, y + 1, 4, 3, OL); R(x + 1, y + 1, 1, 1, '#ffffff'); }); }
    R(41, y - 1, 4, 1, OL); R(52, y - 3, 4, 1, OL); R(51, y - 2, 1, 1, OL);
    R(45, my, 6, 1, OL); R(51, my - 1, 1, 1, OL); R(52, my - 2, 1, 1, OL);
  } else { // arrogant (sunglasses come from the headwear): smirk with a gold tooth, glint
    R(44, my, 8, 1, OL); R(52, my - 1, 1, 1, OL); R(53, my - 2, 1, 1, OL);
    R(49, my + 1, 2, 1, '#f2c14e');
    if (f % 10 < 2) { R(57, y - 2, 1, 3, '#ffffff'); R(56, y - 1, 3, 1, '#ffffff'); }
  }
}

// round, chubby rodent: head and body are one blob, cream lower face, small round ears
function hamChar(R, s, pose, f) {
  const dy = pose === 'study' ? (f % 8 < 4 ? 0 : 1) : pose === 'rest' ? (f % 16 < 8 ? -1 : 0) : 0;
  const O = '#f3a35c', OS = '#d8823c', C = '#fff1dc', PINK = '#f7a1ad';
  const y = dy;
  // body (mostly behind the desk)
  blobO(R, 37, 31 + y, 22, 18, O, [4, 2, 1]);
  if (s <= 2) blob(R, 41, 35 + y, 14, 10, C, [3, 1]);
  if (s === 0) { R(52, 37 + y, 3, 3, '#b39a6e'); R(53, 38 + y, 1, 1, OL); }
  if (s === 1) { R(40, 35 + y, 16, 13, '#3f9a63'); R(40, 33 + y, 2, 2, '#3f9a63'); R(54, 33 + y, 2, 2, '#3f9a63'); R(42, 37 + y, 4, 2, '#ffffff'); R(43, 37 + y, 2, 1, '#e05a48'); }
  if (s === 3) { R(38, 33 + y, 20, 15, '#f6f7fb'); R(44, 33 + y, 8, 2, '#d9dde6'); R(47, 34 + y, 2, 2, '#244c94'); R(47, 36 + y, 2, 10, '#2f62c9'); }
  if (s === 4) { R(38, 33 + y, 20, 15, '#2c2f3d'); R(44, 33 + y, 8, 4, '#f4f4f4'); R(47, 34 + y, 2, 12, '#c8323c'); R(41, 37 + y, 2, 1, '#e8b93a'); }
  if (s === 5) { R(38, 33 + y, 20, 15, '#fbf9f2'); R(47, 34 + y, 2, 12, '#e8b93a'); R(43, 33 + y, 10, 1, '#e8b93a'); }
  // ears
  blobO(R, 35, 8 + y, 9, 8, O, [2, 1]); blobO(R, 52, 8 + y, 9, 8, O, [2, 1]);
  R(37, 10 + y, 5, 4, '#f9c49a'); R(54, 10 + y, 5, 4, '#f9c49a');
  // head
  blobO(R, 33, 11 + y, 30, 24, O, [7, 4, 2, 1, 1]);
  R(34, 18 + y, 1, 10, OS); R(61, 18 + y, 1, 10, OS);
  blob(R, 37, 23 + y, 22, 11, C, [5, 2, 1]);
  R(45, 12 + y, 2, 4, OS); R(48, 12 + y, 2, 5, OS); R(51, 12 + y, 2, 4, OS);
  // face
  const ey = 20 + y;
  if (pose === 'rest') {
    [40, 53].forEach(x => { R(x, ey + 2, 1, 1, OL); R(x + 1, ey + 1, 2, 1, OL); R(x + 3, ey + 2, 1, 1, OL); });
  } else if (s !== 5) {
    const blink = pose === 'idle' && f % 22 === 0;
    const down = pose === 'study' ? 1 : 0;
    [41, 53].forEach(x => { if (blink) R(x, ey + 2, 3, 1, OL); else { R(x, ey + down, 3, 4 - down, OL); R(x, ey + down, 1, 1, '#ffffff'); } });
  }
  R(37, 26 + y, 3, 2, PINK); R(57, 26 + y, 3, 2, PINK);
  R(48, 25 + y, 1, 1, '#e88a8a');
  const my = 27 + y;
  R(46, my, 1, 1, OL); R(47, my + 1, 1, 1, OL); R(48, my, 1, 1, OL); R(49, my + 1, 1, 1, OL); R(50, my, 1, 1, OL);
  // headwear per stage
  if (s === 1) {
    blob(R, 36, 6 + y, 24, 8, '#e05a48', [5, 2, 1]);
    R(34, 13 + y, 28, 2, '#b8443a');
    R(45, 8 + y, 6, 4, '#ffffff'); R(46, 9 + y, 4, 2, '#e05a48');
  } else if (s === 2) {
    [39, 51].forEach(x => { R(x, 18 + y, 7, 1, OL); R(x, 24 + y, 7, 1, OL); R(x, 18 + y, 1, 7, OL); R(x + 6, 18 + y, 1, 7, OL); });
    R(46, 20 + y, 5, 1, OL);
  } else if (s === 4) {
    R(39, 9 + y, 16, 4, '#8a8590'); R(44, 7 + y, 9, 3, '#8a8590'); R(52, 10 + y, 4, 3, '#8a8590'); R(46, 8 + y, 5, 1, '#b3aeb8');
  } else if (s === 5) {
    const W = '#ffffff', WS = '#e3dfd6';
    blob(R, 31, 5 + y, 34, 14, W, [7, 4, 2, 1]);
    R(31, 16 + y, 5, 20, W); R(60, 16 + y, 5, 20, W); R(31, 28 + y, 5, 8, WS); R(60, 28 + y, 5, 8, WS);
    R(34, 8 + y, 28, 2, '#1d1d1d'); R(34, 11 + y, 28, 1, '#1d1d1d');
    R(39, 19 + y, 8, 5, '#111111'); R(50, 19 + y, 8, 5, '#111111'); R(47, 20 + y, 3, 1, '#111111');
    R(40, 20 + y, 2, 1, '#8fe3ff'); R(51, 20 + y, 2, 1, '#8fe3ff');
    if (f % 10 < 2) { R(58, 17 + y, 1, 3, '#ffffff'); R(57, 18 + y, 3, 1, '#ffffff'); }
  }
}

function cuteChar(R, style, s, pose, f) {
  if (style === 'squirrel') return hamChar(R, s, pose, f);
  const fur = FUR[style], o = CUTE_OUTFIT[s];
  const dy = pose === 'study' ? (f % 8 < 4 ? 0 : 1) : pose === 'rest' ? (f % 16 < 8 ? -1 : 0) : 0;

  if (style === 'mochi') {
    // one round body
    blobO(R, 31, 15 + dy, 34, 34, fur.base, [8, 5, 4, 3, 2, 2, 1, 1, 1]);
    R(33, 40 + dy, 30, 8, fur.shade);
    // outfit as a little scarf/vest
    R(36, 36 + dy, 24, 4, o.body); R(36, 39 + dy, 24, 1, o.shade);
    if (s === 0) { R(40, 37 + dy, 3, 2, '#b39a6e'); R(53, 37 + dy, 2, 1, '#4d3e2c'); }
    if (s === 2) { R(46, 39 + dy, 1, 4, '#eeeeee'); R(50, 39 + dy, 1, 4, '#eeeeee'); }
    if (s === 5) { R(47, 36 + dy, 2, 6, '#e8b93a'); }
    if (s === 1) { R(36, 36 + dy, 24, 4, '#3f9a63'); R(44, 37 + dy, 4, 2, '#ffffff'); }
    if (s === 3) { R(47, 37 + dy, 2, 7, '#3c6fd0'); }
    if (s === 4) { R(47, 37 + dy, 2, 7, '#c8323c'); R(44, 36 + dy, 8, 1, '#f4f4f4'); }
    cuteFace(R, style, pose, f, dy + 3, 0, s);
    cuteHead(R, style, s, dy + 4, true);
    return;
  }
  // body
  blobO(R, 38, 32 + dy, 20, 17, o.body, [3, 1]);
  R(38, 44 + dy, 20, 4, o.shade);
  if (s === 0) { R(41, 36 + dy, 4, 4, '#b39a6e'); R(42, 37 + dy, 1, 1, OL); R(52, 39 + dy, 3, 2, '#4d3e2c'); }
  if (s === 2) { R(45, 33 + dy, 1, 6, '#eeeeee'); R(50, 33 + dy, 1, 6, '#eeeeee'); R(42, 41 + dy, 12, 3, o.shade); }
  if (s === 5) { R(47, 33 + dy, 2, 14, '#e8b93a'); R(43, 33 + dy, 10, 1, '#e8b93a'); }
  if (s === 1) { R(41, 36 + dy, 14, 11, '#3f9a63'); R(41, 33 + dy, 2, 3, '#3f9a63'); R(53, 33 + dy, 2, 3, '#3f9a63'); R(43, 38 + dy, 4, 2, '#ffffff'); R(44, 38 + dy, 2, 1, '#e05a48'); }
  if (s === 3) { R(47, 33 + dy, 2, 2, '#2c58ad'); R(47, 35 + dy, 2, 8, '#3c6fd0'); R(41, 34 + dy, 1, 7, '#e05a48'); R(40, 40 + dy, 3, 3, '#ffffff'); }
  if (s === 4) { R(45, 33 + dy, 6, 6, '#f4f4f4'); R(47, 34 + dy, 2, 9, '#c8323c'); R(43, 33 + dy, 2, 8, o.shade); R(51, 33 + dy, 2, 8, o.shade); R(40, 37 + dy, 3, 2, '#e8b93a'); }

  // ears behind head
  if (style === 'cat') {
    [[37, 1], [53, -1]].forEach(([x]) => { R(x, 8 + dy, 6, 1, OL); });
    const ear = (x, flip) => {
      for (let r = 0; r < 6; r++) { const w = 1 + r; const xx = flip ? x + 6 - w : x; R(xx - 1, 6 + r + dy, w + 2, 1, OL); R(xx, 6 + r + dy, w, 1, fur.base); }
      for (let r = 2; r < 6; r++) { const w = r - 1; const xx = flip ? x + 5 - w : x + 1; R(xx, 6 + r + dy, w, 1, '#f7a1ad'); }
    };
    ear(37, false); ear(53, true);
  }
  if (style === 'bear') {
    blobO(R, 35, 7 + dy, 8, 8, fur.base, [2, 1]); blobO(R, 53, 7 + dy, 8, 8, fur.base, [2, 1]);
    R(37, 9 + dy, 4, 4, '#e8c4a0'); R(55, 9 + dy, 4, 4, '#e8c4a0');
  }
  if (style === 'frog') {
    blobO(R, 35, 7 + dy, 10, 8, fur.base, [3, 1]); blobO(R, 51, 7 + dy, 10, 8, fur.base, [3, 1]);
    R(38, 8 + dy, 3, 1, '#c6eea6'); R(54, 8 + dy, 3, 1, '#c6eea6');
  }
  if (style === 'bunny') {
    blobO(R, 39, 0 + dy, 6, 15, fur.base, [2, 1]); blobO(R, 51, 0 + dy, 6, 15, fur.base, [2, 1]);
    R(41, 2 + dy, 2, 11, '#f7b8c4'); R(53, 2 + dy, 2, 11, '#f7b8c4');
  }
  // head
  blobO(R, 35, 11 + dy, 26, 22, fur.base, [5, 3, 2, 1, 1]);
  R(37, 29 + dy, 22, 3, fur.shade);
  if (style === 'cat') { R(46, 12 + dy, 1, 3, fur.shade); R(48, 12 + dy, 1, 4, fur.shade); R(50, 12 + dy, 1, 3, fur.shade);
    R(33, 26 + dy, 4, 1, OL); R(33, 28 + dy, 4, 1, OL); R(59, 26 + dy, 4, 1, OL); R(59, 28 + dy, 4, 1, OL); }
  if (style === 'bear') { blob(R, 44, 25 + dy, 8, 6, '#e8c9a5', [2, 1]); R(47, 26 + dy, 2, 2, OL); R(47, 28 + dy, 1, 1, OL); R(48, 29 + dy, 1, 1, OL); R(49, 28 + dy, 1, 1, OL); }
  if (style === 'bunny') { R(47, 26 + dy, 2, 1, '#f48aa0'); }
  if (style === 'frog') { R(46, 25 + dy, 1, 1, fur.shade); R(49, 25 + dy, 1, 1, fur.shade); R(36, 30 + dy, 24, 2, '#c6eea6'); }
  cuteFace(R, style, pose, f, dy, 0, s);
  cuteHead(R, style, s, dy, false);
}

// headwear / hair / glasses per stage
function cuteHead(R, style, s, dy, mochi) {
  const top = mochi ? 12 : 10, x0 = mochi ? 34 : 35, w = mochi ? 28 : 26;
  const human = style === 'chibi';
  if (s === 0) {
    if (human) {
      const H = '#5a4430';
      blob(R, 35, 9 + dy, 26, 9, H, [5, 3, 1]); R(35, 15 + dy, 3, 9, H); R(58, 15 + dy, 3, 10, H);
      R(39, 17 + dy, 4, 2, H); R(45, 17 + dy, 3, 3, H); R(50, 17 + dy, 5, 2, H);
      R(38, 7 + dy, 3, 2, H); R(47, 6 + dy, 2, 3, H); R(54, 7 + dy, 3, 2, H);
    } else {
      R(x0 + 2, top + dy, w - 4, 4, '#8f6e4a'); R(x0 + 2, top + 3 + dy, w - 4, 1, '#6f5435');
      R(x0 + w - 4, top + 3 + dy, 4, 4, '#8f6e4a'); R(x0 + 6, top + 1 + dy, 3, 2, '#b39a6e');
    }
    R(mochi ? 55 : 54, (mochi ? 31 : 27) + dy, 3, 1, '#c99a6a'); // dirt
    R(mochi ? 39 : 40, (mochi ? 30 : 26) + dy, 4, 2, '#f3e2c2'); R(mochi ? 40 : 41, (mochi ? 30 : 26) + dy, 2, 2, '#e8cfa3'); // band-aid
  } else if (s === 1) {
    if (human) { const H = '#2d2638'; R(35, 15 + dy, 3, 8, H); R(58, 15 + dy, 3, 8, H); }
    blob(R, x0, top - 1 + dy, w, 7, '#e05a48', [5, 2, 1]);
    R(x0 - 2, top + 5 + dy, w + 4, 2, '#b8443a');
    R(46, top + 1 + dy, 5, 3, '#ffffff'); R(47, top + 2 + dy, 3, 1, '#e05a48');
  } else if (s === 3) {
    if (human) {
      const H = '#231c1a';
      blob(R, 35, 9 + dy, 26, 8, H, [5, 3, 1]); R(35, 15 + dy, 3, 6, H); R(58, 15 + dy, 3, 6, H); R(38, 16 + dy, 11, 2, H); R(52, 16 + dy, 1, 1, H);
    } else { R(x0 + 4, top + dy, 2, 1, '#ffffff'); }
  } else if (s === 4) {
    if (human) {
      const H = '#7b7682';
      blob(R, 35, 9 + dy, 26, 8, H, [5, 3, 1]); R(35, 15 + dy, 3, 5, H); R(58, 15 + dy, 3, 5, H); R(40, 10 + dy, 8, 1, '#a9a4b0');
      R(45, 25 + dy, 7, 1, '#5d5866');
    } else {
      R(x0 + 4, top - 6 + dy, w - 8, 7, '#2a2a36'); R(x0 + 4, top - 1 + dy, w - 8, 2, '#c8323c'); R(x0, top + 1 + dy, w, 2, '#2a2a36');
    }
  } else if (s === 2) {
    if (human) {
      const H = '#2d2638';
      blob(R, 35, 9 + dy, 26, 9, H, [5, 3, 1]); R(35, 15 + dy, 3, 7, H); R(58, 15 + dy, 3, 7, H); R(40, 17 + dy, 9, 2, H); R(43, 19 + dy, 3, 1, H);
    }
    const gy = (mochi ? 25 : 21) + dy;
    [40, 51].forEach(x => { R(x, gy, 6, 1, OL); R(x, gy + 5, 6, 1, OL); R(x, gy, 1, 6, OL); R(x + 5, gy, 1, 6, OL); });
    R(46, gy + 2, 5, 1, OL);
  } else if (s === 5) {
    const W = '#ffffff', WS = '#e3dfd6';
    blob(R, x0 - 1, top - 2 + dy, w + 2, 9, W, [5, 3, 1]);
    if (!mochi) { R(x0 - 1, top + 4 + dy, 4, 20, W); R(x0 + w - 3, top + 4 + dy, 4, 20, W); R(x0 - 1, top + 18 + dy, 4, 6, WS); R(x0 + w - 3, top + 18 + dy, 4, 6, WS); }
    R(x0 + 2, top + 1 + dy, w - 4, 1, '#1d1d1d'); R(x0 + 2, top + 3 + dy, w - 4, 1, '#1d1d1d');
    const gy = (mochi ? 26 : 22) + dy;
    R(40, gy, 6, 4, '#1d1d1d'); R(51, gy, 6, 4, '#1d1d1d'); R(46, gy, 5, 1, '#1d1d1d'); R(41, gy, 2, 1, '#8fe3ff'); R(52, gy, 2, 1, '#8fe3ff');
  }
}

function cuteArms(R, style, s, pose, f) {
  const fur = FUR[style], o = CUTE_OUTFIT[s];
  const paw = style === 'squirrel' ? '#fff1dc' : fur.base;
  const dx = pose === 'study' ? [0, 1, 2, 1][f % 4] : 0;
  blobO(R, 39, 43, 6, 4, paw, [1]);
  blobO(R, 51 + dx, 43, 6, 4, paw, [1]);
  if (style !== 'chibi' && style !== 'mochi') { R(41, 45, 1, 1, OL); R(43, 45, 1, 1, OL); R(53 + dx, 45, 1, 1, OL); R(55 + dx, 45, 1, 1, OL); }
  if (pose === 'study') { R(53 + dx, 38, 1, 6, '#f2c14e'); R(53 + dx, 37, 1, 1, '#ff8fa3'); R(53 + dx, 44, 1, 1, OL); }
  if (s === 5) R(50 + dx, 44, 2, 2, '#e8b93a');
}

function drawCuteScene(ctx, style, s, pose, f, sil, plain) {
  const R = makeR(ctx);
  const C = sil ? makeR(ctx, sil) : R;
  plain = plain || !!sil;
  ctx.clearRect(0, 0, SW, SH);
  sceneBack(R, ctx, s, f, plain);
  cuteChar(C, style, s, pose, f);
  desk(R, s, f);
  book(R, s, pose === 'rest' ? 'rest' : 'study', f);
  props(R, s, pose, f);
  cuteArms(C, style, s, pose, f);
  if (pose === 'rest' && !sil) zzz(R, f);
  sceneFront(R, ctx, f, plain);
}
