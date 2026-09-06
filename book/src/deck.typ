#import "/lib/slides.typ": *
#import "/lib/theme.typ": *

#show: deck

// Rules this deck is written against, because the previous one broke all four:
//   1. The title is the claim. The body is the evidence for it.
//   2. Fragments, never sentences. The speaker says the sentences.
//   3. Fill the frame. Nothing small and centred in a wide one.
//   4. Show the product. An argument about software is weaker than the software.

// ══════════════════════════════════════════════════════════ TITLE ═══
#set page(footer: none)
#v(1fr)
#align(center)[
  #grid(
    columns: (auto, auto),
    column-gutter: 12mm,
    align: (horizon, horizon),
    image("/assets/logo-university.png", width: 19mm),
    image("/assets/logo-faculty.png", width: 24mm),
  )
  #v(9mm)
  #image("/assets/vestora-mark.svg", width: 17mm)
  #v(4mm)
  #text(font: display-font, size: 40pt, weight: 600, tracking: 0.08em)[VESTORA]
  #v(4mm)
  #text(size: 16pt, fill: muted)[An equity crowdfunding platform for founders and investors]
  #v(12mm)
  #text(font: heading-font, size: 11pt, fill: muted, tracking: 0.06em)[
    Graduation Project · Menoufia University · Faculty of Computers and Information
  ]
  #v(2mm)
  #text(font: heading-font, size: 11pt, fill: muted)[Supervisor · Dr. Khaled Amin]
]
#v(1fr)
#set page(footer: auto)

// ═════════════════════════════════════════════════════ THE PROBLEM ═══

#statement[
  Access to capital is decided by who a founder already knows.
][
  Everything in this project follows from treating that as a software problem
  rather than a market one.
]

#slide(eyebrow-text: "The problem", title: "Four failures, one shape")[
  #v(3mm)
  #grid(
    columns: (1fr, 1fr),
    column-gutter: 12mm,
    row-gutter: 9mm,
    callout(label: "01 · Discovery")[
      Found through *who the founder knows* — not through what the venture is.
    ],
    callout(label: "02 · Evaluation")[
      Team, ask, documents, progress — scattered across decks and email, and
      *verifiable by nobody*.
    ],
    callout(label: "03 · Commitment")[
      Existing platforms model a *purchase*. An equity commitment has an
      approval step and a settlement step.
    ],
    callout(label: "04 · After the money")[
      The platform stops at payment. *Accountability becomes goodwill.*
    ],
  )
  #v(6mm)
  #align(center, text(size: 15pt, fill: muted)[
    Each one is a software problem before it is a market problem.
  ])
]

#slide(eyebrow-text: "Where this sits", title: "Two models. Neither of them ours.")[
  #v(2mm)
  #table(
    columns: (1fr, auto, auto, auto),
    align: (left + horizon, center + horizon, center + horizon, center + horizon),
    table.header([], [Reward\ platforms], [Equity\ platforms], [*Vestora*]),
    [Discovery without an account], [Yes], [Often no], [*Yes*],
    [Models a holding, not a purchase], [No], [Yes], [*Yes*],
    [Open to small individual amounts], [Yes], [No], [*Yes*],
    [Approved and funded kept separate], [No], [Varies], [*Yes*],
    [The relationship after the money], [Partial], [Rare], [*Yes*],
    [Legal execution of the instrument], [N/A], [Yes], [*No*],
    [Identity and AML checks], [Partial], [Yes], [*No*],
  )
  #v(4mm)
  #align(center, text(size: 14pt, fill: muted)[
    The last two rows are ours to lose. A comparison the author wins on every
    line is not a comparison.
  ])
]

// ════════════════════════════════════════════════════ THE CORE IDEA ═══

#section-slide(1, "The idea the system rests on", sub: "One distinction, enforced everywhere")

#statement[
  An approved commitment is not a funded one.
][
  Saying yes is not paying. The platform never lets the two become one number.
]

#slide(eyebrow-text: "Why it matters", title: "One column, three writers, one bug")[
  #v(2mm)
  #two(
    [
      #callout(label: "The symptom")[
        A venture that was *actively raising* reverted to an early stage after
        its founder edited the description and an admin re-approved it.
      ]
      #v(5mm)
      #callout(label: "The cause")[
        One status column written by three actors — administrator, founder,
        funding pipeline — each for a good reason, none aware of the others.
      ]
    ],
    [
      #callout(label: "The fix", accent: gold)[
        Three columns. *One writer each.*
        #v(3mm)
        #set text(size: 13pt)
        `ModerationStatus` — administrator \
        `LifecycleStatus` — founder \
        `Stage` — funding pipeline
      ]
      #v(5mm)
      #text(size: 15pt)[
        The sequence that produced the defect is now *structurally impossible*.
        Approval writes one column and cannot reach the other two.
      ]
    ],
  )
]

