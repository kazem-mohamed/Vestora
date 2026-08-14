namespace MyAppApi.Data.Models.DTOs
{
    /// <summary>
    /// One rung of the relationship funnel: how many relationships ever got at least
    /// this far.
    /// <para>
    /// Cumulative, not a census of who is standing there now. A relationship that
    /// reached <c>Committed</c> is not in <c>Reviewing</c> any more, and a funnel built
    /// from current stages would show it leaving the pipeline rather than progressing
    /// through it. Reached-ness is taken from the stage history where there is one and
    /// from the current stage otherwise, so a relationship that was approved and later
    /// declined still counts as having been approved — because it was.
    /// </para>
    /// </summary>
    public class FunnelStepDto
    {
        public string Stage { get; set; } = string.Empty;
        public int Count { get; set; }
    }

    /// <summary>
    /// A ratio, returned as its two halves and never as a percentage.
    /// <para>
    /// At this platform's size a single event moves most of these by several points, so
    /// a lone "44%" is a number with a false precision attached. The parts are sent so
    /// the interface can lead with "21 of 48" and keep the percentage as the smaller,
    /// secondary reading.
    /// </para>
    /// </summary>
    public class ConversionDto
    {
        public string Key { get; set; } = string.Empty;
        public int Numerator { get; set; }
        public int Denominator { get; set; }
    }

    /// <summary>
    /// How long relationships actually sit in a stage before moving on.
    /// <para>
    /// Measured, not estimated: <c>InvestmentStageEvent.MinutesInPreviousStage</c> is
    /// written at the moment of each move. The median rather than the mean, because one
    /// relationship left alone for two months would otherwise become "the average", and
    /// <see cref="Samples"/> travels with it so a figure resting on three observations
    /// cannot be read as a fact about the platform.
    /// </para>
    /// </summary>
    public class StageDwellDto
    {
        public string Stage { get; set; } = string.Empty;
        public int Samples { get; set; }
        public int MedianMinutes { get; set; }
        public int LongestMinutes { get; set; }
    }

    public class RevenuePeriodDto
    {
        /// <summary>"yyyy-MM".</summary>
        public string Label { get; set; } = string.Empty;
        public int Transactions { get; set; }

        /// <summary>What investors paid. Settled only.</summary>
        public decimal Gross { get; set; }

        /// <summary>Vestora's cut, from the rate frozen on each transaction.</summary>
        public decimal Fees { get; set; }
    }

    public class RevenueByVentureDto
    {
        public int ProjectId { get; set; }
        public string Name { get; set; } = string.Empty;
        public int Transactions { get; set; }
        public decimal Gross { get; set; }
        public decimal Fees { get; set; }
    }

    /// <summary>
    /// The platform's own funnel, timings and revenue — the questions that need history
    /// rather than a current count.
    /// </summary>
    public class AdminInsightsDto
    {
        public List<FunnelStepDto> Funnel { get; set; } = new();

        /// <summary>Relationships the founder said no to. A side exit from the funnel, not a rung of it.</summary>
        public int Declined { get; set; }

        public List<ConversionDto> Conversions { get; set; } = new();
        public List<StageDwellDto> StageDwell { get; set; } = new();
        public List<RevenuePeriodDto> RevenueByMonth { get; set; } = new();
        public List<RevenueByVentureDto> RevenueByVenture { get; set; } = new();

        /// <summary>
        /// How many relationships have any recorded stage history at all. Below this,
        /// the dwell figures describe a subset — stage history only began at migration 25.
        /// </summary>
        public int RelationshipsWithHistory { get; set; }

        public int TotalRelationships { get; set; }
    }
}
