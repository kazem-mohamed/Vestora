#import "/lib/vestora.typ": *
#import "/lib/theme.typ": *

= Performance and Scalability <ch:performance>

Figures in this chapter come from an instrumented run against the deployed
database, using the script in `book/measure.js`. Frontend timings are the median
of five cold loads with the cache disabled; API figures are the distribution
over thirty warm requests. Nothing here is estimated.

#note[
  *One target is not met.* NFR-02 requires the venture listing to return within
  300 ms at the 95th percentile. It measures *519 ms*. §17.3 reports the number
  and §17.4 explains where it goes; it is not rounded down, re-scoped or moved
  to future work.
]

== Performance Budget and Targets

Targets come from the non-functional requirements in §4.4, restated here with
the measurement method attached. A target without a method is not checkable.

#figure(
  table(
    columns: (18mm, 1fr, 26mm, 26mm),
    align: (left + top, left + top, left + top, left + top),
    table.header([ID], [Target], [Method], [Result]),
    [NFR-01], [Primary content of public venture pages present in the first
      response.], [Response inspection], [Met],
    [NFR-02], [Venture listing p95 under 300 ms at expected load.],
      [30-request run, §17.3], [*Not met* — 519 ms],
    [NFR-03], [No unbounded collection response.], [Endpoint review], [Met],
    [NFR-14], [Usable 360–1920 px.], [Device matrix, §8.6], [Met],
  ),
  caption: [Performance targets, how each is checked, and its state.],
)

Two of these are structural and either hold or do not — a page either renders on
the server or it does not, and an endpoint either caps its page size or it does
not. Those are marked met because they were verified by inspection rather than
by measurement.

== Frontend Performance

*Server rendering.* Public pages render on the server (§5.2), which was one of
the three reasons for the framework migration. The content a first-time visitor
came for is in the first response rather than after two round trips.

*Bundle size.* Route-level code splitting means a visitor to the venture listing
does not download the administrative interface. The heaviest authenticated
surfaces — dashboards and the administrative area — are separate entry points.

*Images.* Venture imagery is the largest asset class on the platform. Uploads
are size-capped at the boundary (§10.12), and images are served in modern
formats at the size they are displayed rather than at the size they were
uploaded.

*Fonts.* Three families are loaded (§8.2), subset and served with a fallback
metric so that text is visible during load rather than invisible. A display face
that blocks first paint would defeat the purpose of server-rendering the page it
sits on.

*Measured.* Median of five cold loads, cache disabled, at 1440×900.

#figure(
  table(
    columns: (1fr, 20mm, 20mm, 24mm, 20mm, 20mm),
    align: (left, right, right, right, right, right),
    table.header([Page], [TTFB], [FCP], [DOM ready], [Load], [HTML]),
    [Landing], [147 ms], [468 ms], [430 ms], [739 ms], [21 KB],
    [Venture listing], [92 ms], [320 ms], [203 ms], [448 ms], [12 KB],
  ),
  caption: [Frontend timings. Both pages paint content in under half a second.],
)

Two things are worth reading from that table. First, time to first byte is
under 150 ms on both, which is the server-rendering decision of §5.2 doing what
it was chosen for — the document arrives with its content rather than with a
loader. Second, the listing page is *faster* than the landing page despite
carrying more data, because the landing page's hero imagery dominates its load.

== API Response Times

Measured over thirty warm requests per endpoint against the hosted database.

#figure(
  table(
    columns: (1fr, 18mm, 18mm, 18mm, 18mm),
    align: (left, right, right, right, right),
    table.header([Endpoint], [p50], [p95], [p99], [max]),
    [`GET /api/projects` (page 1)], [495 ms], [*519 ms*], [662 ms], [662 ms],
    [`GET /api/projects` (page 2)], [475 ms], [500 ms], [506 ms], [506 ms],
  ),
  caption: [Listing latency. NFR-02 requires p95 below 300 ms; it is not met.],
)

The listing endpoint is the one that matters. It is the platform's most-visited
surface, it filters on two state columns (§14.2), and it aggregates funding
totals per row (§7.6). It is by construction the query most likely to be slow,
and it is the one NFR-02 constrains — and it misses by roughly 220 ms.

*Where the time goes.* The distribution is the diagnostic: p50 and p95 are 24 ms
apart, and the minimum is 472 ms. A query with a slow *plan* varies; a query with
a slow *floor* is paying a fixed cost. That floor is the round trip to a hosted
database on another network (§16.3) — every request pays it before any work
happens. Page 2 measures marginally faster than page 1, which confirms the cost
is not in the row count.

*What this means.* The target was set for a co-located database and the system
runs against a remote one. The honest reading is that NFR-02 was specified
without accounting for the hosting decision in §5.11, and the mitigation is in
§17.5 — the aggregate cache removes the repeated portion, but not the floor.
Closing the gap properly requires the database and the application to share a
network.

#note[
  Two other endpoints were sampled and are excluded: `/api/feed` and
  `/api/signals` returned in 2–4 ms because the requests were unauthenticated
  and rejected before any work. A rejection is not a measurement, and reporting
  those figures as endpoint latency would be false.
]

== Database Query Optimisation

Three optimisations were applied, in the order a database problem should be
addressed: fix the query, then index it, then cache it.

=== Projection instead of materialisation

The first version of the listing loaded venture entities and mapped them in
memory. A venture entity has roughly forty columns and several navigation
properties; a listing card displays eight fields.

The fix was to project into the card DTO inside the query, so the database
returns eight columns and the application allocates nothing it does not use
(§6.6, §9.4). This is the single highest-return change in the chapter, and it
required no index and no cache — only asking for less.

