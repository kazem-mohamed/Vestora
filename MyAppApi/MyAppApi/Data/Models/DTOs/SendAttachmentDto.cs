using System.ComponentModel.DataAnnotations;

namespace MyAppApi.Data.Models.DTOs
{
    public class SendAttachmentDto
    {
        [Required]
        public int ReceiverId { get; set; }

        [StringLength(2000)]
        public string? Caption { get; set; }

        [Required]
        public IFormFile File { get; set; }
    }
}
