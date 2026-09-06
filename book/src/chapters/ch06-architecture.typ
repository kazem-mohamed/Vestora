#import "/lib/vestora.typ": *
#import "/lib/theme.typ": *

= System Architecture <ch:architecture>

== Architectural Goals and Constraints

The architecture serves five goals, in this order of precedence. Where two
conflict, the earlier wins.

+ *Correctness about money and state.* The invariants in @ch:database and
  @ch:payments must be structurally difficult to violate, not merely tested.
+ *A single writer per piece of state.* Every field with rules attached has one
  component responsible for changing it.
+ *Substitutability at the edges.* External services — payment, email — must be
  replaceable without touching domain code.
+ *Comprehensibility by a small team.* An architecture nobody can hold in their
  head produces defects faster than it prevents them.
+ *Delivery within a fixed timetable.*

Three constraints bounded the design. The team is small and undergraduate. The
hosting target offers no autoscaling and no managed queue (§16.2). And the
frontend was rewritten mid-project (§5.3), so the API boundary had to be
genuinely independent of the client rather than nominally so.

== Architectural Style and Rationale

The system is a *layered monolith behind a REST API*, with a separate rendering
application for the client.

This deserves defending, because a distributed architecture is the more
fashionable answer. It was rejected on all five goals above. Splitting a system
of this size into services would distribute the funding invariant across a
network boundary, which converts a database constraint into a consistency
problem. It would multiply the operational surface on a host that provides no
service mesh, no managed queue and no distributed tracing. And it would spend
the team's schedule on infrastructure rather than on the domain.

#adr(
  "06",
  "Build a layered monolith rather than a service-oriented system",
  background: [The system's most important invariants are relational and
    transactional. The hosting target offers no queue, no service discovery and
    no distributed tracing. The team has no infrastructure engineer.],
  decision: [Build a single deployable API in layers — controllers, services,
    data — with the client as a separate rendering application over HTTP.],
  consequences: [Funding integrity stays inside one transactional boundary and
    can be enforced by database constraints. Deployment is one artefact. The
    cost is that the API scales as a unit and a fault in one area shares a
    process with every other; §17.7 discusses what would have to change to
    split it later.],
)

The monolith is *layered*, not merely single-process. The layering is what makes
the eventual extraction of a service possible, and it is enforced by dependency
direction: controllers depend on services, services depend on the data context,
and nothing depends upward.

== System Context and Containers

The container view in §1.7 shows four internal containers and two external
dependencies. Their responsibilities are:

#figure(
  table(
    columns: (34mm, 1fr),
    align: (left + top, left + top),
    table.header([Container], [Responsibility and boundary]),
    [Web application],
    [Renders the interface. Holds no domain rules. Calls the API for every
     read and write, and opens a WebSocket to the hub for live updates.],
    [REST API],
    [The only writer to the relational store. Owns all domain rules,
     authorisation and validation.],
    [Real-time hub],
    [Pushes messages, presence, typing and read state. Shares the API's
     authentication and its data context.],
    [Relational store],
    [Holds state and enforces the integrity rules in §7.6.],
    [Payment provider],
    [External. Reached only through `IPaymentProvider` (§11.2).],
    [SMTP relay],
    [External. Reached only through `IEmailService` (§5.9).],
  ),
  caption: [Container responsibilities and boundaries.],
)

The important property of this table is what is *absent* from the web
application's row. It holds no domain rules. A funding total is never computed
in the browser; an authorisation decision is never made there. The client
renders decisions the API has already made, which is why a complete frontend
rewrite (§5.3) did not touch a single business rule.

== Component View

Within the API, components are grouped by responsibility rather than by
entity. The grouping below is the actual shape of the codebase.

/ Controllers (25): One per resource area — authentication, projects,
  investments, payments, messages, notifications, follows, bookmarks, reports,
  admin moderation, admin revenue, founder and investor dashboards, insights,
  and so on. Controllers parse, authorise and delegate. They contain no rules.

