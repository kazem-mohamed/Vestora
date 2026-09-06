#import "/lib/vestora.typ": *
#import "/lib/theme.typ": *

= Evaluation and Results <ch:evaluation>

This chapter assesses the project against the objectives it set for itself in
§1.4. It does not restate the test results of @ch:testing or the measurements
of @ch:performance; it asks whether what was built is what was intended, and
where it is not.

== Objectives Assessment

Each objective from §1.4 is judged against evidence, not against effort. The
verdict column carries three values: *met* where the objective holds and is
demonstrable, *partly met* where it holds with a stated qualification, and *not
met* where it does not.

#figure(
  table(
    columns: (10mm, 1fr, 22mm, 1fr),
    align: (center + top, left + top, center + top, left + top),
    table.header([], [Objective], [Verdict], [Evidence]),

    [O1],
    [Submission passes explicit administrative review before publication.],
    [Met],
    [Moderation status is a distinct column with a single writer; public
     visibility requires approval (§14.2, §14.5). Rejection carries a reason.],

    [O2],
    [Administrative status and commercial stage independent.],
    [Met],
    [Three columns, three writers, transitions validated per column (§7.6).
     The defect this prevents is reproduced step by step in §14.2.],

    [O3],
    [Funding totals derived from settled payments, enforced below the
     application layer.],
    [Met],
    [No aggregate column exists. Totals derive through one service; duplicate
     settlement is prevented by a uniqueness constraint, not by application
     logic (§7.6, §11.5).],

    [O4],
    [Payment provider isolated so domain rules are provider-independent.],
    [Met],
    [`IPaymentProvider` exposes no domain concept (§11.2). Two implementations
     satisfy it and neither contains a rule.],

    [O5],
    [Role-based authorisation across every state-changing endpoint, with a full
     account lifecycle.],
    [Partly met],
    [Authorisation is enforced server-side throughout (§10.8, §10.9) and the
     lifecycle is complete. The qualification: a suspended account retains read
     access until its access token expires (§10.10).],

    [O6],
    [Discovery through search, filtering, saved searches and a watchlist.],
    [Met],
    [All four exist (§13.3, §13.4). Ranking is deterministic and explicable,
     which was a requirement rather than a fallback.],

    [O7],
    [Sustain the relationship after funding.],
    [Met],
    [Milestones, updates, document requests and messaging (§14.3, §14.4,
     @ch:realtime). Qualified by §14.3: the platform records progress, it does
     not verify it.],
  ),
  caption: [Objectives assessment. Six met, one partly met.],
)

Six of seven objectives are met and one is partly met, with the qualification
stated rather than absorbed. The qualification on O5 is a design consequence of
stateless tokens (§5.6) and was known when the decision was taken; it is not a
discovered failure.

== Research Questions Answered

/ RQ1 — discovery independent of the founder's network: Answered
  affirmatively, with a caveat. Ventures are discoverable by attribute through
  search, filters and saved searches, and ranking uses no social signal that
  would reintroduce network advantage. The caveat is that this is a property of
  the *mechanism*; whether it produces a fairer outcome in practice is an
  empirical question this project cannot answer without operating at scale.

/ RQ2 — a model separating administrative from commercial state: Answered.
  Three columns with disjoint writers (§7.6). The answer is transferable beyond
  this domain — the general form is that a field written by two actors for two
  reasons is two fields.

/ RQ3 — structural rather than conventional funding integrity: Answered.
  Derivation removes the possibility of drift; a uniqueness constraint removes
  the possibility of double settlement. Neither depends on a developer
  remembering a rule.

/ RQ4 — provider substitutability: Answered. The interface carries transport
  only, and the simulated and Stripe-compatible implementations exercise
  identical domain rules (§11.2). The claim is *tested* for the simulated path
  and *structural* for the Stripe path — see §19.3.

== Requirements Coverage

Coverage is reported in three categories, because "implemented" and "verified"
are different claims. The counts come from the matrix in @app:traceability.

#figure(
  table(
    columns: (1fr, 20mm, 1fr),
    align: (left + top, center + top, left + top),
    table.header([Category], [Count], [Meaning]),
    [Implemented and verified by an executed test], [*4*],
      [FR-14, FR-28, FR-30 and NFR-07 — the funding and stage rules covered by
       the 41 passing domain tests (§15.2).],
    [Implemented, verified by inspection only], [*54*],
      [The remainder. Each has a design section and an implementation; none has
       an executed test, because the cases that would cover them need a test
       database or a driven browser.],
    [Not implemented], [*0*],
      [Deferred items were removed from @ch:requirements rather than left
       unmet; they appear in §20.3.],
  ),
  caption: [Requirements coverage. Every requirement is built; the areas an
    automated test now reaches are named below.],
)

Verification now comes from two places rather than one, and the difference is
worth stating precisely.

The *domain* rules that matter most — the separation of stage from status, the
derivation of funding totals including tranche settlement, the self-investment
rule, exact decimal money, and the closed category vocabulary — are covered by
tests that need no database, because §6.4 put those rules in components that hold
no I/O.

