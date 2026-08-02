#import "/lib/vestora.typ": *
#import "/lib/theme.typ": *

= Database Design <ch:database>

== Conceptual Data Model

Four nouns carry the platform. Everything else hangs off one of them.

/ User: An account. A user may own ventures, commit capital, or both. The
  administrative role is separate and granted rather than self-selected.

/ Project: A venture. It is the unit that is submitted, moderated, published,
  discovered and funded, and it owns the material that describes it — images,
  documents, team members, milestones and updates.

/ Investment: A commitment by a user to a venture. It is deliberately *not* a
  payment: it is an intention that has been recorded and may or may not have
  been approved, and may or may not have settled.

/ Payment transaction: Evidence that money moved. It settles a funding request,
  which in turn belongs to an investment.

The separation between the last two is the most consequential modelling
decision in the system, and §7.6 explains why it is enforced structurally
rather than by convention.

*Inheritance.* `Investor` and `Innovator` are specialisations of `User`,
persisted as table-per-hierarchy with a `UserType` discriminator column. The
alternative — separate tables joined to a shared identity — was rejected
because the two specialisations share almost every column and differ mainly in
navigation properties. Table-per-hierarchy keeps authentication, which does not
care which specialisation an account is, to a single-table read.

== Entity Relationship Diagram

The diagram below shows the core of the model: identity, the venture and its
funding chain. Peripheral tables — notifications, moderation audit records,
saved searches, analytics counters — are omitted here for legibility and are
listed in full in @app:schema.

#full-page-figure(
  "/assets/diagrams/out/erd-funding.svg",
  landscape: false,
  caption: [The funding chain, derived from the Entity Framework configuration
    in `AppDbContext`. Identity and the venture sit at the top; each step down
    holds a fact the step above cannot.],
)

The entities that *hang off* a venture or a user — images, documents, team
members, milestones, updates, reviews, reports, bookmarks, follows, messages and
their attachments — are deliberately not drawn here. Rendered as a diagram they
form a flat fan of eighteen edges that conveys only "these belong to that",
which the delete-behaviour table in §7.6 states more precisely and the full
schema in @app:schema states completely. A diagram that a table replaces has not
earned its page.

Two shapes in that diagram are worth reading carefully.

First, the chain `Investment → FundingRequest → PaymentTransaction →
PaymentEvent` is four hops rather than one column on the investment. Each hop
exists because it holds information the previous one cannot: a funding request
has its own expiry, a transaction has a provider and a fee, and an event has a
provider event identifier that makes replay detectable.

Second, `Project` carries *three* state columns — `ModerationStatus`,
`LifecycleStatus` and `Stage` — not one. §7.6 explains why collapsing them
would be a defect rather than a simplification.

#full-page-figure(
  "/assets/diagrams/out/class-domain.svg",
  landscape: false,
  caption: [Domain class model. `Investor` and `Innovator` specialise `User`
    through a discriminator (§7.1); the services at the foot hold rules the
    entities themselves do not.],
)

== Logical Schema and Data Dictionary

The full dictionary is in @app:schema. This section documents the four tables
whose columns encode rules rather than facts.

=== Project

#figure(
  table(
    columns: (34mm, 24mm, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Column], [Type], [Meaning and rule]),
    [`Id`], [`int`, PK], [Surrogate key.],
    [`OwnerId`], [`int`, FK], [The founder. Cascade delete: a venture cannot
      outlive its owner.],
    [`Title`], [`nvarchar`], [Displayed name.],
    [`FundingGoal`], [`decimal`], [Target amount. Stored with explicit
      precision; see the note on money types below.],
    [`ModerationStatus`], [`nvarchar`],
      [Administrative state — pending, approved, rejected. Written only by an
       administrator.],
    [`LifecycleStatus`], [`nvarchar`],
      [Operational state — active, paused, closed. Written by the owner or by
       the system.],
    [`Stage`], [`nvarchar`],
      [Commercial state — where the venture stands in its funding progression.
       Written by the funding pipeline.],
    [`CreatedDate`], [`datetime2`], [Stored in UTC. See §6.7.],
  ),
  caption: [The `Project` table. Three independent state columns, three
    independent writers.],
)

=== Investment and the funding chain

`Investment` records intent and its approval; `FundingRequest` records an
attempt to settle that intent within a time box; `PaymentTransaction` records
what a provider actually did; `PaymentEvent` records each provider callback
individually so that duplicates can be recognised.

`PaymentTransaction.Provider` stores the string `"stripe"` or `"simulated"` on
every row. This is not diagnostic decoration: it means a transaction always
carries the identity of the system that produced it, so a data set can never
become ambiguous about which rows represent real settlement.

