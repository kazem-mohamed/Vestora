using System;
using System.ComponentModel.DataAnnotations;

namespace MyAppApi.Data.Models
{
    /// <summary>
    /// A discovery query a member asked to be kept, so new matches can be surfaced
    /// to them instead of requiring them to come back and re-run it.
    /// <para>
    /// Stores the same filter vocabulary browse already uses rather than an opaque
    /// blob, so a saved search stays readable, editable, and re-runnable as a normal
    /// browse URL. <see cref="LastSeenAtUtc"/> is the watermark for "new since you
    /// last looked" — the signal is computed on read, so nothing has to be
    /// pre-generated or kept in sync.
    /// </para>
    /// </summary>
    public class SavedSearch
    {
        public int Id { get; set; }

        public int UserId { get; set; }
        public User User { get; set; } = null!;

        [Required]
        [StringLength(80)]
        public string Name { get; set; } = string.Empty;

        /// <summary>"ventures" or "investors" — the surface this query belongs to.</summary>
        [StringLength(20)]
        public string Scope { get; set; } = "ventures";

        [StringLength(120)]
        public string? Search { get; set; }

        [StringLength(80)]
        public string? Sector { get; set; }

        [StringLength(80)]
        public string? Location { get; set; }

        [StringLength(40)]
        public string? Stage { get; set; }

        /// <summary>"open" | "committed" | null — matches the browse commitment filter.</summary>
        [StringLength(20)]
        public string? Commitment { get; set; }

        public DateTime CreatedAtUtc { get; set; }

        /// <summary>Advanced when the member opens the saved search, not when a digest runs.</summary>
        public DateTime LastSeenAtUtc { get; set; }
    }
}
