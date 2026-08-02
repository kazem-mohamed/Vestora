#import "/lib/vestora.typ": *
#import "/lib/theme.typ": *

= Testing Strategy <ch:testing>

#figure(
  table(
    columns: (1fr, 26mm),
    align: (left, right),
    table.header([Run], [Result]),
    [Tests executed], [*41*],
    [Passed], [*41*],
    [Failed], [0],
    [Skipped], [0],
    [Wall time], [34 ms],
  ),
  caption: [`dotnet test` against `MyAppApi.Tests`. Figures are from the run,
    not from a plan.],
)

The suite covers the *domain* layer — the components §6.4 separated out
precisely because they carry rules and perform no I/O. That separation is what
makes a 34 ms suite possible: none of these tests touches a database.

#note[
  *What is not covered.* Integration, authorisation, security and end-to-end
  cases (@app:tests) remain specified and unexecuted — they need a test
  database and a driven browser. The forty-one executed tests are the domain
  cases only. §19.2 reports the resulting coverage of requirements, which is
  partial and stated as such.
]

== Testing Approach

Testing effort follows risk, not code volume. The distribution below is
deliberate and is the direct consequence of what @ch:challenges established:
the expensive defects in this project were in the *domain*, not in the plumbing.

#figure(
  table(
    columns: (32mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Layer], [What it verifies], [Why this share of effort]),
    [Unit],
    [Domain rules in isolation: funding arithmetic, stage transitions, account
     rules, payment state changes.],
    [Highest share. These are the rules whose failure is most costly and whose
     verification is cheapest — no I/O, so they run in milliseconds.],
    [Integration],
    [A request through controller, service and database against a real schema.],
    [Second highest. Catches the class of defect that unit tests structurally
     cannot: wrong query, wrong mapping, wrong constraint.],
    [API],
    [The contract as a client sees it: status codes, response shapes,
     authorisation.],
    [Moderate. Protects the boundary the frontend depends on.],
    [End-to-end],
    [Whole journeys through the real interface.],
    [Lowest. Slow, brittle, and valuable only for the few journeys where the
     whole chain must hold.],
  ),
  caption: [Test layers and the reasoning behind the effort split.],
)

== Unit Testing

Unit tests target the components that carry rules and perform no I/O — which is
exactly the set that §6.4 separated out for this purpose. `FundingMath`,
`PipelineStages`, `AccountRules` and the payment state logic are all testable
without a database, and that is a property of the architecture rather than of
the tests.

The cases that matter most are the ones derived from @ch:challenges:

#figure(
  table(
    columns: (24mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Case], [Asserts], [Guards]),
    [FM-01], [An approved but unsettled commitment contributes zero to a
      venture's total.], [§11.7, the defect in §18.2],
    [FM-02], [A refunded transaction is removed from the total.], [§11.6],
    [FM-03], [Totals computed twice over the same data are identical.],
      [Derivation correctness],
    [PS-01], [A moderation change does not alter commercial stage.],
      [§7.6, the defect in §18.3],
    [PS-02], [An invalid stage transition is refused rather than applied.],
      [§14.2],
    [AR-01], [A founder cannot commit to their own venture.], [FR-30],
    [PT-01], [Only a settled transaction is countable.], [§11.6],
  ),
  caption: [Domain unit cases and the specific failure each prevents from
    recurring.],
)

Every row in that table exists because something went wrong. A test suite
assembled from a coverage target tests what is easy; one assembled from a defect
history tests what breaks.

*Coverage.* Collected with `coverlet` during the run.

#figure(
  table(
    columns: (1fr, 26mm, 26mm),
    align: (left, right, right),
    table.header([Scope], [Line], [Branch]),
    [`PipelineStages`], [*100%*], [*100%*],
    [`FundingMath`], [25.8%], [80.0%],
    [Whole solution], [0.06%], [1.1%],
  ),
  caption: [Coverage by scope. The three rows are the same run measured at
    three altitudes.],
)

That table is the argument of this section in three lines. `PipelineStages` is
fully covered because it is pure. `FundingMath` reports 25.8% of lines but *80%
of branches* — the uncovered lines are its asynchronous database loaders and its
LINQ expression trees, which cannot execute without a database; every decision
the class actually makes is exercised.

