// Vestora — presentation master. Shares the book's tokens exactly, so the deck
// and the document read as one body of work.
#import "theme.typ": *

#let accent = bronze

#let deck(doc) = {
  set page(
    paper: "presentation-16-9",
    margin: (x: 22mm, y: 16mm),
    fill: paper,
    footer: context {
      let n = counter(page).get().first()
      if n > 1 {
        grid(
          columns: (auto, 1fr, auto),
          align: (left + horizon, center, right + horizon),
          {
            box(image("/assets/vestora-mark.svg", height: 6pt))
            h(3pt)
            text(font: display-font, size: 6.5pt, weight: 700, tracking: 0.2em, fill: muted)[VESTORA]
          },
          [],
          text(font: heading-font, size: 7.5pt, fill: muted, tracking: 0.1em)[#n],
        )
      }
    },
  )
  set text(font: body-font, size: 16pt, fill: ink, hyphenate: false)
  set par(justify: false, leading: 0.7em, spacing: 0.9em)
  set list(indent: 4pt, spacing: 0.75em, marker: text(fill: accent)[•])
  set enum(indent: 4pt, spacing: 0.75em)

  show raw.where(block: false): it => box(
    fill: surface, stroke: 0.4pt + border, inset: (x: 3pt), outset: (y: 3pt),
    text(font: mono-font, size: 0.85em, fill: bronze, it),
  )
  show raw.where(block: true): it => block(
    width: 100%, fill: surface, stroke: (left: 2pt + gold, rest: 0.5pt + border),
    inset: (x: 10pt, y: 8pt),
    text(font: mono-font, size: 11pt, it),
  )
  set table(
    stroke: (x, y) => (bottom: 0.5pt + border, top: if y == 0 { 0.7pt + ink } else { none }),
    inset: (x: 7pt, y: 6pt),
  )
  show table.cell.where(y: 0): set text(
    font: heading-font, size: 9.5pt, weight: 700, tracking: 0.08em,
  )
  show table: set text(size: 12.5pt)

  doc
}

// ── Slide furniture ──────────────────────────────────────────────────

#let slide(title: none, eyebrow-text: none, body) = {
  pagebreak(weak: true)
  if eyebrow-text != none {
    eyebrow(eyebrow-text, size: 8pt, fill: accent)
    v(1.5mm)
  }
  if title != none {
    text(font: heading-font, size: 25pt, weight: 700)[#title]
    v(2mm)
    line(length: 26mm, stroke: 1.2pt + gold)
    v(6mm)
  }
  body
}

// A diagram needs the whole slide. Title furniture costs about a third of the
// height, which on a projector is the difference between readable and not.
#let diagram-slide(path, label: none, note: none) = {
  pagebreak(weak: true)
  if label != none { eyebrow(label, size: 8pt, fill: accent) }
  v(2mm)
  align(center, image(path, height: if note != none { 82% } else { 88% }))
  if note != none {
    v(2mm)
    align(center, text(size: 12pt, fill: muted)[#note])
  }
}

// A slide whose whole job is one sentence. Second content block is optional:
//   #statement[Headline][Supporting line]
#let statement(..args) = {
  let a = args.pos()
  pagebreak(weak: true)
  v(1fr)
  align(center, block(width: 80%, {
    set par(justify: false, leading: 0.55em)
    align(center, text(font: display-font, size: 30pt, weight: 600)[#a.at(0)])
    if a.len() > 1 {
      v(7mm)
      align(center, text(size: 15pt, fill: muted)[#a.at(1)])
    }
  }))
  v(1fr)
}

#let section-slide(number, title, sub: none) = {
  pagebreak(weak: true)
  set page(fill: surface)
  v(1fr)
  align(center, {
    eyebrow[Part #number]
    v(4mm)
    text(font: display-font, size: 34pt, weight: 600, tracking: 0.04em)[#title]
    if sub != none {
      v(5mm)
      text(size: 14pt, fill: muted)[#sub]
    }
  })
  v(1fr)
}

// Big number with a label under it.
#let stat(value, label, accent-value: false) = align(center, {
  text(
    font: display-font, size: 30pt, weight: 700,
    fill: if accent-value { bronze } else { ink },
  )[#value]
  v(2mm)
  eyebrow(label, size: 7.5pt)
})

#let stats(..items) = grid(
  columns: (1fr,) * items.pos().len(),
  column-gutter: 6mm,
  ..items.pos()
)

#let callout(label: none, accent: bronze, body) = block(
  width: 100%, fill: surface, stroke: (left: 3pt + accent, rest: 0.5pt + border),
  inset: (x: 12pt, y: 10pt),
  {
    if label != none { eyebrow(label, fill: accent, size: 7.5pt); v(2mm, weak: true) }
    set text(size: 14pt)
    body
  },
)

#let two(left-body, right-body, ratio: (1fr, 1fr)) = grid(
  columns: ratio, column-gutter: 9mm, align: (left + top, left + top),
  left-body, right-body,
)

// A slide body is roughly 79mm tall. An image sized only by width will exceed
// that on any portrait capture and push the rest of its slide onto the next
// page, leaving a title alone. `h` caps the height; width follows the aspect.
#let shot(path, cap: none, h: none) = block(width: 100%, {
  align(center, block(
    stroke: 0.5pt + border, clip: true,
    if h == none { image(path, width: 100%) } else { image(path, height: h) },
  ))
  if cap != none {
    v(2mm)
    text(font: heading-font, size: 10pt, fill: muted)[#cap]
  }
})

// ── Added for the presentation rebuild ───────────────────────────────
//
// The first deck failed in two ways that these three helpers exist to stop:
// prose written into bullets, and artwork floated in the middle of a 16:9
// frame with a third of the width unused.

// A tall capture cropped to its top. A deal room is two thousand pixels of
// page; a slide can carry the part that makes the point and no more.
#let crop-shot(path, height: 78mm, cap: none) = block({
  block(
    width: 100%, height: height, clip: true,
    stroke: 0.5pt + border,
    image(path, width: 100%),
  )
  if cap != none {
    v(2mm)
    text(font: heading-font, size: 10pt, fill: muted)[#cap]
  }
})

// Artwork beside its point, rather than artwork alone in a wide frame.
// The image takes the height it needs and the argument sits next to it.
#let figure-point(path, body, img: 1fr, txt: 1fr, h: 74mm) = grid(
  columns: (img, txt), column-gutter: 10mm, align: (center + horizon, left + horizon),
  block(height: h, image(path, height: 100%)),
  block(body),
)

// A claim with its evidence directly under it. The claim is the sentence the
// speaker says; the evidence is what the committee reads while hearing it.
#let claim(text-body, evidence) = block(width: 100%, {
  set par(leading: 0.6em)
  text(font: display-font, size: 21pt, weight: 600)[#text-body]
  v(5mm)
  evidence
})
