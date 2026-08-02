using Microsoft.AspNetCore.SignalR;
using MyAppApi.Data;
using MyAppApi.Data.Models;
using MyAppApi.Data.Models.Hubs;

namespace MyAppApi.Services
{
    // Drains NotificationFanOutQueue on a background thread: each item gets its
    // own DbContext scope (the request that enqueued it is long gone by the time
    // this runs) and is persisted + pushed over SignalR independently, so one
    // failure doesn't drop the rest of the batch.
    public class NotificationFanOutWorker : BackgroundService
    {
        private readonly NotificationFanOutQueue _queue;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<NotificationFanOutWorker> _logger;

        public NotificationFanOutWorker(
            NotificationFanOutQueue queue,
            IServiceScopeFactory scopeFactory,
            ILogger<NotificationFanOutWorker> logger)
        {
            _queue = queue;
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            await foreach (var item in _queue.Reader.ReadAllAsync(stoppingToken))
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                    var hub = scope.ServiceProvider.GetRequiredService<IHubContext<ChatHub>>();

                    var notification = new Notification
                    {
                        UserId = item.UserId,
                        Content = item.Content,
                        NotificationType = item.NotificationType,
                        ProjectId = item.ProjectId,
                        InvestmentId = item.InvestmentId,
                        ActorUserId = item.ActorUserId,
                        DateCreated = DateTime.UtcNow,
                        IsRead = false
                    };

                    db.Notifications.Add(notification);
                    await db.SaveChangesAsync(stoppingToken);
                    await hub.PushAsync(notification);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Notification fan-out failed for user {UserId}.", item.UserId);
                }
            }
        }
    }
}
