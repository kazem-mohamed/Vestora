#import "/lib/report.typ": *
#import "/lib/theme.typ": *

#report-cover(
  number: 9,
  title: "Messaging & Notifications",
  subtitle: "Where diligence actually happens, and how anyone learns what they missed",
  date: "September 2026",
)

#show: report.with(number: 9, name: "Messaging & Notifications")

= Introduction

Report 8 covered the moment money moves. This report covers the conversation
that happens before it, and the notifications that keep both sides informed
afterwards.

Messaging on this platform is not a chat feature attached to a marketplace. *It
is where diligence happens.* An investor reads a pitch, has three questions, and
the quality of that exchange determines whether a commitment is ever made. That
is why presence, typing indication and read state are treated as requirements
rather than decoration: an investor who cannot tell whether their question has
been seen assumes it has been ignored.

Notifications are the other half of the same problem — telling someone what
happened while they were not looking. They share this report because they share
a connection, and because both are subject to the same rule: *the server decides
what is true, and the client displays it.*

The venture-scoped case — the deal room, where a conversation sits beside the
documents and the commitment it concerns — is Report 10.

= Objective

*Make the exchange feel live.* A message must arrive without a refresh, and a
sender must be able to tell whether it was delivered and whether it was read.

*Never lose a message.* Liveness must not come at the cost of durability. A
message that appeared on screen and then vanished on reconnect is worse than one
that took a second to arrive.

*Report state truthfully.* Presence, typing and read receipts must reflect what
is actually true, decided by the server. A client must not be able to assert that
it read something it did not.

*Keep side effects off the request path.* Publishing a venture update notifies
every follower. That fan-out must not make publishing slow, and a failure in
delivery must not fail the publication.

= Features Delivered

#figure(
  table(
    columns: (42mm, 1fr),
    align: (left + top, left + top),
    table.header([Feature], [What it does]),
    [Direct messaging], [One-to-one conversations between an investor and a
      founder.],
    [Live delivery], [Messages arrive without a refresh, over a persistent
      connection.],
    [Presence], [Whether the other participant is currently connected.],
    [Durable last-seen], [When they were last connected, surviving a restart.],
    [Typing indication], [Transient, never stored.],
    [Read receipts], [Delivered and read shown separately, decided
      server-side.],
    [Image attachments], [Validated by the same upload controls as any other
      image, from Report 4.],
    [Conversation list], [All threads with unread counts and search.],
    [Notifications], [In-app notification of domain events, with unread state.],
    [Background fan-out], [Notification delivery runs off the request path.],
  ),
  caption: [Features delivered in this part. The deal room and its document trail
    are Report 10.],
)

= How It Works

#full-page-figure(
  "/assets/diagrams/out/seq-realtime.svg",
  caption: [A conversation end to end. Presence is derived from the set of a
    user's connections; messages are persisted before they are pushed; read state
    is written by the server when a participant opens the thread.],
)

== A user is not a connection

The subtlety that shapes the whole design: *one person may have three tabs open.*

Presence is a property of the *user*, derived from the set of their live
connections. A user is online when that set is non-empty. Treating a single
disconnect as "the user left" would produce a status that flickers every time a
tab is closed.

#figure(
  table(
    columns: (30mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([State], [Where it lives], [Why there]),
    [Presence], [In memory, keyed by user, holding a set of connection
      identifiers.],
      [It is only true for the lifetime of the process holding those
       connections. Persisting it would create a value that outlives its truth.],
    [Last-seen], [Persisted on the user row.],
      [It must survive a restart — "last seen three hours ago" is precisely the
       information a user needs when the other party is offline.],
  ),
  caption: [Presence and last-seen look like the same fact and have opposite
    lifetimes.],
)

The moment the connection set becomes empty is the moment last-seen is written.
One event, two consequences, and no separate bookkeeping to fall out of step.

== Persist first, push second

Messages are written to the database *before* they are pushed to the recipient.

The ordering is deliberate. A message that was pushed but not stored is lost on
reconnect, and the user who saw it appear has no way to know it is gone.
Persist-then-push gives the property that matters: *the database is the record,
and the push is an optimisation over polling for it.* A client that missed a push
because it was disconnected recovers by loading the conversation, with no special
reconciliation path.

#delivered[
  The achievable guarantee is therefore *at-least-once from the store*, not
  exactly-once over the wire. Claiming stronger would be false, and the recovery
  path is the ordinary read rather than a repair routine.
]

== Transient and durable are different

#figure(
  table(
    columns: (28mm, 1fr),
    align: (left + top, left + top),
    table.header([Signal], [Treatment]),
    [Typing], [Broadcast and forgotten. Never stored. Persisting a typing
      indicator would mean writing to the database on every keystroke to record
      something true for two seconds.],
    [Read state], [A durable property of the message. Written by the server when
      a participant opens the conversation, then pushed to the sender — so both
      parties see the same truth and a client cannot claim to have read what it
      did not.],
  ),
  caption: [Two live signals with opposite storage requirements, travelling over
    the same connection.],
)

