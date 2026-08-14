#import "/lib/report.typ": *
#import "/lib/theme.typ": *

#report-cover(
  number: 5,
  title: "Review & Approval",
  subtitle: "The gate between a draft and the public, and the record of who opened it",
  date: "September 2026",
)

#show: report.with(number: 5, name: "Review & Approval")

= Introduction

Report 4 left a venture complete, private, and submitted. This report is about
what happens next, and it is short by design: *one decision, made by a person,
recorded permanently.*

The review step is not an administrative add-on. It is the gate between a draft
and something the public can see, and it is the only thing standing between an
open submission form and a platform whose credibility depends on nobody abusing
it. A venture's life cannot be described without it.

Two queues are covered here. The *review queue* handles ventures awaiting a
first decision. The *reports queue* handles complaints about content that is
already public. They look similar and are worked differently, and the reason
they are separate is the subject of one of this report's sections.

= Objective

*Make sure nothing reaches the public without a human decision.* Every venture
passes a review, and there is no configuration that turns this off.

*Make every decision attributable.* An administrative action is an exercise of
power over someone else's work. The record of who did it, to what, and when
outlives the object it was done to.

*Write one column.* The review step touches `ModerationStatus` and nothing else.
This is stated as an objective rather than as an implementation detail because
the previous design did otherwise, and Report 4 describes what that cost.

= Features Delivered

#figure(
  table(
    columns: (42mm, 1fr),
    align: (left + top, left + top),
    table.header([Feature], [What it does]),
    [Review queue], [Every venture awaiting a first decision, oldest first.],
    [Approval], [Makes a venture eligible to be public — eligible, not
      necessarily visible.],
    [Rejection with reason], [A stated cause is required. The reason returns to
      the founder.],
    [Resubmission], [A corrected venture re-enters the queue without losing
      anything it holds.],
    [Venture registry], [Every venture in every state, for investigation rather
      than for decision.],
    [Reporting], [Any user can report a published venture for attention.],
    [Reports queue], [Reports filtered by status, worked separately from the
      review queue.],
    [Audit log], [Every administrative decision, attributed to the administrator
      who made it and retained beyond the object.],
  ),
  caption: [Features delivered in this part.],
)

= The Gate

#full-page-figure(
  "/assets/diagrams/out/flow-moderation.svg",
  caption: [The review decision. Both branches write one status column and one
    audit row. The detached panel lists the two columns a review can never reach
    — it is drawn apart from the flow because nothing in the flow connects to it,
    and that disconnection is what makes re-approval after an edit safe.],
)

Approval is the more interesting of the two branches, because it does *less*
than it appears to.

Approving a venture does not publish it. It writes `ModerationStatus = Approved`
and stops. Whether the venture is then listed depends on a second column the
administrator did not touch: `LifecycleStatus`, which belongs to the founder. A
founder who paused a venture before it was reviewed gets an approved venture that
is not listed, and that is correct — approval answers *"may this be public?"*,
not *"is this public?"*

#delivered[
  *Rejection carries a reason.* A rejected venture returns to its founder with a
  stated cause, not a bare status change. A rejection with no reason is
  indistinguishable from a fault, and produces a support request rather than a
  corrected submission.
]

== Two queues, two rhythms

The review queue and the reports queue look like the same surface and are
deliberately not merged.

#figure(
  table(
    columns: (30mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([], [Review queue], [Reports queue]),
    [Concerns], [Content that is *not yet* public], [Content that is *already*
      public],
    [Arrives], [When a founder submits — predictable], [When a user complains —
      bursty],
    [Cost of delay], [A founder waits], [Something objectionable stays up],
    [Decision], [Approve, or reject with a reason], [Act on the content, or
      dismiss the report],
    [Worked], [Oldest first, to completion], [By severity, and not necessarily to
      completion],
  ),
  caption: [Why the two queues are separate. They differ in every column that
    matters to how they are worked.],
)

Merging them would produce one list in which the urgent and the routine are
interleaved by arrival time, which is the arrangement most likely to bury the
urgent.

