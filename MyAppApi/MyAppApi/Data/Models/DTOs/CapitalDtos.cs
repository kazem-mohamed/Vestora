using System;
using System.Collections.Generic;

namespace MyAppApi.Data.Models.DTOs
{
    /// <summary>
    /// An investor as a founder needs to see them while deciding whether to approach.
    /// <para>
    /// Carries the mandate (what they back, at what size) plus the evidence that the
    /// mandate is real — how many rounds they have actually backed, and how recently.
    /// Deliberately omits every private figure: how much this investor committed to
    /// anything, or to whom, is never exposed here.
    /// </para>
    /// </summary>
    public class InvestorCardDto
    {
        public int Id { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string? BriefBio { get; set; }
        public bool HasAvatar { get; set; }

        // ---- Mandate ----
        public string? InvestmentThesis { get; set; }
        public string? PreferredIndustries { get; set; }
        public decimal? TicketMin { get; set; }
        public decimal? TicketMax { get; set; }

        // ---- Evidence, not claims ----

        /// <summary>Distinct ventures with an approved commitment from this investor.</summary>
        public int BackedCount { get; set; }

        /// <summary>Sectors they have actually backed, which may differ from the stated ones.</summary>
        public List<string> ActiveSectors { get; set; } = new();

        /// <summary>Most recent approved commitment. Null means they have not backed yet.</summary>
        public DateTime? LastBackedAtUtc { get; set; }

        /// <summary>Nullable because accounts created before the column existed have none.</summary>
        public DateTime? JoinedAtUtc { get; set; }

        /// <summary>Open relationships — a signal that they are currently engaging.</summary>
        public int ActiveRelationships { get; set; }

        /// <summary>True when this founder already has a relationship with them.</summary>
        public bool AlreadyConnected { get; set; }
    }

    /// <summary>Filter options for the capital directory, counted over the live listing.</summary>
    public class CapitalFacetsDto
    {
        public List<FacetValueDto> Sectors { get; set; } = new();
        public List<FacetValueDto> TicketBands { get; set; } = new();
        public int Total { get; set; }

        /// <summary>Investors who have backed at least one round.</summary>
        public int WithTrackRecord { get; set; }

        /// <summary>Investors who published a thesis — the ones worth reading first.</summary>
        public int WithThesis { get; set; }
    }
}
