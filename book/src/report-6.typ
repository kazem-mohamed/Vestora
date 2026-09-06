#import "/lib/report.typ": *
#import "/lib/theme.typ": *

#report-cover(
  number: 6,
  title: "Discovery & Engagement",
  subtitle: "How a venture is found on its merits, and how interest is expressed before money is",
  date: "September 2026",
)

#show: report.with(number: 6, name: "Discovery & Engagement")

= Introduction

Report 5 produced a population of approved, active ventures. This report is
about the problem that population creates: *how does anyone find the right one?*

That question is not a convenience. It is the platform's founding purpose. The
whole premise of Vestora, stated in Report 1, is that a venture should be found
because of what it is rather than because of who its founder knows. Every
feature in this report exists to make that true — and to make it *verifiable*,
since a ranking nobody can explain is indistinguishable from a ranking that is
unfair.

The report also covers *engagement*: the actions a user takes short of
committing money. Saving, following, reviewing, commenting and reporting. These
are how a user expresses interest before they are ready to act on it, and they
are also the signals that make discovery better over time. The two halves belong
together because the second feeds the first.

= Objective

*Make discovery attribute-driven.* A venture must be findable by category,
stage, location, funding progress and free text — by anyone, including someone
who is not signed in.

That this works at all depends on Report 4's closed category list. Free-text
classification and attribute filtering are incompatible: a filter can only return
a coherent population if the values it filters on are drawn from a fixed set.

*Make ranking explicable.* A founder who asks why their venture appears where it
does must be able to receive an answer. That constraint rules out an opaque
model, and it is the reason ranking here is deterministic rather than learned.

*Let interest be expressed and retained.* A user who is not ready to commit
should still be able to save, follow and return — turning a one-off visit into a
standing relationship with a venture or a founder.

*Give the community a voice, safely.* Reviews and comments add signal the founder
did not write themselves; reports give any user a route to administrative
attention.

= Features Delivered

#figure(
  table(
    columns: (42mm, 1fr),
    align: (left + top, left + top),
    table.header([Feature], [What it does]),
    [Public browsing], [Every approved, active venture, visible without an
      account.],
    [Free-text search], [Across venture title, description, sector, location and
      founder.],
    [Attribute filters], [Category, stage, location and funding round — the
      category filter drawing on the closed list of Report 4, so one filter value
      matches one population.],
    [Sorting], [Newest, closing soonest, momentum, largest round, most backed,
      most viewed.],
    [Saved searches], [A named filter combination that can be re-run.],
    [Watchlist], [Save a venture to a personal shortlist, from any surface that
      shows one.],
    [Following], [Follow a founder and receive their updates.],
    [Personalised feed], [Activity from followed founders and saved ventures.],
    [Engagement signals], [Views and interactions recorded as ranking input.],
    [Reviews], [A rated review, at most one per investor per venture.],
    [Comments and replies], [Public discussion on a venture, one level of
      nesting.],
    [Reporting], [Raise a venture for administrative attention — the queue in
      Report 5.],
    [Investor directory], [Browse investors — the symmetric half of discovery.],
  ),
  caption: [Features delivered in this part of the system.],
)

= How Discovery Works

#full-page-figure(
  "/assets/diagrams/out/flow-discovery.svg",
  caption: [The discovery path. A visitor reaches a venture page without an
    account; everything that *retains* interest — saving, following, saving a
    search — requires one. Engagement signals feed back into ranking, which is
    deterministic.],
)

== The listing is the hottest path in the platform

The venture listing is the most-visited surface, and it is the query most likely
to be slow, because it does three expensive things at once:

+ It filters on *two* state columns — a venture is listed only when its
  moderation status is approved and its lifecycle status is active (Report 4).
+ It aggregates funding progress *per row* — and those totals are derived rather
  than stored (Report 9).
+ It orders and pages the result.

Three measures keep it fast, applied in the order a database problem should be
addressed. The query *projects* directly into the card shape rather than loading
venture entities and mapping them in memory. The composite index from Report 4
covers both filter columns and the sort in one seek. And the funding aggregate is
computed as part of the same query rather than once per row, so the row count
does not determine the query count.

#shots(
  "/assets/screenshots/discover-list-en-light.png",
  "/assets/screenshots/discover-list-ar-dark.png",
  [The venture listing, signed out, in both languages and both themes. Counters
   across the top state the size of the population; filters and sorting sit above
   the results. Neither capture required an account — which is the claim this
   report opens with, shown rather than asserted.],
)

