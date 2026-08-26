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
    // Admin-only moderation: user reports + the project listing review queue.
    // Deleting a reported venture reuses the existing DELETE /api/admin/projects/{id}
    // endpoint (soft delete), so the report-handling half of this controller only
    // manages report status.
    [Route("api/admin")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class AdminModerationController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly NotificationFanOutQueue _fanOut;

        public AdminModerationController(AppDbContext context, NotificationFanOutQueue fanOut)
        {
            _context = context;
            _fanOut = fanOut;
        }

        private int GetCurrentUserId() =>
            int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        // ============ PROJECT MODERATION (listing review queue) ============

        [HttpGet("projects/pending")]
        public async Task<IActionResult> GetPendingProjects([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var query = _context.Projects.AsNoTracking()
                .Where(p => p.ModerationStatus == "PendingReview")
                .OrderBy(p => p.CreatedDate);

            var totalCount = await query.CountAsync();
            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(p => new
                {
                    p.Id,
                    p.Name,
                    p.Description,
                    p.Topic,
                    p.Category,
                    p.Location,
                    p.Stage,
                    p.InvestmentNeeded,
                    p.Valuation,
                    p.EquityOffered,
                    p.OwnerId,
                    OwnerName = p.Owner.UserName,
                    p.CreatedDate,
                    // What a reviewer actually judges: does the listing show its
                    // work? Sending the counts (and a cover) means most decisions
                    // can be made in the queue instead of opening every venture.
                    CoverImageId = p.Images.OrderBy(im => im.Id).Select(im => (int?)im.Id).FirstOrDefault(),
                    ImageCount = p.Images.Count(),
                    TeamCount = p.Team.Count(),
                    DocumentCount = p.Documents.Count(),
                    MilestoneCount = p.Milestones.Count()
                })
                .ToListAsync();

            return Ok(new { Items = items, TotalCount = totalCount, Page = page, PageSize = pageSize });
        }

        [HttpPost("projects/{projectId}/approve")]
        public async Task<IActionResult> ApproveProject(int projectId)
        {
            var project = await _context.Projects.FirstOrDefaultAsync(p => p.Id == projectId);
            if (project == null) return NotFound(new { message = "Project not found." });

            var before = new { project.ModerationStatus, project.ModerationNote };
            project.ModerationStatus = "Approved";
            project.ModeratedAtUtc = DateTime.UtcNow;
            project.ModerationNote = null;
            _context.Audit(GetCurrentUserId(), "ApproveProject", "Project", projectId,
                details: $"Approved '{project.Name}'.",
                before: before,
                after: new { project.ModerationStatus, project.ModerationNote },
                http: HttpContext);
            await _context.SaveChangesAsync();

            // Now that the listing is actually visible, tell the founder's
            // followers about it (moved here from creation time — notifying
            // about a link that 404s until review would be misleading).
            var followerIds = await _context.Follows
                .Where(f => f.FollowedId == project.OwnerId)
                .Select(f => f.FollowerId)
                .ToListAsync();
            if (followerIds.Count > 0)
            {
                var actorName = await _context.Users
                    .Where(u => u.Id == project.OwnerId)
                    .Select(u => u.UserName)
                    .FirstOrDefaultAsync() ?? "An innovator";
                _fanOut.Enqueue(followerIds.Select(fid => new FanOutNotification(
                    fid,
                    $"{actorName} launched a new venture: {project.Name}",
                    "NewProject",
                    project.Id,
                    null,
                    project.OwnerId)));
            }

            return Ok(new { message = "Project approved." });
        }

        [HttpPost("projects/{projectId}/reject")]
        public async Task<IActionResult> RejectProject(int projectId, [FromBody] AdminReasonDto dto)
        {
            var project = await _context.Projects.FirstOrDefaultAsync(p => p.Id == projectId);
            if (project == null) return NotFound(new { message = "Project not found." });

            var before = new { project.ModerationStatus, project.ModerationNote };
            project.ModerationStatus = "Rejected";
            // Persist the reason so the founder (and any later admin) can read it
            // instead of it living only inside a one-off notification.
            project.ModerationNote = dto.Reason;
            project.ModeratedAtUtc = DateTime.UtcNow;
            _context.Audit(GetCurrentUserId(), "RejectProject", "Project", projectId,
                details: $"Rejected '{project.Name}'.",
                reason: dto.Reason,
                before: before,
                after: new { project.ModerationStatus, project.ModerationNote },
                http: HttpContext);
            await _context.SaveChangesAsync();

            _fanOut.Enqueue(new FanOutNotification(
                project.OwnerId,
                $"Your listing '{project.Name}' was not approved for publishing. Reason: {dto.Reason}",
                "ProjectRejected",
                project.Id,
                null,
                null));

            return Ok(new { message = "Project rejected." });
        }

        // Paged, status-filtered report queue (open first, newest first).
        [HttpGet("reports")]
        public async Task<IActionResult> GetReports(
            [FromQuery] string? status,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var query = _context.Reports.AsNoTracking().AsQueryable();
            if (!string.IsNullOrWhiteSpace(status))
            {
                var s = status.Trim();
                query = query.Where(r => r.Status == s);
            }

            var totalCount = await query.CountAsync();
            var openCount = await _context.Reports.CountAsync(r => r.Status == "Open");

            var items = await query
                .OrderByDescending(r => r.Status == "Open")
                .ThenByDescending(r => r.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(r => new ReportDto
                {
                    Id = r.Id,
                    ProjectId = r.ProjectId,
                    ProjectName = r.Project!.Name,
                    ReporterId = r.ReporterId,
                    ReporterName = _context.Users
                        .Where(u => u.Id == r.ReporterId)
                        .Select(u => u.UserName)
                        .FirstOrDefault() ?? "Unknown",
                    Reason = r.Reason,
                    Details = r.Details,
                    Status = r.Status,
                    CreatedAt = r.CreatedAt
                })
                .ToListAsync();

            return Ok(new
            {
                Items = items,
                TotalCount = totalCount,
                OpenCount = openCount,
                Page = page,
                PageSize = pageSize
            });
        }

        [HttpPost("reports/{id}/resolve")]
        public async Task<IActionResult> Resolve(int id)
        {
            return await SetStatus(id, "Resolved");
        }

        [HttpPost("reports/{id}/dismiss")]
        public async Task<IActionResult> Dismiss(int id)
        {
            return await SetStatus(id, "Dismissed");
        }

        private async Task<IActionResult> SetStatus(int id, string status)
        {
            var report = await _context.Reports.FirstOrDefaultAsync(r => r.Id == id);
            if (report == null)
            {
                return NotFound(new { message = "Report not found." });
            }

            var before = new { report.Status };
            report.Status = status;
            report.ResolvedAt = DateTime.UtcNow;
            report.ResolvedByAdminId = GetCurrentUserId();
            _context.Audit(GetCurrentUserId(), $"{status}Report", "Report", id,
                before: before,
                after: new { report.Status },
                http: HttpContext);
            await _context.SaveChangesAsync();

            return Ok(new { message = $"Report marked {status.ToLowerInvariant()}." });
        }
    }
}
