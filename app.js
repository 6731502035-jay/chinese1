/* 汉语 ทบทวนสอบจีน 1 — แอปไฟล์เดียว ไม่ใช้ไลบรารีภายนอก */
(function () {
'use strict';

/* ================= helpers ================= */
const app = document.getElementById('app');
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const len = s => [...s].length;

/* ================= state ================= */
const KEY = 'zh_flash_v1';
const DEFAULTS = { lessons: [6, 7, 8, 9, 10], chipPy: true, round: 10, front: 'hz' };
let state = load();
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.cards) { s.settings = Object.assign({}, DEFAULTS, s.settings); return s; }
  } catch (e) {}
  return { cards: {}, lessons: {}, settings: Object.assign({}, DEFAULTS) };
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
const S_ = () => state.settings;

/* ================= data ================= */
const WORDS = VOCAB.map(([l, hz, py, th, en, x]) => ({ l: Array.isArray(l) ? l : [l], hz, py, th, en, x: !!x }));
const SENTS = SENTENCES.map(s => ({
  l: [s.l], th: s.th, en: s.en,
  tokens: s.t.split(' ').map(t => { const i = t.indexOf('|'); return i < 0 ? { p: true, hz: t, py: '' } : { hz: t.slice(0, i), py: t.slice(i + 1) }; })
}));
const inSel = ls => ls.some(l => S_().lessons.includes(l));
const poolWords = () => WORDS.filter(w => inSel(w.l));
const card = hz => state.cards[hz] || (state.cards[hz] = { box: 0, miss: 0, r: 0, w: 0 });
const weakWords = () => WORDS.filter(w => state.cards[w.hz] && state.cards[w.hz].miss > 0).sort((a, b) => state.cards[b.hz].miss - state.cards[a.hz].miss);
function rec(hz, lessons, ok) {
  if (hz) { const c = card(hz); if (ok) { c.r++; c.miss = Math.max(0, c.miss - 1); } else { c.w++; c.miss++; c.box = 0; } }
  (lessons || []).forEach(l => { const s = state.lessons[l] || (state.lessons[l] = { r: 0, w: 0 }); ok ? s.r++ : s.w++; });
  save();
}
const accOf = l => { const s = state.lessons[l]; if (!s || s.r + s.w === 0) return null; return Math.round(100 * s.r / (s.r + s.w)); };
function wpick(pool) {
  const bag = [];
  pool.forEach(w => { const c = state.cards[w.hz]; const n = 1 + (c ? Math.min(c.miss, 4) * 2 : 0) + (c && c.r + c.w > 0 ? 0 : 1); for (let i = 0; i < n; i++) bag.push(w); });
  return pick(bag);
}

/* ================= pinyin tone helpers ================= */
const TONES = { a: 'āáǎà', e: 'ēéěè', i: 'īíǐì', o: 'ōóǒò', u: 'ūúǔù', 'ü': 'ǖǘǚǜ' };
const REV = {}; Object.keys(TONES).forEach(b => [...TONES[b]].forEach((c, i) => REV[c] = { b, t: i }));
function changeTone(py) {
  const ch = [...py]; const idx = [];
  ch.forEach((c, i) => { if (REV[c]) idx.push(i); });
  if (!idx.length) {
    const j = ch.findIndex(c => 'aeiouü'.includes(c)); if (j < 0) return py;
    ch[j] = TONES[ch[j]][rnd(0, 3)]; return ch.join('');
  }
  const i = pick(idx); const { b, t } = REV[ch[i]]; let nt; do { nt = rnd(0, 3); } while (nt === t);
  ch[i] = TONES[b][nt]; return ch.join('');
}

/* ================= router ================= */
const ACT = {};
document.addEventListener('click', e => { const t = e.target.closest('[data-act]'); if (t && ACT[t.dataset.act]) ACT[t.dataset.act](t, e); });
function setView(html, anim) { app.innerHTML = html; if (anim) { const c = app.querySelector('.pop-t'); if (c) c.classList.add('pop'); } window.scrollTo(0, 0); }
let R = null, F = null, S = null;       // quiz round, flash session, sort session
let hist = false;
function enter() { if (!hist) { try { history.pushState({ v: 1 }, ''); } catch (e) {} hist = true; } }
window.addEventListener('popstate', () => { hist = false; home(); });
const topBar = (title, meta) => `<div class="bar"><button class="back" data-act="home">‹ เมนู</button><div class="title">${esc(title)}</div><div class="meta">${meta || ''}</div></div>`;
const empty = msg => setView(topBar('') + `<div class="panel center"><p>${msg || 'ไม่มีข้อมูลในบทที่เลือก ลองเลือกบทเพิ่มที่หน้าเมนู'}</p><button class="btn mt" data-act="home">กลับเมนู</button></div>`);

