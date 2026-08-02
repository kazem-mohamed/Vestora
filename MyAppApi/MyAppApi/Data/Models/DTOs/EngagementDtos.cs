using System.ComponentModel.DataAnnotations;

namespace MyAppApi.Data.Models.DTOs
{
    // ---- Analytics (F10) ----
    public class ProjectAnalyticsDto
    {
        public int Views { get; set; }
        public int UniqueVisitors { get; set; }
        public int Saves { get; set; }
        public int Comments { get; set; }
        public int Investors { get; set; }

        /// <summary>Investors whose payment settled.</summary>
        public int FundedInvestors { get; set; }

        /// <summary>Settled money. Was previously the sum of approvals under this name.</summary>
        public double Raised { get; set; }

        /// <summary>Approved commitments — the promises behind the money.</summary>
        public double Committed { get; set; }

        /// <summary>Settled money less the platform fee.</summary>
        public double NetProceeds { get; set; }

        public double Goal { get; set; }
        public double ConversionRate { get; set; } // approved investors / unique visitors %
        public List<TimePointDto> ViewsOverTime { get; set; } = new(); // daily
        public List<TimePointDto> FundingOverTime { get; set; } = new(); // cumulative settled, monthly
        public List<TimePointDto> CommitmentsOverTime { get; set; } = new(); // cumulative committed, monthly
    }

    // ---- Endorsements (formerly 1–5 reviews) ----
    //
    // A venture is not a product with a star rating. What another investor can
    // usefully learn is whether this founder communicated, was straight about the
    // risks, and did what they said — each stated by someone who actually backed the
    // round. Discrete traits, never averaged into a headline score.
    public class EndorsementDto
    {
        public int Id { get; set; }
        public int InvestorId { get; set; }
        public string InvestorName { get; set; } = string.Empty;
        public bool HasAvatar { get; set; }

        public bool Communicative { get; set; }
        public bool Transparent { get; set; }
        public bool DeliveredOnPlan { get; set; }
        public bool WouldBackAgain { get; set; }

        public string? Content { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }

        /// <summary>
        /// True for rows written under the old star system, which carry no traits.
        /// Surfaced so the UI can label them honestly rather than showing four empty
        /// checkboxes as though the endorser declined every one.
        /// </summary>
        public bool IsLegacy { get; set; }
    }

    public class EndorsementSummaryDto
    {
        public int Count { get; set; }

        // Tallies per trait. A count out of N is checkable; an average out of 5 is not.
        public int CommunicativeCount { get; set; }
        public int TransparentCount { get; set; }
        public int DeliveredOnPlanCount { get; set; }
        public int WouldBackAgainCount { get; set; }

        public bool CanEndorse { get; set; }
        public bool HasEndorsed { get; set; }
        public List<EndorsementDto> Items { get; set; } = new();
    }

    public class SubmitEndorsementDto
    {
        public bool Communicative { get; set; }
        public bool Transparent { get; set; }
        public bool DeliveredOnPlan { get; set; }
        public bool WouldBackAgain { get; set; }

        [StringLength(1500)]
        public string? Content { get; set; }
    }

    // ---- Global feed (F10) ----
    public class FeedItemDto
    {
        // new_project | update | investment | new_user | milestone
        public string Type { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public int? ProjectId { get; set; }
        public string? ProjectName { get; set; }
        public int? ActorId { get; set; }
        public string? ActorName { get; set; }
        public string? Text { get; set; }
    }
}
