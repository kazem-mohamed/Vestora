# 04 · API Reference

> All **161 endpoints** across **22 controllers**, extracted from the `[Route]` / `[Http*]` / `[Authorize]` attributes in `MyAppApi/MyAppApi/Controllers/`.
> **English by design** — every path, DTO and role name here is a literal identifier.

**Base URL (dev):** `http://localhost:5078` · **Swagger (dev only):** `/swagger`
**Routing is case-insensitive.** `[Route("api/[controller]")]` produces `/api/Auth`, `/api/Users`, `/api/Projects`, `/api/Investor`, `/api/Message`, `/api/Notification`, `/api/Admin` — the frontend calls several of these in lowercase and it resolves fine.

---

## Conventions

| | |
|---|---|
| **Auth** | `Authorization: Bearer <accessToken>`. Access token = 60 min; refresh via `POST /api/auth/refresh`. |
| **Roles** | `Investor` · `Innovator` · `Admin`, from the JWT role claim (= `User.UserType`). |
| **Errors** | `{ "message": "…" }` for handled failures; ASP.NET `ValidationProblemDetails` (`{ errors: { field: [msg] } }`) for model-binding failures; generic `ProblemDetails` for unhandled 500s (never a stack trace). |
| **Dates** | Always UTC with a trailing `Z` — `UtcDateTimeConverter` guarantees it on both REST and SignalR. |
| **Paging** | `?page=1&pageSize=N`; responses use `PagedResult<T>` = `{ items, page, pageSize, total }`. |
| **Uploads** | `multipart/form-data`. Images: ≤ 2 MB, jpeg/png/gif/bmp, **byte-signature verified**. |
| **Ownership** | Many endpoints need role **and** ownership; ownership is checked inside the action and returns `403`. |

### Rate limits

| Policy | Limit | Applies to |
|---|---|---|
| Global | 100 / min | every request |
| `Auth` | 10 / min | all of `AuthController` |
| `PasswordReset` | 3 / 10 min | forgot-password, reset-password, resend-verification, admin bootstrap |
| `Checkout` | 8 / 5 min | `POST /api/payments/funding-requests/{id}/checkout` |

Partitioned by `user:{id}` when authenticated, `ip:{address}` otherwise. Exceeding returns **429**.

---

## 1. `AuthController` — `/api/auth` · 10 endpoints
Rate-limited `Auth` at the controller level.

| Method | Path | Auth | Body | Purpose |
|---|---|---|---|---|
| POST | `/register` | anonymous | `RegisterDto` (**multipart/form-data**) | Create account, send verification code. Returns `{ message, emailDelivered }` — `emailDelivered:false` means the account exists but the code did not send. |
| POST | `/login` | anonymous | `UserLoginDto` | Returns `LoginResponseDto` = `{ accessToken, refreshToken, userId, userName, userEmail, userType, … }`. Fails if email unverified, account locked, or suspended. |
| POST | `/refresh` | anonymous | `{ refreshToken }` | Rotates the refresh token and returns a new pair. |
| POST | `/revoke-token` | authenticated | `{ refreshToken }` | Revokes one token. |
| POST | `/logout` | authenticated | `{ refreshToken? }` | Revokes the current session. |
| POST | `/verify-email` | anonymous | `VerifyEmailDto` | Confirms the code (valid 60 min). |
| POST | `/resend-verification` | anonymous · `PasswordReset` limit | `ResendVerificationEmailDto` | 60 s cooldown. |
| POST | `/change-password` | authenticated | `ChangePasswordDto` | Revokes all active refresh tokens on success. |
| POST | `/forgot-password` | anonymous · `PasswordReset` limit | `ForgotPasswordDto` | Always answers the same regardless of whether the email exists. |
| POST | `/reset-password` | anonymous · `PasswordReset` limit | `ResetPasswordDto` | Code valid 10 min; 5 failed attempts invalidate it. |

> Password policy is enforced server-side by `AccountRules.ValidatePassword` — see [05-BUSINESS-RULES §7](05-BUSINESS-RULES.md).

---

