#import "/lib/report.typ": *
#import "/lib/theme.typ": *

#report-cover(
  number: 1,
  title: "Idea & Requirements",
  subtitle: "The problem, what already exists, what was asked for, and what was chosen to build it with",
  date: "September 2026",
)

#show: report.with(number: 1, name: "Idea & Requirements")

= Introduction

This is the first of twelve progress reports covering the Vestora platform. Each
takes one part of the work, states what it is for, and shows what was delivered.

This report comes before any of the building. It answers three questions that
every later report assumes have been settled: *what problem is this?*, *what was
the system required to do?*, and *what was it built with, and at what cost?*

Nothing here is a feature. Every table in this report is a commitment that
reports 2 to 12 are measured against — and the last section of this report is
the list of things the project agreed *not* to do, which matters just as much.

= The Problem

The problem can be stated as four concrete failures of the current arrangement.

/ Discovery is networked, not merit-based: A founder's access to investors is
  determined largely by who they already know. There is no neutral surface on
  which a venture can be found on the strength of what it is.

/ Evaluation is unsupported: An investor considering an early-stage venture
  needs the team, the financial ask, supporting documents and a record of
  progress. Where these exist at all they are scattered across decks, emails and
  calls, and none of it is verifiable by the platform hosting the pitch.

/ Commitment is unmodelled: Existing consumer platforms model a purchase. An
  equity or revenue commitment is a different object: it has an approval step, a
  settlement step, and a status that must never be confused with either.

/ The relationship ends at payment: Once funds move, the platform stops. There
  is no channel through which a founder reports progress and no view through
  which an investor tracks it, so accountability depends entirely on the goodwill
  of the founder.

Each of these is a software problem before it is a market problem. Each appears
again in this series as a requirement, a design decision and a test.

= What Already Exists

The field divides into two kinds of platform, and neither covers the problem
above.

#figure(
  table(
    columns: (48mm, 20mm, 20mm, 20mm),
    align: (left + top, center, center, center),
    table.header([Capability], [Reward\ platforms], [Equity\ platforms], [Vestora]),
    [Public discovery without an account], [Yes], [Often no], [Yes],
    [Search and filter by attribute], [Yes], [Limited], [Yes],
    [Models a holding rather than a purchase], [No], [Yes], [Yes],
    [Administrative review before publication], [Varies], [Yes], [Yes],
    [Document request and grant channel], [No], [Yes], [Yes],
    [In-platform direct messaging], [Limited], [Varies], [Yes],
    [Milestones and post-funding updates], [Partial], [Rare], [Yes],
    [Approved and funded modelled separately], [No], [Varies], [Yes],
    [Accessible to small individual amounts], [Yes], [No], [Yes],
    [Legal execution of the instrument], [N/A], [Yes], [*No*],
    [Identity and anti-money-laundering checks], [Partial], [Yes], [*No*],
  ),
  caption: [Capability comparison. The final two rows are capabilities Vestora
    does not have.],
)

The last two rows are stated deliberately. Vestora records commitments; it does
not execute share instruments and does not perform regulatory onboarding.
*A comparison table in which the author's system wins every row is not a
comparison.*

== Where the gaps are

Three gaps emerge, and each becomes a requirement later in this report.

+ *The small individual investor is unserved at the equity end.* Reward
  platforms accept small amounts but do not model a holding; equity platforms
  model a holding but exclude small amounts. Vestora occupies the intersection.

+ *The post-funding relationship is nobody's product.* Reward platforms end at
  fulfilment; equity platforms end at close. Milestones, updates and a durable
  portfolio view are the platform's answer, and they are the subject of reports 4
  and 7.

+ *Commitment state is modelled loosely across the field.* Where a platform
  displays a single funding figure, it is usually not distinguishing intention
  from settlement. That separation — enforced structurally in the schema, not
  merely in the interface — is this project's most transferable contribution. It
  is not specific to crowdfunding.

= Scope

== In scope

- *Identity and access.* Registration, email verification, one-time password
  confirmation, sign-in with JSON Web Tokens and rotating refresh tokens,
  password reset, lockout after repeated failures, role-based authorisation, and
  administrative suspension.
- *Venture management.* Creation and editing of ventures with imagery,
  documents, team members, funding targets, milestones and progress updates.
- *Administrative review.* A moderation pipeline covering approval, rejection
  with reason, reporting, and an audit trail of administrative actions.
- *Discovery.* Listing, search, filtering, sorting, saved searches, bookmarks and
  a following relationship between users.
