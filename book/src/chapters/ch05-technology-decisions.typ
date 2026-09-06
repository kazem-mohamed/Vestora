#import "/lib/vestora.typ": *
#import "/lib/theme.typ": *

= Technology Stack and Engineering Decisions <ch:tech>

== Decision Framework and Evaluation Criteria

A technology chapter that lists what was used explains nothing. The list is
visible in the project file; what is not visible is why each item is there
rather than its alternative, and what was given up in choosing it. This chapter
records the second thing.

Every decision below is evaluated against the same five criteria, weighted once
and applied consistently. The weights come from the requirements in
@ch:requirements, not from preference.

#figure(
  table(
    columns: (34mm, 14mm, 1fr),
    align: (left + top, center + top, left + top),
    table.header([Criterion], [Weight], [Why it carries this weight]),

    [Fit to requirement],
    [30%],
    [A choice that does not serve a stated requirement is not a trade-off, it
     is a mistake. Weighted highest by definition.],

    [Team capability],
    [25%],
    [A small undergraduate team on a fixed timetable. A technically superior
     option the team cannot use well is not superior.],

    [Ecosystem maturity],
    [20%],
    [Documentation, community answers and library availability determine how
     much of the schedule is spent on the problem rather than on the tool.],

    [Operational cost],
    [15%],
    [Hosting, licensing and the effort of running the thing after it is
     written.],

    [Exit cost],
    [10%],
    [What it would take to replace this choice later. Low exit cost is worth
     paying a little for.],
  ),
  caption: [Evaluation criteria applied to every technology decision in this
    chapter.],
)

Scores are on a one-to-five scale. Where a score is close, the narrative
explains the tie-break; where an option lost decisively, that is stated plainly
rather than softened.

#note[
  Two decisions in this chapter were revised during the project rather than
  settled at the start: the frontend framework (§5.3) and the payment
  integration strategy (§5.7). Both are documented as they actually happened,
  including the cost of the change.
]

== Frontend Framework: React with Next.js

*Requirement pressure.* The platform has public pages that must be indexable
and fast on first load — the venture listing and the venture detail page are
its shop window — and authenticated application surfaces where first-load cost
matters less than interaction quality. A framework that serves only one of
those two well would force a compromise on the other.

#figure(
  table(
    columns: (1fr, 17mm, 17mm, 17mm),
    align: (left, center, center, center),
    table.header([Criterion], [React\ + Next.js], [Angular], [Vue\ + Nuxt]),
    [Fit to requirement (30%)], [5], [3], [4],
    [Team capability (25%)], [4], [3], [2],
    [Ecosystem maturity (20%)], [5], [4], [3],
    [Operational cost (15%)], [3], [4], [4],
    [Exit cost (10%)], [3], [2], [3],
    [*Weighted total*], [*4.20*], [*3.25*], [*3.20*],
  ),
  caption: [Frontend framework evaluation.],
)

Angular's loss is not about quality. It is a coherent, opinionated framework
with first-class dependency injection and a structural discipline that suits
large teams — and it was, in fact, what the first version of this project was
built on. It scored lower here on *fit to requirement*: its server-rendering
story requires additional infrastructure, and the component ecosystem available
to us was Angular Material, whose visual opinions run against the interface
direction described in @ch:design.

Vue with Nuxt scored well on fit but poorly on team capability: nobody on the
team had used it, and §5.1 weights that at a quarter of the decision.

*What was given up.* React is a library, not a framework, so structural
discipline is not enforced by the tool. Angular would have supplied it for
free. The mitigation is described in §6.5: an enforced module layout and lint
rules that make the intended boundaries mechanical rather than cultural.

== Case Study: Migrating from Angular to React

This project has an advantage over most framework comparisons: it did not
choose between the two on paper. It shipped one, then moved to the other.

*The starting position.* The initial implementation used Angular with Angular
Material and a conventional client-rendered single-page application. It worked.
The decision to move was not driven by a defect.

*What forced the reassessment.* Three pressures accumulated.