/* ================= home ================= */
const MODES = [
  { id: 'flash', g: '卡', t: 'แฟลชการ์ด', s: 'พลิกดูพินอิน/คำแปล · จำได้ / ยังไม่ได้' },
  { id: 'py2hz', g: '拼', t: 'พินอิน → ตัวจีน', s: 'ดูพินอิน แตะเลือกตัวจีน' },
  { id: 'hz2py', g: '汉', t: 'ตัวจีน → พินอิน', s: 'แตะเลือกพินอิน (ฝึกวรรณยุกต์)' },
  { id: 'sort', g: '序', t: 'เรียงประโยค', s: 'แตะคำต่อเป็นประโยค · เปิด/ปิดเฉลย' },
  { id: 'fill', g: '填', t: 'เติมคำในช่องว่าง', s: '给 在 想 要 两 二 …' },
  { id: 'num', g: '数', t: 'เลข · เวลา · วันที่', s: 'สุ่มโจทย์ได้ไม่จำกัด' },
  { id: 'trans', g: '译', t: 'แปลเป็นจีน', s: 'ไทย/อังกฤษ → เรียงเป็นประโยค' },
  { id: 'weak', g: '错', t: 'คำที่พลาดบ่อย', s: '' }
];
function home() {
  R = F = S = null;
  const sel = S_().lessons, weak = weakWords().length;
  const chips = [6, 7, 8, 9, 10].map(l => { const a = accOf(l); return `<button class="chip ${sel.includes(l) ? 'on' : ''}" data-act="lesson" data-l="${l}"><b>บท ${l}</b><small>${a === null ? 'ยังไม่ทำ' : a + '%'}</small></button>`; }).join('') +
    `<button class="chip" data-act="allLessons"><b>ทั้งหมด</b><small>บท 6–10</small></button>`;
  const modes = MODES.map(m => `<button class="mode" data-act="mode" data-m="${m.id}"><span class="g">${m.g}</span><span class="t">${m.t}</span><span class="s">${m.id === 'weak' ? (weak ? weak + ' คำที่ควรทบทวน' : 'ยังไม่มี — ลองทำควิซก่อน') : m.s}</span></button>`).join('');
  setView(`
    <div class="top"><div><h1>汉语 <span>ทบทวนสอบ</span></h1><p class="sub">ภาษาจีน 1 · บทที่ 6–10 · ${WORDS.length} คำ ${SENTS.length} ประโยค</p></div><button class="icon" data-act="settings" aria-label="ตั้งค่า">⚙</button></div>
    <div class="lessons" role="group" aria-label="เลือกบท">${chips}</div>
    <p class="count">ช่วงที่เลือก: ${poolWords().length} คำ · ${SENTS.filter(s => inSel(s.l)).length} ประโยค · ${FILLS.filter(f => inSel([f.l])).length} ข้อเติมคำ</p>
    <div class="grid">${modes}<button class="mode wide" data-act="mode" data-m="vocab"><span class="g">词</span><span><span class="t">สมุดศัพท์ทั้งหมด</span><br><span class="s">ค้นหา · กรองตามบท · ซ่อนคำแปลเพื่อท่อง</span></span></button></div>`);
}
ACT.home = () => { home(); };
ACT.lesson = t => {
  const l = +t.dataset.l, s = S_().lessons;
  if (s.includes(l)) { if (s.length > 1) S_().lessons = s.filter(x => x !== l); } else S_().lessons = s.concat(l).sort((a, b) => a - b);
  save(); home();
};
ACT.allLessons = () => { S_().lessons = [6, 7, 8, 9, 10]; save(); home(); };
ACT.mode = t => {
  enter();
  const m = t.dataset.m;
  if (m === 'flash') startFlash(poolWords(), 'แฟลชการ์ด');
  else if (m === 'py2hz') startQuiz('พินอิน → ตัวจีน', () => wordQ('py2hz', poolWords), m);
  else if (m === 'hz2py') startQuiz('ตัวจีน → พินอิน', () => wordQ('hz2py', poolWords), m);
  else if (m === 'fill') startQuiz('เติมคำในช่องว่าง', genFill, m);
  else if (m === 'sort' || m === 'trans') startSort(m);
  else if (m === 'num') numMenu();
  else if (m === 'weak') weakScreen();
  else if (m === 'vocab') vocabScreen();
};

/* ================= flashcards ================= */
function startFlash(words, title) {
  if (!words.length) return empty();
  const c = w => state.cards[w.hz];
  const weak = shuffle(words.filter(w => c(w) && c(w).miss > 0));
  const fresh = shuffle(words.filter(w => !c(w) || (c(w).r + c(w).w === 0)));
  const rest = shuffle(words.filter(w => c(w) && c(w).miss === 0 && c(w).r + c(w).w > 0));
  F = { title, queue: weak.concat(fresh, rest), total: words.length, known: 0, flipped: false, tries: 0, missed: {}, words };
  renderFlash();
}
function renderFlash() {
  if (!F.queue.length) return flashDone();
  const w = F.queue[0], front = S_().front;
  const long = len(w.hz) > 3;
  const frontHtml = front === 'hz'
    ? `<div class="big ${long ? 'long' : ''}">${esc(w.hz)}</div>`
    : `<div class="th" style="font-size:26px">${esc(w.th)}</div><div class="en">${esc(w.en)}</div>`;
  const backHtml = `<div class="hzs">${esc(w.hz)}</div><div class="py">${esc(w.py)}</div><div class="th">${esc(w.th)}</div><div class="en">${esc(w.en)}</div><div><span class="badge">บท ${w.l.join(' / ')}${w.x ? ' · คำเสริม' : ''}</span></div>`;
  setView(`
    ${topBar(F.title, `${F.known}/${F.total}`)}
    <div class="prog"><i style="width:${100 * F.known / F.total}%"></i></div>
    <div class="panel flash pop-t" data-act="flip" role="button" tabindex="0" aria-label="พลิกการ์ด">
      ${F.flipped ? backHtml : `<div class="tag">${front === 'hz' ? 'ตัวจีน' : 'คำแปล'}</div>${frontHtml}<div class="hint">แตะเพื่อพลิก</div>`}
    </div>
    ${F.flipped ? `<div class="row mt"><button class="btn no" data-act="flashNo">✗ ยังไม่ได้</button><button class="btn ok" data-act="flashOk">✓ จำได้</button></div>` : ''}
    <button class="btn ghost mt" data-act="flashSkip" ${F.queue.length > 1 ? '' : 'disabled'}>ข้าม ›</button>`, true);
}
ACT.flip = () => { if (!F) return; F.flipped = !F.flipped; renderFlash(); };
ACT.flipSide = () => { S_().front = S_().front === 'hz' ? 'th' : 'hz'; save(); F.flipped = false; renderFlash(); };
ACT.flashOk = () => {
  const w = F.queue.shift(); const c = card(w.hz); c.box = Math.min(c.box + 1, 5);
  rec(w.hz, w.l, true); if (!F.missed[w.hz]) F.known++; else F.known++;
  F.tries++; F.flipped = false; renderFlash();
};
ACT.flashNo = () => {
  const w = F.queue.shift(); rec(w.hz, w.l, false); F.missed[w.hz] = (F.missed[w.hz] || 0) + 1;
  F.queue.splice(Math.min(F.queue.length, rnd(3, 6)), 0, w); F.tries++; F.flipped = false; renderFlash();
};
ACT.flashSkip = () => { if (F.queue.length < 2) return; F.queue.push(F.queue.shift()); F.flipped = false; renderFlash(); };
function flashDone() {
  const miss = Object.keys(F.missed);
  setView(`${topBar(F.title)}<div class="panel center"><div class="score">🎉</div><h2>จบชุดนี้แล้ว</h2>
    <p class="muted">จำได้ครบ ${F.total} คำ · กดการ์ด ${F.tries} ครั้ง</p>
    ${miss.length ? `<p class="small">คำที่เมื่อกี้ลืมบ่อย:</p><div class="list">${miss.map(h => { const w = WORDS.find(x => x.hz === h); return `<div class="li"><div class="a">${esc(w.hz)}</div><div class="b"><i>${esc(w.py)}</i>${esc(w.th)}</div><div class="n">×${F.missed[h]}</div></div>`; }).join('')}</div>` : '<p>ไม่พลาดเลยสักคำ 👏</p>'}
    <div class="stack mt"><button class="btn" data-act="flashAgain">ทบทวนอีกรอบ</button><button class="btn ghost" data-act="home">กลับเมนู</button></div></div>`);
}
ACT.flashAgain = () => startFlash(F.words, F.title);
document.addEventListener('keydown', e => {
  if (!F || !F.queue.length) return;
  if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); ACT.flip(); }
  else if (F.flipped && e.code === 'ArrowRight') ACT.flashOk();
  else if (F.flipped && e.code === 'ArrowLeft') ACT.flashNo();
});

