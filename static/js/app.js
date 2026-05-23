/* ──────────────────────────────────────────────────────────────────
   URL params ↔ state
   ────────────────────────────────────────────────────────────────── */
const DEFAULTS = {
  action: 'IM TRADING',
  ln: 'Noobini_Pizzanini', // brainrot id from manifest
  lm: 'default',           // left mutation id
  lt: '',                  // left traits, comma-separated
  lc: 'gold',
  lbg: 'green',            // left frame inner bg
  ls: '',                  // left subtitle (optional)
  rn: 'Strawberry_Elephant', // brainrot id
  rm: 'default',           // right mutation id
  rt: '',                  // right traits, comma-separated
  rc: 'rainbow',
  rbg: 'orange',           // right frame inner bg
  rs: '',
  bg: 'purple',            // outer card bg
  li: '',
  ri: '',
};

function readParams() {
  const u = new URL(location.href);
  const out = {};
  for (const k of Object.keys(DEFAULTS)) {
    out[k] = u.searchParams.get(k) ?? DEFAULTS[k];
  }
  return out;
}

function writeParams(state, replace = true) {
  const u = new URL(location.href);
  for (const k of Object.keys(DEFAULTS)) {
    if (state[k] === DEFAULTS[k] || state[k] === '' || state[k] == null) {
      u.searchParams.delete(k);
    } else {
      u.searchParams.set(k, state[k]);
    }
  }
  const fn = replace ? 'replaceState' : 'pushState';
  history[fn](null, '', u.toString());
  updateShareBox();
  updateOG();
  updateFairExchange();
}

function shareUrl() {
  const u = new URL(location.href);
  for (const k of Object.keys(DEFAULTS)) {
    const v = state[k];
    if (v !== '' && v != null) {
      u.searchParams.set(k, v);
    } else {
      u.searchParams.delete(k);
    }
  }
  return u.toString();
}

/* ──────────────────────────────────────────────────────────────────
   SVG text builders — paint-order: stroke gives clean outline + gradient
   ────────────────────────────────────────────────────────────────── */
const GRADIENT_DEFS = `
  <defs>
    <linearGradient id="g-gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fff5b5"/>
      <stop offset="45%" stop-color="#ffd83a"/>
      <stop offset="100%" stop-color="#ff9d12"/>
    </linearGradient>
    <linearGradient id="g-white" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#e6e6e6"/>
    </linearGradient>
    <linearGradient id="g-cyan" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#c8faff"/>
      <stop offset="45%" stop-color="#5ee8ff"/>
      <stop offset="100%" stop-color="#0a9dc4"/>
    </linearGradient>
    <linearGradient id="g-green" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#c8ff8e"/>
      <stop offset="45%" stop-color="#5fd61a"/>
      <stop offset="100%" stop-color="#1e8a00"/>
    </linearGradient>
    <linearGradient id="g-pink" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffd1e8"/>
      <stop offset="45%" stop-color="#ff5aca"/>
      <stop offset="100%" stop-color="#c01680"/>
    </linearGradient>
    <linearGradient id="g-rainbow" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="#ff3a3a"/>
      <stop offset="14%"  stop-color="#ff8a1e"/>
      <stop offset="28%"  stop-color="#ffd83a"/>
      <stop offset="42%"  stop-color="#5fd61a"/>
      <stop offset="56%"  stop-color="#5ee8ff"/>
      <stop offset="70%"  stop-color="#5b6aff"/>
      <stop offset="84%"  stop-color="#b14aff"/>
      <stop offset="100%" stop-color="#ff5aca"/>
    </linearGradient>
  </defs>
`;