== Ranking is deterministic, and that is a requirement

Results are ordered by attributes the platform can name: recency, funding
progress, and engagement signals derived from real interactions. There is no
learned model and no hidden score.

This was a decision rather than a limitation of effort. On a platform whose
premise is that discovery should be fair, a founder is entitled to ask why their
venture appears where it does — and a deterministic ordering can answer that
question. An opaque score cannot, and would reintroduce exactly the kind of
unexplainable advantage the platform exists to remove.

#delivered[
  Sort fields arriving from a client are matched against a permitted set rather
  than placed into a query. Ordering is a common injection surface, and an
  allow-list closes it completely.
]

#shots(
  "/assets/screenshots/discover-detail-en-light.png",
  "/assets/screenshots/discover-detail-ar-dark.png",
  [A venture page as a visitor reaches it, in both directions. Everything needed
   to evaluate is on one page — the pitch, the ask, the team, the documents, the
   milestones. The actions that require an account are visible but gated.],
)

== Filters, saved searches and the watchlist

A filter combination answers a question once. Most users have a *standing*
question — a sector they follow, a stage they invest at — and rebuilding the
filter on every visit turns a standing interest into a chore.

#shots(
  "/assets/screenshots/engage-searches-en-light.png",
  "/assets/screenshots/engage-searches-ar-dark.png",
  [Saved searches. A named, re-runnable filter combination, which is what turns
   discovery from a one-off query into a returning habit.],
)

#shots(
  "/assets/screenshots/engage-watchlist-en-light.png",
  "/assets/screenshots/engage-watchlist-ar-dark.png",
  [The watchlist. A shortlist an investor builds while deciding, added to from
   any surface that shows a venture.],
)

= Engagement

#shots(
  "/assets/screenshots/engage-activity-en-light.png",
  "/assets/screenshots/engage-activity-ar-dark.png",
  [The investor's activity log. Every saved venture, follow and view is recorded
   — both as a history the user can read, and as the signal that feeds ranking.
   Showing the user the same rows the ranking consumes is the cheapest form of
   explicability available.],
)

#shots(
  "/assets/screenshots/engage-directory-en-light.png",
  "/assets/screenshots/engage-directory-ar-dark.png",
  [The investor directory, requested by an account *not entitled to it*. Both
   captures are the refusal. The client redirects rather than rendering an empty
   page, and the API would refuse the underlying call regardless of what the
   client did.],
)

These are the only refusals shown anywhere in this series, and they are included
deliberately. Discovery runs in both directions: a founder looking for the right
investor has the same problem as an investor looking for the right venture, and
the directory exists to solve the second half. But like every other surface, *who
may see it is decided by the server* — and the honest way to evidence that is to
photograph the refusal rather than to describe it.

The refusal inherits the same token set, the same direction handling and the same
type scale as every other screen, because it is drawn from the design system of
Report 2 rather than being a special-cased error page.

== Rules expressed as constraints

Three engagement rules are enforced by the database rather than by application
code.

#figure(
  table(
    columns: (34mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Rule], [Enforced by], [Why not a code check]),
    [Save a venture once], [`Bookmark (UserId, ProjectId)` unique],
      [Two rapid taps can both pass a code check before either writes.],
    [Follow a user once], [`Follow (FollowerId, FollowedId)` unique],
      [Same race, same outcome — two edges where there should be one.],
    [Review once per venture], [`Review (ProjectId, InvestorId)` unique],
      [A business rule, not an optimisation. The database cannot be raced.],
  ),
  caption: [Three rules that read like policy and are implemented as unique
    indexes.],
)

A fourth index exists for a different reason: `Follows` is additionally indexed
on the *followed* identifier alone, because follower counts and follower lists
are read far more often than follows are created. That index was chosen for a
read pattern rather than for the write it constrains — the only index in this
report that is an optimisation rather than a rule.

= Data

#figure(
  table(
    columns: (38mm, 1fr, 28mm),
    align: (left + top, left + top, left + top),
    table.header([Table], [Holds], [Delete behaviour]),
    [`Bookmarks`], [Watchlist edges.], [Cascade from venture],
    [`Follows`], [Directed follow edges between users.], [Cascade],
    [`Reviews`], [Rated reviews, one per investor per venture.],
      [Cascade from venture],
    [`Comments`], [Public comments on a venture.], [Restrict],
    [`Replies`], [One level of nesting under a comment.], [Restrict],
    [`ProjectViews`], [Individual view events feeding ranking and analytics.],
      [Cascade],
    [`UserProjectInteractions`], [Interaction signals used in ranking.],
      [Restrict],
  ),
  caption: [Engagement tables and their delete behaviour.],
)

