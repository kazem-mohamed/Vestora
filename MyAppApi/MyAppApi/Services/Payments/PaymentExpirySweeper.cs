using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using MyAppApi.Data;
using MyAppApi.Data.Models;
using MyAppApi.Settings;

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
            var settings = scope.ServiceProvider.GetRequiredService<IOptions<PaymentSettings>>().Value;
            var now = DateTime.UtcNow;

            // ---- Abandoned checkouts ----
            var stale = await db.PaymentTransactions
                .Where(t => (t.Status == PaymentStatus.Initiated || t.Status == PaymentStatus.Processing)
                            && t.ExpiresAtUtc <= now)
                .Take(200)
                .ToListAsync(ct);

            foreach (var t in stale)
            {
                t.Status = PaymentStatus.Cancelled;
                t.CancelReason = PaymentCancelReason.Abandoned;
                t.CancelledAtUtc = now;
                t.CheckoutUrl = null;
            }

            // ---- Lapsed funding requests ----
            // Only requests with no live attempt: somebody mid-checkout at the moment of
            // expiry should be allowed to finish rather than have the ask pulled from
            // under them. The next sweep catches it if they do not.
            var lapsed = await db.FundingRequests
                .Where(f => f.Status == FundingRequestStatus.Open
                            && f.ExpiresAtUtc <= now
                            && !f.Transactions.Any(t => t.Status == PaymentStatus.Initiated || t.Status == PaymentStatus.Processing))
                .Take(200)
                .ToListAsync(ct);

            foreach (var f in lapsed)
            {
                f.Status = FundingRequestStatus.Expired;
                f.ClosedAtUtc = now;
                f.ClosedReason = "Not completed before the request expired.";
            }

            if (stale.Count == 0 && lapsed.Count == 0) return;

            await db.SaveChangesAsync(ct);

            _logger.LogInformation(
                "Payment sweep: {Stale} checkout(s) abandoned, {Lapsed} funding request(s) expired.",
                stale.Count, lapsed.Count);
        }
    }
}