/* ================= quiz engine ================= */
function startQuiz(title, gen, kind) {
  R = { title, gen, kind, i: 0, n: S_().round, score: 0, wrongs: [], cur: null, answered: false };
  nextQ();
}
function nextQ() {
  if (R.i >= R.n) return quizResults();
  const q = R.gen(); if (!q) return empty();
  R.cur = q; R.answered = false; R.hintOn = false; renderQ();
}
function renderQ() {
  const q = R.cur;
  const opts = q.opts.map((o, i) => {
    let cls = 'opt';
    if (R.answered) cls += o.ok ? ' right' : (o.picked ? ' wrong' : ' dim');
    return `<button class="${cls}" data-act="pick" data-i="${i}" ${R.answered ? 'disabled' : ''}><span class="o-main ${o.cls || ''}">${o.label}</span>${o.sub ? `<span class="o-sub">${o.sub}</span>` : ''}</button>`;
  }).join('');
  setView(`${topBar(R.title, `${R.i + 1}/${R.n} · ✓${R.score}`)}
    <div class="prog"><i style="width:${100 * R.i / R.n}%"></i></div>
    <div class="panel q pop-t">${q.lab ? `<div class="lab">${q.lab}</div>` : ''}${q.prompt}
      ${q.hint ? (R.hintOn || R.answered ? `<div class="q-mean">${q.hint}</div>` : `<button class="link" data-act="hint">💡 ดูคำใบ้ (คำแปล)</button>`) : ''}
    </div>
    <div class="opts">${opts}</div>
    ${R.answered ? `<div class="explain"><div class="verdict ${q.picked && q.picked.ok ? 'ok' : 'no'}">${q.picked && q.picked.ok ? '✓ ถูกต้อง' : '✗ ยังไม่ถูก'}</div>${q.explain}</div>
      <button class="btn mt" data-act="nextQ">${R.i + 1 >= R.n ? 'ดูผล' : 'ข้อต่อไป ›'}</button>` : ''}`, !R.answered);
}
ACT.hint = () => { R.hintOn = true; renderQ(); };
ACT.pick = t => {
  if (R.answered) return;
  const q = R.cur, o = q.opts[+t.dataset.i]; o.picked = true; q.picked = o; R.answered = true;
  if (o.ok) R.score++; else R.wrongs.push(q);
  (q.words && q.words.length ? q.words : [null]).forEach(h => rec(h, q.lessons, o.ok));
  R.i++; renderQ();
};
ACT.nextQ = () => nextQ();
function quizResults() {
  const pct = Math.round(100 * R.score / R.n);
  const msg = pct === 100 ? 'เยี่ยมมาก! 🎯' : pct >= 70 ? 'ดีมาก เหลืออีกนิดเดียว' : 'ทบทวนข้อที่พลาดข้างล่างอีกรอบ';
  setView(`${topBar(R.title)}<div class="panel center"><div class="score">${R.score}<span class="muted" style="font-size:28px">/${R.n}</span></div><p>${msg}</p>
    ${R.wrongs.length ? `<p class="small muted" style="text-align:left">ข้อที่พลาด</p><div class="list" style="text-align:left">${R.wrongs.map(q => `<div class="li"><div class="b">${q.short || q.explain}</div></div>`).join('')}</div>` : ''}
    <div class="stack mt"><button class="btn" data-act="again">ทำอีกรอบ</button><button class="btn ghost" data-act="home">กลับเมนู</button></div></div>`);
}
ACT.again = () => startQuiz(R.title, R.gen, R.kind);

/* ---- word questions ---- */
function wordQ(dir, poolFn) {
  const pool = poolFn(); if (!pool.length) return null;
  const w = wpick(pool);
  const meaning = `${esc(w.th)}<div class="en">${esc(w.en)}</div>`;
  const expl = `<b>${esc(w.hz)}</b> <span class="pyl">${esc(w.py)}</span><br>${esc(w.th)} · ${esc(w.en)}`;
  let prompt, opts;
  if (dir === 'py2hz') {
    const same = shuffle(WORDS.filter(x => x.hz !== w.hz && len(x.hz) === len(w.hz)));
    let c = same.slice(0, 3);
    if (c.length < 3) c = c.concat(shuffle(WORDS.filter(x => x.hz !== w.hz && !c.includes(x))).slice(0, 3 - c.length));
    prompt = `<div class="lab">เลือกตัวจีนที่ตรงกับพินอิน</div><div class="q-py">${esc(w.py)}</div>`;
    opts = [{ label: esc(w.hz), cls: 'hz', ok: true }].concat(c.map(x => ({ label: esc(x.hz), cls: 'hz', ok: false })));
  } else {
    const set = new Set([w.py]), list = []; let n = 0;
    while (list.length < 2 && n++ < 40) { const v = changeTone(w.py); if (!set.has(v)) { set.add(v); list.push(v); } }
    const others = shuffle(WORDS.filter(x => !set.has(x.py) && Math.abs(len(x.py) - len(w.py)) <= 2));
    for (const x of others) { if (list.length >= 3) break; if (!set.has(x.py)) { set.add(x.py); list.push(x.py); } }
    prompt = `<div class="lab">เลือกพินอินที่ถูกต้อง (ดูวรรณยุกต์ให้ดี)</div><div class="q-hz">${esc(w.hz)}</div>`;
    opts = [{ label: esc(w.py), ok: true }].concat(list.map(p => ({ label: esc(p), ok: false })));
  }
  return { prompt, hint: meaning, opts: shuffle(opts), explain: expl, short: expl, words: [w.hz], lessons: w.l };
}

/* ---- fill in the blank ---- */
function genFill() {
  const pool = FILLS.filter(f => inSel([f.l])); if (!pool.length) return null;
  if (!R.deck || !R.deck.length) R.deck = shuffle(pool);
  const f = R.deck.pop();
  const sent = esc(f.s).replace('___', '<span class="blank">&nbsp;?&nbsp;</span>');
  const full = esc(f.s).replace('___', `<b>${esc(f.a)}</b>`);
  const note = `<div style="margin-top:6px">💡 ${esc(f.n)}</div>`;
  const ex = `<span class="hz" style="font-size:18px">${full}</span><br><span class="pyl">${esc(f.py)}</span><br>${esc(f.th)}${note}`;
  return {
    prompt: `<div class="lab">เติมคำให้ถูก</div><div class="q-sent">${sent}</div><div class="q-mean">${esc(f.th)}<div class="en">${esc(f.en)}</div></div>`,
    opts: shuffle(f.o.map(x => ({ label: esc(x), cls: /^[a-zāáǎàēéěèīíǐìōóǒòūúǔù]/i.test(x) ? 'sm' : 'hz', ok: x === f.a }))),
    explain: ex, short: ex, words: [], lessons: [f.l]
  };
}

