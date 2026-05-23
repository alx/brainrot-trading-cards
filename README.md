# brainrot-trading-cards

A web app for building and sharing trade offers for **brainrot** characters — creatures from the Roblox idle game ecosystem. Pick what you're offering and what you want, stack mutations and traits, and share a link that anyone can open.

**Live:** https://brainrot.girard-davila.net

## Features

- **Two-sided trade builder** — Offering and Asking sides, each with an independent character + modifiers
- **400+ brainrot characters** with base income values sourced from the game wiki
- **14 mutations** (Gold, Diamond, Rainbow, Cyber, Disco…) each with an income multiplier
- **60+ traits** (Strawberry, Meowl, Skibidi, Balloons…) stackable, each with their own multiplier
- **Fair exchange indicator** — compares total income on both sides and labels the trade (Fair, Offering more, etc.)
- **Visual customization** — card background, frame color, name color, subtitle with inline color markup (`{gold:text}`)
- **Share via URL** — all state encoded in query parameters, no account or database needed
- **Export to PNG** — download the card as an image
- **Rich social previews** — Cloudflare Worker rewrites OG meta tags so Discord and Twitter show a preview card

## How it works

All UI state (characters selected, mutations, traits, colors, subtitles) is serialized into URL query parameters. Visiting a share link restores the full card. A Cloudflare Worker sits in front of the page and rewrites the HTML's Open Graph tags on the fly, so link unfurls on Discord/Twitter reflect the specific trade in the URL.

## Tech stack

### Frontend
- Vanilla JavaScript, HTML5, CSS3
- SVG for card rendering (gradient text, stroke outlines)
- Google Fonts: Lilita One, Press Start 2P, Bungee
- Font Awesome 4.7 (icons)
- Google Analytics 4

### Hosting & backend
- **Cloudflare Workers** — OG meta tag rewriter (`cloudflare/worker.js`)
- **Cloudflare Pages** — static site hosting
- Custom domain: `brainrot.girard-davila.net`
- Wrangler for deployment config and observability

### Data
| File | Contents |
|---|---|
| `static/brainrots.json` | 400+ characters with id, name, income |
| `static/mutations.json` | 14 mutations with multipliers |
| `static/traits.json` | 60+ traits with multipliers and icon paths |
| `static/images/brainrot/` | WebP character images |
| `static/images/traits/` | PNG/WebP trait icons |

### Data pipeline (Python 3.12)
Scripts in `scripts/` regenerate the JSON data from the game wiki:

```
scripts/
├── fetch_wiki_brainrots.py   # Scrape brainrot catalog from wiki
├── import_wiki_brainrots.py  # Parse wiki JSON into structured format
├── fetch_income.py           # Fetch/calculate income values
├── clean_ids.py              # Normalize IDs to camelCase
├── download_icons.py         # Download trait/mutation icons
├── match_not_found.py        # Identify unmatched entries
├── apply_matches.py          # Apply matched data to catalog
└── build_website_json.py     # Build final JSON (filter valid entries)
```

## Project structure

```
brainrot-trading-card/
├── index.html          # Single-page app entry point
├── static/
│   ├── brainrots.json
│   ├── mutations.json
│   ├── traits.json
│   ├── css/style.css
│   ├── js/app.js
│   └── images/
│       ├── brainrot/
│       └── traits/
├── cloudflare/
│   ├── worker.js       # OG meta rewriter
│   └── wrangler.toml
└── scripts/            # Data pipeline (Python)
```
