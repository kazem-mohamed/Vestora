using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyAppApi.Data;
using MyAppApi.Data.Models;
using MyAppApi.Data.Models.DTOs;
using MyAppApi.Services;

namespace MyAppApi.Controllers
{
    /// <summary>
    /// One account, everything attached to it.
    /// <para>
    /// Kept out of <see cref="AdminController"/> deliberately: that controller manages
    /// the user list and the actions taken on it, and this reads across half the schema
    /// to answer a different question. Same split as moderation and revenue.
    /// </para>
    /// <para>
    /// Query filters are ignored throughout. A suspended or removed account is precisely
    /// the one an administrator opens this page to look at, and a screen that hides its
    /// own subject is worse than no screen.
    /// </para>
    /// </summary>
    [Route("api/admin")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class AdminUserOverviewController : ControllerBase
    {
        private readonly AppDbContext _db;

        public AdminUserOverviewController(AppDbContext db) => _db = db;

        /// <summary>How much history to show before the reader has to go to the full log.</summary>
        private const int RecentLimit = 12;

        [HttpGet("users/{userId:int}/overview")]
        public async Task<IActionResult> GetOverview(int userId, CancellationToken ct)
        {
            var user = await _db.Users
                .AsNoTracking()
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => u.Id == userId, ct);

            if (user == null) return NotFound(new { message = "User not found." });

            var dto = new AdminUserOverviewDto
            {
                Account = new AdminAccountDto
                {
                    Id = user.Id,
                    UserName = user.UserName,
                    Email = user.Email,
                    UserType = user.UserType,
                    Phone = user.Phone,
                    BriefBio = user.BriefBio,
                    IsEmailVerified = user.IsEmailVerified,
                    EmailVerifiedAtUtc = user.EmailVerifiedAtUtc,
                    CreatedAtUtc = user.CreatedAtUtc,
                    LastSeenAt = user.LastSeenAt,
                    OnboardedAtUtc = user.OnboardedAtUtc,
                    IsSuspended = user.IsSuspended,
                    SuspendedAtUtc = user.SuspendedAtUtc,
                    SuspensionReason = user.SuspensionReason,
                    IsDeleted = user.IsDeleted,
                    DeletedAtUtc = user.DeletedAtUtc,
                },
            };

            await FillSecurityAsync(dto, user, ct);
            var projectIds = await FillVenturesAsync(dto, userId, ct);
            await FillReportsAsync(dto, userId, projectIds, ct);
            await FillDealsAsync(dto, userId, projectIds, ct);
            await FillPaymentsAsync(dto, userId, projectIds, ct);
            await FillActivityAsync(dto, userId, ct);

            dto.UnreadMessages = await _db.Messages
                .IgnoreQueryFilters()
                .CountAsync(m => m.ReceiverId == userId && !m.IsRead, ct);

            return Ok(dto);
        }

        // ==================================================================

        private async Task FillSecurityAsync(AdminUserOverviewDto dto, User user, CancellationToken ct)
        {
            // Matched on id or address: a failed sign-in against a mistyped password
            // carries the user id, but one against an address that does not resolve to an
            // account carries only the address — and both belong on this page.
            var logs = _db.SecurityLogs
                .AsNoTracking()
                .Where(l => l.UserId == user.Id || (l.Email != null && l.Email == user.Email));

            dto.Security = new AdminSecuritySnapshotDto
            {
                FailedLoginCount = user.FailedLoginCount,
                LockoutEndUtc = user.LockoutEndUtc,
                LastFailedLoginAtUtc = user.LastFailedLoginAtUtc,
                IsLockedOut = user.LockoutEndUtc.HasValue && user.LockoutEndUtc > DateTime.UtcNow,
                DistinctIpCount = await logs
                    .Where(l => l.IpAddress != null)
                    .Select(l => l.IpAddress)
                    .Distinct()
                    .CountAsync(ct),
                RecentEvents = await logs
                    .OrderByDescending(l => l.CreatedAtUtc)
                    .Take(RecentLimit)
                    .Select(l => new SecurityEventDto
                    {
                        Id = l.Id,
                        EventType = l.EventType,
                        IpAddress = l.IpAddress,
                        Details = l.Details,
                        CreatedAtUtc = l.CreatedAtUtc,
                    })
                    .ToListAsync(ct),
            };
        }

        /// <summary>Returns the ids of the ventures this account owns, for the sections below.</summary>
        private async Task<List<int>> FillVenturesAsync(AdminUserOverviewDto dto, int userId, CancellationToken ct)
        {
            var ventures = await _db.Projects
                .AsNoTracking()
                .IgnoreQueryFilters()
                .Where(p => p.OwnerId == userId)
                .Select(p => new
                {
                    p.Id,
                    p.Name,
                    p.Category,
                    p.ModerationStatus,
                    p.ModerationNote,
                    p.IsDeleted,
                    p.CreatedDate,
                })
                .ToListAsync(ct);

            var ids = ventures.Select(v => v.Id).ToList();
            if (ids.Count == 0) return ids;

            // The money is asked for, never worked out here.
            var funding = await FundingMath.SummariesAsync(_db, ids, ct);

            var openReports = await _db.Reports
                .AsNoTracking()
                .Where(r => ids.Contains(r.ProjectId) && r.Status == "Open")
                .GroupBy(r => r.ProjectId)
                .Select(g => new { ProjectId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(g => g.ProjectId, g => g.Count, ct);

            dto.Ventures = ventures.Select(v =>
            {
                var f = funding.TryGetValue(v.Id, out var s) ? s : FundingSummary.Empty(v.Id, 0m);
                return new AdminUserVentureDto
                {
                    ProjectId = v.Id,
                    Name = v.Name,
                    Category = v.Category,
                    ModerationStatus = v.ModerationStatus,
                    ModerationNote = v.ModerationNote,
                    IsDeleted = v.IsDeleted,
                    CreatedDate = v.CreatedDate,
                    Goal = f.Goal,
                    Committed = f.Committed,
                    Funded = f.Funded,
                    CommittedInvestors = f.CommittedInvestors,
                    FundedInvestors = f.FundedInvestors,
                    OpenReports = openReports.TryGetValue(v.Id, out var n) ? n : 0,
                };
            })
            .OrderByDescending(v => v.OpenReports)
            .ThenByDescending(v => v.Committed)
            .ToList();

            return ids;
        }

        private async Task FillReportsAsync(
            AdminUserOverviewDto dto, int userId, List<int> projectIds, CancellationToken ct)
        {
            var againstThem = _db.Reports.AsNoTracking().Where(r => projectIds.Contains(r.ProjectId));
            var byThem = _db.Reports.AsNoTracking().Where(r => r.ReporterId == userId);

            dto.Reports = new AdminUserReportsDto
            {
                AgainstThemOpen = projectIds.Count == 0
                    ? 0
                    : await againstThem.CountAsync(r => r.Status == "Open", ct),
                AgainstThemTotal = projectIds.Count == 0 ? 0 : await againstThem.CountAsync(ct),
                FiledByThemTotal = await byThem.CountAsync(ct),
            };

            // Both directions in one list, because "this account is being reported" and
            // "this account reports everyone" are the same suspicion read from two ends.
            var mine = await byThem
                .Select(r => new { r.Id, r.ProjectId, r.Reason, r.Status, r.CreatedAt, FiledByThem = true })
                .ToListAsync(ct);

            var theirs = projectIds.Count == 0
                ? new List<AdminReportRow>()
                : await againstThem
                    .Select(r => new AdminReportRow(r.Id, r.ProjectId, r.Reason, r.Status, r.CreatedAt, false))
                    .ToListAsync(ct);

            var combined = mine
                .Select(r => new AdminReportRow(r.Id, r.ProjectId, r.Reason, r.Status, r.CreatedAt, true))
                .Concat(theirs)
                .OrderByDescending(r => r.CreatedAt)
                .Take(RecentLimit)
                .ToList();

            var names = await ProjectNamesAsync(combined.Select(r => r.ProjectId).ToList(), ct);

            dto.Reports.Recent = combined.Select(r => new AdminUserReportItemDto
            {
                Id = r.Id,
                ProjectId = r.ProjectId,
                ProjectName = names.TryGetValue(r.ProjectId, out var n) ? n : "—",
                Reason = r.Reason,
                Status = r.Status,
                CreatedAt = r.CreatedAt,
                FiledByThem = r.FiledByThem,
            }).ToList();
        }

        private record AdminReportRow(int Id, int ProjectId, string Reason, string Status, DateTime CreatedAt, bool FiledByThem);

        private async Task FillDealsAsync(
            AdminUserOverviewDto dto, int userId, List<int> projectIds, CancellationToken ct)
        {
            // Either side of the table. An account can be both at once — a founder who
            // also backs other people's ventures — and splitting that into two screens
            // would hide exactly the overlap worth looking at.
            var deals = await _db.Investments
                .AsNoTracking()
                .IgnoreQueryFilters()
                .Where(i => i.InvestorId == userId || projectIds.Contains(i.ProjectId))
                .Select(i => new
                {
                    i.Id,
                    i.ProjectId,
                    ProjectName = i.Project.Name,
                    FounderId = i.Project.OwnerId,
                    FounderName = i.Project.Owner.UserName,
                    i.InvestorId,
                    InvestorName = i.Investor != null ? i.Investor.UserName : null,
                    i.Amount,
                    i.Status,
                    i.Stage,
                    i.Date,
                    i.StageUpdatedAt,
                })
                .OrderByDescending(i => i.Date)
                .Take(50)
                .ToListAsync(ct);

            var settled = await FundingMath.SettledByInvestmentAsync(_db, deals.Select(d => d.Id).ToList(), ct);

            dto.Deals = deals.Select(d =>
            {
                var isInvestor = d.InvestorId == userId;
                return new AdminUserDealDto
                {
                    InvestmentId = d.Id,
                    ProjectId = d.ProjectId,
                    ProjectName = d.ProjectName,
                    Side = isInvestor ? "investor" : "founder",
                    CounterpartyId = isInvestor ? d.FounderId : d.InvestorId,
                    CounterpartyName = (isInvestor ? d.FounderName : d.InvestorName) ?? "—",
                    Amount = d.Amount,
                    Settled = settled.TryGetValue(d.Id, out var s) ? s : 0m,
                    Status = d.Status,
                    Stage = d.Stage,
                    Date = d.Date,
                    StageUpdatedAt = d.StageUpdatedAt,
                };
            }).ToList();
        }

        private async Task FillPaymentsAsync(
            AdminUserOverviewDto dto, int userId, List<int> projectIds, CancellationToken ct)
        {
            // Money they sent, and money sent to their ventures.
            var query = _db.PaymentTransactions
                .AsNoTracking()
                .IgnoreQueryFilters()
                .Where(t => t.InvestorId == userId || projectIds.Contains(t.ProjectId));

            var rows = await query
                .OrderByDescending(t => t.CreatedAtUtc)
                .Take(RecentLimit)
                .Select(t => new AdminUserTransactionDto
                {
                    Id = t.Id,
                    Reference = t.Reference,
                    ProjectId = t.ProjectId,
                    ProjectName = string.Empty,
                    Amount = t.Amount,
                    Currency = t.Currency,
                    Status = t.Status,
                    CreatedAtUtc = t.CreatedAtUtc,
                    SucceededAtUtc = t.SucceededAtUtc,
                    RefundedAtUtc = t.RefundedAtUtc,
                    RefundReason = t.RefundReason,
                    FailureMessage = t.FailureMessage,
                })
                .ToListAsync(ct);

            var names = await ProjectNamesAsync(rows.Select(r => r.ProjectId).ToList(), ct);
            foreach (var r in rows)
            {
                r.ProjectName = names.TryGetValue(r.ProjectId, out var n) ? n : "—";
            }

            var totals = await query
                .GroupBy(t => t.Status)
                .Select(g => new { Status = g.Key, Count = g.Count(), Total = g.Sum(t => t.Amount) })
                .ToListAsync(ct);

            decimal TotalFor(string status) => totals.FirstOrDefault(x => x.Status == status)?.Total ?? 0m;
            int CountFor(string status) => totals.FirstOrDefault(x => x.Status == status)?.Count ?? 0;

            dto.Payments = new AdminUserPaymentsDto
            {
                SettledTotal = TotalFor(PaymentStatus.Succeeded),
                RefundedTotal = TotalFor(PaymentStatus.Refunded),
                SucceededCount = CountFor(PaymentStatus.Succeeded),
                FailedCount = CountFor(PaymentStatus.Failed),
                RefundedCount = CountFor(PaymentStatus.Refunded),
                Recent = rows,
            };
        }

        private async Task FillActivityAsync(AdminUserOverviewDto dto, int userId, CancellationToken ct)
        {
            var entries = await _db.AdminAuditLogs
                .AsNoTracking()
                .Where(a => a.TargetType == "User" && a.TargetId == userId)
                .OrderByDescending(a => a.CreatedAtUtc)
                .Take(RecentLimit)
                .Select(a => new { a.Id, a.AdminUserId, a.Action, a.Details, a.CreatedAtUtc })
                .ToListAsync(ct);

            var adminIds = entries.Select(e => e.AdminUserId).Distinct().ToList();
            var adminNames = await _db.Users
                .AsNoTracking()
                .IgnoreQueryFilters()
                .Where(u => adminIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, u => u.UserName, ct);

            dto.Activity = entries.Select(e => new AdminUserAuditDto
            {
                Id = e.Id,
                AdminName = adminNames.TryGetValue(e.AdminUserId, out var n) ? n : $"#{e.AdminUserId}",
                Action = e.Action,
                Details = e.Details,
                CreatedAtUtc = e.CreatedAtUtc,
            }).ToList();
        }

        private async Task<Dictionary<int, string>> ProjectNamesAsync(List<int> ids, CancellationToken ct)
        {
            if (ids.Count == 0) return new Dictionary<int, string>();
            var distinct = ids.Distinct().ToList();
            return await _db.Projects
                .AsNoTracking()
                .IgnoreQueryFilters()
                .Where(p => distinct.Contains(p.Id))
                .ToDictionaryAsync(p => p.Id, p => p.Name, ct);
        }
    }
}
