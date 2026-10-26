/* ================= Flashcards =================
   S.decks = [{ id, name, labels:[3], pos, cards:[{ id, f:[3], unknown, miss, seen }] }]
   S.fc    = { order: 'random'|'seq', size: 10|20|30|0(all) } */
var FC_DEFAULT_LABELS = ['키워드', '요약', '의미'];
var fcDeckId = null;     // deck open in the 카드 tab
var fcRun = null;        // running study session

function fcDecks() { if (!Array.isArray(S.decks)) S.decks = []; return S.decks; }
function fcDeck(id) { return fcDecks().find(d => d.id === id); }
function fcPrefs() { if (!S.fc) S.fc = { order: 'random', size: 10 }; return S.fc; }
function fcUnknownCount(d) { return d.cards.filter(c => c.unknown).length; }
function fcAllUnknown() { return fcDecks().reduce((a, d) => a + fcUnknownCount(d), 0); }
// spaced review: each card keeps a box (0..5); answering moves it and sets the next review day
var FC_GAPS = [1, 1, 3, 7, 14, 30];
function fcToday() { return dayKey(Date.now()); }
function fcIsDue(c) { return !!c.due && c.due <= fcToday(); }
function fcDueCount(d) { return d.cards.filter(fcIsDue).length; }
function fcAllDue() { return fcDecks().reduce((a, d) => a + fcDueCount(d), 0); }
function fcScopeCount(d, scope) {
  const list = d ? [d] : fcDecks();
  return list.reduce((a, x) => a + (scope === 'unknown' ? fcUnknownCount(x) : scope === 'due' ? fcDueCount(x) : x.cards.length), 0);
}
function fcSizeClass(txt) { const n = Array.from(String(txt || '')).length; return n <= 8 ? '' : n <= 16 ? 'l2' : n <= 40 ? 'l3' : 'l4'; }

/* ---------- 카드 tab ---------- */
function renderCards() {
  const d = fcDeckId && fcDeck(fcDeckId);
  if (!d) { fcDeckId = null; return renderDeckList(); }
  renderDeckView(d);
}
function renderDeckList() {
  const decks = fcDecks(), unk = fcAllUnknown(), due = fcAllDue();
  $('#view').innerHTML = `
  <div class="stack">
    <div class="row between"><h2 class="h">플래시카드</h2><button class="btn gold sm" id="fcNew">+ 새 묶음</button></div>
    ${due ? `<button class="btn gold block" id="fcAllDue">오늘 복습할 카드 · ${due}장</button>` : ''}
    ${unk ? `<button class="btn red block" id="fcAllUnk">모르는 카드 전체 복습 · ${unk}장</button>` : ''}
    ${decks.length ? decks.map(d => `
      <button class="px item" data-deck="${d.id}" style="text-align:left;width:calc(100% - 6px)">
        <span class="grow"><span style="display:block">${esc(d.name)}</span>
        <span class="small muted num">${d.cards.length}장${fcDueCount(d) ? ` · <span style="color:var(--gold)">복습 ${fcDueCount(d)}</span>` : ''}${fcUnknownCount(d) ? ` · <span style="color:var(--red)">모름 ${fcUnknownCount(d)}</span>` : ''} · ${esc(d.labels.join(' / '))}</span></span>
        <span class="small muted">열기</span></button>`).join('')
      : `<div class="px empty">아직 카드 묶음이 없어요.<br>새 묶음을 만들거나 엑셀 파일로 한 번에 만들 수 있어요.</div>`}
    <button class="btn block" id="fcXl">엑셀로 새 묶음 만들기</button>
    <p class="small muted" style="margin:0;line-height:1.7">엑셀은 열이 딱 3개여야 해요. 첫 줄은 제목줄(예: 키워드 / 요약 / 의미)로 보고, 둘째 줄부터 카드가 돼요. .xlsx 와 .csv 를 올릴 수 있어요.</p>
  </div>`;
  $('#fcNew').onclick = () => fcDeckEdit(null);
  $('#fcXl').onclick = () => fcPickFile(null);
  if ($('#fcAllUnk')) $('#fcAllUnk').onclick = () => fcSetup(null, 'unknown');
  if ($('#fcAllDue')) $('#fcAllDue').onclick = () => fcSetup(null, 'due');
  $$('[data-deck]').forEach(b => b.onclick = () => fcOpenDeck(b.dataset.deck));
}
function fcOpenDeck(id) {
  fcDeckId = id;
  if (!layers.some(l => l.kind === 'deck')) pushLayer('deck', () => { fcDeckId = null; if (curTab === 'cards') render(); });
  render(); $('#view').scrollTop = 0;
}
function fcCloseDeck() {
  const top = layers[layers.length - 1];
  if (top && top.kind === 'deck') popLayerUI(); else { fcDeckId = null; render(); }
}
function renderDeckView(d) {
  const unk = fcUnknownCount(d), due = fcDueCount(d), L = d.labels;
  $('#view').innerHTML = `
  <div class="stack">
    <div class="row between"><button class="btn sm ghost" id="fcBack">← 묶음 목록</button><button class="btn sm" id="fcMore">묶음 설정</button></div>
    <div><h2 class="h" style="font-size:20px">${esc(d.name)}</h2>
      <div class="small muted num">${d.cards.length}장 · 오늘 복습 ${due}장 · 모름 ${unk}장 · ${esc(L.join(' / '))}</div></div>
    <button class="btn gold block start" id="fcStart" ${d.cards.length ? '' : 'disabled'}><span class="arrow">▶</span>&nbsp;학습 시작</button>
    <div class="row" style="gap:10px">
      <button class="btn grow ${due ? 'gold' : ''}" id="fcDue" ${due ? '' : 'disabled'}>오늘 복습 ${due}</button>
      <button class="btn grow" id="fcUnk" ${unk ? '' : 'disabled'}>모르는 카드 ${unk}</button>
    </div>
    <div class="row" style="gap:10px">
      <button class="btn grow" id="fcAdd">+ 카드</button>
      <button class="btn grow" id="fcUp">엑셀 올리기</button>
      <button class="btn grow" id="fcDown" ${d.cards.length ? '' : 'disabled'}>내보내기</button>
    </div>
    <div class="px card stack" style="gap:0;padding:4px 12px">
      ${d.cards.length ? d.cards.map((c, i) => `
        <button class="fc-row" data-card="${c.id}">
          <span class="num muted small" style="min-width:26px">${i + 1}</span>
          <span class="grow" style="min-width:0"><span class="fc-k">${esc(c.f[0])}${c.unknown ? ' <span class="tag" style="background:var(--red)">모름</span>' : ''}</span>
          <span class="fc-s">${esc(c.f[1])}</span></span><span class="small muted num" style="text-align:right">${c.seen ? '+' + c.seen : ''}${c.due ? `<br><span style="color:${fcIsDue(c) ? 'var(--gold)' : 'var(--mute)'}">${fcIsDue(c) ? '복습' : c.due.slice(5).replace('-', '/')}</span>` : ''}</span></button>`).join('')
        : `<div class="empty">카드가 없어요. + 카드 로 하나씩 넣거나 엑셀로 한 번에 올려 보세요.</div>`}
    </div>
  </div>`;
  $('#fcBack').onclick = fcCloseDeck;
  $('#fcMore').onclick = () => fcDeckEdit(d.id);
  $('#fcStart').onclick = () => fcSetup(d.id, 'all');
  $('#fcUnk').onclick = () => fcSetup(d.id, 'unknown');
  $('#fcDue').onclick = () => fcSetup(d.id, 'due');
  $('#fcDown').onclick = () => fcExport(d);
  $('#fcAdd').onclick = () => fcCardEdit(d.id, null);
  $('#fcUp').onclick = () => fcPickFile(d.id);
  $$('[data-card]').forEach(b => b.onclick = () => fcCardEdit(d.id, b.dataset.card));
}

