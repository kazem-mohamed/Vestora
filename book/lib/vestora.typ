// Vestora book — page master, structural elements and figure system.
#import "theme.typ": *

// ─────────────────────────────────────────────────────────────────────
// Running header / footer
// ─────────────────────────────────────────────────────────────────────

#let _running-header() = context {
  let p = here().page()
  let chapters = query(heading.where(level: 1))
  let opens-here = chapters.filter(h => h.location().page() == p)
  let seen = chapters.filter(h => h.location().page() <= p)

  // Chapter and part openers carry their own masthead.
  if opens-here.len() == 0 and seen.len() > 0 {
    let ch = seen.last()
    let n = counter(heading).at(ch.location()).first()
    let left-slot = eyebrow[Chapter #n]
    let right-slot = eyebrow(ch.body)
    grid(
      columns: (1fr, auto),
      align: (left + bottom, right + bottom),
      if calc.even(p) { right-slot } else { left-slot },
      if calc.even(p) { left-slot } else { right-slot },
    )
    v(-0.55em)
    line(length: 100%, stroke: 0.5pt + border)
  }
}

// Quiet brand lockup carried on every page, set opposite the folio.
#let _brand-lockup() = box(baseline: 25%, {
  box(image("/assets/vestora-mark.svg", height: 7pt))
  h(3.5pt)
  text(font: display-font, size: 6.8pt, weight: 700, tracking: 0.2em, fill: muted)[VESTORA]
})

#let _running-footer() = context {
  let p = here().page()
  set text(font: heading-font, size: micro-size, fill: muted, tracking: 0.1em)
  let folio = counter(page).display()
  grid(
    columns: (1fr, auto),
    align: (left + horizon, right + horizon),
    if calc.even(p) { folio } else { _brand-lockup() },
    if calc.even(p) { _brand-lockup() } else { folio },
  )
}

// ─────────────────────────────────────────────────────────────────────
// Cover
// ─────────────────────────────────────────────────────────────────────

// A ruled blank a name can be written or typed onto later.
#let _fill-in(width) = box(
  width: width,
  height: 1.05em,
  stroke: (bottom: 0.7pt + border),
)

#let cover(
  title: "",
  subtitle: "",
  university: "",
  faculty: "",
  department: "",
  degree: "",
  supervisor: "",
  date: "",
) = {
  set page(
    paper: "a4",
    margin: (x: 24mm, top: 24mm, bottom: 22mm),
    fill: paper,
    header: none,
    footer: none,
    numbering: none,
  )
  set text(fill: ink)

  // Institutional lockup: university mark and faculty mark flanking the
  // wording, so neither crest dominates and the block reads as one unit.
  grid(
    columns: (26mm, 1fr, 30mm),
    column-gutter: 6mm,
    align: (center + horizon, center + horizon, center + horizon),
    image("/assets/logo-university.png", width: 22mm),
    align(center)[
      #eyebrow(university, size: 9pt, fill: bronze)
      #v(0.3em)
      #eyebrow(faculty, size: 8pt)
      #v(0.15em)
      #eyebrow(department, size: 8pt)
    ],
    image("/assets/logo-faculty.png", width: 28mm),
  )

  v(1fr)

  // The plate is a portrait-ish badge, not a banner: at full text width the
  // chamfers read as clipped corners rather than as a deliberate shape.
  let pw = 96mm
  let ph = 66mm
  align(center, block(width: pw, height: ph, {
    place(top + left, chamfer(pw, ph, cut: 13pt, fill: surface, stroke: 0.8pt + border))
    place(center + horizon, align(center)[
      #image("/assets/vestora-mark.svg", width: 15mm)
      #v(4mm)
      #text(font: display-font, size: 25pt, weight: 700, tracking: 0.24em)[VESTORA]
      #v(2.5mm)
      #line(length: 26mm, stroke: 0.8pt + gold)
    ])
  }))

  v(7mm)
  align(center, eyebrow(subtitle, size: 8pt, fill: bronze))

  v(1fr)

  align(center, block(width: 132mm)[
    #set par(justify: false, leading: 0.5em)
    // Never hyphenate the title: a word split across two lines on a cover is
    // the first thing a reader sees and reads as a typesetting fault.
    #set text(hyphenate: false)
    #text(font: display-font, size: 19pt, weight: 600, tracking: 0.03em)[#title]
    #v(4mm)
    #line(length: 20mm, stroke: 0.6pt + border)
    #v(4mm)
    #text(font: heading-font, size: 9.5pt, fill: muted)[#degree]
  ])

  v(1fr)

  align(center)[
    #eyebrow[Supervised by]
    #v(2.5mm)
    #text(font: body-font, size: 14pt, weight: 700)[#supervisor]
  ]

  v(1fr)

  align(center, eyebrow(date, size: 8pt))
}

