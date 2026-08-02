using System.ComponentModel.DataAnnotations;

namespace MyAppApi.Data.Models
{
    /// <summary>
    /// Every confirmation Vestora has ever accepted from a payment provider, recorded
    /// before it is acted on.
    /// <para>
    /// This table is the idempotency mechanism, not a log. A provider will resend the
    /// same webhook — that is normal behaviour, not a fault — and the browser's return
    /// trip can confirm the same session the webhook is confirming at the same moment.
    /// Both paths insert here first. The unique index on (Provider, ProviderEventId)
    /// means the second one loses at the database, before a single funding figure has
    /// been touched. Nothing downstream needs to defend itself.
    /// </para>
    /// </summary>
    public class PaymentEvent
    {
        public int Id { get; set; }

        [Required]
        [StringLength(24)]
        public string Provider { get; set; } = string.Empty;

        /// <summary>
        /// The provider's own id for this event. For a webhook it is the event id; for a
        /// server-side verification it is a deterministic key derived from the session
        /// and its outcome, so a repeated verify collides with itself.
        /// </summary>
        [Required]
        [StringLength(255)]
        public string ProviderEventId { get; set; } = string.Empty;

        [Required]
        [StringLength(64)]
        public string EventType { get; set; } = string.Empty;

        /// <summary>webhook | verify | simulated — how the confirmation reached us.</summary>
        [Required]
        [StringLength(16)]
        public string Source { get; set; } = string.Empty;

        public int? PaymentTransactionId { get; set; }

        /// <summary>Trimmed provider payload, kept for the audit trail.</summary>
        [StringLength(4000)]
        public string? Payload { get; set; }

        public DateTime ReceivedAtUtc { get; set; }

        /// <summary>False when the event was recognised but changed nothing (already applied).</summary>
        public bool Applied { get; set; }

        [StringLength(300)]
        public string? Outcome { get; set; }
    }
}
