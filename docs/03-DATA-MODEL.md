# 03 · Data Model Reference

> Complete schema reference, extracted from `Data/Models/*.cs` and `Data/AppDbContext.cs`.
> **English by design** — every name here is a literal identifier in the code and the database.

**Source of truth:** `MyAppApi/MyAppApi/Data/AppDbContext.cs` (`OnModelCreating` + `ConfigureFunding`).
32 `DbSet`s · 22 migrations · SQL Server · EF Core 8.

---

## 1. Entity map

```
User (TPH: Investor | Innovator | Admin)
 ├─ RefreshToken*          (cascade)
 ├─ SecurityLog*           (set null)
 ├─ Comment* · Reply*      (restrict)
 ├─ SentMessages* / ReceivedMessages*   (restrict)
 ├─ SavedSearch*           (cascade)
 └─ UserProjectInteraction*

Innovator ──owns──▶ Project*                              (cascade)
                     ├─ ProjectImage*        (cascade)
                     ├─ ProjectUpdate* ─ ProjectUpdateImage*  (cascade)
                     ├─ Milestone*           (cascade)
                     ├─ TeamMember*          (cascade)
                     ├─ ProjectDocument* ─ DocumentDownloadLog*  (cascade)
                     ├─ ProjectView*         (cascade)
                     ├─ Review*              (cascade, unique per investor)
                     ├─ Report*              (cascade)
                     ├─ Bookmark*            (cascade)
                     ├─ Comment* ─ Reply*    (restrict)
                     └─ Investment*          (restrict on Investor)
                          ├─ DealQuestion*      (cascade)
                          ├─ DocumentRequest*   (cascade)
                          └─ FundingRequest*    (cascade)
                               └─ PaymentTransaction*  (cascade)

PaymentEvent          — standalone idempotency ledger
Notification          — FKs to Project / Investment / ActorUser (all restrict-ish)
Follow                — (FollowerId, FollowedId) ints, no FK navs
AdminAuditLog         — standalone
MessageAttachment     — 1:1 with Message, shares MessageId as PK
```

---

## 2. Identity & security

### `User` — base table for every account (TPH)

Discriminator column: **`UserType`** → `"Investor"` | `"Innovator"` | `"Admin"`.

| Column | Type | Notes |
|---|---|---|
| `Id` | int PK | |
| `UserName` | nvarchar(100) | required |
| `Email` | nvarchar(255) | required, **unique index**, stored normalized (lowercased) |
| `Password` | nvarchar(255) | BCrypt hash |
| `UserType` | string | TPH discriminator |
| `BirthDate` | date? | validated 18–100 years old |
| `Phone` | string? | validated dialable |
| `BriefBio` | nvarchar(250)? | |
| `WebsiteUrl` / `LinkedinUrl` / `TwitterUrl` | nvarchar(300)? | |
| `ProfileImage` | varbinary? | avatar blob |
| `CoverImage` | varbinary? | profile hero blob |
| `CreatedAtUtc` | datetime2? | nullable so pre-existing rows just hide "joined" |
| `LastSeenAt` | datetime2? | written by `ChatHub` on last disconnect |
| `UniqueNumber` | nvarchar(50) | required |
| `IsEmailVerified` · `EmailVerifiedAtUtc` | bool · datetime2? | |
| `EmailVerificationTokenHash` | nvarchar(128)? | hash only, never the raw code |
| `EmailVerificationTokenExpiresAtUtc` · `EmailVerificationLastSentAtUtc` | datetime2? | |
| `PasswordResetTokenHash` | nvarchar(128)? | |
| `PasswordResetTokenExpiresAtUtc` · `PasswordResetLastRequestedAtUtc` | datetime2? | |
| `PasswordResetFailedAttempts` | int | |
| `FailedLoginCount` · `LockoutEndUtc` · `LastFailedLoginAtUtc` | int · datetime2? | lockout state |
| `IsDeleted` | bool | **global query filter** `!IsDeleted` |
| `IsSuspended` · `SuspendedAtUtc` · `SuspensionReason` | bool · datetime2? · nvarchar(500)? | admin suspension |
| `DeletedAtUtc` | datetime2? | **self**-deletion, distinct from admin `IsDeleted` |
| `NotifyOnFollow` · `NotifyOnProjectUpdate` | bool (default true) | only the *ambient* notifications are silenceable |

