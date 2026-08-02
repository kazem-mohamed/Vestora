#import "/lib/vestora.typ": *
#import "/lib/theme.typ": *

= Payment Architecture <ch:payments>

#note[
  *Scope of this chapter, stated first.* The platform runs against a *simulated*
  payment provider by default. A Stripe-compatible provider — including
  signature-verified, idempotent webhook handling — is implemented and selected
  by configuration, but the system has not been operated against a live
  merchant account. §11.9 states precisely which paths have been exercised and
  which have not. Nothing in this chapter claims a live integration.
]

== Money Flow and Domain Model

A commitment passes through four objects, and the reason there are four rather
than one is that each records something the previous cannot.

#figure(
  table(
    columns: (40mm, 1fr),
    align: (left + top, left + top),
    table.header([Object], [What it records, and why it is separate]),
    [`Investment`],
    [An intention, and whether it has been approved. It exists before any money
     is involved and may never be settled.],
    [`FundingRequest`],
    [An attempt to settle a specific investment, within a time box. It has its
     own expiry because a checkout that is never completed must not hold a
     claim indefinitely.],
    [`PaymentTransaction`],
    [What a provider actually did: amount, fee, provider name, provider
     reference, status. This is the only object that constitutes evidence of
     settlement.],
    [`PaymentEvent`],
    [One row per provider callback, carrying the provider's event identifier.
     Its existence is what makes duplicate delivery detectable.],
  ),
  caption: [The four objects in the funding chain and the distinct fact each
    holds.],
)

The chain collapses easily and wrongly. A single `paid` flag on the investment
would remove three objects and, with them, the ability to answer: when did this
expire, which provider handled it, what fee was taken, and have we already
processed this callback.

== Provider Abstraction

The interface was given in §5.7. Its defining property is negative: it mentions
no domain concept. It knows nothing of ventures, investors or funding targets.
It performs three operations — create a checkout, read a session result, refund
— and returns provider-neutral types.

Everything that constitutes a rule lives above it:

#figure(
  table(
    columns: (36mm, 1fr),
    align: (left + top, left + top),
    table.header([Component], [Owns]),
    [`PaymentService`],
    [The lifecycle: what may be checked out, what a callback is permitted to
     change, when a transaction becomes settled.],
    [`FundingMath`],
    [The definition of what a venture has raised. One implementation, one
     answer.],
    [`IPaymentProvider`],
    [Transport only. Two implementations, neither of which contains a rule.],
    [`PaymentExpirySweeper`],
    [Expiry of abandoned checkouts, running outside the request path.],
  ),
  caption: [Where payment responsibility lives.],
)

The consequence is the point of the design: because the rules sit above the
interface, the simulated provider exercises *the same rules* as the Stripe
provider. It is a test surface, not a stand-in — and that distinction is what
makes the verification in @ch:testing meaningful without a merchant account.

== Checkout Sequence

+ An investor commits to a venture. An `Investment` is created in a pending
  state. No money is involved yet.
+ The founder or an administrator approves the investment. It is now approved
  — and still not funded.
+ The investor opens checkout. `PaymentService` validates that the investment
  is approved, unexpired and not already settled, then creates a
  `FundingRequest` with an expiry and asks the configured provider for a
  checkout session.
+ The provider returns a session identifier and a URL. A `PaymentTransaction`
  is written in a pending state, stamped with the provider's name.
+ The investor completes payment on the provider's surface. No card data
  touches the platform.
+ The provider calls back. The callback is verified (§11.4), deduplicated
  (§11.5), and — only then — the transaction is marked settled.
+ Funding totals change. Not because a counter was incremented, but because the
  set of settled transactions that `FundingMath` reads over is now different.

Step seven is the whole design in one sentence. There is no moment at which
something is "added to the total", because there is no total to add to.

#full-page-figure(
  "/assets/diagrams/out/seq-payment.svg",
  caption: [The funding path end to end. Signature verification precedes every
    state change, the unique event identifier makes duplicate delivery a no-op,
    and the total is derived at the end rather than incremented along the way.],
)

== Webhook Handling and Signature Verification

A webhook endpoint is unauthenticated by necessity — the provider holds no
token — which makes it the most exposed surface in the system. Anyone can post
to it.

The defence is signature verification. The provider signs each payload with a
shared secret; the endpoint recomputes the signature over the raw body and
compares. Three details make this correct rather than merely present:

+ *Verification happens over the raw request body*, before any parsing.
  Deserialising and re-serialising changes bytes, and the signature is over
  bytes.
+ *Verification precedes every state change.* An unverified payload is rejected
  and logged, and no lookup is performed on its contents.
+ *The comparison is constant-time.* A short-circuiting comparison leaks
  signature bytes through timing.

