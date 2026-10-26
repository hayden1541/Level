/* ===== Pixel scene renderer =====
   Logical canvas 96 x 72. Character sits behind a desk, front view.
   drawScene(ctx, stage 0..5, pose 'study'|'rest', frame int) */
const SW = 96, SH = 72;
const OUT = '#1a1426';

// hours = total study hours needed, streak = longest run of days with 30+ min (from stage 2 on)
const STAGES = [
  { key: 'beggar',  name: '백수 거지', hours: 0,   streak: 0,  line: '박스 하나, 촛불 하나. 시작은 원래 이래.' },
  { key: 'parttime',name: '알바생',    hours: 20,  streak: 0,  line: '컵라면 먹으면서도 책은 편다.' },
  { key: 'student', name: '대학생',    hours: 60,  streak: 5,  line: '책상이 생겼다. 스탠드도 생겼다.' },
  { key: 'office',  name: '직장인',    hours: 150, streak: 10, line: '모니터 두 대 부럽지 않은 집중력.' },
  { key: 'ceo',     name: '사장님',    hours: 350, streak: 20, line: '창밖 야경은 덤. 공부는 계속.' },
  { key: 'mansour', name: '만수르',    hours: 800, streak: 30, line: '금괴 위에서도 공부한다. 끝판왕.' },
];

function makeR(ctx, override) {
  return (x, y, w, h, c) => { ctx.fillStyle = override || c; ctx.fillRect(x, y, w, h); };
}
function rr(R, x, y, w, h, c) { R(x + 1, y, w - 2, h, c); R(x, y + 1, w, h - 2, c); }

