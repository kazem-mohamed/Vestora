using System.ComponentModel.DataAnnotations;

namespace MyAppApi.Data.Models
{
    /// <summary>
    /// One attempt to settle a <see cref="FundingRequest"/>.
    /// <para>
    /// An attempt, not a payment — the distinction is the whole design. A failed card
    /// is not an absence of history, it is a fact about what happened, so a retry
    /// creates a new row rather than resurrecting a dead one. Terminal rows are never
    /// rewritten. Three attempts against one request read as three attempts.
    /// </para>
    /// <para>
    /// Every economic figure is frozen onto the row at the moment it succeeds: the fee
    /// rate in basis points, the fee, the net. Changing the platform's rate next term
    /// must not silently rewrite what Vestora earned last term.
    /// </para>
    /// <para>
    /// All amounts here are simulated. The provider runs in test mode and no real funds
    /// move — see <c>PaymentSettings</c> and the sandbox disclosure carried through the API.
    /// </para>
    /// </summary>
    public class PaymentTransaction
    {
        public int Id { get; set; }

        /// <summary>Human-quotable reference shown on the receipt, e.g. "VST-2026-000123".</summary>
        [Required]
        [StringLength(32)]
        public string Reference { get; set; } = string.Empty;

        public int FundingRequestId { get; set; }
        public FundingRequest FundingRequest { get; set; } = null!;

        // Denormalised for flat querying — see the note on FundingRequest.
        public int InvestmentId { get; set; }
        public int ProjectId { get; set; }
        public int InvestorId { get; set; }

        /// <summary>Which attempt this is for its request: 1, 2, 3…</summary>
        public int AttemptNumber { get; set; }

        // ---- Money (frozen at creation, economics frozen at success) ----

        /// <summary>What the investor pays. Never altered after creation.</summary>
        public decimal Amount { get; set; }

        [Required]
        [StringLength(3)]
        public string Currency { get; set; } = "USD";

        /// <summary>
        /// The platform's rate in basis points at the moment this transaction settled
        /// (500 = 5%). Snapshotted, never read back from configuration.
        /// </summary>
        public int FeeRateBps { get; set; }

        /// <summary>Vestora's cut. Deducted from the founder's proceeds, not added to the investor's payment.</summary>
        public decimal FeeAmount { get; set; }

        /// <summary>Amount − fee. What the venture is credited with receiving.</summary>
        public decimal NetToFounder { get; set; }

        // ---- Lifecycle ----

        /// <summary>Initiated | Processing | Succeeded | Failed | Cancelled | Refunded</summary>
        [Required]
        [StringLength(16)]
        public string Status { get; set; } = PaymentStatus.Initiated;

        /// <summary>Which adapter handled it: "stripe" or "simulated".</summary>
        [Required]
        [StringLength(24)]
        public string Provider { get; set; } = string.Empty;

        /// <summary>The provider's checkout session id, used to verify server-side on return.</summary>
        [StringLength(255)]
        public string? ProviderSessionId { get; set; }

        /// <summary>The provider's payment/charge id once it exists — quoted on the receipt.</summary>
        [StringLength(255)]
        public string? ProviderPaymentId { get; set; }

        /// <summary>The provider's refund id, when one has been issued.</summary>
        [StringLength(255)]
        public string? ProviderRefundId { get; set; }

        /// <summary>Where the investor was sent to pay. Not persisted beyond the attempt's life.</summary>
        [StringLength(1000)]
        public string? CheckoutUrl { get; set; }

        [StringLength(64)]
        public string? FailureCode { get; set; }

        [StringLength(500)]
        public string? FailureMessage { get; set; }

        /// <summary>user_cancelled | abandoned | expired | round_closed — set when Cancelled.</summary>
        [StringLength(32)]
        public string? CancelReason { get; set; }

        public DateTime CreatedAtUtc { get; set; }

        /// <summary>An attempt nobody completes is swept to Cancelled after this.</summary>
        public DateTime ExpiresAtUtc { get; set; }

        public DateTime? SucceededAtUtc { get; set; }
        public DateTime? FailedAtUtc { get; set; }
        public DateTime? CancelledAtUtc { get; set; }
        public DateTime? RefundedAtUtc { get; set; }

        /// <summary>Which admin reversed it. Refunds are never self-service.</summary>
        public int? RefundedByAdminId { get; set; }

        [StringLength(300)]
        public string? RefundReason { get; set; }

        /// <summary>
        /// Optimistic concurrency guard. Two confirmations arriving at once — the
        /// browser's return-verify and the provider's webhook — must not both apply the
        /// funding side effects. The loser of the race sees a concurrency exception and
        /// treats it as success, because the winner already did the work.
        /// </summary>
        [Timestamp]
        public byte[]? RowVersion { get; set; }
    }

    /// <summary>
    /// The transaction state machine.
    /// <code>
    ///                       ┌────────► Failed     (terminal)
    ///                       │
    ///  Initiated ──► Processing ──► Succeeded ──► Refunded  (terminal)
    ///       │               │
    ///       └───────────────┴────► Cancelled     (terminal)
    /// </code>
    /// Terminal rows are immutable apart from the single Succeeded → Refunded step.
    /// A retry is always a new row.
    /// </summary>
    public static class PaymentStatus
    {
        /// <summary>Row created, checkout session opened, investor not back yet.</summary>
        public const string Initiated = "Initiated";

        /// <summary>The provider has the money in hand but has not finalised it.</summary>
        public const string Processing = "Processing";

        /// <summary>Settled. The only status that counts toward funded capital.</summary>
        public const string Succeeded = "Succeeded";

        /// <summary>Declined or errored. Terminal — retry means a new attempt.</summary>
        public const string Failed = "Failed";

        /// <summary>Abandoned, withdrawn, expired, or voided by a closing round.</summary>
        public const string Cancelled = "Cancelled";

        /// <summary>Reversed by an admin after settling. Terminal.</summary>
        public const string Refunded = "Refunded";

        public static readonly string[] All =
            { Initiated, Processing, Succeeded, Failed, Cancelled, Refunded };

        /// <summary>Statuses that still might become Succeeded — at most one per request.</summary>
        public static readonly string[] Active = { Initiated, Processing };

        public static bool IsActive(string status) =>
            status == Initiated || status == Processing;

        public static bool IsTerminal(string status) =>
            status == Succeeded || status == Failed || status == Cancelled || status == Refunded;
    }

    public static class PaymentCancelReason
    {
        public const string UserCancelled = "user_cancelled";
        public const string Abandoned = "abandoned";
        public const string Expired = "expired";
        public const string RoundClosed = "round_closed";
    }
}
