#import "/lib/vestora.typ": *
#import "/lib/theme.typ": *

= Test Case Catalogue <app:tests>

The domain, integration, authorisation and security cases below were executed
with `dotnet test`; their status is the result of that run. The end-to-end and
load groups remain specified and unexecuted — they require a driven browser and a
concurrency harness (§15).

One caveat carries across the executed integration cases: they run against an
in-memory provider rather than SQL Server, so they prove endpoint behaviour,
status codes and authorisation, and not that every query translates.

The catalogue is organised by the layers of §15.1. Cases derived from an actual
defect carry a reference to the section that records it — those are the cases
that exist because something went wrong, and they are the most valuable in the
suite.

== Domain Unit Cases

#figure(
  table(
    columns: (16mm, 1fr, 1fr, 18mm),
    align: (left + top, left + top, left + top, left + top),
    table.header([ID], [Given / when], [Then], [Status]),

    [FM-01], [An approved commitment with no settled transaction.],
      [It contributes zero to the venture total. (§18.2)], [*Passed*],
    [FM-02], [A settled transaction that is later refunded.],
      [It is removed from the total.], [*Passed*],
    [FM-03], [The same data aggregated twice.],
      [Both results are identical.], [*Passed*],
    [FM-04], [A venture with no transactions.],
      [The total is zero, not null.], [*Passed*],

    [PS-01], [A venture at a mid funding stage; moderation status changes.],
      [Commercial stage is unchanged. (§18.3)], [*Passed*],
    [PS-02], [An invalid stage transition is requested.],
      [It is refused; state is unchanged.], [*Passed*],
    [PS-03], [A venture is rejected, then a funding event occurs.],
      [Moderation status stays rejected.], [*Passed*],

    [AR-01], [A founder attempts to commit to their own venture.],
      [Refused. (FR-30)], [*Passed*],
    [AR-02], [A suspended account attempts a state change.],
      [Refused.], [*Passed*],

    [PT-01], [A transaction in each non-settled state.],
      [None is countable.], [*Passed*],
    [PT-02], [A transaction transitions settled to refunded.],
      [The row persists; only status changes.], [*Passed*],
  ),
  caption: [Domain unit cases. All eleven are executed by `MyAppApi.Tests` and
    passing; three trace directly to defects in @ch:challenges.],
)

== Integration Cases

#figure(
  table(
    columns: (16mm, 1fr, 1fr, 18mm),
    align: (left + top, left + top, left + top, left + top),
    table.header([ID], [Given / when], [Then], [Status]),

    [IC-01], [A second bookmark for the same user and venture.],
      [Rejected by the database, not by application code.], [Specified],
    [IC-02], [A second review by the same investor on a venture.],
      [Rejected by the unique index.], [Specified],
    [IC-03], [A duplicate follow edge.], [Rejected by the unique index.],
      [Specified],
    [IC-04], [A provider callback whose event id is already recorded.],
      [No state changes; success is returned. (FR-27)], [Specified],
    [IC-05], [Two concurrent deliveries of the same callback.],
      [Exactly one is processed.], [Specified],
    [IC-06], [Deleting a venture with images and milestones.],
      [Children cascade.], [Specified],
    [IC-07], [Deleting a user with investment history.],
      [Refused by the restrict rule. (§7.6)], [Specified],
    [IC-08], [The public listing with ventures in every state combination.],
      [Only approved *and* active appear.], [Specified],
    [IC-09], [A checkout left unresolved past its expiry.],
      [The sweeper lapses it; the commitment stays approved.], [Specified],
  ),
  caption: [Integration cases. These verify constraints as constraints rather
    than as intentions.],
)

== Authorisation Cases

One case per negative cell of the matrix in §10.9. The negative cases are the
ones that matter — that a founder *can* edit their venture is worth less than
that another user cannot.

#figure(
  table(
    columns: (16mm, 1fr, 1fr, 18mm),
    align: (left + top, left + top, left + top, left + top),
    table.header([ID], [Actor and action], [Then], [Status]),
    [AZ-01], [A standard account calls an administrative endpoint.], [`403`],
      [Specified],
    [AZ-02], [A user requests another user's investment by id.], [`403` or
      `404`], [Specified],
    [AZ-03], [A non-participant requests a conversation.], [`403`],
      [Specified],
    [AZ-04], [A user requests a restricted document without a grant.], [`403`],
      [Specified],
    [AZ-05], [A non-owner edits a venture.], [`403`], [Specified],
    [AZ-06], [An unauthenticated request to a protected endpoint.], [`401`,
      not `403`], [Specified],
    [AZ-07], [An administrator requests a private conversation.], [Refused —
      moderation covers reported content only.], [Specified],
  ),
  caption: [Authorisation cases, one per negative cell of §10.9.],
)

== Security Cases

#figure(
  table(
    columns: (16mm, 1fr, 1fr, 18mm),
    align: (left + top, left + top, left + top, left + top),
    table.header([ID], [Given / when], [Then], [Status]),
    [SC-01], [A venture update payload includes `ModerationStatus`.],
      [Ignored — the DTO does not expose it. (§10.11)], [Specified],
    [SC-02], [An upload declares `image/png` but carries other bytes.],
      [Rejected on byte inspection. (§10.12)], [Specified],
    [SC-03], [An upload with a traversal filename.],
      [Stored under a generated name.], [Specified],
    [SC-04], [A webhook post with no signature.], [Rejected; no state change.],
      [Specified],
    [SC-05], [A webhook post with an incorrect signature.], [Rejected and
      logged.], [Specified],
    [SC-06], [Six consecutive failed sign-ins.], [Account locked; the response
      is identical to a wrong password. (§10.7)], [Specified],
    [SC-07], [Registration with an already-registered address.],
      [Response identical to a new registration. (§10.3)], [Specified],
    [SC-08], [An unhandled exception is triggered.],
      [Response carries a correlation id and no internal detail. (§16.9)],
      [Specified],
    [SC-09], [A rotated refresh token is presented again.],
      [The chain is invalidated. (§10.6)], [Specified],
  ),
  caption: [Security cases, targeted at the threat model in §10.1.],
)

== End-to-End Journeys

#figure(
  table(
    columns: (16mm, 1fr, 1fr, 18mm),
    align: (left + top, left + top, left + top, left + top),
    table.header([ID], [Journey], [Verifies], [Status]),
    [E2E-01], [Register, verify, sign in, complete onboarding.],
      [Identity end to end.], [Specified],
    [E2E-02], [Create, submit, approve, appear publicly.],
      [The moderation pipeline.], [Specified],
    [E2E-03], [Commit, approve, check out, observe progress change.],
      [*The property the system exists for* — progress moves on settlement and
       not before.], [Specified],
    [E2E-04], [Exchange messages; observe read state update live.],
      [The real-time layer.], [Specified],
  ),
  caption: [End-to-end journeys. E2E-03 is the most valuable test in the
    suite.],
)

== Summary

#figure(
  table(
    columns: (1fr, 24mm, 24mm),
    align: (left, center, center),
    table.header([Layer], [Cases], [Executed]),
    [Domain unit], [11], [*11*],
    [Integration], [9], [0],
    [Authorisation], [7], [0],
    [Security], [9], [0],
    [End-to-end], [4], [0],
    [*Total*], [*40*], [*11*],
  ),
  caption: [Catalogue summary.],
)
