using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using Microsoft.IdentityModel.Tokens;
using MyAppApi.Data;
using MyAppApi.Services;
using MyAppApi.Services.Payments;
using MyAppApi.Settings;
using System.Text;
using System.Threading.RateLimiting;

namespace MyAppApi
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Configure DbContext with SQL Server
            var primaryConnectionString = builder.Configuration.GetConnectionString("InvestContextDB");
            var fallbackConnectionString = builder.Configuration.GetConnectionString("InvestContextDBMonster");
            var selectedConnectionString = ResolveConnectionString(primaryConnectionString, fallbackConnectionString);

            builder.Services.AddDbContext<AppDbContext>(options =>
                options.UseSqlServer(selectedConnectionString));

            // Enable distributed memory cache
            builder.Services.AddDistributedMemoryCache();

            // Add session state services
            builder.Services.AddSession(options =>
            {
                options.IdleTimeout = TimeSpan.FromMinutes(30); // Set session timeout to 30 minutes
                options.Cookie.HttpOnly = true;
                options.Cookie.IsEssential = true;
            });

            var jwtSettings = builder.Configuration.GetSection("JwtSettings");
            var jwtKey = jwtSettings["Key"];
            if (string.IsNullOrWhiteSpace(jwtKey))
            {
                throw new InvalidOperationException(
                    "JWT signing key is not configured. It is a secret and is deliberately empty in " +
                    "appsettings.json — supply it via user secrets in development " +
                    "(dotnet user-secrets set \"JwtSettings:Key\" \"…\") or via the JwtSettings__Key " +
                    "environment variable in production.");
            }

            if (Encoding.UTF8.GetByteCount(jwtKey) < 32)
            {
                throw new InvalidOperationException("JWT signing key must be at least 32 bytes for production security.");
            }

            if (string.IsNullOrWhiteSpace(jwtSettings["Issuer"]) ||
                string.IsNullOrWhiteSpace(jwtSettings["Audience"]))
            {
                throw new InvalidOperationException("JWT issuer and audience must be configured.");
            }

            builder.Services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
                .AddJwtBearer(options =>
                {
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidateAudience = true,
                        ValidateLifetime = true,
                        ValidateIssuerSigningKey = true,
                        ValidIssuer = jwtSettings["Issuer"],
                        ValidAudience = jwtSettings["Audience"],
                        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
                        ClockSkew = TimeSpan.Zero
                    };

                    // Allow SignalR (WebSockets) to authenticate via the access_token query string,
                    // since browsers cannot attach Authorization headers to WebSocket handshakes.
                    options.Events = new JwtBearerEvents
                    {
                        OnMessageReceived = context =>
                        {
                            var accessToken = context.Request.Query["access_token"];
                            var path = context.HttpContext.Request.Path;
                            if (!string.IsNullOrEmpty(accessToken) &&
                                path.StartsWithSegments("/hubs"))
                            {
                                context.Token = accessToken;
                            }

                            return Task.CompletedTask;
                        }
                    };
                });

            builder.Services.AddAuthorization();
            builder.Services.AddProblemDetails();

            builder.Services.Configure<EmailSettings>(
                builder.Configuration.GetSection("EmailSettings"));
            builder.Services.Configure<AuthSecuritySettings>(
                builder.Configuration.GetSection("AuthSecurity"));
            builder.Services.Configure<FileUploadSecuritySettings>(
                builder.Configuration.GetSection("FileUploadSecurity"));
            builder.Services.AddScoped<IEmailService, MailKitEmailService>();
            builder.Services.AddScoped<IFileUploadSecurityService, FileUploadSecurityService>();
            builder.Services.AddScoped<IAuthService, AuthService>();
            builder.Services.AddSingleton<PresenceTracker>();
            builder.Services.AddSingleton<NotificationFanOutQueue>();
            builder.Services.AddHostedService<NotificationFanOutWorker>();
            builder.Services.AddHttpContextAccessor();

            // ---- Payments (sandbox only) ----
            builder.Services.Configure<PaymentSettings>(
                builder.Configuration.GetSection("Payments"));

            var paymentSettings = builder.Configuration.GetSection("Payments").Get<PaymentSettings>()
                                  ?? new PaymentSettings();

            // A live Stripe key is refused outright. Vestora is a graduation project with
            // no licence to move money, and the safest way to guarantee it never does is
            // to make the application unable to start if someone tries.
            var stripeKey = paymentSettings.Stripe.SecretKey;
            if (!string.IsNullOrWhiteSpace(stripeKey) && !stripeKey.StartsWith("sk_test_", StringComparison.Ordinal))
            {
                throw new InvalidOperationException(
                    "Payments:Stripe:SecretKey must be a test key (sk_test_…). Vestora must never process real payments.");
            }

            var useStripe = string.Equals(paymentSettings.Provider, "stripe", StringComparison.OrdinalIgnoreCase)
                            && !string.IsNullOrWhiteSpace(stripeKey);

            if (useStripe)
            {
                builder.Services.AddHttpClient<StripeSandboxPaymentProvider>();
                builder.Services.AddScoped<IPaymentProvider>(sp =>
                    sp.GetRequiredService<StripeSandboxPaymentProvider>());
            }
            else
            {
                // No key, or the simulator was asked for explicitly. The entire funding
                // lifecycle still runs — same state machine, same fees, same audit trail —
                // so a demonstration is never at the mercy of a network.
                builder.Services.AddScoped<IPaymentProvider, SimulatedPaymentProvider>();
            }

            builder.Services.AddScoped<PaymentService>();
            builder.Services.AddScoped<TermSheetService>();
            builder.Services.AddHostedService<PaymentExpirySweeper>();

            // Configure CORS
            var allowedOrigins = builder.Configuration
                .GetSection("Cors:AllowedOrigins")
                .Get<string[]>() ?? Array.Empty<string>();

            builder.Services.AddCors(options =>
            {
                options.AddPolicy("ConfiguredOrigins",
                    policy =>
                    {
                        policy.WithOrigins(allowedOrigins)
                              .AllowAnyMethod()
                              .AllowAnyHeader()
                              .AllowCredentials();
                    });
            });

            builder.Services.AddRateLimiter(options =>
            {
                options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

                options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
                    RateLimitPartition.GetFixedWindowLimiter(
                        GetRateLimitPartitionKey(context),
                        _ => new FixedWindowRateLimiterOptions
                        {
                            PermitLimit = 100,
                            Window = TimeSpan.FromMinutes(1),
                            QueueLimit = 0,
                            QueueProcessingOrder = QueueProcessingOrder.OldestFirst
                        }));

                options.AddPolicy("Auth", context =>
                    RateLimitPartition.GetFixedWindowLimiter(
                        GetRateLimitPartitionKey(context),
                        _ => new FixedWindowRateLimiterOptions
                        {
                            PermitLimit = 10,
                            Window = TimeSpan.FromMinutes(1),
                            QueueLimit = 0,
                            QueueProcessingOrder = QueueProcessingOrder.OldestFirst
                        }));

                options.AddPolicy("PasswordReset", context =>
                    RateLimitPartition.GetFixedWindowLimiter(
                        GetRateLimitPartitionKey(context),
                        _ => new FixedWindowRateLimiterOptions
                        {
                            PermitLimit = 3,
                            Window = TimeSpan.FromMinutes(10),
                            QueueLimit = 0,
                            QueueProcessingOrder = QueueProcessingOrder.OldestFirst
                        }));

                // Opening a checkout is the one payment action with a cost at the
                // provider. Generous enough for a genuine retry, tight enough that a
                // loop cannot hammer Stripe with sessions.
                options.AddPolicy("Checkout", context =>
                    RateLimitPartition.GetFixedWindowLimiter(
                        GetRateLimitPartitionKey(context),
                        _ => new FixedWindowRateLimiterOptions
                        {
                            PermitLimit = 8,
                            Window = TimeSpan.FromMinutes(5),
                            QueueLimit = 0,
                            QueueProcessingOrder = QueueProcessingOrder.OldestFirst
                        }));
            });

            // Add Swagger
            builder.Services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("v1", new OpenApiInfo { Title = "My API", Version = "v1" });
                c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
                {
                    Name = "Authorization",
                    Type = SecuritySchemeType.Http,
                    Scheme = "bearer",
                    BearerFormat = "JWT",
                    In = ParameterLocation.Header,
                    Description = "Enter a valid JWT access token."
                });
                c.AddSecurityRequirement(new OpenApiSecurityRequirement
                {
                    {
                        new OpenApiSecurityScheme
                        {
                            Reference = new OpenApiReference
                            {
                                Type = ReferenceType.SecurityScheme,
                                Id = "Bearer"
                            }
                        },
                        Array.Empty<string>()
                    }
                });
            });

            // Add services to the container.
            // The browse feed is JSON-heavy and served on every filter change.
            builder.Services.AddResponseCompression(o =>
            {
                o.EnableForHttps = true;
                o.MimeTypes = Microsoft.AspNetCore.ResponseCompression.ResponseCompressionDefaults
                    .MimeTypes.Concat(new[] { "application/json" });
            });

            builder.Services.AddControllers()
                .AddJsonOptions(o =>
                {
                    o.JsonSerializerOptions.Converters.Add(new UtcDateTimeConverter());
                    o.JsonSerializerOptions.Converters.Add(new UtcNullableDateTimeConverter());
                });
            // Same UTC wire format as the REST endpoints, so a live message and the
            // same message reloaded from history render the identical timestamp.
            builder.Services.AddSignalR()
                .AddJsonProtocol(o =>
                {
                    o.PayloadSerializerOptions.Converters.Add(new UtcDateTimeConverter());
                    o.PayloadSerializerOptions.Converters.Add(new UtcNullableDateTimeConverter());
                });
            builder.Services.AddEndpointsApiExplorer();

            var app = builder.Build();

            // Must sit ahead of the endpoints that produce the compressible bodies.
            app.UseResponseCompression();

            // Configure the HTTP request pipeline.
            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI(c =>
                {
                    c.SwaggerEndpoint("/swagger/v1/swagger.json", "My API v1");
                });
            }
            else
            {
                app.UseHsts();
            }

            app.UseExceptionHandler(errorApp =>
            {
                errorApp.Run(async context =>
                {
                    var exceptionFeature = context.Features.Get<IExceptionHandlerFeature>();
                    var logger = context.RequestServices
                        .GetRequiredService<ILogger<Program>>();

                    if (exceptionFeature?.Error != null)
                    {
                        logger.LogError(exceptionFeature.Error, "Unhandled exception while processing request.");
                    }

                    context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                    context.Response.ContentType = "application/problem+json";

                    var problemDetails = new ProblemDetails
                    {
                        Status = StatusCodes.Status500InternalServerError,
                        Title = "An unexpected error occurred.",
                        Detail = "Please try again later."
                    };

                    await context.Response.WriteAsJsonAsync(problemDetails);
                });
            });

            app.UseHttpsRedirection();

            // Use CORS
            app.UseCors("ConfiguredOrigins");

            app.UseRateLimiter();

            app.UseSession(); // Ensure session is used

            app.UseAuthentication(); // Add Authentication Middleware
            app.UseAuthorization();

            app.MapControllers();
            app.MapHub<MyAppApi.Data.Models.Hubs.ChatHub>("/hubs/chat");

            app.Run();
        }

        private static string GetRateLimitPartitionKey(HttpContext context)
        {
            return context.User?.Identity?.IsAuthenticated == true
                ? $"user:{context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value}"
                : $"ip:{context.Connection.RemoteIpAddress?.ToString() ?? "unknown"}";
        }

        private static string ResolveConnectionString(string? primaryConnectionString, string? fallbackConnectionString)
        {
            if (CanOpenConnection(primaryConnectionString))
            {
                return primaryConnectionString!;
            }

            if (CanOpenConnection(fallbackConnectionString))
            {
                return fallbackConnectionString!;
            }

            if (!string.IsNullOrWhiteSpace(primaryConnectionString))
            {
                return primaryConnectionString;
            }

            if (!string.IsNullOrWhiteSpace(fallbackConnectionString))
            {
                return fallbackConnectionString;
            }

            throw new InvalidOperationException(
                "No SQL Server connection string is configured. Connection strings are secrets and are " +
                "deliberately empty in appsettings.json — supply one via user secrets in development " +
                "(dotnet user-secrets set \"ConnectionStrings:InvestContextDBMonster\" \"…\") or via the " +
                "ConnectionStrings__InvestContextDBMonster environment variable in production.");
        }

        private static bool CanOpenConnection(string? connectionString)
        {
            if (string.IsNullOrWhiteSpace(connectionString))
            {
                return false;
            }

            try
            {
                using var connection = new SqlConnection(connectionString);
                connection.Open();
                return true;
            }
            catch
            {
                return false;
            }
        }
    }
}