/* ---------- backgrounds ---------- */
function bg(R, s, f) {
  if (s === 0) { // night alley, brick wall
    R(0, 0, SW, SH, '#34323f');
    for (let y = 0; y < 58; y += 5) {
      R(0, y, SW, 1, '#2a2833');
      const off = (y / 5) % 2 ? 0 : 6;
      for (let x = off; x < SW; x += 12) R(x, y, 1, 5, '#2a2833');
    }
    R(70, 6, 16, 12, '#26242f'); R(71, 7, 14, 10, '#1b1a26'); // broken window
    R(76, 7, 1, 10, '#34323f'); R(71, 12, 14, 1, '#34323f');
    if (f % 6 < 3) R(80, 9, 1, 1, '#e8e3c4');
    R(0, 58, SW, 14, '#22212b');
    R(6, 64, 10, 2, '#2e3a4f'); R(84, 66, 8, 2, '#2e3a4f'); // puddles
    R(4, 50, 6, 8, '#3c4a3a'); R(5, 49, 4, 1, '#55664f'); // trash can
  } else if (s === 1) { // small one-room
    R(0, 0, SW, SH, '#5b6283');
    for (let x = 0; x < SW; x += 8) R(x, 0, 1, 58, '#545b7b');
    R(6, 8, 22, 18, '#c9c3b5'); R(7, 9, 20, 16, '#1f2a4d');
    R(16, 9, 2, 16, '#c9c3b5'); R(7, 16, 20, 1, '#c9c3b5');
    R(10, 11, 1, 1, '#f2e9b0'); R(23, 13, 1, 1, '#f2e9b0');
    R(70, 8, 14, 18, '#d9614c'); R(72, 10, 10, 6, '#f2c14e'); R(72, 18, 10, 1, '#f5efe0'); R(72, 20, 7, 1, '#f5efe0');
    R(0, 58, SW, 14, '#3f3a4e');
  } else if (s === 2) { // dorm room, bookshelf + window
    R(0, 0, SW, SH, '#4d6878');
    R(2, 6, 26, 40, '#6b4426'); R(3, 7, 24, 38, '#4f311b');
    const spines = ['#c0504d', '#4f81bd', '#9bbb59', '#f2c14e', '#8064a2', '#e8e3d3'];
    for (let r = 0; r < 3; r++) {
      R(3, 18 + r * 12, 24, 2, '#6b4426');
      for (let i = 0; i < 9; i++) R(4 + i * 2 + (i > 5 ? 2 : 0), 9 + r * 12, 2, 9 - (i % 3), spines[(i + r) % 6]);
    }
    R(66, 6, 24, 20, '#d8d2c2'); R(67, 7, 22, 18, '#1e2b52');
    R(77, 7, 2, 18, '#d8d2c2');
    const tw = f % 8 < 4;
    R(70, 10, 1, 1, tw ? '#fff6c8' : '#9aa6d6'); R(84, 12, 1, 1, tw ? '#9aa6d6' : '#fff6c8'); R(82, 19, 1, 1, '#fff6c8');
    R(68, 9, 4, 4, '#f2e6b0'); R(69, 9, 3, 3, '#1e2b52'); // moon
    R(0, 58, SW, 14, '#3a4a55');
  } else if (s === 3) { // office cubicle
    R(0, 0, SW, SH, '#dfe4ea');
    R(0, 0, SW, 3, '#c4ccd6'); R(20, 1, 20, 1, '#ffffff'); R(60, 1, 20, 1, '#ffffff');
    R(0, 20, SW, 38, '#7d8ea3');
    for (let y = 22; y < 58; y += 3) for (let x = (y % 2) * 2; x < SW; x += 4) R(x, y, 1, 1, '#73839a');
    R(0, 19, SW, 2, '#556477');
    R(66, 24, 6, 6, '#f3e06b'); R(74, 26, 6, 6, '#f39c9c'); R(70, 33, 6, 6, '#9fe0b4');
    R(67, 26, 4, 1, '#b8a83c'); R(75, 28, 4, 1, '#b86a6a');
    R(10, 24, 12, 9, '#ffffff'); R(11, 25, 10, 1, '#7d8ea3'); R(11, 27, 8, 1, '#c4ccd6'); R(11, 29, 9, 1, '#c4ccd6');
    R(0, 58, SW, 14, '#5d6673');
  } else if (s === 4) { // CEO office with skyline
    const sky = ['#2a2557', '#3b2d6b', '#5a3a7a', '#8a4b7c', '#c4626c', '#e8875a'];
    for (let i = 0; i < 6; i++) R(0, i * 7, SW, 7, sky[i]);
    R(0, 42, SW, 16, '#e8875a');
    const bl = [[2, 26, 10], [12, 18, 9], [21, 30, 8], [29, 12, 11], [40, 24, 9], [49, 16, 12], [61, 28, 7], [68, 10, 10], [78, 22, 9], [87, 30, 9]];
    for (const [x, y, w] of bl) {
      R(x, y, w, 58 - y, '#1e1b33');
      for (let yy = y + 3; yy < 56; yy += 4) for (let xx = x + 2; xx < x + w - 1; xx += 3)
        if (((xx * 7 + yy * 3 + (yy > 40 ? f : 0)) % 5) < 2) R(xx, yy, 1, 2, '#f4d06b');
    }
    for (let x = 0; x <= SW; x += 24) R(x, 0, 2, 58, '#2a2638');
    R(0, 0, SW, 2, '#2a2638');
    R(0, 58, SW, 14, '#3b2a2a');
  } else { // palace
    R(0, 0, SW, SH, '#3c1f4f');
    for (let i = 0; i < 3; i++) {
      const x = 4 + i * 32;
      R(x, 10, 24, 48, '#e3b23c'); R(x + 2, 12, 20, 46, '#5ec2e0');
      R(x + 2, 12, 4, 2, '#e3b23c'); R(x + 18, 12, 4, 2, '#e3b23c'); R(x + 2, 14, 2, 2, '#e3b23c'); R(x + 20, 14, 2, 2, '#e3b23c');
      R(x + 2, 40, 20, 18, '#f0d88a'); // sand
      R(x + 10, 30, 2, 12, '#7a5a2a'); R(x + 6, 28, 10, 2, '#3f9a5a'); R(x + 8, 26, 6, 2, '#3f9a5a');
    }
    R(0, 0, SW, 8, '#8a1f3a'); for (let x = 0; x < SW; x += 6) R(x, 8, 3, 2, '#8a1f3a');
    R(44, 0, 8, 2, '#e3b23c'); R(46, 2, 4, 3, '#f7d774');
    const tw = f % 6;
    R(10 + tw * 13, 4, 1, 1, '#fff7c2'); R(80 - tw * 9, 5, 1, 1, '#fff7c2');
    R(0, 58, SW, 14, '#a3233a'); R(0, 58, SW, 1, '#e3b23c');
    for (let x = 2; x < SW; x += 8) R(x, 64, 4, 1, '#c2405a');
  }
}

