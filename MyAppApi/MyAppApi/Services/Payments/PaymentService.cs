using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using MyAppApi.Data;
using MyAppApi.Data.Models;
using MyAppApi.Data.Models.DTOs;
using MyAppApi.Data.Models.Hubs;
using MyAppApi.Settings;

namespace MyAppApi.Services.Payments
{
    /// <summary>
    /// Everything Vestora believes about money.
    /// <para>
    /// Both provider adapters funnel through here, so the simulated path and the Stripe
    /// path are the same system with a different socket: one state machine, one fee
    /// snapshot, one idempotency gate, one set of notifications, one audit trail. There
    /// is no second implementation to keep in step.
    /// </para>
    /// <para>
    /// Two rules do the heavy lifting and neither is negotiable. A confirmation is only
    /// ever accepted once, enforced by a unique index rather than by careful code. And a
    /// browser returning to a success URL is not evidence — every settlement is decided
    /// by asking the provider or by a signed webhook.
    /// </para>
    /// </summary>
    public class PaymentService
    {
        private readonly AppDbContext _db;
        private readonly IPaymentProvider _provider;
        private readonly PaymentSettings _settings;
        private readonly IHubContext<ChatHub> _hub;
        private readonly ILogger<PaymentService> _logger;

        public PaymentService(
            AppDbContext db,
            IPaymentProvider provider,
            IOptions<PaymentSettings> settings,
            IHubContext<ChatHub> hub,
            ILogger<PaymentService> logger)
        {
            _db = db;
            _provider = provider;
            _settings = settings.Value;
            _hub = hub;
            _logger = logger;
        }

        public PaymentSettings Settings => _settings;
        public string ProviderName => _provider.Name;

        // ==================================================================
        //  Funding requests — the founder asking for the agreed money
        // ==================================================================

        /// <summary>
        /// Issues a funding request against an approved relationship.
        /// <para>
        /// The amount is the founder's, deliberately: by the time a deal reaches this
        /// point the number has usually moved from whatever the investor opened with. It
        /// is validated against the round's remaining capacity, never against the
        /// original ask.
        /// </para>
        /// </summary>
        public async Task<ServiceResult<FundingRequestDto>> CreateFundingRequestAsync(
            int investmentId, int founderUserId, decimal amount, string? note,
            CancellationToken ct = default, int? supersedesRequestId = null)
        {
            var investment = await _db.Investments
                .Include(i => i.Project)
                .FirstOrDefaultAsync(i => i.Id == investmentId, ct);

            if (investment == null)
                return ServiceResult<FundingRequestDto>.NotFound("Relationship not found.");

            if (investment.Project.OwnerId != founderUserId)
                return ServiceResult<FundingRequestDto>.Forbidden();

            if (investment.InvestorId == null)
                return ServiceResult<FundingRequestDto>.BadRequest("This relationship has no investor attached.");

            // Only an accepted relationship can be asked for money. Declined ones
            // obviously cannot, and a pending one has not been agreed to at all.
            if (investment.Status != "Approved")
                return ServiceResult<FundingRequestDto>.BadRequest(
                    "Approve this request before asking for funds.");

            if (investment.Stage == PipelineStages.Declined || investment.Stage == PipelineStages.Closed)
                return ServiceResult<FundingRequestDto>.BadRequest(
                    "This relationship is closed.");

            if (investment.Project.LifecycleStatus == "Closed")
                return ServiceResult<FundingRequestDto>.BadRequest(
                    "This round is closed and cannot take new funding requests.");

            if (amount <= 0m)
                return ServiceResult<FundingRequestDto>.BadRequest("Amount must be greater than zero.");

            if (amount > 100_000_000m)
                return ServiceResult<FundingRequestDto>.BadRequest("Amount is out of range.");

            // Already asked.
            var hasOpen = await _db.FundingRequests
                .AnyAsync(f => f.InvestmentId == investmentId && f.Status == FundingRequestStatus.Open, ct);

            if (hasOpen)
                return ServiceResult<FundingRequestDto>.BadRequest(
                    "A funding request is already open for this investment.");

            // Already funded — tested against payments that are STILL settled, not
            // against the request's status.
            //
            // A refunded request keeps its "Paid" status on purpose: it was paid, and
            // then it was reversed, and rewriting the row would erase the first half of
            // that. But the money is gone, so the relationship is not funded any more and
            // the founder must be able to ask again. Reading the request's status here
            // instead of the transaction's would freeze every refunded deal forever.
            //
            // Summed rather than tested for existence, because a commitment may be called
            // in over several tranches. "Has one payment succeeded" would have declared
            // the relationship complete on its first instalment and made the rest of the
            // money uncollectable — with the balance still counted as committed.
            var settled = await FundingMath.SettledForInvestmentAsync(_db, investmentId, ct);
            var target = await FundingMath.CommitmentTargetAsync(_db, investmentId, investment.Amount, ct);

            if (FundingMath.IsFullySettled(settled, target))
                return ServiceResult<FundingRequestDto>.BadRequest("This investment has already been funded in full.");

            // Capacity is measured against commitments, but this relationship's own
            // commitment is already inside that total — so it is excluded before the
            // comparison, otherwise a founder could never call in the last deal.
            var headroom = await FundingMath.HeadroomForAsync(
                _db, investment.ProjectId, investment.Project.InvestmentNeeded, investmentId, ct);

            // Tranches already paid have left the round's headroom via the settled total,
            // but they have not left this relationship's commitment, which is still
            // counted whole. Subtracting them here is what stops a founder calling in
            // 100% of a commitment twice by splitting it.
            headroom = Math.Max(0m, headroom - settled);

            if (amount > headroom)
                return ServiceResult<FundingRequestDto>.BadRequest(
                    $"Amount exceeds what is left in this round ({headroom:N0} {_settings.Currency}).");

            // When terms were agreed, the ask calls them in and may not quietly exceed
            // them. A bigger number is a renegotiation, and renegotiation has its own
            // door — proposing a new version of the sheet that both sides accept.
            var agreedSheet = await _db.TermSheets
                .Where(s => s.InvestmentId == investmentId && s.Status == TermSheetStatus.Accepted)
                .OrderByDescending(s => s.Version)
                .FirstOrDefaultAsync(ct);

            if (agreedSheet != null && amount > FundingMath.UnsettledCommitment(agreedSheet.Amount, settled))
                return ServiceResult<FundingRequestDto>.BadRequest(
                    $"The agreed terms are {agreedSheet.Amount:N0} {agreedSheet.Currency} and " +
                    $"{settled:N0} has settled. Ask for at most {FundingMath.UnsettledCommitment(agreedSheet.Amount, settled):N0}, " +
                    "or propose new terms.");

            var now = DateTime.UtcNow;
            var request = new FundingRequest
            {
                Reference = await NextReferenceAsync("FR", ct),
                InvestmentId = investment.Id,
                ProjectId = investment.ProjectId,
                InvestorId = investment.InvestorId.Value,
                RequestedByUserId = founderUserId,
                Amount = amount,
                Currency = _settings.Currency,
                Status = FundingRequestStatus.Open,
                Note = string.IsNullOrWhiteSpace(note) ? null : note.Trim(),
                TermSheetId = agreedSheet?.Id,
                SupersedesRequestId = supersedesRequestId,
                CreatedAtUtc = now,
                ExpiresAtUtc = now.AddDays(_settings.FundingRequestTtlDays),
            };

            _db.FundingRequests.Add(request);

            // The relationship advances to Committed if it had not already: asking for
            // the money is the clearest possible statement that terms were agreed.
            if (PipelineStages.IsValid(investment.Stage) &&
                investment.Stage != PipelineStages.Committed &&
                investment.Stage != PipelineStages.Closed)
            {
                await StageLog.MoveAsync(_db, investment, PipelineStages.Committed, founderUserId,
                    $"Funds requested · {request.Reference}", ct);
            }

            await _db.SaveChangesAsync(ct);

            await AuditAsync(founderUserId, "funding_request.created", "FundingRequest", request.Id,
                $"{request.Reference} · {amount:N2} {request.Currency} · investment {investmentId}", ct);

            await NotifyAsync(
                userId: investment.InvestorId.Value,
                actorId: founderUserId,
                type: PaymentNotificationTypes.FundingRequested,
                content: $"{investment.Project.Name}: the founder has requested {amount:N0} {request.Currency} to complete your investment.",
                projectId: investment.ProjectId,
                investmentId: investment.Id,
                ct: ct);

            return ServiceResult<FundingRequestDto>.Created(await MapRequestAsync(request, ct));
        }