function escSvg(t) {
  return (t || '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}

function fillFor(color) {
  if (!color || color === 'white') return 'url(#g-white)';
  return `url(#g-${color})`;
}

// Measure text natural width using canvas
function measureText(text, fontSize, fontFamily = "'Lilita One', sans-serif") {
  const c = measureText._c || (measureText._c = document.createElement('canvas'));
  const ctx = c.getContext('2d');
  ctx.font = `${fontSize}px ${fontFamily}`;
  return ctx.measureText(text || '').width;
}

/**
 * One-line outlined text rendered as inline SVG.
 *  - viewBox is 1200×fontSize*1.2, text-anchor=middle at x=600
 *  - if natural text > maxWidth, compress via textLength to fit
 *  - paint-order=stroke draws stroke under fill so gradient stays clean
 */
function formatIncome(n) {
  if (!n || n <= 0) return null;
  const fmt = v => parseFloat(v.toPrecision(4)).toString();
  if (n >= 1_000_000_000) return `$${fmt(n / 1_000_000_000)}B/s`;
  if (n >= 1_000_000) return `$${fmt(n / 1_000_000)}M/s`;
  if (n >= 1_000)     return `$${fmt(n / 1_000)}K/s`;
  return `$${n}/s`;
}

function svgText(text, opts = {}) {
  const {
    fontSize = 140,
    strokeWidth = 14,
    color = 'white',
    maxWidth = 1140,
    fill = false,  // when true, always stretch to maxWidth (used for title)
  } = opts;
  const safe = escSvg(text);
  const vbH = Math.round(fontSize * 1.25);
  const baseY = Math.round(vbH * 0.82);
  const natural = measureText(text, fontSize);
  const shouldStretch = fill || natural > maxWidth;
  const lengthAttr = shouldStretch
    ? `textLength="${maxWidth}" lengthAdjust="spacingAndGlyphs"`
    : '';
  return `
    <div class="o-text-wrap">
      <svg viewBox="0 0 1200 ${vbH}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" style="overflow: visible;">
        ${GRADIENT_DEFS}
        <text x="600" y="${baseY}" text-anchor="middle"
          ${lengthAttr}
          font-family="'Lilita One', sans-serif" font-size="${fontSize}"
          font-weight="400" letter-spacing="2"
          paint-order="stroke" stroke="#0c0a08" stroke-width="${strokeWidth}"
          stroke-linejoin="round" stroke-linecap="round"
          fill="${fillFor(color)}">${safe}</text>
      </svg>
    </div>
  `;
}

/**
 * Subtitle with colored words via tspans. Parses {color:WORD} markup.
 */
function svgSubtitle(raw, fontSize = 60, strokeWidth = 7) {
  if (!raw) return '';
  // Split into tokens: plain text and {color:WORD}
  const parts = [];
  let i = 0;
  const re = /\{(gold|cyan|green|pink|rainbow|white):([^}]+)\}/gi;
  let m;
  while ((m = re.exec(raw)) !== null) {
    if (m.index > i) parts.push({ text: raw.slice(i, m.index), color: 'white' });
    parts.push({ text: m[2], color: m[1].toLowerCase() });
    i = m.index + m[0].length;
  }
  if (i < raw.length) parts.push({ text: raw.slice(i), color: 'white' });

  // Need to handle line breaks too — split on \n
  const lines = [[]];
  for (const p of parts) {
    const segs = p.text.split('\n');
    segs.forEach((seg, idx) => {
      if (idx > 0) lines.push([]);
      if (seg) lines[lines.length - 1].push({ text: seg, color: p.color });
    });
  }

  const vbH = Math.round(fontSize * 1.25 * lines.length + 8);
  const lineH = Math.round(fontSize * 1.2);
  const baseY0 = Math.round(fontSize * 0.95);

  const lineSvg = (line, lineIdx) => {
    const tspans = line.map(seg => {
      const safe = escSvg(seg.text);
      return `<tspan fill="${fillFor(seg.color)}">${safe}</tspan>`;
    }).join('');
    return `
      <text x="600" y="${baseY0 + lineIdx * lineH}" text-anchor="middle"
        font-family="'Lilita One', sans-serif" font-size="${fontSize}"
        letter-spacing="1"
        paint-order="stroke" stroke="#0c0a08" stroke-width="${strokeWidth}"
        stroke-linejoin="round" stroke-linecap="round"
        fill="url(#g-white)">${tspans}</text>
    `;
  };

  return `
    <div class="o-text-wrap" style="height: auto;">
      <svg viewBox="0 0 1200 ${vbH}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
        ${GRADIENT_DEFS}
        ${lines.map(lineSvg).join('')}
      </svg>
    </div>
  `;
}

/* ──────────────────────────────────────────────────────────────────
   Card render
   ────────────────────────────────────────────────────────────────── */

/* ──────────────────────────────────────────────────────────────────
   Brainrot catalog
   ────────────────────────────────────────────────────────────────── */
const BRAINROT_BASE = 'static/images/brainrot/';
let BRAINROTS = [];      // [{id, name, image}]
let BR_BY_ID = {};

async function loadBrainrots() {
  try {
    const r = await fetch('static/brainrots.json');
    const j = await r.json();
    BRAINROTS = (j.brainrots || []).map(b => ({
      id: b.id,
      name: b.name || b.id,
      image: BRAINROT_BASE + b.id + '.' + (b.ext || 'webp'),
      income: b.income ?? null,
    })).sort((a, b) => a.name.localeCompare(b.name));
    BR_BY_ID = Object.fromEntries(BRAINROTS.map(b => [b.id, b]));
  } catch (e) {
    console.warn('Could not load brainrots.json', e);
    BRAINROTS = [];
  }
}

let MUTATIONS = [];
let MUTATIONS_BY_ID = {};
let TRAITS = [];
let TRAITS_BY_ID = {};

async function loadMutationsAndTraits() {
  try {
    [MUTATIONS, TRAITS] = await Promise.all([
      fetch('static/mutations.json').then(r => r.json()),
      fetch('static/traits.json').then(r => r.json()),
    ]);
    MUTATIONS.forEach(m => MUTATIONS_BY_ID[m.id] = m);
    TRAITS.forEach(t => TRAITS_BY_ID[t.id] = t);
  } catch (e) {
    console.warn('Could not load mutations/traits', e);
  }
}

function brainrotById(id) {
  if (BR_BY_ID[id]) return BR_BY_ID[id];
  // Fall back: synthesize from raw id so user-typed values still render
  const pretty = String(id || '').replace(/[-_]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim();
  return { id, name: pretty || 'No Brainrot', image: id ? BRAINROT_BASE + id + '.webp' : '' };
}

/* ──────────────────────────────────────────────────────────────────
   Autocomplete component
   Mounts into a container; reports selection via onSelect(id).
   ────────────────────────────────────────────────────────────────── */
function mountAutocomplete(container, initialId, onSelect) {
  const wrap = container;
  wrap.innerHTML = `
    <div class="ac-input-row">
      <img class="ac-brainrot-icon" src="" alt="" />
      <input class="ac-input" type="text" autocomplete="off" placeholder="Search brainrot…" />
      <button class="ac-clear-btn" type="button" title="Clear">×</button>
    </div>
    <div class="ac-list" role="listbox"></div>
  `;
  const input = wrap.querySelector('.ac-input');
  const list = wrap.querySelector('.ac-list');
  const icon = wrap.querySelector('.ac-brainrot-icon');
  const clearBtn = wrap.querySelector('.ac-clear-btn');
  let activeIdx = -1;
  let filtered = [];

  function setValueFromId(id) {
    const b = brainrotById(id);
    input.value = b.name;
    if (b.image && id) {
      icon.src = b.image;
      icon.classList.add('visible');
    } else {
      icon.src = '';
      icon.classList.remove('visible');
    }
    clearBtn.classList.toggle('visible', !!input.value);
  }
  setValueFromId(initialId);

  function render(q) {
    const qLow = q.toLowerCase().trim();
    filtered = BRAINROTS.filter(b => !qLow || b.name.toLowerCase().includes(qLow));
    activeIdx = -1;
    list.innerHTML = filtered.slice(0, 100).map((b, i) => `
      <div class="ac-item" data-idx="${i}" data-id="${b.id}">
        <div class="thumb" style="background-image:url('${b.image}')">${b.image ? '' : '?'}</div>
        <div class="name">${b.name}</div>
      </div>
    `).join('') || `<div class="ac-item" style="color:#8a7060">No match — type to add custom name</div>`;
  }

  function open() {
    render(input.value);
    list.classList.add('open');
  }
  function close() { list.classList.remove('open'); }
  function commit(id, displayName) {
    const b = brainrotById(id);
    input.value = displayName || b.name;
    if (b.image && id) {
      icon.src = b.image;
      icon.classList.add('visible');
    } else {
      icon.src = '';
      icon.classList.remove('visible');
    }
    clearBtn.classList.toggle('visible', !!input.value);
    onSelect(id);
    close();
  }

  input.addEventListener('focus', open);
  input.addEventListener('input', () => {
    render(input.value);
    list.classList.add('open');
    icon.src = '';
    icon.classList.remove('visible');
    clearBtn.classList.toggle('visible', !!input.value);
    // Also report typed value as the id (so user can use custom names)
    onSelect(input.value);
  });
  clearBtn.addEventListener('click', () => {
    input.value = '';
    icon.src = '';
    icon.classList.remove('visible');
    clearBtn.classList.remove('visible');
    onSelect('');
    input.focus();
  });
  input.addEventListener('keydown', e => {
    const items = list.querySelectorAll('.ac-item[data-id]');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIdx = Math.min(activeIdx + 1, items.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIdx = Math.max(activeIdx - 1, 0);
    } else if (e.key === 'Enter') {
      if (activeIdx >= 0 && items[activeIdx]) {
        e.preventDefault();
        commit(items[activeIdx].dataset.id);
      } else {
        close();
      }
    } else if (e.key === 'Escape') {
      close();
    }
    items.forEach((el, i) => el.classList.toggle('active', i === activeIdx));
  });
  list.addEventListener('mousedown', e => {
    const item = e.target.closest('.ac-item[data-id]');
    if (item) {
      e.preventDefault();
      commit(item.dataset.id);
    }
  });
  document.addEventListener('click', e => {
    if (!wrap.contains(e.target)) close();
  });

  return {
    setId(id) { setValueFromId(id); },
  };
}

const EGG_TRAITS = new Set(['orange_egg', 'green_egg', 'blue_egg', 'pink_egg']);

let leftAC = null, rightAC = null;

function calcTotalIncomeRaw(base, mutId, traitIds) {
  if (!base || base <= 0) return 0;
  const mut = MUTATIONS_BY_ID[mutId] || MUTATIONS_BY_ID['default'] || { multiplier: 1 };
  const traitObjs = traitIds.map(id => TRAITS_BY_ID[id]).filter(Boolean);
  const normalTraits = traitObjs.filter(t => t.id !== 'sleepy');
  const hasSleepy = traitObjs.some(t => t.id === 'sleepy');
  const numTraits = normalTraits.length;
  const traitMultSum = normalTraits.reduce((s, t) => s + t.multiplier, 0);
  let total = (base * mut.multiplier) + (numTraits > 0 ? base * (traitMultSum - numTraits) : 0);
  if (hasSleepy) total *= 0.5;
  return Math.round(total);
}

function formatTotalIncome(base, mutId, traitIds) {
  const n = calcTotalIncomeRaw(base, mutId, traitIds);
  return n > 0 ? formatIncome(n) : null;
}

function render(state) {
  const wrap = document.getElementById('card-wrap');
  const esc = (t) => (t || '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  const lBrainrot = brainrotById(state.ln);
  const rBrainrot = brainrotById(state.rn);
  const leftLabel  = (lBrainrot.name || '').trim().toUpperCase();
  const rightLabel = (rBrainrot.name || '').trim().toUpperCase();

  const lTraits = (state.lt || '').split(',').filter(Boolean);
  const rTraits = (state.rt || '').split(',').filter(Boolean);

  // Title fills width for big banner feel
  const titleFs = state.action && state.action.length > 14 ? 150 : 180;
  const titleSw = Math.round(titleFs / 9);

  // Side labels: pick a font size that comfortably fits 1140-wide viewBox
  const sideFs = (txt) => {
    if (!txt) return 110;
    if (txt.length <= 9)  return 140;
    if (txt.length <= 14) return 115;
    if (txt.length <= 22) return 92;
    if (txt.length <= 32) return 74;
    return 60;
  };
  const sideSw = (fs) => Math.round(fs / 10);

  const lFs = sideFs(leftLabel);
  const rFs = sideFs(rightLabel);
  const sharedLabelFs = Math.min(lFs, rFs);
  const subFs = 56;

  const frameImg = (b, mutId, traitIds) => {
    if (!b.image) return `<div class="brainrot-missing"><div class="glyph">?</div><div>NO BRAINROT</div></div>`;
    const safeName = esc(b.name);
    const incomeStr = formatTotalIncome(b.income, mutId, traitIds);
    const badge = incomeStr ? `<div class="income-badge">${incomeStr}</div>` : '';

    const mut = MUTATIONS_BY_ID[mutId];
    const mutIcon = mut && mutId !== 'default'
      ? `<img class="mutation-badge" src="static/images/mutations/${esc(mut.file)}" alt="${esc(mut.name)}" onerror="this.style.display='none'" />`
      : '';

    const traitIconsHtml = traitIds.map(id => {
      const t = TRAITS_BY_ID[id];
      if (!t) return '';
      return `<img class="trait-badge" src="static/images/traits/${esc(t.file)}" alt="${esc(t.name)}" title="${esc(t.name)}" onerror="this.style.display='none'" />`;
    }).join('');
    const traitCol = traitIconsHtml ? `<div class="trait-badges">${traitIconsHtml}</div>` : '';

    return `
      <img class="brainrot-img" src="${esc(b.image)}" alt="${safeName}"
        onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
      <div class="brainrot-missing" style="display:none">
        <div class="glyph">?</div>
        <div>${safeName.toUpperCase()}<br/>IMAGE MISSING</div>
      </div>
      ${badge}
      ${mutIcon}
      ${traitCol}
    `;
  };

  wrap.innerHTML = `
    <div class="card-frame bg-${state.bg}" id="card">
      <div class="rays"></div>

      <div class="card-title">
        ${svgText(state.action || '', { fontSize: titleFs, strokeWidth: titleSw, color: 'white', fill: true })}
      </div>

      <div class="grid">
        <div class="side">
          <div class="side-label">
            ${svgText(leftLabel, { fontSize: sharedLabelFs, strokeWidth: sideSw(sharedLabelFs), color: state.lc })}
          </div>
          <div class="pixel-frame">
            <div class="pixel-frame-inner fb-${state.lbg}">
              ${frameImg(lBrainrot, state.lm || 'default', lTraits)}
            </div>
          </div>
          ${state.ls ? `<div class="subtitle">${svgSubtitle(state.ls, subFs, 6)}</div>` : ''}
        </div>

        <div class="arrow">
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
            <g fill="#3acb3a" stroke="#0c0a08" stroke-width="5" stroke-linejoin="miter">
              <polygon points="4,36 56,36 56,16 96,50 56,84 56,64 4,64" />
            </g>
          </svg>
        </div>

        <div class="side">
          <div class="side-label">
            ${svgText(rightLabel, { fontSize: sharedLabelFs, strokeWidth: sideSw(sharedLabelFs), color: state.rc })}
          </div>
          <div class="pixel-frame">
            <div class="pixel-frame-inner fb-${state.rbg}">
              ${frameImg(rBrainrot, state.rm || 'default', rTraits)}
            </div>
          </div>
          ${state.rs ? `<div class="subtitle">${svgSubtitle(state.rs, subFs, 6)}</div>` : ''}
        </div>
      </div>

      <div class="watermark">brainrot.girard-davila.net</div>
    </div>
  `;
  fitCard();
}

/* scale 1200×800 card to fit available space */
function fitCard() {
  const card = document.getElementById('card');
  const wrap = document.getElementById('card-wrap');
  if (!card || !wrap) return;
  const header = document.querySelector('.editor-header');
  const headerH = header ? header.getBoundingClientRect().height : 120;
  const sw = Math.min(850, window.innerWidth) - 48;
  const sh = Math.max(window.innerHeight - headerH - 60, 400);
  const cw = 1200, ch = 800;
  const scale = Math.min(sw / cw, sh / ch, 1);
  card.style.transform = `scale(${scale})`;
  wrap.style.width  = (cw * scale) + 'px';
  wrap.style.height = (ch * scale) + 'px';
}
window.addEventListener('resize', fitCard);
requestAnimationFrame(() => requestAnimationFrame(fitCard));

/* ──────────────────────────────────────────────────────────────────
   Editor wiring
   ────────────────────────────────────────────────────────────────── */
let state = readParams();

function mountCustomSelect(containerId, items, initialValue, onChange) {
  const wrap = document.getElementById(containerId);
  wrap.classList.add('cs-wrap');

  const triggerIcon = document.createElement('img');
  triggerIcon.className = 'cs-trigger-icon';
  triggerIcon.addEventListener('error', () => { triggerIcon.style.display = 'none'; });

  const triggerLabel = document.createElement('span');
  triggerLabel.className = 'cs-trigger-label';

  const arrow = document.createElement('span');
  arrow.className = 'cs-arrow';
  arrow.textContent = '▾';

  const trigger = document.createElement('div');
  trigger.className = 'cs-trigger';
  trigger.tabIndex = 0;
  trigger.append(triggerIcon, triggerLabel, arrow);

  const list = document.createElement('div');
  list.className = 'cs-list';
  list.setAttribute('role', 'listbox');
  list.innerHTML = items.map(item => `
    <div class="cs-option" data-value="${item.value}" role="option">
      <img class="cs-option-icon" src="${item.iconSrc}" alt="" onerror="this.style.display='none'" />
      <span>${item.label}</span>
    </div>
  `).join('');

  wrap.innerHTML = '';
  wrap.append(trigger, list);

  let currentValue = initialValue;

  function updateTrigger(value) {
    const item = items.find(i => i.value === value) || items[0];
    if (!item) return;
    currentValue = item.value;
    triggerIcon.src = item.iconSrc;
    triggerIcon.style.display = '';
    triggerLabel.textContent = item.label;
    list.querySelectorAll('.cs-option').forEach(el =>
      el.classList.toggle('selected', el.dataset.value === item.value)
    );
  }

  updateTrigger(initialValue);

  trigger.addEventListener('click', () => wrap.classList.toggle('open'));
  trigger.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); wrap.classList.toggle('open'); }
    if (e.key === 'Escape') wrap.classList.remove('open');
  });
  list.addEventListener('mousedown', e => {
    const opt = e.target.closest('.cs-option');
    if (!opt) return;
    e.preventDefault();
    updateTrigger(opt.dataset.value);
    wrap.classList.remove('open');
    onChange(opt.dataset.value);
  });
  document.addEventListener('click', e => {
    if (!wrap.contains(e.target)) wrap.classList.remove('open');
  });

  return { getValue: () => currentValue, setValue: (v) => updateTrigger(v) };
}