> **Query filter:** `HasQueryFilter(u => !u.IsDeleted)` on the base type. TPH derived types inherit it. Use `IgnoreQueryFilters()` to reach deleted rows.
>
> **Non-silenceable notifications:** the four support-decision types (requested / submitted / approved / declined) have no preference flag on purpose.

### `Investor : User`

| Column | Type | Notes |
|---|---|---|
| `PreferredIndustries` | nvarchar(500)? | free-text CSV, same convention as `Project.Category` |
| `InvestmentThesis` | nvarchar(500)? | shown on profile and beside their request in the founder's pipeline |
| `TicketMin` · `TicketMax` | decimal(18,2)? | both optional and independent |
| `ListedInDirectory` | bool (default true) | **indexed**; false hides them from `/investors` but keeps the profile reachable by link |

### `Innovator : User`
Owns `Projects`. No extra columns.

### `Admin : User`
No extra columns. Created via bootstrap secret or manual DB promotion.

### `RefreshToken`

| Column | Notes |
|---|---|
| `TokenHash` nvarchar(128) | **unique index** — the raw token is never stored |
| `CreatedAtUtc` · `ExpiresAtUtc` · `RevokedAtUtc?` | |
| `ReplacedByTokenHash?` | rotation chain |
| `CreatedByIp?` · `UserAgent?` · `RevokedByIp?` | |
| `UserId` → `User` | cascade delete |
| *computed:* `IsExpired` · `IsRevoked` · `IsActive` | not mapped |

### `SecurityLog`

`EventType` (100) · `UserId?` (**set null** on user delete) · `Email?` · `IpAddress?` · `UserAgent?` · `Details?` (1000) · `CreatedAtUtc`.
**Index:** `(UserId, CreatedAtUtc)`.
Event types written by `AuthService` include login success/failure, lockout, and `login_blocked_suspended`.

---

## 3. Ventures

### `Project`

| Column | Type | Notes |
|---|---|---|
| `Id` | int PK | |
| `Name` | nvarchar(100) | required |
| `Description` | nvarchar(max) | required |
| `VideoUrl` | string? | `[Url]` |
| `Topic` · `Category` · `Industry` | nvarchar(100)? | free text |
| `Location` | nvarchar(150)? | |
| `InvestmentNeeded` | **decimal(18,2)** required | the round goal |
| `CreatedDate` | datetime2 | |
| `OwnerId` → `Innovator` | cascade | |
| `InvestorCount` · `TotalInteractions` | int | denormalized counters |
| **`ModerationStatus`** | nvarchar(20) | `PendingReview` (default) \| `Approved` \| `Rejected` |
| `ModerationNote` | nvarchar(500)? | stored, not just sent in a notification |
| `ModeratedAtUtc` | datetime2? | |
| **`LifecycleStatus`** | nvarchar(20) | `Active` (default) \| `Paused` \| `Closed` — founder-controlled, independent of moderation |
| `RoundClosedAtUtc` | datetime2? | **indexed** — closed rounds drop out of live browse |
| `RoundOutcome` | nvarchar(20)? | `Completed` \| `PartiallyRaised` \| `Withdrawn` — **stated by the founder, never inferred** |
| `RoundClosingNote` | nvarchar(600)? | |
| `Stage` | nvarchar(50)? | **indexed** — `Idea` / `Pre-seed` / `Seed` / `Growth` |
| `Valuation` | decimal(18,2)? | |
| `EquityOffered` | **decimal(5,2)?** | percent, 0–100 |
| `UseOfFunds` | nvarchar(1000)? | |
| `IsDeleted` | bool | **global query filter** `!IsDeleted` |

