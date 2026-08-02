#import "/lib/report.typ": *
#import "/lib/theme.typ": *

#report-cover(
  number: 3,
  title: "Discovery & Engagement",
  subtitle: "How a venture is found on its merits, and how interest is expressed",
  date: "September 2026",
)

#show: report.with(number: 3, name: "Discovery & Engagement")

= Introduction

Report 2 produced a population of published ventures. This report is about the
problem that population creates: *how does anyone find the right one?*

That question is not a convenience. It is the platform's founding purpose. The
whole premise of Vestora is that a venture should be found because of what it
is, not because of who its founder knows. Every feature in this report exists to
make that true — and to make it verifiable, since a ranking nobody can explain
is indistinguishable from a ranking that is unfair.

The report also covers *engagement* — the actions a user takes short of
committing money. Saving, following, reviewing, commenting and reporting. These
are how a user expresses interest before they are ready to act on it, and they
are also the signals that make discovery better over time.

= Objective

*Make discovery attribute-driven.* A venture must be findable by sector, stage,
location, funding progress and free text — by anyone, including someone who is
not signed in.

*Make ranking explicable.* A founder who asks why their venture appears where it
does must be able to receive an answer. That constraint rules out an opaque
model and is the reason ranking here is deterministic.

*Let interest be expressed and retained.* A user who is not ready to commit
should still be able to save, follow and return — turning a one-off visit into a
standing relationship with a venture or a founder.

*Give the community a voice, safely.* Reviews and comments add signal the
founder did not write themselves; reports give any user a route to
administrative attention.

= Features Delivered

#figure(
  table(
    columns: (42mm, 1fr),
    align: (left + top, left + top),
    table.header([Feature], [What it does]),
    [Public browsing], [Every approved, active venture, visible without an
      account.],
    [Free-text search], [Across venture title, description, sector, location
      and founder.],
    [Attribute filters], [Sector, stage, location and funding round.],
    [Sorting], [Newest, closing soonest, momentum, largest round, most backed,
      most viewed.],
    [Saved searches], [A named filter combination that can be re-run.],
    [Watchlist], [Save a venture to a personal shortlist.],
    [Following], [Follow a founder and receive their updates.],
    [Personalised feed], [Activity from followed founders and saved ventures.],
    [Engagement signals], [Views and interactions recorded as ranking input.],
    [Reviews], [A rated review, at most one per investor per venture.],
    [Comments and replies], [Public discussion on a venture, one level of
      nesting.],
    [Reporting], [Raise a venture for administrative attention.],
    [Investor directory], [Browse investors — the symmetric half of
      discovery.],
  ),
  caption: [Features delivered in this part of the system.],
)

= How Discovery Works

#full-page-figure(
  "/assets/diagrams/out/flow-discovery.svg",
  caption: [The discovery path. A visitor can reach a venture page without an
    account; everything that *retains* interest — saving, following, saving a
    search — requires one. Engagement signals feed back into ranking, which is
    deterministic.],
)

== The listing is the hottest path in the platform

The venture listing is the most-visited surface, and it is the query most likely
to be slow, because it does three expensive things at once:

+ It filters on *two* state columns — a venture is listed only when its
  moderation status is approved and its lifecycle status is active (Report 2).
+ It aggregates funding progress *per row* — and those totals are derived rather
  than stored (Report 4).
+ It orders and pages the result.

Three measures keep it fast. The composite index from Report 2 covers both
filter columns and the sort in one seek. The query *projects* directly into the
card shape rather than loading venture entities and mapping them in memory — the
database returns the fields a card displays rather than the whole row and its
relations. And the funding aggregate is computed as part of the same query
rather than once per row, so the row count does not determine the query count.

#shot(
  "/assets/screenshots/projects-en-light.png",
  [The venture listing. Counters across the top state the size of the
   population; filters and sorting sit above the results; the first venture is
   given prominence.],
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

== Filters, saved searches and the watchlist

A filter combination answers a question once. Most users have a *standing*
question — a sector they follow, a stage they invest at — and rebuilding the
filter on every visit turns a standing interest into a chore.

#shot(
  "/assets/screenshots/searches.png",
  [Saved searches. A named, re-runnable filter combination, which is what turns
   discovery from a one-off query into a returning habit.],
)

#shot(
  "/assets/screenshots/invest-watchlist.png",
  [The watchlist. A shortlist an investor builds while deciding, from any
   surface that shows a venture.],
)

#shots(
  "/assets/screenshots/projects-en-light.png",
  "/assets/screenshots/projects-ar-light.png",
  [Discovery in both writing directions. Filters, sort controls, the result
   count and the venture grid all mirror; the population and the figures are
   identical.],
)

= Engagement

#shot(
  "/assets/screenshots/invest-activity.png",
  [The investor's activity log. Every saved venture, follow and view is
   recorded — both as a history the user can read, and as the signal that feeds
   ranking.],
)

#shot(
  "/assets/screenshots/investors-directory.png",
  [The investor directory, requested by an account not entitled to it. The
   client redirects to a refusal rather than rendering an empty page — and the
   API would refuse the underlying call regardless of what the client did.],
)

That capture is included deliberately. Discovery runs in both directions: a
founder looking for the right investor has the same problem as an investor
looking for the right venture, and solving only one direction would have solved
half the problem. The directory exists — and, like every other surface, its
access is decided by the server.

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
read pattern rather than for the write it constrains.

= Data

