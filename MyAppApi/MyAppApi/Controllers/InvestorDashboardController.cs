using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyAppApi.Data;
using MyAppApi.Data.Models;
using MyAppApi.Data.Models.DTOs;
using MyAppApi.Services;
using System.Linq;
using System.Security.Claims;

namespace MyAppApi.Controllers
{
    // Aggregated read model for the investor command centre — the mirror of
    // FounderDashboardController. One request returns every KPI, the pipeline,
    // the portfolio, allocation breakdowns and recent activity.
    [Route("api/dashboard")]
    [ApiController]
    [Authorize(Roles = "Investor")]
    public class InvestorDashboardController : ControllerBase
    {
        private readonly AppDbContext _context;

        public InvestorDashboardController(AppDbContext context)
        {
            _context = context;
        }

        private int GetCurrentUserId() =>
            int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        [HttpGet("investor")]
        public async Task<IActionResult> GetInvestorDashboard()
        {
            var me = GetCurrentUserId();

            // --- every request this investor has ever made (declines included) ---
            var mine = await _context.Investments
                .AsNoTracking()
                .Where(i => i.InvestorId == me)
                .Select(i => new
                {
                    i.Id,
                    i.ProjectId,
                    i.Amount,
                    i.Date,
                    i.Status,
                    i.Stage,
                    i.StageUpdatedAt,
                    i.InvestorNote,
                    i.DeclinedReason,
                    ProjectName = i.Project.Name,
                    i.Project.Category,
                    ProjectStage = i.Project.Stage,
                    Goal = i.Project.InvestmentNeeded,
                    FounderId = i.Project.OwnerId,
                    FounderName = i.Project.Owner.UserName,
                    CoverImageId = i.Project.Images.OrderBy(im => im.Id).Select(im => (int?)im.Id).FirstOrDefault()
                })
                .ToListAsync();

            var approved = mine.Where(i => i.Status == "Approved").ToList();
            var pending = mine.Where(i => i.Status == "Pending").ToList();
            var declined = mine.Where(i => i.Status == PipelineStages.Declined).ToList();

            var watchlistCount = await _context.Bookmarks.CountAsync(b => b.UserId == me);
            var unreadMessages = await _context.Messages.CountAsync(m => m.ReceiverId == me && !m.IsRead);

            // --- the money side, keyed by relationship ---
            var myRequests = await _context.FundingRequests
                .AsNoTracking()
                .Where(f => f.InvestorId == me)
                .Select(f => new
                {
                    f.Id, f.InvestmentId, f.ProjectId, f.Amount, f.Status, f.ExpiresAtUtc,
                    LastAttemptStatus = f.Transactions
                        .OrderByDescending(t => t.AttemptNumber).Select(t => t.Status).FirstOrDefault(),
                })
                .ToListAsync();

            var myTransactions = await _context.PaymentTransactions
                .AsNoTracking()
                .Where(t => t.InvestorId == me)
                .Select(t => new { t.Id, t.InvestmentId, t.ProjectId, t.Amount, t.Status, t.SucceededAtUtc })
                .ToListAsync();

            var settled = myTransactions.Where(t => t.Status == PaymentStatus.Succeeded).ToList();
            var openRequests = myRequests.Where(r => r.Status == FundingRequestStatus.Open).ToList();

            var kpis = new InvestorKpisDto
            {
                PendingCount = pending.Count,
                PendingAmount = (double)pending.Sum(i => i.Amount),
                ApprovedCount = approved.Count,
                ApprovedAmount = (double)approved.Sum(i => i.Amount),
                PaymentDueCount = openRequests.Count,
                PaymentDueAmount = (double)openRequests.Sum(r => r.Amount),
                FundedCount = settled.Count,
                FundedAmount = (double)settled.Sum(t => t.Amount),
                VenturesFunded = settled.Select(t => t.ProjectId).Distinct().Count(),
                VenturesBacked = approved.Select(i => i.ProjectId).Distinct().Count(),
                WatchlistCount = watchlistCount,
                UnreadMessages = unreadMessages,
                DeclinedCount = declined.Count,
                RefundedAmount = (double)myTransactions.Where(t => t.Status == PaymentStatus.Refunded).Sum(t => t.Amount),
                FailedPaymentCount = myTransactions.Count(t => t.Status == PaymentStatus.Failed),
            };

            // --- pipeline (active first, newest activity first) ---
            var pipeline = mine
                .Select(i =>
                {
                    var open = myRequests.FirstOrDefault(r => r.InvestmentId == i.Id && r.Status == FundingRequestStatus.Open);
                    var paid = settled.FirstOrDefault(t => t.InvestmentId == i.Id);
                    var refunded = myTransactions.Any(t => t.InvestmentId == i.Id && t.Status == PaymentStatus.Refunded);
                    var processing = myTransactions.Any(t => t.InvestmentId == i.Id && t.Status == PaymentStatus.Processing);

                    return new PipelineItemDto
                    {
                        InvestmentId = i.Id,
                        ProjectId = i.ProjectId,
                        ProjectName = i.ProjectName,
                        Category = i.Category,
                        FounderId = i.FounderId,
                        FounderName = i.FounderName,
                        Amount = (double)i.Amount,
                        Stage = string.IsNullOrWhiteSpace(i.Stage) ? PipelineStages.New : i.Stage,
                        Status = i.Status,
                        Date = i.Date,
                        StageUpdatedAt = i.StageUpdatedAt,
                        InvestorNote = i.InvestorNote,
                        DeclinedReason = i.DeclinedReason,
                        CoverImageId = i.CoverImageId,
                        FundingState = FundingMath.StateOf(i.Status, paid != null, refunded, open != null, processing),
                        FundingRequestId = open?.Id,
                        AgreedAmount = open != null ? (double)open.Amount : null,
                        FundingRequestExpiresAt = open?.ExpiresAtUtc,
                        FundedAmount = paid != null ? (double)paid.Amount : null,
                        FundedAt = paid?.SucceededAtUtc,
                        // A failed attempt does not close the ask — the investor may try again.
                        CanRetry = open != null && open.LastAttemptStatus == PaymentStatus.Failed,
                    };
                })
                // Anything owed by the investor sorts to the top, ahead of recency.
                .OrderByDescending(p => p.FundingState == FundingMath.StatePaymentDue)
                .ThenByDescending(p => p.StageUpdatedAt ?? p.Date)
                .ToList();

            // --- portfolio: approved commitments, one row per venture ---
            var projectIds = approved.Select(a => a.ProjectId).Distinct().ToList();

            var latestUpdates = await _context.ProjectUpdates
                .AsNoTracking()
                .Where(u => projectIds.Contains(u.ProjectId))
                .GroupBy(u => u.ProjectId)
                .Select(g => g.OrderByDescending(u => u.CreatedDate)
                              .Select(u => new { u.ProjectId, u.Title, u.CreatedDate })
                              .First())
                .ToListAsync();

            // Venture-wide totals from the one definition, so the investor's view of a
            // venture's progress matches the venture's own page exactly.
            var ventureFunding = await FundingMath.SummariesAsync(_context, projectIds);

            var portfolio = approved
                .GroupBy(a => a.ProjectId)
                .Select(g =>
                {
                    var first = g.First();
                    var upd = latestUpdates.FirstOrDefault(u => u.ProjectId == g.Key);
                    var venture = ventureFunding.TryGetValue(g.Key, out var v)
                        ? v : FundingSummary.Empty(g.Key, first.Goal);

                    return new BackedVentureDto
                    {
                        ProjectId = g.Key,
                        ProjectName = first.ProjectName,
                        Category = first.Category,
                        Stage = first.ProjectStage,
                        FounderId = first.FounderId,
                        FounderName = first.FounderName,
                        MyCommitment = (double)g.Sum(x => x.Amount),
                        MyFunded = (double)settled.Where(t => t.ProjectId == g.Key).Sum(t => t.Amount),
                        MyPaymentDue = (double)openRequests.Where(r => r.ProjectId == g.Key).Sum(r => r.Amount),
                        Goal = (double)first.Goal,
                        TotalCommitted = (double)venture.Committed,
                        TotalFunded = (double)venture.Funded,
                        CoverImageId = first.CoverImageId,
                        LatestUpdateTitle = upd?.Title,
                        LatestUpdateDate = upd?.CreatedDate
                    };
                })
                // Money in first, then promises.
                .OrderByDescending(p => p.MyFunded)
                .ThenByDescending(p => p.MyCommitment)
                .ToList();

            // --- allocation (approved commitments only) ---
            // Grouped by Category — Industry no longer exists as a separate field.
            // "other" (lowercase) matches the ProjectCategories.Other key so the
            // frontend can translate the fallback bucket like any real category.
            var byIndustry = approved
                .GroupBy(a => string.IsNullOrWhiteSpace(a.Category) ? "other" : a.Category!)
                .Select(g => new AllocationSliceDto
                {
                    Label = g.Key,
                    Amount = (double)g.Sum(x => x.Amount),
                    Count = g.Select(x => x.ProjectId).Distinct().Count()
                })
                .OrderByDescending(s => s.Amount)
                .ToList();

            var byStage = approved
                .GroupBy(a => string.IsNullOrWhiteSpace(a.ProjectStage) ? "Unspecified" : a.ProjectStage!)
                .Select(g => new AllocationSliceDto
                {
                    Label = g.Key,
                    Amount = (double)g.Sum(x => x.Amount),
                    Count = g.Select(x => x.ProjectId).Distinct().Count()
                })
                .OrderByDescending(s => s.Amount)
                .ToList();

            // --- cumulative approved commitments by month ---
            // Both curves run month by month through to the present rather than stopping
            // at their last event, so they share an x axis and the gap between them is
            // read at the same instant on both. See MonthlySeries for the reasoning.
            var now = DateTime.UtcNow;

            var commitmentsOverTime = MonthlySeries.Cumulative(
                approved.Select(a => (a.Date, (double)a.Amount)), now);

            // --- cumulative settled capital by month ---
            var fundedOverTime = MonthlySeries.Cumulative(
                settled.Where(t => t.SucceededAtUtc.HasValue)
                       .Select(t => (t.SucceededAtUtc!.Value, (double)t.Amount)), now);

            // --- recent activity: my requests + payments + updates from ventures I back ---
            var activity = new List<InvestorActivityDto>();
            activity.AddRange(mine.OrderByDescending(i => i.Date).Take(8).Select(i => new InvestorActivityDto
            {
                Type = i.Status == "Approved" ? "approved"
                     : i.Status == PipelineStages.Declined ? "declined" : "commitment",
                Date = i.StageUpdatedAt ?? i.Date,
                ProjectId = i.ProjectId,
                ProjectName = i.ProjectName,
                Amount = (double)i.Amount
            }));
            activity.AddRange(myTransactions
                .Where(t => t.Status is PaymentStatus.Succeeded or PaymentStatus.Refunded or PaymentStatus.Failed)
                .OrderByDescending(t => t.Id)
                .Take(8)
                .Select(t => new InvestorActivityDto
                {
                    Type = t.Status switch
                    {
                        PaymentStatus.Succeeded => "funded",
                        PaymentStatus.Refunded => "refunded",
                        _ => "payment_failed",
                    },
                    Date = t.SucceededAtUtc ?? DateTime.UtcNow,
                    ProjectId = t.ProjectId,
                    ProjectName = mine.FirstOrDefault(m => m.ProjectId == t.ProjectId)?.ProjectName,
                    Amount = (double)t.Amount,
                }));
            activity.AddRange(latestUpdates.Select(u => new InvestorActivityDto
            {
                Type = "update",
                Date = u.CreatedDate,
                ProjectId = u.ProjectId,
                ProjectName = approved.First(a => a.ProjectId == u.ProjectId).ProjectName,
                Text = u.Title
            }));

            return Ok(new InvestorDashboardDto
            {
                Kpis = kpis,
                Pipeline = pipeline,
                Portfolio = portfolio,
                ByIndustry = byIndustry,
                ByStage = byStage,
                CommitmentsOverTime = commitmentsOverTime,
                FundedOverTime = fundedOverTime,
                RecentActivity = activity.OrderByDescending(a => a.Date).Take(10).ToList(),
                WatchlistCount = watchlistCount
            });
        }
    }
}
