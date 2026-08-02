using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;
using MyAppApi.Data;
using MyAppApi.Services;

namespace MyAppApi.Data.Models.DTOs
{
    /// <summary>
    /// The single definition of how a Project becomes a venture card.
    /// <para>
    /// Browse, a founder's profile and an investor's backed list all render the same
    /// component, so they must all be fed the same shape by the same rules — otherwise
    /// the same venture shows a different total depending on which page you reached it
    /// from. Kept as an expression tree so EF Core still translates it to SQL rather
    /// than materialising entities.
    /// </para>
    /// <para>
    /// The money is deliberately NOT in the expression. Funded capital is a sum over
    /// settled transactions two levels below the venture, and every screen must get that
    /// number from the same place — so <see cref="ApplyFundingAsync"/> fills it in from
    /// <see cref="FundingMath"/> after the cards are materialised. Call it, always;
    /// a card without it reports zero rather than something wrong, which is the failure
    /// mode worth having.
    /// </para>
    /// </summary>
    public static class ProjectCardProjection
    {
        public static readonly Expression<Func<Project, ProjectCardDto>> Card = p => new ProjectCardDto
        {
            Id = p.Id,
            Name = p.Name,
            Topic = p.Topic,
            Category = p.Category,
            Industry = p.Industry,
            Location = p.Location,
            Stage = p.Stage,
            InvestmentNeeded = p.InvestmentNeeded,
            EquityOffered = p.EquityOffered,
            OwnerId = p.OwnerId,
            OwnerName = p.Owner.UserName,
            CreatedDate = p.CreatedDate,
            CoverImageId = p.Images.OrderBy(im => im.Id).Select(im => (int?)im.Id).FirstOrDefault(),
            ViewCount = p.ProjectViews.Count(),
            LastUpdateAt = p.Updates.OrderByDescending(u => u.CreatedDate).Select(u => (DateTime?)u.CreatedDate).FirstOrDefault(),
            AverageRating = p.Reviews.Any() ? p.Reviews.Average(r => (double?)r.Rating) : null,
            ReviewCount = p.Reviews.Count()
        };

        /// <summary>
        /// Fills the funding figures on a materialised page of cards, from the one
        /// definition of what those figures mean.
        /// </summary>
        public static async Task ApplyFundingAsync(
            AppDbContext db, IReadOnlyCollection<ProjectCardDto> cards, CancellationToken ct = default)
        {
            if (cards.Count == 0) return;

            var summaries = await FundingMath.SummariesAsync(db, cards.Select(c => c.Id).ToList(), ct);

            foreach (var card in cards)
            {
                if (!summaries.TryGetValue(card.Id, out var s)) continue;

                card.FundedAmount = s.Funded;
                card.CommittedAmount = s.Committed;
                card.BackerCount = s.CommittedInvestors;
                card.FundedBackerCount = s.FundedInvestors;
                card.IsFullyFunded = s.IsFullyFunded;
                card.IsFullyCommitted = s.IsFullyCommitted;
                card.FundingStatus = s.Status;
            }
        }

        /// <summary>
        /// The same fill for the fuller <see cref="ProjectsDto"/> used by the founder's
        /// roster and the venture detail page. One definition, two shapes.
        /// </summary>
        public static async Task ApplyFundingAsync(
            AppDbContext db, IReadOnlyCollection<ProjectsDto> projects, CancellationToken ct = default)
        {
            if (projects.Count == 0) return;

            var summaries = await FundingMath.SummariesAsync(db, projects.Select(p => p.Id).ToList(), ct);

            foreach (var dto in projects)
            {
                if (!summaries.TryGetValue(dto.Id, out var s)) continue;

                dto.FundedAmount = s.Funded;
                dto.CommittedAmount = s.Committed;
                dto.InterestAmount = s.Interest;
                // The legacy name now carries the honest number rather than the
                // flattering one. Nothing reads it expecting commitments any more.
                dto.RaisedAmount = s.Funded;
                dto.NumberOfInvestors = s.CommittedInvestors;
                dto.FundedInvestorCount = s.FundedInvestors;
                dto.PendingRequestsCount = s.PendingRequests;
                dto.Status = s.Status;
            }
        }
    }
}
