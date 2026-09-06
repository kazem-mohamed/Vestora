#import "/lib/report.typ": *
#import "/lib/theme.typ": *

#report-cover(
  number: 12,
  title: "Administration & Evaluation",
  subtitle: "Who watches the platform, what it measured, and what it does not do",
  date: "September 2026",
)

#show: report.with(number: 12, name: "Administration & Evaluation")

= Introduction

Report 11 covered what each role can *see*. This one covers what an
administrator can *do* — and then closes the series by measuring the whole
platform against the requirements Report 1 set for it.

Those two halves belong in one report for a reason that is not obvious. The
administrative surfaces here are the ones that exercise power over other
people's work: suspending an account, and reading the record of what other
administrators did. A platform that grants those powers without evidence of how
they were used has not earned the trust it is asking for. *Making power
observable is itself a delivered feature*, and it is the last one.

The evaluation that follows is the only place in this series where a requirement
may be closed. Every earlier report described what it built; this one states what
was measured, what was proven by test, and what was not built at all.

= Objective

*Make administrative power observable.* An administrator can approve, reject and
suspend. Every one of those actions is recorded against the administrator who
took it, and is readable by other administrators — including their own.

*Suspend rather than delete.* An account carrying financial history must not be
removable, because removing it would erase the record of what other parties
agreed to.

*Report the platform's state honestly.* Including the requirement that was missed
and the reason, and including everything that was not built.

= Features Delivered

#figure(
  table(
    columns: (40mm, 1fr),
    align: (left + top, left + top),
    table.header([Feature], [What it does]),
    [User administration], [Account listing, inspection, suspension and
      reinstatement.],
    [Suspension], [A first-class account state. Reversible, and never a
      deletion.],
    [Security log], [Authentication and security events, per user and in time.],
    [Audit log], [Every administrative action, attributed to the administrator
      who took it.],
    [Platform activity], [Platform-wide events, and the same rows filtered to
      what each viewer may see.],
    [Primary administrator], [One administrator is marked primary and cannot be
      removed by another — the platform cannot be left with nobody in charge.],
    [Forced password change], [An account created by an administrator must set
      its own password before it can do anything else.],
    [Platform search], [One query across users, ventures and relationships.],
    [User overview], [Everything the platform knows about one account, on one
      page.],
    [Growth and alerts], [Derived platform trends, and the conditions worth
      waking someone for.],
  ),
  caption: [Features delivered in this part. The moderation queues these powers
    act through are Report 5.],
)

= Accounts Are Suspended, Not Deleted

An account with financial history cannot be deleted. The referential rules
introduced in Report 9 prevent it, and correctly so: deleting such an account
would erase the record of commitments that *other parties* made.

Suspension therefore exists as a first-class state rather than as a softer form
of deletion. It is the correct operation for a system that records financial
commitments, and it is reversible, which deletion is not.

#shots(
  "/assets/screenshots/gov-users-en-light.png",
  "/assets/screenshots/gov-users-ar-dark.png",
  [Account administration in both languages and themes. Suspension and
   reinstatement are the two operations offered; there is no delete control,
   because there is no delete.],
)

#note[
  This is the clearest case in the series of a constraint being *the rule* rather
  than an obstacle. The database refuses to remove an account with commitments
  against it. The application does not work around that refusal with a soft-delete
  flag or a cascade; it offers the operation the constraint permits and calls it
  what it is.
]

= Administrative Power Is Observable

Two durable records exist, and neither of them is a log line.

#figure(
  table(
    columns: (32mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Record], [What it holds], [Why a table and not a log]),
    [`AdminAuditLog`], [Every administrative action — approval, rejection,
      suspension — attributed to the administrator who took it, with the stated
      *reason*, the *before* and *after* of what changed, and the *IP address* it
      came from.],
      [Evidence must be queryable, retained, and presentable. A log stream is
       none of the three — and a diff is not something a log line can hold.],
    [`SecurityLog`], [Authentication and security events, indexed on user and
      time.],
      [Audit questions are always per-user and time-ordered; the index matches
       the shape of the question.],
  ),
  caption: [Two records that make oversight possible.],
)

#shots(
  "/assets/screenshots/gov-audit-en-light.png",
  "/assets/screenshots/gov-audit-ar-dark.png",
  [The audit log. Every administrative decision is attributed and readable by
   other administrators — including one's own, which is the property that makes
   it oversight rather than record-keeping.],
)

#shots(
  "/assets/screenshots/gov-security-en-light.png",
  "/assets/screenshots/gov-security-ar-dark.png",
  [The security log. The authentication events of Report 3 — sign-ins, lockouts,
   token rotation refusals — kept as queryable rows rather than as text a person
   would have to grep.],
)

#delivered[
  A moderation system with no audit trail asks users to trust *individuals*. One
  with an audit trail asks them to trust a *process*. That is a much smaller
  request, and it is the correct one for a platform that mediates money.
]

