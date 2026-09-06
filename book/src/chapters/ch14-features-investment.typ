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

#full-page-figure(
  "/assets/diagrams/out/flow-venture.svg",
  caption: [The venture lifecycle. Two gates decide whether a venture is public —
    an administrator's approval and the founder's own lifecycle state — and a
    substantive edit returns it to review without touching either of the other
    two columns.],
)

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

=== The eight stages, and the log beneath them

`Stage` is a closed vocabulary of eight values, and a relationship moves through
them in one direction with two exits:

#figure(
  table(
    columns: (26mm, 1fr),
    align: (left + top, left + top),
    table.header([Stage], [What it means]),
    [`New`], [A request has been made and not yet looked at.],
    [`Reviewing`], [The founder is considering it.],
    [`Approved`], [The founder accepted the relationship. No money yet.],
    [`Contacted`], [The founder has actually reached out.],
    [`InDiscussion`], [Diligence is under way — questions, documents, terms.],
    [`Committed`], [The two sides have settled what the deal is.],
    [`Closed`], [Concluded. The exit that means it happened.],
    [`Declined`], [Concluded. The exit that means it did not.],
  ),
  caption: [The commercial pipeline. `Approved` and `Contacted` are separate on
    purpose: accepting a backer and speaking to them are different acts, and the
    gap between them is the most common stall the platform has.],
)

*Every move is written to an append-only log.* `InvestmentStageEvent` records
the stage moved from, the stage moved to, the actor, an optional reason, the
moment, and *how many minutes the relationship spent in the previous stage* —
which is what makes per-stage durations a measurement rather than an estimate.

#note[
  *The log has one writer, and that is the point.* Before `StageLog`, seven
  places assigned `Stage` and `StageUpdatedAt` by hand — two controllers, the
  payment service, the round-closing path. They agreed only because whoever wrote
  them remembered to set both.

  Adding a history row to each of those sites by hand would have been the same
  arrangement with one more thing to forget, and the first site that forgot would
  have produced a timeline quietly missing a step — *worse than no timeline,
  because it looks complete.*

  `StageLog` saves nothing itself: the event is added to the change tracker
  beside the column it describes, so the caller's existing `SaveChangesAsync`
  commits both or neither. A history that can be half-written is not history.
]

A move to the stage a relationship is already in is recorded when a *reason* is
given and skipped when it is not — re-declining with a different reason is a real
event, while a founder re-selecting the current stage is not.

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

== Document Requests

*Goal.* Let diligence happen without publishing confidential material to
everyone who can see a venture.

*Path.* A founder attaches documents to a venture with a visibility rule. Open
documents are available to anyone who can see the venture. Restricted documents
require a request, which the founder grants or refuses. Granted access is
recorded, and downloads are logged. Requests run *in both directions*: a founder
may also ask an investor for a document, and either side may withdraw a request
it no longer needs.

*The decision.* Access control on documents is enforced at download, not by
obscurity of the link. A URL that is hard to guess is not an access control —
it is a secret that spreads on the first forward. Every download re-checks
entitlement, which is what allows a withdrawn request to stop working
immediately.

*Download logging.* Every download writes a row, separate from the grant. This
is not surveillance: it is the difference between "they asked for the
financials" and "they read the financials twice, the second time after our
call" — and only the second is diligence signal. It is also what makes a
disclosure traceable if material leaves the platform.

== The Deal Room

*Goal.* Put one relationship on one page, so neither side has to reconstruct the
state of a deal from an inbox.

A deal room exists for exactly one investor backing exactly one venture. It
admits two people — membership of *this relationship*, not a role — and holds
everything that relationship consists of: the terms drafted, the money asked for
and paid, the questions asked and answered, the documents requested and
supplied, the conversation itself, a timeline of what happened, and a private
note each side keeps from the other.

#full-page-figure(
  "/assets/diagrams/out/flow-dealroom.svg",
  caption: [The diligence path through the room. A request is made, granted or
    refused, and every later download is its own event.],
)

=== Questions on the record

A question asked in the room stays with its answer. Each question admits one
follow-up, and either side may withdraw a question it no longer needs — a
withdrawal marks the row rather than deleting it, so the record that something
was asked survives the decision to stop asking.

The alternative — asking in the chat thread — was available and rejected. A
diligence question buried in three days of conversation is a question the next
reader has to search for, and the answer to it is evidence.

=== Terms, and what they are not

Either side may draft terms; the other side's acceptance is what decides
anything, and a decline carries a reason. A superseded sheet is retained with
its version, so the sequence of what was proposed is readable afterwards.

#note[
  The panel states its own limit, in the product, in both languages: "A written
  record of what both sides accepted. Vestora holds no signatures and enforces
  nothing — this is not a contract."

  That sentence is the difference between a platform that records an agreement
  and one that presents itself as a party to it. Section 1.5.2 excludes legal
  execution from scope; this is the one screen where that exclusion is visible to
  the person it affects rather than recorded in a document they will not read.
]

*Administrators are refused on all three term routes.* An administrator may read
a room for moderation and may not propose, accept or decline anything in it,
because terms are between two parties and an administrator is not one of them.
The refusal is at the endpoint, not merely absent from the interface.

#full-page-figure(
  "/assets/diagrams/out/flow-termsheet.svg",
  caption: [Terms, and the consequence that makes them more than a record: an
    accepted sheet becomes the figure the money is measured against.],
)

=== Counter-offers

