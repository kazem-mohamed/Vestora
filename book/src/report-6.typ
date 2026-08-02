#import "/lib/report.typ": *
#import "/lib/theme.typ": *

#report-cover(
  number: 6,
  title: "Insight & Administration",
  subtitle: "What every role can see, and how the platform is overseen",
  date: "September 2026",
)

#show: report.with(number: 6, name: "Insight & Administration")

= Introduction

The first five reports built a platform. This one is about being able to *see*
it.

Every role reaches a point where the question is no longer "what can I do" but
"where do I stand". A founder wants to know whether their venture is
progressing. An investor wants to know what they hold. An administrator wants to
know whether the platform is healthy — and whether anyone, including another
administrator, has done something that needs looking at.

This report covers the three dashboards, the analytics behind them, the
administrative surfaces, and the two records that make administrative power
observable. It closes the series with the platform's delivered state and its
measured performance.

= Objective

*Answer each role's own question.* Not one dashboard with everything on it, but
a surface per role showing what that role actually needs to decide something.

*Derive, never count.* Every figure reported here is computed from recorded
events. No counter is maintained anywhere, for the same reason no funding total
is stored in Report 4.

*Make administrative power observable.* An administrator can approve, reject and
suspend. Every one of those actions is recorded against the administrator who
took it, and is readable by other administrators.

*Report the platform's state honestly.* Including what is not built.

= Features Delivered

#figure(
  table(
    columns: (42mm, 1fr),
    align: (left + top, left + top),
    table.header([Feature], [What it does]),
    [Founder dashboard], [Venture portfolio, funding split, incoming requests,
      engagement.],
    [Investor dashboard], [Pipeline, settlements, portfolio, watchlist,
      activity.],
    [Venture analytics], [Views over time, engagement, funding progression per
      venture.],
    [Platform overview], [Users, ventures, commitments and health at a
      glance.],
    [User administration], [Account listing, inspection, suspension and
      reinstatement.],
    [Venture registry], [Every venture in every state, for investigation.],
    [Report queue], [User reports filtered by status.],
    [Revenue], [Platform fee income, derived from settled transactions.],
    [Activity stream], [Platform-wide events.],
    [Security log], [Authentication and security events, per user and in
      time.],
    [Audit log], [Every administrative action, attributed to its
      administrator.],
  ),
  caption: [Features delivered in this part of the system.],
)

= Three Dashboards, Three Questions

The dashboards share machinery and differ in what they answer.

#figure(
  table(
    columns: (30mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Dashboard], [The question it answers], [What it leads with]),
    [Founder], [Is my venture progressing?],
      [Committed against settled — two figures, permanently separate.],
    [Investor], [What have I committed, and what has it done?],
      [Funded and approved commitments as separate tiles.],
    [Administrator], [Is the platform healthy, and does anything need a
      decision?],
      [Counts, distribution, and the queues that need action.],
  ),
  caption: [One surface per role, each leading with what that role decides
    on.],
)

#shot(
  "/assets/screenshots/founder-overview.png",
  [The founder's overview. Ventures, their states, and the funding position
   across all of them.],
)

#shot(
  "/assets/screenshots/founder-analytics.png",
  [Venture analytics. Views and engagement over time, derived from recorded
   events rather than from counters.],
)

#shot(
  "/assets/screenshots/invest-overview.png",
  [The investor's overview, shown here for a new account. The tiles read
   `$0 — 0 settled payment(s)` and `$0 — 0 commitments` rather than collapsing
   into a single zero, so the distinction from Report 4 is legible before there
   is any data to disambiguate it.],
)

#shot(
  "/assets/screenshots/admin-overview.png",
  [The platform overview. Totals, user distribution, and platform health —
   including *fully committed rate* and *approved commitments* as separate
   figures, the same distinction applied at platform scale.],
)

= Administration

