using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using MyAppApi.Data;
using MyAppApi.Data.Models;

namespace MyAppApi.Services
{
    /// <summary>
    /// Every funding figure for one venture, computed in one place.
    /// </summary>
    public sealed class FundingSummary
    {
        public int ProjectId { get; init; }
        public decimal Goal { get; init; }

        /// <summary>Settled payments. Money, in the simulation.</summary>
        public decimal Funded { get; init; }

        /// <summary>Founder-approved commitments, paid or not.</summary>
        public decimal Committed { get; init; }

        /// <summary>Requests the founder has not decided on.</summary>
        public decimal Interest { get; init; }

        /// <summary>Agreed amounts with an open funding request.</summary>
        public decimal PaymentDue { get; init; }

        public int FundedInvestors { get; init; }
        public int CommittedInvestors { get; init; }
        public int PendingRequests { get; init; }

        public decimal NetProceeds { get; init; }
        public decimal PlatformFees { get; init; }

        public int FundedPct => FundingMath.Pct(Funded, Goal);
        public int CommittedPct => FundingMath.Pct(Committed, Goal);
        public bool IsFullyFunded => Goal > 0m && Funded >= Goal;
        public bool IsFullyCommitted => Goal > 0m && Committed >= Goal;
        public string Status => FundingMath.PublicStatus(Funded, Committed, Goal);
        public decimal Remaining => Math.Max(0m, Goal - Funded);

        public static FundingSummary Empty(int projectId, decimal goal) =>
            new() { ProjectId = projectId, Goal = goal };
    }

    /// <summary>
    /// The single definition of every funding figure in Vestora.
    /// <para>
    /// Before this file the expression <c>Investments.Where(i =&gt; i.Status == "Approved")
    /// .Sum(i =&gt; i.Amount)</c> was written out by hand in fifteen places — the browse
    /// feed, bookmarks, both dashboards, admin analytics, the sort comparators, the
    /// deal room. They agreed only by coincidence, and they all called founder approval
    /// "raised". Once money exists in the model that coincidence becomes a lie told
    /// fifteen different ways.
    /// </para>
    /// <para>
    /// Everything here is an <see cref="Expression"/> so it translates to SQL. Callers
    /// compose them into projections; nothing pulls rows into memory to add them up.
    /// </para>
    /// </summary>
    public static class FundingMath
    {
        // ------------------------------------------------------------------
        //  The four figures, and the difference between them
        // ------------------------------------------------------------------
        //
        //   Interest   — requests awaiting a founder decision. Not capital.
        //   Committed  — the founder accepted the relationship. Still not capital.
        //   PaymentDue — a funding request is open and unpaid. Capital, promised.
        //   Funded     — a payment settled. This, and only this, is money.
        //
        // Interest ≥ Committed ≥ Funded holds everywhere by construction.

        /// <summary>Pending requests — the founder has not decided yet.</summary>
        public static readonly Expression<Func<Investment, bool>> IsInterest =
            i => i.Status == "Pending";

        /// <summary>
        /// Founder-accepted relationships. Named "committed" and never "raised":
        /// it is a stated intention with a person attached, not a transfer.
        /// </summary>
        public static readonly Expression<Func<Investment, bool>> IsCommitted =
            i => i.Status == "Approved";

        /// <summary>A settled payment. The one condition that produces funded capital.</summary>
        public static readonly Expression<Func<PaymentTransaction, bool>> IsFunded =
            t => t.Status == PaymentStatus.Succeeded;

        // ------------------------------------------------------------------
        //  Per-project figures (SQL-translatable, used in list projections)
        // ------------------------------------------------------------------

        /// <summary>
        /// Money actually received by a venture, in the simulation. Refunded
        /// transactions leave the Succeeded state, so they fall out of this sum with no
        /// special case — reversal is subtraction by construction.
        /// </summary>
        public static readonly Expression<Func<Project, decimal>> FundedOf =
            p => p.Investments
                  .SelectMany(i => i.FundingRequests)
                  .SelectMany(f => f.Transactions)
                  .Where(t => t.Status == PaymentStatus.Succeeded)
                  .Sum(t => (decimal?)t.Amount) ?? 0m;

        /// <summary>Founder-approved commitments, paid or not. The old "RaisedAmount", correctly named.</summary>
        public static readonly Expression<Func<Project, decimal>> CommittedOf =
            p => p.Investments
                  .Where(i => i.Status == "Approved")
                  .Sum(i => (decimal?)i.Amount) ?? 0m;

