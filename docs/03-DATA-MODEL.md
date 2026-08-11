# 03 · Data Model Reference

> Complete schema reference, extracted from `Data/Models/*.cs` and `Data/AppDbContext.cs`.
> **English by design** — every name here is a literal identifier in the code and the database.

**Source of truth:** `MyAppApi/MyAppApi/Data/AppDbContext.cs` (`OnModelCreating` + `ConfigureFunding`).
34 `DbSet`s · 26 migrations · SQL Server · EF Core 8.

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
                          ├─ InvestmentStageEvent*  (cascade) — append-only, never updated
                          ├─ DealQuestion*      (cascade) — self-FK ParentQuestionId (NoAction, one level)
                          ├─ DocumentRequest*   (cascade)
                          ├─ TermSheet*         (cascade)
                          └─ FundingRequest*    (cascade) ── TermSheetId? (NoAction)
                               └─ PaymentTransaction*  (cascade)

PaymentEvent          — standalone idempotency ledger + reconciliation review
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
| `OnboardedAtUtc` | datetime2? | set once, first onboarding screen per account |
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

🔒 **`UX_Investments_OneLivePerInvestor`** — unique on `(ProjectId, InvestorId)` `WHERE InvestorId IS NOT NULL AND Status IN ('Pending','Approved')`. Closes the race in `SupportProject`'s check-then-insert: two concurrent submissions from the same investor on the same venture both pass the application-level check, and only the database catches the second one. `Declined` rows sit outside the filter on purpose — a decline must leave the investor free to approach the venture again.

### `InvestmentStageEvent` — append-only stage history

| Column | Notes |
|---|---|
| `InvestmentId` | cascade |
| `FromStage?` | nvarchar(20) — **null on the opening event**, there was no previous stage |
| `ToStage` | nvarchar(20), required |
| `ActorUserId` | usually the founder; settlement moves a relationship too and the investor is the actor there |
| `Reason?` | nvarchar(300) — a decline reason, or the automatic note a closing round leaves |
| `MinutesInPreviousStage?` | int — computed **once, at write time**, from the previous event (or `StageUpdatedAt`/`Date` for a relationship with no prior rows) |
| `AtUtc` | |

**Indexes:** `(InvestmentId, AtUtc)` · `(ToStage, AtUtc)`.

> Every write goes through `Services/StageLog.cs`, never through `Investment.Stage =` directly — that was seven call sites hand-assigning the column before this table existed, one silent miss away from a timeline missing a step. `StageLog.MoveAsync` adds the event to the same change tracker as the column it describes, so one `SaveChangesAsync` commits both or neither. This is what makes the deal room's per-stage duration chart possible — a single `StageUpdatedAt` column could only ever say how long the *current* stage had lasted.

### `DealQuestion`
`InvestmentId` (cascade) · `ParentQuestionId?` → `DealQuestion` (**self-FK, NoAction, one level only**) · `AskedByUserId` (**restrict**) · `Question` (1000) · `Answer` (4000)? · `AnsweredByUserId?` (**restrict**) · `CreatedAtUtc` · `AnsweredAtUtc?` · `IsWithdrawn`.
**Index:** `(InvestmentId, CreatedAtUtc)`.

> `ParentQuestionId` turns one answered question into one follow-up — never a second, and never nested. A thread is a clarification, not a forum.

### `DocumentRequest`
`InvestmentId` (cascade) · `RequestedByUserId` (**restrict**) · `Title` (160) · `Note` (600)? · `Status` (default `"Open"`) · `DeclinedReason` (500)? · `FulfilledByDocumentId?` → `ProjectDocument` (**NoAction**) · `ResponseFileName?` (255) · `ResponseContentType?` (100) · `ResponseSizeBytes?` bigint · `ResponseData?` varbinary(max) · `ResponseNote?` (600) · `CreatedAtUtc` · `ResolvedAtUtc?`.
**Index:** `(InvestmentId, Status)`.