#shots(
  "/assets/screenshots/admin-users.png",
  "/assets/screenshots/admin-revenue.png",
  [Account administration and fee revenue. Revenue is derived from the same
   settled transactions that produce funding totals, so the two can never
   disagree.],
)

== Accounts can be suspended, not deleted

An account with financial history cannot be deleted. The referential rules
introduced in Report 4 prevent it, and correctly so: deleting such an account
would erase the record of commitments that other parties made.

Suspension therefore exists as a first-class state rather than as a softer form
of deletion. It is the correct operation for a system that records financial
commitments.

== Administrative power is observable

Two durable records exist, and neither is a log line.

#figure(
  table(
    columns: (34mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Record], [What it holds], [Why a table]),
    [`AdminAuditLog`], [Every administrative action — approval, rejection,
      suspension — attributed to the administrator who took it.],
      [Evidence must be queryable, retained, and presentable. A log stream is
       none of those.],
    [`SecurityLog`], [Authentication and security events, indexed on user and
      time.],
      [Audit questions are always per-user and time-ordered; the index matches
       the question.],
  ),
  caption: [Two records that make oversight possible.],
)

#shots(
  "/assets/screenshots/admin-audit.png",
  "/assets/screenshots/admin-security.png",
  [The audit log and the security log. Every administrative decision is
   attributed and readable by other administrators — including one's own.],
)

#delivered[
  A moderation system with no audit trail asks users to trust *individuals*. One
  with an audit trail asks them to trust a *process*. That is a much smaller
  request, and it is the correct one for a platform that mediates money.
]

#shots(
  "/assets/screenshots/admin-activity.png",
  "/assets/screenshots/founder-activity.png",
  [Activity at two scales. Platform-wide on the left, one founder's own on the
   right — the same event rows, filtered to what each viewer is entitled to
   see.],
)

= Analytics, and Why Nothing Is Counted

Every figure in this report is *derived* from event rows.

#full-page-figure(
  "/assets/diagrams/out/flow-derivation.svg",
  caption: [What is written, and what is computed. Only the left column is
    stored; everything on the right is calculated at read time. No box on the
    left is a counter.],
)

#figure(
  table(
    columns: (34mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Figure], [Derived from], [Not from]),
    [Venture views], [`ProjectViews` event rows], [A `ViewCount` column],
    [Engagement], [`UserProjectInteractions`], [A stored score],
    [Funding raised], [Settled `PaymentTransactions`], [An `AmountRaised`
      column],
    [Fee revenue], [The `FeeAmount` on settled transactions], [A running
      revenue total],
    [Moderation load], [Ventures by moderation status], [A pending counter],
  ),
  caption: [Every reported figure and the events it is computed from.],
)

This is the same argument as Report 4, applied one level up. A counter can drift
and cannot be recomputed. An aggregation over rows is always correct and can be
recomputed from history at any time. The cost is that reads are more expensive —
which is measured rather than assumed, in §9.

= Data

#figure(
  table(
    columns: (38mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Table], [Holds], [Rule]),
    [`AdminAuditLog`], [Administrative actions with the acting administrator.],
      [Retained independently of the row it concerns.],
    [`SecurityLog`], [Authentication and security events.],
      [Indexed `(UserId, CreatedAtUtc)`; the user reference is set null on
       delete so the record survives the account.],
    [`ProjectViews`], [Individual view events.],
      [Indexed `(ProjectId, CreatedAt)` for time-windowed aggregation.],
    [`UserProjectInteractions`], [Interaction signals.], [Restrict.],
  ),
  caption: [Tables owned by this part. All four are event records rather than
    state.],
)

= Backend