let leftMutCS, rightMutCS, leftTraitCS, rightTraitCS;

function initCustomSelects() {
  const mutItems = MUTATIONS.map(m => ({
    value: m.id,
    label: `${m.name} (${m.multiplier}×)`,
    iconSrc: `static/images/mutations/${m.file}`,
  }));
  const traitItems = TRAITS.map(t => ({
    value: t.id,
    label: `${t.name} (${t.multiplier}×)`,
    iconSrc: `static/images/traits/${t.file}`,
  }));

  leftMutCS  = mountCustomSelect('f-lm', mutItems, state.lm || 'default',
    v => { state.lm = v; writeParams(state); render(state); typeof gtag === 'function' && gtag('event', 'select_mutation', { side: 'left', mutation_id: v }); });
  rightMutCS = mountCustomSelect('f-rm', mutItems, state.rm || 'default',
    v => { state.rm = v; writeParams(state); render(state); typeof gtag === 'function' && gtag('event', 'select_mutation', { side: 'right', mutation_id: v }); });
  leftTraitCS  = mountCustomSelect('f-lt-pick', traitItems, traitItems[0]?.value, () => {});
  rightTraitCS = mountCustomSelect('f-rt-pick', traitItems, traitItems[0]?.value, () => {});
}

function renderTraitChips(side, csv) {
  const listEl = document.getElementById(`tl-${side}`);
  const ids = (csv || '').split(',').filter(Boolean);
  listEl.innerHTML = ids.map(id => {
    const t = TRAITS_BY_ID[id];
    const label = t ? t.name : id;
    const icon = t ? `<img src="static/images/traits/${t.file}" alt="" onerror="this.style.display='none'" />` : '';
    return `<span class="trait-chip" data-id="${id}">${icon}${label}<button class="trait-chip-remove" type="button" data-side="${side}" data-trait="${id}">×</button></span>`;
  }).join('');
}