/* ---------- character parts ---------- */
const SKIN = '#f1c27d', SKIN_S = '#d39a62';

function outfit(s) {
  return [
    { shirt: '#7d6a4f', shade: '#5e4e38' },
    { shirt: '#e8e6e0', shade: '#bdbab2' },
    { shirt: '#4a5fa8', shade: '#384a85' },
    { shirt: '#eef0f4', shade: '#c9ced8' },
    { shirt: '#2c2f3d', shade: '#1e2029' },
    { shirt: '#f7f5ef', shade: '#ddd8cc' },
  ][s];
}

function torso(R, s, dy) {
  const o = outfit(s);
  R(45, 29 + dy, 6, 3, SKIN_S); // neck
  rr(R, 35, 31 + dy, 26, 20, OUT);
  rr(R, 36, 32 + dy, 24, 19, o.shirt);
  R(36, 46 + dy, 24, 5, o.shade);
  const y = dy;
  if (s === 0) {
    R(43, 32 + y, 10, 2, SKIN_S);
    R(39, 37 + y, 5, 4, '#a1885f'); R(40, 38 + y, 1, 1, OUT); R(42, 39 + y, 1, 1, OUT);
    R(52, 40 + y, 3, 2, '#3d3226'); R(37, 44 + y, 2, 2, '#3d3226');
  } else if (s === 1) {
    R(38, 36 + y, 20, 15, '#2f8f5b'); R(40, 32 + y, 3, 4, '#2f8f5b'); R(53, 32 + y, 3, 4, '#2f8f5b');
    R(41, 39 + y, 5, 2, '#ffffff'); R(42, 39 + y, 3, 1, '#d94f3d');
    R(44, 44 + y, 8, 1, '#26774a');
  } else if (s === 2) {
    R(41, 31 + y, 14, 3, o.shade); R(45, 34 + y, 1, 6, '#e8e8f0'); R(50, 34 + y, 1, 6, '#e8e8f0');
    R(42, 43 + y, 12, 4, o.shade);
  } else if (s === 3) {
    R(43, 32 + y, 3, 2, o.shade); R(50, 32 + y, 3, 2, o.shade);
    R(47, 33 + y, 2, 2, '#244c94'); R(47, 35 + y, 2, 10, '#2f5fb3'); R(47, 45 + y, 2, 1, '#244c94');
    R(53, 37 + y, 3, 3, o.shade);
    R(40, 36 + y, 1, 8, '#d94f3d'); R(39, 43 + y, 3, 3, '#ffffff'); // lanyard + badge
  } else if (s === 4) {
    R(45, 32 + y, 6, 7, '#f2f2f2'); R(47, 33 + y, 2, 11, '#b3262f'); R(47, 33 + y, 2, 1, '#8a1d24');
    R(43, 32 + y, 2, 9, o.shade); R(51, 32 + y, 2, 9, o.shade);
    R(39, 37 + y, 3, 2, '#e04a4a'); R(48, 45 + y, 1, 1, '#d8a944');
  } else {
    R(47, 33 + y, 2, 17, '#e3b23c'); R(46, 35 + y, 1, 1, '#e3b23c'); R(46, 39 + y, 1, 1, '#e3b23c'); R(46, 43 + y, 1, 1, '#e3b23c');
    R(42, 32 + y, 12, 1, '#e3b23c');
  }
}