**Indexes**
- `(ModerationStatus, LifecycleStatus, CreatedDate)` — every public browse query filters on the first two then orders by the third.
- `Stage` — the browse feed's primary facet.
- `RoundClosedAtUtc`.

> `Status` on a project DTO is **computed** (`FundingMath.PublicStatus`), never stored. Don't add a status column.

### `ProjectImage` / `ProjectUpdateImage`
`ImageData` varbinary · `ContentType` · `UploadedAt` · FK (cascade).

### `ProjectUpdate`
`Title` (150) · `Body` (max) · `CreatedDate` · `ProjectId` (cascade) · `Images*`.

### `Milestone`
`Title` (100) · `Description` (500)? · `Status` (default `"Planned"`) · `Progress` int 0..100 · `SortOrder` · `Date?` · `ProjectId` (cascade).

### `TeamMember`
`Name` (100) · `Role` (100)? · `Bio` (400)? · `LinkedinUrl` (300)? · **`Email` (255)?** · `SortOrder` · `AvatarData` varbinary? · `AvatarContentType?` · `ProjectId` (cascade).

> ⚠️ `Email` is **never** returned by the public team roster — owner-only, to prevent email harvesting. It is matched case-insensitively at read time to link a team member to a real user profile.

### `ProjectDocument`
`Title` (150) · `FileName` (200) · `ContentType` · `FileData` varbinary · `SizeBytes` · **`Visibility`** (default `"Public"`, other value `"BackersOnly"`) · `UploadedAt` · `ProjectId` (cascade).

### `DocumentDownloadLog`
`ProjectDocumentId` (cascade) · `UserId` · `DownloadedAtUtc`. **Index:** `(ProjectDocumentId, DownloadedAtUtc)`.

---

## 4. Relationships & the deal room

### `Investment` — the relationship row, **not** a money transfer

| Column | Notes |
|---|---|
| `Amount` | **decimal(18,2)** required |
| `Date` | |
| **`Status`** | `Pending` (default) → `Approved` \| `Declined` — the *funding gate* |
| `ContactInfo` | how the investor asked to be reached, captured at support time |
| **`Stage`** | nvarchar(20), default `New` — the *relationship pipeline*, see [05-BUSINESS-RULES](05-BUSINESS-RULES.md) |
| `StageUpdatedAt` | |
| `FounderNote` · `InvestorNote` | nvarchar(2000)? — **each side only ever reads its own** |
| `DeclinedReason` | nvarchar(500)? |
| `InvestorId?` → `Investor` | **restrict** |
| `ProjectId` → `Project` | |
| `FundingRequests*` | |

**Indexes:** `(ProjectId, Status)` · `(InvestorId, Stage)`.

> Declining sets both `Stage` and `Status` to `Declined` rather than deleting the row — the relationship history survives.

### `DealQuestion`
`InvestmentId` (cascade) · `AskedByUserId` (**restrict**) · `Question` (1000) · `Answer` (4000)? · `AnsweredByUserId?` (**restrict**) · `CreatedAtUtc` · `AnsweredAtUtc?` · `IsWithdrawn`.
**Index:** `(InvestmentId, CreatedAtUtc)`.

### `DocumentRequest`
`InvestmentId` (cascade) · `RequestedByUserId` (**restrict**) · `Title` (160) · `Note` (600)? · `Status` (default `"Open"`) · `DeclinedReason` (500)? · `FulfilledByDocumentId?` → `ProjectDocument` (**NoAction**) · `CreatedAtUtc` · `ResolvedAtUtc?`.
**Index:** `(InvestmentId, Status)`.

