namespace MyAppApi.Data.Models.DTOs
{
    /// <summary>
    /// Everything the platform knows about one person, in the order an administrator
    /// actually asks it.
    /// <para>
    /// Answering "what is going on with this account?" used to mean opening the users
    /// list, the ventures list, the reports queue, the revenue table and the audit log
    /// and correlating them by name — five screens, each paginated, none of which agrees
    /// on what to call a user. The account is the unit of moderation, so it gets a
    /// screen.
    /// </para>
    /// <para>
    /// Every money figure here comes from <c>FundingMath</c>. None of it is recomputed
    /// for this screen, because a moderation decision made against a number this page
    /// invented would be a decision made against nothing.
    /// </para>
    /// </summary>
    public class AdminUserOverviewDto
    {
        public AdminAccountDto Account { get; set; } = new();
        public AdminSecuritySnapshotDto Security { get; set; } = new();

        /// <summary>Ventures they own. Empty for anyone who is not a founder.</summary>
        public List<AdminUserVentureDto> Ventures { get; set; } = new();

        public AdminUserReportsDto Reports { get; set; } = new();

        /// <summary>Relationships they are part of, from either side.</summary>
        public List<AdminUserDealDto> Deals { get; set; } = new();

        public AdminUserPaymentsDto Payments { get; set; } = new();

        /// <summary>Administrative actions taken against this account, most recent first.</summary>
        public List<AdminUserAuditDto> Activity { get; set; } = new();

        public int UnreadMessages { get; set; }
    }

    public class AdminAccountDto
    {
        public int Id { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string UserType { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? BriefBio { get; set; }
        public bool IsEmailVerified { get; set; }
        public DateTime? EmailVerifiedAtUtc { get; set; }
        public DateTime? CreatedAtUtc { get; set; }
        public DateTime? LastSeenAt { get; set; }
        public DateTime? OnboardedAtUtc { get; set; }

        public bool IsSuspended { get; set; }
        public DateTime? SuspendedAtUtc { get; set; }
        public string? SuspensionReason { get; set; }

        /// <summary>Removed by an administrator.</summary>
        public bool IsDeleted { get; set; }

        /// <summary>
        /// Set when the person closed their own account. Kept apart from
        /// <see cref="IsDeleted"/> on purpose: "they left" and "we removed them" are
        /// different answers to give in a support conversation.
        /// </summary>
        public DateTime? DeletedAtUtc { get; set; }
    }

    public class AdminSecuritySnapshotDto
    {
        public int FailedLoginCount { get; set; }
        public DateTime? LockoutEndUtc { get; set; }
        public DateTime? LastFailedLoginAtUtc { get; set; }
        public bool IsLockedOut { get; set; }

        /// <summary>How many distinct addresses this account has been seen from.</summary>
        public int DistinctIpCount { get; set; }

        public List<SecurityEventDto> RecentEvents { get; set; } = new();
    }

    public class SecurityEventDto
    {
        public int Id { get; set; }
        public string EventType { get; set; } = string.Empty;
        public string? IpAddress { get; set; }
        public string? Details { get; set; }
        public DateTime CreatedAtUtc { get; set; }
    }

    public class AdminUserVentureDto
    {
        public int ProjectId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Category { get; set; }

        /// <summary>PendingReview | Approved | Rejected.</summary>
        public string ModerationStatus { get; set; } = string.Empty;

        public string? ModerationNote { get; set; }
        public bool IsDeleted { get; set; }
        public DateTime CreatedDate { get; set; }

        public decimal Goal { get; set; }
        public decimal Committed { get; set; }
        public decimal Funded { get; set; }
        public int CommittedInvestors { get; set; }
        public int FundedInvestors { get; set; }

        /// <summary>Open reports against this venture.</summary>
        public int OpenReports { get; set; }
    }

    public class AdminUserReportsDto
    {
        /// <summary>Reports filed against ventures this person owns.</summary>
        public int AgainstThemOpen { get; set; }

        public int AgainstThemTotal { get; set; }

        /// <summary>Reports this person filed about somebody else.</summary>
        public int FiledByThemTotal { get; set; }

        public List<AdminUserReportItemDto> Recent { get; set; } = new();
    }

    public class AdminUserReportItemDto
    {
        public int Id { get; set; }
        public int ProjectId { get; set; }
        public string ProjectName { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }

        /// <summary>True when this person filed it, false when it was filed about them.</summary>
        public bool FiledByThem { get; set; }
    }

    public class AdminUserDealDto
    {
        public int InvestmentId { get; set; }
        public int ProjectId { get; set; }
        public string ProjectName { get; set; } = string.Empty;

        /// <summary>The other person in the relationship, named from this account's side.</summary>
        public string CounterpartyName { get; set; } = string.Empty;

        public int? CounterpartyId { get; set; }

        /// <summary>investor | founder — which side this account is on.</summary>
        public string Side { get; set; } = string.Empty;

        /// <summary>The commitment. Never the amount received.</summary>
        public decimal Amount { get; set; }

        /// <summary>Settled across every tranche, from FundingMath.</summary>
        public decimal Settled { get; set; }

        public string Status { get; set; } = string.Empty;
        public string Stage { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public DateTime? StageUpdatedAt { get; set; }
    }

    public class AdminUserPaymentsDto
    {
        public decimal SettledTotal { get; set; }
        public decimal RefundedTotal { get; set; }
        public int SucceededCount { get; set; }
        public int FailedCount { get; set; }
        public int RefundedCount { get; set; }
        public List<AdminUserTransactionDto> Recent { get; set; } = new();
    }

    public class AdminUserTransactionDto
    {
        public int Id { get; set; }
        public string Reference { get; set; } = string.Empty;
        public int ProjectId { get; set; }
        public string ProjectName { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "USD";
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAtUtc { get; set; }
        public DateTime? SucceededAtUtc { get; set; }
        public DateTime? RefundedAtUtc { get; set; }
        public string? RefundReason { get; set; }
        public string? FailureMessage { get; set; }
    }

    public class AdminUserAuditDto
    {
        public int Id { get; set; }
        public string AdminName { get; set; } = string.Empty;
        public string Action { get; set; } = string.Empty;
        public string? Details { get; set; }
        public DateTime CreatedAtUtc { get; set; }
    }
}
