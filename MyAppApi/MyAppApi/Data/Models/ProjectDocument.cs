using System;
using System.ComponentModel.DataAnnotations;

namespace MyAppApi.Data.Models
{
    // A file in the project's Documents Center (pitch deck, business plan, …).
    public class ProjectDocument
    {
        public int Id { get; set; }

        [Required]
        [StringLength(150)]
        public string Title { get; set; } = string.Empty;

        [StringLength(200)]
        public string FileName { get; set; } = string.Empty;

        public string ContentType { get; set; } = "application/octet-stream";

        public byte[] FileData { get; set; } = Array.Empty<byte>();

        public long SizeBytes { get; set; }

        // "Public" (any signed-in viewer) | "Backers" (owner + approved investors only)
        public string Visibility { get; set; } = "Public";

        public DateTime UploadedAt { get; set; }

        public int ProjectId { get; set; }
        public Project Project { get; set; } = null!;
    }
}
