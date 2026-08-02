using System;
using System.Collections.Generic;

namespace MyAppApi.Services
{
    /// <summary>
    /// Credibility built only from what Vestora can actually prove.
    /// <para>
    /// There is no "Verified" badge here, because Vestora verifies nothing about a
    /// person's identity, company or funds — claiming otherwise would be the single
    /// most damaging thing this product could say. What the platform does know is
    /// narrow but real: whether an email was confirmed, how long an account has
    /// existed, whether an admin reviewed a listing, whether a founder published
    /// documents and kept the roadmap moving, whether other backers endorsed them.
    /// </para>
    /// <para>
    /// Each signal is named for exactly what it is. "Email confirmed" is not "Verified
    /// investor". "Profile complete" is not a quality judgement. Nothing here implies
    /// diligence the platform has not performed.
    /// </para>
    /// </summary>
    public static class TrustSignals
    {
        /// <summary>
        /// A signal's weight in how prominently it is shown. Deliberately not summed
        /// into a score: a single number invites comparison the underlying facts cannot
        /// support, and would be read as a rating.
        /// </summary>
        public enum Strength
        {
            /// <summary>Platform-verified fact (email confirmation, admin review).</summary>
            Verified,
            /// <summary>Objective platform history (account age, rounds backed).</summary>
            History,
            /// <summary>Self-reported completeness (mandate stated, documents published).</summary>
            SelfReported,
        }

        public sealed record Signal(string Key, Strength Level, string? Value = null);

        // ---- Keys. The frontend owns the wording in both languages; the backend only
        // ---- ever states which facts are true.

        public const string EmailConfirmed = "email_confirmed";
        public const string MemberSince = "member_since";
        public const string AdminReviewed = "admin_reviewed";
        public const string DocumentsPublished = "documents_published";
        public const string RoadmapMaintained = "roadmap_maintained";
        public const string PostsUpdates = "posts_updates";
        public const string TeamListed = "team_listed";
        public const string BackedRounds = "backed_rounds";
        public const string EndorsedByBackers = "endorsed_by_backers";
        public const string MandateStated = "mandate_stated";
        public const string RoundsCompleted = "rounds_completed";

        /// <summary>
        /// Builds a person's signal set. Every argument is a fact read from the
        /// database — this method invents nothing and infers nothing.
        /// </summary>
        public static List<Signal> ForUser(
            bool emailVerified,
            DateTime? createdAtUtc,
            int backedRounds,
            int endorsements,
            bool hasMandate,
            int completedRounds)
        {
            var list = new List<Signal>();

            if (emailVerified)
                list.Add(new Signal(EmailConfirmed, Strength.Verified));

            if (createdAtUtc.HasValue)
                list.Add(new Signal(MemberSince, Strength.History, createdAtUtc.Value.ToString("o")));

            if (backedRounds > 0)
                list.Add(new Signal(BackedRounds, Strength.History, backedRounds.ToString()));

            if (endorsements > 0)
                list.Add(new Signal(EndorsedByBackers, Strength.History, endorsements.ToString()));

            if (completedRounds > 0)
                list.Add(new Signal(RoundsCompleted, Strength.History, completedRounds.ToString()));

            if (hasMandate)
                list.Add(new Signal(MandateStated, Strength.SelfReported));

            return list;
        }

        /// <summary>
        /// Builds a venture's signal set. "Admin reviewed" is the strongest thing a
        /// listing can carry, and it means precisely that a moderator looked at it —
        /// not that the business was audited.
        /// </summary>
        public static List<Signal> ForVenture(
            bool moderationApproved,
            int documentCount,
            int milestoneCount,
            int completedMilestones,
            int updateCount,
            int teamCount)
        {
            var list = new List<Signal>();

            if (moderationApproved)
                list.Add(new Signal(AdminReviewed, Strength.Verified));

            if (documentCount > 0)
                list.Add(new Signal(DocumentsPublished, Strength.SelfReported, documentCount.ToString()));

            // Only counts as maintained when something on it actually shipped —
            // a roadmap of untouched plans is a plan, not a record.
            if (milestoneCount > 0 && completedMilestones > 0)
                list.Add(new Signal(RoadmapMaintained, Strength.History,
                    $"{completedMilestones}/{milestoneCount}"));

            if (updateCount > 0)
                list.Add(new Signal(PostsUpdates, Strength.History, updateCount.ToString()));

            if (teamCount > 0)
                list.Add(new Signal(TeamListed, Strength.SelfReported, teamCount.ToString()));

            return list;
        }
    }
}
