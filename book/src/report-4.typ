#import "/lib/report.typ": *
#import "/lib/theme.typ": *

#report-cover(
  number: 4,
  title: "Ventures & Lifecycle",
  subtitle: "The object everything else revolves around, and the three states it holds at once",
  date: "September 2026",
)

#show: report.with(number: 4, name: "Ventures & Lifecycle")

= Introduction

Report 3 made every actor identifiable. This report covers the object those
actors exist around: the *venture*.

A venture is the unit that is submitted, reviewed, published, discovered and
eventually funded. It carries everything an investor needs in order to decide —
the pitch, the people behind it, the money being asked for, supporting
documents, the milestones promised, and the progress reported afterwards.

This report covers the founder's half of that life: from an empty form to a
published page that keeps being updated. The review gate between the two is
Report 5's subject, and it is referenced here only where the venture's own data
model is shaped by it — which turns out to be the most important thing in this
report.

= Objective

*Give a founder a complete way to present a venture.* Not a title and a number,
but the material an investor would otherwise ask for over several emails —
imagery, team, documents, targets, milestones. Presented once, kept in one
place.

*Keep the venture's state honest.* A venture is simultaneously an administrative
object, an operational one, and a commercial one. Those three things move
independently and must never overwrite each other — which turned out to be the
hardest requirement in this part of the system, and the one that produced a
schema migration rather than a patch.

= Features Delivered

#figure(
  table(
    columns: (42mm, 1fr),
    align: (left + top, left + top),
    table.header([Feature], [What it does]),
    [Venture creation], [Title, description, category, location, stage and
      funding target.],
    [Closed category list], [Thirty-nine categories, validated on the server and
      translated on the client. A venture cannot be classified as anything
      else.],
    [Imagery], [A cover image and a gallery, size-capped and content-type
      verified against the bytes rather than the name.],
    [Team members], [The people behind the venture, with roles.],
    [Documents], [Attached files with a visibility rule — open, or released only
      on request.],
    [Milestones], [What the founder intends to achieve, with dates.],
    [Progress updates], [Published reports, with imagery, after funding begins.
      Followers are notified.],
    [Draft and submit], [A venture is private until deliberately submitted.
      There is no accidental publication.],
    [Resubmission], [An edited or rejected venture returns to review without
      losing anything else it holds.],
    [Lifecycle control], [The founder can pause or close a venture
      independently of its review state.],
  ),
  caption: [Features delivered in this part. The review step they feed into is
    Report 5.],
)

= The Life of a Venture

The path has several decisions in it, and each one writes a different thing.

+ *The founder creates a draft.* Nothing is public. The venture exists only in
  the founder's own workspace.
+ *The founder submits it.* Its moderation status becomes `Pending`. It enters
  the review queue. It is still not public.
+ *An administrator reviews it.* Approved, or rejected with a reason — Report 5.
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

= Three States, Not One

This is the central idea of this report, and it exists because the obvious
design failed in production.

A venture carries three independent state columns. They answer three different
questions and are written by three different actors.

#figure(
  table(
    columns: (34mm, 1fr, 32mm),
    align: (left + top, left + top, left + top),
    table.header([Column], [Question it answers], [Written by]),
    [`ModerationStatus`], [Has an administrator allowed this to be public?],
      [Administrator (Report 5)],
    [`LifecycleStatus`], [Is the founder currently running this venture?],
      [Founder, or the system],
    [`Stage`], [How far has the venture progressed commercially?],
      [The funding pipeline (Report 9)],
  ),
  caption: [Three columns, three writers, three questions. No column has two
    writers, and no writer touches two columns.],
)

== A venture is classified from a closed list

Category was once two free-text fields — `Category` and `Industry` — and neither
was validated or translated.

#delivered[
  The consequence was concrete: *the same clothing brand could be typed
  "Fashion", "Apparel" and "Retail" by three different founders*, and every one of
  them was displayed as raw English on an Arabic screen. Two filters over that
  data would have found three different populations for one industry.
]

The replacement is a single closed list of thirty-nine keys, defined once on the
server in `ProjectCategories` and mirrored in the client's `categories.ts`. The
server validates against it; the client translates each key through the
dictionaries, so an Arabic reader sees Arabic rather than whatever the founder
happened to type.

