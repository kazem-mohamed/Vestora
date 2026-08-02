#import "/lib/vestora.typ": *
#import "/lib/theme.typ": *

= Challenges and Solutions <ch:challenges>

This chapter records the problems that cost the most time. Each is presented in
the same form — the symptom, what was initially believed, what was actually
wrong, the fix, and what the fix cost — because a problem described only by its
solution teaches nothing.

The selection criterion is not severity. It is *how wrong the first diagnosis
was*. A bug that took an hour and was exactly what it looked like is not in this
chapter. A bug that took three days because it looked like something else is.

== Timestamps That Were Right Everywhere Except Production

*Symptom.* Times displayed in the interface were correct during development and
wrong after deployment — shifted by a fixed number of hours. Investment dates,
message timestamps and audit entries were all affected equally.

*What was initially believed.* That the database was storing local time. Several
hours went into inspecting stored values, which were correct: every row held
UTC, exactly as intended.

*What was actually wrong.* The values were correct in the database and correct
in memory. The defect was at the *serialisation boundary*: a timestamp was being
written into JSON without an explicit offset. The client received a time with no
zone information and did the only thing it could — interpreted it in its own
zone.

*Why it was invisible in development.* Every developer machine and the local
database agreed on a timezone. A value serialised without an offset and
re-interpreted in the same zone round-trips perfectly. The defect could only
appear where server and client zones differed, which is to say: only after
deployment.

*The fix.* An explicit UTC converter applied in the serialisation pipeline, so
that every emitted timestamp carries its offset regardless of host
configuration. Recorded as ADR-07 (§6.7).

*What it cost.* Roughly three days, most of it spent looking in the wrong layer.
The lesson that generalised: *a value that is correct at rest can still be
wrong on the wire.* Storage correctness and transport correctness are separate
properties, and this project had only been checking the first.

== Approval Silently Counting as Funding

*Symptom.* A venture's funding progress increased when a founder approved a
commitment, before any payment had been made. Investors saw ventures reporting
progress that no money supported.

*What was initially believed.* A bug in the approval handler — an increment in
the wrong branch.

*What was actually wrong.* Not a bug in a handler. A defect in the *model*. The
early schema carried a single amount on the investment and no separate concept
of settlement, so "approved" and "paid" had nowhere to live separately. Every
code path that wanted to know how much a venture had raised was reading a figure
that included intentions.

Patching the handler would have moved the increment. It would not have removed
the ability to make the same mistake again, because the model still permitted
the confusion.

*The fix.* Restructure rather than patch. Introduce an approval status distinct
from settlement, split the funding chain into the four objects of §11.1, and
remove the stored total entirely — replacing it with derivation over settled
transactions (ADR-04, §7.6). The migration history records this as it happened:
`AddInvestmentApprovalStatus` followed by `Phase2_InvestmentPipeline`.

*What it cost.* A schema migration mid-project, a rewrite of every funding read,
and the loss of a cheap cached number in exchange for a computed one (§17.5).

*The lesson.* When a defect is possible, ask whether the model permits it. If it
does, fixing the instance leaves the class. This is the single most valuable
thing the project learned, and it is why §7.6 exists in the form it does.

== One Status Column, Three Writers

*Symptom.* A venture that had been actively raising reverted to an
early commercial stage after its founder edited the description and an
administrator re-approved it.

*What was initially believed.* That the edit handler was resetting a field it
should not touch.

*What was actually wrong.* Three different actors — administrator, owner, and
the funding pipeline — were writing one status column, each with a legitimate
reason and none aware of the others. Re-approval wrote `approved` over a value
that meant something else entirely.

*The fix.* Three independent columns with one writer each (ADR-05, §7.6), and
transitions validated per column rather than assigned freely. The five-step
sequence that reproduces the original defect is in §14.2.

*What it cost.* Another migration, a rewrite of the visibility rule into a
two-column predicate, and the composite index in §7.5 to keep the listing query
fast under it.

*The pattern.* This is the same failure as the previous section wearing
different clothes: *one field holding two meanings*. Having met it twice, the
team began looking for it, which is why the payment states in §11.6 were
designed as separate values from the outset rather than discovered later.

== Rewriting the Frontend Without Rewriting the System

*Symptom.* Not a defect — a decision. Three pressures (§5.3) made the existing
Angular frontend the wrong foundation for the remaining work.

*The risk.* A framework migration mid-project is where student projects die. The
realistic failure mode was not technical: it was spending the remaining schedule
on the rewrite and delivering a beautiful frontend over an unfinished backend.

