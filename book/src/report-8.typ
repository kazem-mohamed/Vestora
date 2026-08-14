#import "/lib/report.typ": *
#import "/lib/theme.typ": *

#report-cover(
  number: 8,
  title: "The Deal Room",
  subtitle: "One relationship, one page — and a health score nobody has to keep current",
  date: "September 2026",
)

#show: report.with(number: 8, name: "The Deal Room")

= Introduction

Report 7 built a general-purpose conversation between two people. This report is
about the surface that turns a conversation into a *relationship with a record*.

A deal room exists for exactly one investor backing exactly one venture. It holds
the terms the two sides drafted, the money asked for and paid, the questions
asked and answered, the documents requested and supplied, the conversation
itself, and a timeline of everything that happened — on one page, in the order a
person would want them.

It also holds two things that do not exist anywhere else in the platform: a
*derived health assessment* of whether the relationship is moving, and a *private
note* each side keeps that the other can never read.

The room is not a feature bolted beside the messaging of Report 7. It is where
the platform stops being a directory and becomes a place two people do business.

= Objective

*Put one relationship on one page.* Everything about this investor and this
venture, in one place, so neither side has to reconstruct the state of the deal
from an inbox.

*Answer "whose move is it?" without asking anyone to maintain a task list.* A
relationship stalls when neither party knows who owes what. The room derives that
answer from state it already holds.

*Make silence visible.* A deal that has quietly ended looks exactly like a deal
that is waiting — until something measures the gap.

*Claim nothing the platform cannot enforce.* The terms panel is a written record
of what two people said they agreed. It is not a contract, and it says so on the
page.

= Features Delivered

#figure(
  table(
    columns: (40mm, 1fr),
    align: (left + top, left + top),
    table.header([Feature], [What it does]),
    [The room], [One page per relationship, admitting exactly two people.],
    [Room list], [Every relationship a user is party to, filterable to active
      ones.],
    [Terms], [Either side drafts terms; the other accepts or declines with a
      reason.],
    [Funding panel], [The request, the settlement, the reference — and, for the
      founder, the fee breakdown.],
    [Questions], [Asked on the record, answered, followed up, or withdrawn.],
    [Document requests], [Requested, supplied by upload, withdrawn, and
      downloaded through an authorised route.],
    [Conversation], [The messaging of Report 7, placed beside the deal rather
      than duplicated.],
    [Timeline], [Every event in the relationship's life, in one ordered list.],
    [Stage durations], [How long the relationship spent at each stage.],
    [Deal health], [A derived score, with named reasons, for whether it is
      moving.],
    [Next steps], [What *this viewer* owes, derived from real state.],
    [Private note], [Each side's own working note. Never the other's.],
  ),
  caption: [Features delivered in this part.],
)

= The Diligence Path

#full-page-figure(
  "/assets/diagrams/out/flow-dealroom.svg",
  caption: [The diligence path. A request is made, granted or refused, and every
    later download is its own event — which is what allows a founder to see that
    a document was actually read rather than merely asked for.],
)

== Documents are controlled at download, not by obscurity

A granted document is not published to a URL that anyone holding the link can
fetch. Every download passes back through the API, which re-checks that the
caller is a party to this relationship and that the request was granted.

The distinction matters because the alternative is common and quietly wrong. A
signed or unguessable URL is *access control by secret*: once the link leaks, the
control is gone and nothing records that it left. Re-checking on each download
means the answer can change — a withdrawn request stops working immediately.

== A grant and a download are separate events

Granting access and using it are recorded separately. That is what makes the
difference between *"they asked for the financials"* and *"they read the
financials twice, the second time after our call"* — and only the second is
diligence signal.

Download logging is not surveillance, and the distinction is worth stating
plainly. It serves two purposes: a founder can see that a document was actually
read, and if material later leaves the platform, the record of who had access
exists. Neither purpose requires knowing anything beyond who, what and when, and
nothing beyond that is recorded.

= Terms, and What They Are Not

Either side may draft terms. The other side's acceptance is what decides
anything, and a decline carries a reason.

#delivered[
  The panel states its own limit, on the page, in the product: *"A written record
  of what both sides accepted. Vestora holds no signatures and enforces nothing —
  this is not a contract."*

  That sentence is the difference between a platform that records an agreement
  and one that pretends to be a party to it. Report 1 excluded legal execution
  from scope; this is where that exclusion is visible to the person it affects,
  rather than buried in a document they will not read.
]

Administrators are refused outright on all three term-sheet routes. An
administrator can read a room for moderation, and cannot propose, accept or
decline anything in it — because terms are between two parties and an
administrator is not one of them.

= Deal Health

