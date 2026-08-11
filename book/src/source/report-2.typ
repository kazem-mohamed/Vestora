#import "/lib/report.typ": *
#import "/lib/theme.typ": *

#report-cover(
  number: 2,
  title: "Ventures & Moderation",
  subtitle: "How a venture is created, reviewed, published and kept current",
  date: "September 2026",
)

#show: report.with(number: 2, name: "Ventures & Moderation")

= Introduction

Report 1 established the foundation and made every actor identifiable. This
report covers the object those actors exist around: the *venture*.

A venture is the unit that is submitted, reviewed, published, discovered and
eventually funded. It carries everything an investor needs in order to decide —
the pitch, the people behind it, the money being asked for, supporting
documents, the milestones promised, and the progress reported afterwards.

This report covers the whole life of that object, from an empty form to a
published page that keeps being updated. It also covers *moderation*, because
the review step is not an administrative add-on: it is the gate between a draft
and something the public can see, and a venture's life cannot be described
without it.

= Objective

*Give a founder a complete way to present a venture.* Not a title and a number,
but the material an investor would otherwise ask for over several emails —
imagery, team, documents, targets, milestones. Presented once, kept in one
place.

*Make sure nothing reaches the public without a human decision.* An open
platform that publishes automatically is a platform whose credibility depends on
nobody abusing it. Every venture passes a review, and every review is
attributable to the administrator who made it.

*Keep the venture's state honest.* A venture is simultaneously an
administrative object, an operational one, and a commercial one. Those three
things move independently and must never overwrite each other — which turned out
to be the hardest requirement in this part of the system.

= Features Delivered

#figure(
  table(
    columns: (44mm, 1fr),
    align: (left + top, left + top),
    table.header([Feature], [What it does]),
    [Venture creation], [Title, description, sector, location, stage and
      funding target.],
    [Imagery], [A cover image and a gallery, size-capped and content-type
      verified.],
    [Team members], [The people behind the venture, with roles.],
    [Documents], [Attached files with a visibility rule — open, or released
      only on request.],
    [Milestones], [What the founder intends to achieve, with dates.],
    [Progress updates], [Published reports, with imagery, after funding
      begins.],
    [Draft and submit], [A venture is private until deliberately submitted.],
    [Administrative review], [Approve, or reject with a stated reason.],
    [Resubmission], [A rejected or edited venture returns to review without
      losing anything else.],
    [Lifecycle control], [The founder can pause or close a venture
      independently of its review state.],
    [Reporting], [Any user can report a published venture for attention.],
    [Moderation queues], [Separate queues for ventures awaiting review and for
      user reports.],
  ),
  caption: [Features delivered in this part of the system.],
)

= How a Venture Reaches the Public

The path has four actors' decisions in it, and each one writes a different
thing.

+ *The founder creates a draft.* Nothing is public. The venture exists only in
  the founder's own workspace.
+ *The founder submits it.* Its moderation status becomes `Pending`. It enters
  the review queue. It is still not public.
+ *An administrator reviews it.* Approved, or rejected with a reason. The
  decision is written to the audit log against that administrator.
+ *If approved, it becomes visible* — provided the founder has not paused it.
  Public visibility requires *two* conditions to agree, not one.
+ *The founder keeps it current.* Updates and milestones are published as work
  progresses; investors following the venture are notified.
+ *An edit that changes substance returns it to review* — and this is where the
  design of the state model matters.

#full-page-figure(
  "/assets/diagrams/out/flow-venture.svg",
  caption: [The venture lifecycle. Two gates decide whether a venture is public:
    an administrator's approval, and the founder's own lifecycle state. A
    substantive edit returns it to review without touching anything else.],
)

== Three states, not one

A venture carries three independent state columns. They answer three different
questions and are written by three different actors.

#figure(
  table(
    columns: (34mm, 1fr, 32mm),
    align: (left + top, left + top, left + top),
    table.header([Column], [Question it answers], [Written by]),
    [`ModerationStatus`], [Has an administrator allowed this to be public?],
      [Administrator],
    [`LifecycleStatus`], [Is the founder currently running this venture?],
      [Founder, or the system],
    [`Stage`], [How far has the venture progressed commercially?],
      [The funding pipeline],
  ),
  caption: [Three columns, three writers, three questions.],
)

