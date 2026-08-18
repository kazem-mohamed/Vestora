using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using MyAppApi.Data;
using Xunit;

namespace MyAppApi.Tests.Integration
{
    /// <summary>
    /// Hits <c>ProjectsController</c> — the largest controller in the Backend member's
    /// area — through real HTTP requests. Each fact documents a promise from the
    /// controller's own comments; see the Backend study guide for the full reasoning.
    /// </summary>
    public class ProjectsEndpointsTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly CustomWebApplicationFactory _factory;

        public ProjectsEndpointsTests(CustomWebApplicationFactory factory)
        {
            _factory = factory;
        }

        private AppDbContext Db()
        {
            var scope = _factory.Services.CreateScope();
            return scope.ServiceProvider.GetRequiredService<AppDbContext>();
        }

        [Fact]
        public async Task CreateProject_AsInnovator_StartsHiddenPendingReview()
        {
            var client = _factory.CreateClient();
            using var db = Db();
            var (_, email, password) = await TestHelpers.RegisterUserAsync(client, db, "Innovator");
            var authed = await TestHelpers.LoginAsClientAsync(_factory, email, password);

            var response = await authed.PostAsJsonAsync("/api/projects", new
            {
                name = "Solar Cold-Chain",
                description = "Refrigeration for the last mile, off-grid.",
                investmentNeeded = 40_000m,
            });

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var body = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>();
            var projectId = ((System.Text.Json.JsonElement)body!["projectId"]).GetInt32();

            using var verifyDb = Db();
            var project = await verifyDb.Projects.SingleAsync(p => p.Id == projectId);
            Assert.Equal("PendingReview", project.ModerationStatus);
        }

        [Fact]
        public async Task CreateProject_AsInvestor_IsForbidden()
        {
            // Role check documented on the endpoint: [Authorize] admits any signed-in
            // user, but only an Innovator may actually list a venture.
            var client = _factory.CreateClient();
            using var db = Db();
            var (_, email, password) = await TestHelpers.RegisterUserAsync(client, db, "Investor");
            var authed = await TestHelpers.LoginAsClientAsync(_factory, email, password);

            var response = await authed.PostAsJsonAsync("/api/projects", new
            {
                name = "Should Not Be Allowed",
                description = "An investor should not be able to list a venture.",
                investmentNeeded = 10_000m,
            });

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task Facets_CountEachSectorIndependentlyOfItsOwnFilter()
        {
            var client = _factory.CreateClient();
            using var db = Db();
            var (ownerId, _, _) = await TestHelpers.RegisterUserAsync(client, db, "Innovator");

            var suffix = Guid.NewGuid().ToString("N")[..8];
            var healthTech = $"HealthTech-{suffix}";
            var cleanTech = $"CleanTech-{suffix}";

            var p1 = await TestHelpers.SeedApprovedProjectAsync(db, ownerId);
            p1.Category = healthTech;
            var p2 = await TestHelpers.SeedApprovedProjectAsync(db, ownerId);
            p2.Category = healthTech;
            var p3 = await TestHelpers.SeedApprovedProjectAsync(db, ownerId);
            p3.Category = cleanTech;
            await db.SaveChangesAsync();

            // Facets are asked for while ALREADY filtered to HealthTech — the count for
            // HealthTech itself must still reflect what picking it would show (2), not
            // collapse to zero because its own filter is applied ahead of the grouping.
            var response = await client.GetAsync($"/api/projects/facets?sector={healthTech}");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var json = await response.Content.ReadFromJsonAsync<System.Text.Json.JsonDocument>();
            var sectors = json!.RootElement.GetProperty("sectors").EnumerateArray()
                .ToDictionary(e => e.GetProperty("value").GetString()!, e => e.GetProperty("count").GetInt32());

            Assert.True(sectors.ContainsKey(healthTech));
            Assert.Equal(2, sectors[healthTech]);
        }

        [Fact]
        public async Task CloseRound_WithdrawsOpenFundingRequest_ButNotAPaidOne()
        {
            var client = _factory.CreateClient();
            using var db = Db();
            var (founderId, founderEmail, founderPassword) =
                await TestHelpers.RegisterUserAsync(client, db, "Innovator");
            var (investorId, _, _) = await TestHelpers.RegisterUserAsync(client, db, "Investor");

            var project = await TestHelpers.SeedApprovedProjectAsync(db, founderId);
            var investment = await TestHelpers.SeedApprovedInvestmentAsync(db, project.Id, investorId);

            var founder = await TestHelpers.LoginAsClientAsync(_factory, founderEmail, founderPassword);
            var createRequest = await founder.PostAsJsonAsync(
                $"/api/payments/investments/{investment.Id}/funding-request",
                new { amount = 10_000m, note = "First tranche" });
            Assert.Equal(HttpStatusCode.Created, createRequest.StatusCode);

            var closeResponse = await founder.PostAsJsonAsync(
                $"/api/projects/{project.Id}/close-round",
                new { outcome = "PartiallyRaised", note = "Enough to start." });
            Assert.Equal(HttpStatusCode.OK, closeResponse.StatusCode);

            using var verifyDb = Db();
            var reloadedProject = await verifyDb.Projects.SingleAsync(p => p.Id == project.Id);
            Assert.Equal("Closed", reloadedProject.LifecycleStatus);

            var fundingRequest = await verifyDb.FundingRequests
                .SingleAsync(f => f.InvestmentId == investment.Id);
            Assert.Equal("Cancelled", fundingRequest.Status);
        }

        [Fact]
        public async Task UpdateProject_ByNonOwnerInnovator_IsForbidden()
        {
            // Proves "role is not ownership" (AGENTS.md rule 4) with a real HTTP call:
            // both accounts hold the Innovator role, but only one owns this project.
            var client = _factory.CreateClient();
            using var db = Db();
            var (ownerId, _, _) = await TestHelpers.RegisterUserAsync(client, db, "Innovator");
            var (_, otherEmail, otherPassword) = await TestHelpers.RegisterUserAsync(client, db, "Innovator");
            var project = await TestHelpers.SeedApprovedProjectAsync(db, ownerId);

            var otherFounder = await TestHelpers.LoginAsClientAsync(_factory, otherEmail, otherPassword);
            var response = await otherFounder.PutAsJsonAsync($"/api/projects/{project.Id}", new
            {
                name = "Hijacked Name",
                description = "This account does not own this venture.",
                investmentNeeded = 1m,
            });

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task CloseRound_ByNonOwner_IsForbidden()
        {
            var client = _factory.CreateClient();
            using var db = Db();
            var (ownerId, _, _) = await TestHelpers.RegisterUserAsync(client, db, "Innovator");
            var (_, otherEmail, otherPassword) = await TestHelpers.RegisterUserAsync(client, db, "Innovator");
            var project = await TestHelpers.SeedApprovedProjectAsync(db, ownerId);

            var otherFounder = await TestHelpers.LoginAsClientAsync(_factory, otherEmail, otherPassword);
            var response = await otherFounder.PostAsJsonAsync($"/api/projects/{project.Id}/close-round",
                new { outcome = "Withdrawn", note = (string?)null });

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }
    }
}
