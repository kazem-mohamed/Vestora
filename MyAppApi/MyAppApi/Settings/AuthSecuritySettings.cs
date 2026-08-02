namespace MyAppApi.Settings
{
    public class AuthSecuritySettings
    {
        public int RefreshTokenDays { get; set; } = 14;

        public int EmailVerificationTokenMinutes { get; set; } = 60;

        public int EmailVerificationResendCooldownSeconds { get; set; } = 60;

        public bool RequireVerifiedEmailForLogin { get; set; } = true;

        public int MaxFailedLoginAttempts { get; set; } = 5;

        public int LockoutMinutes { get; set; } = 15;

        public int PasswordResetTokenMinutes { get; set; } = 10;

        public int PasswordResetResendCooldownSeconds { get; set; } = 60;

        public int PasswordResetMaxFailedAttempts { get; set; } = 5;
    }
}