## 2. `UsersController` — `/api/users` · 7 endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/me` | authenticated | Current user's full profile (`UserProfile`). |
| PUT | `/me` | authenticated | Update profile. **multipart** (`UpdateUserDto`) — carries avatar + cover uploads. |
| DELETE | `/me` | authenticated | Self-deletion. Body `DeleteAccountDto` (password confirmation). Sets `DeletedAtUtc`, distinct from an admin delete. |
| GET | `/{id}` | **anonymous** | Public profile (`PublicProfileDetail`): bio, links, trust signals, ventures, team memberships, endorsements. |
| GET | `/{id}/backed` | **anonymous** | Ventures this user has backed. |
| GET | `/{id}/cover` | **anonymous** | Cover image bytes. |
| GET | `/{id}/avatar` | **anonymous** | Avatar bytes. |

---

## 3. `ProjectsController` — `/api/projects` · 22 endpoints

### Read / discovery

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/` | anonymous | **The browse feed.** Query: `search`, `sector`, `location`, `stage`, `commitment`, `sort`, `page=1`, `pageSize=12`. Returns `PagedResult<ProjectCard>`. |
| GET | `/filters` | anonymous | Distinct filter values available. |
| GET | `/facets` | anonymous | Facet counts for the current filter combination (same query params). |
| GET | `/details/{projectId}` | anonymous | Full venture detail (`Project`). |
| GET | `/{innovatorId}` | authenticated | All projects owned by an innovator. |
| GET | `/{ownerId}/cards` | anonymous | Owner's ventures as cards. |
| GET | `/{projectId}/next` | anonymous | `?take=3` — "what to look at next". |
| GET | `/{projectId}/images` | anonymous | Image ids/metadata. |
| GET | `/images/{imageId}` | anonymous | Image bytes. |

> **Visibility:** the browse/detail queries only show `ModerationStatus == "Approved"` **and** `LifecycleStatus != "Paused"`. Owners can preview their own pending listing.

### Write

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/` | authenticated (role checked inline) | `ProjectDto`. New projects start `PendingReview`. |
| PUT | `/{projectId}` | authenticated + **owner** | `ProjectDto`. |
| PATCH | `/{projectId}/lifecycle` | `Innovator` + owner | `LifecycleDto` — `Active` / `Paused` / `Closed`. |
| POST | `/{projectId}/close-round` | `Innovator` + owner | `CloseRoundDto` — outcome + note. Cancels open funding requests, concludes live relationships, declines never-approved ones. **A live checkout is left running on purpose** — see [05-BUSINESS-RULES §4.3](05-BUSINESS-RULES.md). |
| DELETE | `/{projectId}` | authenticated + owner | Soft delete. |
| POST | `/{projectId}/images` | authenticated + owner | multipart. |
| DELETE | `/images/{imageId}` | authenticated + owner | |
| POST | `/increment/{projectId}` | authenticated | Interaction counter. |
| POST | `/decrement/{projectId}` | authenticated | |

### Comments

| Method | Path | Auth |
|---|---|---|
| POST | `/{projectId}/comments` | authenticated |
| POST | `/comments/{commentId}/replies` | authenticated |
| DELETE | `/comments/{commentId}` | author only |
| DELETE | `/replies/{replyId}` | author only |

---

## 4. `ProjectStoryController` — `/api/projects` · 20 endpoints
The venture's story surface: updates, milestones, team, data room.

### Updates
| Method | Path | Auth |
|---|---|---|
| GET | `/{projectId}/updates` | anonymous |
| POST | `/{projectId}/updates` | `Innovator` + owner — fans out a notification to followers |
| PUT | `/updates/{updateId}` | `Innovator` + owner |
| DELETE | `/updates/{updateId}` | `Innovator` + owner |
| POST | `/updates/{updateId}/images` | `Innovator` + owner (multipart) |
| GET | `/updates/images/{imageId}` | anonymous |

### Milestones
| Method | Path | Auth |
|---|---|---|
| GET | `/{projectId}/milestones` | anonymous |
| POST | `/{projectId}/milestones` | `Innovator` + owner |
| PUT | `/milestones/{milestoneId}` | `Innovator` + owner |
| DELETE | `/milestones/{milestoneId}` | `Innovator` + owner |

