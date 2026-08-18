using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using MyAppApi.Data;
using Xunit;

namespace MyAppApi.Tests.Integration
{
    /// <summary>
    /// Hits <c>AuthController</c> through real HTTP requests against an isolated database.
    /// Each fact documents which promise in <c>Services/AuthService.cs</c> it is proving —
    /// see the Backend study guide for the reasoning behind each one.
    /// </summary>
    public class AuthEndpointsTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly CustomWebApplicationFactory _factory;

        public AuthEndpointsTests(CustomWebApplicationFactory factory)
        {
            _factory = factory;
        }

        private AppDbContext Db()
        {
            var scope = _factory.Services.CreateScope();
            return scope.ServiceProvider.GetRequiredService<AppDbContext>();
        }

        [Fact]
        public async Task Register_WithValidData_CreatesAccountAndReturns201()
        {
            var client = _factory.CreateClient();
            var email = $"newuser.{Guid.NewGuid():N}@vestora.test";

            using var form = TestHelpers.BuildRegisterForm(
                "Ada", "Lovelace", email, "TestPass123!", "Investor", "1998-04-12", "+201112223334");
            var response = await client.PostAsync("/api/auth/register", form);

            Assert.Equal(HttpStatusCode.Created, response.StatusCode);

            using var db = Db();
            var stored = await db.Users.SingleAsync(u => u.Email == email.ToLowerInvariant());
            Assert.NotEqual("TestPass123!", stored.Password); // never stored as plain text
            Assert.False(stored.IsEmailVerified); // unverified until the code is used
        }

