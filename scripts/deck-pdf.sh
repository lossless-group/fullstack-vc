#!/usr/bin/env bash
# Print a section-composed deck (PageAsDeckWrapper) to a PDF in public/decks/,
# one slide per 16:9 page, using local Chrome and the print styles in
# src/layouts/PageAsDeckWrapper.astro. Needs the dev or preview server.
#
# Usage: pnpm deck:pdf 2026-11-19_monthly-all-hands
#        BASE=http://localhost:4321 pnpm deck:pdf 2026-11-19_monthly-all-hands
# The deck page links the file as /decks/<slug>.pdf; re-run after editing it.
set -euo pipefail

SLUG="${1:?usage: deck-pdf.sh <deck slug under /slides/>}"
BASE="${BASE:-http://localhost:4350}"
SITE="$(cd "$(dirname "$0")/.." && pwd)"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUT="$SITE/public/decks/$SLUG.pdf"
PROFILE="$(mktemp -d)"
trap 'rm -rf "$PROFILE"' EXIT

mkdir -p "$(dirname "$OUT")"
"$CHROME" --headless=new --disable-gpu --user-data-dir="$PROFILE" --no-pdf-header-footer \
  --window-size=1440,810 --virtual-time-budget=8000 \
  --print-to-pdf="$OUT" "$BASE/slides/$SLUG/?print" 2>/dev/null
echo "$OUT"