        /// <summary>Withdraws an open request. The founder's own, or an admin's on a closing round.</summary>
        public async Task<ServiceResult<FundingRequestDto>> CancelFundingRequestAsync(
            int fundingRequestId, int actorUserId, bool isAdmin, string? reason, CancellationToken ct = default)
        {
            var request = await _db.FundingRequests
                .Include(f => f.Investment).ThenInclude(i => i.Project)
                .FirstOrDefaultAsync(f => f.Id == fundingRequestId, ct);

            if (request == null)
                return ServiceResult<FundingRequestDto>.NotFound("Funding request not found.");

            if (!isAdmin && request.Investment.Project.OwnerId != actorUserId)
                return ServiceResult<FundingRequestDto>.Forbidden();

            if (request.Status != FundingRequestStatus.Open)
                return ServiceResult<FundingRequestDto>.BadRequest("This request is no longer open.");

            // An in-flight attempt goes with it — leaving a live checkout pointing at a
            // withdrawn request is the kind of gap that lets money arrive for something
            // nobody is asking for any more.
            var active = await _db.PaymentTransactions
                .Where(t => t.FundingRequestId == request.Id && (t.Status == PaymentStatus.Initiated || t.Status == PaymentStatus.Processing))
                .ToListAsync(ct);

            var now = DateTime.UtcNow;
            foreach (var t in active)
            {
                t.Status = PaymentStatus.Cancelled;
                t.CancelReason = PaymentCancelReason.UserCancelled;
                t.CancelledAtUtc = now;
                t.CheckoutUrl = null;
            }

            request.Status = FundingRequestStatus.Cancelled;
            request.ClosedAtUtc = now;
            request.ClosedReason = string.IsNullOrWhiteSpace(reason) ? "Withdrawn by the founder." : reason.Trim();

            await _db.SaveChangesAsync(ct);

            await AuditAsync(actorUserId, "funding_request.cancelled", "FundingRequest", request.Id,
                $"{request.Reference} · {request.ClosedReason}", ct);

            return ServiceResult<FundingRequestDto>.Ok(await MapRequestAsync(request, ct));
        }

        // ==================================================================
        //  Counter-offers — the investor's half of the sentence
        // ==================================================================

        /// <summary>
        /// The investor proposes a different number against an open ask.
        /// <para>
        /// Everything before this step in the product is built for a conversation, and
        /// then the step about money was take-it-or-leave-it: pay the founder's figure,
        /// or let it lapse without saying why. Most deals that die at this point die of
        /// that, and the platform recorded it as an expiry.
        /// </para>
        /// <para>
        /// The counter does not alter the ask. Amounts on a financial row are never
        /// rewritten, so it sits beside the request as a proposal the founder answers.
        /// </para>
        /// </summary>
        public async Task<ServiceResult<FundingRequestDto>> CounterOfferAsync(
            int fundingRequestId, int investorUserId, decimal amount, string? note, CancellationToken ct = default)
        {
            var request = await _db.FundingRequests
                .Include(f => f.Investment).ThenInclude(i => i.Project)
                .FirstOrDefaultAsync(f => f.Id == fundingRequestId, ct);

            if (request == null)
                return ServiceResult<FundingRequestDto>.NotFound("Funding request not found.");

            if (request.InvestorId != investorUserId)
                return ServiceResult<FundingRequestDto>.Forbidden();

            if (request.Status != FundingRequestStatus.Open)
                return ServiceResult<FundingRequestDto>.BadRequest("This funding request is no longer open.");

            if (request.CounterStatus == CounterOfferStatus.Proposed)
                return ServiceResult<FundingRequestDto>.BadRequest(
                    "You already have a counter-offer on this request. Wait for the founder to answer it.");

            if (amount <= 0m || amount > 100_000_000m)
                return ServiceResult<FundingRequestDto>.BadRequest("Amount is out of range.");

            if (amount == request.Amount)
                return ServiceResult<FundingRequestDto>.BadRequest(
                    "That is the amount already being asked for. Complete the payment instead.");

            // An attempt in flight is stopped: paying the original figure while proposing
            // a different one is two contradictory answers to the same question.
            var live = await _db.PaymentTransactions
                .Where(t => t.FundingRequestId == request.Id && PaymentStatus.Active.Contains(t.Status))
                .ToListAsync(ct);

            var now = DateTime.UtcNow;
            foreach (var t in live)
            {
                t.Status = PaymentStatus.Cancelled;
                t.CancelReason = PaymentCancelReason.UserCancelled;
                t.CancelledAtUtc = now;
                t.CheckoutUrl = null;
            }

            request.CounterAmount = amount;
            request.CounterNote = Trim(note, 500);
            request.CounterAtUtc = now;
            request.CounterStatus = CounterOfferStatus.Proposed;

            await _db.SaveChangesAsync(ct);

            await AuditAsync(investorUserId, "funding_request.countered", "FundingRequest", request.Id,
                $"{request.Reference} · asked {request.Amount:N2} · countered {amount:N2} {request.Currency}", ct);

            await NotifyAsync(
                userId: request.Investment.Project.OwnerId,
                actorId: investorUserId,
                type: PaymentNotificationTypes.CounterOffered,
                content: $"{request.Investment.Project.Name}: the investor proposed {amount:N0} {request.Currency} instead of the {request.Amount:N0} you asked for.",
                projectId: request.ProjectId,
                investmentId: request.InvestmentId,
                ct: ct);

            return ServiceResult<FundingRequestDto>.Ok(await MapRequestAsync(request, ct));
        }

