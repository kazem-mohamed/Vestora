namespace MyAppApi.Services
{
    /// <summary>
    /// The single source of truth for the investor-relationship pipeline.
    /// Deliberately limited to stages the product can actually evidence — no
    /// "Due Diligence"/"Negotiation" theatre, since Vestora moves no money and
    /// holds no contracts.
    /// </summary>
    public static class PipelineStages
    {
        public const string New = "New";                   // request just submitted
        public const string Reviewing = "Reviewing";       // founder is looking at it
        public const string Approved = "Approved";         // founder accepted (counts toward funding)
        public const string Contacted = "Contacted";       // founder reached out
        public const string InDiscussion = "InDiscussion"; // active back-and-forth
        public const string Committed = "Committed";       // both sides agreed terms off-platform
        public const string Closed = "Closed";             // relationship concluded
        public const string Declined = "Declined";         // founder said no (row kept for history)

        /// <summary>Stages a founder may move a request into, in order.</summary>
        public static readonly string[] All =
        {
            New, Reviewing, Approved, Contacted, InDiscussion, Committed, Closed, Declined
        };

        /// <summary>Stages that mean the relationship is no longer active.</summary>
        public static readonly string[] Terminal = { Closed, Declined };

        public static bool IsValid(string? stage) =>
            !string.IsNullOrWhiteSpace(stage) && Array.IndexOf(All, stage) >= 0;

        /// <summary>
        /// Funding only counts once the founder approves. Approved and every
        /// stage after it (short of a decline) keep counting.
        /// </summary>
        public static bool CountsTowardFunding(string stage) =>
            stage == Approved || stage == Contacted || stage == InDiscussion ||
            stage == Committed || stage == Closed;
    }
}
