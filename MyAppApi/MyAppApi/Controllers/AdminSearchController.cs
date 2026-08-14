using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyAppApi.Data;
using MyAppApi.Data.Models.DTOs;

namespace MyAppApi.Controllers
{
    /// <summary>
    /// One box that finds any record, from whatever the administrator happens to have.
    /// <para>
    /// Support conversations do not arrive with a user id. They arrive with an email
    /// address, a venture name, or a payment reference somebody read off a receipt —
    /// and each of those used to mean guessing which of five list screens indexed it.
    /// </para>
    /// <para>
    /// Every branch is an exact or prefix match on a field a human could plausibly quote.
    /// There is no ranking and no fuzzy matching: a search that silently reorders results
    /// by a relevance score nobody can inspect is a worse tool for moderation than one
    /// that returns nothing and says so.
    /// </para>
    /// </summary>
    [Route("api/admin")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class AdminSearchController : ControllerBase
    {
        private readonly AppDbContext _db;

        public AdminSearchController(AppDbContext db) => _db = db;

        /// <summary>Per-group cap. Enough to recognise the right row, short enough to scan.</summary>
        private const int PerGroup = 5;

        [HttpGet("search")]
        public async Task<IActionResult> Search([FromQuery] string? q, CancellationToken ct)
        {
            var term = q?.Trim();
            if (string.IsNullOrWhiteSpace(term) || term.Length < 2)
                return Ok(new AdminSearchResultsDto());

            // An all-digits term is probably an id somebody pasted, but it could equally be
            // part of a reference. Both branches run; neither excludes the other.
            var asId = int.TryParse(term, out var idValue) ? idValue : (int?)null;

            var results = new AdminSearchResultsDto
            {
                Query = term,
                Users = await _db.Users
                    .AsNoTracking()
                    .IgnoreQueryFilters()
                    .Where(u => u.UserName.Contains(term) || u.Email.Contains(term) || u.Id == asId)
                    .OrderBy(u => u.UserName)
                    .Take(PerGroup)
                    .Select(u => new AdminSearchHitDto
                    {
                        Id = u.Id,
                        Title = u.UserName,
                        Subtitle = u.Email,
                        Badge = u.UserType,
                        // Suspended and removed accounts are exactly the ones being looked
                        // for, so they are returned — flagged, not filtered.
                        Muted = u.IsDeleted || u.IsSuspended,
                        Href = $"/admin/users/{u.Id}",
                    })
                    .ToListAsync(ct),

                Ventures = await _db.Projects
                    .AsNoTracking()
                    .IgnoreQueryFilters()
                    .Where(p => p.Name.Contains(term) || p.Id == asId)
                    .OrderBy(p => p.Name)
                    .Take(PerGroup)
                    .Select(p => new AdminSearchHitDto
                    {
                        Id = p.Id,
                        Title = p.Name,
                        Subtitle = p.Owner.UserName,
                        Badge = p.ModerationStatus,
                        Muted = p.IsDeleted,
                        Href = $"/projects/{p.Id}",
                    })
                    .ToListAsync(ct),

                Deals = await _db.Investments
                    .AsNoTracking()
                    .IgnoreQueryFilters()
                    .Where(i => i.Id == asId
                        || i.Project.Name.Contains(term)
                        || (i.Investor != null && i.Investor.UserName.Contains(term)))
                    .OrderByDescending(i => i.Date)
                    .Take(PerGroup)
                    .Select(i => new AdminSearchHitDto
                    {
                        Id = i.Id,
                        Title = i.Project.Name,
                        Subtitle = i.Investor != null ? i.Investor.UserName : null,
                        Badge = i.Stage,
                        Href = $"/deals/{i.Id}",
                    })
                    .ToListAsync(ct),

                Transactions = await _db.PaymentTransactions
                    .AsNoTracking()
                    .IgnoreQueryFilters()
                    .Where(tx => tx.Reference.Contains(term)
                        || tx.ProviderPaymentId == term
                        || tx.ProviderSessionId == term
                        || tx.Id == asId)
                    .OrderByDescending(tx => tx.CreatedAtUtc)
                    .Take(PerGroup)
                    .Select(tx => new AdminSearchHitDto
                    {
                        Id = tx.Id,
                        Title = tx.Reference,
                        Subtitle = tx.FundingRequest.Investment.Project.Name,
                        Badge = tx.Status,
                        Href = "/admin/revenue",
                    })
                    .ToListAsync(ct),

                Reports = await _db.Reports
                    .AsNoTracking()
                    .Where(r => r.Id == asId || (r.Project != null && r.Project.Name.Contains(term)))
                    .OrderByDescending(r => r.CreatedAt)
                    .Take(PerGroup)
                    .Select(r => new AdminSearchHitDto
                    {
                        Id = r.Id,
                        Title = r.Project != null ? r.Project.Name : $"#{r.Id}",
                        Subtitle = r.Reason,
                        Badge = r.Status,
                        Href = "/admin/reports",
                    })
                    .ToListAsync(ct),
            };

            return Ok(results);
        }
    }
}
