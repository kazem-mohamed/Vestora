using System.Globalization;
using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Options;
using MyAppApi.Settings;

namespace MyAppApi.Services.Payments
{
    /// <summary>
    /// Stripe Checkout, in test mode only.
    /// <para>
    /// Written directly against Stripe's REST API over <see cref="HttpClient"/> rather
    /// than through the SDK. Three endpoints are needed — create a session, read a
    /// session, refund a charge — and all three are form-encoded POSTs or plain GETs.
    /// A dependency the size of the Stripe SDK for that surface would be the heavier
    /// choice, and this keeps the project's package list where it was.
    /// </para>
    /// <para>
    /// <b>Test mode is enforced, not assumed.</b> A key that does not begin
    /// <c>sk_test_</c> is refused at construction. Vestora has no licence to move real
    /// money and this adapter must be incapable of doing so by accident.
    /// </para>
    /// </summary>
    public class StripeSandboxPaymentProvider : IPaymentProvider
    {
        public const string ProviderName = "stripe";

        private readonly HttpClient _http;
        private readonly StripeSettings _stripe;
        private readonly ILogger<StripeSandboxPaymentProvider> _logger;

        public StripeSandboxPaymentProvider(
            HttpClient http,
            IOptions<PaymentSettings> settings,
            ILogger<StripeSandboxPaymentProvider> logger)
        {
            _stripe = settings.Value.Stripe;
            _logger = logger;

            if (string.IsNullOrWhiteSpace(_stripe.SecretKey))
            {
                throw new InvalidOperationException("Stripe provider selected but no secret key is configured.");
            }

            if (!_stripe.SecretKey.StartsWith("sk_test_", StringComparison.Ordinal))
            {
                throw new InvalidOperationException(
                    "Vestora refuses any Stripe key that is not a test key. This project must never process real payments.");
            }

            _http = http;
            _http.BaseAddress = new Uri(_stripe.ApiBase.TrimEnd('/') + "/");
            _http.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", _stripe.SecretKey);
            _http.Timeout = TimeSpan.FromSeconds(20);
        }

        public string Name => ProviderName;

        public async Task<ProviderCheckout> CreateCheckoutAsync(ProviderCheckoutRequest request, CancellationToken ct = default)
        {
            // Stripe takes the smallest currency unit. USD cents; the app has no
            // zero-decimal currencies configured.
            var minor = (long)Math.Round(request.Amount * 100m, MidpointRounding.AwayFromZero);

            // Stripe accepts an expiry between 30 minutes and 24 hours from now. Vestora's
            // own TTL drives it, clamped into that window, so the checkout dies with the
            // attempt instead of outliving it — see ProviderCheckoutRequest.ExpiresAtUtc.
            var now = DateTimeOffset.UtcNow;
            var wanted = new DateTimeOffset(DateTime.SpecifyKind(request.ExpiresAtUtc, DateTimeKind.Utc));
            var floor = now.AddMinutes(31);
            var ceiling = now.AddHours(23);
            if (wanted < floor) wanted = floor;
            if (wanted > ceiling) wanted = ceiling;

            var form = new List<KeyValuePair<string, string>>
            {
                new("mode", "payment"),
                new("success_url", request.SuccessUrl),
                new("cancel_url", request.CancelUrl),
                new("client_reference_id", request.Reference),
                new("expires_at", wanted.ToUnixTimeSeconds().ToString(CultureInfo.InvariantCulture)),
                new("line_items[0][quantity]", "1"),
                new("line_items[0][price_data][currency]", request.Currency.ToLowerInvariant()),
                new("line_items[0][price_data][unit_amount]", minor.ToString(CultureInfo.InvariantCulture)),
                new("line_items[0][price_data][product_data][name]", Truncate(request.VentureName, 250)),
                new("line_items[0][price_data][product_data][description]", Truncate(request.Description, 250)),
            };

            foreach (var kv in request.Metadata)
            {
                // On the session, so checkout.session.* events can be resolved…
                form.Add(new KeyValuePair<string, string>($"metadata[{kv.Key}]", kv.Value));

                // …and on the PaymentIntent it creates, so payment_intent.* events can be
                // resolved too. Session metadata does not propagate downward on its own,
                // and without this a payment_intent.payment_failed webhook arrives
                // carrying an object Vestora cannot match to any transaction.
                form.Add(new KeyValuePair<string, string>($"payment_intent_data[metadata][{kv.Key}]", kv.Value));
            }

            using var message = new HttpRequestMessage(HttpMethod.Post, "v1/checkout/sessions")
            {
                Content = new FormUrlEncodedContent(form),
            };

            // Stripe's own idempotency: a retried create cannot open two sessions and
            // therefore cannot produce two ways to pay the same request.
            message.Headers.Add("Idempotency-Key", request.IdempotencyKey);

            using var response = await SendAsync(message, ct);
            var json = await ReadJsonAsync(response, ct);

            var sessionId = json.GetProperty("id").GetString()
                            ?? throw new PaymentProviderUnavailableException("Stripe returned a session without an id.");
            var url = json.TryGetProperty("url", out var u) ? u.GetString() : null;

            if (string.IsNullOrWhiteSpace(url))
            {
                throw new PaymentProviderUnavailableException("Stripe returned a session without a checkout URL.");
            }

            return new ProviderCheckout(sessionId, url);
        }

