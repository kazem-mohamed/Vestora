namespace MyAppApi.Data.Models.DTOs
{
    /// <summary>One record the administrator might have been looking for.</summary>
    public class AdminSearchHitDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Subtitle { get; set; }

        /// <summary>Status, role or stage — whatever this kind of record is defined by.</summary>
        public string? Badge { get; set; }

        /// <summary>Removed or suspended. Shown, not hidden — it is usually why they searched.</summary>
        public bool Muted { get; set; }

        public string Href { get; set; } = string.Empty;
    }

    /// <summary>
    /// Results grouped by what they are, rather than merged into one ranked list.
    /// <para>
    /// A payment reference and a person's name are not comparable, so nothing here
    /// pretends to sort them against each other.
    /// </para>
    /// </summary>
    public class AdminSearchResultsDto
    {
        public string Query { get; set; } = string.Empty;
        public List<AdminSearchHitDto> Users { get; set; } = new();
        public List<AdminSearchHitDto> Ventures { get; set; } = new();
        public List<AdminSearchHitDto> Deals { get; set; } = new();
        public List<AdminSearchHitDto> Transactions { get; set; } = new();
        public List<AdminSearchHitDto> Reports { get; set; } = new();
    }

    /// <summary>
    /// The states that want a human, counted against thresholds somebody chose on purpose.
    /// <para>
    /// Deliberately not anomaly detection. A platform this size has no baseline to
    /// deviate from, so a model would produce confident nonsense; every number here is a
    /// count against a stated rule, and <see cref="ReportThreshold"/> is returned so the
    /// screen can say what the rule was rather than asserting something is wrong.
    /// </para>
    /// </summary>
    public class AdminAlertsDto
    {
        public int PendingReview { get; set; }
        public int OpenReports { get; set; }
        public int LockedAccounts { get; set; }
        public int SuspendedAccounts { get; set; }

        /// <summary>Ventures carrying at least <see cref="ReportThreshold"/> open reports.</summary>
        public List<AdminFlaggedVentureDto> HeavilyReported { get; set; } = new();

        public int ReportThreshold { get; set; }

        /// <summary>
        /// Confirmations the system could not act on that are old enough to be a problem
        /// rather than a race still in flight.
        /// </summary>
        public int StaleUnappliedEvents { get; set; }

        public int StaleEventHours { get; set; }

        /// <summary>Payments that failed recently — a spike is worth a look at the provider.</summary>
        public int RecentFailedPayments { get; set; }

        public int FailedPaymentDays { get; set; }
    }

    public class AdminFlaggedVentureDto
    {
        public int ProjectId { get; set; }
        public string Name { get; set; } = string.Empty;
        public int OpenReports { get; set; }
    }
}