### Team
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/{projectId}/team` | anonymous | **`Email` is stripped unless the caller is the owner.** |
| POST | `/{projectId}/team` | `Innovator` + owner | |
| PUT | `/team/{memberId}` | `Innovator` + owner | |
| DELETE | `/team/{memberId}` | `Innovator` + owner | |
| POST | `/team/{memberId}/avatar` | `Innovator` + owner | multipart |
| GET | `/team/{memberId}/avatar` | anonymous | |

### Data room
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/{projectId}/documents` | authenticated | `BackersOnly` documents are filtered by `CanSeeBackerDocsAsync` (owner or approved backer). |
| POST | `/{projectId}/documents` | `Innovator` + owner | multipart: `file`, `title`, `visibility`. |
| DELETE | `/documents/{documentId}` | `Innovator` + owner | Also **explicitly unlinks** any `DocumentRequest` it fulfilled, reopening that request. |
| GET | `/documents/{documentId}/download` | authenticated | Writes a `DocumentDownloadLog` row. |

---

## 5. `InvestorController` — `/api/investor` · 11 endpoints
The support request + relationship pipeline.

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/{investorId}/supported-projects` | `Investor` | |
| POST | `/{projectId}/support` | `Investor` | `SupportProjectDto` (amount + contact info). Creates `Investment(Pending, Stage=New)`. **Rejected** if the project is Paused/Closed or the round has no remaining capacity. On a concurrent duplicate, `UX_Investments_OneLivePerInvestor` refuses the insert and the controller turns that into the same `400` the pre-check gives. |
| POST | `/investments/{investmentId}/approve-support` | `Innovator` + owner | **Relationship-addressed**, unlike §9's notification-keyed approval — the notification row can be gone (declined counterpart, aged out of the feed) while the decision itself is still live. Checks the round's remaining capacity *at approval*, same as §9. |
| POST | `/{investmentId}/reject-support` | `Innovator` + owner | Sets `Status` and `Stage` to `Declined` (row kept). |
| GET | `/{investorId}/investment-summary` | `Investor` | |
| GET | `/{projectId}/my-support` | `Investor` | The caller's own relationship with one venture. |
| GET | `/{investorId}/activities` | `Investor` | |
| PATCH | `/investments/{investmentId}/stage` | `Innovator` + owner | `UpdateStageDto`. Investors get **403**. |
| PUT | `/investments/{investmentId}/founder-note` | `Innovator` + owner | Private to the founder. |
| PUT | `/investments/{investmentId}/investor-note` | `Investor` (request owner) | Private to the investor. |
| GET | `/{projectId}/backers` | `Innovator` + owner | Backers **with their contact info** — the only place it is exposed. |

---

## 6. `PaymentsController` — `/api/payments` · 15 endpoints
See the full state machine in [05-BUSINESS-RULES §3](05-BUSINESS-RULES.md).

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/config` | **anonymous** | `{ provider, isSandbox, currency, feeRateBps, … }`. Drives the sandbox disclosure in the UI. |
| POST | `/investments/{investmentId}/funding-request` | `Innovator` | `CreateFundingRequestInput` (amount + note). At most one `Open` per investment. Amount is capped by the accepted term sheet, when there is one, and by what remains unsettled on it when tranches have already landed. |
| GET | `/investments/{investmentId}/funding-request` | participant | Current request for a relationship. |
| GET | `/funding-requests/{id}` | participant | |
| POST | `/funding-requests/{id}/cancel` | founder or admin | Voids any live attempt too. |
| POST | `/funding-requests/{id}/counter` | `Investor` | `CounterOfferInput` (amount + note). One live counter per request; any in-flight checkout on the ask is cancelled first, since paying the original figure and proposing a different one are contradictory answers to the same question. |
| POST | `/funding-requests/{id}/counter/answer` | `Innovator` | `AnswerCounterInput` (`accept` + note). **Accepting closes the countered ask and issues a new one at the agreed figure** — amounts on a financial row are never rewritten in place — through the ordinary `funding-request` creation path, so every guard on that path runs again. If the replacement is refused (capacity, closed round), the original ask is reopened rather than left with no live ask at all. |
| POST | `/funding-requests/{id}/checkout` | `Investor` · **`Checkout` limit** | Opens a provider checkout session, creates `PaymentTransaction(Initiated)`. Refused if the relationship has closed or a counter-offer is currently on the table. |
| POST | `/transactions/{id}/verify` | participant | **Server-side** verification with the provider. The browser redirect is never trusted. |
| POST | `/transactions/{id}/cancel` | `Investor` | Investor abandoned the attempt. |
| GET | `/transactions/{id}` | participant | |
| GET | `/mine` | `Investor` | `InvestorPayments` — the investor's payment history + summary. |
| GET | `/sandbox/sessions/{sessionId}` | `Investor` | **Simulator only** — describes the fake checkout page. |
| POST | `/sandbox/sessions/{sessionId}/resolve` | `Investor` | **Simulator only** — `SandboxOutcomeInput` picks success/failure/cancel. |
| POST | `/webhook/stripe` | **anonymous** | Signature-verified (`StripeWebhookVerifier`). Returns `{ received, applied }` — `applied:false` means "recognised, changed nothing" (a duplicate). |

