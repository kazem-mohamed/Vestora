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
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class UsersController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IFileUploadSecurityService _fileUploadSecurityService;

        public UsersController(AppDbContext context, IFileUploadSecurityService fileUploadSecurityService)
        {
            _context = context;
            _fileUploadSecurityService = fileUploadSecurityService;
        }

        private int GetCurrentUserId()
        {
            return int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        }

        // Current user's full profile
        [HttpGet("me")]
        public async Task<IActionResult> GetMe()
        {
            var user = await _context.Users.FindAsync(GetCurrentUserId());
            if (user == null)
            {
                return NotFound(new { message = "User not found." });
            }

            return Ok(new UserProfileDto
            {
                Id = user.Id,
                UserName = user.UserName,
                Email = user.Email,
                UserType = user.UserType,
                BirthDate = user.BirthDate,
                Phone = user.Phone,
                BriefBio = user.BriefBio,
                WebsiteUrl = user.WebsiteUrl,
                LinkedinUrl = user.LinkedinUrl,
                TwitterUrl = user.TwitterUrl,
                PreferredIndustries = (user as Investor)?.PreferredIndustries,
                InvestmentThesis = (user as Investor)?.InvestmentThesis,
                NotifyOnFollow = user.NotifyOnFollow,
                NotifyOnProjectUpdate = user.NotifyOnProjectUpdate,
                TicketMin = (user as Investor)?.TicketMin,
                TicketMax = (user as Investor)?.TicketMax,
                HasAvatar = user.ProfileImage != null && user.ProfileImage.Length > 0,
                HasCover = user.CoverImage != null && user.CoverImage.Length > 0,
                IsEmailVerified = user.IsEmailVerified
            });
        }

        // Update current user's editable profile fields
        [HttpPut("me")]
        public async Task<IActionResult> UpdateMe([FromForm] UpdateUserDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var user = await _context.Users.FindAsync(GetCurrentUserId());
            if (user == null)
            {
                return NotFound(new { message = "User not found." });
            }

            if (!string.IsNullOrWhiteSpace(dto.UserName))
            {
                user.UserName = dto.UserName.Trim();
            }

            if (dto.BirthDate.HasValue)
            {
                user.BirthDate = dto.BirthDate;
            }

            if (dto.Phone != null)
            {
                user.Phone = dto.Phone.Trim();
            }

            if (dto.BriefBio != null)
            {
                user.BriefBio = dto.BriefBio;
            }

            if (dto.WebsiteUrl != null)
            {
                user.WebsiteUrl = dto.WebsiteUrl.Trim();
            }

            if (dto.LinkedinUrl != null)
            {
                user.LinkedinUrl = dto.LinkedinUrl.Trim();
            }

            if (dto.TwitterUrl != null)
            {
                user.TwitterUrl = dto.TwitterUrl.Trim();
            }

            if (dto.NotifyOnFollow.HasValue) user.NotifyOnFollow = dto.NotifyOnFollow.Value;
            if (dto.NotifyOnProjectUpdate.HasValue) user.NotifyOnProjectUpdate = dto.NotifyOnProjectUpdate.Value;

            // Investor-only fields. Silently ignored for other roles rather than
            // rejected, so a founder saving their profile never trips over them.
            if (user is Investor investor)
            {
                if (dto.PreferredIndustries != null)
                {
                    investor.PreferredIndustries = dto.PreferredIndustries.Trim();
                }

                if (dto.InvestmentThesis != null)
                {
                    var thesis = dto.InvestmentThesis.Trim();
                    investor.InvestmentThesis = thesis.Length == 0 ? null : thesis;
                }

                // A single-sided range is valid; an inverted one is not.
                if (dto.TicketMin.HasValue) investor.TicketMin = dto.TicketMin.Value <= 0 ? null : dto.TicketMin;
                if (dto.TicketMax.HasValue) investor.TicketMax = dto.TicketMax.Value <= 0 ? null : dto.TicketMax;

                if (investor.TicketMin.HasValue && investor.TicketMax.HasValue &&
                    investor.TicketMin > investor.TicketMax)
                {
                    return BadRequest(new { message = "Minimum ticket cannot exceed the maximum." });
                }
            }

            if (dto.ProfileImage is { Length: > 0 })
            {
                var imageResult = await _fileUploadSecurityService.ReadValidatedImageAsync(dto.ProfileImage);
                if (imageResult.Status != ServiceResultStatus.Ok || imageResult.Value is null)
                {
                    return BadRequest(new { message = imageResult.Message ?? "Invalid image file." });
                }

                user.ProfileImage = imageResult.Value;
            }

            if (dto.CoverImage is { Length: > 0 })
            {
                var coverResult = await _fileUploadSecurityService.ReadValidatedImageAsync(dto.CoverImage);
                if (coverResult.Status != ServiceResultStatus.Ok || coverResult.Value is null)
                {
                    return BadRequest(new { message = coverResult.Message ?? "Invalid cover image." });
                }

                user.CoverImage = coverResult.Value;
            }

            await _context.SaveChangesAsync();

            return Ok(new UserProfileDto
            {
                Id = user.Id,
                UserName = user.UserName,
                Email = user.Email,
                UserType = user.UserType,
                BirthDate = user.BirthDate,
                Phone = user.Phone,
                BriefBio = user.BriefBio,
                WebsiteUrl = user.WebsiteUrl,
                LinkedinUrl = user.LinkedinUrl,
                TwitterUrl = user.TwitterUrl,
                PreferredIndustries = (user as Investor)?.PreferredIndustries,
                InvestmentThesis = (user as Investor)?.InvestmentThesis,
                NotifyOnFollow = user.NotifyOnFollow,
                NotifyOnProjectUpdate = user.NotifyOnProjectUpdate,
                TicketMin = (user as Investor)?.TicketMin,
                TicketMax = (user as Investor)?.TicketMax,
                HasAvatar = user.ProfileImage != null && user.ProfileImage.Length > 0,
                HasCover = user.CoverImage != null && user.CoverImage.Length > 0,
                IsEmailVerified = user.IsEmailVerified
            });
        }

        /// <summary>
        /// Record that the current user finished the first-run flow.
        ///
        /// Idempotent, and it keeps the first timestamp rather than the latest:
        /// re-running the flow (or a duplicate request from a double click) must
        /// not rewrite when this account was actually onboarded.
        /// </summary>
        [HttpPost("me/onboarded")]
        public async Task<IActionResult> MarkOnboarded()
        {
            var user = await _context.Users.FindAsync(GetCurrentUserId());
            if (user == null)
            {
                return NotFound(new { message = "User not found." });
            }

            if (user.OnboardedAtUtc == null)
            {
                user.OnboardedAtUtc = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }

            return Ok(new { message = "Onboarding recorded.", onboardedAtUtc = user.OnboardedAtUtc });
        }

        /// <summary>
        /// Close your own account.
        ///
        /// Soft delete, matching what an admin delete already does: the row stays
        /// so nobody else's history collapses. That is deliberate — an investor's
        /// approved commitment and a founder's record of who backed them are
        /// shared facts, and one party leaving must not erase the other's copy.
        /// The account itself becomes unreachable: hidden by the global query
        /// filter, sessions revoked, and sign-in refused.
        ///
        /// Requires the current password, because this is not undoable by the user.
        /// </summary>
        [HttpDelete("me")]
        public async Task<IActionResult> DeleteMe([FromBody] DeleteAccountDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var userId = GetCurrentUserId();
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return NotFound(new { message = "User not found." });
            }

            if (!BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.Password))
            {
                _context.SecurityLogs.Add(new SecurityLog
                {
                    EventType = "account_delete_failed",
                    UserId = user.Id,
                    Email = user.Email,
                    IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                    UserAgent = Request.Headers.UserAgent.ToString(),
                    Details = "Incorrect password.",
                    CreatedAtUtc = DateTime.UtcNow
                });
                await _context.SaveChangesAsync();
                return BadRequest(new { message = "That password is not correct." });
            }

            // Never let the platform lose its last moderator: with no admin left,
            // nothing could be reviewed, no report resolved, and no account restored.
            if (user.UserType == "Admin")
            {
                var otherAdmins = await _context.Users
                    .CountAsync(u => u.UserType == "Admin" && u.Id != userId);
                if (otherAdmins == 0)
                {
                    return BadRequest(new
                    {
                        message = "You are the only administrator. Appoint another before closing this account."
                    });
                }
            }

            user.IsDeleted = true;
            user.DeletedAtUtc = DateTime.UtcNow;

            // A founder's listings leave with them — otherwise the public would
            // still see a round nobody is able to answer for.
            var ownedProjects = await _context.Projects
                .Where(p => p.OwnerId == userId)
                .ToListAsync();
            foreach (var project in ownedProjects)
            {
                project.IsDeleted = true;
            }

            // Revoke every session so the account cannot be used after this call.
            var tokens = await _context.RefreshTokens
                .Where(rt => rt.UserId == userId && rt.RevokedAtUtc == null)
                .ToListAsync();
            foreach (var token in tokens)
            {
                token.RevokedAtUtc = DateTime.UtcNow;
                token.RevokedByIp = HttpContext.Connection.RemoteIpAddress?.ToString();
            }

            _context.SecurityLogs.Add(new SecurityLog
            {
                EventType = "account_deleted",
                UserId = user.Id,
                Email = user.Email,
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers.UserAgent.ToString(),
                Details = $"Self-service account closure. {ownedProjects.Count} listing(s) withdrawn.",
                CreatedAtUtc = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            return Ok(new { message = "Your account has been closed." });
        }

        // Public profile of any user — identity + live stats + viewer-relative follow state.
        // Money stays private: only counts are returned, never amounts.
        [HttpGet("{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPublicProfile(int id)
        {
            int? viewerId = int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var vid) ? vid : (int?)null;

            // Owner and admins see the whole shelf; everyone else sees only what is
            // actually reachable. The counts below MUST use the same predicate as the
            // grids that render beneath them — a header saying "5 ventures" over three
            // cards is a lie, and it also tells a stranger how many listings this
            // founder has hidden or awaiting review.
            var isAdmin = User.IsInRole("Admin");
            var privileged = (viewerId.HasValue && viewerId.Value == id) || isAdmin;

            // One round-trip for the profile, every count, and the team memberships.
            // These were six sequential awaits on a page that sits in the middle of
            // the browse → venture → founder loop.
            var profile = await _context.Users
                .AsNoTracking()
                .Where(u => u.Id == id)
                .Select(u => new
                {
                    u.Id,
                    u.UserName,
                    u.Email,
                    u.UserType,
                    u.BriefBio,
                    u.WebsiteUrl,
                    u.LinkedinUrl,
                    u.TwitterUrl,
                    PreferredIndustries = (u as Investor) != null ? (u as Investor)!.PreferredIndustries : null,
                    InvestmentThesis = (u as Investor) != null ? (u as Investor)!.InvestmentThesis : null,
                    TicketMin = (u as Investor) != null ? (u as Investor)!.TicketMin : null,
                    TicketMax = (u as Investor) != null ? (u as Investor)!.TicketMax : null,
                    HasAvatar = u.ProfileImage != null,
                    HasCover = u.CoverImage != null,
                    u.CreatedAtUtc,
                    u.IsEmailVerified,

                    // ---- Trust-signal inputs. Every one is a fact already visible on
                    // ---- this page; the signals only put an honest label on them.
                    //
                    // Endorsements received as a founder: written by backers about how
                    // the person actually behaved, which is the only reputational input
                    // Vestora holds that did not come from the member themselves.
                    EndorsementsReceived = _context.Reviews
                        .Count(r => r.Project != null && r.Project.OwnerId == id),

                    // Rounds this person ran to a stated conclusion.
                    CompletedRounds = _context.Projects
                        .Count(p => p.OwnerId == id && p.RoundOutcome == "Completed"),

                    FollowersCount = _context.Follows.Count(f => f.FollowedId == id),
                    FollowingCount = _context.Follows.Count(f => f.FollowerId == id),

                    // Mirrors ProjectsController.GetProjects exactly.
                    ProjectsCount = _context.Projects.Count(p =>
                        p.OwnerId == id &&
                        (privileged ||
                         (p.ModerationStatus == "Approved" && p.LifecycleStatus != "Paused"))),

                    // Counted over projects, not investments, so it is distinct by
                    // construction and can carry the same visibility rule.
                    BackedCount = _context.Projects.Count(p =>
                        (privileged ||
                         (p.ModerationStatus == "Approved" && p.LifecycleStatus != "Paused")) &&
                        p.Investments.Any(x => x.InvestorId == id && x.Status == "Approved")),

                    IsFollowedByMe = viewerId.HasValue &&
                        _context.Follows.Any(f => f.FollowerId == viewerId.Value && f.FollowedId == id),

                    // Team memberships this user is linked to by matching email —
                    // retroactive and automatic, not something anyone wires up manually.
                    TeamMemberships = _context.TeamMembers
                        .Where(t => t.Email != null && t.Email == u.Email.ToLower())
                        .OrderBy(t => t.Id)
                        .Select(t => new TeamMembershipDto
                        {
                            ProjectId = t.ProjectId,
                            ProjectName = t.Project.Name,
                            Role = t.Role
                        })
                        .ToList()
                })
                .FirstOrDefaultAsync();

            if (profile == null)
            {
                return NotFound(new { message = "User not found." });
            }

            // A mandate is "stated" when the investor has said something a founder could
            // actually act on — a thesis, the sectors they back, or the cheque they write.
            var hasMandate =
                !string.IsNullOrWhiteSpace(profile.InvestmentThesis) ||
                !string.IsNullOrWhiteSpace(profile.PreferredIndustries) ||
                profile.TicketMin.HasValue ||
                profile.TicketMax.HasValue;

            var signals = TrustSignals
                .ForUser(
                    emailVerified: profile.IsEmailVerified,
                    createdAtUtc: profile.CreatedAtUtc,
                    backedRounds: profile.BackedCount,
                    endorsements: profile.EndorsementsReceived,
                    hasMandate: hasMandate,
                    completedRounds: profile.CompletedRounds)
                .Select(s => new TrustSignalDto
                {
                    Key = s.Key,
                    Level = s.Level.ToString(),
                    Value = s.Value,
                })
                .ToList();

            return Ok(new PublicProfileDetailDto
            {
                TrustSignals = signals,
                Id = profile.Id,
                UserName = profile.UserName,
                UserType = profile.UserType,
                BriefBio = profile.BriefBio,
                WebsiteUrl = profile.WebsiteUrl,
                LinkedinUrl = profile.LinkedinUrl,
                TwitterUrl = profile.TwitterUrl,
                PreferredIndustries = profile.PreferredIndustries,
                InvestmentThesis = profile.InvestmentThesis,
                TicketMin = profile.TicketMin,
                TicketMax = profile.TicketMax,
                HasAvatar = profile.HasAvatar,
                HasCover = profile.HasCover,
                JoinedAtUtc = profile.CreatedAtUtc,
                FollowersCount = profile.FollowersCount,
                FollowingCount = profile.FollowingCount,
                ProjectsCount = profile.ProjectsCount,
                BackedCount = profile.BackedCount,
                IsFollowedByMe = profile.IsFollowedByMe,
                IsMe = viewerId == id,
                TeamMemberships = profile.TeamMemberships
            });
        }

        // Ventures this investor has backed (approved only), shaped like browse cards.
        // Public and count-safe — the investor's personal amounts are never exposed.
        [HttpGet("{id}/backed")]
        [AllowAnonymous]
        public async Task<IActionResult> GetBackedVentures(int id)
        {
            int? viewerId = int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var vid) ? vid : (int?)null;
            var privileged = (viewerId.HasValue && viewerId.Value == id) || User.IsInRole("Admin");

            var projectIds = await _context.Investments
                .AsNoTracking()
                .Where(i => i.InvestorId == id && i.Status == "Approved")
                .Select(i => i.ProjectId)
                .Distinct()
                .ToListAsync();

            // Same visibility rule as browse and the details page. Without it this
            // anonymous endpoint published withdrawn and unreviewed listings, and
            // every one of those cards led to a 404.
            var projects = await _context.Projects
                .AsNoTracking()
                .Where(p => projectIds.Contains(p.Id) &&
                            (privileged ||
                             (p.ModerationStatus == "Approved" && p.LifecycleStatus != "Paused")))
                .OrderByDescending(p => p.CreatedDate)
                .Select(ProjectCardProjection.Card)
                .ToListAsync();

            return Ok(projects);
        }

        // Cover image bytes (public so it can back the profile hero in an <img>).
        [HttpGet("{id}/cover")]
        [AllowAnonymous]
        public async Task<IActionResult> GetCover(int id)
        {
            var user = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == id);

            if (user?.CoverImage == null || user.CoverImage.Length == 0)
            {
                return NotFound();
            }

            return File(user.CoverImage, ResolveImageContentType(user.CoverImage));
        }

        // Avatar image bytes (public so it can be rendered in <img> anywhere)
        [HttpGet("{id}/avatar")]
        [AllowAnonymous]
        public async Task<IActionResult> GetAvatar(int id)
        {
            var user = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == id);

            if (user?.ProfileImage == null || user.ProfileImage.Length == 0)
            {
                return NotFound();
            }

            return File(user.ProfileImage, ResolveImageContentType(user.ProfileImage));
        }

        private static string ResolveImageContentType(byte[] bytes)
        {
            if (bytes.Length >= 4)
            {
                if (bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47)
                {
                    return "image/png";
                }

                if (bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF)
                {
                    return "image/jpeg";
                }

                if (bytes[0] == 0x47 && bytes[1] == 0x49 && bytes[2] == 0x46)
                {
                    return "image/gif";
                }

                if (bytes[0] == 0x42 && bytes[1] == 0x4D)
                {
                    return "image/bmp";
                }
            }

            return "application/octet-stream";
        }
    }
}