        /// <summary>
        /// The founder answers a counter-offer.
        /// <para>
        /// Accepting closes the original ask and issues a new one at the countered
        /// figure, rather than editing the amount in place — the two numbers, and the
        /// fact that one replaced the other, are the record of the negotiation. Every
        /// guard the ordinary path applies is applied to the replacement, because it is
        /// the ordinary path.
        /// </para>
        /// </summary>
        public async Task<ServiceResult<FundingRequestDto>> AnswerCounterOfferAsync(
            int fundingRequestId, int founderUserId, bool accept, string? note, CancellationToken ct = default)
        {
            var request = await _db.FundingRequests
                .Include(f => f.Investment).ThenInclude(i => i.Project)
                .FirstOrDefaultAsync(f => f.Id == fundingRequestId, ct);

            if (request == null)
                return ServiceResult<FundingRequestDto>.NotFound("Funding request not found.");

            if (request.Investment.Project.OwnerId != founderUserId)
                return ServiceResult<FundingRequestDto>.Forbidden();

            if (request.CounterStatus != CounterOfferStatus.Proposed || request.CounterAmount == null)
                return ServiceResult<FundingRequestDto>.BadRequest("There is no counter-offer to answer.");

            if (request.Status != FundingRequestStatus.Open)
                return ServiceResult<FundingRequestDto>.BadRequest("This funding request is no longer open.");

            var counterAmount = request.CounterAmount.Value;
            var now = DateTime.UtcNow;

            if (!accept)
            {
                request.CounterStatus = CounterOfferStatus.Declined;
                await _db.SaveChangesAsync(ct);

                await AuditAsync(founderUserId, "funding_request.counter_declined", "FundingRequest", request.Id,
                    $"{request.Reference} · declined {counterAmount:N2} {request.Currency}", ct);

                await NotifyAsync(
                    userId: request.InvestorId,
                    actorId: founderUserId,
                    type: PaymentNotificationTypes.CounterAnswered,
                    content: $"{request.Investment.Project.Name}: the founder declined your {counterAmount:N0} {request.Currency} proposal. The original request for {request.Amount:N0} is still open.",
                    projectId: request.ProjectId,
                    investmentId: request.InvestmentId,
                    ct: ct);

                return ServiceResult<FundingRequestDto>.Ok(await MapRequestAsync(request, ct));
            }

            // Accepted. Close the old ask FIRST — the one-open-request index would
            // otherwise refuse the replacement, and the replacement is the point.
            request.CounterStatus = CounterOfferStatus.Accepted;
            request.Status = FundingRequestStatus.Cancelled;
            request.ClosedAtUtc = now;
            request.ClosedReason = $"Superseded by the agreed {counterAmount:N0} {request.Currency}.";
            await _db.SaveChangesAsync(ct);

            var replacement = await CreateFundingRequestAsync(
                request.InvestmentId, founderUserId, counterAmount,
                note ?? $"Agreed at {counterAmount:N0} {request.Currency}.", ct,
                supersedesRequestId: request.Id);

            if (replacement.Status is not (ServiceResultStatus.Ok or ServiceResultStatus.Created))
            {
                // The replacement was refused — capacity, a closed round, agreed terms.
                // Putting the original back is the only honest outcome: the investor was
                // told nothing, and leaving the relationship with no live ask at all
                // would silently end a negotiation the founder was trying to conclude.
                request.Status = FundingRequestStatus.Open;
                request.ClosedAtUtc = null;
                request.ClosedReason = null;
                request.CounterStatus = CounterOfferStatus.Proposed;
                await _db.SaveChangesAsync(ct);
                return replacement;
            }

            await AuditAsync(founderUserId, "funding_request.counter_accepted", "FundingRequest", request.Id,
                $"{request.Reference} · accepted {counterAmount:N2} {request.Currency}", ct);

            return replacement;
        }

        // ==================================================================
        //  Payment attempts
        // ==================================================================