+ *The public surface was slow to first paint.* Venture listing and detail
  pages are the discovery surface. A client-rendered application fetches the
  shell, then the framework, then the data — so the content a first-time
  visitor came for arrives last.

+ *The component library fought the design direction.* Angular Material encodes
  a specific visual language. Overriding it comprehensively costs more than
  building on unstyled primitives, and produces a result that reads as
  "Material with the corners filed off".

+ *Iteration speed on the interface was the bottleneck.* The interface quality
  bar for this project is high (@ch:design), which means many rounds of visual
  revision. The cost per round mattered more than any single technical
  attribute.

*The decision.* Migrate the frontend to React with Next.js, retaining the
existing API unchanged. The API boundary made this possible: the backend had no
knowledge of the frontend framework, so the migration replaced one container in
the sense of @ch:architecture, not the system.

#adr(
  "01",
  "Replace the Angular frontend with React and Next.js",
  background: [The public discovery surface was client-rendered and slow to
    first paint; the component library resisted the intended visual direction;
    interface iteration was the schedule bottleneck.],
  decision: [Rewrite the frontend as a Next.js application using React, with
    Tailwind CSS and unstyled Radix-based primitives. Leave the REST API
    untouched.],
  consequences: [First paint on public pages improves and those pages become
    server-renderable. Interface iteration accelerates. In exchange the team
    gives up Angular's enforced structure and absorbs a full frontend rewrite
    mid-project; structural discipline moves from the framework into lint rules
    and an enforced module layout.],
)

*What it cost.* A complete reimplementation of every screen, and a period during
which the team was learning a new rendering model — server components, the
boundary between server and client code, and data fetching that no longer looked
like a service injected into a component. The clean API boundary limited the
blast radius, but the cost was real and is reported in @ch:challenges rather
than presented as a free upgrade.

*What it bought.* Public pages render on the server. The interface is built on
primitives that impose no visual opinion. And the team ended the project able to
speak to both frameworks from experience rather than from documentation — which
is the reason this section exists at all.

== Backend Platform: ASP.NET Core

*Requirement pressure.* The backend carries money-adjacent invariants,
role-based authorisation across every state-changing endpoint, and a real-time
transport. Static typing and a mature authorisation story were therefore
weighted heavily inside *fit to requirement*.

#figure(
  table(
    columns: (1fr, 17mm, 17mm, 17mm),
    align: (left, center, center, center),
    table.header([Criterion], [ASP.NET\ Core], [Node.js\ + Express], [Spring\ Boot]),
    [Fit to requirement (30%)], [5], [3], [5],
    [Team capability (25%)], [5], [3], [2],
    [Ecosystem maturity (20%)], [4], [5], [5],
    [Operational cost (15%)], [4], [4], [3],
    [Exit cost (10%)], [3], [4], [3],
    [*Weighted total*], [*4.45*], [*3.65*], [*3.75*],
  ),
  caption: [Backend platform evaluation.],
)

Three properties decided it. First, the type system is enforced at compile time,
and the invariants in @ch:payments are the kind that benefit from being
unrepresentable rather than merely tested. Second, authorisation, model
validation, dependency injection and configuration are first-party concerns
rather than assembled from packages, which matters for a team that cannot afford
to spend its schedule integrating middleware. Third, SignalR (§5.8) belongs to
the same platform, so the real-time transport did not introduce a second
runtime.

Spring Boot scored equally on fit and higher on ecosystem, and lost only on team
capability — the single largest avoidable risk on a fixed timetable. Node.js
with Express scored well on ecosystem and exit cost but poorly on fit: the
guarantees this system needs would have to be reconstructed at runtime rather
than being available at compile time.

== Data Layer: SQL Server with EF Core

The data is relational and the invariants are relational. A venture has
investments; an investment belongs to exactly one investor and one venture; a
payment transaction settles exactly one funding request. The integrity rules in
§7.6 are foreign keys, check constraints and unique indexes — the native
vocabulary of a relational database. A document store would require these to be
enforced in application code, which is precisely the arrangement this project
set out to avoid.

