using System.ComponentModel.DataAnnotations;

namespace MyAppApi.Data.Models.DTOs
{
    /// <summary>Founder-controlled venture lifecycle: Active | Paused | Closed.</summary>
    public class LifecycleDto
    {
        [Required]
        [StringLength(20)]
        public string Status { get; set; } = string.Empty;
    }

    /// <summary>
    /// How a founder ends a round: Completed | PartiallyRaised | Withdrawn, with an
    /// optional word to the backers who supported it.
    /// </summary>
    public class CloseRoundDto
    {
        [Required]
        [StringLength(20)]
        public string Outcome { get; set; } = string.Empty;

        [StringLength(600)]
        public string? Note { get; set; }
    }
}