        /// <summary>
        /// Opens a checkout for an open funding request.
        /// <para>
        /// The amount comes from the request row, never from the caller. A client that
        /// can name its own price is not a payment system.
        /// </para>
        /// </summary>
        public async Task<ServiceResult<CheckoutSessionDto>> CreateCheckoutAsync(
            int fundingRequestId, int investorUserId, CancellationToken ct = default)
        {
            var request = await _db.FundingRequests
                .Include(f => f.Investment).ThenInclude(i => i.Project)
                .FirstOrDefaultAsync(f => f.Id == fundingRequestId, ct);

            if (request == null)
                return ServiceResult<CheckoutSessionDto>.NotFound("Funding request not found.");

            if (request.InvestorId != investorUserId)
                return ServiceResult<CheckoutSessionDto>.Forbidden();

            if (request.Status == FundingRequestStatus.Paid)
                return ServiceResult<CheckoutSessionDto>.BadRequest("This investment has already been funded.");

            if (request.Status != FundingRequestStatus.Open)
                return ServiceResult<CheckoutSessionDto>.BadRequest("This funding request is no longer open.");

            if (request.ExpiresAtUtc <= DateTime.UtcNow)
                return ServiceResult<CheckoutSessionDto>.BadRequest("This funding request has expired.");

            // A relationship that is over cannot be paid into. Every path that ends one
            // now withdraws its open ask, so this should be unreachable — which is the
            // point of putting it here rather than trusting that to stay true. This is
            // the last gate before money moves, and it costs one comparison.
            //
            // Deliberately silent about the round's own lifecycle: a round that closes
            // with an ask still outstanding leaves that ask payable on purpose, because
            // pulling it out from under an investor mid-checkout is worse than closing
            // slightly late. Ending the RELATIONSHIP is a different statement.
            if (request.Investment.Stage == PipelineStages.Declined ||
                request.Investment.Stage == PipelineStages.Closed ||
                request.Investment.Status == PipelineStages.Declined)
                return ServiceResult<CheckoutSessionDto>.BadRequest(
                    "This relationship is closed and can no longer be funded.");

            // A live attempt is reused rather than duplicated. Two open checkouts for one
            // request is the shortest path to funding something twice.
            var live = await _db.PaymentTransactions
                .Where(t => t.FundingRequestId == request.Id &&
                            (t.Status == PaymentStatus.Initiated || t.Status == PaymentStatus.Processing))
                .OrderByDescending(t => t.Id)
                .FirstOrDefaultAsync(ct);

            if (live != null && live.ExpiresAtUtc > DateTime.UtcNow && !string.IsNullOrWhiteSpace(live.CheckoutUrl))
            {
                return ServiceResult<CheckoutSessionDto>.Ok(new CheckoutSessionDto
                {
                    TransactionId = live.Id,
                    Reference = live.Reference,
                    CheckoutUrl = live.CheckoutUrl!,
                    Provider = live.Provider,
                    IsSandbox = _settings.IsSandbox,
                    Amount = live.Amount,
                    Currency = live.Currency,
                    Resumed = true,
                });
            }

            // A stale one is closed out first so the attempt history stays honest.
            if (live != null)
            {
                live.Status = PaymentStatus.Cancelled;
                live.CancelReason = PaymentCancelReason.Abandoned;
                live.CancelledAtUtc = DateTime.UtcNow;
                live.CheckoutUrl = null;
            }

            var attemptNumber = await _db.PaymentTransactions
                .CountAsync(t => t.FundingRequestId == request.Id, ct) + 1;

            var now = DateTime.UtcNow;
            var transaction = new PaymentTransaction
            {
                Reference = await NextReferenceAsync("TX", ct),
                FundingRequestId = request.Id,
                InvestmentId = request.InvestmentId,
                ProjectId = request.ProjectId,
                InvestorId = request.InvestorId,
                AttemptNumber = attemptNumber,
                Amount = request.Amount,
                Currency = request.Currency,
                // The rate is frozen now and re-frozen at settlement; a rate change
                // mid-checkout must not move the goalposts under an investor.
                FeeRateBps = _settings.FeeRateBps,
                FeeAmount = 0m,
                NetToFounder = 0m,
                Status = PaymentStatus.Initiated,
                Provider = _provider.Name,
                CreatedAtUtc = now,
                ExpiresAtUtc = now.AddMinutes(_settings.CheckoutTtlMinutes),
            };

            _db.PaymentTransactions.Add(transaction);
            await _db.SaveChangesAsync(ct);

            var baseUrl = _settings.ReturnBaseUrl.TrimEnd('/');
            ProviderCheckout checkout;
            try
            {
                checkout = await _provider.CreateCheckoutAsync(new ProviderCheckoutRequest(
                    Reference: transaction.Reference,
                    Amount: transaction.Amount,
                    Currency: transaction.Currency,
                    VentureName: request.Investment.Project.Name,
                    Description: $"Simulated investment · {request.Investment.Project.Name} · sandbox only",
                    SuccessUrl: $"{baseUrl}/payments/return?tx={transaction.Id}&outcome=success",
                    CancelUrl: $"{baseUrl}/payments/return?tx={transaction.Id}&outcome=cancelled",
                    IdempotencyKey: $"vestora-tx-{transaction.Id}",
                    Metadata: new Dictionary<string, string>
                    {
                        ["vestora_transaction_id"] = transaction.Id.ToString(),
                        ["vestora_reference"] = transaction.Reference,
                        ["vestora_investment_id"] = transaction.InvestmentId.ToString(),
                        ["vestora_project_id"] = transaction.ProjectId.ToString(),
                        ["environment"] = "sandbox",
                    },
                    ExpiresAtUtc: transaction.ExpiresAtUtc), ct);
            }
            catch (PaymentProviderUnavailableException ex)
            {
                // The attempt is cancelled rather than failed. The investor's card did
                // nothing wrong and the history should not claim it did.
                transaction.Status = PaymentStatus.Cancelled;
                transaction.CancelReason = PaymentCancelReason.Abandoned;
                transaction.CancelledAtUtc = DateTime.UtcNow;
                transaction.FailureMessage = ex.Message;
                await _db.SaveChangesAsync(ct);

                _logger.LogError(ex, "Provider unavailable while opening checkout for transaction {Id}.", transaction.Id);
                return ServiceResult<CheckoutSessionDto>.BadRequest(
                    "The payment provider is unavailable right now. Please try again shortly.");
            }

            transaction.ProviderSessionId = checkout.SessionId;
            transaction.CheckoutUrl = checkout.CheckoutUrl;
            await _db.SaveChangesAsync(ct);

            await AuditAsync(investorUserId, "payment.attempt_created", "PaymentTransaction", transaction.Id,
                $"{transaction.Reference} · attempt {attemptNumber} · {transaction.Amount:N2} {transaction.Currency} · {_provider.Name}", ct);

            return ServiceResult<CheckoutSessionDto>.Ok(new CheckoutSessionDto
            {
                TransactionId = transaction.Id,
                Reference = transaction.Reference,
                CheckoutUrl = checkout.CheckoutUrl,
                Provider = _provider.Name,
                IsSandbox = _settings.IsSandbox,
                Amount = transaction.Amount,
                Currency = transaction.Currency,
                Resumed = false,
            });
        }

        /// <summary>
        /// The trusted confirmation path, used when the investor returns from the
        /// provider. Asks the provider what happened and applies it — the redirect
        /// itself carries no authority whatsoever.
        /// </summary>
        public async Task<ServiceResult<PaymentTransactionDto>> VerifyAsync(
            int transactionId, int callerUserId, bool isAdmin, CancellationToken ct = default)
        {
            var transaction = await _db.PaymentTransactions
                .Include(t => t.FundingRequest).ThenInclude(f => f.Investment).ThenInclude(i => i.Project)
                .FirstOrDefaultAsync(t => t.Id == transactionId, ct);

            if (transaction == null)
                return ServiceResult<PaymentTransactionDto>.NotFound("Transaction not found.");

            var isInvestor = transaction.InvestorId == callerUserId;
            var isFounder = transaction.FundingRequest.Investment.Project.OwnerId == callerUserId;
            if (!isInvestor && !isFounder && !isAdmin)
                return ServiceResult<PaymentTransactionDto>.Forbidden();

            // Already settled one way or the other: nothing to ask, nothing to change.
            if (PaymentStatus.IsTerminal(transaction.Status))
                return ServiceResult<PaymentTransactionDto>.Ok(await MapTransactionAsync(transaction, ct));

            if (string.IsNullOrWhiteSpace(transaction.ProviderSessionId))
                return ServiceResult<PaymentTransactionDto>.Ok(await MapTransactionAsync(transaction, ct));

            ProviderPaymentResult result;
            try
            {
                result = await _provider.GetSessionResultAsync(transaction.ProviderSessionId, ct);
            }
            catch (PaymentProviderUnavailableException ex)
            {
                _logger.LogWarning(ex, "Could not verify transaction {Id}; leaving it in {Status}.", transaction.Id, transaction.Status);
                return ServiceResult<PaymentTransactionDto>.Ok(await MapTransactionAsync(transaction, ct));
            }

            // The event key is derived rather than random, so verifying twice collides
            // with itself at the unique index instead of applying twice.
            var eventId = $"verify:{transaction.ProviderSessionId}:{result.State}";
            await ApplyProviderResultAsync(transaction, result, eventId, "verify", result.RawStatus, ct);

            await _db.Entry(transaction).ReloadAsync(ct);
            return ServiceResult<PaymentTransactionDto>.Ok(await MapTransactionAsync(transaction, ct));
        }

