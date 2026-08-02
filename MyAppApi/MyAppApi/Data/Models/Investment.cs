using System.ComponentModel.DataAnnotations;

namespace MyAppApi.Data.Models
{
    public class Investment
    {
        public int Id { get; set; }
        public decimal Amount { get; set; }
        public DateTime Date { get; set; }

        // Support requires the innovator's approval before it counts toward funding.
        // "Pending" until approved; only "Approved" investments raise the amount.
        public string Status { get; set; } = "Pending";

        // How the investor asked to be reached (method + value, e.g. "Email: a@b.com"),
        // captured at support time so the founder can actually follow up after approving.
        public string? ContactInfo { get; set; }

        // Relationship pipeline stage — distinct from Status, which is the funding
        // gate ("Approved" is the only value that counts toward a project's total).
        // Stage tracks what is actually happening between founder and investor:
        // New → Reviewing → Approved → Contacted → InDiscussion → Committed → Closed
        // (or Declined). Declining sets Stage+Status to "Declined" rather than
        // deleting the row, so the relationship history survives.
        [StringLength(20)]
        public string Stage { get; set; } = "New";

        public DateTime? StageUpdatedAt { get; set; }

        // Private working notes — each side only ever reads its own.
        [StringLength(2000)]
        public string? FounderNote { get; set; }

        [StringLength(2000)]
        public string? InvestorNote { get; set; }

        [StringLength(500)]
        public string? DeclinedReason { get; set; }

        public int? InvestorId { get; set; }
        public Investor? Investor { get; set; }

        public int ProjectId { get; set; }
        public Project Project { get; set; }

        // The money side of the relationship. "Approved" above is the founder accepting
        // the investor; it has never meant an amount was agreed or that anything moved.
        // A funding request is the founder asking for the settled number, and only a
        // succeeded transaction under one makes this relationship funded capital.
        public ICollection<FundingRequest> FundingRequests { get; set; } = new List<FundingRequest>();
    }
}
