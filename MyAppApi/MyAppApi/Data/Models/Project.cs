using System.ComponentModel.DataAnnotations;

namespace MyAppApi.Data.Models
{
    public class Project
    {
        public int Id { get; set; }

        [Required]
        [StringLength(100)]
        public string Name { get; set; }

        [Required]
        public string Description { get; set; }

        [Url]
        public string? VideoUrl { get; set; } // Nullable إذا كانت اختيارية

        [StringLength(100)]
        public string? Topic { get; set; } // Nullable إذا كانت اختيارية

        [StringLength(100)]
        public string? Category { get; set; }

        [StringLength(100)]
        public string? Industry { get; set; }

        [StringLength(150)]
        public string? Location { get; set; }

        [Required]
        public decimal InvestmentNeeded { get; set; }
        public DateTime CreatedDate { get; set; }

        public int OwnerId { get; set; }
        public Innovator Owner { get; set; }

        // New properties
        public int InvestorCount { get; set; }
        public int TotalInteractions { get; set; }

        // Moderation gate: new projects start hidden from public browse/details
        // until an admin reviews them. "PendingReview" | "Approved" | "Rejected".
        // Deliberately a separate field from the computed funding "Status" in ProjectsDto.
        [StringLength(20)]
        public string ModerationStatus { get; set; } = "PendingReview";

        // Why a listing was rejected / what needs changing — stored (not just
        // sent in a notification) so both the admin queue and the founder can
        // read it later.
        [StringLength(500)]
        public string? ModerationNote { get; set; }

        public DateTime? ModeratedAtUtc { get; set; }

        // Founder-controlled lifecycle, independent of admin moderation:
        // Active  — open to new support requests (default)
        // Paused  — temporarily hidden from browse, keeps all data
        // Closed  — the round is over; stays visible but takes no new requests
        [StringLength(20)]
        public string LifecycleStatus { get; set; } = "Active";

        // When the founder closed the round, and how they characterised the outcome.
        // A round that stays "raising" forever is the single least honest thing a
        // fundraising surface can do — after closing, the listing becomes a record of
        // what happened rather than an open ask. Nothing is deleted: commitments,
        // relationships and the data room all survive, they simply stop being live.
        public DateTime? RoundClosedAtUtc { get; set; }

        // "Completed" — the round reached what the founder was looking for.
        // "PartiallyRaised" — closed with less than the goal in commitments.
        // "Withdrawn" — closed without proceeding.
        // Stated by the founder, never inferred from the numbers alone, because only
        // they know whether a round that hit 60% was a success or an abandonment.
        [StringLength(20)]
        public string? RoundOutcome { get; set; }

        [StringLength(600)]
        public string? RoundClosingNote { get; set; }

        // Minimal deal terms so a listing represents an actual investment
        // opportunity, not just a name + a target number.
        [StringLength(50)]
        public string? Stage { get; set; } // e.g. "Idea", "Pre-seed", "Seed", "Growth"

        public decimal? Valuation { get; set; }

        // Percentage of equity offered for the InvestmentNeeded amount, 0-100.
        public decimal? EquityOffered { get; set; }

        [StringLength(1000)]
        public string? UseOfFunds { get; set; }

        // Soft delete: hidden via a global query filter (see AppDbContext), never
        // physically removed, so admin/owner deletes are reversible and don't
        // require manually cascading every dependent table.
        public bool IsDeleted { get; set; }

        public ICollection<Investment> Investments { get; set; } // إضافة خاصية Investments
        public ICollection<UserProjectInteraction> UserProjectInteractions { get; set; }

        // New: Relationship with comments
        public ICollection<Comment> Comments { get; set; }

        // New: Uploaded project images
        public ICollection<ProjectImage> Images { get; set; }

        // F5 Storytelling
        public ICollection<ProjectUpdate> Updates { get; set; }
        public ICollection<Milestone> Milestones { get; set; }
        public ICollection<TeamMember> Team { get; set; }
        public ICollection<ProjectDocument> Documents { get; set; }

        // Inverse navigations for the browse feed's discovery signals (view count,
        // rating). The FKs and indexes already exist — these only let a projection
        // count them without a second round trip. No schema change.
        public ICollection<ProjectView> ProjectViews { get; set; }
        public ICollection<Review> Reviews { get; set; }
    }
}