/* ================= number / time / date generators ================= */
const D = [['零', 'líng'], ['一', 'yī'], ['二', 'èr'], ['三', 'sān'], ['四', 'sì'], ['五', 'wǔ'], ['六', 'liù'], ['七', 'qī'], ['八', 'bā'], ['九', 'jiǔ']];
const LIANG = ['两', 'liǎng'];
function sec(n) {
  const ds = [Math.floor(n / 1000) % 10, Math.floor(n / 100) % 10, Math.floor(n / 10) % 10, n % 10];
  const U = [['千', 'qiān'], ['百', 'bǎi'], ['十', 'shí'], null];
  const out = []; let started = false, zero = false;
  ds.forEach((d, i) => {
    if (d === 0) { if (started) zero = true; return; }
    if (zero) { out.push(D[0]); zero = false; }
    out.push(d === 2 && i === 0 ? LIANG : D[d]);
    if (U[i]) out.push(U[i]);
    started = true;
  });
  return out;
}
function numTokens(n) {
  if (n === 0) return [D[0]];
  if (n >= 10 && n < 20) return [['十', 'shí']].concat(n > 10 ? [D[n - 10]] : []);
  if (n >= 10000) {
    const hi = Math.floor(n / 10000), rem = n % 10000;
    let out = [hi === 2 ? LIANG : D[hi], ['万', 'wàn']];
    if (rem) { if (rem < 1000) out.push(D[0]); out = out.concat(sec(rem)); }
    return out;
  }
  return sec(n);
}
// 一 เปลี่ยนเสียงเมื่อมาก่อนหน่วย 百/千/万/刻 (ตามสไลด์บท 7: 一百 yì bǎi, 一万 yí wàn)
const SANDHI = { '百': 'yì', '千': 'yì', '万': 'yí', '刻': 'yí' };
const T = toks => ({
  hz: toks.map(t => t[0]).join(''),
  py: toks.map((t, i) => (t[0] === '一' && toks[i + 1] && SANDHI[toks[i + 1][0]]) || t[1]).filter(Boolean).join(' ').replace(/ ,/g, ',')
});
const fmtN = n => n.toLocaleString('en-US');
const optTxt = (toks, big) => { const t = T(toks); return { label: esc(t.hz), cls: 'hz', sub: esc(t.py), key: t.hz }; };
function uniqOpts(correct, cands, key, n = 3) {
  const seen = new Set([key(correct)]), out = [];
  for (const c of cands) { const k = key(c); if (k && !seen.has(k)) { seen.add(k); out.push(c); if (out.length >= n) break; } }
  return out;
}
function mkQ(prompt, hint, correctOpt, wrongOpts, explain, lessons) {
  const opts = shuffle([Object.assign({ ok: true }, correctOpt)].concat(wrongOpts.map(o => Object.assign({ ok: false }, o))));
  return { prompt, hint, opts, explain, short: explain, words: [], lessons };
}

/* numbers */
function perturb(digs, guard, want) {
  const out = [];
  for (let k = 0; k < 60 && out.length < want; k++) {
    const d2 = digs.slice(), i = rnd(0, d2.length - 1);
    if (k % 3 === 2 && d2.length > 1) { const j = rnd(0, d2.length - 2); [d2[j], d2[j + 1]] = [d2[j + 1], d2[j]]; }
    else { let v; do { v = String(rnd(i === 0 ? 1 : 0, 9)); } while (v === d2[i]); d2[i] = v; }
    if (d2[0] === '0') continue;
    const m = +d2.join(''); if (m > 9 && !guard.has(m)) { guard.add(m); out.push(m); }
  }
  return out;
}
function genNumber() {
  const tier = pick([1, 2, 2, 3, 3, 3]);
  let n;
  if (tier === 1) n = rnd(21, 99);
  else if (tier === 2) { do { n = rnd(101, 999); } while (n >= 200 && n < 300); }
  else {
    const form = pick(['r', 'tens0', 'mid0', 'end0']);
    const a = rnd(1, 9), b = rnd(1, 9), c = rnd(1, 9);
    if (form === 'r') n = rnd(1000, 99999);
    else if (form === 'tens0') n = a * 1000 + b * 100 + c;      // เช่น 6,804
    else if (form === 'mid0') n = a * 10000 + b * 10 + c;       // เช่น 40,073
    else n = a * 1000 + b * 100;                                // เช่น 3,400
  }
  const toks = numTokens(n), t = T(toks), digs = [...String(n)];
  const guard = new Set([n]);
  const nums = perturb(digs, guard, 3);
  const expl = `<b>${fmtN(n)}</b> = <b>${esc(t.hz)}</b><br><span class="pyl">${esc(t.py)}</span>`;
  if (Math.random() < 0.65) {
    const wrong = nums.map(numTokens);
    if (toks.some(x => x[0] === '零')) { wrong.unshift(toks.filter(x => x[0] !== '零')); }   // ตัวหลอก: ลืมอ่าน 零
    const ws = uniqOpts(toks, wrong, x => T(x).hz);
    return mkQ(`<div class="lab">อ่านเลขนี้เป็นภาษาจีน</div><div class="q-big">${fmtN(n)}</div>`, null, optTxt(toks), ws.map(optTxt), expl, [6]);
  }
  return mkQ(`<div class="lab">ตัวเลขนี้คือเท่าไร</div><div class="q-hz" style="font-size:38px">${esc(t.hz)}</div><div class="q-mean muted">${esc(t.py)}</div>`, null, { label: fmtN(n) }, nums.map(m => ({ label: fmtN(m) })), expl, [6]);
}