= Interface

#shots(
  "/assets/screenshots/review-queue-en-light.png",
  "/assets/screenshots/review-queue-ar-dark.png",
  [The review queue — the primary administrative surface, in both languages and
   both themes. Every venture waiting for a decision appears here, and nothing
   reaches the public without passing through it. The administrative area is
   fully bilingual: moderation is not an English-only back office.],
)

#shots(
  "/assets/screenshots/review-ventures-en-light.png",
  "/assets/screenshots/review-ventures-ar-dark.png",
  [The venture registry: every venture in every state. The review queue is for
   *acting*; this is for *looking*. Separating them stops an investigative search
   from being mistaken for a work queue.],
)

#shots(
  "/assets/screenshots/review-reports-en-light.png",
  "/assets/screenshots/review-reports-ar-dark.png",
  [The reports queue, filtered by status. Reports concern published content, so
   they arrive at a different rhythm and are worked differently — which is why
   they are not folded into the review queue.],
)

= Data

This report owns two tables, and neither of them cascades.

#figure(
  table(
    columns: (34mm, 1fr, 26mm),
    align: (left + top, left + top, left + top),
    table.header([Table], [Holds], [On owner delete]),
    [`Reports`], [User reports raised against a venture, with a status.],
      [Cascade],
    [`AdminAuditLog`], [Administrative decisions, attributed to an
      administrator.], [*Retained*],
  ),
  caption: [Moderation tables. The audit log is the exception to the cascade rule
    that governs every other table in Report 4.],
)

*The audit record does not cascade, and this is the point.* Everything a venture
owns describes the venture, so deleting the venture removes it. An audit entry is
different in kind: it records *something that happened*, and something that
happened does not stop having happened because its subject was deleted.

An audit log that disappears with the object it describes is not an audit log.
It is a status field with extra steps — useful right up to the moment it is
needed.

#figure(
  table(
    columns: (46mm, 1fr),
    align: (left + top, left + top),
    table.header([Index], [Why it exists]),
    [`(ProjectId, Status)` on `Reports`],
      [The moderation queue filters on exactly this pair.],
  ),
  caption: [The index this part adds.],
)

= Backend

#figure(
  ```cs
  // Moderation writes ModerationStatus and nothing else. LifecycleStatus and
  // Stage belong to other writers and are not touched here — which is what
  // makes re-approval after an edit safe.
  project.ModerationStatus  = ModerationStatus.Approved;
  project.ReviewedAtUtc     = DateTime.UtcNow;
  project.ReviewedByAdminId = adminId;

  await _audit.RecordAsync(adminId, AdminAction.ApproveProject, project.Id, ct);
  ```,
  caption: [Approval. Three fields written, one audit record, and no other state
    column referenced.],
)

The excerpt is worth reading for what is *absent* from it. There is no
assignment to `LifecycleStatus`, none to `Stage`, and no read of either. The
handler that caused the defect described in Report 4 looked almost identical and
touched one more field.

Two further properties hold across every endpoint in this part:

- *The audit record is written in the same operation as the decision*, so a
  decision cannot exist without its record.
- *A rejection without a reason is rejected at the boundary*, not stored with an
  empty string. The requirement is structural rather than a convention the
  interface happens to follow.

= Key Endpoints

#figure(
  table(
    columns: (16mm, 56mm, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Method], [Path], [Purpose]),
    [`GET`], [`api/admin/projects/pending`], [The review queue.],
    [`POST`], [`api/admin/projects/{id}/approve`], [Approve; writes the audit
      log.],
    [`POST`], [`api/admin/projects/{id}/reject`], [Reject; a reason is
      required.],
    [`GET`], [`api/admin/projects`], [The full venture registry, every state.],
    [`POST`], [`api/reports`], [Report a venture for attention.],
    [`GET`], [`api/admin/reports`], [The reports queue, filtered by status.],
    [`GET`], [`api/admin/audit`], [Read the audit log.],
  ),
  caption: [Principal endpoints in this part. Every one is role-gated to an
    administrator on the server, and none of them is reachable by knowing the
    URL.],
)

