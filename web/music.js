/* ===== Music engine =====
   Everything is synthesized live with WebAudio (no audio files, works offline).
   'title' = 8-bit theme for launch / home / breaks. Others = study sounds. */
const TRACKS = [
  { id: 'none',     name: '없음',          kind: '',     desc: '조용히 집중' },
  { id: 'lofi',     name: '로파이',        kind: '음악', desc: '느린 비트, 따뜻한 건반' },
  { id: 'piano',    name: '피아노',        kind: '음악', desc: '잔잔한 앰비언트 피아노' },
  { id: 'musicbox', name: '오르골',        kind: '음악', desc: '맑은 오르골 멜로디' },
  { id: 'chip',     name: '8비트',         kind: '음악', desc: '차분한 게임 음악' },
  { id: 'rain',     name: '빗소리',        kind: '자연', desc: '창밖에 비 오는 소리' },
  { id: 'waves',    name: '파도',          kind: '자연', desc: '밀려왔다 빠지는 파도' },
  { id: 'fire',     name: '모닥불',        kind: '자연', desc: '타닥타닥 장작 소리' },
  { id: 'white',    name: '화이트 노이즈', kind: '노이즈', desc: '쏴아- 고른 잡음' },
  { id: 'pink',     name: '핑크 노이즈',   kind: '노이즈', desc: '화이트보다 부드러운 소리' },
  { id: 'brown',    name: '브라운 노이즈', kind: '노이즈', desc: '낮고 묵직한 잡음' },
];
const trackName = id => (TRACKS.find(t => t.id === id) || TRACKS[0]).name;