> **Why NoAction and not SetNull:** both this table and `ProjectDocuments` reach `Projects` by cascade, and SQL Server refuses the resulting multiple cascade paths. The unlink is therefore done **explicitly** in `ProjectStoryController.DeleteDocument`, which is also the only place that can honestly reopen the request.
>
> **Direction (`ToFounder` / `ToInvestor`) is derived, not stored** — from whether `RequestedByUserId` is the venture's owner. Either side may ask now; each answers differently because each holds documents differently. A founder links something from the data room (`FulfilledByDocumentId`). An investor has no data room of their own, so their answer is a file attached directly to the request (`Response*`) — held here rather than promoted to `ProjectDocument`, because a venture's data room is readable by every other approved backer and a bank letter is not for them.

### `TermSheet` — what both sides say they agreed to

| Column | Notes |
|---|---|
| `InvestmentId` | cascade |
| `Version` | int — 1, 2, 3… within one relationship |
| `Amount` | **decimal(18,2)** required — gross, the same convention as `FundingRequest.Amount` |
| `Currency` | char(3) |
| `EquityPct?` | **decimal(7,4)** — a 18,2 column would round 12.375% to 12.38 and quietly move somebody's stake |
| `Valuation?` | decimal(18,2) |
| `UseOfFunds?` (1000) · `OtherTerms?` (2000) | free text — board seats, tranching, vesting, anything the structured fields can't carry |
| `Status` | `Proposed` \| `Accepted` \| `Declined` \| `Superseded` |
| `ProposedByUserId` | |
| `FounderAcceptedAtUtc?` · `InvestorAcceptedAtUtc?` | **both**, tracked separately — one party accepting on behalf of the pair is exactly the claim this table exists to stop the product making |
| `AgreedAtUtc?` | set when the second acceptance lands |
| `DeclinedReason?` (500) | |
| `CreatedAtUtc` | |

**Indexes**
- `(InvestmentId, Version)` — **unique**.
- 🔒 **`UX_TermSheets_OneLivePerInvestment`** — unique on `InvestmentId` `WHERE Status = 'Proposed'`. At most one proposal on the table at a time; a live sheet is superseded, not blocked, so renegotiation never leaves a window with no terms at all.

> Not a contract — Vestora holds no signatures and enforces nothing. It is the text that `Investment.Stage == "Committed"` used to mean without having any — "both sides agreed terms off-platform" — with nothing behind the claim. Rows are immutable once `Accepted`; a renegotiation proposes a new version rather than editing this one, so the sequence of what was offered and by whom survives.

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
| `TermSheetId?` → `TermSheet` (**NoAction**) | the agreed terms this ask calls in, when the relationship has any — optional, so rows funded before term sheets existed stay valid |
| `RemindersSent` | int, default 0 — which rung of the T-3-day / T-1-day reminder ladder has fired; a count, not timestamps, because the ladder is fixed and all the sweeper needs to know is which rung it's on |
| **`CounterAmount?`** · `CounterNote?` (500) · `CounterAtUtc?` | the investor's proposed figure against this ask |
| **`CounterStatus?`** | `Proposed` \| `Accepted` \| `Declined` — null when nobody countered |
| **`SupersedesRequestId?`** | the ask this one replaced, when it was issued to accept a counter — amounts on a financial row are never rewritten, so accepting a counter closes the old request and opens a new one |
| `CreatedAtUtc` · `ExpiresAtUtc` · `ClosedAtUtc?` · `PaidAtUtc?` | |

**Indexes**
- 🔒 **`UX_FundingRequests_OneOpenPerInvestment`** — unique on `InvestmentId` `WHERE Status = 'Open'`.
  *Two live asks for the same relationship would let one deal be funded twice.*
- `(ProjectId, Status)` · `(InvestorId, Status)` · `TermSheetId`

