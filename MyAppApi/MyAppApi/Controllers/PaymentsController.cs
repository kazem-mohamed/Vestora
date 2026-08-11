using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using MyAppApi.Data;
using MyAppApi.Data.Models;
using MyAppApi.Data.Models.DTOs;
using MyAppApi.Services;
using MyAppApi.Services.Payments;
using MyAppApi.Settings;

namespace MyAppApi.Controllers
{
    /// <summary>
    /// The funding half of an investment relationship: asking for the agreed money,
    /// paying it, and reading what happened.
    /// <para>
    /// Every amount is decided server-side from a stored row. Nothing here trusts a
    /// figure, a fee, or a payment status that arrived from a browser.
    /// </para>
    /// </summary>
    [Route("api/payments")]
    [ApiController]
    [Authorize]
    public class PaymentsController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly PaymentService _payments;
        private readonly PaymentSettings _settings;
        private readonly IPaymentProvider _provider;
        private readonly ILogger<PaymentsController> _logger;

        public PaymentsController(
            AppDbContext db,
            PaymentService payments,
            IOptions<PaymentSettings> settings,
            IPaymentProvider provider,
            ILogger<PaymentsController> logger)
        {
            _db = db;
            _payments = payments;
            _settings = settings.Value;
            _provider = provider;
            _logger = logger;
        }

        private int Me() =>
            int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : 0;

        private bool IsAdmin() => User.IsInRole("Admin");

        // ==================================================================
        //  Environment
        // ==================================================================

        /// <summary>
        /// What the interface needs to be honest about the environment: which adapter is
        /// live, the fee rate, and that none of this is real money.
        /// </summary>
        [HttpGet("config")]
        [AllowAnonymous]
        public IActionResult GetConfig() => Ok(new
        {
            provider = _provider.Name,
            isSandbox = _settings.IsSandbox,
            currency = _settings.Currency,
            feeRateBps = _settings.FeeRateBps,
            feeRatePercent = _settings.FeeRateBps / 100m,
            checkoutTtlMinutes = _settings.CheckoutTtlMinutes,
            fundingRequestTtlDays = _settings.FundingRequestTtlDays,
        });

        // ==================================================================
        //  Funding requests
        // ==================================================================

        /// <summary>Founder asks for the agreed money on an approved relationship.</summary>
        [HttpPost("investments/{investmentId:int}/funding-request")]
        [Authorize(Roles = "Innovator")]
        public async Task<IActionResult> CreateFundingRequest(
            int investmentId, [FromBody] CreateFundingRequestInput input, CancellationToken ct)
        {
            var result = await _payments.CreateFundingRequestAsync(
                investmentId, Me(), input.Amount, input.Note, ct);
            return this.ToActionResult(result);
        }

        /// <summary>The current funding request for a relationship, if there is one.</summary>
        [HttpGet("investments/{investmentId:int}/funding-request")]
        public async Task<IActionResult> GetFundingRequestForInvestment(int investmentId, CancellationToken ct)
        {
            var investment = await _db.Investments
                .Include(i => i.Project)
                .FirstOrDefaultAsync(i => i.Id == investmentId, ct);

            if (investment == null) return NotFound(new { message = "Relationship not found." });

            var me = Me();
            if (investment.Project.OwnerId != me && investment.InvestorId != me && !IsAdmin())
                return Forbid();

            // The live one if there is one, otherwise the most recent for history.
            var request = await _db.FundingRequests
                .Where(f => f.InvestmentId == investmentId)
                .OrderByDescending(f => f.Status == FundingRequestStatus.Open)
                .ThenByDescending(f => f.Id)
                .FirstOrDefaultAsync(ct);

            if (request == null) return Ok(null);
            return Ok(await _payments.MapRequestAsync(request, ct));
        }

        [HttpGet("funding-requests/{id:int}")]
        public async Task<IActionResult> GetFundingRequest(int id, CancellationToken ct)
        {
            var request = await _db.FundingRequests
                .Include(f => f.Investment).ThenInclude(i => i.Project)
                .FirstOrDefaultAsync(f => f.Id == id, ct);

            if (request == null) return NotFound(new { message = "Funding request not found." });

            var me = Me();
            if (request.InvestorId != me && request.Investment.Project.OwnerId != me && !IsAdmin())
                return Forbid();

            return Ok(await _payments.MapRequestAsync(request, ct));
        }

        /// <summary>
        /// The investor proposes a different number. The founder's figure was the only
        /// one on the table, and "pay it or let it lapse" is not a negotiation.
        /// </summary>
        [HttpPost("funding-requests/{id:int}/counter")]
        [Authorize(Roles = "Investor")]
        public async Task<IActionResult> CounterOffer(
            int id, [FromBody] CounterOfferInput input, CancellationToken ct)
        {
            var result = await _payments.CounterOfferAsync(id, Me(), input.Amount, input.Note, ct);
            return this.ToActionResult(result);
        }

