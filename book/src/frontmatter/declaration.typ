#import "/lib/vestora.typ": fm-heading
#import "/lib/theme.typ": *

#fm-heading[Declaration]

We declare that this document and the software system it describes are our own
work, carried out as a graduation project in the Department of Computer
Science, Faculty of Computers and Information, Menoufia University.

Where the work of others has been used, it is cited in the text and listed in
the references. Third-party libraries, frameworks and services are identified
at the point of use and summarised in @ch:tech. No part of this work has been
submitted for any other degree or qualification.

The source code of the platform was written by the project team. Where a
generated artefact appears in this document — a schema diagram derived from
the data model, an endpoint table derived from the controllers — its origin is
stated in the caption.

#v(24mm)

#grid(
  columns: (1fr, 1fr),
  column-gutter: 14mm,
  row-gutter: 16mm,
  ..(for _ in range(6) {
    (block(width: 100%, {
      line(length: 100%, stroke: 0.7pt + border)
      v(2mm)
      eyebrow[Name and Signature]
    }),)
  })
)

#v(1fr)

#align(right, block(width: 70mm, {
  line(length: 100%, stroke: 0.7pt + border)
  v(2mm)
  eyebrow[Date]
}))

#pagebreak(weak: true)