=== Eliminating repeated queries

Aggregating funding totals per venture in a listing invites the classic failure:
one query for the list, then one per row for its total. Twenty ventures become
twenty-one queries.

The aggregation is instead performed as part of the listing query, so the row
count does not determine the query count. This is the cost that ADR-04 (§7.6)
knowingly accepted, and it is where that cost is paid down.

=== Indexing

The composite index on moderation status, lifecycle status and creation date
(§7.5) exists precisely for the listing query — it covers both filter columns
and the sort in one seek. The other indexes in §7.5 follow the same rule: each
was added for a query that needed it, and none speculatively.

*No before-and-after plan comparison is offered*, and the reason is worth
stating rather than hiding behind a missing figure: the unoptimised versions no
longer exist. The projection replaced the materialising query and the composite
index was added in the same period, so there is no "before" to profile without
reconstructing code that was deleted. What can be said is what §17.3 measures —
the latency floor is the database round trip, not the plan, and page 2 costs the
same as page 1, which is the signature of a query whose cost does not scale with
the rows it returns.

== Caching Strategy

Caching is applied narrowly, because a cache is a second copy of the truth and
every one of them can be wrong.

/ What is cached: Derived funding aggregates for public venture listings, with
  a short lifetime and invalidation on settlement. This is the read that ADR-04
  made expensive, and it is the only place where the expense is significant
  enough to justify a cache.

/ What is not cached: Anything user-specific — dashboards, portfolios,
  conversations, notification state. These are neither shareable between users
  nor stable enough for a cache to help.

/ Why the trade is safe: A stale funding figure is bounded by the cache
  lifetime and self-corrects. A drifted stored counter (§7.6) is unbounded and
  does not. This is the same argument as ADR-04, applied to its own
  consequence.

== Load Testing

A concurrency sweep was run against the listing endpoint. The results below are
reported with an important qualification about the harness, because reading them
naively would produce a false conclusion.

#figure(
  table(
    columns: (20mm, 18mm, 18mm, 18mm, 18mm, 22mm),
    align: (center, right, right, right, center, right),
    table.header([Concurrency], [p50], [p95], [max], [Errors], [Throughput]),
    [1], [666 ms], [1204 ms], [1204 ms], [0 / 10], [1.4 req/s],
    [5], [518 ms], [846 ms], [870 ms], [0 / 50], [8.7 req/s],
    [10], [7 ms], [963 ms], [1102 ms], [*60 / 100*], [29.1 req/s],
    [20], [18 ms], [24 ms], [31 ms], [*200 / 200*], [1034 req/s],
  ),
  caption: [Concurrency sweep. The last two rows measure the harness, not the
    server — see below.],
)

*The last two rows are not a server finding.* Read alone they say the platform
collapses at ten concurrent readers. That conclusion is wrong, and the numbers
themselves show why: at concurrency 20 the failures return in 18 ms at over a
thousand per second. A saturated server does not fail *faster* than it succeeds.
Those are client-side aborts — the harness runs `fetch` from a browser page, and
a browser caps concurrent connections per origin, so requests beyond the cap were
refused locally before reaching the API.

This was confirmed directly: twenty concurrent requests issued on their own,
without the preceding waves, returned *twenty* `200` responses. The failures are
an artefact of running four sweeps in sequence through one browser context.

*What can be concluded.* Only the first two rows are valid measurements, and
they say the single instance serves five concurrent readers without error at
roughly 8.7 requests per second, with latency dominated by the fixed database
round trip identified in §17.3. Above that the harness stops being a
measurement instrument.

*What cannot be concluded, and how to get it.* The point at which the server
itself degrades is unknown. Establishing it needs a load generator that is not a
browser — a dedicated tool issuing requests from outside a per-origin connection
limit. That is recorded in §19.4 as a limitation and in §20.3 as work, rather
than being asserted from data that cannot support it.

#note[
  This section could have shown four rows and a dramatic failure curve. It shows
  two valid rows and an explanation of why the other two are noise, because a
  measurement whose instrument is untrustworthy is not a smaller result — it is
  a different claim entirely.
]

== Scalability

*Current position.* One API instance, one database, no cache tier, no queue.
This is adequate at the platform's current size and it is a ceiling, not a
plateau.

*What breaks first, in order.* Stating the sequence is more useful than
asserting that the system is scalable.

#figure(
  table(
    columns: (10mm, 1fr, 1fr),
    align: (center + top, left + top, left + top),
    table.header([], [Constraint], [What it requires]),
    [1], [Read load on the listing and detail pages.],
      [A shared cache tier, replacing the in-process cache of §17.5.],
    [2], [Real-time presence and notification fan-out are process-local
      (§12.7).],
      [A backplane for presence and a durable queue for notifications. This is
       the first change that requires more than configuration.],
    [3], [Single API instance is a single point of failure.],
      [More than one instance behind a load balancer — which is only possible
       after constraint 2 is resolved.],
    [4], [Database read contention on aggregate queries.],
      [A read replica for analytics and listing reads.],
    [5], [Uploaded files served from application storage.],
      [Object storage behind a content delivery network — which would also
       close the backup gap in §7.8.],
  ),
  caption: [Scaling constraints in the order they would bind.],
)

The ordering matters more than the list. Constraint 2 must be resolved before
constraint 3 can be, because adding a second instance while presence is
process-local produces two disjoint views of who is online — a system that is
worse than the single instance it replaced.

*What does not need to change.* The domain layer is stateless and the data model
is unchanged by any row above. The funding invariants of §7.6 remain enforced by
the database regardless of how many application instances exist — which is one
of the properties the monolith decision (ADR-06) was chosen to preserve.
