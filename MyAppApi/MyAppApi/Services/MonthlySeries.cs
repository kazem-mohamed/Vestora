using MyAppApi.Data.Models.DTOs;

namespace MyAppApi.Services
{
    /// <summary>
    /// The single definition of a cumulative monthly series, for every chart that plots
    /// one against time.
    ///
    /// Both dashboards used to build these by grouping the events themselves — the
    /// investor controller inline, twice; the founder controller through a local
    /// helper. Grouping alone produces a series with two defects that only show up once
    /// somebody reads the chart:
    ///
    /// 1. **Months with no activity disappear.** The points are then drawn evenly
    ///    spaced, so a two-month gap and a one-month gap occupy the same width and every
    ///    slope across a gap is exaggerated by however many months went missing. A chart
    ///    whose horizontal axis is time has to spend time evenly or it is not a time
    ///    axis.
    /// 2. **The series stops at the last month that happened to have an event**, not at
    ///    the present. The dashboard reads the final pair of points as the latest
    ///    movement and labels it "this month", so an account whose last commitment
    ///    arrived in November announces it as this month's news for as long as nothing
    ///    else ever arrives. That is a false statement on the screen, not a rough edge.
    ///
    /// A running total is defined for every month once it has started — the total simply
    /// does not change in a month where nothing happened — so the fix is to emit those
    /// months rather than to skip them. The series runs from the first month with an
    /// event through the current month, carrying the total forward across the quiet
    /// ones. A flat stretch is then a real observation ("nothing arrived") instead of an
    /// absence the reader cannot see.
    ///
    /// Empty in, empty out: a series with no events at all is not a flat line at zero,
    /// it is nothing to plot, and the caller renders its empty state.
    /// </summary>
    public static class MonthlySeries
    {
        /// <summary>Running total per month, from the first event through <paramref name="nowUtc"/>.</summary>
        public static List<TimePointDto> Cumulative(
            IEnumerable<(DateTime Date, double Value)> points,
            DateTime nowUtc)
        {
            var byMonth = points
                .GroupBy(p => FirstOfMonth(p.Date))
                .ToDictionary(g => g.Key, g => g.Sum(x => x.Value));

            return Walk(byMonth.Keys, nowUtc, (month, running) =>
                running + (byMonth.TryGetValue(month, out var sum) ? sum : 0d));
        }

        /// <summary>
        /// Running count of distinct keys per month — "how many investors have backed me
        /// by now", where the same investor committing twice must not count twice.
        /// </summary>
        public static List<TimePointDto> CumulativeDistinct<TKey>(
            IEnumerable<(DateTime Date, TKey Key)> points,
            DateTime nowUtc)
            where TKey : notnull
        {
            var byMonth = points
                .GroupBy(p => FirstOfMonth(p.Date))
                .ToDictionary(g => g.Key, g => g.Select(x => x.Key).ToList());

            var seen = new HashSet<TKey>();
            return Walk(byMonth.Keys, nowUtc, (month, _) =>
            {
                if (byMonth.TryGetValue(month, out var keys))
                {
                    foreach (var k in keys) seen.Add(k);
                }
                return seen.Count;
            });
        }

        private static DateTime FirstOfMonth(DateTime d) => new(d.Year, d.Month, 1);

        /// <summary>
        /// Steps one month at a time from the earliest event to the present, asking
        /// <paramref name="advance"/> for the running value at each stop.
        ///
        /// The walk is bounded by the current month rather than by the data, which is
        /// what puts the final point on "now". An event dated in the future — a clock
        /// skew, or seeded demo data — would otherwise end the walk before its own start
        /// month and produce nothing, so the end is taken as the later of the two.
        /// </summary>
        private static List<TimePointDto> Walk(
            IEnumerable<DateTime> months,
            DateTime nowUtc,
            Func<DateTime, double, double> advance)
        {
            var all = months.ToList();
            if (all.Count == 0) return new List<TimePointDto>();

            var start = all.Min();
            var last = all.Max();
            var end = FirstOfMonth(nowUtc);
            if (end < last) end = last;

            var result = new List<TimePointDto>();
            double running = 0;
            for (var m = start; m <= end; m = m.AddMonths(1))
            {
                running = advance(m, running);
                result.Add(new TimePointDto { Label = m.ToString("yyyy-MM"), Value = running });
            }
            return result;
        }
    }
}
