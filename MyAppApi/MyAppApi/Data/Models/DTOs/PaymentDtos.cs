namespace MyAppApi.Data.Models.DTOs
{
    /// <summary>
    /// A founder's ask for the agreed money, with the economics spelled out.
    /// <para>
    /// Both sides receive the fee breakdown. Hiding what the platform takes from the
    /// person it is taken from would be indefensible, and the investor needs to know the
    /// fee comes out of the founder's side rather than being added to their own payment.
    /// </para>
    /// </summary>
    public class FundingRequestDto
    {
        public int Id { get; set; }
        public string Reference { get; set; } = string.Empty;
        public int InvestmentId { get; set; }
        public int ProjectId { get; set; }
        public int InvestorId { get; set; }

        public decimal Amount { get; set; }
        public string Currency { get; set; } = "USD";

        /// <summary>Open | Paid | Cancelled | Expired</summary>
        public string Status { get; set; } = string.Empty;

        public string? Note { get; set; }
        public string? ClosedReason { get; set; }

        public DateTime CreatedAtUtc { get; set; }
        public DateTime ExpiresAtUtc { get; set; }
        public DateTime? PaidAtUtc { get; set; }

        // ---- Economics ----
        public int FeeRateBps { get; set; }
        public decimal EstimatedFee { get; set; }
        public decimal EstimatedNetProceeds { get; set; }

        // ---- Counter-offer ----
        public decimal? CounterAmount { get; set; }
        public string? CounterNote { get; set; }
        public DateTime? CounterAtUtc { get; set; }

        /// <summary>Proposed | Accepted | Declined — null when nobody countered.</summary>
        public string? CounterStatus { get; set; }

        /// <summary>The ask this one replaced, when it was issued to accept a counter.</summary>
        public int? SupersedesRequestId { get; set; }

        /// <summary>The agreed terms this ask calls in, when the relationship has any.</summary>
        public int? TermSheetId { get; set; }

        /// <summary>Every attempt made against this request, oldest first.</summary>
        public List<PaymentTransactionDto> Attempts { get; set; } = new();
    }

    /// <summary>One payment attempt. The receipt is built from this when it succeeded.</summary>
    public class PaymentTransactionDto
    {
        public int Id { get; set; }
        public string Reference { get; set; } = string.Empty;
        public int FundingRequestId { get; set; }
        public string? FundingRequestReference { get; set; }
        public int InvestmentId { get; set; }
        public int ProjectId { get; set; }
        public string ProjectName { get; set; } = string.Empty;
        public int? CoverImageId { get; set; }
        public int InvestorId { get; set; }
        public string InvestorName { get; set; } = string.Empty;
        public int FounderId { get; set; }
        public string FounderName { get; set; } = string.Empty;

        public int AttemptNumber { get; set; }

        public decimal Amount { get; set; }
        public string Currency { get; set; } = "USD";
        public int FeeRateBps { get; set; }
        public decimal FeeAmount { get; set; }
        public decimal NetToFounder { get; set; }

        public string Status { get; set; } = string.Empty;
        public string Provider { get; set; } = string.Empty;
        public string? ProviderPaymentId { get; set; }
        public string? ProviderRefundId { get; set; }

        /// <summary>Only present while the attempt is still live.</summary>
        public string? CheckoutUrl { get; set; }

        public string? FailureCode { get; set; }
        public string? FailureMessage { get; set; }
        public string? CancelReason { get; set; }
        public string? RefundReason { get; set; }

        public DateTime CreatedAtUtc { get; set; }
        public DateTime ExpiresAtUtc { get; set; }
        public DateTime? SucceededAtUtc { get; set; }
        public DateTime? FailedAtUtc { get; set; }
        public DateTime? CancelledAtUtc { get; set; }
        public DateTime? RefundedAtUtc { get; set; }

        /// <summary>Always true in this project. Carried to the client so the interface can say so.</summary>
        public bool IsSandbox { get; set; } = true;
    }

    /// <summary>Where to send the investor, and what they are about to pay.</summary>
    public class CheckoutSessionDto
    {
        public int TransactionId { get; set; }
        public string Reference { get; set; } = string.Empty;
        public string CheckoutUrl { get; set; } = string.Empty;
        public string Provider { get; set; } = string.Empty;
        public bool IsSandbox { get; set; } = true;
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "USD";

        /// <summary>True when an existing live attempt was handed back rather than a new one opened.</summary>
        public bool Resumed { get; set; }
    }

    // ---- Inputs ----

    public class CreateFundingRequestInput
    {
        public decimal Amount { get; set; }
        public string? Note { get; set; }
    }

    public class CancelFundingRequestInput
    {
        public string? Reason { get; set; }
    }

    public class RefundInput
    {
        public string? Reason { get; set; }
    }

    public class CounterOfferInput
    {
        public decimal Amount { get; set; }
        public string? Note { get; set; }
    }

    public class AnswerCounterInput
    {
        public bool Accept { get; set; }
        public string? Note { get; set; }
    }

    // ==================================================================
    //  Reconciliation — where the system and the provider disagreed
    // ==================================================================

    /// <summary>
    /// One confirmation that changed nothing, with enough of its transaction attached
    /// to be judged without opening another screen.
    /// </summary>
    public class ReconciliationEventDto
    {
        public int Id { get; set; }
        public string Provider { get; set; } = string.Empty;
        public string ProviderEventId { get; set; } = string.Empty;
        public string EventType { get; set; } = string.Empty;

        /// <summary>webhook | verify | sweep | admin — how the confirmation reached us.</summary>
        public string Source { get; set; } = string.Empty;

        public string? Outcome { get; set; }
        public DateTime ReceivedAtUtc { get; set; }

        /// <summary>
        /// True when the provider reported a payment against an attempt Vestora had
        /// already closed. Everything else in this list is bookkeeping; this is money.
        /// </summary>
        public bool IsConflict { get; set; }

        public DateTime? ReviewedAtUtc { get; set; }
        public string? ReviewNote { get; set; }

        // ---- The transaction it belongs to ----
        public int? TransactionId { get; set; }
        public string? TransactionReference { get; set; }
        public string? TransactionStatus { get; set; }
        public decimal? Amount { get; set; }
        public string? Currency { get; set; }
        public int? InvestmentId { get; set; }
        public string? ProjectName { get; set; }
        public string? InvestorName { get; set; }
    }

    public class ReconciliationDto
    {
        public List<ReconciliationEventDto> Items { get; set; } = new();
        public int TotalCount { get; set; }

        /// <summary>Unreviewed conflicts across the whole queue, not just this page.</summary>
        public int OpenConflicts { get; set; }

        public int Page { get; set; }
        public int PageSize { get; set; }
    }

    public class ReviewEventInput
    {
        public string? Note { get; set; }
    }

    /// <summary>Drives the sandbox checkout surface: succeed, decline, or walk away.</summary>
    public class SandboxOutcomeInput
    {
        /// <summary>success | failure | cancel</summary>
        public string Outcome { get; set; } = "success";
    }

    // ==================================================================
    //  Investor payments surface
    // ==================================================================

    public class InvestorPaymentsDto
    {
        public InvestorPaymentSummaryDto Summary { get; set; } = new();

        /// <summary>Requests waiting on the investor — the actionable band, always first.</summary>
        public List<FundingRequestDto> Due { get; set; } = new();

        /// <summary>Every attempt ever made, newest first.</summary>
        public List<PaymentTransactionDto> Transactions { get; set; } = new();

        public bool IsSandbox { get; set; } = true;
        public string Provider { get; set; } = string.Empty;
    }

    public class InvestorPaymentSummaryDto
    {
        public decimal FundedTotal { get; set; }
        public int FundedCount { get; set; }
        public decimal PaymentDueTotal { get; set; }
        public int PaymentDueCount { get; set; }
        public decimal CommittedTotal { get; set; }
        public decimal RefundedTotal { get; set; }
        public int FailedCount { get; set; }
        public string Currency { get; set; } = "USD";
    }

    // ==================================================================
    //  Admin revenue
    // ==================================================================

    public class AdminRevenueDto
    {
        public AdminRevenueKpisDto Kpis { get; set; } = new();

        /// <summary>Gross volume and platform revenue by month, cumulative-free (per period).</summary>
        public List<RevenuePointDto> RevenueOverTime { get; set; } = new();

        public List<TopEarningVentureDto> TopVentures { get; set; } = new();

        public bool IsSandbox { get; set; } = true;
        public string Provider { get; set; } = string.Empty;
        public int FeeRateBps { get; set; }
        public string Currency { get; set; } = "USD";
    }

    public class AdminRevenueKpisDto
    {
        /// <summary>Settled money that stayed settled.</summary>
        public decimal GrossTransactionVolume { get; set; }

        /// <summary>Fees on money that stayed settled. Refunds take their fee with them.</summary>
        public decimal PlatformRevenue { get; set; }

        public decimal NetToFounders { get; set; }

        public int SucceededCount { get; set; }
        public int FailedCount { get; set; }
        public int CancelledCount { get; set; }
        public int RefundedCount { get; set; }
        public decimal RefundedAmount { get; set; }

        /// <summary>Succeeded ÷ (succeeded + failed). Cancellations are not failures.</summary>
        public double SuccessRate { get; set; }

        public decimal AverageTransactionValue { get; set; }

        /// <summary>Attempts still live past their expiry — an operational signal, not an accounting one.</summary>
        public int StuckCount { get; set; }

        public int OpenFundingRequests { get; set; }
        public decimal OpenFundingAmount { get; set; }
    }

    public class RevenuePointDto
    {
        public string Label { get; set; } = string.Empty;
        public decimal Gross { get; set; }
        public decimal Revenue { get; set; }
        public int Count { get; set; }
    }

    public class TopEarningVentureDto
    {
        public int ProjectId { get; set; }
        public string ProjectName { get; set; } = string.Empty;
        public int FounderId { get; set; }
        public string FounderName { get; set; } = string.Empty;
        public decimal Gross { get; set; }
        public decimal Revenue { get; set; }
        public int Transactions { get; set; }
    }

    public class AdminTransactionRowDto : PaymentTransactionDto
    {
        public string? ProviderSessionId { get; set; }
        public int? RefundedByAdminId { get; set; }
    }
}
