using System;

namespace MyAppApi.Data.Models
{
    // Image attached to a ProjectUpdate (bytes stored inline, like ProjectImage).
    public class ProjectUpdateImage
    {
        public int Id { get; set; }

        public byte[] ImageData { get; set; } = Array.Empty<byte>();

        public string ContentType { get; set; } = "application/octet-stream";

        public DateTime UploadedAt { get; set; }

        public int ProjectUpdateId { get; set; }
        public ProjectUpdate ProjectUpdate { get; set; } = null!;
    }
}
