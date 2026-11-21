#!/bin/sh
# Builds the article into one self-contained page.
#   sh build.sh                  writes out/two-piles.html, the page as it is published as an Artifact,
#                                out/preview.html, the same page wrapped so a browser can open it from disk,
#                                and out/index.html, the page as a document of its own, for a web server
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
{
  printf '%s\n' '<!doctype html>' '<html lang="en">' '<head>' '<meta charset="utf-8">' '<meta name="viewport" content="width=device-width, initial-scale=1">'
  cat "$d/src/head.html"
  echo '<style>'; echo 'body { margin: 0; }'; cat "$d/src/style.css"; echo '</style>'
  printf '%s\n' '</head>' '<body>'
  cat "$d/src/body.html"; echo
  echo '<script>'; cat "$d"/src/js/*.js; echo '</script>'
  printf '%s\n' '</body>' '</html>'
} > "$d/out/index.html"
wc -c "$out" | awk '{print $1 " bytes: " $2}'
