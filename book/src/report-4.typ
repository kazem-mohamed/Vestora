#import "/lib/report.typ": *
#import "/lib/theme.typ": *

#report-cover(
  number: 4,
  title: "Investment & Payments",
  subtitle: "How money moves, and how the platform stays honest about it",
  date: "September 2026",
)

#show: report.with(number: 4, name: "Investment & Payments")

= Introduction

This is the part of the system where money is involved, and it is therefore the
part where being wrong is most expensive.

An investor decides to back a venture. The founder decides whether to accept.
The investor pays. The venture's funding progress moves. Four sentences — and
almost every design decision in this report exists because those four events are
*separate*, happen at different times, and must never be confused with one
another.

The report covers the commitment, the founder's approval, the payment itself,
the provider integration behind it, and the rule that governs what a venture has
actually raised.

= Objective

*Model a commitment as what it is.* Not a purchase. A commitment has an
expression of intent, an acceptance, and a settlement — three distinct events,
each with its own moment and its own record.

*Report only money that exists.* A funding figure shown to an investor must
correspond to money that actually moved. Nothing else may contribute to it, and
no code path may be able to make it drift.

*Keep payment rules independent of the payment provider.* The platform's
definition of a valid, settled investment must live in the platform, not inside
an integration. If changing provider could change what "funded" means, the
definition was in the wrong place.

*Survive a provider that repeats itself.* Payment providers retry. A system that
processes the same confirmation twice has created money that does not exist.

= Features Delivered

#figure(
  table(
    columns: (44mm, 1fr),
    align: (left + top, left + top),
    table.header([Feature], [What it does]),
    [Commitment], [An investor expresses intent to fund a venture with a stated
      amount. No money is involved.],
    [Founder approval], [The founder accepts or declines the commitment. Still
      no money.],
    [Capacity control], [A round stops accepting new commitments once the goal
      is committed, not once it is paid.],
    [Checkout], [An approved commitment can be taken to payment, within a time
      box.],
    [Provider abstraction], [Two interchangeable providers behind one
      interface; selection is configuration.],
    [Webhook handling], [Provider confirmations are signature-verified before
      any state changes.],
    [Duplicate protection], [A repeated confirmation is recognised and
      ignored.],
    [Derived funding totals], [What a venture has raised is computed, never
      stored.],
    [Expiry sweeping], [An abandoned checkout lapses and releases its share of
      the round.],
    [Refunds], [A settled payment can be reversed; the record survives the
      reversal.],
    [Platform fee], [A percentage taken on settled payments only, stored per
      transaction.],
    [Investor surfaces], [Pipeline, payments, portfolio and activity — four
      views because there are four questions.],
  ),
  caption: [Features delivered in this part of the system.],
)

= The Central Distinction

Everything in this report follows from one rule.

#delivered[
  *An approved commitment is not a funded one.* Only a settled payment counts
  toward a venture's funding total. The two figures are shown separately,
  permanently, everywhere they appear.
]

The temptation to merge them is strong. One number is simpler to display and
simpler to store. It is also wrong in the direction that matters most: it would
show a venture as funded when nothing had been paid, to an investor deciding
whether to pay.

== Five states, one of which is money

#figure(
  table(
    columns: (30mm, 1fr, 34mm),
    align: (left + top, left + top, left + top),
    table.header([State], [Means], [Moved by]),
    [Committed], [An investor has expressed intent. Nothing is reserved.],
      [Investor],
    [Approved], [The founder has accepted the commitment. *Still not funded.*],
      [Founder],
    [In checkout], [A funding request is open, with an expiry, and a provider
      session exists.], [Investor],
    [Funded], [A payment settled. *The only state that counts.*],
      [Provider confirmation],
    [Lapsed], [The checkout expired, or the provider declined.], [System],
  ),
  caption: [Investment states. Exactly one of them is money.],
)

#figure(
  image("/assets/diagrams/out/state-payment.svg", width: 58%),
  caption: [Payment transaction states. Only `Settled` contributes to a
    venture's total; a refund transitions the row rather than deleting it.],
)

= The Funding Chain

A commitment does not become a payment in one step. It passes through four
objects, and each one holds a fact the previous one cannot.

#figure(
  table(
    columns: (42mm, 1fr),
    align: (left + top, left + top),
    table.header([Object], [The fact it holds]),
    [`Investment`], [An intention, and whether the founder accepted it. Exists
      before any money is involved and may never settle.],
    [`FundingRequest`], [An attempt to settle a specific commitment, *within a
      time box*. Its own expiry is why an abandoned checkout does not hold a
      claim forever.],
    [`PaymentTransaction`], [What a provider actually did: amount, fee,
      provider name, provider reference, status. The only evidence of
      settlement.],
    [`PaymentEvent`], [One row per provider callback, carrying the provider's
      own event identifier. Its existence is what makes a duplicate
      detectable.],
  ),
  caption: [The four objects and why each is separate.],
)

