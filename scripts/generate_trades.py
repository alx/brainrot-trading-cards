#!/usr/bin/env python3
# /// script
# dependencies = ["playwright"]
# ///
"""
Generate PNG screenshots of fair brainrot trading card pairs.

First-time setup:
    uv run playwright install chromium

Usage:
    uv run scripts/generate_trades.py --count 50
    uv run scripts/generate_trades.py --count 3 --seed 42   # reproducible test
"""

import argparse
import json
import random
import threading
import time
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from typing import Optional

from playwright.sync_api import sync_playwright

REPO_ROOT = Path(__file__).parent.parent

NAME_COLORS = ["gold", "white", "rainbow", "cyan", "green", "pink"]
CARD_BGS = ["orange", "blue", "pink", "purple", "green", "red"]
FRAME_BGS = ["orange", "blue", "pink", "purple", "green", "red", "dark"]


# ── Income logic (mirrors app.js:calcTotalIncomeRaw) ──────────────────────────

def calc_income(base: int, mutation: dict, traits: list) -> int:
    normal = [t for t in traits if t["id"] != "sleepy"]
    has_sleepy = any(t["id"] == "sleepy" for t in traits)
    trait_mult_sum = sum(t["multiplier"] for t in normal)
    total = (base * mutation["multiplier"]) + (
        base * (trait_mult_sum - len(normal)) if normal else 0
    )
    if has_sleepy:
        total *= 0.5
    return round(total)


def format_income(n: int) -> str:
    """Mirror app.js:formatIncome — 4 significant digits, drop trailing zeros."""
    if n >= 1_000_000_000:
        return f"${float(f'{n / 1_000_000_000:.4g}')}B/s"
    if n >= 1_000_000:
        return f"${float(f'{n / 1_000_000:.4g}')}M/s"
    if n >= 1_000:
        return f"${float(f'{n / 1_000:.4g}')}K/s"
    return f"${n}/s"


# ── Data loading ──────────────────────────────────────────────────────────────

def load_data():
    with open(REPO_ROOT / "static" / "brainrots.json") as f:
        raw = json.load(f)
    with open(REPO_ROOT / "static" / "mutations.json") as f:
        mutations = json.load(f)
    with open(REPO_ROOT / "static" / "traits.json") as f:
        traits = json.load(f)

    image_dir = REPO_ROOT / "static" / "images" / "brainrot"
    brainrots = [
        b for b in raw["brainrots"]
        if b.get("income", 0) > 0 and (image_dir / f"{b['id']}.webp").exists()
    ]
    return brainrots, mutations, traits


# ── Random card side ──────────────────────────────────────────────────────────

def random_side(rng: random.Random, brainrot: dict, mutations: list, traits: list) -> dict:
    # 40% chance of "default" mutation for variety
    if rng.random() < 0.4:
        mutation = next(m for m in mutations if m["id"] == "default")
    else:
        mutation = rng.choice(mutations)

    non_sleepy = [t for t in traits if t["id"] != "sleepy"]
    n_traits = rng.randint(0, 3)
    selected_traits = rng.sample(non_sleepy, min(n_traits, len(non_sleepy)))

    return {
        "brainrot": brainrot,
        "mutation": mutation,
        "traits": selected_traits,
        "income": calc_income(brainrot["income"], mutation, selected_traits),
    }


# ── URL builder ───────────────────────────────────────────────────────────────

def build_url(port: int, left: dict, right: dict, rng: random.Random) -> str:
    params = [
        ("action", "IM TRADING"),
        ("ln", left["brainrot"]["id"]),
        ("lm", left["mutation"]["id"]),
        ("lt", ",".join(t["id"] for t in left["traits"])),
        ("lc", rng.choice(NAME_COLORS)),
        ("lbg", rng.choice(FRAME_BGS)),
        ("rn", right["brainrot"]["id"]),
        ("rm", right["mutation"]["id"]),
        ("rt", ",".join(t["id"] for t in right["traits"])),
        ("rc", rng.choice(NAME_COLORS)),
        ("rbg", rng.choice(FRAME_BGS)),
        ("bg", rng.choice(CARD_BGS)),
    ]
    query = "&".join(f"{k}={v}" for k, v in params if v)
    return f"http://localhost:{port}/?{query}"