= Interface

#shot(
  "/assets/screenshots/conversation-investor-en-light.png",
  [A diligence conversation, seen by the investor. Three mechanisms are visible
   at once: durable last-seen in the header, read state on each outgoing message,
   and the unread divider.],
)

That capture repays a close look at the tick marks. Every outgoing message
carries two, except the last, which carries one. The single tick is the server
saying *stored and delivered*; the double tick is the server saying *the other
participant opened the conversation*. Neither is a client claim, which is the
whole reason the read write happens server-side.

#shots(
  "/assets/screenshots/conversation-founder-en-light.png",
  "/assets/screenshots/conversation-investor-ar-dark.png",
  [The same thread from the founder's side, and from the investor's side in
   Arabic under the dark token set. Bubbles swap alignment with the sender, and
   again with the writing direction — which is two independent mirrorings applied
   to the same element.],
)

#shots(
  "/assets/screenshots/messages-en-light.png",
  "/assets/screenshots/messages-ar-dark.png",
  [The conversation list in both writing directions, with unread counts and
   search. The thread pane opens beside it; on a narrow screen the two become one
   column and the list steps back.],
)

#shots(
  "/assets/screenshots/notifications-en-light.png",
  "/assets/screenshots/notifications-ar-dark.png",
  [Notifications in both directions and both themes. Unread state is live: it
   arrives over the same connection as messages, so a badge does not wait for a
   page load to be right.],
)

= Data

#figure(
  table(
    columns: (38mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Table], [Holds], [Delete behaviour]),
    [`Messages`], [Content, sender, receiver, sent time and read state.],
      [Restrict on both participants — a conversation is a record of something
       that happened.],
    [`MessageAttachments`], [One image attachment per message.],
      [Cascade from the message.],
    [`Notifications`], [Domain-event notifications, referencing the object they
      concern.], [Restrict on the referenced rows.],
    [`Users.LastSeenUtc`], [Durable last-seen, written on final disconnect.],
      [—],
  ),
  caption: [Communication tables. The same principle that governed Reports 5 and
    6 decides the first row: a conversation is a record, so it does not cascade.],
)

*Notifications reference domain objects rather than storing rendered text.* A
notification points at the venture, the commitment or the acting user, and the
reference is resolved at read time. Storing the rendered sentence would freeze it
— a venture renamed after a notification was generated would appear under its old
name forever.

That reference carries a cost, and it is the mirror image of the benefit: the
delete behaviour on those references must be restrictive, because a notification
pointing at a deleted row is a broken notification. The trade is accepted — a
notification that stays accurate, in exchange for references that constrain
deletion.

= Backend

#figure(
  ```cs
  // Presence is per user, not per connection. One person with three tabs is
  // online once; they go offline when the last of those connections drops —
  // which is also the moment durable last-seen is written.
  public void Add(int userId, string connectionId)
      => _connections.AddOrUpdate(userId,
             _ => new HashSet<string> { connectionId },
             (_, set) => { lock (set) { set.Add(connectionId); } return set; });

  public bool Remove(int userId, string connectionId)
  {
      if (!_connections.TryGetValue(userId, out var set)) return true;
      lock (set) { set.Remove(connectionId); }
      return set.Count == 0;          // true => the user is now offline
  }
  ```,
  caption: [`PresenceTracker`. The return value of `Remove` is the whole design:
    it answers "was that the last one?", which is the only question the caller
    needs in order to decide whether to write last-seen.],
)

#figure(
  ```cs
  // Persist first, push second. A message that was pushed but not stored is
  // lost on reconnect, and the user who watched it appear cannot know that.
  _db.Messages.Add(message);
  await _db.SaveChangesAsync(ct);

  await _hub.Clients.User(receiverId.ToString())
            .SendAsync("ReceiveMessage", MessageDto.From(message), ct);
  ```,
  caption: [Sending. The two lines are in this order deliberately, and reversing
    them would be faster and briefly appear to work.],
)

#figure(
  ```cs
  // The domain enqueues and returns; a worker delivers. Publishing a venture
  // update must not be as slow as its slowest notification, and a failure in
  // delivery must not fail the publication that caused it.
  _fanOut.Enqueue(new NotificationJob(projectId, NotificationType.ProjectUpdate));
  return ServiceResult.Ok();
  ```,
  caption: [Notification fan-out. The queue is in-process, which is a boundary
    named in the challenges below rather than assumed away.],
)

= Key Endpoints

#figure(
  table(
    columns: (16mm, 50mm, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Method], [Path], [Purpose]),
    [`GET`], [`api/messages/conversations`], [Threads with unread counts.],
    [`GET`], [`api/messages/{userId}`], [Conversation history, paged.],
    [`POST`], [`api/messages`], [Send a message; persisted then pushed.],
    [`POST`], [`api/messages/{id}/attachment`], [Attach an image, validated on
      content.],
    [`POST`], [`api/messages/{userId}/read`], [Mark a conversation read;
      server-side.],
    [`GET`], [`api/notification`], [The user's notifications.],
    [`GET`], [`api/notification/unread-count`], [Unread badge count.],
    [`POST`], [`api/notification/{id}/read`], [Mark one notification read.],
    [`—`], [`/hubs/chat`], [The persistent connection. Authenticated with the
      same access token as a REST call.],
  ),
  caption: [Principal endpoints in this part. The hub is not a REST route and is
    listed because it is the one surface in the platform that is not.],
)

