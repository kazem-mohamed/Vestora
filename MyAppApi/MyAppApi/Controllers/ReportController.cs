using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyAppApi.Data;
using MyAppApi.Data.Models;
using MyAppApi.Data.Models.DTOs;
using System.Linq;
using System.Security.Claims;

namespace MyAppApi.Controllers
{
    [Route("api/reports")]
    [ApiController]
    [Authorize]
    public class ReportController : ControllerBase
    {
        private static readonly HashSet<string> AllowedReasons = new(StringComparer.OrdinalIgnoreCase)
        {
            "Spam", "Scam", "Copyright", "Offensive", "Duplicate", "Other"
        };

        private readonly AppDbContext _context;

        public ReportController(AppDbContext context)
        {
            _context = context;
        }

        private int GetCurrentUserId() =>
            int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        // Submit a report against a project. One open report per (user, project).
        [HttpPost]
        public async Task<IActionResult> Submit([FromBody] SubmitReportDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var reason = dto.Reason?.Trim() ?? string.Empty;
            if (!AllowedReasons.Contains(reason))
            {
                return BadRequest(new { message = "Invalid report reason." });
            }

            var me = GetCurrentUserId();

            var project = await _context.Projects
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == dto.ProjectId);
            if (project == null)
            {
                return NotFound(new { message = "Project not found." });
            }

            if (project.OwnerId == me)
            {
                return BadRequest(new { message = "You can't report your own venture." });
            }

            var alreadyOpen = await _context.Reports.AnyAsync(r =>
                r.ProjectId == dto.ProjectId && r.ReporterId == me && r.Status == "Open");
            if (alreadyOpen)
            {
                return BadRequest(new { message = "You've already reported this venture." });
            }

            _context.Reports.Add(new Report
            {
                ProjectId = dto.ProjectId,
                ReporterId = me,
                Reason = reason,
                Details = string.IsNullOrWhiteSpace(dto.Details) ? null : dto.Details.Trim(),
                Status = "Open",
                CreatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            return Ok(new { message = "Report submitted. Thank you." });
        }
    }
}
