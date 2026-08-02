using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using MyAppApi.Data;
using MyAppApi.Services;
using System.Security.Claims;

namespace MyAppApi.Data.Models.Hubs
{
    [Authorize]
    public class ChatHub : Hub
    {
        private readonly AppDbContext _context;
        private readonly PresenceTracker _presence;

        public ChatHub(AppDbContext context, PresenceTracker presence)
        {
            _context = context;
            _presence = presence;
        }

        private int GetCurrentUserId()
        {
            return int.Parse(Context.User!.FindFirstValue(ClaimTypes.NameIdentifier)!);
        }

        public static string UserGroup(int userId) => $"user:{userId}";

        // Distinct users this user has a conversation with — the audience for
        // presence changes (so only people you actually talk to see your dot move).
        private Task<List<int>> ConversationPartnerIdsAsync(int userId)
        {
            return _context.Messages
                .Where(m => m.SenderId == userId || m.ReceiverId == userId)
                .Select(m => m.SenderId == userId ? m.ReceiverId : m.SenderId)
                .Distinct()
                .ToListAsync();
        }

        public override async Task OnConnectedAsync()
        {
            var userId = GetCurrentUserId();
            await Groups.AddToGroupAsync(Context.ConnectionId, UserGroup(userId));

            // Announce coming online to my conversation partners (first connection only).
            if (_presence.Connect(userId))
            {
                var partners = await ConversationPartnerIdsAsync(userId);
                if (partners.Count > 0)
                {
                    await Clients
                        .Groups(partners.Select(UserGroup).ToList())
                        .SendAsync("PresenceChanged", userId, true, (string?)null);
                }
            }

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = GetCurrentUserId();

            // Announce going offline once the last connection closes, and persist
            // "last seen" so it survives restarts.
            if (_presence.Disconnect(userId))
            {
                var now = DateTime.UtcNow;
                var user = await _context.Users.FindAsync(userId);
                if (user != null)
                {
                    user.LastSeenAt = now;
                    await _context.SaveChangesAsync();
                }

                var partners = await ConversationPartnerIdsAsync(userId);
                if (partners.Count > 0)
                {
                    await Clients
                        .Groups(partners.Select(UserGroup).ToList())
                        .SendAsync("PresenceChanged", userId, false, now.ToString("o"));
                }
            }

            await base.OnDisconnectedAsync(exception);
        }

        // Point-in-time presence for a set of users — the client calls this on
        // open to seed dots/statuses before any live change arrives. Offline
        // users carry their persisted last-seen; online users omit it.
        public async Task<object[]> GetPresence(int[] userIds)
        {
            var ids = (userIds ?? Array.Empty<int>()).Distinct().ToArray();
            if (ids.Length == 0)
            {
                return Array.Empty<object>();
            }

            var lastSeen = await _context.Users
                .Where(u => ids.Contains(u.Id))
                .Select(u => new { u.Id, u.LastSeenAt })
                .ToDictionaryAsync(u => u.Id, u => u.LastSeenAt);

            return ids
                .Select(id =>
                {
                    var online = _presence.IsOnline(id);
                    return (object)new
                    {
                        userId = id,
                        isOnline = online,
                        lastSeenAt = online ? null : lastSeen.GetValueOrDefault(id)?.ToString("o"),
                    };
                })
                .ToArray();
        }

        // Relays typing state to the other party; nothing is persisted.
        public async Task Typing(int receiverId, bool isTyping)
        {
            var senderId = GetCurrentUserId();
            if (receiverId == senderId)
            {
                return;
            }
            await Clients.Group(UserGroup(receiverId)).SendAsync("ReceiveTyping", senderId, isTyping);
        }

        // Called by clients to send a real-time message; also persisted for history.
        public async Task SendMessage(int receiverId, string content)
        {
            var senderId = GetCurrentUserId();

            if (receiverId == senderId)
            {
                throw new HubException("Cannot send a message to yourself.");
            }

            if (string.IsNullOrWhiteSpace(content))
            {
                throw new HubException("Message content cannot be empty.");
            }

            var receiverExists = await _context.Users.AnyAsync(u => u.Id == receiverId);
            if (!receiverExists)
            {
                throw new HubException("Receiver not found.");
            }

            var message = new Message
            {
                Content = content,
                SentAt = DateTime.UtcNow,
                SenderId = senderId,
                ReceiverId = receiverId
            };

            _context.Messages.Add(message);
            await _context.SaveChangesAsync();

            var payload = new
            {
                message.Id,
                message.Content,
                message.SentAt,
                message.SenderId,
                message.ReceiverId
            };

            await Clients.Group(UserGroup(receiverId)).SendAsync("ReceiveMessage", payload);
            await Clients.Caller.SendAsync("ReceiveMessage", payload);

            // Sending implies I stopped typing — clear any lingering indicator on the receiver.
            await Clients.Group(UserGroup(receiverId)).SendAsync("ReceiveTyping", senderId, false);
        }
    }
}
