using System.Threading.Tasks;

namespace MyAppApi.Services
{
    public interface IEmailService
    {
        Task SendEmailAsync(string toEmail, string subject, string htmlBody, string textBody);
    }
}