function head(R, s, pose, f, dy) {
  rr(R, 39, 13 + dy, 18, 18, OUT);
  rr(R, 40, 14 + dy, 16, 16, SKIN);
  R(40, 26 + dy, 16, 3, SKIN_S); R(41, 29 + dy, 14, 1, SKIN_S);
  R(38, 20 + dy, 2, 4, SKIN); R(56, 20 + dy, 2, 4, SKIN); // ears
  const y = dy;
  // eyes
  if (s !== 5) {
    if (pose === 'study') {
      R(43, 22 + y, 3, 1, OUT); R(50, 22 + y, 3, 1, OUT);
      R(43, 19 + y, 3, 1, '#7a5a3a'); R(50, 19 + y, 3, 1, '#7a5a3a');
    } else if (pose === 'rest') {
      R(43, 21 + y, 1, 1, OUT); R(44, 20 + y, 1, 1, OUT); R(45, 21 + y, 1, 1, OUT);
      R(50, 21 + y, 1, 1, OUT); R(51, 20 + y, 1, 1, OUT); R(52, 21 + y, 1, 1, OUT);
    } else {
      const blink = f % 20 === 0;
      if (blink) { R(44, 21 + y, 2, 1, OUT); R(50, 21 + y, 2, 1, OUT); }
      else { R(44, 20 + y, 2, 2, OUT); R(50, 20 + y, 2, 2, OUT); R(44, 20 + y, 1, 1, '#ffffff'); R(50, 20 + y, 1, 1, '#ffffff'); }
    }
  }
  // cheeks + mouth
  R(41, 24 + y, 2, 1, '#e8977a'); R(53, 24 + y, 2, 1, '#e8977a');
  if (pose === 'rest' && f % 16 < 5) { R(47, 25 + y, 2, 2, '#7a3b2b'); }
  else R(46, 26 + y, 4, 1, '#8a4b3a');
}

function hair(R, s, pose, f, dy) {
  const y = dy;
  if (s === 0) {
    const H = '#4b3a2a';
    R(39, 11 + y, 18, 6, H); R(37, 13 + y, 3, 11, H); R(56, 13 + y, 3, 13, H);
    R(41, 9 + y, 3, 2, H); R(47, 10 + y, 3, 1, H); R(52, 9 + y, 2, 2, H); R(36, 15 + y, 1, 4, H);
    R(40, 17 + y, 3, 2, H); R(45, 17 + y, 2, 3, H); R(50, 17 + y, 4, 2, H);
    for (let x = 42; x < 55; x += 2) { R(x, 27 + y, 1, 1, '#8c7258'); R(x + 1, 28 + y, 1, 1, '#8c7258'); }
    R(42, 23 + y, 2, 1, '#b98a5a');
  } else if (s === 1) {
    R(39, 10 + y, 18, 7, '#d94f3d'); R(38, 16 + y, 20, 2, '#a83a2c'); R(45, 11 + y, 6, 3, '#ffffff'); R(46, 12 + y, 4, 1, '#d94f3d');
    R(39, 18 + y, 2, 4, '#2a2233'); R(55, 18 + y, 2, 4, '#2a2233');
  } else if (s === 2) {
    const H = '#2a2233';
    R(39, 11 + y, 18, 6, H); R(39, 17 + y, 2, 5, H); R(55, 17 + y, 2, 5, H); R(42, 17 + y, 8, 2, H); R(44, 19 + y, 3, 1, H);
    const G = '#26222e';
    R(42, 19 + y, 5, 1, G); R(42, 23 + y, 5, 1, G); R(42, 19 + y, 1, 5, G); R(46, 19 + y, 1, 5, G);
    R(49, 19 + y, 5, 1, G); R(49, 23 + y, 5, 1, G); R(49, 19 + y, 1, 5, G); R(53, 19 + y, 1, 5, G);
    R(47, 20 + y, 2, 1, G);
  } else if (s === 3) {
    const H = '#1f1a17';
    R(39, 11 + y, 18, 5, H); R(39, 16 + y, 2, 4, H); R(55, 16 + y, 2, 4, H); R(41, 16 + y, 8, 2, H); R(50, 16 + y, 1, 1, H);
  } else if (s === 4) {
    const H = '#6f6a73';
    R(39, 11 + y, 18, 5, H); R(39, 16 + y, 2, 3, H); R(55, 16 + y, 2, 3, H); R(43, 12 + y, 6, 1, '#a39fa8');
    R(45, 25 + y, 6, 1, '#55505c');
  } else {
    const W = '#f5f3ee', WS = '#d8d4cc';
    R(37, 10 + y, 22, 8, W); R(36, 15 + y, 4, 22, W); R(56, 15 + y, 4, 22, W);
    R(36, 30 + y, 4, 7, WS); R(56, 30 + y, 4, 7, WS);
    R(38, 12 + y, 20, 1, '#151515'); R(38, 14 + y, 20, 1, '#151515');
    R(40, 18 + y, 16, 1, WS);
    R(42, 20 + y, 5, 3, '#111111'); R(49, 20 + y, 5, 3, '#111111'); R(47, 20 + y, 2, 1, '#111111');
    if (f % 12 < 2) { R(43, 20 + y, 1, 1, '#9ee6ff'); R(50, 20 + y, 1, 1, '#9ee6ff'); }
    R(41, 25 + y, 14, 5, '#1b1b1b'); R(46, 26 + y, 4, 1, '#8a4b3a');
  }
}