        /// <summary>Investor abandons a checkout deliberately. Records the fact rather than deleting the attempt.</summary>
        public async Task<ServiceResult<PaymentTransactionDto>> CancelAttemptAsync(
            int transactionId, int investorUserId, CancellationToken ct = default)
        {
            var transaction = await _db.PaymentTransactions
                .Include(t => t.FundingRequest)
                .FirstOrDefaultAsync(t => t.Id == transactionId, ct);

            if (transaction == null)
                return ServiceResult<PaymentTransactionDto>.NotFound("Transaction not found.");

            if (transaction.InvestorId != investorUserId)
                return ServiceResult<PaymentTransactionDto>.Forbidden();

            if (!PaymentStatus.IsActive(transaction.Status))
                return ServiceResult<PaymentTransactionDto>.Ok(await MapTransactionAsync(transaction, ct));

            transaction.Status = PaymentStatus.Cancelled;
            transaction.CancelReason = PaymentCancelReason.UserCancelled;
            transaction.CancelledAtUtc = DateTime.UtcNow;
            transaction.CheckoutUrl = null;
            await _db.SaveChangesAsync(ct);

            await AuditAsync(investorUserId, "payment.cancelled", "PaymentTransaction", transaction.Id,
                $"{transaction.Reference} · cancelled by investor", ct);

            return ServiceResult<PaymentTransactionDto>.Ok(await MapTransactionAsync(transaction, ct));
        }

        // ==================================================================
        //  Applying a provider outcome — the only place funding changes
        // ==================================================================

        /// <summary>
        /// Records the provider's event, then applies it exactly once — both or neither.
        /// <para>
        /// The record is written first and the unique index on (provider, event id) is
        /// what makes this idempotent. A duplicate webhook, a double-clicked return page
        /// and a webhook racing that return page all collide here — before any figure
        /// has moved — and the loser exits quietly.
        /// </para>
        /// <para>
        /// The whole thing runs inside one database transaction, and that is not
        /// decoration. Claiming the idempotency key is itself a durable write: once it is
        /// committed, every later delivery of the same event is refused. If the process
        /// died between claiming the key and applying the effect — a deploy, a dropped
        /// connection, a timeout — the key would survive and the settlement would not,
        /// and no retry could ever recover it because the retry is exactly what the key
        /// now blocks. A payment would be silently lost. Committing the claim together
        /// with its effect is what makes "exactly once" true rather than aspirational.
        /// </para>
        /// </summary>
        public async Task<bool> ApplyProviderResultAsync(
            PaymentTransaction transaction,
            ProviderPaymentResult result,
            string providerEventId,
            string source,
            string? payload,
            CancellationToken ct = default)
        {
            await using var tx = await _db.Database.BeginTransactionAsync(ct);

            var evt = new PaymentEvent
            {
                Provider = _provider.Name,
                ProviderEventId = providerEventId,
                EventType = result.State.ToString().ToLowerInvariant(),
                Source = source,
                PaymentTransactionId = transaction.Id,
                Payload = payload is { Length: > 4000 } ? payload[..4000] : payload,
                ReceivedAtUtc = DateTime.UtcNow,
                Applied = false,
            };

            _db.PaymentEvents.Add(evt);
            try
            {
                await _db.SaveChangesAsync(ct);
            }
            catch (DbUpdateException ex) when (IsUniqueViolation(ex))
            {
                _db.Entry(evt).State = EntityState.Detached;
                await tx.RollbackAsync(ct);
                _logger.LogInformation("Duplicate provider event {EventId} ignored for transaction {Id}.",
                    providerEventId, transaction.Id);
                return false;
            }

            bool applied;
            try
            {
                // Terminal rows are never rewritten. The single exception, Succeeded →
                // Refunded, is an admin action and does not travel this path.
                if (PaymentStatus.IsTerminal(transaction.Status))
                {
                    // One shape of this is not routine: the provider says money was taken,
                    // but Vestora had already written the attempt off. That means the two
                    // sides disagree about a real payment, and it must be loud rather than
                    // logged as another duplicate. The event row survives either way, so the
                    // reconciliation can be done by hand from the audit trail.
                    if (result.State == ProviderPaymentState.Succeeded &&
                        transaction.Status != PaymentStatus.Succeeded &&
                        transaction.Status != PaymentStatus.Refunded)
                    {
                        _logger.LogError(
                            "RECONCILIATION: provider reports transaction {Reference} (id {Id}) as paid, but Vestora " +
                            "already closed it as {Status}. Funding was NOT recorded. Provider payment id {PaymentId}.",
                            transaction.Reference, transaction.Id, transaction.Status, result.PaymentId);

                        evt.Outcome = $"CONFLICT · provider paid, local status {transaction.Status}";
                    }
                    else
                    {
                        evt.Outcome = $"ignored · already {transaction.Status}";
                    }

                    await _db.SaveChangesAsync(ct);
                    await tx.CommitAsync(ct);
                    return false;
                }

                applied = result.State switch
                {
                    ProviderPaymentState.Succeeded => await SettleAsync(transaction, result, ct),
                    ProviderPaymentState.Failed => await FailAsync(transaction, result, ct),
                    ProviderPaymentState.Cancelled => await CancelBecauseProviderSaidSoAsync(transaction, ct),
                    ProviderPaymentState.Processing => await MarkProcessingAsync(transaction, result, ct),
                    _ => false,
                };

                evt.Applied = applied;
                evt.Outcome = applied ? $"applied · {transaction.Status}" : $"no-op · {transaction.Status}";
                await _db.SaveChangesAsync(ct);
            }
            catch (DbUpdateConcurrencyException)
            {
                // Somebody else moved this row between the read and the write — the
                // desired outcome reached by another path, not an error. The claim rolls
                // back with the effect, so the winner's event is the only one on record.
                await tx.RollbackAsync(ct);
                await ForgetLocalChangesAsync(transaction, ct);
                _logger.LogInformation("Transaction {Id} changed concurrently; standing down.", transaction.Id);
                return false;
            }
            catch
            {
                // Anything else — a dropped connection, a timeout — takes the idempotency
                // claim down with it so the provider's retry can still be applied.
                await tx.RollbackAsync(ct);
                await ForgetLocalChangesAsync(transaction, ct);
                throw;
            }

            await tx.CommitAsync(ct);
            return applied;
        }