= Libraries Used in This Part

#figure(
  table(
    columns: (44mm, 1fr),
    align: (left + top, left + top),
    table.header([Library], [Role here]),
    [`Entity Framework Core`], [Queries the two queues and writes the audit
      record in the same unit of work as the decision.],
    [`FluentValidation`], [Enforces that a rejection carries a reason before a
      service sees the request.],
  ),
  caption: [No library is introduced for moderation. The gate is policy, not
    tooling.],
)

= Challenges

#challenge("A submitted venture felt like it had disappeared")[
  A founder who submitted a venture had no way to see what had happened to it,
  and a rejection arrived as a bare status with no explanation.

  *Solution.* The founder's venture list shows the moderation state of every
  venture at all times, and rejection requires the administrator to state a
  reason, which is returned to the founder. A correction can then be made and
  resubmitted rather than guessed at. The queue and the founder's list are two
  views of one column, so they cannot disagree.
]

#challenge("An audit log that cascades is not an audit log")[
  The natural schema makes every row about a venture a child of that venture, so
  deleting the venture cleans up after itself. Applied to the audit log, this
  deletes the record of the decisions made about a venture at exactly the moment
  someone might want to review them.

  *Solution.* The audit log is deliberately excluded from the cascade. It
  survives its subject. The cost is that audit rows can outlive the object they
  reference and must be readable without it — so the log stores what was decided
  rather than only a foreign key to it.
]

#challenge("A role check is not an ownership check")[
  An administrative endpoint that verifies only that the caller is an
  administrator is correct for this part and wrong almost everywhere else — and
  the two look identical in code.

  *Solution, and the limit.* Moderation endpoints are genuinely role-only,
  because an administrator's authority is not scoped to a particular venture.
  That makes this part the exception rather than the pattern, and it is stated
  here so that the pattern is not copied into a part where ownership does matter.
  Reports 4, 9 and 10 all check both.
]

= How This Fits With the Rest of the System

#figure(
  table(
    columns: (32mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Report], [Relationship], [Boundary]),
    [3 · Identity & Sessions],
      [*Depends on it.* The reviewing administrator is an identity established
       there, and every decision is recorded against it.],
      [This part never grants a role; it reads one.],
    [4 · Ventures & Lifecycle],
      [*The object this report decides about.* Submission puts a venture in the
       queue.],
      [Review writes `ModerationStatus` only. The founder's lifecycle column and
       the pipeline's stage column are unreachable from here.],
    [6 · Discovery & Engagement],
      [*Consumes this report's output.* Only approved ventures are eligible to
       be listed.],
      [Discovery reads the decision; it cannot make or change one.],
    [11 · Dashboards & Analytics],
      [*Reports on this part.* Moderation load and administrative activity are
       derived from the tables here.],
      [Analytics read the audit rows. No counter is maintained on the venture.],
  ),
  caption: [Direct relationships only.],
)

= Summary

#delivered[
  A review queue in which every submitted venture waits for a human decision, and
  no configuration that bypasses it. Approval that makes a venture *eligible* to
  be public rather than publishing it, leaving the founder's lifecycle column
  untouched. Rejection that requires a stated reason, returned to the founder so
  a correction can be made rather than guessed. A separate reports queue for
  content that is already public, kept apart because it arrives at a different
  rhythm and is worked by severity. A full venture registry for investigation.
  And an audit log, attributed and deliberately retained beyond the object it
  describes.
]

*Still open in this part.* There is one administrator role rather than a graded
set of moderation permissions — an administrator who can approve can also
suspend an account. Review is entirely manual: nothing is pre-screened, ranked or
flagged automatically, so queue throughput is bounded by attention. Report 11
reports what that load actually looks like.

*What this enables.* Report 6 can now assume a population of *approved, active*
ventures — which is what makes discovery a real problem worth solving rather than
a filter over an empty set.
