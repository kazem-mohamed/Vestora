#import "/lib/report.typ": *
#import "/lib/theme.typ": *

#report-cover(
  number: 11,
  title: "Dashboards & Analytics",
  subtitle: "Three roles, three questions, and not one stored counter",
  date: "September 2026",
)

#show: report.with(number: 11, name: "Dashboards & Analytics")

= Introduction

The nine reports before this one built a platform. This one is about being able
to *see* it.

Every role reaches a point where the question is no longer "what can I do" but
"where do I stand". A founder wants to know whether their venture is
progressing. An investor wants to know what they hold. An administrator wants to
know whether the platform is healthy and whether anything needs a decision.

Those are three different questions, and this report's central claim is that they
deserve three different surfaces rather than one dashboard with everything on it.
Its second claim is narrower and more consequential: *every figure on all three
is derived from event rows, and the platform maintains no counter anywhere.*

The administrative surfaces that exercise power — suspension, the audit trail,
the security log — are Report 12. This report covers what the three roles can
*see*.

= Objective

*Answer each role's own question.* A surface per role showing what that role
actually needs in order to decide something, leading with the figure that
decision turns on.

*Derive, never count.* Every figure reported here is computed from recorded
events. No counter is maintained anywhere, for the same reason no funding total
is stored in Report 7.

*Keep the money distinction visible at every scale.* Committed and settled stay
separate on a founder's venture, in an investor's portfolio, and in the
platform-wide totals — including when all of them are zero.

= Features Delivered

#figure(
  table(
    columns: (42mm, 1fr),
    align: (left + top, left + top),
    table.header([Feature], [What it does]),
    [Founder dashboard], [Venture portfolio, funding split, incoming requests,
      engagement.],
    [Investor dashboard], [Pipeline, settlements, portfolio, watchlist,
      activity.],
    [Venture analytics], [Views over time, engagement, and funding progression
      per venture.],
    [Platform overview], [Users, ventures, commitments and health at a glance.],
    [Revenue], [Platform fee income, derived from settled transactions.],
    [Activity stream], [Platform-wide events, and a per-role view of the same
      rows.],
  ),
  caption: [Features delivered in this part. The administrative actions these
    surfaces sit beside are Report 12.],
)

= Three Dashboards, Three Questions

The dashboards share machinery and differ in what they answer.

#figure(
  table(
    columns: (28mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Dashboard], [The question it answers], [What it leads with]),
    [Founder], [Is my venture progressing?],
      [Committed against settled — two figures, permanently separate.],
    [Investor], [What have I committed, and what has it done?],
      [Funded and approved commitments as separate tiles.],
    [Administrator], [Is the platform healthy, and does anything need a
      decision?],
      [Counts, distribution, and the queues that need action.],
  ),
  caption: [One surface per role, each leading with what that role decides on.],
)

The temptation with dashboards is to build one and filter it by role. It fails
for a reason that is visible in the middle column above: the three questions do
not share a subject. A founder asks about *one venture over time*. An investor
asks about *a set of commitments*. An administrator asks about *a population*.
A single surface would have to lead with something, and whatever it led with
would be wrong for two of the three.

#shots(
  "/assets/screenshots/board-founder-en-light.png",
  "/assets/screenshots/board-founder-ar-dark.png",
  [The founder's overview in both languages and themes. Ventures, their states,
   and the funding position across all of them — with committed and settled kept
   apart at the top rather than summed into a headline.],
)

#shots(
  "/assets/screenshots/board-investor-en-light.png",
  "/assets/screenshots/board-investor-ar-dark.png",
  [The investor's overview, shown for an account with no history. The tiles read
   zero *separately* rather than collapsing into a single zero, so the
   distinction from Report 7 is legible before there is any data to disambiguate
   it. An empty state is where a design decision is easiest to see and easiest to
   get wrong.],
)

#shots(
  "/assets/screenshots/board-admin-en-light.png",
  "/assets/screenshots/board-admin-ar-dark.png",
  [The platform overview. Totals, user distribution, and platform health —
   including *fully committed rate* and *approved commitments* as separate
   figures. The same distinction that governs one investment, applied at platform
   scale.],
)

#delivered[
  The committed-versus-settled separation survives every level of aggregation.
  One relationship, one venture, one portfolio, the whole platform — at no point
  does the arithmetic merge them into a single number, because at no point does
  `FundingMath` offer one.
]

= Analytics

#shots(
  "/assets/screenshots/board-founder-analytics-en-light.png",
  "/assets/screenshots/board-founder-analytics-ar-dark.png",
  [Venture analytics. Views and engagement over time, computed from recorded
   events rather than read from counters — which is why the same series can be
   recomputed for any window without the platform having anticipated it.],
)

