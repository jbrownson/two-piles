#!/bin/sh
# Builds the article into one self-contained page.
#   sh build.sh                  writes out/two-piles.html, the page as it is published,
#                                and out/preview.html, the same page wrapped so a browser can open it from disk
#   sh build.sh <file> [title]   writes the page somewhere else, under another title if one is given
d=$(cd "$(dirname "$0")" && pwd)
out=${1:-"$d/out/two-piles.html"}
title=$2
mkdir -p "$d/out" "$(dirname "$out")"
{
  if [ -n "$title" ]; then sed "s/<title>[^<]*<\/title>/<title>$title<\/title>/" "$d/src/head.html"; else cat "$d/src/head.html"; fi
  echo '<style>'; cat "$d/src/style.css"; echo '</style>'; echo
  cat "$d/src/body.html"; echo
  echo '<script>'; cat "$d"/src/js/*.js; echo '</script>'
} > "$out"
{
  printf '%s\n' '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:0}</style></head><body>'
  cat "$out"
  printf '\n</body></html>\n'
} > "$d/out/preview.html"
wc -c "$out" | awk '{print $1 " bytes: " $2}'
