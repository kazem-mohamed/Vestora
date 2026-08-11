using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using MyAppApi.Data;
using MyAppApi.Data.Models;
using MyAppApi.Data.Models.DTOs;
using MyAppApi.Data.Models.Hubs;

namespace MyAppApi.Services
{
    /// <summary>
    /// Proposing, accepting and superseding the terms of one relationship.
    /// <para>
    /// This exists as a service rather than sitting in the deal-room controller for the
    /// same reason payments do: it is the only place a stated agreement becomes a fact
    /// the rest of the system reads. A funding request checks it. The pipeline moves on
    /// it. Two controllers writing their own version of "both sides accepted" is exactly
    /// the shape of bug this codebase already paid for once with funding totals.
    /// </para>
    /// </summary>
    public class TermSheetService
    {
        private readonly AppDbContext _db;
        private readonly IHubContext<ChatHub> _hub;

        public TermSheetService(AppDbContext db, IHubContext<ChatHub> hub)
        {
            _db = db;
            _hub = hub;
        }

        /// <summary>
        /// Puts a set of terms on the table.
        /// <para>
        /// The proposer accepts their own sheet by making it — proposing something and
        /// then being asked whether you agree with it is a form nobody should have to
        /// fill in. The other side's acceptance is the one that decides anything.
        /// </para>
        /// <para>
        /// A live sheet is superseded rather than blocked. Renegotiation is the normal
        /// case at this point in a deal, and forcing the proposer to withdraw first would
        /// leave a window where the relationship had no terms at all.
        /// </para>
        /// </summary>
        public async Task<ServiceResult<TermSheetDto>> ProposeAsync(
            Investment deal, int actorUserId, TermSheetInput input, CancellationToken ct = default)
        {
            if (deal.Status != "Approved")
                return ServiceResult<TermSheetDto>.BadRequest(
                    "Terms can be drafted once the founder has accepted the request.");

            if (deal.Stage == PipelineStages.Declined || deal.Stage == PipelineStages.Closed)
                return ServiceResult<TermSheetDto>.BadRequest("This relationship is closed.");

            if (input.Amount <= 0m || input.Amount > 100_000_000m)
                return ServiceResult<TermSheetDto>.BadRequest("Amount is out of range.");

            if (input.EquityPct is < 0m or > 100m)
                return ServiceResult<TermSheetDto>.BadRequest("Equity must be between 0 and 100 percent.");

            if (input.Valuation is < 0m)
                return ServiceResult<TermSheetDto>.BadRequest("Valuation cannot be negative.");

            // Terms already settled cannot be quietly re-agreed at a different number
            // while the money that was called in against them is still arriving.
            var settled = await FundingMath.SettledForInvestmentAsync(_db, deal.Id, ct);
            if (settled > 0m && input.Amount < settled)
                return ServiceResult<TermSheetDto>.BadRequest(
                    $"{settled:N0} has already settled on this relationship. New terms cannot be for less than that.");

            var isFounder = deal.Project.OwnerId == actorUserId;
            var now = DateTime.UtcNow;

            var live = await _db.TermSheets
                .Where(s => s.InvestmentId == deal.Id && s.Status == TermSheetStatus.Proposed)
                .ToListAsync(ct);

            foreach (var old in live)
                old.Status = TermSheetStatus.Superseded;

            var version = await _db.TermSheets.CountAsync(s => s.InvestmentId == deal.Id, ct) + 1;

            var sheet = new TermSheet
            {
                InvestmentId = deal.Id,
                Version = version,
                Amount = input.Amount,
                Currency = "USD",
                EquityPct = input.EquityPct,
                Valuation = input.Valuation,
                UseOfFunds = Trim(input.UseOfFunds, 1000),
                OtherTerms = Trim(input.OtherTerms, 2000),
                Status = TermSheetStatus.Proposed,
                ProposedByUserId = actorUserId,
                FounderAcceptedAtUtc = isFounder ? now : null,
                InvestorAcceptedAtUtc = isFounder ? null : now,
                CreatedAtUtc = now,
            };

            _db.TermSheets.Add(sheet);
            await _db.SaveChangesAsync(ct);

            await NotifyAsync(
                isFounder ? deal.InvestorId ?? 0 : deal.Project.OwnerId, actorUserId, deal,
                Payments.PaymentNotificationTypes.TermsProposed,
                $"{deal.Project.Name}: terms were proposed — {input.Amount:N0} USD. Review and accept them in the deal room.");

            await _db.SaveChangesAsync(ct);
            return ServiceResult<TermSheetDto>.Created(Map(sheet, deal, actorUserId));
        }

