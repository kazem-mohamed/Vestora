#import "/lib/report.typ": *
#import "/lib/theme.typ": *

#report-cover(
  number: 8,
  title: "Payments",
  subtitle: "The only event that changes a funding total, and the defences around it",
  date: "September 2026",
)

#show: report.with(number: 8, name: "Payments")

= Introduction

Report 7 left an approved commitment: a specific amount, on a specific venture,
accepted by its founder, and moving no money. This report covers the event that
finally does.

It is the part of the system where being wrong is most expensive, and it is
therefore the part with the most defences per line of code. Three of them are
worth naming before anything else, because everything below is an elaboration of
them. *Nothing may change state before a signature is verified.* *A provider that
repeats itself must not create money twice.* *A rule about what counts as funded
must never live inside a payment integration.*

The platform runs in a *sandbox*. That is not a limitation this report
apologises for — it is stated in Report 1's scope exclusions, enforced by a check
that refuses to start the application on a live key, and repeated here so that no
reader mistakes what follows for a system that has moved real money.

= Objective

*Keep payment rules independent of the payment provider.* The platform's
definition of a valid, settled investment must live in the platform. If changing
provider could change what "funded" means, the definition was in the wrong place.

*Survive a provider that repeats itself.* Payment providers retry. A system that
processes the same confirmation twice has created money that does not exist.

*Make an abandoned attempt harmless.* A checkout nobody completes must release
the capacity it was holding, without anybody intervening.

*Record what happened, not what should have happened.* A terminal transaction row
is never rewritten. A retry is a new row, and the failed attempt stays.

= Features Delivered

#figure(
  table(
    columns: (42mm, 1fr),
    align: (left + top, left + top),
    table.header([Feature], [What it does]),
    [Funding request], [An attempt to settle a specific commitment, within a time
      box.],
    [Checkout], [An approved commitment taken to a provider session.],
    [Provider abstraction], [Two interchangeable providers behind one interface;
      selection is configuration.],
    [Offline simulator], [The default provider. Same rules, same state machine,
      same audit trail, no network.],
    [Webhook handling], [Provider confirmations are signature-verified before any
      state changes.],
    [Duplicate protection], [A repeated confirmation is recognised and ignored.],
    [Expiry sweeping], [An abandoned checkout lapses and releases its share of
      the round.],
    [Refunds], [A settled payment can be reversed; the record survives the
      reversal.],
    [Platform fee], [A percentage taken on settled payments only, stored per
      transaction.],
    [Settlement history], [The investor's record of every attempt, successful or
      not.],
  ),
  caption: [Features delivered in this part of the system.],
)

= The Chain Below the Commitment

Report 7 owns `Investment`. This report owns the three objects beneath it, and
each holds a fact the one above cannot.

#figure(
  table(
    columns: (42mm, 1fr),
    align: (left + top, left + top),
    table.header([Object], [The fact it holds]),
    [`FundingRequest`], [An attempt to settle a specific commitment, *within a
      time box*. Its own expiry is why an abandoned checkout does not hold a
      claim forever.],
    [`PaymentTransaction`], [What a provider actually did: amount, fee, provider
      name, provider reference, status. The only evidence of settlement.],
    [`PaymentEvent`], [One row per provider callback, carrying the provider's own
      event identifier. Its existence is what makes a duplicate detectable.],
  ),
  caption: [Three objects, three facts. Collapsing them into a `paid` flag would
    remove the ability to answer when this expired, which provider handled it,
    what fee was taken, and whether this confirmation was already processed.],
)

#figure(
  image("/assets/diagrams/out/state-payment.svg", width: 58%),
  caption: [Payment transaction states. Only `Succeeded` contributes to a
    venture's total; a refund transitions the row rather than deleting it.],
)

#delivered[
  *A refund needs no special case in the arithmetic.* A reversed transaction
  leaves the `Succeeded` state, so it drops out of the funding sum on its own.
  Subtraction is a consequence of the predicate in Report 7 rather than a second
  code path that could disagree with the first.
]

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

