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

        /// <summary>
        /// The agreed terms this ask is calling in, when the relationship has any.
        /// <para>
        /// Optional because a relationship can be funded without one — that was the only
        /// way to do it before term sheets existed, and existing rows must not become
        /// invalid retroactively. When it is set, the amounts are checked against each
        /// other: an ask that does not match what was agreed is not a call on the
        /// agreement, it is a new proposal wearing its clothes.
        /// </para>
        /// </summary>
        public int? TermSheetId { get; set; }
        public TermSheet? TermSheet { get; set; }

        // ---- Counter-offer ----
        //
        // The founder names the number and the investor's only two options were to pay it
        // or to let it lapse in silence. Everything before this point in the product is
        // built for a conversation, and then the last step — the one about money — was a
        // take-it-or-leave-it. A counter is the investor's half of that sentence.
        //
        // It sits on the request rather than in its own table because it is a property of
        // one ask: at most one counter is live at a time, and accepting it ends the ask
        // it was made against.

        public decimal? CounterAmount { get; set; }

        [StringLength(500)]
        public string? CounterNote { get; set; }

        public DateTime? CounterAtUtc { get; set; }

        /// <summary>Proposed · Accepted · Declined — null when no counter was made.</summary>
        [StringLength(16)]
        public string? CounterStatus { get; set; }

        /// <summary>
        /// The ask this one replaced, when it was issued to accept a counter-offer.
        /// Amounts on a financial row are never rewritten, so accepting a counter closes
        /// the old request and opens a new one; this is the thread between them.
        /// </summary>
        public int? SupersedesRequestId { get; set; }

        public DateTime CreatedAtUtc { get; set; }

        /// <summary>
        /// A request that stays open forever holds capacity in a round that may never
        /// be filled. The sweeper closes it and releases the room.
        /// </summary>
        public DateTime ExpiresAtUtc { get; set; }

        /// <summary>
        /// How many expiry reminders have gone out, so the sweeper can send the next one
        /// without sending the last one again.
        /// <para>
        /// A count rather than a pair of timestamps: the reminders are a fixed ladder
        /// (three days out, then one), and what the sweeper needs to know is which rung
        /// it is on. Storing when each was sent would record something nothing reads.
        /// </para>
        /// </summary>
        public int RemindersSent { get; set; }

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

    public static class CounterOfferStatus
    {
        public const string Proposed = "Proposed";
        public const string Accepted = "Accepted";
        public const string Declined = "Declined";
    }
}