/* time */
const PERIOD = h => h >= 5 && h < 9 ? ['早上', 'zǎoshang'] : h < 12 ? ['上午', 'shàngwǔ'] : h === 12 ? ['中午', 'zhōngwǔ'] : h < 18 ? ['下午', 'xiàwǔ'] : ['晚上', 'wǎnshang'];
function timeTokens(h, m, form) {
  const h12 = h > 12 ? h - 12 : h;
  let t = [PERIOD(h)].concat(h12 === 2 ? [LIANG] : numTokens(h12), [['点', 'diǎn']]);
  if (m === 0) return t;
  if (m === 30 && form === 0) return t.concat([['半', 'bàn']]);
  if (m === 15 && form === 0) return t.concat([D[1], ['刻', 'kè']]);
  if (m === 45 && form === 0) return t.concat([D[3], ['刻', 'kè']]);
  if (m < 10) t.push(D[0]);
  return t.concat(m < 10 ? [D[m]] : numTokens(m), [['分', 'fēn']]);
}
const digi = (h, m) => `${h}:${String(m).padStart(2, '0')}`;
function genTime() {
  const h = rnd(5, 23), m = Math.random() < 0.55 ? pick([0, 15, 30, 45]) : pick([5, 7, 10, 20, 25, 35, 40, 50, 55, rnd(1, 59)]);
  const form = Math.random() < 0.5 ? 0 : 1;
  const toks = timeTokens(h, m, form), t = T(toks);
  const seen = new Set([digi(h, m)]), wr = [];
  for (let k = 0; k < 60 && wr.length < 3; k++) {
    let hh = h, mm = m, r = Math.random();
    if (r < .4) hh = Math.max(5, Math.min(23, h + pick([-3, -2, -1, 1, 2, 3, 12, -12]))); else if (r < .75) mm = pick([0, 5, 10, 15, 30, 45, 40, 35, rnd(1, 59)]); else { hh = rnd(5, 23); mm = pick([0, 15, 30, 45, rnd(1, 59)]); }
    const key = digi(hh, mm); if (!seen.has(key)) { seen.add(key); wr.push([hh, mm]); }
  }
  const why = `<br><span class="small muted">ลำดับ: ช่วงของวัน → ชั่วโมง → นาที (半 = 30, 一刻 = 15, 三刻 = 45)</span>`;
  const expl = `<b>${esc(t.hz)}</b><br><span class="pyl">${esc(t.py)}</span> = ${digi(h, m)} (24 ชม.)${why}`;
  if (Math.random() < 0.6) {
    const fm = (hh, mm) => optTxt(timeTokens(hh, mm, Math.random() < .5 ? 0 : 1));
    return mkQ(`<div class="lab">เวลานี้พูดเป็นภาษาจีนว่าอย่างไร</div><div class="q-big">${digi(h, m)}</div><div class="q-mean muted">(ระบบ 24 ชั่วโมง)</div>`, null, optTxt(toks), wr.map(x => fm(x[0], x[1])), expl, [10]);
  }
  return mkQ(`<div class="lab">ข้อความนี้คือเวลากี่โมง</div><div class="q-hz" style="font-size:34px">${esc(t.hz)}</div><div class="q-mean muted">${esc(t.py)}</div>`, null, { label: digi(h, m) }, wr.map(x => ({ label: digi(x[0], x[1]) })), expl, [10]);
}

/* date */
const TH_M = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const TH_W = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'];
const DIM = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
function dateTokens(o) {
  let t = [];
  if (o.y) t = t.concat([...String(o.y)].map(c => D[+c]), [['年', 'nián']]);
  t = t.concat(numTokens(o.m), [['月', 'yuè']], numTokens(o.d), [['号', 'hào'], ['，', ',']], [['星期', 'xīngqī']], [o.w === 7 ? ['天', 'tiān'] : D[o.w]]);
  return t;
}
const thDate = o => `${o.d} ${TH_M[o.m - 1]}${o.y ? ' ' + o.y : ''} (วัน${TH_W[o.w - 1]})`;
function genDate() {
  const rd = () => { const m = rnd(1, 12); return { y: 0, m, d: rnd(1, DIM[m - 1]), w: rnd(1, 7) }; };
  const o = rd(); if (Math.random() < 0.4) o.y = rnd(1995, 2030);
  const seen = new Set([JSON.stringify(o)]), wr = [];
  for (let k = 0; k < 60 && wr.length < 3; k++) {
    const v = Object.assign({}, o), r = Math.random();
    if (r < .3) v.m = rnd(1, 12); else if (r < .6) v.d = rnd(1, DIM[v.m - 1]); else if (r < .85) v.w = rnd(1, 7); else if (v.y) v.y = rnd(1995, 2030); else v.w = rnd(1, 7);
    if (v.d > DIM[v.m - 1]) continue;
    const key = JSON.stringify(v); if (!seen.has(key)) { seen.add(key); wr.push(v); }
  }
  const t = T(dateTokens(o));
  const expl = `<b>${esc(thDate(o))}</b><br><b>${esc(t.hz)}</b><br><span class="pyl">${esc(t.py)}</span><br><span class="small muted">รูปแบบ: ปี 年 → เดือน 月 → วันที่ 号 → 星期</span>`;
  if (Math.random() < 0.6) {
    return mkQ(`<div class="lab">พูดวันที่นี้เป็นภาษาจีน</div><div class="q-big" style="font-size:26px">${esc(thDate(o))}</div>`, null, optTxt(dateTokens(o)), wr.map(v => optTxt(dateTokens(v))), expl, [6]);
  }
  return mkQ(`<div class="lab">ข้อความนี้คือวันอะไร</div><div class="q-hz" style="font-size:30px">${esc(t.hz)}</div><div class="q-mean muted">${esc(t.py)}</div>`, null, { label: esc(thDate(o)), cls: 'sm' }, wr.map(v => ({ label: esc(thDate(v)), cls: 'sm' })), expl, [6]);
}

/* age */
function genAge() {
  const n = rnd(1, 99), toks = numTokens(n).concat([['岁', 'suì']]), t = T(toks);
  const guard = new Set([n]), wn = [];
  for (let k = 0; k < 50 && wn.length < 3; k++) { const m = Math.random() < .5 ? rnd(1, 99) : (n % 10 ? n - n % 10 + rnd(0, 9) : n + rnd(1, 9)); if (m > 0 && !guard.has(m)) { guard.add(m); wn.push(m); } }
  const expl = `<b>${esc(t.hz)}</b> <span class="pyl">${esc(t.py)}</span> = อายุ ${n} ปี<br><span class="small muted">ถามอายุ: 你今年多大？ / เด็ก: 你今年几岁？ / ผู้สูงอายุ: 多大年纪？</span>`;
  if (Math.random() < 0.6) return mkQ(`<div class="lab">“ฉันอายุ ${n} ปี” — พูดเป็นภาษาจีนว่า 我今年 …</div><div class="q-big">${n} ปี</div>`, null, optTxt(toks), wn.map(m => optTxt(numTokens(m).concat([['岁', 'suì']]))), expl, [6]);
  return mkQ(`<div class="lab">我今年…</div><div class="q-hz" style="font-size:38px">${esc(t.hz)}</div><div class="q-mean muted">${esc(t.py)}</div>`, null, { label: n + ' ปี' }, wn.map(m => ({ label: m + ' ปี' })), expl, [6]);
}

