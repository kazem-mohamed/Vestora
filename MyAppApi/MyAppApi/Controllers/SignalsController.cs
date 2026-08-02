using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyAppApi.Data;
using MyAppApi.Data.Models;
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
    /// Kept searches, and the in-app signals they produce.
    /// <para>
    /// Nothing on Vestora previously gave a member a reason to come back: every
    /// notification required already being on the site to see it. A saved search turns
    /// a one-off query into a standing interest, and the count of matches newer than
    /// the last look is computed on read — so there is no pre-generated feed to keep in
    /// sync, and no stale badge.
    /// </para>
    /// <para>
    /// Email delivery is intentionally absent. The stored query and its watermark are
    /// exactly what a digest would need, so adding one later changes no schema.
    /// </para>
    /// </summary>
    [Route("api/signals")]
    [ApiController]
    [Authorize]
    public class SignalsController : ControllerBase
    {
        private const int MaxSaved = 12;

        private readonly AppDbContext _db;

        public SignalsController(AppDbContext db) => _db = db;

        private int Me() =>
            int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : 0;

        // ==================================================================
        //  SAVED SEARCHES
        // ==================================================================

        [HttpGet("searches")]
        public async Task<IActionResult> ListSearches()
        {
            var me = Me();
            var saved = await _db.SavedSearches
                .AsNoTracking()
                .Where(s => s.UserId == me)
                .OrderByDescending(s => s.CreatedAtUtc)
                .ToListAsync();

            var result = new List<SavedSearchDto>();
            foreach (var s in saved)
            {
                result.Add(new SavedSearchDto
                {
                    Id = s.Id,
                    Name = s.Name,
                    Scope = s.Scope,
                    Search = s.Search,
                    Sector = s.Sector,
                    Location = s.Location,
                    Stage = s.Stage,
                    Commitment = s.Commitment,
                    CreatedAtUtc = s.CreatedAtUtc,
                    LastSeenAtUtc = s.LastSeenAtUtc,
                    NewMatches = await CountNewMatchesAsync(s),
                    TotalMatches = await CountMatchesAsync(s, sinceLastSeen: false),
                });
            }

            return Ok(result);
        }

        [HttpPost("searches")]
        public async Task<IActionResult> SaveSearch([FromBody] SaveSearchInput input)
        {
            var me = Me();

            var name = input.Name?.Trim();
            if (string.IsNullOrWhiteSpace(name))
                return BadRequest(new { message = "A name is required." });
            if (name.Length > 80) name = name[..80];

            if (input.Scope != "ventures" && input.Scope != "investors")
                return BadRequest(new { message = "Unknown scope." });

            // A saved search with no criteria is just "everything", which produces a
            // permanent unread badge and teaches the member to ignore signals.
            var hasCriteria =
                !string.IsNullOrWhiteSpace(input.Search) ||
                !string.IsNullOrWhiteSpace(input.Sector) ||
                !string.IsNullOrWhiteSpace(input.Location) ||
                !string.IsNullOrWhiteSpace(input.Stage) ||
                !string.IsNullOrWhiteSpace(input.Commitment);
            if (!hasCriteria)
                return BadRequest(new { message = "Add at least one filter before saving." });

            var count = await _db.SavedSearches.CountAsync(s => s.UserId == me);
            if (count >= MaxSaved)
                return BadRequest(new { message = $"You can keep up to {MaxSaved} searches." });

            var now = DateTime.UtcNow;
            var entity = new SavedSearch
            {
                UserId = me,
                Name = name,
                Scope = input.Scope,
                Search = Trim(input.Search, 120),
                Sector = Trim(input.Sector, 80),
                Location = Trim(input.Location, 80),
                Stage = Trim(input.Stage, 40),
                Commitment = Trim(input.Commitment, 20),
                CreatedAtUtc = now,
                // Saved now means "I have seen what exists now" — otherwise the first
                // visit opens with everything flagged as new.
                LastSeenAtUtc = now,
            };

            _db.SavedSearches.Add(entity);
            await _db.SaveChangesAsync();
            return Ok(new { message = "Search saved.", id = entity.Id });
        }

        [HttpPost("searches/{id:int}/seen")]
        public async Task<IActionResult> MarkSeen(int id)
        {
            var me = Me();
            var s = await _db.SavedSearches.FirstOrDefaultAsync(x => x.Id == id && x.UserId == me);
            if (s == null) return NotFound(new { message = "Saved search not found." });

            s.LastSeenAtUtc = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Ok(new { message = "Marked as seen." });
        }

        [HttpDelete("searches/{id:int}")]
        public async Task<IActionResult> DeleteSearch(int id)
        {
            var me = Me();
            var s = await _db.SavedSearches.FirstOrDefaultAsync(x => x.Id == id && x.UserId == me);
            if (s == null) return NotFound(new { message = "Saved search not found." });

            _db.SavedSearches.Remove(s);
            await _db.SaveChangesAsync();
            return Ok(new { message = "Search removed." });
        }

        private static string? Trim(string? v, int max)
        {
            if (string.IsNullOrWhiteSpace(v)) return null;
            v = v.Trim();
            return v.Length > max ? v[..max] : v;
        }

        private Task<int> CountNewMatchesAsync(SavedSearch s) => CountMatchesAsync(s, sinceLastSeen: true);

        /// <summary>
        /// Runs the stored query against live data. Reuses exactly the visibility rules
        /// the public surfaces use, so a saved search can never surface something its
        /// owner is not allowed to see.
        /// </summary>
        private async Task<int> CountMatchesAsync(SavedSearch s, bool sinceLastSeen)
        {
            if (s.Scope == "investors")
            {
                var q = _db.Users.OfType<Investor>()
                    .Where(i => i.ListedInDirectory && !i.IsSuspended);

                if (!string.IsNullOrWhiteSpace(s.Search))
                    q = q.Where(i => EF.Functions.Like(i.UserName, $"%{s.Search}%") ||
                                     (i.InvestmentThesis != null && EF.Functions.Like(i.InvestmentThesis, $"%{s.Search}%")));
                if (!string.IsNullOrWhiteSpace(s.Sector))
                    q = q.Where(i => i.PreferredIndustries != null &&
                                     EF.Functions.Like(i.PreferredIndustries, $"%{s.Sector}%"));
                if (sinceLastSeen)
                    q = q.Where(i => i.CreatedAtUtc > s.LastSeenAtUtc);

                return await q.CountAsync();
            }

            var v = _db.Projects
                .Where(p => p.ModerationStatus == "Approved" && p.LifecycleStatus != "Paused");

            if (!string.IsNullOrWhiteSpace(s.Search))
            {
                var term = s.Search;
                v = v.Where(p =>
                    EF.Functions.Like(p.Name, $"%{term}%") ||
                    (p.Topic != null && EF.Functions.Like(p.Topic, $"%{term}%")) ||
                    (p.Category != null && EF.Functions.Like(p.Category, $"%{term}%")) ||
                    (p.Industry != null && EF.Functions.Like(p.Industry, $"%{term}%")));
            }
            if (!string.IsNullOrWhiteSpace(s.Sector))
                v = v.Where(p => p.Category == s.Sector || p.Industry == s.Sector);
            if (!string.IsNullOrWhiteSpace(s.Location))
                v = v.Where(p => p.Location == s.Location);
            if (!string.IsNullOrWhiteSpace(s.Stage))
                v = v.Where(p => p.Stage == s.Stage);
            // Mirrors ProjectsController.ApplyBrowseFilters — a saved search must match
            // exactly what browse would have returned.
            if (s.Commitment == "open")
                v = v.Where(p => p.Investments.Where(i => i.Status == "Approved").Sum(i => (decimal?)i.Amount) < p.InvestmentNeeded
                                 || !p.Investments.Any(i => i.Status == "Approved"));
            else if (s.Commitment == "committed")
                v = v.Where(FundingMath.IsFullyCommitted);
            else if (s.Commitment == "funded")
                v = v.Where(FundingMath.IsFullyFunded);

            // A closed round is not a new opportunity.
            v = v.Where(p => p.RoundClosedAtUtc == null);

            if (sinceLastSeen)
                v = v.Where(p => p.CreatedDate > s.LastSeenAtUtc);

            return await v.CountAsync();
        }

        // ==================================================================
        //  ACTION CENTRE
        // ==================================================================

        /// <summary>
        /// The one answer to "what needs me?", separated from "what changed".
        /// <para>
        /// Vestora had grown four parallel feeds — notifications, activity, messages and
        /// the pipeline — with no way to tell which mattered. This counts only things
        /// that are genuinely blocked on the caller, so the informational stream can
        /// stop competing with the actionable one.
        /// </para>
        /// </summary>
        [HttpGet("action-center")]
        public async Task<IActionResult> ActionCenter()
        {
            var me = Me();
            var isFounder = User.IsInRole("Innovator");

            var unreadMessages = await _db.Messages.CountAsync(m => m.ReceiverId == me && !m.IsRead);
            var unreadNotifications = await _db.Notifications.CountAsync(n => n.UserId == me && !n.IsRead);

            // Questions the caller is expected to answer, in any relationship they are part of.
            var questionsToAnswer = await _db.DealQuestions.CountAsync(q =>
                q.Answer == null && !q.IsWithdrawn && q.AskedByUserId != me &&
                (q.Investment.Project.OwnerId == me || q.Investment.InvestorId == me));

            var pendingRequests = 0;
            var docRequestsToFill = 0;
            var approvedNotContacted = 0;

            if (isFounder)
            {
                pendingRequests = await _db.Investments.CountAsync(i =>
                    i.Project.OwnerId == me && i.Status == "Pending");

                docRequestsToFill = await _db.DocumentRequests.CountAsync(r =>
                    r.Status == "Open" && r.Investment.Project.OwnerId == me);

                // The relationship's most common stall: approved and then abandoned.
                approvedNotContacted = await _db.Investments.CountAsync(i =>
                    i.Project.OwnerId == me && i.Stage == PipelineStages.Approved);
            }

            var searches = await _db.SavedSearches.AsNoTracking().Where(s => s.UserId == me).ToListAsync();
            var newFromSearches = 0;
            foreach (var s in searches) newFromSearches += await CountNewMatchesAsync(s);

            return Ok(new ActionCenterDto
            {
                NeedsAction = questionsToAnswer + pendingRequests + docRequestsToFill + approvedNotContacted,
                QuestionsToAnswer = questionsToAnswer,
                PendingRequests = pendingRequests,
                DocumentRequestsToFill = docRequestsToFill,
                ApprovedAwaitingContact = approvedNotContacted,
                UnreadMessages = unreadMessages,
                UnreadNotifications = unreadNotifications,
                NewFromSavedSearches = newFromSearches,
            });
        }
    }
}
