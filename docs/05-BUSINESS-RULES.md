# 05 · Business Rules & Invariants

> **Read this before touching anything that involves money, permissions, or state transitions.**
> These rules are enforced in code and, where it matters, in the database. Breaking one is a correctness bug, not a style preference.
> **English by design** — every constant here is a literal value in the code and the database.

---

## 1. The four funding figures

**Single source of truth:** `Services/FundingMath.cs`. Nothing else in the codebase may compute these.

```
Interest  ≥  Committed  ≥  Funded          (holds everywhere by construction)
```

| Figure | Definition | Predicate |
|---|---|---|
| **Interest** | Requests awaiting a founder decision. **Not capital.** | `Investment.Status == "Pending"` |
| **Committed** | The founder accepted the relationship. **Still not capital** — a stated intention with a person attached. | `Investment.Status == "Approved"` |
| **PaymentDue** | A funding request is open and unpaid. Capital, promised. | `FundingRequest.Status == "Open"` |
| **Funded** | A payment settled. **This, and only this, is money.** | `PaymentTransaction.Status == "Succeeded"` |

### Rules

1. **Never call founder approval "raised".** It is `committed`. The word `raised` does not appear in new code.
2. **Never write the sum by hand.** Use `FundingMath.FundedOf`, `CommittedOf`, `InterestOf`, `PaymentDueOf` (SQL-translatable `Expression`s) or `FundingMath.SummariesAsync(db, projectIds)` for a batch.
3. **A round is complete when the money arrived**, not when people said yes: `IsFullyFunded` (funded ≥ goal) is distinct from `IsFullyCommitted` (committed ≥ goal).
4. **Refunds subtract by construction.** A refunded transaction leaves `Succeeded`, so it drops out of every funded sum with no special case anywhere.
5. `FundingMath.SummariesAsync` uses `IgnoreQueryFilters()` deliberately — a soft-deleted venture's settled money must still reconcile in admin revenue.
6. **A commitment may settle over several tranches.** `Funded` on one relationship is the **sum** of its succeeded transactions, compared against a commitment target (the accepted term sheet's amount, else the investment's own amount) — never "has one payment succeeded". See `PartiallyFunded` below and [§3.0–3.1](#30-term-sheet--what-backs-committed).

### Public status on a venture card

`FundingMath.PublicStatus(funded, committed, goal)`:

| Result | Condition |
|---|---|
| `"Funded"` | `funded >= goal` |
| `"Fully Committed"` | `committed >= goal` (but not yet funded) |
| `"Raising"` | otherwise, or `goal <= 0` |

> `"Fully Committed"` exists as its own state so a round that is spoken for but unpaid is neither hidden nor overstated.

### Remaining capacity

```csharp
RemainingCapacity(goal, committed) = Math.Max(0, goal - committed)
```

**Measured against commitments, not funded money.** A founder who has already accepted the full goal must stop taking new requests even before anyone pays — otherwise the round is oversubscribed the moment payments land and somebody who was told yes has to be told no. Lapsed requests release their share when the sweeper expires them.

### Relationship funding state

`FundingMath.StateOf(...)` is **derived, never stored** (a stored column would be a fifth place for the numbers to disagree). Evaluation order matters:

```
hasSucceededPayment && isFullySettled → "Funded"
investmentStatus == Declined          → "Declined"
hasSucceededPayment                   → "PartiallyFunded"
hasProcessingPayment                  → "Processing"
hasOpenRequest                        → "PaymentDue"
hasRefundedPayment                    → "Refunded"
investmentStatus == Approved          → "Committed"
otherwise                             → "Requested"
```

**`PartiallyFunded` is a tranche having landed with more still owed** — money in hand outranks an open ask on purpose, because "PaymentDue" would erase the part that already settled. `isFullySettled` compares the **sum** of every `Succeeded` transaction on the relationship against a commitment target — the accepted term sheet's amount when one exists, otherwise the investment's own amount (`FundingMath.IsFullySettled` / `CommitmentTargetAsync`). Before tranches existed this was "has any payment succeeded", which declared a relationship funded on its first instalment and made the rest of a split commitment uncollectable — with the balance still sitting in `Committed` forever.

---

## 2. The relationship pipeline

**Source of truth:** `Services/PipelineStages.cs`. Mirrored in `Frontend/vestora/src/lib/deals/stages.ts`.

```
New → Reviewing → Approved → Contacted → InDiscussion → Committed → Closed
                     │
                     └──────────────────────────────────────────▶ Declined
```

| Stage | Meaning |
|---|---|
| `New` | Request just submitted |
| `Reviewing` | Founder is looking at it |
| `Approved` | Founder accepted — **counts toward funding** |
| `Contacted` | Founder reached out |
| `InDiscussion` | Active back-and-forth |
| `Committed` | Both sides accepted a `TermSheet` — see §3.0. Reached automatically the moment the second acceptance lands, or (for relationships with no term sheet) when a funding request is issued. |
| `Closed` | Relationship concluded |
| `Declined` | Founder said no — **row kept for history** |

**Rules**

- `CountsTowardFunding(stage)` is true for `Approved`, `Contacted`, `InDiscussion`, `Committed`, `Closed`. `New`, `Reviewing`, `Declined` do not count.
- **`Status` and `Stage` are two different axes.** `Status` is the funding gate (`Pending`/`Approved`/`Declined`); `Stage` is what is actually happening between two people. Do not collapse them.
- Only the **founder who owns the project** may move a stage (`PATCH /api/investor/investments/{id}/stage`). An investor gets `403`.
- **Moving to any stage that `CountsTowardFunding` also sets `Status = "Approved"`** — the funding gate is kept consistent with the pipeline automatically.
- **Accepting a stage that counts toward funding — including the founder's own approval — is checked against `RemainingCapacity` first**, the same guard §1 describes for a new support request. Capacity used to be enforced only at submission; several requests can each fit an empty round on their own, and accepting all of them pushed `Committed` past the goal with no way back, because every funding request after that is measured against a total that already exceeds the target.
- **Every stage move is appended to `InvestmentStageEvent`** through `Services/StageLog.cs`, never assigned to `Investment.Stage` directly — see [03-DATA-MODEL §4](03-DATA-MODEL.md). The append happens in the same `SaveChangesAsync` as the column it describes.
- Declining sets **both** `Status` and `Stage` to `Declined`, stores `DeclinedReason`, and calls `CloseFundingForAsync`: any open funding request **and any live checkout** are cancelled. **Never delete the row.**
- **Moving to `Closed` also closes out funding** the same way declining does — a concluded relationship cannot still be collecting on an open ask.
- **A funded investment cannot be declined** — not via `reject-support` and not via a stage change. Both return *"Request a refund instead."* Reversing arrived money is an admin action with an audit trail, not a dropdown on a pipeline board.
- The stage vocabulary is deliberately limited to what the product can evidence. No "Due Diligence" / "Negotiation" theatre — Vestora holds no contracts.
- **Private notes:** `FounderNote` and `InvestorNote`. Each side writes and reads only its own field. Neither ever sees the other's.

---

## 3. Payments — the state machines

> **Sandbox only.** The app throws at startup if `Payments:Stripe:SecretKey` is not `sk_test_…`. The check runs twice: `Program.cs` and `StripeSandboxPaymentProvider`'s constructor.

### 3.0 Term sheet — what backs `Committed`

```
                (either side proposes — proposing is that side's own acceptance)
                        ↓
                   Proposed ──────────► Accepted   (second acceptance lands)  [terminal]
                        │                    ↑ moves relationship Stage → Committed
                        ├────────────────────┴──► Declined   (reason required)  [terminal]
                        └──► Superseded   (a new version is proposed while this one is live) [terminal]
```

`TermSheetService.ProposeAsync` preconditions: relationship `Status == "Approved"`; `Stage` not `Declined`/`Closed`; `0 < amount ≤ 100,000,000`; equity 0–100%; if anything has already settled on this relationship, the new amount cannot be less than what settled.

- **Both acceptances are tracked separately** (`FounderAcceptedAtUtc`, `InvestorAcceptedAtUtc`). One side accepting on behalf of the pair is exactly the claim this table exists to stop the product making.
- **`UX_TermSheets_OneLivePerInvestment`** — at most one `Proposed` sheet per relationship. Proposing while one is already live **supersedes** it rather than being blocked, so renegotiation never leaves a window with no terms at all.
- Reaching `Accepted` moves the relationship's `Stage` to `Committed` through `StageLog`, with the sheet's version and amount as the reason — the first time that stage has been backed by a document instead of a claim.
- Not a contract. Vestora holds no signatures and enforces nothing.

### 3.1 Funding request

```
        (founder issues)
            ↓
          Open ──────► Paid       (a payment attempt succeeded)   [terminal]
            │
            ├────────► Cancelled  (founder withdrew, or round closed) [terminal]
            └────────► Expired    (nobody paid in time — sweeper)      [terminal]
```

**Preconditions for issuing** (`PaymentService.CreateFundingRequestAsync`), in order:

1. Caller owns the project → else `403`.
2. `Investment.InvestorId != null`.
3. `Investment.Status == "Approved"` → *"Approve this request before asking for funds."*
4. `Stage` is not `Declined` or `Closed`.
5. `Project.LifecycleStatus != "Closed"`.
6. `0 < amount ≤ 100,000,000`.
7. No `Open` request already exists for this investment.
8. **The commitment is not already fully settled** — `IsFullySettled(sumOfSucceeded, commitmentTarget)`, not "no transaction has ever succeeded". A commitment may be called in over several tranches; testing for any success at all would block every request after the first instalment.
9. `amount ≤ RemainingCapacity(goal, committedElsewhere) − sumOfSucceeded` — this relationship's own commitment is excluded from the round total (otherwise a founder could never call in the last deal), and its own already-settled tranches are excluded again (otherwise the same commitment could be called in twice by splitting it).
10. When an accepted term sheet exists, `amount ≤ UnsettledCommitment(termSheet.Amount, sumOfSucceeded)` — an ask may call the agreement in, never quietly exceed it. A bigger number is a renegotiation, with its own door (§3.0).

**Side effects:** the relationship advances to `Committed` (unless already `Committed`/`Closed`), recorded through `StageLog` with the request's reference as the reason. Investor gets a `funding_requested` notification. An `AdminAuditLog` row is written.

> ⚠️ **Why step 8 tests the transaction, not the request status:** a refunded request keeps `Paid` on purpose — it *was* paid and then reversed, and rewriting the row would erase the first half of that. But the money is gone, so the founder must be able to ask again. Reading the request's status here would freeze every refunded deal forever.

**Reminders:** the sweeper sends up to two, at T-3-days and T-1-day before `ExpiresAtUtc`, to the investor only — it's their move, and a founder does not need telling twice that someone else has not paid. `FundingRequest.RemindersSent` tracks which rung has fired.

**Counter-offer** (`PaymentService.CounterOfferAsync` / `AnswerCounterOfferAsync`) — the investor's answer to a figure they don't want to pay as stated:

- The investor proposes `CounterAmount` against an `Open` request. One live counter at a time; any in-flight checkout on that request is cancelled first — paying the original figure and proposing a different one are contradictory answers to the same question.
- The founder **accepts or declines**. Accepting does not edit the amount in place: it closes the countered request (`ClosedReason = "Superseded by the agreed …"`) and issues a **new** request at the countered figure through the ordinary creation path above — every precondition on this list runs again for the replacement.
- If the replacement is refused (capacity, a closed round, an agreed term sheet that no longer covers it), **the original request is reopened** rather than leaving the relationship with no live ask at all — the investor was never told their counter succeeded, so silently ending the negotiation there would be worse than the original ask standing.

### 3.2 Payment transaction

```
                        ┌────────► Failed      [terminal]
                        │
 Initiated ──► Processing ──► Succeeded ──► Refunded  [terminal]
      │                 │
      └─────────────────┴───► Cancelled     [terminal]
```

**Terminal rows are immutable**, apart from the single `Succeeded → Refunded` step. **A retry is always a new row** with `AttemptNumber + 1` — a failed card is a fact about what happened, not an absence of history.

**Opening a checkout** (`CreateCheckoutAsync`):
- A **live** attempt (`Initiated`/`Processing`) that has not expired and has a URL is **resumed**, not duplicated (`Resumed: true`). Two open checkouts for one request is the shortest path to funding something twice.
- A **stale** live attempt is closed out as `Cancelled/abandoned` first, so the attempt history stays honest.
- Rate-limited: 8 per 5 minutes.

**Settlement** (`SettleAsync`) freezes the economics **onto the row**:

```
feeRateBps  = transaction.FeeRateBps         (quoted at checkout — falls back to
                                               Payments:FeeRateBps only if unset)
fee         = round(amount * bps / 10000, 2, AwayFromZero)
net         = amount - fee
```

The rate is read from the transaction's own row, not live configuration, because it was already quoted to the investor when the checkout opened — a rate change between checkout and settlement must not move the founder's proceeds after the fact. `FeeRateBps`, `FeeAmount`, `NetToFounder` are snapshotted at success and **never recomputed**. Changing the platform's rate next term must not rewrite what Vestora earned last term.

The fee comes **out of the founder's proceeds**, never on top of what the investor pays.

**Also on settlement:** `FundingRequest → Paid`, relationship `Stage → Committed` (unless `Closed`), and both parties get a `payment_succeeded` notification carrying the sandbox disclosure.

**Refund** (`RefundAsync`) — **admin only**, never self-service:
- Only a `Succeeded` transaction can be refunded, and only once.
- **Claims a `PaymentEvent` key (`refund:{transactionId}`) before calling the provider**, not after — two admins on the same receipt both pass the status check before either writes, and the claim is what moves that collision to before the irreversible call instead of after it. A refusal from the provider frees the claim so a corrected attempt can retry; a genuine refund marks it `Applied = true`.
- The funding request **stays `Paid`** — the honest record is "it was paid, then reversed".
- Funded totals and platform revenue both fall automatically, because the row left `Succeeded`. The platform does not keep revenue on money it returned.
- Both parties are notified.

### 3.3 The database constraints that carry the system

Database constraints, not service checks — **application code loses races, indexes do not.**

| # | Index | Guarantees |
|---|---|---|
| 1 | `UX_FundingRequests_OneOpenPerInvestment` — unique `InvestmentId` where `Status='Open'` | One live ask per relationship. Two would let one deal be funded twice. |
| 2 | `UX_PaymentTransactions_OneActivePerRequest` — unique `FundingRequestId` where `Status IN ('Initiated','Processing')` | One live attempt per request. |
| 3 | `UX_PaymentTransactions_OneSucceededPerRequest` — unique `FundingRequestId` where `Status='Succeeded'` | Even if every other guard failed, the database refuses to record the same funding twice. |
| 4 | `UX_PaymentEvents_ProviderEventId` — unique `(Provider, ProviderEventId)` | **The idempotency gate**, now also claimed by refunds. |
| 5 | `UX_Investments_OneLivePerInvestor` — unique `(ProjectId, InvestorId)` where `InvestorId IS NOT NULL AND Status IN ('Pending','Approved')` | One live relationship per investor per venture — closes the check-then-insert race in `SupportProject`. |
| 6 | `UX_TermSheets_OneLivePerInvestment` — unique `InvestmentId` where `Status='Proposed'` | One proposal on the table at a time. |

### 3.4 Idempotency & the double-confirmation race

Two paths can confirm the same payment **at the same moment**: the browser's return-trip verify, and the provider's webhook. Providers also legitimately resend webhooks.

```
confirmation arrives (webhook | verify | sweep | simulated)
        ↓
BEGIN TRANSACTION
INSERT INTO PaymentEvents (Provider, ProviderEventId, …)   ← constraint #4
        ↓ unique violation?
       yes → ROLLBACK → { received: true, applied: false }   nothing downstream runs
        ↓ no
apply the effect (settle / fail / cancel / mark processing)
        ↓ DbUpdateConcurrencyException (RowVersion)?
       yes → ROLLBACK, forget tracked changes → the other path already did the work → treat as success
        ↓ any other exception?
       yes → ROLLBACK (the claim goes with the failed effect, so a retry can still apply it) → rethrow
        ↓ no
COMMIT
```

**Rules**
- Every confirmation path **records the event before acting on it**, and the claim and the effect commit or roll back **together, in one transaction** — a process death between the two used to leave the key claimed and the settlement lost, with no retry able to recover it because the retry is exactly what the claimed key then blocked.
- For a *verify*, `ProviderEventId` is a deterministic key derived from the session + outcome, so a repeated verify collides with itself.
- **The redirect is never trusted.** Returning to the success URL only triggers a server-side `verify`. Settlement comes from the provider's own answer or a signature-verified webhook.
- A settled payment arriving against an already-closed attempt is logged as `RECONCILIATION:` at **error** level and recorded with a `CONFLICT` outcome — never swallowed as a duplicate, and surfaced to a human through `GET /api/admin/revenue/reconciliation` rather than living only in the log.

### 3.5 Expiry sweeper

`PaymentExpirySweeper` (hosted service), every 3 minutes:
- `Initiated`/`Processing` past `ExpiresAtUtc` — **asks the provider first**, through the same confirmation path §3.4 describes, before writing anything off. Expiry is Vestora's clock running out, not evidence about what the provider did; an investor who pays in the last minute before a sweep runs must not have that payment discarded as abandoned. Only an attempt the provider still calls open is cancelled with reason `expired`. If the provider cannot be reached, the attempt is left alone for the next sweep — up to 24 hours past its deadline, after which it is written off anyway (logged as `RECONCILIATION:`) so one unanswerable attempt can never permanently block the relationship's one-live-attempt constraint.
- `Open` funding requests past `ExpiresAtUtc` → `Expired`, which **releases their share of the round's capacity**. Both sides are notified (`funding_request_expired`) — a request that lapsed in silence left the investor wondering where the pay button went and the founder still believing money was on its way.
- Sends the T-3-day / T-1-day reminder ladder described in §3.1, to the investor only.

TTLs: `Payments:CheckoutTtlMinutes` (default 35) · `Payments:FundingRequestTtlDays` (default 14).

For Stripe, the session's `expires_at` is aligned to the transaction's own TTL (clamped into Stripe's 30 min – 24 h window). Without it Stripe's checkout would outlive an attempt Vestora already swept, and a late payment would land against a closed row.

---

## 4. Venture lifecycle & moderation

### 4.1 Two independent axes

| Axis | Owner | Values |
|---|---|---|
| `ModerationStatus` | **Admin** | `PendingReview` → `Approved` \| `Rejected` |
| `LifecycleStatus` | **Founder** | `Active` \| `Paused` \| `Closed` |

**Public visibility requires `ModerationStatus == "Approved"` AND `LifecycleStatus != "Paused"`.** The owner can always preview their own listing.

### 4.2 Support requests

`POST /api/investor/{projectId}/support` rejects when:

1. Amount `<= 0`.
2. The caller owns the project.
3. `LifecycleStatus` is `Paused` or `Closed`.
4. `ModerationStatus != "Approved"`.
5. `amount > RemainingCapacity(goal, committed)`.
6. The investor already has a `Pending` or `Approved` request on this project (**one live support per project per investor**).

On success: `Investment(Status=Pending, Stage=New)` + `ContactInfo` stored as `"{method}: {value}"` (method alone left the founder with the word "Email" and no address), plus two notifications — `ProjectSupported` to the founder and `ProjectSupportSubmitted` to the investor.

### 4.3 Closing a round

`POST /api/projects/{projectId}/close-round`:
- `Outcome` must be one of `Completed` \| `PartiallyRaised` \| `Withdrawn` — **stated by the founder, never inferred from the numbers.** Only they know whether a round that reached 60% was a success or an abandonment.
- Cannot close an already-closed round.
- Sets `LifecycleStatus = "Closed"`, `RoundClosedAtUtc`, `RoundOutcome`, `RoundClosingNote` (≤ 600 chars).
- **Cancels every open funding request** (`ClosedReason = "The round closed before this was paid."`).
- **A live checkout is deliberately left alone**, not killed — pulling it out from under an investor mid-payment produces a charge with nothing to attach it to. If it lands, settlement marks the request `Paid` and the record reads honestly: the ask was withdrawn and the payment already under way completed anyway. If it does not land, the sweeper cancels the attempt and the withdrawal simply stands.
- **Concludes every live relationship:** `Approved` (or already funded) → `Stage = Closed`, its commitment keeps counting. Never-approved → `Status = Stage = Declined` with reason *"The round closed before this request was reviewed."* — leaving it open would strand the investor waiting on a round that no longer exists.
- Every affected backer gets a `round_closed` notification. The response reports `relationshipsConcluded` and `requestsDeclined`.
- **Nothing is deleted.** Commitments, relationships, the data room and the timeline all survive. `Closed` still counts toward the committed total, so the record of who backed the venture stays intact.

**Reopening** (`PATCH /lifecycle` back to `Active`) **clears** `RoundClosedAtUtc`, `RoundOutcome` and `RoundClosingNote` — a live round must not still carry an outcome.

### 4.4 Moderation

- New and edited listings land in `PendingReview`.
- Approval publishes the listing and fans out a `NewProject` notification to the founder's followers.
- **Rejection stores the reason** on `Project.ModerationNote` (not just in a notification) so both the admin queue and the founder can read it later. The founder gets `ProjectRejected` pointing at `/my-projects/{id}/edit`.
- Every admin action writes an `AdminAuditLog` row.

### 4.5 Endorsements (reviews)

An investor may endorse a venture only when **both** hold:
1. They have an `Approved` investment on that project, **and**
2. The project reached its funding goal.

One endorsement per `(project, investor)` — enforced by a unique index.

---

## 5. Notifications

**Backend types** are written at the emit sites. **Two naming conventions coexist** (`PascalCase` from the original controllers, `snake_case` from the deal room) and **both are load-bearing on rows already in the database** — do not "tidy" them into one.

**Frontend taxonomy:** `lib/notifications/taxonomy.ts` sorts every type into one of three lanes:

| Lane | Meaning |
|---|---|
| **`needsYou`** | Nobody but the viewer can clear this. Stays until they act. **Never auto-marked read.** |
| **`outcome`** | Somebody else decided something about the viewer. Worth reading once. |
| **`activity`** | The world moved. Safe to never read. |

| Type | Lane |
|---|---|
| `ProjectSupported` | needsYou *(resolvable inline — approve/decline from the row)* |
| `deal_question` · `doc_request` · `funding_requested` · `ProjectRejected` · `funding_request_reminder` · `funding_counter_offered` · `terms_proposed` | needsYou |
| `ProjectSupportApproved` · `ProjectSupportRejected` · `deal_answer` · `doc_fulfilled` · `doc_declined` · `round_closed` · `payment_succeeded` · `payment_failed` · `refund_completed` · `funding_counter_answered` · `terms_agreed` · `terms_declined` | outcome |
| `ProjectSupportSubmitted` · `ProjectUpdate` · `NewProject` · `UserFollowed` · `funding_request_expired` | activity |

> `funding_request_expired` sits in `activity` because nothing can be done about an ask that has already lapsed; the reminders that fire *before* that point (`funding_request_reminder`) are `needsYou` because there is still time to act.

Unknown types fall back to the `activity` lane with the server's own sentence — they are never lost and never mistaken for something urgent.

### Preferences

Only **ambient** notifications are silenceable: `NotifyOnFollow`, `NotifyOnProjectUpdate`.
The four support-decision notifications are **never silenceable** — a founder who muted "an investor wants to back you" would simply stop receiving the product.

`payment_failed` is only sent for a failure the investor did **not** watch happen — one that resolved after they left the checkout. Telling somebody about the error currently on their screen is noise.

---

## 6. Permissions matrix

Roles come from the JWT role claim (= `User.UserType`). Enforced by `[Authorize(Roles = …)]` **plus** in-action ownership checks.

### By area

| Operation | Guest | Investor | Innovator | Admin |
|---|:---:|:---:|:---:|:---:|
| **Auth** register / login / verify / forgot | ✅ | ✅ | ✅ | ✅ |
| change password / logout | — | ✅ | ✅ | ✅ |
| **Ventures — read** browse + filters + facets | ✅ | ✅ | ✅ | ✅ |
| venture detail + images | ✅ | ✅ | ✅ | ✅ |
| updates / milestones / team | ✅ | ✅ | ✅ | ✅ |
| **Ventures — write** create / edit / delete | — | — | ✅ owner | — |
| lifecycle (Active/Paused/Closed) · close round | — | — | ✅ owner | — |
| images / updates / milestones / team / documents | — | — | ✅ owner | — |
| **Support** submit a support request | — | ✅ | — | — |
| supported list / summary / activity | — | ✅ | — | — |
| backers list **with contact info** | — | — | ✅ owner | — |
| approve / decline a request | — | — | ✅ owner | — |
| move pipeline stage | — | — | ✅ owner | — |
| private note | — | ✅ own field | ✅ own field | — |
| **Deal room** read | — | ✅ participant | ✅ participant | ✅ |
| ask / answer / withdraw question | — | ✅ | ✅ | — |
| request / resolve document request | — | ✅ | ✅ | — |
| **Funding** issue funding request | — | — | ✅ owner | — |
| cancel funding request | — | — | ✅ owner | ✅ |
| open checkout / cancel attempt | — | ✅ own | — | — |
| verify transaction | — | ✅ participant | ✅ participant | ✅ |
| **refund** | — | — | — | ✅ |
| platform revenue | — | — | — | ✅ |
| **Documents** download public | — | ✅ | ✅ | ✅ |
| download `BackersOnly` | — | ✅ approved backer | ✅ owner | — |
| **Engagement** track view | ✅ | ✅ | ✅ | ✅ |
| comment / reply / delete own | — | ✅ | ✅ | ✅ |
| bookmark | — | ✅ | ✅ | ✅ |
| write endorsement | — | ✅ eligible | — | — |
| venture analytics / insights | — | — | ✅ owner | — |
| **Directory** investor directory `/investors` | — | — | ✅ | — |
| **Profiles** view public profile + followers | ✅ | ✅ | ✅ | ✅ |
| follow / unfollow · edit own profile | — | ✅ | ✅ | ✅ |
| **Messaging** send / receive / attachments | — | ✅ | ✅ | ✅ |
| **Reports** submit | — | ✅ | ✅ | ✅ |
| **Dashboards** founder `/api/dashboard/founder` | — | — | ✅ | — |
| investor `/api/dashboard/investor` | — | ✅ | — | — |
| **Admin** users · suspend · restore · delete | — | — | — | ✅ |
| moderation queue · approve · reject | — | — | — | ✅ |
| reports · audit log · security · growth · analytics · feed | — | — | — | ✅ |

### Ownership checks (role alone is not enough)

| Resource | Rule |
|---|---|
| Project edit/delete/lifecycle/close | `Project.OwnerId == currentUserId` |
| Updates / milestones / team / documents | ownership of the parent project |
| Approve / decline support | founder owns the project — either through the notification row or, now, directly by `investmentId` |
| Pipeline stage | founder owns the project — investors get **403** |
| Private notes | each side writes only its own field |
| `TeamMember.Email` | owner-only in the roster (prevents email harvesting) |
| `BackersOnly` documents | `CanSeeBackerDocsAsync` = owner or approved backer |
| Comment / reply delete | author only |
| Funding request | founder for issue; investor for checkout, counter-offer |
| Counter-offer answer | founder only — the counter targets the figure they set |
| Term sheet propose / accept / decline | either participant, never admin |
| Document request — ask | either participant; resolve is **whoever did not ask** |
| Deal-question follow-up | the original asker only, one per answered question |
| Reconciliation review | admin only |
| Refund | admin only |

---

## 7. Validation rules

**Server-side source of truth:** `Services/AccountRules.cs`. **Mirrored** in `Frontend/vestora/src/lib/validation/rules.ts` — the frontend copy exists so someone is told before they submit; the backend copy is the one that decides, because the endpoints are reachable without the form.

> If you change one, change the other in the same commit.

### Password
- Minimum **10** characters, maximum **72 bytes** (BCrypt ignores input past 72 — accepting more would silently store a prefix).
- No leading or trailing space.
- At least one uppercase **and** one lowercase letter.
- At least one digit.
- Not in the common-password blocklist (includes `vestora123`, `investor123`, …).
- Must not contain the local part of the user's email (when it is ≥ 4 chars).

### Name
- **Trimmed first**, then 2–50 characters.
- No digits. Must contain at least one letter **in any script** (Arabic and accented Latin pass).
- No `< > @ # $ % ^ * _ = { } [ ] | \ / ~ \` +`.

### Email
- ≤ 254 characters, shape `^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$`.
- Stored **normalized** (lowercased); uniqueness enforced by index.

### Phone
- 7–15 digits. Allowed characters: digits and `+ ( ) - . space`.
- **No national format is imposed** — Vestora takes members from anywhere.

### Birth date
- Not in the future. Age **18–100**.

### Uploads
- Images ≤ **2 MB**, `image/jpeg|png|gif|bmp`, and the **byte signature must match the declared type** (this is what blocks an executable renamed `.jpg`).

---

## 8. Time

**Every `DateTime` the application persists is UTC.**

SQL Server round-trips `datetime2` with `Kind = Unspecified`, so without intervention timestamps serialize with no timezone marker and browsers read them as **local** time. `UtcDateTimeConverter` + `UtcNullableDateTimeConverter` are registered on **both** the MVC JSON options and the SignalR JSON protocol, and stamp every value as `yyyy-MM-ddTHH:mm:ss.fffZ`.

> Consequence: a live SignalR message and the same message reloaded from history render the identical timestamp. If you add a new serializer anywhere, register these converters on it.

---

## 9. Trust signals — what may and may not be claimed

**Source:** `Services/TrustSignals.cs`.

There is **no "Verified" badge**, because Vestora verifies nothing about a person's identity, company or funds. Claiming otherwise would be the single most damaging thing this product could say.

| Strength | Meaning | Signals |
|---|---|---|
| `Verified` | Platform-verified fact | `email_confirmed`, `admin_reviewed` |
| `History` | Objective platform history | `member_since`, `backed_rounds`, `endorsed_by_backers`, `rounds_completed`, `roadmap_maintained`, `posts_updates` |
| `SelfReported` | Self-reported completeness | `mandate_stated`, `documents_published`, `team_listed` |

**Rules**
- Signals are **never summed into a score.** A single number invites comparison the underlying facts cannot support and would be read as a rating.
- `admin_reviewed` means precisely *a moderator looked at the listing* — **not** that the business was audited.
- `roadmap_maintained` only fires when a milestone actually **completed**; a roadmap of untouched plans is a plan, not a record.
- The backend states **which facts are true**; the frontend owns the wording in both languages.
- Product copy says **"reviewed"**, never **"vetted"**.

---

## 10. Deletion semantics

| Kind | Mechanism | Reversible |
|---|---|---|
| Admin deletes a user | `User.IsDeleted = true` + `AdminAuditLog` | ✅ soft |
| Admin deletes a project | `Project.IsDeleted = true` + `AdminAuditLog` | ✅ soft |
| Admin suspends a user | `IsSuspended` + `SuspendedAtUtc` + `SuspensionReason` — blocks login, logged as `login_blocked_suspended` | ✅ |
| User deletes their own account | `DeletedAtUtc` — **distinct from `IsDeleted`** so the two can be told apart in the audit trail and in support conversations | — |
| Founder declines a request | `Status = Stage = "Declined"`, row kept | — |
| Founder closes a round | Listing becomes a record; nothing removed | ✅ reopen clears the closing record |
| Deleting a project document | Also **explicitly unlinks** any `DocumentRequest` it fulfilled, reopening that request | — |
| Deleting a venture | Messages survive (`Message.ProjectId` → **SetNull**) — the two people still said those things to each other | — |

---

## 11. Checklist before you ship a change

- [ ] Does any screen say "raised" where it means **committed**? → fix the wording.
- [ ] Did you compute a funding number outside `FundingMath`? → move it in.
- [ ] Did you add a payment path that mutates state **before** inserting a `PaymentEvent`? → reorder.
- [ ] Does a new endpoint check **ownership**, not just role?
- [ ] Did you change a rule in `AccountRules.cs` without mirroring `rules.ts` (or vice versa)?
- [ ] Does a new claim in the UI assert something the platform cannot prove?
- [ ] Is every new `DateTime` UTC, and does its serializer carry the UTC converters?
- [ ] Did you add a money column without `HasPrecision(18, 2)`?
- [ ] Did you add a second index on a column that already has one, without naming it explicitly?
- [ ] Did you test "has any payment succeeded" instead of comparing the settled **sum** against the commitment target? Tranches mean the first is always wrong.
- [ ] Does a new payment confirmation path claim its `PaymentEvent` and apply its effect in the **same transaction**?
- [ ] Did you assign `Investment.Stage` directly instead of going through `StageLog.MoveAsync`?
