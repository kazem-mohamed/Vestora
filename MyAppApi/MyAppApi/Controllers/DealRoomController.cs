using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using MyAppApi.Data;
using MyAppApi.Data.Models;
using MyAppApi.Data.Models.DTOs;
using MyAppApi.Data.Models.Hubs;
using MyAppApi.Services;
using MyAppApi.Services.Payments;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace MyAppApi.Controllers
{
    /// <summary>
    /// The workspace for one investment relationship.
    /// <para>
    /// The pipeline already defined eight stages, but only the first four had anywhere
    /// to happen: after approval both sides were left with a general chat and two
    /// private notes neither could see. This gives the relationship a place — the
    /// questions asked and answered, the documents requested and supplied, and one
    /// chronology of everything that occurred — assembled from the systems that
    /// already existed rather than replacing them.
    /// </para>
    /// <para>
    /// Access is by participation, checked server-side on every call. Being logged in
    /// is not enough; being the founder who owns the venture or the investor who
    /// opened the request is.
    /// </para>
    /// </summary>
    [Route("api/deals")]
    [ApiController]
    [Authorize]
    public class DealRoomController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IHubContext<ChatHub> _hub;
        private readonly PaymentService _payments;
        private readonly TermSheetService _terms;
        private readonly IFileUploadSecurityService _uploads;

        public DealRoomController(
            AppDbContext db,
            IHubContext<ChatHub> hub,
            PaymentService payments,
            TermSheetService terms,
            IFileUploadSecurityService uploads)
        {
            _db = db;
            _hub = hub;
            _payments = payments;
            _terms = terms;
            _uploads = uploads;
        }

        private int Me() =>
            int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : 0;

        private bool IsAdmin() => User.IsInRole("Admin");

        /// <summary>
        /// Loads a relationship only if the caller is part of it.
        /// <para>
        /// Returns the investment with the venture and both parties attached, or null.
        /// Every endpoint in this controller starts here — an id arriving from the
        /// client proves nothing about who is allowed to see it.
        /// </para>
        /// </summary>
        private async Task<Investment?> LoadParticipantDealAsync(int investmentId)
        {
            var me = Me();
            var deal = await _db.Investments
                .Include(i => i.Project)
                .Include(i => i.Investor)
                .FirstOrDefaultAsync(i => i.Id == investmentId);

            if (deal == null) return null;

            var isFounder = deal.Project.OwnerId == me;
            var isInvestor = deal.InvestorId == me;

            // Admins may read a relationship for moderation, but the write endpoints
            // below check participation again — oversight is not impersonation.
            return (isFounder || isInvestor || IsAdmin()) ? deal : null;
        }

        private static string RoleIn(Investment deal, int userId) =>
            deal.Project.OwnerId == userId ? "founder"
            : deal.InvestorId == userId ? "investor"
            : "admin";

        // ==================================================================
        //  READ
        // ==================================================================

        [HttpGet("{investmentId:int}")]
        public async Task<IActionResult> Get(int investmentId)
        {
            var deal = await LoadParticipantDealAsync(investmentId);
            if (deal == null) return NotFound(new { message = "Deal not found." });

            var me = Me();
            var role = RoleIn(deal, me);
            var isFounder = role == "founder";
            var isAdmin = role == "admin";
            var investorId = deal.InvestorId ?? 0;

            // The venture's money, from the one definition, so the room agrees with the
            // venture page it belongs to.
            var venture = await FundingMath.SummaryAsync(_db, deal.ProjectId);

            var founderName = await _db.Users
                .Where(u => u.Id == deal.Project.OwnerId)
                .Select(u => u.UserName)
                .FirstOrDefaultAsync() ?? "";

            var questions = await _db.DealQuestions
                .AsNoTracking()
                .Where(q => q.InvestmentId == investmentId)
                .OrderBy(q => q.CreatedAtUtc)
                .Select(q => new DealQuestionDto
                {
                    Id = q.Id,
                    Question = q.Question,
                    Answer = q.Answer,
                    AskedByUserId = q.AskedByUserId,
                    AskedByName = q.AskedByUser.UserName,
                    AnsweredByName = q.AnsweredByUser != null ? q.AnsweredByUser.UserName : null,
                    CreatedAtUtc = q.CreatedAtUtc,
                    AnsweredAtUtc = q.AnsweredAtUtc,
                    IsWithdrawn = q.IsWithdrawn,
                    ParentQuestionId = q.ParentQuestionId,
                    // Whoever did not ask it is the one who can answer it.
                    CanAnswer = q.AskedByUserId != me && q.Answer == null && !q.IsWithdrawn,
                    CanWithdraw = q.AskedByUserId == me && q.Answer == null && !q.IsWithdrawn,
                })
                .ToListAsync();

            // Follow-ups fold under the question they clarify. Flat, they read as a
            // second unrelated question asked minutes after the first — which is exactly
            // how the answers used to get lost.
            var followUps = questions.Where(q => q.ParentQuestionId != null).ToList();
            questions = questions.Where(q => q.ParentQuestionId == null).ToList();

            foreach (var root in questions)
            {
                root.FollowUps = followUps.Where(f => f.ParentQuestionId == root.Id).ToList();

                // One push-back per question, by the person who asked it, once they have
                // an answer to push back on.
                root.CanFollowUp =
                    root.AskedByUserId == me &&
                    root.Answer != null &&
                    !root.IsWithdrawn &&
                    root.FollowUps.Count == 0;
            }

            var docRequests = await _db.DocumentRequests
                .AsNoTracking()
                .Where(r => r.InvestmentId == investmentId)
                .OrderByDescending(r => r.CreatedAtUtc)
                .Select(r => new DocumentRequestDto
                {
                    Id = r.Id,
                    Title = r.Title,
                    Note = r.Note,
                    Status = r.Status,
                    DeclinedReason = r.DeclinedReason,
                    FulfilledByDocumentId = r.FulfilledByDocumentId,
                    FulfilledByDocumentTitle = r.FulfilledByDocument != null ? r.FulfilledByDocument.Title : null,
                    RequestedByUserId = r.RequestedByUserId,
                    RequestedByName = r.RequestedByUser.UserName,
                    CreatedAtUtc = r.CreatedAtUtc,
                    ResolvedAtUtc = r.ResolvedAtUtc,
                    // Whoever did NOT ask is the one who answers. The old rule named the
                    // founder outright, which is why only the investor could ever ask.
                    CanResolve = r.RequestedByUserId != me && r.Status == "Open" && !isAdmin,
                    CanWithdraw = r.RequestedByUserId == me && r.Status == "Open",
                    Direction = r.RequestedByUserId == deal.Project.OwnerId ? "ToInvestor" : "ToFounder",
                    ResponseFileName = r.ResponseFileName,
                    ResponseSizeBytes = r.ResponseSizeBytes,
                    HasResponseFile = r.ResponseData != null,
                    ResponseNote = r.ResponseNote,
                })
                .ToListAsync();

            // The data room, scoped by the same rule the venture page uses: an approved
            // backer sees backer-only material, anyone else sees only what is public.
            var canSeeBackerDocs = isFounder || deal.Status == "Approved";
            var documents = await _db.ProjectDocuments
                .AsNoTracking()
                .Where(d => d.ProjectId == deal.ProjectId && (d.Visibility == "Public" || canSeeBackerDocs))
                .OrderByDescending(d => d.UploadedAt)
                .Select(d => new DealDocumentDto
                {
                    Id = d.Id,
                    Title = d.Title,
                    FileName = d.FileName,
                    SizeBytes = d.SizeBytes,
                    Visibility = d.Visibility,
                    UploadedAt = d.UploadedAt,
                    // Whether THIS investor opened it. Shown to the founder as a real
                    // engagement signal; the investor does not need telling.
                    OpenedByInvestor = isFounder
                        ? _db.DocumentDownloadLogs.Any(l => l.ProjectDocumentId == d.Id && l.UserId == investorId)
                        : (bool?)null,
                })
                .ToListAsync();

            var unread = await _db.Messages.CountAsync(m =>
                m.ProjectId == deal.ProjectId &&
                m.ReceiverId == me &&
                !m.IsRead &&
                (m.SenderId == deal.Project.OwnerId || m.SenderId == investorId));

            var dto = new DealRoomDto
            {
                InvestmentId = deal.Id,
                ProjectId = deal.ProjectId,
                ProjectName = deal.Project.Name,
                ProjectTopic = deal.Project.Topic,
                CoverImageId = await _db.ProjectImages
                    .Where(im => im.ProjectId == deal.ProjectId)
                    .OrderBy(im => im.Id)
                    .Select(im => (int?)im.Id)
                    .FirstOrDefaultAsync(),
                InvestmentNeeded = deal.Project.InvestmentNeeded,
                CommittedAmount = venture.Committed,
                FundedAmount = venture.Funded,
                ProjectStage = deal.Project.Stage,
                LifecycleStatus = deal.Project.LifecycleStatus,
                RoundClosedAtUtc = deal.Project.RoundClosedAtUtc,

                FounderId = deal.Project.OwnerId,
                FounderName = founderName,
                InvestorId = investorId,
                InvestorName = deal.Investor?.UserName ?? "",
                ViewerRole = role,

                Stage = deal.Stage,
                Status = deal.Status,
                StageUpdatedAt = deal.StageUpdatedAt,
                OpenedAt = deal.Date,
                Amount = deal.Amount,
                // Contact details are the investor's own; the founder needs them to
                // follow up, and the investor already knows them.
                ContactInfo = isFounder || role == "investor" ? deal.ContactInfo : null,
                DeclinedReason = deal.DeclinedReason,
                MyNote = isFounder ? deal.FounderNote : deal.InvestorNote,

                Questions = questions,
                DocumentRequests = docRequests,
                Documents = documents,
                UnreadMessages = unread,
                AllowedStages = PipelineStages.All.ToList(),
                FeeRateBps = _payments.Settings.FeeRateBps,
                IsSandbox = _payments.Settings.IsSandbox,
            };

            await AttachFundingAsync(dto, deal, venture);

            dto.TermSheets = await _terms.HistoryAsync(deal, me);
            dto.AgreedTerms = dto.TermSheets.FirstOrDefault(s => s.Status == TermSheetStatus.Accepted);

            dto.Timeline = await BuildTimelineAsync(deal, questions, docRequests);
            dto.StageDurations = await BuildStageDurationsAsync(deal);
            dto.Health = BuildHealth(dto, questions, docRequests);
            dto.NextSteps = DeriveNextSteps(dto, questions, docRequests);

            return Ok(dto);
        }

        /// <summary>
        /// Puts the relationship's money onto the room payload: the live ask if there is
        /// one, what has settled, and which of the two sides can act next.
        /// </summary>
        private async Task AttachFundingAsync(DealRoomDto dto, Investment deal, FundingSummary venture)
        {
            var request = await _db.FundingRequests
                .Where(f => f.InvestmentId == deal.Id)
                .OrderByDescending(f => f.Status == FundingRequestStatus.Open)
                .ThenByDescending(f => f.Id)
                .FirstOrDefaultAsync();

            var payments = await _db.PaymentTransactions
                .AsNoTracking()
                .Where(t => t.InvestmentId == deal.Id)
                .Select(t => new { t.Status, t.Amount, t.SucceededAtUtc })
                .ToListAsync();

            // Summed, not "the first one". A commitment can be called in over several
            // tranches, and reading only the earliest settlement would report a
            // part-paid relationship as fully funded for the amount of its first
            // instalment — understating the money and closing the door on the rest.
            var settledRows = payments.Where(t => t.Status == PaymentStatus.Succeeded).ToList();
            var settledTotal = settledRows.Sum(t => t.Amount);
            var hasSettled = settledRows.Count > 0;
            var hasOpen = request != null && request.Status == FundingRequestStatus.Open;

            var target = await FundingMath.CommitmentTargetAsync(_db, deal.Id, deal.Amount);
            var fullySettled = FundingMath.IsFullySettled(settledTotal, target);

            dto.SettledTotal = settledTotal;
            dto.CommitmentTarget = target;

            dto.FundingRequest = request == null ? null : await _payments.MapRequestAsync(request);
            dto.FundedThisDeal = hasSettled ? settledTotal : null;
            dto.FundedAtUtc = settledRows.Max(t => t.SucceededAtUtc);
            dto.FundingState = FundingMath.StateOf(
                deal.Status,
                hasSettled,
                payments.Any(t => t.Status == PaymentStatus.Refunded),
                hasOpen,
                payments.Any(t => t.Status == PaymentStatus.Processing),
                fullySettled);

            // What is left of the round once every OTHER commitment is counted. This
            // relationship's own commitment is excluded, or a founder could never call in
            // the deal that filled the round.
            var committedElsewhere = await _db.Investments
                .Where(i => i.ProjectId == deal.ProjectId && i.Status == "Approved" && i.Id != deal.Id)
                .SumAsync(i => (decimal?)i.Amount) ?? 0m;

            // Tranches already settled have left the round's headroom, but this
            // relationship's commitment is still counted whole — so they come off here
            // too, or the founder could call in the same commitment twice by splitting it.
            var headroom = Math.Max(0m,
                FundingMath.RemainingCapacity(deal.Project.InvestmentNeeded, committedElsewhere) - settledTotal);

            // Agreed terms are the tighter ceiling when they exist: an ask may call the
            // agreement in, never quietly exceed it.
            if (dto.AgreedTerms != null)
                headroom = Math.Min(headroom, FundingMath.UnsettledCommitment(dto.AgreedTerms.Amount, settledTotal));

            dto.MaxRequestableAmount = headroom;

            var roundOpen = deal.Project.LifecycleStatus != "Closed";
            var relationshipLive = deal.Stage != PipelineStages.Declined && deal.Stage != PipelineStages.Closed;

            dto.CanRequestFunds =
                dto.ViewerRole == "founder" &&
                deal.Status == "Approved" &&
                relationshipLive &&
                roundOpen &&
                !fullySettled &&
                headroom > 0m &&
                !hasOpen;

            // A closed round still lets an existing ask be paid — pulling the rug from
            // under an investor mid-checkout would be worse than a slightly late close.
            dto.CanCompletePayment =
                dto.ViewerRole == "investor" &&
                hasOpen &&
                request!.Status != FundingRequestStatus.Paid &&
                request.CounterStatus != CounterOfferStatus.Proposed &&
                request.ExpiresAtUtc > DateTime.UtcNow;
        }

        /// <summary>
        /// Whether the relationship is moving, and what is holding it up.
        /// <para>
        /// Every input is a fact the room already had. Nothing is maintained by hand,
        /// which is the only reason the answer can be trusted — a health field somebody
        /// has to keep current is a health field that is permanently green.
        /// </para>
        /// <para>
        /// The score starts at full marks and is spent down. That direction matters: a
        /// relationship is healthy until something specific is wrong with it, and every
        /// deduction here can be named. A model that accumulated points for activity
        /// would penalise a deal that is simply waiting for a scheduled call.
        /// </para>
        /// </summary>
        private static DealHealthDto BuildHealth(
            DealRoomDto dto,
            List<DealQuestionDto> questions,
            List<DocumentRequestDto> requests)
        {
            var now = DateTime.UtcNow;

            if (dto.Stage is PipelineStages.Closed or PipelineStages.Declined)
                return new DealHealthDto { Status = "Concluded", Score = 100, DaysSinceActivity = 0 };

            // The most recent thing that happened, from anywhere. Falls back to the
            // opening date, so a request nobody has touched still has an age.
            var lastActivity = new[]
            {
                dto.StageUpdatedAt,
                dto.Timeline.Count > 0 ? dto.Timeline.Max(e => e.AtUtc) : (DateTime?)null,
                dto.OpenedAt,
            }.Where(d => d.HasValue).Max()!.Value;

            var idleDays = (int)Math.Max(0, (now - lastActivity).TotalDays);

            var score = 100;
            var reasons = new List<string>();

            // Silence, weighted by how long. Two weeks without a word is the shape of a
            // deal that has quietly ended without either side saying so.
            if (idleDays >= 21) { score -= 45; reasons.Add("silent_3w"); }
            else if (idleDays >= 14) { score -= 30; reasons.Add("silent_2w"); }
            else if (idleDays >= 7) { score -= 15; reasons.Add("silent_1w"); }

            // Obligations one side is sitting on. Counted once each, however many there
            // are — the fact that something is owed is the signal, not the quantity.
            var openQuestions = questions.Count(q => q.Answer == null && !q.IsWithdrawn) +
                                questions.Sum(q => q.FollowUps.Count(f => f.Answer == null && !f.IsWithdrawn));
            if (openQuestions > 0) { score -= 15; reasons.Add("unanswered_questions"); }

            if (requests.Any(r => r.Status == "Open")) { score -= 15; reasons.Add("open_document_requests"); }

            // Money asked for and not paid. The heaviest single deduction, because it is
            // the only obligation with a deadline attached.
            if (dto.FundingState == FundingMath.StatePaymentDue) { score -= 20; reasons.Add("payment_outstanding"); }

            // Terms on the table that nobody has answered.
            if (dto.TermSheets.Any(s => s.Status == TermSheetStatus.Proposed && !s.AcceptedByThem))
            {
                score -= 10;
                reasons.Add("terms_awaiting_acceptance");
            }

            // The stall this pipeline was built to catch: accepted, then never contacted.
            if (dto.Stage == PipelineStages.Approved && idleDays >= 3)
            {
                score -= 15;
                reasons.Add("approved_never_contacted");
            }

            score = Math.Clamp(score, 0, 100);

            return new DealHealthDto
            {
                Score = score,
                DaysSinceActivity = idleDays,
                Reasons = reasons,
                Status = score >= 75 ? "Healthy" : score >= 45 ? "Slowing" : "Stalled",
            };
        }

        /// <summary>
        /// How long this relationship has spent in each stage it has passed through,
        /// with the current one still counting.
        /// <para>
        /// Each completed stage's duration was measured when the relationship left it,
        /// so it is a recorded fact rather than a subtraction performed now. Only the
        /// open-ended one is computed live, because it has not finished happening.
        /// </para>
        /// <para>
        /// Stages appear in the order they were entered, and a stage entered twice
        /// appears twice. Summing them would read better and describe a different
        /// relationship than the one that occurred.
        /// </para>
        /// </summary>
        private async Task<List<StageDurationDto>> BuildStageDurationsAsync(Investment deal)
        {
            var history = await _db.InvestmentStageEvents
                .AsNoTracking()
                .Where(e => e.InvestmentId == deal.Id)
                .OrderBy(e => e.AtUtc)
                .Select(e => new { e.FromStage, e.AtUtc, e.MinutesInPreviousStage })
                .ToListAsync();

            if (history.Count == 0) return new List<StageDurationDto>();

            var rows = history
                .Where(e => e.FromStage != null)
                .Select(e => new StageDurationDto
                {
                    Stage = e.FromStage!,
                    Minutes = e.MinutesInPreviousStage ?? 0,
                })
                .ToList();

            rows.Add(new StageDurationDto
            {
                Stage = deal.Stage,
                Minutes = (int)Math.Max(0, Math.Round((DateTime.UtcNow - history[^1].AtUtc).TotalMinutes)),
                IsCurrent = true,
            });

            return rows;
        }

        /// <summary>
        /// One chronology from every system the relationship touches. Built in memory
        /// from bounded sets — a single relationship never produces enough events to
        /// justify a denormalised feed table.
        /// </summary>
        private async Task<List<DealEventDto>> BuildTimelineAsync(
            Investment deal,
            List<DealQuestionDto> questions,
            List<DocumentRequestDto> requests)
        {
            var events = new List<DealEventDto>
            {
                new()
                {
                    Type = "opened",
                    AtUtc = deal.Date,
                    ActorUserId = deal.InvestorId,
                    ActorName = deal.Investor?.UserName,
                    Detail = deal.Amount.ToString("0.##"),
                    RefId = deal.Id,
                },
            };

            // Every movement, in order, with the time each stage took.
            //
            // This used to be one line: the current stage and the timestamp of the last
            // move. A relationship that had passed through five stages showed one, and
            // the four decisions before it — along with the weeks between them — had
            // been overwritten. The history table exists so the room can say what
            // actually happened rather than only what is currently true.
            var moves = await _db.InvestmentStageEvents
                .AsNoTracking()
                .Where(e => e.InvestmentId == deal.Id && e.FromStage != null)
                .OrderBy(e => e.AtUtc)
                .Select(e => new { e.ToStage, e.AtUtc, e.ActorUserId, e.Reason, e.MinutesInPreviousStage })
                .ToListAsync();

            foreach (var m in moves)
            {
                events.Add(new DealEventDto
                {
                    Type = m.ToStage == PipelineStages.Declined ? "declined" : "stage",
                    AtUtc = m.AtUtc,
                    ActorUserId = m.ActorUserId,
                    // Detail stays the bare stage name: the client translates it through
                    // the same map the pills use, and anything appended to it would miss.
                    Detail = m.ToStage,
                    Note = m.Reason,
                    DurationMinutes = m.MinutesInPreviousStage,
                });
            }

            // Relationships that predate the history table have no rows, and showing them
            // nothing at all would be a regression from the single line they had. The
            // column is still the truth about where they are — it just cannot say more.
            if (moves.Count == 0 && deal.StageUpdatedAt.HasValue && deal.Stage != PipelineStages.New)
            {
                events.Add(new DealEventDto
                {
                    Type = deal.Stage == PipelineStages.Declined ? "declined" : "stage",
                    AtUtc = deal.StageUpdatedAt.Value,
                    Detail = deal.Stage,
                });
            }

            foreach (var q in questions)
            {
                events.Add(new DealEventDto
                {
                    Type = "question",
                    AtUtc = q.CreatedAtUtc,
                    ActorUserId = q.AskedByUserId,
                    ActorName = q.AskedByName,
                    Detail = q.Question,
                    RefId = q.Id,
                });

                if (q.AnsweredAtUtc.HasValue)
                {
                    events.Add(new DealEventDto
                    {
                        Type = "answer",
                        AtUtc = q.AnsweredAtUtc.Value,
                        ActorName = q.AnsweredByName,
                        Detail = q.Answer,
                        RefId = q.Id,
                    });
                }
            }

            foreach (var r in requests)
            {
                events.Add(new DealEventDto
                {
                    Type = "doc_request",
                    AtUtc = r.CreatedAtUtc,
                    ActorUserId = r.RequestedByUserId,
                    ActorName = r.RequestedByName,
                    Detail = r.Title,
                    RefId = r.Id,
                });

                if (r.ResolvedAtUtc.HasValue)
                {
                    events.Add(new DealEventDto
                    {
                        Type = r.Status == "Fulfilled" ? "doc_fulfilled" : "doc_declined",
                        AtUtc = r.ResolvedAtUtc.Value,
                        Detail = r.FulfilledByDocumentTitle ?? r.DeclinedReason ?? r.Title,
                        RefId = r.Id,
                    });
                }
            }

            // Documents published after the relationship opened are part of its story;
            // ones that predate it belong to the venture, not to this conversation.
            var newDocs = await _db.ProjectDocuments
                .AsNoTracking()
                .Where(d => d.ProjectId == deal.ProjectId && d.UploadedAt >= deal.Date)
                .OrderBy(d => d.UploadedAt)
                .Select(d => new { d.Id, d.Title, d.UploadedAt })
                .Take(30)
                .ToListAsync();

            foreach (var d in newDocs)
            {
                events.Add(new DealEventDto
                {
                    Type = "document",
                    AtUtc = d.UploadedAt,
                    Detail = d.Title,
                    RefId = d.Id,
                });
            }

            // The money, in the same chronology as everything else. A relationship that
            // was asked for funds, failed once, retried and settled should read as that
            // story rather than as a status that quietly changed.
            var fundingEvents = await _db.FundingRequests
                .AsNoTracking()
                .Where(f => f.InvestmentId == deal.Id)
                .Select(f => new
                {
                    f.Id, f.Reference, f.Amount, f.Status, f.CreatedAtUtc, f.ClosedAtUtc, f.ClosedReason,
                    Attempts = f.Transactions.Select(t => new
                    {
                        t.Id, t.Reference, t.Status, t.Amount, t.AttemptNumber,
                        t.SucceededAtUtc, t.FailedAtUtc, t.RefundedAtUtc, t.FailureMessage,
                    }).ToList(),
                })
                .ToListAsync();

            foreach (var f in fundingEvents)
            {
                events.Add(new DealEventDto
                {
                    Type = "funds_requested",
                    AtUtc = f.CreatedAtUtc,
                    ActorUserId = deal.Project.OwnerId,
                    Detail = f.Amount.ToString("0.##"),
                    RefId = f.Id,
                });

                if (f.Status is FundingRequestStatus.Cancelled or FundingRequestStatus.Expired && f.ClosedAtUtc.HasValue)
                {
                    events.Add(new DealEventDto
                    {
                        Type = f.Status == FundingRequestStatus.Expired ? "funding_expired" : "funding_cancelled",
                        AtUtc = f.ClosedAtUtc.Value,
                        Detail = f.ClosedReason,
                        RefId = f.Id,
                    });
                }

                foreach (var a in f.Attempts)
                {
                    if (a.SucceededAtUtc.HasValue)
                    {
                        events.Add(new DealEventDto
                        {
                            Type = "payment_succeeded",
                            AtUtc = a.SucceededAtUtc.Value,
                            ActorUserId = deal.InvestorId,
                            ActorName = deal.Investor?.UserName,
                            Detail = a.Amount.ToString("0.##"),
                            RefId = a.Id,
                        });
                    }
                    else if (a.FailedAtUtc.HasValue)
                    {
                        events.Add(new DealEventDto
                        {
                            Type = "payment_failed",
                            AtUtc = a.FailedAtUtc.Value,
                            ActorUserId = deal.InvestorId,
                            ActorName = deal.Investor?.UserName,
                            Detail = a.FailureMessage,
                            RefId = a.Id,
                        });
                    }

                    if (a.RefundedAtUtc.HasValue)
                    {
                        events.Add(new DealEventDto
                        {
                            Type = "payment_refunded",
                            AtUtc = a.RefundedAtUtc.Value,
                            Detail = a.Amount.ToString("0.##"),
                            RefId = a.Id,
                        });
                    }
                }
            }

            if (deal.Project.RoundClosedAtUtc.HasValue)
            {
                events.Add(new DealEventDto
                {
                    Type = "round_closed",
                    AtUtc = deal.Project.RoundClosedAtUtc.Value,
                    Detail = deal.Project.RoundOutcome,
                });
            }

            return events.OrderByDescending(e => e.AtUtc).ToList();
        }

        /// <summary>
        /// What this side owes the other, read off real state. A relationship stalls
        /// when neither party knows whose move it is; this answers that without asking
        /// anyone to maintain a task list.
        /// </summary>
        private static List<string> DeriveNextSteps(
            DealRoomDto dto,
            List<DealQuestionDto> questions,
            List<DocumentRequestDto> requests)
        {
            var steps = new List<string>();
            var isFounder = dto.ViewerRole == "founder";

            if (dto.Stage == PipelineStages.Declined || dto.Stage == PipelineStages.Closed)
                return steps;

            // Money owed comes before everything else. An investor with an open ask has
            // one job, and burying it under "answer a question" would be a strange thing
            // for a funding platform to do.
            if (dto.CanCompletePayment)
                steps.Add("complete_payment");

            if (isFounder && dto.Status == "Pending")
                steps.Add("review_request");

            if (questions.Any(q => q.CanAnswer))
                steps.Add("answer_questions");

            if (isFounder && requests.Any(r => r.Status == "Open"))
                steps.Add("supply_documents");

            if (dto.UnreadMessages > 0)
                steps.Add("read_messages");

            // Approved but never contacted is the single most common stall, and the
            // one the pipeline was built to prevent.
            if (isFounder && dto.Stage == PipelineStages.Approved)
                steps.Add("make_contact");

            // A deal that has been talked through but never asked for is the new stall
            // this system introduces, so it gets the same treatment.
            if (isFounder && dto.CanRequestFunds &&
                (dto.Stage == PipelineStages.InDiscussion || dto.Stage == PipelineStages.Committed))
                steps.Add("request_funds");

            // The investor's last attempt failed and the ask is still open — the action
            // is theirs, and it is not "wait".
            if (!isFounder && dto.FundingRequest is { Status: FundingRequestStatus.Open } fr &&
                fr.Attempts.LastOrDefault()?.Status == PaymentStatus.Failed)
                steps.Add("retry_payment");

            if (!isFounder && dto.Status == "Approved" && !questions.Any())
                steps.Add("ask_first_question");

            return steps;
        }

        // ==================================================================
        //  LIST — relationships for the caller
        // ==================================================================

        [HttpGet]
        public async Task<IActionResult> Mine([FromQuery] bool activeOnly = false)
        {
            var me = Me();

            var q = _db.Investments
                .AsNoTracking()
                .Include(i => i.Project)
                .Where(i => i.Project.OwnerId == me || i.InvestorId == me);

            if (activeOnly)
                q = q.Where(i => i.Stage != PipelineStages.Closed && i.Stage != PipelineStages.Declined);

            var rows = await q
                .OrderByDescending(i => i.StageUpdatedAt ?? i.Date)
                .Select(i => new
                {
                    Deal = i,
                    IsFounder = i.Project.OwnerId == me,
                    CounterpartId = i.Project.OwnerId == me ? i.InvestorId : i.Project.OwnerId,
                    CounterpartName = i.Project.OwnerId == me
                        ? (i.Investor != null ? i.Investor.UserName : "")
                        : i.Project.Owner.UserName,
                    CoverImageId = i.Project.Images.OrderBy(im => im.Id).Select(im => (int?)im.Id).FirstOrDefault(),
                    OpenQuestions = _db.DealQuestions.Count(dq =>
                        dq.InvestmentId == i.Id && dq.Answer == null && !dq.IsWithdrawn && dq.AskedByUserId != me),
                    OpenDocRequests = _db.DocumentRequests.Count(dr =>
                        dr.InvestmentId == i.Id && dr.Status == "Open"),
                    // Scoped to the counterpart, not just the venture. A founder with five
                    // investors on one project shares a ProjectId with all five, so an
                    // unscoped count put the same number on every row and lit "needs you"
                    // on relationships where nobody had said anything.
                    Unread = _db.Messages.Count(m =>
                        m.ProjectId == i.ProjectId && m.ReceiverId == me && !m.IsRead &&
                        m.SenderId == (i.Project.OwnerId == me ? i.InvestorId : i.Project.OwnerId)),
                    OpenRequestAmount = _db.FundingRequests
                        .Where(f => f.InvestmentId == i.Id && f.Status == FundingRequestStatus.Open)
                        .Select(f => (decimal?)f.Amount)
                        .FirstOrDefault(),
                    HasSettled = _db.PaymentTransactions
                        .Any(t => t.InvestmentId == i.Id && t.Status == PaymentStatus.Succeeded),
                    HasRefund = _db.PaymentTransactions
                        .Any(t => t.InvestmentId == i.Id && t.Status == PaymentStatus.Refunded),
                    HasProcessing = _db.PaymentTransactions
                        .Any(t => t.InvestmentId == i.Id && t.Status == PaymentStatus.Processing),
                })
                .ToListAsync();

            var items = rows.Select(r => new DealSummaryDto
            {
                InvestmentId = r.Deal.Id,
                ProjectId = r.Deal.ProjectId,
                ProjectName = r.Deal.Project.Name,
                CoverImageId = r.CoverImageId,
                CounterpartId = r.CounterpartId ?? 0,
                CounterpartName = r.CounterpartName,
                Stage = r.Deal.Stage,
                Amount = r.Deal.Amount,
                AgreedAmount = r.OpenRequestAmount,
                StageUpdatedAt = r.Deal.StageUpdatedAt,
                OpenedAt = r.Deal.Date,
                OpenQuestions = r.OpenQuestions,
                OpenDocumentRequests = r.IsFounder ? r.OpenDocRequests : 0,
                UnreadMessages = r.Unread,
                FundingState = FundingMath.StateOf(
                    r.Deal.Status, r.HasSettled, r.HasRefund, r.OpenRequestAmount.HasValue, r.HasProcessing),
                NeedsMe =
                    (r.IsFounder && r.Deal.Status == "Pending") ||
                    r.OpenQuestions > 0 ||
                    (r.IsFounder && r.OpenDocRequests > 0) ||
                    r.Unread > 0 ||
                    (r.IsFounder && r.Deal.Stage == PipelineStages.Approved) ||
                    // The investor owes money — the strongest "this is waiting on you"
                    // signal the product has.
                    (!r.IsFounder && r.OpenRequestAmount.HasValue && !r.HasSettled),
            }).ToList();

            return Ok(items);
        }

        // ==================================================================
        //  QUESTIONS
        // ==================================================================

        [HttpPost("{investmentId:int}/questions")]
        public async Task<IActionResult> AskQuestion(int investmentId, [FromBody] AskQuestionInput input)
        {
            var deal = await LoadParticipantDealAsync(investmentId);
            if (deal == null) return NotFound(new { message = "Deal not found." });

            var me = Me();
            var role = RoleIn(deal, me);
            if (role == "admin") return Forbid();

            var text = input.Question?.Trim();
            if (string.IsNullOrWhiteSpace(text))
                return BadRequest(new { message = "A question is required." });
            if (text.Length > 1000)
                return BadRequest(new { message = "Question is too long." });

            if (deal.Stage == PipelineStages.Declined || deal.Stage == PipelineStages.Closed)
                return BadRequest(new { message = "This relationship is closed." });

            // A follow-up has to attach to a question in THIS relationship that the
            // caller asked and that has actually been answered — otherwise it is a new
            // question wearing a thread, or a way to reach into somebody else's deal.
            if (input.ParentQuestionId is int parentId)
            {
                var parent = await _db.DealQuestions
                    .FirstOrDefaultAsync(x => x.Id == parentId && x.InvestmentId == investmentId);

                if (parent == null) return NotFound(new { message = "That question is not part of this deal." });
                if (parent.AskedByUserId != me) return Forbid();
                if (parent.Answer == null)
                    return BadRequest(new { message = "Wait for an answer before following up on it." });
                if (parent.ParentQuestionId != null)
                    return BadRequest(new { message = "A follow-up cannot be followed up on. Ask a new question." });

                var alreadyFollowed = await _db.DealQuestions
                    .AnyAsync(x => x.ParentQuestionId == parentId);
                if (alreadyFollowed)
                    return BadRequest(new { message = "You have already followed up on this one." });
            }

            var q = new DealQuestion
            {
                InvestmentId = investmentId,
                ParentQuestionId = input.ParentQuestionId,
                AskedByUserId = me,
                Question = text,
                CreatedAtUtc = DateTime.UtcNow,
            };
            _db.DealQuestions.Add(q);

            var recipient = role == "founder" ? (deal.InvestorId ?? 0) : deal.Project.OwnerId;
            await NotifyAsync(recipient, me, deal,
                "deal_question", $"A new question about {deal.Project.Name}.");

            await _db.SaveChangesAsync();
            return Ok(new { message = "Question sent.", id = q.Id });
        }

        [HttpPut("questions/{questionId:int}/answer")]
        public async Task<IActionResult> AnswerQuestion(int questionId, [FromBody] AnswerQuestionInput input)
        {
            var q = await _db.DealQuestions
                .Include(x => x.Investment).ThenInclude(i => i.Project)
                .FirstOrDefaultAsync(x => x.Id == questionId);
            if (q == null) return NotFound(new { message = "Question not found." });

            var deal = await LoadParticipantDealAsync(q.InvestmentId);
            if (deal == null) return NotFound(new { message = "Deal not found." });

            var me = Me();
            if (RoleIn(deal, me) == "admin") return Forbid();

            // The asker cannot answer their own question, and an answered question is
            // not silently rewritten.
            if (q.AskedByUserId == me) return Forbid();
            if (q.IsWithdrawn) return BadRequest(new { message = "This question was withdrawn." });
            if (q.Answer != null) return BadRequest(new { message = "Already answered." });

            var text = input.Answer?.Trim();
            if (string.IsNullOrWhiteSpace(text))
                return BadRequest(new { message = "An answer is required." });
            if (text.Length > 4000)
                return BadRequest(new { message = "Answer is too long." });

            q.Answer = text;
            q.AnsweredByUserId = me;
            q.AnsweredAtUtc = DateTime.UtcNow;

            await NotifyAsync(q.AskedByUserId, me, deal,
                "deal_answer", $"Your question about {deal.Project.Name} was answered.");

            await _db.SaveChangesAsync();
            return Ok(new { message = "Answer saved." });
        }

        [HttpPost("questions/{questionId:int}/withdraw")]
        public async Task<IActionResult> WithdrawQuestion(int questionId)
        {
            var q = await _db.DealQuestions.FirstOrDefaultAsync(x => x.Id == questionId);
            if (q == null) return NotFound(new { message = "Question not found." });

            var deal = await LoadParticipantDealAsync(q.InvestmentId);
            if (deal == null) return NotFound(new { message = "Deal not found." });

            if (q.AskedByUserId != Me()) return Forbid();
            if (q.Answer != null) return BadRequest(new { message = "Already answered." });

            q.IsWithdrawn = true;
            await _db.SaveChangesAsync();
            return Ok(new { message = "Question withdrawn." });
        }

        // ==================================================================
        //  DOCUMENT REQUESTS
        // ==================================================================

        [HttpPost("{investmentId:int}/document-requests")]
        public async Task<IActionResult> RequestDocument(int investmentId, [FromBody] RequestDocumentInput input)
        {
            var deal = await LoadParticipantDealAsync(investmentId);
            if (deal == null) return NotFound(new { message = "Deal not found." });

            var me = Me();
            var role = RoleIn(deal, me);
            // Either party may ask. It ran one way for a long time — an investor could
            // ask for a cap table and a founder could not ask who was funding them —
            // and that asymmetry was never argued for. Admins read, they do not ask.
            if (role == "admin") return Forbid();

            var title = input.Title?.Trim();
            if (string.IsNullOrWhiteSpace(title))
                return BadRequest(new { message = "A title is required." });
            if (title.Length > 160)
                return BadRequest(new { message = "Title is too long." });

            if (deal.Status != "Approved")
                return BadRequest(new { message = "Available once the founder has approved the request." });

            // The cap is per asker, not per relationship: one side filling the quota must
            // not silence the other.
            var open = await _db.DocumentRequests
                .CountAsync(r => r.InvestmentId == investmentId && r.Status == "Open" && r.RequestedByUserId == me);
            if (open >= 10)
                return BadRequest(new { message = "Too many open requests. Resolve some first." });

            var req = new DocumentRequest
            {
                InvestmentId = investmentId,
                RequestedByUserId = me,
                Title = title,
                Note = input.Note?.Trim(),
                Status = "Open",
                CreatedAtUtc = DateTime.UtcNow,
            };
            _db.DocumentRequests.Add(req);

            var counterpart = role == "founder" ? (deal.InvestorId ?? 0) : deal.Project.OwnerId;
            await NotifyAsync(counterpart, me, deal,
                "doc_request", $"A document was requested for {deal.Project.Name}: {title}");

            await _db.SaveChangesAsync();
            return Ok(new { message = "Request sent.", id = req.Id });
        }

        [HttpPut("document-requests/{requestId:int}")]
        public async Task<IActionResult> ResolveDocumentRequest(
            int requestId, [FromBody] ResolveDocumentRequestInput input)
        {
            var req = await _db.DocumentRequests.FirstOrDefaultAsync(r => r.Id == requestId);
            if (req == null) return NotFound(new { message = "Request not found." });

            var deal = await LoadParticipantDealAsync(req.InvestmentId);
            if (deal == null) return NotFound(new { message = "Deal not found." });

            var me = Me();
            var role = RoleIn(deal, me);
            if (role == "admin") return Forbid();

            // Whoever did not ask is the one who answers. The old rule named the founder
            // outright, which is the reason only the investor could ever ask.
            if (req.RequestedByUserId == me)
                return BadRequest(new { message = "You asked for this. The other side answers it." });

            if (req.Status != "Open") return BadRequest(new { message = "Already resolved." });

            if (input.Status == "Fulfilled")
            {
                // The two sides answer differently because they hold documents
                // differently. A founder has a data room and links something in it; an
                // investor has no such store and answers with a file attached to the
                // request, uploaded separately, or with a note saying how they sent it.
                if (role == "founder")
                {
                    if (input.DocumentId == null)
                        return BadRequest(new { message = "Pick the document that answers this." });

                    // The document must belong to this venture — an id from the client is
                    // not permission to link anything.
                    var owns = await _db.ProjectDocuments.AnyAsync(d =>
                        d.Id == input.DocumentId && d.ProjectId == deal.ProjectId);
                    if (!owns) return BadRequest(new { message = "That document is not part of this venture." });

                    req.FulfilledByDocumentId = input.DocumentId;
                }
                else
                {
                    var note = input.ResponseNote?.Trim();
                    if (req.ResponseData == null && string.IsNullOrWhiteSpace(note))
                        return BadRequest(new
                        {
                            message = "Attach the document, or say how you have provided it."
                        });

                    req.ResponseNote = note is { Length: > 600 } ? note[..600] : note;
                }

                req.Status = "Fulfilled";
            }
            else if (input.Status == "Declined")
            {
                var reason = input.DeclinedReason?.Trim();
                if (string.IsNullOrWhiteSpace(reason))
                    return BadRequest(new { message = "A reason is required when declining." });
                req.Status = "Declined";
                req.DeclinedReason = reason.Length > 500 ? reason[..500] : reason;
            }
            else
            {
                return BadRequest(new { message = "Unknown status." });
            }

            req.ResolvedAtUtc = DateTime.UtcNow;

            await NotifyAsync(req.RequestedByUserId, me, deal,
                req.Status == "Fulfilled" ? "doc_fulfilled" : "doc_declined",
                req.Status == "Fulfilled"
                    ? $"A requested document for {deal.Project.Name} is available."
                    : $"A document request for {deal.Project.Name} was declined.");

            await _db.SaveChangesAsync();
            return Ok(new { message = "Request resolved." });
        }

        [HttpPost("document-requests/{requestId:int}/withdraw")]
        public async Task<IActionResult> WithdrawDocumentRequest(int requestId)
        {
            var req = await _db.DocumentRequests.FirstOrDefaultAsync(r => r.Id == requestId);
            if (req == null) return NotFound(new { message = "Request not found." });

            var deal = await LoadParticipantDealAsync(req.InvestmentId);
            if (deal == null) return NotFound(new { message = "Deal not found." });

            if (req.RequestedByUserId != Me()) return Forbid();
            if (req.Status != "Open") return BadRequest(new { message = "Already resolved." });

            req.Status = "Withdrawn";
            req.ResolvedAtUtc = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Ok(new { message = "Request withdrawn." });
        }

        /// <summary>
        /// The investor attaches the document they were asked for.
        /// <para>
        /// Stored on the request rather than promoted to a venture document. A project's
        /// data room is scoped to the project, so an investor's bank letter filed there
        /// would be readable by every other approved backer — the precise opposite of
        /// what was asked for. It belongs to this one conversation.
        /// </para>
        /// <para>
        /// The bytes go through the same validation the deal attachments use: extension,
        /// declared type and magic-number signature all have to agree. A file is not
        /// what its name says it is.
        /// </para>
        /// </summary>
        [HttpPost("document-requests/{requestId:int}/upload")]
        [RequestSizeLimit(20 * 1024 * 1024)]
        public async Task<IActionResult> UploadDocumentResponse(int requestId, IFormFile file)
        {
            var req = await _db.DocumentRequests.FirstOrDefaultAsync(r => r.Id == requestId);
            if (req == null) return NotFound(new { message = "Request not found." });

            var deal = await LoadParticipantDealAsync(req.InvestmentId);
            if (deal == null) return NotFound(new { message = "Deal not found." });

            var me = Me();
            if (RoleIn(deal, me) == "admin") return Forbid();
            if (req.RequestedByUserId == me)
                return BadRequest(new { message = "You asked for this. The other side answers it." });
            if (req.Status != "Open") return BadRequest(new { message = "Already resolved." });

            var read = await _uploads.ReadValidatedAttachmentAsync(file);
            if (read.Status != ServiceResultStatus.Ok) return this.ToActionResult(read);

            req.ResponseData = read.Value;
            req.ResponseFileName = Path.GetFileName(file.FileName);
            req.ResponseContentType = file.ContentType;
            req.ResponseSizeBytes = read.Value!.Length;

            await _db.SaveChangesAsync();
            return Ok(new { message = "Attached.", fileName = req.ResponseFileName, sizeBytes = req.ResponseSizeBytes });
        }

        /// <summary>
        /// Downloads what the investor attached. Participants only — the same rule that
        /// governs everything else in this controller, applied to the one artefact here
        /// that does not belong to the venture.
        /// </summary>
        [HttpGet("document-requests/{requestId:int}/file")]
        public async Task<IActionResult> DownloadDocumentResponse(int requestId)
        {
            var req = await _db.DocumentRequests.FirstOrDefaultAsync(r => r.Id == requestId);
            if (req == null) return NotFound(new { message = "Request not found." });

            var deal = await LoadParticipantDealAsync(req.InvestmentId);
            if (deal == null) return NotFound(new { message = "Deal not found." });

            if (req.ResponseData == null) return NotFound(new { message = "Nothing was attached." });

            return File(req.ResponseData, req.ResponseContentType ?? "application/octet-stream",
                req.ResponseFileName ?? "document");
        }

        // ==================================================================
        //  TERM SHEET — what the two sides say they agreed
        // ==================================================================

        /// <summary>
        /// Puts terms on the table. Either side may propose; the other side's acceptance
        /// is what decides anything.
        /// </summary>
        [HttpPost("{investmentId:int}/terms")]
        public async Task<IActionResult> ProposeTerms(int investmentId, [FromBody] TermSheetInput input, CancellationToken ct)
        {
            var deal = await LoadParticipantDealAsync(investmentId);
            if (deal == null) return NotFound(new { message = "Deal not found." });
            if (RoleIn(deal, Me()) == "admin") return Forbid();

            var result = await _terms.ProposeAsync(deal, Me(), input, ct);
            return this.ToActionResult(result);
        }

        [HttpPost("terms/{sheetId:int}/accept")]
        public async Task<IActionResult> AcceptTerms(int sheetId, CancellationToken ct)
        {
            var sheet = await _db.TermSheets.AsNoTracking().FirstOrDefaultAsync(s => s.Id == sheetId, ct);
            if (sheet == null) return NotFound(new { message = "Terms not found." });

            var deal = await LoadParticipantDealAsync(sheet.InvestmentId);
            if (deal == null) return NotFound(new { message = "Deal not found." });
            if (RoleIn(deal, Me()) == "admin") return Forbid();

            var result = await _terms.AcceptAsync(deal, sheetId, Me(), ct);
            return this.ToActionResult(result);
        }

        [HttpPost("terms/{sheetId:int}/decline")]
        public async Task<IActionResult> DeclineTerms(int sheetId, [FromBody] DeclineTermsInput input, CancellationToken ct)
        {
            var sheet = await _db.TermSheets.AsNoTracking().FirstOrDefaultAsync(s => s.Id == sheetId, ct);
            if (sheet == null) return NotFound(new { message = "Terms not found." });

            var deal = await LoadParticipantDealAsync(sheet.InvestmentId);
            if (deal == null) return NotFound(new { message = "Deal not found." });
            if (RoleIn(deal, Me()) == "admin") return Forbid();

            var result = await _terms.DeclineAsync(deal, sheetId, Me(), input.Reason, ct);
            return this.ToActionResult(result);
        }

        // ==================================================================
        //  NOTES — each side's own, never the other's
        // ==================================================================

        [HttpPut("{investmentId:int}/note")]
        public async Task<IActionResult> SaveNote(int investmentId, [FromBody] AnswerQuestionInput input)
        {
            var deal = await LoadParticipantDealAsync(investmentId);
            if (deal == null) return NotFound(new { message = "Deal not found." });

            var me = Me();
            var role = RoleIn(deal, me);
            if (role == "admin") return Forbid();

            var text = input.Answer?.Trim();
            if (text != null && text.Length > 2000)
                return BadRequest(new { message = "Note is too long." });

            if (role == "founder") deal.FounderNote = text;
            else deal.InvestorNote = text;

            await _db.SaveChangesAsync();
            return Ok(new { message = "Note saved." });
        }

        // ==================================================================

        /// <summary>
        /// Queues an in-app notification for the other side. Email delivery is
        /// deliberately not wired here yet — the notification record and its type are
        /// what a future digest would read, so nothing has to change when it is.
        /// </summary>
        private async Task NotifyAsync(int recipientId, int actorId, Investment deal, string type, string content)
        {
            if (recipientId == 0 || recipientId == actorId) return;

            var n = new Notification
            {
                UserId = recipientId,
                ActorUserId = actorId,
                ProjectId = deal.ProjectId,
                InvestmentId = deal.Id,
                NotificationType = type,
                Content = content,
                DateCreated = DateTime.UtcNow,
                IsRead = false,
            };
            _db.Notifications.Add(n);

            await _hub.Clients.Group($"user:{recipientId}").SendAsync("DealActivity", new
            {
                investmentId = deal.Id,
                projectId = deal.ProjectId,
                type,
            });
        }
    }
}