---

## 7. `DealRoomController` — `/api/deals` · 14 endpoints
Authenticated; access is checked per deal (investor, founder, or admin).

| Method | Path | Notes |
|---|---|---|
| GET | `/` | `?activeOnly=true` — the caller's deals (`DealSummary[]`). |
| GET | `/{investmentId:int}` | Full `DealRoom`: participants, funding state, questions (with follow-up threads), document requests, documents, term sheets, derived **health**, per-stage **durations**, **timeline**, and derived next steps. |
| POST | `/{investmentId:int}/questions` | `AskQuestionInput` — pass `parentQuestionId` to push back on an answer instead of opening a new question. One follow-up per question, from the asker, once it has an answer. |
| PUT | `/questions/{questionId:int}/answer` | `AnswerQuestionInput`. |
| POST | `/questions/{questionId:int}/withdraw` | Sets `IsWithdrawn`. |
| POST | `/{investmentId:int}/document-requests` | `RequestDocumentInput`. **Either side** may ask now — direction is derived from who asked. |
| PUT | `/document-requests/{requestId:int}` | `ResolveDocumentRequestInput`. Whoever did **not** ask resolves it: the founder fulfils by linking a data-room document (`documentId`); the investor fulfils by an uploaded file and/or `responseNote`. Either side can decline with a reason. |
| POST | `/document-requests/{requestId:int}/upload` | multipart `file`, ≤ 20 MB, same byte-signature validation as message attachments. The investor's answer to a request — stored on the row itself, never promoted to the venture's public data room. |
| GET | `/document-requests/{requestId:int}/file` | Downloads what was uploaded. Participants only. |
| POST | `/document-requests/{requestId:int}/withdraw` | |
| POST | `/{investmentId:int}/terms` | `TermSheetInput` (amount, equity%, valuation, use of funds, other terms). Either side may propose; proposing counts as that side's own acceptance. A live sheet is superseded, not blocked, by a new proposal. |
| POST | `/terms/{sheetId:int}/accept` | The **other** side's acceptance. Completing the pair sets `Status = Accepted`, stamps `AgreedAtUtc`, and moves the relationship's `Stage` to `Committed` **through `StageLog`** — the first time that stage has been backed by a document rather than a claim. |
| POST | `/terms/{sheetId:int}/decline` | `DeclineTermsInput` (reason required — a decline with no reason ends the conversation, not just the sheet). |
| PUT | `/{investmentId:int}/note` | Writes the caller's **own** note field only. |

---

## 8. `MessagesController` — `/api/Message` · 9 endpoints
Authenticated. Real-time counterpart: `ChatHub` on `/hubs/chat`.

| Method | Path | Notes |
|---|---|---|
| POST | `/send` | `SendMessageDto` — optional `projectId` scopes the thread to a venture. |
| POST | `/send-attachment` | `SendAttachmentDto`, multipart. **Images only.** |
| GET | `/attachment/{messageId}` | Attachment bytes. |
| GET | `/conversation/{senderId}/{receiverId}` | `?projectId=` optional. |
| GET | `/conversations/{userId}` | Inbox: last message, unread count, presence, last-seen. |
| POST | `/read/{partnerId}` | Marks a thread read; broadcasts a live read receipt. |
| GET | `/unread-count` | Badge count. |
| GET | `/message/{id}` | |
| DELETE | `/message/{id}` | Sender only. |

---

## 9. `NotificationController` — `/api/notification` · 4 endpoints
Authenticated.