- *Investment.* Funding requests, an approval step, checkout against a payment
  provider, settlement recorded from provider callbacks, and portfolio views for
  the investor.
- *Communication.* Direct messaging with presence, typing indicators, read
  receipts and image attachments; a notification system with in-app delivery.
- *Insight.* Founder and investor dashboards, and administrative analytics
  covering activity, revenue and moderation load.

== Out of scope

These are excluded deliberately, and Report 12 returns to each.

- *Live money movement.* The platform integrates a payment provider behind an
  abstraction and runs against a simulated provider by default. The
  Stripe-compatible path, including signature-verified webhook handling, is
  implemented and configurable, but the system has not been operated against a
  live merchant account.
- *Legal execution of equity.* The platform records commitments; it does not
  generate, execute or register share instruments.
- *Identity verification and anti-money-laundering checks.* Regulatory
  onboarding is a constraint on deployment, not an implemented feature.
- *Secondary trading.* There is no mechanism for transferring a commitment
  between investors.
- *Automated recommendation.* Ranking is deterministic and attribute-based. No
  machine-learned recommendation is implemented.

#note[
  The out-of-scope list is not an apology. Each entry is a decision with a
  reason, and each is repeated verbatim in the report that would otherwise be
  expected to contain it — so that no reader reaches Report 8 expecting live
  settlement and finds a simulator instead.
]

= Who It Is For

#figure(
  table(
    columns: (26mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Persona], [Situation], [What they need from the platform]),
    [The founder],
      [Has a working product and no investor network. Time-poor; the platform
       competes with building the product.],
      [To be found on merit; to answer diligence questions once rather than
       twenty times; to report progress without assembling a document.],
    [The investor],
      [Willing to place a modest amount early. Cannot access syndicates. Wary of
       opacity.],
      [To discover ventures by attribute; to see evidence rather than claims; to
       know what state their money is in; to follow what happens next.],
    [The administrator],
      [Responsible for what appears on the platform and accountable for it.],
      [A queue rather than a firehose; the ability to act decisively; a record of
       what was done and by whom.],
  ),
  caption: [The three personas the requirements serve.],
)

= Requirements

Requirements came from three sources, weighted differently because they are
differently reliable.

/ Domain analysis: The comparison above established what existing platforms do
  and — more usefully — what they omit. The gaps are the origin of most
  functional requirements.

/ Structured interviews: Conversations with people on both sides of the problem:
  individuals who had attempted to raise early-stage capital, and individuals who
  had considered placing money into small ventures. These produced the
  requirements around *evidence* — documents, milestones, progress — which no
  amount of competitor analysis would have surfaced, because the competitors do
  not have them.

/ Supervisory review: Requirements were reviewed against the questions a domain
  expert asks: what happens when a payment fails, who is allowed to do this, what
  happens if two people do it at once. Several non-functional requirements exist
  because of a question of that shape.

Requirements are identified as `FR-nn` and `NFR-nn`, and the identifiers are
*stable*: a requirement that is dropped leaves its number retired rather than
reused, so a reference in an older document never silently means something else.

== Functional requirements

Forty-three functional requirements are recorded across six areas, each carrying
a priority and a pointer to where it is satisfied.

#figure(
  table(
    columns: (46mm, 16mm, 1fr),
    align: (left + top, center + top, left + top),
    table.header([Area], [Count], [Delivered in]),
    [Identity and access], [7], [Report 3],
    [Projects and ventures], [7], [Report 4],
    [Discovery and engagement], [7], [Report 6],
    [Investment and funding], [9], [Reports 7 and 8],
    [Communication], [7], [Reports 9 and 10],
    [Administration and moderation], [6], [Reports 5 and 11],
  ),
  caption: [Functional requirements by area, and the report that delivers each
    group. The full enumeration with priorities is carried in the appendix.],
)

== Non-functional requirements

Non-functional requirements are stated with a number wherever a number is
meaningful. *"The system shall be fast" is not a requirement; it is a wish.*