// Team roster on its own page. Pass `members` — (name, id, role) dictionaries,
// in roster order — to print the real roster; any row past `members.len()`
// falls back to a blank a name can be written onto later.
#let team-page(rows: 6, members: ()) = {
  set page(
    paper: "a4",
    margin: (x: 24mm, top: 26mm, bottom: 24mm),
    fill: paper,
    header: none,
    footer: none,
    numbering: none,
  )
  set text(fill: ink)

  align(center)[
    #image("/assets/vestora-mark.svg", width: 9mm)
    #v(3mm)
    #text(font: display-font, size: 19pt, weight: 600, tracking: 0.05em)[Project Team]
    #v(2.5mm)
    #line(length: 22mm, stroke: 1pt + gold)
  ]

  v(7mm)

  // One labelled card per member. A three-column table of blank rules was not
  // legible as a form — the reader could not tell which rule belonged to which
  // column once the headings scrolled out of eye-line.
  let field(label, value: none, width: 100%, arabic: false) = block(width: width, {
    eyebrow(label, size: 6.2pt)
    v(1.4mm, weak: true)
    if value == none {
      _fill-in(width)
    } else if arabic {
      block(width: width, inset: (bottom: 2pt), stroke: (bottom: 0.7pt + border),
        align(left, text(font: arabic-font, size: 10.5pt, weight: 600, value)))
    } else {
      block(width: width, inset: (bottom: 2pt), stroke: (bottom: 0.7pt + border),
        text(size: 10.5pt, weight: 600, value))
    }
  })

  for n in range(1, rows + 1) {
    let m = if n <= members.len() { members.at(n - 1) }
    block(
      width: 100%,
      fill: surface,
      stroke: (left: 2.5pt + bronze, rest: 0.6pt + border),
      inset: (x: 10pt, y: 8pt),
      below: 3.5mm,
      breakable: false,
      grid(
        columns: (12mm, 1fr),
        column-gutter: 9pt,
        align(center + horizon, text(
          font: display-font,
          size: 15pt,
          weight: 700,
          fill: gold,
        )[#if n < 10 [0#n] else [#n]]),
        {
          field("Full Name", value: if m != none { m.name }, arabic: true)
          v(3.5mm)
          grid(
            columns: (34mm, 1fr),
            column-gutter: 10mm,
            field("Student ID", value: if m != none { m.id }),
            field("Role on the Project", value: if m != none { m.role }),
          )
        },
      ),
    )
  }

  v(1fr)

  block(width: 100%, {
    line(length: 100%, stroke: 0.6pt + border)
    v(7mm)
    grid(
      columns: (1fr, 1fr),
      column-gutter: 14mm,
      block({
        eyebrow[Supervisor]
        v(1.4mm, weak: true)
        text(font: body-font, size: 11pt, weight: 700)[Dr. Khaled Amin]
      }),
      block({
        eyebrow[Signature]
        v(8mm)
        line(length: 100%, stroke: 0.7pt + border)
      }),
    )
  })
}

// ─────────────────────────────────────────────────────────────────────
// Part divider
// ─────────────────────────────────────────────────────────────────────

#let part(number, title, blurb: none) = {
  pagebreak(weak: true)
  set page(header: none, footer: none, numbering: none, fill: paper)

  v(1fr)
  let pw = 128mm
  let ph = 54mm
  align(center, block(width: pw, height: ph, {
    place(top + left, chamfer(pw, ph, cut: 14pt, fill: surface, stroke: 0.8pt + border))
    place(center + horizon, align(center)[
      #eyebrow[Part #number]
      #v(3mm)
      #text(font: display-font, size: 23pt, weight: 600, tracking: 0.06em)[#title]
    ])
  }))
  if blurb != none {
    v(8mm)
    align(center, block(width: 108mm, {
      set text(size: 10pt, fill: muted)
      set par(justify: false, leading: 0.8em)
      align(center, blurb)
    }))
  }
  v(1fr)
  // Land on the next recto from inside this scope, so the blank verso it
  // creates inherits `header: none` / `footer: none` and is truly blank.
  pagebreak(weak: true)
}