The split between *cascade* and *restrict* follows one principle, and it is the
same principle that governs the audit log in Report 5. A review of a deleted
venture refers to nothing, so it cascades. A comment is part of a conversation
other people took part in, so removing a user must not silently erase it — it is
restricted.

*Content that is owned cascades; content that is a record of something that
happened does not.* That sentence decides every row in the table above, and it
decided `AdminAuditLog` two reports ago.

= Backend

#figure(
  ```cs
  // The listing projects straight into the card shape. A venture entity has
  // roughly forty columns; a card displays eight. Loading entities and mapping
  // them in memory would allocate the other thirty-two for nothing.
  var page = await _db.Projects
      .Where(p => p.ModerationStatus == ModerationStatus.Approved)
      .Where(p => p.LifecycleStatus  == LifecycleStatus.Active)
      .Where(filter)
      .OrderBy(sort)
      .Select(p => new VentureCardDto
      {
          Id       = p.Id,
          Name     = p.Name,
          Sector   = p.Sector,
          Stage    = p.Stage,
          Goal     = p.FundingGoal,
          Funded   = FundingMath.FundedOf.Compile()(p),   // derived, not stored
          CoverUrl = p.Images.OrderBy(i => i.Order).Select(i => i.Url).FirstOrDefault(),
      })
      .ToPagedAsync(request.Page, request.PageSize, ct);
  ```,
  caption: [The listing query. Two state filters, a projection, and a derived
    funding figure computed inside the same query rather than per row.],
)

#figure(
  ```cs
  // Sort fields are matched against a permitted set. A value that is not on
  // the list falls back to the default rather than reaching the query.
  private static readonly Dictionary<string, Expression<Func<Project, object>>> Sorts =
      new(StringComparer.OrdinalIgnoreCase)
      {
          ["newest"]     = p => p.CreatedDate,
          ["closing"]    = p => p.ClosesAtUtc,
          ["momentum"]   = p => p.RecentInteractionCount,
          ["largest"]    = p => p.FundingGoal,
          ["backed"]     = p => p.FundedInvestorCount,
          ["viewed"]     = p => p.ViewCount,
      };

  var order = Sorts.TryGetValue(request.Sort ?? "", out var expr) ? expr : Sorts["newest"];
  ```,
  caption: [Allow-listed ordering. Dynamic ordering built from client input is a
    classic injection surface; a dictionary lookup removes it entirely.],
)

#figure(
  ```cs
  // Saving is idempotent by construction. The unique index does the work; the
  // handler simply treats a duplicate as success rather than as an error,
  // because from the user's point of view the venture is saved either way.
  try
  {
      _db.Bookmarks.Add(new Bookmark { UserId = userId, ProjectId = projectId });
      await _db.SaveChangesAsync(ct);
  }
  catch (DbUpdateException e) when (e.IsUniqueViolation())
  {
      return ServiceResult.Ok();          // already saved — nothing to do
  }
  ```,
  caption: [Bookmarking. The constraint is the mechanism; the catch block only
    decides how a collision is reported.],
)

= Key Endpoints

#figure(
  table(
    columns: (16mm, 52mm, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Method], [Path], [Purpose]),
    [`GET`], [`api/projects`], [Public listing — paged, filtered, sorted.],
    [`GET`], [`api/projects/{id}`], [A single venture, public when approved and
      active.],
    [`GET`], [`api/feed`], [Activity from followed founders and saved ventures.],
    [`POST`], [`api/bookmarks/{projectId}`], [Save a venture. Idempotent.],
    [`DELETE`], [`api/bookmarks/{projectId}`], [Remove from the watchlist.],
    [`POST`], [`api/follows/{userId}`], [Follow a user.],
    [`GET`], [`api/follows/{userId}/followers`], [Follower list — served by the
      dedicated index.],
    [`GET`], [`api/signals/{projectId}`], [Engagement signals for a venture.],
    [`POST`], [`api/projects/{id}/reviews`], [Leave a review; refused if one
      already exists.],
    [`POST`], [`api/projects/{id}/comments`], [Comment on a venture.],
  ),
  caption: [Principal endpoints in this part. The first two are the only
    endpoints in the entire platform that serve an unauthenticated caller
    meaningful data.],
)