/* ---------- deck create / settings ---------- */
function fcDeckEdit(id) {
  const d = id ? fcDeck(id) : null;
  const L = d ? d.labels : FC_DEFAULT_LABELS;
  openSheet(`<h2 class="sheet-title">${d ? '묶음 설정' : '새 카드 묶음'} <button class="btn sm ghost" data-close>닫기</button></h2>
    <form class="stack" id="dkForm">
      <label class="field"><span class="label">묶음 이름</span><input class="input" id="dkName" maxlength="30" required placeholder="예: 물류관리사 용어" value="${d ? esc(d.name) : ''}"></label>
      <div class="field"><span class="label">항목 이름 (카드 앞면 · 뒷면 두 줄)</span>
        <div class="stack" style="gap:6px">${[0, 1, 2].map(i => `<input class="input" id="dkL${i}" maxlength="12" value="${esc(L[i])}" placeholder="${FC_DEFAULT_LABELS[i]}">`).join('')}</div></div>
      <button class="btn gold block" type="submit">${d ? '저장' : '만들기'}</button>
      ${d ? `<div class="row" style="gap:10px"><button type="button" class="btn grow" id="dkReset">모름 표시 모두 지우기</button><button type="button" class="btn red grow" id="dkDel">묶음 삭제</button></div>` : ''}
    </form>`, p => {
    $('#dkForm', p).onsubmit = e => {
      e.preventDefault();
      const name = $('#dkName', p).value.trim(); if (!name) return;
      const labels = [0, 1, 2].map(i => $('#dkL' + i, p).value.trim() || FC_DEFAULT_LABELS[i]);
      if (d) { d.name = name; d.labels = labels; save(); closeSheet(); render(); toast('저장했어요'); return; }
      const nd = { id: 'd' + uid(), name, labels, pos: 0, cards: [] };
      fcDecks().push(nd); save(); closeSheet(); setTimeout(() => fcOpenDeck(nd.id), 120);
    };
    if (d) {
      $('#dkReset', p).onclick = () => { d.cards.forEach(c => { c.unknown = false; }); save(); closeSheet(); render(); toast('모름 표시를 지웠어요'); };
      $('#dkDel', p).onclick = () => confirmSheet('묶음 삭제', `"${esc(d.name)}" 묶음과 카드 ${d.cards.length}장을 지울까요? 되돌릴 수 없어요.`, '삭제', true, () => {
        S.decks = fcDecks().filter(x => x.id !== d.id); save(); fcCloseDeck(); toast('묶음을 지웠어요');
      });
    }
  });
}

