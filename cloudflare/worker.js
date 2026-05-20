const BARE_RENDER = 'https://brainrot-og.girard-davila.net/render?u=https%3A%2F%2Fbrainrot.girard-davila.net%2F';
const RENDERER    = 'https://brainrot-og.girard-davila.net/render';
const GH_ORIGIN   = 'https://alx.github.io/brainrot-trading-cards';

// Mirrors DEFAULTS in index.html
const DEFAULTS = {
  action: 'IM TRADING', lq: '1', ln: 'noobini-santanini',
  lc: 'gold', lbg: 'green', ls: '',
  rq: '1', rn: 'Strawberryelephant-1',
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

// Mirrors brainrotById() in index.html
function nameFromId(catalog, id) {
  if (catalog[id]) return catalog[id];
  return String(id || '').replace(/[-_]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim() || 'UNKNOWN';
}

async function fetchCatalog() {
  const r = await fetch(`${GH_ORIGIN}/static/images/brainrot/brainrots.json`, {
    cf: { cacheTtl: 3600, cacheEverything: true },
  });
  if (!r.ok) return {};
  const j = await r.json();
  return Object.fromEntries((j.brainrots || []).map(b => [b.id, b.name || b.id]));
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

    // Read params, falling back to defaults (mirrors readParams() in index.html)
    const p = {};
    for (const k of Object.keys(DEFAULTS)) p[k] = url.searchParams.get(k) ?? DEFAULTS[k];

    const catalog = await fetchCatalog();
    const lName = nameFromId(catalog, p.ln);
    const rName = nameFromId(catalog, p.rn);

    // Mirrors subClean() inline in updateOG()
    const subClean = s => (s || '').replace(/\{[^:]+:([^}]+)\}/g, '$1').replace(/\n/g, ' ').trim();

    // Mirrors title logic in updateOG()
    let title = `${p.action}: ${p.lq}x ${lName} → ${p.rq}x ${rName}`;
    if (title.length > 60) title = title.slice(0, 57) + '…';

    // Mirrors description logic in updateOG()
    const rsClean = subClean(p.rs);
    const base    = `Offering ${p.lq}x ${lName} in exchange for ${p.rq}x ${rName}.`;
    const suffix  = ' Trade on Brainrot Trading Cards!';
    const mid     = rsClean ? ` ${rsClean}.` : '';
    let desc = base + mid + suffix;
    if (desc.length > 160) {
      const budget = 160 - base.length - suffix.length - 2;
      desc = base + (budget > 0 ? ' ' + rsClean.slice(0, budget) + '…' : '') + suffix;
    }

    const alt = `${p.lq}x ${lName} for ${p.rq}x ${rName} trading card`;
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
