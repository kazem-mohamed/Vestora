#import "/lib/report.typ": *
#import "/lib/theme.typ": *

#report-cover(
  number: 2,
  title: "Foundation & Design System",
  subtitle: "The shape of the system, and the visual language every screen inherits",
  date: "September 2026",
)

#show: report.with(number: 2, name: "Foundation & Design System")

= Introduction

Report 1 established what the platform is for and what it was required to do.
This report is about the structures those requirements were built on, and it
covers two of them.

The first is *shape*: how the system is divided into parts, what each part is
responsible for, and — more usefully — what each part is forbidden from doing.
The second is *appearance*: the tokens, typefaces and rules from which every
screen in reports 3 to 12 is drawn.

They belong in one report because both are decisions made once and then obeyed
everywhere. Neither is revisited by a later part. A screen in Report 8 does not
choose a colour; a controller in Report 10 does not invent a way to return an
error.

= Objective

*Build a foundation the rest of the system can be built on without amending it.*

One deployable API that owns every rule. A web application that owns none. A
relational store that enforces integrity through constraints rather than only
through code. And an interface system consistent enough that a new screen looks
like it belongs without being told to.

The measure of success is negative rather than positive: after this part, no
later part should need to change anything here in order to do its work.

= System at a Glance

The platform is four pieces, and this shape does not change in any later report.

#figure(
  image("/assets/diagrams/out/c4-container.svg", width: 88%),
  caption: [The platform and the two services it depends on.],
)

#figure(
  table(
    columns: (34mm, 1fr),
    align: (left + top, left + top),
    table.header([Piece], [Responsibility]),
    [Web application], [Renders the interface. Holds no business rules. Calls
      the API for every read and write.],
    [REST API], [The only writer to the database. Owns every rule,
      authorisation decision and validation.],
    [Real-time hub], [Pushes live updates. Shares the API's authentication and
      data access. Covered in Report 7.],
    [Relational store], [Holds state and enforces integrity through
      constraints, not only through code.],
  ),
  caption: [The four containers and what each is responsible for.],
)

The property worth stating early: *the web application contains no business
rules.* It does not compute funding totals and it does not decide permissions.
It displays decisions the API has already made. Every later report depends on
that separation holding.

== Technology

#figure(
  table(
    columns: (36mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Technology], [Role in the platform], [Why]),
    [React with Next.js], [The entire user interface],
      [Public pages render on the server, so a venture page arrives complete
       rather than as a loading shell.],
    [TypeScript], [Frontend language],
      [Type errors surface at build time rather than in the browser.],
    [Tailwind CSS with shadcn/ui], [Styling and components],
      [Unstyled, accessible primitives styled with our own tokens — the visual
       language is ours rather than a library's.],
    [ASP.NET Core], [The API and every rule],
      [Compile-time typing for money-related invariants; authorisation,
       validation and configuration are first-party concerns.],
    [Entity Framework Core], [Database access],
      [Every schema change is a versioned migration, so the schema history is
       replayable.],
    [SQL Server], [Storage],
      [The data and its invariants are relational; constraints are enforced by
       the database itself.],
  ),
  caption: [The foundation stack. Technologies specific to one part of the
    system are introduced in the report that covers it.],
)

= Inside the API

Components are grouped by responsibility rather than by entity. The grouping
below is the actual shape of the codebase, counted from it.

#full-page-figure(
  "/assets/diagrams/out/component-api.svg",
  caption: [Component view of the API. Domain services hold the rules and
    perform no I/O; only `AppDbContext` reaches the database.],
)

#figure(
  table(
    columns: (36mm, 12mm, 1fr),
    align: (left + top, center + top, left + top),
    table.header([Group], [Count], [What it holds]),
    [Controllers], [22],
      [One per resource area — authentication, projects, investments, payments,
       messages, notifications, follows, bookmarks, reports, admin moderation,
       admin revenue, the three dashboards, insights.],
    [Domain services], [5],
      [`AuthService` owns identity; `PaymentService` owns the payment
       lifecycle; `FundingMath` owns what a venture has raised; `PipelineStages`
       owns valid stage transitions; `AccountRules` owns what an account may be.],
    [Infrastructure services], [8],
      [Upload validation, presence tracking, the notification fan-out queue and
       its worker, mail, the UTC serialisation converters, the payment expiry
       sweeper.],
    [Data], [1],
      [`AppDbContext` and the entity model.],
  ),
  caption: [The API by responsibility. Counted from the source, not estimated.],
)