#full-page-figure(
  "/assets/diagrams/out/state-project.svg",
  caption: [The three state machines side by side. They share no transition and
    no writer, which is what allows an administrator's decision and the funding
    pipeline's progress to coexist without either overwriting the other.],
)

*Public visibility requires two of the three to agree.* A venture is listed only
when its moderation status is approved *and* its lifecycle status is active.
That is why the listing query filters on two columns, and why a composite index
covering both exists — a cost paid once in an index definition, in exchange for
a state model that cannot silently lose information.

= Interface

#shot(
  "/assets/screenshots/my-projects-new.png",
  [Venture creation. The form asks for the material an investor will need, in
   the order they will read it — identity first, then the ask, then the
   evidence.],
)

#shot(
  "/assets/screenshots/venture-detail-en-light.png",
  [A published venture page. The hero carries the pitch and the essentials —
   sector, stage, location and the founder — before it asks the reader for
   anything.],
)

#shot(
  "/assets/screenshots/founder-ventures.png",
  [The founder's ventures, each showing its own moderation state. A founder can
   always see where a submission stands, which is what stops a submitted venture
   feeling like it disappeared.],
)

#shot(
  "/assets/screenshots/admin-review.png",
  [The review queue — the primary administrative surface. Every venture waiting
   for a decision appears here, and nothing reaches the public without passing
   through it.],
)

#shot(
  "/assets/screenshots/admin-ventures.png",
  [The venture registry: every venture in every state, for investigation rather
   than for decision. The review queue is for acting; this is for looking.],
)

#shot(
  "/assets/screenshots/admin-reports.png",
  [The reports queue, filtered by status. Reports concern published content;
   they are a separate queue from review because they arrive at a different
   rhythm and are worked differently.],
)

#shot(
  "/assets/screenshots/my-projects.png",
  [The founder's workspace. Drafts, submissions awaiting review, and published
   ventures in one list — so the state of every submission is visible without
   opening it.],
)

#shots(
  "/assets/screenshots/venture-detail-en-light.png",
  "/assets/screenshots/venture-detail-ar-dark.png",
  [The same venture page in English light and Arabic dark. Milestones, updates
   and documents all mirror with the writing direction; the content and the
   funding figures do not change.],
)

#delivered[
  *Rejection carries a reason.* A rejected venture returns to its founder with a
  stated cause, not a bare status change. A rejection with no reason is
  indistinguishable from a fault, and produces a support request rather than a
  corrected submission.
]

= Data

This report owns the venture and everything the venture owns.

#figure(
  table(
    columns: (38mm, 1fr, 26mm),
    align: (left + top, left + top, left + top),
    table.header([Table], [Holds], [On owner delete]),
    [`Projects`], [The venture itself, including the three state columns and
      the funding target.], [Cascade],
    [`ProjectImages`], [Cover and gallery imagery.], [Cascade],
    [`ProjectDocuments`], [Attached files and their visibility rule.],
      [Cascade],
    [`TeamMembers`], [People listed on the venture.], [Cascade],
    [`Milestones`], [Declared objectives and their dates.], [Cascade],
    [`ProjectUpdates`], [Published progress reports.], [Cascade],
    [`ProjectUpdateImages`], [Imagery attached to an update.], [Cascade],
    [`Reports`], [User reports raised against a venture.], [Cascade],
    [`AdminAuditLog`], [Administrative decisions, attributed.], [Retained],
  ),
  caption: [Venture tables. Everything a venture owns cascades with it — except
    the audit record of decisions made about it, which is deliberately
    retained.],
)

Two design points are worth stating.

*Everything a venture owns cascades.* An image or a milestone has no meaning
without its venture, so deleting the venture removes them. That is the correct
behaviour for owned content.

*The audit record does not.* A decision made by an administrator is a record of
something that happened, and it survives the object it was made about. The same
principle appears again in Report 6.

