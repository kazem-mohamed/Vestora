namespace MyAppApi.Data.Models
{
    public class ProjectImage
    {
        public int Id { get; set; }

        public byte[] ImageData { get; set; } = Array.Empty<byte>();

        public string ContentType { get; set; } = "application/octet-stream";

        public DateTime UploadedAt { get; set; }

        public int ProjectId { get; set; }

        public Project Project { get; set; } = null!;
    }
}
