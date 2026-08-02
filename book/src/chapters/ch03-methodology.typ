#import "/lib/vestora.typ": *
#import "/lib/theme.typ": *

= Methodology and Project Management <ch:method>

== Development Approach

The project used an iterative, incremental approach with fixed-length cycles —
Scrum in structure, adapted where the ceremonies did not fit a part-time student
team.

*Why not waterfall.* A sequential approach requires requirements to be
substantially correct before design begins. This project's most important
requirements — the separation of approval from settlement (FR-28), and of
moderation from commercial stage (FR-14) — were *not* known at the outset. They
were discovered when their absence produced defects (§18.2, §18.3). A
methodology that treats requirement change as failure would have treated the
project's two most valuable findings as failures.

*What was adapted.* Daily stand-ups were replaced by asynchronous written
updates, because a six-person team with different timetables cannot reliably
meet daily. Sprint length was set at two weeks — short enough to correct course,
long enough to complete something demonstrable around lectures and
examinations.

*What was kept strictly.* A demonstrable increment at the end of every cycle. A
sprint that produced only partially-integrated work was treated as not having
produced anything, because "nearly done" accumulates invisibly and is discovered
all at once.

== Development Phases

Work proceeded in phases, and the phase names survive in the migration history
(§7.7) — `Phase2_InvestmentPipeline`, `Phase4ProductionAuthSecurity`,
`Phase6_VentureLifecycle` — which makes the schema an accidental record of the
project plan.

#figure(
  table(
    columns: (10mm, 1fr, 1fr),
    align: (center + top, left + top, left + top),
    table.header([], [Phase], [Outcome]),
    [1], [Foundation: data model, identity, venture CRUD.],
      [A working submission-to-listing path.],
    [2], [Investment pipeline.],
      [Commitment and approval — and the discovery that the two were being
       conflated with settlement (§18.2).],
    [3], [Discovery: search, filtering, bookmarks, following.],
      [The public surface.],
    [4], [Production authentication and security hardening.],
      [Refresh rotation, lockout, audit tables, upload controls.],
    [5], [Payments.],
      [The provider abstraction and the funding chain (@ch:payments).],
    [6], [Venture lifecycle and moderation.],
      [The three-column state model (§18.3).],
    [7], [Real-time communication.],
      [Messaging, presence, read state (@ch:realtime).],
    [8], [Frontend migration.],
      [Angular to React and Next.js (§5.3).],
    [9], [Dashboards, analytics and administration.],
      [The surfaces of §14.5–§14.7.],
  ),
  caption: [Development phases and what each produced.],
)

The ordering is worth noting for one property: *authentication hardening came
after the investment pipeline*, not before. In hindsight this was the wrong
order — the security model constrains the shape of endpoints, and retrofitting
authorisation across an existing surface cost more than building it in would
have. Recorded here because a phase plan that is only presented as it was
intended teaches less than one presented as it happened.

== Team Structure

The team is six members. Roles were assigned by capability with deliberate
overlap, so that no area had exactly one person who understood it.

#figure(
  table(
    columns: (36mm, 1fr),
    align: (left + top, left + top),
    table.header([Area], [Responsibility]),
    [Backend and data], [API, domain services, schema and migrations.],
    [Frontend], [Interface implementation, routing, state, integration.],
    [Design system], [Tokens, components, accessibility, visual direction.],
    [Payments and security], [Provider abstraction, authentication, audit.],
    [Quality and documentation], [Test strategy, defect tracking, this
      document.],
  ),
  caption: [Areas of responsibility. Team members are listed on the roster page;
    the mapping is recorded there rather than duplicated here.],
)

*The overlap rule.* Every area had a primary and a secondary. This cost some
efficiency and bought the ability to continue when someone was unavailable —
which, on a student timetable with examination periods, was not a hypothetical.

== Version Control and Collaboration

*Branching.* Work happens on branches named for the change, merged to the main
branch through review. The main branch is expected to build.

*Review.* Every merge is reviewed by someone other than its author. On a team
this size the value is less defect-catching than *knowledge distribution* — the
overlap rule above is maintained by review more than by assignment.

*Commit discipline.* Commits describe why rather than what. The diff already
shows what changed.

*The migration exception.* Schema changes are announced before they are applied,
because the team shares one database (§18.5). This is the only workflow rule
that exists because of an infrastructure constraint rather than a preference,
and it is the one most often forgotten.

== Tooling

#figure(
  table(
    columns: (34mm, 1fr),
    align: (left + top, left + top),
    table.header([Purpose], [Tool and role]),
    [Source control], [Git, with review-gated merges to main.],
    [Backend development], [Visual Studio and the .NET CLI.],
    [Frontend development], [Visual Studio Code with the framework toolchain.],
    [Database], [SQL Server Management Studio for inspection; EF Core
      migrations for all changes (§7.7).],
    [API exploration], [The generated OpenAPI browser in development
      (§9.8).],
    [Design], [Figma for structure and system passes (§8.4).],
    [Documentation], [This document is typeset from plain-text sources in the
      repository, with diagrams generated from text as well — so both are
      reviewable in a diff.],
  ),
  caption: [Tooling and what each is used for.],
)

The last row is a methodology decision rather than a tooling one. Diagrams and
prose that live in version control alongside the code can be reviewed, diffed
and corrected in the same way as the code — and a diagram that is regenerated
from a source file cannot silently drift from the system it describes.

== Risk Management

Risks were identified at the outset and reviewed at phase boundaries. The table
below records what was anticipated and what actually happened, which is more
useful than a register of risks that never materialised.

#figure(
  table(
    columns: (1fr, 16mm, 1fr),
    align: (left + top, center + top, left + top),
    table.header([Risk], [Rating], [Outcome]),
    [Payment integration proves infeasible without a merchant account.],
      [High],
      [*Materialised.* Mitigated by the provider abstraction (ADR-02), which
       made the simulated path a legitimate test surface rather than a
       stand-in.],
    [Scope exceeds the schedule.], [High],
      [*Materialised.* Managed by explicit prioritisation (§4.4) and a written
       out-of-scope list (§1.5.2).],
    [A team member becomes unavailable during examinations.], [Medium],
      [*Materialised.* Absorbed by the primary/secondary overlap rule.],
    [Shared database blocks work or breaks under a bad migration.], [Medium],
      [*Materialised.* Managed by process, not solved (§18.5).],
    [Framework migration consumes the remaining schedule.], [High],
      [*Materialised by choice.* Survivable because the API boundary was real
       (§18.4).],
    [Data loss.], [Low], [Did not materialise. Provider backups untested by
      us — a residual risk stated in §7.8.],
  ),
  caption: [Risk register with actual outcomes. Five of six materialised.],
)

Five of six anticipated risks occurred. That is not a failure of planning — it
is what a risk register looks like when the risks were identified honestly
rather than chosen for being unlikely.

== Schedule

Work spanned the academic year in the nine phases of §3.2. Two observations
about the schedule are worth recording, because both would change how a similar
project is planned.

First, *the frontend migration was not in the original plan*. It was decided
mid-project on evidence that accumulated after the original plan was written
(§5.3), and it consumed schedule that had been allocated to features. Some of
those features are in §20.3 as a direct consequence.

Second, *this document was started late*. Architecture Decision Records were
reconstructed from commit history and memory rather than written when the
decisions were made (§18.8). They are accurate, but they cost several times what
they would have cost written at the time — and the reconstruction is only
possible because the migration history and commit messages were disciplined
enough to reconstruct from.
