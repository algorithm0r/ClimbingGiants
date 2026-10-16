/* Generated bundle: assign, wordlist, the page's own script, page.js.
   Do not edit. Source: src/standalone/ and src/page.js */

/* Phrase -> data assignment. The twin of assign.py; the two agree bit for bit.

   A phrase becomes a number, and the number chooses one crash test and two
   subsets of shots. Nothing is stored anywhere: the same phrase yields the same
   pack forever, so a lost download is recovered by typing four words back in.

   The Lehmer multiply at the end of the hash is not decoration. Without it two
   phrases differing in one letter land on adjacent tests, and a mistyped phrase
   looks plausible instead of looking wrong. Every intermediate stays under
   2^53, so this is exact in doubles. */

const P = 1000003, M = 2147483647, A = 48271;
const N_TRAIN = 60, N_TEST = 40;

const norm = s => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function hash32(s, salt) {
  let v = 0;
  const str = (salt || '') + '|' + norm(s);
  for (let i = 0; i < str.length; i++) v = (v * 31 + str.charCodeAt(i)) % P;
  return (v * A) % M;
}

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* Fisher-Yates over the whole pool, then the first n. A shuffle rather than a
   slice: the shot files are in order, and a contiguous slice would hand one
   student a single evening's games. */
function take(nPool, nWant, seed) {
  const a = Array.from({length: nPool}, (_, i) => i), rnd = mulberry32(seed);
  for (let i = nPool - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, nWant).sort((p, q) => p - q);
}

/* The tail of each pool is held back for the worked example reports. No phrase
   can reach it, so an example spoils nobody's assignment, and a submission
   carrying the example's numbers is visibly not the student's own. Callers
   still pass the full pool size; the subtraction lives here so the two twins
   cannot drift. */
const RESERVED_TESTS = 3, RESERVED_TRAIN = 24, RESERVED_TEST = 12;

function assign(phrase, nTests, nTrainPool, nTestPool) {
  return {
    phrase: norm(phrase),
    crash: hash32(phrase, 'crash') % (nTests - RESERVED_TESTS),
    train: take(nTrainPool - RESERVED_TRAIN, N_TRAIN, hash32(phrase, 'train')),
    test:  take(nTestPool  - RESERVED_TEST,  N_TEST,  hash32(phrase, 'test')),
  };
}

if (typeof module !== 'undefined') module.exports = {norm, hash32, assign, N_TRAIN, N_TEST};

/* Words for the four-word phrase. Concrete, common, and chosen so that hearing
   one is enough to spell it: no homophones (no flour/flower, steel/steal,
   plain/plane), no doubled-letter traps, nothing shorter than three letters. */
const WORDS = ('anchor anvil apple arbor ash aspen atlas badger bamboo barley basalt basin ' +
'beacon beetle birch bison bloom boulder bracken bramble branch brass bridge bronze bucket ' +
'burrow cabin cactus canal candle canvas canyon cedar chalk cherry chimney cinder cistern ' +
'clay clover cobalt compass copper coral cottage cove crag crane crater creek crystal cypress ' +
'dahlia delta dune ember falcon fennel fern ferry fiddle flint forge fossil fountain foxglove ' +
'garnet geyser ginger glacier granite gravel grotto gully gypsum hammer harbor harvest heather ' +
'hemlock heron hickory hollow honey ivory jasmine jasper juniper kelp kettle lagoon lantern ' +
'larch lattice lava ledger lichen lily linen lobster loom lupine magnet mahogany mallet maple ' +
'marble marsh meadow mesa mica mildew millet mineral mist moss mustard nectar nettle nutmeg ' +
'oasis obsidian ochre onyx opal orchard otter oyster paddle palm pantry papyrus parsley pasture ' +
'pebble pelican pewter pigment pillar pine pitcher plateau plaster plover plum pollen pond ' +
'poplar poppy prairie pumice pumpkin quarry quartz quiver radish rafter ranch raven ravine reed ' +
'ridge rivet rowan rudder rust sable saffron sage salmon sandal sapling sawdust scallop sedge ' +
'sequoia shale shovel shrub silo silt slate sledge sloop sorrel spindle spire spruce stable ' +
'stallion steeple stirrup stubble sumac summit sundial swallow sycamore syrup tallow tamarind ' +
'tangle tapestry teak tendril thicket thimble thistle thorn thunder timber tinder toad torrent ' +
'trellis trout trowel tulip tundra turnip turtle tusk valley vanilla vellum velvet vessel ' +
'vineyard violet vulture walnut warbler wattle weasel wharf wheat whisker willow windmill ' +
'wisteria wombat woodland wren yarrow yeast yucca zinc zircon').split(' ');