#slide(eyebrow-text: "The consequence", title: "Totals are derived, never stored")[
  #v(2mm)
  #two(
    [
      #text(size: 15.5pt)[
        Four figures, four predicates, *no stored aggregate anywhere.*
      ]
      #v(5mm)
      #set text(size: 14pt)
      #table(
        columns: (auto, 1fr),
        align: (left + top, left + top),
        table.header([Figure], [Counted from]),
        [Interest], [requests awaiting a decision],
        [Committed], [the founder accepted],
        [Payment due], [an open funding request],
        [*Funded*], [*a settled payment*],
      )
    ],
    [
      #callout(label: "Why not a counter", accent: gold)[
        A counter can drift and cannot be recomputed.
        #v(3mm)
        An aggregation over rows is always correct and can be rebuilt from
        history at any time.
      ]
      #v(5mm)
      #text(size: 14.5pt, fill: muted)[
        The cost is accepted knowingly: a read-time sum on the busiest page.
        A stale cache is recoverable. A drifted number is not.
      ]
    ],
  )
]

// ═══════════════════════════════════════════════════ THE PRODUCT ═══

#section-slide(2, "The platform", sub: "Live demonstration — or the journey that follows")

#slide(eyebrow-text: "Discovery", title: "Found on attributes, without an account")[
  #v(2mm)
  #shot("/assets/screenshots/deck-discovery.png")
  #v(6mm)
  #two(
    [
      #set text(size: 14pt)
      - No sign-in required — the founding claim, shown rather than asserted
      - One search field, *four* attribute filters, *six* sort orders
    ],
    [
      #set text(size: 14pt)
      - *Thirty-nine* categories, closed and translated — free text cannot be
        filtered coherently
      - Ranking is *deterministic*: a founder can be told why they rank where
        they do
    ],
  )
]

#slide(eyebrow-text: "The relationship", title: "One investor, one venture, one page")[
  #v(1mm)
  #shot("/assets/screenshots/deck-dealroom.png", h: 60mm)
  #v(4mm)
  #two(
    [
      #set text(size: 13.5pt)
      Three badges, and only one of them is typed by a person. *Committed* is
      the relationship stage. *Funded* is money that settled.
    ],
    [
      #set text(size: 13.5pt)
      *Slowing · 178d quiet* is derived — a score spent down from 100 by named
      problems, computed on read. A health field somebody has to keep current
      is a health field that is permanently green.
    ],
  )
]

#slide(eyebrow-text: "The record", title: "A timeline nobody maintains")[
  #v(1mm)
  #two(
    [
      #v(2mm)
      #set text(size: 15pt)
      - Every stage move is an *append-only* row: from, to, actor, reason, and
        the minutes spent in the previous stage
      - The timeline is *assembled at read time* from those rows, the funding
        request and the transactions
      - So an event cannot be missing because nobody remembered to write it
      #v(4mm)
      #callout(label: "Measured, not estimated", accent: gold)[
        #set text(size: 14pt)
        *In discussion — 9 days. Committed — 178 days.*
        #v(2mm)
        Real elapsed time on a real relationship, which is why the health score
        above reads as it does.
      ]
    ],
    shot("/assets/screenshots/deck-timeline.png"),
    ratio: (1.25fr, 1fr),
  )
]

#slide(eyebrow-text: "Platform economics", title: "Every figure a sum over rows")[
  #v(3mm)
  #shot("/assets/screenshots/deck-revenue.png", h: 64mm)
  #v(6mm)
  #two(
    [
      #set text(size: 15pt)
      Not one of these is stored as a balance. Revenue is the sum of the fee on
      settled transactions; net to founders is the difference.
    ],
    [
      #set text(size: 15pt)
      A refund removes its row from the settled set and every figure falls by
      itself — *no compensating entry, no reconciliation step.*
    ],
  )
]

// ═══════════════════════════════════════════════════ ENGINEERING ═══

#section-slide(3, "How it is defended", sub: "Constraints, tests, and what we measured")

