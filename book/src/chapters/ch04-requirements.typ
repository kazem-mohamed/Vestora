#import "/lib/vestora.typ": *
#import "/lib/theme.typ": *

= Requirements Engineering <ch:requirements>

== Elicitation Approach

Requirements came from three sources, weighted differently because they are
differently reliable.

/ Domain analysis: The comparative study in @ch:related established what
  existing platforms do and — more usefully — what they omit. The gaps in §2.4
  are the origin of most functional requirements in this chapter.

/ Structured interviews: Conversations with people on both sides of the
  problem: individuals who had attempted to raise early-stage capital, and
  individuals who had considered placing money into small ventures. These
  produced the requirements around *evidence* — documents, milestones, progress
  — which no amount of competitor analysis would have surfaced, because the
  competitors do not have them.

/ Supervisory review: Requirements were reviewed against the questions a
  domain expert asks: what happens when a payment fails, who is allowed to do
  this, what happens if two people do it at once. Several non-functional
  requirements exist because of a question of that shape.

Requirements are identified as `FR-nn` and `NFR-nn`, and the identifiers are
stable — a requirement that is dropped leaves its number retired rather than
reused, so a reference in an older document never silently means something
else.

== User Personas

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
    [A queue rather than a firehose; the ability to act decisively; a record
     of what was done and by whom.],
  ),
  caption: [The three personas the requirements serve.],
)

== Functional Requirements

The full catalogue is in @app:traceability. This section presents the
requirements grouped by area, with priority expressed as MoSCoW.

=== Identity and Access

#figure(
  table(
    columns: (16mm, 1fr, 14mm, 22mm),
    align: (left + top, left + top, center + top, left + top),
    table.header([ID], [Requirement], [Pri.], [Realised in]),
    [FR-01], [A visitor shall register with an email address and password.], [M], [§10.3],
    [FR-02], [The system shall refuse sign-in until the address is verified.], [M], [§10.3],
    [FR-03], [The system shall lock an account after a configured number of
      consecutive failed sign-in attempts.], [M], [§10.7],
    [FR-04], [A user shall reset a forgotten password through a time-boxed,
      single-use link.], [M], [§10.4],
    [FR-05], [The system shall issue an access token and a rotating refresh
      token on successful sign-in.], [M], [§10.5, §10.6],
    [FR-06], [A user shall maintain a public profile.], [M], [§13.2],
    [FR-07], [An administrator shall suspend and reinstate an account.], [M], [§10.10],
  ),
  caption: [Identity and access requirements.],
)

=== Projects and Ventures

#figure(
  table(
    columns: (16mm, 1fr, 14mm, 22mm),
    align: (left + top, left + top, center + top, left + top),
    table.header([ID], [Requirement], [Pri.], [Realised in]),
    [FR-08], [A founder shall create a venture with a title, description,
      funding target and imagery.], [M], [§14.2],
    [FR-09], [A venture shall not be publicly visible until an administrator
      approves it.], [M], [§14.2, §14.5],
    [FR-10], [An administrator shall reject a venture with a stated reason.], [M], [§14.5],
    [FR-11], [A founder shall attach documents with open or restricted
      visibility.], [S], [§14.4],
    [FR-12], [A founder shall define milestones and publish progress updates.], [S], [§14.3],
    [FR-13], [A founder shall list team members on a venture.], [S], [§14.2],
    [FR-14], [A venture's moderation status, lifecycle status and commercial
      stage shall be independently maintained.], [M], [§7.6, §14.2],
  ),
  caption: [Venture management requirements.],
)

=== Discovery and Engagement

#figure(
  table(
    columns: (16mm, 1fr, 14mm, 22mm),
    align: (left + top, left + top, center + top, left + top),
    table.header([ID], [Requirement], [Pri.], [Realised in]),
    [FR-15], [A visitor shall browse approved, active ventures without an
      account.], [M], [§13.3],
    [FR-16], [A user shall search and filter ventures by attribute.], [M], [§13.3],
    [FR-17], [A user shall save a filter combination as a named search.], [S], [§13.3],
    [FR-18], [A user shall bookmark a venture, at most once.], [M], [§13.4],
    [FR-19], [A user shall follow another user and receive their updates.], [S], [§13.5],
    [FR-20], [A user shall comment on a venture and reply to comments.], [S], [§13.6],
    [FR-21], [An investor shall review a venture at most once.], [S], [§13.6],
    [FR-22], [A user shall report a venture for administrative attention.], [M], [§13.6],
  ),
  caption: [Discovery and engagement requirements.],
)

