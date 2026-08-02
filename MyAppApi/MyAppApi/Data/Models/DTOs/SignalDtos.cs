using System;

namespace MyAppApi.Data.Models.DTOs
{
    /// <summary>A kept query, with how much has appeared since its owner last looked.</summary>
    public class SavedSearchDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Scope { get; set; } = "ventures";
        public string? Search { get; set; }
        public string? Sector { get; set; }
        public string? Location { get; set; }
        public string? Stage { get; set; }
        public string? Commitment { get; set; }
        public DateTime CreatedAtUtc { get; set; }
        public DateTime LastSeenAtUtc { get; set; }

        /// <summary>Matches created since LastSeenAtUtc. Computed live, never cached.</summary>
        public int NewMatches { get; set; }

        public int TotalMatches { get; set; }
    }

    public class SaveSearchInput
    {
        public string Name { get; set; } = string.Empty;
        public string Scope { get; set; } = "ventures";
        public string? Search { get; set; }
        public string? Sector { get; set; }
        public string? Location { get; set; }
        public string? Stage { get; set; }
        public string? Commitment { get; set; }
    }

    /// <summary>
    /// "What needs me" separated from "what changed".
    /// <para>
    /// Every count here is something the caller can act on and nobody else can. The
    /// informational totals are kept apart deliberately so a busy inbox never masks a
    /// single blocked decision.
    /// </para>
    /// </summary>
    public class ActionCenterDto
    {
        /// <summary>Sum of the blocking items below — the badge worth showing.</summary>
        public int NeedsAction { get; set; }

        public int QuestionsToAnswer { get; set; }
        public int PendingRequests { get; set; }
        public int DocumentRequestsToFill { get; set; }
        public int ApprovedAwaitingContact { get; set; }

        // ---- Informational: changes, not obligations ----
        public int UnreadMessages { get; set; }
        public int UnreadNotifications { get; set; }
        public int NewFromSavedSearches { get; set; }
    }
}
