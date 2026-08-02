#import "/lib/vestora.typ": *
#import "/lib/theme.typ": *

= User Manual <app:manual>

Three short guides, one per role. Each covers what that role needs to do and the
points where the platform's behaviour is deliberate rather than obvious.

== Getting Started (All Users)

+ *Register* with an email address and a password.
+ *Verify* the address from the link sent to it. Sign-in is refused until this
  is done, so that an account cannot be created against an address the
  registrant does not control.
+ *Complete onboarding.* It asks only for what makes the platform useful
  immediately; everything else is editable later from settings.

*If you forget your password*, request a reset. The link is valid for ten
minutes — deliberately shorter than the verification link, because a reset link
sitting in an inbox is a higher-value target.

*If sign-in fails repeatedly*, the account locks for fifteen minutes. The
message is identical to a wrong password, so the mechanism does not confirm
whether an account exists.

== For Investors

=== Finding ventures

Browse the venture listing without an account, or search and filter by sector,
funding stage and progress. Ranking is deterministic and attribute-based — it
uses no hidden score, and a venture's position can be explained.

*Save a search* to turn a filter combination into a standing interest, and
*bookmark* ventures to build a watchlist.

=== Assessing a venture

A venture page carries its description, imagery, team, milestones, published
updates and open documents. Where a document is restricted, request access; the
founder grants or refuses it.

*Message the founder* directly. The conversation shows presence, typing and read
state, so you can tell whether your question has been seen.

=== Committing capital

+ *Commit* an amount on the venture page. Nothing is reserved and no money
  moves at this point.
+ *Wait for approval.* The founder or an administrator accepts or declines.
+ *Complete checkout.* An approved commitment can be taken to payment. The
  checkout has an expiry; if it lapses, the commitment stays approved and a new
  checkout can be opened.
+ *Settlement.* The venture's funding progress changes only once payment is
  confirmed.

#note[
  *Approved is not funded.* These are shown as two separate figures throughout
  the platform, and the difference is deliberate. Only settled payments count
  toward a venture's total — which is why a venture's progress does not move
  when your commitment is approved.
]

=== Tracking

Four surfaces answer four different questions: *pipeline* (what is in
progress), *payments* (what has settled), *portfolio* (what you actually hold),
and *activity* (what has happened).

Card details are entered on the payment provider's own page and never touch the
platform.

== For Founders

=== Submitting a venture

+ *Create* the venture with a title, description, funding target and imagery.
+ *Add* documents, team members and milestones.
+ *Submit* for review. It is not publicly visible until an administrator
  approves it.
+ *If rejected*, you receive a stated reason. Correct the venture and resubmit.

*Editing a published venture returns it to review* — but this affects only its
moderation state. Funding progress and commercial stage are untouched, because
they are separate fields written by different parts of the system.

=== Managing funding

Incoming commitments appear as requests to approve or decline. Approving a
commitment does *not* collect the money; it permits the investor to proceed to
checkout.

Your dashboard shows *committed* and *settled* as two figures. A large gap
between them means approvals are not converting into payments, which is
actionable information a single combined number would hide.

=== Keeping investors informed

Publish *updates* as work progresses and mark *milestones* as they are reached.
Followers and investors are notified.

Note that the platform *records* what you report; it does not verify it. Your
published history is timestamped and visible, and investors can see the
relationship between what was promised and what was reported.

=== Documents

Attach documents as open or restricted. Restricted documents require a request
that you grant or refuse, access is recorded, and downloads are logged — so you
can see that a document was actually read.

== For Administrators

=== The review queue

The primary surface. Each submitted venture is approved or rejected; *rejection
requires a reason*, because a rejection without one is indistinguishable from a
fault and produces a support request rather than a corrected submission.

=== Reports

User reports are filtered by status. Reports concern published content;
administrators do not have access to private conversations.

=== Accounts

Accounts can be suspended and reinstated. *Accounts with financial history
cannot be deleted* — the referential rules prevent it, deliberately, because
deleting one would erase the record of commitments other parties made.

Note that suspension takes effect immediately for actions, but an already-issued
access token remains valid for up to an hour for read access.

=== Oversight

*Activity* shows platform-wide events. *Security* shows authentication events.
*Revenue* shows fee income, derived from settled transactions.

*Audit* records every administrative action against the administrator who took
it. This includes your own actions, and it is visible to other administrators —
administrative power on this platform is observable by design.
