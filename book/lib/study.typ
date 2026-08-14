// Vestora — Arabic study-guide master.
//
// Same identity as the book: the tokens, the gold hairline, the chamfered
// plate, the bronze callouts all come from theme.typ / vestora.typ unchanged.
// What differs is the direction and the purpose — these are RTL Arabic
// documents written to be memorised from, not submitted.
//
// Cinzel and Spectral are Latin-only faces, so Arabic running text falls to
// Segoe UI. That is a font-availability fact, not a design choice: the brand's
// Aref Ruqaa and Cairo are not bundled in assets/fonts.
#import "theme.typ": *
#import "vestora.typ": chamfer

#let ar-font = ("Segoe UI", "Tahoma")

// The book's plate, mirrored. vestora.typ pins the accent edge to the left,
// which is the reading edge in an LTR chapter and the trailing edge here — so
// the callouts would disagree with the code blocks, whose gold rule already
// sits on the right. Same tokens, same geometry, start edge only.
#let ar-plate(label: none, accent: bronze, body) = block(
  width: 100%,
  fill: surface,
  stroke: (right: 2pt + accent, rest: 0.5pt + border),
  inset: (x: 11pt, y: 9pt),
  above: 1.5em,
  below: 1.5em,
  radius: 0pt,
  // Atomic on purpose: a callout that splits leaves one orphaned line on the
  // next page, which reads as a mistake rather than as a box.
  breakable: false,
  {
    if label != none {
      text(
        font: ar-font, size: micro-size, weight: 700,
        tracking: 0.1em, fill: accent,
      )[#label]
      v(0.5em, weak: true)
    }
    set text(size: small-size + 1pt)
    set par(leading: 0.85em)
    body
  },
)

#let note(body) = ar-plate(label: "ملحوظة", accent: gold, body)

// Latin technical terms inside Arabic prose keep their own face so a class name
// never renders in the UI font of the surrounding sentence.
#let code-inline(body) = box(
  fill: surface,
  stroke: 0.4pt + border,
  inset: (x: 3pt),
  outset: (y: 3pt),
  text(font: mono-font, size: code-size, fill: bronze, dir: ltr, body),
)

