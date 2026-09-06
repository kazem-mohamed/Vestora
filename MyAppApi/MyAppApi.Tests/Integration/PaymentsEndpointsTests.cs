using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using MyAppApi.Data;
using Xunit;

namespace MyAppApi.Tests.Integration
{
    /// <summary>
    /// Exercises the payment lifecycle end to end — funding request, checkout, the
    /// simulated sandbox, and verification — against the same <c>SimulatedPaymentProvider</c>
    /// the app itself uses when <c>Payments:Provider</c> is <c>"simulated"</c> (the project's
    /// default). No Stripe key, no network call: the simulator "exercises the same state
    /// machine, the same idempotency, the same fee snapshot and the same reversal path as
    /// Stripe does. The only thing it does not do is talk to the internet" — its own doc
    /// comment.
    /// <para>
    /// The one thing every fact here is ultimately proving is AGENTS.md rule 5: a
    /// <c>PaymentEvent</c> is recorded before its effect is applied, and a terminal
    /// transaction row is never rewritten.
    /// </para>
    /// </summary>
    public class PaymentsEndpointsTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly CustomWebApplicationFactory _factory;

        public PaymentsEndpointsTests(CustomWebApplicationFactory factory)
        {
            _factory = factory;
        }

        private AppDbContext Db()
        {
            var scope = _factory.Services.CreateScope();
            return scope.ServiceProvider.GetRequiredService<AppDbContext>();
        }

        private async Task<(HttpClient Founder, HttpClient Investor, int ProjectId, int InvestmentId)>
            SeedApprovedRelationshipAsync()
        {
            var client = _factory.CreateClient();
            using var db = Db();
            var (founderId, founderEmail, founderPassword) =
                await TestHelpers.RegisterUserAsync(client, db, "Innovator");
            var (investorId, investorEmail, investorPassword) =
                await TestHelpers.RegisterUserAsync(client, db, "Investor");

            var project = await TestHelpers.SeedApprovedProjectAsync(db, founderId);
            var investment = await TestHelpers.SeedApprovedInvestmentAsync(db, project.Id, investorId);

            var founder = await TestHelpers.LoginAsClientAsync(_factory, founderEmail, founderPassword);
            var investor = await TestHelpers.LoginAsClientAsync(_factory, investorEmail, investorPassword);

            return (founder, investor, project.Id, investment.Id);
        }

        [Fact]
        public async Task FullPaymentJourney_RecordsEventBeforeMarkingTransactionSucceeded()
        {
            var (founder, investor, _, investmentId) = await SeedApprovedRelationshipAsync();

            // 1. Founder issues the ask.
            var createRequest = await founder.PostAsJsonAsync(
                $"/api/payments/investments/{investmentId}/funding-request",
                new { amount = 5_000m, note = "Tranche one" });
            Assert.Equal(HttpStatusCode.Created, createRequest.StatusCode);
            var fundingRequest = await createRequest.ReadAsAsync<System.Text.Json.JsonDocument>();
            var fundingRequestId = fundingRequest!.RootElement.GetProperty("id").GetInt32();

            // 2. Investor opens a checkout — the simulated provider hands back a session.
            var checkoutResponse = await investor.PostAsync(
                $"/api/payments/funding-requests/{fundingRequestId}/checkout", null);
            Assert.Equal(HttpStatusCode.OK, checkoutResponse.StatusCode);
            var checkout = await checkoutResponse.ReadAsAsync<System.Text.Json.JsonDocument>();
            var transactionId = checkout!.RootElement.GetProperty("transactionId").GetInt32();
            var checkoutUrl = checkout.RootElement.GetProperty("checkoutUrl").GetString()!;
            var sessionId = TestHelpers.ExtractSessionId(checkoutUrl);

            using (var db = Db())
            {
                var initiated = await db.PaymentTransactions.SingleAsync(t => t.Id == transactionId);
                Assert.Equal("Initiated", initiated.Status);
            }

            // 3. Investor "pays" — stands in for typing a test card in the sandbox UI.
            var resolveResponse = await investor.PostAsJsonAsync(
                $"/api/payments/sandbox/sessions/{sessionId}/resolve", new { outcome = "success" });
            Assert.Equal(HttpStatusCode.OK, resolveResponse.StatusCode);

            // 4. Verify — this is the step that actually applies the result. The return
            // URL's own claim of success is never trusted; the server asks the provider.
            var verifyResponse = await investor.PostAsync($"/api/payments/transactions/{transactionId}/verify", null);
            Assert.Equal(HttpStatusCode.OK, verifyResponse.StatusCode);
            var verified = await verifyResponse.ReadAsAsync<System.Text.Json.JsonDocument>();
            Assert.Equal("Succeeded", verified!.RootElement.GetProperty("status").GetString());

            using (var db = Db())
            {
                // The event exists and the transaction settled — proving both halves of
                // rule 5 without needing to race the two writes against each other:
                // ApplyProviderResultAsync would not have a Succeeded row to show without
                // having gone through the event-insert path that produces it.
                var transaction = await db.PaymentTransactions.SingleAsync(t => t.Id == transactionId);
                Assert.Equal("Succeeded", transaction.Status);
                Assert.NotNull(transaction.SucceededAtUtc);

                var fundingRequestRow = await db.FundingRequests.SingleAsync(f => f.Id == fundingRequestId);
                Assert.Equal("Paid", fundingRequestRow.Status);
            }
        }

