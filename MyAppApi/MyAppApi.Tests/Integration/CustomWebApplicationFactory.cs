using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using MyAppApi.Data;

namespace MyAppApi.Tests.Integration
{
    /// <summary>
    /// Boots the real API (real controllers, real services, real middleware) against an
    /// isolated, per-factory EF Core InMemory database. Nothing in this suite ever opens a
    /// connection to the shared SQL Server database — that one is remote and shared across
    /// the whole team, and AGENTS.md is explicit that it is not touched without saying so.
    /// <para>
    /// InMemory rather than SQLite: several queries in this codebase build LINQ predicates
    /// from expression trees defined in <c>FundingMath</c> (nested <c>Sum</c> over a related
    /// collection compared against another column, used inside a <c>CountAsync</c>
    /// predicate). SQL Server's EF Core provider translates that; SQLite's provider throws
    /// on it. InMemory evaluates LINQ client-side instead of generating SQL, so it accepts
    /// any expression a real C# `Where`/`Count` would — at the cost of not enforcing
    /// relational constraints like unique indexes, which none of these tests rely on.
    /// </para>
    /// <para>
    /// One factory instance is reused per test class (xUnit's <c>IClassFixture</c>), and
    /// each test class gets its own fresh, empty database — tests inside a class can still
    /// see each other's data, which is why every test seeds exactly the rows it needs rather
    /// than assuming a clean slate.
    /// </para>
    /// </summary>
    public class CustomWebApplicationFactory : WebApplicationFactory<Program>
    {
        private readonly string _databaseName = $"vestora-tests-{Guid.NewGuid():N}";

        public CustomWebApplicationFactory()
        {
            // Program.cs reads several settings straight off `builder.Configuration`
            // inline in Main() — before WebApplicationFactory gets a chance to apply
            // ConfigureAppConfiguration overrides, which only take effect once the host
            // builder is actually built. Environment variables are the one configuration
            // source WebApplication.CreateBuilder(args) already includes at the moment
            // Main() starts reading, so that is the layer these have to go through.
            //
            // The real appsettings.json ships with an empty JWT key on purpose (AGENTS.md:
            // secrets never go in a committed file), and Program.cs refuses to start with
            // no connection string configured at all — it never gets the chance to
            // actually open the placeholder one below, because ConfigureServices further
            // down replaces the DbContext registration it feeds before the host runs.
            Environment.SetEnvironmentVariable("JwtSettings__Key",
                "test-signing-key-only-for-integration-tests-32bytes+");
            Environment.SetEnvironmentVariable("JwtSettings__Issuer", "MyAppApi.Tests");
            Environment.SetEnvironmentVariable("JwtSettings__Audience", "MyAppApi.Tests.Client");
            Environment.SetEnvironmentVariable("JwtSettings__ExpirationMinutes", "60");
            Environment.SetEnvironmentVariable("Payments__Provider", "simulated");
            Environment.SetEnvironmentVariable("ConnectionStrings__InvestContextDB",
                "Server=unused;Database=unused;");
        }

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Testing");

            builder.ConfigureServices(services =>
            {
                // Remove every registration Program.cs made for AppDbContext (the options
                // AND the SQL Server-backed factory it configured) and replace them with a
                // SQLite in-memory context. Removing by service type rather than assuming
                // a single descriptor is what makes this survive Program.cs changing how
                // many pieces it registers.
                var toRemove = services
                    .Where(d => d.ServiceType == typeof(DbContextOptions<AppDbContext>)
                             || d.ServiceType == typeof(AppDbContext)
                             || (d.ServiceType.IsGenericType &&
                                 d.ServiceType.GetGenericTypeDefinition() == typeof(DbContextOptions<>)))
                    .ToList();
                foreach (var descriptor in toRemove)
                {
                    services.Remove(descriptor);
                }

                services.AddDbContext<AppDbContext>(options =>
                    options
                        .UseInMemoryDatabase(_databaseName)
                        // PaymentService wraps its event-then-effect write in a real
                        // BeginTransactionAsync — correct against SQL Server, but the
                        // InMemory provider has no transaction support and otherwise
                        // escalates that mismatch into a hard error. Each SaveChangesAsync
                        // is already atomic against InMemory, which is what actually
                        // matters for what these tests are checking.
                        .ConfigureWarnings(w => w.Ignore(
                            Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning)));

                using var scope = services.BuildServiceProvider().CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                db.Database.EnsureCreated();

                // Program.cs keys its rate limiter off the caller's IP for unauthenticated
                // requests, and every in-process TestServer request reports the same
                // loopback address — so a full test run would collide into one shared
                // bucket and start returning 429s well before it ran out of real
                // scenarios to cover. This is not a test of the limiter itself, so it is
                // replaced here with the same named policies at limits generous enough
                // for a test run, rather than weakened in the real Program.cs.
                var rateLimiterDescriptors = services
                    .Where(d => d.ServiceType.FullName != null &&
                                d.ServiceType.FullName.Contains("RateLimiterOptions"))
                    .ToList();
                foreach (var descriptor in rateLimiterDescriptors)
                {
                    services.Remove(descriptor);
                }

                // AddRateLimiter() itself (the middleware plumbing) was already called by
                // Program.cs — only the *options* (the named policies) need replacing, so
                // this goes straight through the plain Options pattern instead of calling
                // that extension a second time.
                services.Configure<RateLimiterOptions>(options =>
                {
                    options.GlobalLimiter = null;

                    RateLimitPartition<string> Generous(HttpContext _) =>
                        RateLimitPartition.GetFixedWindowLimiter("test", __ => new FixedWindowRateLimiterOptions
                        {
                            PermitLimit = 100_000,
                            Window = TimeSpan.FromMinutes(1),
                            QueueLimit = 0,
                        });

                    options.AddPolicy("Auth", (Func<HttpContext, RateLimitPartition<string>>)Generous);
                    options.AddPolicy("PasswordReset", (Func<HttpContext, RateLimitPartition<string>>)Generous);
                    options.AddPolicy("Checkout", (Func<HttpContext, RateLimitPartition<string>>)Generous);
                });

                // Program.cs's UseExceptionHandler deliberately returns a generic 500 to
                // callers (never leak internals to an API response) — correct in
                // production, unhelpful when a test itself needs to know what broke. The
                // middleware still logs the real exception at Error level before it does
                // that, so capturing logs is what surfaces it during test runs.
                services.AddLogging(logging => logging.AddProvider(new TestLogCapture.Provider()));
            });
        }
    }
}