/* phone / room */
const dpy = d => d === 1 ? 'yāo' : D[d][1];
function genPhone() {
  const room = Math.random() < 0.4;
  let digs;
  if (room) digs = [rnd(1, 6), rnd(0, 6), rnd(0, 9)];
  else { digs = [0, pick([6, 8, 9])].concat(Array.from({ length: 8 }, () => rnd(0, 9))); }
  let ones = digs.filter(d => d === 1).length;
  if (ones < (room ? 1 : 2)) { for (let k = 0; k < 2; k++) digs[rnd(room ? 0 : 2, digs.length - 1)] = 1; }
  const say = ds => ds.map(dpy).join(' ');
  const show = room ? digs.join('') : `${digs[0]}${digs[1]} ${digs.slice(2, 6).join('')} ${digs.slice(6).join('')}`;
  const wr = []; const seen = new Set([say(digs)]);
  const yi = digs.map(dpy).join(' ').replace(/yāo/g, 'yī'); if (!seen.has(yi)) { seen.add(yi); wr.push(yi); }
  for (let k = 0; k < 60 && wr.length < 3; k++) {
    const d2 = digs.slice(); const i = rnd(room ? 0 : 2, d2.length - 1);
    if (k % 3 === 2 && i < d2.length - 1) { [d2[i], d2[i + 1]] = [d2[i + 1], d2[i]]; }
    else { let v; do { v = rnd(i === 0 && room ? 1 : 0, 9); } while (v === d2[i]); d2[i] = v; }
    const s = say(d2); if (!seen.has(s)) { seen.add(s); wr.push(s); }
  }
  const correct = say(digs);
  const expl = `<b>${esc(show)}</b><br><span class="pyl">${esc(correct)}</span><br><span class="small muted">ในเบอร์โทร / เลขห้อง เลข 1 อ่านว่า <b>yāo</b> (ไม่ใช่ yī) · 0 = líng</span>`;
  const label = s => ({ label: esc(s), cls: 'sm' });
  return mkQ(`<div class="lab">${room ? 'ห้องเลขที่นี้อ่านว่า (…号房间)' : 'เบอร์โทรนี้อ่านว่า'}</div><div class="q-big" style="letter-spacing:.04em">${esc(show)}</div>`, null, label(correct), wr.slice(0, 3).map(label), expl, [9]);
}

const NUMGENS = { number: genNumber, time: genTime, date: genDate, age: genAge, phone: genPhone };
const mixed = () => NUMGENS[pick(Object.keys(NUMGENS))]();
function numMenu() {
  const items = [
    ['number', '数', 'ตัวเลข', '256 · 3,000 · 43,679 · เลข 0 ตรงกลาง'],
    ['time', '时', 'เวลา', '8:45 → 八点四十五分 / 三刻'],
    ['date', '日', 'วัน เดือน ปี', 'ปี 年 เดือน 月 วันที่ 号 星期'],
    ['age', '岁', 'อายุ', '八十五岁 · 你今年多大'],
    ['phone', '号', 'เบอร์โทร / เลขห้อง', 'เลข 1 อ่านว่า yāo']
  ];
  setView(`${topBar('เลข · เวลา · วันที่')}<div class="stack">
    ${items.map(([id, g, t, s]) => `<button class="mode wide" data-act="numGo" data-k="${id}"><span class="g">${g}</span><span><span class="t">${t}</span><br><span class="s">${s}</span></span></button>`).join('')}
    <button class="mode wide" data-act="numGo" data-k="mix"><span class="g">混</span><span><span class="t">สุ่มรวมทุกแบบ</span><br><span class="s">เหมาะกับการซ้อมก่อนสอบ</span></span></button></div>
    <p class="small muted center mt">โจทย์สุ่มใหม่ทุกครั้ง · จำนวนข้อต่อรอบตั้งได้ในหน้าตั้งค่า</p>`);
}
ACT.numGo = t => {
  const k = t.dataset.k, titles = { number: 'ตัวเลข', time: 'เวลา', date: 'วัน เดือน ปี', age: 'อายุ', phone: 'เบอร์โทร / เลขห้อง', mix: 'สุ่มรวม' };
  startQuiz(titles[k], k === 'mix' ? mixed : NUMGENS[k], 'num');
};