        /// <summary>
        /// The founder answers a counter. Accepting closes the ask and issues a new one
        /// at the agreed figure — the two numbers are the record of what was negotiated.
        /// </summary>
        [HttpPost("funding-requests/{id:int}/counter/answer")]
        [Authorize(Roles = "Innovator")]
        public async Task<IActionResult> AnswerCounterOffer(
            int id, [FromBody] AnswerCounterInput input, CancellationToken ct)
        {
            var result = await _payments.AnswerCounterOfferAsync(id, Me(), input.Accept, input.Note, ct);
            return this.ToActionResult(result);
        }

        /// <summary>Founder withdraws an ask that has not been paid.</summary>
        [HttpPost("funding-requests/{id:int}/cancel")]
        public async Task<IActionResult> CancelFundingRequest(
            int id, [FromBody] CancelFundingRequestInput? input, CancellationToken ct)
        {
            var result = await _payments.CancelFundingRequestAsync(id, Me(), IsAdmin(), input?.Reason, ct);
            return this.ToActionResult(result);
        }

        // ==================================================================
        //  Checkout
        // ==================================================================

        /// <summary>
        /// Opens a hosted checkout for the investor the request was addressed to.
        /// Rate-limited: opening sessions is the one action here that costs the provider
        /// something.
        /// </summary>
        [HttpPost("funding-requests/{id:int}/checkout")]
        [Authorize(Roles = "Investor")]
        [EnableRateLimiting("Checkout")]
        public async Task<IActionResult> CreateCheckout(int id, CancellationToken ct)
        {
            var result = await _payments.CreateCheckoutAsync(id, Me(), ct);
            return this.ToActionResult(result);
        }

        /// <summary>
        /// Asks the provider what happened and applies it. Called when the investor lands
        /// back on Vestora — the return URL's own claim of success is ignored entirely.
        /// </summary>
        [HttpPost("transactions/{id:int}/verify")]
        public async Task<IActionResult> Verify(int id, CancellationToken ct)
        {
            var result = await _payments.VerifyAsync(id, Me(), IsAdmin(), ct);
            return this.ToActionResult(result);
        }

        [HttpPost("transactions/{id:int}/cancel")]
        [Authorize(Roles = "Investor")]
        public async Task<IActionResult> CancelAttempt(int id, CancellationToken ct)
        {
            var result = await _payments.CancelAttemptAsync(id, Me(), ct);
            return this.ToActionResult(result);
        }

        [HttpGet("transactions/{id:int}")]
        public async Task<IActionResult> GetTransaction(int id, CancellationToken ct)
        {
            var transaction = await _db.PaymentTransactions
                .Include(t => t.FundingRequest).ThenInclude(f => f.Investment).ThenInclude(i => i.Project)
                .FirstOrDefaultAsync(t => t.Id == id, ct);

            if (transaction == null) return NotFound(new { message = "Transaction not found." });

            var me = Me();
            var isFounder = transaction.FundingRequest.Investment.Project.OwnerId == me;
            if (transaction.InvestorId != me && !isFounder && !IsAdmin())
                return Forbid();

            return Ok(await _payments.MapTransactionAsync(transaction, ct));
        }

        // ==================================================================
        //  Investor payments surface
        // ==================================================================

