using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;

namespace MyAppApi.Services
{
    /// <summary>
    /// What an account has to satisfy, enforced server-side.
    /// <para>
    /// This mirrors <c>Frontend/vestora/src/lib/validation/rules.ts</c> rule for rule. The
    /// frontend copy exists so someone gets told before they submit; this copy is the one
    /// that decides, because the endpoints are reachable without the form.
    /// </para>
    /// <para>
    /// What it replaced: registration accepted a six-character password with no character
    /// requirements, so <c>123456</c> was a valid credential on a platform where members
    /// publish fundraising documents. Password reset asked for eight and change-password
    /// asked for eight — three different floors for the same secret. Birth date had no
    /// bounds at all, so the year 3000 registered. Names measured length before trimming,
    /// so two spaces was a valid surname.
    /// </para>
    /// </summary>
    public static class AccountRules
    {
        // ---- Password -------------------------------------------------------

        public const int PasswordMinLength = 10;

        /// <summary>
        /// BCrypt ignores input past 72 bytes. Accepting a longer password would mean
        /// silently storing a prefix of it — and then a different long string with the
        /// same first 72 bytes would also unlock the account. Refusing is honest.
        /// </summary>
        public const int PasswordMaxBytes = 72;

        private static readonly HashSet<string> CommonPasswords = new(StringComparer.OrdinalIgnoreCase)
        {
            "password", "password1", "password12", "password123", "password1234",
            "passw0rd123", "qwertyuiop", "qwerty123456", "1234567890", "12345678901",
            "123456789012", "letmein123", "welcome123", "iloveyou123", "admin12345",
            "administrator", "changeme123", "1qaz2wsx3edc", "zaq12wsxcde3", "trustno1234",
            "monkey123456", "dragon123456", "football1234", "baseball1234", "superman123",
            "sunshine1234", "princess1234", "abcd1234567", "aaaaaaaaaa", "1111111111",
            "0000000000", "asdfghjkl123", "vestora123", "vestora1234", "investor123",
            "startup1234", "capital1234",
        };

        /// <summary>
        /// Returns null when acceptable, otherwise the reason. <paramref name="email"/> is
        /// optional; when supplied, a password containing the address's local part is
        /// rejected.
        /// </summary>
        public static string? ValidatePassword(string? password, string? email = null)
        {
            if (string.IsNullOrEmpty(password))
                return "A password is required.";

            if (password != password.Trim())
                return "A password cannot start or end with a space.";

            if (password.Length < PasswordMinLength)
                return $"Use at least {PasswordMinLength} characters.";

            if (Encoding.UTF8.GetByteCount(password) > PasswordMaxBytes)
                return $"That password is too long. Keep it under {PasswordMaxBytes} bytes.";

            if (!password.Any(char.IsLower) || !password.Any(char.IsUpper))
                return "Include both an uppercase and a lowercase letter.";

            if (!password.Any(char.IsDigit))
                return "Include at least one number.";

            if (CommonPasswords.Contains(password))
                return "That password is too common. Choose something less guessable.";

            var local = email?.Split('@').FirstOrDefault()?.Trim();
            if (!string.IsNullOrEmpty(local) && local.Length >= 4 &&
                password.Contains(local, StringComparison.OrdinalIgnoreCase))
            {
                return "A password should not contain your email address.";
            }

            return null;
        }

        // ---- Names ----------------------------------------------------------

        public const int NameMinLength = 2;
        public const int NameMaxLength = 50;

        private static readonly Regex NameSymbols =
            new(@"[<>@#$%^*_={}\[\]|\\/~`+]", RegexOptions.Compiled);

        /// <summary>
        /// Measured after trimming, and required to contain a letter in some script — so
        /// Arabic, accented Latin, and hyphenated names all pass while "  " and "12" do not.
        /// </summary>
        public static string? ValidateName(string? value, string field)
        {
            var v = value?.Trim() ?? string.Empty;

            if (v.Length < NameMinLength)
                return $"{field} needs at least {NameMinLength} characters.";
            if (v.Length > NameMaxLength)
                return $"{field} cannot exceed {NameMaxLength} characters.";
            if (v.Any(char.IsDigit))
                return $"{field} cannot contain numbers.";
            if (!v.Any(char.IsLetter))
                return $"{field} must contain letters.";
            if (NameSymbols.IsMatch(v))
                return $"{field} contains characters that are not allowed.";

            return null;
        }

        // ---- Email ----------------------------------------------------------

        public const int EmailMaxLength = 254;

        private static readonly Regex EmailShape =
            new(@"^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$", RegexOptions.Compiled);