function syncEditorFromState() {
  document.getElementById('f-ls').value = state.ls;
  document.getElementById('f-rs').value = state.rs;
  document.getElementById('f-lc').value = state.lc;
  document.getElementById('f-rc').value = state.rc;
  leftMutCS?.setValue(state.lm || 'default');
  rightMutCS?.setValue(state.rm || 'default');
  if (leftAC)  leftAC.setId(state.ln);
  if (rightAC) rightAC.setId(state.rn);
  renderTraitChips('left',  state.lt);
  renderTraitChips('right', state.rt);
  // Sync all swatch groups
  document.querySelectorAll('.swatches[data-bg-target]').forEach(group => {
    const key = group.dataset.bgTarget;
    group.querySelectorAll('.swatch').forEach(el => {
      el.classList.toggle('active', el.dataset.bg === state[key]);
    });
  });
}

function bindEditor() {
  const bind = (id, key) => {
    document.getElementById(id).addEventListener('input', e => {
      state[key] = e.target.value;
      writeParams(state);
      render(state);
    });
  };
  bind('f-ls', 'ls');
  bind('f-rs', 'rs');
  bind('f-lc', 'lc');
  bind('f-rc', 'rc');
  ['f-lc', 'f-rc'].forEach(id => {
    document.getElementById(id).addEventListener('change', e => {
      typeof gtag === 'function' && gtag('event', 'select_name_color', { side: id === 'f-lc' ? 'left' : 'right', color: e.target.value });
    });
  });

  // Mutation selects are handled via mountCustomSelect onChange callbacks

  // Trait add buttons
  const addTrait = (side, cs, stateKey) => {
    document.getElementById(`btn-${side}t-add`).addEventListener('click', () => {
      const traitId = cs.getValue();
      if (!traitId) return;
      const current = (state[stateKey] || '').split(',').filter(Boolean);
      if (current.includes(traitId)) return;
      if (EGG_TRAITS.has(traitId) && current.some(id => EGG_TRAITS.has(id))) return;
      current.push(traitId);
      state[stateKey] = current.join(',');
      writeParams(state);
      render(state);
      renderTraitChips(side === 'l' ? 'left' : 'right', state[stateKey]);
      typeof gtag === 'function' && gtag('event', 'add_trait', { side: side === 'l' ? 'left' : 'right', trait_id: traitId });
    });
  };
  addTrait('l', leftTraitCS,  'lt');
  addTrait('r', rightTraitCS, 'rt');

  // Trait remove (delegated on trait lists)
  const removeTrait = (listId, stateKey, chipSide) => {
    document.getElementById(listId).addEventListener('click', e => {
      const btn = e.target.closest('.trait-chip-remove');
      if (!btn) return;
      const traitId = btn.dataset.trait;
      const current = (state[stateKey] || '').split(',').filter(id => id && id !== traitId);
      state[stateKey] = current.join(',');
      writeParams(state);
      render(state);
      renderTraitChips(chipSide, state[stateKey]);
      typeof gtag === 'function' && gtag('event', 'remove_trait', { side: chipSide, trait_id: traitId });
    });
  };
  removeTrait('tl-left',  'lt', 'left');
  removeTrait('tl-right', 'rt', 'right');

  // All swatch groups (bg, lbg, rbg)
  document.querySelectorAll('.swatches[data-bg-target]').forEach(group => {
    const key = group.dataset.bgTarget;
    group.querySelectorAll('.swatch').forEach(el => {
      el.addEventListener('click', () => {
        state[key] = el.dataset.bg;
        writeParams(state);
        render(state);
        syncEditorFromState();
        typeof gtag === 'function' && gtag('event', 'select_color', { color_target: key, color: el.dataset.bg });
      });
    });
  });

  // Autocompletes
  leftAC = mountAutocomplete(document.getElementById('ac-left'), state.ln, (id) => {
    state.ln = id;
    writeParams(state);
    render(state);
    const b = id && BRAINROTS.find(br => br.id === id);
    if (b) typeof gtag === 'function' && gtag('event', 'select_brainrot', { side: 'left', brainrot_id: id, brainrot_name: b.name });
  });
  rightAC = mountAutocomplete(document.getElementById('ac-right'), state.rn, (id) => {
    state.rn = id;
    writeParams(state);
    render(state);
    const b = id && BRAINROTS.find(br => br.id === id);
    if (b) typeof gtag === 'function' && gtag('event', 'select_brainrot', { side: 'right', brainrot_id: id, brainrot_name: b.name });
  });

  // VISUAL section toggle
  document.querySelectorAll('.side-edit-sub-head').forEach(head => {
    head.addEventListener('click', () => {
      head.closest('.side-edit-sub').classList.toggle('collapsed');
    });
  });

  document.getElementById('btn-share').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(shareUrl());
      toast('Link copied!');
      typeof gtag === 'function' && gtag('event', 'share_card', { success: true });
    } catch {
      toast('Copy failed — select URL manually');
      typeof gtag === 'function' && gtag('event', 'share_card', { success: false });
    }
  });

  document.getElementById('btn-download').addEventListener('click', () => {
    typeof gtag === 'function' && gtag('event', 'download_card');
    downloadPNG();
  });
}

