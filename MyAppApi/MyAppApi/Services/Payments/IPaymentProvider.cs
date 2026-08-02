namespace MyAppApi.Services.Payments
{
    /// <summary>
    /// The seam between Vestora's funding domain and whoever is pretending to move the
    /// money.
    /// <para>
    /// Deliberately narrow. Everything that matters — the state machine, the fee
    /// snapshot, idempotency, funding totals, notifications, the audit trail — lives in
    /// <see cref="PaymentService"/> and is identical whichever adapter is installed. An
    /// adapter opens a checkout, reports what a session did, and reverses a charge.
    /// It owns no domain rules, so the simulated path and the Stripe path cannot drift
    /// into two systems that behave differently.
    /// </para>
    /// </summary>
    public interface IPaymentProvider
    {
        /// <summary>"stripe" or "simulated" — stored on every transaction it handles.</summary>
        string Name { get; }

        /// <summary>Opens a hosted checkout. Vestora never sees or stores card data.</summary>
        Task<ProviderCheckout> CreateCheckoutAsync(ProviderCheckoutRequest request, CancellationToken ct = default);

        /// <summary>
        /// Asks the provider what actually happened to a session. This is the trusted
        /// path: the browser coming back to a success URL proves only that a browser
        /// came back.
        /// </summary>
        Task<ProviderPaymentResult> GetSessionResultAsync(string sessionId, CancellationToken ct = default);

        /// <summary>Reverses a settled payment in full. Partial refunds are not supported by design.</summary>
        Task<ProviderRefundResult> RefundAsync(string providerPaymentId, decimal amount, string currency, CancellationToken ct = default);
    }

    public record ProviderCheckoutRequest(
        string Reference,
        decimal Amount,
        string Currency,
        string VentureName,
        string Description,
        string SuccessUrl,
        string CancelUrl,
        string IdempotencyKey,
        IReadOnlyDictionary<string, string> Metadata,
        /// <summary>
        /// When Vestora stops considering this attempt live.
        /// <para>
        /// The provider must expire its own session no later than this. Without it the
        /// two clocks diverge — Vestora's sweeper writes the attempt off after its TTL
        /// while the provider's checkout stays payable for hours, and an investor who
        /// pays a written-off session hands over money against a transaction that has
        /// already reached a terminal state and can no longer record it.
        /// </para>
        /// </summary>
        DateTime ExpiresAtUtc);

    public record ProviderCheckout(string SessionId, string CheckoutUrl);

    /// <summary>What a provider says about a session, normalised across adapters.</summary>
    public record ProviderPaymentResult(
        ProviderPaymentState State,
        string? PaymentId,
        string? FailureCode,
        string? FailureMessage,
        string RawStatus);

    public enum ProviderPaymentState
    {
        /// <summary>Session opened, nobody has finished paying.</summary>
        Pending,

        /// <summary>Money taken, provider still finalising.</summary>
        Processing,

        /// <summary>Settled.</summary>
        Succeeded,

        /// <summary>Declined or errored.</summary>
        Failed,

        /// <summary>Investor backed out, or the session expired at the provider.</summary>
        Cancelled,
    }

    public record ProviderRefundResult(bool Succeeded, string? RefundId, string? FailureMessage);

    /// <summary>Raised when an adapter cannot reach its provider; surfaced as 503, never as a failed payment.</summary>
    public class PaymentProviderUnavailableException : Exception
    {
        public PaymentProviderUnavailableException(string message, Exception? inner = null)
            : base(message, inner) { }
    }
}
