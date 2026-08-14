// Vestora — technical progress report master.
// Same tokens and furniture as the book; a lighter structure suited to a
// twelve-page standalone report that must feel like part of the same body.
#import "theme.typ": *
#import "vestora.typ": chamfer, plate, note, full-page-figure

#let REPORTS = (
  "Idea & Requirements",
  "Foundation & Design System",
  "Identity & Sessions",
  "Ventures & Lifecycle",
  "Review & Approval",
  "Discovery & Engagement",
  "Messaging & Notifications",
  "The Deal Room",
  "Commitment & Pipeline",
  "Payments",
  "Dashboards & Analytics",
  "Administration & Evaluation",
)

// The series strip: shows the reader where this report sits in the series.
// Twelve cells wrap to two rows of six rather than shrinking to a twelfth of
// the measure, where the names would no longer be readable.
#let series-strip(current) = {
  let cells = ()
  for (i, name) in REPORTS.enumerate() {
    let n = i + 1
    let active = n == current
    cells.push(block(
      width: 100%,
      fill: if active { surface } else { none },
      stroke: if active { (left: 2pt + bronze, rest: 0.5pt + border) } else { 0.5pt + border },
      inset: (x: 5pt, y: 6pt),
      {
        text(
          font: display-font, size: 11pt, weight: 700,
          fill: if active { gold } else { border.darken(18%) },
        )[#if n < 10 [0#n] else [#n]]
        v(1.2mm, weak: true)
        set par(justify: false, leading: 0.5em)
        text(
          font: heading-font, size: 6.2pt, weight: if active { 700 } else { 400 },
          tracking: 0.06em, fill: if active { ink } else { muted },
        )[#upper(name)]
      },
    ))
  }
  grid(columns: (1fr,) * 6, column-gutter: 2mm, row-gutter: 2mm, ..cells)
}

#let report-cover(number: 1, title: "", subtitle: "", date: "") = {
  set page(
    paper: "a4",
    margin: (x: 24mm, top: 22mm, bottom: 20mm),
    fill: paper,
    header: none, footer: none, numbering: none,
  )
  set text(fill: ink, hyphenate: false)

  grid(
    columns: (auto, 1fr, auto),
    column-gutter: 6mm,
    align: (center + horizon, center + horizon, center + horizon),
    image("/assets/logo-university.png", width: 17mm),
    align(center)[
      #eyebrow("Menoufia University", size: 8pt, fill: bronze)
      #v(0.25em)
      #eyebrow("Faculty of Computers and Information", size: 7pt)
    ],
    image("/assets/logo-faculty.png", width: 22mm),
  )

  v(1fr)

  let pw = 96mm
  let ph = 52mm
  align(center, block(width: pw, height: ph, {
    place(top + left, chamfer(pw, ph, cut: 12pt, fill: surface, stroke: 0.8pt + border))
    place(center + horizon, align(center)[
      #image("/assets/vestora-mark.svg", width: 13mm)
      #v(3mm)
      #text(font: display-font, size: 22pt, weight: 700, tracking: 0.24em)[VESTORA]
      #v(2mm)
      #line(length: 24mm, stroke: 0.8pt + gold)
    ])
  }))

  v(9mm)
  align(center, eyebrow[Technical Progress Report #number of #REPORTS.len()])

  v(11mm)
  align(center, block(width: 132mm)[
    #set par(justify: false, leading: 0.5em)
    #text(font: display-font, size: 23pt, weight: 600, tracking: 0.03em)[#title]
    #v(4mm)
    #line(length: 20mm, stroke: 0.6pt + border)
    #v(4mm)
    #text(size: 10.5pt, fill: muted)[#subtitle]
  ])

  v(1fr)

  align(center, block(width: 100%, series-strip(number)))

  v(8mm)
  grid(
    columns: (1fr, 1fr),
    align: (left, right),
    eyebrow[Supervisor · Dr. Khaled Amin],
    eyebrow(date),
  )
}

#let report(number: 1, name: "", doc) = {
  set document(title: "Vestora — Progress Report " + str(number))

  set page(
    paper: "a4",
    margin: (inside: 26mm, outside: 22mm, top: 24mm, bottom: 21mm),
    binding: left,
    header: context {
      let p = here().page()
      if p > 1 {
        grid(
          columns: (1fr, auto),
          align: (left + bottom, right + bottom),
          eyebrow[Report #number · #name],
          eyebrow[Vestora],
        )
        v(-0.55em)
        line(length: 100%, stroke: 0.5pt + border)
      }
    },
    footer: context {
      let p = here().page()
      if p > 1 {
        set text(font: heading-font, size: micro-size, fill: muted, tracking: 0.1em)
        let mark = box(baseline: 25%, {
          box(image("/assets/vestora-mark.svg", height: 7pt))
          h(3.5pt)
          text(font: display-font, size: 6.8pt, weight: 700, tracking: 0.2em, fill: muted)[VESTORA]
        })
        grid(
          columns: (1fr, auto),
          align: (left + horizon, right + horizon),
          if calc.even(p) { counter(page).display() } else { mark },
          if calc.even(p) { mark } else { counter(page).display() },
        )
      }
    },
  )

  set text(font: body-font, size: 10.5pt, fill: ink, lang: "en", hyphenate: true)
  set par(justify: true, leading: 0.74em, spacing: 1.05em, linebreaks: "optimized")
  set list(indent: 6pt, spacing: 0.7em, marker: text(fill: bronze)[•])
  set enum(indent: 6pt, spacing: 0.7em)

  set table(
    stroke: (x, y) => (bottom: 0.5pt + border, top: if y == 0 { 0.6pt + ink } else { none }),
    inset: (x: 6pt, y: 5.5pt),
  )
  show table.cell.where(y: 0): set text(font: heading-font, size: micro-size, weight: 700, tracking: 0.08em)
  show table: set text(size: small-size)

  show raw.where(block: false): it => box(
    fill: surface, stroke: 0.4pt + border, inset: (x: 3pt), outset: (y: 3pt),
    text(font: mono-font, size: code-size, fill: bronze, it),
  )
  set raw(theme: "/assets/vestora-code.tmTheme")
  show raw.where(block: true): it => block(
    width: 100%, fill: surface,
    stroke: (left: 2pt + gold, rest: 0.5pt + border),
    inset: (x: 10pt, y: 9pt), breakable: true,
    {
      set text(font: mono-font, size: code-size)
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
  show figure: set block(above: 1.4em, below: 1.4em)
  show figure.caption: it => context {
    set text(font: heading-font, size: micro-size + 0.5pt, fill: muted)
    set par(justify: false, leading: 0.6em)
    block(width: 100%, {
      text(fill: bronze, weight: 700)[#it.supplement #it.counter.display(it.numbering)]
      h(0.4em)
      it.body
    })
  }

  show heading: set text(hyphenate: false)
  set heading(numbering: "1.")

  show heading.where(level: 1): it => block(above: 2em, below: 0.9em, {
    set par(justify: false)
    text(font: heading-font, size: 15pt, weight: 700, fill: ink, it)
    v(2mm)
    line(length: 22mm, stroke: 1pt + gold)
  })
  show heading.where(level: 2): it => block(above: 1.5em, below: 0.6em, {
    set text(font: heading-font, size: 11pt, weight: 700, fill: bronze)
    set par(justify: false)
    it
  })
  show heading.where(level: 3): it => block(above: 1.2em, below: 0.5em, {
    set text(font: heading-font, size: 9.5pt, weight: 600, fill: muted)
    set par(justify: false)
    it
  })

  doc
}

// Screenshot with caption.
#let shot(path, caption) = figure(
  block(width: 100%, stroke: 0.5pt + border, clip: true, image(path, width: 100%)),
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

#let delivered(body) = plate(label: "Delivered", accent: gold, body)
#let challenge(title, body) = plate(label: "Challenge", accent: bronze, {
  text(font: heading-font, weight: 700, size: 10pt)[#title]
  v(0.45em, weak: true)
  body
})
