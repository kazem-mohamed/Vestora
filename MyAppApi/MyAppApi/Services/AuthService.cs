using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using MyAppApi.Data;
using MyAppApi.Data.Models;
using MyAppApi.Data.Models.DTOs;
using MyAppApi.Settings;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

namespace MyAppApi.Services
{
    public class AuthService : IAuthService
    {
        private const string PasswordResetRequestAcceptedMessage = "If an account exists for this email, a verification code has been sent.";
        private const string VerificationRequestAcceptedMessage = "If the account exists and is not verified, a verification email has been sent.";

        private readonly AppDbContext _dbContext;
        private readonly IConfiguration _configuration;
        private readonly IEmailService _emailService;
        private readonly IFileUploadSecurityService _fileUploadSecurityService;
        private readonly AuthSecuritySettings _securitySettings;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ILogger<AuthService> _logger;
        private readonly EmailSettings _emailSettings;
        private readonly IHostEnvironment _environment;

        public AuthService(
            AppDbContext dbContext,
            IConfiguration configuration,
            IEmailService emailService,
            IFileUploadSecurityService fileUploadSecurityService,
            IOptions<AuthSecuritySettings> securitySettings,
            IOptions<EmailSettings> emailSettings,
            IHostEnvironment environment,
            IHttpContextAccessor httpContextAccessor,
            ILogger<AuthService> logger)
        {
            _dbContext = dbContext;
            _configuration = configuration;
            _emailService = emailService;
            _fileUploadSecurityService = fileUploadSecurityService;
            _securitySettings = securitySettings.Value;
            _emailSettings = emailSettings.Value;
            _environment = environment;
            _httpContextAccessor = httpContextAccessor;
            _logger = logger;
        }

        /// <summary>
        /// Writes a one-time code to the log so the flow can be exercised while mail
        /// delivery is unavailable.
        /// <para>
        /// Guarded twice — an explicit opt-in AND a Development environment — because a
        /// verification code in a production log is an account takeover waiting for
        /// whoever can read logs. Neither guard alone is enough: a stray config value
        /// must not be able to switch this on in production, and running in Development
        /// must not switch it on by surprise.
        /// </para>
        /// </summary>
        private void EchoCodeForDevelopment(string purpose, User user, string code)
        {
            if (!_emailSettings.LogCodesInDevelopment || !_environment.IsDevelopment())
            {
                return;
            }

            _logger.LogWarning(
                "DEV ONLY — {Purpose} code for {Email} is {Code}. This is logged because " +
                "EmailSettings:LogCodesInDevelopment is enabled in a Development environment. " +
                "Never enable it anywhere real.",
                purpose, user.Email, code);
        }