// A figure that gets a page to itself. Dense diagrams shrink to illegibility
// inside a 158 mm text column; landscape with reduced margins gives ~265 mm,
// which is 1.7x the width and the most the paper allows.
#let full-page-figure(path, caption: none, landscape: true, label-as: none) = {
  pagebreak(weak: true)
  set page(
    flipped: landscape,
    margin: (x: 16mm, top: 18mm, bottom: 18mm),
    header: none,
  )
  v(1fr)
  // Both dimensions are bounded with `fit: contain`, otherwise a tall diagram
  // scaled to 100% width overruns the page and is silently clipped.
  let fig = figure(
    image(
      path,
      width: 100%,
      height: if landscape { 158mm } else { 236mm },
      fit: "contain",
    ),
    caption: caption,
  )
  if label-as != none { [#fig #label-as] } else { fig }
  v(1fr)
  pagebreak(weak: true)
}

// ─────────────────────────────────────────────────────────────────────
// Content blocks
// ─────────────────────────────────────────────────────────────────────

// A bronze-edged plate. Breakable, so it survives page boundaries — the
// true chamfer is reserved for cover and part pages, which never break.
#let plate(label: none, accent: bronze, body) = block(
  width: 100%,
  fill: surface,
  stroke: (left: 2pt + accent, rest: 0.5pt + border),
  inset: (x: 11pt, y: 9pt),
  above: 1.4em,
  below: 1.4em,
  radius: 0pt,
  {
    if label != none {
      eyebrow(label, fill: accent)
      v(0.45em, weak: true)
    }
    set text(size: small-size + 0.3pt)
    set par(leading: 0.68em)
    body
  },
)

#let note(body) = plate(label: "Note", accent: gold, body)