        /// <summary>
        /// Drops uncommitted edits from the change tracker after a rollback, so the
        /// context does not carry writes the database has already refused.
        /// </summary>
        private async Task ForgetLocalChangesAsync(PaymentTransaction transaction, CancellationToken ct)
        {
            try
            {
                foreach (var entry in _db.ChangeTracker.Entries().Where(e => e.State == EntityState.Modified).ToList())
                    await entry.ReloadAsync(ct);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not reset tracked state after rolling back transaction {Id}.", transaction.Id);
            }
        }

        /// <summary>
        /// Settlement. The one transition that creates funded capital, so it runs inside
        /// the caller's database transaction and is guarded by a row version.
        /// </summary>
        private async Task<bool> SettleAsync(PaymentTransaction transaction, ProviderPaymentResult result, CancellationToken ct)
        {
            var request = await _db.FundingRequests
                .Include(f => f.Investment).ThenInclude(i => i.Project)
                .FirstAsync(f => f.Id == transaction.FundingRequestId, ct);

            var now = DateTime.UtcNow;

            // The rate that was quoted when this attempt opened, not the one configured
            // now. Reading live settings here would let a rate change between checkout
            // and settlement alter the founder's proceeds after they had been shown a
            // figure — a small window, but the founder's number, and the row already
            // carries the answer.
            var feeRateBps = transaction.FeeRateBps > 0 ? transaction.FeeRateBps : _settings.FeeRateBps;
            var fee = Math.Round(transaction.Amount * feeRateBps / 10000m, 2, MidpointRounding.AwayFromZero);
            var net = transaction.Amount - fee;

            transaction.Status = PaymentStatus.Succeeded;
            transaction.ProviderPaymentId = result.PaymentId;
            transaction.SucceededAtUtc = now;
            transaction.FeeRateBps = feeRateBps;
            transaction.FeeAmount = fee;
            transaction.NetToFounder = net;
            transaction.CheckoutUrl = null;

            request.Status = FundingRequestStatus.Paid;
            request.PaidAtUtc = now;
            request.ClosedAtUtc = now;

            var investment = request.Investment;
            if (investment.Stage != PipelineStages.Closed)
            {
                // The investor is the actor: they are the one who did this, and a history
                // that credited the founder for the moment the money arrived would be
                // describing the wrong person's action.
                await StageLog.MoveAsync(_db, investment, PipelineStages.Committed,
                    transaction.InvestorId, $"Payment settled · {transaction.Reference}", ct);
            }

            try
            {
                await _db.SaveChangesAsync(ct);
            }
            catch (DbUpdateConcurrencyException)
            {
                // Somebody else settled this row between the read and the write. That is
                // the desired outcome, reached by another path — not an error.
                _logger.LogInformation("Transaction {Id} was settled concurrently; standing down.", transaction.Id);
                return false;
            }

            await AuditAsync(transaction.InvestorId, "payment.succeeded", "PaymentTransaction", transaction.Id,
                $"{transaction.Reference} · {transaction.Amount:N2} {transaction.Currency} · fee {fee:N2} · net {net:N2}", ct);

            await NotifyAsync(
                userId: investment.Project.OwnerId,
                actorId: transaction.InvestorId,
                type: PaymentNotificationTypes.PaymentSucceeded,
                content: $"{investment.Project.Name}: {transaction.Amount:N0} {transaction.Currency} has been funded. Net proceeds {net:N0} {transaction.Currency} after the {feeRateBps / 100m:0.##}% platform fee. (Sandbox — no real funds moved.)",
                projectId: transaction.ProjectId,
                investmentId: transaction.InvestmentId,
                ct: ct);

            await NotifyAsync(
                userId: transaction.InvestorId,
                actorId: transaction.InvestorId,
                type: PaymentNotificationTypes.PaymentSucceeded,
                content: $"Your investment in {investment.Project.Name} is funded — {transaction.Amount:N0} {transaction.Currency}. Reference {transaction.Reference}. (Sandbox — no real funds moved.)",
                projectId: transaction.ProjectId,
                investmentId: transaction.InvestmentId,
                ct: ct);

            return true;
        }

        private async Task<bool> FailAsync(PaymentTransaction transaction, ProviderPaymentResult result, CancellationToken ct)
        {
            transaction.Status = PaymentStatus.Failed;
            transaction.FailedAtUtc = DateTime.UtcNow;
            transaction.FailureCode = Trim(result.FailureCode, 64);
            transaction.FailureMessage = Trim(result.FailureMessage, 500) ?? "The payment was not completed.";
            transaction.CheckoutUrl = null;

            try
            {
                await _db.SaveChangesAsync(ct);
            }
            catch (DbUpdateConcurrencyException)
            {
                return false;
            }

            await AuditAsync(transaction.InvestorId, "payment.failed", "PaymentTransaction", transaction.Id,
                $"{transaction.Reference} · {transaction.FailureCode} · {transaction.FailureMessage}", ct);

            // The funding request stays open. A failed attempt is not a withdrawn ask —
            // the investor can try again, and attempt #2 is a new row.
            return true;
        }

        private async Task<bool> CancelBecauseProviderSaidSoAsync(PaymentTransaction transaction, CancellationToken ct)
        {
            transaction.Status = PaymentStatus.Cancelled;
            transaction.CancelReason = PaymentCancelReason.UserCancelled;
            transaction.CancelledAtUtc = DateTime.UtcNow;
            transaction.CheckoutUrl = null;

            try
            {
                await _db.SaveChangesAsync(ct);
            }
            catch (DbUpdateConcurrencyException)
            {
                return false;
            }
            return true;
        }

        private async Task<bool> MarkProcessingAsync(PaymentTransaction transaction, ProviderPaymentResult result, CancellationToken ct)
        {
            if (transaction.Status == PaymentStatus.Processing) return false;

            transaction.Status = PaymentStatus.Processing;
            transaction.ProviderPaymentId = result.PaymentId ?? transaction.ProviderPaymentId;

            try
            {
                await _db.SaveChangesAsync(ct);
            }
            catch (DbUpdateConcurrencyException)
            {
                return false;
            }
            return true;
        }