/* ---------- desks ---------- */
function desk(R, s, f) {
  if (s === 0) {
    R(18, 47, 60, 25, OUT); R(19, 48, 58, 24, '#b5854a'); R(19, 48, 58, 3, '#c99a5a');
    R(45, 48, 6, 24, '#e3cf9b'); R(19, 51, 58, 1, '#9b6f3b');
    R(24, 58, 12, 1, '#6b4a2a'); R(24, 61, 9, 1, '#6b4a2a'); R(60, 56, 1, 8, '#9b6f3b');
  } else if (s === 1) {
    R(10, 47, 76, 4, OUT); R(11, 47, 74, 3, '#d9c7a3'); R(11, 50, 74, 1, '#a8946c');
    R(16, 51, 2, 21, '#7a7f88'); R(78, 51, 2, 21, '#7a7f88'); R(18, 60, 60, 1, '#7a7f88');
  } else if (s === 2) {
    R(9, 46, 78, 26, OUT); R(10, 47, 76, 3, '#b07a47'); R(10, 50, 76, 22, '#8a5a32');
    R(58, 54, 22, 9, OUT); R(59, 55, 20, 7, '#9b663a'); R(66, 58, 6, 1, '#e2c37a');
    R(14, 54, 1, 18, '#7a4d2a');
  } else if (s === 3) {
    R(8, 46, 80, 26, OUT); R(9, 47, 78, 3, '#c3c9d3'); R(9, 50, 78, 22, '#8d96a4');
    R(62, 53, 22, 8, '#7d8694'); R(62, 62, 22, 8, '#7d8694'); R(71, 57, 4, 1, '#dfe4ea'); R(71, 66, 4, 1, '#dfe4ea');
  } else if (s === 4) {
    R(6, 46, 84, 26, OUT); R(7, 47, 82, 3, '#7a3b2b'); R(7, 46, 82, 1, '#d8a944');
    R(7, 50, 82, 22, '#5e2b20');
    for (let i = 0; i < 4; i++) { R(11 + i * 20, 54, 16, 14, '#4f241a'); R(12 + i * 20, 55, 14, 12, '#6e3426'); }
  } else {
    R(5, 46, 86, 26, '#7a5414'); R(6, 47, 84, 3, '#f7d774'); R(6, 50, 84, 22, '#e0a82e');
    for (let x = 10; x < 90; x += 10) { R(x, 56, 2, 2, '#fff1b0'); R(x + 1, 55, 1, 4, '#fff1b0'); R(x - 1, 57, 4, 1, '#fff1b0'); }
    for (let x = 15; x < 90; x += 20) R(x, 63, 3, 3, (f % 10 < 5) ? '#d23b54' : '#ff6a85');
    R(6, 69, 84, 1, '#b8861f');
  }
}

