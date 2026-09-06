#import "/lib/vestora.typ": *
#import "/lib/theme.typ": *

= Introduction <ch:intro>

== Background and Motivation

Capital and ideas are both plentiful. What is scarce is a reliable way for the
two to find each other at the smallest end of the market.

A founder with a working prototype and no investor network has a narrow set of
options. Bank lending is priced for collateral and trading history, neither of
which an eighteen-month-old company has. Institutional venture capital operates
on deal flow that arrives through introductions, so the founder without an
introduction is not rejected so much as never seen. What remains is the
founder's own network — which is precisely the resource that correlates with
prior advantage rather than with the quality of the idea.

The mirror problem exists on the other side. A person willing to place a modest
sum into an early-stage venture has no structured place to do it. Public
markets offer liquidity but not early-stage exposure. Angel syndicates require
capital and connections at a level most people do not have. The individual
investor is left choosing between opacity and exclusion.

Reward-based crowdfunding platforms addressed a version of this gap and
demonstrated that strangers will fund strangers at scale when the mechanism is
trustworthy. But their model is a pre-order: the backer receives a product, not
a stake, and the platform's involvement ends when the money moves. Nothing in
that model supports the questions an investor actually asks — what is the
company worth, what am I entitled to, how do I verify the claims in this pitch,
and what happens after I commit.

Vestora exists in the space those two models leave open: a platform that treats
funding as the middle of a relationship rather than the end of a transaction.

== Problem Statement

The problem this project addresses can be stated as four concrete failures of
the current arrangement.

/ Discovery is networked, not merit-based: A founder's access to investors is
  determined largely by who they already know. There is no neutral surface on
  which a venture can be found on the strength of what it is.

/ Evaluation is unsupported: An investor considering an early-stage venture
  needs the team, the financial ask, supporting documents and a record of
  progress. Where these exist at all they are scattered across decks, emails
  and calls, and none of it is verifiable by the platform hosting the pitch.

/ Commitment is unmodelled: Existing consumer platforms model a purchase. An
  equity or revenue commitment is a different object: it has an approval step,
  a settlement step, and a status that must never be confused with either.

/ The relationship ends at payment: Once funds move, the platform stops. There
  is no channel through which a founder reports progress and no view through
  which an investor tracks it, so accountability depends entirely on the
  goodwill of the founder.

Each of these is a software problem before it is a market problem, and each
appears again later in this document as a requirement, a design decision and a
test.

== Research Questions

The work is organised around four questions.

+ *RQ1.* How can a platform present early-stage ventures so that discovery
  depends on the attributes of the venture rather than on the founder's
  existing network?

+ *RQ2.* What data model correctly separates the administrative state of a
  venture from its commercial progress, such that neither can corrupt the
  other?

+ *RQ3.* How can funding integrity — the guarantee that a recorded commitment
  reflects money that actually moved — be enforced structurally rather than by
  application-level convention?

+ *RQ4.* What architecture allows a payment provider to be replaced or
  simulated without any change to the platform's definition of a valid
  investment?

RQ2 and RQ3 are answered by the data model in @ch:database and the funding
rules in @ch:payments. RQ4 is answered by the provider abstraction described in
§11.2. RQ1 runs through discovery, search and ranking in @ch:features1.

== Aim and Objectives

*Aim.* To design, build and evaluate a web platform that connects early-stage
founders with individual investors, and that remains correct about money and
about state throughout the venture's life.

The aim decomposes into seven objectives. Each is stated so that it can be
checked rather than asserted; @ch:evaluation reports the outcome against this
list.

#figure(
  table(
    columns: (11mm, 1fr, 42mm),
    align: (center + top, left + top, left + top),
    table.header([], [Objective], [Verified by]),

    [O1],
    [Provide a submission-to-publication pipeline in which every venture passes
     an explicit administrative review before becoming visible.],
    [§14.2, §14.5],

    [O2],
    [Model venture state such that administrative status and commercial stage
     are independent and cannot overwrite one another.],
    [§7.6, §14.2],

    [O3],
    [Guarantee that funding totals reported to users are derived from settled
     payments only, enforced below the application layer.],
    [§7.6, §11.7],

    [O4],
    [Isolate payment-provider integration behind an interface so that domain
     rules are provider-independent.],
    [§11.2],

    [O5],
    [Enforce access control by role across every state-changing endpoint, with
     an account lifecycle covering verification, lockout and suspension.],
    [§10.7–§10.10],

    [O6],
    [Support discovery through search, filtering, saved searches and a
     watchlist, so that a venture can be found without an introduction.],
    [§13.3, §13.4],

    [O7],
    [Sustain the relationship after funding through milestones, updates,
     document requests and in-platform messaging.],
    [§14.3, §14.4],
  ),
  caption: [Project objectives and where each is assessed.],
)

== Project Scope

=== In Scope

The delivered system covers the following.

- *Identity and access.* Registration, email verification, one-time password
  confirmation, sign-in with JSON Web Tokens and rotating refresh tokens,
  password reset, lockout after repeated failures, role-based authorisation,
  and administrative suspension.