The separation between the two service groups is the one that matters.
`FundingMath` is arithmetic over rows and `PipelineStages` is a transition
table; neither performs I/O, which is what makes them testable without a
database. The whole automated test suite exists against those two for exactly
that reason.

== The layering, and where it stops

A controller binds the request, checks authorisation, does the work, and shapes
the result. The last of those is handled uniformly rather than per-controller: a
shared extension translates a service result into an HTTP response, so the
mapping from "not found" to `404` exists once rather than twenty-two times.

#figure(
  ```cs
  // A service reports outcome in its return type; the controller maps it.
  var result = await _payments.OpenCheckoutAsync(investmentId, userId, ct);
  return result.ToActionResult(this);
  ```,
  caption: [The controller-to-service seam. Outcome mapping happens in one place
    for the whole API.],
)

Services return a result object rather than throwing for expected outcomes. An
investment that cannot be created because the venture is closed is not an
exceptional condition — it is an ordinary answer, and modelling it as an
exception both costs performance and obscures the control flow.

#note[
  *Where the seam is not applied, and why.* Of twenty-two controllers, exactly
  one — `AuthController` — reaches the database only through a service. The
  other twenty-one query `AppDbContext` directly.

  This is a deliberate boundary rather than an oversight. A service layer was
  introduced where the rules are dangerous to get wrong — identity and money —
  and not where a controller is a thin read against a table. Adding one
  everywhere would have produced twenty-one services whose bodies were a single
  query, which is indirection without a corresponding problem.

  The cost is stated rather than hidden: the discipline is not uniform, and a
  rule that later needs to apply to a listing endpoint has no obvious home. Any
  claim that this codebase forbids controllers from touching the data context
  would be false, and it is not made here.
]

= The Web Application

*Routing.* Fifty-five route files, grouped into segments that correspond to
*access level* rather than to feature: public pages, authentication pages, and
an authenticated application group holding the dashboards, investment surfaces,
messages, settings and the administrative area.

Grouping by access level rather than by feature means the authorisation boundary
is visible in the directory structure. An administrative page cannot be added in
the wrong place without it being obvious in review.

*Data fetching.* Public pages render on the server so their content is present
in the first response. Authenticated surfaces fetch on the client, because their
content is user-specific, not cacheable, and sits behind a navigation the user
has already paid the load cost for.

*State.* There is no global client state store, deliberately. Server state — the
list of ventures, a portfolio, a conversation — belongs to the server and is
fetched, not mirrored. What genuinely lives on the client is small: form state,
whether an overlay is open, and the live connection status. A global store would
create a second copy of the truth, and the synchronisation problem that follows
it.

= The Design System

A platform asking strangers to exchange money must look like it can be trusted
before anyone reads a word of it. Interface quality here is not decoration; it
is the first evidence a visitor has, and it does work no feature can do.

Four principles govern every decision in this part.

/ Restraint over decoration: Financial interfaces lose credibility through
  excess, not through plainness. One display face, one accent, a great deal of
  space.

/ One motif, used sparingly: A single structural idea — the chamfered plate —
  carries the identity. It appears where structure genuinely changes. A motif
  applied everywhere stops being a motif.

/ Evidence over assertion: The interface shows numbers, dates and documents
  rather than adjectives. Where two facts differ — committed and settled — it
  shows both rather than reconciling them into one comfortable figure.

/ Accessible by construction: Behaviour comes from primitives that are
  accessible before they are styled, so compliance is the starting state rather
  than a retrofit.

== Tokens

The system is defined as tokens, not as decisions made per component. Every
value below has exactly one definition.

#let _swatch(fill, name, hex) = block(
  width: 100%,
  {
    block(width: 100%, height: 15mm, fill: fill, stroke: 0.5pt + border)
    v(1.4mm)
    eyebrow(name, size: 6pt)
    v(0.4mm)
    text(font: mono-font, size: 6.8pt, fill: muted)[#hex]
  },
)