        // ==================================================================
        //  Refund — an exception after settlement, never a stage of the flow
        // ==================================================================

        public async Task<ServiceResult<PaymentTransactionDto>> RefundAsync(
            int transactionId, int adminUserId, string? reason, CancellationToken ct = default)
        {
            var transaction = await _db.PaymentTransactions
                .Include(t => t.FundingRequest).ThenInclude(f => f.Investment).ThenInclude(i => i.Project)
                .FirstOrDefaultAsync(t => t.Id == transactionId, ct);

            if (transaction == null)
                return ServiceResult<PaymentTransactionDto>.NotFound("Transaction not found.");

            if (transaction.Status == PaymentStatus.Refunded)
                return ServiceResult<PaymentTransactionDto>.BadRequest("This transaction has already been refunded.");

            if (transaction.Status != PaymentStatus.Succeeded)
                return ServiceResult<PaymentTransactionDto>.BadRequest("Only a settled transaction can be refunded.");

            // The event is recorded before the provider is asked, and the unique index on
            // (provider, event id) is what makes a reversal happen once.
            //
            // The status check above is a read followed by a write, and two admins on the
            // same receipt both pass it before either writes. The row version would catch
            // the second one — but only at save time, long after the provider had been
            // told to send the money back twice. Claiming the key first moves that
            // collision to before the irreversible call, which is the whole reason
            // settlements claim one too.
            var claim = new PaymentEvent
            {
                Provider = _provider.Name,
                ProviderEventId = $"refund:{transaction.Id}",
                EventType = "refund",
                Source = "admin",
                PaymentTransactionId = transaction.Id,
                ReceivedAtUtc = DateTime.UtcNow,
                Applied = false,
            };

            _db.PaymentEvents.Add(claim);
            try
            {
                await _db.SaveChangesAsync(ct);
            }
            catch (DbUpdateException ex) when (IsUniqueViolation(ex))
            {
                _db.Entry(claim).State = EntityState.Detached;
                _logger.LogInformation("Refund for transaction {Id} is already in progress.", transaction.Id);
                return ServiceResult<PaymentTransactionDto>.BadRequest(
                    "A refund for this transaction is already being processed.");
            }

            ProviderRefundResult refund;
            try
            {
                refund = await _provider.RefundAsync(
                    transaction.ProviderPaymentId ?? transaction.ProviderSessionId ?? transaction.Reference,
                    transaction.Amount, transaction.Currency, ct);
            }
            catch (PaymentProviderUnavailableException ex)
            {
                // The provider was never reached, so nothing was reversed and the claim
                // must not stand in the way of trying again.
                _db.PaymentEvents.Remove(claim);
                await _db.SaveChangesAsync(ct);
                return ServiceResult<PaymentTransactionDto>.BadRequest(
                    $"The payment provider is unavailable: {ex.Message}");
            }

            if (!refund.Succeeded)
            {
                // Refused, not reversed. The claim is released so a corrected attempt is
                // possible, but the refusal itself is worth keeping — so it is recorded
                // under a key of its own rather than thrown away with the claim.
                claim.ProviderEventId = $"refund-refused:{transaction.Id}:{DateTime.UtcNow.Ticks}";
                claim.EventType = "refund_refused";
                claim.Outcome = Trim(refund.FailureMessage, 200) ?? "The provider refused the refund.";
                await _db.SaveChangesAsync(ct);

                return ServiceResult<PaymentTransactionDto>.BadRequest(
                    refund.FailureMessage ?? "The provider refused the refund.");
            }

            var now = DateTime.UtcNow;
            transaction.Status = PaymentStatus.Refunded;
            transaction.RefundedAtUtc = now;
            transaction.RefundedByAdminId = adminUserId;
            transaction.ProviderRefundId = refund.RefundId;
            transaction.RefundReason = Trim(reason, 300);

            claim.Applied = true;
            claim.Outcome = $"applied · {refund.RefundId}";

            // Leaving the funding request Paid is the honest record: it was paid, and
            // then it was reversed. Reopening it would erase that. Funded totals fall on
            // their own because the transaction has left the Succeeded state, and the
            // fee goes with it — the platform does not keep revenue on money it returned.
            var project = transaction.FundingRequest.Investment.Project;

            try
            {
                await _db.SaveChangesAsync(ct);
            }
            catch (DbUpdateConcurrencyException)
            {
                return ServiceResult<PaymentTransactionDto>.BadRequest(
                    "This transaction changed while the refund was being processed. Reload and try again.");
            }

            await AuditAsync(adminUserId, "payment.refunded", "PaymentTransaction", transaction.Id,
                $"{transaction.Reference} · {transaction.Amount:N2} {transaction.Currency} reversed · revenue -{transaction.FeeAmount:N2} · {transaction.RefundReason}", ct);

            await NotifyAsync(
                userId: transaction.InvestorId,
                actorId: adminUserId,
                type: PaymentNotificationTypes.RefundCompleted,
                content: $"Your {transaction.Amount:N0} {transaction.Currency} investment in {project.Name} has been refunded. Reference {transaction.Reference}.",
                projectId: transaction.ProjectId,
                investmentId: transaction.InvestmentId,
                ct: ct);

            await NotifyAsync(
                userId: project.OwnerId,
                actorId: adminUserId,
                type: PaymentNotificationTypes.RefundCompleted,
                content: $"{project.Name}: a funded investment of {transaction.Amount:N0} {transaction.Currency} has been refunded and removed from your funded total.",
                projectId: transaction.ProjectId,
                investmentId: transaction.InvestmentId,
                ct: ct);

            return ServiceResult<PaymentTransactionDto>.Ok(await MapTransactionAsync(transaction, ct));
        }

        // ==================================================================
        //  Mapping
        // ==================================================================

