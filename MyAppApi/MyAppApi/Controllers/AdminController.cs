using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using MyAppApi.Data;
using MyAppApi.Data.Models;
using MyAppApi.Data.Models.DTOs;
using MyAppApi.Services;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace MyAppApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AdminController> _logger;

        public AdminController(AppDbContext context, IConfiguration configuration, ILogger<AdminController> logger)
        {
            _context = context;
            _configuration = configuration;
            _logger = logger;
        }

        private int GetCurrentUserId()
        {
            return int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        }

        // One-time creation of the first administrator, guarded by a configured secret.
        // Becomes permanently unavailable once any administrator exists.
        [HttpPost("bootstrap")]
        [AllowAnonymous]
        [EnableRateLimiting("PasswordReset")]
        public async Task<IActionResult> Bootstrap([FromBody] AdminBootstrapDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var configuredSecret = _configuration["AdminBootstrap:SecretKey"];
            if (string.IsNullOrWhiteSpace(configuredSecret))
            {
                _logger.LogWarning("Admin bootstrap attempted but no secret is configured.");
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "Admin bootstrap is disabled." });
            }

            if (!SecretMatches(dto.SecretKey, configuredSecret))
            {
                _logger.LogWarning("Admin bootstrap attempted with an invalid secret.");
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "Invalid bootstrap secret." });
            }

            if (await _context.Users.AnyAsync(u => u.UserType == "Admin"))
            {
                return Conflict(new { message = "An administrator already exists. Bootstrap is no longer available." });
            }

            var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
            if (await _context.Users.AnyAsync(u => u.Email.ToLower() == normalizedEmail))
            {
                return BadRequest(new { message = "A user with this email already exists." });
            }

            var admin = CreateAdminUser(dto.UserName, normalizedEmail, dto.Password);
            _context.Users.Add(admin);
            await _context.SaveChangesAsync();

            _logger.LogInformation("First administrator account created via bootstrap (user {UserId}).", admin.Id);
            return Ok(new { message = "Administrator account created. You can now log in." });
        }

        // Create additional administrators (authenticated administrators only).
        [HttpPost("admins")]
        public async Task<IActionResult> CreateAdmin([FromBody] CreateAdminDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
            if (await _context.Users.AnyAsync(u => u.Email.ToLower() == normalizedEmail))
            {
                return BadRequest(new { message = "A user with this email already exists." });
            }

            var admin = CreateAdminUser(dto.UserName, normalizedEmail, dto.Password);
            _context.Users.Add(admin);
            await _context.SaveChangesAsync();

            await LogAsync("CreateAdmin", "User", admin.Id, $"Created admin '{admin.UserName}'.");

            return Ok(new { message = "Administrator account created.", userId = admin.Id });
        }

        // Paged, searchable list of all users for moderation.
        [HttpGet("users")]
        public async Task<IActionResult> GetUsers(
            [FromQuery] string? search,
            [FromQuery] string? userType,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var query = _context.Users.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                query = query.Where(u => u.UserName.Contains(term) || u.Email.Contains(term));
            }

            if (!string.IsNullOrWhiteSpace(userType))
            {
                var type = userType.Trim();
                query = query.Where(u => u.UserType == type);
            }

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderBy(u => u.Id)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(u => new AdminUserDto
                {
                    Id = u.Id,
                    UserName = u.UserName,
                    Email = u.Email,
                    UserType = u.UserType,
                    IsEmailVerified = u.IsEmailVerified,
                    IsSuspended = u.IsSuspended,
                    SuspensionReason = u.SuspensionReason
                })
                .ToListAsync();

            return Ok(new PagedResult<AdminUserDto>
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            });
        }

        // Delete a user (cannot delete self or other administrators). Soft delete:
        // the account is hidden (global query filter), not physically removed, so
        // it's reversible and never fails on related data (investments, messages).
        [HttpDelete("users/{userId}")]
        public async Task<IActionResult> DeleteUser(int userId)
        {
            if (userId == GetCurrentUserId())
            {
                return BadRequest(new { message = "You cannot delete your own account." });
            }

            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return NotFound(new { message = "User not found." });
            }

            if (user.UserType == "Admin")
            {
                return BadRequest(new { message = "Administrators cannot be deleted from here." });
            }

            user.IsDeleted = true;
            await _context.SaveChangesAsync();
            await LogAsync("DeleteUser", "User", userId, $"Deleted user '{user.UserName}' ({user.UserType}).");

            return Ok(new { message = "User deleted successfully." });
        }

        // Moderation: soft delete a project. Hidden immediately (global query
        // filter) but not physically removed, so it's reversible and there's no
        // manual cascade to keep in sync with the schema.
        [HttpDelete("projects/{projectId}")]
        public async Task<IActionResult> DeleteProject(int projectId)
        {
            var project = await _context.Projects.FirstOrDefaultAsync(p => p.Id == projectId);

            if (project == null)
            {
                return NotFound(new { message = "Project not found." });
            }

            project.IsDeleted = true;
            await _context.SaveChangesAsync();
            await LogAsync("DeleteProject", "Project", projectId, $"Deleted project '{project.Name}'.");

            return Ok(new { message = "Project deleted successfully." });
        }

        // Suspension: the reversible step below deletion. The account keeps all
        // its data but is blocked from signing in (enforced in AuthService).
        [HttpPost("users/{userId}/suspend")]
        public async Task<IActionResult> SuspendUser(int userId, [FromBody] SuspendUserDto? dto)
        {
            if (userId == GetCurrentUserId())
                return BadRequest(new { message = "You cannot suspend your own account." });

            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound(new { message = "User not found." });
            if (user.UserType == "Admin")
                return BadRequest(new { message = "Administrators cannot be suspended from here." });

            user.IsSuspended = true;
            user.SuspendedAtUtc = DateTime.UtcNow;
            user.SuspensionReason = dto?.Reason;
            await _context.SaveChangesAsync();
            await LogAsync("SuspendUser", "User", userId, dto?.Reason ?? $"Suspended '{user.UserName}'.");

            return Ok(new { message = "User suspended." });
        }

        [HttpPost("users/{userId}/restore")]
        public async Task<IActionResult> RestoreUser(int userId)
        {
            // Restoring may target a soft-deleted row, so bypass the query filter.
            var user = await _context.Users.IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null) return NotFound(new { message = "User not found." });

            user.IsSuspended = false;
            user.SuspendedAtUtc = null;
            user.SuspensionReason = null;
            user.IsDeleted = false;
            await _context.SaveChangesAsync();
            await LogAsync("RestoreUser", "User", userId, $"Restored '{user.UserName}'.");

            return Ok(new { message = "User restored." });
        }

        // Security signal feed built from SecurityLog rows the auth layer already
        // writes (failed logins, lockouts, password resets) — previously captured
        // but never surfaced anywhere.
        [HttpGet("security")]
        public async Task<IActionResult> GetSecurity([FromQuery] int days = 14, [FromQuery] int take = 40)
        {
            days = Math.Clamp(days, 1, 90);
            take = Math.Clamp(take, 1, 200);
            var since = DateTime.UtcNow.AddDays(-days);

            var events = await _context.SecurityLogs.AsNoTracking()
                .Where(s => s.CreatedAtUtc >= since)
                .OrderByDescending(s => s.CreatedAtUtc)
                .Take(take)
                .Select(s => new
                {
                    s.Id,
                    s.EventType,
                    s.Email,
                    s.IpAddress,
                    s.Details,
                    s.CreatedAtUtc,
                    s.UserId
                })
                .ToListAsync();

            var byType = await _context.SecurityLogs.AsNoTracking()
                .Where(s => s.CreatedAtUtc >= since)
                .GroupBy(s => s.EventType)
                .Select(g => new { Type = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .ToListAsync();

            var lockedAccounts = await _context.Users.AsNoTracking()
                .CountAsync(u => u.LockoutEndUtc != null && u.LockoutEndUtc > DateTime.UtcNow);

            var suspended = await _context.Users.AsNoTracking().CountAsync(u => u.IsSuspended);

            return Ok(new { Events = events, ByType = byType, LockedAccounts = lockedAccounts, SuspendedAccounts = suspended, Days = days });
        }

        // Platform growth over time — derived from existing CreatedAt columns.
        [HttpGet("growth")]
        public async Task<IActionResult> GetGrowth([FromQuery] int months = 6)
        {
            months = Math.Clamp(months, 1, 24);
            var since = DateTime.UtcNow.AddMonths(-months);

            var users = await _context.Users.AsNoTracking()
                .Where(u => u.CreatedAtUtc != null && u.CreatedAtUtc >= since)
                .Select(u => new { Date = u.CreatedAtUtc!.Value, u.UserType })
                .ToListAsync();

            var ventures = await _context.Projects.AsNoTracking()
                .Where(p => p.CreatedDate >= since)
                .Select(p => p.CreatedDate)
                .ToListAsync();

            static List<TimePointDto> Cumulative(IEnumerable<DateTime> dates)
            {
                var result = new List<TimePointDto>();
                double running = 0;
                foreach (var g in dates.GroupBy(d => new DateTime(d.Year, d.Month, 1)).OrderBy(g => g.Key))
                {
                    running += g.Count();
                    result.Add(new TimePointDto { Label = g.Key.ToString("yyyy-MM"), Value = running });
                }
                return result;
            }

            return Ok(new
            {
                UserGrowth = Cumulative(users.Select(u => u.Date)),
                InvestorGrowth = Cumulative(users.Where(u => u.UserType == "Investor").Select(u => u.Date)),
                InnovatorGrowth = Cumulative(users.Where(u => u.UserType == "Innovator").Select(u => u.Date)),
                VentureGrowth = Cumulative(ventures)
            });
        }

        private async Task LogAsync(string action, string targetType, int? targetId, string? details = null)
        {
            _context.AdminAuditLogs.Add(new AdminAuditLog
            {
                AdminUserId = GetCurrentUserId(),
                Action = action,
                TargetType = targetType,
                TargetId = targetId,
                Details = details,
                CreatedAtUtc = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();
        }

        // Paged audit trail of admin actions (deletes, approvals, report resolutions).
        [HttpGet("audit-log")]
        public async Task<IActionResult> GetAuditLog([FromQuery] int page = 1, [FromQuery] int pageSize = 30)
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var query = _context.AdminAuditLogs.AsNoTracking().OrderByDescending(a => a.CreatedAtUtc);
            var totalCount = await query.CountAsync();
            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(a => new
                {
                    a.Id,
                    a.AdminUserId,
                    AdminName = _context.Users.IgnoreQueryFilters()
                        .Where(u => u.Id == a.AdminUserId)
                        .Select(u => u.UserName)
                        .FirstOrDefault() ?? "Unknown",
                    a.Action,
                    a.TargetType,
                    a.TargetId,
                    a.Details,
                    a.CreatedAtUtc
                })
                .ToListAsync();

            return Ok(new { Items = items, TotalCount = totalCount, Page = page, PageSize = pageSize });
        }

        // High-level platform analytics for the admin dashboard.
        [HttpGet("analytics")]
        public async Task<IActionResult> GetAnalytics()
        {
            var usersByType = await _context.Users
                .GroupBy(u => u.UserType)
                .Select(g => new { Type = g.Key, Count = g.Count() })
                .ToListAsync();

            var totalProjects = await _context.Projects.CountAsync();

            // "Funded" now means money settled, not approvals collected. The commitment
            // count is kept beside it rather than replaced, because the gap between the
            // two is itself the most interesting number on this screen.
            var fundedProjects = await _context.Projects.CountAsync(FundingMath.IsFullyFunded);
            var fullyCommittedProjects = await _context.Projects.CountAsync(FundingMath.IsFullyCommitted);

            var totalCommitments = await _context.Investments.CountAsync(i => i.Status == "Approved");
            var totalCommittedAmount = (double)(await _context.Investments
                .Where(i => i.Status == "Approved").SumAsync(i => (decimal?)i.Amount) ?? 0m);

            var settled = await _context.PaymentTransactions
                .Where(t => t.Status == PaymentStatus.Succeeded)
                .Select(t => new { t.Amount, t.FeeAmount })
                .ToListAsync();

            return Ok(new AdminAnalyticsDto
            {
                TotalUsers = usersByType.Sum(x => x.Count),
                Investors = usersByType.FirstOrDefault(x => x.Type == "Investor")?.Count ?? 0,
                Innovators = usersByType.FirstOrDefault(x => x.Type == "Innovator")?.Count ?? 0,
                Admins = usersByType.FirstOrDefault(x => x.Type == "Admin")?.Count ?? 0,
                TotalProjects = totalProjects,
                FundedProjects = fundedProjects,
                FullyCommittedProjects = fullyCommittedProjects,
                TotalInvestments = totalCommitments,
                TotalInvestedAmount = (double)settled.Sum(t => t.Amount),
                TotalCommittedAmount = totalCommittedAmount,
                PlatformRevenue = (double)settled.Sum(t => t.FeeAmount),
                FundedTransactions = settled.Count
            });
        }

        private static Admin CreateAdminUser(string userName, string normalizedEmail, string password)
        {
            return new Admin
            {
                UserType = "Admin",
                UserName = userName.Trim(),
                Email = normalizedEmail,
                Password = BCrypt.Net.BCrypt.HashPassword(password),
                UniqueNumber = Guid.NewGuid().ToString("N")[..10],
                IsEmailVerified = true,
                EmailVerifiedAtUtc = DateTime.UtcNow
            };
        }

        private static bool SecretMatches(string provided, string configured)
        {
            var providedBytes = Encoding.UTF8.GetBytes(provided);
            var configuredBytes = Encoding.UTF8.GetBytes(configured);
            return CryptographicOperations.FixedTimeEquals(providedBytes, configuredBytes);
        }
    }
}