= Backend

#figure(
  ```cs
  // Nothing is saved here, for the same reason StageLog saves nothing: the entry
  // is added beside the change it describes, so the caller's existing
  // SaveChangesAsync commits both or neither. The controllers used to save the
  // action first and the record of it second, which meant a failure in between
  // left the act done and unrecorded — the one state an audit trail exists to
  // prevent.
  project.ModerationStatus = ModerationStatus.Approved;
  AuditTrail.Record(_db, adminId, "ApproveProject", "Project", project.Id,
                    reason: dto.Reason, before: snapshot, after: project, ip: CallerIp);
  await _db.SaveChangesAsync(ct);          // one transaction, both rows
  ```,
  caption: [Attribution, through the single writer. The `SaveChangesAsync`
    placement is the whole mechanism — one call, so both writes commit or neither
    does.],
)

#delivered[
  *The single writer exists because three copies disagreed.* Both administrative
  controllers and the payment service each built this row by hand, each with its
  own truncation rule and its own idea of what "the actor" meant. They agreed only
  because whoever wrote one copied the last — and the first divergence would have
  been invisible, because *a log with one field quietly missing still looks like a
  log.*
]

#figure(
  ```cs
  // Suspension sets a state. There is no delete path for an account with
  // financial history, and none is offered for one without: a single rule is
  // easier to reason about than a rule with an exception.
  user.IsSuspended   = true;
  user.SuspendedAtUtc = DateTime.UtcNow;

  await _audit.RecordAsync(adminId, AdminAction.SuspendUser, user.Id, ct);
  ```,
  caption: [Suspension. Reversible by construction, because nothing was
    removed.],
)

= Key Endpoints

#figure(
  table(
    columns: (16mm, 48mm, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Method], [Path], [Purpose]),
    [`GET`], [`api/admin/users`], [Account listing for administration.],
    [`POST`], [`api/admin/users/{id}/suspend`], [Suspend an account; writes the
      audit log.],
    [`POST`], [`api/admin/users/{id}/restore`], [Reverse a suspension.],
    [`POST`], [`api/admin/admins`], [Create a further administrator.],
    [`POST`], [`api/admin/admins/{id}/make-primary`], [Transfer the primary role.
      There is always exactly one.],
    [`GET`], [`api/admin/audit-log`], [The audit trail, with reasons and diffs.],
    [`GET`], [`api/admin/security`], [The security log, per user and in time.],
    [`GET`], [`api/admin/analytics`], [Platform totals and distribution.],
    [`GET`], [`api/admin/growth`], [Derived trends over time.],
    [`GET`], [`api/admin/alerts`], [Conditions the platform thinks are worth
      attention.],
  ),
  caption: [Principal endpoints in this part. Every one is role-gated on the
    server and every write is attributed.],
)

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
  caption: [Frontend timings. Both pages paint content in under half a second.],
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
  *One target is not met.* `NFR-02` specified that the venture listing return
  within 300 ms at the 95th percentile. It measures *519 ms*.

  The distribution is the diagnostic: p50 and p95 are 24 ms apart and the minimum
  is 472 ms. A query with a slow *plan* varies; a query with a slow *floor* is
  paying a fixed cost. That floor is the round trip to a hosted database on
  another network — every request pays it before any work happens. Page 2
  measures marginally faster than page 1, which confirms the cost is not in the
  row count.

  The honest reading is that the target was set for a co-located database and the
  system runs against a remote one. The aggregate cache removes the repeated
  portion but not the floor; closing the gap properly requires the database and
  the application to share a network. *The projection and the composite index of
  Report 6 were not the wrong optimisations — they were optimisations to the part
  that was not the bottleneck.*
]

= Verification

*Eighty-five automated tests pass, in 29 seconds.* They fall into two groups that
prove different things, and the difference matters more than the total.

#figure(
  table(
    columns: (46mm, 16mm, 1fr),
    align: (left + top, center + top, left + top),
    table.header([Suite], [Tests], [What it proves]),
    [`FundingMathTests`], [23],
      [That an approved but unsettled commitment contributes zero, that a
       refunded transaction leaves a total, that capacity is measured against
       commitments, and that a tranche does not close an ask early.],
    [`PipelineStagesTests`], [25],
      [Every permitted and forbidden stage transition, and that a moderation
       change leaves commercial stage untouched.],
    [`ProjectCategoriesTests`], [9],
      [That the category vocabulary is closed, and that it matches the list the
       client ships.],
    [`AuthEndpointsTests`], [9],
      [Registration, verification, sign-in, refresh and lockout, over HTTP.],
    [`PaymentsEndpointsTests`], [6],
      [Checkout, settlement and duplicate confirmation, over HTTP.],
    [`ProjectsEndpointsTests`], [6],
      [Creation, submission and the visibility rule, over HTTP.],
    [`SecurityBoundaryTests`], [7],
      [That a caller cannot reach what their role and ownership do not permit.],
  ),
  caption: [The suite by subject. Fifty-seven domain tests and twenty-eight
    integration tests.],
)

