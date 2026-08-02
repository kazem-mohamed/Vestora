#import "/lib/slides.typ": *
#import "/lib/theme.typ": *

#show: deck

// ═══════════════════════════════════════════════════════════ TITLE ═══
#set page(footer: none)
#v(1fr)
#align(center)[
  #grid(
    columns: (auto, auto),
    column-gutter: 10mm,
    align: (center + horizon, center + horizon),
    image("/assets/logo-university.png", width: 17mm),
    image("/assets/logo-faculty.png", width: 22mm),
  )
  #v(9mm)
  #image("/assets/vestora-mark.svg", width: 15mm)
  #v(4mm)
  #text(font: display-font, size: 34pt, weight: 700, tracking: 0.24em)[VESTORA]
  #v(3mm)
  #line(length: 30mm, stroke: 1pt + gold)
  #v(5mm)
  #text(size: 17pt, fill: muted)[An equity crowdfunding platform for founders and investors]
  #v(12mm)
  #eyebrow[Graduation Project · Supervised by Dr. Khaled Amin]
]
#v(1fr)
#set page(footer: auto)

// ═══════════════════════════════════════════════════════ THE CLAIM ═══
#statement[
  Capital and ideas are both plentiful.
][
  What is scarce is a reliable way for the two to find each other
  at the smallest end of the market.
]

#slide(eyebrow-text: "The gap", title: "Two models, neither of them ours")[
  #v(2mm)
  #table(
    columns: (1fr, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([], [Reward platforms], [Equity platforms]),
    [Accepts small amounts], [Yes], [No],
    [Models a holding], [No — it is a pre-order], [Yes],
    [Supports diligence], [No], [Yes],
    [Continues after funding], [Ends at fulfilment], [Ends at close],
  )
  #v(6mm)
  #callout(label: "Where Vestora sits")[
    The *intersection*: small individual amounts, a real holding, evidence
    channels, and a relationship that continues after the money moves.
  ]
]

#slide(eyebrow-text: "Problem", title: "Four failures, each a software problem")[
  #v(3mm)
  #stats(
    stat("01", "Discovery is networked"),
    stat("02", "Evaluation is unsupported"),
    stat("03", "Commitment is unmodelled"),
    stat("04", "Relationship ends at payment"),
  )
  #v(9mm)
  #set text(size: 14.5pt)
  - A venture is found through *who the founder knows*, not what it is.
  - Diligence material is scattered and unverifiable by the host.
  - Existing platforms model a *purchase*; a commitment has an approval step
    and a settlement step that must never be confused.
  - Once funds move, the platform stops. Accountability becomes goodwill.
]

// ══════════════════════════════════════════════════════ THE SYSTEM ═══
#section-slide(1, "What was built", sub: "The system, in four minutes")

#diagram-slide(
  "/assets/diagrams/out/c4-container.svg",
  label: "System overview — containers and boundaries",
)

#slide(eyebrow-text: "Scale", title: "The system in numbers")[
  #v(6mm)
  #stats(
    stat("22", "API controllers", accent-value: true),
    stat("150", "endpoints", accent-value: true),
    stat("40+", "entities", accent-value: true),
    stat("65", "frontend routes", accent-value: true),
  )
  #v(12mm)
  #stats(
    stat("20+", "migrations"),
    stat("3", "roles"),
    stat("2", "languages · LTR and RTL"),
    stat("2", "themes"),
  )
]

#slide(eyebrow-text: "Running system", title: "Three roles, one platform")[
  #v(2mm)
  #grid(
    columns: (1fr, 1fr, 1fr),
    column-gutter: 5mm,
    shot("/assets/screenshots/invest-overview.png", cap: [Investor — funded and committed as separate figures]),
    shot("/assets/screenshots/founder-funding.png", cap: [Founder — incoming commitments]),
    shot("/assets/screenshots/admin-overview.png", cap: [Administrator — platform oversight]),
  )
]

