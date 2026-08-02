using System.ComponentModel.DataAnnotations;

namespace MyAppApi.Data.Models
{
    /// <summary>
    /// The founder's call for the agreed money — "Request Funds" in the interface.
    /// <para>
    /// This is the step that was missing. An approved <see cref="Investment"/> means the
    /// founder accepted the relationship; it never meant an amount had been settled on,
    /// and it certainly never meant money arrived. The pipeline puts four stages of
    /// diligence between approval and agreement, and only after those does a founder
    /// know what the number actually is. A request carries that final number.
    /// </para>
    /// <para>
    /// It is deliberately NOT a column on the investment. The amount here can differ
    /// from what the investor originally asked for, a request can be cancelled and
    /// re-issued, and each one may collect several payment attempts — none of which a
    /// pair of columns on the relationship row could represent honestly.
    /// </para>
    /// </summary>
    public class FundingRequest
    {
        public int Id { get; set; }

        /// <summary>Human-quotable reference, e.g. "VST-FR-2026-000042".</summary>
        [Required]
        [StringLength(32)]
        public string Reference { get; set; } = string.Empty;

        public int InvestmentId { get; set; }
        public Investment Investment { get; set; } = null!;

        /// <summary>
        /// Denormalised from the investment so every founder/admin funding query is a
        /// flat scan instead of a three-level join. These rows are immutable financial
        /// records — the copy cannot drift because nothing ever moves a request to a
        /// different venture.
        /// </summary>
        public int ProjectId { get; set; }

        public int InvestorId { get; set; }

        /// <summary>The founder who issued it. Kept for the audit trail.</summary>
        public int RequestedByUserId { get; set; }

        /// <summary>
        /// The final agreed amount — the founder's number, not the investor's opening
        /// one. Gross: platform fee comes out of the founder's proceeds, never on top
        /// of what the investor pays.
        /// </summary>
        public decimal Amount { get; set; }

        [Required]
        [StringLength(3)]
        public string Currency { get; set; } = "USD";

        /// <summary>Open | Paid | Cancelled | Expired</summary>
        [Required]
        [StringLength(16)]
        public string Status { get; set; } = FundingRequestStatus.Open;

        /// <summary>Why it stopped being open, when the status is not Open or Paid.</summary>
        [StringLength(200)]
        public string? ClosedReason { get; set; }

        /// <summary>A short message from the founder shown to the investor with the ask.</summary>
        [StringLength(500)]
        public string? Note { get; set; }

        public DateTime CreatedAtUtc { get; set; }

        /// <summary>
        /// A request that stays open forever holds capacity in a round that may never
        /// be filled. The sweeper closes it and releases the room.
        /// </summary>
        public DateTime ExpiresAtUtc { get; set; }

        public DateTime? ClosedAtUtc { get; set; }

        /// <summary>Set when a payment attempt against this request succeeds.</summary>
        public DateTime? PaidAtUtc { get; set; }

        public ICollection<PaymentTransaction> Transactions { get; set; } = new List<PaymentTransaction>();
    }

    public static class FundingRequestStatus
    {
        /// <summary>Issued and awaiting payment. At most one per investment.</summary>
        public const string Open = "Open";

        /// <summary>A payment attempt succeeded. Terminal.</summary>
        public const string Paid = "Paid";

        /// <summary>Withdrawn by the founder, or voided by a round closing. Terminal.</summary>
        public const string Cancelled = "Cancelled";

        /// <summary>Nobody paid it in time. Terminal.</summary>
        public const string Expired = "Expired";

        public static readonly string[] All = { Open, Paid, Cancelled, Expired };

        /// <summary>Statuses that still hold a claim on the round's remaining capacity.</summary>
        public static bool IsLive(string status) => status == Open;
    }
}