#slide(eyebrow-text: "Correctness", title: "Constraints beat conventions")[
  #v(3mm)
  #two(
    [
      #callout(label: "The race")[
        Two rapid taps. Two requests. Both pass the application check *before
        either one writes.*
      ]
      #v(5mm)
      #text(size: 15pt)[
        A check in code can be raced. A unique index cannot — the second insert
        fails, and that failure is the correct outcome.
      ]
    ],
    [
      #set text(size: 14pt)
      #table(
        columns: (1fr,),
        align: (left,),
        table.header([Enforced by the database, not by code]),
        [`Bookmark (UserId, ProjectId)` — saved once],
        [`Follow (FollowerId, FollowedId)` — followed once],
        [`Review (ProjectId, InvestorId)` — one per venture],
        [`PaymentEvent.ProviderEventId` — a webhook applied once],
        [`OneActivePerRequest` — one live attempt],
        [`OneSucceededPerRequest` — one settlement],
      )
    ],
    ratio: (1fr, 1.2fr),
  )
]

#slide(eyebrow-text: "Verification", title: "85 tests, and an honest limit")[
  #v(2mm)
  #two(
    [
      #stats(
        stat("57", "domain tests"),
        stat("28", "integration tests"),
      )
      #v(6mm)
      #set text(size: 14.5pt)
      *Domain* — arithmetic over rows and a transition table. No I/O, so no
      database at all.

      #v(3mm)
      *Integration* — the real application, driven over HTTP. That is what lets
      `SecurityBoundaryTests` assert that a role check is not an ownership
      check.
    ],
    [
      #callout(label: "What it does not prove", accent: gold)[
        The integration half runs on an *in-memory provider*, not SQL Server.

        #v(3mm)
        It proves endpoint behaviour, status codes and authorisation.
        It does *not* prove that every query translates.
      ]
      #v(5mm)
      #text(size: 14pt, fill: muted)[
        Still absent: end-to-end browser tests, load tests, continuous
        integration. The suite passes because somebody ran it.
      ]
    ],
  )
]

#slide(eyebrow-text: "Measurement", title: "Including the target we missed")[
  #v(2mm)
  #two(
    [
      #set text(size: 14pt)
      #table(
        columns: (1fr, auto, auto),
        align: (left, right, right),
        table.header([`GET /api/projects`], [p50], [p95]),
        [Page 1], [495 ms], [*519 ms*],
        [Page 2], [475 ms], [500 ms],
      )
      #v(4mm)
      #text(size: 15pt)[
        `NFR-02` asked for *300 ms* at the 95th percentile. We measure *519*.
      ]
    ],
    [
      #callout(label: "The distribution is the diagnosis", accent: gold)[
        p50 and p95 are *24 ms apart*, and the floor is 472 ms.

        #v(3mm)
        A slow *plan* varies. A slow *floor* is a fixed cost — the round trip to
        a database on another network.
      ]
      #v(4mm)
      #text(size: 14pt, fill: muted)[
        Page 2 measures marginally faster than page 1, which confirms the cost
        is not in the row count. The optimisations were correct; they addressed
        the part that was not the bottleneck.
      ]
    ],
  )
]

// ═════════════════════════════════════════════════════════ CLOSING ═══

#slide(eyebrow-text: "Scope", title: "What we did not build")[
  #v(3mm)
  #two(
    [
      #set text(size: 15pt)
      - *Live money movement* — the Stripe path is implemented and
        configurable; the application refuses to start on a live key
      - *Regulatory onboarding* — no identity verification, no AML
      - *Legal execution* — commitments are recorded, instruments are not
        issued
    ],
    [
      #set text(size: 15pt)
      - *Secondary transfer* — a commitment cannot be sold on
      - *Learned recommendation* — ranking stays explicable by choice
      - *Horizontal scale* — presence and the notification queue are
        process-local
    ],
  )
  #v(7mm)
  #align(center, callout(label: "Every one of these is in the book", accent: gold)[
    #align(center)[
      #set text(size: 15pt)
      Declared in the scope exclusions before it was built, and repeated in the
      chapter that would otherwise be expected to contain it.
    ]
  ])
]

#statement[
  The distinction between an intention and a settlement is not specific to crowdfunding.
][
  It is the part of this project we would carry into the next one.
]

#slide(eyebrow-text: "The delivered system", title: "In numbers")[
  #v(6mm)
  #stats(
    stat("25", "API controllers"),
    stat("169", "endpoints"),
    stat("34", "entity sets"),
    stat("58", "client routes"),
  )
  #v(10mm)
  #stats(
    stat("85", "tests passing", accent-value: true),
    stat("30", "migrations"),
    stat("2 × 2", "languages · themes"),
    stat("20", "diagrams"),
  )
  #v(9mm)
  #align(center, text(size: 14pt, fill: muted)[
    Every figure counted from the source, not estimated.
  ])
]