        public async Task<ServiceResult<ApiMessageDto>> RegisterAsync(RegisterDto dto)
        {
            var normalizedEmail = NormalizeEmail(dto.Email);

            if (await _dbContext.Users.AnyAsync(u => u.Email.ToLower() == normalizedEmail))
            {
                return ServiceResult<ApiMessageDto>.BadRequest("User with this email already exists.");
            }

            var normalizedUserType = dto.UserType.Trim();
            User? user = normalizedUserType.ToLowerInvariant() switch
            {
                "investor" => new Investor { UserType = "Investor" },
                "innovator" => new Innovator { UserType = "Innovator" },
                _ => null
            };

            if (user is null)
            {
                return ServiceResult<ApiMessageDto>.BadRequest("Invalid user type. Use 'Investor' or 'Innovator'.");
            }

            // Collapse any internal run of whitespace as well as trimming the ends, so
            // "Kazem    Mohamed" and a name pasted with a newline both land as one clean
            // display name rather than being stored verbatim and rendered ragged.
            user.UserName = Regex.Replace(
                $"{dto.FirstName.Trim()} {dto.LastName.Trim()}", @"\s+", " ");
            user.Email = normalizedEmail;
            user.Password = BCrypt.Net.BCrypt.HashPassword(dto.Password);
            user.BirthDate = dto.BirthDate;
            user.Phone = dto.Phone.Trim();
            // An empty-ish bio is stored as absent, not as a blank string — otherwise the
            // profile renders an empty paragraph where it should render nothing.
            user.BriefBio = string.IsNullOrWhiteSpace(dto.BriefBio) ? null : dto.BriefBio.Trim();
            user.UniqueNumber = Guid.NewGuid().ToString("N")[..10];
            user.CreatedAtUtc = DateTime.UtcNow;

            if (dto.ProfileImage is { Length: > 0 })
            {
                var imageResult = await _fileUploadSecurityService.ReadValidatedImageAsync(dto.ProfileImage);
                if (imageResult.Status != ServiceResultStatus.Ok || imageResult.Value is null)
                {
                    return ServiceResult<ApiMessageDto>.BadRequest(imageResult.Message ?? "Invalid image file.");
                }

                user.ProfileImage = imageResult.Value;
            }

            var verificationToken = CreateVerificationToken();
            user.EmailVerificationTokenHash = HashToken(verificationToken);
            user.EmailVerificationTokenExpiresAtUtc = DateTime.UtcNow.AddMinutes(_securitySettings.EmailVerificationTokenMinutes);
            user.EmailVerificationLastSentAtUtc = DateTime.UtcNow;

            _dbContext.Users.Add(user);
            AddSecurityEvent("register", user, normalizedEmail, "User registered.");
            await _dbContext.SaveChangesAsync();

            var delivered = await TrySendVerificationEmailAsync(user, verificationToken);

            // The account is created either way — losing a valid sign-up because the mail
            // provider was unreachable would be worse than an unverified account they can
            // resend from. But the message must match what happened.
            return ServiceResult<ApiMessageDto>.Created(new ApiMessageDto
            {
                Message = delivered
                    ? "Registration completed successfully. Please verify your email."
                    : "Your account was created, but we could not send the verification code. "
                      + "Please use \"Resend code\" in a moment, or contact support if it keeps failing.",
                EmailDelivered = delivered
            });
        }

        public async Task<ServiceResult<LoginResponseDto>> LoginAsync(UserLoginDto dto)
        {
            var normalizedEmail = NormalizeEmail(dto.Email);
            var user = await _dbContext.Users.SingleOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail);

            if (user == null)
            {
                AddSecurityEvent("login_failed", null, normalizedEmail, "Unknown email.");
                await _dbContext.SaveChangesAsync();
                return ServiceResult<LoginResponseDto>.Unauthorized("Invalid email or password.");
            }

            if (IsLockedOut(user))
            {
                AddSecurityEvent("login_blocked_lockout", user, normalizedEmail, $"Locked until {user.LockoutEndUtc:O}.");
                await _dbContext.SaveChangesAsync();
                return ServiceResult<LoginResponseDto>.Unauthorized("Account is temporarily locked. Please try again later.");
            }

            // An admin-suspended account keeps its data but cannot sign in until restored.
            if (user.IsSuspended)
            {
                AddSecurityEvent("login_blocked_suspended", user, normalizedEmail, user.SuspensionReason);
                await _dbContext.SaveChangesAsync();
                return ServiceResult<LoginResponseDto>.Unauthorized("This account has been suspended. Please contact support.");
            }