        /// <summary>
        /// The investor's money in one response: what is owed, what settled, what failed.
        /// </summary>
        [HttpGet("mine")]
        [Authorize(Roles = "Investor")]
        public async Task<IActionResult> Mine(CancellationToken ct)
        {
            var me = Me();

            var dueRequests = await _db.FundingRequests
                .Include(f => f.Investment).ThenInclude(i => i.Project)
                .Where(f => f.InvestorId == me && f.Status == FundingRequestStatus.Open)
                .OrderBy(f => f.ExpiresAtUtc)
                .ToListAsync(ct);

            var due = new List<FundingRequestDto>();
            foreach (var r in dueRequests)
            {
                due.Add(await _payments.MapRequestAsync(r, ct));
            }

            var rows = await _db.PaymentTransactions
                .AsNoTracking()
                .Where(t => t.InvestorId == me)
                .OrderByDescending(t => t.Id)
                .Select(t => new
                {
                    Transaction = t,
                    ProjectName = t.FundingRequest.Investment.Project.Name,
                    FounderId = t.FundingRequest.Investment.Project.OwnerId,
                    FounderName = t.FundingRequest.Investment.Project.Owner.UserName,
                    FundingReference = t.FundingRequest.Reference,
                    CoverImageId = t.FundingRequest.Investment.Project.Images
                        .OrderBy(im => im.Id).Select(im => (int?)im.Id).FirstOrDefault(),
                })
                .ToListAsync(ct);

            var transactions = rows.Select(r =>
            {
                var dto = PaymentService.ToAttemptDto(r.Transaction);
                dto.ProjectName = r.ProjectName;
                dto.FounderId = r.FounderId;
                dto.FounderName = r.FounderName;
                dto.FundingRequestReference = r.FundingReference;
                dto.CoverImageId = r.CoverImageId;
                dto.IsSandbox = _settings.IsSandbox;
                return dto;
            }).ToList();

            var committed = await _db.Investments
                .Where(i => i.InvestorId == me && i.Status == "Approved")
                .SumAsync(i => (decimal?)i.Amount, ct) ?? 0m;

            var summary = new InvestorPaymentSummaryDto
            {
                FundedTotal = transactions.Where(t => t.Status == PaymentStatus.Succeeded).Sum(t => t.Amount),
                FundedCount = transactions.Count(t => t.Status == PaymentStatus.Succeeded),
                PaymentDueTotal = due.Sum(d => d.Amount),
                PaymentDueCount = due.Count,
                CommittedTotal = committed,
                RefundedTotal = transactions.Where(t => t.Status == PaymentStatus.Refunded).Sum(t => t.Amount),
                FailedCount = transactions.Count(t => t.Status == PaymentStatus.Failed),
                Currency = _settings.Currency,
            };

            return Ok(new InvestorPaymentsDto
            {
                Summary = summary,
                Due = due,
                Transactions = transactions,
                IsSandbox = _settings.IsSandbox,
                Provider = _provider.Name,
            });
        }

        // ==================================================================
        //  Sandbox checkout (simulated provider only)
        // ==================================================================

        /// <summary>
        /// Describes a simulated session so Vestora's own sandbox checkout page can show
        /// what is being paid. Returns 404 under any other provider.
        /// </summary>
        [HttpGet("sandbox/sessions/{sessionId}")]
        [Authorize(Roles = "Investor")]
        public IActionResult DescribeSandboxSession(string sessionId)
        {
            if (_provider is not SimulatedPaymentProvider sim)
                return NotFound(new { message = "The sandbox checkout is only available with the simulated provider." });

            var described = sim.Describe(sessionId);
            if (described == null) return NotFound(new { message = "Unknown session." });

            return Ok(new
            {
                sessionId,
                amount = described.Value.Amount,
                currency = described.Value.Currency,
                reference = described.Value.Reference,
            });
        }

        /// <summary>
        /// Resolves a simulated session. This is what stands in for typing a test card:
        /// the presenter picks success, decline, or walking away, and the rest of the
        /// system behaves exactly as it does with Stripe.
        /// </summary>
        [HttpPost("sandbox/sessions/{sessionId}/resolve")]
        [Authorize(Roles = "Investor")]
        public async Task<IActionResult> ResolveSandboxSession(
            string sessionId, [FromBody] SandboxOutcomeInput input, CancellationToken ct)
        {
            if (_provider is not SimulatedPaymentProvider sim)
                return NotFound(new { message = "The sandbox checkout is only available with the simulated provider." });

            var transaction = await _db.PaymentTransactions
                .FirstOrDefaultAsync(t => t.ProviderSessionId == sessionId, ct);

            if (transaction == null) return NotFound(new { message = "Unknown session." });

            // The session belongs to whoever the funding request was addressed to.
            if (transaction.InvestorId != Me()) return Forbid();

            var outcome = (input.Outcome ?? "success").ToLowerInvariant() switch
            {
                "failure" or "fail" or "decline" => ProviderPaymentState.Failed,
                "cancel" or "cancelled" => ProviderPaymentState.Cancelled,
                _ => ProviderPaymentState.Succeeded,
            };

            if (!sim.Resolve(sessionId, outcome))
                return BadRequest(new { message = "This session has already been resolved." });

            return Ok(new { resolved = true, outcome = outcome.ToString().ToLowerInvariant() });
        }

        // ==================================================================
        //  Webhook
        // ==================================================================