#figure(
  ```cs
  // A dashboard is the query-heaviest surface in the platform: several
  // aggregates at once. Materialising entities to compute counts would make
  // the most-visited authenticated page the slowest.
  var summary = await _db.Projects
      .Where(p => p.OwnerId == founderId)
      .Select(p => new FounderVentureRow
      {
          Id        = p.Id,
          Name      = p.Name,
          Status    = p.ModerationStatus,
          Goal      = p.FundingGoal,
          Funded    = FundingMath.FundedOf.Compile()(p),      // settled only
          Committed = FundingMath.CommittedOf.Compile()(p),   // approved only
          Views     = p.ProjectViews.Count(v => v.CreatedAt >= since),
      })
      .ToListAsync(ct);
  ```,
  caption: [The founder dashboard projection. Funded and committed are computed
    separately in the same query — they are never merged into one figure.],
)

#figure(
  ```cs
  // Revenue is the fee on settled transactions, and nothing else. It aggregates
  // the same rows as funding, so the two figures cannot disagree.
  var revenue = await _db.PaymentTransactions
      .Where(t => t.Status == PaymentStatus.Settled)
      .Where(t => t.SettledAtUtc >= from && t.SettledAtUtc < to)
      .SumAsync(t => (decimal?)t.FeeAmount, ct) ?? 0m;
  ```,
  caption: [Fee revenue.],
)

#figure(
  ```cs
  // Every administrative action is recorded against the administrator who took
  // it, in the same transaction as the action itself — so an action cannot
  // exist without its record.
  public async Task RecordAsync(int adminId, AdminAction action,
                                int targetId, CancellationToken ct)
  {
      _db.AdminAuditLogs.Add(new AdminAuditLog
      {
          AdminId    = adminId,
          Action     = action,
          TargetId   = targetId,
          CreatedAtUtc = DateTime.UtcNow,
      });
  }
  ```,
  caption: [Audit recording. Called inside the same unit of work as the action
    it describes.],
)

= Key Endpoints

#figure(
  table(
    columns: (16mm, 44mm, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Method], [Path], [Purpose]),
    [`GET`], [`api/dashboard/founder`], [Founder aggregate.],
    [`GET`], [`api/dashboard/investor`], [Investor aggregate.],
    [`GET`], [`api/insights/{projectId}`], [Venture analytics.],
    [`GET`], [`api/admin/overview`], [Platform totals and health.],
    [`GET`], [`api/admin/users`], [Account listing.],
    [`POST`], [`api/admin/users/{id}/suspend`], [Suspend an account; audited.],
    [`POST`], [`api/admin/users/{id}/reinstate`], [Reinstate; audited.],
    [`GET`], [`api/admin/revenue`], [Fee income over a period.],
    [`GET`], [`api/admin/activity`], [Platform-wide event stream.],
    [`GET`], [`api/admin/security`], [Authentication and security events.],
    [`GET`], [`api/admin/audit`], [Administrative actions, attributed.],
  ),
  caption: [Principal endpoints in this part.],
)

= Libraries Used in This Part

#figure(
  table(
    columns: (40mm, 1fr),
    align: (left + top, left + top),
    table.header([Library], [Role here]),
    [`Entity Framework Core`], [Builds the multi-aggregate dashboard
      projections in one round trip rather than several.],
    [`Recharts`], [Renders the time series on the analytics and overview
      surfaces, styled with the platform's own tokens.],
    [`TanStack Query`], [Caches dashboard responses on the client and keeps the
      selected period in sync across panels.],
  ),
  caption: [Libraries introduced in this part.],
)

= Challenges

#challenge("A dashboard is the query-heaviest page in the platform")[
  Every dashboard computes several aggregates at once, and it is the first
  authenticated page a user sees. Loading entity graphs to count things would
  make the most-visited authenticated surface the slowest.

  *Solution.* Dashboards project directly into the shape they display, in one
  round trip. A venture entity has roughly forty columns; a dashboard row uses
  seven. The database returns seven.
]