This is the most interesting mechanism in the report, and its design decisions
are worth reading in the order they were made.

*Every input is a fact the room already had.* Nothing is maintained by hand,
which is the only reason the answer can be trusted — a health field somebody has
to keep current is a health field that is permanently green.

*The score starts at full marks and is spent down.* A relationship is healthy
until something specific is wrong with it, and every deduction can be named. The
opposite model — accumulating points for activity — would penalise a deal that is
simply waiting for a scheduled call.

#figure(
  table(
    columns: (1fr, 18mm, 1fr),
    align: (left + top, center + top, left + top),
    table.header([Deduction], [Cost], [Why it is weighted this way]),
    [Silent three weeks], [−45],
      [The shape of a deal that has ended without either side saying so.],
    [Silent two weeks], [−30], [The same signal, earlier.],
    [Silent one week], [−15], [Noticeable, not yet alarming.],
    [Payment outstanding], [−20],
      [The heaviest single deduction, because it is the only obligation with a
       deadline attached.],
    [Unanswered questions], [−15],
      [Counted once however many there are: the fact that something is owed is
       the signal, not the quantity.],
    [Open document requests], [−15], [The same reasoning, for the other kind of
      obligation.],
    [Approved, never contacted], [−15],
      [The single most common stall, and the one the pipeline exists to catch.],
    [Terms awaiting acceptance], [−10], [Something on the table nobody answered.],
  ),
  caption: [The health deductions. A concluded relationship — closed or declined —
    scores 100 and is labelled *Concluded* rather than being marked down for
    silence it is entitled to.],
)

#figure(
  table(
    columns: (26mm, 22mm, 1fr),
    align: (left, center, left),
    table.header([Status], [Score], [Means]),
    [Healthy], [75–100], [Nothing specific is wrong.],
    [Slowing], [45–74], [One or two named obligations are outstanding.],
    [Stalled], [0–44], [Silence, or several obligations, or both.],
  ),
  caption: [The three bands. The label is derived from the score, and the score
    from the reasons — so a stalled deal can always be explained.],
)

== Next steps are derived, not assigned

The room tells *this viewer* what they owe, computed from the same state.

#figure(
  ```cs
  // Money owed comes before everything else. An investor with an open ask has
  // one job, and burying it under "answer a question" would be a strange thing
  // for a funding platform to do.
  if (dto.CanCompletePayment)          steps.Add("complete_payment");
  if (isFounder && dto.Status == "Pending") steps.Add("review_request");
  if (questions.Any(q => q.CanAnswer)) steps.Add("answer_questions");
  if (isFounder && requests.Any(r => r.Status == "Open")) steps.Add("supply_documents");
  if (dto.UnreadMessages > 0)          steps.Add("read_messages");

  // Approved but never contacted is the single most common stall, and the
  // one the pipeline was built to prevent.
  if (isFounder && dto.Stage == PipelineStages.Approved) steps.Add("make_contact");
  ```,
  caption: [`DeriveNextSteps`. The order of the list is the order of priority,
    and the comments are the argument for it.],
)

Two of these steps exist because of stalls this platform *introduced*. A founder
who accepted a backer and never contacted them is the oldest failure in the
model. A deal talked through but never asked for is the newer one, created by
separating the request for money from the acceptance of the commitment — and it
gets the same treatment rather than being left as the cost of the design.

= Interface

The room is scoped to its two parties, and the clearest way to evidence that is
to request one as somebody who is not a party to it.

#shots(
  "/assets/screenshots/dealroom-nonparty-en-light.png",
  "/assets/screenshots/dealroom-nonparty-ar-dark.png",
  [A deal room requested by an authenticated account that is not a participant.
   The refusal states both possibilities without disclosing which applies — the
   relationship may have been withdrawn, *or* the caller may simply not be a
   party. Answering precisely would turn the route into an oracle for which deals
   exist, which is the same reasoning that shaped registration in Report 3.],
)

== The room, whole

#shot(
  "/assets/screenshots/dealroom-investor-en-light.png",
  [The room as the *investor* sees it, at full height. Reading down the left:
   the relationship and its stage, the terms panel with its disclaimer, the
   funding panel showing the settled payment and its reference, the questions
   box, the documents section, and the conversation. On the right: the timeline
   of what happened, and the private note. One relationship, one page.],
)

#shot(
  "/assets/screenshots/dealroom-founder-en-light.png",
  [The same room, the same relationship, as the *founder* sees it — and the
   funding panel is not the same. The founder is shown the fee breakdown:
   \$40,000 investment, \$2,000 platform fee at 5%, \$38,000 net proceeds. The
   investor is not, because the investor pays \$40,000 either way. *The fee comes
   out of the founder's side, so the founder is the one who is told about it.*],
)