| Method | Path | Notes |
|---|---|---|
| GET | `/{userId}/notifications` | `?page=1&pageSize=50`. |
| POST | `/notifications/{notificationId}/mark-as-read` | |
| POST | `/{notificationId}/approve-support` | `Innovator` — **approves the support request from the notification row itself.** The relationship-addressed twin used by the founder request board lives at §5, `POST /api/investor/investments/{investmentId}/approve-support` — it survives the notification being gone. |
| POST | `/{notificationId}/reject-support` | `Innovator` |

---

## 10. `BookmarkController` — `/api/bookmarks` · 4 endpoints
Authenticated.

| Method | Path |
|---|---|
| POST | `/{projectId}` |
| DELETE | `/{projectId}` |
| GET | `/` — the saved list, as cards |
| GET | `/ids` — just the ids, for cheap "is saved?" checks |

---

## 11. `FollowController` — `/api/follows` · 5 endpoints

| Method | Path | Auth |
|---|---|---|
| POST | `/{userId}` | authenticated — notifies the followed user if `NotifyOnFollow` |
| DELETE | `/{userId}` | authenticated |
| GET | `/following/ids` | authenticated |
| GET | `/{userId}/followers` | **anonymous** |
| GET | `/{userId}/following` | **anonymous** |

---

## 12. `ProjectEngagementController` — `/api/projects` · 4 endpoints

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/{projectId}/view` | **anonymous** | Deduped by viewer id or fingerprint. |
| GET | `/{projectId}/analytics` | `Innovator` + owner | Views, conversion, engagement over time. |
| GET | `/{projectId}/reviews` | **anonymous** | `ReviewSummary` + list. |
| POST | `/{projectId}/reviews` | `Investor` · **eligible only** | `SubmitEndorsementDto`. Eligibility = approved investment on that project **and** the project reached its goal. One per (project, investor). |

---

## 13. `CapitalController` — `/api/capital` · 3 endpoints
**`Innovator` only** — this is the founder's half of the marketplace.

| Method | Path | Query |
|---|---|---|
| GET | `/` | `search`, `sector`, `band`, `trackRecord`, `sort`, `page=1`, `pageSize=12` → `PagedResult<InvestorCard>` |
| GET | `/facets` | same filters, returns counts |
| GET | `/my-ventures` | the founder's open ventures, for the "approach investor" dialog |

Only investors with `ListedInDirectory == true` appear. `band` maps to a `TicketMin`/`TicketMax` range.

---

## 14. `SignalsController` — `/api/signals` · 5 endpoints
Authenticated.

| Method | Path | Notes |
|---|---|---|
| GET | `/searches` | Saved searches **with a new-match count since `LastSeenAtUtc`**. |
| POST | `/searches` | `SaveSearchInput`. |
| POST | `/searches/{id:int}/seen` | Resets the new-match count. |
| DELETE | `/searches/{id:int}` | |
| GET | `/action-center` | Everything genuinely waiting on the caller: undecided requests, open questions, unfulfilled document requests, payments due. |

---

## 15. `VentureInsightsController` — `/api/insights` · 1 endpoint
**`Innovator` only.**

`GET /venture/{projectId:int}` → `VentureInsights`: funnel stages, document engagement, stalled relationships, trust signals.

---

## 16. `FounderDashboardController` — `/api/dashboard` · 1 endpoint
**`Innovator` only.** `GET /founder` → `FounderDashboard` (KPIs, funding over time, pipeline, pending approvals, top ventures, recent activity, comments).

## 17. `InvestorDashboardController` — `/api/dashboard` · 1 endpoint
**`Investor` only.** `GET /investor` → `InvestorDashboard` (KPIs, pipeline, backed ventures, allocation slices, activity).

---

## 18. `ReportController` — `/api/reports` · 1 endpoint
`POST /` — authenticated. `SubmitReportDto` (reason + details). Creates a `Report(Open)`.

## 19. `FeedController` — `/api/feed` · 1 endpoint
**`Admin` only.** `GET /` — `?type=`, `?page=`, `?pageSize=20`. Platform-wide activity feed.

---

## 20. `AdminController` — `/api/admin` · 12 endpoints
**`Admin` only**, except `bootstrap`.

> **`AdminReasonDto` is required on every destructive action.** `Reason` is mandatory
> (4–500 characters); an empty one is a `400`. It is stored on the target where a column
> exists (`User.SuspensionReason`, `Project.ModerationNote`) **and** in
> `AdminAuditLog.Reason`. Same standard the reconciliation queue already applied to its
> resolution notes — the person affected will ask why, and that answer has to survive.

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/bootstrap` | **anonymous** · `PasswordReset` limit | Creates the first admin using `AdminBootstrap:SecretKey`. Constant-time secret comparison. |
| POST | `/admins` | Admin | Create another admin. |
| GET | `/users` | Admin | `search`, `userType`, `page=1`, `pageSize=20`. |
| DELETE | `/users/{userId}` | Admin | **Body:** `AdminReasonDto`. **Soft** delete + audit row with before/after. |
| DELETE | `/projects/{projectId}` | Admin | **Body:** `AdminReasonDto`. **Soft** delete + audit row with before/after. |
| POST | `/users/{userId}/suspend` | Admin | `AdminReasonDto`. Blocks login; logged in `SecurityLog` as `login_blocked_suspended` on attempt. |
| POST | `/users/{userId}/restore` | Admin | Lifts the suspension and an admin deletion. No reason required — this is the reversal, not the harm. |
| GET | `/security` | Admin | `?days=14&take=40` — security events. |
| GET | `/growth` | Admin | `?months=6` — signup/venture growth. |
| GET | `/alerts` | Admin | What is waiting on a human, counted against **stated thresholds** (see below). |
| GET | `/audit-log` | Admin | `?page=1&pageSize=30&adminId=&action=&targetType=&from=&to=`. Returns `facets` (distinct actions, target types, admins) built from the rows present. |
| GET | `/analytics` | Admin | Platform KPIs. |