/ Domain services: The rules. `AuthService` owns identity;
  `PaymentService` owns the payment lifecycle; `FundingMath` owns the
  definition of what a venture has raised; `PipelineStages` owns valid stage
  transitions; `AccountRules` owns what a given account is permitted to be.

/ Infrastructure services: `FileUploadSecurityService` validates uploads;
  `PresenceTracker` holds connection state; `NotificationFanOutQueue` and
  `NotificationFanOutWorker` move notification delivery off the request path;
  `MailKitEmailService` sends mail.

/ Data: `AppDbContext` and the entity model. The only component that talks to
  the database.

The separation between the first two service groups matters. A domain service
can be reasoned about without any infrastructure: `FundingMath` is arithmetic
over rows, and `PipelineStages` is a transition table. Neither performs I/O,
which is what makes them testable without a database.

#full-page-figure(
  "/assets/diagrams/out/component-api.svg",
  caption: [Component view of the API. Controllers delegate and never query;
    domain services hold the rules and perform no I/O; only `AppDbContext`
    reaches the database.],
)

== Backend Layering

=== Controllers

A controller does four things and nothing else: bind the request, check
authorisation, call a service, and shape the result. The last of these is
handled uniformly rather than per-controller — a shared extension translates a
service result into an HTTP response, so the mapping from "not found" to `404`
exists once rather than twenty-five times.

This is the discipline that the old version of this project lacked, and its
absence is what produced controllers that talked to the data context directly.
The rule now is mechanical: *a controller may not reference `AppDbContext`.*

=== Services

Services return a result object rather than throwing for expected outcomes. An
investment that cannot be created because the venture is closed is not an
exceptional condition — it is an ordinary answer, and modelling it as an
exception both costs performance and obscures the control flow.

#figure(
  ```cs
  // A service reports outcome in its return type; the controller maps it.
  var result = await _payments.OpenCheckoutAsync(investmentId, userId, ct);
  return result.ToActionResult(this);
  ```,
  caption: [The controller-to-service seam. Outcome mapping happens in one
    place for the whole API.],
)

=== Data Access

The data context is reached only from services. Queries that feed list pages
project directly into DTOs rather than materialising entities, so a listing
query returns the eight columns the card needs rather than the full row and its
navigation properties. §17.4 reports what this measured.

== Frontend Architecture

=== Routing and Segments

The client uses file-based routing over sixty-five routes, grouped into
segments that correspond to access level rather than to feature: public pages
(landing, venture listing, venture detail, legal), authentication pages, and an
authenticated application group containing the dashboards, investment surfaces,
messages, settings and the administrative area.

Grouping by access level rather than by feature means the authorisation
boundary is visible in the directory structure. An administrative page cannot
be added in the wrong place without it being obvious in review.

=== Data Fetching

Public pages render on the server so that their content is present in the first
response (§5.2). Authenticated surfaces fetch on the client, because their
content is user-specific and not cacheable, and because they are behind a
navigation the user has already paid the load cost for.

=== State Management

There is no global client state store. This is deliberate. Server state — the
list of ventures, a portfolio, a conversation — belongs to the server and is
fetched, not mirrored. The state that genuinely lives on the client is small:
form state, the open or closed state of overlays, and the live connection
status. Introducing a global store would create a second copy of the truth,
with the synchronisation problem that follows.

== Cross-Cutting Concerns

=== Validation

Request validation is declarative and runs before a controller body executes,
so a service can assume its input is structurally valid. This separates
*structural* validation — a required field is present, an amount is positive —
from *domain* validation, which is the service's responsibility and which
depends on state the validator cannot see.

=== Error Handling

Expected outcomes are results (§6.5). Unexpected ones are exceptions, handled
centrally, logged, and returned to the client as a generic failure. The client
never receives a stack trace or an internal message, because an error response
is an information disclosure surface (§10.11).

=== Logging

Logging is structured and levelled. Security-relevant events — failed sign-in,
lockout, password reset, administrative action — are additionally written to
durable tables (`SecurityLog`, `AdminAuditLog`) rather than to the log stream
alone, because a log stream is not queryable evidence.