The *integration* suite added since reaches four further areas over real HTTP:
authentication and lockout, the payment lifecycle including duplicate
confirmation, the venture lifecycle and its visibility rule, and the
authorisation boundaries themselves. The last of these is the significant one:
the claim that a role check is not an ownership check is now asserted rather than
argued.

#note[
  *What this does not entitle the document to claim.* The per-requirement mapping
  in @app:tests has not been recomputed against the integration suite, so no
  updated "N of 58 verified" figure is offered here. Naming the covered *areas* is
  defensible; converting that into a requirement count without redoing the mapping
  would be a number invented to look like progress.

  What remains genuinely absent is unchanged and stated in §20.3: an end-to-end
  browser suite, a load test above five concurrent readers, and continuous
  integration — the suite passes because somebody runs it.
]

== User Evaluation

#note[
  *No user study was conducted.* The method, tasks and instrument below are
  specified and ready to run; they were not run, because doing so requires
  recruited participants and a scheduled session that the project timetable did
  not accommodate. This section therefore reports a *design*, not a result, and
  §19.4 records the absence as a limitation. It is documented at this length
  because a specified-but-unrun study is recoverable in an afternoon, whereas an
  unspecified one is not.
]

*Method.* Task-based usability evaluation with participants drawn from both
personas of §4.2. Each participant completes a fixed set of tasks unaided while
the facilitator records completion, time and points of hesitation, followed by
a System Usability Scale questionnaire.

*Tasks.* Register and verify an account. Find a venture matching stated
criteria using search and filters. Save it and follow its founder. Commit an
amount and take it through checkout. As a founder, submit a venture and publish
an update.

*What is being measured.* Not preference. Task completion, and specifically
whether a participant can state — correctly — what stage their commitment is in
after the checkout task. That single question tests whether the distinction the
whole system is built on (§14.1) is legible to the person it exists to protect.

== Limitations

Stated plainly and in one place, so that a reader does not have to assemble them
from the qualifications scattered through earlier chapters.

/ No live payment operation: The Stripe-compatible path is implemented,
  signature-verified and idempotent, but has never run against a live merchant
  account. Real card authorisation, disputes and settlement timing are
  unexercised (§11.9).

/ No regulatory onboarding: Identity verification and anti-money-laundering
  checks are absent (§2.7). The platform is not deployable to real transactions
  without them.

/ Suspension is not immediate for reads: Up to sixty minutes of read access
  survives suspension, by the nature of stateless tokens (§10.10).

/ Accessibility conformance is not exhaustively verified: Verified on primary
  flows; screen-reader testing is spot-checked rather than complete across
  sixty-five routes (§8.7).

/ No continuous integration and no automated alerting: Builds and deployments
  are manual against a checklist; failures are found by inspection or report
  (§16.4, §16.9).

/ No observability pipeline: Performance figures come from deliberate
  measurement runs, not continuous collection (§16.8).

/ Uploaded files are not backed up: Images, documents and attachments live
  outside the database and outside the provider's backup arrangement (§7.8).

/ Real-time and notification layers are single-instance: Presence and the
  notification queue are process-local, so the system cannot scale out without
  the changes in §17.7 (§12.7).

/ Shared development database: No per-developer isolation; managed by process
  rather than solved (§18.5).

/ No dependency scanning: Dependencies are updated deliberately but nothing
  automatically checks them for known vulnerabilities (§10.2).

/ No end-to-end or load testing, and no continuous integration: Eighty-five
  tests pass — fifty-seven domain and twenty-eight integration (§15.2) — but the
  integration half runs against an in-memory provider, so query translation is
  unverified, and nothing runs the suite automatically. The browser and load
  cases in @app:tests remain specified and unexecuted (§19.2).

/ No user evaluation was conducted: The study in §19.3 is specified and unrun.
  No claim in this document rests on observed user behaviour.

/ Load behaviour above five concurrent readers is unknown: The harness used in
  §17.6 is a browser and cannot generate reliable concurrency beyond a
  per-origin connection limit. The point at which the server degrades has not
  been established.

/ NFR-02 is not met: The venture listing measures 519 ms at p95 against a
  300 ms target (§17.3). The cause is identified — a remote database round trip
  — and is a consequence of the hosting decision in §5.11.

== Threats to Validity

Three, stated because an evaluation chapter that does not examine its own
weaknesses is advocacy.

/ The evaluators are the authors: The team built the system and designed its
  evaluation. Task selection can unconsciously favour paths that work. The
  mitigation is that tasks were derived from the requirements in @ch:requirements
  before the evaluation was designed, not chosen afterwards.

/ The simulated provider is our own: §11.2 argues that the simulated path
  exercises the same domain rules as the Stripe path, and that argument is
  sound — but it is an argument about structure, not an observation of the
  Stripe path running. The distinction is maintained in §19.2 and should be
  maintained by any reader assessing O4.

/ Absence of scale: Every performance and fairness property is assessed at a
  size at which few systems fail. Nothing here supports a claim about behaviour
  under real load or real market dynamics.