// ════════════════════════════════════════════════ THE ENGINEERING ═══
#section-slide(2, "The engineering", sub: "Four decisions worth defending")

#slide(eyebrow-text: "Decision 1", title: "Approved is not funded")[
  #two(
    [
      #set text(size: 14.5pt)
      *The defect we shipped.* A founder approved a commitment and the venture's
      funding progress went up. No money had moved.

      #v(4mm)
      *Why patching the handler was wrong.* The schema had one amount and no
      concept of settlement. Moving the increment would have moved the symptom
      and left the class.

      #v(4mm)
      *The fix.* Four objects, each holding a fact the previous cannot.
    ],
    callout(label: "The rule", accent: gold)[
      Exactly *one* state — `Settled` — contributes to a venture's total.

      #v(3mm)
      The founder's dashboard shows *two numbers*, permanently, because there
      are two facts.
    ],
  )
]

#slide(eyebrow-text: "Decision 2", title: "One field, two writers, one bug")[
  #two(
    [
      #set text(size: 14pt)
      A perfectly ordinary sequence, with a single status column:

      #v(3mm)
      + Founder submits → `pending`
      + Admin approves → `approved`
      + Investors fund → `funding`
      + Founder edits the description → `pending`
      + Admin approves again → `approved`

      #v(4mm)
      *Step 5 erased the fact that the venture was funding* — by an operation
      unrelated to funding, performed by someone not thinking about funding.
    ],
    [
      #callout(label: "The general form", accent: gold)[
        A field written by two actors for two reasons *is two fields*.
      ]
      #v(5mm)
      #set text(size: 14pt)
      Three columns, three writers, three questions:
      #v(2mm)
      #table(
        columns: (auto, 1fr),
        align: (left, left),
        table.header([Column], [Written by]),
        [`ModerationStatus`], [Administrator],
        [`LifecycleStatus`], [Owner or system],
        [`Stage`], [Funding pipeline],
      )
    ],
  )
]

#slide(eyebrow-text: "Decision 3", title: "Totals are derived, never stored")[
  #two(
    [
      #set text(size: 14.5pt)
      There is *no* `AmountRaised` column anywhere in the schema.

      #v(4mm)
      A stored total can drift silently, and — worse — it structurally invites
      incrementing at approval rather than at settlement.

      #v(4mm)
      Totals are computed from settled transactions, in one place, on read.
      *There is nothing to drift from.*
    ],
    [
      ```cs
      _db.PaymentTransactions
         .Where(t => t.Status == Settled)
         .SumAsync(t => t.Amount)
      ```
      #v(4mm)
      #callout(label: "The cost we accepted")[
        A read-time aggregation on the hottest page in the platform.

        #v(2mm)
        A stale cache is recoverable. A drifted counter is not.
      ]
    ],
  )
]

#slide(eyebrow-text: "Decision 4", title: "Constraints beat conventions")[
  #v(2mm)
  #set text(size: 15pt)
  Four business rules in this system are *database indexes*, not application
  checks:
  #v(4mm)
  #table(
    columns: (1fr, 1fr),
    align: (left, left),
    table.header([Rule], [Enforced by]),
    [Save a venture at most once], [`Bookmark (UserId, ProjectId)` unique],
    [Follow a user at most once], [`Follow (FollowerId, FollowedId)` unique],
    [Review a venture at most once], [`Review (ProjectId, InvestorId)` unique],
    [Process a provider event once], [`PaymentEvent.ProviderEventId` unique],
  )
  #v(6mm)
  #callout(label: "Why it matters", accent: gold)[
    An application check leaves a race: two concurrent requests can both pass it
    before either writes. *The constraint does not.*
  ]
]

#diagram-slide(
  "/assets/diagrams/out/seq-payment.svg",
  label: "Payments — rules live above the provider",
  note: [Signature verified over the raw body → duplicate event is a no-op →
    the total is *derived* at the end, not incremented along the way.],
)