        public async Task<FundingRequestDto> MapRequestAsync(FundingRequest request, CancellationToken ct = default)
        {
            var attempts = await _db.PaymentTransactions
                .AsNoTracking()
                .Where(t => t.FundingRequestId == request.Id)
                .OrderBy(t => t.AttemptNumber)
                .ToListAsync(ct);

            var feeRate = request.Status == FundingRequestStatus.Paid
                ? attempts.FirstOrDefault(t => t.Status == PaymentStatus.Succeeded)?.FeeRateBps ?? _settings.FeeRateBps
                : _settings.FeeRateBps;

            var fee = Math.Round(request.Amount * feeRate / 10000m, 2, MidpointRounding.AwayFromZero);

            return new FundingRequestDto
            {
                Id = request.Id,
                Reference = request.Reference,
                InvestmentId = request.InvestmentId,
                ProjectId = request.ProjectId,
                InvestorId = request.InvestorId,
                Amount = request.Amount,
                Currency = request.Currency,
                Status = request.Status,
                Note = request.Note,
                ClosedReason = request.ClosedReason,
                CreatedAtUtc = request.CreatedAtUtc,
                ExpiresAtUtc = request.ExpiresAtUtc,
                PaidAtUtc = request.PaidAtUtc,
                FeeRateBps = feeRate,
                EstimatedFee = fee,
                EstimatedNetProceeds = request.Amount - fee,
                CounterAmount = request.CounterAmount,
                CounterNote = request.CounterNote,
                CounterAtUtc = request.CounterAtUtc,
                CounterStatus = request.CounterStatus,
                SupersedesRequestId = request.SupersedesRequestId,
                TermSheetId = request.TermSheetId,
                Attempts = attempts.Select(ToAttemptDto).ToList(),
            };
        }

        public async Task<PaymentTransactionDto> MapTransactionAsync(PaymentTransaction t, CancellationToken ct = default)
        {
            var context = await _db.PaymentTransactions
                .AsNoTracking()
                .IgnoreQueryFilters()
                .Where(x => x.Id == t.Id)
                .Select(x => new
                {
                    ProjectName = x.FundingRequest.Investment.Project.Name,
                    FounderId = x.FundingRequest.Investment.Project.OwnerId,
                    FounderName = x.FundingRequest.Investment.Project.Owner.UserName,
                    InvestorName = x.FundingRequest.Investment.Investor!.UserName,
                    FundingReference = x.FundingRequest.Reference,
                    CoverImageId = x.FundingRequest.Investment.Project.Images
                        .OrderBy(im => im.Id).Select(im => (int?)im.Id).FirstOrDefault(),
                })
                .FirstOrDefaultAsync(ct);

            var dto = ToAttemptDto(t);
            dto.ProjectName = context?.ProjectName ?? string.Empty;
            dto.FounderId = context?.FounderId ?? 0;
            dto.FounderName = context?.FounderName ?? string.Empty;
            dto.InvestorName = context?.InvestorName ?? string.Empty;
            dto.FundingRequestReference = context?.FundingReference;
            dto.CoverImageId = context?.CoverImageId;
            dto.IsSandbox = _settings.IsSandbox;
            return dto;
        }

        public static PaymentTransactionDto ToAttemptDto(PaymentTransaction t) => new()
        {
            Id = t.Id,
            Reference = t.Reference,
            FundingRequestId = t.FundingRequestId,
            InvestmentId = t.InvestmentId,
            ProjectId = t.ProjectId,
            InvestorId = t.InvestorId,
            AttemptNumber = t.AttemptNumber,
            Amount = t.Amount,
            Currency = t.Currency,
            FeeRateBps = t.FeeRateBps,
            FeeAmount = t.FeeAmount,
            NetToFounder = t.NetToFounder,
            Status = t.Status,
            Provider = t.Provider,
            ProviderPaymentId = t.ProviderPaymentId,
            ProviderRefundId = t.ProviderRefundId,
            CheckoutUrl = PaymentStatus.IsActive(t.Status) ? t.CheckoutUrl : null,
            FailureCode = t.FailureCode,
            FailureMessage = t.FailureMessage,
            CancelReason = t.CancelReason,
            RefundReason = t.RefundReason,
            CreatedAtUtc = t.CreatedAtUtc,
            ExpiresAtUtc = t.ExpiresAtUtc,
            SucceededAtUtc = t.SucceededAtUtc,
            FailedAtUtc = t.FailedAtUtc,
            CancelledAtUtc = t.CancelledAtUtc,
            RefundedAtUtc = t.RefundedAtUtc,
        };

        // ==================================================================
        //  Plumbing
        // ==================================================================

        /// <summary>
        /// Sequential, human-quotable references: VST-FR-2026-000042, VST-TX-2026-000123.
        /// A person reading one out on a phone should not have to spell a GUID.
        /// </summary>
        private async Task<string> NextReferenceAsync(string kind, CancellationToken ct)
        {
            var year = DateTime.UtcNow.Year;
            var seq = kind == "FR"
                ? await _db.FundingRequests.IgnoreQueryFilters().CountAsync(ct)
                : await _db.PaymentTransactions.IgnoreQueryFilters().CountAsync(ct);
            return $"VST-{kind}-{year}-{seq + 1:D6}";
        }

        private async Task NotifyAsync(
            int userId, int actorId, string type, string content,
            int projectId, int investmentId, CancellationToken ct)
        {
            var notification = new Notification
            {
                Content = content,
                NotificationType = type,
                ProjectId = projectId,
                InvestmentId = investmentId,
                ActorUserId = actorId,
                DateCreated = DateTime.UtcNow,
                IsRead = false,
                UserId = userId,
            };

            _db.Notifications.Add(notification);
            await _db.SaveChangesAsync(ct);
            await _hub.PushAsync(notification);
        }

        /// <summary>
        /// Financial events go into the existing admin audit trail rather than a parallel
        /// log. One place to look is the point of an audit trail.
        /// </summary>
        private async Task AuditAsync(int actorUserId, string action, string targetType, int targetId, string details, CancellationToken ct)
        {
            _db.AdminAuditLogs.Add(new AdminAuditLog
            {
                AdminUserId = actorUserId,
                Action = action,
                TargetType = targetType,
                TargetId = targetId,
                Details = details.Length > 500 ? details[..500] : details,
                CreatedAtUtc = DateTime.UtcNow,
            });
            await _db.SaveChangesAsync(ct);
        }

        private static string? Trim(string? value, int max) =>
            string.IsNullOrWhiteSpace(value) ? null : value.Length <= max ? value : value[..max];

        internal static bool IsUniqueViolation(DbUpdateException ex) =>
            ex.InnerException is Microsoft.Data.SqlClient.SqlException sql &&
            (sql.Number == 2601 || sql.Number == 2627);
    }

    /// <summary>The notification types this system emits. Mirrored in the client's taxonomy.</summary>
    public static class PaymentNotificationTypes
    {
        public const string FundingRequested = "funding_requested";
        public const string PaymentSucceeded = "payment_succeeded";
        public const string PaymentFailed = "payment_failed";
        public const string RefundCompleted = "refund_completed";
        public const string FundingRequestExpired = "funding_request_expired";
        public const string FundingRequestReminder = "funding_request_reminder";
        public const string CounterOffered = "funding_counter_offered";
        public const string CounterAnswered = "funding_counter_answered";
        public const string TermsProposed = "terms_proposed";
        public const string TermsAgreed = "terms_agreed";
        public const string TermsDeclined = "terms_declined";
    }
}
