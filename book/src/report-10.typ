#import "/lib/report.typ": *
#import "/lib/theme.typ": *

#report-cover(
  number: 10,
  title: "The Deal Room",
  subtitle: "One venture, one conversation, and the documents that decide it",
  date: "September 2026",
)

#show: report.with(number: 10, name: "The Deal Room")

= Introduction

Report 9 built a general conversation between two people. This report scopes one
to a single venture and puts beside it the two things that conversation is
actually about: *the documents under discussion, and the commitment being
considered.*

A diligence conversation refers to three things at once. Conducted across three
tabs, it degrades into "which file did you mean?" — and the answer arrives a day
later. The deal room exists to remove that gap, and everything in this report is
either the room itself or the access control that makes it safe to put a
restricted document inside it.

That access control is the substance here. A founder attaching a financial model
to a conversation is exposing something they would not publish, on the strength
of a promise the platform makes about who can read it. This report is mostly
about keeping that promise.

= Objective

*Put the three objects in one place.* The thread, the documents, and the
commitment under discussion — visible together, without navigation between them.

*Control documents at download, not by obscurity.* A restricted document must be
refused to anyone not entitled to it, every time, regardless of how they reached
the link.

*Separate permission from use.* A grant and a download are different events. The
platform records both, because "I gave them access" and "they read it" are
different facts and a founder may need either.

*Scope the room to its parties.* A deal room concerns two people. Anyone else —
including any other authenticated user — is refused.

= Features Delivered

#figure(
  table(
    columns: (42mm, 1fr),
    align: (left + top, left + top),
    table.header([Feature], [What it does]),
    [Deal room], [Conversation, documents and the commitment under discussion in
      one surface.],
    [Party scoping], [The room is visible to its two participants and to nobody
      else.],
    [Open documents], [Readable by anyone who can see the venture.],
    [Restricted documents], [Require a request the founder grants or refuses.],
    [Document requests], [An investor asks; the founder decides; both sides see
      the state.],
    [Entitlement at download], [Access is re-evaluated on every download call.],
    [Download logging], [Every access to a granted document is recorded,
      separately from the grant.],
    [Relationship notes], [A private note each side keeps against the
      relationship.],
  ),
  caption: [Features delivered in this part of the system.],
)

= The Diligence Path

#full-page-figure(
  "/assets/diagrams/out/flow-dealroom.svg",
  caption: [The diligence path. Open documents are readable by anyone who can see
    the venture; restricted ones require a request the founder grants or refuses.
    Every download re-checks entitlement and is logged.],
)

== Documents are controlled at download, not by obscurity

A founder attaches documents with a visibility rule. Open documents are available
to anyone who can see the venture. Restricted documents require a request.

The important property: *entitlement is re-checked every time a file is
downloaded.* A URL that is hard to guess is not an access control — it is a
secret that spreads on the first forward. The check happens at the download
endpoint, on every call, regardless of how the caller arrived at it.

Two consequences follow, and both are the point rather than side effects. *A
revoked grant takes effect immediately*, because there is no previously issued
link that carries its own authority. And *a forwarded link gives the recipient
nothing*, because the link is an address rather than a credential.

== A grant and a download are separate events

#figure(
  table(
    columns: (30mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Step], [What is recorded], [Answers]),
    [Request], [Who asked, for which document, and when.],
      [Was this ever asked for?],
    [Decision], [Granted or refused, by the founder, with a timestamp.],
      [Did I agree to this?],
    [Download], [Each access to a granted document, separately from the grant.],
      [Did they actually read it?],
  ),
  caption: [The document trail. Three events because they answer three different
    questions, and a single "shared" flag would answer none of them.],
)

Download logging is not surveillance, and the distinction is worth stating
plainly. It serves two purposes: a founder can see that a document was actually
read rather than merely requested — which is diligence signal — and if material
later leaves the platform, the record of who had access exists. Neither purpose
requires knowing anything beyond who, what and when, and nothing beyond that is
recorded.

= Interface

The deal room is scoped to its two parties, and the clearest way to evidence that
is to request one as somebody who is not a party to it.

#shots(
  "/assets/screenshots/dealroom-nonparty-en-light.png",
  "/assets/screenshots/dealroom-nonparty-ar-dark.png",
  [A deal room requested by an authenticated account that is not a participant.
   The refusal states both possibilities without disclosing which applies — the
   relationship may have been withdrawn, *or* the caller may simply not be a
   party. Answering precisely would turn the route into an oracle for which deals
   exist, which is the same reasoning that shaped registration in Report 3.],
)

