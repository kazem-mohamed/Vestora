using System.ComponentModel.DataAnnotations;

namespace MyAppApi.Data.Models.DTOs
{
    public class UpdateUserDto
    {
        [StringLength(100, MinimumLength = 2)]
        public string? UserName { get; set; }

        [DataType(DataType.Date)]
        public DateTime? BirthDate { get; set; }

        [Phone]
        public string? Phone { get; set; }

        [StringLength(250)]
        public string? BriefBio { get; set; }

        [StringLength(300)]
        public string? WebsiteUrl { get; set; }

        [StringLength(300)]
        public string? LinkedinUrl { get; set; }

        [StringLength(300)]
        public string? TwitterUrl { get; set; }

        // Investor-only; ignored when the caller isn't an Investor.
        [StringLength(500)]
        public string? PreferredIndustries { get; set; }

        [StringLength(500)]
        public string? InvestmentThesis { get; set; }

        [Range(0, 1_000_000_000)]
        public decimal? TicketMin { get; set; }

        [Range(0, 1_000_000_000)]
        public decimal? TicketMax { get; set; }

        // Notification preferences. Null means "leave as is" — the profile form
        // and the preferences form post to the same endpoint.
        public bool? NotifyOnFollow { get; set; }

        public bool? NotifyOnProjectUpdate { get; set; }

        public IFormFile? ProfileImage { get; set; }

        public IFormFile? CoverImage { get; set; }
    }

    /// <summary>Closing an account is irreversible for the user, so it is
    /// confirmed with the current password rather than a click alone.</summary>
    public class DeleteAccountDto
    {
        [Required]
        [DataType(DataType.Password)]
        public string CurrentPassword { get; set; } = string.Empty;
    }
}
