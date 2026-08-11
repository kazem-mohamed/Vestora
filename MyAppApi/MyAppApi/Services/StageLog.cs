using Microsoft.EntityFrameworkCore;
using MyAppApi.Data;
using MyAppApi.Data.Models;

namespace MyAppApi.Services
{
    /// <summary>
    /// The one way a relationship's stage is allowed to change.
    /// <para>
    /// Before this, seven places assigned <c>Stage</c> and <c>StageUpdatedAt</c> by hand
    /// — two controllers, the payment service, the round-closing path. They agreed
    /// because whoever wrote them remembered to set both. Adding a history row to each
    /// of those sites by hand would have been the same arrangement with one more thing
    /// to forget, and the first site that forgot would have produced a timeline that was
    /// quietly missing a step — worse than no timeline, because it looks complete.
    /// </para>
    /// <para>
    /// Nothing is saved here. The event is added to the change tracker beside the column
    /// it describes, so the caller's existing <c>SaveChangesAsync</c> commits both or
    /// neither. A history that can be half-written is not history.
    /// </para>
    /// </summary>
    public static class StageLog
    {
        /// <summary>
        /// Moves a relationship to <paramref name="toStage"/> and records the move.
        /// <para>
        /// A move to the stage it is already in is recorded anyway when a reason is
        /// given — re-declining with a different reason is a real event — and skipped
        /// when it is not, so a founder re-selecting the current stage does not litter
        /// the timeline.
        /// </para>
        /// </summary>
        public static async Task MoveAsync(
            AppDbContext db,
            Investment investment,
            string toStage,
            int actorUserId,
            string? reason = null,
            CancellationToken ct = default)
        {
            var from = investment.Stage;
            if (from == toStage && string.IsNullOrWhiteSpace(reason)) return;

            var now = DateTime.UtcNow;

            // How long it sat where it was. Taken from the last recorded move, falling
            // back to the column for relationships that predate this table and finally
            // to the opening date — a relationship always has one of the three.
            var lastMoveAt = await db.InvestmentStageEvents
                .Where(e => e.InvestmentId == investment.Id)
                .OrderByDescending(e => e.AtUtc)
                .Select(e => (DateTime?)e.AtUtc)
                .FirstOrDefaultAsync(ct)
                ?? investment.StageUpdatedAt
                ?? investment.Date;

            db.InvestmentStageEvents.Add(new InvestmentStageEvent
            {
                InvestmentId = investment.Id,
                FromStage = from,
                ToStage = toStage,
                ActorUserId = actorUserId,
                Reason = string.IsNullOrWhiteSpace(reason)
                    ? null
                    : reason.Length > 300 ? reason[..300] : reason,
                MinutesInPreviousStage = (int)Math.Max(0, Math.Round((now - lastMoveAt).TotalMinutes)),
                AtUtc = now,
            });

            investment.Stage = toStage;
            investment.StageUpdatedAt = now;
        }

        /// <summary>
        /// Records the relationship's first stage. Separate from <see cref="MoveAsync"/>
        /// because there is no previous stage to come from and no duration to measure,
        /// and pretending otherwise would put a zero-minute "from nothing" row in every
        /// history.
        /// </summary>
        public static void Opened(AppDbContext db, Investment investment, int actorUserId)
        {
            db.InvestmentStageEvents.Add(new InvestmentStageEvent
            {
                Investment = investment,
                FromStage = null,
                ToStage = investment.Stage,
                ActorUserId = actorUserId,
                AtUtc = investment.Date,
            });
        }
    }
}