        /// <summary>Requests still awaiting the founder's decision.</summary>
        public static readonly Expression<Func<Project, decimal>> InterestOf =
            p => p.Investments
                  .Where(i => i.Status == "Pending")
                  .Sum(i => (decimal?)i.Amount) ?? 0m;

        /// <summary>Agreed amounts with an open funding request — promised, not yet paid.</summary>
        public static readonly Expression<Func<Project, decimal>> PaymentDueOf =
            p => p.Investments
                  .SelectMany(i => i.FundingRequests)
                  .Where(f => f.Status == FundingRequestStatus.Open)
                  .Sum(f => (decimal?)f.Amount) ?? 0m;

        /// <summary>
        /// Whether a venture has actually taken in what it asked for.
        /// <para>
        /// This replaces <c>approved &gt;= goal</c> everywhere it appeared. A round is not
        /// complete because people said yes; it is complete because the money arrived.
        /// </para>
        /// </summary>
        public static readonly Expression<Func<Project, bool>> IsFullyFunded =
            p => p.Investments
                  .SelectMany(i => i.FundingRequests)
                  .SelectMany(f => f.Transactions)
                  .Where(t => t.Status == PaymentStatus.Succeeded)
                  .Sum(t => (decimal?)t.Amount) >= p.InvestmentNeeded;

        /// <summary>
        /// Whether the stated commitments cover the goal. Distinct from
        /// <see cref="IsFullyFunded"/> and never presented as the same thing.
        /// </summary>
        public static readonly Expression<Func<Project, bool>> IsFullyCommitted =
            p => p.Investments
                  .Where(i => i.Status == "Approved")
                  .Sum(i => (decimal?)i.Amount) >= p.InvestmentNeeded;

        /// <summary>Distinct investors whose money actually arrived.</summary>
        public static readonly Expression<Func<Project, int>> FundedInvestorCountOf =
            p => p.Investments
                  .SelectMany(i => i.FundingRequests)
                  .SelectMany(f => f.Transactions)
                  .Where(t => t.Status == PaymentStatus.Succeeded)
                  .Select(t => t.InvestorId)
                  .Distinct()
                  .Count();

        /// <summary>Distinct investors the founder has accepted, paid or not.</summary>
        public static readonly Expression<Func<Project, int>> CommittedInvestorCountOf =
            p => p.Investments
                  .Where(i => i.Status == "Approved")
                  .Select(i => i.InvestorId)
                  .Distinct()
                  .Count();

        // ------------------------------------------------------------------
        //  Public funding status
        // ------------------------------------------------------------------

        /// <summary>
        /// What a venture card says about its round. Driven by funded capital, with
        /// "Fully Committed" as its own distinct state so a round that is spoken for but
        /// unpaid is neither hidden nor overstated.
        /// </summary>
        public const string StatusFunded = "Funded";
        public const string StatusFullyCommitted = "Fully Committed";
        public const string StatusRaising = "Raising";

        public static string PublicStatus(decimal funded, decimal committed, decimal goal)
        {
            if (goal <= 0m) return StatusRaising;
            if (funded >= goal) return StatusFunded;
            if (committed >= goal) return StatusFullyCommitted;
            return StatusRaising;
        }

        /// <summary>Percentage of the goal that has actually been funded, clamped to 100.</summary>
        public static int Pct(decimal amount, decimal goal) =>
            goal <= 0m ? 0 : (int)Math.Min(100m, Math.Round(amount / goal * 100m));

        // ------------------------------------------------------------------
        //  Capacity
        // ------------------------------------------------------------------

        /// <summary>
        /// How much of a round is still open to new requests.
        /// <para>
        /// Measured against commitments rather than funded money on purpose. A founder
        /// who has accepted the full goal should stop taking new requests even though
        /// nobody has paid yet — otherwise the moment payments land the round is
        /// oversubscribed and somebody has to be turned away after saying yes. Requests
        /// that lapse release their share automatically when the sweeper expires them.
        /// </para>
        /// </summary>
        public static decimal RemainingCapacity(decimal goal, decimal committed) =>
            Math.Max(0m, goal - committed);

        // ------------------------------------------------------------------
        //  Relationship funding state (one relationship, not one venture)
        // ------------------------------------------------------------------

        public const string StateRequested = "Requested";
        public const string StateCommitted = "Committed";
        public const string StatePaymentDue = "PaymentDue";
        public const string StateProcessing = "Processing";
        public const string StateFunded = "Funded";
        public const string StateRefunded = "Refunded";
        public const string StateDeclined = "Declined";

