using MyAppApi.Services;
using Xunit;

namespace MyAppApi.Tests;

/// <summary>
/// The two properties the dashboards actually depend on, and that grouping alone
/// did not give them: every month between the first event and the present is
/// present exactly once, and the last point is the current month.
///
/// The second one is the reason this class exists. Both dashboards read the final
/// pair of points as the latest movement and label it "this month", so a series
/// that stops at its last event announces months-old news as today's. These cases
/// pin that down at the only place it can be checked without a database.
/// </summary>
public class MonthlySeriesTests
{
    private static readonly DateTime Now = new(2026, 9, 3, 12, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void NoEvents_PlotsNothing()
    {
        // Not a flat line at zero — there is nothing to plot, and the caller
        // renders its empty state rather than an invented baseline.
        var series = MonthlySeries.Cumulative(Array.Empty<(DateTime, double)>(), Now);
        Assert.Empty(series);
    }

    [Fact]
    public void QuietMonthsAreEmitted_SoTheAxisSpendsTimeEvenly()
    {
        // Two commitments either side of a silent December.
        var series = MonthlySeries.Cumulative(new[]
        {
            (new DateTime(2025, 11, 6), 120_000d),
            (new DateTime(2026, 1, 22), 90_000d),
        }, new DateTime(2026, 1, 31, 0, 0, 0, DateTimeKind.Utc));

        Assert.Equal(
            new[] { "2025-11", "2025-12", "2026-01" },
            series.Select(p => p.Label));

        // December carries November's total forward: nothing arrived, the total
        // did not change, and the reader can see the flat month.
        Assert.Equal(new[] { 120_000d, 120_000d, 210_000d }, series.Select(p => p.Value));
    }

    [Fact]
    public void SeriesRunsThroughToTheCurrentMonth()
    {
        // Everything happened in November; it is now September.
        var series = MonthlySeries.Cumulative(new[]
        {
            (new DateTime(2025, 11, 6), 280_000d),
        }, Now);

        Assert.Equal("2025-11", series.First().Label);
        Assert.Equal("2026-09", series.Last().Label);

        // The delta the dashboard prints as "this month" is the last two points.
        // It must be zero, because nothing arrived this month.
        Assert.Equal(series[^2].Value, series[^1].Value);
        Assert.Equal(280_000d, series.Last().Value);
    }

    [Fact]
    public void SameMonthEventsAreSummedIntoOnePoint()
    {
        var series = MonthlySeries.Cumulative(new[]
        {
            (new DateTime(2025, 11, 6), 120_000d),
            (new DateTime(2025, 11, 13), 100_000d),
            (new DateTime(2025, 11, 20), 60_000d),
        }, new DateTime(2025, 11, 30, 0, 0, 0, DateTimeKind.Utc));

        var only = Assert.Single(series);
        Assert.Equal("2025-11", only.Label);
        Assert.Equal(280_000d, only.Value);
    }

    [Fact]
    public void CumulativeIsMonotonic_AndNeverSkipsAMonth()
    {
        var series = MonthlySeries.Cumulative(new[]
        {
            (new DateTime(2025, 11, 6), 120_000d),
            (new DateTime(2026, 2, 15), 90_000d),
            (new DateTime(2026, 3, 29), 45_000d),
        }, Now);

        // 2025-11 through 2026-09 inclusive.
        Assert.Equal(11, series.Count);
        for (var i = 1; i < series.Count; i++)
        {
            Assert.True(series[i].Value >= series[i - 1].Value);
        }
        Assert.Equal(255_000d, series.Last().Value);
    }

    [Fact]
    public void AFutureDatedEventStillEndsTheWalkAfterItself()
    {
        // Clock skew, or seeded demo data dated ahead. The walk is bounded by the
        // later of "now" and the last event, so the point never falls off the end.
        var series = MonthlySeries.Cumulative(new[]
        {
            (new DateTime(2026, 12, 1), 10_000d),
        }, Now);

        Assert.Equal("2026-12", series.Last().Label);
        Assert.Equal(10_000d, series.Last().Value);
    }

    [Fact]
    public void CumulativeDistinct_CountsAnInvestorOnceHoweverOftenTheyCommit()
    {
        var series = MonthlySeries.CumulativeDistinct(new[]
        {
            (new DateTime(2025, 11, 6), 91),
            (new DateTime(2025, 11, 9), 91),   // same investor again
            (new DateTime(2026, 1, 22), 94),
        }, new DateTime(2026, 1, 31, 0, 0, 0, DateTimeKind.Utc));

        Assert.Equal(
            new[] { "2025-11", "2025-12", "2026-01" },
            series.Select(p => p.Label));
        Assert.Equal(new[] { 1d, 1d, 2d }, series.Select(p => p.Value));
    }
}
