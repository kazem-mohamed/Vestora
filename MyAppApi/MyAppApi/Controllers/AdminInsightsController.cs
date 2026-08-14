using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyAppApi.Data;
using MyAppApi.Data.Models;
using MyAppApi.Data.Models.DTOs;
using MyAppApi.Services;

namespace MyAppApi.Controllers
{
    /// <summary>
    /// The questions that need history rather than a current count: where relationships
    /// stop, how long each step takes, and what the platform earned when.
    /// <para>
    /// Every ratio here is returned as a numerator and a denominator. At fifty accounts a
    /// single decline moves an approval rate by several points, and a bare percentage
    /// carries a precision the underlying counts cannot support — so the parts are sent
    /// and the interface leads with them.
    /// </para>
    /// </summary>
    [Route("api/admin")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class AdminInsightsController : ControllerBase
    {
        private readonly AppDbContext _db;

        public AdminInsightsController(AppDbContext db) => _db = db;

        /// <summary>
        /// The pipeline as a ladder. <c>Declined</c> is absent on purpose: it is where a
        /// relationship leaves, not a rung it climbs, and putting it in sequence would
        /// suggest every deal passes through it.
        /// </summary>
        private static readonly string[] Ladder =
        {
            PipelineStages.New,
            PipelineStages.Reviewing,
            PipelineStages.Approved,
            PipelineStages.Contacted,
            PipelineStages.InDiscussion,
            PipelineStages.Committed,
        };

        private static int Ordinal(string? stage) =>
            stage == null ? -1 : Array.IndexOf(Ladder, stage);

        [HttpGet("insights")]
        public async Task<IActionResult> GetInsights(CancellationToken ct)
        {
            var relationships = await _db.Investments
                .AsNoTracking()
                .IgnoreQueryFilters()
                .Select(i => new { i.Id, i.Stage, i.Status })
                .ToListAsync(ct);

            var events = await _db.InvestmentStageEvents
                .AsNoTracking()
                .Select(e => new { e.InvestmentId, e.ToStage, e.FromStage, e.MinutesInPreviousStage })
                .ToListAsync(ct);

            // How far each relationship ever got. Current stage and recorded history are
            // both consulted: history alone would miss anything older than migration 25,
            // and the current stage alone would forget that a declined relationship had
            // been approved first.
            var reached = new Dictionary<int, int>();
            foreach (var r in relationships)
            {
                // Closed means the relationship ran its course, so it topped the ladder.
                var ord = r.Stage == PipelineStages.Closed ? Ladder.Length - 1 : Ordinal(r.Stage);
                reached[r.Id] = ord;
            }
            foreach (var e in events)
            {
                var ord = e.ToStage == PipelineStages.Closed ? Ladder.Length - 1 : Ordinal(e.ToStage);
                if (reached.TryGetValue(e.InvestmentId, out var current) && ord > current)
                    reached[e.InvestmentId] = ord;
            }

            var funnel = Ladder
                .Select((stage, i) => new FunnelStepDto
                {
                    Stage = stage,
                    Count = reached.Count(kv => kv.Value >= i),
                })
                .ToList();

            // Settled money is the last rung, and it is not a stage — it is a payment.
            var fundedIds = await _db.PaymentTransactions
                .AsNoTracking()
                .IgnoreQueryFilters()
                .Where(t => t.Status == PaymentStatus.Succeeded)
                .Select(t => t.InvestmentId)
                .Distinct()
                .ToListAsync(ct);

            funnel.Add(new FunnelStepDto { Stage = "Funded", Count = fundedIds.Count });

            var declined = relationships.Count(r => r.Stage == PipelineStages.Declined);
            var approvedOrBeyond = reached.Count(kv => kv.Value >= Ordinal(PipelineStages.Approved));
            var committedOrBeyond = reached.Count(kv => kv.Value >= Ordinal(PipelineStages.Committed));
            var discussed = reached.Count(kv => kv.Value >= Ordinal(PipelineStages.InDiscussion));

            var conversions = new List<ConversionDto>
            {
                // Of the relationships a founder actually decided on, how many were taken.
                // Undecided ones are excluded from the denominator: counting a request
                // submitted this morning as "not yet approved" would make the rate a
                // measure of how recently people signed up.
                new() { Key = "approval", Numerator = approvedOrBeyond, Denominator = approvedOrBeyond + declined },
                new() { Key = "discussion", Numerator = discussed, Denominator = approvedOrBeyond },
                new() { Key = "commitment", Numerator = committedOrBeyond, Denominator = discussed },
                new() { Key = "funding", Numerator = fundedIds.Count, Denominator = committedOrBeyond },
            };

            // Time spent in each stage, from the minutes recorded at each move.
            var dwell = events
                .Where(e => e.FromStage != null && e.MinutesInPreviousStage.HasValue)
                .GroupBy(e => e.FromStage!)
                .Select(g =>
                {
                    var minutes = g.Select(x => x.MinutesInPreviousStage!.Value).OrderBy(m => m).ToList();
                    return new StageDwellDto
                    {
                        Stage = g.Key,
                        Samples = minutes.Count,
                        MedianMinutes = minutes[minutes.Count / 2],
                        LongestMinutes = minutes[^1],
                    };
                })
                .OrderBy(d => Ordinal(d.Stage))
                .ToList();

            var settled = await _db.PaymentTransactions
                .AsNoTracking()
                .IgnoreQueryFilters()
                .Where(t => t.Status == PaymentStatus.Succeeded && t.SucceededAtUtc != null)
                .Select(t => new { t.ProjectId, t.Amount, t.FeeAmount, t.SucceededAtUtc })
                .ToListAsync(ct);

            var revenueByMonth = settled
                .GroupBy(t => t.SucceededAtUtc!.Value.ToString("yyyy-MM"))
                .Select(g => new RevenuePeriodDto
                {
                    Label = g.Key,
                    Transactions = g.Count(),
                    Gross = g.Sum(x => x.Amount),
                    Fees = g.Sum(x => x.FeeAmount),
                })
                .OrderBy(r => r.Label)
                .ToList();

            var ventureIds = settled.Select(t => t.ProjectId).Distinct().ToList();
            var ventureNames = await _db.Projects
                .AsNoTracking()
                .IgnoreQueryFilters()
                .Where(p => ventureIds.Contains(p.Id))
                .ToDictionaryAsync(p => p.Id, p => p.Name, ct);

            var revenueByVenture = settled
                .GroupBy(t => t.ProjectId)
                .Select(g => new RevenueByVentureDto
                {
                    ProjectId = g.Key,
                    Name = ventureNames.TryGetValue(g.Key, out var n) ? n : $"#{g.Key}",
                    Transactions = g.Count(),
                    Gross = g.Sum(x => x.Amount),
                    Fees = g.Sum(x => x.FeeAmount),
                })
                .OrderByDescending(r => r.Fees)
                .Take(10)
                .ToList();

            return Ok(new AdminInsightsDto
            {
                Funnel = funnel,
                Declined = declined,
                Conversions = conversions,
                StageDwell = dwell,
                RevenueByMonth = revenueByMonth,
                RevenueByVenture = revenueByVenture,
                RelationshipsWithHistory = events.Select(e => e.InvestmentId).Distinct().Count(),
                TotalRelationships = relationships.Count,
            });
        }
    }
}