        public async Task<ProviderPaymentResult> GetSessionResultAsync(string sessionId, CancellationToken ct = default)
        {
            using var message = new HttpRequestMessage(
                HttpMethod.Get,
                $"v1/checkout/sessions/{Uri.EscapeDataString(sessionId)}?expand[]=payment_intent");

            using var response = await SendAsync(message, ct);
            var json = await ReadJsonAsync(response, ct);

            var paymentStatus = json.TryGetProperty("payment_status", out var ps) ? ps.GetString() : null;
            var sessionStatus = json.TryGetProperty("status", out var ss) ? ss.GetString() : null;

            string? paymentId = null;
            string? failureCode = null;
            string? failureMessage = null;

            if (json.TryGetProperty("payment_intent", out var pi))
            {
                if (pi.ValueKind == JsonValueKind.String)
                {
                    paymentId = pi.GetString();
                }
                else if (pi.ValueKind == JsonValueKind.Object)
                {
                    paymentId = pi.TryGetProperty("id", out var piId) ? piId.GetString() : null;
                    if (pi.TryGetProperty("last_payment_error", out var err) && err.ValueKind == JsonValueKind.Object)
                    {
                        failureCode = err.TryGetProperty("code", out var c) ? c.GetString() : null;
                        failureMessage = err.TryGetProperty("message", out var m) ? m.GetString() : null;
                    }
                }
            }

            var raw = $"{sessionStatus}/{paymentStatus}";

            // "paid" is the only thing that settles a Vestora transaction. Everything
            // else is either still moving or over.
            if (paymentStatus == "paid")
            {
                return new ProviderPaymentResult(ProviderPaymentState.Succeeded, paymentId, null, null, raw);
            }

            if (sessionStatus == "expired")
            {
                return new ProviderPaymentResult(ProviderPaymentState.Cancelled, paymentId, null, null, raw);
            }

            if (failureCode != null || failureMessage != null)
            {
                return new ProviderPaymentResult(ProviderPaymentState.Failed, paymentId, failureCode, failureMessage, raw);
            }

            // "unpaid" on a complete session means an async method is still clearing.
            if (sessionStatus == "complete")
            {
                return new ProviderPaymentResult(ProviderPaymentState.Processing, paymentId, null, null, raw);
            }

            return new ProviderPaymentResult(ProviderPaymentState.Pending, paymentId, null, null, raw);
        }

        public async Task<ProviderRefundResult> RefundAsync(string providerPaymentId, decimal amount, string currency, CancellationToken ct = default)
        {
            var form = new List<KeyValuePair<string, string>>
            {
                new("payment_intent", providerPaymentId),
            };

            using var message = new HttpRequestMessage(HttpMethod.Post, "v1/refunds")
            {
                Content = new FormUrlEncodedContent(form),
            };
            message.Headers.Add("Idempotency-Key", $"refund_{providerPaymentId}");

            try
            {
                using var response = await SendAsync(message, ct);
                var json = await ReadJsonAsync(response, ct);
                var refundId = json.TryGetProperty("id", out var id) ? id.GetString() : null;
                var status = json.TryGetProperty("status", out var s) ? s.GetString() : null;

                // "pending" happens with some methods; Vestora treats an accepted refund
                // as done because the money is already committed to coming back.
                var ok = status is "succeeded" or "pending";
                return new ProviderRefundResult(ok, refundId, ok ? null : $"Stripe returned refund status '{status}'.");
            }
            catch (PaymentProviderUnavailableException ex)
            {
                return new ProviderRefundResult(false, null, ex.Message);
            }
        }

        // ------------------------------------------------------------------

        private async Task<HttpResponseMessage> SendAsync(HttpRequestMessage message, CancellationToken ct)
        {
            HttpResponseMessage response;
            try
            {
                response = await _http.SendAsync(message, ct);
            }
            catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
            {
                // A network problem is not a declined payment. Saying so keeps a flaky
                // connection from being recorded as an investor's card failing.
                throw new PaymentProviderUnavailableException("Could not reach Stripe.", ex);
            }

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(ct);
                _logger.LogError("Stripe {Status} for {Uri}: {Body}", (int)response.StatusCode, message.RequestUri, body);
                response.Dispose();
                throw new PaymentProviderUnavailableException($"Stripe rejected the request ({(int)response.StatusCode}).");
            }

            return response;
        }

        private static async Task<JsonElement> ReadJsonAsync(HttpResponseMessage response, CancellationToken ct)
        {
            var stream = await response.Content.ReadAsStreamAsync(ct);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
            return doc.RootElement.Clone();
        }

        private static string Truncate(string value, int max) =>
            string.IsNullOrEmpty(value) ? value : value.Length <= max ? value : value[..max];
    }
}
