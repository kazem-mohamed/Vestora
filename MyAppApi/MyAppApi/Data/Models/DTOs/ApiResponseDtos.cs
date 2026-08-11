namespace MyAppApi.Data.Models.DTOs
{
    public class ApiMessageDto
    {
        public string Message { get; set; } = string.Empty;

        /// <summary>
        /// Whether an email this endpoint was supposed to send actually left the server.
        /// <para>
        /// Null when the endpoint sends no mail. False lets the client stop telling someone
        /// to check an inbox that received nothing, and offer the resend path instead.
        /// Deliberately never set on password-reset responses: those answer identically
        /// for known and unknown addresses, and a delivery flag there would leak which
        /// emails are registered.
        /// </para>
        /// </summary>
        public bool? EmailDelivered { get; set; }
    }

    public class CreatedResourceDto
    {
        public string Message { get; set; } = string.Empty;

        public int Id { get; set; }
    }

    public class LoginResponseDto
    {
        public string Message { get; set; } = string.Empty;

        public string AccessToken { get; set; } = string.Empty;

        public DateTime ExpiresAt { get; set; }

        public string RefreshToken { get; set; } = string.Empty;

        public DateTime RefreshTokenExpiresAt { get; set; }

        public int UserId { get; set; }

        public string UserType { get; set; } = string.Empty;

        public string UserName { get; set; } = string.Empty;

        public string UserEmail { get; set; } = string.Empty;

        // Whether this account has already been through the first-run flow. Sent
        // with the login response so the client can route to onboarding without a
        // second round trip on the one request where latency is most visible.
        public bool HasOnboarded { get; set; }
    }

    public class MessageResponseDto
    {
        public int Id { get; set; }

        public string Content { get; set; } = string.Empty;

        public DateTime SentAt { get; set; }

        public int SenderId { get; set; }

        public int ReceiverId { get; set; }
    }

    public class ConversationSummaryDto
    {
        public int MessageId { get; set; }

        public string Content { get; set; } = string.Empty;

        public DateTime SentAt { get; set; }

        public int SenderId { get; set; }

        public string SenderName { get; set; } = string.Empty;

        public int ReceiverId { get; set; }

        public string ReceiverName { get; set; } = string.Empty;
    }

    public class InvestmentSummaryDto
    {
        public double TotalSupport { get; set; }

        public double ExpectedReturn { get; set; }

        public int SupportedProjectsCount { get; set; }
    }

    public class InvestmentActivityDto
    {
        public DateTime Date { get; set; }

        public string ProjectName { get; set; } = string.Empty;

        public double Amount { get; set; }

        public string Type { get; set; } = string.Empty;
    }

    public class NotificationReadDto
    {
        public string Message { get; set; } = string.Empty;

        public int? InvestorId { get; set; }
    }
}
