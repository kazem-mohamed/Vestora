#import "/lib/report.typ": *
#import "/lib/theme.typ": *

#report-cover(
  number: 7,
  title: "Commitment & Pipeline",
  subtitle: "An intention is not a payment, and the platform never lets the two become one number",
  date: "September 2026",
)

#show: report.with(number: 7, name: "Commitment & Pipeline")

= Introduction

Report 6 left an investor who has found a venture they want to back. This report
covers what happens between that moment and the moment money is involved — and it
is deliberately the whole report, because *that gap is where every expensive
mistake in this system was made.*

An investor decides to back a venture. The founder decides whether to accept.
Those are two events, separated in time, and neither of them is a payment. The
payment is Report 8.

The single idea this report exists to defend is that those events stay separate
in the schema, in the arithmetic, and on every screen where a number appears.

= Objective

*Model a commitment as what it is.* Not a purchase. A commitment has an
expression of intent and an acceptance — two distinct events, each with its own
moment and its own record, and neither of which moves money.

*Report only money that exists.* A funding figure shown to an investor must
correspond to money that actually moved. Nothing else may contribute to it, and
no code path may be able to make it drift.

*Compute, never store.* What a venture has raised is derived from settled
payments at read time. There is no total to maintain, and therefore no total that
can silently disagree with reality.

= Features Delivered

#figure(
  table(
    columns: (42mm, 1fr),
    align: (left + top, left + top),
    table.header([Feature], [What it does]),
    [Commitment], [An investor expresses intent to fund a venture with a stated
      amount. No money is involved.],
    [Founder approval], [The founder accepts or declines the commitment. Still no
      money.],
    [Decline with retention], [A declined commitment is marked, never deleted —
      the record of the request survives the refusal.],
    [Capacity control], [A round stops accepting new commitments once the goal is
      *committed*, not once it is paid.],
    [Derived funding totals], [What a venture has raised is computed from settled
      payments, never stored.],
    [Investor pipeline], [Commitments grouped by the state they are in.],
    [Investor portfolio], [What is actually held, as distinct from what was
      promised.],
    [Founder requests], [Incoming commitments awaiting a decision.],
    [Founder funding view], [The same two figures from the other side of the
      relationship.],
  ),
  caption: [Features delivered in this part. Everything that touches a payment
    provider is Report 8.],
)

= The Central Distinction

Everything in this report follows from one rule.

#delivered[
  *An approved commitment is not a funded one.* Only a settled payment counts
  toward a venture's funding total. The two figures are shown separately,
  permanently, everywhere they appear.
]

The temptation to merge them is strong. One number is simpler to display and
simpler to store. It is also wrong *in the direction that matters most*: it would
show a venture as funded when nothing had been paid, to an investor deciding
whether to pay.

That is not a cosmetic error. It is the platform telling someone that other
people have already backed a venture in order to persuade them to back it — which
is the precise mechanism the system exists to make unnecessary.

== Seven states, one of which is money

Where a single relationship sits on the money axis is *derived*, not stored — a
stored column would be a fifth place for the numbers to disagree.

#figure(
  table(
    columns: (28mm, 1fr, 26mm),
    align: (left + top, left + top, left + top),
    table.header([State], [Means], [Owned by]),
    [Requested], [An investor has asked. Nothing is reserved and the founder has
      not answered.], [7],
    [Committed], [The founder accepted. *Still not funded.*], [7],
    [Declined], [The founder refused. The row is kept.], [7],
    [Payment due], [A funding request is open, with an expiry.], [8],
    [Processing], [A provider session exists and has not resolved.], [8],
    [Funded], [A payment settled. *The only state that is money.*], [8],
    [Refunded], [A settled payment was reversed.], [8],
  ),
  caption: [The seven relationship states, and which report owns each. This
    report owns the three that exist before a provider is involved.],
)