=== Investment and Funding

#figure(
  table(
    columns: (16mm, 1fr, 14mm, 22mm),
    align: (left + top, left + top, center + top, left + top),
    table.header([ID], [Requirement], [Pri.], [Realised in]),
    [FR-23], [An investor shall commit an amount to an approved venture.], [M], [§14.1],
    [FR-24], [A founder or administrator shall approve or decline a
      commitment.], [M], [§14.1],
    [FR-25], [An approved commitment shall be settled through a payment
      provider.], [M], [§11.3],
    [FR-26], [The system shall record settlement only on verified provider
      confirmation.], [M], [§11.4],
    [FR-27], [The system shall process a duplicate provider callback exactly
      once.], [M], [§11.5],
    [FR-28], [Funding totals shall be derived from settled transactions
      only.], [M], [§7.6, §11.7],
    [FR-29], [An unresolved checkout shall expire after a configured
      interval.], [M], [§11.8],
    [FR-30], [A founder shall not invest in their own venture.], [M], [§10.9],
    [FR-31], [An investor shall view their pipeline, settlements and
      portfolio.], [M], [§14.6],
  ),
  caption: [Investment and funding requirements.],
)

=== Communication

#figure(
  table(
    columns: (16mm, 1fr, 14mm, 22mm),
    align: (left + top, left + top, center + top, left + top),
    table.header([ID], [Requirement], [Pri.], [Realised in]),
    [FR-32], [Participants shall exchange direct messages.], [M], [§12.4],
    [FR-33], [The system shall show presence and typing indication.], [S], [§12.2, §12.3],
    [FR-34], [The system shall show read state to the sender.], [S], [§12.3],
    [FR-35], [A participant shall attach an image to a message.], [C], [§12.5],
    [FR-36], [The system shall notify users of relevant domain events.], [M], [§13.7],
    [FR-37], [An investor shall request a restricted document; the founder
      shall grant or refuse.], [S], [§14.4],
  ),
  caption: [Communication requirements.],
)

=== Administration and Moderation

#figure(
  table(
    columns: (16mm, 1fr, 14mm, 22mm),
    align: (left + top, left + top, center + top, left + top),
    table.header([ID], [Requirement], [Pri.], [Realised in]),
    [FR-38], [An administrator shall work a queue of ventures awaiting
      review.], [M], [§14.5],
    [FR-39], [An administrator shall work a queue of user reports.], [M], [§14.5],
    [FR-40], [Every administrative action shall be recorded against the acting
      administrator.], [M], [§10.13, §14.5],
    [FR-41], [An administrator shall view platform activity, security events
      and fee revenue.], [S], [§14.5, §14.7],
    [FR-42], [A founder shall view engagement analytics for their ventures.], [S], [§14.7],
  ),
  caption: [Administration and moderation requirements.],
)

== Non-Functional Requirements

Non-functional requirements are stated with a number wherever a number is
meaningful. "The system shall be fast" is not a requirement; it is a wish.

#figure(
  table(
    columns: (17mm, 1fr, 30mm),
    align: (left + top, left + top, left + top),
    table.header([ID], [Requirement], [Assessed in]),
    [NFR-01], [Public venture pages shall be server-rendered so that primary
      content is present in the first response.], [§17.2],
    [NFR-02], [The venture listing shall return within 300 ms at the 95th
      percentile under expected load.], [§17.3],
    [NFR-03], [No collection endpoint shall return an unbounded result set.], [§9.7],
    [NFR-04], [Passwords shall be stored only as salted hashes.], [§10.2],
    [NFR-05], [Refresh tokens shall be stored only as hashes and rotated on
      use.], [§10.6],
    [NFR-06], [All timestamps shall be stored and transmitted in UTC.], [§6.7],
    [NFR-07], [Monetary values shall use exact decimal representation.], [§7.3],
    [NFR-08], [Every state-changing endpoint shall enforce authorisation
      server-side.], [§10.8],
    [NFR-09], [Error responses shall disclose no internal detail.], [§6.7],
    [NFR-10], [The application shall refuse to start when a required secret is
      absent.], [§16.6],
    [NFR-11], [Uploads shall be limited by size and restricted to an
      allow-list of verified content types.], [§10.12],
    [NFR-12], [Security-relevant events shall be persisted to queryable
      storage, not only to logs.], [§10.13],
    [NFR-13], [The interface shall meet WCAG 2.1 AA.], [§8.7],
    [NFR-14], [The interface shall be usable from 360 px to 1920 px wide.], [§8.6],
    [NFR-15], [Schema changes shall be applied only through versioned
      migrations.], [§7.7],
    [NFR-16], [Notification delivery shall not block the request that
      generated it.], [§12.6],
  ),
  caption: [Non-functional requirements, each with a section that assesses it.],
)

