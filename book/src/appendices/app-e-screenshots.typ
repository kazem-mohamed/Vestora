#import "/lib/vestora.typ": *
#import "/lib/theme.typ": *

= Interface Gallery <app:screenshots>

Captures are produced by a scripted browser session (`book/capture.js` and
`book/capture-auth.js`) against the running application and a populated
database — 21 ventures at the time of capture. The script sets theme and locale
in storage before each navigation, so a variant is never captured by hand and
the matrix cannot drift.

*Capture rules.* Desktop at 1440×900 and mobile at 390×844, held constant.
Real seeded content — no `Lorem ipsum`, no placeholder names, no unrelated
media. Every figure captioned and referenced from the section it illustrates.

#figure(
  table(
    columns: (1fr, 1fr),
    align: (left + top, left + top),
    table.header([Axis], [Coverage]),
    [Theme], [Light and dark, from the same token roles (§8.4.1).],
    [Language], [English (LTR) and Arabic (RTL), including the display-face
      change (§8.4.2, §8.6.1).],
    [Viewport], [Desktop and mobile, both axes combined at 390 px (§8.4.3).],
    [State], [Populated, empty and error states — the last captured with the
      API deliberately stopped (§8.4.4).],
  ),
  caption: [Axes covered by the captured gallery.],
)

== Captured Gallery

Three accounts were created for capture — one investor, one founder, one
administrator — so that each role is photographed from inside its own session
rather than simulated. The public surfaces are in §8.4.

=== Investor

#let _pair(a, b, ca, cb) = figure(
  grid(
    columns: (1fr, 1fr),
    column-gutter: 3mm,
    image("/assets/screenshots/" + a, width: 100%),
    image("/assets/screenshots/" + b, width: 100%),
  ),
  caption: [#ca #h(1fr) #cb],
)

#_pair("invest-overview.png", "invest-pipeline.png",
  [Investor overview: funded and approved as separate tiles (§14.1).],
  [Pipeline: commitments by state.])

#_pair("invest-portfolio.png", "invest-payments.png",
  [Portfolio: settled holdings only.],
  [Payments: settlement history.])

#_pair("invest-watchlist.png", "invest-activity.png",
  [Watchlist (§13.4).],
  [Activity log.])

#_pair("searches.png", "settings-profile.png",
  [Saved searches (§13.3).],
  [Profile settings, separate from account (§13.2).])

=== Founder

#_pair("founder-overview.png", "founder-ventures.png",
  [Founder overview (§14.6).],
  [Venture list with moderation state.])

#_pair("founder-funding.png", "founder-requests.png",
  [Funding: committed against settled.],
  [Incoming commitments awaiting approval (§14.1).])

#_pair("founder-analytics.png", "my-projects-new.png",
  [Venture analytics (§14.7).],
  [Venture submission form (§14.2).])

=== Administrator

#_pair("admin-overview.png", "admin-review.png",
  [Platform overview with derived analytics (§14.7).],
  [Review queue — the primary moderation surface (§14.5).])

#_pair("admin-ventures.png", "admin-users.png",
  [Venture registry across all states.],
  [Account administration and suspension (§10.10).])

#_pair("admin-revenue.png", "admin-audit.png",
  [Fee revenue, derived from settled transactions (§2.6).],
  [Audit log: administrative action attributed to its actor (§10.13).])

#_pair("admin-security.png", "admin-activity.png",
  [Security events from `SecurityLog` (§10.13).],
  [Platform-wide activity stream.])

=== Authorisation, observed

#figure(
  image("/assets/screenshots/investors-directory.png", width: 72%),
  caption: [An investor account requesting a surface it is not entitled to. The
    client redirects to a refusal rather than rendering an empty page — and the
    API would refuse the underlying call regardless of what the client did
    (§10.8). This is case AZ-01 of @app:tests, observed rather than executed.],
)

#note[
  *A defence that worked during capture.* Three pages in the run redirected to
  sign-in mid-session — one per role. The cause is refresh-token rotation
  (§10.6): concurrent navigations each triggered a refresh, a rotated token was
  presented twice, and the chain was invalidated. That is case SC-09 behaving
  exactly as specified. The capture script was changed to re-authenticate and
  retry rather than to work around the mechanism.
]

=== Communication

The conversation captures in §12.3 were produced by seeding a realistic
diligence exchange between the investor and founder accounts and then opening
the thread from *both* sides, so the read receipts in each are the other
account's actual state rather than a mock.

#todo[
  *Still to capture:* the deal room with a document request in flight, and the
  checkout handoff to the payment provider. Both need seeded state that does not
  yet exist — a granted document request, and an approved commitment carried
  through to a provider session. The list below is the remaining plan.
]

== Public Surfaces

