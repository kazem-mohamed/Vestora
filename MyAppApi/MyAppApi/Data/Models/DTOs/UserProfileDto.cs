namespace MyAppApi.Data.Models.DTOs
{
    public class UserProfileDto
    {
        public int Id { get; set; }

        public string UserName { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;

        public string UserType { get; set; } = string.Empty;

        public DateTime? BirthDate { get; set; }

        public string? Phone { get; set; }

        public string? BriefBio { get; set; }

        public string? WebsiteUrl { get; set; }

        public string? LinkedinUrl { get; set; }

        public string? TwitterUrl { get; set; }

        // Investor-only; null for Innovator/Admin.
        public string? PreferredIndustries { get; set; }

        

        /// <summary>Investor-only: what they look for, and the cheque they write.</summary>

        public bool NotifyOnFollow { get; set; }

        

        public bool NotifyOnProjectUpdate { get; set; }

        

        public string? InvestmentThesis { get; set; }

        

        public decimal? TicketMin { get; set; }

        

        public decimal? TicketMax { get; set; }

        public bool HasAvatar { get; set; }

        public bool HasCover { get; set; }

        public bool IsEmailVerified { get; set; }
    }

    public class PublicUserProfileDto
    {
        public int Id { get; set; }

        public string UserName { get; set; } = string.Empty;

        public string UserType { get; set; } = string.Empty;

        public string? BriefBio { get; set; }

        public bool HasAvatar { get; set; }
    }

    // Full public profile shown on /u/{id} — identity + live stats, plus the
    // viewer-relative follow relationship. Money stays private: only counts here.
    public class PublicProfileDetailDto
    {
        public int Id { get; set; }

        public string UserName { get; set; } = string.Empty;

        public string UserType { get; set; } = string.Empty;

        public string? BriefBio { get; set; }

        public string? WebsiteUrl { get; set; }

        public string? LinkedinUrl { get; set; }

        public string? TwitterUrl { get; set; }

        // Investor-only; null for Innovator/Admin.
        public string? PreferredIndustries { get; set; }

        

        /// <summary>Investor-only: what they look for, and the cheque they write.</summary>

        public string? InvestmentThesis { get; set; }

        

        public decimal? TicketMin { get; set; }

        

        public decimal? TicketMax { get; set; }

        public bool HasAvatar { get; set; }

        public bool HasCover { get; set; }

        public DateTime? JoinedAtUtc { get; set; }

        public int FollowersCount { get; set; }

        public int FollowingCount { get; set; }

        // Innovator: ventures they own. Investor: ventures they've backed (approved).
        public int ProjectsCount { get; set; }

        public int BackedCount { get; set; }

        // Relative to the current (optional) viewer.
        public bool IsFollowedByMe { get; set; }

        public bool IsMe { get; set; }

        // Projects where a TeamMember row's Email matches this user's Email
        // (case-insensitive, matched at read time — see UsersController.GetPublicProfile).
        public List<TeamMembershipDto> TeamMemberships { get; set; } = new();

        /// <summary>
        /// What the platform can prove about this member. Public because every input is
        /// already public on this page (join date, rounds backed, endorsements received,
        /// whether a mandate is stated) — the only thing added is an honest label.
        /// <para>
        /// Deliberately not a score and never a "Verified" badge: Vestora confirms an
        /// email address and reviews listings, and verifies nothing about anyone's
        /// identity, company or funds.
        /// </para>
        /// </summary>
        public List<TrustSignalDto> TrustSignals { get; set; } = new();
    }

    public class TeamMembershipDto
    {
        public int ProjectId { get; set; }

        public string ProjectName { get; set; } = string.Empty;

        public string? Role { get; set; }
    }
}