#figure(
  ```cs
  // Where one relationship sits on the money axis, derived rather than stored.
  // A stored column would be a fifth place for the numbers to disagree.
  if (hasSucceededPayment)                       return StateFunded;
  if (investmentStatus == PipelineStages.Declined) return StateDeclined;
  if (hasProcessingPayment)                      return StateProcessing;
  if (hasOpenRequest)                            return StatePaymentDue;
  if (hasRefundedPayment)                        return StateRefunded;
  if (investmentStatus == "Approved")            return StateCommitted;
  return StateRequested;
  ```,
  caption: [`StateOf`. The order of the tests is the precedence rule: settled
    money outranks every other signal, so a relationship that has been paid reads
    as funded even while a later request is open against it.],
)

== Capacity is measured in commitments, not payments

A round stops accepting new commitments once the goal is *committed*, not once
it is paid. This looks like the wrong choice and is the right one.

If capacity were measured in settled payments, a venture whose goal was fully
committed would keep accepting new commitments while the earlier investors were
still at checkout — and would then over-fund, or would have to refuse people who
had already been approved. Measuring capacity at the commitment step means the
platform makes a promise it can keep.

The cost is that an abandoned checkout holds capacity until it lapses, which is
exactly why the funding request carries an expiry and why a sweeper exists.
Report 8 owns both.

= The Funding Chain

A commitment does not become a payment in one step. It passes through four
objects, and each one holds a fact the previous one cannot.

#figure(
  table(
    columns: (42mm, 1fr, 16mm),
    align: (left + top, left + top, center + top),
    table.header([Object], [The fact it holds], [Owned by]),
    [`Investment`], [An intention, and whether the founder accepted it. Exists
      before any money is involved and may never settle.], [7],
    [`FundingRequest`], [An attempt to settle a specific commitment, *within a
      time box*.], [8],
    [`PaymentTransaction`], [What a provider actually did: amount, fee, provider
      name, reference, status. The only evidence of settlement.], [8],
    [`PaymentEvent`], [One row per provider callback, carrying the provider's own
      event identifier.], [8],
  ),
  caption: [The four objects and why each is separate. This report owns the
    first; it is the only one that exists before money does.],
)

#full-page-figure(
  "/assets/diagrams/out/erd-funding.svg",
  landscape: false,
  caption: [The funding chain. Identity and the venture sit at the top; each step
    down holds something the step above cannot express.],
)

Collapsing this into a single `paid` flag on the investment would remove three
objects and, with them, the ability to answer four questions: when did this
expire, which provider handled it, what fee was taken, and have we already
processed this confirmation.

= Funding Is Arithmetic, and It Lives in One Place

Every monetary figure the product displays is produced by one service.
`FundingMath` is the only place in the codebase permitted to compute what a
venture has raised, and it performs no I/O — it is arithmetic over rows.

#figure(
  table(
    columns: (26mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Figure], [Means], [Counted from]),
    [Interest], [Requests the founder has not decided on yet. *Not capital.*],
      [`Investment.Status == "Pending"`],
    [Committed], [The founder accepted the relationship. *Still not capital.*],
      [`Investment.Status == "Approved"`],
    [Payment due], [An agreed amount with an open funding request — capital,
      promised.], [`FundingRequest.Status == Open`],
    [Funded], [A payment settled. *This, and only this, is money.*],
      [`PaymentTransaction.Status == Succeeded`],
  ),
  caption: [The four figures. Each is a separate predicate over a separate
    table, which is what makes them impossible to conflate by accident.],
)

#note[
  *A precision about the ordering.* The project states the rule *Interest ≥
  Committed ≥ Funded*, and read as a description of one relationship's journey it
  is right: a request is made, then accepted, then paid.

  Read as arithmetic over a venture's totals it does not hold, because `Interest`
  and `Committed` are computed from *disjoint* sets — pending requests and
  approved ones. A venture whose every request has been accepted has an interest
  total of zero and a committed total that is not. The two figures are stages a
  commitment passes *through*, not nested quantities, and the interface treats
  them that way.
]

Two consequences follow from putting this in a service rather than in a query.

*The definition cannot fork.* The venture listing in Report 6, the investor's
portfolio, the founder's funding view and the administrator's revenue report all
call the same code. A change to what "funded" means changes all four at once, or
none.

