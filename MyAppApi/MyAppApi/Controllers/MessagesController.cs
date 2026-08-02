using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using MyAppApi.Data;
using MyAppApi.Data.Models;
using MyAppApi.Data.Models.DTOs;
using MyAppApi.Data.Models.Hubs;
using MyAppApi.Services;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace MyAppApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class MessageController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IHubContext<ChatHub> _hub;
        private readonly IFileUploadSecurityService _fileSecurity;

        public MessageController(
            AppDbContext context,
            IHubContext<ChatHub> hub,
            IFileUploadSecurityService fileSecurity)
        {
            _context = context;
            _hub = hub;
            _fileSecurity = fileSecurity;
        }

        private int GetCurrentUserId()
        {
            return int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        }

        [HttpPost("send")]
        public async Task<IActionResult> SendMessage([FromBody] SendMessageDto messageDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            if (messageDto.ReceiverId == GetCurrentUserId())
            {
                return BadRequest(new { message = "Cannot send a message to yourself." });
            }

            var receiverExists = await _context.Users.AnyAsync(u => u.Id == messageDto.ReceiverId);
            if (!receiverExists)
            {
                return NotFound(new { message = "Receiver not found." });
            }

            // A venture context is only honoured when the two people are actually the
            // two sides of a relationship on it. Accepting the id as given would let a
            // sender stamp any message with any venture and have it appear inside
            // someone else's deal room.
            int? projectId = null;
            if (messageDto.ProjectId is int pid)
            {
                var me = GetCurrentUserId();
                var partiesMatch = await _context.Investments.AnyAsync(i =>
                    i.ProjectId == pid &&
                    ((i.Project.OwnerId == me && i.InvestorId == messageDto.ReceiverId) ||
                     (i.InvestorId == me && i.Project.OwnerId == messageDto.ReceiverId)));

                if (!partiesMatch)
                    return BadRequest(new { message = "No relationship on that venture between you two." });

                projectId = pid;
            }

            var message = new Message
            {
                Content = messageDto.Content,
                SentAt = DateTime.UtcNow,
                SenderId = GetCurrentUserId(),
                ReceiverId = messageDto.ReceiverId,
                ProjectId = projectId
            };

            _context.Messages.Add(message);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Message sent successfully", data = message });
        }

        // Send an image attachment (optional caption). The bytes are validated by
        // the shared upload-security service and stored 1:1 in MessageAttachment;
        // the created message is broadcast to the receiver and returned to the caller.
        [HttpPost("send-attachment")]
        [RequestSizeLimit(15 * 1024 * 1024)]
        public async Task<IActionResult> SendAttachment([FromForm] SendAttachmentDto dto)
        {
            var senderId = GetCurrentUserId();

            if (dto.ReceiverId == senderId)
            {
                return BadRequest(new { message = "Cannot send a message to yourself." });
            }
            if (dto.File is not { Length: > 0 })
            {
                return BadRequest(new { message = "No file was provided." });
            }

            var receiverExists = await _context.Users.AnyAsync(u => u.Id == dto.ReceiverId);
            if (!receiverExists)
            {
                return NotFound(new { message = "Receiver not found." });
            }

            var imageResult = await _fileSecurity.ReadValidatedImageAsync(dto.File);
            if (imageResult.Status != ServiceResultStatus.Ok || imageResult.Value is null)
            {
                return BadRequest(new { message = imageResult.Message ?? "Invalid image file." });
            }

            var message = new Message
            {
                Content = dto.Caption?.Trim() ?? string.Empty,
                SentAt = DateTime.UtcNow,
                SenderId = senderId,
                ReceiverId = dto.ReceiverId,
                AttachmentType = dto.File.ContentType,
                AttachmentName = Path.GetFileName(dto.File.FileName)
            };
            _context.Messages.Add(message);
            await _context.SaveChangesAsync();

            _context.MessageAttachments.Add(new MessageAttachment
            {
                MessageId = message.Id,
                Data = imageResult.Value
            });
            await _context.SaveChangesAsync();

            var payload = new
            {
                message.Id,
                message.Content,
                message.SentAt,
                message.SenderId,
                message.ReceiverId,
                message.AttachmentType,
                message.AttachmentName
            };

            // Broadcast to the receiver only; the caller gets the row back in the
            // response and swaps its optimistic preview for it.
            await _hub.Clients.Group(ChatHub.UserGroup(dto.ReceiverId)).SendAsync("ReceiveMessage", payload);

            return Ok(new { message = "Attachment sent successfully", data = payload });
        }

        // Streams an attachment's bytes to either party of the conversation.
        [HttpGet("attachment/{messageId}")]
        public async Task<IActionResult> GetAttachment(int messageId)
        {
            var me = GetCurrentUserId();
            var message = await _context.Messages.FindAsync(messageId);
            if (message == null || message.AttachmentType == null)
            {
                return NotFound();
            }
            if (message.SenderId != me && message.ReceiverId != me)
            {
                return Forbid();
            }

            var attachment = await _context.MessageAttachments.FindAsync(messageId);
            if (attachment == null)
            {
                return NotFound();
            }

            return File(attachment.Data, message.AttachmentType);
        }

        /// <summary>
        /// A thread between two people. Pass <paramref name="projectId"/> to read only
        /// the messages belonging to one venture — that is how a deal room shows a
        /// conversation in its own context without needing a second chat system.
        /// Omitting it returns the whole history, so the general inbox is unchanged.
        /// </summary>
        [HttpGet("conversation/{senderId}/{receiverId}")]
        public async Task<IActionResult> GetConversation(
            int senderId, int receiverId, [FromQuery] int? projectId)
        {
            var currentUserId = GetCurrentUserId();
            if (senderId != currentUserId && receiverId != currentUserId)
            {
                return Forbid();
            }

            var query = _context.Messages
                .Where(m => (m.SenderId == senderId && m.ReceiverId == receiverId) ||
                            (m.SenderId == receiverId && m.ReceiverId == senderId));

            if (projectId is int pid)
                query = query.Where(m => m.ProjectId == pid);

            var messages = await query.OrderBy(m => m.SentAt).ToListAsync();

            return Ok(messages);
        }
        [HttpGet("conversations/{userId}")]
        public async Task<IActionResult> GetUserConversations(int userId)
        {
            var currentUserId = GetCurrentUserId();
            if (userId != currentUserId)
            {
                return Forbid();
            }

            var conversations = await _context.Messages
                .Where(m => m.SenderId == currentUserId || m.ReceiverId == currentUserId) // تصفية الرسائل حسب ال Sender أو ال Receiver
                .Select(m => new
                {
                    Message = m,
                    ConversationPartnerId = m.SenderId == currentUserId ? m.ReceiverId : m.SenderId
                })
                .GroupBy(m => m.ConversationPartnerId)
                .Select(g => new
                {
                    Message = g.OrderByDescending(m => m.Message.SentAt).FirstOrDefault(), // ترتيب الرسائل حسب التاريخ
                    ConversationPartnerId = g.Key
                })
                .ToListAsync();

            if (conversations == null || !conversations.Any())
            {
                return Ok(Array.Empty<object>());
            }

            var userIds = conversations
                .SelectMany(c => new[] { c.Message!.Message.SenderId, c.Message.Message.ReceiverId })
                .Distinct()
                .ToList();
            var userNames = await _context.Users
                .Where(u => userIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, u => u.UserName);

            // Unread messages addressed to me, grouped by the partner who sent them.
            var unreadByPartner = await _context.Messages
                .Where(m => m.ReceiverId == currentUserId && !m.IsRead)
                .GroupBy(m => m.SenderId)
                .Select(g => new { PartnerId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.PartnerId, x => x.Count);

            var result = conversations.Select(c => new
            {
                MessageId = c.Message!.Message.Id,
                Content = c.Message.Message.Content,
                AttachmentType = c.Message.Message.AttachmentType,
                SentAt = c.Message.Message.SentAt,
                SenderId = c.Message.Message.SenderId,
                SenderName = userNames.GetValueOrDefault(c.Message.Message.SenderId),
                ReceiverId = c.Message.Message.ReceiverId,
                ReceiverName = userNames.GetValueOrDefault(c.Message.Message.ReceiverId),
                PartnerId = c.ConversationPartnerId,
                PartnerName = userNames.GetValueOrDefault(c.ConversationPartnerId),
                UnreadCount = unreadByPartner.GetValueOrDefault(c.ConversationPartnerId, 0),
                IsMine = c.Message.Message.SenderId == currentUserId
            })
            .OrderByDescending(c => c.SentAt)
            .ToList();

            return Ok(result);
        }

        // Mark every message from {partnerId} to me as read (called when a thread opens).
        [HttpPost("read/{partnerId}")]
        public async Task<IActionResult> MarkConversationRead(int partnerId)
        {
            var me = GetCurrentUserId();
            var unread = await _context.Messages
                .Where(m => m.SenderId == partnerId && m.ReceiverId == me && !m.IsRead)
                .ToListAsync();

            foreach (var m in unread)
            {
                m.IsRead = true;
            }

            if (unread.Count > 0)
            {
                await _context.SaveChangesAsync();

                // Let the original sender know I read their messages so their
                // ticks flip to "read" live, without waiting for a refetch.
                await _hub.Clients
                    .Group(ChatHub.UserGroup(partnerId))
                    .SendAsync("MessagesRead", me, DateTime.UtcNow.ToString("o"));
            }

            return Ok(new { updated = unread.Count });
        }

        // Total unread messages addressed to me — powers the header inbox badge.
        [HttpGet("unread-count")]
        public async Task<IActionResult> UnreadCount()
        {
            var me = GetCurrentUserId();
            var count = await _context.Messages.CountAsync(m => m.ReceiverId == me && !m.IsRead);
            return Ok(new { count });
        }

        [HttpGet("message/{id}")]
        public async Task<IActionResult> GetMessage(int id)
        {
            var message = await _context.Messages.FindAsync(id);

            if (message == null)
            {
                return NotFound(new { message = "Message not found." });
            }

            var currentUserId = GetCurrentUserId();
            if (message.SenderId != currentUserId && message.ReceiverId != currentUserId)
            {
                return Forbid();
            }

            return Ok(message);
        }

        [HttpDelete("message/{id}")]
        public async Task<IActionResult> DeleteMessage(int id)
        {
            var message = await _context.Messages.FindAsync(id);

            if (message == null)
            {
                return NotFound(new { message = "Message not found." });
            }

            if (message.SenderId != GetCurrentUserId())
            {
                return Forbid();
            }

            _context.Messages.Remove(message);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Message deleted successfully." });
        }
    }
}