#full-page-figure(
  "/assets/diagrams/out/erd-funding.svg",
  landscape: false,
  caption: [The funding chain. Identity and the venture sit at the top; each
    step down holds something the step above cannot express.],
)

Collapsing this into a single `paid` flag on the investment would remove three
objects and, with them, the ability to answer four questions: when did this
expire, which provider handled it, what fee was taken, and have we already
processed this confirmation.

= How It Works

#full-page-figure(
  "/assets/diagrams/out/seq-payment.svg",
  caption: [The funding path end to end. Signature verification precedes every
    state change; a duplicate event is a no-op; and the total is derived at the
    end rather than incremented along the way.],
)

== Webhook verification

The webhook endpoint is unauthenticated by necessity — the provider holds no
token — which makes it the most exposed surface in the platform. Anyone can post
to it.

Three properties make the defence correct rather than merely present:

+ *Verification runs over the raw request body*, before any parsing.
  Deserialising and re-serialising changes bytes, and the signature is over
  bytes.
+ *Verification precedes every state change.* An unverified payload is rejected
  and logged, and no lookup is performed on its contents.
+ *The comparison is constant-time.* A short-circuiting comparison leaks
  signature bytes through timing.

== Duplicate protection

Providers retry. A confirmation that receives no response, or a slow response,
arrives again.

`PaymentEvent` carries the provider's event identifier under a uniqueness
constraint. Processing is therefore: attempt to record the event; if it already
exists, acknowledge and stop.

The uniqueness constraint — not the check — is what makes this safe. Two
simultaneous deliveries can both pass a check before either writes; the second
*insert* fails, and that failure is the correct outcome.

= Interface

#shot(
  "/assets/screenshots/invest-overview.png",
  [The investor's overview for a new account. *Funded* and *Approved
   commitments* are separate tiles, reading `$0 — 0 settled payment(s)` and
   `$0 — 0 commitments`. They stay separate even when both are zero, so the
   distinction is legible before there is any data to disambiguate it.],
)

#shot(
  "/assets/screenshots/invest-pipeline.png",
  [The pipeline: commitments grouped by the state they are in. This is the
   surface that makes the five states of §4.1 visible to the person whose money
   is involved.],
)

#shots(
  "/assets/screenshots/invest-payments.png",
  "/assets/screenshots/invest-portfolio.png",
  [Payments and portfolio. Settlement history on the left; what is actually
   held on the right. Four investor surfaces exist because there are four
   different questions, and one combined view would answer none of them
   clearly.],
)

#shot(
  "/assets/screenshots/founder-requests.png",
  [The founder's incoming commitments, awaiting a decision. Approving one does
   not collect money — it permits the investor to proceed to checkout.],
)

#shot(
  "/assets/screenshots/founder-funding.png",
  [The founder's funding view. The same two figures from the other side. A wide
   gap between committed and settled is actionable information that a single
   combined number would hide.],
)

= Data

#figure(
  table(
    columns: (40mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Table], [Holds], [Rule enforced]),
    [`Investments`], [Amount, approval status, investor and venture.],
      [Restrict on investor delete — a record of a commitment must survive.],
    [`FundingRequests`], [Amount, status and expiry for one settlement
      attempt.], [Swept on expiry.],
    [`PaymentTransactions`], [Amount, fee, provider name, provider reference,
      status.], [Only `Settled` is countable.],
    [`PaymentEvents`], [One row per provider callback.],
      [`ProviderEventId` unique — the idempotency key.],
  ),
  caption: [Funding tables. *No table in this group stores an aggregate.*],
)

Two column-level decisions are worth naming.

*`Provider` is stored on every transaction*, not inferred from configuration.
Configuration changes; history must not. A transaction always carries the
identity of the system that produced it, so a data set can never become
ambiguous about which rows represent real settlement.

*The fee is stored per transaction*, not recomputed. This is a deliberate
exception to the derive-don't-store rule elsewhere in this report: the fee
schedule is time-varying, and recomputing a historical transaction under today's
rate would silently rewrite what was actually charged.

*Money is `decimal`, never floating point.* Binary floating point cannot
represent most decimal fractions exactly, and an accumulated rounding error in a
funding total is precisely the class of defect this part of the system exists to
prevent.

= Backend

