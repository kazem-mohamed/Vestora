using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using MyAppApi.Data;
using MyAppApi.Data.Models;
using MyAppApi.Data.Models.DTOs;
using MyAppApi.Data.Models.Hubs;
using MyAppApi.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace MyAppApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ProjectsController : ControllerBase
    {
        private readonly AppDbContext _dbContext;
        private readonly IFileUploadSecurityService _fileUploadSecurityService;
        private readonly IHubContext<ChatHub> _hub;
        private readonly NotificationFanOutQueue _fanOut;

        public ProjectsController(AppDbContext dbContext, IFileUploadSecurityService fileUploadSecurityService, IHubContext<ChatHub> hub, NotificationFanOutQueue fanOut)
        {
            _dbContext = dbContext;
            _fileUploadSecurityService = fileUploadSecurityService;
            _hub = hub;
            _fanOut = fanOut;
        }

        private int GetCurrentUserId()
        {
            return int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        }

        private int? GetOptionalUserId() =>
            int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : (int?)null;

        // Owner (viewing their own roster) sees every listing in every state;
        // anyone else only sees what is genuinely public — reviewed, and not
        // withdrawn by the founder.
        [HttpGet("{innovatorId}")]
        public async Task<IActionResult> GetProjects(int innovatorId)
        {
            var viewerId = GetOptionalUserId();
            var isOwner = viewerId.HasValue && viewerId.Value == innovatorId;
            var isAdmin = User.IsInRole("Admin");
            var privileged = isOwner || isAdmin;

            var projects = await _dbContext.Projects
                                     .Where(p => p.OwnerId == innovatorId &&
                                                 (privileged ||
                                                  (p.ModerationStatus == "Approved" && p.LifecycleStatus != "Paused")))
                                     .OrderByDescending(p => p.CreatedDate)
                                     .Select(p => new ProjectsDto
                                     {
                                         Id = p.Id,
                                         Name = p.Name,
                                         Description = p.Description,
                                         VideoUrl = p.VideoUrl,
                                         Topic = p.Topic,
                                         Category = p.Category,
                                         Location = p.Location,
                                         InvestmentNeeded = p.InvestmentNeeded,
                                         // Money fields are filled by ApplyFundingAsync below —
                                         // see ProjectCardProjection for why they are not inline.
                                         ModerationStatus = p.ModerationStatus,
                                         ModerationNote = p.ModerationNote,
                                         LifecycleStatus = p.LifecycleStatus,
                                         RoundClosedAtUtc = p.RoundClosedAtUtc,
                                         RoundOutcome = p.RoundOutcome,
                                         RoundClosingNote = p.RoundClosingNote,
                                         Stage = p.Stage,
                                         Valuation = p.Valuation,
                                         EquityOffered = p.EquityOffered,
                                         UseOfFunds = p.UseOfFunds,
                                         OwnerId = p.OwnerId,
                                         OwnerName = p.Owner.UserName,
                                         TotalInteractions = p.TotalInteractions,
                                         CommentsCount = p.Comments.Count,
                                         ImageIds = p.Images.Select(im => im.Id).ToList(),
                                         Comments = p.Comments.Select(c => new CommentsDto
                                         {
                                             Id = c.Id,
                                             Content = c.Content,
                                             CreatedDate = c.CreatedDate,
                                             UserId = c.UserId,
                                             UserName = c.User.UserName,
                                             Replies = c.Replies.Select(r => new ReplysDto
                                             {
                                                 Id = r.Id,
                                                 Content = r.Content,
                                                 CreatedDate = r.CreatedDate,
                                                 UserId = r.UserId,
                                                 UserName = r.User.UserName
                                             }).ToList()
                                         }).ToList()
                                     }).ToListAsync();

            await ProjectCardProjection.ApplyFundingAsync(_dbContext, projects);

            // The admin's internal rejection reason is for the owner and admins only.
            if (!privileged)
            {
                projects.ForEach(p => p.ModerationNote = null);
            }

            return Ok(projects);
        }

        /// <summary>
        /// A founder's ventures shaped as browse cards, for the public profile grid.
        /// <para>
        /// Separate from GetProjects because that one feeds the founder's own management
        /// screens and carries the full record — description, moderation note, comments.
        /// The profile only ever renders cards, and it renders the SAME component browse
        /// does, so it is fed the same projection. Visibility follows the identical rule,
        /// which is what keeps the header count and the grid beneath it in agreement.
        /// </para>
        /// </summary>
        [HttpGet("{ownerId}/cards")]
        [AllowAnonymous]
        public async Task<IActionResult> GetOwnerCards(int ownerId)
        {
            var viewerId = GetOptionalUserId();
            var privileged = (viewerId.HasValue && viewerId.Value == ownerId) || User.IsInRole("Admin");

            var cards = await _dbContext.Projects
                .AsNoTracking()
                .Where(p => p.OwnerId == ownerId &&
                            (privileged ||
                             (p.ModerationStatus == "Approved" && p.LifecycleStatus != "Paused")))
                .OrderByDescending(p => p.CreatedDate)
                .Select(ProjectCardProjection.Card)
                .ToListAsync();

            await ProjectCardProjection.ApplyFundingAsync(_dbContext, cards);

            return Ok(cards);
        }

        /// <summary>
        /// Where to go after reading a venture: the founder's other rounds first, then
        /// the same sector. Answers the reader who decided "not this one" — until now
        /// the page ended on a Report link with no route onward.
        /// </summary>
        [HttpGet("{projectId}/next")]
        [AllowAnonymous]
        public async Task<IActionResult> GetNextVentures(int projectId, [FromQuery] int take = 3)
        {
            take = Math.Clamp(take, 1, 6);

            var current = await _dbContext.Projects
                .AsNoTracking()
                .Where(p => p.Id == projectId)
                .Select(p => new { p.OwnerId, p.Category })
                .FirstOrDefaultAsync();

            if (current == null) return NotFound(new { message = "Project not found." });

            var pool = VisibleProjects().Where(p => p.Id != projectId);

            var byFounder = await pool
                .Where(p => p.OwnerId == current.OwnerId)
                .OrderByDescending(p => p.CreatedDate)
                .Take(take)
                .Select(ProjectCardProjection.Card)
                .ToListAsync();

            // Only top up from the sector when the founder has nothing else running,
            // so the section never pads itself with weak matches.
            var bySector = new List<ProjectCardDto>();
            if (byFounder.Count < take)
            {
                var exclude = byFounder.Select(c => c.Id).ToList();
                bySector = await pool
                    .Where(p => !exclude.Contains(p.Id) &&
                                current.Category != null && p.Category == current.Category)
                    .OrderByDescending(p => p.Investments.Where(i => i.Status == "Approved").Select(i => i.InvestorId).Distinct().Count())
                    .ThenByDescending(p => p.CreatedDate)
                    .Take(take - byFounder.Count)
                    .Select(ProjectCardProjection.Card)
                    .ToListAsync();
            }

            await ProjectCardProjection.ApplyFundingAsync(_dbContext, byFounder.Concat(bySector).ToList());

            return Ok(new { byFounder, bySector });
        }

        /// <summary>
        /// Rounds the public may see AND could still back: reviewed by an admin, not
        /// paused by the founder, and not closed.
        /// <para>
        /// Every discovery-facing query starts here so the rules can never drift apart.
        /// Closed rounds are excluded because these surfaces all answer "what can I back
        /// now" — a finished round sitting in a feed titled "ventures seeking capital" is
        /// an advert for something that no longer exists. It stays fully reachable by
        /// direct link and on its founder's profile, as the record it now is.
        /// </para>
        /// </summary>
        private IQueryable<Project> VisibleProjects() =>
            _dbContext.Projects.AsNoTracking()
                .Where(p => p.ModerationStatus == "Approved"
                            && p.LifecycleStatus != "Paused"
                            && p.RoundClosedAtUtc == null);

        /// <summary>
        /// Neutralises LIKE metacharacters in user input so a search for "50%" or "a_b"
        /// is treated as literal text. Pairs with the "\" escape clause on EF.Functions.Like.
        /// </summary>
        private static string EscapeLike(string input) => input
            .Replace("\\", "\\\\")
            .Replace("%", "\\%")
            .Replace("_", "\\_")
            .Replace("[", "\\[");

        /// <summary>
        /// Applies the browse filters shared by the feed and the facet counts.
        /// "sector" is the Category — Category and Industry used to be separate
        /// fields the founder filled in independently; they are now one field.
        /// </summary>
        private static IQueryable<Project> ApplyBrowseFilters(
            IQueryable<Project> query, string? search, string? sector, string? location,
            string? stage, string? commitment)
        {
            if (!string.IsNullOrWhiteSpace(search))
            {
                // Matched against the fields a person actually searches by — name,
                // one-line pitch, sector, city and founder. Description is excluded on
                // purpose: substring hits inside a long body made short queries ("AI")
                // match nearly everything while telling the user nothing.
                var term = EscapeLike(search.Trim());

                // Short terms only count on a word boundary. Without this, "AI" matches
                // C-ai-ro, Dub-ai and N-ai-robi; with it, only a real "AI" does.
                // Longer terms keep substring matching so "health" still finds HealthTech.
                var pattern = term.Length <= 3
                    ? $"%[^a-z0-9]{term}[^a-z0-9]%"
                    : $"%{term}%";

                query = query.Where(p => EF.Functions.Like(
                    // Pad both ends so a term at the very start or end still has a boundary.
                    " " + p.Name +
                    " " + (p.Topic ?? "") +
                    " " + (p.Category ?? "") +
                    " " + (p.Location ?? "") +
                    " " + p.Owner.UserName + " ",
                    pattern, "\\"));
            }

            if (!string.IsNullOrWhiteSpace(sector))
            {
                query = query.Where(p => p.Category == sector);
            }

            if (!string.IsNullOrWhiteSpace(location))
            {
                query = query.Where(p => p.Location == location);
            }

            if (!string.IsNullOrWhiteSpace(stage))
            {
                query = query.Where(p => p.Stage == stage);
            }

            // Three states now, because commitments and money are no longer the same
            // thing: fully funded, spoken for but unpaid, and genuinely open.
            if (string.Equals(commitment, "funded", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(FundingMath.IsFullyFunded);
            }
            else if (string.Equals(commitment, "committed", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(FundingMath.IsFullyCommitted);
            }
            else if (string.Equals(commitment, "open", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(NotFullyCommitted);
            }

            return query;
        }

        /// <summary>Negation of <see cref="FundingMath.IsFullyCommitted"/>, kept beside its filters.</summary>
        private static readonly System.Linq.Expressions.Expression<Func<Project, bool>> NotFullyCommitted =
            p => p.Investments.Where(i => i.Status == "Approved").Sum(i => (decimal?)i.Amount) < p.InvestmentNeeded
                 || !p.Investments.Any(i => i.Status == "Approved");

        // Public, searchable, sortable & paginated browse feed.
        [HttpGet]
        public async Task<IActionResult> GetAllProjects(
            [FromQuery] string? search,
            [FromQuery] string? sector,
            [FromQuery] string? location,
            [FromQuery] string? stage,
            [FromQuery] string? commitment,
            [FromQuery] string? sort,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 12)
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 50);

            var query = ApplyBrowseFilters(VisibleProjects(), search, sector, location, stage, commitment);

            var totalCount = await query.CountAsync();

            // Sorting happens on the raw entity so SQL can use the indexes. "Momentum"
            // now ranks by money actually raised rather than by promises collected — a
            // venture with signatures and no settlement no longer outranks one that has
            // been paid.
            query = sort?.ToLowerInvariant() switch
            {
                "momentum" => query
                    .OrderByDescending(p => p.InvestmentNeeded > 0
                        ? p.Investments.SelectMany(i => i.FundingRequests).SelectMany(f => f.Transactions)
                              .Where(t => t.Status == PaymentStatus.Succeeded).Sum(t => (decimal?)t.Amount) / p.InvestmentNeeded
                        : 0)
                    .ThenByDescending(p => p.CreatedDate),
                "close" => query
                    .Where(NotFullyCommitted)
                    .OrderByDescending(p => p.InvestmentNeeded > 0
                        ? p.Investments.Where(i => i.Status == "Approved").Sum(i => (decimal?)i.Amount) / p.InvestmentNeeded
                        : 0),
                "largest" => query.OrderByDescending(p => p.InvestmentNeeded).ThenByDescending(p => p.CreatedDate),
                "backers" => query
                    .OrderByDescending(p => p.Investments.Where(i => i.Status == "Approved").Select(i => i.InvestorId).Distinct().Count())
                    .ThenByDescending(p => p.CreatedDate),
                "discussed" => query.OrderByDescending(p => p.ProjectViews.Count()).ThenByDescending(p => p.CreatedDate),
                _ => query.OrderByDescending(p => p.CreatedDate),
            };

            // "close" narrows the set, so recount after the sort applied its filter.
            if (string.Equals(sort, "close", StringComparison.OrdinalIgnoreCase))
            {
                totalCount = await ApplyBrowseFilters(VisibleProjects(), search, sector, location, stage, commitment)
                    .Where(NotFullyCommitted)
                    .CountAsync();
            }

            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(ProjectCardProjection.Card)
                .ToListAsync();

            // The card's money comes from the one loader, for this page only.
            await ProjectCardProjection.ApplyFundingAsync(_dbContext, items);

            return Ok(new PagedResult<ProjectCardDto>
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            });
        }

        /// <summary>
        /// Plain distinct values used by the AUTHORING surfaces (project form, investor
        /// onboarding) where a founder picks a value rather than filters by one.
        /// Browse uses /facets instead, which carries counts and hides empty options.
        /// </summary>
        [HttpGet("filters")]
        public async Task<IActionResult> GetProjectFilters()
        {
            var categories = await _dbContext.Projects.AsNoTracking()
                .Where(p => p.Category != null && p.Category != "")
                .Select(p => p.Category!).Distinct().OrderBy(c => c).ToListAsync();

            var locations = await _dbContext.Projects.AsNoTracking()
                .Where(p => p.Location != null && p.Location != "")
                .Select(p => p.Location!).Distinct().OrderBy(l => l).ToListAsync();

            return Ok(new { categories, locations });
        }

        /// <summary>
        /// Filter values with live counts, derived from the visible inventory and
        /// narrowed by whatever else is already selected — so the UI can never offer
        /// an option that leads nowhere. Literal route outranks "{innovatorId}".
        /// </summary>
        [HttpGet("facets")]
        public async Task<IActionResult> GetProjectFacets(
            [FromQuery] string? search,
            [FromQuery] string? sector,
            [FromQuery] string? location,
            [FromQuery] string? stage,
            [FromQuery] string? commitment)
        {
            // Each facet is counted with every filter EXCEPT its own applied, so the
            // numbers answer "what would I get if I picked this instead?".
            var stages = await ApplyBrowseFilters(VisibleProjects(), search, sector, location, null, commitment)
                .Where(p => p.Stage != null && p.Stage != "")
                .GroupBy(p => p.Stage!)
                .Select(g => new FacetValueDto { Value = g.Key, Count = g.Count() })
                .ToListAsync();

            var forSector = ApplyBrowseFilters(VisibleProjects(), search, null, location, stage, commitment);

            var sectors = await forSector
                .Where(p => p.Category != null && p.Category != "")
                .GroupBy(p => p.Category!)
                .Select(g => new FacetValueDto { Value = g.Key, Count = g.Count() })
                .OrderByDescending(f => f.Count)
                .ThenBy(f => f.Value)
                .ToListAsync();

            var locations = await ApplyBrowseFilters(VisibleProjects(), search, sector, null, stage, commitment)
                .Where(p => p.Location != null && p.Location != "")
                .GroupBy(p => p.Location!)
                .Select(g => new FacetValueDto { Value = g.Key, Count = g.Count() })
                .ToListAsync();

            var visible = VisibleProjects();
            var total = await visible.CountAsync();
            var fullyCommitted = await visible.CountAsync(FundingMath.IsFullyCommitted);
            var fullyFunded = await visible.CountAsync(FundingMath.IsFullyFunded);

            return Ok(new ProjectFacetsDto
            {
                Stages = stages.OrderByDescending(f => f.Count).ThenBy(f => f.Value).ToList(),
                Sectors = sectors,
                Locations = locations.OrderByDescending(f => f.Count).ThenBy(f => f.Value).ToList(),
                Total = total,
                Open = total - fullyCommitted,
                FullyCommitted = fullyCommitted,
                FullyFunded = fullyFunded
            });
        }

        // Full details of a single project, including comments and image ids.
        [HttpGet("details/{projectId}")]
        public async Task<IActionResult> GetProjectDetails(int projectId)
        {
            var project = await _dbContext.Projects
                .AsNoTracking()
                .Where(p => p.Id == projectId)
                .Select(p => new ProjectsDto
                {
                    Id = p.Id,
                    Name = p.Name,
                    Description = p.Description,
                    VideoUrl = p.VideoUrl,
                    Topic = p.Topic,
                    Category = p.Category,
                    Location = p.Location,
                    InvestmentNeeded = p.InvestmentNeeded,
                    // Funding figures are applied below, from FundingMath.
                    ModerationStatus = p.ModerationStatus,
                    ModerationNote = p.ModerationNote,
                    LifecycleStatus = p.LifecycleStatus,
                    RoundClosedAtUtc = p.RoundClosedAtUtc,
                    RoundOutcome = p.RoundOutcome,
                    RoundClosingNote = p.RoundClosingNote,
                    Stage = p.Stage,
                    Valuation = p.Valuation,
                    EquityOffered = p.EquityOffered,
                    UseOfFunds = p.UseOfFunds,
                    OwnerId = p.OwnerId,
                    OwnerName = p.Owner.UserName,
                    TotalInteractions = p.TotalInteractions,
                    CommentsCount = p.Comments.Count,
                    ImageIds = p.Images.Select(im => im.Id).ToList(),
                    Comments = p.Comments.Select(c => new CommentsDto
                    {
                        Id = c.Id,
                        Content = c.Content,
                        CreatedDate = c.CreatedDate,
                        UserId = c.UserId,
                        UserName = c.User.UserName,
                        Replies = c.Replies.Select(r => new ReplysDto
                        {
                            Id = r.Id,
                            Content = r.Content,
                            CreatedDate = r.CreatedDate,
                            UserId = r.UserId,
                            UserName = r.User.UserName
                        }).ToList()
                    }).ToList()
                })
                .FirstOrDefaultAsync();

            if (project == null)
            {
                return NotFound(new { message = "Project not found." });
            }

            await ProjectCardProjection.ApplyFundingAsync(_dbContext, new[] { project });

            // Trust signals for the audience they exist for. Counted in one round trip
            // rather than inside the projection above, because the signal builder needs
            // the totals as plain integers and EF cannot translate it into SQL.
            var facts = await _dbContext.Projects
                .AsNoTracking()
                .Where(p => p.Id == projectId)
                .Select(p => new
                {
                    Documents = p.Documents.Count,
                    Milestones = p.Milestones.Count,
                    MilestonesDone = p.Milestones.Count(m => m.Status == "Completed"),
                    Updates = p.Updates.Count,
                    Team = p.Team.Count,
                })
                .FirstAsync();

            project.TrustSignals = TrustSignals
                .ForVenture(
                    moderationApproved: project.ModerationStatus == "Approved",
                    documentCount: facts.Documents,
                    milestoneCount: facts.Milestones,
                    completedMilestones: facts.MilestonesDone,
                    updateCount: facts.Updates,
                    teamCount: facts.Team)
                .Select(s => new TrustSignalDto
                {
                    Key = s.Key,
                    Level = s.Level.ToString(),
                    Value = s.Value,
                })
                .ToList();

            // Privileged viewers: the founder who owns the listing, and admins.
            var viewerId = GetOptionalUserId();
            var isOwner = viewerId.HasValue && viewerId.Value == project.OwnerId;
            var isAdmin = User.IsInRole("Admin");
            var privileged = isOwner || isAdmin;

            // Two separate reasons a listing is not public, and BOTH must 404 for
            // everyone else. Paused was previously missed: browse hid the venture
            // but the direct link still served it, so pausing a round only unlisted
            // it instead of withdrawing it the way the founder was promised.
            var awaitingReview = project.ModerationStatus != "Approved";
            var withdrawn = project.LifecycleStatus == "Paused";

            if ((awaitingReview || withdrawn) && !privileged)
            {
                return NotFound(new { message = "Project not found." });
            }

            // ModerationNote is the admin's internal reason for a rejection. It
            // survives a later approval, so it must never travel to the public.
            if (!privileged)
            {
                project.ModerationNote = null;
            }

            return Ok(project);
        }



        // Add New Project
        [Authorize]
        [HttpPost]
        public async Task<IActionResult> CreateProject([FromBody] ProjectDto projectDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            if (!string.IsNullOrWhiteSpace(projectDto.Category) && !ProjectCategories.IsValid(projectDto.Category))
            {
                return BadRequest(new { message = "Unknown category." });
            }

            if (!User.IsInRole("Innovator"))
            {
                return Forbid();
            }

            try
            {
                var currentUserId = GetCurrentUserId();
                var project = new Project
                {
                    Name = projectDto.Name,
                    Description = projectDto.Description,
                    VideoUrl = projectDto.VideoUrl,
                    Topic = projectDto.Topic,
                    Category = projectDto.Category,
                    Location = projectDto.Location,
                    InvestmentNeeded = projectDto.InvestmentNeeded,
                    Stage = projectDto.Stage,
                    Valuation = projectDto.Valuation,
                    EquityOffered = projectDto.EquityOffered,
                    UseOfFunds = projectDto.UseOfFunds,
                    CreatedDate = DateTime.UtcNow,
                    OwnerId = currentUserId,
                    InvestorCount = 0,
                    TotalInteractions = 0,
                    // Every new listing starts hidden from public browse/details
                    // until an admin reviews it — see AdminModerationController's
                    // Approve/Reject, which is also where the follower fan-out for
                    // "new venture" now fires (there's nothing to notify about
                    // until the listing is actually visible).
                    ModerationStatus = "PendingReview"
                };

                _dbContext.Projects.Add(project);
                await _dbContext.SaveChangesAsync();

                return Ok(new { message = "Project created successfully and submitted for review.", projectId = project.Id });
            }
            catch (Exception)
            {
                return StatusCode(500, new { message = "An error occurred while creating the project." });
            }
        }

        // Update an existing project
        [Authorize]
        [HttpPut("{projectId}")]
        public async Task<IActionResult> UpdateProject(int projectId, [FromBody] ProjectDto projectDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var project = await _dbContext.Projects.FindAsync(projectId);

            if (project == null)
            {
                return NotFound("Project not found.");
            }

            if (!User.IsInRole("Innovator") || project.OwnerId != GetCurrentUserId())
            {
                return Forbid();
            }

            // Only enforce the closed key set when the category is actually changing.
            // Projects created before this taxonomy existed carry old free-text values
            // (e.g. "HealthTech") that are not valid keys — an edit to the description
            // or the ask must not be blocked just because the category was never
            // migrated. Picking a genuinely new value, though, has to be a real key.
            if (projectDto.Category != project.Category &&
                !string.IsNullOrWhiteSpace(projectDto.Category) && !ProjectCategories.IsValid(projectDto.Category))
            {
                return BadRequest(new { message = "Unknown category." });
            }

            project.Name = projectDto.Name;
            project.Description = projectDto.Description;
            project.VideoUrl = projectDto.VideoUrl;
            project.Topic = projectDto.Topic;
            project.Category = projectDto.Category;
            project.Location = projectDto.Location;
            project.InvestmentNeeded = projectDto.InvestmentNeeded;
            project.Stage = projectDto.Stage;
            project.Valuation = projectDto.Valuation;
            project.EquityOffered = projectDto.EquityOffered;
            project.UseOfFunds = projectDto.UseOfFunds;

            // Editing a rejected listing is the founder acting on the reviewer's
            // note, so it re-enters the queue. Without this a rejection was
            // terminal: the founder could fix everything and still never be
            // looked at again.
            var resubmitted = project.ModerationStatus == "Rejected";
            if (resubmitted)
            {
                project.ModerationStatus = "PendingReview";
                project.ModerationNote = null;
                project.ModeratedAtUtc = null;
            }

            _dbContext.Projects.Update(project);
            await _dbContext.SaveChangesAsync();

            return Ok(new
            {
                message = resubmitted
                    ? "Project updated and resubmitted for review."
                    : "Project updated successfully.",
                resubmitted
            });
        }

        // Founder-controlled lifecycle: pause a listing (hidden from browse) or bring a
        // paused one back. Closing a round is NOT here — see CloseRound below.
        [Authorize(Roles = "Innovator")]
        [HttpPatch("{projectId}/lifecycle")]
        public async Task<IActionResult> SetLifecycle(int projectId, [FromBody] LifecycleDto dto)
        {
            var allowed = new[] { "Active", "Paused" };
            if (!allowed.Contains(dto.Status))
                return BadRequest(new { message = "Unknown lifecycle status." });

            // "Closed" used to be accepted here, and it wrote one column and nothing else:
            // no outcome, no relationships concluded, and — the part that mattered — no
            // withdrawal of the funding requests still outstanding against the round. A
            // venture could read as closed while an investor was still being asked to pay
            // into it. There is one way to close a round, and it is the one that cleans up.
            if (dto.Status == "Closed")
                return BadRequest(new
                {
                    message = "Use close-round to end a round — it records the outcome and withdraws any unpaid funding requests."
                });

            var project = await _dbContext.Projects.FirstOrDefaultAsync(p => p.Id == projectId);
            if (project == null) return NotFound(new { message = "Project not found." });
            if (project.OwnerId != GetCurrentUserId()) return Forbid();

            // Reopening clears the closing record — a round that is live again must not
            // still carry an outcome and a closing date.
            if (dto.Status == "Active" && project.RoundClosedAtUtc != null)
            {
                project.RoundClosedAtUtc = null;
                project.RoundOutcome = null;
                project.RoundClosingNote = null;
            }

            project.LifecycleStatus = dto.Status;
            await _dbContext.SaveChangesAsync();
            return Ok(new { message = "Lifecycle updated.", status = project.LifecycleStatus });
        }

        /// <summary>
        /// Closes the round and records how it ended.
        /// <para>
        /// A venture that stays "raising" forever is the least honest thing a
        /// fundraising surface can show. Closing does not delete anything: commitments,
        /// relationships, the data room and the timeline all survive — the listing stops
        /// being an open ask and becomes a record of what happened.
        /// </para>
        /// <para>
        /// The outcome is stated by the founder, never inferred from the numbers. Only
        /// they know whether a round that reached 60% was a success or an abandonment,
        /// and guessing would put a claim in their mouth.
        /// </para>
        /// </summary>
        [Authorize(Roles = "Innovator")]
        [HttpPost("{projectId}/close-round")]
        public async Task<IActionResult> CloseRound(int projectId, [FromBody] CloseRoundDto dto)
        {
            var allowed = new[] { "Completed", "PartiallyRaised", "Withdrawn" };
            if (!allowed.Contains(dto.Outcome))
                return BadRequest(new { message = "Unknown round outcome." });

            var project = await _dbContext.Projects.FirstOrDefaultAsync(p => p.Id == projectId);
            if (project == null) return NotFound(new { message = "Project not found." });
            if (project.OwnerId != GetCurrentUserId()) return Forbid();
            if (project.RoundClosedAtUtc != null)
                return BadRequest(new { message = "This round is already closed." });

            var note = dto.Note?.Trim();
            if (note != null && note.Length > 600) note = note[..600];

            project.LifecycleStatus = "Closed";
            project.RoundClosedAtUtc = DateTime.UtcNow;
            project.RoundOutcome = dto.Outcome;
            project.RoundClosingNote = note;

            // Every live relationship is concluded with the round, but nothing is
            // deleted — Closed keeps counting toward the venture's committed total, so
            // the record of who backed it stays intact and truthful.
            var live = await _dbContext.Investments
                .Where(i => i.ProjectId == projectId &&
                            i.Stage != PipelineStages.Closed &&
                            i.Stage != PipelineStages.Declined)
                .ToListAsync();

            var concluded = 0;
            var declined = 0;

            // What a closing round does to money in flight.
            //
            // Every unpaid ask is withdrawn: the round is over, so nobody should be
            // asked for money toward it, and no new checkout may be opened against one.
            //
            // A checkout the investor is standing in front of RIGHT NOW is left alone
            // rather than killed — pulling that out from under them mid-payment produces
            // a charge with nothing to attach it to. If it lands, settlement marks the
            // request Paid and the record reads honestly: it was withdrawn, and the
            // payment already under way completed anyway. If it does not land, the
            // sweeper cancels the attempt and the withdrawal simply stands.
            var investmentIds = live.Select(i => i.Id).ToList();

            var openAsks = await _dbContext.FundingRequests
                .Where(f => investmentIds.Contains(f.InvestmentId) &&
                            f.Status == FundingRequestStatus.Open)
                .ToListAsync();

            foreach (var ask in openAsks)
            {
                ask.Status = FundingRequestStatus.Cancelled;
                ask.ClosedAtUtc = DateTime.UtcNow;
                ask.ClosedReason = "The round closed before this was paid.";
            }

            // Funded relationships are never declined by a closing round, whatever their
            // status field says — the money arrived and the record must reflect that.
            var fundedInvestmentIds = await _dbContext.PaymentTransactions
                .Where(t => investmentIds.Contains(t.InvestmentId) && t.Status == PaymentStatus.Succeeded)
                .Select(t => t.InvestmentId)
                .Distinct()
                .ToListAsync();

            foreach (var inv in live)
            {
                if (inv.Status == "Approved" || fundedInvestmentIds.Contains(inv.Id))
                {
                    // An approved backer's commitment keeps counting; the relationship
                    // simply reaches its end.
                    await StageLog.MoveAsync(_dbContext, inv, PipelineStages.Closed, project.OwnerId,
                        $"The round closed · {project.RoundOutcome}");
                    concluded++;
                }
                else
                {
                    // A request never approved is NOT promoted by the round ending — but
                    // leaving it open would strand the investor waiting on a round that
                    // no longer exists, and the founder can no longer act on it either.
                    // Declining with a stated reason is the only honest resolution.
                    inv.Status = PipelineStages.Declined;
                    inv.DeclinedReason ??= "The round closed before this request was reviewed.";
                    await StageLog.MoveAsync(_dbContext, inv, PipelineStages.Declined, project.OwnerId,
                        inv.DeclinedReason);
                    declined++;
                }

                if (inv.InvestorId is int backerId)
                {
                    _dbContext.Notifications.Add(new Notification
                    {
                        UserId = backerId,
                        ActorUserId = project.OwnerId,
                        ProjectId = project.Id,
                        InvestmentId = inv.Id,
                        NotificationType = "round_closed",
                        Content = $"The round for {project.Name} has closed.",
                        DateCreated = DateTime.UtcNow,
                        IsRead = false,
                    });
                }
            }

            await _dbContext.SaveChangesAsync();

            return Ok(new
            {
                message = "Round closed.",
                outcome = project.RoundOutcome,
                closedAt = project.RoundClosedAtUtc,
                relationshipsConcluded = concluded,
                requestsDeclined = declined
            });
        }

        // Soft delete: the project is hidden (global query filter) but not
        // physically removed, so a founder who deletes by mistake isn't permanently
        // gone — an admin can restore via direct data access if needed.
        [Authorize]
        [HttpDelete("{projectId}")]
        public async Task<IActionResult> DeleteProject(int projectId)
        {
            var project = await _dbContext.Projects.FirstOrDefaultAsync(p => p.Id == projectId);

            if (project == null)
            {
                return NotFound("Project not found.");
            }

            if (!User.IsInRole("Innovator") || project.OwnerId != GetCurrentUserId())
            {
                return Forbid();
            }

            project.IsDeleted = true;
            await _dbContext.SaveChangesAsync();

            return Ok(new { message = "Project deleted successfully." });
        }
        [Authorize]
        [HttpPost("increment/{projectId}")]
        public async Task<IActionResult> IncrementTotalInteractions(int projectId, [FromBody] int userId)
        {
            var currentUserId = GetCurrentUserId();
            var project = await _dbContext.Projects.FindAsync(projectId);

            if (project == null)
            {
                return NotFound("Project not found.");
            }

            var alreadyTracked = await _dbContext.UserProjectInteractions
                .AnyAsync(up => up.UserId == currentUserId && up.ProjectId == projectId);

            if (alreadyTracked)
            {
                return Ok(new { message = "Interaction already tracked." });
            }

            project.TotalInteractions++;

            var interaction = new UserProjectInteraction
            {
                UserId = currentUserId,
                ProjectId = projectId,
                InteractionDate = DateTime.UtcNow
            };

            _dbContext.UserProjectInteractions.Add(interaction);

            await _dbContext.SaveChangesAsync();

            return Ok(new { message = "TotalInteractions incremented and notification created successfully." });
        }

        [Authorize]
        [HttpPost("decrement/{projectId}")]
        public async Task<IActionResult> DecrementTotalInteractions(int projectId, [FromBody] int userId)
        {
            var currentUserId = GetCurrentUserId();
            var project = await _dbContext.Projects.FindAsync(projectId);

            if (project == null)
            {
                return NotFound("Project not found.");
            }

            var interaction = await _dbContext.UserProjectInteractions
                                              .FirstOrDefaultAsync(up => up.UserId == currentUserId && up.ProjectId == projectId);

            if (interaction != null)
            {
                _dbContext.UserProjectInteractions.Remove(interaction);
            }
            else
            {
                return BadRequest($"No interaction record found for user ID {currentUserId} and project ID {projectId}.");
            }

            project.TotalInteractions = Math.Max(0, project.TotalInteractions - 1);

            await _dbContext.SaveChangesAsync();

            return Ok(new { message = "TotalInteractions decremented and related notification removed successfully." });
        }

        // Add a comment to a project
        [Authorize]
        [HttpPost("{projectId}/comments")]
        public async Task<IActionResult> AddComment(int projectId, [FromBody] CommentDto commentDto)
        {
            var currentUserId = GetCurrentUserId();
            var project = await _dbContext.Projects.FindAsync(projectId);

            if (project == null)
            {
                return NotFound("Project not found.");
            }

            var comment = new Comment
            {
                Content = commentDto.Content,
                CreatedDate = DateTime.UtcNow,
                UserId = currentUserId,
                ProjectId = projectId
            };

            _dbContext.Comments.Add(comment);
            await _dbContext.SaveChangesAsync();
            await _dbContext.SaveChangesAsync();

            return Ok(new { message = "Comment added successfully." });
        }

        [Authorize]
        [HttpPost("comments/{commentId}/replies")]
        public async Task<IActionResult> AddReply(int commentId, [FromBody] ReplyDto replyDto)
        {
            var currentUserId = GetCurrentUserId();
            var comment = await _dbContext.Comments
                                           .Include(c => c.Project)
                                           .FirstOrDefaultAsync(c => c.Id == commentId);

            if (comment == null)
            {
                return NotFound("Comment not found.");
            }

            var reply = new Reply
            {
                Content = replyDto.Content,
                CreatedDate = DateTime.UtcNow,
                UserId = currentUserId,
                CommentId = commentId
            };

            _dbContext.Replies.Add(reply);
            await _dbContext.SaveChangesAsync();

            if (comment.Project != null) // Check if Project is loaded
            {
                
                await _dbContext.SaveChangesAsync();
            }

            return Ok(new { message = "Reply added successfully." });
        }

        // Delete a comment
        [Authorize]
        [HttpDelete("comments/{commentId}")]
        public async Task<IActionResult> DeleteComment(int commentId)
        {
            var comment = await _dbContext.Comments.FindAsync(commentId);

            if (comment == null)
            {
                return NotFound("Comment not found.");
            }

            if (comment.UserId != GetCurrentUserId())
            {
                return Forbid();
            }

            // Remove replies associated with the comment
            var replies = _dbContext.Replies.Where(r => r.CommentId == commentId);
            _dbContext.Replies.RemoveRange(replies);

            _dbContext.Comments.Remove(comment);

            await _dbContext.SaveChangesAsync();

            return Ok(new { message = "Comment deleted successfully." });
        }

        // Delete a reply
        [Authorize]
        [HttpDelete("replies/{replyId}")]
        public async Task<IActionResult> DeleteReply(int replyId)
        {
            var reply = await _dbContext.Replies.FindAsync(replyId);

            if (reply == null)
            {
                return NotFound("Reply not found.");
            }

            if (reply.UserId != GetCurrentUserId())
            {
                return Forbid();
            }

            _dbContext.Replies.Remove(reply);

            await _dbContext.SaveChangesAsync();

            return Ok(new { message = "Reply deleted successfully." });
        }

        // Upload an image for a project (owner only).
        [Authorize]
        [HttpPost("{projectId}/images")]
        public async Task<IActionResult> UploadProjectImage(int projectId, [FromForm] IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "No file was provided." });
            }

            var project = await _dbContext.Projects.FindAsync(projectId);
            if (project == null)
            {
                return NotFound(new { message = "Project not found." });
            }

            if (!User.IsInRole("Innovator") || project.OwnerId != GetCurrentUserId())
            {
                return Forbid();
            }

            var imageResult = await _fileUploadSecurityService.ReadValidatedImageAsync(file);
            if (imageResult.Status != ServiceResultStatus.Ok || imageResult.Value is null)
            {
                return BadRequest(new { message = imageResult.Message ?? "Invalid image file." });
            }

            var image = new ProjectImage
            {
                ProjectId = projectId,
                ImageData = imageResult.Value,
                ContentType = file.ContentType,
                UploadedAt = DateTime.UtcNow
            };

            _dbContext.ProjectImages.Add(image);
            await _dbContext.SaveChangesAsync();

            return Ok(new { message = "Image uploaded successfully.", imageId = image.Id });
        }

        // List image ids for a project.
        [HttpGet("{projectId}/images")]
        public async Task<IActionResult> GetProjectImages(int projectId)
        {
            var projectExists = await _dbContext.Projects.AnyAsync(p => p.Id == projectId);
            if (!projectExists)
            {
                return NotFound(new { message = "Project not found." });
            }

            var imageIds = await _dbContext.ProjectImages
                .Where(pi => pi.ProjectId == projectId)
                .OrderBy(pi => pi.Id)
                .Select(pi => pi.Id)
                .ToListAsync();

            return Ok(imageIds);
        }

        // Serve a single image's bytes (public, so it can be rendered in <img>).
        // An image id is immutable — replacing a picture creates a new row — so the
        // bytes can be cached hard. Without this every filter change re-downloaded
        // the whole grid.
        [HttpGet("images/{imageId}")]
        public async Task<IActionResult> GetProjectImage(int imageId)
        {
            var image = await _dbContext.ProjectImages
                .AsNoTracking()
                .FirstOrDefaultAsync(pi => pi.Id == imageId);

            if (image == null || image.ImageData.Length == 0)
            {
                return NotFound();
            }

            Response.Headers.CacheControl = "public, max-age=31536000, immutable";

            // ETag lets a revalidating client get a 304 instead of the bytes again.
            var etag = new Microsoft.Net.Http.Headers.EntityTagHeaderValue(
                $"\"{imageId}-{image.ImageData.Length}\"");

            return File(image.ImageData, image.ContentType, image.UploadedAt, etag);
        }

        // Delete a project image (owner only).
        [Authorize]
        [HttpDelete("images/{imageId}")]
        public async Task<IActionResult> DeleteProjectImage(int imageId)
        {
            var image = await _dbContext.ProjectImages
                .Include(pi => pi.Project)
                .FirstOrDefaultAsync(pi => pi.Id == imageId);

            if (image == null)
            {
                return NotFound(new { message = "Image not found." });
            }

            if (!User.IsInRole("Innovator") || image.Project.OwnerId != GetCurrentUserId())
            {
                return Forbid();
            }

            _dbContext.ProjectImages.Remove(image);
            await _dbContext.SaveChangesAsync();

            return Ok(new { message = "Image deleted successfully." });
        }
    }
}