#challenge("Derived figures cost more to read than counters do")[
  A stored counter is one column read. An aggregation walks event rows. Choosing
  derivation everywhere means paying that difference on every dashboard and
  every listing.

  *Solution, and the trade accepted.* Aggregates that are shared between users —
  public funding progress — are cached with a short lifetime and invalidated on
  settlement. Anything user-specific is not cached, because it is neither
  shareable nor stable enough to benefit.

  A stale cache is bounded by its lifetime and self-corrects. A drifted counter
  is unbounded and does not. That asymmetry is the whole argument.
]

#challenge("Administrative power had to be constrained without being crippled")[
  An administrator must be able to approve, reject and suspend. Those are
  exactly the powers that, unchecked, make a moderation system untrustworthy.

  *Solution.* Two limits rather than one. First, scope: administrators moderate
  reported content and cannot read private conversations. Second,
  accountability: every administrative action is written to a durable,
  queryable, attributed record inside the same unit of work as the action
  itself — so an action cannot exist without its record, and other
  administrators can read it.
]

#challenge("An account with financial history cannot simply be removed")[
  Deleting a user who has made commitments would erase the record of what other
  parties agreed to.

  *Solution.* The referential rules refuse the delete, and suspension exists as
  a first-class state rather than as a softer deletion. The constraint is not an
  obstacle worked around; it is the rule being enforced where it belongs.
]

= Measured Performance

Every figure below comes from an instrumented run against the deployed database.
Frontend timings are the median of five cold loads with the cache disabled; API
figures are the distribution over thirty warm requests.

#figure(
  table(
    columns: (1fr, 22mm, 22mm, 24mm, 22mm),
    align: (left, right, right, right, right),
    table.header([Page], [TTFB], [First paint], [DOM ready], [Load]),
    [Landing], [147 ms], [468 ms], [430 ms], [739 ms],
    [Venture listing], [92 ms], [320 ms], [203 ms], [448 ms],
  ),
  caption: [Frontend timings. Both pages paint content in under half a
    second.],
)

#figure(
  table(
    columns: (1fr, 20mm, 20mm, 20mm),
    align: (left, right, right, right),
    table.header([Endpoint], [p50], [p95], [max]),
    [`GET /api/projects` (page 1)], [495 ms], [*519 ms*], [662 ms],
    [`GET /api/projects` (page 2)], [475 ms], [500 ms], [506 ms],
  ),
  caption: [Listing latency.],
)

#note[
  *One target is not met.* The venture listing was specified to return within
  300 ms at the 95th percentile. It measures *519 ms*.

  The distribution is the diagnostic: p50 and p95 are 24 ms apart and the
  minimum is 472 ms. A query with a slow *plan* varies; a query with a slow
  *floor* is paying a fixed cost. That floor is the round trip to a hosted
  database on another network — every request pays it before any work happens.
  Page 2 measures marginally faster than page 1, which confirms the cost is not
  in the row count.

  The honest reading is that the target was set for a co-located database and
  the system runs against a remote one. The aggregate cache removes the repeated
  portion but not the floor; closing the gap properly requires the database and
  the application to share a network.
]

= Delivered State of the Platform

#figure(
  table(
    columns: (26mm, 1fr),
    align: (left + top, left + top),
    table.header([Report], [Delivered]),
    [1 · Foundation & Identity],
      [Four-container architecture, design system in two languages and two
       themes, registration with mandatory verification, OTP, tokens with
       rotation and replay detection, lockout, roles, profiles, suspension.],
    [2 · Ventures & Moderation],
      [Full venture record with imagery, documents, team, milestones and
       updates; draft, submit, review, reason-bearing rejection, resubmission;
       three independent state columns; content-verified uploads.],
    [3 · Discovery & Engagement],
      [Public browsing, search, four filters, six sort orders, saved searches,
       watchlist, following, feed, reviews, comments, reporting, investor
       directory; deterministic ranking.],
    [4 · Investment & Payments],
      [Commitment, approval, time-boxed checkout, provider abstraction with two
       implementations, signature-verified webhooks, duplicate protection,
       derived totals, expiry sweeping, refunds, platform fee.],
    [5 · Real-Time Communication],
      [Live messaging with presence, durable last-seen, typing, server-side
       read receipts, image attachments, deal room, document requests with
       download logging, notifications with background fan-out.],
    [6 · Insight & Administration],
      [Three dashboards, venture analytics, platform overview, account
       administration, revenue, activity, security log, audit log.],
  ),
  caption: [What the six parts delivered.],
)