// ═══════════════════════════════════════════════════════ EVIDENCE ═══
#section-slide(3, "Evidence", sub: "What was measured, and what was not")

#slide(eyebrow-text: "Testing", title: "41 tests, and an honest coverage story")[
  #two(
    [
      #v(2mm)
      #stats(
        stat("41", "tests passing", accent-value: true),
        stat("34", "milliseconds"),
      )
      #v(8mm)
      #set text(size: 14pt)
      The suite covers the *domain* layer — the components deliberately built
      with no I/O, which is why it runs in 34 ms.
    ],
    [
      #table(
        columns: (1fr, auto, auto),
        align: (left, right, right),
        table.header([Scope], [Line], [Branch]),
        [`PipelineStages`], [*100%*], [*100%*],
        [`FundingMath`], [25.8%], [*80%*],
        [Whole solution], [0.06%], [1.1%],
      )
      #v(5mm)
      #callout(label: "Read the third row")[
        0.06% is diluted by 22 controllers and hundreds of DTO properties.
        It is shown to demonstrate *why it is not used*.
      ]
    ],
  )
]

#slide(eyebrow-text: "Performance", title: "Measured — including the miss")[
  #v(2mm)
  #two(
    [
      #table(
        columns: (1fr, auto, auto),
        align: (left, right, right),
        table.header([Page], [TTFB], [FCP]),
        [Landing], [147 ms], [468 ms],
        [Venture listing], [92 ms], [320 ms],
      )
      #v(4mm)
      #set text(size: 13.5pt)
      Server rendering doing what it was chosen for: content in the first
      response.
    ],
    [
      #table(
        columns: (1fr, auto, auto),
        align: (left, right, right),
        table.header([Endpoint], [p50], [p95]),
        [`GET /api/projects`], [495 ms], [*519 ms*],
      )
      #v(4mm)
      #callout(label: "NFR-02 is not met", accent: bronze)[
        Target was 300 ms at p95. We measure *519 ms*.

        #v(2mm)
        p50 and p95 are 24 ms apart and the floor is 472 ms — a *fixed* cost,
        not a slow plan. It is the round trip to a remote database.
      ]
    ],
  )
]

#slide(eyebrow-text: "Credibility", title: "What we did not do")[
  #v(3mm)
  #set text(size: 14.5pt)
  - *No live money.* The Stripe path is written, signature-verified and
    idempotent — and has never run against a merchant account.
  - *No regulatory onboarding.* No identity or anti-money-laundering checks.
  - *Testing covers the domain layer only.* 54 of 58 requirements rest on
    inspection.
  - *No user study.* Specified, not run.
  - *No CI, no alerting, no metrics pipeline.*
  - *Load behaviour above five concurrent readers is unknown* — our harness was
    a browser and could not generate more.

  #v(6mm)
  #callout(label: "Why this slide exists", accent: gold)[
    The previous version of this project claimed four weeks of testing and a QA
    role while showing no test artefact. *A committee that finds one invented
    number discounts every other number.*
  ]
]

// ═══════════════════════════════════════════════════════ THE BOOK ═══
#slide(eyebrow-text: "Documentation", title: "The book behind this deck")[
  #v(4mm)
  #stats(
    stat("170", "pages", accent-value: true),
    stat("20", "chapters"),
    stat("13", "diagrams"),
    stat("10", "ADRs"),
    stat("36", "references"),
  )
  #v(10mm)
  #two(
    [
      #set text(size: 14pt)
      *Against the previous version:*
      #v(2mm)
      #table(
        columns: (1fr, auto, auto),
        align: (left, right, right),
        table.header([], [Old], [New]),
        [Pages], [93], [170],
        [Words], [12,038], [82,000],
        [Diagrams], [*0*], [13],
        [References], [*0*], [36],
      )
    ],
    callout(label: "The change of standard")[
      Half the old book narrated code line by line and its "References" section
      was five installer download links.

      #v(3mm)
      This one argues, and every figure it states was measured.
    ],
  )
]