#figure(
  ```cs
  public interface IPaymentProvider
  {
      /// "stripe" or "simulated" — stored on every transaction it handles.
      string Name { get; }

      Task<ProviderCheckout> CreateCheckoutAsync(
          ProviderCheckoutRequest request, CancellationToken ct = default);

      Task<ProviderPaymentResult> GetSessionResultAsync(
          string sessionId, CancellationToken ct = default);

      Task<ProviderRefundResult> RefundAsync(
          string providerPaymentId, decimal amount, string currency,
          CancellationToken ct = default);
  }
  ```,
  caption: [The provider boundary. It mentions no domain concept — no venture,
    no investor, no funding target — only the three operations a payment
    processor performs.],
)

#figure(
  ```cs
  // 1. Verify over the raw bytes, before parsing.
  var raw = await ReadRawBodyAsync(Request, ct);
  if (!_verifier.Verify(raw, Request.Headers["Stripe-Signature"], _secret))
      return BadRequest();          // rejected and logged; nothing is read

  var evt = _verifier.Parse(raw);

  // 2. The event row is the idempotency key. The uniqueness constraint — not
  //    this check — is what makes it safe under concurrency.
  if (await _db.PaymentEvents.AnyAsync(e => e.ProviderEventId == evt.Id, ct))
      return Ok();                  // already handled — acknowledge and stop

  // 3. Only now may state change.
  await _payments.ApplyProviderEventAsync(evt, ct);
  return Ok();
  ```,
  caption: [Webhook handling. Acknowledging a duplicate with `200` is
    deliberate — an error would cause the provider to retry indefinitely for an
    event that will never become processable.],
)

#figure(
  ```cs
  // What a venture has raised. Only Settled contributes; approved commitments
  // and pending, failed, expired or refunded transactions are all excluded.
  // This is the entire integrity rule, expressible in one predicate because
  // the model was built to make it so.
  public static readonly Expression<Func<Project, decimal>> FundedOf =
      p => p.Investments
            .SelectMany(i => i.FundingRequests)
            .SelectMany(r => r.PaymentTransactions)
            .Where(t => t.Status == PaymentStatus.Settled)
            .Sum(t => (decimal?)t.Amount) ?? 0m;
  ```,
  caption: [Funding derivation. The `?? 0m` matters: a venture with no
    transactions has raised zero, not null.],
)

#figure(
  ```cs
  // Capacity is measured against commitments, not settled money. A founder who
  // has accepted the full goal should stop taking new requests even though
  // nobody has paid yet — otherwise the round is oversubscribed the moment
  // those commitments settle, and somebody is turned away after being accepted.
  public static decimal RemainingCapacity(decimal goal, decimal committed) =>
      Math.Max(0m, goal - committed);
  ```,
  caption: [Round capacity. One of the few places where *committed* rather than
    *funded* is the correct measure — and the comment says why.],
)

= Key Endpoints

#figure(
  table(
    columns: (16mm, 48mm, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Method], [Path], [Purpose]),
    [`POST`], [`api/capital/commit`], [Create a commitment. Refused if the
      caller owns the venture.],
    [`POST`], [`api/capital/{id}/approve`], [Founder accepts. *Approval only —
      not funding.*],
    [`POST`], [`api/capital/{id}/decline`], [Founder declines; the row is kept
      for history.],
    [`POST`], [`api/payments/checkout`], [Open a funding request with an expiry
      and a provider session.],
    [`GET`], [`api/payments/session/{id}`], [Read the provider's result for a
      session.],
    [`POST`], [`api/payments/webhook/stripe`], [*Public by necessity.*
      Signature-verified; duplicates ignored.],
    [`POST`], [`api/payments/{id}/refund`], [Reverse a settled payment.],
    [`GET`], [`api/payments/mine`], [The investor's settlement history.],
    [`GET`], [`api/capital/portfolio`], [What the investor actually holds.],
  ),
  caption: [Principal endpoints in this part.],
)

= Libraries Used in This Part

#figure(
  table(
    columns: (40mm, 1fr),
    align: (left + top, left + top),
    table.header([Library], [Role here]),
    [`Stripe.net`], [Types and HTTP client for the Stripe-compatible provider
      implementation. Used for transport only; no domain rule depends on it.],
    [`System.Security.Cryptography`], [The webhook signature verifier is
      implemented directly against HMAC rather than taken from a vendor SDK, so
      the mechanism is understood rather than trusted.],
    [`Entity Framework Core`], [Carries the four-table funding chain and the
      uniqueness constraint that provides idempotency.],
    [`Hosted service (built-in)`], [Runs the expiry sweeper outside the request
      path.],
  ),
  caption: [Libraries introduced in this part.],
)

