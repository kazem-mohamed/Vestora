namespace MyAppApi.Data.Models
{
    public class UserProjectInteraction
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public int ProjectId { get; set; }
        public DateTime InteractionDate { get; set; } = DateTime.UtcNow;

        public User User { get; set; }
        public Project Project { get; set; }
    }

}