The domain tests exercise components that hold no I/O — arithmetic over rows and
a transition table — which is why they can run without a database at all.

The integration tests start the real application and drive it over HTTP, which is
what makes them able to prove an *authorisation* claim rather than an arithmetic
one. `SecurityBoundaryTests` is the one that matters most to this series: every
report that says *a role check is not an ownership check* is asserted there
rather than merely stated here.

#note[
  *What the integration suite does not prove.* It runs against EF Core's InMemory
  provider rather than SQL Server, and the choice is deliberate — several queries
  in this codebase build LINQ predicates that InMemory evaluates client-side and
  a real provider would have to translate to SQL.

  The consequence is precise and worth stating: these tests prove *endpoint
  behaviour, status codes and authorisation*. They do not prove that every query
  translates, and they cannot catch a predicate that works in memory and fails
  against the database. That class of defect is caught only by running the
  application against the real one.
]

*Beyond these two suites, verification is by inspection and by manual exercise of
the journeys described across these twelve reports.* There is no end-to-end
browser suite, no load test, and no continuous integration — the eighty-five
tests pass because somebody ran them.

#note[
  *One journey was exercised end to end while this series was written*, and the
  screenshots in Reports 8, 10 and 11 are its record: a venture listed, an
  administrator's approval, an investor's commitment, the founder's acceptance,
  a funding request, a checkout, and a settled payment — seven steps across three
  accounts, against the deployed database and the offline payment simulator.

  The figures it produced agree with the model: \$40,000 gross, \$2,000 platform
  fee at the configured 5%, \$38,000 net to the founder, and a funding total that
  moved only at the settlement step and not at any of the six before it.

  This is *evidence*, not a test. Nothing about it is repeatable without a person
  driving it, and it would not fail a build. It is recorded here as what it is:
  one careful manual exercise of the path the whole series describes.
]

= Delivered State of the Platform

#figure(
  table(
    columns: (30mm, 1fr),
    align: (left + top, left + top),
    table.header([Report], [Delivered]),
    [1 · Idea & Requirements],
      [Problem statement, platform comparison, three gaps, scope with five
       exclusions, three personas, 43 functional and 16 non-functional
       requirements, nine scored technology decisions.],
    [2 · Foundation & Design System],
      [Four-container architecture, 25 controllers with a uniform service seam,
       55 client routes, seven colour and five typographic tokens across two
       languages and two themes.],
    [3 · Identity & Sessions],
      [Registration with mandatory verification by a code bound to its address,
       rate-limited resend, tokens with rotation and replay detection, lockout,
       reset, roles, profiles, suspension.],
    [4 · Ventures & Lifecycle],
      [Full venture record with imagery, documents, team, milestones and
       updates; draft and submit; three independent state columns;
       content-verified uploads.],
    [5 · Review & Approval],
      [Review queue, reason-bearing rejection, resubmission, venture registry,
       report queue, attributed audit trail.],
    [6 · Discovery & Engagement],
      [Public browsing, search, four filters, six sort orders, saved searches,
       watchlist, following, feed, reviews, comments, reporting, investor
       directory; deterministic ranking.],
    [9 · Commitment & Pipeline],
      [Commitment as intention, founder approval, capacity measured in
       commitments, four funding figures derived and never stored.],
    [10 · Payments],
      [Time-boxed checkout, provider abstraction with two implementations,
       signature-verified webhooks, duplicate protection, expiry sweeping,
       refunds, platform fee.],
    [7 · Messaging & Notifications],
      [Live messaging with presence, durable last-seen, typing, server-side read
       receipts, attachments, notifications with background fan-out.],
    [8 · The Deal Room],
      [A per-relationship room, document requests with download logging, and
       access decided by party membership rather than by role.],
    [11 · Dashboards & Analytics],
      [Three dashboards, venture analytics, platform overview, revenue, activity
       — every figure derived from event rows.],
    [12 · Administration & Evaluation],
      [Account administration, suspension and restore, a primary-administrator
       role, forced password change, platform search, per-user overview, growth
       and alerts, a security log, an audit trail carrying reasons and diffs, and
       this evaluation.],
  ),
  caption: [What the twelve parts delivered.],
)

#figure(
  table(
    columns: (1fr, 26mm),
    align: (left, right),
    table.header([Measure], [Figure]),
    [API controllers], [25],
    [API endpoints], [169],
    [Entity sets in the data context], [34],
    [Versioned migrations], [30],
    [Frontend routes], [58],
    [Automated tests, all passing], [85],
    [Languages · themes], [2 · 2],
  ),
  caption: [The delivered system in numbers. Every figure counted from the source
    at the time of writing rather than estimated.],
)

