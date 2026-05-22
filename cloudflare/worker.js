const BARE_RENDER = 'https://brainrot-og.girard-davila.net/render?u=https%3A%2F%2Fbrainrot.girard-davila.net%2F';
const RENDERER    = 'https://brainrot-og.girard-davila.net/render';
const GH_ORIGIN   = 'https://alx.github.io/brainrot-trading-cards';

// Mirrors DEFAULTS in static/js/app.js
const DEFAULTS = {
  action: 'IM TRADING',
  ln: 'Noobini_Pizzanini', lm: 'default', lt: '', lq: '1',
  lc: 'gold', lbg: 'green', ls: '',
  rn: 'Strawberry_Elephant', rm: 'default', rt: '', rq: '1',
  rc: 'rainbow', rbg: 'orange',
  rs: 'DONT NEED BASE,\n{gold:GOLD} AND {cyan:DIAMOND}',
  bg: 'purple', li: '', ri: '',
};

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Replace content="..." in the tag that carries the given id.
// In index.html, id always appears before content on the same line.
function setMeta(html, id, value) {
  return html.replace(
    new RegExp(`(id="${id}"[^>]*?content=")[^"]*`),
    `$1${esc(value)}`
  );
}

// Mirrors brainrotById() fallback in app.js
function nameFromId(catalog, id) {
  if (catalog[id]) return catalog[id].name;
  return String(id || '').replace(/[-_]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim() || 'UNKNOWN';
}

// Mirrors formatIncome() in app.js
function formatIncome(n) {
  if (!n || n <= 0) return null;
  const fmt = v => parseFloat(v.toPrecision(4)).toString();
  if (n >= 1_000_000_000) return `$${fmt(n / 1_000_000_000)}B/s`;
  if (n >= 1_000_000)     return `$${fmt(n / 1_000_000)}M/s`;
  if (n >= 1_000)         return `$${fmt(n / 1_000)}K/s`;
  return `$${n}/s`;
}

// Mirrors formatTotalIncome() in app.js
function calcIncome(base, mutId, traitIds, mutations, traits) {
  if (!base || base <= 0) return null;
  const mut = mutations[mutId] || mutations['default'] || { multiplier: 1 };
  const traitObjs = traitIds.map(id => traits[id]).filter(Boolean);
  const normalTraits = traitObjs.filter(t => t.id !== 'sleepy');
  const hasSleepy = traitObjs.some(t => t.id === 'sleepy');
  const traitMultSum = normalTraits.reduce((s, t) => s + t.multiplier, 0);
  let total = base * mut.multiplier + (normalTraits.length > 0 ? base * (traitMultSum - normalTraits.length) : 0);
  if (hasSleepy) total *= 0.5;
  return formatIncome(Math.round(total));
}

// Prefixes mutation name when not default
function cardLabel(brainrotName, mutId, mutations) {
  const mut = mutations[mutId];
  const prefix = (mut && mut.id !== 'default') ? `${mut.name} ` : '';
  return prefix + brainrotName;
}

async function fetchCatalog() {
  const r = await fetch(`${GH_ORIGIN}/static/brainrots.json`, {
    cf: { cacheTtl: 3600, cacheEverything: true },
  });
  if (!r.ok) return {};
  const j = await r.json();
  return Object.fromEntries((j.brainrots || []).map(b => [b.id, { name: b.name || b.id, income: b.income || 0 }]));
}

async function fetchMutations() {
  const r = await fetch(`${GH_ORIGIN}/static/mutations.json`, {
    cf: { cacheTtl: 3600, cacheEverything: true },
  });
  if (!r.ok) return {};
  const j = await r.json();
  return Object.fromEntries((Array.isArray(j) ? j : []).map(m => [m.id, m]));
}

async function fetchTraits() {
  const r = await fetch(`${GH_ORIGIN}/static/traits.json`, {
    cf: { cacheTtl: 3600, cacheEverything: true },
  });
  if (!r.ok) return {};
  const j = await r.json();
  return Object.fromEntries((Array.isArray(j) ? j : []).map(t => [t.id, t]));
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Pass non-HTML assets through to the GitHub Pages origin
    if (url.pathname !== '/' && !url.pathname.endsWith('.html')) {
      return fetch(GH_ORIGIN + url.pathname + url.search, { cf: { cacheEverything: true } });
    }

    const originResp = await fetch(GH_ORIGIN + '/' + url.search);
    if (!originResp.ok) return originResp;

    const hasCard = url.searchParams.has('ln') || url.searchParams.has('rn');
    if (!hasCard) return originResp;

    // Read params, falling back to defaults (mirrors readParams() in app.js)
    const p = {};
    for (const k of Object.keys(DEFAULTS)) p[k] = url.searchParams.get(k) ?? DEFAULTS[k];

    const [catalog, mutations, traits] = await Promise.all([fetchCatalog(), fetchMutations(), fetchTraits()]);

    const lName = nameFromId(catalog, p.ln);
    const rName = nameFromId(catalog, p.rn);
    const lLabel = cardLabel(lName, p.lm, mutations);
    const rLabel = cardLabel(rName, p.rm, mutations);

    const lTraits = p.lt ? p.lt.split(',').map(s => s.trim()).filter(Boolean) : [];
    const rTraits = p.rt ? p.rt.split(',').map(s => s.trim()).filter(Boolean) : [];

    const lIncome = calcIncome(catalog[p.ln]?.income, p.lm, lTraits, mutations, traits);
    const rIncome = calcIncome(catalog[p.rn]?.income, p.rm, rTraits, mutations, traits);

    const lPart = lIncome ? `${p.lq}x ${lLabel} (${lIncome})` : `${p.lq}x ${lLabel}`;
    const rPart = rIncome ? `${p.rq}x ${rLabel} (${rIncome})` : `${p.rq}x ${rLabel}`;

    // Mirrors title logic in updateOG()
    let title = `${p.action}: ${lLabel} → ${rLabel}`;
    if (title.length > 60) title = title.slice(0, 57) + '…';

    // Mirrors description logic in updateOG(), extended with income
    const subClean = s => (s || '').replace(/\{[^:]+:([^}]+)\}/g, '$1').replace(/\n/g, ' ').trim();
    const rsClean = subClean(p.rs);
    const base    = `Offering ${lPart} in exchange for ${rPart}.`;
    const suffix  = ' Trade on Brainrot Trading Cards!';
    const mid     = rsClean ? ` ${rsClean}.` : '';
    let desc = base + mid + suffix;
    if (desc.length > 160) {
      const budget = 160 - base.length - suffix.length - 2;
      desc = base + (budget > 0 ? ' ' + rsClean.slice(0, budget) + '…' : '') + suffix;
    }

    const alt = `${lPart} for ${rPart} trading card`;
    const cardRenderUrl = `${RENDERER}?u=${encodeURIComponent(request.url)}`;

    let html = await originResp.text();

    // og:image and twitter:image span two lines and share the same bare URL — one pass hits both
    html = html.replaceAll(BARE_RENDER, cardRenderUrl);

    // Single-line text tags — id precedes content in each tag
    html = setMeta(html, 'og-url',       url.href);
    html = setMeta(html, 'og-title',     title);
    html = setMeta(html, 'og-desc',      desc);
    html = setMeta(html, 'og-image-alt', alt);
    html = setMeta(html, 'tw-title',     title);
    html = setMeta(html, 'tw-desc',      desc);
    html = setMeta(html, 'tw-image-alt', alt);

    return new Response(html, {
      status: originResp.status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=60',
      },
    });
  },
};