The hub deserves the last row. It shares the API's authentication pipeline
entirely: *there is no second credential and no second identity mechanism.* The
token that authorises a `GET` authorises a connection, and Report 3's rotation
applies to both.

= Libraries Used in This Part

#figure(
  table(
    columns: (46mm, 1fr),
    align: (left + top, left + top),
    table.header([Library], [Role here]),
    [`Microsoft.AspNetCore.SignalR`], [The persistent connection, transport
      negotiation, reconnection with backoff, and group management. Shares the
      API's authentication pipeline.],
    [`@microsoft/signalr`], [The browser client: connection lifecycle, automatic
      reconnect, and typed handlers for the hub's events.],
    [`Hosted service (built-in)`], [Runs the notification fan-out worker outside
      the request path.],
    [`Entity Framework Core`], [Persists messages, attachments and notifications,
      and writes durable last-seen.],
  ),
  caption: [Libraries introduced in this part.],
)

= Challenges

#challenge("Presence flickered every time a tab was closed")[
  Treating a disconnect as "the user went offline" produced a status that changed
  constantly for anyone with more than one tab open.

  *Solution.* Presence is tracked per *user*, holding a set of connection
  identifiers. A user goes offline only when the set becomes empty — and that is
  also the moment last-seen is written.
]

#challenge("Presence and last-seen look like one fact")[
  Both answer "where is this person". Storing them the same way is wrong in one
  direction or the other: persisting presence creates a value that outlives its
  truth, and keeping last-seen in memory loses it on restart.

  *Solution.* Opposite treatments. Presence in memory, last-seen on the user row.

  *The cost.* Presence does not survive scale-out beyond one instance. With one
  production instance of each container — the deployment stated in Report 2 —
  this is correct today and is the first thing that breaks under a second
  instance. Report 12 says what it would take.
]

#challenge("A pushed message could be lost")[
  Pushing before persisting is faster and briefly appears to work. A client that
  reconnects has no record of the message, and the user who saw it has no way to
  know it is gone.

  *Solution.* Persist first, push second. Recovery needs no special path — a
  reconnecting client simply reloads the conversation.
]

#challenge("Notification fan-out tied a business action to its side effects")[
  A venture update that notified every follower synchronously would make
  publishing as slow as the slowest delivery, and a failure in fan-out would fail
  the publication itself.

  *Solution.* The domain enqueues the work in-process and returns; a background
  worker performs delivery.

  *The cost, stated.* The queue is process-local, so work enqueued and not yet
  delivered is lost on restart. Acceptable for notifications — a missed in-app
  badge is recoverable by opening the page — and the boundary is named rather
  than assumed away. It would not be acceptable for anything in Report 8.
]

= How This Fits With the Rest of the System

Only the direct relationships are listed.

#figure(
  table(
    columns: (32mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Report], [Relationship], [Boundary]),
    [3 · Identity & Sessions],
      [*Depends on it.* A hub connection authenticates with the same access token
       as a REST call.],
      [There is no second credential and no second identity mechanism.],
    [4 · Ventures & Lifecycle],
      [*Triggered by it.* Publishing an update notifies followers.],
      [Delivery leaves the request path, so publishing is never as slow as
       notifying.],
    [7 · Commitment & Pipeline],
      [*Carries its decisions.* A founder accepts a commitment from the
       notification that announced it.],
      [The notification surfaces the decision; the rule that governs it lives in
       Report 7.],
    [10 · The Deal Room],
      [*Extends this report.* The deal room is this conversation, scoped to one
       venture and placed beside its documents.],
      [It adds no second messaging mechanism; it reuses this one.],
  ),
  caption: [Direct relationships only.],
)

= Summary

#delivered[
  One-to-one messaging over a persistent connection that shares the API's
  authentication, with messages persisted before they are pushed so that recovery
  is an ordinary read. Presence tracked per user rather than per connection, and
  durable last-seen written at the moment the last connection drops. Typing
  broadcast and forgotten; read state written by the server and pushed to the
  sender. Image attachments under the same content-based validation as every
  other upload. A conversation list with unread counts and search, and in-app
  notifications that reference domain objects rather than storing rendered text.
  Notification fan-out moved off the request path.
]

*Still open in this part.* Presence is held in memory and therefore does not
survive a second instance. The fan-out queue is process-local, so undelivered
notifications are lost on restart. There is no push delivery outside the browser
— no email digest and no mobile notification — so a user who is not on the site
learns nothing until they return.

*What this enables.* Report 10 takes this conversation, scopes it to a single
venture, and puts the documents and the commitment beside it.