#let study-cover(track: "", subtitle: "", member: "", date: "") = {
  set page(
    paper: "a4",
    margin: (x: 24mm, top: 22mm, bottom: 20mm),
    fill: paper,
    header: none, footer: none, numbering: none,
  )
  set text(fill: ink, font: ar-font, lang: "ar", dir: rtl, hyphenate: false)

  align(center)[
    #text(font: heading-font, size: 8pt, weight: 600, tracking: 0.1em, fill: bronze, dir: ltr)[
      MENOUFIA UNIVERSITY · FACULTY OF COMPUTERS AND INFORMATION
    ]
  ]

  v(1fr)

  let pw = 96mm
  let ph = 52mm
  align(center, block(width: pw, height: ph, {
    place(top + left, chamfer(pw, ph, cut: 12pt, fill: surface, stroke: 0.8pt + border))
    place(center + horizon, align(center)[
      #image("/assets/vestora-mark.svg", width: 13mm)
      #v(3mm)
      #text(font: display-font, size: 22pt, weight: 700, tracking: 0.24em, dir: ltr)[VESTORA]
      #v(2mm)
      #line(length: 24mm, stroke: 0.8pt + gold)
    ])
  }))

  v(9mm)
  align(center, text(font: ar-font, size: micro-size + 1pt, weight: 600, fill: muted)[
    ملف مذاكرة · مادة تحضير شخصية للمناقشة
  ])

  v(11mm)
  align(center, block(width: 138mm)[
    #set par(justify: false, leading: 0.6em)
    #text(font: heading-font, size: 24pt, weight: 700, tracking: 0.04em, fill: ink, dir: ltr)[#track]
    #v(4mm)
    #line(length: 20mm, stroke: 0.6pt + border)
    #v(4mm)
    #text(size: 11pt, fill: muted)[#subtitle]
  ])

  v(1fr)

  align(center, block(width: 120mm)[
    #set par(justify: false, leading: 0.6em)
    #text(size: small-size, fill: muted)[
      هذا الملف للمذاكرة فقط. ليس تقريرًا ولا وثيقة تُسلَّم — الغرض منه أن تفهم
      جزءك من المشروع فهمًا كاملًا وتقدر تشرحه وتدافع عنه.
    ]
  ])

  v(8mm)
  grid(
    columns: (1fr, 1fr),
    align: (right, left),
    text(font: ar-font, size: micro-size, fill: muted, weight: 600)[#member],
    text(font: ar-font, size: micro-size, fill: muted, weight: 600)[#date],
  )
}

#let study(track: "", doc) = {
  set document(title: "Vestora — ملف مذاكرة — " + track)

  set page(
    paper: "a4",
    margin: (inside: 24mm, outside: 20mm, top: 24mm, bottom: 21mm),
    binding: right,
    header: context {
      let p = here().page()
      if p > 1 {
        set text(font: ar-font, size: micro-size, fill: muted, weight: 600)
        grid(
          columns: (1fr, auto),
          align: (right + bottom, left + bottom),
          [ملف مذاكرة · #text(dir: ltr)[#track]],
          text(font: display-font, dir: ltr, tracking: 0.15em)[VESTORA],
        )
        v(-0.55em)
        line(length: 100%, stroke: 0.5pt + border)
      }
    },
    footer: context {
      let p = here().page()
      if p > 1 {
        set text(font: ar-font, size: micro-size, fill: muted)
        align(center, counter(page).display())
      }
    },
  )

  set text(font: ar-font, size: 11pt, fill: ink, lang: "ar", dir: rtl, hyphenate: false)
  set par(justify: true, leading: 0.95em, spacing: 1.25em)
  set list(indent: 8pt, spacing: 0.85em, marker: text(fill: bronze)[•])
  set enum(indent: 8pt, spacing: 0.85em)

  set table(
    stroke: (x, y) => (bottom: 0.5pt + border, top: if y == 0 { 0.6pt + ink } else { none }),
    inset: (x: 7pt, y: 6.5pt),
  )
  show table.cell.where(y: 0): set text(font: ar-font, size: micro-size + 0.5pt, weight: 700)
  show table: set text(size: small-size + 0.5pt)

  // Inline code keeps its Latin face and LTR run inside Arabic sentences.
  show raw.where(block: false): it => code-inline(it)

  set raw(theme: "/assets/vestora-code.tmTheme")
  show raw.where(block: true): it => block(
    width: 100%, fill: surface,
    stroke: (right: 2pt + gold, rest: 0.5pt + border),
    inset: (x: 10pt, y: 9pt), breakable: true,
    {
      set text(font: mono-font, size: code-size, dir: ltr)
      set par(justify: false, leading: 0.62em)
      show raw.line: l => box(width: 100%, {
        box(width: 2.1em, align(right, text(
          fill: border.darken(32%), size: code-size - 0.8pt,
        )[#l.number]))
        h(0.9em)
        l.body
      })
      it
    },
  )

  set figure(numbering: "1")
  // Breakable so a long reference table splits across pages instead of being
  // pushed whole and leaving the rest of the page white.
  show figure: set block(above: 1.5em, below: 1.5em, breakable: true)
  show figure.caption: it => context {
    set text(font: ar-font, size: micro-size + 1pt, fill: muted)
    set par(justify: false, leading: 0.7em)
    block(width: 100%, {
      text(fill: bronze, weight: 700)[#it.supplement #it.counter.display(it.numbering)]
      h(0.4em)
      it.body
    })
  }

  set heading(numbering: "1.")
  show heading: set text(hyphenate: false)

  // Chapters flow rather than each claiming a fresh page. Chapter-per-page
  // left every chapter's last page trailing off into white, which in a
  // document meant to be revised from reads as padding. The 19pt weight and
  // the gold rule delimit a chapter on their own.
  // Headings are English titles now (occasionally with a short Arabic gloss
  // in parens) — forcing dir: ltr keeps that phrase in source order instead
  // of the bidi algorithm reordering it around the embedded RTL word.
  show heading.where(level: 1): it => block(above: 2.4em, below: 1em, {
    set par(justify: false)
    text(font: ar-font, size: 19pt, weight: 700, fill: ink, dir: ltr, it)
    v(2.5mm)
    line(length: 26mm, stroke: 1pt + gold)
  })
  show heading.where(level: 2): it => block(above: 1.7em, below: 0.7em, {
    set text(font: ar-font, size: 13.5pt, weight: 700, fill: bronze, dir: ltr)
    set par(justify: false)
    it
  })
  show heading.where(level: 3): it => block(above: 1.3em, below: 0.55em, {
    set text(font: ar-font, size: 11.5pt, weight: 700, fill: muted, dir: ltr)
    set par(justify: false)
    it
  })

  doc
}

// ── Table of contents ────────────────────────────────────────────────
#let study-toc() = {
  block(above: 0em, below: 1em, {
    set par(justify: false)
    text(font: ar-font, size: 19pt, weight: 700, fill: ink)[المحتويات]
    v(2.5mm)
    line(length: 26mm, stroke: 1pt + gold)
  })
  set text(size: small-size + 1pt, dir: ltr)
  show outline.entry.where(level: 1): it => {
    v(0.5em, weak: true)
    text(weight: 700, fill: ink, it)
  }
  outline(title: none, depth: 2, indent: 1.2em)
  pagebreak(weak: true)
}

// ── Study callouts, all built on the book's plate ────────────────────

// The thing to actually remember from a section.
#let keypoint(body) = ar-plate(label: "اعرف ده كويس", accent: gold, body)

// A trap: something easy to say wrong, or a claim that would be false.
#let warn(body) = ar-plate(label: "خد بالك", accent: bronze, body)

// A worked example or a walkthrough.
#let example(title, body) = ar-plate(label: "مثال", accent: bronze, {
  text(font: ar-font, weight: 700, size: 10.5pt)[#title]
  v(0.45em, weak: true)
  body
})

// End-of-chapter recap.
#let recap(body) = ar-plate(label: "خلاصة", accent: gold, body)

// What is explicitly NOT this member's to defend, so they hand it off cleanly
// instead of overreaching into a teammate's part.
#let boundary(body) = ar-plate(label: "مش جزءك", accent: muted, body)

// Self-test: the question, then the answer, so it can be covered while revising.
#let selftest(items) = ar-plate(label: "اختبر نفسك", accent: muted, {
  set enum(numbering: "1.", indent: 4pt, spacing: 0.7em)
  for (q, a) in items {
    enum.item[
      #text(weight: 700)[#q]
      #linebreak()
      #text(fill: muted)[#a]
    ]
  }
})

// Screenshot or landscape diagram: width-constrained.
// Only safe when the asset is wider than it is tall — a portrait diagram at
// width 100% computes a height taller than the page and overflows silently.
#let shot(path, caption) = figure(
  block(width: 100%, stroke: 0.5pt + border, clip: true, image(path, width: 100%)),
  caption: caption,
)