        public static string? ValidateEmail(string? value)
        {
            var v = value?.Trim() ?? string.Empty;
            if (v.Length == 0) return "An email address is required.";
            if (v.Length > EmailMaxLength) return "That email address is too long.";
            if (!EmailShape.IsMatch(v)) return "Enter a valid email address.";
            return null;
        }

        // ---- Phone ----------------------------------------------------------

        private static readonly Regex PhoneShape =
            new(@"^\+?[\d\s()./-]+$", RegexOptions.Compiled);

        /// <summary>
        /// No national format is imposed — Vestora takes members from anywhere. The rule is
        /// only that the value could be dialled. <c>[Phone]</c> alone accepted things like
        /// "ext. 4" because it is built for a far looser world than a signup form.
        /// </summary>
        public static string? ValidatePhone(string? value)
        {
            var v = value?.Trim() ?? string.Empty;
            if (v.Length == 0) return "A phone number is required.";

            var digits = new string(v.Where(char.IsDigit).ToArray());
            if (digits.Length < 7) return "That phone number looks too short.";
            if (digits.Length > 15) return "That phone number looks too long.";
            if (!PhoneShape.IsMatch(v)) return "A phone number can only contain digits and + ( ) - . spaces.";

            return null;
        }

        // ---- Birth date -----------------------------------------------------

        public const int MinAge = 18;
        public const int MaxAge = 100;

        public static string? ValidateBirthDate(DateTime value)
        {
            if (value == default) return "A date of birth is required.";

            var today = DateTime.UtcNow.Date;
            var date = value.Date;
            if (date > today) return "A date of birth cannot be in the future.";

            var age = today.Year - date.Year;
            if (date > today.AddYears(-age)) age--;

            if (age < MinAge) return $"You must be at least {MinAge} to use Vestora.";
            if (age > MaxAge) return "Please check that date of birth.";

            return null;
        }
    }

    /// <summary>
    /// Applies <see cref="AccountRules.ValidatePassword"/> during model binding, so the
    /// rejection arrives as a normal field-level ModelState error the client can attach to
    /// the password input rather than as a bare message.
    /// </summary>
    [AttributeUsage(AttributeTargets.Property)]
    public sealed class PasswordPolicyAttribute : ValidationAttribute
    {
        /// <summary>
        /// Name of a sibling property holding the email, so the password can be checked for
        /// containing it. Optional.
        /// </summary>
        public string? EmailProperty { get; set; }

        protected override ValidationResult? IsValid(object? value, ValidationContext context)
        {
            string? email = null;
            if (!string.IsNullOrEmpty(EmailProperty))
            {
                email = context.ObjectType
                    .GetProperty(EmailProperty)?
                    .GetValue(context.ObjectInstance) as string;
            }

            var error = AccountRules.ValidatePassword(value as string, email);
            return error is null
                ? ValidationResult.Success
                : new ValidationResult(error, new[] { context.MemberName ?? nameof(value) });
        }
    }

    /// <summary>Applies <see cref="AccountRules.ValidateName"/> during model binding.</summary>
    [AttributeUsage(AttributeTargets.Property)]
    public sealed class PersonNameAttribute : ValidationAttribute
    {
        protected override ValidationResult? IsValid(object? value, ValidationContext context)
        {
            var label = context.DisplayName ?? context.MemberName ?? "This field";
            var error = AccountRules.ValidateName(value as string, label);
            return error is null
                ? ValidationResult.Success
                : new ValidationResult(error, new[] { context.MemberName ?? "name" });
        }
    }

    /// <summary>Applies <see cref="AccountRules.ValidatePhone"/> during model binding.</summary>
    [AttributeUsage(AttributeTargets.Property)]
    public sealed class DialablePhoneAttribute : ValidationAttribute
    {
        protected override ValidationResult? IsValid(object? value, ValidationContext context)
        {
            var error = AccountRules.ValidatePhone(value as string);
            return error is null
                ? ValidationResult.Success
                : new ValidationResult(error, new[] { context.MemberName ?? "phone" });
        }
    }

    /// <summary>Applies <see cref="AccountRules.ValidateBirthDate"/> during model binding.</summary>
    [AttributeUsage(AttributeTargets.Property)]
    public sealed class RealisticBirthDateAttribute : ValidationAttribute
    {
        protected override ValidationResult? IsValid(object? value, ValidationContext context)
        {
            if (value is not DateTime dt)
            {
                return new ValidationResult("A valid date of birth is required.",
                    new[] { context.MemberName ?? "birthDate" });
            }

            var error = AccountRules.ValidateBirthDate(dt);
            return error is null
                ? ValidationResult.Success
                : new ValidationResult(error, new[] { context.MemberName ?? "birthDate" });
        }
    }
}
