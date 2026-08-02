using Microsoft.EntityFrameworkCore;
using MyAppApi.Data.Models;

namespace MyAppApi.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<Investor> Investors { get; set; }
        public DbSet<Innovator> Innovators { get; set; }
        public DbSet<Project> Projects { get; set; }
        public DbSet<Investment> Investments { get; set; }
        public DbSet<Message> Messages { get; set; }
        public DbSet<MessageAttachment> MessageAttachments { get; set; }
        // Relationship workspace: the questions and document requests a deal produces.
        public DbSet<DealQuestion> DealQuestions { get; set; }
        public DbSet<DocumentRequest> DocumentRequests { get; set; }

        // Kept discovery queries, used to surface new matches in-app.
        public DbSet<SavedSearch> SavedSearches { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<RefreshToken> RefreshTokens { get; set; }
        public DbSet<SecurityLog> SecurityLogs { get; set; }
        public DbSet<UserProjectInteraction> UserProjectInteractions { get; set; }
        public DbSet<Comment> Comments { get; set; } // إضافة DbSet للتعليقات
        public DbSet<Reply> Replies { get; set; }   // إضافة DbSet للردود
        public DbSet<ProjectImage> ProjectImages { get; set; }
        public DbSet<Bookmark> Bookmarks { get; set; }
        public DbSet<ProjectUpdate> ProjectUpdates { get; set; }
        public DbSet<ProjectUpdateImage> ProjectUpdateImages { get; set; }
        public DbSet<Milestone> Milestones { get; set; }
        public DbSet<TeamMember> TeamMembers { get; set; }
        public DbSet<ProjectDocument> ProjectDocuments { get; set; }
        public DbSet<Follow> Follows { get; set; }
        public DbSet<Report> Reports { get; set; }
        public DbSet<ProjectView> ProjectViews { get; set; }
        public DbSet<Review> Reviews { get; set; }
        public DbSet<AdminAuditLog> AdminAuditLogs { get; set; }
        public DbSet<DocumentDownloadLog> DocumentDownloadLogs { get; set; }

        // Funding: the founder's call for the agreed money, each attempt to settle it,
        // and every provider confirmation we have accepted. See FundingMath for why
        // "approved" and "funded" are no longer the same number.
        public DbSet<FundingRequest> FundingRequests { get; set; }
        public DbSet<PaymentTransaction> PaymentTransactions { get; set; }
        public DbSet<PaymentEvent> PaymentEvents { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // إعداد `Discriminator` لتحديد نوع المستخدم بين `Investor` و `Innovator`
            modelBuilder.Entity<User>()
                .HasDiscriminator<string>("UserType")
                .HasValue<Investor>("Investor")
                .HasValue<Innovator>("Innovator")
                .HasValue<Admin>("Admin");

            // إعداد العلاقات بين الكيانات

            // العلاقة بين `Project` و `Innovator` (المالك)
            modelBuilder.Entity<Project>()
                .HasOne(p => p.Owner)
                .WithMany(i => i.Projects)
                .HasForeignKey(p => p.OwnerId)
                .OnDelete(DeleteBehavior.Cascade);

            // العلاقة بين `Investment` و `Investor` (علاقة اختيارية)
            modelBuilder.Entity<Investment>()
                .HasOne(inv => inv.Investor)
                .WithMany(i => i.Investments)
                .HasForeignKey(inv => inv.InvestorId)
                .OnDelete(DeleteBehavior.Restrict);

            // العلاقة بين `Message` و `User` (المرسل والمستقبل)
            modelBuilder.Entity<Message>()
                .HasOne(m => m.Sender)
                .WithMany(u => u.SentMessages)
                .HasForeignKey(m => m.SenderId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Message>()
                .HasOne(m => m.Receiver)
                .WithMany(u => u.ReceivedMessages)
                .HasForeignKey(m => m.ReceiverId)
                .OnDelete(DeleteBehavior.Restrict);

            // 1:1 Message ⇄ MessageAttachment sharing the MessageId key; the blob
            // cascades away with its message.
            modelBuilder.Entity<MessageAttachment>()
                .HasKey(a => a.MessageId);
            modelBuilder.Entity<MessageAttachment>()
                .HasOne(a => a.Message)
                .WithOne()
                .HasForeignKey<MessageAttachment>(a => a.MessageId)
                .OnDelete(DeleteBehavior.Cascade);

            // Money columns: explicit precision so SQL Server doesn't fall back to
            // decimal(18,0) and silently truncate every fractional value.
            modelBuilder.Entity<Investment>()
                .Property(i => i.Amount)
                .HasPrecision(18, 2)
                .IsRequired();

            modelBuilder.Entity<Project>()
                .Property(p => p.InvestmentNeeded)
                .HasPrecision(18, 2)
                .IsRequired();

            modelBuilder.Entity<Project>()
                .Property(p => p.Valuation)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Project>()
                .Property(p => p.EquityOffered)
                .HasPrecision(5, 2);

            // Investor ticket range — money, so same precision as every other amount.
            modelBuilder.Entity<Investor>()
                .Property(i => i.TicketMin)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Investor>()
                .Property(i => i.TicketMax)
                .HasPrecision(18, 2);

            // Every public browse query filters on these two then orders by date.
            modelBuilder.Entity<Project>()
                .HasIndex(p => new { p.ModerationStatus, p.LifecycleStatus, p.CreatedDate });

            // Stage is the browse feed's primary facet.
            modelBuilder.Entity<Project>()
                .HasIndex(p => p.Stage);

            // إضافة قيود إضافية إذا لزم الأمر
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();

            modelBuilder.Entity<User>()
                .HasMany(u => u.RefreshTokens)
                .WithOne(rt => rt.User)
                .HasForeignKey(rt => rt.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<User>()
                .HasMany(u => u.SecurityLogs)
                .WithOne(sl => sl.User)
                .HasForeignKey(sl => sl.UserId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<RefreshToken>()
                .HasIndex(rt => rt.TokenHash)
                .IsUnique();

            modelBuilder.Entity<SecurityLog>()
                .HasIndex(sl => new { sl.UserId, sl.CreatedAtUtc });

            modelBuilder.Entity<Notification>()
                .HasOne(n => n.Project)
                .WithMany()
                .HasForeignKey(n => n.ProjectId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Notification>()
                .HasOne(n => n.Investment)
                .WithMany()
                .HasForeignKey(n => n.InvestmentId)
                .OnDelete(DeleteBehavior.ClientSetNull);

            modelBuilder.Entity<Notification>()
                .HasOne(n => n.ActorUser)
                .WithMany()
                .HasForeignKey(n => n.ActorUserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<UserProjectInteraction>()
                .HasOne(up => up.User)
                .WithMany(u => u.UserProjectInteractions)
                .HasForeignKey(up => up.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<UserProjectInteraction>()
                .HasOne(up => up.Project)
                .WithMany(p => p.UserProjectInteractions)
                .HasForeignKey(up => up.ProjectId)
                .OnDelete(DeleteBehavior.Restrict);

            // إعداد العلاقة بين التعليقات والمشاريع
            modelBuilder.Entity<Comment>()
                .HasOne(c => c.Project)
                .WithMany(p => p.Comments)
                .HasForeignKey(c => c.ProjectId);

            modelBuilder.Entity<Comment>()
                .HasOne(c => c.User)
                .WithMany(u => u.Comments)
                .HasForeignKey(c => c.UserId);

            // العلاقة بين صور المشروع والمشروع
            modelBuilder.Entity<ProjectImage>()
                .HasOne(pi => pi.Project)
                .WithMany(p => p.Images)
                .HasForeignKey(pi => pi.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            // F5 Storytelling: updates (+ their images) and milestones cascade from the project.
            modelBuilder.Entity<ProjectUpdate>()
                .HasOne(u => u.Project)
                .WithMany(p => p.Updates)
                .HasForeignKey(u => u.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ProjectUpdateImage>()
                .HasOne(im => im.ProjectUpdate)
                .WithMany(u => u.Images)
                .HasForeignKey(im => im.ProjectUpdateId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Milestone>()
                .HasOne(m => m.Project)
                .WithMany(p => p.Milestones)
                .HasForeignKey(m => m.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<TeamMember>()
                .HasOne(t => t.Project)
                .WithMany(p => p.Team)
                .HasForeignKey(t => t.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ProjectDocument>()
                .HasOne(d => d.Project)
                .WithMany(p => p.Documents)
                .HasForeignKey(d => d.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            // Bookmarks: one per (user, project); cascade only from Project (UserId has no FK).
            modelBuilder.Entity<Bookmark>()
                .HasIndex(b => new { b.UserId, b.ProjectId })
                .IsUnique();

            modelBuilder.Entity<Bookmark>()
                .HasOne(b => b.Project)
                .WithMany()
                .HasForeignKey(b => b.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            // Follows: one edge per (follower, followed). Plain int keys with no FK
            // navs (same rationale as Bookmark) — two FKs into Users would create
            // multiple cascade paths; orphans from a deleted user are harmless.
            modelBuilder.Entity<Follow>()
                .HasIndex(f => new { f.FollowerId, f.FollowedId })
                .IsUnique();

            modelBuilder.Entity<Follow>()
                .HasIndex(f => f.FollowedId);

            // F9 Reports: cascade from Project; ReporterId has no FK. Indexed by status.
            modelBuilder.Entity<Report>()
                .HasOne(r => r.Project)
                .WithMany()
                .HasForeignKey(r => r.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Report>()
                .HasIndex(r => new { r.ProjectId, r.Status });

            // F10 ProjectViews: cascade from Project; indexed for time-series analytics.
            modelBuilder.Entity<ProjectView>()
                .HasOne(v => v.Project)
                .WithMany(p => p.ProjectViews)
                .HasForeignKey(v => v.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ProjectView>()
                .HasIndex(v => new { v.ProjectId, v.CreatedAt });

            // F10 Reviews: one per (project, investor); cascade from Project.
            modelBuilder.Entity<Review>()
                .HasOne(r => r.Project)
                .WithMany(p => p.Reviews)
                .HasForeignKey(r => r.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Review>()
                .HasIndex(r => new { r.ProjectId, r.InvestorId })
                .IsUnique();

            // إعداد العلاقة بين الردود والتعليقات
            modelBuilder.Entity<Reply>()
                .HasOne(r => r.Comment)
                .WithMany(c => c.Replies)
                .HasForeignKey(r => r.CommentId);

            modelBuilder.Entity<Reply>()
                .HasOne(r => r.User)
                .WithMany(u => u.Replies)
                .HasForeignKey(r => r.UserId);
            // Adjust the Comment entity relationships
            modelBuilder.Entity<Comment>()
                .HasOne(c => c.Project)
                .WithMany(p => p.Comments)
                .HasForeignKey(c => c.ProjectId)
                .OnDelete(DeleteBehavior.Restrict); // Changed to Restrict

            modelBuilder.Entity<Comment>()
                .HasOne(c => c.User)
                .WithMany(u => u.Comments)
                .HasForeignKey(c => c.UserId)
                .OnDelete(DeleteBehavior.Restrict); // Changed to Restrict

            // Adjust the Reply entity relationships
            modelBuilder.Entity<Reply>()
                .HasOne(r => r.Comment)
                .WithMany(c => c.Replies)
                .HasForeignKey(r => r.CommentId)
                .OnDelete(DeleteBehavior.Restrict); // Changed to Restrict

            modelBuilder.Entity<Reply>()
                .HasOne(r => r.User)
                .WithMany(u => u.Replies)
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Restrict); // Changed to Restrict

            // Soft delete: deleted rows are hidden from every LINQ query automatically
            // (Find included) unless a caller opts out with IgnoreQueryFilters().
            // Applied on the User base type — EF Core TPH derived types (Investor/
            // Innovator/Admin) inherit it since they don't declare their own filter.
            modelBuilder.Entity<User>().HasQueryFilter(u => !u.IsDeleted);
            modelBuilder.Entity<Project>().HasQueryFilter(p => !p.IsDeleted);

            modelBuilder.Entity<DocumentDownloadLog>()
                .HasOne(d => d.ProjectDocument)
                .WithMany()
                .HasForeignKey(d => d.ProjectDocumentId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<DocumentDownloadLog>()
                .HasIndex(d => new { d.ProjectDocumentId, d.DownloadedAtUtc });

            modelBuilder.Entity<AdminAuditLog>()
                .HasIndex(a => a.CreatedAtUtc);

            // Every funding figure in the app filters Investments by Status, and
            // the pipeline boards filter by Stage — index both.
            modelBuilder.Entity<Investment>()
                .HasIndex(i => new { i.ProjectId, i.Status });

            modelBuilder.Entity<Investment>()
                .HasIndex(i => new { i.InvestorId, i.Stage });

            // ---- Relationship workspace ----

            // A deal's questions load as one list ordered by age, every time.
            modelBuilder.Entity<DealQuestion>()
                .HasOne(q => q.Investment)
                .WithMany()
                .HasForeignKey(q => q.InvestmentId)
                .OnDelete(DeleteBehavior.Cascade);

            // Restrict on the actors: a question is part of the relationship record,
            // so removing a user must not quietly erase what they asked or answered.
            modelBuilder.Entity<DealQuestion>()
                .HasOne(q => q.AskedByUser)
                .WithMany()
                .HasForeignKey(q => q.AskedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<DealQuestion>()
                .HasOne(q => q.AnsweredByUser)
                .WithMany()
                .HasForeignKey(q => q.AnsweredByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<DealQuestion>()
                .HasIndex(q => new { q.InvestmentId, q.CreatedAtUtc });

            modelBuilder.Entity<DocumentRequest>()
                .HasOne(r => r.Investment)
                .WithMany()
                .HasForeignKey(r => r.InvestmentId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<DocumentRequest>()
                .HasOne(r => r.RequestedByUser)
                .WithMany()
                .HasForeignKey(r => r.RequestedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            // If the fulfilling document is removed the request stays, unlinked and
            // open again, rather than disappearing with it.
            //
            // NoAction rather than SetNull: both this table and ProjectDocuments reach
            // Projects by cascade, and SQL Server refuses the resulting multiple
            // cascade paths. The unlink is therefore done explicitly when a document
            // is deleted (see ProjectStoryController.DeleteDocument), which is also
            // the only place that can reopen the request honestly.
            modelBuilder.Entity<DocumentRequest>()
                .HasOne(r => r.FulfilledByDocument)
                .WithMany()
                .HasForeignKey(r => r.FulfilledByDocumentId)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<DocumentRequest>()
                .HasIndex(r => new { r.InvestmentId, r.Status });

            // ---- Saved searches ----
            modelBuilder.Entity<SavedSearch>()
                .HasOne(s => s.User)
                .WithMany()
                .HasForeignKey(s => s.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<SavedSearch>()
                .HasIndex(s => new { s.UserId, s.Scope });

            // ---- Contextual messaging ----
            // SetNull, not Cascade: a deleted venture must not take the conversation
            // with it — the two people still said those things to each other.
            modelBuilder.Entity<Message>()
                .HasOne(m => m.Project)
                .WithMany()
                .HasForeignKey(m => m.ProjectId)
                .OnDelete(DeleteBehavior.SetNull);

            // Thread loads are always (pair, venture) scoped.
            modelBuilder.Entity<Message>()
                .HasIndex(m => new { m.ProjectId, m.SentAt });

            // Directory listings filter on this before anything else.
            modelBuilder.Entity<Investor>()
                .HasIndex(i => i.ListedInDirectory);

            // Closed rounds are excluded from live browse and listed in archives.
            modelBuilder.Entity<Project>()
                .HasIndex(p => p.RoundClosedAtUtc);

            ConfigureFunding(modelBuilder);
        }

        /// <summary>
        /// The funding tables.
        /// <para>
        /// Three constraints here carry the integrity of the whole payment system, and
        /// they are database constraints rather than service-layer checks on purpose —
        /// application code loses races, indexes do not.
        /// </para>
        /// </summary>
        private static void ConfigureFunding(ModelBuilder modelBuilder)
        {
            // ---- Funding requests ----

            modelBuilder.Entity<FundingRequest>()
                .HasOne(f => f.Investment)
                .WithMany(i => i.FundingRequests)
                .HasForeignKey(f => f.InvestmentId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<FundingRequest>()
                .Property(f => f.Amount)
                .HasPrecision(18, 2)
                .IsRequired();

            modelBuilder.Entity<FundingRequest>()
                .HasIndex(f => f.Reference)
                .IsUnique();

            // (1) At most one open request per relationship. Two live asks for the same
            // investment would let one deal be funded twice.
            modelBuilder.Entity<FundingRequest>()
                .HasIndex(f => f.InvestmentId)
                .IsUnique()
                .HasFilter($"[Status] = '{FundingRequestStatus.Open}'")
                .HasDatabaseName("UX_FundingRequests_OneOpenPerInvestment");

            modelBuilder.Entity<FundingRequest>()
                .HasIndex(f => new { f.ProjectId, f.Status });

            modelBuilder.Entity<FundingRequest>()
                .HasIndex(f => new { f.InvestorId, f.Status });

            // ---- Payment transactions ----

            modelBuilder.Entity<PaymentTransaction>()
                .HasOne(t => t.FundingRequest)
                .WithMany(f => f.Transactions)
                .HasForeignKey(t => t.FundingRequestId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<PaymentTransaction>()
                .Property(t => t.Amount)
                .HasPrecision(18, 2)
                .IsRequired();

            modelBuilder.Entity<PaymentTransaction>()
                .Property(t => t.FeeAmount)
                .HasPrecision(18, 2)
                .IsRequired();

            modelBuilder.Entity<PaymentTransaction>()
                .Property(t => t.NetToFounder)
                .HasPrecision(18, 2)
                .IsRequired();

            modelBuilder.Entity<PaymentTransaction>()
                .HasIndex(t => t.Reference)
                .IsUnique();

            // (2) One live attempt per request — no two ways to pay the same ask at once.
            // (3) One settled attempt per request. Even if every other guard failed, the
            //     database refuses to record the same funding twice.
            //
            // Both cover the same column, so each needs an explicit model name: EF keys
            // indexes by their property list, and two anonymous ones would collapse into
            // whichever was declared last — silently losing a constraint that money
            // depends on.
            modelBuilder.Entity<PaymentTransaction>()
                .HasIndex(t => t.FundingRequestId, "UX_PaymentTransactions_OneActivePerRequest")
                .IsUnique()
                .HasFilter($"[Status] IN ('{PaymentStatus.Initiated}', '{PaymentStatus.Processing}')");

            modelBuilder.Entity<PaymentTransaction>()
                .HasIndex(t => t.FundingRequestId, "UX_PaymentTransactions_OneSucceededPerRequest")
                .IsUnique()
                .HasFilter($"[Status] = '{PaymentStatus.Succeeded}'");

            // Funding sums scan by project and status; the investor surface by investor.
            modelBuilder.Entity<PaymentTransaction>()
                .HasIndex(t => new { t.ProjectId, t.Status });

            modelBuilder.Entity<PaymentTransaction>()
                .HasIndex(t => new { t.InvestorId, t.Status });

            modelBuilder.Entity<PaymentTransaction>()
                .HasIndex(t => t.ProviderSessionId);

            modelBuilder.Entity<PaymentTransaction>()
                .HasIndex(t => t.SucceededAtUtc);

            // ---- Provider events ----

            // (4) The idempotency gate. A resent webhook, a double-verified return trip,
            // and a webhook racing that return trip all collide here — before a single
            // funding figure has moved.
            modelBuilder.Entity<PaymentEvent>()
                .HasIndex(e => new { e.Provider, e.ProviderEventId })
                .IsUnique()
                .HasDatabaseName("UX_PaymentEvents_ProviderEventId");

            modelBuilder.Entity<PaymentEvent>()
                .HasIndex(e => e.ReceivedAtUtc);
        }
    }
}