/* ---------- props on the desk ---------- */
function props(R, s, pose, f) {
  const steam = (x, y) => {
    const o = f % 4;
    R(x + (o < 2 ? 0 : 1), y - 3 - (o % 2), 1, 2, 'rgba(255,255,255,.55)');
    R(x + 2 - (o < 2 ? 0 : 1), y - 6 - (o % 2), 1, 2, 'rgba(255,255,255,.4)');
  };
  if (s === 0) {
    R(20, 39, 4, 9, OUT); R(21, 40, 2, 8, '#efe8d6');
    const fl = f % 3;
    R(21, 36 - (fl === 1 ? 1 : 0), 2, 3, '#ff8a2a'); R(21, 37, 1, 2, '#ffd54a');
    R(16, 33, 12, 12, 'rgba(255,190,90,.10)');
    R(68, 41, 8, 7, OUT); R(69, 42, 6, 6, '#9aa3ad'); R(69, 43, 6, 1, '#c3cad2');
    R(70, 41, 2, 1, '#e8c04a'); R(73, 40, 1, 1, '#e8c04a');
  } else if (s === 1) {
    R(66, 39, 11, 9, OUT); R(67, 40, 9, 8, '#f5f0e6'); R(67, 42, 9, 2, '#d94f3d'); R(66, 39, 11, 1, '#c9c3b5');
    if (pose === 'rest') steam(69, 39);
    R(19, 44, 8, 4, OUT); R(20, 45, 6, 2, '#2a2a2a'); R(21, 45, 2, 1, '#5ec2e0');
  } else if (s === 2) {
    R(64, 36, 18, 12, 'rgba(255,230,140,.16)');
    R(68, 30, 11, 5, OUT); R(69, 31, 9, 3, '#3a3a46'); R(70, 34, 7, 1, '#fff2b0');
    R(76, 34, 2, 12, '#3a3a46'); R(72, 45, 10, 3, '#3a3a46');
    R(16, 41, 13, 3, '#c0504d'); R(17, 44, 12, 2, '#4f81bd'); R(16, 46, 13, 2, '#9bbb59');
  } else if (s === 3) {
    R(63, 28, 22, 16, OUT); R(64, 29, 20, 14, '#2b2f3a'); R(65, 30, 18, 11, '#3d7bd9');
    const t = f % 6;
    R(66, 32, 8 + t, 1, '#cfe0ff'); R(66, 34, 12, 1, '#9fc0f5'); R(66, 36, 6 + (5 - t), 1, '#cfe0ff'); R(66, 38, 10, 1, '#9fc0f5');
    R(72, 44, 4, 2, '#2b2f3a'); R(69, 46, 10, 2, '#2b2f3a');
    R(18, 41, 8, 7, OUT); R(19, 42, 6, 6, '#ffffff'); R(25, 43, 2, 3, '#ffffff'); R(19, 42, 6, 1, '#6b3e22');
    if (pose === 'rest') steam(20, 41);
  } else if (s === 4) {
    R(63, 34, 20, 13, OUT); R(64, 35, 18, 11, '#c7cbd4'); R(72, 39, 2, 2, '#ffffff'); R(61, 46, 24, 2, '#8d939e');
    R(16, 42, 18, 6, OUT); R(17, 43, 16, 4, '#d8a944'); R(19, 45, 12, 1, '#4a2a10');
    if (pose === 'rest') { R(36, 44, 5, 1, '#7a4a2a'); R(41, 44, 1, 1, (f % 4 < 2) ? '#ff6a2a' : '#ffb04a'); R(42, 41 - (f % 3), 1, 2, 'rgba(255,255,255,.4)'); }
  } else {
    const gb = (x, y) => { R(x, y, 9, 4, '#a9781c'); R(x + 1, y, 7, 3, '#f3c845'); R(x + 2, y, 4, 1, '#fff1b0'); };
    gb(12, 44); gb(22, 44); gb(17, 40);
    R(66, 36, 13, 12, OUT); R(67, 38, 11, 10, '#5d7a33'); R(70, 35, 5, 3, '#5d7a33'); R(70, 37, 5, 1, '#e3b23c');
    R(71, 40, 3, 1, '#f3c845'); R(71, 42, 3, 1, '#f3c845'); R(71, 44, 3, 1, '#f3c845'); R(70, 41, 1, 1, '#f3c845'); R(74, 43, 1, 1, '#f3c845'); R(72, 39, 1, 7, '#f3c845');
    if (f % 8 < 2) R(14, 42, 1, 1, '#ffffff');
  }
}