        /// <summary>
        /// Where one relationship sits on the money axis, derived rather than stored.
        /// A stored column would be a fifth place for the numbers to disagree.
        /// </summary>
        public static string StateOf(
            string investmentStatus,
            bool hasSucceededPayment,
            bool hasRefundedPayment,
            bool hasOpenRequest,
            bool hasProcessingPayment)
        {
            if (hasSucceededPayment) return StateFunded;
            if (investmentStatus == PipelineStages.Declined) return StateDeclined;
            if (hasProcessingPayment) return StateProcessing;
            if (hasOpenRequest) return StatePaymentDue;
            if (hasRefundedPayment) return StateRefunded;
            if (investmentStatus == "Approved") return StateCommitted;
            return StateRequested;
        }

        // ------------------------------------------------------------------
        //  The shared loader
        // ------------------------------------------------------------------

        /// <summary>
        /// Every funding figure for a set of ventures, in two queries, defined once.
        /// <para>
        /// This exists because the expressions above cannot be spliced into a larger
        /// projection — EF translates an expression tree it is handed, not a C# call to
        /// something that returns one. Rather than paste the same sums back into every
        /// DTO and hope they stay identical, call sites project their own fields and ask
        /// this for the money. It costs one extra round trip per screen and removes the
        /// only class of bug that actually matters here: two surfaces disagreeing about
        /// how much a venture has raised.
        /// </para>
        /// </summary>
        public static async Task<Dictionary<int, FundingSummary>> SummariesAsync(
            AppDbContext db, IReadOnlyCollection<int> projectIds, CancellationToken ct = default)
        {
            if (projectIds.Count == 0) return new Dictionary<int, FundingSummary>();

            var ids = projectIds.Distinct().ToList();

            var goals = await db.Projects
                .AsNoTracking()
                .IgnoreQueryFilters()
                .Where(p => ids.Contains(p.Id))
                .Select(p => new { p.Id, p.InvestmentNeeded })
                .ToListAsync(ct);

            var commitments = await db.Investments
                .AsNoTracking()
                .IgnoreQueryFilters()
                .Where(i => ids.Contains(i.ProjectId) && (i.Status == "Approved" || i.Status == "Pending"))
                .Select(i => new { i.ProjectId, i.Status, i.Amount, i.InvestorId })
                .ToListAsync(ct);

            // Settled money, and the fee snapshot that came with it.
            var settled = await db.PaymentTransactions
                .AsNoTracking()
                .IgnoreQueryFilters()
                .Where(t => ids.Contains(t.ProjectId) && t.Status == PaymentStatus.Succeeded)
                .Select(t => new { t.ProjectId, t.Amount, t.FeeAmount, t.NetToFounder, t.InvestorId })
                .ToListAsync(ct);

            var due = await db.FundingRequests
                .AsNoTracking()
                .IgnoreQueryFilters()
                .Where(f => ids.Contains(f.ProjectId) && f.Status == FundingRequestStatus.Open)
                .Select(f => new { f.ProjectId, f.Amount })
                .ToListAsync(ct);

            return ids.ToDictionary(id => id, id =>
            {
                var goal = goals.FirstOrDefault(g => g.Id == id)?.InvestmentNeeded ?? 0m;
                var mine = commitments.Where(c => c.ProjectId == id).ToList();
                var approved = mine.Where(c => c.Status == "Approved").ToList();
                var pending = mine.Where(c => c.Status == "Pending").ToList();
                var paid = settled.Where(t => t.ProjectId == id).ToList();

                return new FundingSummary
                {
                    ProjectId = id,
                    Goal = goal,
                    Funded = paid.Sum(t => t.Amount),
                    Committed = approved.Sum(c => c.Amount),
                    Interest = pending.Sum(c => c.Amount),
                    PaymentDue = due.Where(d => d.ProjectId == id).Sum(d => d.Amount),
                    FundedInvestors = paid.Select(t => t.InvestorId).Distinct().Count(),
                    CommittedInvestors = approved.Select(c => c.InvestorId).Distinct().Count(),
                    PendingRequests = pending.Count,
                    NetProceeds = paid.Sum(t => t.NetToFounder),
                    PlatformFees = paid.Sum(t => t.FeeAmount),
                };
            });
        }

        /// <summary>Convenience for the single-venture screens.</summary>
        public static async Task<FundingSummary> SummaryAsync(
            AppDbContext db, int projectId, CancellationToken ct = default)
        {
            var map = await SummariesAsync(db, new[] { projectId }, ct);
            return map.TryGetValue(projectId, out var s) ? s : FundingSummary.Empty(projectId, 0m);
        }
    }
}
