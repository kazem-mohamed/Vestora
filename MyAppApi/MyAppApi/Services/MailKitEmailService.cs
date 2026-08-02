using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;
using MyAppApi.Settings;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace MyAppApi.Services
{
    public class MailKitEmailService : IEmailService
    {
        private readonly EmailSettings _emailSettings;

        public MailKitEmailService(IOptions<EmailSettings> emailSettings)
        {
            _emailSettings = emailSettings.Value;
        }

        public async Task SendEmailAsync(string toEmail, string subject, string htmlBody, string textBody)
        {
            ValidateSettings();

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(_emailSettings.FromName, _emailSettings.FromEmail));
            message.To.Add(MailboxAddress.Parse(toEmail));
            message.Subject = subject;

            var bodyBuilder = new BodyBuilder
            {
                HtmlBody = htmlBody,
                TextBody = textBody
            };

            message.Body = bodyBuilder.ToMessageBody();

            using var client = new SmtpClient();
            var socketOptions = _emailSettings.EnableSsl
                ? SecureSocketOptions.StartTls
                : SecureSocketOptions.Auto;

            await client.ConnectAsync(_emailSettings.Host, _emailSettings.Port, socketOptions);
            await client.AuthenticateAsync(_emailSettings.Username, _emailSettings.Password);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);
        }

        private void ValidateSettings()
        {
            var missingSettings = new List<string>();

            if (string.IsNullOrWhiteSpace(_emailSettings.Host))
            {
                missingSettings.Add("EmailSettings:Host");
            }

            if (_emailSettings.Port <= 0)
            {
                missingSettings.Add("EmailSettings:Port");
            }

            if (string.IsNullOrWhiteSpace(_emailSettings.Username))
            {
                missingSettings.Add("EmailSettings:Username");
            }

            if (string.IsNullOrWhiteSpace(_emailSettings.Password))
            {
                missingSettings.Add("EmailSettings:Password");
            }

            if (string.IsNullOrWhiteSpace(_emailSettings.FromEmail))
            {
                missingSettings.Add("EmailSettings:FromEmail");
            }

            if (string.IsNullOrWhiteSpace(_emailSettings.FromName))
            {
                missingSettings.Add("EmailSettings:FromName");
            }

            if (missingSettings.Count > 0)
            {
                throw new InvalidOperationException(
                    $"SMTP configuration is missing required values: {string.Join(", ", missingSettings)}");
            }
        }
    }
}