/* ---------- card add / edit ---------- */
function fcCardEdit(deckId, cardId) {
  const d = fcDeck(deckId); if (!d) return;
  const c = cardId ? d.cards.find(x => x.id === cardId) : null;
  const L = d.labels;
  openSheet(`<h2 class="sheet-title">${c ? '카드 편집' : '카드 추가'} <button class="btn sm ghost" data-close>닫기</button></h2>
    <form class="stack" id="cdForm">
      ${[0, 1, 2].map(i => `<label class="field"><span class="label">${esc(L[i])}</span>
        <textarea class="input fc-ta" id="cdF${i}" rows="${i ? 3 : 1}" ${i ? '' : 'required'}>${c ? esc(c.f[i]) : ''}</textarea></label>`).join('')}
      ${c ? `<div class="row" style="gap:10px"><button type="button" class="btn red grow" id="cdDel">삭제</button><button class="btn gold grow" type="submit">저장</button></div>`
          : `<div class="row" style="gap:10px"><button type="button" class="btn grow" id="cdMore">저장하고 계속</button><button class="btn gold grow" type="submit">저장</button></div>`}
    </form>`, p => {
    const read = () => [0, 1, 2].map(i => $('#cdF' + i, p).value.trim());
    const store = () => {
      const f = read(); if (!f[0]) { toast(`${L[0]}은(는) 꼭 넣어 주세요`); return false; }
      if (c) c.f = f; else d.cards.push({ id: 'k' + uid(), f, unknown: false, miss: 0, seen: 0 });
      save(); return true;
    };
    $('#cdForm', p).onsubmit = e => { e.preventDefault(); if (store()) { closeSheet(); render(); toast(c ? '저장했어요' : '카드를 추가했어요'); } };
    if (c) $('#cdDel', p).onclick = () => { d.cards = d.cards.filter(x => x.id !== c.id); save(); closeSheet(); render(); toast('카드를 지웠어요'); };
    else $('#cdMore', p).onclick = () => { if (store()) { [0, 1, 2].forEach(i => { $('#cdF' + i, p).value = ''; }); $('#cdF0', p).focus(); toast(`추가했어요 · 지금 ${d.cards.length}장`); render(); } };
    if (!c) setTimeout(() => { try { $('#cdF0', p).focus(); } catch (e) {} }, 60);
  });
}

