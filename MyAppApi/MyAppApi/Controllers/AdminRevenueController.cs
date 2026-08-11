using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using MyAppApi.Data;
using MyAppApi.Data.Models;
using MyAppApi.Data.Models.DTOs;
using MyAppApi.Services;
using MyAppApi.Services.Payments;
using MyAppApi.Settings;

namespace MyAppApi.Controllers
{
    /// <summary>
    /// Vestora's own economics — the first surface in the product where the platform can
    /// see what it earns rather than only what it hosts.
    /// <para>
    /// Every query here calls <c>IgnoreQueryFilters()</c> on purpose. Projects and users
    /// are soft-deleted behind a global filter, and a settled transaction must survive
    /// its venture being taken down: revenue that disappears when a listing is removed is
    /// not a record of anything.
    /// </para>
    /// </summary>
    [Route("api/admin/revenue")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class AdminRevenueController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly PaymentService _payments;
        private readonly PaymentSettings _settings;
        private readonly IPaymentProvider _provider;

        public AdminRevenueController(
            AppDbContext db,
            PaymentService payments,
            IOptions<PaymentSettings> settings,
            IPaymentProvider provider)
        {
            _db = db;
            _payments = payments;
            _settings = settings.Value;
            _provider = provider;
        }

        private int Me() =>
            int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : 0;

        [HttpGet]
        public async Task<IActionResult> GetRevenue(CancellationToken ct)
        {
            var now = DateTime.UtcNow;

            var all = await _db.PaymentTransactions
                .AsNoTracking()
                .IgnoreQueryFilters()
                .Select(t => new
                {
                    t.Id,
                    t.Status,
                    t.Amount,
                    t.FeeAmount,
                    t.NetToFounder,
                    t.CreatedAtUtc,
                    t.SucceededAtUtc,
                    t.ExpiresAtUtc,
                    t.ProjectId,
                    ProjectName = t.FundingRequest.Investment.Project.Name,
                    FounderId = t.FundingRequest.Investment.Project.OwnerId,
                    FounderName = t.FundingRequest.Investment.Project.Owner.UserName,
                })
                .ToListAsync(ct);

            // Only money that settled and stayed settled. A refunded row has left the
            // Succeeded state, so reversal is subtraction rather than a special case.
            var settled = all.Where(t => t.Status == PaymentStatus.Succeeded).ToList();
            var refunded = all.Where(t => t.Status == PaymentStatus.Refunded).ToList();
            var failed = all.Where(t => t.Status == PaymentStatus.Failed).ToList();
            var cancelled = all.Where(t => t.Status == PaymentStatus.Cancelled).ToList();

            var decided = settled.Count + failed.Count;

            var openRequests = await _db.FundingRequests
                .AsNoTracking()
                .IgnoreQueryFilters()
                .Where(f => f.Status == FundingRequestStatus.Open)
                .Select(f => f.Amount)
                .ToListAsync(ct);

            var kpis = new AdminRevenueKpisDto
            {
                GrossTransactionVolume = settled.Sum(t => t.Amount),
                PlatformRevenue = settled.Sum(t => t.FeeAmount),
                NetToFounders = settled.Sum(t => t.NetToFounder),
                SucceededCount = settled.Count,
                FailedCount = failed.Count,
                CancelledCount = cancelled.Count,
                RefundedCount = refunded.Count,
                RefundedAmount = refunded.Sum(t => t.Amount),
                // Cancellations are not failures — an investor closing a tab says nothing
                // about whether payments work. Including them would make the rate a
                // measure of hesitation rather than of the system.
                SuccessRate = decided == 0 ? 0 : Math.Round((double)settled.Count / decided * 100, 1),
                AverageTransactionValue = settled.Count == 0 ? 0m : Math.Round(settled.Sum(t => t.Amount) / settled.Count, 2),
                StuckCount = all.Count(t =>
                    (t.Status == PaymentStatus.Initiated || t.Status == PaymentStatus.Processing) && t.ExpiresAtUtc <= now),
                OpenFundingRequests = openRequests.Count,
                OpenFundingAmount = openRequests.Sum(),
            };

            var overTime = settled
                .Where(t => t.SucceededAtUtc.HasValue)
                .GroupBy(t => new DateTime(t.SucceededAtUtc!.Value.Year, t.SucceededAtUtc.Value.Month, 1))
                .OrderBy(g => g.Key)
                .Select(g => new RevenuePointDto
                {
                    Label = g.Key.ToString("yyyy-MM"),
                    Gross = g.Sum(x => x.Amount),
                    Revenue = g.Sum(x => x.FeeAmount),
                    Count = g.Count(),
                })
                .ToList();

            var topVentures = settled
                .GroupBy(t => t.ProjectId)
                .Select(g => new TopEarningVentureDto
                {
                    ProjectId = g.Key,
                    ProjectName = g.First().ProjectName,
                    FounderId = g.First().FounderId,
                    FounderName = g.First().FounderName,
                    Gross = g.Sum(x => x.Amount),
                    Revenue = g.Sum(x => x.FeeAmount),
                    Transactions = g.Count(),
                })
                .OrderByDescending(v => v.Revenue)
                .Take(8)
                .ToList();

            return Ok(new AdminRevenueDto
            {
                Kpis = kpis,
                RevenueOverTime = overTime,
                TopVentures = topVentures,
                IsSandbox = _settings.IsSandbox,
                Provider = _provider.Name,
                FeeRateBps = _settings.FeeRateBps,
                Currency = _settings.Currency,
            });
        }

        /// <summary>Paged, filterable transaction ledger.</summary>
        [HttpGet("transactions")]
        public async Task<IActionResult> GetTransactions(
            [FromQuery] string? status,
            [FromQuery] string? q,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 25,
            CancellationToken ct = default)
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var query = _db.PaymentTransactions
                .AsNoTracking()
                .IgnoreQueryFilters()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(status) && PaymentStatus.All.Contains(status))
            {
                query = query.Where(t => t.Status == status);
            }