#delivered[
  *The asymmetry is deliberate and it runs both ways.* Both parties read the same
  room, the same timeline and the same figures. Only the founder sees the fee and
  can move the relationship's stage or request funds; only the investor can pay.
  A single shared surface with per-party actions keeps the two sides looking at
  one agreement rather than at two accounts of it.
]

#shots(
  "/assets/screenshots/dealroom-investor-ar-dark.png",
  "/assets/screenshots/dealroom-founder-ar-dark.png",
  [Both sides again in Arabic on the dark token set. The timeline, the currency
   figures and the transaction reference stay left-to-right inside right-to-left
   text; the layout mirrors around them.],
)

#note[
  These captures required a real relationship — a venture, its approval, a
  commitment, the founder's acceptance, a funding request and a settled payment.
  A deal room cannot be photographed empty, because an empty one does not exist:
  *the room is created by the relationship, not offered ahead of it.*
]

= Data

#figure(
  table(
    columns: (36mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Table], [Holds], [Rule]),
    [`DealQuestions`], [Questions, answers, follow-ups and withdrawals.],
      [A withdrawn question is marked, never deleted — the record that it was
       asked survives.],
    [`DocumentRequests`], [What was asked for, its status, and the file supplied.],
      [Status carries the whole lifecycle: open, granted, withdrawn.],
    [`DocumentDownloads`], [One row per download.],
      [Separate from the grant, because reading is a different event from being
       permitted to read.],
    [`TermSheets`], [Proposed terms, their status and who accepted.],
      [Decline carries a reason. A superseded sheet is retained.],
    [`DealNotes`], [Each party's private note.],
      [Scoped to its author. There is no route that returns the other side's.],
  ),
  caption: [Deal room tables. Every one of them keeps history rather than
    overwriting it.],
)

The timeline is *not* a table. It is assembled at read time from the rows above
plus the stage history, the funding request and the payment transactions — which
is the same derive-don't-store rule as Report 11's analytics, applied to a
narrative rather than to a number. An event cannot be missing from the timeline
because nobody remembered to write it there.

= Backend

#figure(
  ```cs
  // Whether the relationship is moving, and what is holding it up.
  // Every input is a fact the room already had. Nothing is maintained by hand,
  // which is the only reason the answer can be trusted — a health field somebody
  // has to keep current is a health field that is permanently green.
  var score = 100;
  var reasons = new List<string>();

  if (idleDays >= 21)      { score -= 45; reasons.Add("silent_3w"); }
  else if (idleDays >= 14) { score -= 30; reasons.Add("silent_2w"); }
  else if (idleDays >= 7)  { score -= 15; reasons.Add("silent_1w"); }

  if (dto.FundingState == FundingMath.StatePaymentDue)
      { score -= 20; reasons.Add("payment_outstanding"); }

  Status = score >= 75 ? "Healthy" : score >= 45 ? "Slowing" : "Stalled",
  ```,
  caption: [`BuildHealth`. The reason strings are returned alongside the score,
    so the interface never has to explain a number it was handed.],
)

#figure(
  ```cs
  // Either side may propose; the other side's acceptance is what decides
  // anything. An administrator may read this room and may not act in it.
  if (RoleIn(deal, Me()) == "admin") return Forbid();

  var result = await _terms.ProposeAsync(deal, Me(), input, ct);
  return this.ToActionResult(result);
  ```,
  caption: [Proposing terms. The refusal of the administrator is three lines
    above the action, on all three term routes.],
)

= Key Endpoints

#figure(
  table(
    columns: (16mm, 58mm, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Method], [Path], [Purpose]),
    [`GET`], [`api/deals`], [Every room the caller is party to.],
    [`GET`], [`api/deals/{investmentId}`], [One room, with health, timeline and
      next steps.],
    [`POST`], [`api/deals/{id}/questions`], [Ask on the record.],
    [`PUT`], [`api/deals/questions/{id}/answer`], [Answer one.],
    [`POST`], [`api/deals/questions/{id}/withdraw`], [Withdraw; the record
      remains.],
    [`POST`], [`api/deals/{id}/document-requests`], [Request a document.],
    [`PUT`], [`api/deals/document-requests/{id}`], [Grant or refuse it.],
    [`POST`], [`api/deals/document-requests/{id}/upload`], [Supply the file.],
    [`GET`], [`api/deals/document-requests/{id}/file`], [Download — re-checked
      on every call.],
    [`POST`], [`api/deals/{id}/terms`], [Draft terms.],
    [`POST`], [`api/deals/terms/{id}/accept`], [Accept them.],
    [`POST`], [`api/deals/terms/{id}/decline`], [Decline, with a reason.],
    [`PUT`], [`api/deals/{id}/note`], [Save this side's private note.],
  ),
  caption: [The deal room routes. Every one loads the relationship through a
    participant check first — membership of *this* relationship, not a role.],
)