#note[
  *Money is `decimal`, never `float`.* Binary floating point cannot represent
  most decimal fractions exactly, and an accumulated rounding error in a
  funding total is precisely the class of defect this chapter exists to
  prevent. Every monetary column is `decimal` with explicit precision and
  scale, configured in `AppDbContext` rather than left to convention.
]

== Normalisation Analysis

The schema is in third normal form throughout, with two deliberate,
locally-justified departures.

*Third normal form.* Every non-key column depends on the key, the whole key and
nothing but the key. Repeating groups are separate tables — a venture's images,
documents, team members, milestones and updates are each their own table with a
foreign key back to the venture, rather than serialised columns.

*Departure 1: denormalised analytics counters.* `ProjectView` records
individual view events, and aggregate view counts are computed from it. Where a
count is needed on a listing page for many ventures at once, computing it per
row is a query cost paid on the hottest read path in the system. §17.4
documents the projection used and the measurement that justified it.

*Departure 2: the discriminator column.* Table-per-hierarchy is by definition
not fully normalised — columns belonging to one specialisation are null for the
other. The alternative was a join on every authentication call. The trade is
documented in §7.1 and accepted.

*What is not denormalised: funding totals.* There is no `AmountRaised` column
anywhere in the schema. This is the single most obvious denormalisation
available, and it is deliberately not taken. §7.6 explains why.

== Indexing Strategy

Indexes are added for measured access patterns, not speculatively. Each index
below exists because a specific query needed it.

#figure(
  table(
    columns: (30mm, 1fr, 26mm),
    align: (left + top, left + top, left + top),
    table.header([Table], [Index], [Purpose]),
    [`User`], [`Email`, unique],
      [Login by email; the uniqueness constraint is the account-identity rule,
       not an optimisation.],
    [`RefreshToken`], [`TokenHash`, unique],
      [Refresh lookup on every token rotation. Unique because two live tokens
       may never share a hash.],
    [`SecurityLog`], [`(UserId, CreatedAtUtc)`],
      [Per-user audit queries, which are always time-ordered.],
    [`Project`], [`(ModerationStatus, LifecycleStatus, CreatedDate)`],
      [The public listing query filters on both state columns and orders by
       creation date. This composite covers it in one seek.],
    [`Project`], [`Stage`], [Stage-filtered discovery.],
    [`Bookmark`], [`(UserId, ProjectId)`, unique],
      [Enforces one bookmark per user per venture and serves the
       "is this saved" check.],
    [`Follow`], [`(FollowerId, FollowedId)`, unique],
      [Enforces one follow edge per pair.],
    [`Follow`], [`FollowedId`], [Follower-count and follower-list queries.],
    [`Review`], [`(ProjectId, InvestorId)`, unique],
      [One review per investor per venture — a business rule expressed as an
       index.],
    [`Report`], [`(ProjectId, Status)`],
      [The moderation queue filters exactly on this pair.],
    [`ProjectView`], [`(ProjectId, CreatedAt)`],
      [View aggregation over a time window.],
  ),
  caption: [Indexes and the query that motivated each.],
)

Four of these are *unique* indexes doing double duty. `Bookmark`, `Follow` and
`Review` each express a business rule — save once, follow once, review once —
as a constraint the database enforces. An application-level check would leave a
race between two concurrent requests; the unique index does not.

== Constraints and Integrity Rules

This is the section the rest of the chapter exists to support.

=== Why funding totals are derived

The obvious design stores a running total on the venture and increments it when
a payment settles. It is faster to read and it is wrong, for two reasons.

First, it can drift. Any code path that writes a payment without updating the
total, or updates the total twice for one payment, leaves a number that no
longer corresponds to reality — and because it is stored, nothing detects this.
Second, and more seriously, it invites the conflation of *approved* with
*funded*. Once a single column holds "the amount", the temptation to increment
it at approval time is structural.

The chosen design has no such column. Totals are computed from settled payment
transactions at read time, in one place, by `FundingMath`. There is exactly one
definition of what a venture has raised, and it is arithmetic over rows that
represent money that actually moved.

#adr(
  "04",
  "Funding totals are derived, never stored",
  background: [A stored running total can drift silently and structurally
    invites incrementing on approval rather than on settlement — conflating an
    intention with a payment.],
  decision: [Store no aggregate funding column. Compute totals from settled
    payment transactions at read time through a single service, `FundingMath`.],
  consequences: [One source of truth, and no drift is possible because there is
    nothing to drift from. Approved and funded are structurally distinct. The
    cost is a read-time aggregation on venture pages, which §17.4 measures and
    §17.5 addresses.],
)

