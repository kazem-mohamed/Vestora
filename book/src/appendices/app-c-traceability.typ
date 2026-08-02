#import "/lib/vestora.typ": *
#import "/lib/theme.typ": *

= Requirements Traceability Matrix <app:traceability>

// A figure's block is unbreakable by default. These matrices are taller than a
// page, so the block was pushed whole to the next page — overflowing its foot
// and leaving the preceding page almost empty. Breaking them lets the rows flow
// and `table.header` repeats on each continuation.
#show figure: set block(breakable: true)

Each requirement from @ch:requirements is traced forward to the design section
that specifies it, the component that implements it, and the test that verifies
it. A row with an empty test column is implemented but unverified — and the
purpose of the matrix is to make that visible rather than to let it be assumed
at zero.

#todo[
  *Test identifiers pending.* The design and implementation columns are
  complete. Test identifiers resolve against @app:tests and are filled once the
  catalogue is instrumented; they are marked #emph[[T]] here. §19.2 reports the
  resulting coverage counts.
]

== Functional Requirements

#figure(
  table(
    columns: (14mm, 24mm, 1fr, 20mm),
    align: (left + top, left + top, left + top, left + top),
    table.header([ID], [Design], [Implementation], [Test]),
    [FR-01], [§10.3], [`AuthController` · `AuthService`], [#emph[[T]]],
    [FR-02], [§10.3], [`AuthService` verification gate], [#emph[[T]]],
    [FR-03], [§10.7], [`AuthService` lockout counters on `Users`], [#emph[[T]]],
    [FR-04], [§10.4], [`AuthController` reset flow · `IEmailService`], [#emph[[T]]],
    [FR-05], [§10.5–§10.6], [`AuthService` · `RefreshTokens`], [#emph[[T]]],
    [FR-06], [§13.2], [`UsersController`], [#emph[[T]]],
    [FR-07], [§10.10], [`AdminController` · `AccountRules`], [#emph[[T]]],

    [FR-08], [§14.2], [`ProjectsController`], [#emph[[T]]],
    [FR-09], [§14.2, §14.5], [`Projects.ModerationStatus` gate], [#emph[[T]]],
    [FR-10], [§14.5], [`AdminModerationController`], [#emph[[T]]],
    [FR-11], [§14.4], [`ProjectStoryController` · `DealRoomController`], [#emph[[T]]],
    [FR-12], [§14.3], [`ProjectStoryController`], [#emph[[T]]],
    [FR-13], [§14.2], [`ProjectStoryController`], [#emph[[T]]],
    [FR-14], [§7.6, §14.2], [Three columns on `Projects` · `PipelineStages`], [PS-01],

    [FR-15], [§13.3], [`ProjectsController` listing], [#emph[[T]]],
    [FR-16], [§13.3], [`ProjectsController` search and filter], [#emph[[T]]],
    [FR-17], [§13.3], [Saved searches], [#emph[[T]]],
    [FR-18], [§13.4], [`BookmarkController` · unique index], [#emph[[T]]],
    [FR-19], [§13.5], [`FollowController` · unique index], [#emph[[T]]],
    [FR-20], [§13.6], [`ProjectEngagementController`], [#emph[[T]]],
    [FR-21], [§13.6], [`Reviews` unique index], [#emph[[T]]],
    [FR-22], [§13.6], [`ReportController`], [#emph[[T]]],

    [FR-23], [§14.1], [`CapitalController`], [#emph[[T]]],
    [FR-24], [§14.1], [`CapitalController` approval], [#emph[[T]]],
    [FR-25], [§11.3], [`PaymentsController` · `PaymentService`], [#emph[[T]]],
    [FR-26], [§11.4], [Webhook signature verification], [#emph[[T]]],
    [FR-27], [§11.5], [`PaymentEvents` unique index], [#emph[[T]]],
    [FR-28], [§7.6, §11.7], [`FundingMath`], [FM-01, FM-02],
    [FR-29], [§11.8], [`PaymentExpirySweeper`], [#emph[[T]]],
    [FR-30], [§10.9], [`AccountRules`], [AR-01],
    [FR-31], [§14.6], [`InvestorDashboardController`], [#emph[[T]]],

    [FR-32], [§12.4], [`MessagesController` · hub], [#emph[[T]]],
    [FR-33], [§12.2–§12.3], [`PresenceTracker` · hub], [#emph[[T]]],
    [FR-34], [§12.3], [Server-side read marking], [#emph[[T]]],
    [FR-35], [§12.5], [`MessageAttachments` · upload controls], [#emph[[T]]],
    [FR-36], [§13.7], [`NotificationFanOutQueue` and worker], [#emph[[T]]],
    [FR-37], [§14.4], [`DealRoomController`], [#emph[[T]]],

    [FR-38], [§14.5], [`AdminModerationController`], [#emph[[T]]],
    [FR-39], [§14.5], [`AdminModerationController` · `Reports` index], [#emph[[T]]],
    [FR-40], [§10.13, §14.5], [`AdminAuditLogs`], [#emph[[T]]],
    [FR-41], [§14.5, §14.7], [`AdminController` · `AdminRevenueController`], [#emph[[T]]],
    [FR-42], [§14.7], [`VentureInsightsController`], [#emph[[T]]],
  ),
  caption: [Functional requirements traced to design, implementation and test.],
)

== Non-Functional Requirements

#figure(
  table(
    columns: (18mm, 26mm, 1fr, 22mm),
    align: (left + top, left + top, left + top, left + top),
    table.header([ID], [Design], [Implementation], [Assessed]),
    [NFR-01], [§5.2], [Server-rendered public routes], [§17.2],
    [NFR-02], [§13.3], [Composite index · projection], [§17.3],
    [NFR-03], [§9.7], [Paged results, server-capped page size], [§9.7],
    [NFR-04], [§10.2], [BCrypt hashing], [§15.6],
    [NFR-05], [§10.6], [Hashed, rotated refresh tokens], [§15.3],
    [NFR-06], [§6.7], [UTC serialisation converter], [§18.1],
    [NFR-07], [§7.3], [`decimal` money columns], [§15.2],
    [NFR-08], [§10.8], [Endpoint authorisation], [§15.3],
    [NFR-09], [§6.7], [Central exception handling], [§15.6],
    [NFR-10], [§16.6], [Startup configuration validation], [§16.11],
    [NFR-11], [§10.12], [`FileUploadSecurityService`], [§15.6],
    [NFR-12], [§10.13], [`SecurityLog` · `AdminAuditLog`], [§15.3],
    [NFR-13], [§8.7], [Radix primitives · token contrast], [§8.7],
    [NFR-14], [§8.6], [Responsive layout], [§8.6],
    [NFR-15], [§7.7], [EF Core migrations], [§7.7],
    [NFR-16], [§12.6], [Background fan-out worker], [§15.2],
  ),
  caption: [Non-functional requirements traced to design, implementation and
    assessment.],
)

== Reading the Matrix

Three questions the matrix answers that prose cannot:

+ *Is every requirement implemented?* A row with an empty implementation column
  is a requirement that was stated and not built. There are none; deferred
  requirements were removed from @ch:requirements and appear in §20.3 instead.
+ *Is every requirement verified?* Rows marked #emph[[T]] are pending
  instrumentation. §19.2 reports the final counts.
+ *Does every test serve a requirement?* Tests in @app:tests with no requirement
  here are either testing an unstated requirement or testing nothing that
  matters — both worth knowing.