### `/alerts` — thresholds, not detection

There is deliberately **no anomaly detection**. At this size there is no baseline to
deviate from, and a detector trained on nothing produces confident nonsense. Every figure
is a count against a rule, and the rule travels with the response so the UI can state it:

| Field | Threshold | Constant |
|---|---|---|
| `heavilyReported` | ventures with **≥ 2** open reports | `reportThreshold` |
| `staleUnappliedEvents` | unapplied, unreviewed `PaymentEvent` older than **24h** | `staleEventHours` |
| `recentFailedPayments` | failed transactions in the last **7 days** | `failedPaymentDays` |

Also returns `pendingReview`, `openReports`, `lockedAccounts`, `suspendedAccounts`.

---

## 20a. `AdminUserOverviewController` — `/api/admin` · 1 endpoint

| Method | Path | Notes |
|---|---|---|
| GET | `/users/{userId}/overview` | One account and everything attached: `Account · Security · Ventures · Reports · Deals · Payments · Activity`. Ignores query filters throughout — a suspended or removed account is the one being looked at. Money comes from `FundingMath`; nothing is recomputed here. |

## 20c. `AdminInsightsController` — `/api/admin` · 1 endpoint

| Method | Path | Notes |
|---|---|---|
| GET | `/insights` | Relationship funnel, conversions, time-in-stage, revenue by month and by venture. |

**Every ratio is returned as `numerator` + `denominator`, never as a percentage.** At
fifty accounts one decline moves an approval rate by several points, so a bare `44%`
carries precision the counts cannot support. The interface leads with `21 / 48` and keeps
the percentage as the smaller reading.

- **Funnel is cumulative** — "ever reached at least this stage", taken from
  `InvestmentStageEvent` where history exists and from the current stage otherwise. A
  relationship approved and later declined still counts as approved, because it was.
  `Declined` is reported separately: it is where relationships leave the funnel, not a
  rung of it.
- **Time in stage** comes from `InvestmentStageEvent.MinutesInPreviousStage`, written at
  the moment of each move — measured, not estimated. The **median**, not the mean, and
  `samples` travels with every figure so a number resting on three observations cannot
  read as a fact about the platform. `relationshipsWithHistory` vs `totalRelationships`
  says how much of the platform the timings actually cover.
- **No retention or cohort analysis.** Sessions are not recorded, so any such figure
  would be invented.

## 20b. `AdminSearchController` — `/api/admin` · 1 endpoint

