namespace MyAppApi.Data.Models
{
    // A directed follow edge between two users.
    // FollowerId / FollowedId are plain indexed ints with NO FK navigation — the
    // same deliberate choice as Bookmark: two FKs into Users would create multiple
    // cascade paths, and orphans from a deleted user are harmless here.
    public class Follow
    {
        public int Id { get; set; }

        // The user who follows.
        public int FollowerId { get; set; }

        // The user being followed.
        public int FollowedId { get; set; }

        public DateTime CreatedDate { get; set; }
    }
}