#figure(
  table(
    columns: (1fr, 20mm, 20mm, 20mm),
    align: (left, center, center, center),
    table.header([Criterion], [SQL Server], [PostgreSQL], [MongoDB]),
    [Fit to requirement (30%)], [5], [5], [2],
    [Team capability (25%)], [5], [3], [3],
    [Ecosystem maturity (20%)], [5], [5], [4],
    [Operational cost (15%)], [3], [5], [4],
    [Exit cost (10%)], [3], [4], [2],
    [*Weighted total*], [*4.40*], [*4.40*], [*2.90*],
  ),
  caption: [Database evaluation. SQL Server and PostgreSQL tie on the weighted
    score.],
)

*The tie-break.* SQL Server and PostgreSQL score identically. PostgreSQL is
cheaper to host and has a lower exit cost; SQL Server is more familiar to the
team and integrates more smoothly with the .NET tooling the rest of the project
already uses. The decision went to SQL Server on *hosting availability*: the
deployment target (§16.2) offers managed SQL Server, and eliminating a
separately administered database server removed an operational risk the team was
not staffed to carry.

This is worth stating clearly because it is the weakest-justified choice in the
chapter. Had hosting been neutral, PostgreSQL would have been at least as good a
decision.

*EF Core* was chosen over Dapper and raw ADO.NET for the migration history
alone. The schema evolved across more than twenty migrations (§7.7);
reproducing that as hand-written, hand-ordered SQL would have consumed schedule
with no compensating benefit. The cost is the usual one — generated queries need
supervision, and §17.4 documents the places where a generated query had to be
replaced by an explicit projection.

== Authentication Strategy: JWT with Refresh Tokens

*Requirement pressure.* The frontend and the API are separate origins, and a
persistent WebSocket must authenticate against the same identity as the REST
calls. A cookie-session model tied to a single origin fits neither cleanly.

The chosen design issues a short-lived access token carrying the user's identity
and role, paired with a longer-lived refresh token that is rotated on use. The
lifetimes are configuration, not constants in code:

#figure(
  table(
    columns: (1fr, 30mm, 1.2fr),
    align: (left + top, center + top, left + top),
    table.header([Setting], [Value], [Reasoning]),
    [Access token lifetime], [60 minutes],
      [Short enough that a leaked token expires within a session; long enough to
       avoid refresh churn.],
    [Refresh token lifetime], [14 days],
      [A fortnight of inactivity ends the session. Rotated on every use, so a
       replayed refresh token is detectable.],
    [Email verification token], [60 minutes], [Single-use and time-boxed.],
    [Password reset token], [10 minutes],
      [Deliberately shorter: a reset link sitting in an inbox is a
       higher-value target than a verification link.],
    [Lockout threshold], [5 attempts / 15 minutes],
      [Blunts credential stuffing without locking out a legitimate user who
       mistypes.],
  ),
  caption: [Authentication lifetimes, all supplied by configuration.],
)

*What was given up.* A stateless access token cannot be revoked before it
expires. An account suspended one minute into a token's life retains API access
until minute sixty unless something else intervenes. The mitigation — checking
account state on the paths where it matters rather than trusting the token alone
— is described in §10.9, and the residual exposure is stated there rather than
hidden here.

== Payment Integration Strategy

This section documents a decision that is frequently misdescribed, so it is
stated precisely.

*The requirement is not "integrate a payment provider".* It is: the platform's
definition of a valid commitment must not be a property of whichever provider
happens to be configured. If the rules for what counts as a funded investment
live inside an integration, then changing provider changes the domain — and
testing the domain requires the provider.

*The decision* was therefore to introduce a provider interface that carries
transport only, and to keep every domain rule in the platform's own service
layer.

#figure(
  ```cs
  public interface IPaymentProvider
  {
      /// "stripe" or "simulated" — stored on every transaction it handles.
      string Name { get; }

      Task<ProviderCheckout> CreateCheckoutAsync(
          ProviderCheckoutRequest request, CancellationToken ct = default);

      Task<ProviderPaymentResult> GetSessionResultAsync(
          string sessionId, CancellationToken ct = default);

      Task<ProviderRefundResult> RefundAsync(
          string providerPaymentId, decimal amount, string currency,
          CancellationToken ct = default);
  }
  ```,
  caption: [The provider boundary. It exposes no domain concept — no venture, no
    investor, no funding target — only the three operations a payment processor
    performs.],
)