            if (!string.IsNullOrWhiteSpace(q))
            {
                var term = q.Trim();
                query = query.Where(t =>
                    t.Reference.Contains(term) ||
                    t.FundingRequest.Investment.Project.Name.Contains(term) ||
                    t.FundingRequest.Investment.Investor!.UserName.Contains(term) ||
                    t.FundingRequest.Investment.Project.Owner.UserName.Contains(term));
            }

            var totalCount = await query.CountAsync(ct);

            var rows = await query
                .OrderByDescending(t => t.Id)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(t => new
                {
                    Transaction = t,
                    ProjectName = t.FundingRequest.Investment.Project.Name,
                    FounderId = t.FundingRequest.Investment.Project.OwnerId,
                    FounderName = t.FundingRequest.Investment.Project.Owner.UserName,
                    InvestorName = t.FundingRequest.Investment.Investor!.UserName,
                    FundingReference = t.FundingRequest.Reference,
                    CoverImageId = t.FundingRequest.Investment.Project.Images
                        .OrderBy(im => im.Id).Select(im => (int?)im.Id).FirstOrDefault(),
                })
                .ToListAsync(ct);

            var items = rows.Select(r =>
            {
                var t = r.Transaction;
                return new AdminTransactionRowDto
                {
                    Id = t.Id,
                    Reference = t.Reference,
                    FundingRequestId = t.FundingRequestId,
                    FundingRequestReference = r.FundingReference,
                    InvestmentId = t.InvestmentId,
                    ProjectId = t.ProjectId,
                    ProjectName = r.ProjectName,
                    CoverImageId = r.CoverImageId,
                    InvestorId = t.InvestorId,
                    InvestorName = r.InvestorName,
                    FounderId = r.FounderId,
                    FounderName = r.FounderName,
                    AttemptNumber = t.AttemptNumber,
                    Amount = t.Amount,
                    Currency = t.Currency,
                    FeeRateBps = t.FeeRateBps,
                    FeeAmount = t.FeeAmount,
                    NetToFounder = t.NetToFounder,
                    Status = t.Status,
                    Provider = t.Provider,
                    ProviderPaymentId = t.ProviderPaymentId,
                    ProviderRefundId = t.ProviderRefundId,
                    ProviderSessionId = t.ProviderSessionId,
                    FailureCode = t.FailureCode,
                    FailureMessage = t.FailureMessage,
                    CancelReason = t.CancelReason,
                    RefundReason = t.RefundReason,
                    RefundedByAdminId = t.RefundedByAdminId,
                    CreatedAtUtc = t.CreatedAtUtc,
                    ExpiresAtUtc = t.ExpiresAtUtc,
                    SucceededAtUtc = t.SucceededAtUtc,
                    FailedAtUtc = t.FailedAtUtc,
                    CancelledAtUtc = t.CancelledAtUtc,
                    RefundedAtUtc = t.RefundedAtUtc,
                    IsSandbox = _settings.IsSandbox,
                };
            }).ToList();

