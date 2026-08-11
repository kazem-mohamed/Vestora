using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using MyAppApi.Data;
using MyAppApi.Data.Models;
using MyAppApi.Data.Models.Hubs;

namespace MyAppApi.Services.Payments
{
    /// <summary>
    /// Closes out what nobody finished.
    /// <para>
    /// Two things rot if left alone. A checkout the investor walked away from stays
    /// "Initiated" forever, blocking the retry that would let them try again. And a
    /// funding request nobody ever pays holds a share of a round that other investors
    /// could have taken. Both are swept on a slow timer — this is bookkeeping, not a
    /// queue, so it runs every few minutes and costs nothing when there is nothing to do.
    /// </para>
    /// <para>
    /// Follows the same hosted-service shape as <c>NotificationFanOutWorker</c>.
    /// </para>
    /// </summary>
    public class PaymentExpirySweeper : BackgroundService
    {
        private static readonly TimeSpan Interval = TimeSpan.FromMinutes(3);

        /// <summary>
        /// How long past its deadline an attempt may stay open while the provider cannot
        /// be reached, before it is written off anyway. Long enough that a provider
        /// outage is waited out rather than guessed at; short enough that a relationship
        /// is never permanently stuck behind one unanswerable attempt.
        /// </summary>
        private static readonly TimeSpan StuckAfter = TimeSpan.FromHours(24);

        /// <summary>
        /// When an unpaid ask is worth mentioning again, in order. Numbered rather than
        /// timed so the sweeper can tell which reminders a request has already had from
        /// a single column, and so a request created inside the window still gets the
        /// later rung rather than none at all.
        /// </summary>
        private static readonly (int Number, TimeSpan Before, string Wording)[] ReminderLadder =
        {
            (1, TimeSpan.FromDays(3), "in about three days"),
            (2, TimeSpan.FromDays(1), "tomorrow"),
        };

        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<PaymentExpirySweeper> _logger;

        public PaymentExpirySweeper(IServiceScopeFactory scopeFactory, ILogger<PaymentExpirySweeper> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            // Let the app finish starting before touching the database.
            try { await Task.Delay(TimeSpan.FromSeconds(20), stoppingToken); }
            catch (OperationCanceledException) { return; }

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await SweepAsync(stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    return;
                }
                catch (Exception ex)
                {
                    // A sweep failing must never take the host down with it.
                    _logger.LogError(ex, "Payment expiry sweep failed; will retry.");
                }

                try { await Task.Delay(Interval, stoppingToken); }
                catch (OperationCanceledException) { return; }
            }
        }

        private async Task SweepAsync(CancellationToken ct)
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var payments = scope.ServiceProvider.GetRequiredService<PaymentService>();
            var provider = scope.ServiceProvider.GetRequiredService<IPaymentProvider>();
            var hub = scope.ServiceProvider.GetRequiredService<IHubContext<ChatHub>>();
            var now = DateTime.UtcNow;

            // ---- Attempts past their deadline ----
            //
            // Never written off unasked. An expiry is Vestora's clock running out, not a
            // statement about what the provider did — and the two disagree exactly when it
            // matters most: an investor who pays at minute 34 of a 35-minute window, with
            // the sweep landing at minute 36. Writing the attempt off first makes the row
            // terminal, and the confirmation that follows is then refused as arriving too
            // late. The money would be gone and Vestora would hold no record of it.
            //
            // So the provider is asked first, and a real outcome is applied through the
            // ordinary path — same event record, same idempotency key, same settlement.
            // Only an attempt the provider still calls open is abandoned.
            var stale = await db.PaymentTransactions
                .Where(t => (t.Status == PaymentStatus.Initiated || t.Status == PaymentStatus.Processing)
                            && t.ExpiresAtUtc <= now)
                .Take(200)
                .ToListAsync(ct);

            var abandoned = 0;
            var recovered = 0;
            var deferred = 0;
            var reminded = 0;

            foreach (var t in stale)
            {
                // Asking first is only safe while the asking eventually stops. An attempt
                // held open by a provider nobody can reach blocks the one-active-attempt
                // index, and the investor cannot start a new checkout — so a day past its
                // deadline it is written off regardless. Losing an attempt is recoverable;
                // a relationship that can never be paid again is not.
                var unreachableTooLong = t.ExpiresAtUtc <= now - StuckAfter;

                if (!string.IsNullOrWhiteSpace(t.ProviderSessionId))
                {
                    ProviderPaymentResult outcome;
                    try
                    {
                        outcome = await provider.GetSessionResultAsync(t.ProviderSessionId, ct);
                    }
                    catch (PaymentProviderUnavailableException ex)
                    {
                        // Unreachable is not the same as unpaid. Left alone for the next
                        // sweep rather than guessed at — up to the backstop above.
                        if (!unreachableTooLong)
                        {
                            _logger.LogWarning(ex, "Could not reach the provider for transaction {Id}; leaving it open.", t.Id);
                            deferred++;
                            continue;
                        }

                        _logger.LogError(ex,
                            "RECONCILIATION: transaction {Reference} (id {Id}) could not be confirmed with the provider " +
                            "for {Hours}h past its deadline and is being abandoned. Check the provider for a payment " +
                            "Vestora has not recorded.",
                            t.Reference, t.Id, StuckAfter.TotalHours);

                        t.Status = PaymentStatus.Cancelled;
                        t.CancelReason = PaymentCancelReason.Expired;
                        t.CancelledAtUtc = now;
                        t.CheckoutUrl = null;
                        abandoned++;
                        continue;
                    }

                    if (outcome.State is ProviderPaymentState.Succeeded
                        or ProviderPaymentState.Failed
                        or ProviderPaymentState.Cancelled)
                    {
                        // The same derived key the return trip uses, so a sweep racing an
                        // investor's own verification collides instead of applying twice.
                        await payments.ApplyProviderResultAsync(
                            t, outcome, $"verify:{t.ProviderSessionId}:{outcome.State}", "sweep", outcome.RawStatus, ct);

                        if (outcome.State == ProviderPaymentState.Succeeded)
                        {
                            recovered++;
                            _logger.LogWarning(
                                "Transaction {Reference} settled after its checkout window closed; recorded by the sweep.",
                                t.Reference);
                        }
                        continue;
                    }
                }

                t.Status = PaymentStatus.Cancelled;
                t.CancelReason = PaymentCancelReason.Abandoned;
                t.CancelledAtUtc = now;
                t.CheckoutUrl = null;
                abandoned++;
            }

