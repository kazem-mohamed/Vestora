#import "/lib/vestora.typ": *
#import "/lib/theme.typ": *

= Real-Time Communication <ch:realtime>

Messaging on this platform is not a chat feature bolted to a marketplace. It is
where diligence happens — an investor asks about a number in a pitch, a founder
answers, a document is requested. The quality of that exchange is a product
requirement, which is why presence, typing indication and read state are
treated as first-class rather than as decoration.

== Hub Architecture and Connection Lifecycle

A single hub carries all live traffic. It shares the API's authentication
pipeline (§5.8), so a connection is authenticated by the same token as a REST
call — there is no second credential and no second identity.

The lifecycle is:

+ The client negotiates a connection, presenting its access token.
+ On connect, the hub records the connection against the user and marks them
  present.
+ The client joins the conversations it participates in. Membership is checked
  server-side; a client cannot join a conversation by asking.
+ On disconnect — deliberate or dropped — the connection is removed and, if it
  was the user's last, presence is updated and a last-seen timestamp is
  written.

The fourth step contains the subtlety that shapes the whole design: *a user is
not a connection*. One person may have three tabs open. Presence is a property
of the user, derived from the set of their live connections, and treating a
single disconnect as "the user left" produces a status that flickers as tabs
close.

== Presence Tracking and Durable Last-Seen

Presence is held in memory, keyed by user, holding a set of connection
identifiers. A user is online when that set is non-empty. This is the correct
place for it — presence is true only for the lifetime of a process that holds
the connections, and persisting it would create a value that outlives its truth.

Last-seen is the opposite and is persisted on the user row. It must survive a
restart, because "last seen three hours ago" is exactly the information a user
needs when the other party is not online.

#adr(
  "08",
  "Hold presence in memory, persist last-seen",
  background: [Presence and last-seen look like the same fact but have opposite
    lifetimes. Presence is only true while connections exist; last-seen must
    outlive them.],
  decision: [Track presence in a process-local map keyed by user, holding a set
    of connection identifiers. Write last-seen to the user row on final
    disconnect.],
  consequences: [Presence is accurate and cheap, and cannot be stale because it
    cannot outlive the process. Last-seen survives restarts. The cost is that
    presence does not survive scale-out to more than one instance — a backplane
    would be required, which §12.7 discusses.],
)

== Typing Indicators and Read Receipts

*Typing* is transient and is never stored. It is broadcast to the other
participant and expires on its own. Persisting a typing indicator would mean
writing to the database on every keystroke to record something true for two
seconds.

*Read receipts* are the opposite: a message's read state is a durable property
of the message. The design detail that matters is that reading is a server-side
event, not a client claim. When a participant opens a conversation, the server
marks the relevant messages read and pushes that state to the sender — so both
parties see the same truth, and a client cannot assert that it read something
it did not.

The result is that a sender sees delivery and read state change live, which is
the behaviour users expect from messaging and which is only achievable with a
push transport.

#figure(
  image("/assets/screenshots/conversation-investor-en-light.png", width: 100%),
  caption: [A diligence conversation, seen by the investor. Three mechanisms of
    this chapter are visible at once: durable last-seen in the header (§12.2),
    read state on each outgoing message, and the unread divider.],
)

That capture repays a close look at the tick marks. Every outgoing message
carries two, except the last, which carries one — the recipient has received it
and has not opened it. The distinction is not cosmetic: the single tick is the
server saying *stored and delivered*, and the double tick is the server saying
*the other participant opened the conversation*. A client cannot assert either;
both are written server-side (§12.4).

#figure(
  grid(
    columns: (1fr, 1fr),
    column-gutter: 3mm,
    image("/assets/screenshots/conversation-founder-en-light.png", width: 100%),
    image("/assets/screenshots/conversation-investor-ar-dark.png", width: 100%),
  ),
  caption: [The same thread from the founder's side, and from the investor's
    side in Arabic under the dark token set. The bubbles swap alignment with the
    sender, and again with the writing direction.],
)

== Message Persistence and Delivery

Messages are written to the database first and pushed second. The ordering is
deliberate: a message that was pushed but not stored is lost on reconnect, and
the user who saw it appear has no way to know it is gone.

Persist-then-push gives the property that matters — the database is the record,
and the push is an optimisation over polling for it. A client that missed a push
because it was disconnected recovers the message by loading the conversation,
with no special reconciliation path.

Delivery is therefore *at-least-once from the store*, not exactly-once over the
wire. That is the achievable guarantee, and claiming stronger would be false.

#full-page-figure(
  "/assets/diagrams/out/seq-realtime.svg",
  caption: [A conversation end to end. Presence is derived from the set of a
    user's connections, so closing one tab of three does not take them offline;
    messages are persisted before they are pushed.],
)

== Attachment Handling

Image attachments travel a different path from message text. The file is
uploaded through the API and validated by the same file-upload controls as any
other image (§10.12) — size limit, content-type allow-list, byte-level
verification and a generated filename. Only once the file is stored does a
message referencing it get created and pushed.

Doing it in this order means a push never references a file that does not yet
exist. Non-image attachments are not supported; that is a stated scope
limitation (§1.5.2) rather than an oversight.

== Notification Fan-Out

Notifications are generated by domain events — an investment approved, a
milestone published, a document requested — and they are *not* delivered on the
request path.

A funding approval that also notified five followers synchronously would make
the approval as slow as the slowest notification, and a failure in fan-out would
fail the approval. Instead the domain writes the event to an in-process queue
and returns; a background worker performs the fan-out.

#adr(
  "09",
  "Move notification fan-out off the request path",
  background: [Domain actions can generate many notifications. Delivering them
    synchronously ties the latency and the success of a business operation to
    the delivery of its side effects.],
  decision: [Enqueue notification work in-process and deliver it from a
    background worker.],
  consequences: [Business operations return at their own speed and cannot fail
    because of a notification. The cost is that the queue is process-local: work
    enqueued and not yet delivered is lost on restart. Acceptable for
    notifications, and stated as a limitation in §19.4.],
)

The consequence stated in that record is the honest part. An in-process queue is
the right size for this system and the wrong answer for one that cannot lose a
notification. Naming the boundary is more useful than pretending it is durable.

== Reconnection and Scaling

*Reconnection* is handled by the client library with backoff, and the
persist-then-push design (§12.4) means recovery needs no special path: a
reconnecting client reloads the conversation and is current.

*Scaling* is where this design stops. Presence lives in one process's memory and
the notification queue lives in the same process, so a second instance would
have a second, disjoint view of who is online and its own undelivered queue. The
system runs as a single instance (§6.9), so this is not currently a defect — but
it is a ceiling, and it is the first thing that would have to change.

#figure(
  table(
    columns: (40mm, 1fr),
    align: (left + top, left + top),
    table.header([To scale out, this must change], [Into]),
    [In-memory presence map],
    [A shared backplane so instances agree on who is connected.],
    [In-process notification queue],
    [A durable queue outside the process.],
    [Single-instance assumption in the hub],
    [Group management routed through the backplane.],
  ),
  caption: [What horizontal scaling of the real-time layer would require.],
)

Stating this precisely is more useful than claiming the system is scalable. It
is correct at its current size, and §17.7 identifies the point at which that
stops being true.