#figure(
  grid(
    columns: (1fr,) * 4,
    column-gutter: 4mm,
    row-gutter: 5mm,
    _swatch(ink, "ink", "#241C14"),
    _swatch(muted, "text-secondary", "#71614C"),
    _swatch(bronze, "bronze", "#8B4F2A"),
    _swatch(gold, "gold", "#B08A3F"),
    _swatch(paper, "bg", "#F6F2E7"),
    _swatch(surface, "surface", "#FCFAF3"),
    _swatch(border, "border", "#E3D9C4"),
    block(width: 100%, {
      block(
        width: 100%, height: 15mm, fill: paper,
        stroke: 0.5pt + border, inset: 3mm,
        {
          set text(size: 6.5pt, fill: ink)
          [Ink on ground]
          linebreak()
          text(fill: muted)[Secondary on ground]
          linebreak()
          text(fill: bronze, weight: 700)[Bronze accent]
        },
      )
      v(1.4mm)
      eyebrow("contrast check", size: 6pt)
      v(0.4mm)
      text(font: mono-font, size: 6.8pt, fill: muted)[≥ 4.5:1]
    }),
  ),
  caption: [The palette, printed from the token definitions themselves rather
    than pictured. A dark set exists with the same role assignments.],
)

#figure(
  table(
    columns: (34mm, 30mm, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Token], [Family], [Role]),
    [`--font-heading-en`], [Cinzel], [Display only: page titles and the
      wordmark. Never in running text — it is an inscriptional capital face and
      unreadable at paragraph size.],
    [`--font-body-en`], [Karla], [Interface text, labels, controls.],
    [`--font-numerals`], [Spectral], [Figures and long-form reading.],
    [`--font-heading-ar`], [Aref Ruqaa], [Arabic display.],
    [`--font-body-ar`], [Cairo], [Arabic interface text.],
  ),
  caption: [Typographic tokens. Five families across two scripts, each with one
    role and no second use.],
)

#figure(
  block(width: 100%, {
    let row(label, body) = {
      grid(
        columns: (26mm, 1fr),
        column-gutter: 5mm,
        align: (left + horizon, left + horizon),
        eyebrow(label, size: 6.2pt),
        body,
      )
      v(2.5mm)
      line(length: 100%, stroke: 0.4pt + border)
      v(2.5mm)
    }
    row("display / cinzel", text(font: display-font, size: 21pt, weight: 600, tracking: 0.04em)[Ventures seeking capital])
    row("heading / karla", text(font: heading-font, size: 13pt, weight: 700)[Funding totals are derived])
    row("body / spectral", text(font: body-font, size: 10.5pt)[An approved commitment is not a funded one — the platform shows both figures.])
    row("label / karla", eyebrow("moderation status", size: 7.5pt))
    row("mono / code", text(font: mono-font, size: 8.5pt, fill: bronze)[FundingMath.RaisedAsync()])
  }),
  caption: [The type scale, set in the faces the product itself loads.],
)

#note[
  Both figures above are *rendered from the tokens*, not pictures of them. The
  swatches are filled with the same values the product uses and the specimen is
  set in the same Cinzel, Karla and Spectral the product loads. A design system
  that cannot be applied outside its original medium has not been abstracted
  properly — so this report is a test of its own claim.
]

*Spacing and radii.* Spacing follows a four-pixel base scale. Radii are small
and uniform; the chamfer, not rounding, is what carries character.

== Components

Components come from shadcn/ui: source files copied into the repository rather
than taken as a dependency. Each composes Radix primitives that supply behaviour
and are styled entirely with the tokens above.

The consequence worth noting is ownership. A component that misbehaves is
modified directly rather than overridden from outside, which means the code
governing the interface is code the project can read. The cost is maintenance:
an upstream fix does not arrive automatically.

*Composition over configuration.* A card that takes fifteen props to cover every
use eventually covers none of them well; a card that composes from a header, a
body and a footer covers all of them.

= Two Axes Every Screen Supports

A design system is only a system if the same tokens hold across every axis the
product varies on. This one varies on two, and both are shown on the *same*
surface so the comparison is of the system rather than of two screens.

#shot(
  "/assets/screenshots/landing-en-light.png",
  [The landing page. Cinzel at display size, the gold accent used once, and an
   image-led composition — the four principles in a single frame.],
)

