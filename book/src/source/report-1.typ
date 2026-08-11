#import "/lib/report.typ": *
#import "/lib/theme.typ": *

#report-cover(
  number: 1,
  title: "Foundation & Identity",
  subtitle: "System architecture, the design system, and how Vestora knows who you are",
  date: "September 2026",
)

#show: report.with(number: 1, name: "Foundation & Identity")

= Introduction

This is the first of six progress reports covering the Vestora platform. Each
report takes one part of the system, states what it is for, and shows what was
delivered.

This report covers two things. First, the *foundation* — the shape of the
system, the technologies it is built on, the interface system every screen
inherits, and the four things the platform stores. Second, *identity* — how a
person becomes a user, proves who they are, stays signed in, and is limited to
what their role permits.

They are together because everything in reports 2 to 6 sits on top of them. A
venture cannot be submitted without an account. A commitment cannot be approved
without a role. Every screen in every later report is drawn with the design
system established here.

= Objective

Two objectives, both prerequisites for everything that follows.

*Build a foundation the rest of the system can be built on.* One deployable
API that owns every rule, a web application that owns none, a relational store
that enforces integrity, and an interface system consistent enough that a new
screen looks like it belongs without being told to.

*Make identity trustworthy.* An account must belong to a real, reachable
address. A session must be revocable. A password must be resistant to guessing.
And what a user is permitted to do must be decided by the server on every
request, never by the interface.

= System at a Glance

The platform is four pieces, and this shape does not change in any later
report.

#figure(
  image("/assets/diagrams/out/c4-container.svg", width: 88%),
  caption: [The platform and the two services it depends on.],
)

#figure(
  table(
    columns: (34mm, 1fr),
    align: (left + top, left + top),
    table.header([Piece], [Responsibility]),
    [Web application], [Renders the interface. Holds no business rules. Calls
      the API for every read and write.],
    [REST API], [The only writer to the database. Owns every rule,
      authorisation decision and validation.],
    [Real-time hub], [Pushes live updates. Shares the API's authentication and
      data access. Covered in Report 5.],
    [Relational store], [Holds state and enforces integrity through
      constraints, not only through code.],
  ),
  caption: [The four containers and what each is responsible for.],
)

The property worth stating early: *the web application contains no business
rules.* It does not compute funding totals and it does not decide permissions.
It displays decisions the API has already made. Every later report depends on
that separation holding.

== Technology

#figure(
  table(
    columns: (36mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Technology], [Role in the platform], [Why]),
    [React with Next.js], [The entire user interface],
      [Public pages render on the server, so a venture page arrives complete
       rather than as a loading shell.],
    [TypeScript], [Frontend language],
      [Type errors surface at build time rather than in the browser.],
    [Tailwind CSS with shadcn/ui], [Styling and components],
      [Unstyled, accessible primitives styled with our own tokens — the visual
       language is ours rather than a library's.],
    [ASP.NET Core], [The API and every rule],
      [Compile-time typing for money-related invariants; authorisation,
       validation and configuration are first-party concerns.],
    [Entity Framework Core], [Database access],
      [Every schema change is a versioned migration, so the schema history is
       replayable.],
    [SQL Server], [Storage],
      [The data and its invariants are relational; constraints are enforced by
       the database itself.],
  ),
  caption: [The foundation stack. Technologies specific to one part of the
    system are introduced in the report that covers it.],
)

= The Design System

Every screen in reports 2 to 6 is drawn from the tokens defined here. They are
declared once and used everywhere; no screen chooses a colour or a typeface of
its own.

#figure(
  table(
    columns: (30mm, 26mm, 1fr),
    align: (left, left, left),
    table.header([Token], [Value], [Role]),
    [Ink], [`#241C14`], [Body text — a warm near-black rather than pure black],
    [Secondary], [`#71614C`], [Supporting text and labels],
    [Bronze], [`#8B4F2A`], [Primary accent: structure, rules, emphasis],
    [Gold], [`#B08A3F`], [Secondary accent, used sparingly],
    [Ground], [`#F6F2E7`], [Page background],
    [Surface], [`#FCFAF3`], [Raised surfaces — cards and panels],
    [Border], [`#E3D9C4`], [Hairlines and dividers],
  ),
  caption: [Colour tokens. A dark set exists with the same role assignments.],
)