/* Four words drawn without replacement, from the browser's cryptographic RNG so
   that no two students collide by chance and nobody's phrase depends on the
   clock. */
function rollPhrase(n) {
  n = n || 4;
  const pool = WORDS.slice(), out = [];
  const r = new Uint32Array(n);
  crypto.getRandomValues(r);
  for (let i = 0; i < n; i++) out.push(pool.splice(r[i] % pool.length, 1)[0]);
  return out.join(' ');
}

if (typeof module !== 'undefined') module.exports = {WORDS, rollPhrase};


/* ---------------------------------------------------------------- ZIP writer

   Store or deflate, then local headers, central directory, end record. The
   timestamp is fixed rather than read from the clock, so the same phrase
   produces a byte-identical archive whenever it is entered. */
const CRCT = (function () {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ c >>> 1 : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

const crc32 = u8 => {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < u8.length; i++) c = CRCT[(c ^ u8[i]) & 255] ^ c >>> 8;
  return (c ^ 0xFFFFFFFF) >>> 0;
};

async function deflateRaw(u8) {
  if (typeof CompressionStream === 'undefined') return null;
  try {
    const cs = new CompressionStream('deflate-raw');
    const w = cs.writable.getWriter();
    w.write(u8); w.close();
    const out = new Uint8Array(await new Response(cs.readable).arrayBuffer());
    return out.length < u8.length ? out : null;
  } catch (e) { return null; }
}

const DOS_TIME = 0, DOS_DATE = (2026 - 1980) << 9 | 9 << 5 | 1;   /* 2026-09-01 */

async function makeZip(files) {
  const enc = new TextEncoder(), parts = [], central = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name);
    const raw = typeof f.data === 'string' ? enc.encode(f.data) : f.data;
    const def = await deflateRaw(raw);
    const body = def || raw, method = def ? 8 : 0, sum = crc32(raw);

    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true);
    lh.setUint16(6, 0, true);          lh.setUint16(8, method, true);
    lh.setUint16(10, DOS_TIME, true);  lh.setUint16(12, DOS_DATE, true);
    lh.setUint32(14, sum, true);       lh.setUint32(18, body.length, true);
    lh.setUint32(22, raw.length, true); lh.setUint16(26, name.length, true);
    lh.setUint16(28, 0, true);
    parts.push(new Uint8Array(lh.buffer), name, body);

    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true); cd.setUint16(4, 20, true);
    cd.setUint16(6, 20, true);         cd.setUint16(8, 0, true);
    cd.setUint16(10, method, true);    cd.setUint16(12, DOS_TIME, true);
    cd.setUint16(14, DOS_DATE, true);  cd.setUint32(16, sum, true);
    cd.setUint32(20, body.length, true); cd.setUint32(24, raw.length, true);
    cd.setUint16(28, name.length, true); cd.setUint32(42, offset, true);
    central.push(new Uint8Array(cd.buffer), name);
    offset += 30 + name.length + body.length;
  }
  const cdSize = central.reduce((s, p) => s + p.length, 0);
  const eo = new DataView(new ArrayBuffer(22));
  eo.setUint32(0, 0x06054b50, true);
  eo.setUint16(8, files.length, true); eo.setUint16(10, files.length, true);
  eo.setUint32(12, cdSize, true);      eo.setUint32(16, offset, true);
  return new Blob(parts.concat(central, [new Uint8Array(eo.buffer)]),
                  {type: 'application/zip'});
}

/* ------------------------------------------------------------------- the app */
const $ = id => document.getElementById(id);
const J = async u => {
  const r = await fetch(u);
  if (!r.ok) throw new Error(u + ' returned ' + r.status);
  return r.json();
};
const say = (m, bad) => {
  $('status').textContent = m;
  $('status').classList.toggle('err', !!bad);
};

let INDEX = null, CUR = null;
const slug = p => p.replace(/ /g, '-');
const vehName = t => [t.year, t.make, t.model].filter(Boolean).join(' ');