        [Fact]
        public async Task Register_WithDuplicateEmail_Returns400()
        {
            var client = _factory.CreateClient();
            using var db = Db();
            var (_, email, _) = await TestHelpers.RegisterUserAsync(client, db, "Investor");

            using var form = TestHelpers.BuildRegisterForm(
                "Second", "Try", email, "TestPass123!", "Investor", "1998-04-12", "+201112223334");
            var response = await client.PostAsync("/api/auth/register", form);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task Register_WithWeakPassword_Returns400WithFieldLevelError()
        {
            var client = _factory.CreateClient();

            using var form = TestHelpers.BuildRegisterForm(
                "Weak", "Password", $"weak.{Guid.NewGuid():N}@vestora.test",
                "12345", "Investor", "1998-04-12", "+201112223334");
            var response = await client.PostAsync("/api/auth/register", form);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            var body = await response.Content.ReadAsStringAsync();
            Assert.Contains("Password", body); // the error is field-level, not a generic message
        }

        [Fact]
        public async Task Login_WithCorrectCredentials_ReturnsTokenPair()
        {
            var client = _factory.CreateClient();
            using var db = Db();
            var (_, email, password) = await TestHelpers.RegisterUserAsync(client, db, "Investor");

            var response = await client.PostAsJsonAsync("/api/auth/login", new { email, password });

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var login = await response.ReadAsAsync<TestHelpers.LoginResponse>();
            Assert.False(string.IsNullOrWhiteSpace(login!.AccessToken));
            Assert.False(string.IsNullOrWhiteSpace(login.RefreshToken));
            Assert.Equal("Investor", login.UserType);
        }

        [Fact]
        public async Task Login_UnknownEmailAndWrongPassword_ReturnIdenticalMessages()
        {
            // Proves the user-enumeration protection documented in the Backend study
            // guide: an attacker must not be able to tell a real email from a fake one
            // by the wording of the failure.
            var client = _factory.CreateClient();
            using var db = Db();
            var (_, realEmail, _) = await TestHelpers.RegisterUserAsync(client, db, "Investor");

            var unknownEmailResponse = await client.PostAsJsonAsync("/api/auth/login",
                new { email = "nobody-registered@vestora.test", password = "WhateverPass1!" });
            var wrongPasswordResponse = await client.PostAsJsonAsync("/api/auth/login",
                new { email = realEmail, password = "WrongPassword1!" });

            Assert.Equal(HttpStatusCode.Unauthorized, unknownEmailResponse.StatusCode);
            Assert.Equal(HttpStatusCode.Unauthorized, wrongPasswordResponse.StatusCode);

            var unknownBody = await unknownEmailResponse.Content.ReadAsStringAsync();
            var wrongBody = await wrongPasswordResponse.Content.ReadAsStringAsync();
            Assert.Equal(unknownBody, wrongBody);
        }

        [Fact]
        public async Task Login_AfterFiveFailedAttempts_LocksTheAccount()
        {
            var client = _factory.CreateClient();
            using var db = Db();
            var (_, email, _) = await TestHelpers.RegisterUserAsync(client, db, "Investor");

            // AuthSecurity:MaxFailedLoginAttempts is 5.
            for (var i = 0; i < 5; i++)
            {
                await client.PostAsJsonAsync("/api/auth/login", new { email, password = "WrongPassword1!" });
            }

            var lockedResponse = await client.PostAsJsonAsync("/api/auth/login",
                new { email, password = "WrongPassword1!" });

            var body = await lockedResponse.Content.ReadAsStringAsync();
            Assert.Equal(HttpStatusCode.Unauthorized, lockedResponse.StatusCode);
            Assert.Contains("locked", body, StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public async Task RefreshToken_Rotates_OldTokenNoLongerWorks()
        {
            var client = _factory.CreateClient();
            using var db = Db();
            var (_, email, password) = await TestHelpers.RegisterUserAsync(client, db, "Investor");
            var loginResponse = await client.PostAsJsonAsync("/api/auth/login", new { email, password });
            var login = await loginResponse.ReadAsAsync<TestHelpers.LoginResponse>();

            var firstRefresh = await client.PostAsJsonAsync("/api/auth/refresh",
                new { refreshToken = login!.RefreshToken });
            Assert.Equal(HttpStatusCode.OK, firstRefresh.StatusCode);
            var rotated = await firstRefresh.ReadAsAsync<TestHelpers.LoginResponse>();
            Assert.NotEqual(login.RefreshToken, rotated!.RefreshToken);

            // Using the original (now-superseded) token again must fail — it has been
            // consumed by the rotation above.
            var reuseAttempt = await client.PostAsJsonAsync("/api/auth/refresh",
                new { refreshToken = login.RefreshToken });
            Assert.Equal(HttpStatusCode.Unauthorized, reuseAttempt.StatusCode);
        }

        [Fact]
        public async Task RefreshToken_ReuseOfRevokedToken_RevokesAllActiveSessions()
        {
            // This is the scenario documented as "the cleverest part" of AuthService:
            // reusing a token that was already rotated away is treated as evidence of
            // theft, and every active session for the account is revoked in response.
            var client = _factory.CreateClient();
            using var db = Db();
            var (userId, email, password) = await TestHelpers.RegisterUserAsync(client, db, "Investor");

            var loginResponse = await client.PostAsJsonAsync("/api/auth/login", new { email, password });
            var login = await loginResponse.ReadAsAsync<TestHelpers.LoginResponse>();

            // Rotate once — the original token is now revoked-but-superseded.
            await client.PostAsJsonAsync("/api/auth/refresh", new { refreshToken = login!.RefreshToken });

            // Reuse the original (stolen-token scenario).
            await client.PostAsJsonAsync("/api/auth/refresh", new { refreshToken = login.RefreshToken });

            using var verifyDb = Db();
            var tokens = await verifyDb.RefreshTokens.Where(t => t.UserId == userId).ToListAsync();
            Assert.All(tokens, t => Assert.NotNull(t.RevokedAtUtc));
        }

        [Fact]
        public async Task VerifyEmail_WithWrongCode_Returns400()
        {
            var client = _factory.CreateClient();
            var email = $"verify.{Guid.NewGuid():N}@vestora.test";

            using var form = TestHelpers.BuildRegisterForm(
                "Verify", "Test", email, "TestPass123!", "Investor", "1998-04-12", "+201112223334");
            await client.PostAsync("/api/auth/register", form);

            var response = await client.PostAsJsonAsync("/api/auth/verify-email",
                new { email, token = "000000" });

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }
    }
}