        /// <summary>
        /// The other side accepts. When that completes the pair, the terms are agreed —
        /// and the relationship moves to Committed, which is the first time in this
        /// product that stage has been backed by a document rather than by a claim.
        /// </summary>
        public async Task<ServiceResult<TermSheetDto>> AcceptAsync(
            Investment deal, int sheetId, int actorUserId, CancellationToken ct = default)
        {
            var sheet = await _db.TermSheets.FirstOrDefaultAsync(s => s.Id == sheetId && s.InvestmentId == deal.Id, ct);
            if (sheet == null) return ServiceResult<TermSheetDto>.NotFound("Terms not found.");

            if (sheet.Status != TermSheetStatus.Proposed)
                return ServiceResult<TermSheetDto>.BadRequest("These terms are no longer on the table.");

            var isFounder = deal.Project.OwnerId == actorUserId;
            var now = DateTime.UtcNow;

            if (isFounder && sheet.FounderAcceptedAtUtc != null)
                return ServiceResult<TermSheetDto>.BadRequest("You have already accepted these terms.");
            if (!isFounder && sheet.InvestorAcceptedAtUtc != null)
                return ServiceResult<TermSheetDto>.BadRequest("You have already accepted these terms.");

            if (isFounder) sheet.FounderAcceptedAtUtc = now;
            else sheet.InvestorAcceptedAtUtc = now;

            if (sheet.IsAgreed)
            {
                sheet.Status = TermSheetStatus.Accepted;
                sheet.AgreedAtUtc = now;

                // Committed finally means what it always said it meant. Recorded through
                // StageLog like every other move, with the sheet as the reason, so the
                // history says which agreement moved it rather than only that it moved.
                if (deal.Stage != PipelineStages.Closed && deal.Stage != PipelineStages.Declined)
                {
                    await StageLog.MoveAsync(_db, deal, PipelineStages.Committed, actorUserId,
                        $"Terms agreed · v{sheet.Version} · {sheet.Amount:N0} {sheet.Currency}", ct);
                }

                await NotifyAsync(deal.Project.OwnerId, actorUserId, deal,
                    Payments.PaymentNotificationTypes.TermsAgreed,
                    $"{deal.Project.Name}: both sides have accepted the terms — {sheet.Amount:N0} {sheet.Currency}.");
                await NotifyAsync(deal.InvestorId ?? 0, actorUserId, deal,
                    Payments.PaymentNotificationTypes.TermsAgreed,
                    $"{deal.Project.Name}: both sides have accepted the terms — {sheet.Amount:N0} {sheet.Currency}.");
            }
            else
            {
                await NotifyAsync(
                    isFounder ? deal.InvestorId ?? 0 : deal.Project.OwnerId, actorUserId, deal,
                    Payments.PaymentNotificationTypes.TermsProposed,
                    $"{deal.Project.Name}: the other side accepted the terms. Yours is the acceptance still outstanding.");
            }

            await _db.SaveChangesAsync(ct);
            return ServiceResult<TermSheetDto>.Ok(Map(sheet, deal, actorUserId));
        }

