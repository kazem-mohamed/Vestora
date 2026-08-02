using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using MyAppApi.Data;
using MyAppApi.Data.Models;
using MyAppApi.Data.Models.DTOs;
using MyAppApi.Data.Models.Hubs;
using MyAppApi.Services;
using System.Linq;
using System.Security.Claims;

namespace MyAppApi.Controllers
{
    [Route("api/follows")]
    [ApiController]
    [Authorize]
    public class FollowController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IHubContext<ChatHub> _hub;

        public FollowController(AppDbContext context, IHubContext<ChatHub> hub)
        {
            _context = context;
            _hub = hub;
        }

        private int GetCurrentUserId() =>
            int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        // Follow a user (idempotent). You can't follow yourself.
        [HttpPost("{userId}")]
        public async Task<IActionResult> Follow(int userId)
        {
            var me = GetCurrentUserId();
            if (userId == me)
            {
                return BadRequest(new { message = "You can't follow yourself." });
            }

            var target = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == userId);
            if (target == null)
            {
                return NotFound(new { message = "User not found." });
            }

            var exists = await _context.Follows
                .AnyAsync(f => f.FollowerId == me && f.FollowedId == userId);
            if (!exists)
            {
                _context.Follows.Add(new Follow
                {
                    FollowerId = me,
                    FollowedId = userId,
                    CreatedDate = DateTime.UtcNow
                });

                // Notify the followed user — unless they've turned follow
                // notifications off in their account settings.
                var wantsFollowNotice = await _context.Users
                    .Where(u => u.Id == userId)
                    .Select(u => u.NotifyOnFollow)
                    .FirstOrDefaultAsync();

                var actorName = await _context.Users
                    .Where(u => u.Id == me)
                    .Select(u => u.UserName)
                    .FirstOrDefaultAsync() ?? "Someone";

                Notification? notification = null;
                if (wantsFollowNotice)
                {
                    notification = new Notification
                    {
                        Content = $"{actorName} started following you.",
                        NotificationType = "UserFollowed",
                        ActorUserId = me,
                        DateCreated = DateTime.UtcNow,
                        IsRead = false,
                        UserId = userId
                    };
                    _context.Notifications.Add(notification);
                }

                await _context.SaveChangesAsync();
                if (notification != null)
                {
                    await _hub.PushAsync(notification);
                }
            }

            return Ok(new { message = "Followed.", following = true });
        }

        // Unfollow a user (idempotent).
        [HttpDelete("{userId}")]
        public async Task<IActionResult> Unfollow(int userId)
        {
            var me = GetCurrentUserId();
            var follow = await _context.Follows
                .FirstOrDefaultAsync(f => f.FollowerId == me && f.FollowedId == userId);
            if (follow != null)
            {
                _context.Follows.Remove(follow);
                await _context.SaveChangesAsync();
            }

            return Ok(new { message = "Unfollowed.", following = false });
        }

        // Ids of everyone the current user follows — lets follow buttons mark state cheaply.
        [HttpGet("following/ids")]
        public async Task<IActionResult> FollowingIds()
        {
            var me = GetCurrentUserId();
            var ids = await _context.Follows
                .AsNoTracking()
                .Where(f => f.FollowerId == me)
                .Select(f => f.FollowedId)
                .ToListAsync();
            return Ok(ids);
        }

        // A user's followers (public).
        [HttpGet("{userId}/followers")]
        [AllowAnonymous]
        public async Task<IActionResult> Followers(int userId)
        {
            var users = await _context.Follows
                .AsNoTracking()
                .Where(f => f.FollowedId == userId)
                .OrderByDescending(f => f.CreatedDate)
                .Join(
                    _context.Users,
                    f => f.FollowerId,
                    u => u.Id,
                    (f, u) => new PublicUserProfileDto
                    {
                        Id = u.Id,
                        UserName = u.UserName,
                        UserType = u.UserType,
                        BriefBio = u.BriefBio,
                        HasAvatar = u.ProfileImage != null
                    })
                .ToListAsync();
            return Ok(users);
        }

        // Everyone a user follows (public).
        [HttpGet("{userId}/following")]
        [AllowAnonymous]
        public async Task<IActionResult> Following(int userId)
        {
            var users = await _context.Follows
                .AsNoTracking()
                .Where(f => f.FollowerId == userId)
                .OrderByDescending(f => f.CreatedDate)
                .Join(
                    _context.Users,
                    f => f.FollowedId,
                    u => u.Id,
                    (f, u) => new PublicUserProfileDto
                    {
                        Id = u.Id,
                        UserName = u.UserName,
                        UserType = u.UserType,
                        BriefBio = u.BriefBio,
                        HasAvatar = u.ProfileImage != null
                    })
                .ToListAsync();
            return Ok(users);
        }
    }
}