            return Ok(new PagedResult<AdminTransactionRowDto>
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
            });
        }

        /// <summary>
        /// Reverses a settled transaction. Funding totals and platform revenue both fall
        /// out of it automatically, and the action is written to the admin audit trail.
        /// </summary>
        [HttpPost("transactions/{id:int}/refund")]
        public async Task<IActionResult> Refund(int id, [FromBody] RefundInput? input, CancellationToken ct)
        {
            var result = await _payments.RefundAsync(id, Me(), input?.Reason, ct);
            return this.ToActionResult(result);
        }

        // ==================================================================
        //  Reconciliation
        // ==================================================================

        /// <summary>
        /// Confirmations the system could not act on, and the ones where it disagreed
        /// with the provider.
        /// <para>
        /// Three code paths already knew this state could exist and each of them wrote a
        /// log line: an event whose effect was refused because the row had gone terminal,
        /// a provider reporting a payment against an attempt Vestora had written off, an
        /// attempt abandoned because the provider could not be reached. Logs are where
        /// facts go to be forgotten. Every one of those rows survives in PaymentEvents,
        /// so the queue was always there — it simply had no door.
        /// </para>
        /// <para>
        /// Ordered conflicts first, because a conflict means the two sides disagree about
        /// real money and everything else here is bookkeeping.
        /// </para>
        /// </summary>
        [HttpGet("reconciliation")]
        public async Task<IActionResult> Reconciliation(
            [FromQuery] bool includeReviewed = false,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50,
            CancellationToken ct = default)
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 200);

            var query = _db.PaymentEvents
                .AsNoTracking()
                .IgnoreQueryFilters()
                .Where(e => !e.Applied);

            if (!includeReviewed)
                query = query.Where(e => e.ReviewedAtUtc == null);

            var totalCount = await query.CountAsync(ct);
            var openConflicts = await query
                .CountAsync(e => e.Outcome != null && e.Outcome.StartsWith("CONFLICT"), ct);

            var rows = await query
                .OrderByDescending(e => e.Outcome != null && e.Outcome.StartsWith("CONFLICT"))
                .ThenByDescending(e => e.ReceivedAtUtc)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(e => new ReconciliationEventDto
                {
                    Id = e.Id,
                    Provider = e.Provider,
                    ProviderEventId = e.ProviderEventId,
                    EventType = e.EventType,
                    Source = e.Source,
                    Outcome = e.Outcome,
                    ReceivedAtUtc = e.ReceivedAtUtc,
                    IsConflict = e.Outcome != null && e.Outcome.StartsWith("CONFLICT"),
                    ReviewedAtUtc = e.ReviewedAtUtc,
                    ReviewNote = e.ReviewNote,
                    TransactionId = e.PaymentTransactionId,
                })
                .ToListAsync(ct);

            // The transactions these events point at, so the admin does not have to look
            // each one up to know which venture and which person is involved.
            var transactionIds = rows.Where(r => r.TransactionId != null)
                .Select(r => r.TransactionId!.Value).Distinct().ToList();

            var context = await _db.PaymentTransactions
                .AsNoTracking()
                .IgnoreQueryFilters()
                .Where(t => transactionIds.Contains(t.Id))
                .Select(t => new
                {
                    t.Id,
                    t.Reference,
                    t.Status,
                    t.Amount,
                    t.Currency,
                    t.InvestmentId,
                    ProjectName = t.FundingRequest.Investment.Project.Name,
                    InvestorName = t.FundingRequest.Investment.Investor!.UserName,
                })
                .ToListAsync(ct);

            foreach (var r in rows)
            {
                var t = context.FirstOrDefault(c => c.Id == r.TransactionId);
                if (t == null) continue;
                r.TransactionReference = t.Reference;
                r.TransactionStatus = t.Status;
                r.Amount = t.Amount;
                r.Currency = t.Currency;
                r.InvestmentId = t.InvestmentId;
                r.ProjectName = t.ProjectName;
                r.InvestorName = t.InvestorName;
            }

            return Ok(new ReconciliationDto
            {
                Items = rows,
                TotalCount = totalCount,
                OpenConflicts = openConflicts,
                Page = page,
                PageSize = pageSize,
            });
        }

        /// <summary>
        /// Asks the provider again about the transaction behind an event.
        /// <para>
        /// The first thing anybody would do by hand, so it is the first thing offered.
        /// It travels the ordinary confirmation path, which means a payment the provider
        /// still considers settled gets recorded properly rather than patched in — and a
        /// transaction that is already terminal stays terminal, because re-verifying is
        /// not a licence to rewrite a closed row.
        /// </para>
        /// </summary>
        [HttpPost("reconciliation/{id:int}/reverify")]
        public async Task<IActionResult> Reverify(int id, CancellationToken ct)
        {
            var evt = await _db.PaymentEvents.FirstOrDefaultAsync(e => e.Id == id, ct);
            if (evt == null) return NotFound(new { message = "Event not found." });
            if (evt.PaymentTransactionId == null)
                return BadRequest(new { message = "This event is not attached to a transaction." });

            var result = await _payments.VerifyAsync(evt.PaymentTransactionId.Value, Me(), isAdmin: true, ct);
            return this.ToActionResult(result);
        }

        /// <summary>
        /// Records that a human looked at this and what they concluded.
        /// <para>
        /// Deliberately does not touch <c>Applied</c> or <c>Outcome</c>: those say what
        /// the system did at the time, and an admin's later finding is a separate fact
        /// that must not be able to overwrite it. Clearing the queue is the point —
        /// changing history is not.
        /// </para>
        /// </summary>
        [HttpPost("reconciliation/{id:int}/review")]
        public async Task<IActionResult> Review(int id, [FromBody] ReviewEventInput input, CancellationToken ct)
        {
            var note = input.Note?.Trim();
            if (string.IsNullOrWhiteSpace(note))
                return BadRequest(new { message = "Say what you found — an empty resolution resolves nothing." });

            var evt = await _db.PaymentEvents.FirstOrDefaultAsync(e => e.Id == id, ct);
            if (evt == null) return NotFound(new { message = "Event not found." });

            evt.ReviewedAtUtc = DateTime.UtcNow;
            evt.ReviewedByAdminId = Me();
            evt.ReviewNote = note.Length > 500 ? note[..500] : note;

            _db.AdminAuditLogs.Add(new AdminAuditLog
            {
                AdminUserId = Me(),
                Action = "payment_event.reviewed",
                TargetType = "PaymentEvent",
                TargetId = evt.Id,
                Details = $"{evt.ProviderEventId} · {evt.ReviewNote}",
                CreatedAtUtc = DateTime.UtcNow,
            });

            await _db.SaveChangesAsync(ct);
            return Ok(new { message = "Recorded." });
        }
    }
}