- *Venture management.* Creation and editing of ventures with imagery,
  documents, team members, funding targets, milestones and progress updates.
- *Administrative review.* A moderation pipeline covering approval, rejection
  with reason, reporting, and an audit trail of administrative actions.
- *Discovery.* Listing, search, filtering, sorting, saved searches, bookmarks
  and a following relationship between users.
- *Investment.* Funding requests, an approval step, checkout against a payment
  provider, settlement recorded from provider callbacks, and portfolio views
  for the investor.
- *Communication.* Direct messaging with presence, typing indicators, read
  receipts and image attachments; a notification system with in-app delivery.
- *Insight.* Founder and investor dashboards, and administrative analytics
  covering activity, revenue and moderation load.

=== Out of Scope

The following are deliberately excluded, and are revisited in §20.3.

- *Live money movement.* The platform integrates a payment provider behind an
  abstraction and runs against a simulated provider by default. The
  Stripe-compatible path, including signature-verified webhook handling, is
  implemented and configurable, but the system has not been operated against a
  live merchant account. @ch:payments states precisely what has and has not
  been exercised.
- *Legal execution of equity.* The platform records commitments; it does not
  generate, execute or register share instruments.
- *Identity verification and anti-money-laundering checks.* Regulatory
  onboarding is discussed in §2.7 as a constraint on deployment, not
  implemented.
- *Secondary trading.* There is no mechanism for transferring a commitment
  between investors.
- *Automated recommendation.* Ranking is deterministic and attribute-based. No
  machine-learned recommendation is implemented.

== Contributions

This project contributes the following, in decreasing order of generality.

+ *A state model that separates moderation from commerce.* A venture carries an
  administrative #emph[status] and a commercial #emph[stage] as independent
  fields with independent transition rules. This prevents an entire class of
  defect in which an approval resets fundraising progress, or a funding event
  silently reverses a rejection. The model and its constraints are given in
  §7.6.

+ *A derived-funding integrity model.* No column stores "amount raised". Totals
  are computed from settled payment transactions at read time, and database
  constraints make the invalid intermediate states unrepresentable. The
  consequence — that an approved investment is structurally distinct from a
  funded one — is developed in §11.7.

+ *A provider-independent payment layer.* Domain rules governing what
  constitutes a valid commitment live in the platform's own service layer; the
  provider interface carries transport only. The same rules therefore apply
  identically to the simulated and the Stripe-compatible provider, which is
  what makes the simulated path a legitimate test surface rather than a
  stand-in.

+ *A working platform.* An implemented system of twenty-five API controllers
  over a relational model of more than forty entities, with a React front end
  of sixty-five routes, evolved across a versioned migration history.

== System Overview <sec:system-overview>

Before the detail of later chapters, this section gives the whole shape of the
system in one page.

Three kinds of user meet on the platform. A *founder* submits and manages a
venture. An *investor* discovers ventures, commits capital and tracks the
result. An *administrator* reviews submissions, handles reports and oversees
platform activity. A single account may act as founder and investor; the
administrative role is separate and granted, not self-selected.

#figure(
  image("/assets/diagrams/out/c4-container.svg", width: 86%),
  caption: [System context: the platform's internal containers and the external
    services it depends on.],
)

The browser talks to a Next.js application, which renders the interface and
calls a REST API over HTTPS. The same browser holds a persistent WebSocket to a
SignalR hub for messaging and presence. The API is the only writer to the
relational store; the hub reads and writes the messaging tables through the same
data context. Two external dependencies sit outside the boundary: a payment
provider, reached through an interface that hides which provider is configured,
and an SMTP relay used for verification, password reset and one-time password
delivery.

A venture moves through the platform along a fixed path — submitted, reviewed,
published, funded, reported on — and the system's correctness properties are
mostly properties of that path. @ch:features2 follows it end to end.

== Document Structure

The document is in five parts.

/ Part I — Foundation: establishes why the project exists (this chapter), what
  already exists in the field and where Vestora differs (@ch:related), and how
  the work was organised and managed (@ch:method).

/ Part II — Analysis and Design: derives the requirements (@ch:requirements),
  justifies each technology choice against alternatives (@ch:tech), presents the
  architecture and the decisions behind it (@ch:architecture), specifies the
  data model (@ch:database), and documents the interface system (@ch:design).

/ Part III — Implementation: covers the API surface (@ch:api), the security
  model (@ch:security), the payment subsystem (@ch:payments), real-time
  communication (@ch:realtime), and a walkthrough of the platform's features as
  user journeys (@ch:features1, @ch:features2).

/ Part IV — Quality and Delivery: reports verification (@ch:testing), deployment
  and operations (@ch:deployment), and performance (@ch:performance).

/ Part V — Closure: records the problems that cost the most time
  (@ch:challenges), assesses the result against the objectives above
  (@ch:evaluation), and sets out what comes next (@ch:conclusion).

Reference material — the full endpoint listing, the schema, the traceability
matrix and the test catalogue — is held in the appendices so that the chapters
remain readable.