The list is also deliberately *not* a generic startup taxonomy. It is grounded in
the businesses this platform actually serves — apparel manufacturers, textile
exporters, food production, furniture workshops, restaurants, logistics,
import-export — alongside the digital categories, because a platform whose
categories only describe software cannot classify most of the ventures on it.

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

#delivered[
  The rule is worth stating as a single sentence, because every boundary in this
  series is an expression of it: *three state columns, one writer each.*
]

= Interface

#shots(
  "/assets/screenshots/venture-author-en-light.png",
  "/assets/screenshots/venture-author-ar-dark.png",
  [Venture creation, in both languages and both themes. The form asks for the
   material an investor will need, in the order they will read it — identity
   first, then the ask, then the evidence. The Arabic form is the same form: the
   direction mirrors, the field order does not change.],
)

#shot(
  "/assets/screenshots/venture-detail-en-light.png",
  [A published venture page. The hero carries the pitch and the essentials —
   sector, stage, location and the founder — before it asks the reader for
   anything.],
)

#shots(
  "/assets/screenshots/venture-mine-en-light.png",
  "/assets/screenshots/venture-mine-ar-dark.png",
  [The founder's ventures. Each row carries its own moderation state, so a
   founder can always see where a submission stands — which is what stops a
   submitted venture feeling like it disappeared.],
)

#shots(
  "/assets/screenshots/venture-detail-en-light.png",
  "/assets/screenshots/venture-detail-ar-dark.png",
  [The same venture page in English light and Arabic dark. Milestones, updates
   and documents all mirror with the writing direction; the content and the
   funding figures do not change.],
)

= Data

This report owns the venture and everything the venture owns.

#figure(
  table(
    columns: (38mm, 1fr, 24mm),
    align: (left + top, left + top, left + top),
    table.header([Table], [Holds], [On owner delete]),
    [`Projects`], [The venture itself, including the three state columns and the
      funding target.], [Cascade],
    [`ProjectImages`], [Cover and gallery imagery.], [Cascade],
    [`ProjectDocuments`], [Attached files and their visibility rule.], [Cascade],
    [`TeamMembers`], [People listed on the venture.], [Cascade],
    [`Milestones`], [Declared objectives and their dates.], [Cascade],
    [`ProjectUpdates`], [Published progress reports.], [Cascade],
    [`ProjectUpdateImages`], [Imagery attached to an update.], [Cascade],
  ),
  caption: [Venture tables. Everything a venture owns cascades with it. The two
    tables that do *not* cascade — reports and the audit log — belong to
    Report 5, and that is not a coincidence.],
)

*Everything a venture owns cascades.* An image or a milestone has no meaning
without its venture, so deleting the venture removes them. That is the correct
behaviour for owned content — and it is the correct behaviour precisely because
these rows describe the venture rather than record something that happened to
it.

#figure(
  table(
    columns: (46mm, 1fr),
    align: (left + top, left + top),
    table.header([Index], [Why it exists]),
    [`(ModerationStatus, LifecycleStatus, CreatedDate)`],
      [The public listing filters on both state columns and orders by date. One
       composite index covers the whole query in a single seek.],
    [`Stage`], [Stage-filtered discovery, used in Report 6.],
  ),
  caption: [Indexes added for this part, each for a query that needed it rather
    than for a query that might.],
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

Three properties are being enforced in that second excerpt and it is worth
separating them, because they defend against three different things. The size
cap defends the disk. The allow-list — rather than a deny-list — defends against
the type nobody thought to forbid. And the generated filename defends the path,
because a filename is a string the caller wrote.

= Key Endpoints

#figure(
  table(
    columns: (16mm, 54mm, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Method], [Path], [Purpose]),
    [`POST`], [`api/projects`], [Create a venture as a private draft.],
    [`PUT`], [`api/projects/{id}`], [Update a venture the caller owns.],
    [`POST`], [`api/projects/{id}/submit`], [Submit for review. Writes moderation
      status only.],
    [`POST`], [`api/projects/{id}/images`], [Attach imagery, validated by
      content.],
    [`POST`], [`api/projects/{id}/documents`], [Attach a document with a
      visibility rule.],
    [`POST`], [`api/projects/{id}/milestones`], [Declare a milestone.],
    [`POST`], [`api/projects/{id}/updates`], [Publish a progress update;
      notifies followers.],
    [`PATCH`], [`api/projects/{id}/lifecycle`], [Pause or close, independently of
      moderation state.],
  ),
  caption: [Principal endpoints in this part. Every one of them checks ownership
    as well as role — the caller must be a founder *and* this venture's founder.],
)

