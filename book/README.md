# Vestora — Graduation Project Book

Typeset with [Typst](https://typst.app). Diagrams are authored as text
(Mermaid) and rendered to vector SVG. Nothing in this book is a screenshot of
code.

## Build

```bash
bash build.sh                    # -> out/book.pdf
bash build.sh src/book.typ --png # also renders page PNGs for review
```

`build.sh` pins `--root .` (so `/assets/...` paths resolve) and
`--font-path assets/fonts`.

## Diagrams

```bash
npx mmdc -i assets/diagrams/src/<name>.mmd \
         -o assets/diagrams/out/<name>.svg \
         -c assets/diagrams/mermaid-config.json \
         -p assets/diagrams/puppeteer.json -b transparent
```

Sources live in `assets/diagrams/src/`, output in `assets/diagrams/out/`.
Keep both — the `.mmd` is what gets edited when a reviewer asks for a change.

## Layout

| Path | Purpose |
| --- | --- |
| `lib/theme.typ` | Design tokens, lifted from `../Vestora-Brand-Sheet.html` |
| `lib/vestora.typ` | Page master, chapter/part openers, figure system, `plate`/`adr`/`note` |
| `src/book.typ` | Entry point |
| `src/frontmatter/` | Cover through abbreviations |
| `src/chapters/` | One file per chapter |
| `assets/fonts/` | Cinzel, Karla, Spectral — converted from the frontend's own woff2 |
| `assets/vestora-code.tmTheme` | Syntax highlighting in brand colours |

## Gotchas

- **`context` is a Typst keyword** — it cannot be a parameter name. The ADR
  block uses `background:` for that field.
- **Use `` ```cs ``, not `` ```csharp ``** — syntect does not know the long
  form and silently drops all highlighting.
- **Line numbers need `show raw.line`.** Laying lines out in a `grid` collapses
  the row heights and the text overlaps.
- **`part()` ends with `pagebreak(to: "odd")` inside its own scope** so the
  blank verso it creates inherits `header: none` / `footer: none`.
- **Mermaid must run with `htmlLabels: false`.** Otherwise it emits
  `<foreignObject>`, which Typst cannot render.
- Fonts are regenerated from `Frontend/vestora/.next/dev/static/media/*.woff2`.
  If they are ever lost, the mapping is recoverable from the
  `[next]_internal_font_google_*.css` chunks.