Two implementations satisfy it. A *simulated* provider, which is the default and
resolves checkouts locally. And a *Stripe-compatible* provider, which speaks
HTTP to Stripe's API and whose webhook callbacks are signature-verified by a
hand-implemented verifier rather than by a vendor SDK. Selection is by
configuration at startup.

#adr(
  "02",
  "Payment rules live in the domain, not in the provider integration",
  background: [Funding integrity is the system's most important invariant. If
    the rules governing it live inside a provider integration, they cannot be
    tested without that provider, and they change when the provider changes.],
  decision: [Define `IPaymentProvider` with transport operations only. Hold every
    rule — what may be committed, when a commitment becomes funded, how totals
    are derived — in the platform's own service layer. Select the implementation
    by configuration.],
  consequences: [The simulated path exercises the same domain rules as the
    Stripe path, so it is a legitimate test surface rather than a stand-in.
    Adding a provider cannot alter the meaning of a funded investment. The cost
    is an extra indirection and a set of provider-neutral result types that must
    be mapped on both sides.],
)

#note[
  *Stated plainly:* the platform runs against the simulated provider by default
  and has not been operated against a live merchant account. The
  Stripe-compatible implementation, including webhook signature verification and
  idempotent event handling, is written and configurable. @ch:payments sets out
  exactly which paths have been exercised and which have not. This document does
  not claim a live payment integration.
]

*Why Stripe as the target provider.* Among providers with documented sandbox
environments, Stripe's webhook signature scheme and session model are the best
documented and the most widely reproduced — which matters when the verifier is
implemented directly rather than taken from an SDK. PayPal's flow is harder to
model behind a narrow interface. Regional gateways were considered for eventual
deployment (§2.7), but none offers a sandbox that supports development at this
stage.

== Real-Time Transport: SignalR

Messaging, presence, typing indicators and read receipts all require the server
to push. The alternatives were polling, raw WebSockets, and server-sent events.

Polling was rejected on cost: presence and typing indicators are only useful at
sub-second resolution, and polling at that interval is wasteful at any user
count. Server-sent events are unidirectional, which covers notifications but not
typing indicators. Raw WebSockets would have required implementing connection
lifecycle, reconnection with backoff, and transport fallback by hand.

SignalR provides those, negotiates transport automatically, and — decisively —
shares the ASP.NET Core authentication pipeline, so a hub connection
authenticates against the same token as a REST call with no second mechanism.
@ch:realtime documents the hub design that follows.

== Transactional Email Delivery

The platform sends four kinds of message: email verification, one-time
passwords, password reset links, and notification mail. None is marketing email;
all are transactional, low-volume and latency-sensitive at the point of sign-up.

#figure(
  table(
    columns: (1fr, 21mm, 21mm, 21mm),
    align: (left, center, center, center),
    table.header([Criterion], [SMTP via\ MailKit], [Managed\ email API], [Platform\ built-in]),
    [Fit to requirement (30%)], [4], [5], [2],
    [Team capability (25%)], [5], [3], [3],
    [Ecosystem maturity (20%)], [5], [4], [3],
    [Operational cost (15%)], [5], [2], [4],
    [Exit cost (10%)], [5], [3], [2],
    [*Weighted total*], [*4.65*], [*3.75*], [*2.70*],
  ),
  caption: [Email delivery evaluation.],
)

The implementation sends over SMTP using MailKit, behind an `IEmailService`
interface so the transport can be replaced without touching the call sites.
Host, port, credentials and sender identity are configuration; nothing is
compiled in.

A managed transactional email API scores higher on *fit* — it provides
deliverability reporting, bounce handling and domain authentication that raw
SMTP does not — and would be the correct choice for production at volume. It
lost here on operational and exit cost: it requires an account, a verified
sending domain and a billing relationship, none of which a university project
can rely on having, and it introduces a dependency that cannot be run offline.