function updateShareBox() {
  document.getElementById('share-url').textContent = shareUrl();
}

function updateFairExchange() {
  const el = document.getElementById('fair-exchange');
  if (!el) return;
  const lB = brainrotById(state.ln);
  const rB = brainrotById(state.rn);
  const lInc = calcTotalIncomeRaw(lB.income, state.lm, (state.lt || '').split(',').filter(Boolean));
  const rInc = calcTotalIncomeRaw(rB.income, state.rm, (state.rt || '').split(',').filter(Boolean));

  document.getElementById('fe-left-val').textContent  = lInc > 0 ? formatIncome(lInc) : '—';
  document.getElementById('fe-right-val').textContent = rInc > 0 ? formatIncome(rInc) : '—';

  const maxInc = Math.max(lInc, rInc);
  if (maxInc === 0) { el.dataset.balance = ''; return; }

  const absRatio = Math.abs(lInc - rInc) / maxInc;
  el.dataset.balance = absRatio < 0.1 ? 'fair' : absRatio < 0.4 ? 'orange' : 'unfair';
}

function updateOG() {
  const lName = brainrotById(state.ln).name;
  const rName = brainrotById(state.rn).name;
  const subClean = (s) => (s || '').replace(/\{[^:]+:([^}]+)\}/g, '$1').replace(/\n/g, ' ').trim();

  // Title: optimal 50-60 chars
  let title = `${state.action}: ${lName} → ${rName}`;
  if (title.length > 60) title = title.slice(0, 57) + '…';

  // Description: optimal 110-160 chars
  const rsClean = subClean(state.rs);
  const base = `Offering ${lName} in exchange for ${rName}.`;
  const suffix = ' Trade on Brainrot Trading Cards!';
  const mid = rsClean ? ` ${rsClean}.` : '';
  let desc = base + mid + suffix;
  if (desc.length > 160) {
    const budget = 160 - base.length - suffix.length - 2;
    desc = base + (budget > 0 ? ' ' + rsClean.slice(0, budget) + '…' : '') + suffix;
  }

  const img = `https://brainrot-og.girard-davila.net/render?u=${encodeURIComponent(location.href)}`;
  const alt = `${lName} for ${rName} trading card`;
  document.title = `${state.action} — ${lName} → ${rName}`;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.setAttribute('content', val); };
  set('og-url',       location.href);
  set('og-title',     title);
  set('og-desc',      desc);
  set('og-image',     img);
  set('og-image-alt', alt);
  set('tw-title',     title);
  set('tw-desc',      desc);
  set('tw-image',     img);
  set('tw-image-alt', alt);
}

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 1800);
}

