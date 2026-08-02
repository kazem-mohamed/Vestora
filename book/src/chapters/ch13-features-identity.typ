#import "/lib/vestora.typ": *
#import "/lib/theme.typ": *

= Feature Walkthrough I: Identity, Discovery and Engagement <ch:features1>

== Walkthrough Method and Notation

The two walkthrough chapters describe what the platform does as *journeys*
rather than as endpoint listings. An endpoint listing already exists — it is
@app:api — and repeating it in prose would produce the failure this document
was written to avoid: many pages that describe the code without explaining it.

Each feature below is presented the same way: the user's goal, the path through
the system, the decision that was not obvious, and the consequence. Where a
feature is genuinely a create-read-update-delete surface with no interesting
decision, that is stated in a sentence rather than padded into a page.

#note[
  *Registration and sign-in are not in this chapter.* They are described in
  §10.3–§10.7, where their security properties are the point. Repeating the
  journey here would duplicate five sections. This chapter begins after the
  user has an account.
]

== User Profile Journey

*Goal.* Establish enough identity that a stranger on the other side of a
funding decision can assess who they are dealing with.

*Path.* A new account passes through onboarding, which asks for the minimum
needed to be useful: a display identity, a short biography, and — for an
investor — the sectors they are interested in. The profile is then editable
from settings, split into two surfaces: the *profile* the platform displays, and
the *account* controls that govern the credential and the account state.

*The decision.* Splitting profile from account was not cosmetic. They have
different risk levels. Changing a biography is trivial; changing an email
address invalidates a verified identity and must re-verify. Putting both behind
one form would either over-protect the trivial or under-protect the
consequential.

*Public profiles.* Every user has an addressable public profile showing their
ventures, their activity and their follower relationships. This is what makes
the following system (§13.4) meaningful — there has to be something to follow.

== Browse, Discovery and Search

*Goal.* Let a venture be found on its attributes rather than through an
introduction. This is RQ1 from §1.3, and it is the reason the platform exists.

*Path.* Discovery is one surface with three ways into it: the public venture
listing, a search over that listing, and a feed personalised to what a user
follows and has interacted with.

The listing query is the platform's hottest read path, and its shape is
determined by the state model in §7.6. A venture is publicly visible only when
its moderation status is approved *and* its lifecycle status is active. Those
are two different columns with two different writers, so the listing filters on
both — which is exactly why the composite index in §7.5 exists.

*The decision.* Ranking is deterministic and attribute-based: recency, funding
progress, and engagement signals derived from real interactions. There is no
learned model and no opaque score.

This was a choice, not a limitation of effort. A recommendation model on a
platform with few ventures and little interaction history has nothing to learn
from, and would produce results the team could not explain. A deterministic
ranking can be described to a founder who asks why their venture appears where
it does — which on a platform whose premise is fairness is a product
requirement, not a technical preference.

*Search and filtering.* Filters cover sector, funding stage, funding progress
and the venture's own attributes. Sort fields are allow-listed server-side
(§9.7). Both are paged, and the page size is capped regardless of what the
client asks for.

*Saved searches.* A filter combination can be named and saved, which turns a
one-off query into a standing interest. This is the feature that makes
discovery repeatable: an investor watching for ventures in a sector does not
have to reconstruct the filter each visit.

== Saved Projects and Saved Searches

*Goal.* Let an investor keep a shortlist without committing to anything.

*Path.* A bookmark is a single edge between a user and a venture, created and
removed from any surface that shows a venture. The watchlist is that set,
rendered.

*The decision.* The uniqueness constraint on the pair is what enforces "saved
once", and it is a database index rather than an application check. An
application check leaves a race: two rapid taps on a save control can both pass
the check before either writes, producing two rows. The constraint makes the
second write fail, and the failure is the correct outcome.

The same reasoning covers saved searches: they belong to a user, they are named,
and they are re-runnable rather than snapshots.

== Following and Investor Networks

*Goal.* Let a user keep receiving a founder's news without watching each
venture individually.

*Path.* A follow is a directed edge between two users. It drives the feed and
it drives notification fan-out (§12.6): when a followed founder publishes an
update, their followers are notified.

*The decisions.* Two, both structural. The pair carries a unique index, for the
same race reason as bookmarks. And a second index on the followed identifier
alone exists because follower counts and follower lists are read far more often
than follows are created — an index chosen for a read pattern rather than for
the write it constrains.

*Investor directory.* Investors are themselves browsable, which is the
symmetric half of discovery: a founder looking for the right investor has the
same discovery problem as an investor looking for the right venture, and
solving only one direction would have been solving half the problem.

== Reviews, Comments and Replies

*Goal.* Let the community add signal to a venture that the founder did not
write themselves.

*Path.* Comments attach to a venture, replies attach to comments — one level of
nesting, not arbitrary depth. Reviews are separate from comments and carry a
rating.

*The decision.* Reviews are constrained by a unique index on venture and
investor: one review per investor per venture. This is a business rule that
would otherwise have to be checked in application code and would otherwise race.
It is worth noting as a pattern — this is the fourth place in the system where a
rule that reads like policy is implemented as an index (§7.5).

*Deletion behaviour.* Comments and replies use restrictive delete behaviour
(§7.6), so removing a user does not silently erase a conversation others
participated in. Reviews cascade from the venture, because a review of a deleted
venture refers to nothing.

*Reporting.* Any user can report a venture. Reports carry a status and are
indexed on the venture-and-status pair, because the moderation queue in §14.5
filters on exactly that pair.

== Notification Experience

*Goal.* Tell a user what happened without requiring them to be present when it
did.

*Path.* Domain events generate notifications; a background worker delivers them
(§12.6); the client shows unread state live over the hub connection and renders
the history on a dedicated surface.

*The decision.* Notifications reference domain objects rather than storing
rendered text. A notification points at the venture, the investment or the
acting user, and the reference is resolved at read time. Storing the rendered
sentence would freeze it — a venture renamed after a notification was generated
would appear under its old name forever.

That reference carries a cost: the delete behaviour on those references must be
restrictive (§7.6), because a notification pointing at a deleted row is a broken
notification. This is the trade — a notification that stays accurate, in
exchange for references that constrain deletion.

*What is not built.* There is no email digest and no notification preference
model; every notification is delivered in-app to every eligible recipient. Both
are listed in §20.3. Stating that here is more useful than describing a
preference system that does not exist.
