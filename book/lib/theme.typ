// Vestora book — design tokens.
// Values are lifted 1:1 from Vestora-Brand-Sheet.html so the book and the
// product share one palette. Dark-mode tokens are deliberately not carried
// over: paper has no theme.

#let ink = rgb("#241C14")
#let muted = rgb("#71614C")
#let bronze = rgb("#8B4F2A")
#let gold = rgb("#B08A3F")
#let paper = rgb("#F6F2E7")
#let surface = rgb("#FCFAF3")
#let border = rgb("#E3D9C4")

// Cinzel is display-only: cover, part and chapter openers. Never in running
// text — it is an inscriptional caps face and unreadable at paragraph sizes.
#let display-font = ("Cinzel", "Georgia")
#let heading-font = ("Karla", "Segoe UI")
#let body-font = ("Spectral", "Cambria")
#let mono-font = ("Cascadia Mono", "Consolas")
// The brand's own Arabic face — the same one every Arabic screenshot in this
// book was captured in.
#let arabic-font = ("Cairo", "Segoe UI")

#let body-size = 10.5pt
#let small-size = 9pt
#let micro-size = 7.5pt
#let code-size = 8.5pt

// Chamfered plate: top-right and bottom-left corners cut. This is the one
// structural motif carried over from the product's plate system.
#let chamfer(width, height, cut: 12pt, fill: none, stroke: none) = polygon(
  fill: fill,
  stroke: stroke,
  (0pt, 0pt),
  (width - cut, 0pt),
  (width, cut),
  (width, height),
  (cut, height),
  (0pt, height - cut),
)

// Letter-spaced caps used for eyebrows, headers and labels.
#let eyebrow(body, size: micro-size, fill: muted, weight: 600) = text(
  font: heading-font,
  size: size,
  weight: weight,
  tracking: 0.18em,
  fill: fill,
  upper(body),
)
