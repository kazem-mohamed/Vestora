namespace MyAppApi.Data.Models
{
    public class Innovator : User
    {
        public ICollection<Project> Projects { get; set; }
    }
}