# ── Local HTTP server ─────────────────────────────────────────────────────────

def start_server(port: int) -> HTTPServer:
    class Handler(SimpleHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(REPO_ROOT), **kwargs)

    server = HTTPServer(("localhost", port), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


# ── Main generation loop ──────────────────────────────────────────────────────

def generate_trades(
    count: int,
    output_dir: Path,
    seed: Optional[int],
    port: int,
    fair_threshold: float,
):
    rng = random.Random(seed)
    brainrots, mutations, traits = load_data()
    print(f"Loaded {len(brainrots)} brainrots · {len(mutations)} mutations · {len(traits)} traits")

    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Starting local server on port {port} …")
    server = start_server(port)
    time.sleep(0.3)

    metadata = []

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1400, "height": 900})

        generated = 0
        attempts = 0
        max_attempts = count * 500

        while generated < count and attempts < max_attempts:
            attempts += 1

            b_left, b_right = rng.sample(brainrots, 2)
            left = random_side(rng, b_left, mutations, traits)
            right = random_side(rng, b_right, mutations, traits)

            max_inc = max(left["income"], right["income"])
            if max_inc <= 0:
                continue
            ratio = abs(left["income"] - right["income"]) / max_inc
            if ratio >= fair_threshold:
                continue

            url = build_url(port, left, right, rng)
            filename = f"trade_{generated:03d}.png"
            out_path = output_dir / filename

            try:
                page.goto(url)
                page.wait_for_load_state("networkidle", timeout=15_000)
                page.wait_for_selector(".card-frame", timeout=10_000)
                page.locator(".card-frame").screenshot(path=str(out_path))
            except Exception as exc:
                print(f"  ⚠ screenshot failed (trade {generated}): {exc}")
                continue

            metadata.append({
                "index": generated,
                "filename": filename,
                "url": url,
                "left": {
                    "id": b_left["id"],
                    "name": b_left["name"],
                    "mutation": left["mutation"]["id"],
                    "traits": [t["id"] for t in left["traits"]],
                    "income": left["income"],
                    "income_fmt": format_income(left["income"]),
                },
                "right": {
                    "id": b_right["id"],
                    "name": b_right["name"],
                    "mutation": right["mutation"]["id"],
                    "traits": [t["id"] for t in right["traits"]],
                    "income": right["income"],
                    "income_fmt": format_income(right["income"]),
                },
                "ratio": round(ratio, 4),
            })

            generated += 1
            print(
                f"  [{generated:>2}/{count}] "
                f"{b_left['name']} [{left['mutation']['id']}] "
                f"vs {b_right['name']} [{right['mutation']['id']}] "
                f"— ratio {ratio:.1%}"
            )

        browser.close()

    server.shutdown()

    if attempts >= max_attempts and generated < count:
        print(f"\n⚠ Reached attempt limit ({max_attempts}). Only {generated}/{count} trades generated.")

    trades_path = output_dir / "trades.json"
    with open(trades_path, "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"\n✓ {generated} images → {output_dir}/")
    print(f"✓ Metadata → {trades_path}")


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Generate fair brainrot trading card images via Playwright"
    )
    parser.add_argument("--count", type=int, default=50, help="Number of images (default: 50)")
    parser.add_argument("--output-dir", default="generated_trades", help="Output directory")
    parser.add_argument("--seed", type=int, default=None, help="RNG seed for reproducibility")
    parser.add_argument("--port", type=int, default=8765, help="Local HTTP server port")
    parser.add_argument(
        "--fair-threshold",
        type=float,
        default=0.1,
        help="Max income ratio difference for 'fair' trade (default: 0.1 = 10%%)",
    )
    args = parser.parse_args()

    generate_trades(
        count=args.count,
        output_dir=REPO_ROOT / args.output_dir,
        seed=args.seed,
        port=args.port,
        fair_threshold=args.fair_threshold,
    )


if __name__ == "__main__":
    main()