            if (abandoned > 0) await db.SaveChangesAsync(ct);

            // ---- Reminders before an ask lapses ----
            //
            // Fourteen days is long enough to forget. The expiry notification added
            // earlier tells both sides it is too late, which is the one message nobody
            // can act on — so the ladder below fires while there is still time: three
            // days out, then one. Only the investor is reminded: it is their move, and
            // telling a founder twice that somebody else has not paid yet is nagging
            // them about a thing they cannot do.
            foreach (var rung in ReminderLadder)
            {
                var deadline = now + rung.Before;

                var due = await db.FundingRequests
                    .Include(f => f.Investment).ThenInclude(i => i.Project)
                    .Where(f => f.Status == FundingRequestStatus.Open
                                && f.RemindersSent < rung.Number
                                && f.ExpiresAtUtc <= deadline
                                && f.ExpiresAtUtc > now)
                    .Take(200)
                    .ToListAsync(ct);

                if (due.Count == 0) continue;

                var reminders = new List<Notification>();
                foreach (var f in due)
                {
                    f.RemindersSent = rung.Number;
                    reminders.Add(new Notification
                    {
                        UserId = f.InvestorId,
                        ActorUserId = f.RequestedByUserId,
                        ProjectId = f.ProjectId,
                        InvestmentId = f.InvestmentId,
                        NotificationType = PaymentNotificationTypes.FundingRequestReminder,
                        Content = $"{f.Investment.Project.Name}: {f.Amount:N0} {f.Currency} is still due, and the request expires {rung.Wording}. Reference {f.Reference}.",
                        DateCreated = now,
                        IsRead = false,
                    });
                }

                db.Notifications.AddRange(reminders);
                await db.SaveChangesAsync(ct);
                foreach (var n in reminders) await hub.PushAsync(n);
                reminded += reminders.Count;
            }

            // ---- Lapsed funding requests ----
            // Only requests with no live attempt: somebody mid-checkout at the moment of
            // expiry should be allowed to finish rather than have the ask pulled from
            // under them. The next sweep catches it if they do not.
            var lapsed = await db.FundingRequests
                .Include(f => f.Investment).ThenInclude(i => i.Project)
                .Where(f => f.Status == FundingRequestStatus.Open
                            && f.ExpiresAtUtc <= now
                            && !f.Transactions.Any(t => t.Status == PaymentStatus.Initiated || t.Status == PaymentStatus.Processing))
                .Take(200)
                .ToListAsync(ct);

            var announcements = new List<Notification>();

            foreach (var f in lapsed)
            {
                f.Status = FundingRequestStatus.Expired;
                f.ClosedAtUtc = now;
                f.ClosedReason = "Not completed before the request expired.";

                // Both sides are told. An ask that dies in silence is the worst version of
                // this: the investor returns to find the payment button gone with no
                // explanation, and the founder goes on believing money is on its way. The
                // request can simply be issued again, and neither of them can act on that
                // until somebody says so.
                var venture = f.Investment.Project.Name;

                announcements.Add(new Notification
                {
                    UserId = f.InvestorId,
                    ActorUserId = f.RequestedByUserId,
                    ProjectId = f.ProjectId,
                    InvestmentId = f.InvestmentId,
                    NotificationType = PaymentNotificationTypes.FundingRequestExpired,
                    Content = $"The funding request for {venture} ({f.Amount:N0} {f.Currency}) expired before it was paid. Ask the founder to issue a new one if you still want to invest.",
                    DateCreated = now,
                    IsRead = false,
                });

                announcements.Add(new Notification
                {
                    UserId = f.Investment.Project.OwnerId,
                    ActorUserId = f.Investment.Project.OwnerId,
                    ProjectId = f.ProjectId,
                    InvestmentId = f.InvestmentId,
                    NotificationType = PaymentNotificationTypes.FundingRequestExpired,
                    Content = $"Your funding request {f.Reference} for {venture} ({f.Amount:N0} {f.Currency}) expired unpaid. You can issue a new one from the deal room.",
                    DateCreated = now,
                    IsRead = false,
                });
            }

            if (lapsed.Count > 0)
            {
                db.Notifications.AddRange(announcements);
                await db.SaveChangesAsync(ct);
                foreach (var n in announcements) await hub.PushAsync(n);
            }

            if (abandoned == 0 && lapsed.Count == 0 && recovered == 0 && deferred == 0 && reminded == 0) return;

            _logger.LogInformation(
                "Payment sweep: {Abandoned} checkout(s) abandoned, {Recovered} settled late, {Deferred} deferred, " +
                "{Reminded} reminder(s) sent, {Lapsed} funding request(s) expired.",
                abandoned, recovered, deferred, reminded, lapsed.Count);
        }
    }
}