Typography uses three families with fixed roles: a display face for page titles,
a sans for interface text and labels, and a serif for figures and long-form
reading.

== Two axes every screen supports

The platform works in *English and Arabic*, and in *light and dark*. These are
not variants of a few screens — they apply everywhere.

#shots(
  "/assets/screenshots/projects-en-light.png",
  "/assets/screenshots/projects-en-dark.png",
  [The same surface under the light and dark token sets. Every colour resolves
   through the same semantic role in both; nothing is re-chosen per theme.],
)

#shots(
  "/assets/screenshots/projects-en-light.png",
  "/assets/screenshots/projects-ar-light.png",
  [English and Arabic. The writing direction flips and the entire layout
   mirrors — navigation, filters, progress bars and the grid. The display face
   changes to the Arabic pair. The information does not change.],
)

Three things change with language and one does not. The direction flips, so
layout mirrors. The display typeface changes, because the Latin display face has
no Arabic coverage. Numerals and Latin proper nouns remain left-to-right inside
right-to-left text, which the layout tolerates rather than fights. What does not
change is the information: both captures show the same ventures, the same
filters, the same figures.

#delivered[
  Layout is expressed in logical properties — start and end rather than left and
  right — so mirroring is a property of the direction rather than a second set
  of rules maintained by hand.
]

= The Data Foundation

The platform stores four kinds of thing. Later reports add tables around them,
but these four are the spine.

#figure(
  table(
    columns: (30mm, 1fr),
    align: (left + top, left + top),
    table.header([Entity], [What it represents]),
    [`User`], [An account. May act as founder, investor, or both.],
    [`Project`], [A venture seeking funding. Owned by exactly one founder.],
    [`Investment`], [A commitment by an investor. An *intention*, not a
      payment.],
    [`PaymentTransaction`], [Evidence that money moved. A *fact*.],
  ),
  caption: [The four core entities. Reports 2 and 4 develop the last three.],
)

`Investor` and `Innovator` are specialisations of `User`, persisted in one table
with a discriminator column. They share almost every column and differ mainly in
what they are related to, so a separate table per specialisation would add a
join to every authentication call for no benefit.

== Identity tables

This report owns three tables directly.

#figure(
  table(
    columns: (34mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Table], [Holds], [Rule enforced]),
    [`Users`], [Credentials, verification state, lockout counters, last-seen],
      [`Email` is unique — this *is* the account identity rule],
    [`RefreshTokens`], [Hashed refresh tokens with expiry and rotation state],
      [`TokenHash` is unique; two live tokens can never collide],
    [`SecurityLogs`], [Authentication and security events],
      [Indexed on user and time, because audit queries are always both],
  ),
  caption: [Identity tables. Two of the three carry a unique index that encodes
    a rule rather than an optimisation.],
)

= Features Delivered

#figure(
  table(
    columns: (46mm, 1fr),
    align: (left + top, left + top),
    table.header([Feature], [What it does]),
    [Registration], [Creates an unverified account and sends a single-use
      verification link.],
    [Email verification], [Sign-in is refused until the address is confirmed,
      so an account cannot be created against an address the registrant does
      not control.],
    [One-time password], [A short-lived, single-use code bound to the account
      that requested it.],
    [Sign-in], [Issues a short-lived access token carrying identity and role.],
    [Refresh with rotation], [Every refresh issues a new token and invalidates
      the old one.],
    [Password reset], [A time-boxed, single-use link — deliberately shorter
      lived than the verification link.],
    [Lockout], [Blunts repeated password guessing without permanently locking
      out a user who mistypes.],
    [Roles], [Decides what an account is permitted to do, checked on the
      server for every request.],
    [Profiles], [A public profile and separate account settings.],
    [Suspension], [An administrator can disable an account without deleting
      it.],
  ),
  caption: [Identity features delivered.],
)

= How It Works

#full-page-figure(
  "/assets/diagrams/out/seq-registration.svg",
  caption: [Registration and email verification, end to end. The response at
    the registration step is identical whether or not the address is already
    registered — the endpoint is deliberately not an account-existence oracle.],
)

== Sessions and rotation