*The uniqueness constraint — not the check — is what makes this safe.* Two
simultaneous deliveries can both pass a check before either writes; the second
*insert* fails, and that failure is the correct outcome. This is the same
reasoning that made bookmarking idempotent in Report 6, applied where the cost of
getting it wrong is money rather than a duplicate row.

== Expiry

A checkout that nobody completes holds capacity, because Report 7 measures
capacity in commitments rather than in settled money. A background sweeper lapses
funding requests past their expiry and releases the capacity automatically.

The time box is configuration rather than a constant: the checkout lifetime is
*35 minutes* and a funding request lives *14 days*. Both are read at start-up
alongside every other setting in the platform.

= Interface

#shots(
  "/assets/screenshots/settled-payments-en-light.png",
  "/assets/screenshots/settled-payments-ar-dark.png",
  [The investor's settlement history after one payment has settled, in both
   languages and themes. *Funded* and *committed* are separate tiles even now
   that they hold the same number, because they will not always — and the
   transaction below them carries its own reference, so a question about a
   payment can be asked about a specific row rather than about a total.],
)

#shots(
  "/assets/screenshots/checkout-live-en-light.png",
  "/assets/screenshots/checkout-live-ar-dark.png",
  [The sandbox checkout, live, against a real funding request. It names the
   amount and the transaction reference, and it offers the two outcomes a card
   form would produce — approval and decline — plus leaving without paying. The
   *test mode* badge is not decoration: the platform refuses to start against a
   key that is not a test key.],
)

#note[
  *This capture required a whole journey.* A checkout session cannot be
  photographed in isolation. Producing it meant listing a venture, having an
  administrator approve it, an investor committing to it, the founder accepting
  that commitment and then requesting the agreed amount — six steps across three
  accounts before the screen above can exist at all.

  That is the argument of Report 7 restated as a practical fact: *an approved
  commitment is not a payment*, and the platform will not let you reach the
  second without walking every step of the first.
]

#shots(
  "/assets/screenshots/checkout-lapsed-en-light.png",
  "/assets/screenshots/checkout-lapsed-ar-dark.png",
  [The same screen reached after its session had ended. It states what happened,
   states what was *not* affected — "nothing was charged and your funding request
   is untouched" — and offers the way back. An expiry message that does not say
   what survived it produces a support request instead of a retry.],
)

The two captures above are the same route in two states, and the second is the
one the platform reaches most often. A checkout is abandoned far more frequently
than it is completed, so the expiry path is not an edge case being documented for
completeness — it is the common outcome, and the reason the sweeper in the next
section exists.

== Settlement

#shot(
  "/assets/screenshots/payment-return-en-light.png",
  [The return page after an approved payment. It names the amount, the venture,
   the founder, the settlement time and the transaction reference — and it states
   what has already happened elsewhere: *the founder has been notified and their
   funding total has moved.*

   The sandbox notice is not a disclaimer added for this report; the product
   prints it on every settlement, because a platform that simulates money must
   say so at the moment it appears to have moved some.],
)

The figures below were read from the administrator's revenue surface immediately
after that settlement, and they are the arithmetic of this report performed on
one real row.

#figure(
  table(
    columns: (1fr, 26mm),
    align: (left, right),
    table.header([Figure after one settled payment], [Value]),
    [Gross transaction volume], [\$40,000],
    [Platform revenue — the fee, at 5%], [\$2,000],
    [Paid to founders — net proceeds], [\$38,000],
    [Payment success rate], [100% · 1 settled, 0 failed],
    [Refunds], [\$0 · 0 reversed],
    [Open funding requests], [\$0 · 0 awaiting payment],
  ),
  caption: [One settlement, and every derived figure that moved because of it.
    None of these is stored: each is a sum over the transaction rows.],
)

#delivered[
  *The fee is subtraction, not a second record.* \$40,000 gross less \$2,000 fee
  leaves \$38,000 to the founder, and the platform holds no separate ledger of
  its own earnings — revenue is the sum of `FeeAmount` over settled rows. A
  refund would remove the row from that set, and the revenue figure would fall by
  the same \$2,000 with no compensating entry written anywhere.
]