async function boot() {
  try {
    INDEX = await J('data/tests/index.json');
    say('');
    /* a phrase remembered from an earlier visit comes straight back */
    const saved = window.cgPhrase ? window.cgPhrase.get() : '';
    if (saved) { $('phrase-in').value = saved; setPhrase(saved); }
  } catch (e) {
    say('Could not load the test index. ' + e.message, true);
  }
}

function setPhrase(p) {
  if (!INDEX) { say('Still loading the test index.', true); return; }
  const a = assign(p, INDEX.tests.length, 697, 319);
  if (!a.phrase) { say('Enter a phrase first.', true); return; }
  CUR = a;
  /* remembered, so the header and any demo can load this student's data */
  if (window.cgPhrase) window.cgPhrase.set(a.phrase);
  const t = INDEX.tests[a.crash];
  $('phrase').textContent = a.phrase;
  /* Identity, not description. Naming the vehicle, the speed and the channel
     count here would answer assignment 1 before the student has opened the
     file. The test number is enough to confirm you have the right pack. */
  $('a-crash').textContent = 'number ' + t.no;
  $('a-train').textContent = a.train.length + ' whole arcs';
  $('a-test').textContent = a.test.length + ' arcs at three lengths, without answers';
  $('assigned').classList.remove('hide');
  $('get').disabled = false;
  say('');
}

async function build() {
  const a = CUR, t = INDEX.tests[a.crash];
  $('get').disabled = true;
  try {
    say('Fetching the crash test…');
    const crash = await J('data/tests/' + t.file);
    say('Fetching the shots…');
    const four = await Promise.all(['train', 'test_short', 'test_mid', 'test_long']
      .map(f => J('data/shots/' + f + '.json')));

    const pick = (d, idx) => ({header: d.header, shots: idx.map(i => d.shots[i])});
    const train = pick(four[0], a.train), t6 = pick(four[1], a.test),
          t10 = pick(four[2], a.test),    t14 = pick(four[3], a.test);
    const trainIds = train.shots.map(s => s.id), testIds = t6.shots.map(s => s.id);
    const ms = t.dt * 1000;

    /* Provenance only. What the files CONTAIN is the student's to determine --
       naming the vehicle, the speed and the channel list here would hand them
       the first assignment. The test number is enough for anyone marking it to
       look the rest up. */
    const meta = {
      phrase: a.phrase,
      reproduce: 'Enter this phrase on the course data page to rebuild this pack exactly.',
      crash: {testNo: t.no, file: 'crash/' + t.file},
      shots: {train_file: 'shots/train.json', train_ids: trainIds,
              test_files: ['shots/test_short.json', 'shots/test_mid.json',
                           'shots/test_long.json'],
              test_ids: testIds}
    };

    const readme = [
      'Computational Physical Modeling -- your data',
      'phrase: ' + a.phrase,
      '',
      'This pack was produced by that phrase and nothing else. Entering the same',
      'four words on the course data page rebuilds it exactly. Keep the phrase: it',
      'is how you and anyone marking your work agree on which measurements you had.',
      '',
      'Contents:',
      '',
      '  crash/' + t.file,
      '  shots/train.json',
      '  shots/test_short.json',
      '  shots/test_mid.json',
      '  shots/test_long.json',
      '  meta.json',
      ''
    ].join('\n');

    say('Packing…');
    const S = o => JSON.stringify(o);
    const blob = await makeZip([
      {name: 'README.txt',           data: readme},
      {name: 'meta.json',            data: JSON.stringify(meta, null, 1)},
      {name: 'crash/' + t.file,      data: S(crash)},
      {name: 'shots/train.json',     data: S(train)},
      {name: 'shots/test_short.json',  data: S(t6)},
      {name: 'shots/test_mid.json',  data: S(t10)},
      {name: 'shots/test_long.json',  data: S(t14)}
    ]);

    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url;
    link.download = slug(a.phrase) + '.zip';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    say('Downloaded ' + slug(a.phrase) + '.zip — ' +
        (blob.size / 1024).toFixed(0) + ' KB.');
  } catch (e) {
    say('Something failed: ' + e.message, true);
  }
  $('get').disabled = false;
}

/* rolling replaces the remembered phrase, so a student who already has one
   is asked first; the old phrase is shown so it can be written down */