== The room itself, from both sides

#shots(
  "/assets/screenshots/dealroom-investor-en-light.png",
  "/assets/screenshots/dealroom-investor-ar-dark.png",
  [The room as the *investor* sees it. The commitment under discussion, the
   round's position, the founder's stated contact route, and the two actions
   available to this party: ask a question, or request a document.],
)

#shots(
  "/assets/screenshots/dealroom-founder-en-light.png",
  "/assets/screenshots/dealroom-founder-ar-dark.png",
  [The same room, the same relationship, as the *founder* sees it. The header,
   the figures and the history are identical. The actions are not: the founder
   can move the relationship along the pipeline and *request the agreed funds* —
   the step that turns an accepted commitment into something payable.],
)

#delivered[
  *The asymmetry is the point.* Both parties read the same room and the same
  numbers; only the founder can ask for money, and only the investor can pay it.
  A single shared surface with per-party actions is what keeps the two sides
  looking at one agreement rather than at two accounts of it.
]

#note[
  These captures required creating a real relationship: a venture, its approval,
  a commitment, the founder's acceptance, and a funding request — the same
  journey Report 8 describes. A deal room cannot be photographed empty, because
  an empty one does not exist: *the room is created by the relationship, not
  offered ahead of it.*
]

The conversation half of the room is the same mechanism captured in Report 9 —
same hub, same persistence order, same server-decided read state. The deal room
adds no second messaging path; it places the existing one next to the documents
and the commitment.

= Data

#figure(
  table(
    columns: (40mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Table], [Holds], [Delete behaviour]),
    [`ProjectDocuments`], [The file, its visibility rule and its owner.],
      [Cascade from the venture — a document without its venture means nothing.],
    [`DocumentRequests`], [Who asked, for what, and the founder's decision.],
      [Restrict — a decision is a record of something that happened.],
    [`DocumentDownloads`], [One row per access to a granted document.],
      [Restrict — the access log outlives the grant it records.],
  ),
  caption: [Document tables. The same rule that decided the audit log in Report 5
    and comments in Report 6 decides the last two rows.],
)

The split is now familiar enough to state as a rule the whole series obeys:
*content that is owned cascades; a record of something that happened does not.* A
document belongs to its venture. A download is an event that occurred, and it
remains true after the document is gone.

= Backend

#figure(
  ```cs
  // Entitlement is evaluated here, on every call, regardless of how the caller
  // reached this URL. A link that is hard to guess is a secret, not a control —
  // and a secret that is forwarded once is public.
  var doc = await _db.ProjectDocuments.FindAsync(new object[] { id }, ct);
  if (doc is null) return ServiceResult.NotFound();

  if (doc.Visibility == DocumentVisibility.Restricted &&
      !await _deals.HasGrantAsync(callerId, doc.Id, ct))
      return ServiceResult.Forbidden();

  // The grant permitted access; this row records that access was used.
  await _deals.RecordDownloadAsync(callerId, doc.Id, ct);
  ```,
  caption: [Document download. Three steps, and the order matters: existence,
    then entitlement, then the log — so a refused caller never appears in the
    access record.],
)

#figure(
  ```cs
  // A deal room concerns exactly two people. Membership is the authorisation,
  // and a role check would not express it: an Investor who is not this
  // investor, and a founder who does not own this venture, are both refused.
  if (relationship.InvestorId != callerId && relationship.Project.OwnerId != callerId)
      return ServiceResult.NotFound();
  ```,
  caption: [Deal room access. The refusal is `NotFound` rather than `Forbidden`
    on purpose — a caller who is not a party learns nothing about whether the
    relationship exists.],
)

The second excerpt is the third appearance in this series of the same rule, and
by now it should read as a pattern rather than a precaution. *A role check is not
an ownership check.* Report 4 applied it to ventures, Report 7 to commitments,
and here it is applied to a conversation.

= Key Endpoints

