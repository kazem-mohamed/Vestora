namespace MyAppApi.Data.Models.DTOs
{
    /// <summary>
    /// Aggregated investor dashboard payload — everything the overview needs in
    /// one request. All figures derive from real Investment/Bookmark/Message
    /// rows. Deliberately contains no "invested"/"returns" figures: Vestora
    /// moves no money, so only commitments exist.
    /// </summary>
    public class InvestorDashboardDto
    {
        public InvestorKpisDto Kpis { get; set; } = new();
        public List<PipelineItemDto> Pipeline { get; set; } = new();
        public List<BackedVentureDto> Portfolio { get; set; } = new();
        public List<AllocationSliceDto> ByIndustry { get; set; } = new();
        public List<AllocationSliceDto> ByStage { get; set; } = new();
        public List<TimePointDto> CommitmentsOverTime { get; set; } = new();

        /// <summary>Cumulative settled capital by month — the honest portfolio curve.</summary>
        public List<TimePointDto> FundedOverTime { get; set; } = new();

        public List<InvestorActivityDto> RecentActivity { get; set; } = new();
        public int WatchlistCount { get; set; }
    }

    /// <summary>
    /// The investor's four bands, in the order money travels through them.
    /// <para>
    /// Nothing here is called "invested" until a payment settled. That word was
    /// previously attached to approved commitments, which meant the portfolio told an
    /// investor they had invested money they had not sent.
    /// </para>
    /// </summary>
    public class InvestorKpisDto
    {
        /// <summary>Requests awaiting a founder decision.</summary>
        public int PendingCount { get; set; }
        public double PendingAmount { get; set; }

        /// <summary>Founder-approved commitments (still not money moved).</summary>
        public int ApprovedCount { get; set; }
        public double ApprovedAmount { get; set; }

        /// <summary>The founder has asked for the money and it has not been paid. Actionable.</summary>
        public int PaymentDueCount { get; set; }
        public double PaymentDueAmount { get; set; }

        /// <summary>Settled payments. The only band that may be called invested.</summary>
        public int FundedCount { get; set; }
        public double FundedAmount { get; set; }

        /// <summary>Ventures with at least one settled payment.</summary>
        public int VenturesFunded { get; set; }

        public int VenturesBacked { get; set; }
        public int WatchlistCount { get; set; }
        public int UnreadMessages { get; set; }
        public int DeclinedCount { get; set; }

        public double RefundedAmount { get; set; }
        public int FailedPaymentCount { get; set; }
    }

    /// <summary>One relationship in the investor's pipeline.</summary>
    public class PipelineItemDto
    {
        public int InvestmentId { get; set; }
        public int ProjectId { get; set; }
        public string ProjectName { get; set; } = string.Empty;
        public string? Category { get; set; }
        public int FounderId { get; set; }
        public string FounderName { get; set; } = string.Empty;
        public double Amount { get; set; }
        public string Stage { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public DateTime? StageUpdatedAt { get; set; }
        public string? InvestorNote { get; set; }
        public string? DeclinedReason { get; set; }
        public int? CoverImageId { get; set; }

        // ---- Money, alongside the relationship stage rather than mixed into it ----

        /// <summary>Requested | Committed | PaymentDue | Processing | Funded | Refunded | Declined.</summary>
        public string FundingState { get; set; } = "Requested";

        /// <summary>Set when a funding request is open — this is what makes the row actionable.</summary>
        public int? FundingRequestId { get; set; }

        /// <summary>The agreed amount, which may differ from the amount originally requested.</summary>
        public double? AgreedAmount { get; set; }

        public DateTime? FundingRequestExpiresAt { get; set; }

        /// <summary>Settled amount, when this relationship has been funded.</summary>
        public double? FundedAmount { get; set; }

        public DateTime? FundedAt { get; set; }

        /// <summary>Set when the last attempt failed and the request is still open — a retry is available.</summary>
        public bool CanRetry { get; set; }
    }

    /// <summary>A venture the investor has an approved commitment in.</summary>
    public class BackedVentureDto
    {
        public int ProjectId { get; set; }
        public string ProjectName { get; set; } = string.Empty;
        public string? Category { get; set; }
        public string? Stage { get; set; }
        public int FounderId { get; set; }
        public string FounderName { get; set; } = string.Empty;
        public double MyCommitment { get; set; }

        /// <summary>What this investor actually paid into the venture.</summary>
        public double MyFunded { get; set; }

        /// <summary>Open ask against this investor for this venture, if any.</summary>
        public double MyPaymentDue { get; set; }

        public double Goal { get; set; }
        public double TotalCommitted { get; set; }

        /// <summary>Settled capital across all investors — the venture's real progress.</summary>
        public double TotalFunded { get; set; }

        public int? CoverImageId { get; set; }
        /// <summary>Most recent founder update, so the investor sees momentum.</summary>
        public string? LatestUpdateTitle { get; set; }
        public DateTime? LatestUpdateDate { get; set; }
    }

    public class AllocationSliceDto
    {
        public string Label { get; set; } = string.Empty;
        public double Amount { get; set; }
        public int Count { get; set; }
    }

    public class InvestorActivityDto
    {
        /// <summary>commitment | approved | declined | update | milestone</summary>
        public string Type { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public int? ProjectId { get; set; }
        public string? ProjectName { get; set; }
        public double? Amount { get; set; }
        public string? Text { get; set; }
    }
}