/* ──────────────────────────────────────────────────────────────────
   Font embedding — dom-to-image cannot read cross-origin <link>
   stylesheets, so Google Fonts fall back to system fonts in the PNG.
   We fetch the font CSS + binaries and inject them as an inline
   <style> with base64 data URIs that dom-to-image CAN access.
   ────────────────────────────────────────────────────────────────── */
function _arrayBufToBase64(buf) {
  let bin = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 8192) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(bin);
}

async function embedGoogleFonts() {
  if (document.getElementById('embedded-fonts')) return;
  try {
    const cssUrl = 'https://fonts.googleapis.com/css2?family=Lilita+One&family=Press+Start+2P&family=Bungee&display=swap';
    const cssResp = await fetch(cssUrl);
    let css = await cssResp.text();

    // Replace each font URL with a base64 data URI
    const matches = [...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/g)];
    await Promise.all(matches.map(async ([, url]) => {
      const fontResp = await fetch(url);
      const buf = await fontResp.arrayBuffer();
      const b64 = _arrayBufToBase64(buf);
      const fmt = url.includes('.woff2') ? 'woff2' : 'woff';
      css = css.replaceAll(url, `data:font/${fmt};base64,${b64}`);
    }));

    const style = document.createElement('style');
    style.id = 'embedded-fonts';
    style.textContent = css;
    document.head.appendChild(style);
  } catch (e) {
    console.warn('Font embedding failed — PNG may use fallback fonts', e);
  }
}

