using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using MyAppApi.Data;
using MyAppApi.Data.Models;

namespace MyAppApi.Tests.Integration
{
    /// <summary>
    /// Shared setup for integration tests: registering real accounts through the real
    /// endpoints, seeding relationship data directly through the DbContext when going
    /// through five endpoints just to get one precondition would make every test about
    /// the setup instead of the thing being tested, and reading typed JSON back out of
    /// <see cref="HttpResponseMessage"/>.
    /// </summary>
    public static class TestHelpers
    {
        private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

        public static async Task<T?> ReadAsAsync<T>(this HttpResponseMessage response)
        {
            var stream = await response.Content.ReadAsStreamAsync();
            return await JsonSerializer.DeserializeAsync<T>(stream, JsonOptions);
        }

        /// <summary>
        /// <c>RegisterDto</c> carries an optional <c>IFormFile ProfileImage</c>, which makes
        /// ASP.NET Core infer <c>[FromForm]</c> for the whole complex parameter rather than
        /// <c>[FromBody]</c> JSON — the controller action is declared
        /// <c>Register([FromForm] RegisterDto dto)</c>. Sending JSON at it (as every other
        /// endpoint in this project expects) leaves every field looking unset to the model
        /// binder. This builds the multipart form the endpoint actually requires.
        /// </summary>
        public static MultipartFormDataContent BuildRegisterForm(
            string firstName, string lastName, string email, string password,
            string userType, string birthDate, string phone)
        {
            return new MultipartFormDataContent
            {
                { new StringContent(firstName), "FirstName" },
                { new StringContent(lastName), "LastName" },
                { new StringContent(email), "Email" },
                { new StringContent(password), "Password" },
                { new StringContent(password), "ConfirmPassword" },
                { new StringContent(userType), "UserType" },
                { new StringContent(birthDate), "BirthDate" },
                { new StringContent(phone), "Phone" },
            };
        }

        /// <summary>Registers a fresh account through the real endpoint and verifies its
        /// email directly in the database — verification-code delivery is a mail concern,
        /// not something these tests need to exercise per account.</summary>
        public static async Task<(int UserId, string Email, string Password)> RegisterUserAsync(
            HttpClient client, AppDbContext db, string userType, string? emailPrefix = null)
        {
            var email = $"{emailPrefix ?? userType.ToLowerInvariant()}.{Guid.NewGuid():N}@vestora.test";
            const string password = "TestPass123!";

            using var form = BuildRegisterForm(
                "Test", userType, email, password, userType, "2000-01-01", "+201234567890");
            var response = await client.PostAsync("/api/auth/register", form);
            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                throw new InvalidOperationException($"Register failed ({response.StatusCode}): {body}");
            }

            var user = await db.Users.SingleAsync(u => u.Email == email.ToLowerInvariant());
            user.IsEmailVerified = true;
            await db.SaveChangesAsync();

            return (user.Id, email, password);
        }

        /// <summary>Logs in through the real endpoint and returns an authenticated client —
        /// exercises the real password check and the real token issuance for every test
        /// that needs an authorized caller, instead of a hand-built token.</summary>
        public static async Task<HttpClient> LoginAsClientAsync(
            CustomWebApplicationFactory factory, string email, string password)
        {
            using var anonymous = factory.CreateClient();
            var response = await anonymous.PostAsJsonAsync("/api/auth/login", new { email, password });
            response.EnsureSuccessStatusCode();
            var login = await response.ReadAsAsync<LoginResponse>();

            var client = factory.CreateClient();
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", login!.AccessToken);
            return client;
        }

        /// <summary>Directly seeds an Admin account — there is no public registration path
        /// for the Admin role by design (AuthService only ever creates Investor or
        /// Innovator), so admin-only tests create the row the same way the platform's
        /// first admin has to be created.
        /// <para>
        /// Constructed as <c>Admin</c>, not <c>User</c> with <c>UserType</c> set by hand.
        /// TPH decides which CLR type to materialise a row as from the discriminator
        /// column at read time, regardless of what it was inserted as — so a row saved as
        /// the base type but discriminated "Admin" gets read back shaped like an
        /// <c>Admin</c> anyway. EF Core's InMemory provider does not tolerate that mismatch
        /// once a subtype carries a property the base type does not: the row's stored
        /// width no longer matches what the materialiser for that subtype expects, and the
        /// shared InMemory table poisons every later query in the test class, not just
        /// this one. Building the CLR type EF actually expects is the fix, not a workaround.
        /// </para>
        /// </summary>
        public static async Task<(int UserId, string Email, string Password)> SeedAdminAsync(AppDbContext db)
        {
            var email = $"admin.{Guid.NewGuid():N}@vestora.test";
            const string password = "TestPass123!";

            var admin = new Admin
            {
                UserType = "Admin",
                UserName = "Test Admin",
                Email = email,
                Password = BCrypt.Net.BCrypt.HashPassword(password),
                Phone = "+201234567890",
                BirthDate = new DateTime(1990, 1, 1),
                UniqueNumber = Guid.NewGuid().ToString("N")[..10],
                CreatedAtUtc = DateTime.UtcNow,
                IsEmailVerified = true,
            };
            db.Users.Add(admin);
            await db.SaveChangesAsync();

            return (admin.Id, email, password);
        }

        /// <summary>Seeds a project directly, already moderation-approved and active — the
        /// moderation queue itself belongs to the Leader's admin surface, so payment and
        /// ownership tests treat "already approved" as a given precondition rather than
        /// re-proving it.</summary>
        public static async Task<Project> SeedApprovedProjectAsync(AppDbContext db, int ownerId, decimal needed = 50_000m)
        {
            var project = new Project
            {
                Name = $"Test Venture {Guid.NewGuid():N}"[..30],
                Description = "Seeded for an integration test.",
                InvestmentNeeded = needed,
                CreatedDate = DateTime.UtcNow,
                OwnerId = ownerId,
                ModerationStatus = "Approved",
                LifecycleStatus = "Active",
            };
            db.Projects.Add(project);
            await db.SaveChangesAsync();
            return project;
        }

        /// <summary>Seeds an Approved investment relationship — the point where a founder
        /// has accepted a backer, which is the precondition every funding-request test
        /// starts from.</summary>
        public static async Task<Investment> SeedApprovedInvestmentAsync(
            AppDbContext db, int projectId, int investorId, decimal amount = 10_000m)
        {
            var investment = new Investment
            {
                ProjectId = projectId,
                InvestorId = investorId,
                Amount = amount,
                Date = DateTime.UtcNow,
                Status = "Approved",
                Stage = "Approved",
                StageUpdatedAt = DateTime.UtcNow,
            };
            db.Investments.Add(investment);
            await db.SaveChangesAsync();
            return investment;
        }

        /// <summary>Pulls the simulated provider's session id out of a sandbox checkout
        /// URL — the same value the frontend reads from the query string to drive the
        /// sandbox checkout page.</summary>
        public static string ExtractSessionId(string checkoutUrl)
        {
            var query = new Uri(checkoutUrl).Query;
            var pairs = Microsoft.AspNetCore.WebUtilities.QueryHelpers.ParseQuery(query);
            if (pairs.TryGetValue("session", out var value))
            {
                return value.ToString();
            }
            throw new InvalidOperationException($"No session id in checkout URL: {checkoutUrl}");
        }

        public record LoginResponse(
            string AccessToken,
            string RefreshToken,
            int UserId,
            string UserType,
            string UserName,
            string UserEmail,
            bool HasOnboarded);
    }
}