#figure(
  table(
    columns: (1fr, 26mm),
    align: (left, right),
    table.header([Measure], [Figure]),
    [API controllers], [22],
    [API endpoints], [150],
    [Database tables], [40+],
    [Versioned migrations], [20+],
    [Frontend routes], [65],
    [Automated tests, all passing], [41],
    [Languages · themes], [2 · 2],
  ),
  caption: [The delivered system in numbers.],
)

== Verification

Forty-one automated tests pass against the domain layer — the components that
carry rules and perform no I/O — in 34 milliseconds. They cover the funding and
stage rules directly: that an approved but unsettled commitment contributes
zero, that a refunded transaction is removed from a total, that capacity is
measured against commitments, and that a moderation change leaves commercial
stage untouched.

#figure(
  table(
    columns: (1fr, 22mm, 22mm),
    align: (left, right, right),
    table.header([Scope], [Line], [Branch]),
    [Stage transition rules], [*100%*], [*100%*],
    [Funding calculations], [25.8%], [*80%*],
  ),
  caption: [Coverage over the rule components. The uncovered lines in the
    funding component are its database loaders, which cannot execute without a
    database; every decision the component makes is exercised.],
)

*Beyond the domain layer*, verification is by inspection and by manual exercise
of the journeys described across these six reports.

== Not built

Stated plainly, because a delivery report that omits this is not a delivery
report.

- *Live money movement.* The Stripe-compatible path is implemented and
  configurable but has not been run against a live merchant account.
- *Regulatory onboarding.* No identity verification or anti-money-laundering
  checks.
- *Secondary transfer.* An investor cannot sell or transfer a commitment.
- *Automated recommendation.* Ranking is deterministic by design.
- *Notification preferences and email digests.*
- *Non-image attachments.*
- *Continuous integration, automated alerting and a metrics pipeline.*
- *Horizontal scale.* Presence and the notification queue are process-local;
  a second instance requires a shared backplane and a durable queue first.

= How This Fits With the Rest of the System

This part reads from every other and writes almost nothing.

#figure(
  table(
    columns: (30mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Report], [Reads], [Writes]),
    [1 · Identity], [Account state, roles, security events.],
      [Suspension state, and an audit record of it.],
    [2 · Ventures], [Venture state and moderation load.],
      [Nothing. Moderation decisions belong to that part.],
    [3 · Discovery], [View and interaction events.], [Nothing.],
    [4 · Investment], [Settled transactions, for both funding and revenue.],
      [Nothing.],
    [5 · Real-time], [Message and notification volume.],
      [Nothing — private conversations are not readable here.],
  ),
  caption: [Insight reads widely and writes narrowly, which is what makes it
    safe to give an administrator.],
)

= Summary

#delivered[
  *Three dashboards*, each answering the question its role actually asks, built
  on projections rather than materialised entity graphs.

  *Analytics derived from events* — views, engagement, funding and revenue — with
  no counter maintained anywhere, so no reported figure can drift.

  *Administrative surfaces* covering accounts, ventures, reports and revenue,
  with suspension as a first-class state and deletion structurally prevented for
  accounts with financial history.

  *Observable power*: two durable, queryable records — an audit log of every
  administrative action attributed to its author, and a security log indexed for
  the questions actually asked of it.

  *Measured performance* reported with the one target that was not met, its
  diagnosis, and what closing it would require.
]

This is the sixth and final report. Together the six cover every part of the
platform: how it knows who you are, what a venture is and how it becomes public,
how it is found, how money moves, how the two sides talk, and how all of it is
overseen.