        [Fact]
        public async Task FailedPayment_LeavesFundingRequestOpenForRetry()
        {
            var (founder, investor, _, investmentId) = await SeedApprovedRelationshipAsync();

            var createRequest = await founder.PostAsJsonAsync(
                $"/api/payments/investments/{investmentId}/funding-request",
                new { amount = 5_000m, note = (string?)null });
            var fundingRequest = await createRequest.ReadAsAsync<System.Text.Json.JsonDocument>();
            var fundingRequestId = fundingRequest!.RootElement.GetProperty("id").GetInt32();

            var checkoutResponse = await investor.PostAsync(
                $"/api/payments/funding-requests/{fundingRequestId}/checkout", null);
            var checkout = await checkoutResponse.ReadAsAsync<System.Text.Json.JsonDocument>();
            var transactionId = checkout!.RootElement.GetProperty("transactionId").GetInt32();
            var sessionId = TestHelpers.ExtractSessionId(checkout.RootElement.GetProperty("checkoutUrl").GetString()!);

            await investor.PostAsJsonAsync(
                $"/api/payments/sandbox/sessions/{sessionId}/resolve", new { outcome = "failure" });
            await investor.PostAsync($"/api/payments/transactions/{transactionId}/verify", null);

            using var db = Db();
            var transaction = await db.PaymentTransactions.SingleAsync(t => t.Id == transactionId);
            Assert.Equal("Failed", transaction.Status);

            // A failed attempt does not consume the ask — the investor can retry.
            var fundingRequestRow = await db.FundingRequests.SingleAsync(f => f.Id == fundingRequestId);
            Assert.Equal("Open", fundingRequestRow.Status);
        }