#slide(eyebrow-text: "Next", title: "Future work, ordered by dependency")[
  #v(4mm)
  #set text(size: 15pt)
  + *Operate the Stripe path against a live merchant account.* Every other item
    is worth less until money can actually move.
  + *Identity and anti-money-laundering onboarding.* Legally prerequisite to
    item 1.
  + *CI, alerting and observability.* The operational floor.
  + *Backplane for presence, durable notification queue.* Unlocks horizontal
    scaling — and must precede a second instance.

  #v(7mm)
  #callout(label: "Deliberately last", accent: gold)[
    *Assisted discovery.* Ranking today is deterministic and explicable, which
    was a requirement. An opaque model reintroduces exactly the unexplainable
    advantage the project set out to remove.
  ]
]

#statement[
  Funding is the middle of a relationship,
  not the end of a transaction.
][
  Questions.
]

// ══════════════════════════════════════════════════ TEAM APPENDIX ═══
#section-slide(4, "For the team", sub: "Not presented — read before the defence")

#slide(eyebrow-text: "Team briefing", title: "Who reads what")[
  #v(2mm)
  #table(
    columns: (auto, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Area], [Chapters to own], [You must be able to explain]),
    [Backend · data],
      [6 Architecture, 7 Database, 9 API],
      [Why a monolith. Why three state columns. Why totals are derived.],
    [Payments · security],
      [10 Security, 11 Payments],
      [Why the webhook is verified over the raw body, in constant time, before
       any state change.],
    [Frontend],
      [5.3 Migration, 6.5 Frontend, 8 Design system],
      [Why we left Angular. Why the rewrite touched no business rule.],
    [Real-time],
      [12 Real-time],
      [Why presence is in memory and last-seen is on disk.],
    [Quality · docs],
      [15 Testing, 17 Performance, 19 Evaluation],
      [What is measured, what is not, and why we said so.],
  )
]

#slide(eyebrow-text: "Team briefing", title: "Questions to expect — and where the answer is")[
  #v(2mm)
  #set text(size: 14pt)
  #table(
    columns: (1fr, auto),
    align: (left + top, left + top),
    table.header([Question], [Answer lives in]),
    ["Does money actually move?"], [§11.9 — no, and we say so],
    ["Where are your tests?"], [§15.2 — 41 passing, domain layer only],
    ["Is it scalable?"], [§17.7 — no, and here is what binds first],
    ["Why not microservices?"], [ADR-06, §6.2],
    ["What happens if the webhook fires twice?"], [§11.5 — unique index, no-op],
    ["Can an admin read private messages?"], [§10.9 — no, deliberately],
    ["Why is the listing slow?"], [§17.3 — remote database round trip],
    ["What is the hardest thing you solved?"], [Ch18 — pick §18.1 or §18.2],
  )
]

#slide(eyebrow-text: "Team briefing", title: "Numbers to know — and claims to avoid")[
  #v(2mm)
  #two(
    [
      #callout(label: "Know these cold")[
        #set text(size: 13.5pt)
        - 22 controllers · 150 endpoints
        - 40+ entities · 20+ migrations
        - 65 frontend routes
        - 41 tests passing, 34 ms
        - `PipelineStages` 100% branch covered
        - Listing p95 = 519 ms (target 300)
        - 170 pages · 13 diagrams · 36 references
      ]
    ],
    [
      #callout(label: "Never say these", accent: bronze)[
        #set text(size: 13.5pt)
        - "It's fully tested" — it is not
        - "It's scalable" — single instance
        - "Payments work" — say *simulated by default*
        - "It's secure" — say *what* is defended and how
        - Any number you have not read in the book

        #v(3mm)
        If you do not know, say *"that is in section X, I would have to check"*.
        That answer costs nothing. A wrong number costs the whole document.
      ]
    ],
  )
]
