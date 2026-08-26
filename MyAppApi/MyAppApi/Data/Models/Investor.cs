namespace MyAppApi.Data.Models
{
    using System.ComponentModel.DataAnnotations;

    public class Investor : User
    {
        // Free-text, comma-separated (e.g. "FinTech, Healthcare, Climate Tech") —
        // unlike Project.Category (a closed key set), an investor's stated interests
        // stay free text so a preference is never blocked by a missing category.
        [StringLength(500)]
        public string? PreferredIndustries { get; set; }

        // What this investor is looking for, in their own words. Shown on their
        // public profile and — more importantly — beside their request in the
        // founder's pipeline, where "should I take this conversation?" is
        // currently answered by a name and a contact address alone.
        [StringLength(500)]
        public string? InvestmentThesis { get; set; }

        // The cheque size they typically write. Both optional: an investor may
        // state a floor, a ceiling, both, or neither.
        public decimal? TicketMin { get; set; }

        public decimal? TicketMax { get; set; }

        // Whether founders may find this investor in the capital directory.
        //
        // Being discoverable is the point of stating a mandate, so this defaults to
        // on — but it has to be refusable. An investor who does not want inbound
        // approaches can withdraw from the directory without deleting the mandate
        // that their existing relationships and the founder's pipeline still rely on.
        // Their profile stays reachable by direct link; only the listing drops them.
        public bool ListedInDirectory { get; set; } = true;

        public ICollection<Investment> Investments { get; set; }
    }
}