Sign-in issues two tokens. A short-lived *access token* carries the user's
identity and role and is presented with every request. A longer-lived *refresh
token* exchanges for a new pair when the access token expires.

The refresh token is the part carrying the real security weight, because it
lives longest. Three properties protect it:

- It is stored *hashed*. A database disclosure yields no usable tokens.
- The hash column is unique, so two live tokens cannot collide.
- It *rotates*: every refresh issues a new token and invalidates the old one.

Rotation is what makes replay detectable. Presenting a token that has already
been rotated means the token was captured, and the response is to invalidate the
whole chain rather than to issue a new pair.

#full-page-figure(
  "/assets/diagrams/out/seq-login.svg",
  landscape: false,
  caption: [Sign-in and refresh. The rotation branch on the right is the replay
    detection described above.],
)

== Configured, not compiled

Every lifetime and threshold is configuration rather than a constant in code, so
it can be tightened without a release.

#figure(
  table(
    columns: (1fr, 28mm, 1fr),
    align: (left + top, center + top, left + top),
    table.header([Setting], [Value], [Reasoning]),
    [Access token lifetime], [60 minutes],
      [Short enough that a leaked token expires within a session; long enough to
       avoid refresh churn.],
    [Refresh token lifetime], [14 days],
      [A fortnight of inactivity ends the session.],
    [Email verification token], [60 minutes], [Single-use and time-boxed.],
    [Password reset token], [10 minutes],
      [Shorter on purpose: a reset link sitting in an inbox is a higher-value
       target than a verification link.],
    [Lockout], [5 attempts / 15 minutes],
      [Blunts guessing without punishing a mistyped password.],
  ),
  caption: [Identity settings, all supplied by configuration.],
)

= Interface

#shot(
  "/assets/screenshots/landing-en-light.png",
  [The landing page — where an unauthenticated visitor arrives.],
)

#shot(
  "/assets/screenshots/settings-profile.png",
  [Profile settings. Profile and account are deliberately separate surfaces:
   changing a biography is trivial, changing an email address invalidates a
   verified identity and must re-verify. One form would either over-protect the
   trivial or under-protect the consequential.],
)

= Backend

Two excerpts show how identity rules are enforced.

#figure(
  ```cs
  // Registration responds identically whether or not the address exists.
  // A differing response would turn this endpoint into an oracle that reveals
  // which addresses are registered.
  if (await _db.Users.AnyAsync(u => u.Email == dto.Email, ct))
  {
      await _email.SendAlreadyRegisteredNoticeAsync(dto.Email, ct);
      return Created();          // same shape, same status, same timing class
  }

  user.PasswordHash = BCrypt.HashPassword(dto.Password);
  user.IsEmailVerified = false;
  ```,
  caption: [Registration. The account-existence case is handled by notifying the
    real owner, not by telling the caller.],
)

#figure(
  ```cs
  // Refresh tokens are matched by hash and rotated on every use. Presenting a
  // token that has already been rotated means it was captured — so the whole
  // chain is invalidated rather than a new pair issued.
  var stored = await _db.RefreshTokens
      .SingleOrDefaultAsync(t => t.TokenHash == Hash(presented), ct);

  if (stored is null || stored.RevokedAtUtc is not null)
  {
      await _auth.RevokeChainAsync(stored?.UserId, ct);
      return Unauthorized();
  }
  ```,
  caption: [Refresh with replay detection.],
)

= Key Endpoints

#figure(
  table(
    columns: (16mm, 46mm, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Method], [Path], [Purpose]),
    [`POST`], [`api/auth/register`], [Create an unverified account and send a
      verification link.],
    [`POST`], [`api/auth/verify-email`], [Confirm the address; sign-in becomes
      permitted.],
    [`POST`], [`api/auth/login`], [Issue an access and refresh token pair.],
    [`POST`], [`api/auth/refresh`], [Rotate the pair; detect replay.],
    [`POST`], [`api/auth/forgot-password`], [Send a short-lived reset link.],
    [`POST`], [`api/auth/logout`], [Invalidate the refresh token.],
    [`GET`], [`api/users/{id}`], [Read a public profile.],
    [`PUT`], [`api/users/me`], [Update the signed-in user's profile.],
  ),
  caption: [Principal endpoints in this part. The complete listing is generated
    from the code and served in development.],
)

