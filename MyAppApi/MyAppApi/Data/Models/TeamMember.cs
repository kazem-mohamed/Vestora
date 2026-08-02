using System.ComponentModel.DataAnnotations;

namespace MyAppApi.Data.Models
{
    // A person on the project's team (founder, co-founder, advisor, …).
    public class TeamMember
    {
        public int Id { get; set; }

        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        [StringLength(100)]
        public string? Role { get; set; }

        [StringLength(400)]
        public string? Bio { get; set; }

        [StringLength(300)]
        public string? LinkedinUrl { get; set; }

        // Optional — auto-links this membership onto the matching registered
        // user's public profile (matched case-insensitively at read time).
        // Never exposed via the public team roster, only to the project owner.
        [StringLength(255)]
        public string? Email { get; set; }

        public int SortOrder { get; set; }

        // Optional avatar stored inline (like ProjectImage).
        public byte[]? AvatarData { get; set; }
        public string? AvatarContentType { get; set; }

        public int ProjectId { get; set; }
        public Project Project { get; set; } = null!;
    }
}
