using System;

namespace MyAppApi.Data.Models
{
    public class Bookmark
    {
        public int Id { get; set; }

        // Plain indexed column (no FK nav) so the Project cascade below can't form a
        // second cascade path to Bookmarks via User→Project. Orphans from a deleted
        // user are harmless (only ever queried by the current user).
        public int UserId { get; set; }

        public int ProjectId { get; set; }
        public Project Project { get; set; }

        public DateTime CreatedDate { get; set; }
    }
}
