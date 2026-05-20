const BARE_RENDER = 'https://brainrot-og.girard-davila.net/render?u=https%3A%2F%2Fbrainrot.girard-davila.net%2F';
const RENDERER    = 'https://brainrot-og.girard-davila.net/render';
const GH_ORIGIN   = 'https://alx.github.io/brainrot-trading-cards';

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

    // Replace the bare renderer URL with one that includes the full card URL.
    // replaceAll hits both og:image (line 23) and twitter:image (line 32) in one pass.
    const cardRenderUrl = `${RENDERER}?u=${encodeURIComponent(request.url)}`;
    const html = (await originResp.text()).replaceAll(BARE_RENDER, cardRenderUrl);

    return new Response(html, {
      status: originResp.status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=60',
      },
    });
  },
};