> **Why NoAction and not SetNull:** both this table and `ProjectDocuments` reach `Projects` by cascade, and SQL Server refuses the resulting multiple cascade paths. The unlink is therefore done **explicitly** in `ProjectStoryController.DeleteDocument`, which is also the only place that can honestly reopen the request.

---

## 5. Funding & payments

> Three unique filtered indexes and one idempotency index carry the integrity of the entire payment system. They are **database** constraints, not service checks — application code loses races, indexes do not.

### `FundingRequest` — the founder's call for the agreed money

| Column | Notes |
|---|---|
| `Reference` nvarchar(32) | **unique**, e.g. `VST-FR-2026-000042` |
| `InvestmentId` | cascade |
| `ProjectId` · `InvestorId` | **denormalized** from the investment so founder/admin funding queries stay flat |
| `RequestedByUserId` | audit trail |
| `Amount` | **decimal(18,2)** — gross; the platform fee comes out of the founder's proceeds, never on top of the investor's payment |
| `Currency` | char(3), default `USD` |
| `Status` | `Open` \| `Paid` \| `Cancelled` \| `Expired` |
| `ClosedReason` (200)? · `Note` (500)? | |
| `CreatedAtUtc` · `ExpiresAtUtc` · `ClosedAtUtc?` · `PaidAtUtc?` | |

**Indexes**
- 🔒 **`UX_FundingRequests_OneOpenPerInvestment`** — unique on `InvestmentId` `WHERE Status = 'Open'`.
  *Two live asks for the same relationship would let one deal be funded twice.*
- `(ProjectId, Status)` · `(InvestorId, Status)`

### `PaymentTransaction` — **one attempt**, not one payment

| Column | Notes |
|---|---|
| `Reference` nvarchar(32) | **unique**, e.g. `VST-2026-000123` |
| `FundingRequestId` | cascade |
| `InvestmentId` · `ProjectId` · `InvestorId` | denormalized |
| `AttemptNumber` | 1, 2, 3… |
| `Amount` decimal(18,2) | what the investor pays — never altered after creation |
| `Currency` | |
| `FeeRateBps` int | platform rate **snapshotted at settlement** (500 = 5%), never read back from config |
| `FeeAmount` · `NetToFounder` | decimal(18,2), frozen at success |
| `Status` | `Initiated` \| `Processing` \| `Succeeded` \| `Failed` \| `Cancelled` \| `Refunded` |
| `Provider` | `"stripe"` \| `"simulated"` |
| `ProviderSessionId?` (**indexed**) · `ProviderPaymentId?` · `ProviderRefundId?` | |
| `CheckoutUrl?` (1000) | |
| `FailureCode?` (64) · `FailureMessage?` (500) | |
| `CancelReason?` (32) | `user_cancelled` \| `abandoned` \| `expired` \| `round_closed` |
| `CreatedAtUtc` · `ExpiresAtUtc` · `SucceededAtUtc?` (**indexed**) · `FailedAtUtc?` · `CancelledAtUtc?` · `RefundedAtUtc?` | |
| `RefundedByAdminId?` · `RefundReason?` (300) | refunds are never self-service |
| **`RowVersion`** `[Timestamp]` | optimistic concurrency — the webhook and the return-verify can arrive together; the loser treats the exception as success because the winner already did the work |

**Indexes**
- 🔒 **`UX_PaymentTransactions_OneActivePerRequest`** — unique on `FundingRequestId` `WHERE Status IN ('Initiated','Processing')`.
- 🔒 **`UX_PaymentTransactions_OneSucceededPerRequest`** — unique on `FundingRequestId` `WHERE Status = 'Succeeded'`.
- `(ProjectId, Status)` · `(InvestorId, Status)` · `ProviderSessionId` · `SucceededAtUtc`

> ⚠️ Both unique indexes cover the **same column**, so each needs an explicit name. EF keys indexes by their property list — two anonymous ones would collapse into whichever was declared last, silently losing a constraint that money depends on.

### `PaymentEvent` — the idempotency ledger (not a log)

