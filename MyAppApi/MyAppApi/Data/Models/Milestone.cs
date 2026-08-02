using System;
using System.ComponentModel.DataAnnotations;

namespace MyAppApi.Data.Models
{
    // A stage on the project's roadmap/journey (idea → research → MVP → launch → …).
    public class Milestone
    {
        public int Id { get; set; }

        [Required]
        [StringLength(100)]
        public string Title { get; set; } = string.Empty;

        [StringLength(500)]
        public string? Description { get; set; }

        // "Planned" | "InProgress" | "Done"
        public string Status { get; set; } = "Planned";

        public int Progress { get; set; } // 0..100

        public int SortOrder { get; set; }

        public DateTime? Date { get; set; } // target or achieved date

        public int ProjectId { get; set; }
        public Project Project { get; set; } = null!;
    }
}
