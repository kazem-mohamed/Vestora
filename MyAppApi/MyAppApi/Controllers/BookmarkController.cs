using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyAppApi.Data;
using MyAppApi.Data.Models;
using MyAppApi.Data.Models.DTOs;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace MyAppApi.Controllers
{
    [Route("api/bookmarks")]
    [ApiController]
    [Authorize]
    public class BookmarkController : ControllerBase
    {
        private readonly AppDbContext _context;

        public BookmarkController(AppDbContext context)
        {
            _context = context;
        }

        private int GetCurrentUserId() =>
            int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        // Save a project (idempotent).
        [HttpPost("{projectId}")]
        public async Task<IActionResult> Add(int projectId)
        {
            var userId = GetCurrentUserId();

            var project = await _context.Projects.FindAsync(projectId);
            if (project == null)
            {
                return NotFound(new { Message = "Project not found." });
            }

            var exists = await _context.Bookmarks
                .AnyAsync(b => b.UserId == userId && b.ProjectId == projectId);
            if (!exists)
            {
                _context.Bookmarks.Add(new Bookmark
                {
                    UserId = userId,
                    ProjectId = projectId,
                    CreatedDate = DateTime.UtcNow
                });
                await _context.SaveChangesAsync();
            }

            return Ok(new { Message = "Saved.", Saved = true });
        }

        // Remove a saved project (idempotent).
        [HttpDelete("{projectId}")]
        public async Task<IActionResult> Remove(int projectId)
        {
            var userId = GetCurrentUserId();
            var bookmark = await _context.Bookmarks
                .FirstOrDefaultAsync(b => b.UserId == userId && b.ProjectId == projectId);
            if (bookmark != null)
            {
                _context.Bookmarks.Remove(bookmark);
                await _context.SaveChangesAsync();
            }

            return Ok(new { Message = "Removed.", Saved = false });
        }

        // The current user's saved projects (newest first), shaped like the browse cards.
        [HttpGet]
        public async Task<IActionResult> List()
        {
            var userId = GetCurrentUserId();

            var projects = await _context.Bookmarks
                .AsNoTracking()
                .Where(b => b.UserId == userId)
                .OrderByDescending(b => b.CreatedDate)
                .Select(b => new ProjectsDto
                {
                    Id = b.Project.Id,
                    Name = b.Project.Name,
                    Description = b.Project.Description,
                    VideoUrl = b.Project.VideoUrl,
                    Topic = b.Project.Topic,
                    Category = b.Project.Category,
                    Location = b.Project.Location,
                    InvestmentNeeded = b.Project.InvestmentNeeded,
                    // Money is filled by the shared loader below.
                    OwnerId = b.Project.OwnerId,
                    OwnerName = b.Project.Owner.UserName,
                    TotalInteractions = b.Project.TotalInteractions,
                    CommentsCount = b.Project.Comments.Count,
                    ImageIds = b.Project.Images.Select(im => im.Id).ToList()
                })
                .ToListAsync();

            await ProjectCardProjection.ApplyFundingAsync(_context, projects);

            return Ok(projects);
        }

        // Just the saved project ids — lets the browse grid mark cards as saved cheaply.
        [HttpGet("ids")]
        public async Task<IActionResult> Ids()
        {
            var userId = GetCurrentUserId();
            var ids = await _context.Bookmarks
                .AsNoTracking()
                .Where(b => b.UserId == userId)
                .Select(b => b.ProjectId)
                .ToListAsync();
            return Ok(ids);
        }
    }
}