            if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.Password))
            {
                RegisterFailedLogin(user);
                AddSecurityEvent("login_failed", user, normalizedEmail, "Invalid password.");
                await _dbContext.SaveChangesAsync();
                return ServiceResult<LoginResponseDto>.Unauthorized("Invalid email or password.");
            }

            if (_securitySettings.RequireVerifiedEmailForLogin && !user.IsEmailVerified)
            {
                AddSecurityEvent("login_blocked_unverified_email", user, normalizedEmail, "Email is not verified.");
                await _dbContext.SaveChangesAsync();
                return ServiceResult<LoginResponseDto>.Unauthorized("Please verify your email before logging in.");
            }

            user.FailedLoginCount = 0;
            user.LockoutEndUtc = null;
            user.LastFailedLoginAtUtc = null;

            var response = IssueTokenPair(user);
            AddSecurityEvent("login_success", user, normalizedEmail, "Login successful.");
            await _dbContext.SaveChangesAsync();

            return ServiceResult<LoginResponseDto>.Ok(response);
        }

        public async Task<ServiceResult<LoginResponseDto>> RefreshTokenAsync(RefreshTokenRequestDto dto)
        {
            var tokenHash = HashToken(dto.RefreshToken.Trim());
            var existingToken = await _dbContext.RefreshTokens
                .Include(rt => rt.User)
                .SingleOrDefaultAsync(rt => rt.TokenHash == tokenHash);

            if (existingToken == null)
            {
                AddSecurityEvent("refresh_token_failed", null, null, "Refresh token not found.");
                await _dbContext.SaveChangesAsync();
                return ServiceResult<LoginResponseDto>.Unauthorized("Refresh token is invalid or expired.");
            }

            if (!existingToken.IsActive)
            {
                if (existingToken.IsRevoked)
                {
                    await _dbContext.Entry(existingToken.User).Collection(u => u.RefreshTokens).LoadAsync();
                    RevokeActiveRefreshTokens(existingToken.User, "Refresh token reuse detected.");
                }

                AddSecurityEvent("refresh_token_failed", existingToken.User, existingToken.User.Email, "Inactive refresh token.");
                await _dbContext.SaveChangesAsync();
                return ServiceResult<LoginResponseDto>.Unauthorized("Refresh token is invalid or expired.");
            }

            var response = IssueTokenPair(existingToken.User);
            existingToken.RevokedAtUtc = DateTime.UtcNow;
            existingToken.RevokedByIp = GetIpAddress();
            existingToken.ReplacedByTokenHash = HashToken(response.RefreshToken);

            AddSecurityEvent("refresh_token_rotated", existingToken.User, existingToken.User.Email, "Refresh token rotated.");
            await _dbContext.SaveChangesAsync();

            return ServiceResult<LoginResponseDto>.Ok(response);
        }

        public async Task<ServiceResult<ApiMessageDto>> RevokeTokenAsync(RevokeTokenRequestDto dto)
        {
            var tokenHash = HashToken(dto.RefreshToken.Trim());
            var existingToken = await _dbContext.RefreshTokens
                .Include(rt => rt.User)
                .SingleOrDefaultAsync(rt => rt.TokenHash == tokenHash);

            if (existingToken is { IsActive: true })
            {
                RevokeRefreshToken(existingToken, "Refresh token revoked.");
                AddSecurityEvent("refresh_token_revoked", existingToken.User, existingToken.User.Email, "Refresh token revoked.");
                await _dbContext.SaveChangesAsync();
            }

            return ServiceResult<ApiMessageDto>.Ok(new ApiMessageDto
            {
                Message = "Refresh token revoked."
            });
        }

        public async Task<ServiceResult<ApiMessageDto>> LogoutAsync(int userId, string? refreshToken)
        {
            if (!string.IsNullOrWhiteSpace(refreshToken))
            {
                return await RevokeTokenAsync(new RevokeTokenRequestDto { RefreshToken = refreshToken });
            }

            var user = await _dbContext.Users
                .Include(u => u.RefreshTokens)
                .SingleOrDefaultAsync(u => u.Id == userId);

            if (user == null)
            {
                return ServiceResult<ApiMessageDto>.NotFound("User not found.");
            }

            RevokeActiveRefreshTokens(user, "User logged out.");
            AddSecurityEvent("logout", user, user.Email, "All active refresh tokens revoked on logout.");
            await _dbContext.SaveChangesAsync();

            return ServiceResult<ApiMessageDto>.Ok(new ApiMessageDto
            {
                Message = "Logged out successfully."
            });
        }

        public async Task<ServiceResult<ApiMessageDto>> VerifyEmailAsync(VerifyEmailDto dto)
        {
            var normalizedEmail = NormalizeEmail(dto.Email);
            var user = await _dbContext.Users.SingleOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail);

            if (user == null)
            {
                return ServiceResult<ApiMessageDto>.BadRequest("Verification token is invalid or has expired.");
            }

            if (user.IsEmailVerified)
            {
                return ServiceResult<ApiMessageDto>.Ok(new ApiMessageDto { Message = "Email is already verified." });
            }

            if (string.IsNullOrWhiteSpace(user.EmailVerificationTokenHash) ||
                user.EmailVerificationTokenExpiresAtUtc < DateTime.UtcNow ||
                !string.Equals(user.EmailVerificationTokenHash, HashToken(dto.Token.Trim()), StringComparison.Ordinal))
            {
                AddSecurityEvent("email_verification_failed", user, normalizedEmail, "Invalid verification token.");
                await _dbContext.SaveChangesAsync();
                return ServiceResult<ApiMessageDto>.BadRequest("Verification token is invalid or has expired.");
            }

            user.IsEmailVerified = true;
            user.EmailVerifiedAtUtc = DateTime.UtcNow;
            user.EmailVerificationTokenHash = null;
            user.EmailVerificationTokenExpiresAtUtc = null;
            AddSecurityEvent("email_verified", user, normalizedEmail, "Email verified.");
            await _dbContext.SaveChangesAsync();

            return ServiceResult<ApiMessageDto>.Ok(new ApiMessageDto { Message = "Email verified successfully." });
        }

        public async Task<ServiceResult<ApiMessageDto>> ResendVerificationEmailAsync(ResendVerificationEmailDto dto)
        {
            var normalizedEmail = NormalizeEmail(dto.Email);
            var user = await _dbContext.Users.SingleOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail);

            if (user == null || user.IsEmailVerified)
            {
                return ServiceResult<ApiMessageDto>.Ok(new ApiMessageDto { Message = VerificationRequestAcceptedMessage });
            }

            if (user.EmailVerificationLastSentAtUtc.HasValue &&
                DateTime.UtcNow - user.EmailVerificationLastSentAtUtc.Value < TimeSpan.FromSeconds(_securitySettings.EmailVerificationResendCooldownSeconds))
            {
                return ServiceResult<ApiMessageDto>.BadRequest("Please wait before requesting another verification email.");
            }

            var verificationToken = CreateVerificationToken();
            user.EmailVerificationTokenHash = HashToken(verificationToken);
            user.EmailVerificationTokenExpiresAtUtc = DateTime.UtcNow.AddMinutes(_securitySettings.EmailVerificationTokenMinutes);
            user.EmailVerificationLastSentAtUtc = DateTime.UtcNow;
            AddSecurityEvent("email_verification_resent", user, normalizedEmail, "Verification email resent.");
            await _dbContext.SaveChangesAsync();

            var delivered = await TrySendVerificationEmailAsync(user, verificationToken);

            // The generic message stays: this endpoint answers the same way for an unknown
            // address as for a real one, so it must not confirm the account exists. The
            // flag is only meaningful when a send was genuinely attempted and failed.
            return ServiceResult<ApiMessageDto>.Ok(new ApiMessageDto
            {
                Message = delivered
                    ? VerificationRequestAcceptedMessage
                    : "We could not send the code right now. Please try again shortly.",
                EmailDelivered = delivered
            });
        }

        public async Task<ServiceResult<ApiMessageDto>> ChangePasswordAsync(int userId, ChangePasswordDto dto)
        {
            var user = await _dbContext.Users
                .Include(u => u.RefreshTokens)
                .SingleOrDefaultAsync(u => u.Id == userId);

            if (user == null)
            {
                return ServiceResult<ApiMessageDto>.NotFound("User not found.");
            }

            if (!BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.Password))
            {
                AddSecurityEvent("change_password_failed", user, user.Email, "Current password was invalid.");
                await _dbContext.SaveChangesAsync();
                return ServiceResult<ApiMessageDto>.Unauthorized("Current password is incorrect.");
            }

            if (BCrypt.Net.BCrypt.Verify(dto.NewPassword, user.Password))
            {
                return ServiceResult<ApiMessageDto>.BadRequest("New password must be different from the current password.");
            }

            user.Password = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            // Clears whether or not it was set — a self-registered account never had it,
            // so this is a no-op for the overwhelming majority of callers.
            user.MustChangePassword = false;
            RevokeActiveRefreshTokens(user, "Password changed.");
            AddSecurityEvent("password_changed", user, user.Email, "Password changed and active refresh tokens revoked.");
            await _dbContext.SaveChangesAsync();

            return ServiceResult<ApiMessageDto>.Ok(new ApiMessageDto { Message = "Password changed successfully." });
        }

        public async Task<ServiceResult<ApiMessageDto>> ForgotPasswordAsync(ForgotPasswordDto dto)
        {
            var normalizedEmail = NormalizeEmail(dto.Email);
            var user = await _dbContext.Users.SingleOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail);

            if (user == null)
            {
                AddSecurityEvent("password_reset_requested_unknown_email", null, normalizedEmail, "Unknown email.");
                await _dbContext.SaveChangesAsync();
                return ServiceResult<ApiMessageDto>.Ok(new ApiMessageDto { Message = PasswordResetRequestAcceptedMessage });
            }

            if (user.PasswordResetLastRequestedAtUtc.HasValue &&
                DateTime.UtcNow - user.PasswordResetLastRequestedAtUtc.Value < TimeSpan.FromSeconds(_securitySettings.PasswordResetResendCooldownSeconds))
            {
                return ServiceResult<ApiMessageDto>.Ok(new ApiMessageDto { Message = PasswordResetRequestAcceptedMessage });
            }

            var resetCode = RandomNumberGenerator.GetInt32(100000, 1000000).ToString();
            user.PasswordResetTokenHash = HashToken(resetCode);
            user.PasswordResetTokenExpiresAtUtc = DateTime.UtcNow.AddMinutes(_securitySettings.PasswordResetTokenMinutes);
            user.PasswordResetLastRequestedAtUtc = DateTime.UtcNow;
            user.PasswordResetFailedAttempts = 0;
            AddSecurityEvent("password_reset_requested", user, normalizedEmail, "Password reset requested.");
            await _dbContext.SaveChangesAsync();

            await TrySendPasswordResetEmailAsync(user, resetCode);

            return ServiceResult<ApiMessageDto>.Ok(new ApiMessageDto { Message = PasswordResetRequestAcceptedMessage });
        }

        public async Task<ServiceResult<ApiMessageDto>> ResetPasswordAsync(ResetPasswordDto dto)
        {
            var normalizedEmail = NormalizeEmail(dto.Email);
            var user = await _dbContext.Users
                .Include(u => u.RefreshTokens)
                .SingleOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail);

            if (user == null)
            {
                return ServiceResult<ApiMessageDto>.BadRequest("Reset code is invalid or has expired.");
            }

            if (string.IsNullOrWhiteSpace(user.PasswordResetTokenHash) ||
                user.PasswordResetTokenExpiresAtUtc < DateTime.UtcNow ||
                user.PasswordResetFailedAttempts >= _securitySettings.PasswordResetMaxFailedAttempts)
            {
                ClearPasswordReset(user);
                AddSecurityEvent("password_reset_failed", user, normalizedEmail, "Reset token missing, expired, or attempt limit exceeded.");
                await _dbContext.SaveChangesAsync();
                return ServiceResult<ApiMessageDto>.BadRequest("Reset code is invalid or has expired.");
            }

            if (!string.Equals(user.PasswordResetTokenHash, HashToken(dto.Otp.Trim()), StringComparison.Ordinal))
            {
                user.PasswordResetFailedAttempts++;
                if (user.PasswordResetFailedAttempts >= _securitySettings.PasswordResetMaxFailedAttempts)
                {
                    ClearPasswordReset(user);
                }

                AddSecurityEvent("password_reset_failed", user, normalizedEmail, "Invalid reset token.");
                await _dbContext.SaveChangesAsync();
                return ServiceResult<ApiMessageDto>.BadRequest("Reset code is invalid or has expired.");
            }

            user.Password = BCrypt.Net.BCrypt.HashPassword(dto.Password);
            ClearPasswordReset(user);
            RevokeActiveRefreshTokens(user, "Password reset.");
            AddSecurityEvent("password_reset_completed", user, normalizedEmail, "Password reset and active refresh tokens revoked.");
            await _dbContext.SaveChangesAsync();

            return ServiceResult<ApiMessageDto>.Ok(new ApiMessageDto { Message = "Password reset successfully." });
        }

        private LoginResponseDto IssueTokenPair(User user)
        {
            var accessToken = CreateAccessToken(user);
            var refreshToken = CreateRefreshToken(user);
            _dbContext.RefreshTokens.Add(refreshToken.Entity);

            return new LoginResponseDto
            {
                Message = "Login successful.",
                AccessToken = accessToken.Token,
                ExpiresAt = accessToken.ExpiresAt,
                RefreshToken = refreshToken.RawToken,
                RefreshTokenExpiresAt = refreshToken.Entity.ExpiresAtUtc,
                UserId = user.Id,
                UserType = user.UserType,
                UserName = user.UserName,
                UserEmail = user.Email,
                HasOnboarded = user.OnboardedAtUtc != null,
                MustChangePassword = user.MustChangePassword
            };
        }

        private (RefreshToken Entity, string RawToken) CreateRefreshToken(User user)
        {
            var rawToken = CreateRefreshTokenValue();
            var entity = new RefreshToken
            {
                TokenHash = HashToken(rawToken),
                CreatedAtUtc = DateTime.UtcNow,
                ExpiresAtUtc = DateTime.UtcNow.AddDays(_securitySettings.RefreshTokenDays),
                CreatedByIp = GetIpAddress(),
                UserAgent = GetUserAgent(),
                UserId = user.Id
            };

            return (entity, rawToken);
        }

        private (string Token, DateTime ExpiresAt) CreateAccessToken(User user)
        {
            var jwtSettings = _configuration.GetSection("JwtSettings");
            var jwtKey = jwtSettings["Key"];
            if (string.IsNullOrWhiteSpace(jwtKey))
            {
                throw new InvalidOperationException("JWT signing key is not configured.");
            }

            if (Encoding.UTF8.GetByteCount(jwtKey) < 32)
            {
                throw new InvalidOperationException("JWT signing key must be at least 32 bytes for production security.");
            }

            var expirationMinutes = int.TryParse(jwtSettings["ExpirationMinutes"], out var configuredMinutes)
                ? configuredMinutes
                : 60;
            var expiresAt = DateTime.UtcNow.AddMinutes(expirationMinutes);
            var claims = new List<Claim>
            {
                new(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new(ClaimTypes.Email, user.Email),
                new(ClaimTypes.Name, user.UserName),
                new(ClaimTypes.Role, user.UserType),
                new("UserType", user.UserType),
                new("email_verified", user.IsEmailVerified ? "true" : "false")
            };

            var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var credentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);
            var token = new JwtSecurityToken(
                issuer: jwtSettings["Issuer"],
                audience: jwtSettings["Audience"],
                claims: claims,
                expires: expiresAt,
                signingCredentials: credentials);

            return (new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
        }

        /// <summary>
        /// Sends the verification code and reports whether it actually left the building.
        /// <para>
        /// The return value matters. This used to swallow every failure into a warning and
        /// let the caller answer "Registration completed successfully. Please verify your
        /// email" regardless — so a provider refusing the recipient outright produced a
        /// cheerful success message and a person waiting forever on an inbox that would
        /// never receive anything. A delivery failure is not a detail to log; it is the
        /// difference between an account someone can use and one they cannot.
        /// </para>
        /// </summary>
        private async Task<bool> TrySendVerificationEmailAsync(User user, string verificationToken)
        {
            EchoCodeForDevelopment("Email verification", user, verificationToken);

            try
            {
                await _emailService.SendEmailAsync(
                    user.Email,
                    "Verify your Vestora email",
                    $"""
                    <p>Hello {System.Net.WebUtility.HtmlEncode(user.UserName)},</p>
                    <p>Your email verification code is:</p>
                    <p style="font-size:24px;font-weight:bold;letter-spacing:4px;">{verificationToken}</p>
                    <p>This code expires in {_securitySettings.EmailVerificationTokenMinutes} minutes.</p>
                    """,
                    $"""
                    Hello {user.UserName},

                    Your email verification code is: {verificationToken}

                    This code expires in {_securitySettings.EmailVerificationTokenMinutes} minutes.
                    """);

                _logger.LogInformation("Verification email sent to user {UserId}.", user.Id);
                return true;
            }
            catch (Exception ex)
            {
                // Error, not Warning: nobody can complete sign-up when this fails, so it
                // belongs at the level an operator is actually watching.
                _logger.LogError(ex,
                    "Could not deliver the verification code to user {UserId} ({Email}). " +
                    "The account exists but cannot be verified until mail delivery works.",
                    user.Id, user.Email);
                return false;
            }
        }

        private async Task TrySendPasswordResetEmailAsync(User user, string resetCode)
        {
            EchoCodeForDevelopment("Password reset", user, resetCode);

            try
            {
                await _emailService.SendEmailAsync(
                    user.Email,
                    "Your Vestora password reset code",
                    $"""
                    <p>Hello {System.Net.WebUtility.HtmlEncode(user.UserName)},</p>
                    <p>Your password reset verification code is:</p>
                    <p style="font-size:24px;font-weight:bold;letter-spacing:4px;">{resetCode}</p>
                    <p>This code expires in {_securitySettings.PasswordResetTokenMinutes} minutes.</p>
                    <p>If you did not request a password reset, you can ignore this email.</p>
                    """,
                    $"""
                    Hello {user.UserName},

                    Your password reset verification code is: {resetCode}

                    This code expires in {_securitySettings.PasswordResetTokenMinutes} minutes.

                    If you did not request a password reset, you can ignore this email.
                    """);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to send password reset email to user {UserId}.", user.Id);
            }
        }

        private void RegisterFailedLogin(User user)
        {
            user.FailedLoginCount++;
            user.LastFailedLoginAtUtc = DateTime.UtcNow;

            if (user.FailedLoginCount >= _securitySettings.MaxFailedLoginAttempts)
            {
                user.LockoutEndUtc = DateTime.UtcNow.AddMinutes(_securitySettings.LockoutMinutes);
                AddSecurityEvent("account_locked", user, user.Email, $"Locked for {_securitySettings.LockoutMinutes} minutes.");
            }
        }

        private static bool IsLockedOut(User user)
        {
            if (!user.LockoutEndUtc.HasValue)
            {
                return false;
            }

            if (user.LockoutEndUtc > DateTime.UtcNow)
            {
                return true;
            }

            user.LockoutEndUtc = null;
            user.FailedLoginCount = 0;
            return false;
        }

        private void RevokeActiveRefreshTokens(User user, string reason)
        {
            foreach (var token in user.RefreshTokens.Where(rt => rt.IsActive))
            {
                RevokeRefreshToken(token, reason);
            }
        }

        private void RevokeRefreshToken(RefreshToken token, string reason)
        {
            token.RevokedAtUtc = DateTime.UtcNow;
            token.RevokedByIp = GetIpAddress();
            AddSecurityEvent("refresh_token_revoked", token.User, token.User.Email, reason);
        }

        private static void ClearPasswordReset(User user)
        {
            user.PasswordResetTokenHash = null;
            user.PasswordResetTokenExpiresAtUtc = null;
            user.PasswordResetFailedAttempts = 0;
        }

        private void AddSecurityEvent(string eventType, User? user, string? email, string? details)
        {
            _dbContext.SecurityLogs.Add(new SecurityLog
            {
                EventType = eventType,
                User = user,
                UserId = user?.Id > 0 ? user.Id : null,
                Email = email,
                IpAddress = GetIpAddress(),
                UserAgent = GetUserAgent(),
                Details = details,
                CreatedAtUtc = DateTime.UtcNow
            });
        }

        private string? GetIpAddress()
        {
            return _httpContextAccessor.HttpContext?.Connection.RemoteIpAddress?.ToString();
        }

        private string? GetUserAgent()
        {
            return _httpContextAccessor.HttpContext?.Request.Headers.UserAgent.ToString();
        }

        private static string NormalizeEmail(string email)
        {
            return email.Trim().ToLowerInvariant();
        }

        private static string CreateVerificationToken()
        {
            return RandomNumberGenerator.GetInt32(100000, 1000000).ToString();
        }

        private static string CreateRefreshTokenValue()
        {
            var bytes = RandomNumberGenerator.GetBytes(64);
            return Convert.ToBase64String(bytes)
                .Replace("+", "-", StringComparison.Ordinal)
                .Replace("/", "_", StringComparison.Ordinal)
                .TrimEnd('=');
        }

        private static string HashToken(string token)
        {
            var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
            return Convert.ToHexString(hashBytes);
        }
    }
}