= Libraries Used in This Part

#figure(
  table(
    columns: (44mm, 1fr),
    align: (left + top, left + top),
    table.header([Library], [Role here]),
    [`Entity Framework Core`], [Maps the venture and everything it owns, and
      carries every schema change as a versioned migration.],
    [`FluentValidation`], [Validates the submission payload before a service sees
      it — required fields, positive amounts, sane dates.],
    [`SixLabors.ImageSharp`], [Inspects uploaded image bytes to confirm the
      declared content type, independently of the extension or header.],
  ),
  caption: [Libraries introduced in this part. Identity libraries from Report 3
    remain in use throughout.],
)

= Challenges

#challenge("Re-approval erased a venture's funding progress")[
  A venture that was actively raising money reverted to an early commercial
  stage after its founder edited the description and an administrator approved it
  again.

  *Diagnosis.* Not a bug in the edit handler. A single status column was being
  written by three different actors — the administrator, the founder and the
  funding pipeline — each for a legitimate reason and none aware of the others.
  Re-approval wrote `approved` over a value that meant something entirely
  different.

  *Solution.* Three independent columns with one writer each, and transitions
  validated per column rather than assigned. The sequence that produced the
  defect is now structurally impossible: approval writes moderation status and
  cannot reach the other two.

  *Cost.* A schema migration, a rewrite of the visibility rule into a two-column
  predicate, and a composite index to keep the listing query fast under it. The
  fix was more expensive than the bug — which is the usual price of correcting a
  model rather than patching a symptom.
]

#challenge("An uploaded file cannot be trusted to describe itself")[
  Both the declared content type and the file extension are supplied by the
  caller, so neither is evidence of what a file actually contains.

  *Solution.* Uploads are checked against the file's own bytes, capped by size,
  restricted to an allow-list rather than a deny-list, and stored under a
  generated filename so a crafted name cannot traverse a path.
]

#challenge("A draft that publishes itself is a platform with no gate")[
  The simplest venture model has one visible state, which means the act of
  creating and the act of publishing are the same act. A founder who saves an
  unfinished pitch has published an unfinished pitch.

  *Solution.* Creation and submission are separate operations against separate
  endpoints. A venture is private until `submit` is called, and `submit` writes
  moderation status and nothing else. There is no path from the creation endpoint
  to a public page.
]

= How This Fits With the Rest of the System

Only the direct relationships are listed.

#figure(
  table(
    columns: (32mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Report], [Relationship], [Boundary]),
    [3 · Identity & Sessions],
      [*Depends on it.* A venture's owner is an identity established there.],
      [Every endpoint here checks ownership as well as role; a role check alone
       would let any founder edit any venture.],
    [5 · Review & Approval],
      [*The gate this report feeds.* Submission enters the queue defined there.],
      [Review writes `ModerationStatus` and nothing else. It cannot reach
       lifecycle or stage.],
    [6 · Discovery & Engagement],
      [*Depends on this part.* Only ventures that are approved *and* active are
       listed; the composite index here is what makes that filter cheap.],
      [Discovery reads venture state. It never writes it.],
    [9 · Commitment & Pipeline],
      [*Depends on this part.* A commitment attaches to a venture and reads its
       funding target.],
      [The funding pipeline writes `Stage` and nothing else.],
  ),
  caption: [Direct relationships. Every one of them is an expression of the
    same rule: three state columns, one writer each.],
)

= Summary

#delivered[
  A complete venture record — imagery, team, documents, milestones and updates —
  created as a private draft, submitted deliberately, and kept current after
  publication. Founder-controlled lifecycle that is independent of review state.
  Upload validation based on file content rather than on what the caller claims,
  with a generated storage name. A three-column state model in which
  administrative, operational and commercial state move independently, and a
  composite index that keeps the two-column visibility rule cheap to evaluate.

  *Verified.* The stage-transition rules are covered by automated tests, which
  assert directly that a moderation change leaves commercial stage untouched.
  That is the one behaviour in this report proven by a test rather than by
  inspection.
]

*Still open in this part.* Non-image attachments are limited to the permitted
document types. Milestones are recorded as declared by the founder — the platform
timestamps and publishes them, it does not verify that one was met, and no
interface in this report suggests otherwise.

*What this enables.* Report 5 can now assume a queue with something in it: a
population of submitted ventures, each complete, each private, each waiting for
a human decision.
