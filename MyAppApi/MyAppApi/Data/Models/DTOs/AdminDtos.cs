using System.ComponentModel.DataAnnotations;
using MyAppApi.Services;

namespace MyAppApi.Data.Models.DTOs
{
    // One-time bootstrap of the very first administrator, protected by a shared secret.
    public class AdminBootstrapDto
    {
        [Required]
        public string SecretKey { get; set; } = string.Empty;

        [Required]
        [StringLength(100, MinimumLength = 2)]
        public string UserName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        [DataType(DataType.Password)]
        [StringLength(100, MinimumLength = 8)]
        public string Password { get; set; } = string.Empty;
    }

    // Creation of additional administrators by an already-authenticated administrator.
    public class CreateAdminDto
    {
        [Required]
        [StringLength(100, MinimumLength = 2)]
        public string UserName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        [DataType(DataType.Password)]
        [StringLength(100, MinimumLength = 8)]
        public string Password { get; set; } = string.Empty;
    }

    /// <summary>
    /// An admin creating an Investor or Innovator account directly, rather than the
    /// person registering themselves.
    /// <para>
    /// The password is the admin's choice, not the account owner's — it is a
    /// placeholder the real person never picked, which is exactly why the account is
    /// created with <c>MustChangePassword</c> set: the temporary password gets them in
    /// the door once and no further.
    /// </para>
    /// </summary>
    public class AdminCreateUserDto
    {
        [Required]
        [StringLength(100, MinimumLength = 2)]
        public string UserName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        /// <summary>Investor | Innovator. Admin accounts are created through the dedicated endpoint, never here.</summary>
        [Required]
        public string UserType { get; set; } = string.Empty;

        [Required]
        [DataType(DataType.Password)]
        [PasswordPolicy(EmailProperty = nameof(Email))]
        public string TemporaryPassword { get; set; } = string.Empty;
    }

    /// <summary>
    /// The fields an admin may correct on a user's account. Deliberately excludes
    /// UserType: the discriminator decides which table-derived type, dashboard and
    /// permission set a row has, and changing it is a migration of the person to a
    /// different role, not a typo fix — it needs its own considered flow if it is
    /// ever built, not a field on this form.
    /// </summary>
    public class AdminEditUserDto
    {
        [Required]
        [StringLength(100, MinimumLength = 2)]
        public string UserName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Phone]
        public string? Phone { get; set; }
    }

    /// <summary>
    /// The justification a destructive admin action has to carry.
    /// <para>
    /// Required, because the person on the other end of a suspension or a deletion will
    /// ask why, and "an administrator did it" is not an answer. The reconciliation queue
    /// already refuses an empty resolution note for the same reason; this applies the
    /// same standard to the actions that affect someone's account rather than a ledger.
    /// </para>
    /// </summary>
    public class AdminReasonDto
    {
        [Required(ErrorMessage = "Say why — an unexplained action is one nobody can answer for.")]
        [StringLength(500, MinimumLength = 4, ErrorMessage = "Give a reason of at least 4 characters.")]
        public string Reason { get; set; } = string.Empty;
    }

    public class AdminUserDto
    {
        public int Id { get; set; }

        public string UserName { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;

        public string UserType { get; set; } = string.Empty;

        public bool IsEmailVerified { get; set; }

        public bool IsSuspended { get; set; }

        public string? SuspensionReason { get; set; }

        /// <summary>Only meaningful when UserType is Admin.</summary>
        public bool IsPrimaryAdmin { get; set; }
    }

    public class AdminAnalyticsDto
    {
        public int TotalUsers { get; set; }

        public int Investors { get; set; }

        public int Innovators { get; set; }

        public int Admins { get; set; }

        public int TotalProjects { get; set; }

        /// <summary>Ventures whose settled money covers the goal.</summary>
        public int FundedProjects { get; set; }

        /// <summary>Ventures fully spoken for but not fully paid. The gap worth watching.</summary>
        public int FullyCommittedProjects { get; set; }

        /// <summary>Count of approved commitments (relationships), not of payments.</summary>
        public int TotalInvestments { get; set; }

        /// <summary>Settled money across the platform. Formerly the sum of approvals.</summary>
        public double TotalInvestedAmount { get; set; }

        /// <summary>Approved commitments in money terms — always ≥ TotalInvestedAmount.</summary>
        public double TotalCommittedAmount { get; set; }

        /// <summary>Fees recognised on settled, non-refunded transactions.</summary>
        public double PlatformRevenue { get; set; }

        public int FundedTransactions { get; set; }
    }
}