*It is testable without a database.* Because `FundingMath` is arithmetic rather
than a query, the automated test suite exercises it directly. That is why the
funding rules are among the few behaviours in this series proven by a test rather
than by inspection.

= Interface

Four investor surfaces exist because there are four different questions, and one
combined view would answer none of them clearly.

#shot(
  "/assets/screenshots/invest-overview.png",
  [The investor's overview for a new account. *Funded* and *Approved commitments*
   are separate tiles — one counting settled payments, the other counting
   commitments — and they stay separate even when both read zero, so the
   distinction is legible before there is any data to disambiguate it.],
)

#shots(
  "/assets/screenshots/commit-pipeline-en-light.png",
  "/assets/screenshots/commit-pipeline-ar-dark.png",
  [The pipeline: commitments grouped by the state they are in, in both languages
   and themes. This is the surface that makes the five states above visible to
   the person whose money is involved.],
)

#shots(
  "/assets/screenshots/settled-portfolio-en-light.png",
  "/assets/screenshots/settled-portfolio-ar-dark.png",
  [The portfolio — what is actually *held*, as distinct from what was promised.
   The holding shown here appeared only when a payment settled; while the same
   commitment sat approved and unpaid, this surface was empty. That emptiness was
   not a missing feature. It was the rule this report opens with, rendered.],
)

#shot(
  "/assets/screenshots/founder-requests.png",
  [The founder's incoming commitments, awaiting a decision. Approving one does
   not collect money — it permits the investor to proceed to checkout.],
)

#shots(
  "/assets/screenshots/venture-ladder-en-light.png",
  "/assets/screenshots/venture-ladder-ar-dark.png",
  [The founder's funding view: the same two figures from the other side of the
   relationship. A wide gap between committed and settled is *actionable
   information* — it says approvals are not converting — and a single combined
   number would hide exactly that.],
)

= Data

#figure(
  table(
    columns: (36mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Table], [Holds], [Rule enforced]),
    [`Investments`], [Amount, approval status, investor and venture.],
      [Restrict on investor delete — a record of a commitment must survive the
       account that made it.],
  ),
  caption: [The one table this report owns. The other three in the chain belong
    to Report 8. *No table in this group stores an aggregate.*],
)

Three column-level decisions carry across the whole funding chain and are stated
here because they are decided here.

*Money is `decimal`, never floating point.* Binary floating point cannot
represent most decimal fractions exactly, and an accumulated rounding error in a
funding total is precisely the class of defect this part of the system exists to
prevent. Every money column carries an explicit precision and scale.

*A declined commitment is marked, never deleted.* Setting a status preserves the
fact that the request was made and answered. Deleting the row would make a
declined commitment indistinguishable from one that never happened.

*No aggregate is stored anywhere in the chain.* This is the subject of the second
challenge below, and it is the single most consequential schema decision in the
report.

= Backend

#figure(
  ```cs
  /// Founder-accepted relationships. Named "committed" and never "raised":
  /// it is a stated intention with a person attached, not a transfer.
  public static readonly Expression<Func<Investment, bool>> IsCommitted =
      i => i.Status == "Approved";

  /// Money actually received by a venture. Refunded transactions leave the
  /// Succeeded state, so they fall out of this sum with no special case —
  /// reversal is subtraction by construction.
  public static readonly Expression<Func<Project, decimal>> FundedOf =
      p => p.Investments
            .SelectMany(i => i.FundingRequests)
            .SelectMany(f => f.Transactions)
            .Where(t => t.Status == PaymentStatus.Succeeded)
            .Sum(t => (decimal?)t.Amount) ?? 0m;
  ```,
  caption: [`FundingMath`. Everything is an `Expression`, so it translates to SQL
    rather than pulling rows into memory to add them up. The `?? 0m` matters: a
    venture with no transactions has raised zero, not null.],
)

Two details in that excerpt are load-bearing.

*A refund needs no special case.* A reversed transaction leaves the `Succeeded`
state, so it drops out of the sum on its own. Subtraction is a consequence of the
predicate rather than a second code path that could disagree with the first.

