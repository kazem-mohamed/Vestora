using System.Collections.Concurrent;
using System.Security.Cryptography;
using Microsoft.Extensions.Options;
using MyAppApi.Settings;

namespace MyAppApi.Services.Payments
{
    /// <summary>
    /// A payment provider that runs entirely inside Vestora.
    /// <para>
    /// This is not a stub that returns success. It opens a session, holds it pending
    /// until somebody acts on it, and reports back exactly what a real adapter reports —
    /// which means it exercises the same state machine, the same idempotency, the same
    /// fee snapshot and the same reversal path as Stripe does. The only thing it does
    /// not do is talk to the internet.
    /// </para>
    /// <para>
    /// It exists because a graduation demonstration should not be able to fail because
    /// a room's Wi-Fi did. It is also the honest way to show a declined payment on
    /// demand: the checkout page it drives lets the presenter choose the outcome.
    /// </para>
    /// </summary>
    public class SimulatedPaymentProvider : IPaymentProvider
    {
        public const string ProviderName = "simulated";

        private readonly PaymentSettings _settings;
        private readonly ILogger<SimulatedPaymentProvider> _logger;

        /// <summary>
        /// Session outcomes, in memory. A restart loses pending sessions, which the
        /// sweeper then cancels as abandoned — the same thing that happens when a real
        /// investor closes the tab, so that case is already handled.
        /// </summary>
        private static readonly ConcurrentDictionary<string, SimSession> Sessions = new();

        public SimulatedPaymentProvider(IOptions<PaymentSettings> settings, ILogger<SimulatedPaymentProvider> logger)
        {
            _settings = settings.Value;
            _logger = logger;
        }

        public string Name => ProviderName;

        public Task<ProviderCheckout> CreateCheckoutAsync(ProviderCheckoutRequest request, CancellationToken ct = default)
        {
            var sessionId = "sim_cs_" + Convert.ToHexString(RandomNumberGenerator.GetBytes(12)).ToLowerInvariant();

            Sessions[sessionId] = new SimSession
            {
                State = ProviderPaymentState.Pending,
                Amount = request.Amount,
                Currency = request.Currency,
                Reference = request.Reference,
                CreatedAtUtc = DateTime.UtcNow,
            };

            // The investor is sent to Vestora's own sandbox checkout rather than out to a
            // third party. Same shape of journey — leave the app, decide, come back with
            // a session id the server then verifies.
            //
            // The return URLs travel with the session exactly as they do with a real
            // provider: the checkout is told where to send the investor back to, rather
            // than the page guessing. That keeps the simulated journey the same shape as
            // the Stripe one, including which page performs the verification.
            var url = $"{_settings.ReturnBaseUrl.TrimEnd('/')}/payments/sandbox-checkout" +
                      $"?session={Uri.EscapeDataString(sessionId)}" +
                      $"&ref={Uri.EscapeDataString(request.Reference)}" +
                      $"&return={Uri.EscapeDataString(request.SuccessUrl)}" +
                      $"&cancel={Uri.EscapeDataString(request.CancelUrl)}";

            _logger.LogInformation("Simulated checkout {SessionId} opened for {Reference} ({Amount} {Currency}).",
                sessionId, request.Reference, request.Amount, request.Currency);

            return Task.FromResult(new ProviderCheckout(sessionId, url));
        }

        public Task<ProviderPaymentResult> GetSessionResultAsync(string sessionId, CancellationToken ct = default)
        {
            if (!Sessions.TryGetValue(sessionId, out var session))
            {
                // The simulator holds sessions in memory, so a restart forgets them.
                //
                // Reported as Cancelled rather than Pending on purpose: an unknown
                // session is not one that might still resolve, it is one that can never
                // resolve, and calling it pending would leave the investor holding an
                // attempt that only the sweeper could eventually close. Cancelling it
                // frees the request immediately so the next attempt opens a live session.
                return Task.FromResult(new ProviderPaymentResult(
                    ProviderPaymentState.Cancelled, null, null, null, "unknown_session"));
            }

            return Task.FromResult(session.State switch
            {
                ProviderPaymentState.Succeeded => new ProviderPaymentResult(
                    ProviderPaymentState.Succeeded, session.PaymentId, null, null, "paid"),

                ProviderPaymentState.Failed => new ProviderPaymentResult(
                    ProviderPaymentState.Failed, null,
                    session.FailureCode ?? "card_declined",
                    session.FailureMessage ?? "The card was declined by the issuer.",
                    "failed"),

                ProviderPaymentState.Cancelled => new ProviderPaymentResult(
                    ProviderPaymentState.Cancelled, null, null, null, "cancelled"),

                _ => new ProviderPaymentResult(ProviderPaymentState.Pending, null, null, null, "open"),
            });
        }

        public Task<ProviderRefundResult> RefundAsync(string providerPaymentId, decimal amount, string currency, CancellationToken ct = default)
        {
            var refundId = "sim_re_" + Convert.ToHexString(RandomNumberGenerator.GetBytes(10)).ToLowerInvariant();
            _logger.LogInformation("Simulated refund {RefundId} for payment {PaymentId} ({Amount} {Currency}).",
                refundId, providerPaymentId, amount, currency);
            return Task.FromResult(new ProviderRefundResult(true, refundId, null));
        }

        // ------------------------------------------------------------------
        //  Driven by the sandbox checkout surface
        // ------------------------------------------------------------------

        /// <summary>
        /// Resolves a pending session. Called by the sandbox checkout endpoint when the
        /// presenter picks an outcome — this is what replaces typing a test card number.
        /// </summary>
        public bool Resolve(string sessionId, ProviderPaymentState outcome, string? failureCode = null, string? failureMessage = null)
        {
            if (!Sessions.TryGetValue(sessionId, out var session)) return false;
            if (session.State != ProviderPaymentState.Pending) return false;

            session.State = outcome;
            if (outcome == ProviderPaymentState.Succeeded)
            {
                session.PaymentId = "sim_pi_" + Convert.ToHexString(RandomNumberGenerator.GetBytes(12)).ToLowerInvariant();
            }
            else if (outcome == ProviderPaymentState.Failed)
            {
                session.FailureCode = failureCode ?? "card_declined";
                session.FailureMessage = failureMessage ?? "The card was declined by the issuer.";
            }
            return true;
        }

        /// <summary>The details the sandbox checkout page needs to describe what is being paid.</summary>
        public (decimal Amount, string Currency, string Reference)? Describe(string sessionId) =>
            Sessions.TryGetValue(sessionId, out var s) ? (s.Amount, s.Currency, s.Reference) : null;

        private sealed class SimSession
        {
            public ProviderPaymentState State { get; set; }
            public decimal Amount { get; init; }
            public string Currency { get; init; } = "USD";
            public string Reference { get; init; } = string.Empty;
            public DateTime CreatedAtUtc { get; init; }
            public string? PaymentId { get; set; }
            public string? FailureCode { get; set; }
            public string? FailureMessage { get; set; }
        }
    }
}