=== Why status and stage are separate

A venture has three orthogonal kinds of state, written by three different
actors:

#figure(
  table(
    columns: (32mm, 1fr, 30mm),
    align: (left + top, left + top, left + top),
    table.header([Column], [Answers], [Written by]),
    [`ModerationStatus`], [Has an administrator allowed this to be public?],
      [Administrator],
    [`LifecycleStatus`], [Is the owner currently running this venture?],
      [Owner or system],
    [`Stage`], [How far has the venture progressed commercially?],
      [Funding pipeline],
  ),
  caption: [Three state columns, three writers, three questions.],
)

Collapsing these into one column produces defects that are hard to see and easy
to ship. An administrator approving a venture would write the same field the
funding pipeline writes, so an approval arriving after a funding event would
reset commercial progress. A venture paused by its owner would be
indistinguishable from one rejected by an administrator, and restoring it would
require guessing which it had been.

Keeping them separate means each transition is validated against its own rules
and the three writers never contend for the same column. The composite index in
§7.5 exists because the public listing query then has to filter on two of them
at once — which is the cost of the decision, and a cheap one.

#adr(
  "05",
  "Model moderation, lifecycle and commercial stage as independent columns",
  background: [A single state column is written by the administrator, the owner
    and the funding pipeline, so any two of them can overwrite each other's
    decision.],
  decision: [Model `ModerationStatus`, `LifecycleStatus` and `Stage` as separate
    columns with independent transition rules and a single writer each.],
  consequences: [An approval can never reset funding progress and a funding
    event can never un-reject a venture. Listing queries must filter on two
    columns, which the composite index covers. The state space is larger and
    must be documented — which §14.2 does.],
)

=== Referential rules

Delete behaviour is chosen per relationship rather than set globally, and the
choice encodes whether the child is *owned* by the parent or merely *refers* to
it.

#figure(
  table(
    columns: (28mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Behaviour], [Applied to], [Reasoning]),
    [`Cascade`],
      [Project images, documents, team members, milestones, updates, views,
       reviews, reports, bookmarks; refresh tokens],
      [These have no meaning without their parent. A venture's images are part
       of the venture.],
    [`Restrict`],
      [Investments, messages, comments, user–project interactions,
       notification references],
      [These are records of something that happened. Deleting a user must not
       silently erase the history of a commitment or a conversation.],
    [`SetNull`],
      [Security log user reference],
      [The audit record must survive the account it describes.],
  ),
  caption: [Delete behaviour by relationship class.],
)

The `Restrict` rows are the interesting ones. They mean an account with
investment history cannot simply be deleted — which is the correct outcome for
a system that records financial commitments, and which is why account
*suspension* (§10.10) exists as a distinct operation from deletion.

== Migration Strategy

The schema was not designed once and implemented. It evolved across more than
twenty Entity Framework migrations, each named for the change it carries:
`Phase4ProductionAuthSecurity`, `AddInvestmentApprovalStatus`,
`Phase2_InvestmentPipeline`, `Phase6_VentureLifecycle` and so on.

Three rules governed migrations.

+ *Every schema change is a migration.* No schema was ever altered directly
  against a database. The migration history is therefore a complete and
  replayable record.

+ *Migrations are additive where possible.* Adding a nullable column and
  backfilling is preferred over altering a column in place, because the former
  is reversible and the latter frequently is not.

+ *A migration is applied to the shared database only after it applies cleanly
  locally.* The project runs against a hosted database (§16.3), which means a
  bad migration affects the whole team rather than one machine.

The names above are worth noting for what they reveal: `AddInvestmentApprovalStatus`
and `Phase2_InvestmentPipeline` are the migrations in which the separation
between an approved and a funded investment was introduced. That separation was
not in the first design. It was added when its absence caused a defect, and
@ch:challenges describes what that defect looked like.

== Backup and Recovery

The database is hosted rather than self-administered (§16.3), so backup is a
provider responsibility, and the project's obligation is to know what that
covers and what it does not.

/ Covered by the provider: Scheduled full backups with point-in-time restore
  within the provider's retention window.

/ Covered by the project: The schema itself, which is fully reproducible from
  the migration history in version control. A database can be recreated from
  an empty instance by applying migrations in order.

/ Not covered: Uploaded files — venture images, documents and message
  attachments — which live outside the database. This is a real gap and it is
  recorded as a limitation in §19.4 rather than left implicit.
