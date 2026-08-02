using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyAppApi.Data;
using MyAppApi.Data.Models;
using MyAppApi.Data.Models.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace MyAppApi.Controllers
{
    /// <summary>
    /// The other direction of the marketplace: founders discovering capital.
    /// <para>
    /// Investors could always find ventures; founders could only publish and wait.
    /// The data to fix that already existed — thesis, ticket range, preferred
    /// industries, and a real record of what each investor has backed — with no
    /// surface to reach it. This is that surface.
    /// </para>
    /// <para>
    /// Founders only. An investor browsing other investors is not a journey this
    /// product has, and admins have their own user tooling; opening it wider would
    /// turn a working directory into a scrapeable list of funders.
    /// </para>
    /// </summary>
    [Route("api/capital")]
    [ApiController]
    [Authorize(Roles = "Innovator")]
    public class CapitalController : ControllerBase
    {
        private readonly AppDbContext _db;

        public CapitalController(AppDbContext db) => _db = db;

        private int CurrentUserId() =>
            int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : 0;

        /// <summary>
        /// Investors a founder may approach. Suspended and unlisted accounts are
        /// excluded at the source, so nothing downstream has to remember to filter.
        /// </summary>
        private IQueryable<Investor> Listed() =>
            _db.Users.OfType<Investor>()
                .Where(i => i.ListedInDirectory && !i.IsSuspended);

        /// <summary>
        /// Ticket bands, expressed as the question a founder actually asks: "who
        /// writes a cheque the size of my round?" Bands rather than a slider because
        /// a stated range is approximate and a slider implies precision it lacks.
        /// </summary>
        private static IQueryable<Investor> ApplyBand(IQueryable<Investor> q, string? band) => band switch
        {
            "under50" => q.Where(i => i.TicketMax != null && i.TicketMax < 50_000m),
            "50to250" => q.Where(i => i.TicketMax >= 50_000m && i.TicketMin <= 250_000m),
            "250to1m" => q.Where(i => i.TicketMax >= 250_000m && i.TicketMin <= 1_000_000m),
            "over1m" => q.Where(i => i.TicketMax >= 1_000_000m || i.TicketMin >= 1_000_000m),
            _ => q,
        };

        private IQueryable<Investor> ApplyFilters(
            IQueryable<Investor> q, string? search, string? sector, string? band, bool? trackRecord)
        {
            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                q = q.Where(i =>
                    EF.Functions.Like(i.UserName, $"%{term}%") ||
                    (i.InvestmentThesis != null && EF.Functions.Like(i.InvestmentThesis, $"%{term}%")) ||
                    (i.PreferredIndustries != null && EF.Functions.Like(i.PreferredIndustries, $"%{term}%")));
            }

            if (!string.IsNullOrWhiteSpace(sector))
            {
                // Matches a stated sector OR one they have actually backed — a founder
                // cares about demonstrated appetite at least as much as a declared one.
                q = q.Where(i =>
                    (i.PreferredIndustries != null && EF.Functions.Like(i.PreferredIndustries, $"%{sector}%")) ||
                    i.Investments.Any(inv => inv.Status == "Approved" &&
                        (inv.Project.Category == sector || inv.Project.Industry == sector)));
            }

            q = ApplyBand(q, band);

            if (trackRecord == true)
                q = q.Where(i => i.Investments.Any(inv => inv.Status == "Approved"));

            return q;
        }

        [HttpGet]
        public async Task<IActionResult> List(
            [FromQuery] string? search,
            [FromQuery] string? sector,
            [FromQuery] string? band,
            [FromQuery] bool? trackRecord,
            [FromQuery] string? sort,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 12)
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 48);
            var me = CurrentUserId();

            var q = ApplyFilters(Listed(), search, sector, band, trackRecord);
            var total = await q.CountAsync();

            // Every ordering is evidence-based. There is no "featured" or "top"
            // investor, because nothing in the data could honestly justify one.
            q = sort switch
            {
                "active" => q.OrderByDescending(i => i.Investments
                        .Where(inv => inv.Status == "Approved")
                        .Max(inv => (DateTime?)inv.Date))
                    .ThenByDescending(i => i.Id),
                "ticket" => q.OrderByDescending(i => i.TicketMax ?? i.TicketMin ?? 0m)
                    .ThenByDescending(i => i.Id),
                "newest" => q.OrderByDescending(i => i.CreatedAtUtc),
                // Default: most rounds backed. The strongest honest signal a founder has.
                _ => q.OrderByDescending(i => i.Investments.Count(inv => inv.Status == "Approved"))
                    .ThenByDescending(i => i.Id),
            };

            var items = await q
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(i => new InvestorCardDto
                {
                    Id = i.Id,
                    UserName = i.UserName,
                    BriefBio = i.BriefBio,
                    HasAvatar = i.ProfileImage != null,
                    InvestmentThesis = i.InvestmentThesis,
                    PreferredIndustries = i.PreferredIndustries,
                    TicketMin = i.TicketMin,
                    TicketMax = i.TicketMax,
                    BackedCount = i.Investments.Count(inv => inv.Status == "Approved"),
                    ActiveSectors = i.Investments
                        .Where(inv => inv.Status == "Approved" && inv.Project.Category != null)
                        .Select(inv => inv.Project.Category!)
                        .Distinct()
                        .Take(4)
                        .ToList(),
                    LastBackedAtUtc = i.Investments
                        .Where(inv => inv.Status == "Approved")
                        .Max(inv => (DateTime?)inv.Date),
                    JoinedAtUtc = i.CreatedAtUtc,
                    ActiveRelationships = i.Investments.Count(inv =>
                        inv.Stage != "Closed" && inv.Stage != "Declined"),
                    // Computed per viewing founder so the card can say "you already
                    // have a thread with them" instead of inviting a duplicate.
                    AlreadyConnected = i.Investments.Any(inv => inv.Project.OwnerId == me),
                })
                .ToListAsync();

            return Ok(new PagedResult<InvestorCardDto>
            {
                Items = items,
                TotalCount = total,
                Page = page,
                PageSize = pageSize
            });
        }

        /// <summary>
        /// Facet counts, each computed with every filter EXCEPT its own — the same rule
        /// browse uses, so the directory can never offer an option that leads nowhere.
        /// </summary>
        [HttpGet("facets")]
        public async Task<IActionResult> Facets(
            [FromQuery] string? search,
            [FromQuery] string? sector,
            [FromQuery] string? band,
            [FromQuery] bool? trackRecord)
        {
            var forSector = ApplyFilters(Listed(), search, null, band, trackRecord);
            var forBand = ApplyFilters(Listed(), search, sector, null, trackRecord);
            var scoped = ApplyFilters(Listed(), search, sector, band, trackRecord);

            // The facet must count the same thing the filter matches and the card
            // displays: a stated sector OR one actually backed. Counting only the
            // stated ones left the sector filter empty while every card on the page
            // showed sector chips — the list and its own filters disagreeing.
            //
            // Sectors are free-text comma lists, so the split happens in memory. Bounded
            // by the directory size, which is small by nature.
            var rows = await forSector
                .Select(i => new
                {
                    i.PreferredIndustries,
                    Backed = i.Investments
                        .Where(inv => inv.Status == "Approved")
                        .Select(inv => inv.Project.Category)
                        .Distinct()
                        .ToList(),
                })
                .ToListAsync();

            var sectorCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            foreach (var row in rows)
            {
                // One investor counts once per sector, however many ways they touch it.
                var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

                foreach (var raw in (row.PreferredIndustries ?? "")
                    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                    seen.Add(raw);

                foreach (var backed in row.Backed)
                    if (!string.IsNullOrWhiteSpace(backed)) seen.Add(backed.Trim());

                foreach (var s in seen)
                    sectorCounts[s] = sectorCounts.TryGetValue(s, out var n) ? n + 1 : 1;
            }

            var bands = new List<FacetValueDto>();
            foreach (var b in new[] { "under50", "50to250", "250to1m", "over1m" })
            {
                var count = await ApplyBand(forBand, b).CountAsync();
                if (count > 0) bands.Add(new FacetValueDto { Value = b, Count = count });
            }

            return Ok(new CapitalFacetsDto
            {
                Sectors = sectorCounts
                    .OrderByDescending(kv => kv.Value)
                    .Take(14)
                    .Select(kv => new FacetValueDto { Value = kv.Key, Count = kv.Value })
                    .ToList(),
                TicketBands = bands,
                Total = await scoped.CountAsync(),
                WithTrackRecord = await scoped.CountAsync(i => i.Investments.Any(inv => inv.Status == "Approved")),
                WithThesis = await scoped.CountAsync(i => i.InvestmentThesis != null && i.InvestmentThesis != ""),
            });
        }

        /// <summary>
        /// The founder's own ventures, trimmed to what the approach dialog needs, so
        /// reaching out can name the venture it is about.
        /// </summary>
        [HttpGet("my-ventures")]
        public async Task<IActionResult> MyOpenVentures()
        {
            var me = CurrentUserId();
            var ventures = await _db.Projects
                .AsNoTracking()
                .Where(p => p.OwnerId == me && p.LifecycleStatus == "Active" && p.RoundClosedAtUtc == null)
                .OrderByDescending(p => p.CreatedDate)
                .Select(p => new { p.Id, p.Name, p.ModerationStatus })
                .ToListAsync();

            return Ok(ventures);
        }
    }
}
