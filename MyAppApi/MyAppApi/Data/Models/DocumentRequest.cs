using System;
using System.ComponentModel.DataAnnotations;

namespace MyAppApi.Data.Models
{
    /// <summary>
    /// One side asking the other for a document neither has published yet.
    /// <para>
    /// The data room already handles documents the founder chose to publish. This
    /// covers the other direction — the gap an evaluation actually runs into. When
    /// the founder uploads against the request, <see cref="FulfilledByDocumentId"/>
    /// links the two so the request closes itself instead of relying on either party
    /// to remember.
    /// </para>
    /// <para>
    /// It ran one way for a long time, and the asymmetry was never argued for: an
    /// investor could ask for a cap table, and a founder could not ask who they were
    /// taking money from. Diligence on a two-sided platform that only points one way
    /// is not diligence, it is a formality. Either party may ask now.
    /// </para>
    /// <para>
    /// The two sides answer differently because they hold documents differently. A
    /// founder has a data room, so they answer by linking something in it. An investor
    /// has nothing of the sort, so they answer by attaching a file to the request —
    /// which is also why that file lives here rather than becoming a venture document
    /// visible to every other backer.
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

        // ---- The investor's answer ----
        //
        // Held on the request rather than promoted to a ProjectDocument. A venture's
        // documents are scoped to the venture, so an investor's bank letter filed there
        // would be readable by every other approved backer — the exact opposite of what
        // was asked for. It belongs to this one conversation and stays in it.

        [StringLength(255)]
        public string? ResponseFileName { get; set; }

        [StringLength(100)]
        public string? ResponseContentType { get; set; }

        public long? ResponseSizeBytes { get; set; }

        public byte[]? ResponseData { get; set; }

        /// <summary>What the responder said alongside the file, or instead of one.</summary>
        [StringLength(600)]
        public string? ResponseNote { get; set; }

        public DateTime CreatedAtUtc { get; set; }
        public DateTime? ResolvedAtUtc { get; set; }
    }
}