= Libraries Used in This Part

#figure(
  table(
    columns: (40mm, 1fr),
    align: (left + top, left + top),
    table.header([Library], [Role here]),
    [`Entity Framework Core`], [Builds the filtered, sorted, paged query and
      projects it into the card shape without materialising entities.],
    [`TanStack Query`], [On the client: caches listing results, keeps filter
      state and pagination in sync, and avoids refetching a page the user has
      already seen.],
    [`nuqs`], [Keeps filter and sort state in the URL, so a filtered listing is a
      shareable link and the back button behaves as expected.],
  ),
  caption: [Libraries introduced in this part.],
)

= Challenges

#challenge("The listing query does the three most expensive things at once")[
  Filtering on two state columns, aggregating funding per row, and ordering and
  paging — on the platform's most-visited page.

  *Solution, in the order a database problem should be addressed.* First the
  query: project into the card shape instead of loading entities. Then the index:
  one composite covering both filter columns and the sort. Then, and only then,
  caching of the derived aggregate.

  *Measured.* The listing page renders its first content in well under half a
  second. The API response itself is dominated by a fixed cost that is not the
  query — reported in Report 12 with the rest of the platform's measurements.
]

#challenge("Ordering built from client input is an injection surface")[
  A sort field arriving as a string and placed into a query lets a caller
  influence the query itself.

  *Solution.* Sort fields are matched against a dictionary of permitted
  expressions. An unrecognised value falls back to the default. Nothing supplied
  by the caller reaches the query builder.
]

#challenge("Two taps on 'save' produced two rows")[
  A duplicate check in application code can be passed by two concurrent requests
  before either one writes.

  *Solution.* A unique index on the pair. The second write fails, and the failure
  is the correct outcome — the handler reports success because the venture is
  saved either way. The same pattern was applied to following and to reviews, and
  the same reasoning appears again in Report 10 against a payment provider that
  delivers the same confirmation twice.
]

#challenge("Ranking had to be improvable without becoming unexplainable")[
  Better ordering is desirable. An opaque model would undermine the platform's
  founding claim.

  *Solution.* Ranking inputs are recorded as explicit, nameable signals — views
  and interactions — and combined deterministically. The system can be tuned, and
  every position can still be explained to the founder who asks. The cost is
  that the ordering will never be as good as a learned one, and that cost is
  accepted because the alternative contradicts Report 1.
]

= How This Fits With the Rest of the System

Only the direct relationships are listed. Discovery sits between the venture and
the commitment: it reads a great deal and writes almost nothing.

#figure(
  table(
    columns: (32mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Report], [Relationship], [Boundary]),
    [4 · Ventures & Lifecycle],
      [*Depends on it.* The two-column visibility rule and the composite index
       that makes it cheap are both defined there.],
      [Discovery reads venture state. It never writes it.],
    [5 · Review & Approval],
      [*Consumes its output.* Only approved ventures enter the population, and
       reports raised here enter the queue there.],
      [Discovery cannot make or change a moderation decision.],
    [9 · Commitment & Pipeline],
      [*Feeds it.* The funding figure on every card comes from `FundingMath`, and
       the watchlist is where a commitment usually begins.],
      [No funding figure is computed here; the listing calls the same service the
       investor's portfolio does.],
    [11 · Dashboards & Analytics],
      [*Supplies its raw material.* View and interaction rows recorded here are
       what the analytics there aggregate.],
      [Discovery writes events. It maintains no counter.],
  ),
  caption: [Direct relationships only.],
)

= Summary

#delivered[
  Public browsing without an account, free-text search across five fields, four
  attribute filters and six sort orders — all allow-listed. Paged results with a
  projection that returns the eight fields a card shows rather than the forty a
  venture has. Saved searches, a watchlist, a follow graph and a personalised
  feed. Reviews limited to one per investor per venture, comments with one level
  of nesting, and reporting into the moderation queue. An investor directory, so
  discovery runs in both directions.

  *Three engagement rules enforced as unique indexes rather than as code checks*,
  because a code check can be raced and a constraint cannot.
]

*Still open in this part.* Ranking is deterministic and will therefore never be
as good as a learned ranking; that is the accepted cost of explicability. Search
is a relational `LIKE` across five columns rather than a full-text index, which
is adequate at the current population size and is the first thing that would need
to change as it grows. Report 12 states at what point.

*What this enables.* Report 9 can now assume an investor who has found a venture
they want to back — which is where the money starts.