/* ---------- Excel / CSV import ---------- */
function fcPickFile(deckId) {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = '.xlsx,.csv,.tsv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv';
  inp.style.display = 'none';
  document.body.appendChild(inp);
  inp.onchange = async () => {
    const file = inp.files && inp.files[0];
    inp.remove();
    if (!file) return;
    try {
      const rows = await fcReadRows(file);
      fcImportPreview(deckId, file.name, rows);
    } catch (e) { fcImportError(e && e.message ? e.message : '파일을 읽지 못했어요'); }
  };
  inp.click();
}
function fcImportError(msg) {
  openSheet(`<h2 class="sheet-title">올릴 수 없어요 <button class="btn sm ghost" data-close>닫기</button></h2>
    <div class="stack" style="gap:10px"><p style="margin:0;line-height:1.7">${esc(msg)}</p>
    <div class="px card small" style="line-height:1.8">이런 모양이면 돼요<br>
      <span class="num">A열 키워드 · B열 요약 · C열 의미</span><br>
      <span class="muted">SCM · 공급망관리 · 공급망 전체 최적화</span></div>
    <button class="btn gold block" data-close>확인</button></div>`);
}
async function fcReadRows(file) {
  const name = file.name.toLowerCase();
  const buf = new Uint8Array(await file.arrayBuffer());
  if (name.endsWith('.xls')) throw new Error('예전 엑셀 형식(.xls)은 못 읽어요. 엑셀에서 "다른 이름으로 저장 → .xlsx"로 바꿔서 올려 주세요.');
  const isZip = buf[0] === 0x50 && buf[1] === 0x4b;
  if (isZip) return fcParseXlsx(buf);
  if (name.endsWith('.csv') || name.endsWith('.tsv') || name.endsWith('.txt')) return fcParseCsv(buf, name.endsWith('.tsv'));
  throw new Error('엑셀(.xlsx)이나 CSV 파일만 올릴 수 있어요.');
}
function fcParseCsv(buf, tsv) {
  let text = new TextDecoder('utf-8').decode(buf);
  if (text.includes(String.fromCharCode(0xFFFD))) { try { text = new TextDecoder('euc-kr').decode(buf); } catch (e) {} }
  text = text.replace(/^\uFEFF/, '');
  const delim = tsv || (!text.includes(',') && text.includes('\t')) ? '\t' : ',';
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === delim) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
function fcParseXlsx(buf) {
  if (typeof fflate === 'undefined') throw new Error('엑셀 읽기 도구가 없어요.');
  let files;
  try { files = fflate.unzipSync(buf, { filter: f => f.name.startsWith('xl/') }); }
  catch (e) { throw new Error('엑셀 파일이 손상됐거나 암호가 걸려 있어요.'); }
  const dec = new TextDecoder('utf-8');
  const xml = path => { const b = files[path]; return b ? new DOMParser().parseFromString(dec.decode(b), 'application/xml') : null; };
  const tags = (doc, t) => doc ? Array.from(doc.getElementsByTagNameNS('*', t)) : [];
  const textOf = el => tags(el, 't').map(t => t.textContent).join('');
  const shared = tags(xml('xl/sharedStrings.xml'), 'si').map(textOf);
  // first sheet in workbook order
  let sheetPath = null;
  const wb = xml('xl/workbook.xml'), rels = xml('xl/_rels/workbook.xml.rels');
  const first = tags(wb, 'sheet')[0];
  if (first && rels) {
    const rid = Array.from(first.attributes).find(a => a.localName === 'id' && a.name !== 'sheetId');
    const rel = rid && tags(rels, 'Relationship').find(r => r.getAttribute('Id') === rid.value);
    if (rel) { const t = rel.getAttribute('Target'); sheetPath = t.startsWith('/') ? t.slice(1) : 'xl/' + t.replace(/^\.\//, ''); }
  }
  if (!sheetPath || !files[sheetPath]) sheetPath = Object.keys(files).filter(n => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort((a, b) => parseInt(a.replace(/\D/g, '')) - parseInt(b.replace(/\D/g, '')))[0];
  if (!sheetPath) throw new Error('엑셀 안에서 시트를 찾지 못했어요.');
  const sheet = xml(sheetPath);
  const colIdx = ref => { const m = /^([A-Z]+)/.exec(ref || ''); if (!m) return -1; let n = 0; for (const ch of m[1]) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; };
  const rowsMap = new Map();
  tags(sheet, 'row').forEach((rEl, ri) => {
    const rn = parseInt(rEl.getAttribute('r') || String(ri + 1), 10);
    const row = rowsMap.get(rn) || []; let next = 0;
    tags(rEl, 'c').forEach(c => {
      let ci = colIdx(c.getAttribute('r')); if (ci < 0) ci = next; next = ci + 1;
      const t = c.getAttribute('t'), v = tags(c, 'v')[0];
      let val = '';
      if (t === 's') val = shared[parseInt(v ? v.textContent : '-1', 10)] || '';
      else if (t === 'inlineStr') val = textOf(tags(c, 'is')[0]);
      else if (t === 'b') val = v && v.textContent === '1' ? 'TRUE' : 'FALSE';
      else val = v ? v.textContent : '';
      row[ci] = val;
    });
    rowsMap.set(rn, row);
  });
  return Array.from(rowsMap.keys()).sort((a, b) => a - b).map(k => Array.from(rowsMap.get(k), x => x == null ? '' : String(x)));
}
// keep only rows with content; the sheet must use exactly 3 columns
function fcNormalize(rows) {
  const clean = rows.map(r => r.map(x => String(x == null ? '' : x).trim())).filter(r => r.some(x => x));
  if (!clean.length) throw new Error('비어 있는 파일이에요.');
  const used = [];
  clean.forEach(r => r.forEach((x, i) => { if (x && !used.includes(i)) used.push(i); }));
  used.sort((a, b) => a - b);
  if (used.length !== 3) throw new Error(`열이 딱 3개인 파일만 올릴 수 있어요. 지금 파일은 내용이 들어 있는 열이 ${used.length}개예요.`);
  return clean.map(r => used.map(i => r[i] || ''));
}
function fcImportPreview(deckId, fileName, rawRows) {
  let rows;
  try { rows = fcNormalize(rawRows); } catch (e) { fcImportError(e.message); return; }
  const target = deckId ? fcDeck(deckId) : null;
  let header = true;
  const draw = () => {
    const body = header ? rows.slice(1) : rows;
    const sample = body.slice(0, 3);
    const labels = header ? rows[0].map((x, i) => x || FC_DEFAULT_LABELS[i]) : (target ? target.labels : FC_DEFAULT_LABELS);
    openSheet(`<h2 class="sheet-title">엑셀 불러오기 <button class="btn sm ghost" data-close>닫기</button></h2>
      <div class="stack" style="gap:12px">
        <div class="small muted">${esc(fileName)} · 카드 <b class="num" style="color:var(--gold);font-weight:normal">${body.length}장</b>${target ? ` → "${esc(target.name)}"에 추가` : ' → 새 묶음'}</div>
        <div class="set-row" style="padding:6px 0"><span class="grow">첫 줄은 제목줄 (카드로 안 넣기)</span><button type="button" class="switch" role="switch" id="imHead" aria-checked="${header}" aria-label="첫 줄은 제목줄"></button></div>
        ${!target ? `<label class="field"><span class="label">새 묶음 이름</span><input class="input" id="imName" maxlength="30" value="${esc(fileName.replace(/\.[^.]+$/, ''))}"></label>
          <div class="small muted">항목 이름: ${esc(labels.join(' / '))}${header ? ' (제목줄에서 가져옴)' : ''}</div>` : ''}
        <div class="px card stack" style="gap:8px">${sample.length ? sample.map(r => `<div class="small"><b class="b">${esc(r[0])}</b><div class="muted">${esc(r[1])}</div><div class="muted">${esc(r[2])}</div></div>`).join('<div style="border-top:1px dashed var(--line)"></div>') : '<div class="small muted">넣을 카드가 없어요</div>'}${body.length > 3 ? `<div class="small muted">… 외 ${body.length - 3}장</div>` : ''}</div>
        <button class="btn gold block" id="imGo" ${body.length ? '' : 'disabled'}>${body.length}장 추가</button>
      </div>`, p => {
      $('#imHead', p).onclick = () => { header = !header; draw(); };
      $('#imGo', p).onclick = () => {
        const cards = body.map(f => ({ id: 'k' + uid(), f: [f[0], f[1], f[2]], unknown: false, miss: 0, seen: 0 }));
        let d = target;
        if (!d) { d = { id: 'd' + uid(), name: ($('#imName', p).value.trim() || '새 묶음'), labels, pos: 0, cards: [] }; fcDecks().push(d); }
        d.cards.push(...cards); save(); closeSheet();
        toast(`${cards.length}장을 추가했어요`);
        setTimeout(() => { if (fcDeckId !== d.id) fcOpenDeck(d.id); else render(); }, 140);
      };
    });
  };
  draw();
}

/* ---------- study ---------- */
function fcSetup(deckId, scope) {
  const P = fcPrefs();
  const d = deckId ? fcDeck(deckId) : null;
  let order = P.order, size = P.size;
  const PRESETS = [10, 50, 100, 0];
  let custom = !PRESETS.includes(size);
  const ORDERS = [['random', '랜덤'], ['seq', '순서대로'], ['unknown', '모르는 것 위주'], ['least', '적게 본 순'], ['oldest', '오래 안 본 순']];
  const total = () => fcScopeCount(d, scope);
  let reverse = !!P.reverse;
  let cat = P.cat === undefined ? (S.categories[0] && S.categories[0].id) || '' : P.cat;
  if (cat && !S.categories.some(c => c.id === cat)) cat = (S.categories[0] && S.categories[0].id) || '';
  const draw = () => {
    openSheet(`<h2 class="sheet-title">${d ? esc(d.name) : scope === 'due' ? '오늘 복습 전체' : '모르는 카드 전체'} 학습 <button class="btn sm ghost" data-close>닫기</button></h2>
      <div class="stack" style="gap:12px">
        <div class="seg seg3">${[['all', '전체'], ['due', '오늘 복습'], ['unknown', '모르는 카드']].map(([k, t]) => `<button data-sc="${k}" aria-pressed="${scope === k}">${t} ${fcScopeCount(d, k)}</button>`).join('')}</div>
        <div class="set-row" style="padding:4px 0"><span class="grow">거꾸로 보기<span class="small muted" style="display:block">${esc((d || fcDecks()[0] || { labels: FC_DEFAULT_LABELS }).labels[2])} 먼저 보고 ${esc((d || fcDecks()[0] || { labels: FC_DEFAULT_LABELS }).labels[0])} 맞히기</span></span><button type="button" class="switch" role="switch" id="suRev" aria-checked="${reverse}" aria-label="거꾸로 보기"></button></div>
        <div class="field"><span class="label">공부시간 기록 (카드 보는 시간을 EXP로)</span><div class="chips">${S.categories.map(c => `<button class="chip" data-ct="${c.id}" aria-pressed="${cat === c.id}"><span class="dot" style="background:${c.color}"></span>${esc(c.name)}</button>`).join('')}<button class="chip" data-ct="" aria-pressed="${!cat}">기록 안 함</button></div></div>
        <div class="field"><span class="label">순서</span><div class="chips">${ORDERS.map(([k, t]) => `<button class="chip" data-or="${k}" aria-pressed="${order === k}">${t}</button>`).join('')}</div></div>
        <div class="field"><span class="label">한 번에</span><div class="chips">${PRESETS.map(n => `<button class="chip" data-sz="${n}" aria-pressed="${!custom && size === n}">${n ? n + '장' : '전체'}</button>`).join('')}<button class="chip" id="szCustom" aria-pressed="${custom}">직접 입력</button></div>
          ${custom ? `<div class="row" style="margin-top:8px"><input class="input grow" id="szIn" type="number" inputmode="numeric" min="1" max="9999" value="${size || ''}" placeholder="몇 장?"><span class="small muted">장</span></div>` : ''}</div>
        ${d && scope === 'all' && order === 'seq' && size ? `<div class="row between small muted"><span>${(d.pos % Math.max(1, d.cards.length)) + 1}번째 카드부터 이어서</span><button class="btn sm ghost" id="suRe">처음부터</button></div>` : ''}
        <button class="btn gold block start" id="suGo" ${total() ? '' : 'disabled'}><span class="arrow">▶</span>&nbsp;시작 · ${size ? Math.min(size, total()) : total()}장</button>
      </div>`, p => {
      $$('[data-sc]', p).forEach(b => b.onclick = () => { scope = b.dataset.sc; draw(); });
      $('#suRev', p).onclick = () => { reverse = !reverse; draw(); };
      $$('[data-ct]', p).forEach(b => b.onclick = () => { cat = b.dataset.ct; draw(); });
      $$('[data-or]', p).forEach(b => b.onclick = () => { order = b.dataset.or; draw(); });
      $$('[data-sz]', p).forEach(b => b.onclick = () => { custom = false; size = Number(b.dataset.sz); draw(); });
      $('#szCustom', p).onclick = () => { custom = true; if (PRESETS.includes(size)) size = 20; draw(); setTimeout(() => { const i = $('#szIn'); if (i) { i.focus(); i.select(); } }, 60); };
      if ($('#szIn', p)) $('#szIn', p).oninput = e => { const v = Math.floor(Number(e.target.value)); size = v > 0 ? Math.min(9999, v) : 1; const g = $('#suGo', p); if (g) g.lastChild.textContent = `\u00a0시작 · ${Math.min(size, total())}장`; };
      if ($('#suRe', p)) $('#suRe', p).onclick = () => { d.pos = 0; save(); draw(); };
      $('#suGo', p).onclick = () => { P.order = order; P.size = size; P.reverse = reverse; P.cat = cat; save(); closeSheet(); setTimeout(() => fcStart(deckId, scope, order, size), 120); };
    });
  };
  draw();
}
function fcShuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function fcStart(deckId, scope, order, size, fixedRefs) {
  let refs;
  if (fixedRefs) refs = fixedRefs.slice();
  else {
    const decks = deckId ? [fcDeck(deckId)].filter(Boolean) : fcDecks();
    refs = [];
    const meta = new Map();
    const want = c => scope === 'unknown' ? c.unknown : scope === 'due' ? fcIsDue(c) : true;
    decks.forEach(d => d.cards.forEach((c, i) => { if (want(c)) { const r = { d: d.id, c: c.id, i }; meta.set(r, c); refs.push(r); } }));
    if (!refs.length) { toast('학습할 카드가 없어요'); return; }
    const n = size ? Math.min(size, refs.length) : refs.length;
    const m = r => meta.get(r);
    if (order === 'seq') {
      if (deckId && scope === 'all') { const d = fcDeck(deckId), start = d.pos % refs.length; refs = refs.slice(start).concat(refs.slice(0, start)); }
    } else {
      fcShuffle(refs); // ties stay random
      if (order === 'unknown') refs.sort((a, b) => (m(b).unknown ? 1 : 0) - (m(a).unknown ? 1 : 0) || (m(b).miss || 0) - (m(a).miss || 0));
      else if (order === 'least') refs.sort((a, b) => (m(a).seen || 0) - (m(b).seen || 0));
      else if (order === 'oldest') refs.sort((a, b) => (m(a).last || 0) - (m(b).last || 0));
    }
    refs = refs.slice(0, n);
  }
  const P = fcPrefs(), now = Date.now();
  fcRun = { deckId, scope, order, size, refs, i: 0, shown: false, known: [], unknown: [], seq: !fixedRefs && order === 'seq' && deckId && scope === 'all',
    reverse: !!P.reverse, cat: P.cat === undefined ? (S.categories[0] && S.categories[0].id) || '' : P.cat, t0: now, lastAct: now, active: 0, recorded: false, recNote: '' };
  const el = $('#fcStudy');
  if (el.hidden) { el.hidden = false; pushLayer('fc', () => { $('#fcStudy').hidden = true; fcRun = null; render(); }); }
  sfx('start');
  fcDraw();
}
function fcCur() { const r = fcRun.refs[fcRun.i]; const d = r && fcDeck(r.d); return d ? { d, c: d.cards.find(x => x.id === r.c) } : null; }
function fcDraw() {
  const R = fcRun, box = $('#fcBody');
  if (R.i >= R.refs.length) return fcSummary();
  const cur = fcCur();
  if (!cur || !cur.c) { R.i++; return fcDraw(); }
  const { d, c } = cur, L = d.labels;
  const fi = R.reverse ? (c.f[2] ? 2 : 1) : 0, backs = [0, 1, 2].filter(i => i !== fi);
  $('#fcProg').textContent = `${R.i + 1} / ${R.refs.length}`;
  $('#fcBar').firstElementChild.style.width = (R.i / R.refs.length * 100).toFixed(1) + '%';
  $('#fcDeckName').textContent = (R.deckId ? d.name : `${d.name} · ${R.scope === 'due' ? '오늘 복습' : '모르는 카드'}`) + (R.reverse ? ' · 거꾸로' : '');
  box.innerHTML = `
    <button class="fc-card px" id="fcCard" aria-label="카드 뒤집기">
      <span class="fc-top"><span class="label">${esc(L[fi])}${c.unknown ? ' · <span style="color:var(--red)">모름</span>' : ''}</span><span class="fc-count num" title="이 카드를 본 횟수">+${(c.seen || 0) + 1}</span></span>
      <span class="fc-front ${fcSizeClass(c.f[fi])}">${esc(c.f[fi])}</span>
      ${R.shown ? backs.map(i => `<span class="fc-back"><span class="label">${esc(L[i])}</span><span class="fc-txt ${i === 0 ? 'fc-key' : ''}">${esc(c.f[i]) || '<span class="muted">(비어 있음)</span>'}</span></span>`).join('')
        : `<span class="small muted fc-hint">눌러서 ${backs.map(i => esc(L[i])).join(' · ')} 보기</span>`}
    </button>
    <div class="row fc-ans" style="gap:12px">
      <button class="btn red grow" id="fcNo">모르겠어요</button>
      <button class="btn teal grow" id="fcYes">알아요</button>
    </div>`;
  $('#fcCard').onclick = () => { fcTick(); R.shown = !R.shown; sfx('tap'); fcDraw(); };
  $('#fcNo').onclick = () => fcAnswer(false);
  $('#fcYes').onclick = () => fcAnswer(true);
}
function fcAnswer(know) {
  const R = fcRun, cur = fcCur();
  if (cur && cur.c) {
    const c = cur.c, today = startOfDay(Date.now());
    c.seen = (c.seen || 0) + 1; c.last = Date.now();
    if (know) { c.unknown = false; c.box = Math.min((c.box || 0) + 1, FC_GAPS.length - 1); R.known.push(R.refs[R.i]); }
    else { c.unknown = true; c.miss = (c.miss || 0) + 1; c.box = 0; R.unknown.push(R.refs[R.i]); }
    c.due = dayKey(addDays(today, FC_GAPS[c.box]));
    save();
  }
  buzz(know ? 20 : 60);
  fcTick();
  R.i++; R.shown = false;
  fcDraw();
}
function fcSummary() {
  const R = fcRun;
  if (R.seq) { const d = fcDeck(R.deckId); if (d && d.cards.length) { d.pos = (d.pos + R.refs.length) % d.cards.length; save(); } }
  $('#fcProg').textContent = `${R.refs.length} / ${R.refs.length}`;
  $('#fcBar').firstElementChild.style.width = '100%';
  sfx('done');
  fcRecord(R);
  $('#fcBody').innerHTML = `
    <div class="px card stack" style="gap:12px;text-align:center">
      <div class="h" style="font-size:20px">학습 끝!</div>
      <div class="stats3">
        <div class="px stat"><div class="v num">${R.refs.length}</div><div class="k">본 카드</div></div>
        <div class="px stat"><div class="v num" style="color:var(--teal)">${R.known.length}</div><div class="k">알아요</div></div>
        <div class="px stat"><div class="v num" style="color:var(--red)">${R.unknown.length}</div><div class="k">모르겠어요</div></div>
      </div>
      <p class="small muted" style="margin:0;line-height:1.7">알아요 카드는 1·3·7·14·30일 간격으로, 모르겠어요 카드는 내일 다시 "오늘 복습"에 나와요.</p>
      ${R.recNote ? `<p class="small" style="margin:0;color:var(--gold)">${esc(R.recNote)}</p>` : ''}
    </div>
    ${R.unknown.length ? `<button class="btn red block" id="fcAgain">모르겠어요 ${R.unknown.length}장 다시 보기</button>` : ''}
    ${R.seq ? `<button class="btn block" id="fcNext">다음 ${R.size}장 이어서</button>` : ''}
    <button class="btn gold block" id="fcDone">닫기</button>`;
  if ($('#fcAgain')) $('#fcAgain').onclick = () => fcStart(R.deckId, R.scope, R.order, R.size, fcShuffle(R.unknown.slice()));
  if ($('#fcNext')) $('#fcNext').onclick = () => fcStart(R.deckId, R.scope, R.order, R.size);
  $('#fcDone').onclick = fcClose;
}
function fcTick() { const R = fcRun; if (!R) return; const now = Date.now(); R.active += Math.min(now - R.lastAct, 120000); R.lastAct = now; }
// card study counts as study time for the chosen subject (only active time; idle gaps over 2 min are cut)
function fcRecord(R) {
  if (!R || R.recorded) return;
  R.recorded = true;
  if (!R.i) return;
  fcTick();
  const cat = S.categories.find(c => c.id === R.cat);
  if (!cat) { R.recNote = ''; return; }
  if (S.timer && S.timer.phase === 'focus' && !S.timer.pausedAt) { R.recNote = '타이머가 공부 중이라 이 시간은 타이머 쪽에 기록돼요'; return; }
  const sec = Math.round(R.active / 1000);
  if (sec < 60) { R.recNote = '카드 본 시간이 1분이 안 돼서 공부기록엔 안 남았어요'; return; }
  const name = R.deckId ? (fcDeck(R.deckId) || {}).name || '카드' : R.scope === 'due' ? '오늘 복습' : '모르는 카드';
  S.sessions.push({ id: uid(), cat: cat.id, s: R.t0, e: R.t0 + sec * 1000, sec, memo: `플래시카드 · ${name} ${R.i}장` });
  save();
  R.recNote = `${cat.name} 공부기록 +${fmtHM(sec / 60)} (EXP +${Math.floor(sec / 60)})`;
  setTimeout(() => { checkProgress(); if (typeof planReminders === 'function') planReminders(); }, 50);
}
function fcClose() {
  if (fcRun && !fcRun.recorded && fcRun.i) { fcRecord(fcRun); if (fcRun.recNote) toast(fcRun.recNote); }
  const top = layers[layers.length - 1];
  if (top && top.kind === 'fc') popLayerUI(); else { $('#fcStudy').hidden = true; fcRun = null; render(); }
}

/* ---------- export: 3-column .xlsx ---------- */
function fcXmlEsc(v) { return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function fcXlsx(d) {
  const col = i => String.fromCharCode(65 + i);
  const rows = [d.labels].concat(d.cards.map(c => c.f));
  const sheetData = rows.map((r, ri) => `<row r="${ri + 1}">${[0, 1, 2].map(ci => `<c r="${col(ci)}${ri + 1}" t="inlineStr"><is><t xml:space="preserve">${fcXmlEsc(r[ci])}</t></is></c>`).join('')}</row>`).join('');
  const sheetName = fcXmlEsc(String(d.name).replace(/[\[\]:*?\/\\]/g, ' ').slice(0, 31) || '카드');
  const X = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const files = {
    '[Content_Types].xml': X + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    '_rels/.rels': X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml': X + `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${sheetName}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    'xl/worksheets/sheet1.xml': X + `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols><col min="1" max="1" width="18" customWidth="1"/><col min="2" max="2" width="28" customWidth="1"/><col min="3" max="3" width="48" customWidth="1"/></cols><sheetData>${sheetData}</sheetData></worksheet>`,
  };
  const zipIn = {};
  Object.keys(files).forEach(k => { zipIn[k] = fflate.strToU8(files[k]); });
  return fflate.zipSync(zipIn, { level: 6 });
}
function fcB64(u8) { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }
function fcExport(d) {
  if (!d.cards.length) return;
  const fname = (String(d.name).replace(/[\\/:*?"<>|]/g, ' ').trim() || '카드') + '.xlsx';
  const mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  let b64;
  try { b64 = fcB64(fcXlsx(d)); } catch (e) { toast('엑셀을 만들지 못했어요'); return; }
  if (window.AndroidBridge && AndroidBridge.saveFile) {
    let r = 'err'; try { r = AndroidBridge.saveFile(fname, b64, mime); } catch (e) {}
    if (r === 'ok') { toast(`다운로드/LevelUp 폴더에 ${fname} 저장했어요`); return; }
  } else if (window.IOSBridge && IOSBridge.shareFile) {
    try { IOSBridge.shareFile(fname, b64, mime); return; } catch (e) {}
  }
  // fallback: tab-separated text that pastes straight into Excel
  const tsv = [d.labels].concat(d.cards.map(c => c.f)).map(r => r.map(x => String(x || '').replace(/[\t\r\n]+/g, ' ')).join('\t')).join('\n');
  openSheet(`<h2 class="sheet-title">내보내기 <button class="btn sm ghost" data-close>닫기</button></h2>
    <div class="stack" style="gap:10px"><p class="small muted" style="margin:0">이 화면에선 파일을 바로 저장할 수 없어서, 엑셀에 그대로 붙여넣을 수 있는 형태로 준비했어요. 복사해서 엑셀 A1칸에 붙여넣으면 3열로 들어가요.</p>
    <textarea class="input" id="exTsv" readonly style="min-height:160px;font-size:11px">${esc(tsv)}</textarea>
    <button class="btn gold block" id="exCp">전체 복사</button></div>`, p => {
    $('#exCp', p).onclick = () => { const ta = $('#exTsv', p); const fb = () => { ta.focus(); ta.select(); try { document.execCommand('copy'); toast('복사했어요'); } catch (e) { toast('길게 눌러 직접 복사해 주세요'); } };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(tsv).then(() => toast('복사했어요'), fb); else fb(); };
  });
}
