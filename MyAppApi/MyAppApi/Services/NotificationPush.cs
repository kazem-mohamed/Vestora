using Microsoft.AspNetCore.SignalR;
using MyAppApi.Data.Models;
using MyAppApi.Data.Models.Hubs;

namespace MyAppApi.Services
{
    // Pushes a just-persisted Notification to its recipient's live SignalR group
    // (same "user:{id}" group ChatHub joins on connect), so the client updates
    // instantly instead of waiting for the next 30s poll.
    public static class NotificationPush
    {
        public static Task PushAsync(this IHubContext<ChatHub> hub, Notification notification)
        {
            var payload = new
            {
                notificationId = notification.NotificationId,
                content = notification.Content,
                dateCreated = notification.DateCreated,
                isRead = notification.IsRead,
                notificationType = notification.NotificationType,
                projectId = notification.ProjectId,
                investmentId = notification.InvestmentId,
                actorUserId = notification.ActorUserId,
                userId = notification.UserId,
            };
            return hub.Clients.Group($"user:{notification.UserId}").SendAsync("ReceiveNotification", payload);
        }
    }
}
