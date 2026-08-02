#import "/lib/vestora.typ": fm-heading
#import "/lib/theme.typ": *

#fm-heading[Acknowledgment]

We are grateful to our supervisor, *Dr. Khaled Amin*, whose guidance shaped
this project well beyond its code. The questions he asked at the right moments
— about correctness, about what happens when a payment fails, about who is
allowed to do what — are visible throughout this document.

We thank the academic and technical staff of the Faculty of Computers and
Information for the foundation this work is built on, and for an environment in
which a project of this scope was possible.

#v(6mm)

#grid(
  columns: (1fr, 1fr),
  column-gutter: 12mm,
  row-gutter: 12mm,
  block(width: 100%, {
    line(length: 100%, stroke: 0.7pt + border)
    v(2mm)
    eyebrow[Name and Title]
  }),
  block(width: 100%, {
    line(length: 100%, stroke: 0.7pt + border)
    v(2mm)
    eyebrow[Name and Title]
  }),
)

#v(6mm)

Finally, we thank our families, whose patience across a long build is the
reason there was a project to write about at all.

#pagebreak(weak: true)
