using System.ComponentModel.DataAnnotations;

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