And the solution-wide figure is *0.06%*, which is worse than useless. It is
diluted by twenty-two controllers, several hundred DTO properties and the
generated model — code that carries no decisions. Reporting that number as "the
project's coverage" would be technically true and completely uninformative,
which is why coverage here is reported per class and the aggregate is shown only
to demonstrate why it is not used.

== Integration Testing

Integration tests exercise a request end to end within the API — controller,
service, data context, real schema — and they are where the constraints of §7.6
are verified as constraints rather than as intentions.

Three groups matter:

/ Constraint enforcement: That a duplicate bookmark, a second review by the
  same investor, or a duplicate follow edge is *rejected by the database*, not
  merely avoided by application code. These tests deliberately attempt the
  invalid write.

/ Idempotency: That replaying a provider callback with an event identifier
  already recorded changes nothing and returns success (FR-27). This is the
  test that would have to fail for money to be double-counted.

/ Authorisation: That each row of the matrix in §10.9 holds at the endpoint —
  including the negative cases, which are the ones that matter. A test that a
  founder *can* edit their venture is worth less than a test that another user
  cannot.

== API Testing

The API surface is exercised as a client sees it: correct status codes, the
`401`/`403` distinction preserved (§9.1), paged responses carrying their
metadata, and error bodies disclosing nothing internal (§10.11).

These are maintained as a collection that can be run against any environment,
which makes them serve double duty as a post-deployment smoke check (§16.11).

== End-to-End Testing

Four journeys are covered end to end, chosen because each spans components that
unit and integration tests verify only separately:

+ Register, verify, sign in, complete onboarding.
+ Create a venture, submit it, approve it as an administrator, see it appear
  publicly.
+ Commit to a venture, approve the commitment, complete checkout, observe
  funding progress change.
+ Open a conversation, exchange messages, observe read state update live.

The third is the most valuable test in the entire suite. It is the only one
that verifies the property the whole system is built around: that progress moves
on *settlement* and not before.

*Determinism.* Motion is disabled in the test environment (§18.7). The tests
assert on state rather than on timing, and no test contains a fixed wait.

== Security Testing

Security testing is targeted at the threat model in §10.1 rather than performed
generically.

- Authorisation bypass attempts against each administrative endpoint from a
  standard account.
- Direct object reference attempts: requesting another user's investment,
  message thread or restricted document by identifier.
- Mass-assignment attempts: submitting a moderation status inside a venture
  update payload, which the DTO boundary (§10.11) must ignore.
- Upload attempts with a mismatched content type and with a crafted filename
  (§10.12).
- Webhook posts with an absent, malformed and incorrect signature (§11.4).

The last of these is the highest-value security test in the project: the webhook
endpoint is unauthenticated by necessity, and signature verification is the only
thing standing between an anonymous request and a state change involving money.

== Defect Management

Defects are tracked with severity, the component affected, and — where the fix
was structural — a link to the section that records the decision.

#figure(
  table(
    columns: (1fr, 22mm, 1fr),
    align: (left + top, center + top, left + top),
    table.header([Defect], [Severity], [Resolution]),
    [Approval increased funding progress before payment.], [Critical],
      [Model change, not a patch. §18.2, ADR-04.],
    [Re-approval reset a venture's commercial stage.], [High],
      [Three-column state model. §18.3, ADR-05.],
    [Timestamps shifted after deployment.], [High],
      [UTC enforced at serialisation. §18.1, ADR-07.],
    [Text invisible under an inverted theme scope.], [Medium],
      [Surface-relative token resolution. §18.6.],
    [Interface tests failed intermittently.], [Medium],
      [Motion disabled under test. §18.7.],
  ),
  caption: [Significant defects and how each was resolved. Note that the two
    most severe were resolved by changing the model, not the code.],
)

The full catalogue is in @app:tests. Defects above were found by inspection and
manual exercise, not by an automated suite.

== Requirements-to-Test Traceability

Every requirement in @ch:requirements maps forward to the test that verifies it,
in @app:traceability. The purpose is to make two things visible that are
otherwise asserted:

+ *Which requirements are verified.* A requirement with an implementation and
  no test is implemented but unverified, and the matrix says so.
+ *Which tests exist for no stated requirement.* These are either missing
  requirements or unnecessary tests, and both are worth knowing about.

§19.2 reports what the completed matrix shows — including the gaps, which are
stated rather than closed by relabelling.