/* ================= sentence ordering / translation ================= */
function startSort(mode) {
  const pool = SENTS.filter(s => inSel(s.l)); if (!pool.length) return empty();
  S = { mode, items: shuffle(pool).slice(0, S_().round), i: 0, score: 0, wrongs: [], showMean: true };
  loadSort();
}
function loadSort() {
  const it = S.items[S.i];
  const toks = it.tokens.filter(t => !t.p).map((t, i) => ({ id: i, hz: t.hz, py: t.py }));
  let chips = toks.slice();
  if (S.mode === 'trans') {
    const have = new Set(toks.map(t => t.hz));
    const extras = shuffle(SENTS.flatMap(s => s.tokens.filter(t => !t.p && !have.has(t.hz)))).filter((t, i, a) => a.findIndex(u => u.hz === t.hz) === i).slice(0, 2);
    extras.forEach((t, k) => chips.push({ id: toks.length + k, hz: t.hz, py: t.py, extra: true }));
  }
  let order; let n = 0;
  do { order = shuffle(chips.map(c => c.id)); n++; } while (n < 8 && order.slice(0, toks.length).join() === toks.map(t => t.id).join() && chips.length > 1);
  S.cur = { it, toks, chips, order, ans: [], checked: false, scored: false, peeked: false, reveal: false, ok: null, mism: [] };
  renderSort();
}
function chipHtml(c, act, cls) {
  return `<button class="tok ${cls || ''}" data-act="${act}" data-id="${c.id}"><span class="c">${esc(c.hz)}</span>${S_().chipPy ? `<span class="p">${esc(c.py)}</span>` : ''}</button>`;
}
function renderSort() {
  const c = S.cur, it = c.it, trans = S.mode === 'trans';
  const byId = id => c.chips.find(x => x.id === id);
  const ansHtml = c.ans.length ? c.ans.map((id, k) => chipHtml(byId(id), 'unchip', c.checked ? (c.mism[k] ? 'bad' : 'good') : '')).join('') : '<div class="ph">แตะคำด้านล่างเพื่อเรียงเป็นประโยค</div>';
  const poolHtml = c.order.map(id => c.ans.includes(id) ? `<span class="tok used" aria-hidden="true"><span class="c">${esc(byId(id).hz)}</span></span>` : chipHtml(byId(id), 'chip')).join('');
  const full = it.tokens.map(t => t.hz).join(''), fullPy = it.tokens.map(t => t.py || t.hz).join(' ').replace(/ ([，。？！])/g, '$1');
  const mean = `<div class="q-mean" style="margin-top:0">${esc(it.th)}<div class="en">${esc(it.en)}</div></div>`;
  setView(`${topBar(trans ? 'แปลเป็นจีน' : 'เรียงประโยค', `${S.i + 1}/${S.items.length} · ✓${S.score}`)}
    <div class="prog"><i style="width:${100 * S.i / S.items.length}%"></i></div>
    <div class="panel q pop-t">
      <div class="lab">${trans ? 'แปลประโยคนี้เป็นภาษาจีน (มีคำหลอก 2 คำ)' : 'เรียงคำให้เป็นประโยคที่ถูกต้อง'}</div>
      ${trans || S.showMean ? mean : ''}
      ${trans ? '' : `<button class="link" data-act="toggleMean">${S.showMean ? 'ซ่อนคำแปล' : 'แสดงคำแปล'}</button>`}
    </div>
    <div class="slot mt ${c.checked && c.ok ? 'ok' : ''}">${ansHtml}${c.checked && c.ok ? '' : ''}</div>
    <div class="pool">${poolHtml}</div>
    ${c.checked ? `<div class="banner ${c.ok ? 'ok' : 'no'}">${c.ok ? '✓ ถูกต้อง!' : '✗ ยังไม่ตรงกับเฉลย — ลองจัดใหม่ หรือเปิดเฉลยดู'}</div>` : ''}
    ${c.reveal ? `<div class="reveal"><div class="rh">${esc(full)}</div><div class="rp">${esc(fullPy)}</div><div class="rm">${esc(it.th)} · ${esc(it.en)}${it.tokens.some(t => ['早上', '下午', '晚上', '上午', '中午', '今天', '明天', '昨天'].includes(t.hz)) ? '<br>หมายเหตุ: คำบอกเวลามักอยู่หลังประธาน แต่ขึ้นต้นประโยคก็ได้' : ''}</div></div>` : ''}
    <div class="row mt"><button class="btn ghost" data-act="sortClear">ล้าง</button><button class="btn" data-act="sortCheck" ${c.ans.length ? '' : 'disabled'}>ตรวจ</button></div>
    <div class="row mt"><button class="btn ghost" data-act="sortReveal">${c.reveal ? 'ปิดเฉลย' : 'เปิดเฉลย'}</button>${c.checked || c.reveal ? `<button class="btn" data-act="sortNext">${S.i + 1 >= S.items.length ? 'ดูผล' : 'ข้อต่อไป ›'}</button>` : `<button class="btn ghost" data-act="sortNext">ข้าม ›</button>`}</div>`, false);
}
ACT.toggleMean = () => { S.showMean = !S.showMean; renderSort(); };
ACT.chip = t => { const c = S.cur; const id = +t.dataset.id; if (!c.ans.includes(id)) { c.ans.push(id); c.checked = false; c.ok = null; renderSort(); } };
ACT.unchip = t => { const c = S.cur; const id = +t.dataset.id; c.ans = c.ans.filter(x => x !== id); c.checked = false; c.ok = null; renderSort(); };
ACT.sortClear = () => { const c = S.cur; c.ans = []; c.checked = false; c.ok = null; renderSort(); };
ACT.sortReveal = () => { const c = S.cur; if (!c.checked) c.peeked = true; c.reveal = !c.reveal; renderSort(); };
ACT.sortCheck = () => {
  const c = S.cur; if (!c.ans.length) return;
  const got = c.ans.map(id => c.chips.find(x => x.id === id).hz), want = c.toks.map(t => t.hz);
  c.ok = got.length === want.length && got.every((h, i) => h === want[i]);
  c.mism = got.map((h, i) => h !== want[i]); c.checked = true;
  if (!c.scored) { c.scored = true; const good = c.ok && !c.peeked; if (good) S.score++; else S.wrongs.push(c.it); rec(null, c.it.l, good); }
  renderSort();
};
ACT.sortNext = () => {
  const c = S.cur; if (!c.scored) { c.scored = true; S.wrongs.push(c.it); rec(null, c.it.l, false); }
  S.i++; if (S.i >= S.items.length) return sortResults(); loadSort();
};
function sortResults() {
  const n = S.items.length;
  setView(`${topBar(S.mode === 'trans' ? 'แปลเป็นจีน' : 'เรียงประโยค')}<div class="panel center"><div class="score">${S.score}<span class="muted" style="font-size:28px">/${n}</span></div><p>${S.score === n ? 'เยี่ยมมาก! 🎯' : 'ทบทวนประโยคที่พลาดด้านล่าง'}</p>
    ${S.wrongs.length ? `<div class="list" style="text-align:left">${S.wrongs.map(it => `<div class="li"><div class="b"><span class="hz" style="font-size:19px">${esc(it.tokens.map(t => t.hz).join(''))}</span><i>${esc(it.tokens.map(t => t.py || t.hz).join(' ').replace(/ ([，。？！])/g, '$1'))}</i>${esc(it.th)}</div></div>`).join('')}</div>` : ''}
    <div class="stack mt"><button class="btn" data-act="sortAgain">ทำอีกรอบ</button><button class="btn ghost" data-act="home">กลับเมนู</button></div></div>`);
}
ACT.sortAgain = () => startSort(S.mode);

