namespace MyAppApi.Data.Models
{
    public class Notification
    {
        public int NotificationId { get; set; }
        public string Content { get; set; }
        public DateTime DateCreated { get; set; }
        public bool IsRead { get; set; }

        public string? NotificationType { get; set; }

        public int? ProjectId { get; set; }

        public Project? Project { get; set; }

        public int? InvestmentId { get; set; }

        public Investment? Investment { get; set; }

        public int? ActorUserId { get; set; }

        public User? ActorUser { get; set; }

        public int UserId { get; set; }
        public User User { get; set; }
    }
}
