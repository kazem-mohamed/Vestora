namespace MyAppApi.Data.Models
{
    // Records who downloaded a project document and when, so the founder can
    // see engagement on backers-only materials instead of the download
    // vanishing into nothing (data rooms are otherwise unauditable).
    public class DocumentDownloadLog
    {
        public int Id { get; set; }

        public int ProjectDocumentId { get; set; }
        public ProjectDocument ProjectDocument { get; set; } = null!;

        public int UserId { get; set; }

        public DateTime DownloadedAtUtc { get; set; } = DateTime.UtcNow;
    }
}