#figure(
  table(
    columns: (10mm, 42mm, 1fr),
    align: (center + top, left + top, left + top),
    table.header([], [Surface], [State to capture, and why]),
    [1], [Landing page], [Above the fold. It is the first evidence a visitor
      has (§8.1).],
    [2], [Venture listing], [Populated, filters visible. The platform's
      discovery surface (§13.3).],
    [3], [Venture listing — filtered], [A sector filter and a saved search
      applied, showing the result count change.],
    [4], [Venture detail], [A venture with imagery, team, milestones and *both*
      funding figures visible (§14.1).],
    [5], [Venture detail — documents], [Open and restricted documents together,
      showing the request affordance (§14.4).],
  ),
  caption: [Public surfaces.],
)

== Identity

#figure(
  table(
    columns: (10mm, 42mm, 1fr),
    align: (center + top, left + top, left + top),
    table.header([], [Surface], [State to capture, and why]),
    [6], [Registration], [Empty, with validation guidance visible.],
    [7], [Registration — error], [A field-level validation error. Error states
      are part of the design system, not an afterthought (§8.8).],
    [8], [Email verification prompt], [The state after registering and before
      verifying — a surface users actually meet (§10.3).],
    [9], [Sign-in — locked], [The lockout message, which is identical to a
      wrong-password message (§10.7).],
    [10], [Onboarding], [The step asking for sector interests.],
  ),
  caption: [Identity surfaces, including two failure states.],
)

== Investor Surfaces

#figure(
  table(
    columns: (10mm, 42mm, 1fr),
    align: (center + top, left + top, left + top),
    table.header([], [Surface], [State to capture, and why]),
    [11], [Investor dashboard], [Populated with committed and settled
      positions.],
    [12], [Commitment flow], [The confirmation step, before approval.],
    [13], [Pipeline], [At least one commitment in each state — the clearest
      possible illustration of §14.1.],
    [14], [Checkout], [The provider handoff, showing that card entry leaves the
      platform.],
    [15], [Portfolio], [Settled holdings only.],
    [16], [Watchlist], [Populated *and* empty. The empty state explains what a
      watchlist is for (§8.8).],
  ),
  caption: [Investor surfaces. Entry 16 is captured twice deliberately.],
)

== Founder Surfaces

#figure(
  table(
    columns: (10mm, 42mm, 1fr),
    align: (center + top, left + top, left + top),
    table.header([], [Surface], [State to capture, and why]),
    [17], [Founder dashboard], [Committed and settled side by side, with a
      visible gap between them (§14.6).],
    [18], [Venture editor], [Mid-edit, showing the re-review notice.],
    [19], [Funding requests], [Awaiting the founder's approval.],
    [20], [Milestones and updates], [A published update with imagery.],
    [21], [Document requests], [A pending request awaiting a grant.],
  ),
  caption: [Founder surfaces.],
)

== Communication

#figure(
  table(
    columns: (10mm, 42mm, 1fr),
    align: (center + top, left + top, left + top),
    table.header([], [Surface], [State to capture, and why]),
    [22], [Conversation], [With presence, a typing indicator and read receipts
      all visible in one frame (@ch:realtime).],
    [23], [Conversation — attachment], [An image attachment in the thread.],
    [24], [Notifications], [Populated, with unread state.],
    [25], [Deal room], [Thread, documents and the commitment under discussion
      together (§14.4).],
  ),
  caption: [Communication surfaces.],
)

== Administration

#figure(
  table(
    columns: (10mm, 42mm, 1fr),
    align: (center + top, left + top, left + top),
    table.header([], [Surface], [State to capture, and why]),
    [26], [Review queue], [Populated.],
    [27], [Rejection dialogue], [With a reason entered — rejection without a
      reason is not possible (§14.5).],
    [28], [Reports queue], [Filtered by status.],
    [29], [Audit log], [Showing administrative actions attributed to
      administrators (§10.13).],
    [30], [Revenue], [Fee income derived from settled transactions (§2.6).],
  ),
  caption: [Administrative surfaces.],
)

== Responsive and Theme

#figure(
  table(
    columns: (10mm, 42mm, 1fr),
    align: (center + top, left + top, left + top),
    table.header([], [Surface], [State to capture, and why]),
    [31], [Venture listing — mobile], [Same information as desktop,
      rearranged. Nothing hidden (§8.6).],
    [32], [Venture detail — mobile], [As above.],
    [33], [Dashboard — mobile], [A data-dense surface, showing table scroll
      contained rather than page scroll.],
    [34], [Conversation — mobile], [As above.],
    [35], [Any surface — dark theme], [The dark token set applied (§8.2).],
    [36], [Focus visibility], [Keyboard focus ring on an interactive element
      (§8.7).],
  ),
  caption: [Responsive and theme captures. Entry 36 evidences an accessibility
    claim rather than illustrating a feature.],
)
