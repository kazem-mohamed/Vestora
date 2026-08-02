using System;
using System.Collections.Generic;

namespace MyAppApi.Data.Models.DTOs
{
    /// <summary>
    /// Lightweight projection for the public browse feed. Deliberately excludes the
    /// full Description, UseOfFunds, VideoUrl and every moderation field — the browse
    /// card never renders them, and ModerationNote is an internal admin note.
    /// </summary>
    public class ProjectCardDto
    {
        public int Id { get; set; }

        public string Name { get; set; } = string.Empty;

        /// <summary>One-line pitch. The fastest way to understand what a venture does.</summary>
        public string? Topic { get; set; }

        public string? Category { get; set; }

        public string? Industry { get; set; }

        public string? Location { get; set; }

        /// <summary>Idea / Pre-seed / Seed / Series A / Growth — the investor's first filter.</summary>
        public string? Stage { get; set; }

        public decimal InvestmentNeeded { get; set; }

        /// <summary>Sum of APPROVED commitments. No money has moved — never label this "raised".</summary>
        public decimal CommittedAmount { get; set; }

        /// <summary>
        /// Money that actually settled. This is the figure a card leads with; committed
        /// sits behind it as the secondary reading.
        /// </summary>
        public decimal FundedAmount { get; set; }

        public decimal? EquityOffered { get; set; }

        public int OwnerId { get; set; }

        public string OwnerName { get; set; } = string.Empty;

        /// <summary>Distinct investors with an approved commitment.</summary>
        public int BackerCount { get; set; }

        /// <summary>Distinct investors whose payment settled.</summary>
        public int FundedBackerCount { get; set; }

        public DateTime CreatedDate { get; set; }

        /// <summary>Single cover image; the browse card only ever shows one.</summary>
        public int? CoverImageId { get; set; }

        /// <summary>True once approved commitments cover the full round.</summary>
        public bool IsFullyCommitted { get; set; }

        /// <summary>True once settled money covers the full round. The stronger claim.</summary>
        public bool IsFullyFunded { get; set; }

        /// <summary>Funded | Fully Committed | Raising — see FundingMath.PublicStatus.</summary>
        public string FundingStatus { get; set; } = "Raising";

        // ---- Real discovery signals (all derived from stored data, never invented) ----

        /// <summary>Tracked project views. Powers the "most viewed" sort.</summary>
        public int ViewCount { get; set; }

        /// <summary>When the founder last published an update — the venture's liveness signal.</summary>
        public DateTime? LastUpdateAt { get; set; }

        public double? AverageRating { get; set; }

        public int ReviewCount { get; set; }
    }

    /// <summary>A filter value plus how many ventures actually match it.</summary>
    public class FacetValueDto
    {
        public string Value { get; set; } = string.Empty;
        public int Count { get; set; }
    }

    /// <summary>
    /// Filter options derived from the live, visible inventory — so the UI can never
    /// offer a choice that leads to an empty result.
    /// </summary>
    public class ProjectFacetsDto
    {
        public List<FacetValueDto> Stages { get; set; } = new();
        public List<FacetValueDto> Sectors { get; set; } = new();
        public List<FacetValueDto> Locations { get; set; } = new();
        public int Total { get; set; }
        public int Open { get; set; }
        public int FullyCommitted { get; set; }

        /// <summary>Rounds where the money actually arrived — a stricter count than FullyCommitted.</summary>
        public int FullyFunded { get; set; }
    }
}