= Challenges

#challenge("Approval was silently counting as funding")[
  A founder approved a commitment and the venture's funding progress increased.
  No money had been paid. Investors were seeing progress that nothing supported.

  *Diagnosis.* Not a bug in the approval handler. A defect in the *model*: the
  early schema carried a single amount on the investment and no separate concept
  of settlement, so "approved" and "paid" had nowhere to live separately.

  *Solution.* Restructure rather than patch. Introduce an approval status
  distinct from settlement, split the chain into the four objects of §5, and
  remove the stored total entirely in favour of derivation.

  *The lesson that generalised.* When a defect is possible, ask whether the
  model permits it. If it does, fixing the instance leaves the class.
]

#challenge("A stored funding total can drift, and nothing notices")[
  Any code path that writes a payment without updating the total, or updates it
  twice, leaves a number that no longer corresponds to reality — and because it
  is stored, nothing detects the discrepancy.

  *Solution.* Store no aggregate at all. Totals are computed from settled
  transactions at read time, in one place. There is one definition of what a
  venture has raised, and no second copy to disagree with it.

  *Cost, accepted knowingly.* A read-time aggregation on the platform's
  most-visited page. A stale cache is recoverable; a drifted stored number is
  not.
]

#challenge("Providers repeat themselves")[
  A confirmation that times out is sent again. Processing it twice would record
  the same money twice.

  *Solution.* A uniqueness constraint on the provider's own event identifier,
  with the record and the action inside one transaction. A duplicate is
  acknowledged with success and ignored — because an error response would make
  the provider retry forever.
]

#challenge("Payment rules could have ended up inside the integration")[
  If the definition of a valid, settled investment lives inside a provider
  integration, it cannot be tested without that provider, and it changes when
  the provider changes.

  *Solution.* `IPaymentProvider` carries transport only. Every rule lives above
  it. The consequence is that the simulated provider exercises *the same rules*
  as the Stripe-compatible one, which makes it a legitimate test surface rather
  than a stand-in.
]

= How This Fits With the Rest of the System

#figure(
  table(
    columns: (30mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Report], [Relationship], [Boundary]),
    [1 · Identity],
      [A founder cannot invest in their own venture — a rule about two
       identities.],
      [Money-adjacent endpoints re-check account state rather than trusting the
       access token alone.],
    [2 · Ventures],
      [A commitment attaches to a venture and reads its funding target.],
      [This part writes `Stage` and nothing else. It cannot alter moderation or
       lifecycle state.],
    [3 · Discovery],
      [Funding figures appear on every venture card and page.],
      [Discovery *displays* derived figures; it computes none of them.],
    [5 · Real-time],
      [Approval and settlement both generate notifications.],
      [Delivery leaves the request path, so approving a commitment is never as
       slow as notifying about it.],
    [6 · Insight],
      [Platform fee revenue is derived from the same settled transactions as
       funding totals.],
      [Revenue and funding cannot disagree, because they aggregate the same
       rows.],
  ),
  caption: [How the funding chain relates to the rest of the platform.],
)

= Summary

#delivered[
  *The commitment path.* Expression of intent, founder approval, time-boxed
  checkout, provider settlement, expiry sweeping and refunds — five states with
  exactly one of them representing money.

  *Integrity.* No stored aggregate anywhere; totals derived from settled
  transactions through a single service. Duplicate settlement prevented by a
  database constraint rather than an application check. Provider name and fee
  stored per transaction so history stays interpretable.

  *Provider independence.* A three-operation interface carrying no domain
  concept, with two interchangeable implementations selected by configuration.

  *Verified.* The funding rules are covered by automated tests that assert
  directly that an approved but unsettled commitment contributes zero, that a
  refunded transaction is removed from the total, and that capacity is measured
  against commitments rather than settled money.
]

#note[
  *Stated precisely.* The platform runs against the *simulated* provider by
  default. The Stripe-compatible implementation — including signature
  verification and idempotent event handling — is written and selected by
  configuration, but has not been operated against a live merchant account. The
  full domain path has been exercised end to end against the simulated provider,
  and because every rule sits above the provider interface, that is the same
  path the Stripe implementation would take.
]

*Still open in this part.* Live card authorisation, provider-side dispute
handling and real settlement timing are unexercised. Reconciliation against a
provider statement is possible by construction — every transaction carries the
provider's own reference — but has not been performed.

*What this enables.* Money can now move, and the platform can report it
truthfully. Report 5 covers the conversation that happens around a commitment
before it is made.
