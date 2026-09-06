#import "/lib/vestora.typ": *
#import "/lib/theme.typ": *

= Complete API Reference <app:api>

The API exposes *169 endpoints across 25 controllers*. This appendix maps the
surface by area; the authoritative, always-current definition is the generated
OpenAPI document (§9.8), from which this listing is derived.

Every endpoint is authenticated unless marked *public*. Every collection
endpoint is paged (§9.7). The uniform error shape is described in §9.6.

== Surface Map

#figure(
  table(
    columns: (38mm, 34mm, 14mm, 1fr),
    align: (left + top, left + top, center + top, left + top),
    table.header([Controller], [Base route], [Ops], [Area of responsibility]),

    [`Auth`], [`api/auth`], [10],
      [Registration, verification, OTP, sign-in, refresh, logout, password
       reset (§10.3–§10.6).],
    [`Users`], [`api/users`], [7],
      [Profile read and update, public profile, account settings (§13.2).],
    [`Investor`], [`api/investor`], [10],
      [Investor profile, preferences, directory (§13.5).],

    [`Projects`], [`api/projects`], [22],
      [Venture create, read, update, listing, search, filtering, lifecycle
       (§14.2).],
    [`ProjectStory`], [`api/projects`], [20],
      [Images, documents, team members, milestones, updates — the material a
       venture owns (§14.3).],
    [`ProjectEngagement`], [`api/projects`], [4],
      [Comments, replies, reviews (§13.6).],
    [`Bookmark`], [`api/bookmarks`], [4],
      [Watchlist add, remove, list, membership check (§13.4).],
    [`Follow`], [`api/follows`], [5],
      [Follow, unfollow, followers, following, status (§13.5).],
    [`Feed`], [`api/feed`], [1], [Personalised activity feed (§13.3).],
    [`Signals`], [`api/signals`], [5],
      [Engagement signals feeding deterministic ranking (§13.3).],
    [`Report`], [`api/reports`], [1], [Submit a report on a venture (§13.6).],

    [`Capital`], [`api/capital`], [3],
      [Commitment creation and approval (§14.1).],
    [`Payments`], [`api/payments`], [13],
      [Checkout, session result, refund, expiry, and the provider webhook
       (@ch:payments).],
    [`DealRoom`], [`api/deals`], [9],
      [Document requests, grants and the diligence surface (§14.4).],

    [`Messages`], [`api/messages`], [9],
      [Conversations, history, attachments, read state (@ch:realtime).],
    [`Notification`], [`api/notification`], [4],
      [List, unread count, mark read (§13.7).],

    [`FounderDashboard`], [`api/dashboard`], [1], [Founder aggregate (§14.6).],
    [`InvestorDashboard`], [`api/dashboard`], [1], [Investor aggregate (§14.6).],
    [`VentureInsights`], [`api/insights`], [1], [Venture analytics (§14.7).],

    [`Admin`], [`api/admin`], [11],
      [User administration, suspension, platform activity (§14.5).],
    [`AdminModeration`], [`api/admin`], [6],
      [Review queue, approve, reject with reason, report queue (§14.5).],
    [`AdminRevenue`], [`api/admin/revenue`], [3],
      [Fee revenue derived from settled transactions (§14.7, §2.6).],
  ),
  caption: [The API surface by controller. Counts are HTTP action attributes in
    each controller.],
)

== Representative Endpoints

The full listing is the OpenAPI document. The endpoints below are the ones the
main text refers to, reproduced here so a reader following a cross-reference
does not have to open the specification.

#figure(
  table(
    columns: (16mm, 54mm, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Method], [Path], [Notes]),

    [`POST`], [`api/auth/register`], [*Public.* Responds identically whether or
      not the address is registered (§10.3).],
    [`POST`], [`api/auth/verify-email`], [*Public.* Single-use, 60-minute
      token.],
    [`POST`], [`api/auth/login`], [*Public.* Subject to lockout (§10.7).],
    [`POST`], [`api/auth/refresh`], [*Public.* Rotates the refresh token;
      replay invalidates the chain (§10.6).],
    [`POST`], [`api/auth/forgot-password`], [*Public.* 10-minute token.],

    [`GET`], [`api/projects`], [*Public.* Paged. Filters on moderation *and*
      lifecycle status (§13.3).],
    [`GET`], [`api/projects/{id}`], [*Public* when approved and active.],
    [`POST`], [`api/projects`], [Founder only.],
    [`POST`], [`api/projects/{id}/submit`], [Moves moderation status to
      pending; leaves stage untouched (§14.2).],

    [`POST`], [`api/admin/projects/{id}/approve`], [Administrator only. Writes
      the audit log (§10.13).],
    [`POST`], [`api/admin/projects/{id}/reject`], [Requires a reason (§14.5).],

    [`POST`], [`api/capital/commit`], [Creates a commitment. Refused if the
      caller owns the venture (FR-30).],
    [`POST`], [`api/capital/{id}/approve`], [Approval only — *not* funding
      (§14.1).],
    [`POST`], [`api/payments/checkout`], [Opens a funding request with an
      expiry and a provider session (§11.3).],
    [`POST`], [`api/payments/webhook/stripe`], [*Public by necessity.*
      Signature-verified over the raw body before any state change; duplicate
      events acknowledged and ignored (§11.4, §11.5).],
  ),
  caption: [Endpoints referenced from the main text.],
)

#note[
  The webhook row is the only unauthenticated state-changing endpoint in the
  system. Its defence is signature verification, not authentication — which is
  why §11.4 treats it as the highest-risk surface in the platform.
]