#shots(
  "/assets/screenshots/board-founder-activity-en-light.png",
  "/assets/screenshots/board-founder-activity-ar-dark.png",
  [The founder's activity stream. The same event rows the analytics aggregate,
   shown individually — so a founder can move from a number to the events behind
   it without leaving the dashboard.],
)

#shots(
  "/assets/screenshots/settled-revenue-en-light.png",
  "/assets/screenshots/settled-revenue-ar-dark.png",
  [Platform revenue after a single settled payment, derived from the fee stored
   on that transaction in Report 8. Every figure on the surface — gross volume,
   revenue, net to founders, success rate, refunds, stuck attempts — is a sum or
   a count over transaction rows. There is no running total to reconcile
   against, and a refund would reduce revenue by leaving the settled set rather
   than by a compensating entry.],
)

#note[
  *Read the three figures together.* Gross volume \$40,000, revenue \$2,000, net
  to founders \$38,000. The platform stores the first and the second as columns
  on the transaction and computes the rest; it does not maintain any of the three
  as a balance. That is the whole of the accounting, and it fits in one
  sentence because the model was built so that it could.
]

== Why nothing is counted

Every figure in this report is *derived* from event rows.

#full-page-figure(
  "/assets/diagrams/out/flow-derivation.svg",
  caption: [What is written, and what is computed. Only the left column is
    stored; everything on the right is calculated at read time. No box on the
    left is a counter.],
)

#figure(
  table(
    columns: (34mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Figure], [Derived from], [Not from]),
    [Venture views], [`ProjectViews` event rows], [A `ViewCount` column],
    [Engagement], [`UserProjectInteractions`], [A stored score],
    [Funding raised], [Settled `PaymentTransactions`], [An `AmountRaised`
      column],
    [Fee revenue], [The `FeeAmount` on settled transactions], [A running revenue
      total],
    [Moderation load], [Ventures by moderation status], [A pending counter],
  ),
  caption: [Every reported figure and the events it is computed from.],
)

This is the same argument as Report 7, applied one level up. *A counter can drift
and cannot be recomputed. An aggregation over rows is always correct and can be
recomputed from history at any time.*

The cost is that reads are more expensive, and that cost is real rather than
theoretical: the platform's most-visited page pays it on every row, which is why
Report 6 spends three paragraphs on a projection and a composite index. Report 12
reports what it measured.

There is a second, quieter benefit. Because nothing is counted, *a question
nobody anticipated can still be answered.* Views in a particular week, engagement
before and after an update, revenue by sector — none of these needed a counter to
exist in advance, because the events were kept.

= Data

#figure(
  table(
    columns: (38mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Table], [Holds], [Rule]),
    [`ProjectViews`], [Individual view events.],
      [Indexed `(ProjectId, CreatedAt)` for time-windowed aggregation.],
    [`UserProjectInteractions`], [Interaction signals used in ranking and
      analytics.], [Restrict.],
  ),
  caption: [Tables owned by this part. Both are *event records rather than
    state* — which is what makes every figure above recomputable.],
)

The index on `ProjectViews` is worth naming because it encodes the shape of every
question asked of it. Analytics are always *this venture, over this window*, so
the pair `(ProjectId, CreatedAt)` covers the filter and the range in one seek. An
index on either column alone would serve half of every query.

= Backend

#figure(
  ```cs
  // Views are aggregated over a window rather than read from a counter. The
  // composite index makes this a range scan inside one project's rows, not a
  // scan of the table.
  var series = await _db.ProjectViews
      .Where(v => v.ProjectId == projectId && v.CreatedAt >= from)
      .GroupBy(v => v.CreatedAt.Date)
      .Select(g => new PointDto { Day = g.Key, Count = g.Count() })
      .OrderBy(p => p.Day)
      .ToListAsync(ct);
  ```,
  caption: [Venture analytics. Grouping happens in the database; the API returns
    the series rather than the rows behind it.],
)

#figure(
  ```cs
  // Platform revenue is the sum of fees on settled transactions. A refund is
  // not a compensating entry — the transaction leaves the Succeeded state and
  // therefore leaves this sum, exactly as it leaves the funding total.
  var revenue = await _db.PaymentTransactions
      .Where(t => t.Status == PaymentStatus.Succeeded)
      .SumAsync(t => (decimal?)t.FeeAmount, ct) ?? 0m;
  ```,
  caption: [Revenue. One predicate, one sum, and no reconciliation step — because
    there is no second number to reconcile against.],
)

Both excerpts have the same shape, and that is the point of this report. A figure
is a query over events. Nothing writes a total, so nothing can write a wrong one.

= Key Endpoints

