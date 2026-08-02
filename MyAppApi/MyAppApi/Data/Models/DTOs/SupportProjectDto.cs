using System.ComponentModel.DataAnnotations;

namespace MyAppApi.Data.Models.DTOs
{
    public class SupportProjectDto
    {
        public decimal Amount { get; set; }

        /// <summary>How they want to be reached: "Email", "Phone", "LinkedIn", …</summary>
        [Required]
        [StringLength(40)]
        public string ContactMethod { get; set; } = string.Empty;

        /// <summary>
        /// The actual address or handle.
        /// <para>
        /// This was missing, so every request stored the word "Email" and nothing else —
        /// a founder approving a backer was handed a method with no way to use it, which
        /// broke the follow-up step the whole relationship depends on.
        /// </para>
        /// </summary>
        [StringLength(160)]
        public string? ContactValue { get; set; }
    }
}
