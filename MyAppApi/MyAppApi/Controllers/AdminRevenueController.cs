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
    }
}