#adr(
  "03",
  "Send transactional mail over SMTP behind an interface",
  background: [Four transactional message types are required. Managed email APIs
    offer better deliverability but require a verified domain and a billing
    relationship the project cannot guarantee.],
  decision: [Implement `IEmailService` over SMTP using MailKit, with all
    connection details in configuration.],
  consequences: [No external account is required and development can run against
    a local relay. Deliverability reporting and bounce handling are unavailable,
    and a production deployment at volume would need to swap the implementation
    — which the interface reduces to a single-class change.],
)

*What happened in practice, and what it proved.* The deployed system sends
through Brevo's SMTP relay — an account, a verified sender address and a
generated SMTP key, with every value in user secrets rather than in a committed
file. Verification codes and password resets reach real inboxes rather than
being written to a log.

That is worth recording because it is the decision being *tested* rather than
merely defended. Pointing the platform at a real relay required no change to any
call site and no change to `IEmailService` — only configuration. The interface
was justified on the argument that the transport could be replaced; replacing it
is the evidence that the argument was true.

The consequence stated in ADR-03 also survives contact: deliverability reporting
and bounce handling remain unavailable, because they are properties of a managed
API rather than of SMTP, and Brevo is being used as the latter.

== UI Layer: Tailwind CSS with shadcn/ui

The interface direction in @ch:design requires a specific visual system: a warm,
editorial palette, a display face used sparingly, and a chamfered plate motif
that exists in no component library.

Libraries with strong visual opinions — Angular Material, MUI, Bootstrap — start
from a design language and require it to be overridden. The chosen approach
inverts this. Radix primitives supply behaviour and accessibility — focus
management, keyboard interaction, ARIA semantics — with no styling at all, and
Tailwind applies the project's own tokens on top. shadcn/ui provides these as
source files copied into the repository rather than as a dependency, so a
component can be modified directly instead of fought with.

The cost is that the project owns its component code, including its bugs. The
benefit is that accessibility comes from the primitives rather than being
retrofitted — which is what makes the compliance claims in §8.7 defensible.

== Hosting and Infrastructure

The deployment target must run an ASP.NET Core application and a SQL Server
database, be affordable indefinitely rather than for a trial period, and be
operable by a team with no infrastructure engineer.

A managed cloud platform would score higher on capability and considerably lower
on operational cost and team capability: it introduces identity management,
networking and billing surfaces that are themselves a project. The chosen host
provides managed ASP.NET Core and SQL Server together, which removes database
administration entirely. The trade — no autoscaling, no managed CI, limited
observability — is accepted, and its consequences are documented in
@ch:deployment and §17.7 rather than described as a non-issue.

== Decision Summary

#figure(
  table(
    columns: (28mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Layer], [Chosen], [Principal trade-off accepted]),
    [Frontend], [React with Next.js],
      [No framework-enforced structure; replaced by lint rules and an enforced
       module layout.],
    [Backend], [ASP.NET Core],
      [Narrower hosting market than Node.js.],
    [Database], [SQL Server with EF Core],
      [Higher hosting cost than PostgreSQL; generated queries need supervision.],
    [Identity], [JWT with rotating refresh tokens],
      [Access tokens cannot be revoked before expiry.],
    [Payments], [Provider abstraction, simulated by default],
      [An extra indirection and provider-neutral result types on both sides.],
    [Real time], [SignalR],
      [Ties the real-time layer to the ASP.NET Core runtime.],
    [Email], [SMTP via MailKit],
      [No deliverability reporting or bounce handling.],
    [UI], [Tailwind with Radix primitives],
      [The project owns its component code.],
    [Hosting], [Managed ASP.NET Core and SQL Server],
      [No autoscaling, no managed CI, limited observability.],
  ),
  caption: [Summary of technology decisions and the cost accepted for each.],
)

Every row of that table has a cost column, and none of them is empty. A decision
with no stated cost has not been examined.
