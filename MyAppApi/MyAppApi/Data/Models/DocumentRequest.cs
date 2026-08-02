using System;
using System.ComponentModel.DataAnnotations;

namespace MyAppApi.Data.Models
{
    /// <summary>
    /// An investor asking a founder for a document that is not in the data room yet.
    /// <para>
    /// The data room already handles documents the founder chose to publish. This
    /// covers the other direction — the gap an evaluation actually runs into. When
    /// the founder uploads against the request, <see cref="FulfilledByDocumentId"/>
    /// links the two so the request closes itself instead of relying on either party
    /// to remember.
    /// </para>
    /// </summary>
    public class DocumentRequest
    {
        public int Id { get; set; }

        public int InvestmentId { get; set; }
        public Investment Investment { get; set; } = null!;

        public int RequestedByUserId { get; set; }
        public User RequestedByUser { get; set; } = null!;

        [Required]
        [StringLength(160)]
        public string Title { get; set; } = string.Empty;

        [StringLength(600)]
        public string? Note { get; set; }

        /// <summary>Open · Fulfilled · Declined · Withdrawn.</summary>
        [StringLength(20)]
        public string Status { get; set; } = "Open";

        /// <summary>The founder's reason when they decline — never a silent no.</summary>
        [StringLength(500)]
        public string? DeclinedReason { get; set; }

        public int? FulfilledByDocumentId { get; set; }
        public ProjectDocument? FulfilledByDocument { get; set; }

        public DateTime CreatedAtUtc { get; set; }
        public DateTime? ResolvedAtUtc { get; set; }
    }
}
