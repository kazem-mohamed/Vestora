#import "/lib/vestora.typ": *
#import "/lib/theme.typ": *

= Feature Walkthrough II: Investment, Governance and Insight <ch:features2>

This chapter follows the venture from submission to reporting, and the money
from intention to settlement. It is where the system's correctness properties
become visible as behaviour.

== Investment Workflow

*Goal.* Let an investor commit capital to a venture, and let both sides know
precisely what state that commitment is in.

*Path.* Five states, and the boundaries between them are the whole design.

#figure(
  table(
    columns: (30mm, 1fr, 34mm),
    align: (left + top, left + top, left + top),
    table.header([State], [Means], [Moved by]),
    [Committed], [An investor has expressed intent. Nothing is reserved and no
      money is involved.], [Investor],
    [Approved], [The founder or an administrator has accepted the commitment.
      *Still not funded.*], [Founder / admin],
    [In checkout], [A funding request is open with an expiry, and a provider
      session exists.], [Investor],
    [Funded], [A payment transaction settled. This is the only state that
      counts toward a venture's total.], [Provider callback],
    [Lapsed], [The checkout expired or the provider declined.], [System],
  ),
  caption: [Investment states. Only one of them is money.],
)

*The decision that matters.* Approved and funded are different states on
different objects, and the platform never displays one as the other. A founder
sees how much has been *committed* and how much has *settled*, as two numbers,
because they are two facts.

The temptation to collapse them is strong: one number is simpler to display and
simpler to store. It is also wrong, and it is wrong in the direction that
matters — it would show a venture as funded when nothing had been paid.

*The consequence.* Everything downstream inherits this. `FundingMath` reads only
settled transactions (§11.7). The venture's progress bar reflects settlement,
not intent. And a founder cannot inflate their own progress by approving
commitments, because approval is not the thing that counts.

*Investor surfaces.* The investor sees this state model directly: a pipeline
view of commitments in progress, a payments view of settlement history, a
portfolio of what is actually funded, and an activity log. Four surfaces because
there are four questions, and one combined view would answer none of them
clearly.

#figure(
  image("/assets/screenshots/venture-detail-en-light.png", width: 100%),
  caption: [A venture page. The commitment path begins here, and the page leads
    with evidence — imagery, sector, stage, location and the founder — before it
    asks for anything.],
)

== Project Lifecycle: Status versus Stage

*Goal.* Carry a venture from submission to close without any actor's decision
overwriting another's.

*Path.* A venture is created as a draft, submitted for review, approved or
rejected by an administrator, published, funded over time, and eventually
closed. Three independent columns track it (§7.6): moderation status, lifecycle
status, and commercial stage.

*Why this is the chapter's second important section.* Consider a single status
column and this ordinary sequence:

+ A founder submits a venture. Status: `pending`.
+ An administrator approves it. Status: `approved`.
+ Investors fund it. Status: `funding`.
+ The founder edits the description, which requires re-review. Status:
  `pending`.
+ The administrator approves again. Status: `approved`.

Step five has just erased the fact that the venture was funding. The
information was destroyed by an operation that had nothing to do with funding,
performed by an actor who was not thinking about funding.

With three columns the same sequence changes only `ModerationStatus`, and the
commercial stage is untouched because the administrator does not write it.

#figure(
  table(
    columns: (34mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Column], [Values], [Transition rules]),
    [`ModerationStatus`], [pending, approved, rejected],
      [Only an administrator writes it. Rejection carries a reason.],
    [`LifecycleStatus`], [active, paused, closed],
      [Written by the owner or by the system when a target is met.],
    [`Stage`], [the commercial progression],
      [Written only by the funding pipeline, and validated against permitted
       transitions rather than set freely.],
  ),
  caption: [The three state columns, their values and who may move them.],
)

*The consequence.* Public visibility requires two of the three to agree —
approved *and* active — which is the two-column filter that shapes the listing
query and its composite index (§13.3, §7.5). That is the price of the decision,
paid once in an index definition.

#full-page-figure(
  "/assets/diagrams/out/state-project.svg",
  caption: [The three state machines of a venture, side by side. They share no
    transition and no writer, which is why an approval cannot reset funding
    progress (ADR-05).],
)

== Milestones and Project Updates

*Goal.* Keep the relationship alive after funding, which is the gap §1.2
identified in existing platforms.

*Path.* A founder defines milestones — what will be achieved and by when — and
publishes updates as work progresses. Updates carry images. Both belong to the
venture and cascade with it (§7.6), because a milestone of a deleted venture
means nothing.

*The decision.* Milestones are declarative rather than verified. The platform
records what a founder says and when they said it; it does not attest that a
milestone was met. Pretending otherwise would be a claim the system cannot
support — and a platform that appeared to verify progress it merely recorded
would be worse than one that clearly does not.

What the platform does provide is *timestamped, immutable-in-practice history*:
an update, once published, is part of the venture's record, and an investor can
see the gap between what was promised and what was reported.

*Fan-out.* Publishing an update notifies followers and investors through the
background worker (§12.6), so a founder with many followers does not wait on
delivery.

== Document Requests and Deal Room

