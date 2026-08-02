#import "/lib/vestora.typ": *
#import "/lib/theme.typ": *

= Database Schema and Data Dictionary <app:schema>

The schema holds more than forty tables. @ch:database documents the ones whose
columns encode rules; this appendix lists the whole set by group, with the
relationship and delete behaviour of each.

The authoritative definition is the Entity Framework configuration in
`AppDbContext` together with the migration history (§7.7). Nothing here is
maintained by hand independently of that source.

== Identity and Access

#figure(
  table(
    columns: (36mm, 1fr, 32mm),
    align: (left + top, left + top, left + top),
    table.header([Table], [Purpose and key columns], [Rules]),
    [`Users`], [Accounts. `Email`, `PasswordHash`, `UserType` discriminator,
      `EmailVerified`, `FailedLoginAttempts`, `LockoutEndUtc`, `LastSeenUtc`.],
      [`Email` unique.],
    [`Investors`], [Investor specialisation (table-per-hierarchy).],
      [Discriminator `Investor`.],
    [`Innovators`], [Founder specialisation (table-per-hierarchy).],
      [Discriminator `Innovator`.],
    [`RefreshTokens`], [Hashed refresh tokens with expiry and rotation state.],
      [`TokenHash` unique; cascade from user.],
    [`SecurityLogs`], [Authentication and security events.],
      [Indexed `(UserId, CreatedAtUtc)`; user reference set null on delete.],
    [`AdminAuditLogs`], [Administrative actions against the acting
      administrator.], [Retained independently of the target row.],
  ),
  caption: [Identity and access tables.],
)

== Ventures

#figure(
  table(
    columns: (36mm, 1fr, 32mm),
    align: (left + top, left + top, left + top),
    table.header([Table], [Purpose], [Delete behaviour]),
    [`Projects`], [Ventures. Three independent state columns (§7.6).],
      [Cascade from owner.],
    [`ProjectImages`], [Venture imagery.], [Cascade],
    [`ProjectDocuments`], [Attached documents with a visibility rule.],
      [Cascade],
    [`TeamMembers`], [People listed on a venture.], [Cascade],
    [`Milestones`], [Declared objectives and dates.], [Cascade],
    [`ProjectUpdates`], [Published progress reports.], [Cascade],
    [`ProjectUpdateImages`], [Imagery on an update.], [Cascade from update],
    [`ProjectViews`], [Individual view events feeding analytics.],
      [Cascade; indexed `(ProjectId, CreatedAt)`],
  ),
  caption: [Venture tables. All are owned by the venture and cascade with it.],
)

== Funding

#figure(
  table(
    columns: (36mm, 1fr, 32mm),
    align: (left + top, left + top, left + top),
    table.header([Table], [Purpose], [Rules]),
    [`Investments`], [Commitments with an approval status.],
      [Restrict on investor delete — history must survive.],
    [`FundingRequests`], [Time-boxed settlement attempts.],
      [Expiry swept (§11.8).],
    [`PaymentTransactions`], [Provider outcomes: amount, fee, provider name,
      provider reference, status.], [Only `Settled` counts (§11.6).],
    [`PaymentEvents`], [One row per provider callback.],
      [`ProviderEventId` unique — the idempotency key (§11.5).],
  ),
  caption: [Funding tables. No aggregate column exists anywhere in this group.],
)

== Engagement and Social

#figure(
  table(
    columns: (36mm, 1fr, 32mm),
    align: (left + top, left + top, left + top),
    table.header([Table], [Purpose], [Rules]),
    [`Comments`], [Comments on a venture.], [Restrict],
    [`Replies`], [One level of nesting under a comment.], [Restrict],
    [`Reviews`], [Rated reviews.],
      [`(ProjectId, InvestorId)` unique — one per investor.],
    [`Bookmarks`], [Watchlist edges.], [`(UserId, ProjectId)` unique.],
    [`Follows`], [Directed follow edges.],
      [`(FollowerId, FollowedId)` unique; `FollowedId` indexed.],
    [`Reports`], [User reports on ventures.],
      [Indexed `(ProjectId, Status)`.],
    [`UserProjectInteractions`], [Interaction signals feeding ranking.],
      [Restrict.],
  ),
  caption: [Engagement tables. Four business rules in this group are unique
    indexes rather than application checks (§7.5).],
)

== Communication

#figure(
  table(
    columns: (36mm, 1fr, 32mm),
    align: (left + top, left + top, left + top),
    table.header([Table], [Purpose], [Rules]),
    [`Messages`], [Direct messages with sender, receiver and read state.],
      [Restrict on both participants.],
    [`MessageAttachments`], [Image attachments, one per message.],
      [Cascade from message.],
    [`Notifications`], [Domain-event notifications referencing the object they
      concern rather than storing rendered text (§13.7).],
      [Restrict on referenced rows.],
  ),
  caption: [Communication tables.],
)

== Conventions

/ Money: `decimal` with explicit precision and scale. Never floating point
  (§7.3).
/ Time: `datetime2`, stored in UTC, serialised with an explicit offset (§6.7).
/ Keys: Integer surrogate primary keys throughout.
/ Deletion: Cascade where the child is owned by the parent; restrict where the
  child is a record of something that happened (§7.6).
/ Migrations: Every change is a migration; none is applied by hand (§7.7).
