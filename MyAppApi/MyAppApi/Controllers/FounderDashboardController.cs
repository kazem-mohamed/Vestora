using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyAppApi.Data;
using MyAppApi.Data.Models;
using MyAppApi.Data.Models.DTOs;
using MyAppApi.Services;
using MyAppApi.Services.Payments;
using System.Linq;
using System.Security.Claims;

namespace MyAppApi.Controllers
{
    // Aggregated read model for the founder "control room" dashboard.
    // One request returns every KPI, chart series and queue the overview needs.
    [Route("api/dashboard")]
    [ApiController]
    [Authorize(Roles = "Innovator")]
    public class FounderDashboardController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly PaymentService _payments;

        public FounderDashboardController(AppDbContext context, PaymentService payments)
        {
            _context = context;
            _payments = payments;
        }

        private int GetCurrentUserId() =>
            int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        [HttpGet("founder")]
        public async Task<IActionResult> GetFounderDashboard()
        {
            var me = GetCurrentUserId();

            // --- Raw pulls (kept small, then aggregated in memory) ---
            var projects = await _context.Projects
                .AsNoTracking()
                .Where(p => p.OwnerId == me)
                .Select(p => new { p.Id, p.Name, p.Category, p.InvestmentNeeded })
                .ToListAsync();
            var projectIds = projects.Select(p => p.Id).ToList();
            var projectNameById = projects.ToDictionary(p => p.Id, p => p.Name);

            var approved = await _context.Investments
                .AsNoTracking()
                .Where(i => projectIds.Contains(i.ProjectId) && i.Status == "Approved")
                .Select(i => new { i.ProjectId, i.Amount, i.Date, i.InvestorId })
                .ToListAsync();

            var pending = await _context.Investments
                .AsNoTracking()
                .Where(i => projectIds.Contains(i.ProjectId) && i.Status == "Pending")
                .Select(i => new { i.Id, i.ProjectId, i.Amount, i.Date, i.InvestorId, i.ContactInfo })
                .ToListAsync();

            var followerDates = await _context.Follows
                .AsNoTracking()
                .Where(f => f.FollowedId == me)
                .Select(f => f.CreatedDate)
                .ToListAsync();

            var commentsCount = await _context.Comments.CountAsync(c => projectIds.Contains(c.ProjectId));
            var unreadMessages = await _context.Messages.CountAsync(m => m.ReceiverId == me && !m.IsRead);

            // --- Money, from the one place that defines it ---
            var funding = await FundingMath.SummariesAsync(_context, projectIds);

            // Every transaction across this founder's ventures, for the settled curve and
            // the failure counts. Bounded by ownership, so no paging needed.
            var transactions = await _context.PaymentTransactions
                .AsNoTracking()
                .Where(t => projectIds.Contains(t.ProjectId))
                .Select(t => new
                {
                    t.ProjectId, t.Status, t.Amount, t.FeeAmount, t.NetToFounder,
                    t.SucceededAtUtc, t.InvestorId, t.FundingRequestId
                })
                .ToListAsync();

            var settled = transactions.Where(t => t.Status == PaymentStatus.Succeeded).ToList();
            var refundedTx = transactions.Where(t => t.Status == PaymentStatus.Refunded).ToList();

            var openRequests = await _context.FundingRequests
                .AsNoTracking()
                .Where(f => projectIds.Contains(f.ProjectId) && f.Status == FundingRequestStatus.Open)
                .Select(f => new
                {
                    f.Id, f.Reference, f.InvestmentId, f.ProjectId, f.InvestorId,
                    f.Amount, f.CreatedAtUtc, f.ExpiresAtUtc,
                    InvestorName = f.Investment.Investor!.UserName,
                    AttemptCount = f.Transactions.Count,
                    LastAttemptStatus = f.Transactions
                        .OrderByDescending(t => t.AttemptNumber)
                        .Select(t => t.Status)
                        .FirstOrDefault(),
                })
                .ToListAsync();

            // --- KPIs ---
            var kpis = new FounderKpisDto
            {
                VenturesCount = projects.Count,
                // Funded, not "enough people said yes". This single line is the change
                // the whole payment system exists to make honest.
                FundedVenturesCount = projects.Count(p =>
                    funding.TryGetValue(p.Id, out var f) && f.IsFullyFunded),
                FullyCommittedVenturesCount = projects.Count(p =>
                    funding.TryGetValue(p.Id, out var f) && f.IsFullyCommitted && !f.IsFullyFunded),
                TotalCommitted = (double)approved.Sum(a => a.Amount),
                TotalFunded = (double)settled.Sum(t => t.Amount),
                NetProceeds = (double)settled.Sum(t => t.NetToFounder),
                PlatformFees = (double)settled.Sum(t => t.FeeAmount),
                AwaitingPayment = (double)openRequests.Sum(r => r.Amount),
                AwaitingPaymentCount = openRequests.Count,
                TotalGoal = (double)projects.Sum(p => p.InvestmentNeeded),
                TotalInvestors = approved.Where(a => a.InvestorId != null)
                    .Select(a => a.InvestorId).Distinct().Count(),
                FundedInvestors = settled.Select(t => t.InvestorId).Distinct().Count(),
                PendingRequestsCount = pending.Count,
                PendingRequestsAmount = (double)pending.Sum(p => p.Amount),
                FollowersCount = followerDates.Count,
                CommentsCount = commentsCount,
                UnreadMessages = unreadMessages,
                RefundedAmount = (double)refundedTx.Sum(t => t.Amount),
                RefundedCount = refundedTx.Count,
                FailedPaymentCount = transactions.Count(t => t.Status == PaymentStatus.Failed),
            };

            // --- Two curves: what was promised, and what arrived ---
            var fundingOverTime = CumulativeByMonth(
                approved.Select(a => (a.Date, (double)a.Amount)));

            var fundedOverTime = CumulativeByMonth(
                settled.Where(t => t.SucceededAtUtc.HasValue)
                       .Select(t => (t.SucceededAtUtc!.Value, (double)t.Amount)));

            var awaitingPayment = openRequests
                .Select(r => new AwaitingPaymentDto
                {
                    FundingRequestId = r.Id,
                    Reference = r.Reference,
                    InvestmentId = r.InvestmentId,
                    ProjectId = r.ProjectId,
                    ProjectName = projectNameById.GetValueOrDefault(r.ProjectId, string.Empty),
                    InvestorId = r.InvestorId,
                    InvestorName = r.InvestorName ?? string.Empty,
                    Amount = r.Amount,
                    NetProceeds = r.Amount - Math.Round(r.Amount * _payments.Settings.FeeRateBps / 10000m, 2,
                        MidpointRounding.AwayFromZero),
                    CreatedAtUtc = r.CreatedAtUtc,
                    ExpiresAtUtc = r.ExpiresAtUtc,
                    AttemptCount = r.AttemptCount,
                    LastAttemptStatus = r.LastAttemptStatus,
                })
                .OrderBy(r => r.ExpiresAtUtc)
                .ToList();

            // --- Follower growth (cumulative, by month) ---
            var followerGrowth = CumulativeByMonth(
                followerDates.Select(d => (d, 1.0)));

            // --- Investor growth (cumulative DISTINCT investors, by month) ---
            // Distinct because one investor backing twice is still one investor.
            var investorGrowth = MonthlySeries.CumulativeDistinct(
                approved.Where(a => a.InvestorId != null)
                        .Select(a => (a.Date, a.InvestorId!.Value)),
                DateTime.UtcNow);

            // --- Funding by venture: settled in front, committed behind ---
            var fundingByVenture = projects
                .Select(p => new VentureFundingDto
                {
                    Id = p.Id,
                    Name = p.Name,
                    Raised = (double)(funding.TryGetValue(p.Id, out var f) ? f.Funded : 0m),
                    Committed = (double)(funding.TryGetValue(p.Id, out var f2) ? f2.Committed : 0m),
                    Goal = (double)p.InvestmentNeeded
                })
                .OrderByDescending(v => v.Committed)
                .ToList();

            // --- Approved vs pending ---
            var approvedVsPending = new ApprovedVsPendingDto
            {
                ApprovedCount = approved.Count,
                ApprovedAmount = (double)approved.Sum(a => a.Amount),
                PendingCount = pending.Count,
                PendingAmount = (double)pending.Sum(p => p.Amount)
            };

            // --- Pending approvals queue (with notification id + investor name) ---
            var pendingInvIds = pending.Select(p => p.Id).ToList();
            var notifByInv = (await _context.Notifications
                    .AsNoTracking()
                    .Where(n => n.UserId == me && n.NotificationType == "ProjectSupported"
                                && n.InvestmentId != null && pendingInvIds.Contains(n.InvestmentId.Value))
                    .Select(n => new { n.NotificationId, InvestmentId = n.InvestmentId!.Value })
                    .ToListAsync())
                .GroupBy(n => n.InvestmentId)
                .ToDictionary(g => g.Key, g => g.First().NotificationId);

            var investorIds = pending.Where(p => p.InvestorId != null)
                .Select(p => p.InvestorId!.Value).Distinct().ToList();
            var investorNames = await _context.Users
                .AsNoTracking()
                .Where(u => investorIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, u => u.UserName);

            var pendingApprovals = pending
                .Select(p => new PendingApprovalDto
                {
                    InvestmentId = p.Id,
                    NotificationId = notifByInv.GetValueOrDefault(p.Id),
                    ProjectId = p.ProjectId,
                    ProjectName = projectNameById.GetValueOrDefault(p.ProjectId, string.Empty),
                    InvestorId = p.InvestorId ?? 0,
                    InvestorName = p.InvestorId != null
                        ? investorNames.GetValueOrDefault(p.InvestorId.Value, string.Empty)
                        : string.Empty,
                    Amount = (double)p.Amount,
                    Date = p.Date,
                    ContactInfo = p.ContactInfo
                })
                .OrderByDescending(x => x.Date)
                .ToList();

            // --- Full relationship pipeline (every stage, declines included) ---
            var allRelations = await _context.Investments
                .AsNoTracking()
                .Where(i => projectIds.Contains(i.ProjectId))
                .Select(i => new
                {
                    i.Id,
                    i.ProjectId,
                    i.Amount,
                    i.Date,
                    i.Status,
                    i.Stage,
                    i.StageUpdatedAt,
                    i.ContactInfo,
                    i.FounderNote,
                    i.DeclinedReason,
                    i.InvestorId,
                    InvestorName = i.Investor != null ? i.Investor.UserName : null,
                    InvestorThesis = i.Investor != null ? i.Investor.InvestmentThesis : null,
                    InvestorTicketMin = i.Investor != null ? i.Investor.TicketMin : null,
                    InvestorTicketMax = i.Investor != null ? i.Investor.TicketMax : null,
                    InvestorIndustries = i.Investor != null ? i.Investor.PreferredIndustries : null
                })
                .ToListAsync();

            var notifByInvestmentId = (await _context.Notifications
                    .AsNoTracking()
                    .Where(n => n.UserId == me && n.NotificationType == "ProjectSupported" && n.InvestmentId != null)
                    .Select(n => new { n.NotificationId, InvestmentId = n.InvestmentId!.Value })
                    .ToListAsync())
                .GroupBy(n => n.InvestmentId)
                .ToDictionary(g => g.Key, g => g.First().NotificationId);

            var fullPipeline = allRelations
                .Select(r => new FounderPipelineItemDto
                {
                    InvestmentId = r.Id,
                    NotificationId = notifByInvestmentId.GetValueOrDefault(r.Id),
                    ProjectId = r.ProjectId,
                    ProjectName = projectNameById.GetValueOrDefault(r.ProjectId, string.Empty),
                    InvestorId = r.InvestorId ?? 0,
                    InvestorName = r.InvestorName ?? string.Empty,
                    Amount = (double)r.Amount,
                    Stage = string.IsNullOrWhiteSpace(r.Stage) ? "New" : r.Stage,
                    Status = r.Status,
                    Date = r.Date,
                    StageUpdatedAt = r.StageUpdatedAt,
                    ContactInfo = r.ContactInfo,
                    FounderNote = r.FounderNote,
                    DeclinedReason = r.DeclinedReason,
                    InvestorThesis = r.InvestorThesis,
                    InvestorTicketMin = r.InvestorTicketMin,
                    InvestorTicketMax = r.InvestorTicketMax,
                    InvestorIndustries = r.InvestorIndustries
                })
                .OrderByDescending(p => p.StageUpdatedAt ?? p.Date)
                .ToList();

            // --- Top ventures ---
            var topVentures = projects
                .Select(p =>
                {
                    var f = funding.TryGetValue(p.Id, out var s) ? s : FundingSummary.Empty(p.Id, p.InvestmentNeeded);
                    return new TopVentureDto
                    {
                        Id = p.Id,
                        Name = p.Name,
                        Category = p.Category,
                        Raised = (double)f.Funded,
                        Committed = (double)f.Committed,
                        Goal = (double)p.InvestmentNeeded,
                        Investors = f.CommittedInvestors,
                        FundedInvestors = f.FundedInvestors,
                        Pct = f.FundedPct,
                        CommittedPct = f.CommittedPct,
                        Status = f.Status
                    };
                })
                .OrderByDescending(v => v.Committed)
                .Take(6)
                .ToList();

            // --- Recent comments on my ventures ---
            var recentComments = await _context.Comments
                .AsNoTracking()
                .Where(c => projectIds.Contains(c.ProjectId))
                .OrderByDescending(c => c.CreatedDate)
                .Take(6)
                .Select(c => new RecentCommentDto
                {
                    Id = c.Id,
                    ProjectId = c.ProjectId,
                    ProjectName = c.Project.Name,
                    UserId = c.UserId,
                    UserName = c.User.UserName,
                    Content = c.Content,
                    Date = c.CreatedDate
                })
                .ToListAsync();

            // --- Unified recent activity feed ---
            var recentFollows = await _context.Follows
                .AsNoTracking()
                .Where(f => f.FollowedId == me)
                .OrderByDescending(f => f.CreatedDate)
                .Take(5)
                .Join(_context.Users, f => f.FollowerId, u => u.Id,
                    (f, u) => new { u.UserName, f.CreatedDate })
                .ToListAsync();

            var activity = new List<ActivityDto>();
            activity.AddRange(approved
                .OrderByDescending(a => a.Date)
                .Take(6)
                .Select(a => new ActivityDto
                {
                    Type = "investment",
                    Date = a.Date,
                    ProjectId = a.ProjectId,
                    ProjectName = projectNameById.GetValueOrDefault(a.ProjectId, string.Empty),
                    Amount = (double)a.Amount
                }));
            activity.AddRange(recentComments.Take(5).Select(c => new ActivityDto
            {
                Type = "comment",
                Date = c.Date,
                ProjectId = c.ProjectId,
                ProjectName = c.ProjectName,
                ActorName = c.UserName,
                Text = c.Content
            }));
            activity.AddRange(recentFollows.Select(f => new ActivityDto
            {
                Type = "follow",
                Date = f.CreatedDate,
                ActorName = f.UserName
            }));
            var recentActivity = activity.OrderByDescending(a => a.Date).Take(10).ToList();

            return Ok(new FounderDashboardDto
            {
                Kpis = kpis,
                FundingOverTime = fundingOverTime,
                FundedOverTime = fundedOverTime,
                FundingByVenture = fundingByVenture,
                ApprovedVsPending = approvedVsPending,
                AwaitingPayment = awaitingPayment,
                FollowerGrowth = followerGrowth,
                InvestorGrowth = investorGrowth,
                PendingApprovals = pendingApprovals,
                Pipeline = fullPipeline,
                TopVentures = topVentures,
                RecentComments = recentComments,
                RecentActivity = recentActivity
            });
        }

        // Groups (date, value) pairs by calendar month and returns a running total,
        // carried through to the present month. The definition lives in MonthlySeries so
        // the investor dashboard plots the same shape — see the note there for why a
        // quiet month has to be emitted rather than skipped.
        private static List<TimePointDto> CumulativeByMonth(IEnumerable<(DateTime Date, double Value)> points)
            => MonthlySeries.Cumulative(points, DateTime.UtcNow);
    }
}