*The traversal is three levels deep* — investment, then funding request, then
transaction — because that is the chain from Report 7 to Report 8. A shortcut
from investment straight to transaction would compute the same number today and
would stop being able to answer *which attempt* settled it.

#figure(
  ```cs
  // This exists because the expressions above cannot be spliced into a larger
  // projection — EF translates an expression tree it is handed, not a C# call to
  // something that returns one. Rather than paste the same sums into every DTO
  // and hope they stay identical, call sites project their own fields and ask
  // this for the money. It costs one extra round trip per screen and removes the
  // only class of bug that actually matters here: two surfaces disagreeing about
  // how much a venture has raised.
  public static async Task<Dictionary<int, FundingSummary>> SummariesAsync(
      AppDbContext db, IReadOnlyCollection<int> projectIds, CancellationToken ct)
  ```,
  caption: [The shared loader. Its doc comment is the design rationale: an extra
    round trip is accepted in exchange for removing the possibility of two
    screens disagreeing.],
)

#figure(
  ```cs
  // A founder cannot back their own venture. This is a comparison between two
  // identities, so a role check alone would not catch it — an Innovator who is
  // also an Investor passes every role gate.
  if (project.OwnerId == callerId)
      return ServiceResult.Forbidden("A founder cannot back their own venture.");

  // Capacity is measured in approved commitments, not settled payments.
  if (FundingMath.Committed(project) + dto.Amount > project.FundingGoal)
      return ServiceResult.Conflict("This round is fully committed.");
  ```,
  caption: [Creating a commitment. Two refusals, and neither is a role check.],
)

The second excerpt is where Report 3's rule about ownership becomes concrete. A
user may hold both roles: the same account can raise a round and back someone
else's. Every role gate in the platform would pass for such an account backing
its own venture. Only a comparison of two identifiers refuses it.

= Key Endpoints

#figure(
  table(
    columns: (16mm, 54mm, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Method], [Path], [Purpose]),
    [`POST`], [`api/investor/{projectId}/support`], [Express a commitment.
      Investor role, and refused if the caller owns the venture.],
    [`POST`], [`api/notification/{id}/approve-support`], [The founder accepts —
      *from the notification that told them about it.*],
    [`POST`], [`api/investor/{investmentId}/reject-support`], [Decline. Sets
      status; deletes nothing.],
    [`GET`], [`api/investor/{investorId}/supported-projects`], [The investor's
      pipeline.],
    [`GET`], [`api/investor/{investorId}/investment-summary`], [Portfolio
      totals.],
    [`GET`], [`api/investor/{projectId}/my-support`], [This investor's
      relationship with one venture.],
    [`GET`], [`api/investor/{projectId}/backers`], [Who has backed a venture.],
    [`GET`], [`api/dashboard/investor`], [The overview tiles.],
    [`GET`], [`api/capital/my-ventures`], [The founder's side of the same
      relationships.],
  ),
  caption: [Principal endpoints in this part. Every one checks ownership as well
    as role — a founder may act only on commitments against their own venture.],
)

The second row is worth pausing on, because it is not where an approval endpoint
would be expected. *A founder accepts a commitment from the notification that
told them it existed*, rather than from a dedicated investment route. The design
follows the founder's actual path — the notification is how they learn of the
request, so it is where the decision is offered. The cost is that the approval
rule lives on a controller whose name does not suggest it, which is a discovery
problem for a maintainer rather than for a user.

= Libraries Used in This Part

#figure(
  table(
    columns: (44mm, 1fr),
    align: (left + top, left + top),
    table.header([Library], [Role here]),
    [`Entity Framework Core`], [Maps the commitment and computes the derived
      aggregates as part of the query that needs them.],
    [`FluentValidation`], [Refuses a malformed commitment at the boundary —
      non-positive amounts, missing venture.],
    [`xUnit`], [The automated suite. `FundingMath` is one of the two subjects it
      covers, and the ordering rule is asserted directly.],
  ),
  caption: [Libraries in this part. No payment library appears here — that
    boundary belongs to Report 8.],
)