#figure(
  table(
    columns: (46mm, 1fr),
    align: (left + top, left + top),
    table.header([Index], [Why it exists]),
    [`(ModerationStatus, LifecycleStatus, CreatedDate)`],
      [The public listing filters on both state columns and orders by date. One
       composite index covers the whole query in a single seek.],
    [`Stage`], [Stage-filtered discovery, used in Report 3.],
    [`(ProjectId, Status)` on `Reports`],
      [The moderation queue filters on exactly this pair.],
  ),
  caption: [Indexes added for this part, each for a query that needed it.],
)

= Backend

#figure(
  ```cs
  // Stage transitions are validated against a table of permitted moves rather
  // than assigned freely. A stage that is not reachable from the current one
  // is refused, and the venture is left untouched.
  if (!PipelineStages.IsValid(requested))
      return ServiceResult.Invalid("Unknown stage.");

  if (!PipelineStages.CountsTowardFunding(requested) && project.HasSettledFunding)
      return ServiceResult.Conflict(
          "A venture with settled funding cannot return to a pre-approval stage.");
  ```,
  caption: [Stage transition validation. The second check is the one that stops
    commercial progress being reversed by an unrelated operation.],
)

#figure(
  ```cs
  // Moderation writes ModerationStatus and nothing else. LifecycleStatus and
  // Stage belong to other writers and are not touched here — which is what
  // makes re-approval after an edit safe.
  project.ModerationStatus = ModerationStatus.Approved;
  project.ReviewedAtUtc   = DateTime.UtcNow;
  project.ReviewedByAdminId = adminId;

  await _audit.RecordAsync(adminId, AdminAction.ApproveProject, project.Id, ct);
  ```,
  caption: [Approval. Three fields written, one audit record, and no other state
    column referenced.],
)

#figure(
  ```cs
  // Uploads are validated against the file's actual bytes, not its declared
  // content type or its extension — both of which the caller controls.
  private static readonly string[] Permitted = { "jpg", "jpeg", "png", "gif", "bmp" };

  if (file.Length > _limits.MaxImageBytes)          return Reject("Too large.");
  if (!Permitted.Contains(SniffExtension(file)))    return Reject("Unsupported type.");

  var storedName = $"{Guid.NewGuid():N}{Path.GetExtension(SniffExtension(file))}";
  ```,
  caption: [Image upload. The stored filename is generated, never taken from the
    upload, so a crafted name cannot traverse a path or collide.],
)

= Key Endpoints

#figure(
  table(
    columns: (16mm, 50mm, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Method], [Path], [Purpose]),
    [`POST`], [`api/projects`], [Create a venture as a private draft.],
    [`PUT`], [`api/projects/{id}`], [Update a venture the caller owns.],
    [`POST`], [`api/projects/{id}/submit`], [Submit for review. Writes
      moderation status only.],
    [`POST`], [`api/projects/{id}/images`], [Attach imagery, validated by
      content.],
    [`POST`], [`api/projects/{id}/documents`], [Attach a document with a
      visibility rule.],
    [`POST`], [`api/projects/{id}/milestones`], [Declare a milestone.],
    [`POST`], [`api/projects/{id}/updates`], [Publish a progress update;
      notifies followers.],
    [`GET`], [`api/admin/projects/pending`], [The review queue.],
    [`POST`], [`api/admin/projects/{id}/approve`], [Approve; writes the audit
      log.],
    [`POST`], [`api/admin/projects/{id}/reject`], [Reject; a reason is
      required.],
    [`POST`], [`api/reports`], [Report a venture for attention.],
  ),
  caption: [Principal endpoints in this part.],
)

= Libraries Used in This Part

#figure(
  table(
    columns: (40mm, 1fr),
    align: (left + top, left + top),
    table.header([Library], [Role here]),
    [`Entity Framework Core`], [Maps the venture and everything it owns, and
      carries every schema change as a versioned migration.],
    [`FluentValidation`], [Validates the submission payload before a service
      sees it — required fields, positive amounts, sane dates.],
    [`SixLabors.ImageSharp`], [Inspects uploaded image bytes to confirm the
      declared content type, independently of the extension or header.],
  ),
  caption: [Libraries introduced in this part. Identity libraries from Report 1
    remain in use throughout.],
)

