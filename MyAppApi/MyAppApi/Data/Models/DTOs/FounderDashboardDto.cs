namespace MyAppApi.Data.Models.DTOs
{
    // Aggregated founder ("control room") dashboard payload — everything the
    // overview needs in a single request. All figures come from real data
    // (projects, investments, follows, comments, messages); nothing stubbed.
    public class FounderDashboardDto
    {
        public FounderKpisDto Kpis { get; set; } = new();

        /// <summary>Cumulative committed capital by month — the promises curve.</summary>
        public List<TimePointDto> FundingOverTime { get; set; } = new();

        /// <summary>
        /// Cumulative settled capital by month. Plotted against FundingOverTime, the gap
        /// between the two lines is the founder's most useful single reading: how much of
        /// what was agreed has actually turned into money.
        /// </summary>
        public List<TimePointDto> FundedOverTime { get; set; } = new();

        public List<VentureFundingDto> FundingByVenture { get; set; } = new();
        public ApprovedVsPendingDto ApprovedVsPending { get; set; } = new();

        /// <summary>Relationships with an open funding request — the founder's collection queue.</summary>
        public List<AwaitingPaymentDto> AwaitingPayment { get; set; } = new();
        public List<TimePointDto> FollowerGrowth { get; set; } = new();
        public List<TimePointDto> InvestorGrowth { get; set; } = new();
        public List<PendingApprovalDto> PendingApprovals { get; set; } = new();
        /// <summary>Every investor relationship, at any stage (declines included).</summary>
        public List<FounderPipelineItemDto> Pipeline { get; set; } = new();
        public List<TopVentureDto> TopVentures { get; set; } = new();
        public List<RecentCommentDto> RecentComments { get; set; } = new();
        public List<ActivityDto> RecentActivity { get; set; } = new();
    }

    /// <summary>
    /// The founder's money, in the four readings that are actually different things.
    /// <para>
    /// Interest is inbound attention. Committed is people who were accepted. Funded is
    /// what arrived. Net proceeds is what the founder keeps after the platform fee.
    /// Before payments existed the dashboard had one number for all four and called it
    /// committed; now that money can move, showing one number would mean showing the
    /// wrong one three times out of four.
    /// </para>
    /// </summary>
    public class FounderKpisDto
    {
        public int VenturesCount { get; set; }

        /// <summary>Ventures whose settled money covers the goal. Not "enough people said yes".</summary>
        public int FundedVenturesCount { get; set; }

        /// <summary>Ventures where commitments cover the goal but the money has not all landed.</summary>
        public int FullyCommittedVenturesCount { get; set; }

        /// <summary>Sum of approved commitments. Intent, with a person attached.</summary>
        public double TotalCommitted { get; set; }

        /// <summary>Settled payments. The only figure that may be called raised.</summary>
        public double TotalFunded { get; set; }

        /// <summary>Funded minus the platform fee — what the venture actually keeps.</summary>
        public double NetProceeds { get; set; }

        /// <summary>Fees Vestora has recognised on this founder's settled transactions.</summary>
        public double PlatformFees { get; set; }

        /// <summary>Agreed amounts with a funding request open and unpaid.</summary>
        public double AwaitingPayment { get; set; }
        public int AwaitingPaymentCount { get; set; }

        public double TotalGoal { get; set; }
        public int TotalInvestors { get; set; }

        /// <summary>Investors whose money arrived, as opposed to who were accepted.</summary>
        public int FundedInvestors { get; set; }

        public int PendingRequestsCount { get; set; }
        public double PendingRequestsAmount { get; set; }
        public int FollowersCount { get; set; }
        public int CommentsCount { get; set; }
        public int UnreadMessages { get; set; }

        /// <summary>Settled payments an admin has reversed.</summary>
        public double RefundedAmount { get; set; }
        public int RefundedCount { get; set; }

        /// <summary>Attempts that failed and have not been retried successfully.</summary>
        public int FailedPaymentCount { get; set; }
    }

    // A single point in a time series (month label + value).
    public class TimePointDto
    {
        public string Label { get; set; } = string.Empty; // "yyyy-MM"
        public double Value { get; set; }
    }

    public class VentureFundingDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;

        /// <summary>Settled money. Kept under the old name so charts keep working, with the honest value.</summary>
        public double Raised { get; set; }

        /// <summary>Approved commitments, drawn as the ghost layer behind Raised.</summary>
        public double Committed { get; set; }

        public double Goal { get; set; }
    }

    /// <summary>One relationship the founder has asked for money and not yet received it.</summary>
    public class AwaitingPaymentDto
    {
        public int FundingRequestId { get; set; }
        public string Reference { get; set; } = string.Empty;
        public int InvestmentId { get; set; }
        public int ProjectId { get; set; }
        public string ProjectName { get; set; } = string.Empty;
        public int InvestorId { get; set; }
        public string InvestorName { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public decimal NetProceeds { get; set; }
        public DateTime CreatedAtUtc { get; set; }
        public DateTime ExpiresAtUtc { get; set; }

        /// <summary>How many attempts the investor has made, so a stalling deal is visible.</summary>
        public int AttemptCount { get; set; }

        /// <summary>The most recent attempt's status, when there has been one.</summary>
        public string? LastAttemptStatus { get; set; }
    }

    public class ApprovedVsPendingDto
    {
        public int ApprovedCount { get; set; }
        public double ApprovedAmount { get; set; }
        public int PendingCount { get; set; }
        public double PendingAmount { get; set; }
    }

    // A pending support request the founder can approve/decline in-place.
    // NotificationId lets the UI reuse the existing approve/decline mutations.
    public class PendingApprovalDto
    {
        public int InvestmentId { get; set; }
        public int NotificationId { get; set; }
        public int ProjectId { get; set; }
        public string ProjectName { get; set; } = string.Empty;
        public int InvestorId { get; set; }
        public string InvestorName { get; set; } = string.Empty;
        public double Amount { get; set; }
        public DateTime Date { get; set; }
        // How the investor asked to be reached — surfaced so the founder can act
        // on an approval instead of the request going into a void.
        public string? ContactInfo { get; set; }
    }

    /// <summary>
    /// One investor relationship from the founder's side — the mirror of
    /// PipelineItemDto. Carries the contact details and the founder's private
    /// note so the whole follow-up lives in one row.
    /// </summary>
    public class FounderPipelineItemDto
    {
        public int InvestmentId { get; set; }
        public int NotificationId { get; set; }
        public int ProjectId { get; set; }
        public string ProjectName { get; set; } = string.Empty;
        public int InvestorId { get; set; }
        public string InvestorName { get; set; } = string.Empty;
        public double Amount { get; set; }
        public string Stage { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public DateTime? StageUpdatedAt { get; set; }
        public string? ContactInfo { get; set; }
        public string? FounderNote { get; set; }
        public string? DeclinedReason { get; set; }

        /// <summary>
        /// Who this investor is, in their own words, plus the cheque they write.
        /// The founder is deciding whether to take a conversation — a name and an
        /// email address alone is not enough to decide on.
        /// </summary>
        public string? InvestorThesis { get; set; }
        public decimal? InvestorTicketMin { get; set; }
        public decimal? InvestorTicketMax { get; set; }
        public string? InvestorIndustries { get; set; }
    }

    public class TopVentureDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Category { get; set; }

        /// <summary>Settled money.</summary>
        public double Raised { get; set; }

        /// <summary>Approved commitments, shown as the lighter reading beside it.</summary>
        public double Committed { get; set; }

        public double Goal { get; set; }
        public int Investors { get; set; }
        public int FundedInvestors { get; set; }

        /// <summary>Percentage of goal funded.</summary>
        public int Pct { get; set; }

        /// <summary>Percentage of goal committed. Always ≥ Pct.</summary>
        public int CommittedPct { get; set; }

        /// <summary>Funded | Fully Committed | Raising.</summary>
        public string Status { get; set; } = string.Empty;
    }

    public class RecentCommentDto
    {
        public int Id { get; set; }
        public int ProjectId { get; set; }
        public string ProjectName { get; set; } = string.Empty;
        public int UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public DateTime Date { get; set; }
    }

    // A unified recent-activity row (investment / comment / follow / update).
    public class ActivityDto
    {
        public string Type { get; set; } = string.Empty; // "investment" | "comment" | "follow" | "update"
        public DateTime Date { get; set; }
        public int? ProjectId { get; set; }
        public string? ProjectName { get; set; }
        public string? ActorName { get; set; }
        public double? Amount { get; set; }
        public string? Text { get; set; }
    }
}