/* ──────────────────────────────────────────────────────────────────
   Download as PNG (client-side rasterization)
   ────────────────────────────────────────────────────────────────── */
async function downloadPNG() {
  toast('Rendering…');
  const card = document.getElementById('card');

  const prevTransform = card.style.transform;
  card.style.transform = 'none';

  try {
    if (!window.domtoimage) {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/dom-to-image/2.6.0/dom-to-image.min.js';
        s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
    }

    // Embed fonts as base64 so dom-to-image can access @font-face rules
    await embedGoogleFonts();

    const blob = await domtoimage.toBlob(card, { width: 1200, height: 800 });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `trade-${(state.ln||'card').toLowerCase()}-${Date.now()}.png`;
    a.click();
    toast('Downloaded!');
  } catch (e) {
    console.error(e);
    toast('Download failed');
  } finally {
    card.style.transform = prevTransform;
  }
}

/* ──────────────────────────────────────────────────────────────────
   Init
   ────────────────────────────────────────────────────────────────── */
(async () => {
  await Promise.all([loadBrainrots(), loadMutationsAndTraits()]);
  initCustomSelects();
  bindEditor();
  syncEditorFromState();
  render(state);
  updateShareBox();
  updateOG();
  updateFairExchange();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(fitCard);
  }
})();