#figure(
  table(
    columns: (38mm, 1fr, 30mm),
    align: (left + top, left + top, left + top),
    table.header([Table], [Holds], [Delete behaviour]),
    [`Bookmarks`], [Watchlist edges.], [Cascade from venture],
    [`Follows`], [Directed follow edges between users.], [Cascade],
    [`Reviews`], [Rated reviews, one per investor per venture.],
      [Cascade from venture],
    [`Comments`], [Public comments on a venture.], [Restrict],
    [`Replies`], [One level of nesting under a comment.], [Restrict],
    [`Reports`], [User reports raised against a venture.],
      [Cascade from venture],
    [`ProjectViews`], [Individual view events feeding ranking and analytics.],
      [Cascade],
    [`UserProjectInteractions`], [Interaction signals used in ranking.],
      [Restrict],
  ),
  caption: [Engagement tables and their delete behaviour.],
)

The split between *cascade* and *restrict* here follows one principle. A review
of a deleted venture refers to nothing, so it cascades. A comment is part of a
conversation other people took part in, so removing a user must not silently
erase it — it is restricted. The rule is: content that is *owned* cascades;
content that is a *record of something that happened* does not.

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
    columns: (16mm, 46mm, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Method], [Path], [Purpose]),
    [`GET`], [`api/projects`], [Public listing — paged, filtered, sorted.],
    [`GET`], [`api/projects/{id}`], [A single venture, public when approved and
      active.],
    [`GET`], [`api/feed`], [Activity from followed founders and saved
      ventures.],
    [`POST`], [`api/bookmarks/{projectId}`], [Save a venture. Idempotent.],
    [`DELETE`], [`api/bookmarks/{projectId}`], [Remove from the watchlist.],
    [`POST`], [`api/follows/{userId}`], [Follow a user.],
    [`GET`], [`api/follows/{userId}/followers`], [Follower list — served by the
      dedicated index.],
    [`GET`], [`api/signals/{projectId}`], [Engagement signals for a venture.],
    [`POST`], [`api/projects/{id}/reviews`], [Leave a review; refused if one
      already exists.],
    [`POST`], [`api/projects/{id}/comments`], [Comment on a venture.],
    [`POST`], [`api/reports`], [Report a venture.],
  ),
  caption: [Principal endpoints in this part.],
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
    [`nuqs`], [Keeps filter and sort state in the URL, so a filtered listing is
      a shareable link and the back button behaves as expected.],
  ),
  caption: [Libraries introduced in this part.],
)

= Challenges

#challenge("The listing query does the three most expensive things at once")[
  Filtering on two state columns, aggregating funding per row, and ordering and
  paging — on the platform's most-visited page.

  *Solution, in the order a database problem should be addressed.* First the
  query: project into the card shape instead of loading entities. Then the
  index: one composite covering both filter columns and the sort. Then, and only
  then, caching of the derived aggregate.

  *Measured.* The listing page renders its first content in well under half a
  second. The API response itself is dominated by a fixed cost that is not the
  query — reported in Report 6 with the rest of the platform's measurements.
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

  *Solution.* A unique index on the pair. The second write fails, and the
  failure is the correct outcome — the handler reports success because the
  venture is saved either way. The same pattern was applied to following and to
  reviews.
]

#challenge("Ranking had to be improvable without becoming unexplainable")[
  Better ordering is desirable. An opaque model would undermine the platform's
  founding claim.

  *Solution.* Ranking inputs are recorded as explicit, nameable signals — views
  and interactions — and combined deterministically. The system can be tuned,
  and every position can still be explained to the founder who asks.
]

= How This Fits With the Rest of the System

Discovery sits between the venture and the commitment. It reads a great deal and
writes very little — which is what keeps it safe to expose publicly.

#figure(
  table(
    columns: (30mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Report], [Relationship], [Boundary]),
    [1 · Foundation & Identity],
      [Browsing is open to anyone; saving, following and reviewing require an
       identity.],
      [Every write in this part is authorised server-side, including from the
       public listing page.],
    [2 · Ventures],
      [The listing shows only ventures that are approved and active, using the
       composite index defined there.],
      [Discovery *reads* venture state and never writes it. A view is recorded
       as an event, not as a counter on the venture.],
    [4 · Investment],
      [The venture page is where a commitment begins.],
      [Funding figures shown on cards and pages are *derived* by the funding
       service; this part displays them and computes none of them.],
    [5 · Real-time],
      [Following a founder is what makes their published update reach a
       follower.],
      [This part creates the follow edge. Delivery is not its concern.],
    [6 · Insight & Administration],
      [View and interaction events recorded here are the raw material for
       venture analytics.],
      [Aggregation happens there. This part only records the events.],
  ),
  caption: [Discovery's relationship to the other parts.],
)

= Summary

#delivered[
  *Discovery.* Public browsing without an account, free-text search, filters on
  four attributes, six sort orders, paged results, saved searches, a watchlist,
  a following relationship and a personalised feed — with ordering that is
  deterministic and explicable by design.

  *Engagement.* Reviews limited to one per investor per venture, comments with
  one level of replies, engagement signals recorded from real interactions, user
  reporting into the moderation queue from Report 2, and an investor directory
  completing the second direction of discovery.

  *Integrity.* Three engagement rules enforced as unique database indexes rather
  than as application checks, and ordering restricted to an allow-list.
]

*Still open in this part.* Recommendations remain deliberately absent: ranking
is deterministic, and any learned ordering would have to stay explicable before
it could be introduced. Notification preferences are not implemented — a
followed founder's update reaches every follower in-app, with no way to tune
it.

*What this enables.* An investor can now find a venture, follow it, and decide
they want to act. Report 4 covers what happens when they do — and the
distinction the entire platform is built around.