const Music = (() => {
  let cur = null, curId = null, master = null, bufs = null, vol = 0.7;

  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const NF = n => { const m = /^([A-G])(#?)(\d)$/.exec(n); const midi = (+m[3] + 1) * 12 + NOTE[m[1]] + (m[2] ? 1 : 0); return 440 * Math.pow(2, (midi - 69) / 12); };

  function noise(a) {
    if (bufs && bufs.ctx === a) return bufs;
    const len = a.sampleRate * 4, mk = () => a.createBuffer(1, len, a.sampleRate);
    const w = mk(), p = mk(), b = mk();
    const wd = w.getChannelData(0), pd = p.getChannelData(0), bd = b.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < len; i++) {
      const x = Math.random() * 2 - 1;
      wd[i] = x;
      b0 = 0.99886 * b0 + x * 0.0555179; b1 = 0.99332 * b1 + x * 0.0750759; b2 = 0.969 * b2 + x * 0.153852;
      b3 = 0.8665 * b3 + x * 0.3104856; b4 = 0.55 * b4 + x * 0.5329522; b5 = -0.7616 * b5 - x * 0.016898;
      pd[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + x * 0.5362) * 0.11; b6 = x * 0.115926;
      last = (last + 0.02 * x) / 1.02; bd[i] = last * 3.5;
    }
    const N = 4000; // smooth the loop seam
    for (const d of [wd, pd, bd]) for (let i = 0; i < N; i++) { const k = i / N; d[len - N + i] = d[len - N + i] * (1 - k) + d[i] * k; }
    bufs = { ctx: a, white: w, pink: p, brown: b };
    return bufs;
  }

  /* --- instruments --- */
  function tone(a, dest, type, f, t, dur, v, atk = 0.005, rel = 0.05) {
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + atk);
    g.gain.setValueAtTime(v, t + Math.max(atk, dur - rel)); g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.03);
  }
  function bell(a, dest, f, t, decay, v, partials = [[1, 1], [2, 0.3], [3, 0.12]]) {
    for (const [mul, amp] of partials) {
      const o = a.createOscillator(), g = a.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(f * mul, t);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * amp, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay / mul);
      o.connect(g); g.connect(dest); o.start(t); o.stop(t + decay / mul + 0.05);
    }
  }
  function hit(a, dest, buf, t, dur, v, ftype, freq, q = 0.8) {
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = buf; f.type = ftype; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest);
    s.start(t, Math.random() * 3); s.stop(t + dur + 0.03);
  }
  function kick(a, dest, t, v) {
    const o = a.createOscillator(), g = a.createGain();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.13);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.3);
  }
  function loopNoise(a, T, buf, dest, v, ftype, freq) {
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = buf; s.loop = true; f.type = ftype; f.frequency.value = freq; g.gain.value = v;
    s.connect(f); f.connect(g); g.connect(dest); s.start();
    T.nodes.push(s);
    return { s, f, g };
  }
  // lookahead step sequencer
  function seq(a, T, stepDur, steps, fn) {
    if (a.__end) { // offline render: lay out the whole piece up front
      for (let k = 0; k * stepDur < a.__end; k++) fn(k % steps, k * stepDur);
      return;
    }
    let next = a.currentTime + 0.08, step = 0;
    const run = () => {
      if (next < a.currentTime - 0.05) next = a.currentTime + 0.05;
      // hidden pages (screen off) get their timers throttled to ~1/s, so schedule further ahead
      const look = document.hidden ? 1.6 : 0.25;
      while (next < a.currentTime + look) { fn(step, next); next += stepDur; step = (step + 1) % steps; }
    };
    run();
    T.timers.push(setInterval(run, 40));
  }
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  /* --- tracks --- */
  const BUILD = {
    title(a, out, T) { // 8-bit theme, 120bpm, 8 bars of eighths
      const n = noise(a);
      const lead = ('E5 - G5 - C6 - B5 - A5 - - G5 E5 - C5 - F5 - A5 - C6 - A5 G5 G5 - - - D5 - G5 - ' +
                    'E5 - G5 - C6 - D6 - E6 - D6 C6 A5 - C6 - D6 - C6 A5 B5 - G5 - C6 - - - . . G5 -').split(' ');
      const roots = ['C', 'A', 'F', 'G', 'C', 'A', 'D', 'C'];
      const E = 0.25;
      seq(a, T, E, 64, (i, t) => {
        const tok = lead[i];
        if (tok !== '-' && tok !== '.') {
          let len = 1; while (lead[(i + len) % 64] === '-' && len < 8) len++;
          tone(a, out, 'square', NF(tok), t, len * E - 0.02, 0.038);
        }
        const bar = Math.floor(i / 8), s = i % 8;
        const r = bar === 6 && s >= 4 ? 'G' : roots[bar];
        tone(a, out, 'triangle', NF(r + (s % 4 === 2 ? '3' : '2')), t, E * 0.9, 0.11);
        if (s === 0 || s === 4) kick(a, out, t, 0.22);
        if (s === 2 || s === 6) hit(a, out, n.white, t, 0.12, 0.05, 'bandpass', 1800);
        hit(a, out, n.white, t + (s % 2 ? 0.02 : 0), 0.03, 0.018, 'highpass', 7500);
      });
    },
    lofi(a, out, T) {
      const n = noise(a);
      const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600; lp.connect(out);
      const S16 = 60 / 74 / 4;
      const chords = [['F4', 'A4', 'C5', 'E5'], ['E4', 'G4', 'B4', 'D5'], ['D4', 'F4', 'A4', 'C5'], ['C4', 'E4', 'G4', 'B4']];
      const bass = ['F2', 'E2', 'D2', 'C2'];
      const scale = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6'];
      loopNoise(a, T, n.pink, out, 0.012, 'highpass', 1200); // vinyl hiss
      seq(a, T, S16, 64, (i, t) => {
        const bar = Math.floor(i / 16), s = i % 16;
        const sw = (s % 4 === 2) ? S16 * 0.18 : 0;
        if (s === 0 || s === 10) chords[bar].forEach((nn, k) => bell(a, lp, NF(nn), t + k * 0.012, s === 0 ? 3.2 : 1.8, s === 0 ? 0.045 : 0.03, [[1, 1], [2, 0.18]]));
        if (s === 0 || s === 7 || s === 10) tone(a, lp, 'sine', NF(bass[bar]), t, S16 * (s === 0 ? 5 : 2.5), 0.17, 0.01, 0.12);
        if (s === 0 || s === 7 || s === 10) kick(a, lp, t, 0.3);
        if (s === 4 || s === 12) hit(a, lp, n.white, t, 0.16, 0.06, 'bandpass', 1400, 0.6);
        if (s % 2 === 0) hit(a, out, n.white, t + sw, 0.035, 0.014, 'highpass', 8000);
        if ((s === 2 || s === 6 || s === 8 || s === 14) && Math.random() < 0.28) bell(a, lp, NF(pick(scale)), t + sw, 1.6, 0.03);
        if (Math.random() < 0.06) hit(a, out, n.white, t + Math.random() * S16, 0.006, 0.05, 'highpass', 3000);
      });
    },
    rain(a, out, T) {
      const n = noise(a);
      loopNoise(a, T, n.pink, out, 0.55, 'lowpass', 2800);
      loopNoise(a, T, n.brown, out, 0.35, 'lowpass', 500);
      const hiss = loopNoise(a, T, n.white, out, 0.035, 'highpass', 5000);
      const lfo = a.createOscillator(), lg = a.createGain();
      lfo.frequency.value = 0.07; lg.gain.value = 0.015; lfo.connect(lg); lg.connect(hiss.g.gain); lfo.start(); T.nodes.push(lfo);
      seq(a, T, 0.05, 20, (i, t) => {
        if (Math.random() < 0.3) hit(a, out, n.white, t + Math.random() * 0.05, 0.025, 0.04 + Math.random() * 0.05, 'bandpass', 2000 + Math.random() * 3000, 1.5);
        if (Math.random() < 0.05) bell(a, out, 1800 + Math.random() * 2400, t, 0.08, 0.012, [[1, 1]]);
        if (Math.random() < 0.0006) {
          const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
          s.buffer = n.brown; f.type = 'lowpass'; f.frequency.value = 180;
          g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.9, t + 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + 4);
          s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random()); s.stop(t + 4.1);
        }
      });
    },
    piano(a, out, T) {
      const dl = a.createDelay(1), fb = a.createGain(), wet = a.createGain(), dlp = a.createBiquadFilter();
      dl.delayTime.value = 0.42; fb.gain.value = 0.38; wet.gain.value = 0.4; dlp.type = 'lowpass'; dlp.frequency.value = 2200;
      dl.connect(dlp); dlp.connect(fb); fb.connect(dl); dlp.connect(wet); wet.connect(out);
      const bus = a.createGain(); bus.connect(out); bus.connect(dl);
      const prog = [
        { root: 'C3', tones: ['C4', 'E4', 'G4', 'B4', 'D5', 'E5', 'G5'] },
        { root: 'A2', tones: ['A3', 'C4', 'E4', 'G4', 'C5', 'E5', 'A5'] },
        { root: 'F2', tones: ['F3', 'A3', 'C4', 'E4', 'A4', 'C5', 'E5'] },
        { root: 'G2', tones: ['G3', 'B3', 'D4', 'E4', 'G4', 'B4', 'D5'] },
      ];
      let lastNote = null;
      seq(a, T, 0.3, 64, (i, t) => {
        const c = prog[Math.floor(i / 16)], s = i % 16;
        if (s === 0) { bell(a, bus, NF(c.root), t, 5, 0.07); bell(a, bus, NF(c.tones[0]), t + 0.03, 4, 0.03); }
        const p = s === 0 ? 0 : s % 4 === 0 ? 0.55 : 0.22;
        if (Math.random() < p) {
          let nn; do { nn = pick(c.tones.slice(2)); } while (nn === lastNote);
          lastNote = nn;
          bell(a, bus, NF(nn), t + Math.random() * 0.04, 3, 0.05);
        }
      });
    },
    musicbox(a, out, T) {
      const dl = a.createDelay(1), fb = a.createGain(); dl.delayTime.value = 0.36; fb.gain.value = 0.28;
      const bus = a.createGain(); bus.connect(out); bus.connect(dl); dl.connect(fb); fb.connect(dl); fb.connect(out);
      const mel = ('E6 G6 C7 G6 E6 G6 C7 G6 F6 A6 C7 A6 F6 A6 C7 A6 D6 G6 B6 G6 D6 G6 B6 G6 E6 G6 C7 E7 D7 C7 B6 G6').split(' ');
      const low = ['C5', 'F4', 'G4', 'C5'];
      const tine = [[1, 1], [4.2, 0.12], [2, 0.08]];
      seq(a, T, 0.32, 32, (i, t) => {
        bell(a, bus, NF(mel[i]), t, 1.9, i % 2 ? 0.035 : 0.05, tine);
        if (i % 8 === 0) bell(a, bus, NF(low[i / 8]), t, 2.6, 0.045, tine);
      });
    },
    chip(a, out, T) {
      const prog = [['A3', 'C4', 'E4'], ['F3', 'A3', 'C4'], ['C4', 'E4', 'G4'], ['G3', 'B3', 'D4']];
      const roots = ['A2', 'F2', 'C3', 'G2'];
      const pent = ['A4', 'C5', 'D5', 'E5', 'G5', 'A5'];
      const E = 0.31;
      seq(a, T, E, 32, (i, t) => {
        const c = prog[Math.floor(i / 8)], s = i % 8;
        const up = [0, 1, 2, 1, 0, 1, 2, 1][s];
        tone(a, out, 'triangle', NF(c[up]) * 2, t, E * 0.8, 0.05);
        if (s === 0 || s === 4) tone(a, out, 'triangle', NF(roots[Math.floor(i / 8)]), t, E * 3.6, 0.09, 0.01, 0.2);
        if ((s === 0 || s === 3 || s === 6) && Math.random() < 0.4) tone(a, out, 'square', NF(pick(pent)), t, E * (s === 6 ? 2 : 1.5), 0.018, 0.02, 0.1);
      });
    },
    waves(a, out, T) {
      const n = noise(a);
      [[n.pink, 0.0, 0.09], [n.brown, Math.PI, 0.06]].forEach(([buf, ph, rate]) => {
        const l = loopNoise(a, T, buf, out, 0.32, 'lowpass', 900);
        const lfo = a.createOscillator(), g1 = a.createGain(), g2 = a.createGain();
        lfo.frequency.value = rate; g1.gain.value = 0.28; g2.gain.value = 700;
        lfo.connect(g1); g1.connect(l.g.gain); lfo.connect(g2); g2.connect(l.f.frequency);
        lfo.start(a.currentTime + ph); T.nodes.push(lfo);
      });
      loopNoise(a, T, n.white, out, 0.02, 'highpass', 6000);
    },
    fire(a, out, T) {
      const n = noise(a);
      loopNoise(a, T, n.brown, out, 0.55, 'lowpass', 320);
      loopNoise(a, T, n.pink, out, 0.04, 'highpass', 1800);
      seq(a, T, 0.03, 32, (i, t) => {
        if (Math.random() < 0.12) hit(a, out, n.white, t + Math.random() * 0.03, 0.006 + Math.random() * 0.02, 0.04 + Math.random() * 0.18, 'highpass', 2200 + Math.random() * 3000);
        if (Math.random() < 0.008) hit(a, out, n.white, t, 0.07, 0.35, 'bandpass', 700 + Math.random() * 500, 1.2);
      });
    },
    white(a, out, T) { loopNoise(a, T, noise(a).white, out, 0.16, 'lowpass', 9000); },
    pink(a, out, T) { loopNoise(a, T, noise(a).pink, out, 0.5, 'lowpass', 12000); },
    brown(a, out, T) {
      const n = noise(a);
      const l = loopNoise(a, T, n.brown, out, 0.75, 'lowpass', 900);
      const lfo = a.createOscillator(), lg = a.createGain();
      lfo.frequency.value = 0.05; lg.gain.value = 180; lfo.connect(lg); lg.connect(l.f.frequency); lfo.start(); T.nodes.push(lfo);
    },
  };

  function stopT(a, T) {
    const t = a.currentTime;
    T.g.gain.cancelScheduledValues(t); T.g.gain.setValueAtTime(T.g.gain.value, t); T.g.gain.linearRampToValueAtTime(0, t + 0.7);
    T.timers.forEach(clearInterval); T.timers = [];
    setTimeout(() => { T.nodes.forEach(nd => { try { nd.stop(); } catch (e) {} }); try { T.g.disconnect(); } catch (e) {} }, 900);
  }

  /* --- offline loops for the iPhone app ---
     WKWebView stops Web Audio once the app is in the background, so on iPhone each track is rendered
     once into a seamless WAV loop and played by the native player (keeps going on the lock screen).
     P = pre-roll so echoes/tails are already ringing at the loop start, L = loop length (whole bars /
     LFO periods), the last X seconds cross-fade into the pre-roll so the seam is continuous. */
  const LOOPSPEC = (() => {
    const lofi = 64 * 60 / 74 / 4;
    return {
      title: [16, 64], lofi: [lofi, lofi * 5], piano: [19.2, 57.6], musicbox: [10.24, 61.44], chip: [9.92, 59.52],
      rain: [4, 4 / 0.07], waves: [4, 200 / 3], fire: [4.8, 62.4],
      white: [4, 20, true], pink: [4, 20, true], brown: [4, 20, true],
    };
  })();
  const LEVEL = { piano: 2.3, musicbox: 2.5, chip: 1.2, rain: 0.65, waves: 0.62, brown: 0.66, fire: 0.9, white: 1.2 };
  function wavB64(f, sr) {
    const n = f.length, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
    const w = (o, str) => { for (let i = 0; i < str.length; i++) v.setUint8(o + i, str.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true);
    v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true);
    v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, f[i])) * 32767, true);
    const u8 = new Uint8Array(buf); let bin = '';
    for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  function renderLoop(id, sr = 24000) {
    const spec = LOOPSPEC[id], OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!spec || !BUILD[id] || !OAC) return Promise.reject(new Error('no-loop'));
    const [P, L, linear] = spec, X = Math.min(2, P);
    const a = new OAC(1, Math.ceil((P + L) * sr), sr);
    a.__end = P + L;
    const g = a.createGain(); g.gain.value = LEVEL[id] || 1; g.connect(a.destination);
    BUILD[id](a, g, { g, timers: [], nodes: [] });
    return a.startRendering().then(rb => {
      const d = rb.getChannelData(0), p0 = Math.round(P * sr), n = Math.round(L * sr), x = Math.round(X * sr);
      const out = d.slice(p0, p0 + n);
      for (let j = 0; j < x; j++) {
        const i = n - x + j, k = j / x;
        const fo = linear ? 1 - k : Math.cos(k * Math.PI / 2), fi = linear ? k : Math.sin(k * Math.PI / 2);
        out[i] = d[p0 + i] * fo + d[p0 - x + j] * fi;
      }
      let peak = 0; for (let i = 0; i < n; i++) { const m = Math.abs(out[i]); if (m > peak) peak = m; }
      if (peak > 0.97) { const k = 0.97 / peak; for (let i = 0; i < n; i++) out[i] *= k; }
      return wavB64(out, sr);
    });
  }

  return {
    render: renderLoop,
    play(id, ctxGetter) {
      if (!id || id === 'none') id = null;
      if (id === curId) return;
      const a = ctxGetter(); if (!a) return;
      if (!master) { master = a.createGain(); master.gain.value = vol; master.connect(a.destination); }
      if (cur) stopT(a, cur);
      cur = null; curId = id;
      if (!id || !BUILD[id]) return;
      const g = a.createGain(); g.gain.setValueAtTime(0, a.currentTime); g.gain.linearRampToValueAtTime(LEVEL[id] || 1, a.currentTime + 1.2); g.connect(master);
      const T = { g, timers: [], nodes: [] };
      try { BUILD[id](a, g, T); cur = T; } catch (e) { curId = null; }
    },
    setVolume(v, ctxGetter) { vol = v; const a = ctxGetter(); if (master && a) master.gain.setTargetAtTime(v, a.currentTime, 0.1); },
    current: () => curId,
  };
})();