#figure(
  table(
    columns: (17mm, 1fr, 22mm),
    align: (left + top, left + top, center + top),
    table.header([ID], [Requirement], [Assessed in]),
    [NFR-01], [Public venture pages shall be server-rendered so that primary
      content is present in the first response.], [2],
    [NFR-02], [The venture listing shall return within 300 ms at the 95th
      percentile under expected load.], [12],
    [NFR-03], [No collection endpoint shall return an unbounded result set.], [6],
    [NFR-04], [Passwords shall be stored only as salted hashes.], [3],
    [NFR-05], [Refresh tokens shall be stored only as hashes and rotated on
      use.], [3],
    [NFR-06], [All timestamps shall be stored and transmitted in UTC.], [2],
    [NFR-07], [Monetary values shall use exact decimal representation.], [7],
    [NFR-08], [Every state-changing endpoint shall enforce authorisation
      server-side.], [3],
    [NFR-09], [Error responses shall disclose no internal detail.], [2],
    [NFR-10], [The application shall refuse to start when a required secret is
      absent.], [12],
    [NFR-11], [Uploads shall be limited by size and restricted to an allow-list
      of verified content types.], [4],
    [NFR-12], [Security-relevant events shall be persisted to queryable storage,
      not only to logs.], [11],
    [NFR-13], [The interface shall meet WCAG 2.1 AA.], [2],
    [NFR-14], [The interface shall be usable from 360 px to 1920 px wide.], [2],
    [NFR-15], [Schema changes shall be applied only through versioned
      migrations.], [2],
    [NFR-16], [Notification delivery shall not block the request that generated
      it.], [9],
  ),
  caption: [Sixteen non-functional requirements, each with the report that
    assesses it. None is assessed in this one.],
)

= The System in One Picture

#full-page-figure(
  "/assets/diagrams/out/use-case.svg",
  caption: [Use case model. Fourteen cases across three human actors and one
    external system — the payment provider, which is an actor because it
    initiates the settlement callback rather than merely receiving a request.],
)

#full-page-figure(
  "/assets/diagrams/out/dfd-level1.svg",
  caption: [Level-1 data flow. Read alongside the use case model: the cases say
    who may act, this says where the data goes when they do.],
)

= Technology Decisions

A technology section that lists what was used explains nothing. The list is
visible in the project file. What is not visible is *why each item is there
rather than its alternative, and what was given up in choosing it.* This section
records the second thing.

== The decision framework

Every decision below is evaluated against the same five criteria, weighted once
and applied consistently. The weights derive from the requirements above, not
from preference.

#figure(
  table(
    columns: (34mm, 14mm, 1fr),
    align: (left + top, center + top, left + top),
    table.header([Criterion], [Weight], [Why it carries this weight]),
    [Fit to requirement], [30%],
      [A choice that does not serve a stated requirement is not a trade-off, it
       is a mistake. Weighted highest by definition.],
    [Team capability], [25%],
      [A small undergraduate team on a fixed timetable. A technically superior
       option the team cannot use well is not superior.],
    [Ecosystem maturity], [20%],
      [Documentation, community answers and library availability determine how
       much of the schedule is spent on the problem rather than on the tool.],
    [Operational cost], [15%],
      [Hosting, licensing and the effort of running the thing after it is
       written.],
    [Exit cost], [10%],
      [What it would take to replace this choice later. Low exit cost is worth
       paying a little for.],
  ),
  caption: [Evaluation criteria applied to every technology decision.],
)

Scores are on a one-to-five scale. Where a score is close, the narrative explains
the tie-break; where an option lost decisively, that is stated plainly rather
than softened.

== Worked example: the frontend

*Requirement pressure.* The platform has public pages that must be indexable and
fast on first load — the venture listing and the venture detail page are its shop
window (`NFR-01`) — and authenticated application surfaces where first-load cost
matters less than interaction quality. A framework that serves only one of those
two well would force a compromise on the other.

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
  caption: [Frontend framework evaluation, scored against the criteria above.],
)

Angular's lower total is not a statement about its quality. It is a coherent,
opinionated framework with first-class dependency injection and a structural
discipline that suits large teams. It scored lower on *fit to requirement*
because its server-rendering story requires additional infrastructure, and
because the component ecosystem available to us encodes visual opinions that run
against the interface direction set out in Report 2.

Vue with Nuxt scored well on fit but poorly on team capability: nobody on the
team had used it, and that criterion carries a quarter of the decision.

*What was given up.* React is a library, not a framework, so structural
discipline is not enforced by the tool. The mitigation is an enforced module
layout and lint rules that make the intended boundaries mechanical rather than
cultural — described in Report 2.

== Every decision, and what it cost

