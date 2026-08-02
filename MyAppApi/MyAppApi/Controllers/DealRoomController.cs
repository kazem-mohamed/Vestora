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

        public DealRoomController(AppDbContext db, IHubContext<ChatHub> hub, PaymentService payments)
        {
            _db = db;
            _hub = hub;
            _payments = payments;
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
                    // Whoever did not ask it is the one who can answer it.
                    CanAnswer = q.AskedByUserId != me && q.Answer == null && !q.IsWithdrawn,
                    CanWithdraw = q.AskedByUserId == me && q.Answer == null && !q.IsWithdrawn,
                })
                .ToListAsync();

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
                    // Only the venture's owner can satisfy a request for its documents.
                    CanResolve = isFounder && r.Status == "Open",
                    CanWithdraw = r.RequestedByUserId == me && r.Status == "Open",
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

            dto.Timeline = await BuildTimelineAsync(deal, questions, docRequests);
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

            var settled = payments.FirstOrDefault(t => t.Status == PaymentStatus.Succeeded);
            var hasOpen = request != null && request.Status == FundingRequestStatus.Open;

            dto.FundingRequest = request == null ? null : await _payments.MapRequestAsync(request);
            dto.FundedThisDeal = settled?.Amount;
            dto.FundedAtUtc = settled?.SucceededAtUtc;
            dto.FundingState = FundingMath.StateOf(
                deal.Status,
                settled != null,
                payments.Any(t => t.Status == PaymentStatus.Refunded),
                hasOpen,
                payments.Any(t => t.Status == PaymentStatus.Processing));

            // What is left of the round once every OTHER commitment is counted. This
            // relationship's own commitment is excluded, or a founder could never call in
            // the deal that filled the round.
            var committedElsewhere = await _db.Investments
                .Where(i => i.ProjectId == deal.ProjectId && i.Status == "Approved" && i.Id != deal.Id)
                .SumAsync(i => (decimal?)i.Amount) ?? 0m;

            dto.MaxRequestableAmount = FundingMath.RemainingCapacity(
                deal.Project.InvestmentNeeded, committedElsewhere);

            var roundOpen = deal.Project.LifecycleStatus != "Closed";
            var relationshipLive = deal.Stage != PipelineStages.Declined && deal.Stage != PipelineStages.Closed;

            dto.CanRequestFunds =
                dto.ViewerRole == "founder" &&
                deal.Status == "Approved" &&
                relationshipLive &&
                roundOpen &&
                settled == null &&
                !hasOpen;

            // A closed round still lets an existing ask be paid — pulling the rug from
            // under an investor mid-checkout would be worse than a slightly late close.
            dto.CanCompletePayment =
                dto.ViewerRole == "investor" &&
                hasOpen &&
                settled == null &&
                request!.ExpiresAtUtc > DateTime.UtcNow;
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

            // The stage's current value with its timestamp. Full stage history would
            // need an audit table; recording only what is provably known is honest,
            // and the events below already show what moved the relationship.
            if (deal.StageUpdatedAt.HasValue && deal.Stage != PipelineStages.New)
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
                    Unread = _db.Messages.Count(m =>
                        m.ProjectId == i.ProjectId && m.ReceiverId == me && !m.IsRead),
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

            var q = new DealQuestion
            {
                InvestmentId = investmentId,
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
            // Only the investor asks for documents; the founder supplies them.
            if (role != "investor") return Forbid();

            var title = input.Title?.Trim();
            if (string.IsNullOrWhiteSpace(title))
                return BadRequest(new { message = "A title is required." });
            if (title.Length > 160)
                return BadRequest(new { message = "Title is too long." });

            if (deal.Status != "Approved")
                return BadRequest(new { message = "Available once the founder has approved the request." });

            var open = await _db.DocumentRequests
                .CountAsync(r => r.InvestmentId == investmentId && r.Status == "Open");
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

            await NotifyAsync(deal.Project.OwnerId, me, deal,
                "doc_request", $"A document was requested for {deal.Project.Name}.");

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
            if (RoleIn(deal, me) != "founder") return Forbid();
            if (req.Status != "Open") return BadRequest(new { message = "Already resolved." });

            if (input.Status == "Fulfilled")
            {
                if (input.DocumentId == null)
                    return BadRequest(new { message = "Pick the document that answers this." });

                // The document must belong to this venture — an id from the client is
                // not permission to link anything.
                var owns = await _db.ProjectDocuments.AnyAsync(d =>
                    d.Id == input.DocumentId && d.ProjectId == deal.ProjectId);
                if (!owns) return BadRequest(new { message = "That document is not part of this venture." });

                req.Status = "Fulfilled";
                req.FulfilledByDocumentId = input.DocumentId;
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