*Why it was survivable.* The API boundary was real rather than nominal. The
backend held every rule and the frontend held none (§6.3), so the migration
replaced one container and touched no business logic. This was not luck — it was
the payoff of a decision made months earlier for different reasons.

*What actually hurt.* Not the rewrite itself but the *rendering model*. Server
components, the boundary between server and client code, and data fetching that
no longer resembled a service injected into a component all had to be learned
while delivering. Several screens were built twice: once in the client-rendered
idiom the team knew, then again once the model was understood.

*What it cost.* Real schedule, honestly. And what it bought is in §5.3.

*The lesson.* An architectural boundary's value is not visible until it is
tested. This one was tested under the worst circumstances and held.

== A Shared Database and No Local Fallback

*Symptom.* Work blocked whenever the hosted database was unavailable, and a
migration applied by one developer changed the schema under everyone else.

*What was actually wrong.* The project runs against a hosted SQL Server instance
(§16.3) with no local server on developer machines. This is convenient — one
schema, no divergence, real data shapes — and it makes the database a *shared
mutable resource* with no isolation.

*The fix — partly process, partly technical.* Migrations are applied to the
shared database only after applying cleanly locally against a scratch instance
(§7.7), and schema changes are announced before they are applied. Additive
migrations are preferred precisely because they do not break a colleague who has
not yet pulled.

*What it cost.* Discipline, and occasional lost time when the discipline
lapsed.

*Stated honestly.* This is not a solved problem; it is a managed one. A proper
answer is per-developer databases, which the hosting arrangement does not
support. It is recorded as a limitation in §19.4 rather than presented as a
practice.

== Theme Tokens That Inverted Under a Dark Scope

*Symptom.* Certain text became invisible in dark mode — foreground on
foreground — on specific surfaces only.

*What was initially believed.* A missing dark-mode variant on those components.

*What was actually wrong.* A semantic colour token was being resolved inside a
scope that had already inverted the theme, so a token meaning "text colour"
resolved to the colour of the surface it was sitting on. The components were
correct; the *scope* they were rendered in was not.

*The fix.* Resolve semantic tokens relative to their surface rather than to the
root, so a token's meaning is stable regardless of what it is nested inside.

*The lesson.* A design token is only a system if its meaning is
context-independent. A token that resolves differently depending on where it is
used is a variable, not a token — and §8.2 is written with that distinction in
mind.

== Testing Against Motion and Smooth Scrolling

*Symptom.* Interface tests failed intermittently — passing locally, failing in
continuous runs, passing again on retry.

*What was actually wrong.* Smooth-scrolling and scroll-driven animation
introduce time between an action and the state it produces. A test asserting on
post-scroll state was racing the animation, and the race resolved differently
depending on machine speed.

*The fix.* Motion is disabled in the test environment — the same mechanism that
serves the reduced-motion preference (§8.8), which means the test environment
exercises a configuration real users also use rather than a synthetic one.

*The lesson.* Flaky tests are usually not flaky. They are tests asserting on a
state that is genuinely not yet true, and the correct response is to remove the
nondeterminism rather than to add a wait.

== Process Challenges

Not every problem was technical.

/ Scope pressure: The feature list grew faster than the schedule. The response
  was explicit prioritisation (§4.4) and an out-of-scope section (§1.5.2) that
  is *written down* — a boundary nobody records is a boundary nobody keeps.

/ Uneven parallelism: Frontend work depended on API shape, so a delayed
  endpoint stalled two people. Agreeing DTO contracts before implementation
  (§9.4) let both sides proceed against a shared definition.

/ Documentation debt: This document was begun late. Decisions recorded here as
  Architecture Decision Records were reconstructed from commit history and
  memory rather than written when made. They are accurate, but they cost more
  to write than they would have. Writing an ADR takes ten minutes at the moment
  of the decision and an afternoon six months later.

== What Generalises

Three lessons recur across the technical sections above, and they are the ones
worth carrying forward.

+ *If the model permits a defect, fixing the instance leaves the class.* Two of
  the most expensive problems in this project were model defects wearing the
  costume of handler bugs.

+ *One field holding two meanings will eventually be written by two actors.*
  The second time this appeared, it was recognised in minutes rather than days.

+ *Correct at rest is not correct on the wire.* Storage, serialisation and
  display are three separate correctness surfaces, and a value can pass two of
  them and fail the third.