= Libraries Used in This Part

#figure(
  table(
    columns: (44mm, 1fr),
    align: (left + top, left + top),
    table.header([Library], [Role here]),
    [`Entity Framework Core`], [Loads the relationship and everything hanging off
      it, and assembles the timeline in one place.],
    [`SixLabors.ImageSharp`], [Validates supplied documents on their bytes, the
      same control as Report 4.],
    [`TanStack Query`], [Keeps the room's several panels in sync on the client
      without a second source of truth.],
  ),
  caption: [Libraries in this part. No new dependency was introduced for the deal
    room — it is composition of parts the platform already had.],
)

= Challenges

#challenge("A health field somebody maintains is permanently green")[
  The obvious way to show whether a deal is progressing is a status a user sets.
  It is also useless: nobody updates it to say things are going badly, so it
  reports "on track" until the deal is visibly dead.

  *Solution.* Every input is a fact the room already holds — the last activity
  date, open questions, open document requests, an unpaid ask, unanswered terms,
  the current stage. The score is computed on read and cannot be edited. The cost
  is that the model is a judgement encoded in constants, and those constants are
  stated in this report rather than hidden in a service.
]

#challenge("Scoring activity would punish a deal that is simply waiting")[
  A score that accumulates points for messages and events rewards noise and
  penalises two people who agreed to talk again next Tuesday.

  *Solution.* The score starts at 100 and is *spent down* by named problems.
  Silence costs, an unmet obligation costs, an unanswered proposal costs — and a
  quiet week with nothing outstanding costs nothing at all.
]

#challenge("A terms panel invites a claim the platform cannot support")[
  Anything that looks like a contract will be read as one. A platform that
  displays agreed terms is one step from appearing to enforce them, and it
  enforces nothing.

  *Solution.* The disclaimer is on the panel, in the product, in both languages:
  no signatures, no enforcement, not a contract. Report 1 excluded legal
  execution from scope, and this is the one screen where that exclusion has to be
  visible to a user rather than recorded in a document.
]

#challenge("An admin who can read a room could act in it")[
  Moderation requires an administrator to be able to see a relationship. Every
  action in the room is a single click away from that view.

  *Solution.* The participant check resolves a *role in this relationship* —
  founder, investor, or admin — and every acting route refuses `admin` explicitly
  rather than relying on it not being offered in the interface. Reading is
  granted; acting is refused at the endpoint.
]

= How This Fits With the Rest of the System

Only the direct relationships are listed.

#figure(
  table(
    columns: (32mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Report], [Relationship], [Boundary]),
    [7 · Messaging & Notifications],
      [*Composes it.* The conversation panel is that report's mechanism, placed
       beside the deal.],
      [The room adds no second messaging path and no second hub.],
    [9 · Commitment & Pipeline],
      [*Created by it.* The room exists because a commitment does, and the stage
       shown here is that report's column.],
      [The room reads the stage and offers the founder's transition; it invents
       no state of its own.],
    [10 · Payments],
      [*Triggers it.* The founder requests funds here, and the settled payment
       and its reference appear here.],
      [The room displays the transaction; it never computes a funding figure.],
    [12 · Administration & Evaluation],
      [*Constrained by it.* An administrator may read a room for moderation.],
      [Every acting route refuses `admin` at the endpoint, not in the
       interface.],
  ),
  caption: [Direct relationships only.],
)

= Summary

#delivered[
  A room per relationship admitting exactly two people, holding drafted terms
  with an explicit disclaimer, the funding request and its settlement, questions
  asked on the record with answers and withdrawals, document requests supplied by
  upload and downloaded through a route that re-checks on every call, the
  conversation from Report 7, a timeline assembled from state rather than
  maintained, per-stage durations, and a private note each side keeps from the
  other.

  *And two derived judgements.* A health score spent down from 100 by named
  deductions, and a next-step list telling this viewer what they owe — neither of
  which anyone has to keep current, which is the only reason either can be
  believed.
]

*Still open in this part.* Terms are free text agreed between two people; the
platform parses nothing from them and enforces nothing. The health constants are
a judgement rather than a calibrated model — they were chosen, not measured, and
no data exists yet to tune them against. Documents are limited to the permitted
types of Report 4. And nothing in the room notifies on a health decline: a
stalling deal is visible to whoever opens the page, and to nobody else.

*What this enables.* Report 11 aggregates the events recorded here into the
founder's and the administrator's views of the platform — the same rows, read at
a different scale.
