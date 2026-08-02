using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using MyAppApi.Data;
using MyAppApi.Data.Models;
using MyAppApi.Data.Models.Hubs;
using MyAppApi.Services;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace MyAppApi.Controllers
{
    // F5 Storytelling: project updates (timeline) + milestones (roadmap).
    [Route("api/projects")]
    [ApiController]
    public class ProjectStoryController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IFileUploadSecurityService _fileUpload;
        private readonly IHubContext<ChatHub> _hub;
        private readonly NotificationFanOutQueue _fanOut;

        public ProjectStoryController(AppDbContext db, IFileUploadSecurityService fileUpload, IHubContext<ChatHub> hub, NotificationFanOutQueue fanOut)
        {
            _db = db;
            _fileUpload = fileUpload;
            _hub = hub;
            _fanOut = fanOut;
        }

        private int GetCurrentUserId() =>
            int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        private async Task<bool> OwnsAsync(int projectId, int userId) =>
            await _db.Projects.AnyAsync(p => p.Id == projectId && p.OwnerId == userId);

        // ============ UPDATES ============

        [HttpGet("{projectId}/updates")]
        public async Task<IActionResult> GetUpdates(int projectId)
        {
            var updates = await _db.ProjectUpdates
                .AsNoTracking()
                .Where(u => u.ProjectId == projectId)
                .OrderByDescending(u => u.CreatedDate)
                .Select(u => new
                {
                    u.Id,
                    u.Title,
                    u.Body,
                    u.CreatedDate,
                    ImageIds = u.Images.OrderBy(i => i.Id).Select(i => i.Id).ToList()
                })
                .ToListAsync();

            return Ok(updates);
        }

        [Authorize(Roles = "Innovator")]
        [HttpPost("{projectId}/updates")]
        public async Task<IActionResult> CreateUpdate(int projectId, [FromBody] UpdateInput input)
        {
            var userId = GetCurrentUserId();
            var project = await _db.Projects.FindAsync(projectId);
            if (project == null) return NotFound(new { message = "Project not found." });
            if (project.OwnerId != userId) return Forbid();

            if (string.IsNullOrWhiteSpace(input.Title) || string.IsNullOrWhiteSpace(input.Body))
            {
                return BadRequest(new { message = "Title and body are required." });
            }

            var update = new ProjectUpdate
            {
                ProjectId = projectId,
                Title = input.Title.Trim(),
                Body = input.Body.Trim(),
                CreatedDate = DateTime.UtcNow
            };
            _db.ProjectUpdates.Add(update);
            await _db.SaveChangesAsync();

            // Notify every backer with an approved investment, plus followers who
            // aren't already backers — queued so posting an update stays fast
            // regardless of audience size instead of blocking on a serial
            // save-then-push loop for every recipient.
            var backerIds = await _db.Investments
                .Where(i => i.ProjectId == projectId && i.Status == "Approved" && i.InvestorId != null)
                .Select(i => i.InvestorId!.Value)
                .Distinct()
                .ToListAsync();

            var followerIds = await _db.Follows
                .Where(f => f.FollowedId == userId)
                .Select(f => f.FollowerId)
                .ToListAsync();

            // Anyone who saved this venture is watching it on purpose — that is
            // the whole point of a watchlist. They were the one interested group
            // never told when the thing they were tracking moved.
            var watcherIds = await _db.Bookmarks
                .Where(b => b.ProjectId == projectId)
                .Select(b => b.UserId)
                .ToListAsync();

            var candidateIds = backerIds
                .Union(followerIds)
                .Union(watcherIds)
                .Where(id => id != userId)   // never notify the author of their own post
                .Distinct()
                .ToList();

            // Honour each recipient's preference. Project updates are ambient, so
            // they are one of the two notifications a member may switch off.
            var recipientIds = await _db.Users
                .Where(u => candidateIds.Contains(u.Id) && u.NotifyOnProjectUpdate)
                .Select(u => u.Id)
                .ToListAsync();
            var content = $"New update on '{project.Name}': {update.Title}";
            _fanOut.Enqueue(recipientIds.Select(uid => new FanOutNotification(
                uid, content, "ProjectUpdate", projectId, null, userId)));

            return Ok(new { message = "Update posted.", updateId = update.Id });
        }

        [Authorize(Roles = "Innovator")]
        [HttpPut("updates/{updateId}")]
        public async Task<IActionResult> EditUpdate(int updateId, [FromBody] UpdateInput input)
        {
            var userId = GetCurrentUserId();
            var update = await _db.ProjectUpdates.Include(u => u.Project)
                .FirstOrDefaultAsync(u => u.Id == updateId);
            if (update == null) return NotFound(new { message = "Update not found." });
            if (update.Project.OwnerId != userId) return Forbid();

            if (!string.IsNullOrWhiteSpace(input.Title)) update.Title = input.Title.Trim();
            if (!string.IsNullOrWhiteSpace(input.Body)) update.Body = input.Body.Trim();
            await _db.SaveChangesAsync();

            return Ok(new { message = "Update saved." });
        }

        [Authorize(Roles = "Innovator")]
        [HttpDelete("updates/{updateId}")]
        public async Task<IActionResult> DeleteUpdate(int updateId)
        {
            var userId = GetCurrentUserId();
            var update = await _db.ProjectUpdates.Include(u => u.Project)
                .FirstOrDefaultAsync(u => u.Id == updateId);
            if (update == null) return NotFound(new { message = "Update not found." });
            if (update.Project.OwnerId != userId) return Forbid();

            _db.ProjectUpdates.Remove(update);
            await _db.SaveChangesAsync();
            return Ok(new { message = "Update deleted." });
        }

        [Authorize(Roles = "Innovator")]
        [HttpPost("updates/{updateId}/images")]
        public async Task<IActionResult> UploadUpdateImage(int updateId, [FromForm] IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "No file was provided." });

            var userId = GetCurrentUserId();
            var update = await _db.ProjectUpdates.Include(u => u.Project)
                .FirstOrDefaultAsync(u => u.Id == updateId);
            if (update == null) return NotFound(new { message = "Update not found." });
            if (update.Project.OwnerId != userId) return Forbid();

            var result = await _fileUpload.ReadValidatedImageAsync(file);
            if (result.Status != ServiceResultStatus.Ok || result.Value is null)
                return BadRequest(new { message = result.Message ?? "Invalid image file." });

            var image = new ProjectUpdateImage
            {
                ProjectUpdateId = updateId,
                ImageData = result.Value,
                ContentType = file.ContentType,
                UploadedAt = DateTime.UtcNow
            };
            _db.ProjectUpdateImages.Add(image);
            await _db.SaveChangesAsync();

            return Ok(new { message = "Image uploaded.", imageId = image.Id });
        }

        // Public bytes so it renders in <img>.
        [HttpGet("updates/images/{imageId}")]
        public async Task<IActionResult> GetUpdateImage(int imageId)
        {
            var image = await _db.ProjectUpdateImages.AsNoTracking()
                .FirstOrDefaultAsync(i => i.Id == imageId);
            if (image == null || image.ImageData.Length == 0) return NotFound();
            return File(image.ImageData, image.ContentType);
        }

        // ============ MILESTONES ============

        [HttpGet("{projectId}/milestones")]
        public async Task<IActionResult> GetMilestones(int projectId)
        {
            var milestones = await _db.Milestones
                .AsNoTracking()
                .Where(m => m.ProjectId == projectId)
                .OrderBy(m => m.SortOrder).ThenBy(m => m.Id)
                .Select(m => new
                {
                    m.Id,
                    m.Title,
                    m.Description,
                    m.Status,
                    m.Progress,
                    m.SortOrder,
                    m.Date
                })
                .ToListAsync();

            return Ok(milestones);
        }

        [Authorize(Roles = "Innovator")]
        [HttpPost("{projectId}/milestones")]
        public async Task<IActionResult> CreateMilestone(int projectId, [FromBody] MilestoneInput input)
        {
            var userId = GetCurrentUserId();
            if (!await OwnsAsync(projectId, userId)) return Forbid();
            if (string.IsNullOrWhiteSpace(input.Title))
                return BadRequest(new { message = "Title is required." });

            var milestone = new Milestone
            {
                ProjectId = projectId,
                Title = input.Title.Trim(),
                Description = input.Description?.Trim(),
                Status = NormalizeStatus(input.Status),
                Progress = Math.Clamp(input.Progress, 0, 100),
                SortOrder = input.SortOrder,
                Date = input.Date
            };
            _db.Milestones.Add(milestone);
            await _db.SaveChangesAsync();

            return Ok(new { message = "Milestone added.", milestoneId = milestone.Id });
        }

        [Authorize(Roles = "Innovator")]
        [HttpPut("milestones/{milestoneId}")]
        public async Task<IActionResult> EditMilestone(int milestoneId, [FromBody] MilestoneInput input)
        {
            var userId = GetCurrentUserId();
            var milestone = await _db.Milestones.Include(m => m.Project)
                .FirstOrDefaultAsync(m => m.Id == milestoneId);
            if (milestone == null) return NotFound(new { message = "Milestone not found." });
            if (milestone.Project.OwnerId != userId) return Forbid();

            if (!string.IsNullOrWhiteSpace(input.Title)) milestone.Title = input.Title.Trim();
            milestone.Description = input.Description?.Trim();
            milestone.Status = NormalizeStatus(input.Status);
            milestone.Progress = Math.Clamp(input.Progress, 0, 100);
            milestone.SortOrder = input.SortOrder;
            milestone.Date = input.Date;
            await _db.SaveChangesAsync();

            return Ok(new { message = "Milestone saved." });
        }

        [Authorize(Roles = "Innovator")]
        [HttpDelete("milestones/{milestoneId}")]
        public async Task<IActionResult> DeleteMilestone(int milestoneId)
        {
            var userId = GetCurrentUserId();
            var milestone = await _db.Milestones.Include(m => m.Project)
                .FirstOrDefaultAsync(m => m.Id == milestoneId);
            if (milestone == null) return NotFound(new { message = "Milestone not found." });
            if (milestone.Project.OwnerId != userId) return Forbid();

            _db.Milestones.Remove(milestone);
            await _db.SaveChangesAsync();
            return Ok(new { message = "Milestone deleted." });
        }

        // ============ TEAM ============

        [HttpGet("{projectId}/team")]
        public async Task<IActionResult> GetTeam(int projectId)
        {
            int? viewerId = int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var vid) ? vid : (int?)null;
            var isOwner = viewerId.HasValue && await OwnsAsync(projectId, viewerId.Value);

            var team = await _db.TeamMembers.AsNoTracking()
                .Where(t => t.ProjectId == projectId)
                .OrderBy(t => t.SortOrder).ThenBy(t => t.Id)
                .Select(t => new
                {
                    t.Id,
                    t.Name,
                    t.Role,
                    t.Bio,
                    t.LinkedinUrl,
                    // Never exposed publicly — only the owner sees it, to edit it.
                    Email = isOwner ? t.Email : null,
                    t.SortOrder,
                    HasAvatar = t.AvatarData != null
                })
                .ToListAsync();
            return Ok(team);
        }

        [Authorize(Roles = "Innovator")]
        [HttpPost("{projectId}/team")]
        public async Task<IActionResult> AddTeamMember(int projectId, [FromBody] TeamMemberInput input)
        {
            var userId = GetCurrentUserId();
            if (!await OwnsAsync(projectId, userId)) return Forbid();
            if (string.IsNullOrWhiteSpace(input.Name))
                return BadRequest(new { message = "Name is required." });

            var member = new TeamMember
            {
                ProjectId = projectId,
                Name = input.Name.Trim(),
                Role = input.Role?.Trim(),
                Bio = input.Bio?.Trim(),
                LinkedinUrl = input.LinkedinUrl?.Trim(),
                Email = string.IsNullOrWhiteSpace(input.Email) ? null : input.Email.Trim().ToLowerInvariant(),
                SortOrder = input.SortOrder
            };
            _db.TeamMembers.Add(member);
            await _db.SaveChangesAsync();
            return Ok(new { message = "Member added.", memberId = member.Id });
        }

        [Authorize(Roles = "Innovator")]
        [HttpPut("team/{memberId}")]
        public async Task<IActionResult> EditTeamMember(int memberId, [FromBody] TeamMemberInput input)
        {
            var userId = GetCurrentUserId();
            var member = await _db.TeamMembers.Include(m => m.Project).FirstOrDefaultAsync(m => m.Id == memberId);
            if (member == null) return NotFound(new { message = "Member not found." });
            if (member.Project.OwnerId != userId) return Forbid();

            if (!string.IsNullOrWhiteSpace(input.Name)) member.Name = input.Name.Trim();
            member.Role = input.Role?.Trim();
            member.Bio = input.Bio?.Trim();
            member.LinkedinUrl = input.LinkedinUrl?.Trim();
            member.Email = string.IsNullOrWhiteSpace(input.Email) ? null : input.Email.Trim().ToLowerInvariant();
            member.SortOrder = input.SortOrder;
            await _db.SaveChangesAsync();
            return Ok(new { message = "Member saved." });
        }

        [Authorize(Roles = "Innovator")]
        [HttpDelete("team/{memberId}")]
        public async Task<IActionResult> DeleteTeamMember(int memberId)
        {
            var userId = GetCurrentUserId();
            var member = await _db.TeamMembers.Include(m => m.Project).FirstOrDefaultAsync(m => m.Id == memberId);
            if (member == null) return NotFound(new { message = "Member not found." });
            if (member.Project.OwnerId != userId) return Forbid();

            _db.TeamMembers.Remove(member);
            await _db.SaveChangesAsync();
            return Ok(new { message = "Member removed." });
        }

        [Authorize(Roles = "Innovator")]
        [HttpPost("team/{memberId}/avatar")]
        public async Task<IActionResult> UploadTeamAvatar(int memberId, [FromForm] IFormFile file)
        {
            if (file == null || file.Length == 0) return BadRequest(new { message = "No file provided." });
            var userId = GetCurrentUserId();
            var member = await _db.TeamMembers.Include(m => m.Project).FirstOrDefaultAsync(m => m.Id == memberId);
            if (member == null) return NotFound(new { message = "Member not found." });
            if (member.Project.OwnerId != userId) return Forbid();

            var result = await _fileUpload.ReadValidatedImageAsync(file);
            if (result.Status != ServiceResultStatus.Ok || result.Value is null)
                return BadRequest(new { message = result.Message ?? "Invalid image." });

            member.AvatarData = result.Value;
            member.AvatarContentType = file.ContentType;
            await _db.SaveChangesAsync();
            return Ok(new { message = "Avatar updated." });
        }

        [HttpGet("team/{memberId}/avatar")]
        public async Task<IActionResult> GetTeamAvatar(int memberId)
        {
            var member = await _db.TeamMembers.AsNoTracking().FirstOrDefaultAsync(m => m.Id == memberId);
            if (member?.AvatarData == null || member.AvatarData.Length == 0) return NotFound();
            return File(member.AvatarData, member.AvatarContentType ?? "application/octet-stream");
        }

        // ============ DOCUMENTS ============

        private static readonly HashSet<string> AllowedDocTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        };

        private async Task<bool> CanSeeBackerDocsAsync(int projectId, int userId)
        {
            if (await _db.Projects.AnyAsync(p => p.Id == projectId && p.OwnerId == userId)) return true;
            return await _db.Investments.AnyAsync(i =>
                i.ProjectId == projectId && i.InvestorId == userId && i.Status == "Approved");
        }

        [Authorize]
        [HttpGet("{projectId}/documents")]
        public async Task<IActionResult> GetDocuments(int projectId)
        {
            var userId = GetCurrentUserId();
            var canSeeBackers = await CanSeeBackerDocsAsync(projectId, userId);
            var isOwner = await OwnsAsync(projectId, userId);
            var docs = await _db.ProjectDocuments.AsNoTracking()
                .Where(d => d.ProjectId == projectId && (d.Visibility == "Public" || canSeeBackers))
                .OrderByDescending(d => d.UploadedAt)
                .Select(d => new
                {
                    d.Id,
                    d.Title,
                    d.FileName,
                    d.ContentType,
                    d.SizeBytes,
                    d.Visibility,
                    d.UploadedAt,
                    // Engagement signal for the data room — only meaningful (and
                    // only shown) to the owner.
                    DownloadCount = isOwner
                        ? _db.DocumentDownloadLogs.Count(l => l.ProjectDocumentId == d.Id)
                        : (int?)null
                })
                .ToListAsync();
            return Ok(docs);
        }

        [Authorize(Roles = "Innovator")]
        [HttpPost("{projectId}/documents")]
        public async Task<IActionResult> UploadDocument(
            int projectId,
            [FromForm] IFormFile file,
            [FromForm] string title,
            [FromForm] string? visibility)
        {
            if (file == null || file.Length == 0) return BadRequest(new { message = "No file provided." });
            var userId = GetCurrentUserId();
            if (!await OwnsAsync(projectId, userId)) return Forbid();
            if (string.IsNullOrWhiteSpace(title)) return BadRequest(new { message = "Title is required." });
            if (!AllowedDocTypes.Contains(file.ContentType))
                return BadRequest(new { message = "Unsupported file type." });
            if (file.Length > 15 * 1024 * 1024)
                return BadRequest(new { message = "File exceeds the 15 MB limit." });

            using var ms = new MemoryStream();
            await file.CopyToAsync(ms);

            var doc = new ProjectDocument
            {
                ProjectId = projectId,
                Title = title.Trim(),
                FileName = Path.GetFileName(file.FileName),
                ContentType = file.ContentType,
                FileData = ms.ToArray(),
                SizeBytes = file.Length,
                Visibility = visibility == "Backers" ? "Backers" : "Public",
                UploadedAt = DateTime.UtcNow
            };
            _db.ProjectDocuments.Add(doc);
            await _db.SaveChangesAsync();
            return Ok(new { message = "Document uploaded.", documentId = doc.Id });
        }

        [Authorize(Roles = "Innovator")]
        [HttpDelete("documents/{documentId}")]
        public async Task<IActionResult> DeleteDocument(int documentId)
        {
            var userId = GetCurrentUserId();
            var doc = await _db.ProjectDocuments.Include(d => d.Project).FirstOrDefaultAsync(d => d.Id == documentId);
            if (doc == null) return NotFound(new { message = "Document not found." });
            if (doc.Project.OwnerId != userId) return Forbid();

            // Any document request this file was answering reopens rather than vanishing
            // with it — the investor still needs the document, and the request is the
            // record of that. Done explicitly because the FK is NoAction: SQL Server
            // rejects a SET NULL here, since both tables already cascade from Projects.
            var fulfilled = await _db.DocumentRequests
                .Where(r => r.FulfilledByDocumentId == documentId)
                .ToListAsync();

            foreach (var r in fulfilled)
            {
                r.FulfilledByDocumentId = null;
                r.Status = "Open";
                r.ResolvedAtUtc = null;
            }

            _db.ProjectDocuments.Remove(doc);
            await _db.SaveChangesAsync();
            return Ok(new
            {
                message = "Document deleted.",
                reopenedRequests = fulfilled.Count
            });
        }

        [Authorize]
        [HttpGet("documents/{documentId}/download")]
        public async Task<IActionResult> DownloadDocument(int documentId)
        {
            var userId = GetCurrentUserId();
            var doc = await _db.ProjectDocuments.AsNoTracking().FirstOrDefaultAsync(d => d.Id == documentId);
            if (doc == null || doc.FileData.Length == 0) return NotFound();
            if (doc.Visibility == "Backers" && !await CanSeeBackerDocsAsync(doc.ProjectId, userId))
                return Forbid();

            _db.DocumentDownloadLogs.Add(new DocumentDownloadLog
            {
                ProjectDocumentId = documentId,
                UserId = userId,
                DownloadedAtUtc = DateTime.UtcNow
            });
            await _db.SaveChangesAsync();

            return File(doc.FileData, doc.ContentType, doc.FileName);
        }

        private static string NormalizeStatus(string? status) =>
            status switch
            {
                "InProgress" => "InProgress",
                "Done" => "Done",
                _ => "Planned"
            };
    }

    public class UpdateInput
    {
        public string Title { get; set; } = string.Empty;
        public string Body { get; set; } = string.Empty;
    }

    public class MilestoneInput
    {
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? Status { get; set; }
        public int Progress { get; set; }
        public int SortOrder { get; set; }
        public DateTime? Date { get; set; }
    }

    public class TeamMemberInput
    {
        public string Name { get; set; } = string.Empty;
        public string? Role { get; set; }
        public string? Bio { get; set; }
        public string? LinkedinUrl { get; set; }
        public string? Email { get; set; }
        public int SortOrder { get; set; }
    }
}
