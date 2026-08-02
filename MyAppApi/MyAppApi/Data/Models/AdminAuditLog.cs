namespace MyAppApi.Data.Models
{
    // A durable record of destructive/moderation actions taken by an admin
    // (delete user, delete project, approve/reject a listing, resolve a report,
    // create an admin). Written alongside the action itself, never edited.
    public class AdminAuditLog
    {
        public int Id { get; set; }

        public int AdminUserId { get; set; }

        public string Action { get; set; } = string.Empty; // e.g. "DeleteProject"

        public string TargetType { get; set; } = string.Empty; // e.g. "Project"

        public int? TargetId { get; set; }

        public string? Details { get; set; }

        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    }
}
