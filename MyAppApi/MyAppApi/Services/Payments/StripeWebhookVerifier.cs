using System.Globalization;
using System.Security.Cryptography;
using System.Text;

namespace MyAppApi.Services.Payments
{
    /// <summary>
    /// Verifies that a webhook actually came from Stripe.
    /// <para>
    /// Without this the webhook endpoint is a public URL that marks investments funded
    /// on request. The signature header carries a timestamp and one or more HMAC-SHA256
    /// digests over <c>{timestamp}.{body}</c>, keyed with the endpoint's signing secret;
    /// the timestamp is checked too, so a valid old payload cannot be replayed forever.
    /// </para>
    /// </summary>
    public static class StripeWebhookVerifier
    {
        private const int ToleranceSeconds = 300;

        public static bool TryVerify(string payload, string? signatureHeader, string? signingSecret, out string failure)
        {
            failure = string.Empty;

            if (string.IsNullOrWhiteSpace(signingSecret))
            {
                failure = "No webhook signing secret is configured.";
                return false;
            }

            if (string.IsNullOrWhiteSpace(signatureHeader))
            {
                failure = "Missing signature header.";
                return false;
            }

            string? timestamp = null;
            var signatures = new List<string>();

            foreach (var part in signatureHeader.Split(',', StringSplitOptions.RemoveEmptyEntries))
            {
                var pair = part.Split('=', 2);
                if (pair.Length != 2) continue;

                var key = pair[0].Trim();
                var value = pair[1].Trim();

                if (key == "t") timestamp = value;
                else if (key == "v1") signatures.Add(value);
            }

            if (timestamp == null || signatures.Count == 0)
            {
                failure = "Malformed signature header.";
                return false;
            }

            if (!long.TryParse(timestamp, NumberStyles.Integer, CultureInfo.InvariantCulture, out var unix))
            {
                failure = "Malformed signature timestamp.";
                return false;
            }

            var age = Math.Abs(DateTimeOffset.UtcNow.ToUnixTimeSeconds() - unix);
            if (age > ToleranceSeconds)
            {
                failure = "Signature timestamp is outside the tolerance window.";
                return false;
            }

            var signedPayload = $"{timestamp}.{payload}";
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(signingSecret));
            var expected = Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(signedPayload)))
                .ToLowerInvariant();

            var expectedBytes = Encoding.UTF8.GetBytes(expected);

            foreach (var candidate in signatures)
            {
                var candidateBytes = Encoding.UTF8.GetBytes(candidate.ToLowerInvariant());
                if (candidateBytes.Length == expectedBytes.Length &&
                    CryptographicOperations.FixedTimeEquals(candidateBytes, expectedBytes))
                {
                    return true;
                }
            }

            failure = "Signature mismatch.";
            return false;
        }
    }
}
