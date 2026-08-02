namespace MyAppApi.Settings
{
    /// <summary>
    /// Payment configuration. Every value here describes a <b>sandbox</b> integration:
    /// Vestora is a graduation project, it is not licensed to move money, and no key in
    /// this section may ever be a live one.
    /// <para>
    /// Secrets belong in user-secrets or environment variables, never in
    /// <c>appsettings.json</c> — which is committed.
    /// </para>
    /// </summary>
    public class PaymentSettings
    {
        /// <summary>
        /// "stripe" or "simulated". Falls back to the simulator automatically when the
        /// Stripe secret is absent, so a machine with no keys — or no network — still
        /// runs the entire funding lifecycle.
        /// </summary>
        public string Provider { get; set; } = "simulated";

        /// <summary>Ledger currency. The whole app is priced in USD; changing this alone would not be enough.</summary>
        public string Currency { get; set; } = "USD";

        /// <summary>
        /// Platform fee in basis points (500 = 5%). Snapshotted onto every transaction
        /// at settlement, so changing it here never rewrites historical revenue.
        /// </summary>
        public int FeeRateBps { get; set; } = 500;

        /// <summary>
        /// How long an investor has to complete a checkout before it is swept.
        /// <para>
        /// Kept above 30 because Stripe refuses a session expiry closer than half an hour
        /// away; anything lower would leave Stripe's checkout outliving Vestora's attempt.
        /// </para>
        /// </summary>
        public int CheckoutTtlMinutes { get; set; } = 35;

        /// <summary>How long a founder's funding request stays open before it lapses.</summary>
        public int FundingRequestTtlDays { get; set; } = 14;

        /// <summary>Where the provider returns the investor. The app's own origin.</summary>
        public string ReturnBaseUrl { get; set; } = "http://localhost:3000";

        public StripeSettings Stripe { get; set; } = new();

        /// <summary>
        /// True unless someone has deliberately configured live keys — which this project
        /// must never do. Surfaced through the API so the interface can say so out loud.
        /// </summary>
        public bool IsSandbox =>
            !string.Equals(Provider, "stripe", StringComparison.OrdinalIgnoreCase) ||
            string.IsNullOrWhiteSpace(Stripe.SecretKey) ||
            Stripe.SecretKey.StartsWith("sk_test_", StringComparison.Ordinal);
    }

    public class StripeSettings
    {
        /// <summary>Must be an <c>sk_test_…</c> key. A live key is rejected at startup.</summary>
        public string? SecretKey { get; set; }

        /// <summary>Signing secret for webhook authenticity (<c>whsec_…</c>).</summary>
        public string? WebhookSecret { get; set; }

        public string ApiBase { get; set; } = "https://api.stripe.com";
    }
}
