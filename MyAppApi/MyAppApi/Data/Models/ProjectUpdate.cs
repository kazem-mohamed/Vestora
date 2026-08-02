using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace MyAppApi.Data.Models
{
    // A founder-authored progress post shown on the project's Updates timeline.
    public class ProjectUpdate
    {
        public int Id { get; set; }

        [Required]
        [StringLength(150)]
        public string Title { get; set; } = string.Empty;

        [Required]
        public string Body { get; set; } = string.Empty;

        public DateTime CreatedDate { get; set; }

        public int ProjectId { get; set; }
        public Project Project { get; set; } = null!;

        public ICollection<ProjectUpdateImage> Images { get; set; } = new List<ProjectUpdateImage>();
    }
}