= Not Built

Stated plainly, because a delivery report that omits this is not a delivery
report.

- *Live money movement.* The Stripe-compatible path is implemented and
  configurable but has not been run against a live merchant account. The
  application refuses to start on a key that is not a test key, and that check is
  deliberate.
- *Regulatory onboarding.* No identity verification and no anti-money-laundering
  checks. The platform proves an address is reachable and claims nothing further
  about who owns it.
- *Legal execution of equity.* Commitments are recorded; no instrument is
  generated, executed or registered.
- *Secondary transfer.* An investor cannot sell or transfer a commitment.
- *Automated recommendation.* Ranking is deterministic by design, and Report 6
  states the cost of that choice.
- *Notification preferences and email digests.*
- *Non-image attachments beyond the permitted document types.*
- *Continuous integration, automated alerting and a metrics pipeline.*
- *Horizontal scale.* Presence and the notification queue are process-local; a
  second instance requires a shared backplane and a durable queue first.

Every entry above appeared in the scope exclusions of Report 1 or was declared as
open in the report that would otherwise have contained it. None of them is being
disclosed for the first time here.

= Challenges

#challenge("Administrative power had to be constrained without being crippled")[
  An administrator must be able to approve, reject and suspend. Those are exactly
  the powers that, unchecked, make a moderation system untrustworthy.

  *Solution.* Two limits rather than one. First *scope*: administrators moderate
  reported content and cannot read private conversations — the deal room of
  Report 8 admits parties, not roles. Second *accountability*: every
  administrative action is written to a durable, queryable, attributed record
  inside the same unit of work as the action itself, so an action cannot exist
  without its record.
]

#challenge("An account with financial history cannot simply be removed")[
  Deleting a user who has made commitments would erase the record of what other
  parties agreed to.

  *Solution.* The referential rules refuse the delete, and suspension exists as a
  first-class state rather than as a softer deletion. The constraint is not an
  obstacle worked around; it is the rule being enforced where it belongs.
]

#challenge("A missed target is more useful than a met one, if it is diagnosed")[
  The listing endpoint misses `NFR-02` by 219 ms, on the platform's most-visited
  surface, after three rounds of optimisation.

  *Resolution.* The distribution was read rather than the average: a 24 ms spread
  between p50 and p95 and a 472 ms floor identify a fixed cost, not a slow query.
  The optimisations in Report 6 were correct and addressed the part that was not
  the bottleneck. The remedy is co-locating the database, which is an
  infrastructure decision rather than a code one, and it is recorded as
  outstanding rather than presented as met.
]

= How This Fits With the Rest of the System

This report reads from every other and writes almost nothing.

#figure(
  table(
    columns: (32mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Report], [Relationship], [Boundary]),
    [1 · Idea & Requirements],
      [*Closes it.* Every `NFR` recorded there is measured here or its
       measurement is declared absent.],
      [This is the only report permitted to close a requirement.],
    [3 · Identity & Sessions],
      [*Extends it.* Suspension and the security log continue the account
       lifecycle defined there.],
      [Administrative power is itself recorded against the identity that used
       it.],
    [5 · Review & Approval],
      [*Records it.* Every moderation decision made there is attributed here.],
      [This report reads the audit trail; Report 5 writes it.],
    [11 · Dashboards & Analytics],
      [*Sits beside it.* That report covers the views; this one covers the
       actions.],
      [Shared surfaces, separate powers.],
  ),
  caption: [Direct relationships only.],
)

= Summary

#delivered[
  Account administration with suspension as a first-class, reversible state and
  no delete path at all. Two durable oversight records — an attributed audit log
  and an indexed security log — written in the same unit of work as the actions
  they describe, and readable by other administrators. Platform activity at two
  scales, filtered to what each viewer is entitled to see. All of it in two
  languages and two themes.

  *And the evaluation of the whole.* Twelve parts delivered, 25 controllers, 169
  endpoints, 34 entity sets, 30 migrations, 58 client routes, 85 passing tests in
  29 seconds, and one non-functional requirement measured, missed, and diagnosed
  rather than quietly restated.
]

*Still open in this part.* There is one administrator role rather than a graded
set of permissions: an administrator who can approve can also suspend. The audit
log is readable but not exportable, and nothing alerts on it — oversight requires
someone to look. And the platform has no continuous integration, so the
eighty-five tests pass because somebody ran them.

*What this closes.* The series began in Report 1 with four failures of the
current arrangement and forty-three requirements written against them. Eleven
reports built the answer; this one measured it. What was delivered is stated
above, what was measured is stated with the one target that was missed, and what
was not built is listed rather than omitted — which was the only way any of it
was worth writing down.
