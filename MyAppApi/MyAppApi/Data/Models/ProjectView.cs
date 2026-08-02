namespace MyAppApi.Data.Models
{
    // One row per project-detail view (F10 tracking). ViewerId is null for guests;
    // Fingerprint (a hashed ip+ua) lets us count unique anonymous visitors.
    // Cascades from Project so a deleted project takes its view log with it.
    public class ProjectView
    {
        public int Id { get; set; }

        public int ProjectId { get; set; }
        public Project? Project { get; set; }

        public int? ViewerId { get; set; }

        public string? Fingerprint { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
