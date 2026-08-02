using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using MyAppApi.Data;
using MyAppApi.Data.Models;
using MyAppApi.Data.Models.DTOs;
using MyAppApi.Data.Models.Hubs;
using MyAppApi.Services;
using System.Security.Claims;

namespace MyAppApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class NotificationController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<NotificationController> _logger;
        private readonly IHubContext<ChatHub> _hub;

        public NotificationController(AppDbContext context, ILogger<NotificationController> logger, IHubContext<ChatHub> hub)
        {
            _context = context;
            _logger = logger;
            _hub = hub;
        }

        private int GetCurrentUserId()
        {
            return int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        }

        // Get a page of notifications for a specific user (newest first).
        // pageSize defaults generously so the common case — the bell dropdown and
        // the full feed's initial load — needs no client change, but a user with
        // hundreds of notifications no longer forces one unbounded query.
        [HttpGet("{userId}/notifications")]
        public async Task<IActionResult> GetUserNotifications(
            int userId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            var currentUserId = GetCurrentUserId();
            if (userId != currentUserId)
            {
                return Forbid();
            }

            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 200);

            var query = _context.Notifications
                .Where(n => n.UserId == currentUserId)
                .OrderByDescending(n => n.DateCreated);

            var totalCount = await query.CountAsync();
            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(new PagedResult<Notification>
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            });
        }

        // Mark a notification as read
        // Mark a notification as read and return the investor's ID who supported the project
        [HttpPost("notifications/{notificationId}/mark-as-read")]
        public async Task<IActionResult> MarkAsRead(int notificationId)
        {
            var notification = await _context.Notifications
                .FirstOrDefaultAsync(n => n.NotificationId == notificationId);

            if (notification == null)
            {
                return NotFound(new { Message = "Notification not found." });
            }

            if (notification.UserId != GetCurrentUserId())
            {
                return Forbid();
            }

            notification.IsRead = true;

            // Update the notification as read
            _context.Entry(notification).State = EntityState.Modified;
            await _context.SaveChangesAsync();

            if (notification.InvestmentId.HasValue)
            {
                var investment = await _context.Investments
                    .AsNoTracking()
                    .FirstOrDefaultAsync(i => i.Id == notification.InvestmentId.Value);

                if (investment?.InvestorId != null)
                {
                    return Ok(new
                    {
                        Message = "Notification marked as read.",
                        InvestorId = investment.InvestorId
                    });
                }
            }

            return Ok(new { Message = "Notification marked as read, but no investor ID found." });
        }


        [HttpPost("{notificationId}/reject-support")]
        [Authorize(Roles = "Innovator")]
        public async Task<IActionResult> RejectSupport(int notificationId)
        {
            try
            {
                var currentUserId = GetCurrentUserId();
                // Fetch the notification for the innovator from the database
                var notification = await _context.Notifications
                    .Include(n => n.User)
                    .FirstOrDefaultAsync(n => n.NotificationId == notificationId);

                if (notification == null)
                {
                    return NotFound(new { Message = "Notification not found." });
                }

                if (notification.UserId != currentUserId)
                {
                    return Forbid();
                }

                if (!notification.InvestmentId.HasValue)
                {
                    return BadRequest(new { Message = "Notification is not linked to a support request." });
                }

                var investment = await _context.Investments
                    .Include(i => i.Project)
                    .Include(i => i.Investor)
                    .FirstOrDefaultAsync(i => i.Id == notification.InvestmentId.Value);

                if (investment == null)
                {
                    return NotFound(new { Message = "Investment not found." });
                }

                if (investment.Project.OwnerId != currentUserId)
                {
                    return Forbid();
                }

                // Find the notification for the investor (the support notification)
                var investorNotification = await _context.Notifications
                    .FirstOrDefaultAsync(n => n.UserId == investment.InvestorId && n.InvestmentId == investment.Id);

                // Money that arrived cannot be declined away; that is a refund.
                var isFunded = await _context.PaymentTransactions
                    .AnyAsync(t => t.InvestmentId == investment.Id && t.Status == PaymentStatus.Succeeded);
                if (isFunded)
                {
                    return BadRequest(new { Message = "This investment has been funded and cannot be rejected. Request a refund instead." });
                }

                // Any open ask dies with the relationship.
                var openRequests = await _context.FundingRequests
                    .Where(f => f.InvestmentId == investment.Id && f.Status == FundingRequestStatus.Open)
                    .ToListAsync();
                foreach (var request in openRequests)
                {
                    request.Status = FundingRequestStatus.Cancelled;
                    request.ClosedAtUtc = DateTime.UtcNow;
                    request.ClosedReason = "The relationship was declined.";
                }

                // Decline WITHOUT deleting: the relationship history has to survive.
                // "Declined" matches neither the "Approved" funding filters nor the
                // "Pending" duplicate-support guard, so the investor may re-apply.
                investment.Status = PipelineStages.Declined;
                investment.Stage = PipelineStages.Declined;
                investment.StageUpdatedAt = DateTime.UtcNow;

                // Clear the actionable notifications (they no longer need a decision).
                _context.Notifications.Remove(notification);
                if (investorNotification != null)
                {
                    _context.Notifications.Remove(investorNotification);
                }

                await _context.SaveChangesAsync();

                // Send a rejection notification to the investor
                var rejectionNotification = new Notification
                {
                    Content = $"Your support for the project '{investment.Project.Name}' in the amount of {investment.Amount} USD has been rejected.",
                    NotificationType = "ProjectSupportRejected",
                    ProjectId = investment.ProjectId,
                    ActorUserId = currentUserId,
                    DateCreated = DateTime.UtcNow,
                    IsRead = false,
                    UserId = investment.InvestorId ?? throw new InvalidOperationException("InvestorId should not be null.")
                };

                _context.Notifications.Add(rejectionNotification);
                await _context.SaveChangesAsync();
                await _hub.PushAsync(rejectionNotification);

                return Ok(new { Message = "Support has been rejected, and both the innovator and investor notifications have been deleted." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error while rejecting support notification {NotificationId}.", notificationId);
                return StatusCode(StatusCodes.Status500InternalServerError, new { Message = "An error occurred while processing the request." });
            }
        }

        // Approve a pending support request — the investment now counts toward funding.
        [HttpPost("{notificationId}/approve-support")]
        [Authorize(Roles = "Innovator")]
        public async Task<IActionResult> ApproveSupport(int notificationId)
        {
            var currentUserId = GetCurrentUserId();
            var notification = await _context.Notifications
                .FirstOrDefaultAsync(n => n.NotificationId == notificationId);

            if (notification == null)
            {
                return NotFound(new { Message = "Notification not found." });
            }

            if (notification.UserId != currentUserId)
            {
                return Forbid();
            }

            if (!notification.InvestmentId.HasValue)
            {
                return BadRequest(new { Message = "Notification is not linked to a support request." });
            }

            var investment = await _context.Investments
                .Include(i => i.Project)
                .FirstOrDefaultAsync(i => i.Id == notification.InvestmentId.Value);

            if (investment == null)
            {
                return NotFound(new { Message = "Investment not found." });
            }

            if (investment.Project.OwnerId != currentUserId)
            {
                return Forbid();
            }

            if (investment.Status == "Approved")
            {
                return BadRequest(new { Message = "This support is already approved." });
            }

            investment.Status = "Approved";
            investment.Stage = PipelineStages.Approved;
            investment.StageUpdatedAt = DateTime.UtcNow;
            notification.IsRead = true;

            Notification? approvalNotification = null;
            if (investment.InvestorId.HasValue)
            {
                approvalNotification = new Notification
                {
                    Content = $"Your support for '{investment.Project.Name}' ({investment.Amount} USD) has been approved.",
                    NotificationType = "ProjectSupportApproved",
                    ProjectId = investment.ProjectId,
                    InvestmentId = investment.Id,
                    ActorUserId = currentUserId,
                    DateCreated = DateTime.UtcNow,
                    IsRead = false,
                    UserId = investment.InvestorId.Value
                };
                _context.Notifications.Add(approvalNotification);
            }

            await _context.SaveChangesAsync();
            if (approvalNotification != null) await _hub.PushAsync(approvalNotification);
            return Ok(new { Message = "Support approved." });
        }




    }
}