`Provider` (24) · `ProviderEventId` (255) · `EventType` (64) · `Source` (`webhook` \| `verify` \| `simulated`) · `PaymentTransactionId?` · `Payload` (4000)? · `ReceivedAtUtc` (**indexed**) · `Applied` bool · `Outcome` (300)?.

- 🔒 **`UX_PaymentEvents_ProviderEventId`** — unique on `(Provider, ProviderEventId)`.

> Every confirmation path inserts here **first**. A resent webhook, a repeated verify, and a webhook racing a verify all collide at this index before a single funding figure moves. Nothing downstream needs to defend itself. For a verify, `ProviderEventId` is a deterministic key derived from the session + outcome, so a repeat collides with itself.

---

## 6. Social, discovery & moderation

| Entity | Columns | Constraints |
|---|---|---|
| `Bookmark` | `UserId` · `ProjectId` · `CreatedDate` | **unique** `(UserId, ProjectId)`; cascade from Project only (`UserId` has no FK) |
| `Follow` | `FollowerId` · `FollowedId` · `CreatedDate` | **unique** `(FollowerId, FollowedId)`; index on `FollowedId`; plain ints, no FK navs — two FKs into Users would create multiple cascade paths |
| `Comment` | `Content` · `CreatedDate` · `ProjectId` · `UserId` · `Replies*` | both FKs **restrict** |
| `Reply` | `Content` · `CreatedDate` · `CommentId` · `UserId` | both FKs **restrict** |
| `ProjectView` | `ProjectId` · `ViewerId?` · `Fingerprint?` · `CreatedAt` | cascade; index `(ProjectId, CreatedAt)` |
| `Review` | `ProjectId` · `InvestorId` · `Rating` · `Content` (1500)? · `Communicative` · `Transparent` · `DeliveredOnPlan` · `WouldBackAgain` · `CreatedAt` · `UpdatedAt?` | cascade; **unique** `(ProjectId, InvestorId)` |
| `Report` | `ProjectId` · `ReporterId` · `Reason` (default `"Other"`) · `Details?` · `Status` (default `"Open"`) · `CreatedAt` · `ResolvedAt?` · `ResolvedByAdminId?` | cascade; index `(ProjectId, Status)` |
| `SavedSearch` | `UserId` (cascade) · `Name` (80) · `Scope` (default `"ventures"`) · `Search?` · `Sector?` · `Location?` · `Stage?` · `Commitment?` · `CreatedAtUtc` · `LastSeenAtUtc` | index `(UserId, Scope)` |
| `UserProjectInteraction` | `UserId` · `ProjectId` · `InteractionDate` | both FKs **restrict** |
| `AdminAuditLog` | `AdminUserId` · `Action` · `TargetType` · `TargetId?` · `Details?` · `CreatedAtUtc` | index on `CreatedAtUtc` |

---

## 7. Messaging & notifications

### `Message`
`Content` · `SentAt` · `IsRead` · `AttachmentType?` · `AttachmentName?` · **`ProjectId?`** (**SetNull**) · `SenderId` (**restrict**) · `ReceiverId` (**restrict**).
**Index:** `(ProjectId, SentAt)`.

> **SetNull, not Cascade:** a deleted venture must not take the conversation with it — the two people still said those things to each other.

### `MessageAttachment`
1:1 with `Message`, **`MessageId` is the primary key**. `Data` varbinary. Cascades with its message. Images only for now.

### `Notification`
`NotificationId` PK · `Content` · `DateCreated` · `IsRead` · `NotificationType?` · `ProjectId?` (**restrict**) · `InvestmentId?` (**ClientSetNull**) · `ActorUserId?` (**restrict**) · `UserId` (recipient).

The full list of `NotificationType` values and how the UI groups them lives in `Frontend/vestora/src/lib/notifications/taxonomy.ts` — see [05-BUSINESS-RULES §5](05-BUSINESS-RULES.md).

