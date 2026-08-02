using System.ComponentModel.DataAnnotations;

namespace MyAppApi.Data.Models
{
    public class SecurityLog
    {
        public int Id { get; set; }

        [Required]
        [StringLength(100)]
        public string EventType { get; set; } = string.Empty;

        public int? UserId { get; set; }

        public User? User { get; set; }

        [StringLength(255)]
        public string? Email { get; set; }

        [StringLength(256)]
        public string? IpAddress { get; set; }

        [StringLength(512)]
        public string? UserAgent { get; set; }

        [StringLength(1000)]
        public string? Details { get; set; }

        public DateTime CreatedAtUtc { get; set; }
    }
}