// Portrait diagram: height-constrained instead, so the page is the limit and
// the width follows from the aspect ratio.
#let tall(path, caption, height: 180mm) = figure(
  block(
    stroke: 0.5pt + border,
    clip: true,
    inset: 3pt,
    image(path, height: height),
  ),
  caption: caption,
)

// Two screenshots side by side.
#let shots(a, b, caption) = figure(
  grid(
    columns: (1fr, 1fr), column-gutter: 3mm,
    block(width: 100%, stroke: 0.5pt + border, clip: true, image(a, width: 100%)),
    block(width: 100%, stroke: 0.5pt + border, clip: true, image(b, width: 100%)),
  ),
  caption: caption,
)

// Where a point lives in the source, so "show me that in the code" is a
// two-second answer. Identifiers rather than line numbers on purpose: a line
// number goes stale on the next edit, a method name does not.
#let codemap(rows) = block(
  width: 100%,
  fill: surface,
  stroke: (right: 2pt + muted, rest: 0.5pt + border),
  inset: (x: 10pt, y: 8pt),
  above: 1.2em,
  below: 1.2em,
  breakable: false,
  {
    text(font: ar-font, size: micro-size, weight: 700, tracking: 0.1em, fill: muted)[فين ده في الكود]
    v(0.5em, weak: true)
    set text(size: small-size)
    set par(leading: 0.8em)
    for (file, where) in rows {
      grid(
        columns: (1fr, auto),
        column-gutter: 6pt,
        align: (right + top, left + top),
        text(size: small-size)[#where],
        text(font: mono-font, size: code-size, fill: bronze, dir: ltr)[#file],
      )
      v(0.3em, weak: true)
    }
  },
)

// ── Design specimens ─────────────────────────────────────────────────
// Same technique the book's design-system chapter uses: the swatches are
// filled with the real token values and the specimen is set in the real
// faces, so these are rendered FROM the design system rather than pictures
// of it. If a value here is wrong, the page shows it.

#let swatch(fill-color, name, hex) = block(
  width: 100%,
  {
    block(width: 100%, height: 16mm, fill: fill-color, stroke: 0.5pt + border)
    v(1.6mm)
    text(font: ar-font, size: 6.4pt, weight: 700, tracking: 0.08em, fill: muted, dir: ltr)[#upper(name)]
    v(0.5mm)
    text(font: mono-font, size: 7pt, fill: muted, dir: ltr)[#hex]
  },
)

// Grid of swatches, four to a row.
#let palette(cells, caption: none) = figure(
  grid(columns: (1fr,) * 4, column-gutter: 4mm, row-gutter: 6mm, ..cells),
  caption: caption,
)

// One specimen row: the role label, then the words set in that face.
#let specimen(rows, caption: none) = figure(
  block(width: 100%, {
    for (label, body) in rows {
      grid(
        columns: (1fr, 30mm),
        column-gutter: 5mm,
        align: (right + horizon, left + horizon),
        body,
        text(font: ar-font, size: 6.4pt, weight: 700, tracking: 0.08em, fill: muted, dir: ltr)[#upper(label)],
      )
      v(2.5mm)
      line(length: 100%, stroke: 0.4pt + border)
      v(2.5mm)
    }
  }),
  caption: caption,
)

// A file this person owns, with what it is and why it matters to them.
#let filetable(rows) = figure(
  table(
    columns: (auto, 1fr),
    align: (right + top, right + top),
    table.header([الملف], [إيه اللي فيه]),
    ..rows.flatten(),
  ),
  caption: [ملفاتك في المشروع.],
)