#figure(
  table(
    columns: (16mm, 60mm, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Method], [Path], [Purpose]),
    [`GET`], [`api/deals/{projectId}`], [The deal room for a venture.],
    [`POST`], [`api/deals/{projectId}/documents/{docId}/request`], [Request a
      restricted document.],
    [`POST`], [`api/deals/requests/{id}/grant`], [Founder grants access.],
    [`GET`], [`api/deals/documents/{id}/download`], [Download; entitlement
      re-checked and logged.],
    [`PUT`], [`api/investor/investments/{id}/founder-note`], [The founder's
      private note on the relationship.],
    [`PUT`], [`api/investor/investments/{id}/investor-note`], [The investor's
      private note on the same relationship.],
  ),
  caption: [Principal endpoints in this part. The last two are separate routes
    rather than one shared note, because each side's note is private to that
    side.],
)

= Libraries Used in This Part

#figure(
  table(
    columns: (46mm, 1fr),
    align: (left + top, left + top),
    table.header([Library], [Role here]),
    [`Entity Framework Core`], [Carries the request, grant and download trail, and
      the restrictive references that keep it intact.],
    [`Microsoft.AspNetCore.SignalR`], [Reused from Report 9 for the conversation
      inside the room. No second real-time mechanism is introduced.],
  ),
  caption: [No library is introduced for the deal room itself. It is composition
    of two parts that already existed.],
)

= Challenges

#challenge("A hard-to-guess document link is not an access control")[
  The convenient way to release a restricted file is to hand out a URL that is
  difficult to guess. It is also wrong: the URL is a secret, and a secret that is
  forwarded once is public.

  *Solution.* Entitlement is evaluated at the download endpoint on every call,
  independently of how the caller reached it. A revoked grant takes effect
  immediately, and a forwarded link gives the recipient nothing.
]

#challenge("Refusing precisely tells the caller what exists")[
  A deal room that answers "forbidden" to a non-party has confirmed that the
  relationship exists. Repeated across a range of identifiers, that is an
  enumeration of who is talking to whom — which is commercially sensitive on a
  funding platform.

  *Solution.* A caller who is not a party receives the same answer as a caller
  asking about a relationship that never existed. The interface says the
  relationship may have been withdrawn *or* that the caller is not a party, and
  does not resolve which.
]

#challenge("A grant and a download were nearly the same record")[
  The economical schema marks a document as shared with a user and stops there.
  It cannot answer whether the document was ever opened, which is exactly what a
  founder wants to know after granting access to a financial model.

  *Solution.* Permission and use are separate tables. The grant is a decision;
  each download is an event. The cost is a row per access rather than per grant,
  and that cost buys the only question worth asking afterwards.
]

= How This Fits With the Rest of the System

Only the direct relationships are listed.

#figure(
  table(
    columns: (32mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Report], [Relationship], [Boundary]),
    [4 · Ventures & Lifecycle],
      [*Depends on it.* Documents are attached to a venture there, with the
       visibility rule this report enforces.],
      [This report never changes a document's visibility; it evaluates it.],
    [7 · Commitment & Pipeline],
      [*Depends on it.* The commitment under discussion is the relationship
       defined there, and the room is scoped to its two parties.],
      [The room displays the relationship's state; it does not advance it.],
    [9 · Messaging & Notifications],
      [*Extends it.* The conversation inside the room is that report's mechanism,
       unchanged.],
      [No second messaging path, no second connection, no second read-state
       rule.],
    [12 · Administration & Evaluation],
      [*Audited by it.* The download trail is one of the records an administrator
       can read.],
      [Administrative access to the trail is itself recorded.],
  ),
  caption: [Direct relationships only. This report introduces no new mechanism —
    it composes three that already existed.],
)

= Summary

#delivered[
  A venture-scoped room holding the conversation, the documents and the
  commitment together, visible to its two parties and refused to everyone else
  with an answer that does not disclose whether the relationship exists.
  Documents carrying an open or restricted visibility rule, with restricted files
  released through a request the founder grants or refuses. Entitlement
  re-evaluated at the download endpoint on every call rather than delegated to an
  unguessable link, so a revoked grant takes effect at once. A three-event trail —
  request, decision, download — because permission and use are different facts.
  Private per-side notes on the relationship.
]

*Still open in this part.* Documents are limited to the permitted content types
from Report 4; there is no viewer, so a granted document is downloaded rather
than read in place. A grant is not time-boxed — it stands until revoked. And the
download log records that a file was fetched, which is not the same as knowing it
was read; the platform does not claim otherwise anywhere in the interface.

*What this enables.* Report 11 aggregates everything the last seven reports
produced — ventures, commitments, payments, conversations — into the three
dashboards that answer three different people's questions.
