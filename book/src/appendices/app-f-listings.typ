#import "/lib/vestora.typ": *
#import "/lib/theme.typ": *

= Key Code Listings <app:listings>

The main text carries only the fragments where the code itself is the point.
This appendix holds the longer extracts a reader may want in full.

#note[
  *These are extracts, not the codebase.* Reproducing the source in an appendix
  would add several hundred pages and no understanding — the previous version of
  this document devoted half its length to narrating code line by line (§1.2),
  and this appendix exists to avoid repeating that. The complete source is in
  version control; what follows is the material a reader needs at hand while
  reading @ch:payments, @ch:security and @ch:database.
]

== The Payment Provider Boundary

The interface that makes the domain provider-independent (§11.2, ADR-02). Note
what it does not mention: no venture, no investor, no funding target. It carries
transport only.

#figure(
  ```cs
  public interface IPaymentProvider
  {
      /// "stripe" or "simulated" — stored on every transaction it handles,
      /// so a row always carries the identity of the system that produced it.
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
  caption: [`IPaymentProvider`. Two implementations satisfy it and neither
    contains a domain rule.],
)

== Webhook Verification and Idempotency

Three properties make this correct rather than merely present: verification runs
over the raw body before parsing, it precedes every state change, and the
duplicate check is backed by a uniqueness constraint rather than standing alone
(§11.4, §11.5).

#figure(
  ```cs
  // 1. Verify over the raw bytes. Deserialising and re-serialising
  //    changes them, and the signature is over bytes.
  var raw = await ReadRawBodyAsync(Request, ct);
  if (!_verifier.Verify(raw, Request.Headers["Stripe-Signature"], _secret))
      return BadRequest();          // rejected and logged; nothing is read

  var evt = _verifier.Parse(raw);

  // 2. The event row is the idempotency key. The uniqueness constraint —
  //    not this check — is what makes it safe under concurrency: two
  //    simultaneous deliveries can both pass the check, and the second
  //    insert then fails, which is the correct outcome.
  if (await _db.PaymentEvents.AnyAsync(e => e.ProviderEventId == evt.Id, ct))
      return Ok();                  // already handled — acknowledge and stop

  // 3. Only now may state change.
  await _payments.ApplyProviderEventAsync(evt, ct);
  return Ok();
  ```,
  caption: [Webhook handling. Acknowledging a duplicate with `200` is
    deliberate — an error causes the provider to retry indefinitely for an event
    that will never become processable.],
)

== Deriving Funding Totals

There is no `AmountRaised` column anywhere in the schema (ADR-04, §7.6). A
venture's total is arithmetic over rows that represent money that actually
moved, computed in one place so two callers cannot disagree.

#figure(
  ```cs
  // Only Settled contributes. Approved commitments and pending, failed,
  // expired or refunded transactions are all excluded — which is the
  // entire integrity rule, expressible in one predicate because the
  // model was built to make it so.
  public Task<decimal> RaisedAsync(int projectId, CancellationToken ct) =>
      _db.PaymentTransactions
         .Where(t => t.FundingRequest.Investment.ProjectId == projectId)
         .Where(t => t.Status == PaymentStatus.Settled)
         .SumAsync(t => (decimal?)t.Amount, ct)
         .ContinueWith(r => r.Result ?? 0m, ct);
  ```,
  caption: [Funding derivation. The `?? 0m` matters: a venture with no
    transactions has raised zero, not null.],
)

== Independent State Columns

The configuration that keeps moderation, lifecycle and commercial stage from
overwriting one another (ADR-05, §7.6), and the composite index that keeps the
resulting two-column visibility filter fast (§7.5).

#figure(
  ```cs
  // Three columns, three writers, three questions. The composite index
  // exists because public visibility requires two of them to agree, so
  // the listing query filters on both and orders by date.
  modelBuilder.Entity<Project>()
      .HasIndex(p => new { p.ModerationStatus, p.LifecycleStatus, p.CreatedDate });

  modelBuilder.Entity<Project>()
      .HasIndex(p => p.Stage);
  ```,
  caption: [Venture state indexing.],
)

== Business Rules as Unique Indexes

Four rules that read like policy are implemented as constraints (§7.5). Each
could have been an application check, and each would then have had a race
between two concurrent requests.

#figure(
  ```cs
  // "Save once", "follow once", "review once" — enforced by the database,
  // so a double-tap cannot produce two rows.
  modelBuilder.Entity<Bookmark>()
      .HasIndex(b => new { b.UserId, b.ProjectId }).IsUnique();

  modelBuilder.Entity<Follow>()
      .HasIndex(f => new { f.FollowerId, f.FollowedId }).IsUnique();

  modelBuilder.Entity<Review>()
      .HasIndex(r => new { r.ProjectId, r.InvestorId }).IsUnique();

  // Account identity, and the refresh-token rule that two live tokens
  // may never share a hash.
  modelBuilder.Entity<User>().HasIndex(u => u.Email).IsUnique();
  modelBuilder.Entity<RefreshToken>().HasIndex(rt => rt.TokenHash).IsUnique();
  ```,
  caption: [Constraints carrying business rules.],
)

== Uniform Result Translation

Expected outcomes are values, not exceptions (§6.5). The mapping from outcome to
HTTP status exists once for the whole API rather than being re-decided in each
of the twenty-two controllers (§9.6).

#figure(
  ```cs
  // In the controller — parse, authorise, delegate, shape. Nothing else.
  [HttpPost("{id}/publish")]
  public async Task<IActionResult> Publish(int id, CancellationToken ct)
  {
      var result = await _projects.PublishAsync(id, CurrentUserId, ct);
      return result.ToActionResult(this);
  }
  ```,
  caption: [The controller-to-service seam. A controller may not reference
    `AppDbContext` (§6.5).],
)
