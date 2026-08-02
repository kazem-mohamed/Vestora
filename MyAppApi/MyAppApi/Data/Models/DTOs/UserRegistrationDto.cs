using System;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;
using MyAppApi.Services;

namespace MyAppApi.Data.Models.DTOs
{
    /// <summary>
    /// Registration input.
    /// <para>
    /// The rules live in <see cref="AccountRules"/> so this DTO, the password-reset DTO and
    /// the change-password DTO cannot drift apart — which they had: registration required a
    /// six-character password with no character rules, while the other two required eight.
    /// Three floors for one secret.
    /// </para>
    /// </summary>
    public class RegisterDto
    {
        [Required]
        [Display(Name = "First name")]
        [PersonName]
        public string FirstName { get; set; } = string.Empty;

        [Required]
        [Display(Name = "Last name")]
        [PersonName]
        public string LastName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [StringLength(AccountRules.EmailMaxLength)]
        public string Email { get; set; } = string.Empty;

        [Required]
        [DataType(DataType.Password)]
        // Checked against the email too, so nobody registers with their own address as
        // their password.
        [PasswordPolicy(EmailProperty = nameof(Email))]
        public string Password { get; set; } = string.Empty;

        [Required]
        [DataType(DataType.Password)]
        [Compare("Password", ErrorMessage = "The passwords do not match.")]
        public string ConfirmPassword { get; set; } = string.Empty;

        [Required]
        public string UserType { get; set; } = string.Empty;

        [Required]
        [DataType(DataType.Date)]
        [RealisticBirthDate]
        public DateTime BirthDate { get; set; }

        [Required]
        [DialablePhone]
        public string Phone { get; set; } = string.Empty;

        [StringLength(250)]
        public string? BriefBio { get; set; }

        public IFormFile? ProfileImage { get; set; }
    }
}