$('roll').onclick = () => {
  const saved = window.cgPhrase ? window.cgPhrase.get() : '';
  if (saved && !confirm('This browser remembers your phrase "' + saved + '".\n\n' +
      'Rolling gives you a different phrase and different data. Roll anyway?')) return;
  setPhrase(rollPhrase(4));
};
$('show-enter').onclick = () => {
  $('enter-row').classList.toggle('hide');
  $('phrase-in').focus();
};
$('use').onclick = () => setPhrase($('phrase-in').value);
$('phrase-in').addEventListener('keydown', e => {
  if (e.key === 'Enter') setPhrase($('phrase-in').value);
});
$('get').onclick = build;
boot();

/* ---- code: highlighting + per-line notes ---- */
const RULES={
  python:{kw:/\b(def|return|import|from|as|for|in|if|else|elif|while|lambda|None|True|False)\b/g,
          cmt:/#.*$/gm, str:/(['"])(?:\\.|(?!\1).)*\1/g},
  matlab:{kw:/\b(function|end|for|while|if|else|elseif|return|nargin|abs)\b/g,
          cmt:/%.*$/gm, str:/'(?:[^']|'')*'/g},
  js:{kw:/\b(function|const|let|var|return|for|of|in|if|else|new|=>)\b/g,
      cmt:/\/\/.*$/gm, str:/(['"`])(?:\\.|(?!\1).)*\1/g}
};
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function highlight(raw,lang){
  const r=RULES[lang]||RULES.python;
  const marks=[];
  const grab=(re,cls)=>{let m;re.lastIndex=0;while((m=re.exec(raw))){marks.push([m.index,m.index+m[0].length,cls])}};
  grab(r.cmt,'cmt');grab(r.str,'str');
  grab(/\b\d+(\.\d+)?(e-?\d+)?\b/g,'num');grab(r.kw,'kw');
  marks.sort((a,b)=>a[0]-b[0]||b[1]-a[1]);
  let out='',pos=0;
  for(const [s,e,cls] of marks){ if(s<pos)continue;
    out+=esc(raw.slice(pos,s))+`<span class="${cls}">${esc(raw.slice(s,e))}</span>`;pos=e}
  return out+esc(raw.slice(pos));
}
document.querySelectorAll('.codetabs pre').forEach(pre=>{
  const lang=pre.dataset.lang;
  const notes={};
  /* split only where a line number follows, so a note may contain a ';' */
  (pre.dataset.notes||'').split(/;(?=\d+\|)/).filter(Boolean).forEach(s=>{
    const i=s.indexOf('|'); notes[+s.slice(0,i)]=s.slice(i+1);
  });
  const src=pre.textContent.replace(/\n$/,'');
  pre.innerHTML=src.split('\n').map((line,i)=>{
    const note=notes[i+1];
    return `<span class="ln"${note?` data-note="${note.replace(/"/g,'&quot;')}"`:''}>${
      highlight(line,lang)||'&nbsp;'}</span>`;
  }).join('');
});
const LANG_KEY='cg-code-lang';
function applyLang(lang){
  document.querySelectorAll('.codetabs').forEach(box=>{
    /* a box that lacks the chosen language falls back to Python, and one that
       has no Python either (a MATLAB-only guide) to whatever it does have */
    const langs=[...box.querySelectorAll('pre')].map(p=>p.dataset.lang);
    const use=langs.includes(lang)?lang:(langs.includes('python')?'python':langs[0]);
    box.querySelectorAll('pre,.out').forEach(p=>{p.hidden=p.dataset.lang!==use});
    box.querySelectorAll('.tabs button').forEach(b=>b.setAttribute('aria-selected',b.dataset.lang===use));
  });
}
document.querySelectorAll('.codetabs .tabs button').forEach(b=>b.addEventListener('click',()=>{
  localStorage.setItem(LANG_KEY,b.dataset.lang);applyLang(b.dataset.lang)}));
applyLang(localStorage.getItem(LANG_KEY)||'python');

/* ---- glossary: shared store + hover/focus definitions + generated list ----
   data/glossary.json is the single source of truth for every page on the site. */
(async function(){
  let TERMS={};
  try{
    /* no-store because a cached glossary that predates a term makes that term
       silently vanish from the page. On the built site this becomes a hashed
       filename instead; see BUILD_PLAN. */
    const r=await fetch('data/glossary.json',{cache:'no-store'});
    if(!r.ok) throw new Error(r.status);
    TERMS=(await r.json()).terms;
  }catch(e){ console.error('glossary unavailable:',e); return; }

  /* the slide decks have no <main>; measure the page body there instead */
  const used=new Set(), main=(document.querySelector('main')||document.body).getBoundingClientRect();
  document.querySelectorAll('dfn[data-g]').forEach(el=>{
    const e=TERMS[el.dataset.g];
    if(!e){
      /* fail loudly rather than quietly dropping the highlight: an unresolved
         term is an authoring error, not something a reader should absorb */
      console.error('glossary: no entry for',el.dataset.g,'- page is out of step with the store');
      el.removeAttribute('data-g');
      return;
    }
    el.setAttribute('data-def',e.def);
    el.setAttribute('tabindex','0');
    used.add(el.dataset.g);
    if(el.getBoundingClientRect().left-main.left > main.width-440) el.classList.add('right');
  });
  const dl=document.querySelector('dl.glossary');
  if(!dl)return;
  [...used].map(k=>TERMS[k]).sort((a,b)=>a.term.localeCompare(b.term)).forEach(e=>{
    const dt=document.createElement('dt'),dd=document.createElement('dd');
    dt.textContent=e.term;dd.textContent=e.def;dl.append(dt,dd);
  });
})();


/* Printing a closed <details> omits its content in most browsers, so every
   answer is opened before the print and restored afterwards. A reader who has
   opened some already keeps them open. */
(() => {
  let wasOpen = null;
  addEventListener('beforeprint', () => {
    const all = [...document.querySelectorAll('.check .ans')];
    wasOpen = all.map(d => d.open);
    all.forEach(d => { d.open = true; });
  });
  addEventListener('afterprint', () => {
    if (!wasOpen) return;
    [...document.querySelectorAll('.check .ans')].forEach((d, i) => { d.open = wasOpen[i]; });
    wasOpen = null;
  });
})();
/* ---- the data phrase, remembered ----
   A student's four words choose their data (assign.js), and nothing about them
   is stored on the server. This keeps them in the browser so any page can find
   them: the header shows them, the data page restores them, and a demo that can
   load "your data" reads them from here. localStorage belongs to the whole
   climbinggiants.com origin, so the phrase follows the student to every course
   site in the same browser, and to no other device. The phrase itself stays the
   way back from anywhere else. */
const PHRASE_KEY = 'cg-data-phrase';
window.cgPhrase = {
  get() { try { return localStorage.getItem(PHRASE_KEY) || ''; } catch (e) { return ''; } },
  set(p) { try { localStorage.setItem(PHRASE_KEY, p); } catch (e) {} cgPhraseChip(); },
  clear() { try { localStorage.removeItem(PHRASE_KEY); } catch (e) {} cgPhraseChip(); }
};
function cgPhraseChip() {
  const box = document.getElementById('cg-phrase');
  if (!box) return;
  const p = window.cgPhrase.get();
  box.textContent = '';
  const a = document.createElement('a');
  a.href = 'data-pack.html';
  /* The label only: the header has no room for the phrase beside it (see the
     .cg-phrase rules in layout.njk), so the phrase goes in the title. */
  a.textContent = 'Your data';
  a.title = p ? 'Your data phrase: ' + p + ' (remembered on this browser)' : 'Get your data phrase';
  box.appendChild(a);
  if (p) {
    const x = document.createElement('button');
    x.type = 'button';
    x.textContent = '\u00d7';
    x.title = 'Forget this phrase on this browser (your data is not affected)';
    x.setAttribute('aria-label', 'Forget the remembered data phrase');
    x.onclick = () => window.cgPhrase.clear();
    box.appendChild(x);
  }
}
cgPhraseChip();

/* A link marked data-phrase-handoff carries the remembered phrase to a site on
   another origin (the slope lab), which cannot read this localStorage. It goes
   in the fragment, which the browser never sends to a server; the receiving
   page reads it, keeps it, and clears it from the address bar. Set at click
   time so a phrase entered after the page loaded still travels. */
document.addEventListener('click', e => {
  const a = e.target.closest && e.target.closest('a[data-phrase-handoff]');
  if (!a) return;
  const p = window.cgPhrase.get();
  const base = a.href.split('#')[0];
  a.href = p ? base + '#phrase=' + encodeURIComponent(p) : base;
});
