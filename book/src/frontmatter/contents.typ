#import "/lib/vestora.typ": fm-heading
#import "/lib/theme.typ": *

#fm-heading[Contents]

#show outline.entry.where(level: 1): it => {
  v(9pt, weak: true)
  set text(font: heading-font, weight: 700, size: 10pt, fill: ink)
  it
}
#show outline.entry.where(level: 2): set text(size: 9pt, fill: ink)
#show outline.entry.where(level: 3): set text(size: 8.5pt, fill: muted)

#outline(title: none, depth: 3, indent: 1.1em)

#pagebreak(weak: true)

#fm-heading[List of Figures]
#show outline.entry: set text(size: 9pt)
#outline(title: none, target: figure.where(kind: image))

#pagebreak(weak: true)

#fm-heading[List of Tables]
#outline(title: none, target: figure.where(kind: table))

#pagebreak(weak: true)

#fm-heading[List of Listings]
#outline(title: none, target: figure.where(kind: raw))

#pagebreak(weak: true)

#fm-heading[Abbreviations]

#table(
  columns: (26mm, 1fr),
  align: (left, left),
  table.header([Term], [Expansion]),
  [ADR], [Architecture Decision Record],
  [API], [Application Programming Interface],
  [BCrypt], [Password hashing function based on the Blowfish cipher],
  [CORS], [Cross-Origin Resource Sharing],
  [CRUD], [Create, Read, Update, Delete],
  [DTO], [Data Transfer Object],
  [EF Core], [Entity Framework Core],
  [ERD], [Entity Relationship Diagram],
  [FR / NFR], [Functional / Non-Functional Requirement],
  [JWT], [JSON Web Token],
  [ORM], [Object-Relational Mapping],
  [OTP], [One-Time Password],
  [OWASP], [Open Worldwide Application Security Project],
  [RBAC], [Role-Based Access Control],
  [REST], [Representational State Transfer],
  [RSC], [React Server Component],
  [SPA], [Single-Page Application],
  [SSR], [Server-Side Rendering],
  [TTL], [Time To Live],
  [UTC], [Coordinated Universal Time],
  [WCAG], [Web Content Accessibility Guidelines],
)

#pagebreak(weak: true)