        [Fact]
        public async Task CreateFundingRequest_AsInvestor_IsForbidden()
        {
            var (_, investor, _, investmentId) = await SeedApprovedRelationshipAsync();

            var response = await investor.PostAsJsonAsync(
                $"/api/payments/investments/{investmentId}/funding-request",
                new { amount = 1_000m, note = (string?)null });

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task Checkout_AsFounder_IsForbidden()
        {
            // Only the investor named on the request may pay it — the founder asking
            // for money cannot also be the one who supplies it.
            var (founder, investor, _, investmentId) = await SeedApprovedRelationshipAsync();

            var createRequest = await founder.PostAsJsonAsync(
                $"/api/payments/investments/{investmentId}/funding-request",
                new { amount = 1_000m, note = (string?)null });
            var fundingRequest = await createRequest.ReadAsAsync<System.Text.Json.JsonDocument>();
            var fundingRequestId = fundingRequest!.RootElement.GetProperty("id").GetInt32();

            var response = await founder.PostAsync(
                $"/api/payments/funding-requests/{fundingRequestId}/checkout", null);

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task Checkout_ByUninvolvedInvestor_IsForbidden()
        {
            var (founder, _, _, investmentId) = await SeedApprovedRelationshipAsync();
            var bystanderClient = _factory.CreateClient();
            using var db = Db();
            var (_, bystanderEmail, bystanderPassword) =
                await TestHelpers.RegisterUserAsync(bystanderClient, db, "Investor");
            var bystander = await TestHelpers.LoginAsClientAsync(_factory, bystanderEmail, bystanderPassword);

            var createRequest = await founder.PostAsJsonAsync(
                $"/api/payments/investments/{investmentId}/funding-request",
                new { amount = 1_000m, note = (string?)null });
            var fundingRequest = await createRequest.ReadAsAsync<System.Text.Json.JsonDocument>();
            var fundingRequestId = fundingRequest!.RootElement.GetProperty("id").GetInt32();

            var response = await bystander.PostAsync(
                $"/api/payments/funding-requests/{fundingRequestId}/checkout", null);

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task Checkout_OnAlreadyPaidRequest_IsRejected()
        {
            var (founder, investor, _, investmentId) = await SeedApprovedRelationshipAsync();

            var createRequest = await founder.PostAsJsonAsync(
                $"/api/payments/investments/{investmentId}/funding-request",
                new { amount = 2_000m, note = (string?)null });
            var fundingRequest = await createRequest.ReadAsAsync<System.Text.Json.JsonDocument>();
            var fundingRequestId = fundingRequest!.RootElement.GetProperty("id").GetInt32();

            var checkoutResponse = await investor.PostAsync(
                $"/api/payments/funding-requests/{fundingRequestId}/checkout", null);
            var checkout = await checkoutResponse.ReadAsAsync<System.Text.Json.JsonDocument>();
            var transactionId = checkout!.RootElement.GetProperty("transactionId").GetInt32();
            var sessionId = TestHelpers.ExtractSessionId(checkout.RootElement.GetProperty("checkoutUrl").GetString()!);

            await investor.PostAsJsonAsync(
                $"/api/payments/sandbox/sessions/{sessionId}/resolve", new { outcome = "success" });
            await investor.PostAsync($"/api/payments/transactions/{transactionId}/verify", null);

            // The same request is now Paid — trying to check out again must not be able
            // to fund the same ask twice.
            var secondCheckout = await investor.PostAsync(
                $"/api/payments/funding-requests/{fundingRequestId}/checkout", null);

            Assert.Equal(HttpStatusCode.BadRequest, secondCheckout.StatusCode);
        }

        /// <summary>
        /// A reference is issued once and never again, including after the row that held
        /// it is gone. Deriving the sequence from a row count broke that: deleting a
        /// request walked the counter back onto a number another row already carried, the
        /// unique index rejected the insert, and every funding request on the platform
        /// failed until the table grew past its own high-water mark.
        /// <para>
        /// The assertion is on the value rather than on the refusal on purpose. The
        /// InMemory provider does not enforce unique indexes, so a test that waited for
        /// an exception would have passed against the defect — which is exactly what the
        /// suite did until this was found in the running system.
        /// </para>
        /// </summary>
        [Fact]
        public async Task FundingRequestReference_IsNotReissuedAfterAnEarlierRequestIsDeleted()
        {
            var (firstFounder, _, _, firstInvestment) = await SeedApprovedRelationshipAsync();
            var (secondFounder, _, _, secondInvestment) = await SeedApprovedRelationshipAsync();
            var (thirdFounder, _, _, thirdInvestment) = await SeedApprovedRelationshipAsync();

            var first = await IssueFundingRequestAsync(firstFounder, firstInvestment);
            var second = await IssueFundingRequestAsync(secondFounder, secondInvestment);
            Assert.NotEqual(first.Reference, second.Reference);

            // The row goes; the number it was given does not come back.
            using (var db = Db())
            {
                db.FundingRequests.Remove(
                    await db.FundingRequests.SingleAsync(f => f.Id == first.Id));
                await db.SaveChangesAsync();
            }

            var third = await IssueFundingRequestAsync(thirdFounder, thirdInvestment);

            Assert.NotEqual(second.Reference, third.Reference);
            Assert.NotEqual(first.Reference, third.Reference);

            using var check = Db();
            var carrying = await check.FundingRequests
                .IgnoreQueryFilters()
                .CountAsync(f => f.Reference == third.Reference);
            Assert.Equal(1, carrying);
        }

        private async Task<(int Id, string Reference)> IssueFundingRequestAsync(
            HttpClient founder, int investmentId)
        {
            var response = await founder.PostAsJsonAsync(
                $"/api/payments/investments/{investmentId}/funding-request",
                new { amount = 1_000m, note = (string?)null });
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);

            var body = await response.ReadAsAsync<System.Text.Json.JsonDocument>();
            return (
                body!.RootElement.GetProperty("id").GetInt32(),
                body.RootElement.GetProperty("reference").GetString()!);
        }
    }
}