A funding request may be answered with a counter rather than a payment. The
counter carries its own status, so a request under negotiation is
distinguishable from one that is simply unpaid — a distinction the funding
figures depend on, because the two mean different things about whether the deal
is moving.

=== Deal health, derived rather than maintained

The room reports whether the relationship is moving, and what is holding it up.

Every input is a fact the room already holds — the date of the last activity,
open questions, open document requests, an unpaid ask, unanswered terms, the
current stage. Nothing is maintained by hand, and that is the only reason the
answer can be trusted: *a health field somebody has to keep current is a health
field that is permanently green.*

#figure(
  table(
    columns: (1fr, 16mm, 1fr),
    align: (left + top, center + top, left + top),
    table.header([Deduction], [Cost], [Why weighted this way]),
    [Silent three weeks], [−45],
      [The shape of a deal that has ended without either side saying so.],
    [Silent two weeks], [−30], [The same signal, earlier.],
    [Silent one week], [−15], [Noticeable, not yet alarming.],
    [Payment outstanding], [−20],
      [The heaviest single deduction: the only obligation with a deadline.],
    [Unanswered questions], [−15],
      [Counted once however many there are — that something is owed is the
       signal, not the quantity.],
    [Open document requests], [−15], [The same reasoning, other obligation.],
    [Approved, never contacted], [−15],
      [The most common stall, and the one the pipeline exists to catch.],
    [Terms awaiting acceptance], [−10], [Something on the table nobody answered.],
  ),
  caption: [The score starts at 100 and is spent down by named problems. A
    concluded relationship scores 100 and is labelled "Concluded" rather than
    marked down for silence it is entitled to.],
)

*The direction of the model is the design decision.* A score that accumulated
points for activity would reward noise and penalise two people who agreed to
talk again next Tuesday. Spending down from full marks means a quiet week with
nothing outstanding costs nothing, and every deduction can be named to the person
who asks why.

Bands follow from the score: 75 to 100 is healthy, 45 to 74 is slowing, below 45
is stalled.

=== Next steps, and the stalls they exist to catch

The room also tells *this viewer* what they owe, derived from the same state, so
neither party has to maintain a task list to know whose move it is.

Money owed comes first — an investor with an open ask has one job, and burying
it under "answer a question" would be a strange thing for a funding platform to
do. After that: review a request, answer questions, supply documents, read
messages, make contact.

Two of the steps exist because of stalls this platform *introduced*. A founder
who accepted a backer and never contacted them is the oldest failure in the
model. A deal talked through but never asked for is the newer one, created by
separating the request for money from the acceptance of the commitment — and it
is given the same treatment rather than left as a cost of the design.

#let _pair(a, b, cap) = figure(
  grid(
    columns: (1fr, 1fr), column-gutter: 3mm,
    image("/assets/screenshots/" + a, width: 100%),
    image("/assets/screenshots/" + b, width: 100%),
  ),
  caption: cap,
)

#_pair("dealroom-investor-en-light.png", "dealroom-founder-en-light.png",
  [The same room, the same relationship, from both sides. The header, the
   figures and the timeline are identical; the actions are not. Only the founder
   can move the stage and request funds, and only the founder is shown the fee
   breakdown — because the fee comes out of the founder's proceeds and the
   investor pays the same amount either way.])

#_pair("dealroom-investor-ar-dark.png", "dealroom-founder-ar-dark.png",
  [Both sides again in Arabic on the dark token set. The currency figures and
   the transaction reference stay left-to-right inside right-to-left text; the
   layout mirrors around them.])

=== Timeline and private notes

The timeline is *not* a table. It is assembled at read time from the questions,
the document requests, the stage history, the funding request and the payment
transactions — the same derive-don't-store rule as the analytics section, applied
to a narrative rather than to a number. An event cannot be missing from it
because nobody remembered to write it there.

Each side also keeps a private note on the relationship, scoped to its author.
There is no route that returns the other side's.

== Administrative Workflow: Review and Moderation

#full-page-figure(
  "/assets/diagrams/out/flow-moderation.svg",
  caption: [The review decision. Both branches write one status column and one
    audit row. The detached panel lists the two columns a review can never
    reach — it is drawn apart from the flow because nothing in the flow connects
    to it, and that disconnection is what makes re-approval after an edit safe.],
)

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
    [Audit], [Administrative actions from `AdminAuditLog`, with the reason
      given, the before and after of what changed, and the address it came
      from.],
    [Search], [One query across users, ventures and relationships.],
    [User overview], [Everything the platform holds about one account, on one
      page.],
    [Growth and alerts], [Derived platform trends, and the conditions worth
      surfacing.],
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

=== The audit record holds a diff, not a sentence

An audit row carries the acting administrator, the action, the target, the
*reason* given, the state *before* and *after* the change, and the address the
request arrived from. A status field with a timestamp answers "something
happened"; a diff answers "what was it before, and what is it now" — which is
the question actually asked when a decision is questioned months later.

=== One administrator is primary

Administrators can create other administrators, and an account that can create
can also remove. That leaves an obvious failure: a platform with nobody in
charge of it.

One administrator is therefore marked *primary* and cannot be removed by another;
the role transfers rather than disappearing. And an account created by an
administrator carries a *must change password* flag, so a credential set by one
person cannot remain in use by another.

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

#full-page-figure(
  "/assets/diagrams/out/flow-derivation.svg",
  caption: [What is written and what is computed. Only the left column is
    stored; everything on the right is calculated at read time. No box on the
    left is a counter.],
)

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
