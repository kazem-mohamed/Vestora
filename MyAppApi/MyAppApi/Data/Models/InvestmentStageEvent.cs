using System.ComponentModel.DataAnnotations;

namespace MyAppApi.Data.Models
{
    /// <summary>
    /// One movement of one relationship along the pipeline.
    /// <para>
    /// <see cref="Investment"/> carries <c>Stage</c> and <c>StageUpdatedAt</c>, which
    /// together answer "where is this now, and when did it last move" — and nothing
    /// else. A relationship that went New → Reviewing → Approved → Contacted →
    /// InDiscussion over three weeks presented as a single line reading "InDiscussion,
    /// Tuesday". The four earlier decisions, and every gap between them, were
    /// overwritten by the next one.
    /// </para>
    /// <para>
    /// So transitions are appended rather than assigned. The row is written in the same
    /// SaveChanges as the column it describes, which is what stops the two disagreeing.
    /// Nothing here is ever updated or deleted: an event is a claim about something that
    /// happened, and editing it would make it a claim about something that did not.
    /// </para>
    /// <para>
    /// What this buys, beyond an honest timeline: the only way to answer where deals
    /// actually stall. "Approved but never contacted" was already known to be the common
    /// failure, but it was known by intuition — this measures it.
    /// </para>
    /// </summary>
    public class InvestmentStageEvent
    {
        public int Id { get; set; }

        public int InvestmentId { get; set; }
        public Investment Investment { get; set; } = null!;

        /// <summary>Where it came from. Null on the opening event — there was no previous stage.</summary>
        [StringLength(20)]
        public string? FromStage { get; set; }

        [Required]
        [StringLength(20)]
        public string ToStage { get; set; } = string.Empty;

        /// <summary>
        /// Who moved it. Usually the founder, but settlement moves a relationship too and
        /// the investor is the actor there — recording "the system" would hide that.
        /// </summary>
        public int ActorUserId { get; set; }

        /// <summary>
        /// Why, when a reason exists: a decline reason, or the automatic note left by a
        /// closing round. Never invented when the actor did not give one.
        /// </summary>
        [StringLength(300)]
        public string? Reason { get; set; }

        /// <summary>
        /// How long the relationship sat in <see cref="FromStage"/> before this move,
        /// in whole minutes. Derived at write time from the previous event rather than
        /// recomputed later, so a stage's duration survives even if history is paged.
        /// Null on the opening event.
        /// </summary>
        public int? MinutesInPreviousStage { get; set; }

        public DateTime AtUtc { get; set; }
    }
}