---

## 8. Money columns — explicit precision

Every monetary column declares `HasPrecision(18, 2)`. Without it SQL Server falls back to `decimal(18,0)` and **silently truncates every fractional value**.

| Entity.Property | Precision |
|---|---|
| `Investment.Amount` | 18,2 required |
| `Project.InvestmentNeeded` | 18,2 required |
| `Project.Valuation` | 18,2 |
| `Project.EquityOffered` | **5,2** (percent) |
| `Investor.TicketMin` / `TicketMax` | 18,2 |
| `FundingRequest.Amount` | 18,2 required |
| `PaymentTransaction.Amount` / `FeeAmount` / `NetToFounder` | 18,2 required |

---

## 9. Global query filters

```csharp
modelBuilder.Entity<User>().HasQueryFilter(u => !u.IsDeleted);
modelBuilder.Entity<Project>().HasQueryFilter(p => !p.IsDeleted);
```

Applies to **every** LINQ query including `Find`. Opt out with `.IgnoreQueryFilters()` — which `FundingMath.SummariesAsync` does deliberately, so a deleted venture's settled money still reconciles in admin revenue.

---

## 10. Migrations

22 migrations in `Migrations/`, in order:

| # | Migration | What it added |
|---|---|---|
| 1 | `initialCraete` *(sic)* | Users, Projects, Investments, Messages, Comments, Replies, Notifications |
| 2 | `Phase4ProductionAuthSecurity` | RefreshTokens, SecurityLogs, email verification & lockout columns |
| 3 | `Phase5SearchAndProjectImages` | SavedSearches, ProjectImages |
| 4 | `AddInvestmentApprovalStatus` | `Investment.Status` |
| 5 | `AddBookmarks` | Bookmarks |
| 6 | `AddUpdatesAndMilestones` | ProjectUpdates, ProjectUpdateImages, Milestones |
| 7 | `AddTeamAndDocuments` | TeamMembers, ProjectDocuments |
| 8 | `AddFollowsAndProfileMedia` | Follows, `CoverImage` |
| 9 | `AddMessageIsRead` | `Message.IsRead` |
| 10 | `AddModerationAndAnalytics` | ModerationStatus, Reports, ProjectViews, Reviews, AdminAuditLogs |
| 11 | `AddSocialLinksAndInvestorInterests` | social URLs, `PreferredIndustries` |
| 12 | `AddTeamMemberEmail` | `TeamMember.Email` |
| 13 | `AddLastSeenAndMessageAttachments` | `LastSeenAt`, MessageAttachments |
| 14 | `FixesPass1_ModerationDecimalContactAudit` | decimal precision, `ContactInfo`, audit log, soft delete |
| 15 | `Phase2_InvestmentPipeline` | `Investment.Stage`, notes, DocumentDownloadLogs |
| 16 | `Phase5_SuspensionAndModerationNotes` | `IsSuspended`, `ModerationNote` |
| 17 | `Phase6_VentureLifecycle` | `LifecycleStatus`, round-closing columns |
| 18 | `BrowseDiscoveryIndexes` | the browse/facet indexes |
| 19 | `InvestorProfileThesisAndTicket` | `InvestmentThesis`, `TicketMin/Max`, `ListedInDirectory` |
| 20 | `NotificationPrefsAndSelfDelete` | `NotifyOn*`, `DeletedAtUtc` |
| 21 | `ExpansionRelationshipWorkspace` | DealQuestions, DocumentRequests, contextual messaging |
| 22 | `FundingRequestsAndSandboxPayments` | FundingRequests, PaymentTransactions, PaymentEvents + all 4 integrity indexes |

**Commands** (from `MyAppApi/MyAppApi`):

```bash
dotnet ef migrations add YourMigrationName
```

```bash
dotnet ef database update
```

> ⚠️ The database is **remote and shared**. Coordinate with the team before applying a migration — there is no local copy to test against.
