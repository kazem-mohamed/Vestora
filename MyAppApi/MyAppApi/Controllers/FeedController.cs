using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyAppApi.Data;
using MyAppApi.Data.Models.DTOs;
using System.Linq;

namespace MyAppApi.Controllers
{
    // F10 global activity feed, admin-only. Merges recent events from
    // every source in memory (privacy-safe: investment amounts are never exposed).
    [Route("api/feed")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class FeedController : ControllerBase
    {
        private const int PerSource = 60;
        private readonly AppDbContext _context;

        public FeedController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> Get(
            [FromQuery] string? type,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 50);

            bool want(string t) => string.IsNullOrWhiteSpace(type) || type == t;
            var items = new List<FeedItemDto>();

            if (want("new_project"))
            {
                items.AddRange(await _context.Projects
                    .AsNoTracking()
                    .OrderByDescending(p => p.CreatedDate)
                    .Take(PerSource)
                    .Select(p => new FeedItemDto
                    {
                        Type = "new_project",
                        Date = p.CreatedDate,
                        ProjectId = p.Id,
                        ProjectName = p.Name,
                        ActorId = p.OwnerId,
                        ActorName = p.Owner.UserName
                    })
                    .ToListAsync());
            }

            if (want("update"))
            {
                items.AddRange(await _context.ProjectUpdates
                    .AsNoTracking()
                    .OrderByDescending(u => u.CreatedDate)
                    .Take(PerSource)
                    .Select(u => new FeedItemDto
                    {
                        Type = "update",
                        Date = u.CreatedDate,
                        ProjectId = u.ProjectId,
                        ProjectName = u.Project.Name,
                        ActorId = u.Project.OwnerId,
                        ActorName = u.Project.Owner.UserName,
                        Text = u.Title
                    })
                    .ToListAsync());
            }

            if (want("investment"))
            {
                items.AddRange(await _context.Investments
                    .AsNoTracking()
                    .Where(i => i.Status == "Approved" && i.InvestorId != null)
                    .OrderByDescending(i => i.Date)
                    .Take(PerSource)
                    .Select(i => new FeedItemDto
                    {
                        Type = "investment",
                        Date = i.Date,
                        ProjectId = i.ProjectId,
                        ProjectName = i.Project.Name,
                        ActorId = i.InvestorId,
                        ActorName = i.Investor!.UserName
                    })
                    .ToListAsync());
            }

            if (want("new_user"))
            {
                items.AddRange(await _context.Users
                    .AsNoTracking()
                    .Where(u => u.CreatedAtUtc != null)
                    .OrderByDescending(u => u.CreatedAtUtc)
                    .Take(PerSource)
                    .Select(u => new FeedItemDto
                    {
                        Type = "new_user",
                        Date = u.CreatedAtUtc!.Value,
                        ActorId = u.Id,
                        ActorName = u.UserName
                    })
                    .ToListAsync());
            }

            if (want("milestone"))
            {
                items.AddRange(await _context.Milestones
                    .AsNoTracking()
                    .Where(m => m.Status == "Done" && m.Date != null)
                    .OrderByDescending(m => m.Date)
                    .Take(PerSource)
                    .Select(m => new FeedItemDto
                    {
                        Type = "milestone",
                        Date = m.Date!.Value,
                        ProjectId = m.ProjectId,
                        ProjectName = m.Project.Name,
                        ActorId = m.Project.OwnerId,
                        ActorName = m.Project.Owner.UserName,
                        Text = m.Title
                    })
                    .ToListAsync());
            }

            var ordered = items.OrderByDescending(i => i.Date).ToList();
            var paged = ordered.Skip((page - 1) * pageSize).Take(pageSize).ToList();

            return Ok(new
            {
                Items = paged,
                Page = page,
                PageSize = pageSize,
                HasMore = page * pageSize < ordered.Count
            });
        }
    }
}