/* ---------- arms ---------- */
function armsStudy(R, s, f) {
  const o = outfit(s);
  const sl = o.shirt;
  const dx = [0, 1, 2, 1][f % 4];
  // left arm resting on book
  R(31, 34, 6, 12, OUT); R(32, 35, 4, 11, sl);
  R(32, 42, 10, 5, OUT); R(33, 43, 8, 3, sl); R(40, 42, 4, 5, OUT); R(41, 43, 3, 3, SKIN);
  // right arm writing
  R(59, 34, 6, 12, OUT); R(60, 35, 4, 11, sl);
  R(53 + dx, 42, 10, 5, OUT); R(54 + dx, 43, 8, 3, sl); R(51 + dx, 42, 4, 5, OUT); R(52 + dx, 43, 3, 3, SKIN);
  R(52 + dx, 38, 1, 5, '#f2c14e'); R(52 + dx, 37, 1, 1, '#e8615a'); R(52 + dx, 43, 1, 1, OUT);
  if (s === 5) { R(58 + dx, 43, 2, 3, '#f3c845'); }
  if (s === 4) { R(57 + dx, 43, 1, 3, '#f2f2f2'); }
}
function book(R, s, pose, f) {
  if (pose === 'study') {
    const page = s === 0 ? '#e6dcc0' : '#f7f3e8';
    R(33, 43, 30, 6, OUT); R(34, 44, 13, 4, page); R(49, 44, 13, 4, page); R(47, 43, 2, 6, '#8a7f9a');
    R(44, 45, 2, 1, '#b9b0c4'); R(50, 45, 4, 1, '#b9b0c4'); R(50, 47, 3, 1, '#b9b0c4');
    if (f % 24 < 2) R(49, 42, 6, 2, page); // page flip
  } else {
    R(40, 44, 16, 4, OUT); R(41, 44, 14, 3, ['#8a6a4a', '#4f81bd', '#c0504d', '#2f5fb3', '#2c2f3d', '#e3b23c'][s]);
    R(41, 47, 14, 1, '#f7f3e8');
  }
}
function armsRest(R, s) {
  const o = outfit(s);
  const sl = o.shirt;
  R(31, 22, 7, 14, OUT); R(32, 23, 5, 12, sl);
  R(34, 14, 6, 10, OUT); R(35, 15, 4, 9, sl);
  R(58, 22, 7, 14, OUT); R(59, 23, 5, 12, sl);
  R(56, 14, 6, 10, OUT); R(57, 15, 4, 9, sl);
}

function zzz(R, f) {
  const Z = (x, y, c) => { R(x, y, 4, 1, c); R(x + 2, y + 1, 1, 1, c); R(x + 1, y + 2, 1, 1, c); R(x, y + 3, 4, 1, c); };
  const t = f % 12;
  Z(62, 12 - Math.floor(t / 3), 'rgba(239,231,210,.9)');
  if (t > 4) Z(68, 7 - Math.floor((t - 4) / 3), 'rgba(239,231,210,.6)');
}

// sil: optional solid color for the character only (evolution flashes, locked dex entries)
let CHAR_STYLE = 'chibi';
// plain: draw the stage's own background with no collected background/items (dex, splash montage, evolution)
function drawScene(ctx, s, pose, f, sil, style, plain) {
  const st = style || CHAR_STYLE;
  plain = plain || !!sil;
  if (st !== 'classic' && typeof drawCuteScene === 'function') return drawCuteScene(ctx, st, s, pose, f, sil, plain);
  const R = makeR(ctx);
  const C = sil ? makeR(ctx, sil) : R;
  ctx.clearRect(0, 0, SW, SH);
  sceneBack(R, ctx, s, f, plain);
  if (pose === 'rest') {
    const dy = f % 16 < 8 ? 0 : -1;
    armsRest(C, s);
    torso(C, s, 0);
    head(C, s, 'rest', f, dy - 1);
    hair(C, s, 'rest', f, dy - 1);
    desk(R, s, f);
    book(R, s, 'rest', f);
    props(R, s, 'rest', f);
    if (!sil) zzz(R, f);
  } else {
    const dy = pose === 'study' ? (f % 8 < 4 ? 0 : 1) : 0;
    torso(C, s, 0);
    head(C, s, pose, f, dy);
    hair(C, s, pose, f, dy);
    desk(R, s, f);
    book(R, s, 'study', f);
    props(R, s, 'study', f);
    armsStudy(C, s, pose === 'study' ? f : 0);
  }
  sceneFront(R, ctx, f, plain);
}

function makeSceneCanvas(canvas, scale = 6) {
  canvas.width = SW * scale; canvas.height = SH * scale;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  return ctx;
}