| Method | Path | Notes |
|---|---|---|
| GET | `/search?q=` | Minimum 2 characters. Matches users (name/email/id), ventures, relationships, transactions (`Reference`, provider ids), and reports. Results **grouped by kind, never ranked** — max 5 per group. Suspended/removed rows are returned with `muted: true`, not filtered out. |

---

## 21. `AdminModerationController` — `/api/admin` · 6 endpoints
**`Admin` only.** Every action writes an `AdminAuditLog` row **in the same
`SaveChangesAsync` as the change it describes**, so an action cannot commit without its
record.

| Method | Path | Notes |
|---|---|---|
| GET | `/projects/pending` | `?page=1&pageSize=20` — the review queue. |
| POST | `/projects/{projectId}/approve` | Publishes the listing; notifies followers (`NewProject`). |
| POST | `/projects/{projectId}/reject` | `AdminReasonDto` — **required**. Stored on `Project.ModerationNote`, sent to the founder verbatim, and written to the audit row. |
| GET | `/reports` | `?status=&page=&pageSize=20`. |
| POST | `/reports/{id}/resolve` | |
| POST | `/reports/{id}/dismiss` | |

---

## 22. `AdminRevenueController` — `/api/admin/revenue` · 6 endpoints
**`Admin` only.**

| Method | Path | Notes |
|---|---|---|
| GET | `/` | `AdminRevenue`: KPIs, revenue over time, top-earning ventures. Built from **snapshotted** `FeeAmount`, never recomputed from current config. |
| GET | `/transactions` | `?status=&q=&page=1&pageSize=25`. |
| POST | `/transactions/{id:int}/refund` | `RefundInput` (reason). **The only path to a refund** — never self-service. Moves `Succeeded → Refunded`, which removes it from every funded figure by construction. |
| GET | `/reconciliation` | `?includeReviewed=false&page=1&pageSize=50` — `PaymentEvent` rows where `Applied = false`: resent confirmations, and the `CONFLICT` ones where the provider says a payment landed against an attempt Vestora had already closed. Conflicts sort first. |
| POST | `/reconciliation/{id:int}/reverify` | Re-runs the transaction behind the event through the **ordinary** `VerifyAsync` confirmation path — never patches a row directly. |
| POST | `/reconciliation/{id:int}/review` | `ReviewEventInput` (note required). Records what an admin found. **Never rewrites `Applied` or `Outcome`** — those describe what the system did at the time; a later human finding is a separate fact. |

---

## SignalR — `/hubs/chat`

Auth: `?access_token=<jwt>` in the query string (browsers cannot set headers on a WebSocket handshake). `JwtBearerEvents.OnMessageReceived` picks it up for `/hubs` paths only.

**Client → server**

| Method | Signature |
|---|---|
| `GetPresence` | `(int[] userIds) → { userId, isOnline, lastSeenAt }[]` |
| `Typing` | `(int receiverId, bool isTyping)` |
| `SendMessage` | `(int receiverId, string content)` |

**Server → client**

| Event | Payload |
|---|---|
| `ReceiveMessage` | the persisted message |
| `ReceiveNotification` | `{ notificationId, content, dateCreated, isRead, notificationType, projectId, investmentId, actorUserId, userId }` |
| presence / typing / read-receipt events | broadcast to the `user:{id}` group |

On connect the caller joins group `user:{id}`; on last disconnect `User.LastSeenAt` is persisted.

---

## Frontend module → controller map

Every HTTP call in the app goes through `Frontend/vestora/src/lib/api/`:

| Module | Controllers it talks to |
|---|---|
| `auth.ts` | AuthController, `GET /api/users/me` |
| `users.ts` | UsersController |
| `projects.ts` | ProjectsController |
| `story.ts` | ProjectStoryController |
| `investor.ts` | InvestorController |
| `payments.ts` | PaymentsController, AdminRevenueController |
| `deals.ts` | DealRoomController, SignalsController |
| `dashboard.ts` | Founder/InvestorDashboardController, stage + note endpoints |
| `admin.ts` | AdminController, AdminModerationController |
| `capital.ts` | CapitalController |
| `messages.ts` | MessagesController |
| `notifications.ts` | NotificationController |
| `bookmarks.ts` · `follows.ts` · `engagement.ts` · `insights.ts` | the matching controllers |
| `client.ts` | none — the transport itself (bearer, refresh, error shape) |
