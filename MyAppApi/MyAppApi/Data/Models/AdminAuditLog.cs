using System.ComponentModel.DataAnnotations;

namespace MyAppApi.Data.Models
{
    // A durable record of destructive/moderation actions taken by an admin
    // (delete user, delete project, approve/reject a listing, resolve a report,
    // create an admin). Written alongside the action itself, never edited.
    public class AdminAuditLog
    {
        public int Id { get; set; }

        public int AdminUserId { get; set; }

        public string Action { get; set; } = string.Empty; // e.g. "DeleteProject"

        public string TargetType { get; set; } = string.Empty; // e.g. "Project"

        public int? TargetId { get; set; }

        public string? Details { get; set; }

        // The justification the acting admin gave. Kept in a column of its own rather
        // than folded into Details, because it is the one field a support conversation
        // actually needs to quote back — and searching for it inside a prose string is
        // how a reason ends up unfindable.
        [StringLength(500)]
        public string? Reason { get; set; }

        // The changed fields either side of the action, as small JSON objects. Not the
        // whole row: an audit trail that stores a copy of everything becomes a second
        // database nobody maintains, and the question being answered is "what did this
        // action change", not "what did the record look like".
        public string? BeforeJson { get; set; }

        public string? AfterJson { get; set; }

        // Where the action came from. Worth nothing when one person is the only admin,
        // and worth a great deal the moment there are several.
        [StringLength(64)]
        public string? IpAddress { get; set; }

        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    }
}