/* ================= vocabulary list ================= */
let V = { q: '', l: 0, hideM: false, hideP: false };
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s/g, '');
function vocabScreen() {
  const lc = [0, 6, 7, 8, 9, 10].map(l => `<button class="chip ${V.l === l ? 'on' : ''}" data-act="vlesson" data-l="${l}"><b>${l ? 'บท ' + l : 'ทั้งหมด'}</b></button>`).join('') +
    `<button class="chip ${V.l === 'w' ? 'on' : ''}" data-act="vlesson" data-l="w"><b>ที่พลาด</b></button>`;
  setView(`${topBar('สมุดศัพท์')}
    <input id="vq" class="search" type="search" placeholder="ค้นหา: ตัวจีน / พินอิน / ไทย / English" value="${esc(V.q)}" autocomplete="off">
    <div class="lessons mt">${lc}</div>
    <div class="row"><button class="btn ghost small" data-act="vtogM">${V.hideM ? 'แสดงคำแปล' : 'ซ่อนคำแปล'}</button><button class="btn ghost small" data-act="vtogP">${V.hideP ? 'แสดงพินอิน' : 'ซ่อนพินอิน'}</button></div>
    <div id="vlist"></div>`);
  vocabList();
}
function vocabList() {
  const el = document.getElementById('vlist'); if (!el) return;
  const q = V.q.trim(), qn = norm(q), ql = q.toLowerCase();
  let ws = WORDS.filter(w => V.l === 0 || (V.l === 'w' ? (state.cards[w.hz] && state.cards[w.hz].miss > 0) : w.l.includes(V.l)));
  if (q) ws = ws.filter(w => w.hz.includes(q) || norm(w.py).includes(qn) || w.th.includes(q) || w.en.toLowerCase().includes(ql));
  const keyOf = w => (typeof V.l === 'number' && V.l) ? V.l : w.l[0];
  const row = w => { const c = state.cards[w.hz], miss = c && c.miss > 0 ? c.miss : 0;
    return `<div class="li vrow" data-act="vrow"><div class="a">${esc(w.hz)}</div><div class="b"><i class="vp">${esc(w.py)}</i><span class="vm">${esc(w.th)}<br><span class="muted">${esc(w.en)}${w.x ? ' · คำเสริม' : ''}${w.l.length > 1 ? ' · บท ' + w.l.join('/') : ''}</span></span></div>${miss ? `<div class="n">×${miss}</div>` : ''}</div>`; };
  let html = `<div class="vh">พบ ${ws.length} คำ${V.hideM || V.hideP ? ' · แตะแถวเพื่อดูคำตอบ' : ''}</div>`;
  [6, 7, 8, 9, 10].forEach(g => { const grp = ws.filter(w => keyOf(w) === g); if (grp.length) html += `<div class="vh">บทที่ ${g} · ${grp.length} คำ</div><div class="list">${grp.map(row).join('')}</div>`; });
  if (!ws.length) html += `<div class="panel center mt muted">ไม่พบคำที่ค้นหา</div>`;
  el.className = (V.hideM ? 'blur ' : '') + (V.hideP ? 'blurpy' : '');
  el.innerHTML = html;
}
ACT.vlesson = t => { V.l = t.dataset.l === 'w' ? 'w' : +t.dataset.l; vocabScreen(); };
ACT.vtogM = () => { V.hideM = !V.hideM; vocabScreen(); };
ACT.vtogP = () => { V.hideP = !V.hideP; vocabScreen(); };
ACT.vrow = t => t.classList.toggle('open');
document.addEventListener('input', e => { if (e.target.id === 'vq') { V.q = e.target.value; vocabList(); } });

/* ================= weak words ================= */
function weakScreen() {
  const ws = weakWords();
  const bars = [6, 7, 8, 9, 10].map(l => { const a = accOf(l); return `<div><i><u style="width:${a || 0}%"></u></i>บท ${l}<br>${a === null ? '–' : a + '%'}</div>`; }).join('');
  setView(`${topBar('คำที่พลาดบ่อย')}
    <div class="panel"><div class="small muted">ความแม่นยำแต่ละบท (จากทุกโหมด)</div><div class="acc">${bars}</div></div>
    ${ws.length ? `<div class="stack mt"><button class="btn" data-act="weakFlash">แฟลชการ์ดเฉพาะ ${ws.length} คำนี้</button>
      <div class="row"><button class="btn ghost" data-act="weakPy">พินอิน → จีน</button><button class="btn ghost" data-act="weakHz">จีน → พินอิน</button></div></div>
      <div class="list">${ws.slice(0, 60).map(w => `<div class="li"><div class="a">${esc(w.hz)}</div><div class="b"><i>${esc(w.py)}</i>${esc(w.th)}<br><span class="muted">${esc(w.en)} · บท ${w.l.join('/')}</span></div><div class="n">×${state.cards[w.hz].miss}</div></div>`).join('')}</div>`
      : `<div class="panel center mt"><p>ยังไม่มีคำที่พลาด 🎉</p><p class="muted small">ลองทำแฟลชการ์ดหรือควิซสักรอบ คำที่ตอบผิดจะมาอยู่ตรงนี้ และจะหายไปเมื่อตอบถูกซ้ำ ๆ</p></div>`}`);
}
ACT.weakFlash = () => startFlash(weakWords(), 'คำที่พลาดบ่อย');
ACT.weakPy = () => startQuiz('พินอิน → จีน (คำที่พลาด)', () => wordQ('py2hz', weakWords), 'weak');
ACT.weakHz = () => startQuiz('จีน → พินอิน (คำที่พลาด)', () => wordQ('hz2py', weakWords), 'weak');

/* ================= settings ================= */
function settings() {
  const s = S_();
  setView(`${topBar('ตั้งค่า')}<div class="panel">
    <div class="set"><div>แสดงพินอินบนชิปคำ<small>ในโหมดเรียงประโยค / แปล (ปิดเพื่อฝึกให้ยากขึ้น)</small></div><button class="sw ${s.chipPy ? 'on' : ''}" data-act="togPy" role="switch" aria-checked="${s.chipPy}"></button></div>
    <div class="set"><div>จำนวนข้อต่อรอบ</div><div class="seg">${[10, 20, 30].map(n => `<button class="${s.round === n ? 'on' : ''}" data-act="round" data-n="${n}">${n}</button>`).join('')}</div></div>
    <div class="set"><div>หน้าการ์ดแฟลชการ์ด</div><div class="seg"><button class="${s.front === 'hz' ? 'on' : ''}" data-act="front" data-f="hz">汉字</button><button class="${s.front === 'th' ? 'on' : ''}" data-act="front" data-f="th">ไทย/EN</button></div></div>
    <div class="set"><div>ล้างความคืบหน้า<small>รีเซ็ตคำที่พลาดและคะแนนทุกบท (เก็บในเครื่องนี้เท่านั้น)</small></div><button class="btn ghost" style="width:auto;min-height:44px" data-act="reset">ล้าง</button></div>
  </div><p class="small muted center mt">ความคืบหน้าเก็บในเบราว์เซอร์ของเครื่องนี้ ไม่ส่งไปที่ไหน</p>`);
}
ACT.settings = () => { enter(); settings(); };
ACT.togPy = () => { S_().chipPy = !S_().chipPy; save(); settings(); };
ACT.round = t => { S_().round = +t.dataset.n; save(); settings(); };
ACT.front = t => { S_().front = t.dataset.f; save(); settings(); };
ACT.reset = () => { if (confirm('ล้างความคืบหน้าทั้งหมด?')) { state.cards = {}; state.lessons = {}; save(); home(); } };

/* ================= boot ================= */
home();
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
window.__zh = { numTokens, T, timeTokens, genNumber, genTime, genDate, genAge, genPhone, wordQ, changeTone, WORDS, SENTS };
})();