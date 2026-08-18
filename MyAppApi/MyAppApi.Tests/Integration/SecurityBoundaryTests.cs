using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using MyAppApi.Data;
using Xunit;

namespace MyAppApi.Tests.Integration
{
    /// <summary>
    /// Deliberate attempts to cross a boundary the app claims to enforce — role checks,
    /// ownership checks, and token validity — each one written from the attacker's side
    /// of the request rather than the happy path. Findings are written up in
    /// <c>SECURITY-FINDINGS.md</c> alongside this file.
    /// <para>
    /// Ownership-vs-role and login-enumeration cases already live where the feature they
    /// belong to is tested (<c>ProjectsEndpointsTests</c>,
    /// <c>AuthEndpointsTests.Login_UnknownEmailAndWrongPassword_ReturnIdenticalMessages</c>).
    /// This file covers the boundaries that don't have a natural home in a feature suite:
    /// admin-only surfaces, unauthenticated access, tampered tokens, and access to another
    /// party's private financial data.
    /// </para>
    /// </summary>
    public class SecurityBoundaryTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly CustomWebApplicationFactory _factory;

        public SecurityBoundaryTests(CustomWebApplicationFactory factory)
        {
            _factory = factory;
        }

        private AppDbContext Db()
        {
            var scope = _factory.Services.CreateScope();
            return scope.ServiceProvider.GetRequiredService<AppDbContext>();
        }

