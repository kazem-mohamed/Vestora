namespace MyAppApi.Data.Models
{
    using System.ComponentModel.DataAnnotations;

    public class User
    {
        public int Id { get; set; }

        [Required]
        [StringLength(100)]
        public string UserName { get; set; }

        [Required]
        [EmailAddress]
        [StringLength(255)]
        public string Email { get; set; }

        [Required]
        [DataType(DataType.Password)]
        [StringLength(255, MinimumLength = 8)]
        public string Password { get; set; }

        [Required]
        public string UserType { get; set; }

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

        public byte[]? ProfileImage { get; set; }

        // Large hero cover shown on the public profile page (per-user upload).
        public byte[]? CoverImage { get; set; }

        // When the account was created — powers the "joined" line on the profile.
        // Nullable so pre-existing rows (created before this column) simply hide it.
        public DateTime? CreatedAtUtc { get; set; }

        // Last time the user's final chat connection closed — powers "last seen"
        // in the messenger. Null until they've been online at least once.
        public DateTime? LastSeenAt { get; set; }

        // When the first-run flow was completed. Null = never onboarded, which is
        // what gates the redirect after login.
        //
        // This lived in localStorage first, which made it a per-browser fact rather
        // than an account one: the same person met the welcome flow again on every
        // new device, and clearing site data silently reset it. A timestamp rather
        // than a bool because "when" is the question worth asking later, and it
        // costs the same column.
        public DateTime? OnboardedAtUtc { get; set; }

        [Required]
        [StringLength(50)]
        public string UniqueNumber { get; set; }

        public bool IsEmailVerified { get; set; }

        public DateTime? EmailVerifiedAtUtc { get; set; }

        [StringLength(128)]
        public string? EmailVerificationTokenHash { get; set; }

        public DateTime? EmailVerificationTokenExpiresAtUtc { get; set; }

        public DateTime? EmailVerificationLastSentAtUtc { get; set; }

        [StringLength(128)]
        public string? PasswordResetTokenHash { get; set; }

        public DateTime? PasswordResetTokenExpiresAtUtc { get; set; }

        public DateTime? PasswordResetLastRequestedAtUtc { get; set; }

        public int PasswordResetFailedAttempts { get; set; }

        public int FailedLoginCount { get; set; }

        public DateTime? LockoutEndUtc { get; set; }

        public DateTime? LastFailedLoginAtUtc { get; set; }

        // Soft delete: hidden via a global query filter (see AppDbContext), never
        // physically removed, so admin deletes are reversible.
        public bool IsDeleted { get; set; }

        // Suspension is the graduated moderation action that sits below deletion:
        // the account still exists and can be restored, but cannot sign in.
        public bool IsSuspended { get; set; }

        public DateTime? SuspendedAtUtc { get; set; }

        [StringLength(500)]
        public string? SuspensionReason { get; set; }

        // Set when an admin creates the account and picks the initial password
        // themselves — the admin's choice is a placeholder the real owner never chose,
        // so login succeeds but the client routes to a forced change before anything
        // else. False for every self-registered account, which never needs it.
        public bool MustChangePassword { get; set; }

        // Self-deletion. Distinct from IsDeleted (which an admin sets) so the two
        // can be told apart in the audit trail and in support conversations.
        public DateTime? DeletedAtUtc { get; set; }

        // ---- Notification preferences ----
        // Only the ambient notifications are optional. The four support ones
        // (requested / submitted / approved / declined) carry decisions that the
        // relationship pipeline depends on, so they are never silenceable — a
        // founder who muted "an investor wants to back you" would simply stop
        // receiving the product.
        public bool NotifyOnFollow { get; set; } = true;

        public bool NotifyOnProjectUpdate { get; set; } = true;

        public virtual ICollection<Message>? SentMessages { get; set; }
        public virtual ICollection<Message>? ReceivedMessages { get; set; }
        public virtual ICollection<UserProjectInteraction> UserProjectInteractions { get; set; }
        public virtual ICollection<RefreshToken> RefreshTokens { get; set; }
        public virtual ICollection<SecurityLog> SecurityLogs { get; set; }

        // New: Relationship with comments and replies
        public ICollection<Comment> Comments { get; set; }
        public ICollection<Reply> Replies { get; set; }
    }
}
