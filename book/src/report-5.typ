#import "/lib/report.typ": *
#import "/lib/theme.typ": *

#report-cover(
  number: 5,
  title: "Real-Time Communication",
  subtitle: "The conversation that happens before a commitment is made",
  date: "September 2026",
)

#show: report.with(number: 5, name: "Real-Time Communication")

= Introduction

Report 4 covered the moment money moves. This report covers everything that
happens *before* it — the questions, the answers, the document that gets
requested, and the notifications that keep both sides informed afterwards.

Messaging on this platform is not a chat feature attached to a marketplace. It
is where diligence happens. An investor reads a pitch, has three questions, and
the quality of that exchange determines whether a commitment is ever made. That
is why presence, typing indication and read state are treated as requirements
rather than decoration: an investor who cannot tell whether their question has
been seen assumes it has been ignored.

The report also covers notifications, because they are the other half of the
same problem — telling someone what happened while they were not looking.

= Objective

*Make the exchange feel live.* A message must arrive without a refresh, and a
sender must be able to tell whether it was delivered and whether it was read.

*Never lose a message.* Liveness must not come at the cost of durability. A
message that appeared on screen and then vanished on reconnect is worse than one
that took a second to arrive.

*Report state truthfully.* Presence, typing and read receipts must reflect what
is actually true, decided by the server. A client must not be able to assert
that it read something it did not.

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
      image.],
    [Conversation list], [All threads with unread counts and search.],
    [Deal room], [Conversation, documents and the commitment under discussion
      in one place.],
    [Document requests], [An investor requests a restricted document; the
      founder grants or refuses.],
    [Download logging], [Every access to a granted document is recorded.],
    [Notifications], [In-app notification of domain events, with unread
      state.],
    [Background fan-out], [Notification delivery runs off the request path.],
  ),
  caption: [Features delivered in this part of the system.],
)

= How It Works

#full-page-figure(
  "/assets/diagrams/out/seq-realtime.svg",
  caption: [A conversation end to end. Presence is derived from the set of a
    user's connections; messages are persisted before they are pushed; read
    state is written by the server when a participant opens the thread.],
)

== A user is not a connection

The subtlety that shapes the whole design: one person may have three tabs open.

Presence is a property of the *user*, derived from the set of their live
connections. A user is online when that set is non-empty. Treating a single
disconnect as "the user left" would produce a status that flickers every time a
tab is closed.

#figure(
  table(
    columns: (34mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([State], [Where it lives], [Why there]),
    [Presence], [In memory, keyed by user, holding a set of connection
      identifiers.],
      [It is only true for the lifetime of the process holding those
       connections. Persisting it would create a value that outlives its
       truth.],
    [Last-seen], [Persisted on the user row.],
      [It must survive a restart — "last seen three hours ago" is precisely the
       information a user needs when the other party is offline.],
  ),
  caption: [Presence and last-seen look like the same fact and have opposite
    lifetimes.],
)

== Persist first, push second

Messages are written to the database *before* they are pushed to the recipient.

The ordering is deliberate. A message that was pushed but not stored is lost on
reconnect, and the user who saw it appear has no way to know it is gone.
Persist-then-push gives the property that matters: the database is the record,
and the push is an optimisation over polling for it. A client that missed a push
because it was disconnected recovers by loading the conversation, with no
special reconciliation path.

The achievable guarantee is therefore *at-least-once from the store*, not
exactly-once over the wire. Claiming stronger would be false.

== Transient and durable are different

#figure(
  table(
    columns: (30mm, 1fr),
    align: (left + top, left + top),
    table.header([Signal], [Treatment]),
    [Typing], [Broadcast and forgotten. Never stored. Persisting a typing
      indicator would mean writing to the database on every keystroke to record
      something true for two seconds.],
    [Read state], [A durable property of the message. Written by the server
      when a participant opens the conversation, then pushed to the sender — so
      both parties see the same truth and a client cannot claim to have read
      what it did not.],
  ),
  caption: [Two live signals with opposite storage requirements.],
)

= Interface

#shot(
  "/assets/screenshots/conversation-investor-en-light.png",
  [A diligence conversation, seen by the investor. Three mechanisms are visible
   at once: durable last-seen in the header, read state on each outgoing
   message, and the unread divider.],
)

That capture repays a close look at the tick marks. Every outgoing message
carries two, except the last, which carries one. The single tick is the server
saying *stored and delivered*; the double tick is the server saying *the other
participant opened the conversation*. Neither is a client claim.

#shots(
  "/assets/screenshots/conversation-founder-en-light.png",
  "/assets/screenshots/conversation-investor-ar-dark.png",
  [The same thread from the founder's side, and from the investor's side in
   Arabic under the dark token set. Bubbles swap alignment with the sender, and
   again with the writing direction.],
)

#shots(
  "/assets/screenshots/messages-en-light.png",
  "/assets/screenshots/messages-ar-dark.png",
  [The conversation list in both writing directions, with unread counts and
   search. The thread pane opens beside it; on a narrow screen the two become
   one column and the list steps back.],
)