        /// <summary>Declining, with the reason attached. A silent no is not an answer.</summary>
        public async Task<ServiceResult<TermSheetDto>> DeclineAsync(
            Investment deal, int sheetId, int actorUserId, string? reason, CancellationToken ct = default)
        {
            var sheet = await _db.TermSheets.FirstOrDefaultAsync(s => s.Id == sheetId && s.InvestmentId == deal.Id, ct);
            if (sheet == null) return ServiceResult<TermSheetDto>.NotFound("Terms not found.");

            if (sheet.Status != TermSheetStatus.Proposed)
                return ServiceResult<TermSheetDto>.BadRequest("These terms are no longer on the table.");

            var text = reason?.Trim();
            if (string.IsNullOrWhiteSpace(text))
                return ServiceResult<TermSheetDto>.BadRequest("Say why — a rejection without a reason ends the conversation.");

            sheet.Status = TermSheetStatus.Declined;
            sheet.DeclinedReason = Trim(text, 500);

            var isFounder = deal.Project.OwnerId == actorUserId;
            await NotifyAsync(
                isFounder ? deal.InvestorId ?? 0 : deal.Project.OwnerId, actorUserId, deal,
                Payments.PaymentNotificationTypes.TermsDeclined,
                $"{deal.Project.Name}: the proposed terms were declined. {sheet.DeclinedReason}");

            await _db.SaveChangesAsync(ct);
            return ServiceResult<TermSheetDto>.Ok(Map(sheet, deal, actorUserId));
        }

        /// <summary>Every version this relationship has produced, newest first.</summary>
        public async Task<List<TermSheetDto>> HistoryAsync(Investment deal, int viewerId, CancellationToken ct = default)
        {
            var sheets = await _db.TermSheets
                .AsNoTracking()
                .Where(s => s.InvestmentId == deal.Id)
                .OrderByDescending(s => s.Version)
                .ToListAsync(ct);

            return sheets.Select(s => Map(s, deal, viewerId)).ToList();
        }

        private static TermSheetDto Map(TermSheet s, Investment deal, int viewerId)
        {
            var isFounder = deal.Project.OwnerId == viewerId;
            var mine = isFounder ? s.FounderAcceptedAtUtc : s.InvestorAcceptedAtUtc;
            var theirs = isFounder ? s.InvestorAcceptedAtUtc : s.FounderAcceptedAtUtc;

            return new TermSheetDto
            {
                Id = s.Id,
                Version = s.Version,
                Amount = s.Amount,
                Currency = s.Currency,
                EquityPct = s.EquityPct,
                Valuation = s.Valuation,
                UseOfFunds = s.UseOfFunds,
                OtherTerms = s.OtherTerms,
                Status = s.Status,
                ProposedByUserId = s.ProposedByUserId,
                ProposedByMe = s.ProposedByUserId == viewerId,
                AcceptedByMe = mine != null,
                AcceptedByThem = theirs != null,
                AgreedAtUtc = s.AgreedAtUtc,
                DeclinedReason = s.DeclinedReason,
                CreatedAtUtc = s.CreatedAtUtc,
                // Only the side that has not accepted yet is offered the choice, and only
                // while the sheet is live.
                CanAccept = s.Status == TermSheetStatus.Proposed && mine == null,
                CanDecline = s.Status == TermSheetStatus.Proposed && mine == null,
            };
        }

        private async Task NotifyAsync(int recipientId, int actorId, Investment deal, string type, string content)
        {
            if (recipientId == 0 || recipientId == actorId) return;

            _db.Notifications.Add(new Notification
            {
                UserId = recipientId,
                ActorUserId = actorId,
                ProjectId = deal.ProjectId,
                InvestmentId = deal.Id,
                NotificationType = type,
                Content = content,
                DateCreated = DateTime.UtcNow,
                IsRead = false,
            });

            await _hub.Clients.Group($"user:{recipientId}").SendAsync("DealActivity", new
            {
                investmentId = deal.Id,
                projectId = deal.ProjectId,
                type,
            });
        }

        private static string? Trim(string? value, int max) =>
            string.IsNullOrWhiteSpace(value) ? null : value.Trim() is var v && v.Length <= max ? v : value.Trim()[..max];
    }
}
