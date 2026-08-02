using System.ComponentModel.DataAnnotations;

namespace MyAppApi.Data.Models
{
    /// <summary>
    /// A backer's endorsement of a founder they actually worked with.
    /// <para>
    /// This began as a 1–5 star rating, which read like a review of a consumer
    /// product and invited exactly the kind of social proof Vestora should not
    /// manufacture: a venture is not a toaster, and a number out of five says nothing
    /// a founder or another investor can act on. It is now a set of specific,
    /// checkable statements about the working relationship — each one something the
    /// endorser is in a position to know because they backed the round.
    /// </para>
    /// <para>
    /// The table and the (ProjectId, InvestorId) uniqueness are unchanged, so every
    /// existing row survives; <see cref="Rating"/> is retained only so historical
    /// rows are not silently rewritten, and is no longer read by the product.
    /// </para>
    /// </summary>
    public class Review
    {
        public int Id { get; set; }

        public int ProjectId { get; set; }
        public Project? Project { get; set; }

        public int InvestorId { get; set; }

        /// <summary>
        /// Legacy 1–5 score. Preserved for the rows written before endorsements
        /// existed; never displayed and never collected again. Do not read this.
        /// </summary>
        public int Rating { get; set; }

        /// <summary>The endorser's own words. Optional — the traits carry the claim.</summary>
        [StringLength(1500)]
        public string? Content { get; set; }

        // ---- Endorsed traits ----
        // Each is a plain fact about the relationship that the backer observed. Left
        // as discrete flags rather than a score so nothing can be averaged into a
        // meaningless headline number.

        /// <summary>Answered questions and stayed reachable through the round.</summary>
        public bool Communicative { get; set; }

        /// <summary>Shared real numbers and risks, not just the upside.</summary>
        public bool Transparent { get; set; }

        /// <summary>Did what they said they would, on the roadmap they published.</summary>
        public bool DeliveredOnPlan { get; set; }

        /// <summary>Would consider backing this founder again.</summary>
        public bool WouldBackAgain { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime? UpdatedAt { get; set; }
    }
}
