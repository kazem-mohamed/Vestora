using System;
using System.Collections.Generic;

namespace MyAppApi.Data.Models.DTOs
{
    /// <summary>
    /// One step of the interest funnel. A distinct-people count, so the drop between
    /// two steps means something.
    /// </summary>
    public class FunnelStageDto
    {
        /// <summary>viewed · saved · requested · approved · in_discussion</summary>
        public string Key { get; set; } = string.Empty;
        public int Count { get; set; }
    }

    /// <summary>Which material is actually being read, per document.</summary>
    public class DocumentEngagementDto
    {
        public int DocumentId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Visibility { get; set; } = "Public";
        public int Opens { get; set; }
        public int DistinctReaders { get; set; }
    }

    /// <summary>
    /// An approved backer nobody has followed up with. Named for the problem rather
    /// than dressed up as a metric, because the founder's job here is to act.
    /// </summary>
    public class StalledRelationshipDto
    {
        public int InvestmentId { get; set; }
        public int InvestorId { get; set; }
        public string InvestorName { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Stage { get; set; } = string.Empty;
        public DateTime SinceUtc { get; set; }
        public int DaysWaiting { get; set; }
    }

    /// <summary>A fact the platform can prove, named for exactly what it is.</summary>
    public class TrustSignalDto
    {
        public string Key { get; set; } = string.Empty;
        /// <summary>Verified · History · SelfReported — how much the signal is worth.</summary>
        public string Level { get; set; } = string.Empty;
        public string? Value { get; set; }
    }

    public class VentureInsightsDto
    {
        public int ProjectId { get; set; }
        public string ProjectName { get; set; } = string.Empty;

        public int TotalViews { get; set; }
        public List<FunnelStageDto> Funnel { get; set; } = new();

        /// <summary>Relationships the founder declined. Kept out of the funnel — it is an outcome, not a stage.</summary>
        public int Declined { get; set; }

        public decimal CommittedAmount { get; set; }
        public decimal Goal { get; set; }

        public List<DocumentEngagementDto> Documents { get; set; } = new();
        public List<StalledRelationshipDto> Stalled { get; set; } = new();
        public List<TrustSignalDto> TrustSignals { get; set; } = new();

        public DateTime? RoundClosedAtUtc { get; set; }
        public string? RoundOutcome { get; set; }
    }
}