=== Time and Serialisation

Every timestamp is stored and transmitted in UTC. This sounds like a
convention until it is violated: a serialiser that emits a local-time string
without an offset produces a value the client silently re-interprets in its own
zone, and the resulting bug is invisible in any environment where the two zones
agree.

The system applies an explicit UTC converter at the serialisation boundary so
that the format is a property of the API rather than of whichever machine
serialised the response. @ch:challenges describes the incident that made this
necessary.

#adr(
  "07",
  "Force UTC at the serialisation boundary rather than by convention",
  background: [A timestamp serialised without an explicit offset is
    re-interpreted by the client in its own timezone. The defect is invisible
    wherever server and client zones agree, which includes every developer
    machine.],
  decision: [Apply an explicit UTC converter in the serialisation pipeline so
    every emitted timestamp carries its offset, independent of host
    configuration.],
  consequences: [Timestamps are unambiguous across environments and the defect
    class cannot recur. Every stored value must be UTC at the point of write,
    which is a discipline the data layer must maintain.],
)

== Design Patterns Applied

#figure(
  table(
    columns: (34mm, 1fr),
    align: (left + top, left + top),
    table.header([Pattern], [Where, and what it buys]),
    [Strategy],
    [`IPaymentProvider` (§11.2). The payment algorithm varies by
     configuration without the caller knowing which is in use.],
    [Data transfer object],
    [Every API boundary. Entities are never serialised directly, so a schema
     change cannot silently alter the public contract.],
    [Result object],
    [The service seam (§6.5). Expected failure is a value, not an exception.],
    [Producer–consumer],
    [`NotificationFanOutQueue` with a background worker. Notification delivery
     leaves the request path, so a slow fan-out cannot slow a write.],
    [Repository-like projection],
    [List queries project to DTOs inside the service rather than returning
     entities for the controller to map.],
  ),
  caption: [Patterns used, and the specific problem each solves.],
)

The table deliberately omits patterns the system does not use. There is no
mediator, no event bus and no generic repository abstraction over EF Core —
each was considered and rejected as indirection without a corresponding
problem. EF Core's `DbSet` is already a repository; wrapping it produces a
second, worse one.

== Architecture Decision Records

Ten decisions are recorded in this document, each at the point where its
consequences are discussed rather than collected into a chapter of their own.

#figure(
  table(
    columns: (14mm, 1fr, 20mm),
    align: (center + top, left + top, center + top),
    table.header([ADR], [Decision], [Section]),
    [01], [Replace the Angular frontend with React and Next.js], [§5.3],
    [02], [Payment rules live in the domain, not in the provider integration], [§5.7],
    [03], [Send transactional mail over SMTP behind an interface], [§5.9],
    [04], [Funding totals are derived, never stored], [§7.6],
    [05], [Model moderation, lifecycle and commercial stage as independent columns], [§7.6],
    [06], [Build a layered monolith rather than a service-oriented system], [§6.2],
    [07], [Force UTC at the serialisation boundary rather than by convention], [§6.7],
    [08], [Hold presence in memory, persist last-seen], [§12.2],
    [09], [Move notification fan-out off the request path], [§12.6],
    [10], [Fail to start on a missing secret rather than falling back], [§16.6],
  ),
  caption: [Index of Architecture Decision Records.],
)

Each record states its context, the decision, and its consequences — including
the cost. A record whose consequences are entirely positive has not been
written honestly.

== Deployment View

#full-page-figure(
  "/assets/diagrams/out/deployment.svg",
  caption: [Deployment view. One instance of each container; the payment
    provider's callback is the only inbound path the platform does not
    initiate.],
)

The API and the hub deploy as one artefact to a managed ASP.NET Core host. The
web application deploys separately. The database is a managed SQL Server
instance reached over an encrypted connection whose credentials are supplied by
environment configuration and never committed (§16.6).

There is exactly one production instance of each. There is no load balancer, no
autoscaling group and no read replica — and stating that plainly is more useful
than describing an architecture the project does not have. §17.7 sets out which
of those would be needed first, and at what point.
