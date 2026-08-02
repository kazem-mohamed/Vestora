namespace MyAppApi.Settings
{
    public class EmailSettings
    {
        public string Host { get; set; } = string.Empty;

        public int Port { get; set; }

        public string Username { get; set; } = string.Empty;

        public string Password { get; set; } = string.Empty;

        public string FromEmail { get; set; } = string.Empty;

        public string FromName { get; set; } = string.Empty;

        public bool EnableSsl { get; set; }

        /// <summary>
        /// Writes verification and password-reset codes to the log instead of relying on
        /// the inbox. Off by default, and ignored outside a Development environment.
        /// <para>
        /// Exists because the mail provider cannot yet reach arbitrary recipients, which
        /// otherwise makes sign-up impossible to test or demonstrate with any address but
        /// the account owner's. It is a development affordance, never a fallback for
        /// production: anyone who can read the logs could take over any account.
        /// </para>
        /// </summary>
        public bool LogCodesInDevelopment { get; set; }
    }
}