= Data

#figure(
  table(
    columns: (38mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Table], [Holds], [Rule enforced]),
    [`FundingRequests`], [Amount, status and expiry for one settlement attempt.],
      [Swept on expiry; releases capacity.],
    [`PaymentTransactions`], [Amount, fee, net to founder, provider name,
      provider reference, status.], [Only `Succeeded` is countable.],
    [`PaymentEvents`], [One row per provider callback.],
      [`ProviderEventId` unique — the idempotency key.],
  ),
  caption: [Funding tables. *No table in this group stores an aggregate.*],
)

Three column-level decisions are worth naming, and two of them are deliberate
exceptions to rules stated elsewhere in this series.

*`Provider` is stored on every transaction*, not inferred from configuration.
Configuration changes; history must not. A transaction always carries the
identity of the system that produced it, so a data set can never become ambiguous
about which rows represent settlement under which provider.

*The fee is stored per transaction*, not recomputed. This is a deliberate
exception to the derive-don't-store rule that governs Report 7: the fee schedule
is time-varying, and recomputing a historical transaction under today's rate
would silently rewrite what was actually charged. The rule is *derive what is a
function of current state; store what is a record of a past event* — and a fee is
the second kind.

*Money is `decimal`, never floating point*, with an explicit precision and scale
on every column. Binary floating point cannot represent most decimal fractions
exactly, and an accumulated rounding error in a funding total is precisely the
class of defect this part of the system exists to prevent.

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
  caption: [The provider boundary. It mentions no domain concept — no venture, no
    investor, no funding target — only the three operations a payment processor
    performs.],
)

That interface is the whole of the abstraction, and its emptiness is the point.
Because it carries transport and nothing else, *the offline simulator exercises
the same rules as the Stripe-compatible provider.* That makes the simulator a
legitimate test surface rather than a stand-in, and it is why the platform's
default configuration is the one with no network in it.

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
  caption: [Webhook handling. Acknowledging a duplicate with `200` is deliberate
    — an error would cause the provider to retry indefinitely for an event that
    will never become processable.],
)

The numbered comments are the order, and the order is the defence. Verification
is step one because a payload that has not been verified must not influence even
a database lookup. The duplicate check is step two because acknowledging a repeat
must not cost a state change. Step three is the only line that writes anything.

= Key Endpoints

#figure(
  table(
    columns: (16mm, 62mm, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Method], [Path], [Purpose]),
    [`GET`], [`api/payments/config`], [Which provider is active, and whether it
      is a sandbox.],
    [`POST`], [`api/payments/investments/{id}/funding-request`], [Open a request
      against an approved commitment.],
    [`POST`], [`api/payments/funding-requests/{id}/checkout`], [Create a provider
      session.],
    [`POST`], [`api/payments/funding-requests/{id}/cancel`], [Withdraw before
      settlement.],
    [`POST`], [`api/payments/transactions/{id}/verify`], [Reconcile a transaction
      against the provider.],
    [`GET`], [`api/payments/mine`], [The investor's settlement history.],
    [`POST`], [`api/payments/webhook/stripe`], [*Public by necessity.*
      Signature-verified; duplicates ignored.],
    [`GET`], [`api/payments/sandbox/sessions/{sessionId}`], [Read a simulated
      session.],
    [`POST`], [`api/payments/sandbox/sessions/{sessionId}/resolve`], [Choose the
      outcome the simulator should produce.],
  ),
  caption: [Principal endpoints in this part. The last two exist only under the
    simulator and have no counterpart in the Stripe-compatible path.],
)

= Libraries Used in This Part