*Goal.* Let diligence happen without publishing confidential material to
everyone who can see a venture.

*Path.* A founder attaches documents to a venture with a visibility rule. Open
documents are available to anyone who can see the venture. Restricted documents
require a request, which the founder grants or refuses. Granted access is
recorded, and downloads are logged.

*The decision.* Access control on documents is enforced at download, not by
obscurity of the link. A URL that is hard to guess is not an access control —
it is a secret that spreads on the first forward. Every download re-checks
entitlement.

*Download logging.* Every download writes a row. This is not surveillance: it
is what lets a founder see that a document was actually read, and it is what
makes a disclosure traceable if material leaves the platform.

*Deal room.* Where a conversation between an investor and a founder becomes
specific, it has its own surface, combining the messaging thread (@ch:realtime)
with the documents and the commitment under discussion. The design intent is
that the three things a diligence conversation refers to are in one place rather
than three tabs.

== Administrative Workflow: Review and Moderation

*Goal.* Ensure nothing reaches the public surface without a human decision, and
that every such decision is attributable.

*Path.* Administrative work is divided by task rather than by entity, because
the queues have different rhythms:

#figure(
  table(
    columns: (34mm, 1fr),
    align: (left + top, left + top),
    table.header([Surface], [Purpose]),
    [Review queue], [Ventures awaiting a moderation decision. The primary
      queue.],
    [Ventures], [All ventures, whatever their state, for investigation.],
    [Reports], [User-submitted reports, filtered by status — the pair the
      index in §7.5 serves.],
    [Users], [Account administration, including suspension.],
    [Revenue], [Platform fee income, derived from settled transactions.],
    [Activity], [Platform-wide event stream.],
    [Security], [Authentication events from `SecurityLog`.],
    [Audit], [Administrative actions from `AdminAuditLog`.],
  ),
  caption: [Administrative surfaces and what each is for.],
)

*The decision.* The last two surfaces exist because *administrative power must
itself be observable*. An administrator can approve, reject and suspend; those
actions are recorded against the administrator who took them, in a durable
table, readable by other administrators.

A moderation system without an audit trail asks users to trust administrators
absolutely. One with an audit trail asks them to trust a process — which is a
much smaller request, and the correct one for a platform that mediates money.

*Rejection carries a reason.* A rejected venture returns to its founder with a
stated cause. A rejection without a reason is indistinguishable from a fault,
and produces a support burden rather than a corrected submission.

== Role-Based Dashboards

The two dashboards are separate surfaces over largely shared machinery. They
are documented together because the interesting part is what differs.

=== Founder Dashboard

Answers: *is my venture progressing?* It shows the venture portfolio, funding
progress split into committed and settled (§14.1), incoming funding requests
awaiting the founder's approval, engagement analytics, and an activity stream.

The funding surface is where the two-number distinction becomes concrete. A
founder sees both figures side by side, permanently, because the difference
between them is the actionable information — a large gap means approvals are not
converting to payments.

=== Investor Dashboard

Answers: *what have I committed, and what has it done?* It shows the pipeline of
in-progress commitments, settled payments, the funded portfolio, the watchlist,
and an activity log.

#figure(
  image("/assets/screenshots/invest-en-light.png", width: 100%),
  caption: [The investor dashboard for a new account. *Funded* and *Approved
    commitments* are separate tiles — the distinction of §14.1 is not an
    internal detail, it is the first thing the surface reports.],
)

That capture is of an *empty* account, deliberately. The tiles still read
`$0 — 0 settled payment(s)` and `$0 — 0 commitments` rather than collapsing into
a single zero, so the two-figure model is legible before a user has any data to
disambiguate it. The panel below them explains what the surface is for instead
of showing an empty container (§8.8).

#figure(
  image("/assets/screenshots/invest-ar-dark.png", width: 100%),
  caption: [The same dashboard in Arabic under the dark token set. The sidebar,
    tiles and reading order mirror; the figures and their meaning do not change
    (§8.6.1).],
)

*The shared decision.* Both dashboards read through projections rather than
loading entity graphs (§6.6). A dashboard is the query-heaviest surface in the
platform — several aggregates at once — and materialising full entities to
compute counts would make the most-visited authenticated page the slowest.

== Analytics and Reporting

*Goal.* Turn recorded events into something a founder or an administrator can
act on.

*Path.* Three tiers, each derived rather than stored:

/ Venture analytics: Views over time, engagement, funding progression. Derived
  from the view and interaction tables.

/ Founder insight: Which ventures attract attention, where interest converts to
  commitment and where it stops.

/ Platform analytics: Activity volume, moderation load and fee revenue — the
  last computed from settled transactions and their stored fee amounts
  (§11.8).

*The decision.* Analytics are computed from event rows rather than maintained as
counters. This is the same argument as §7.6, applied again: a counter can drift
and cannot be recomputed, while an aggregation over rows is always correct and
can be recomputed from history at any time.

*The cost, stated.* Aggregating on read is more expensive than reading a
counter, and analytics are the second-hottest read path after the venture
listing. §17.4 measures this and §17.5 describes what is cached. The trade is
accepted for the same reason as in §7.6: a stale cache is recoverable, a drifted
counter is not.
