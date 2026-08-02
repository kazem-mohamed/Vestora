using System.Threading.Channels;

namespace MyAppApi.Services
{
    // One item to notify: a single recipient about a single event.
    public record FanOutNotification(
        int UserId,
        string Content,
        string NotificationType,
        int? ProjectId,
        int? InvestmentId,
        int? ActorUserId);

    // In-process queue so bulk notification fan-out (e.g. "notify every follower")
    // never blocks the HTTP request that triggered it. No external infra (Redis,
    // Hangfire) required — just the .NET built-in Channels + a BackgroundService
    // (see NotificationFanOutWorker) draining it on a background thread.
    public class NotificationFanOutQueue
    {
        private readonly Channel<FanOutNotification> _channel = Channel.CreateUnbounded<FanOutNotification>();

        public ChannelReader<FanOutNotification> Reader => _channel.Reader;

        public void Enqueue(IEnumerable<FanOutNotification> items)
        {
            foreach (var item in items)
            {
                _channel.Writer.TryWrite(item);
            }
        }

        public void Enqueue(FanOutNotification item) => _channel.Writer.TryWrite(item);
    }
}