        [Fact]
        public async Task AdminOnlyEndpoint_RejectsAnAuthenticatedNonAdmin()
        {
            var client = _factory.CreateClient();
            using var db = Db();
            var (_, email, password) = await TestHelpers.RegisterUserAsync(client, db, "Investor");
            var investor = await TestHelpers.LoginAsClientAsync(_factory, email, password);

            var response = await investor.GetAsync("/api/feed");

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task AdminOnlyEndpoint_AcceptsARealAdmin()
        {
            // The negative case above only means something if the same endpoint genuinely
            // opens for the role it claims to allow.
            using var db = Db();
            var (_, email, password) = await TestHelpers.SeedAdminAsync(db);
            var admin = await TestHelpers.LoginAsClientAsync(_factory, email, password);

            var response = await admin.GetAsync("/api/feed");

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        [Fact]
        public async Task ProtectedEndpoint_WithNoToken_Returns401()
        {
            var client = _factory.CreateClient();

            var response = await client.GetAsync("/api/users/me");

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task ProtectedEndpoint_WithTamperedToken_Returns401()
        {
            var client = _factory.CreateClient();
            using var db = Db();
            var (_, email, password) = await TestHelpers.RegisterUserAsync(client, db, "Investor");
            var loginResponse = await client.PostAsJsonAsync("/api/auth/login", new { email, password });
            var login = await loginResponse.ReadAsAsync<TestHelpers.LoginResponse>();

            // Corrupt a character in the middle of the signature segment of a real,
            // validly-signed token. (The very last character alone is not safe to flip —
            // base64url padding bits mean it can decode to the same byte and leave the
            // signature valid; the earlier bytes of the segment don't have that problem.)
            var realToken = login!.AccessToken;
            var signatureStart = realToken.LastIndexOf('.') + 1;
            var midSignature = signatureStart + (realToken.Length - signatureStart) / 2;
            var corruptedChar = realToken[midSignature] == 'a' ? 'b' : 'a';
            var tampered = realToken[..midSignature] + corruptedChar + realToken[(midSignature + 1)..];

            var tamperedClient = _factory.CreateClient();
            tamperedClient.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", tampered);

            var response = await tamperedClient.GetAsync("/api/users/me");

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task InvestorOnlyEndpoint_RejectsAnInnovator()
        {
            // The symmetric case to the Innovator-only checks proven in
            // ProjectsEndpointsTests and PaymentsEndpointsTests: a role restriction has to
            // hold in both directions, not just the one a feature's happy path exercises.
            var client = _factory.CreateClient();
            using var db = Db();
            var (founderId, founderEmail, founderPassword) =
                await TestHelpers.RegisterUserAsync(client, db, "Innovator");
            var (investorId, _, _) = await TestHelpers.RegisterUserAsync(client, db, "Investor");

            var project = await TestHelpers.SeedApprovedProjectAsync(db, founderId);
            await TestHelpers.SeedApprovedInvestmentAsync(db, project.Id, investorId);

            var founder = await TestHelpers.LoginAsClientAsync(_factory, founderEmail, founderPassword);

            // Writing a review is reserved for the Investor who actually backed the
            // venture — the founder must not be able to review their own listing.
            var response = await founder.PostAsJsonAsync($"/api/projects/{project.Id}/reviews", new
            {
                traits = new[] { "Responsive" },
                comment = "Reviewing my own venture.",
            });

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task PaymentTransaction_IsInvisibleToAnUninvolvedThirdParty()
        {
            var client = _factory.CreateClient();
            using var db = Db();
            var (founderId, founderEmail, founderPassword) =
                await TestHelpers.RegisterUserAsync(client, db, "Innovator");
            var (investorId, investorEmail, investorPassword) =
                await TestHelpers.RegisterUserAsync(client, db, "Investor");
            var (_, bystanderEmail, bystanderPassword) =
                await TestHelpers.RegisterUserAsync(client, db, "Investor");

            var project = await TestHelpers.SeedApprovedProjectAsync(db, founderId);
            var investment = await TestHelpers.SeedApprovedInvestmentAsync(db, project.Id, investorId);

            var founder = await TestHelpers.LoginAsClientAsync(_factory, founderEmail, founderPassword);
            var createRequest = await founder.PostAsJsonAsync(
                $"/api/payments/investments/{investment.Id}/funding-request",
                new { amount = 3_000m, note = (string?)null });
            var fundingRequest = await createRequest.ReadAsAsync<System.Text.Json.JsonDocument>();
            var fundingRequestId = fundingRequest!.RootElement.GetProperty("id").GetInt32();

            var investorClient = await TestHelpers.LoginAsClientAsync(_factory, investorEmail, investorPassword);
            var checkoutResponse = await investorClient.PostAsync(
                $"/api/payments/funding-requests/{fundingRequestId}/checkout", null);
            var checkout = await checkoutResponse.ReadAsAsync<System.Text.Json.JsonDocument>();
            var transactionId = checkout!.RootElement.GetProperty("transactionId").GetInt32();

            var bystander = await TestHelpers.LoginAsClientAsync(_factory, bystanderEmail, bystanderPassword);
            var response = await bystander.GetAsync($"/api/payments/transactions/{transactionId}");

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task InvestorDirectory_HidesInvestorsWhoDidNotOptIn()
        {
            // The directory (CapitalController, /api/capital) is a founder-facing
            // surface — a signed-in Innovator is the caller who can actually reach it.
            var client = _factory.CreateClient();
            using var db = Db();
            var (optedInId, _, _) = await TestHelpers.RegisterUserAsync(client, db, "Investor", "opted-in");
            var (optedOutId, _, _) = await TestHelpers.RegisterUserAsync(client, db, "Investor", "opted-out");
            var (_, founderEmail, founderPassword) =
                await TestHelpers.RegisterUserAsync(client, db, "Innovator");

            var optedIn = await db.Investors.SingleAsync(i => i.Id == optedInId);
            var optedOut = await db.Investors.SingleAsync(i => i.Id == optedOutId);
            optedIn.ListedInDirectory = true;
            optedOut.ListedInDirectory = false;
            await db.SaveChangesAsync();

            var founder = await TestHelpers.LoginAsClientAsync(_factory, founderEmail, founderPassword);
            var response = await founder.GetAsync("/api/capital?pageSize=48");

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var body = await response.Content.ReadAsStringAsync();
            Assert.DoesNotContain($"\"id\":{optedOutId}", body.Replace(" ", ""));
        }
    }
}