        /// <summary>
        /// Stripe's confirmation channel. Anonymous by necessity — Stripe holds no JWT —
        /// and therefore authenticated by signature instead. An unsigned or stale request
        /// is refused before the body is looked at.
        /// </summary>
        [HttpPost("webhook/stripe")]
        [AllowAnonymous]
        public async Task<IActionResult> StripeWebhook(CancellationToken ct)
        {
            using var reader = new StreamReader(Request.Body);
            var payload = await reader.ReadToEndAsync(ct);

            var signature = Request.Headers["Stripe-Signature"].FirstOrDefault();
            if (!StripeWebhookVerifier.TryVerify(payload, signature, _settings.Stripe.WebhookSecret, out var failure))
            {
                _logger.LogWarning("Rejected Stripe webhook: {Failure}", failure);
                return Unauthorized(new { message = "Invalid signature." });
            }

            JsonElement root;
            try
            {
                using var doc = JsonDocument.Parse(payload);
                root = doc.RootElement.Clone();
            }
            catch (JsonException)
            {
                return BadRequest(new { message = "Malformed payload." });
            }

            var eventId = root.TryGetProperty("id", out var idEl) ? idEl.GetString() : null;
            var eventType = root.TryGetProperty("type", out var typeEl) ? typeEl.GetString() : null;

            if (string.IsNullOrWhiteSpace(eventId) || string.IsNullOrWhiteSpace(eventType))
                return BadRequest(new { message = "Missing event id or type." });

            if (!root.TryGetProperty("data", out var data) ||
                !data.TryGetProperty("object", out var obj))
                return Ok(new { received = true, applied = false });

            var transaction = await ResolveTransactionAsync(obj, ct);
            if (transaction == null)
            {
                // Not ours, or already garbage-collected. Acknowledged so Stripe stops
                // resending; nothing to do.
                return Ok(new { received = true, applied = false, reason = "no matching transaction" });
            }

            var state = eventType switch
            {
                "checkout.session.completed" => ProviderPaymentState.Succeeded,
                "checkout.session.async_payment_succeeded" => ProviderPaymentState.Succeeded,
                "payment_intent.succeeded" => ProviderPaymentState.Succeeded,
                "checkout.session.async_payment_failed" => ProviderPaymentState.Failed,
                "payment_intent.payment_failed" => ProviderPaymentState.Failed,
                "checkout.session.expired" => ProviderPaymentState.Cancelled,
                _ => (ProviderPaymentState?)null,
            };

            if (state == null)
                return Ok(new { received = true, applied = false, reason = "event type not handled" });

            // A completed session that has not actually been paid yet is still clearing.
            if (state == ProviderPaymentState.Succeeded &&
                obj.TryGetProperty("payment_status", out var ps) &&
                ps.GetString() is string s && s != "paid" && s != "no_payment_required")
            {
                state = ProviderPaymentState.Processing;
            }

            var paymentId = obj.TryGetProperty("payment_intent", out var pi) && pi.ValueKind == JsonValueKind.String
                ? pi.GetString()
                : obj.TryGetProperty("id", out var oid) ? oid.GetString() : null;

            string? failureCode = null, failureMessage = null;
            if (obj.TryGetProperty("last_payment_error", out var err) && err.ValueKind == JsonValueKind.Object)
            {
                failureCode = err.TryGetProperty("code", out var c) ? c.GetString() : null;
                failureMessage = err.TryGetProperty("message", out var m) ? m.GetString() : null;
            }

            var applied = await _payments.ApplyProviderResultAsync(
                transaction,
                new ProviderPaymentResult(state.Value, paymentId, failureCode, failureMessage, eventType),
                eventId,
                "webhook",
                payload,
                ct);

            // Always 200. A non-2xx makes Stripe redeliver, and a duplicate delivery of
            // an event that has already been applied is not an error worth retrying.
            return Ok(new { received = true, applied });
        }

        /// <summary>Finds the Vestora transaction a Stripe object belongs to, by metadata then by session id.</summary>
        private async Task<PaymentTransaction?> ResolveTransactionAsync(JsonElement obj, CancellationToken ct)
        {
            if (obj.TryGetProperty("metadata", out var meta) &&
                meta.ValueKind == JsonValueKind.Object &&
                meta.TryGetProperty("vestora_transaction_id", out var tid) &&
                int.TryParse(tid.GetString(), out var transactionId))
            {
                var byId = await _db.PaymentTransactions
                    .Include(t => t.FundingRequest).ThenInclude(f => f.Investment).ThenInclude(i => i.Project)
                    .FirstOrDefaultAsync(t => t.Id == transactionId, ct);
                if (byId != null) return byId;
            }

            if (obj.TryGetProperty("id", out var idEl) && idEl.GetString() is string providerId)
            {
                // The id is a checkout session on checkout.session.* events and a
                // PaymentIntent on payment_intent.* events, so both columns are tried.
                return await _db.PaymentTransactions
                    .Include(t => t.FundingRequest).ThenInclude(f => f.Investment).ThenInclude(i => i.Project)
                    .FirstOrDefaultAsync(
                        t => t.ProviderSessionId == providerId || t.ProviderPaymentId == providerId, ct);
            }

            return null;
        }
    }
}