#figure(
  table(
    columns: (16mm, 50mm, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Method], [Path], [Purpose]),
    [`GET`], [`api/dashboard/investor`], [The investor's overview tiles.],
    [`GET`], [`api/capital/my-ventures`], [The founder's ventures with their
      funding position.],
    [`GET`], [`api/capital/facets`], [Distribution figures used across the
      founder surfaces.],
    [`GET`], [`api/investor/{id}/investment-summary`], [Portfolio totals for one
      investor.],
    [`GET`], [`api/investor/{id}/activities`], [The investor's activity stream.],
    [`GET`], [`api/admin/analytics/overview`], [Platform totals and
      distribution.],
    [`GET`], [`api/admin/analytics/revenue`], [Fee income over settled
      transactions.],
  ),
  caption: [Principal endpoints in this part. Every one is a read; this report
    writes nothing.],
)

= Libraries Used in This Part

#figure(
  table(
    columns: (46mm, 1fr),
    align: (left + top, left + top),
    table.header([Library], [Role here]),
    [`Entity Framework Core`], [Translates the grouping and summation above into
      SQL, so aggregation happens in the database rather than in memory.],
    [`Recharts`], [Renders the series on the client. It receives points, never
      rows — the shape of a chart is decided by the API.],
    [`TanStack Query`], [Caches dashboard reads so switching between surfaces
      does not re-fetch what was just loaded.],
  ),
  caption: [Libraries introduced in this part.],
)

= Challenges

#challenge("One dashboard filtered by role answers nobody's question")[
  The economical design is a single dashboard with role-conditional sections. It
  is cheaper to build and it fails in use, because the three roles do not share a
  subject — a venture over time, a set of commitments, and a population are three
  different things to lead with.

  *Solution.* Three surfaces, sharing the query layer and the design system but
  not the layout. The cost is three sets of screens to maintain; the benefit is
  that each one can lead with the figure its reader decides on.
]

#challenge("Deriving every figure makes reads expensive")[
  A stored counter is a single column read. An aggregation is a scan, and the
  platform does it on the most-visited page in the product.

  *Solution, and its measured limit.* Indexes chosen for the exact shape of each
  question — `(ProjectId, CreatedAt)` for time-windowed analytics,
  `(ModerationStatus, LifecycleStatus, CreatedDate)` for the listing — plus
  projections that return the fields a surface needs rather than whole rows. The
  approach holds at the platform's current population; Report 12 reports the
  measurements and states where it would stop holding.
]

#challenge("An empty dashboard is where a distinction is easiest to lose")[
  With no data, committed and settled are both zero, and the natural design shows
  one zero. The distinction the whole platform rests on then becomes invisible to
  every new user — precisely the people who have not yet learned it.

  *Solution.* The tiles stay separate at zero and label what each zero *counts*.
  It looks redundant on an empty account and is the only moment the distinction
  can be taught without data getting in the way.
]

= How This Fits With the Rest of the System

Only the direct relationships are listed. This report reads from six others and
writes to none.

#figure(
  table(
    columns: (32mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Report], [Relationship], [Boundary]),
    [4 · Ventures & Lifecycle],
      [*Reads it.* Venture state and moderation distribution.],
      [Analytics never write venture state.],
    [6 · Discovery & Engagement],
      [*Reads its output.* View and interaction rows recorded there are what
       these figures aggregate.],
      [Discovery writes the events; this report only groups them.],
    [7 · Commitment & Pipeline],
      [*Depends on it.* Every funding figure on every dashboard comes from
       `FundingMath`.],
      [No dashboard computes a funding number of its own.],
    [8 · Payments],
      [*Reads it.* Revenue is the sum of stored fees on settled transactions.],
      [A refund reduces revenue by leaving the settled set, not by an
       adjustment.],
  ),
  caption: [Direct relationships only. Report 12 sits beside this one and covers
    the administrative *actions* rather than the views.],
)

= Summary

#delivered[
  Three dashboards — founder, investor and administrator — sharing a query layer
  and a design system but not a layout, each leading with the figure its reader
  decides on. Venture analytics over views and engagement, an activity stream
  that resolves an aggregate back to the events behind it, and platform revenue
  derived from the fee stored on each settled transaction. All of it in two
  languages and two themes.

  *Not one counter.* Every figure in this report is an aggregation over event
  rows, indexed for the exact shape of the question asked. A figure can always be
  recomputed from history, and a question nobody anticipated can still be
  answered because the events were kept rather than summarised.
]

*Still open in this part.* Analytics are read at request time with no caching
layer, so the cost is paid per view; the approach is measured rather than assumed
and Report 12 states where it stops scaling. There is no export — a founder
cannot take their figures out of the platform. And there is no comparison against
other ventures, deliberately: a founder seeing where they rank against
competitors is a different product from one seeing whether they are progressing.

*What this enables.* Report 12 covers the other half of administration — the
actions rather than the views — and closes the series with the platform's
delivered state, its measured performance, and what it does not do.
