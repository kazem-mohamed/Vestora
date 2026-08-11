using System.ComponentModel.DataAnnotations;

namespace MyAppApi.Data.Models
{
    /// <summary>
    /// The terms both sides say they have agreed to.
    /// <para>
    /// <see cref="PipelineStages.Committed"/> was documented as "both sides agreed terms
    /// off-platform" — which meant the single most consequential moment in the product
    /// happened somewhere the product could not see, and Vestora recorded only that
    /// somebody had ticked a box claiming it had. Every number after that point, the
    /// funding request included, rested on an agreement with no text.
    /// </para>
    /// <para>
    /// This is that text. It is not a contract and does not pretend to be one: Vestora
    /// holds no signatures and enforces nothing. It is a written statement of what two
    /// people believe they agreed, which each of them accepted explicitly, and which
    /// cannot be edited afterwards without both accepting again.
    /// </para>
    /// <para>
    /// Rows are immutable once accepted. Renegotiation supersedes rather than edits, so
    /// the sequence of what was proposed and by whom survives — the same rule the
    /// payment attempts follow, for the same reason.
    /// </para>
    /// </summary>
    public class TermSheet
    {
        public int Id { get; set; }

        public int InvestmentId { get; set; }
        public Investment Investment { get; set; } = null!;

        /// <summary>Which revision of the terms this is, within one relationship: 1, 2, 3…</summary>
        public int Version { get; set; }

        // ---- The terms ----

        /// <summary>The money, gross. The funding request that follows must match it.</summary>
        public decimal Amount { get; set; }

        [Required]
        [StringLength(3)]
        public string Currency { get; set; } = "USD";

        /// <summary>Equity offered, as a percentage. Null when the deal is not equity.</summary>
        public decimal? EquityPct { get; set; }

        /// <summary>Pre-money valuation, when one was agreed.</summary>
        public decimal? Valuation { get; set; }

        [StringLength(1000)]
        public string? UseOfFunds { get; set; }

        /// <summary>Anything the structured fields cannot carry — board seats, tranching, vesting.</summary>
        [StringLength(2000)]
        public string? OtherTerms { get; set; }

        // ---- Agreement ----

        /// <summary>Proposed · Accepted · Declined · Superseded.</summary>
        [Required]
        [StringLength(16)]
        public string Status { get; set; } = TermSheetStatus.Proposed;

        public int ProposedByUserId { get; set; }

        /// <summary>
        /// Both sides accept separately, and the sheet is agreed only when both have.
        /// One party marking it agreed on behalf of the pair is exactly the claim this
        /// entity exists to stop the product making.
        /// </summary>
        public DateTime? FounderAcceptedAtUtc { get; set; }
        public DateTime? InvestorAcceptedAtUtc { get; set; }

        /// <summary>When the second acceptance landed — the moment the terms became agreed.</summary>
        public DateTime? AgreedAtUtc { get; set; }

        [StringLength(500)]
        public string? DeclinedReason { get; set; }

        public DateTime CreatedAtUtc { get; set; }

        public bool IsAgreed => FounderAcceptedAtUtc != null && InvestorAcceptedAtUtc != null;
    }

    public static class TermSheetStatus
    {
        /// <summary>On the table, awaiting one or both acceptances.</summary>
        public const string Proposed = "Proposed";

        /// <summary>Both sides accepted. Terminal — renegotiation creates a new version.</summary>
        public const string Accepted = "Accepted";

        /// <summary>One side said no, with a reason. Terminal.</summary>
        public const string Declined = "Declined";

        /// <summary>Replaced by a later version before it was settled. Terminal.</summary>
        public const string Superseded = "Superseded";

        public static readonly string[] All = { Proposed, Accepted, Declined, Superseded };

        public static bool IsLive(string status) => status == Proposed;
    }
}
