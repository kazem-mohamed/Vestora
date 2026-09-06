using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyAppApi.Data;
using MyAppApi.Data.Models;
using MyAppApi.Data.Models.DTOs;
using MyAppApi.Services;
using System.Linq;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace MyAppApi.Controllers
{
    // F10 engagement: view tracking, per-venture analytics, and reviews.
    // Shares the api/projects prefix with ProjectsController (literal segments
    // like "view"/"analytics"/"reviews" disambiguate from the {id} routes).
    [Route("api/projects")]
    [ApiController]
    public class ProjectEngagementController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ProjectEngagementController(AppDbContext context)
        {
            _context = context;
        }

        private int? GetOptionalUserId()
        {
            var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(raw, out var id) ? id : (int?)null;
        }

        private string Fingerprint()
        {
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "0";
            var ua = Request.Headers.UserAgent.ToString();
            var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(ip + "|" + ua));
            return Convert.ToHexString(bytes)[..32];
        }

        // Record a project-detail view (guests included). De-duped per viewer /
        // fingerprint within a 30-minute window so refreshes don't inflate counts.
        [HttpPost("{projectId}/view")]
        [AllowAnonymous]
        public async Task<IActionResult> TrackView(int projectId)
        {
            var exists = await _context.Projects.AnyAsync(p => p.Id == projectId);
            if (!exists) return NotFound();

            var viewerId = GetOptionalUserId();
            var fp = Fingerprint();
            var since = DateTime.UtcNow.AddMinutes(-30);

            var recent = viewerId.HasValue
                ? await _context.ProjectViews.AnyAsync(v =>
                    v.ProjectId == projectId && v.ViewerId == viewerId && v.CreatedAt >= since)
                : await _context.ProjectViews.AnyAsync(v =>
                    v.ProjectId == projectId && v.Fingerprint == fp && v.CreatedAt >= since);

            if (!recent)
            {
                _context.ProjectViews.Add(new ProjectView
                {
                    ProjectId = projectId,
                    ViewerId = viewerId,
                    Fingerprint = fp,
                    CreatedAt = DateTime.UtcNow
                });
                await _context.SaveChangesAsync();
            }

            return NoContent();
        }

        // Full analytics for a venture — owner only.
        [HttpGet("{projectId}/analytics")]
        [Authorize(Roles = "Innovator")]
        public async Task<IActionResult> GetAnalytics(int projectId)
        {
            var me = GetOptionalUserId();
            var project = await _context.Projects
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == projectId);
            if (project == null) return NotFound();
            if (project.OwnerId != me) return Forbid();

            var views = await _context.ProjectViews
                .AsNoTracking()
                .Where(v => v.ProjectId == projectId)
                .Select(v => new { v.ViewerId, v.Fingerprint, v.CreatedAt })
                .ToListAsync();

            var uniqueVisitors = views
                .Select(v => v.ViewerId.HasValue ? "u" + v.ViewerId : "f" + v.Fingerprint)
                .Distinct()
                .Count();

            var approved = await _context.Investments
                .AsNoTracking()
                .Where(i => i.ProjectId == projectId && i.Status == "Approved")
                .Select(i => new { i.Amount, i.Date, i.InvestorId })
                .ToListAsync();

            var saves = await _context.Bookmarks.CountAsync(b => b.ProjectId == projectId);
            var comments = await _context.Comments.CountAsync(c => c.ProjectId == projectId);
            var investors = approved.Where(a => a.InvestorId != null).Select(a => a.InvestorId).Distinct().Count();

            // Settled payments with their timestamps, for the funding curve below. The
            // founder's analytics used to plot approvals and call the line "raised".
            var settled = await _context.PaymentTransactions
                .AsNoTracking()
                .Where(t => t.ProjectId == projectId && t.Status == PaymentStatus.Succeeded)
                .Select(t => new { t.Amount, t.NetToFounder, t.SucceededAtUtc, t.InvestorId })
                .ToListAsync();

            var raised = settled.Sum(t => t.Amount);
            var committed = approved.Sum(a => a.Amount);

            // Daily views for the last 30 days (non-cumulative).
            // Every day in the window is emitted, including the ones nobody looked.
            // Grouping alone drops those days, which both shortens the series and closes
            // up the gaps — a venture seen on two days a fortnight apart drew a chart of
            // two adjacent points, and the quiet fortnight between them disappeared.
            // Zero views is a measurement, not a missing value.
            var now = DateTime.UtcNow;
            var from = now.Date.AddDays(-29);
            var viewsByDay = views
                .Where(v => v.CreatedAt >= from)
                .GroupBy(v => v.CreatedAt.Date)
                .ToDictionary(g => g.Key, g => (double)g.Count());

            var viewsOverTime = Enumerable.Range(0, 30)
                .Select(i => from.AddDays(i))
                .Select(day => new TimePointDto
                {
                    Label = day.ToString("yyyy-MM-dd"),
                    Value = viewsByDay.TryGetValue(day, out var n) ? n : 0
                })
                .ToList();

            // Cumulative committed capital by month — the promises curve.
            var commitmentsOverTime = MonthlySeries.Cumulative(
                approved.Select(a => (a.Date, (double)a.Amount)), now);

            // Cumulative settled capital by month — the money curve.
            var fundingOverTime = MonthlySeries.Cumulative(
                settled.Where(t => t.SucceededAtUtc.HasValue)
                       .Select(t => (t.SucceededAtUtc!.Value, (double)t.Amount)), now);

            return Ok(new ProjectAnalyticsDto
            {
                Views = views.Count,
                UniqueVisitors = uniqueVisitors,
                Saves = saves,
                Comments = comments,
                Investors = investors,
                FundedInvestors = settled.Select(t => t.InvestorId).Distinct().Count(),
                Raised = (double)raised,
                Committed = (double)committed,
                NetProceeds = (double)settled.Sum(t => t.NetToFounder),
                Goal = (double)project.InvestmentNeeded,
                // Conversion now measures visitors who actually funded, not visitors who
                // were approved — a much harsher and much more truthful ratio.
                ConversionRate = uniqueVisitors > 0 ? Math.Round((double)investors / uniqueVisitors * 100, 1) : 0,
                ViewsOverTime = viewsOverTime,
                FundingOverTime = fundingOverTime,
                CommitmentsOverTime = commitmentsOverTime
            });
        }

        /// <summary>
        /// Endorsements for a venture (public). Traits are tallied, never averaged —
        /// "4 of 5 backers say they'd back this founder again" is checkable; "4.2 stars"
        /// is not.
        /// </summary>
        [HttpGet("{projectId}/reviews")]
        [AllowAnonymous]
        public async Task<IActionResult> GetReviews(int projectId)
        {
            var project = await _context.Projects
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == projectId);
            if (project == null) return NotFound();

            var items = await _context.Reviews
                .AsNoTracking()
                .Where(r => r.ProjectId == projectId)
                .OrderByDescending(r => r.UpdatedAt ?? r.CreatedAt)
                .Select(r => new EndorsementDto
                {
                    Id = r.Id,
                    InvestorId = r.InvestorId,
                    InvestorName = _context.Users
                        .Where(u => u.Id == r.InvestorId)
                        .Select(u => u.UserName)
                        .FirstOrDefault() ?? "Backer",
                    HasAvatar = _context.Users
                        .Where(u => u.Id == r.InvestorId)
                        .Select(u => u.ProfileImage != null)
                        .FirstOrDefault(),
                    Communicative = r.Communicative,
                    Transparent = r.Transparent,
                    DeliveredOnPlan = r.DeliveredOnPlan,
                    WouldBackAgain = r.WouldBackAgain,
                    Content = r.Content,
                    CreatedAt = r.CreatedAt,
                    UpdatedAt = r.UpdatedAt,
                    // Written under the old star system: carries a rating and no traits.
                    IsLegacy = !r.Communicative && !r.Transparent &&
                               !r.DeliveredOnPlan && !r.WouldBackAgain && r.Rating > 0,
                })
                .ToListAsync();

            var me = GetOptionalUserId();
            var hasEndorsed = me.HasValue && items.Any(i => i.InvestorId == me.Value);
            var canEndorse = false;
            if (me.HasValue && !hasEndorsed)
            {
                canEndorse = await IsEligibleToEndorseAsync(projectId, me.Value, project.InvestmentNeeded);
            }

            return Ok(new EndorsementSummaryDto
            {
                Count = items.Count,
                CommunicativeCount = items.Count(i => i.Communicative),
                TransparentCount = items.Count(i => i.Transparent),
                DeliveredOnPlanCount = items.Count(i => i.DeliveredOnPlan),
                WouldBackAgainCount = items.Count(i => i.WouldBackAgain),
                CanEndorse = canEndorse,
                HasEndorsed = hasEndorsed,
                Items = items
            });
        }

        /// <summary>
        /// Post or replace an endorsement. Only an approved backer of a venture whose
        /// round is fully committed may write one — the eligibility rule is unchanged,
        /// and it is what keeps this from becoming manufacturable social proof.
        /// </summary>
        [HttpPost("{projectId}/reviews")]
        [Authorize(Roles = "Investor")]
        public async Task<IActionResult> SubmitReview(int projectId, [FromBody] SubmitEndorsementDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var me = GetOptionalUserId()!.Value;
            var project = await _context.Projects
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == projectId);
            if (project == null) return NotFound();

            if (!await IsEligibleToEndorseAsync(projectId, me, project.InvestmentNeeded))
            {
                return BadRequest(new { message = "Only approved backers of a fully committed venture can endorse it." });
            }

            // An endorsement with nothing endorsed and nothing written is not an opinion.
            var anyTrait = dto.Communicative || dto.Transparent || dto.DeliveredOnPlan || dto.WouldBackAgain;
            var text = string.IsNullOrWhiteSpace(dto.Content) ? null : dto.Content.Trim();
            if (!anyTrait && text == null)
            {
                return BadRequest(new { message = "Endorse at least one point, or write a note." });
            }

            var existing = await _context.Reviews
                .FirstOrDefaultAsync(r => r.ProjectId == projectId && r.InvestorId == me);

            if (existing != null)
            {
                existing.Communicative = dto.Communicative;
                existing.Transparent = dto.Transparent;
                existing.DeliveredOnPlan = dto.DeliveredOnPlan;
                existing.WouldBackAgain = dto.WouldBackAgain;
                existing.Content = text;
                // CreatedAt is the original endorsement date and stays put; edits are
                // recorded separately so the record does not rewrite its own history.
                existing.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                _context.Reviews.Add(new Review
                {
                    ProjectId = projectId,
                    InvestorId = me,
                    Communicative = dto.Communicative,
                    Transparent = dto.Transparent,
                    DeliveredOnPlan = dto.DeliveredOnPlan,
                    WouldBackAgain = dto.WouldBackAgain,
                    Content = text,
                    CreatedAt = DateTime.UtcNow
                });
            }
            await _context.SaveChangesAsync();

            return Ok(new { message = "Endorsement saved." });
        }

        /// <summary>
        /// Eligible = this investor actually funded the venture, AND the round is fully
        /// funded.
        /// <para>
        /// Both halves got stricter when money became real. An endorsement is a statement
        /// about how a founder behaved toward someone who put capital in — it carries no
        /// weight from someone who was merely approved and never paid, and a round that
        /// collected signatures but no money has not yet given anyone anything to judge.
        /// </para>
        /// </summary>
        private async Task<bool> IsEligibleToEndorseAsync(int projectId, int investorId, decimal goal)
        {
            var hasFunded = await _context.PaymentTransactions.AnyAsync(t =>
                t.ProjectId == projectId && t.InvestorId == investorId && t.Status == PaymentStatus.Succeeded);
            if (!hasFunded) return false;

            var funded = await _context.PaymentTransactions
                .Where(t => t.ProjectId == projectId && t.Status == PaymentStatus.Succeeded)
                .SumAsync(t => (decimal?)t.Amount) ?? 0m;

            return goal > 0m && funded >= goal;
        }
    }
}