> **Tranches:** a commitment may now be called in over several requests. `IsFullySettled` compares the **sum** of every `Succeeded` transaction against the commitment target (the accepted term sheet's amount, or the investment's own amount when there is none) — not "has any payment succeeded". The first-success test would have declared a relationship funded on its opening instalment and made the rest of the money uncollectable. See [05-BUSINESS-RULES §1](05-BUSINESS-RULES.md).

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

`Provider` (24) · `ProviderEventId` (255) · `EventType` (64) · `Source` (`webhook` \| `verify` \| `sweep` \| `admin` \| `simulated`) · `PaymentTransactionId?` · `Payload` (4000)? · `ReceivedAtUtc` (**indexed**) · `Applied` bool · `Outcome` (300)? · `ReviewedAtUtc?` · `ReviewedByAdminId?` · `ReviewNote?` (500).

- 🔒 **`UX_PaymentEvents_ProviderEventId`** — unique on `(Provider, ProviderEventId)`.

> Every confirmation path inserts here **first**. A resent webhook, a repeated verify, and a webhook racing a verify all collide at this index before a single funding figure moves. Nothing downstream needs to defend itself. For a verify, `ProviderEventId` is a deterministic key derived from the session + outcome, so a repeat collides with itself. `ApplyProviderResultAsync` now wraps the claim and the effect in **one database transaction** — a process death between claiming the key and applying it used to leave the key committed and the settlement lost, with no retry able to recover it because the retry is exactly what the key then blocked.
>
> **The review columns are the admin reconciliation queue.** Every event that changed nothing — including a `CONFLICT` outcome, where the provider reports a payment against an attempt Vestora had already closed — sat here unindexed for a human until `AdminRevenueController`'s reconciliation endpoints existed to surface it. Reviewing records what a human found; it never rewrites `Applied` or `Outcome`, which describe what the system did at the time.
>
> Refunds now claim a key here too (`ProviderEventId = "refund:{transactionId}"`), closing the gap where two admins on the same receipt could both pass the status check before either wrote — and, unlike settlement, the claim is made **before** the provider is asked to reverse the charge, not after.

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
| `FundingRequest.CounterAmount` | 18,2 |
| `PaymentTransaction.Amount` / `FeeAmount` / `NetToFounder` | 18,2 required |
| `TermSheet.Amount` | 18,2 required |
| `TermSheet.Valuation` | 18,2 |
| `TermSheet.EquityPct` | **7,4** (percent, finer than `Project.EquityOffered`) |

---

## 9. Global query filters

```csharp
modelBuilder.Entity<User>().HasQueryFilter(u => !u.IsDeleted);
modelBuilder.Entity<Project>().HasQueryFilter(p => !p.IsDeleted);
```

Applies to **every** LINQ query including `Find`. Opt out with `.IgnoreQueryFilters()` — which `FundingMath.SummariesAsync` does deliberately, so a deleted venture's settled money still reconciles in admin revenue.

---

## 10. Migrations

26 migrations in `Migrations/`, in order:

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
| 23 | `AddUserOnboardedAt` | `User.OnboardedAtUtc` |
| 24 | `OneLiveInvestmentPerInvestor` | `UX_Investments_OneLivePerInvestor` |
| 25 | `StageHistoryRemindersAndReconciliation` | InvestmentStageEvents, `FundingRequest.RemindersSent`, `PaymentEvent` review columns |
| 26 | `TermSheetsCounterOffersAndTwoWayDocs` | TermSheets, `FundingRequest` counter-offer + tranche columns, `DocumentRequest` response columns, `DealQuestion.ParentQuestionId` |

**Commands** (from `MyAppApi/MyAppApi`):

```bash
dotnet ef migrations add YourMigrationName
```

```bash
dotnet ef database update
```

> ⚠️ The database is **remote and shared**. Coordinate with the team before applying a migration — there is no local copy to test against.