= Challenges

#challenge("Re-approval erased a venture's funding progress")[
  A venture that was actively raising money reverted to an early commercial
  stage after its founder edited the description and an administrator approved
  it again.

  *Diagnosis.* Not a bug in the edit handler. A single status column was being
  written by three different actors — the administrator, the founder and the
  funding pipeline — each for a legitimate reason and none aware of the others.
  Re-approval wrote `approved` over a value that meant something entirely
  different.

  *Solution.* Three independent columns with one writer each, and transitions
  validated per column rather than assigned. The sequence that produced the
  defect is now structurally impossible: approval writes moderation status and
  cannot reach the other two.

  *Cost.* A schema migration, a rewrite of the visibility rule into a
  two-column predicate, and a composite index to keep the listing query fast
  under it.
]

#challenge("A submitted venture felt like it had disappeared")[
  A founder who submitted a venture had no way to see what had happened to it,
  and a rejection arrived as a bare status with no explanation.

  *Solution.* The founder's venture list shows the moderation state of every
  venture at all times, and rejection requires the administrator to state a
  reason, which is returned to the founder. A correction can then be made and
  resubmitted rather than guessed at.
]

#challenge("An uploaded file cannot be trusted to describe itself")[
  Both the declared content type and the file extension are supplied by the
  caller, so neither is evidence of what a file actually contains.

  *Solution.* Uploads are checked against the file's own bytes, capped by size,
  restricted to an allow-list rather than a deny-list, and stored under a
  generated filename so a crafted name cannot traverse a path.
]

= How This Fits With the Rest of the System

The venture is the object the other five reports revolve around. This table
states exactly what each of them takes from here, and what it must not touch.

#figure(
  table(
    columns: (30mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Report], [Takes from this part], [Boundary]),
    [1 · Foundation & Identity],
      [The owner of a venture, and the administrator who reviews it, are both
       identities established there.],
      [This part assumes an authenticated caller with a role; it never decides
       identity itself.],
    [3 · Discovery],
      [Only ventures that are approved *and* active are listed. The composite
       index defined here is what makes that filter cheap.],
      [Discovery reads venture state. It never writes it.],
    [4 · Investment],
      [A commitment attaches to a venture and reads its funding target.],
      [The funding pipeline writes `Stage` and nothing else. It cannot change
       moderation or lifecycle state.],
    [5 · Real-time],
      [Publishing an update notifies followers; document requests open a
       conversation.],
      [Notification delivery leaves the request path, so publishing an update
       is never as slow as delivering it.],
    [6 · Insight & Administration],
      [Venture analytics and the moderation load reported there are derived
       from the tables defined here.],
      [Analytics read event rows. No counter on the venture is maintained.],
  ),
  caption: [What each report takes from this part, and the line it does not
    cross.],
)

The single rule that holds all of this together: *three state columns, one
writer each.* Every boundary in the table above is an expression of it.

= Summary

#delivered[
  *For the founder.* A complete venture record — imagery, team, documents,
  milestones and updates — created as a private draft, submitted deliberately,
  and kept current after publication.

  *For the administrator.* A review queue, approval and reason-bearing
  rejection, a full venture registry for investigation, a report queue, and an
  audit record of every decision.

  *For the system.* A three-column state model in which administrative,
  operational and commercial state move independently; upload validation based
  on file content; and a composite index that keeps the two-column visibility
  rule cheap to evaluate.

  *Verified.* The stage-transition rules are covered by automated tests, which
  assert directly that a moderation change leaves commercial stage untouched.
]

*Still open in this part.* Non-image attachments are not supported; documents
are limited to the permitted image and document types. Milestones are recorded
as declared by the founder — the platform timestamps and publishes them, it does
not verify that one was met.

*What this enables.* Report 3 can now assume a population of approved, active
ventures exists — which is what makes discovery a real problem worth solving.
