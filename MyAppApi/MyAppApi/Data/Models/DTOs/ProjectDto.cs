using System.ComponentModel.DataAnnotations;

namespace MyAppApi.Data.Models.DTOs
{
    public class ProjectDto
    {
        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        public string Description { get; set; } = string.Empty;

        [Url]
        public string? VideoUrl { get; set; }

        [StringLength(100)]
        public string? Topic { get; set; }

        [StringLength(100)]
        public string? Category { get; set; }

        [StringLength(100)]
        public string? Industry { get; set; }

        [StringLength(150)]
        public string? Location { get; set; }

        public decimal InvestmentNeeded { get; set; }

        [StringLength(50)]
        public string? Stage { get; set; }

        public decimal? Valuation { get; set; }

        public decimal? EquityOffered { get; set; }

        [StringLength(1000)]
        public string? UseOfFunds { get; set; }
    }
}