// Architecture Decision Record.
// `context` is a Typst keyword, hence `background` for the first field.
#let adr(id, title, background: none, decision: none, consequences: none) = plate(
  label: [ADR-#id],
  accent: bronze,
  {
    text(font: heading-font, weight: 700, size: 10pt)[#title]
    v(0.5em, weak: true)
    // Run-in labels: a fixed label column made "CONSEQUENCES" wrap.
    let row(k, val) = if val != none {
      block(below: 0.45em, {
        eyebrow(k, size: 6.8pt)
        h(0.45em)
        val
      })
    }
    row("Context", background)
    row("Decision", decision)
    row("Consequences", consequences)
  },
)

// ─────────────────────────────────────────────────────────────────────
// Template
// ─────────────────────────────────────────────────────────────────────

#let book(title: "", doc) = {
  set document(title: title)

  set page(
    paper: "a4",
    margin: (inside: 30mm, outside: 22mm, top: 25mm, bottom: 22mm),
    binding: left,
    header: _running-header(),
    footer: _running-footer(),
  )

  set text(font: body-font, size: body-size, fill: ink, lang: "en", hyphenate: true)
  set par(justify: true, leading: 0.74em, spacing: 1.05em, linebreaks: "optimized")
  set heading(numbering: "1.1")

  // Headings are never hyphenated: a split word in a title reads as a fault.
  show heading: set text(hyphenate: false)

  // Lists
  set list(indent: 6pt, spacing: 0.72em, marker: text(fill: bronze)[•])
  set enum(indent: 6pt, spacing: 0.72em)

  // Tables read as data, not as boxes: horizontal rules only.
  set table(
    stroke: (x, y) => (bottom: 0.5pt + border, top: if y == 0 { 0.6pt + ink } else { none }),
    inset: (x: 6pt, y: 5.5pt),
  )
  show table.cell.where(y: 0): set text(font: heading-font, size: micro-size, weight: 700, tracking: 0.08em)
  show table: set text(size: small-size)

  // Inline code
  show raw.where(block: false): it => box(
    fill: surface,
    stroke: 0.4pt + border,
    inset: (x: 3pt, y: 0pt),
    outset: (y: 3pt),
    text(font: mono-font, size: code-size, fill: bronze, it),
  )

  // Code listings — real, selectable, searchable text. Never images.
  set raw(theme: "/assets/vestora-code.tmTheme")
  show raw.where(block: true): it => block(
    width: 100%,
    fill: surface,
    stroke: (left: 2pt + gold, rest: 0.5pt + border),
    inset: (x: 10pt, y: 9pt),
    breakable: true,
    {
      set text(font: mono-font, size: code-size)
      set par(justify: false, leading: 0.62em)
      // Gutter numbers via `raw.line` so the block keeps its own line layout;
      // laying the lines out in a grid collapsed the row heights.
      show raw.line: l => box(width: 100%, {
        box(
          width: 2.1em,
          align(right, text(fill: border.darken(32%), size: code-size - 0.8pt)[#l.number]),
        )
        h(0.9em)
        l.body
      })
      it
    },
  )

  // Figures, tables and listings are numbered sequentially through the book.
  //
  // Chapter-scoped numbering ("Figure 6.2") was attempted twice and reverted.
  // A numbering function that reads the heading counter inside `context` is
  // re-evaluated at the *outline's* location when the List of Figures renders,
  // where the heading counter reads zero — every entry became "Figure 0.1".
  // Seeding a two-level counter at each chapter opener did not survive the
  // figure's own step either. Sequential numbering is correct in both the
  // caption and the list, which matters more than the chapter prefix.
  set figure(numbering: "1")
  show figure: set block(above: 1.5em, below: 1.5em)
  show figure.caption: it => context {
    set text(font: heading-font, size: micro-size + 0.5pt, fill: muted)
    set par(justify: false, leading: 0.6em)
    block(width: 100%, {
      text(fill: bronze, weight: 700)[
        #it.supplement #it.counter.display(it.numbering)
      ]
      h(0.4em)
      it.body
    })
  }

  // Chapter opener
  show heading.where(level: 1): it => {
    pagebreak(weak: true)
    block(width: 100%, above: 0pt, below: 1.8em, {
      v(6mm)
      context {
        let n = counter(heading).get().first()
        eyebrow[Chapter #n]
      }
      v(2mm)
      set par(justify: false, leading: 0.55em)
      text(font: display-font, size: 24pt, weight: 600, tracking: 0.03em, fill: ink, it.body)
      v(3mm)
      line(length: 30mm, stroke: 1pt + gold)
    })
  }

  show heading.where(level: 2): it => block(above: 1.9em, below: 0.85em, {
    set text(font: heading-font, size: 13pt, weight: 700, fill: ink)
    set par(justify: false)
    it
  })

  show heading.where(level: 3): it => block(above: 1.5em, below: 0.7em, {
    set text(font: heading-font, size: 10.5pt, weight: 700, fill: bronze)
    set par(justify: false)
    it
  })

  show heading.where(level: 4): it => block(above: 1.2em, below: 0.55em, {
    set text(font: heading-font, size: 9.5pt, weight: 600, fill: muted)
    set par(justify: false)
    it
  })

  doc
}

// Visible placeholder. Unwritten sections must be obvious in the draft rather
// than silently shipping as blank pages.
#let todo(body) = block(
  width: 100%,
  fill: rgb("#F3E4D8"),
  stroke: (left: 2pt + rgb("#A03A1E"), rest: 0.5pt + rgb("#E0C4B4")),
  inset: (x: 10pt, y: 7pt),
  above: 1.1em,
  below: 1.1em,
  {
    eyebrow("Draft", fill: rgb("#A03A1E"), size: 6.8pt)
    h(0.5em)
    text(size: small-size, fill: rgb("#7A3A22"), body)
  },
)

// Switch heading numbering to A.1 for the appendices.
#let appendix-mode() = {
  counter(heading).update(0)
  set heading(numbering: "A.1")
}

// Front-matter section (unnumbered, roman page numbers handled by caller).
#let fm-heading(title) = {
  block(width: 100%, above: 0pt, below: 1.5em, {
    set par(justify: false)
    text(font: display-font, size: 17pt, weight: 600, tracking: 0.04em)[#title]
    v(2.5mm)
    line(length: 26mm, stroke: 1pt + gold)
  })
}