#shots(
  "/assets/screenshots/projects-en-light.png",
  "/assets/screenshots/projects-en-dark.png",
  [The venture listing under the light and dark token sets. Every colour
   resolves through the same semantic role in both; nothing is re-chosen per
   theme.],
)

#shots(
  "/assets/screenshots/projects-en-light.png",
  "/assets/screenshots/projects-ar-light.png",
  [English and Arabic. The writing direction flips and the entire layout mirrors
   — navigation, filters, progress bars and the grid. The display face changes to
   the Arabic pair. The information does not change.],
)

Three things change with language and one does not. The direction flips, so
layout mirrors. The display typeface changes, because the Latin display face has
no Arabic coverage. Numerals and Latin proper nouns remain left-to-right inside
right-to-left text, which the layout tolerates rather than fights. What does not
change is the information: both captures show the same ventures, the same
filters, the same figures.

#delivered[
  Layout is expressed in logical properties — start and end rather than left and
  right — so mirroring is a property of the direction rather than a second set of
  rules maintained by hand. This is why the Arabic capture required no separate
  stylesheet and no separate screen.
]

= The Data Foundation

The platform stores four kinds of thing. Later reports add tables around them,
but these four are the spine.

#figure(
  table(
    columns: (34mm, 1fr),
    align: (left + top, left + top),
    table.header([Entity], [What it represents]),
    [`User`], [An account. May act as founder, investor, or both.],
    [`Project`], [A venture seeking funding. Owned by exactly one founder.],
    [`Investment`], [A commitment by an investor. An *intention*, not a
      payment.],
    [`PaymentTransaction`], [Evidence that money moved. A *fact*.],
  ),
  caption: [The four core entities. Reports 4, 9 and 10 develop the last three.],
)

#full-page-figure(
  "/assets/diagrams/out/erd-core.svg",
  caption: [The core relational model. The distinction that governs Report 10 is
    already visible here: an `Investment` and a `PaymentTransaction` are separate
    rows because they are separate facts.],
)

`Investor` and `Innovator` are specialisations of `User`, persisted in one table
with a discriminator column. They share almost every column and differ mainly in
what they are related to, so a separate table per specialisation would add a
join to every authentication call for no benefit.

#full-page-figure(
  "/assets/diagrams/out/class-domain.svg",
  caption: [The domain model as classes. The specialisation above appears here as
    inheritance and in the database as one table with a discriminator — the same
    decision seen from two sides.],
)

= Patterns Applied

#figure(
  table(
    columns: (34mm, 1fr),
    align: (left + top, left + top),
    table.header([Pattern], [Where, and what it buys]),
    [Strategy],
      [`IPaymentProvider`. The payment algorithm varies by configuration
       without the caller knowing which is in use.],
    [Data transfer object],
      [Every API boundary. Entities are never serialised directly, so a schema
       change cannot silently alter the public contract.],
    [Result object],
      [The service seam. Expected failure is a value, not an exception.],
    [Producer–consumer],
      [`NotificationFanOutQueue` with a background worker. Notification delivery
       leaves the request path, so a slow fan-out cannot slow a write.],
    [Projection],
      [List queries project to DTOs rather than materialising entities, so a
       listing returns the columns the card needs and not the full row.],
  ),
  caption: [Patterns used, and the specific problem each solves.],
)

The table deliberately omits patterns the system does *not* use. There is no
mediator, no event bus and no generic repository abstraction over EF Core. Each
was considered and rejected as indirection without a corresponding problem —
`DbSet` is already a repository, and wrapping it produces a second, worse one.

= Decisions on Record

Ten decisions are recorded, each stated where its consequences are discussed
rather than collected into a chapter of its own.

#figure(
  table(
    columns: (12mm, 1fr, 20mm),
    align: (center + top, left + top, center + top),
    table.header([ADR], [Decision], [Report]),
    [01], [Build the frontend on React with Next.js and unstyled primitives], [1],
    [02], [Payment rules live in the domain, not in the provider integration], [8],
    [03], [Send transactional mail over SMTP behind an interface], [3],
    [04], [Funding totals are derived, never stored], [7],
    [05], [Model moderation, lifecycle and commercial stage as independent columns], [4],
    [06], [Build a layered monolith rather than a service-oriented system], [2],
    [07], [Force UTC at the serialisation boundary rather than by convention], [2],
    [08], [Hold presence in memory, persist last-seen], [9],
    [09], [Move notification fan-out off the request path], [9],
    [10], [Fail to start on a missing secret rather than falling back], [12],
  ),
  caption: [Index of architecture decisions, and the report that carries each
    one's consequences.],
)

