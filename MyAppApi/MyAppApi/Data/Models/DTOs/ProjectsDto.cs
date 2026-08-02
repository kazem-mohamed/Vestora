namespace MyAppApi.Data.Models.DTOs
{
    public class ProjectsDto
    {
        public int Id { get; set; }

        public string Name { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        public string? VideoUrl { get; set; }

        public string? Topic { get; set; }

        public string? Category { get; set; }

        public string? Industry { get; set; }

        public string? Location { get; set; }

        public decimal InvestmentNeeded { get; set; }

        /// <summary>
        /// Money that actually settled, in the simulation. Formerly the sum of approved
        /// commitments, which meant every "raised" figure in the product was reporting
        /// intentions as cash. It now carries the same value as <see cref="FundedAmount"/>
        /// and is kept only so older callers do not read zero.
        /// </summary>
        public decimal RaisedAmount { get; set; }

        /// <summary>Settled payments. The one figure that may be called funded.</summary>
        public decimal FundedAmount { get; set; }

        /// <summary>Founder-approved commitments, paid or not. Always ≥ FundedAmount.</summary>
        public decimal CommittedAmount { get; set; }

        /// <summary>Requests still awaiting the founder's decision.</summary>
        public decimal InterestAmount { get; set; }

        /// <summary>Investors whose money arrived.</summary>
        public int FundedInvestorCount { get; set; }

        public string ModerationStatus { get; set; } = string.Empty;

        /// <summary>Admin's reason when a listing is rejected — shown to the owner.</summary>
        public string? ModerationNote { get; set; }

        /// <summary>Founder-controlled: Active | Paused | Closed.</summary>
        public string LifecycleStatus { get; set; } = string.Empty;

        /// <summary>
        /// Set once the round is closed. Non-null means this listing has become a
        /// record of what happened rather than an open ask — the founder's own screens
        /// need it to stop offering "close the round" on a round already closed.
        /// </summary>
        public DateTime? RoundClosedAtUtc { get; set; }

        /// <summary>Completed | PartiallyRaised | Withdrawn — stated by the founder.</summary>
        public string? RoundOutcome { get; set; }

        public string? RoundClosingNote { get; set; }

        /// <summary>
        /// Support requests still awaiting the founder's decision.
        /// <para>
        /// NumberOfInvestors counts approved backers only, so the founder's own venture
        /// list had no way to show what was still waiting on them — and closing a round
        /// declines exactly these, which they need to know before confirming.
        /// </para>
        /// </summary>
        public int PendingRequestsCount { get; set; }

        public string? Stage { get; set; }

        public decimal? Valuation { get; set; }

        public decimal? EquityOffered { get; set; }

        public string? UseOfFunds { get; set; }

        public int OwnerId { get; set; }

        public string OwnerName { get; set; } = string.Empty;

        public int NumberOfInvestors { get; set; }

        public int TotalInteractions { get; set; }

        public string Status { get; set; } = string.Empty;

        public int CommentsCount { get; set; }

        public List<int> ImageIds { get; set; } = new();

        public List<CommentsDto> Comments { get; set; } = new();

        /// <summary>
        /// Facts about this listing that Vestora can actually prove, for the person
        /// deciding whether to engage with it.
        /// <para>
        /// These were previously computed only inside the owner-only insights endpoint,
        /// which meant the one audience they exist for — a prospective backer — could
        /// never see them. Every entry is a real count or a real review event; nothing
        /// here is a rating, a score, or a claim that the business was audited.
        /// </para>
        /// </summary>
        public List<TrustSignalDto> TrustSignals { get; set; } = new();
    }

    public class CommentsDto
    {
        public int Id { get; set; }

        public string Content { get; set; } = string.Empty;

        public DateTime CreatedDate { get; set; }

        public int UserId { get; set; }

        public string UserName { get; set; } = string.Empty;

        public List<ReplysDto> Replies { get; set; } = new();
    }

    public class ReplysDto
    {
        public int Id { get; set; }

        public string Content { get; set; } = string.Empty;

        public DateTime CreatedDate { get; set; }

        public int UserId { get; set; }

        public string UserName { get; set; } = string.Empty;
    }
}
