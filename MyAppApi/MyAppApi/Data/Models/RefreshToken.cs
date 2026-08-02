using System.ComponentModel.DataAnnotations;

namespace MyAppApi.Data.Models
{
    public class RefreshToken
    {
        public int Id { get; set; }

        [Required]
        [StringLength(128)]
        public string TokenHash { get; set; } = string.Empty;

        public DateTime CreatedAtUtc { get; set; }

        public DateTime ExpiresAtUtc { get; set; }

        public DateTime? RevokedAtUtc { get; set; }

        [StringLength(128)]
        public string? ReplacedByTokenHash { get; set; }

        [StringLength(256)]
        public string? CreatedByIp { get; set; }

        [StringLength(512)]
        public string? UserAgent { get; set; }

        [StringLength(256)]
        public string? RevokedByIp { get; set; }

        public int UserId { get; set; }

        public User User { get; set; } = null!;

        public bool IsExpired => DateTime.UtcNow >= ExpiresAtUtc;

        public bool IsRevoked => RevokedAtUtc.HasValue;

        public bool IsActive => !IsRevoked && !IsExpired;
    }
}