#shots(
  "/assets/screenshots/notifications-en-light.png",
  "/assets/screenshots/notifications-ar-dark.png",
  [Notifications in both directions and both themes. Unread state is live: it
   arrives over the same connection as messages.],
)

= The Deal Room

A conversation about a specific venture is not a general chat. It refers to
three things at once: the thread itself, the documents under discussion, and the
commitment being considered. The deal room puts those three in one place, so a
diligence conversation is not conducted across three tabs.

#full-page-figure(
  "/assets/diagrams/out/flow-dealroom.svg",
  caption: [The diligence path. Open documents are readable by anyone who can
    see the venture; restricted ones require a request the founder grants or
    refuses. Every download re-checks entitlement and is logged.],
)

== Documents are controlled at download, not by obscurity

A founder attaches documents with a visibility rule. Open documents are
available to anyone who can see the venture. Restricted documents require a
request.

The important property: *entitlement is re-checked every time a file is
downloaded.* A URL that is hard to guess is not an access control — it is a
secret that spreads on the first forward. The check happens at the download
endpoint, on every call, regardless of how the caller arrived at it.

== Downloads are logged

Every access to a granted document writes a row. This is not surveillance. It
serves two purposes: a founder can see that a document was actually read rather
than merely requested, and if material later leaves the platform, the record of
who had access exists.

#figure(
  table(
    columns: (34mm, 1fr),
    align: (left + top, left + top),
    table.header([Step], [What is recorded]),
    [Request], [Who asked, for which document, and when.],
    [Decision], [Granted or refused, by the founder, with a timestamp.],
    [Download], [Each access to a granted document, separately from the
      grant.],
  ),
  caption: [The document trail. A grant and a download are separate events,
    because one is permission and the other is use.],
)

= Data

#figure(
  table(
    columns: (40mm, 1fr, 1fr),
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
  caption: [Communication tables.],
)

*Notifications reference domain objects rather than storing rendered text.* A
notification points at the venture, the commitment or the acting user, and the
reference is resolved at read time. Storing the rendered sentence would freeze
it — a venture renamed after a notification was generated would appear under its
old name forever.

That reference carries a cost: the delete behaviour on those references must be
restrictive, because a notification pointing at a deleted row is a broken
notification. The trade is accepted — a notification that stays accurate, in
exchange for references that constrain deletion.

= Backend

#figure(
  ```cs
  // Presence is a property of the user, derived from their live connections.
  // Closing one tab of three must not take them offline.
  public bool Connect(int userId, string connectionId)
  {
      var set = _connections.GetOrAdd(userId, _ => new HashSet<string>());
      lock (set) { set.Add(connectionId); return set.Count == 1; }  // just came online
  }

  public bool Disconnect(int userId, string connectionId)
  {
      if (!_connections.TryGetValue(userId, out var set)) return false;
      lock (set)
      {
          set.Remove(connectionId);
          if (set.Count > 0) return false;                 // other tabs remain
      }
      _connections.TryRemove(userId, out _);
      return true;                                          // last connection closed
  }
  ```,
  caption: [Presence tracking. The boolean return is what tells the hub whether
    a presence change is worth broadcasting.],
)

#figure(
  ```cs
  // Persist first, push second. A message that was pushed but not stored is
  // lost on reconnect — and the user who saw it has no way to know.
  var message = new Message { SenderId = senderId, ReceiverId = receiverId,
                              Content = dto.Content, SentAt = DateTime.UtcNow };
  _db.Messages.Add(message);
  await _db.SaveChangesAsync(ct);

  await _hub.Clients.User(receiverId.ToString())
            .SendAsync("MessageReceived", message.ToDto(), ct);
  ```,
  caption: [Message delivery. The database is the record; the push is an
    optimisation over polling for it.],
)

#figure(
  ```cs
  // Read state is a server decision, not a client claim. Opening a conversation
  // marks the counterpart's messages read and pushes that to the sender, so
  // both sides see the same truth.
  var unread = await _db.Messages
      .Where(m => m.SenderId == otherId && m.ReceiverId == userId && !m.IsRead)
      .ToListAsync(ct);

  foreach (var m in unread) m.IsRead = true;
  await _db.SaveChangesAsync(ct);

  await _hub.Clients.User(otherId.ToString())
            .SendAsync("MessagesRead", unread.Select(m => m.Id), ct);
  ```,
  caption: [Read receipts.],
)

#figure(
  ```cs
  // Notification fan-out leaves the request path. A venture update that also
  // notified five hundred followers synchronously would make publishing as slow
  // as delivering — and a delivery failure would fail the publication.
  _fanOut.Enqueue(new NotificationJob(NotificationKind.ProjectUpdate,
                                      projectId, actorId));
  return ServiceResult.Ok();          // returns immediately
  ```,
  caption: [Publishing an update. The queue is in-process; the trade is stated
    in the challenges below.],
)

= Key Endpoints