= Challenges

#challenge("Approval was silently counting as funding")[
  A founder approved a commitment and the venture's funding progress increased.
  No money had been paid. Investors were seeing progress that nothing supported.

  *Diagnosis.* Not a bug in the approval handler. A defect in the *model*: the
  early schema carried a single amount on the investment and no separate concept
  of settlement, so "approved" and "paid" had nowhere to live separately.

  *Solution.* Restructure rather than patch. Introduce an approval status
  distinct from settlement, split the chain into the four objects above, and
  remove the stored total entirely in favour of derivation.

  *The lesson that generalised.* When a defect is possible, ask whether the model
  permits it. If it does, fixing the instance leaves the class — and this is the
  second time in this series that answer produced a migration rather than a
  patch. The first was Report 4.
]

#challenge("A stored funding total can drift, and nothing notices")[
  Any code path that writes a payment without updating the total, or updates it
  twice, leaves a number that no longer corresponds to reality — and because it
  is stored, nothing detects the discrepancy.

  *Solution.* Store no aggregate at all. Totals are computed from settled
  transactions at read time, in one place. There is one definition of what a
  venture has raised, and no second copy to disagree with it.

  *Cost, accepted knowingly.* A read-time aggregation on the platform's
  most-visited page — the listing query of Report 6 pays it on every row. That
  cost was measured and mitigated with a projection and a composite index. The
  trade is deliberate: *a stale cache is recoverable; a drifted stored number is
  not.*
]

#challenge("A role check would have let a founder back themselves")[
  An account may hold both roles. Every role gate in the platform passes for an
  Innovator who is also an Investor, including on their own venture.

  *Solution.* The refusal is a comparison of two identifiers rather than a role
  test. It is stated here because it is the clearest instance of the rule that
  runs through the whole series: *a role check is not an ownership check, and
  money-adjacent endpoints need both.*
]

= How This Fits With the Rest of the System

Only the direct relationships are listed.

#figure(
  table(
    columns: (32mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Report], [Relationship], [Boundary]),
    [3 · Identity & Sessions],
      [*Depends on it.* The rule that a founder cannot back their own venture is
       a comparison between two identities established there.],
      [Money-adjacent endpoints re-check account state rather than trusting the
       access token alone.],
    [4 · Ventures & Lifecycle],
      [*Depends on it.* A commitment attaches to a venture and reads its funding
       target.],
      [The funding pipeline writes `Stage` and nothing else — never moderation or
       lifecycle.],
    [6 · Discovery & Engagement],
      [*Serves it.* Every funding figure on every card comes from the service
       defined here.],
      [Discovery computes nothing; it calls `FundingMath` like everyone else.],
    [8 · Payments],
      [*Continues this report.* An approved commitment is what a checkout is
       opened against.],
      [Only a settled transaction there changes the `Funded` figure defined
       here.],
  ),
  caption: [Direct relationships only.],
)

= Summary

#delivered[
  A commitment modelled as an intention rather than a purchase, with approval as
  a separate event that moves no money and a decline that is recorded rather than
  erased. Capacity measured in approved commitments, so a fully committed round
  stops accepting new ones. Four funding figures — interest, committed, payment
  due, funded — each a separate predicate over a separate table, computed in one
  service and stored nowhere. Seven relationship states derived from those rows
  rather than held in a column. Investor and founder surfaces that keep committed
  and settled visually separate, including when both are zero.

  *Verified.* `FundingMath` is one of the two subjects of the automated test
  suite, which makes its arithmetic among the few claims in this series proven
  rather than inspected.
]

*Still open in this part.* A commitment carries no legal weight: the platform
records that an investor intends to fund and that a founder accepted, and
generates no instrument. Capacity held by an abandoned checkout is released only
when the sweeper runs, so a round can appear fully committed for a short window
after an investor has walked away — Report 8 states the window.

*What this enables.* Report 8 can now assume an approved commitment: a specific
amount, on a specific venture, accepted by its founder, and waiting for the only
event that will change a funding total.
