using System.ComponentModel.DataAnnotations;
using MyAppApi.Services;

namespace MyAppApi.Data.Models.DTOs
{
    public class ResetPasswordDto
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string Otp { get; set; } = string.Empty;

        [Required]
        [DataType(DataType.Password)]
        // Same policy as registration. These were 8 and 6 respectively — one secret,
        // two floors, so a reset could weaken an account below what signup allowed.
        [PasswordPolicy(EmailProperty = nameof(Email))]
        public string Password { get; set; } = string.Empty;

        [Required]
        [DataType(DataType.Password)]
        [Compare("Password")]
        public string ConfirmPassword { get; set; } = string.Empty;
    }
}