#figure(
  table(
    columns: (46mm, 1fr),
    align: (left + top, left + top),
    table.header([Library], [Role here]),
    [`Stripe.net`], [Types and HTTP client for the Stripe-compatible provider
      implementation. Used for transport only; no domain rule depends on it.],
    [`System.Security.Cryptography`], [The webhook signature verifier is
      implemented directly against HMAC rather than taken from a vendor SDK, so
      the mechanism is understood rather than trusted.],
    [`Entity Framework Core`], [Carries the funding chain and the uniqueness
      constraint that provides idempotency.],
    [`Hosted service (built-in)`], [Runs the expiry sweeper outside the request
      path.],
  ),
  caption: [Libraries introduced in this part.],
)

= Challenges

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
  integration, it cannot be tested without that provider, and it changes when the
  provider changes.

  *Solution.* `IPaymentProvider` carries transport only. Every rule lives above
  it. The consequence is that the simulated provider exercises *the same rules*
  as the Stripe-compatible one, which makes it a legitimate test surface rather
  than a stand-in.
]

#challenge("A terminal row that gets rewritten destroys the history")[
  The convenient way to handle a retried payment is to update the failed row.
  Doing so erases the fact that an attempt failed, which is exactly the fact an
  investor and an administrator both need.

  *Solution.* Terminal transaction rows are immutable. A retry is a *new row*,
  and the failed attempt stays. The settlement history therefore shows every
  attempt rather than a summary of the successful ones, and the numbering in the
  interface reflects that.
]

#challenge("Nothing here has moved real money, and saying otherwise would be a lie")[
  The Stripe-compatible path is implemented, including signature-verified webhook
  handling, and it has never been operated against a live merchant account.

  *Resolution.* The application *refuses to start* on a key that is not a test
  key, and the check exists in two places rather than one. The default provider
  is the offline simulator. This report describes a payment system that is
  complete in its rules and unexercised in production, and both halves of that
  sentence are stated wherever a funding figure appears.
]

= How This Fits With the Rest of the System

Only the direct relationships are listed.

#figure(
  table(
    columns: (32mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Report], [Relationship], [Boundary]),
    [3 · Identity & Sessions],
      [*Depends on it.* Money-adjacent endpoints re-check account state rather
       than trusting an access token that cannot be revoked.],
      [The webhook is the one endpoint with no caller identity at all — it is
       authenticated by signature instead.],
    [7 · Commitment & Pipeline],
      [*Continues it.* A checkout is opened against an approved commitment, and
       only a settled transaction here changes the `Funded` figure defined
       there.],
      [This report computes no funding figure; it produces the rows
       `FundingMath` counts.],
    [11 · Dashboards & Analytics],
      [*Supplies its raw material.* Platform revenue is the sum of stored fees on
       settled transactions.],
      [Revenue is derived from transaction rows, never from a maintained
       counter.],
    [12 · Administration & Evaluation],
      [*Is audited by it.* Refunds are an administrative action and are recorded
       against the administrator who made them.],
      [A refund transitions a row; it never deletes one.],
  ),
  caption: [Direct relationships only.],
)

= Summary

#delivered[
  A funding request with its own expiry, a provider abstraction carrying
  transport and no domain rule, and two interchangeable implementations of which
  the offline simulator is the default. Webhook handling that verifies a
  signature over raw bytes before any state change, in constant time, and treats
  the provider's own event identifier as an idempotency key enforced by a unique
  constraint rather than by a check. A background sweeper that lapses abandoned
  checkouts and releases their capacity. Refunds that transition a row rather
  than delete it, and terminal rows that are never rewritten. A platform fee
  stored per transaction because it is a record of a past event rather than a
  function of current state.
]

*Still open in this part.* No payment in this system has ever been real. The
Stripe-compatible path is implemented and configurable and has not been operated
against a live merchant account; the application refuses to start on a key that
is not a test key. There is no reconciliation report against a provider's own
ledger, and no automated test covers the webhook path — the duplicate-protection
behaviour described above is proven by a uniqueness constraint and by manual
exercise, not by a test.

*What this enables.* Report 9 covers the conversation that surrounds all of this
— the messages, notifications and requests that pass between two people while a
commitment is being decided.