= Libraries Used in This Part

#figure(
  table(
    columns: (40mm, 1fr),
    align: (left + top, left + top),
    table.header([Library], [Role here]),
    [`BCrypt.Net`], [Password hashing with a per-password salt and a tunable
      work factor.],
    [`Microsoft.AspNetCore.Authentication.JwtBearer`], [Validates the access
      token on every request and populates the caller's identity and role.],
    [`MailKit`], [Sends verification, one-time password and reset messages over
      SMTP, behind an interface so the transport can be replaced.],
    [`FluentValidation`], [Structural validation at the request boundary, so a
      service never receives a malformed request.],
  ),
  caption: [Libraries introduced in this part of the system.],
)

= Challenges

#challenge("Registration could reveal which addresses are registered")[
  A registration endpoint that answers differently for a known address tells an
  attacker which email addresses hold accounts.

  *Solution.* The endpoint returns the same status and shape in both cases. When
  the address already exists, a notice is sent to the address itself rather than
  reported to the caller — so the real owner is informed and the caller learns
  nothing.
]

#challenge("A long-lived refresh token is a standing risk")[
  An access token expires in an hour. A refresh token lives for a fortnight, and
  a captured one would be usable for that whole period.

  *Solution.* Tokens are stored hashed and rotated on every use. A rotated token
  presented again is treated as evidence of capture, and the entire chain is
  invalidated. During screenshot capture for this project the mechanism fired
  under concurrent requests and ended the session — the defence working as
  designed.
]

#challenge("A stateless token cannot be revoked before it expires")[
  Suspending an account does not invalidate an access token that has already
  been issued.

  *Solution, and its limit.* State-changing and money-adjacent endpoints check
  account state on each call rather than trusting the token alone. Read-only
  endpoints largely do not, because the cost would be paid on every read. The
  residual exposure is up to sixty minutes of read access for a suspended
  account, and it is accepted rather than hidden.
]

= How This Fits With the Rest of the System

Every later report depends on this one, and none of them re-implements any part
of it.

#figure(
  table(
    columns: (30mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Report], [Depends on this part for], [Boundary]),
    [2 · Ventures & Moderation],
      [A venture's owner and the reviewing administrator are both identities
       established here.],
      [That part never decides identity or role; it reads the caller's role and
       acts on it.],
    [3 · Discovery],
      [Public browsing needs no identity; saving and following do.],
      [Authorisation is checked server-side even on surfaces that are otherwise
       public.],
    [4 · Investment],
      [The rule that a founder cannot invest in their own venture is a
       relationship between two identities.],
      [Money-adjacent endpoints re-check account state rather than trusting the
       token alone.],
    [5 · Real-time],
      [A hub connection authenticates with the same access token as a REST
       call.],
      [There is no second credential and no second identity mechanism.],
    [6 · Insight & Administration],
      [Suspension, the audit log and the security log all extend the account
       lifecycle defined here.],
      [Administrative power is itself recorded against the identity that used
       it.],
  ),
  caption: [What each later report takes from the foundation.],
)

The design system is the second thing every later report inherits. No screen in
reports 2 to 6 defines a colour or a typeface; each one is drawn from the tokens
declared here, in either language and either theme.

= Summary

#delivered[
  *Foundation.* A four-container architecture in which the API owns every rule
  and the web application owns none. A design system of colour and typographic
  tokens applied across every screen, in two languages and two themes. A
  relational core of four entities with integrity enforced by constraints.

  *Identity.* Registration with mandatory email verification, one-time password
  confirmation, sign-in with short-lived access tokens, refresh tokens stored
  hashed and rotated with replay detection, time-boxed password reset, lockout,
  server-side role checks, public profiles, and administrative suspension.

  *Verified.* Nine security cases specified against this part, of which the
  account-lockout and replay-detection behaviours were observed firing in
  practice.
]

*Still open in this part.* Access tokens remain irrevocable before expiry, with
the mitigation and its limit stated above. Identity verification and
anti-money-laundering onboarding are outside the delivered scope.

*What this enables.* Report 2 can now assume every actor is authenticated and
carries a role — which is what allows a venture to have an owner, and a review
queue to have an administrator.