#figure(
  table(
    columns: (24mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Layer], [Chosen], [Principal trade-off accepted]),
    [Frontend], [React with Next.js],
      [No framework-enforced structure; replaced by lint rules and an enforced
       module layout.],
    [Backend], [ASP.NET Core], [Narrower hosting market than Node.js.],
    [Database], [SQL Server with EF Core],
      [Higher hosting cost than PostgreSQL; generated queries need supervision.],
    [Identity], [JWT with rotating refresh tokens],
      [Access tokens cannot be revoked before expiry.],
    [Payments], [Provider abstraction, simulated by default],
      [An extra indirection and provider-neutral result types on both sides.],
    [Real time], [SignalR], [Ties the real-time layer to the ASP.NET Core
      runtime.],
    [Email], [SMTP via MailKit], [No deliverability reporting or bounce
      handling.],
    [UI], [Tailwind with Radix primitives], [The project owns its component
      code.],
    [Hosting], [Managed ASP.NET Core and SQL Server],
      [No autoscaling, no managed CI, limited observability.],
  ),
  caption: [Technology decisions and the cost accepted for each.],
)

*Every row of that table has a cost column, and none of them is empty. A decision
with no stated cost has not been examined.*

= What It Became

#shot(
  "/assets/screenshots/landing-en-light.png",
  [The result of everything above, in one frame — the surface an unauthenticated
   visitor arrives at. Reports 2 to 12 take it apart.],
)

= Challenges

#challenge("Requirements written after the fact are not requirements")[
  A graduation project is written up once it is largely built, which makes it
  easy to reverse-engineer a requirements list from the delivered features. The
  result reads perfectly and proves nothing.

  *Solution.* Identifiers were fixed early and made *stable* — a dropped
  requirement retires its number rather than freeing it for reuse. The visible
  consequence is that the enumeration has gaps, and the gaps are the evidence
  that the list was not written backwards from the product.
]

#challenge("A comparison written by the author is not evidence")[
  The comparison table above was produced by the same person who built the
  system being compared, which is exactly the condition under which such tables
  are usually worthless.

  *Solution.* The table carries two rows where the answer is *No* for this
  platform and *Yes* for the incumbents, and both are capabilities a serious
  deployment would require. They are repeated in the scope exclusions and again
  in Report 12. The test of an honest comparison is whether it contains a row the
  author would rather omit.
]

#challenge("A weighted score can be reverse-engineered to the answer you wanted")[
  A scoring matrix looks objective and is trivially manipulated. Adjust one
  weight by five points, or one score by a single step, and the winner changes —
  after the winner has already been decided.

  *Solution, and its limit.* The weights are fixed *once*, before any option is
  scored, and derived from the requirement table rather than from preference. The
  same five criteria and the same weights are applied to all nine decisions, so a
  weight tuned to favour one outcome would distort the other eight. That
  constrains the manipulation; it does not eliminate it, and the scores remain a
  structured argument rather than a measurement.
]

= How This Fits With the Rest of the System

This report contains no implementation, so its relationships run one way: every
later report is accountable to something recorded here.

#figure(
  table(
    columns: (34mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Report], [Relationship], [Boundary]),
    [2 · Foundation & Design System],
      [*Implements the decisions above.* The stack, the container split and the
       interface direction are all consequences of this report.],
      [It builds structures; it does not add requirements.],
    [3 to 11 · the delivered parts],
      [*Each satisfies a requirement group.* The functional table above names
       which report answers which area.],
      [No report delivers a feature that is not traceable to an `FR`.],
    [12 · Administration & Evaluation],
      [*Assesses this report.* Every `NFR` above is measured or its measurement
       is declared absent, and every scope exclusion is revisited.],
      [It is the only report permitted to close a requirement.],
  ),
  caption: [This report is the contract; the rest of the series is the
    performance against it.],
)

= Summary

#delivered[
  *The problem*, stated as four failures of the current arrangement rather than
  as an opportunity. *A comparison* against reward and equity platforms in which
  two rows go against this project. *Three gaps* that became the shape of the
  product. *Scope*, with five explicit exclusions. *Three personas.*
  *Forty-three functional requirements* across six areas and *sixteen
  non-functional requirements*, each with a stable identifier and a named place
  where it is answered. *Nine technology decisions*, each scored against five
  weighted criteria fixed in advance, and each with the cost accepted for it.
]

*Still open in this part.* Requirements elicitation drew on domain analysis,
interviews and supervisory review, but not on a controlled user study; the
personas above are grounded rather than measured. No requirement in this report
is assessed here — assessment is Report 12's work, and a requirement is not
satisfied because the report that introduced it said so.

*What this enables.* Report 2 can now build, because it knows what it is
building, for whom, against which numbers, and with what.