The verifier is implemented directly rather than taken from a vendor SDK. This
was a deliberate choice with a real cost — an SDK would have been fewer lines
and less risk — and a real benefit: the mechanism is understood and documented
rather than trusted, which is the difference between a system the team can
defend in a viva and one it cannot.

== Idempotency and Replay Safety

Providers retry. A callback that receives no response, or a slow response, will
arrive again — and a payment system that processes the same event twice has
created money.

`PaymentEvent` carries the provider's event identifier under a uniqueness
constraint. Processing is therefore: attempt to record the event; if it already
exists, acknowledge and stop.

#figure(
  ```cs
  // The event row is the idempotency key. Recording it and acting on it
  // happen in one transaction, so a crash between the two is impossible.
  if (await _db.PaymentEvents.AnyAsync(e => e.ProviderEventId == evt.Id, ct))
      return Ok();          // already handled — acknowledge and stop
  ```,
  caption: [Duplicate suppression. The uniqueness constraint, not the check,
    is what makes this safe under concurrency.],
)

The check alone would leave a race: two concurrent deliveries could both pass it
before either wrote. The constraint closes that race — the second insert fails,
and the failure is the correct outcome rather than an error.

Acknowledging an unknown or already-collected event with `200` rather than an
error is also deliberate: an error response causes the provider to retry
indefinitely for an event that will never become processable.

== Payment State Machine

#figure(
  table(
    columns: (30mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([State], [Meaning], [Exits to]),
    [`Pending`], [Checkout created, provider not yet resolved.],
      [`Settled`, `Failed`, `Expired`],
    [`Settled`], [Provider confirmed payment. Counts toward funding.],
      [`Refunded`],
    [`Failed`], [Provider declined. Does not count.], [— (a new request may be
      opened)],
    [`Expired`], [The time box elapsed with no resolution.], [—],
    [`Refunded`], [Settled then reversed. No longer counts.], [—],
  ),
  caption: [Payment transaction states. Only `Settled` contributes to funding.],
)

#figure(
  image("/assets/diagrams/out/state-payment.svg", width: 58%),
  caption: [Payment transaction states.],
)

Exactly one state contributes to a funding total. That is the entire integrity
rule, and it is expressible in one sentence because the model was built to make
it so.

== Funding Integrity Model

Three properties hold, and each is enforced structurally.

/ Approved is not funded: They are different fields on different objects. There
  is no code path that can conflate them because there is no shared field to
  conflate.

/ Totals cannot drift: There is nothing to drift. A total is a query over
  settled transactions, computed in one place. Two callers cannot disagree
  because there is one implementation.

/ Duplicate settlement is impossible: The uniqueness constraint on the provider
  event identifier prevents a second processing of the same event, at the
  database rather than in application logic.

The cost is a read-time aggregation on every page that displays funding
progress — which is the hottest read path in the platform. §17.4 measures it
and §17.5 describes the caching applied. That cost was accepted knowingly, and
it is the correct trade: a stale cached number is recoverable, a drifted stored
number is not.

== Expiry, Refunds and Reconciliation

*Expiry.* Checkouts hold a time box, and abandoned ones are swept by a
background component rather than left to be noticed on the next read. Without
this, an abandoned checkout would hold an unresolved claim indefinitely.

*Fees.* The platform fee is configuration expressed in basis points, and it is
stored per transaction rather than recomputed. A transaction must remain
interpretable after the fee schedule changes; recomputing it would silently
rewrite history.

*Refunds.* A refund is a transition, not a deletion. The transaction stays and
changes state, so the record of what happened survives.

*Reconciliation.* Because every transaction carries its provider name and the
provider's own reference, a settled set can be compared line by line against a
provider's report. This is the property that makes the model auditable, and it
is why `Provider` is stored on every row rather than inferred from
configuration — configuration changes, history must not.

== Environment Separation

Provider selection is a startup decision driven by configuration. The default is
the simulated provider; setting the provider to Stripe and supplying the secrets
selects the Stripe-compatible implementation. Secrets are never committed, and
the application refuses to start if a required secret is absent rather than
falling back to a placeholder (§16.6).

*What has been exercised.* The full domain path — commitment, approval,
checkout creation, callback verification, deduplication, settlement, expiry
sweeping, refund transition and funding recomputation — has been exercised
end to end against the simulated provider. Because the rules sit above
`IPaymentProvider` (§11.2), that path is the same path the Stripe provider
would take.

*What has not.* Live network interaction with Stripe's API, real card
authorisation, provider-side dispute handling, and settlement timing under
production conditions. These require a merchant account the project does not
hold. They are listed as limitations in §19.4 and as the first item of future
work in §20.3 — not described as complete.
