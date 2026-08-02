namespace MyAppApi.Data.Models
{
    using System;
    using System.ComponentModel.DataAnnotations;

    public class Reply
    {
        public int Id { get; set; }

        [Required]
        public string Content { get; set; }

        public DateTime CreatedDate { get; set; }

        public int CommentId { get; set; }
        public Comment Comment { get; set; }

        public int UserId { get; set; }
        public User User { get; set; }
    }
}
