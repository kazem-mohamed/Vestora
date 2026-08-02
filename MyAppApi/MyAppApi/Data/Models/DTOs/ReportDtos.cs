using System.ComponentModel.DataAnnotations;

namespace MyAppApi.Data.Models.DTOs
{
    public class SubmitReportDto
    {
        [Required]
        public int ProjectId { get; set; }

        // Spam | Scam | Copyright | Offensive | Duplicate | Other
        [Required]
        public string Reason { get; set; } = string.Empty;

        [StringLength(600)]
        public string? Details { get; set; }
    }

    public class ReportDto
    {
        public int Id { get; set; }
        public int ProjectId { get; set; }
        public string ProjectName { get; set; } = string.Empty;
        public int ReporterId { get; set; }
        public string ReporterName { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
        public string? Details { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }
}