Each record states its context, the decision, and its cost. A record whose
consequences are entirely positive has not been written honestly.

= Challenges

#challenge("A layered architecture that is only layered in two places")[
  The intended discipline was that controllers delegate and never query. In
  practice only `AuthController` does; twenty-one of twenty-two reach
  `AppDbContext` directly.

  *Resolution, and its cost.* The boundary was drawn at danger rather than at
  uniformity: services exist for identity and money, where a mistake is
  expensive, and not for thin reads, where a service would wrap a single query.
  The cost is that the codebase does not have one rule about where data access
  belongs — it has two, and which applies depends on the area. That is recorded
  here rather than asserted away.
]

#challenge("Dates that are correct on the server and wrong in the browser")[
  A `DateTime` that leaves the API without an explicit offset is interpreted in
  the reader's local zone, which silently shifts every timestamp the interface
  displays.

  *Solution.* UTC is forced at the serialisation boundary rather than left to
  convention: dedicated converters are registered on the serializer, so a new
  DTO cannot opt out by omission. Any serializer added later must register them
  too — which is a rule, and rules that are not enforced by the compiler are
  written down. This one is.
]

#challenge("A design system is easy to declare and hard to prove")[
  Any project can list colour tokens. The claim that matters is that no screen
  chooses its own — and that claim is invisible in a list.

  *Solution.* The system is exercised on both axes it varies on, on the same
  surface, in this report. The palette and the type specimen above are rendered
  from the token definitions rather than screenshotted, so a token that had
  drifted would show as a difference between the specimen and the captures.
]

= How This Fits With the Rest of the System

Only the direct relationships are listed. Every later part inherits from this
one; none of them amends it.

#figure(
  table(
    columns: (34mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Report], [Relationship], [Boundary]),
    [1 · Idea & Requirements],
      [*This part implements it.* Every structure here answers a requirement
       recorded there.],
      [Nothing is built here that was not asked for there.],
    [3 · Identity & Sessions],
      [*Depends on this part.* Identity is the first domain service, and every
       authentication screen is drawn from the tokens above.],
      [It adds three tables; it changes none of the four here.],
    [9 · Commitment & Pipeline],
      [*Depends on this part.* `FundingMath` is a domain service in the group
       described above, and the `Investment` / `PaymentTransaction` split is
       already in the model here.],
      [Funding figures are never computed anywhere but that one service.],
    [12 · Administration & Evaluation],
      [*Reports on this part.* Deployment, configuration and measured
       performance all describe the containers defined here.],
      [It measures the architecture rather than altering it.],
  ),
  caption: [Direct relationships only. Reports 4 to 8, 10 and 11 inherit the
    design system and the container split without a dependency worth naming
    separately.],
)

= Summary

#delivered[
  *Shape.* A four-container architecture in which the API owns every rule and
  the web application owns none. Twenty-two controllers, five domain services,
  eight infrastructure services and one data context, grouped by responsibility
  and counted from the source. A uniform controller-to-service seam so outcome
  mapping exists once. Fifty-five client routes grouped by access level, server
  rendering for public pages, and no global client state store.

  *Appearance.* Seven colour tokens and five typographic tokens with one
  definition each, applied across every screen in two languages and two themes,
  with layout expressed in logical properties so mirroring is a property rather
  than a second stylesheet.

  *Data.* A relational core of four entities with the commitment-versus-payment
  distinction present in the schema from the start, and integrity enforced by
  constraints rather than only by code.
]

*Still open in this part.* The layering discipline is applied to identity and
payments and not elsewhere, as recorded above. There is exactly one production
instance of each container — no load balancer, no autoscaling, no read replica —
and Report 12 states which would be needed first and at what point.

*What this enables.* Report 3 can now assume a place to put identity: a domain
service that owns it, tables the data context reaches, and a set of screens that
need only be composed, not designed.
