using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyAppApi.Data;
using MyAppApi.Data.Models.DTOs;
using MyAppApi.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace MyAppApi.Controllers
{
    /// <summary>
    /// What a founder should do next, derived from what actually happened.
    /// <para>
    /// The existing analytics reported views, unique visitors and a conversion rate as
    /// three unrelated numbers, which told a founder how they were doing but never why
    /// or what to change. Expressed as a funnel — seen, saved, asked, approved, in
    /// discussion — the same data shows where interest is being lost, which is the only
    /// thing a founder can act on.
    /// </para>
    /// <para>
    /// Owner-only, and every stage is a real count. Nothing is modelled, estimated or
    /// benchmarked against invented averages.
    /// </para>
    /// </summary>
    [Route("api/insights")]
    [ApiController]
    [Authorize(Roles = "Innovator")]
    public class VentureInsightsController : ControllerBase
    {
        private readonly AppDbContext _db;

        public VentureInsightsController(AppDbContext db) => _db = db;

        private int Me() =>
            int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : 0;

        [HttpGet("venture/{projectId:int}")]
        public async Task<IActionResult> Venture(int projectId)
        {
            var me = Me();
            var project = await _db.Projects
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == projectId);

            if (project == null) return NotFound(new { message = "Venture not found." });
            if (project.OwnerId != me) return Forbid();

            // ---- The funnel, each step a distinct-people count so the stages are
            // ---- actually comparable to one another.
            //
            // Guests have no ViewerId, so uniqueness falls back to the hashed
            // ip+ua fingerprint — the same rule the venture analytics endpoint uses, so
            // the two surfaces cannot disagree about how many people saw a listing.
            var viewRows = await _db.ProjectViews
                .AsNoTracking()
                .Where(v => v.ProjectId == projectId)
                .Select(v => new { v.ViewerId, v.Fingerprint })
                .ToListAsync();

            var uniqueViewers = viewRows
                .Select(v => v.ViewerId.HasValue ? "u" + v.ViewerId : "f" + v.Fingerprint)
                .Distinct()
                .Count();

            var totalViews = viewRows.Count;
            var savedBy = await _db.Bookmarks.CountAsync(b => b.ProjectId == projectId);

            var investments = await _db.Investments
                .AsNoTracking()
                .Where(i => i.ProjectId == projectId)
                .Select(i => new { i.Status, i.Stage, i.Amount, i.Date, i.InvestorId })
                .ToListAsync();

            var requested = investments.Select(i => i.InvestorId).Distinct().Count();
            var approved = investments.Count(i => i.Status == "Approved");
            var inDiscussion = investments.Count(i =>
                i.Stage == PipelineStages.Contacted ||
                i.Stage == PipelineStages.InDiscussion ||
                i.Stage == PipelineStages.Committed);
            var declined = investments.Count(i => i.Stage == PipelineStages.Declined);

            var funnel = new List<FunnelStageDto>
            {
                new() { Key = "viewed", Count = uniqueViewers },
                new() { Key = "saved", Count = savedBy },
                new() { Key = "requested", Count = requested },
                new() { Key = "approved", Count = approved },
                new() { Key = "in_discussion", Count = inDiscussion },
            };

            // ---- Where attention is going: which documents are actually opened.
            var docEngagement = await _db.ProjectDocuments
                .AsNoTracking()
                .Where(d => d.ProjectId == projectId)
                .Select(d => new DocumentEngagementDto
                {
                    DocumentId = d.Id,
                    Title = d.Title,
                    Visibility = d.Visibility,
                    Opens = _db.DocumentDownloadLogs.Count(l => l.ProjectDocumentId == d.Id),
                    DistinctReaders = _db.DocumentDownloadLogs
                        .Where(l => l.ProjectDocumentId == d.Id)
                        .Select(l => l.UserId)
                        .Distinct()
                        .Count(),
                })
                .OrderByDescending(d => d.Opens)
                .ToListAsync();

            // ---- Relationships that have gone quiet. The most actionable thing here:
            // ---- an approved backer nobody followed up with is a lost round.
            var now = DateTime.UtcNow;
            var stalled = await _db.Investments
                .AsNoTracking()
                .Where(i => i.ProjectId == projectId &&
                            i.Status == "Approved" &&
                            i.Stage == PipelineStages.Approved)
                .Select(i => new StalledRelationshipDto
                {
                    InvestmentId = i.Id,
                    InvestorId = i.InvestorId ?? 0,
                    InvestorName = i.Investor != null ? i.Investor.UserName : "",
                    Amount = i.Amount,
                    Stage = i.Stage,
                    SinceUtc = i.StageUpdatedAt ?? i.Date,
                })
                .ToListAsync();

            foreach (var s in stalled)
                s.DaysWaiting = (int)Math.Floor((now - s.SinceUtc).TotalDays);

            // ---- Trust signals for this listing, from proven facts only.
            var milestoneTotal = await _db.Milestones.CountAsync(m => m.ProjectId == projectId);
            var milestoneDone = await _db.Milestones
                .CountAsync(m => m.ProjectId == projectId && m.Status == "Completed");
            var updateCount = await _db.ProjectUpdates.CountAsync(u => u.ProjectId == projectId);
            var teamCount = await _db.TeamMembers.CountAsync(t => t.ProjectId == projectId);

            var signals = TrustSignals.ForVenture(
                moderationApproved: project.ModerationStatus == "Approved",
                documentCount: docEngagement.Count,
                milestoneCount: milestoneTotal,
                completedMilestones: milestoneDone,
                updateCount: updateCount,
                teamCount: teamCount);

            var committed = investments.Where(i => i.Status == "Approved").Sum(i => i.Amount);

            return Ok(new VentureInsightsDto
            {
                ProjectId = projectId,
                ProjectName = project.Name,
                TotalViews = totalViews,
                Funnel = funnel,
                Declined = declined,
                CommittedAmount = committed,
                Goal = project.InvestmentNeeded,
                Documents = docEngagement,
                Stalled = stalled.OrderByDescending(s => s.DaysWaiting).ToList(),
                TrustSignals = signals
                    .Select(s => new TrustSignalDto
                    {
                        Key = s.Key,
                        Level = s.Level.ToString(),
                        Value = s.Value,
                    })
                    .ToList(),
                RoundClosedAtUtc = project.RoundClosedAtUtc,
                RoundOutcome = project.RoundOutcome,
            });
        }
    }
}
