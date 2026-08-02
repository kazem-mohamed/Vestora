#import "/lib/vestora.typ": fm-heading, plate, note
#import "/lib/theme.typ": *

#fm-heading[How to Read This Document]

This document is long because the system is. It is organised so that it does
not have to be read in order.

#v(2mm)

#table(
  columns: (46mm, 1fr),
  align: (left + top, left + top),
  table.header([If you want], [Read]),

  [The shortest complete picture],
  [The Abstract, the Executive Summary, and #link(<sec:system-overview>)[§1.7 System Overview].],

  [Why the system is built this way],
  [Chapter 5 (technology choices), Chapter 6 (architecture, including the
   Architecture Decision Records in §6.9).],

  [Whether it is safe],
  [Chapter 10 (threat model, authentication, authorisation) and Chapter 11
   (payment integrity).],

  [Whether it works],
  [Chapter 15 (testing), Chapter 17 (performance), Chapter 19 (evaluation
   against the stated objectives).],

  [What it actually does],
  [Chapters 13 and 14, which walk the platform's features as journeys rather
   than as endpoint listings.],

  [What was hard],
  [Chapter 18 — the problems that cost the most time, and how each was
   resolved.],

  [Reference material],
  [The appendices: full API listing, schema, traceability matrix, test
   catalogue, interface gallery.],
)

#v(4mm)

== Conventions

/ Figures, tables and listings: are numbered within their chapter — #emph[Figure 6.2] is
  the second figure of Chapter 6 — and every one is referred to from the text.

/ Code: appears as text, never as a screenshot, so that it can be searched,
  copied and read at any zoom level. Listings show the portion that carries the
  point being made; complete files are in @app:listings.

/ Requirements: carry stable identifiers (#emph[FR-14], #emph[NFR-03]) and are
  traceable from Chapter 4 through design and implementation to the test cases
  in @app:tests.

/ Decisions: that shaped the architecture are recorded as numbered
  #emph[Architecture Decision Records] in §6.9, each stating the context, the
  decision and its consequences.

#note[
  Sections still marked #emph[Draft] are noted as such in place. Nothing in this
  document is presented as finished when it is not.
]

#pagebreak(weak: true)
