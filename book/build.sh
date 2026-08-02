#!/usr/bin/env bash
# Build the Vestora book. Usage: ./build.sh [src/book.typ] [--png]
set -euo pipefail
cd "$(dirname "$0")"

TYPST="C:/Users/A/AppData/Local/Microsoft/WinGet/Packages/Typst.Typst_Microsoft.Winget.Source_8wekyb3d8bbwe/typst-x86_64-pc-windows-msvc/typst.exe"
SRC="${1:-src/book.typ}"
NAME="$(basename "${SRC%.typ}")"

mkdir -p out
"$TYPST" compile --root . --font-path assets/fonts "$SRC" "out/$NAME.pdf"
echo "out/$NAME.pdf"

if [[ "${2:-}" == "--png" ]]; then
  rm -f "out/$NAME"-*.png
  "$TYPST" compile --root . --font-path assets/fonts --format png --ppi 110 \
    "$SRC" "out/$NAME-{p}.png"
  echo "out/$NAME-*.png"
fi