#figure(
  table(
    columns: (16mm, 46mm, 1fr),
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
    [`GET`], [`api/deals/{projectId}`], [The deal room for a venture.],
    [`POST`], [`api/deals/{projectId}/documents/{docId}/request`], [Request a
      restricted document.],
    [`POST`], [`api/deals/requests/{id}/grant`], [Founder grants access.],
    [`GET`], [`api/deals/documents/{id}/download`], [Download; entitlement
      re-checked and logged.],
  ),
  caption: [Principal endpoints in this part.],
)

The last row is worth naming. *Access is re-checked at download, not granted by
a hard-to-guess link.* A URL that is difficult to guess is not an access
control; it is a secret that spreads on the first forward.

= Libraries Used in This Part

#figure(
  table(
    columns: (40mm, 1fr),
    align: (left + top, left + top),
    table.header([Library], [Role here]),
    [`Microsoft.AspNetCore.SignalR`], [The persistent connection, transport
      negotiation, reconnection with backoff, and group management. Shares the
      API's authentication pipeline, so a hub connection authenticates with the
      same token as a REST call.],
    [`@microsoft/signalr`], [The browser client: connection lifecycle,
      automatic reconnect, and typed handlers for the hub's events.],
    [`Hosted service (built-in)`], [Runs the notification fan-out worker
      outside the request path.],
    [`Entity Framework Core`], [Persists messages, attachments and
      notifications, and writes durable last-seen.],
  ),
  caption: [Libraries introduced in this part.],
)

= Challenges

#challenge("Presence flickered every time a tab was closed")[
  Treating a disconnect as "the user went offline" produced a status that
  changed constantly for anyone with more than one tab open.

  *Solution.* Presence is tracked per *user*, holding a set of connection
  identifiers. A user goes offline only when the set becomes empty — and that is
  also the moment last-seen is written.
]

#challenge("Presence and last-seen look like one fact")[
  Both answer "where is this person". Storing them the same way is wrong in one
  direction or the other: persisting presence creates a value that outlives its
  truth, and keeping last-seen in memory loses it on restart.

  *Solution.* Opposite treatments. Presence in memory, last-seen on the user
  row. The cost is that presence does not survive scale-out beyond one
  instance — stated below.
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
  publishing as slow as the slowest delivery, and a failure in fan-out would
  fail the publication itself.

  *Solution.* The domain enqueues the work in-process and returns; a background
  worker performs delivery.

  *The cost, stated.* The queue is process-local, so work enqueued and not yet
  delivered is lost on restart. Acceptable for notifications, and the boundary
  is named rather than assumed away.
]

#challenge("A hard-to-guess document link is not an access control")[
  The convenient way to release a restricted file is to hand out a URL that is
  difficult to guess. It is also wrong: the URL is a secret, and a secret that
  is forwarded once is public.

  *Solution.* Entitlement is evaluated at the download endpoint on every call,
  independently of how the caller reached it. A revoked grant takes effect
  immediately, and a forwarded link gives the recipient nothing.
]

= How This Fits With the Rest of the System

#figure(
  table(
    columns: (30mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Report], [Relationship], [Boundary]),
    [1 · Identity],
      [A hub connection authenticates with the same access token as a REST
       call.],
      [No second credential and no second identity mechanism exists.],
    [2 · Ventures],
      [Publishing an update or a milestone generates notifications; document
       requests concern venture documents.],
      [This part delivers; it does not decide what a venture contains or
       whether it is public.],
    [3 · Discovery],
      [Following a founder is what makes their update reach a follower.],
      [Discovery creates the follow edge; this part uses it as a recipient
       list.],
    [4 · Investment],
      [Approval and settlement both generate notifications; the deal room shows
       the commitment under discussion.],
      [This part never changes a commitment's state. It reports it.],
    [6 · Insight],
      [Message and notification volume appear in platform activity.],
      [Administrators cannot read private conversations — moderation covers
       reported content only.],
  ),
  caption: [How real-time communication relates to the rest of the platform.],
)

= Summary

#delivered[
  *Messaging.* One-to-one conversations delivered over a persistent connection
  that shares the API's authentication, with presence derived from live
  connections, durable last-seen, transient typing indication, and read receipts
  decided by the server.

  *Durability.* Messages are persisted before they are pushed, so a missed push
  costs nothing and recovery requires no special path.

  *Diligence.* A deal room combining conversation, documents and the commitment
  under discussion, with restricted documents released by request and every
  download re-checked and logged.

  *Notifications.* Domain events delivered in-app, referencing objects rather
  than storing rendered text, with fan-out moved off the request path.
]

*Still open in this part.* Attachments are limited to images; other file types
are not supported. Notification preferences do not exist — every eligible
recipient receives every notification in-app, with no way to tune it, and no
email digest. Presence and the notification queue are both process-local, so the
real-time layer does not survive scale-out beyond a single instance without a
shared backplane and a durable queue.

*What this enables.* Both sides can now talk, decide, and be kept informed.
Report 6 covers what all of this activity looks like when it is aggregated —
for the founder, the investor, and the administrator.