== Use Case Model

#full-page-figure(
  "/assets/diagrams/out/use-case.svg",
  caption: [Use case model. Fourteen cases across three human actors and one
    external one. `UC-05 Commit capital` and `UC-07 Settle a commitment` are
    deliberately separate cases, not two steps of one — which is the same
    distinction §14.1 draws in the state model.],
)

The actors are the three personas of §4.2 plus the payment provider, which is a
non-human actor that initiates the settlement callback. Modelling it explicitly
matters: the callback is an inbound interaction the platform does not control
the timing of, and treating it as an actor rather than as an internal step is
what surfaces the requirements FR-26 and FR-27.

#full-page-figure(
  "/assets/diagrams/out/dfd-level1.svg",
  caption: [Level-1 data flow. Six processes, five stores, three external
    actors. The funding chain is a single store because §11.1 treats its four
    tables as one transactional unit.],
)

The use case diagram and its full specifications are held in @app:traceability
with the requirement catalogue, so that a reader checking a requirement finds
its use case beside it rather than in a different chapter.

== Use Case Specifications

Two specifications are given here because their alternate flows are where the
system's difficulty lives. The remainder are in @app:traceability.

#plate(label: "UC-07 — Settle an approved commitment")[
  *Actors.* Investor (primary), payment provider (secondary).

  *Preconditions.* The commitment exists and is approved; the venture is
  approved and active; no settled transaction exists for this commitment.

  *Main flow.*
  1. The investor opens checkout.
  2. The system validates the preconditions and creates a funding request with
     an expiry.
  3. The system requests a checkout session from the configured provider.
  4. The investor completes payment on the provider's surface.
  5. The provider posts a callback.
  6. The system verifies the signature, records the event, and marks the
     transaction settled.
  7. Funding totals recompute (§11.7).

  *Alternate flows.*
  - *3a.* The provider is unavailable — the funding request is abandoned and
    the commitment remains approved.
  - *5a.* No callback arrives before expiry — the sweeper lapses the request
    (§11.8).
  - *6a.* Signature verification fails — the payload is rejected and logged; no
    state changes.
  - *6b.* The event has already been recorded — the callback is acknowledged
    and no state changes (FR-27).

  *Postcondition.* Either exactly one settled transaction exists for the
  commitment, or none does.
]

#plate(label: "UC-03 — Review a submitted venture")[
  *Actor.* Administrator.

  *Preconditions.* The venture's moderation status is pending.

  *Main flow.*
  1. The administrator opens the review queue and selects a venture.
  2. The administrator approves it.
  3. Moderation status becomes approved; lifecycle status and commercial stage
     are unchanged.
  4. The action is written to the audit log against the administrator.
  5. The venture becomes publicly visible if its lifecycle status is active.

  *Alternate flows.*
  - *2a.* The administrator rejects with a reason; the founder is notified and
    may resubmit.
  - *3a.* A resubmission returns moderation status to pending *without*
    affecting commercial stage (FR-14) — the defect this separation exists to
    prevent is described in §14.2.

  *Postcondition.* The venture's moderation status is approved or rejected, and
  the decision is attributable.
]

== Requirements Traceability

Every requirement in this chapter carries a "realised in" column, and every one
appears again in the traceability matrix in @app:traceability, mapped forward to
its design section, its implementation and its test case.

The purpose is checkability. A requirement with no design section is
unimplemented; one with no test is unverified. The matrix makes both visible
rather than requiring a reader to take the claim on trust — and §19.2 reports
what it shows, including where it shows a gap.
