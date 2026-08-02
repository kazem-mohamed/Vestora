using System;
using System.ComponentModel.DataAnnotations;

namespace MyAppApi.Data.Models
{
    /// <summary>
    /// A question an investor asks inside a specific relationship, and the founder's
    /// answer to it.
    /// <para>
    /// Deliberately NOT a generic comment thread. A relationship that has reached
    /// "InDiscussion" produces real questions whose answers both sides need to be
    /// able to point back to later — chat loses them the moment the conversation
    /// scrolls. Scoped to the Investment, not the Project, so two investors asking
    /// the same thing get their own answers rather than a shared forum.
    /// </para>
    /// </summary>
    public class DealQuestion
    {
        public int Id { get; set; }

        public int InvestmentId { get; set; }
        public Investment Investment { get; set; } = null!;

        /// <summary>Who raised it. Either side may ask — a founder asks things too.</summary>
        public int AskedByUserId { get; set; }
        public User AskedByUser { get; set; } = null!;

        [Required]
        [StringLength(1000)]
        public string Question { get; set; } = string.Empty;

        [StringLength(4000)]
        public string? Answer { get; set; }

        public int? AnsweredByUserId { get; set; }
        public User? AnsweredByUser { get; set; }

        public DateTime CreatedAtUtc { get; set; }
        public DateTime? AnsweredAtUtc { get; set; }

        /// <summary>
        /// Set when the asker withdraws the question. Kept rather than deleted so the
        /// relationship record stays honest about what was asked.
        /// </summary>
        public bool IsWithdrawn { get; set; }
    }
}
