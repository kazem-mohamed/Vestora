namespace MyAppApi.Data.Models
{
    // A user-submitted report against a project. Cascades from Project; ReporterId
    // / ResolvedByAdminId are plain ints with no FK nav (same rationale as Bookmark).
    public class Report
    {
        public int Id { get; set; }

        public int ProjectId { get; set; }
        public Project? Project { get; set; }

        public int ReporterId { get; set; }

        // Spam | Scam | Copyright | Offensive | Duplicate | Other
        public string Reason { get; set; } = "Other";

        public string? Details { get; set; }

        // Open | Resolved | Dismissed
        public string Status { get; set; } = "Open";

        public DateTime CreatedAt { get; set; }

        public DateTime? ResolvedAt { get; set; }

        public int? ResolvedByAdminId { get; set; }
    }
}
