using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using MyAppApi.Data.Models;
using MyAppApi.Data.Models.DTOs;
using MyAppApi.Data;
using MyAppApi.Data.Models.Hubs;
using MyAppApi.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace MyAppApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class InvestorController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IHubContext<ChatHub> _hub;

        public InvestorController(AppDbContext context, IHubContext<ChatHub> hub)
        {
            _context = context;
            _hub = hub;
        }

        private int GetCurrentUserId()
        {
            return int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        }

        [Authorize(Roles = "Investor")]
        [HttpGet("{investorId}/supported-projects")]
        public async Task<IActionResult> GetSupportedProjects(int investorId)
        {
            var currentUserId = GetCurrentUserId();
            if (investorId != currentUserId)
            {
                return Forbid();
            }

            var projects = await _context.Projects
                .AsNoTracking()
                .Where(p => p.Investments.Any(i => i.InvestorId == currentUserId))
                .OrderByDescending(p => p.CreatedDate)
                .Select(p => new MyAppApi.Data.Models.DTOs.ProjectsDto
                {
                    Id = p.Id,
                    Name = p.Name,
                    Description = p.Description,
                    VideoUrl = p.VideoUrl,
                    Topic = p.Topic,
                    Category = p.Category,
                    Industry = p.Industry,
                    Location = p.Location,
                    InvestmentNeeded = p.InvestmentNeeded,
                    // Money is filled by the shared loader below.
                    OwnerId = p.OwnerId,
                    OwnerName = p.Owner.UserName,
                    TotalInteractions = p.TotalInteractions,
                    CommentsCount = p.Comments.Count,
                    ImageIds = p.Images.Select(im => im.Id).ToList()
                })
                .ToListAsync();

            await ProjectCardProjection.ApplyFundingAsync(_context, projects);

            return Ok(projects);
        }
        [Authorize(Roles = "Investor")]
        [HttpPost("{projectId}/support")]
        public async Task<IActionResult> SupportProject(int projectId, [FromBody] SupportProjectDto supportDto)
        {
            var currentUserId = GetCurrentUserId();
            var project = await _context.Projects.FindAsync(projectId);
            if (project == null)
            {
                return NotFound("Project not found.");
            }

            if (supportDto.Amount <= 0)
            {
                return BadRequest(new { Message = "Support amount must be greater than zero." });
            }

            if (project.OwnerId == currentUserId)
            {
                return BadRequest(new { Message = "Project owner cannot support their own project." });
            }

            // A paused or closed round takes no new requests.
            if (project.LifecycleStatus == "Closed" || project.LifecycleStatus == "Paused")
            {
                return BadRequest(new { Message = "This venture is not accepting new support requests." });
            }

            // Nor does a listing that hasn't passed review.
            if (project.ModerationStatus != "Approved")
            {
                return BadRequest(new { Message = "This venture is not open for support yet." });
            }

            // Capacity is measured against COMMITMENTS, not settled money. A founder who
            // has already accepted the whole goal should stop taking requests even before
            // anyone pays — otherwise the round is oversubscribed the moment the payments
            // land and somebody who was told yes has to be told no. Requests that lapse
            // release their share when the sweeper expires them.
            var committed = await _context.Investments
                .Where(i => i.ProjectId == projectId && i.Status == "Approved")
                .SumAsync(i => (decimal?)i.Amount) ?? 0m;
            var remaining = FundingMath.RemainingCapacity(project.InvestmentNeeded, committed);
            if (supportDto.Amount > remaining)
            {
                return BadRequest(new { Message = $"Amount exceeds the remaining funding need ({remaining:N0} USD)." });
            }

            var investor = await _context.Investors.FindAsync(currentUserId);
            if (investor == null)
            {
                return NotFound("Investor not found.");
            }

            // One live support per project: block if a pending or approved one already exists.
            var alreadySupports = await _context.Investments.AnyAsync(i =>
                i.ProjectId == projectId &&
                i.InvestorId == currentUserId &&
                (i.Status == "Pending" || i.Status == "Approved"));
            if (alreadySupports)
            {
                return BadRequest(new { Message = "You already have a support request for this project." });
            }

            var investment = new Investment
            {
                Amount = supportDto.Amount,
                Date = DateTime.UtcNow,
                InvestorId = currentUserId,
                ProjectId = projectId,
                Status = "Pending",
                Stage = PipelineStages.New,
                StageUpdatedAt = DateTime.UtcNow,
                // Method AND value. Storing only the method left the founder with the
                // word "Email" and no address to send anything to.
                ContactInfo = string.IsNullOrWhiteSpace(supportDto.ContactValue)
                    ? supportDto.ContactMethod
                    : $"{supportDto.ContactMethod}: {supportDto.ContactValue.Trim()}"
            };

            _context.Investments.Add(investment);
            await _context.SaveChangesAsync();

            var notificationForOwner = new Notification
            {
                Content = $"Investor {investor.UserName} wants to back your project '{project.Name}' with {supportDto.Amount} USD — approve or decline. Contact: {supportDto.ContactMethod}",
                NotificationType = "ProjectSupported",
                ProjectId = project.Id,
                InvestmentId = investment.Id,
                ActorUserId = currentUserId,
                DateCreated = DateTime.UtcNow,
                IsRead = false,
                UserId = project.OwnerId
            };

            _context.Notifications.Add(notificationForOwner);

            var notificationForInvestor = new Notification
            {
                Content = $"Your support request for '{project.Name}' ({supportDto.Amount} USD) is awaiting the founder's approval.",
                NotificationType = "ProjectSupportSubmitted",
                ProjectId = project.Id,
                InvestmentId = investment.Id,
                ActorUserId = currentUserId,
                DateCreated = DateTime.UtcNow,
                IsRead = false,
                UserId = currentUserId
            };

            _context.Notifications.Add(notificationForInvestor);

            await _context.SaveChangesAsync();
            await _hub.PushAsync(notificationForOwner);
            await _hub.PushAsync(notificationForInvestor);

            return Ok(new { Message = "Support request submitted for approval.", ContactMethod = supportDto.ContactMethod });
        }

        [Authorize(Roles = "Innovator")]
        [HttpPost("{investmentId}/reject-support")]
        public async Task<IActionResult> RejectSupport(int investmentId)
        {
            var currentUserId = GetCurrentUserId();
            var investment = await _context.Investments.Include(i => i.Project).Include(i => i.Investor).FirstOrDefaultAsync(i => i.Id == investmentId);

            if (investment == null)
            {
                return NotFound("Investment not found.");
            }

            if (investment.Project.OwnerId != currentUserId)
            {
                return Forbid();
            }

            if (!investment.InvestorId.HasValue)
            {
                return BadRequest(new { Message = "Investment has no investor to notify." });
            }

            var isFunded = await _context.PaymentTransactions
                .AnyAsync(t => t.InvestmentId == investment.Id && t.Status == PaymentStatus.Succeeded);
            if (isFunded)
            {
                return BadRequest(new { Message = "This investment has been funded and cannot be rejected. Request a refund instead." });
            }

            // Decline without deleting — see NotificationController.RejectSupport.
            investment.Status = PipelineStages.Declined;
            investment.Stage = PipelineStages.Declined;
            investment.StageUpdatedAt = DateTime.UtcNow;
            await CloseFundingForAsync(investment.Id, "The relationship was declined.");
            await _context.SaveChangesAsync();

            var rejectionNotification = new Notification
            {
                Content = $"Your support for the project '{investment.Project.Name}' in the amount of {investment.Amount} USD has been rejected.",
                NotificationType = "ProjectSupportRejected",
                ProjectId = investment.ProjectId,
                ActorUserId = currentUserId,
                DateCreated = DateTime.UtcNow,
                IsRead = false,
                UserId = investment.InvestorId.Value
            };

            _context.Notifications.Add(rejectionNotification);
            await _context.SaveChangesAsync();
            await _hub.PushAsync(rejectionNotification);

            return Ok(new { Message = "Support has been rejected and the investor has been notified." });
        }
        [Authorize(Roles = "Investor")]
        [HttpGet("{investorId}/investment-summary")]
        public async Task<IActionResult> GetInvestmentSummary(int investorId)
        {
            var currentUserId = GetCurrentUserId();
            if (investorId != currentUserId)
            {
                return Forbid();
            }

            // Committed capital = approved support only (pending doesn't count yet).
            var investments = await _context.Investments
                .Where(i => i.InvestorId == currentUserId && i.Status == "Approved")
                .Select(i => new { i.ProjectId, i.Amount })
                .ToListAsync();

            // Still-pending requests, kept separate so the UI never implies a
            // return on capital that hasn't moved anywhere.
            var pendingAmount = await _context.Investments
                .Where(i => i.InvestorId == currentUserId && i.Status == "Pending")
                .SumAsync(i => (decimal?)i.Amount) ?? 0m;

            // Settled money, which is a different thing from committed money and now has
            // its own figure rather than borrowing the commitment total's name.
            var settled = await _context.PaymentTransactions
                .Where(t => t.InvestorId == currentUserId && t.Status == PaymentStatus.Succeeded)
                .Select(t => new { t.ProjectId, t.Amount })
                .ToListAsync();

            var paymentDue = await _context.FundingRequests
                .Where(f => f.InvestorId == currentUserId && f.Status == FundingRequestStatus.Open)
                .SumAsync(f => (decimal?)f.Amount) ?? 0m;

            return Ok(new
            {
                TotalSupport = investments.Sum(i => i.Amount),
                PendingAmount = pendingAmount,
                PaymentDueAmount = paymentDue,
                FundedAmount = settled.Sum(t => t.Amount),
                FundedProjectsCount = settled.Select(t => t.ProjectId).Distinct().Count(),
                SupportedProjectsCount = investments.Select(i => i.ProjectId).Distinct().Count()
            });
        }

        // The current investor's standing with a single venture — drives the details
        // panel, and now carries the money state as well as the relationship one, so the
        // panel can offer "Complete investment" at the moment it becomes true.
        [Authorize(Roles = "Investor")]
        [HttpGet("{projectId}/my-support")]
        public async Task<IActionResult> GetMySupport(int projectId)
        {
            var currentUserId = GetCurrentUserId();
            var inv = await _context.Investments
                .AsNoTracking()
                .Where(i => i.ProjectId == projectId && i.InvestorId == currentUserId
                            && (i.Status == "Pending" || i.Status == "Approved"))
                .OrderByDescending(i => i.Date)
                .Select(i => new { i.Id, i.Status, i.Amount })
                .FirstOrDefaultAsync();

            if (inv == null)
            {
                return Ok(new { Status = "none", Amount = 0m, FundingState = "None" });
            }

            var openRequest = await _context.FundingRequests
                .AsNoTracking()
                .Where(f => f.InvestmentId == inv.Id && f.Status == FundingRequestStatus.Open)
                .Select(f => new { f.Id, f.Amount, f.ExpiresAtUtc })
                .FirstOrDefaultAsync();

            var payments = await _context.PaymentTransactions
                .AsNoTracking()
                .Where(t => t.InvestmentId == inv.Id)
                .Select(t => new { t.Status, t.Amount })
                .ToListAsync();

            var funded = payments.FirstOrDefault(t => t.Status == PaymentStatus.Succeeded);

            return Ok(new
            {
                InvestmentId = inv.Id,
                Status = inv.Status,
                Amount = inv.Amount,
                FundingState = FundingMath.StateOf(
                    inv.Status,
                    funded != null,
                    payments.Any(t => t.Status == PaymentStatus.Refunded),
                    openRequest != null,
                    payments.Any(t => t.Status == PaymentStatus.Processing)),
                FundingRequestId = openRequest?.Id,
                AgreedAmount = openRequest?.Amount,
                FundingRequestExpiresAt = openRequest?.ExpiresAtUtc,
                FundedAmount = funded?.Amount,
            });
        }

        [Authorize(Roles = "Investor")]
        [HttpGet("{investorId}/activities")]
        public async Task<IActionResult> GetInvestmentActivities(int investorId)
        {
            var currentUserId = GetCurrentUserId();
            if (investorId != currentUserId)
            {
                return Forbid();
            }

            var activities = await _context.Investments
                .Where(i => i.InvestorId == currentUserId)
                .Include(i => i.Project)
                .OrderByDescending(i => i.Date)
                .ToListAsync();

            if (activities == null || activities.Count == 0)
            {
                return Ok(new
                {
                    Message = "No investment activities found for this investor.",
                    Activities = new object[] { } 
                });
            }

            return Ok(new
            {
                Activities = activities.Select(a => new
                {
                    Date = a.Date,
                    ProjectName = a.Project.Name,
                    Amount = a.Amount,
                    Type = "Investment",
                    Status = a.Status
                })
            });
        }

        // ===== Pipeline =====

        // Founder moves a relationship along the pipeline (or declines it).
        // Only the owner of the project may do this.
        [Authorize(Roles = "Innovator")]
        [HttpPatch("investments/{investmentId}/stage")]
        public async Task<IActionResult> UpdateStage(int investmentId, [FromBody] UpdateStageDto dto)
        {
            var currentUserId = GetCurrentUserId();
            var investment = await _context.Investments
                .Include(i => i.Project)
                .FirstOrDefaultAsync(i => i.Id == investmentId);

            if (investment == null) return NotFound(new { Message = "Request not found." });
            if (investment.Project.OwnerId != currentUserId) return Forbid();
            if (!PipelineStages.IsValid(dto.Stage))
                return BadRequest(new { Message = "Unknown pipeline stage." });

            // Money that has arrived cannot be declined away. Reversing a funded
            // investment is a refund, which is an admin action with an audit trail —
            // not a dropdown on a pipeline board.
            if (dto.Stage == PipelineStages.Declined)
            {
                var isFunded = await _context.PaymentTransactions
                    .AnyAsync(t => t.InvestmentId == investment.Id && t.Status == PaymentStatus.Succeeded);
                if (isFunded)
                    return BadRequest(new { Message = "This investment has been funded and cannot be declined. Request a refund instead." });
            }

            investment.Stage = dto.Stage;
            investment.StageUpdatedAt = DateTime.UtcNow;

            // Keep the funding gate consistent with the pipeline.
            if (dto.Stage == PipelineStages.Declined)
            {
                investment.Status = PipelineStages.Declined;
                investment.DeclinedReason = dto.Reason;

                // An open ask dies with the relationship, along with any live checkout.
                await CloseFundingForAsync(investment.Id, "The relationship was declined.");
            }
            else if (PipelineStages.CountsTowardFunding(dto.Stage))
            {
                investment.Status = "Approved";
            }

            await _context.SaveChangesAsync();
            return Ok(new { Message = "Stage updated.", Stage = investment.Stage });
        }

        // Private working note — the founder's own, never shown to the investor.
        [Authorize(Roles = "Innovator")]
        [HttpPut("investments/{investmentId}/founder-note")]
        public async Task<IActionResult> SetFounderNote(int investmentId, [FromBody] NoteDto dto)
        {
            var currentUserId = GetCurrentUserId();
            var investment = await _context.Investments
                .Include(i => i.Project)
                .FirstOrDefaultAsync(i => i.Id == investmentId);

            if (investment == null) return NotFound(new { Message = "Request not found." });
            if (investment.Project.OwnerId != currentUserId) return Forbid();

            investment.FounderNote = string.IsNullOrWhiteSpace(dto.Note) ? null : dto.Note.Trim();
            await _context.SaveChangesAsync();
            return Ok(new { Message = "Note saved." });
        }

        // The investor's own private note on a request they made.
        [Authorize(Roles = "Investor")]
        [HttpPut("investments/{investmentId}/investor-note")]
        public async Task<IActionResult> SetInvestorNote(int investmentId, [FromBody] NoteDto dto)
        {
            var currentUserId = GetCurrentUserId();
            var investment = await _context.Investments.FirstOrDefaultAsync(i => i.Id == investmentId);

            if (investment == null) return NotFound(new { Message = "Request not found." });
            if (investment.InvestorId != currentUserId) return Forbid();

            investment.InvestorNote = string.IsNullOrWhiteSpace(dto.Note) ? null : dto.Note.Trim();
            await _context.SaveChangesAsync();
            return Ok(new { Message = "Note saved." });
        }

        // Durable, revisitable list of who has backed a project — pending AND
        // approved — with how they asked to be reached. Closes the gap where an
        // approved support request had no way for the founder to follow up once
        // the triggering notification was dismissed.
        [Authorize(Roles = "Innovator")]
        [HttpGet("{projectId}/backers")]
        public async Task<IActionResult> GetBackers(int projectId)
        {
            var currentUserId = GetCurrentUserId();
            var project = await _context.Projects.FindAsync(projectId);
            if (project == null)
            {
                return NotFound(new { Message = "Project not found." });
            }
            if (project.OwnerId != currentUserId)
            {
                return Forbid();
            }

            var backers = await _context.Investments
                .AsNoTracking()
                .Where(i => i.ProjectId == projectId && (i.Status == "Pending" || i.Status == "Approved"))
                .OrderByDescending(i => i.Date)
                .Select(i => new
                {
                    i.Id,
                    InvestorId = i.InvestorId ?? 0,
                    InvestorName = i.Investor != null ? i.Investor.UserName : "Unknown",
                    i.Amount,
                    i.Status,
                    i.ContactInfo,
                    i.Date,
                    // Where each backer stands on the money, so the founder's list of who
                    // is behind the venture distinguishes intent from cash.
                    FundedAmount = i.FundingRequests
                        .SelectMany(f => f.Transactions)
                        .Where(t => t.Status == PaymentStatus.Succeeded)
                        .Sum(t => (decimal?)t.Amount) ?? 0m,
                    PaymentDueAmount = i.FundingRequests
                        .Where(f => f.Status == FundingRequestStatus.Open)
                        .Sum(f => (decimal?)f.Amount) ?? 0m,
                })
                .ToListAsync();

            return Ok(backers);
        }

        /// <summary>
        /// Closes any open ask and live checkout for a relationship that has just stopped
        /// being live. Used when a deal is declined and when a round closes — both leave
        /// a payable request pointing at something nobody is asking for any more.
        /// </summary>
        private async Task CloseFundingForAsync(int investmentId, string reason)
        {
            var now = DateTime.UtcNow;

            var open = await _context.FundingRequests
                .Where(f => f.InvestmentId == investmentId && f.Status == FundingRequestStatus.Open)
                .ToListAsync();

            foreach (var request in open)
            {
                request.Status = FundingRequestStatus.Cancelled;
                request.ClosedAtUtc = now;
                request.ClosedReason = reason;
            }

            var live = await _context.PaymentTransactions
                .Where(t => t.InvestmentId == investmentId &&
                            (t.Status == PaymentStatus.Initiated || t.Status == PaymentStatus.Processing))
                .ToListAsync();

            foreach (var attempt in live)
            {
                attempt.Status = PaymentStatus.Cancelled;
                attempt.CancelReason = PaymentCancelReason.RoundClosed;
                attempt.CancelledAtUtc = now;
                attempt.CheckoutUrl = null;
            }
        }
    }

    // SupportProjectDto lives in Data/Models/DTOs. A second copy used to be declared
    // here, and because it sat in the Controllers namespace it silently shadowed the
    // real one — so fields added to the canonical DTO never reached this endpoint.
    // Its InvestorId/ProjectId were never read (both come from the token and route).

    public class UpdateStageDto
    {
        public string Stage { get; set; } = string.Empty;
        public string? Reason { get; set; }
    }

    public class NoteDto
    {
        public string? Note { get; set; }
    }
}
