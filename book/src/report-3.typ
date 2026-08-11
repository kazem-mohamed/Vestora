#import "/lib/report.typ": *
#import "/lib/theme.typ": *

#report-cover(
  number: 3,
  title: "Identity & Sessions",
  subtitle: "How Vestora learns who you are, and how it keeps knowing",
  date: "September 2026",
)

#show: report.with(number: 3, name: "Identity & Sessions")

= Introduction

Report 2 established the foundation: the four containers, the design system, and
the relational core. It ended with a platform that could render a screen but did
not yet know who was looking at it.

This report is about that gap. It covers one question and answers it in full:
*how does the platform establish who a person is, and how does it stay
confident about that answer over the following two weeks?*

Everything in reports 4 to 12 assumes this is settled. A venture has an owner. A
commitment has an investor. A review has an administrator. A hub connection has
a caller. None of those are possible until an account exists, has been proven to
belong to a reachable person, and carries a role the server can check.

= Objective

*Make identity trustworthy, and make the proof survive time.*

An account must belong to a real, reachable address — not merely claim one. A
session must be revocable rather than merely expiring. A password must be
resistant to guessing without punishing a user who mistypes. And what a user is
permitted to do must be decided by the server on every request, never by the
interface that happens to be drawing the screen.

Two properties carry the weight of this part. *Nothing sensitive is stored in a
form that survives a database disclosure* — every credential and every token is
persisted as a hash. And *every lifetime is configuration rather than a
constant*, so a threshold can be tightened in an afternoon without a release.

= Features Delivered

#figure(
  table(
    columns: (44mm, 1fr),
    align: (left + top, left + top),
    table.header([Feature], [What it does]),
    [Registration], [Creates an unverified account and issues a single-use
      verification code bound to the address that requested it.],
    [Email verification], [Sign-in is refused until the address is confirmed, so
      an account cannot be created against an address the registrant does not
      control.],
    [Resend, rate-limited], [A new code can be requested, but not faster than
      once a minute — otherwise the resend endpoint becomes a mail cannon
      pointed at a third party.],
    [Sign-in], [Issues a short-lived access token carrying identity and role,
      and a longer-lived refresh token.],
    [Refresh with rotation], [Every refresh issues a new token and invalidates
      the old one; a replayed token invalidates the whole chain.],
    [Password reset], [A time-boxed, single-use code — deliberately shorter
      lived than the verification code, with its own attempt limit.],
    [Password change], [For a signed-in user, under the same password policy
      registration enforces.],
    [Lockout], [Blunts repeated password guessing without permanently locking
      out a user who mistypes.],
    [Roles], [Decides what an account is permitted to do, checked on the server
      for every request.],
    [Onboarding], [A first-run step that collects interests, skippable by
      design — it shapes discovery but gates nothing.],
    [Profiles], [A public profile, and account settings kept deliberately
      separate from it.],
    [Suspension], [An administrator can disable an account without deleting it.],
  ),
  caption: [Identity features delivered in this part.],
)

= How an Account Comes Into Existence

Registration does not create a usable account. It creates an *unverified* one
and starts a proof.

#full-page-figure(
  "/assets/diagrams/out/seq-registration.svg",
  caption: [Registration and email verification, end to end. The response at the
    registration step is identical whether or not the address is already
    registered — the endpoint is deliberately not an account-existence oracle.],
)

== The code is bound to the address

The verification step takes *two* values, not one.

#figure(
  ```cs
  public class VerifyEmailDto
  {
      [Required]
      [EmailAddress]
      public string Email { get; set; } = string.Empty;

      [Required]
      public string Token { get; set; } = string.Empty;
  }
  ```,
  caption: [The verification request. The address is required alongside the
    code.],
)

This is a smaller detail than it looks, and it decides a real property. Because
the code is only ever checked *against the account that requested it*, a code
observed in isolation — read over a shoulder, left in a screenshot, guessed —
is not a credential. It is one half of a pair, and the other half is knowledge
of which address it belongs to.

It also explains the interface: the verification screen asks for an email
address and a code rather than being reached by clicking a link. A link carries
its own proof and can be forwarded; a code that must be paired cannot.

Three columns on `Users` hold the state, and the first of them is the one worth
naming.

#figure(
  table(
    columns: (58mm, 1fr),
    align: (left + top, left + top),
    table.header([Column], [Why it is shaped this way]),
    [`EmailVerificationTokenHash`],
      [The code is stored *hashed*, exactly as a refresh token is. A database
       disclosure yields no usable codes.],
    [`EmailVerificationTokenExpiresAtUtc`],
      [Expiry is a stored fact rather than an inference from when the row was
       written.],
    [`EmailVerificationLastSentAtUtc`],
      [What the resend cooldown is measured against — the limit lives in the
       data, not in a cache that a restart would clear.],
  ),
  caption: [Verification state on `Users`. Hashing a short numeric code is
    cheap; not hashing it would make the column a list of live credentials.],
)

= Sessions and Rotation

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

Every lifetime and threshold in this part is supplied by configuration. None of
them is a literal in a method body.

#figure(
  table(
    columns: (1fr, 22mm, 1fr),
    align: (left + top, center + top, left + top),
    table.header([Setting], [Value], [Reasoning]),
    [`JwtSettings:ExpirationMinutes`], [60],
      [Short enough that a leaked access token expires within a sitting; long
       enough to avoid refresh churn.],
    [`RefreshTokenDays`], [14],
      [A fortnight of inactivity ends the session.],
    [`EmailVerificationTokenMinutes`], [60],
      [Single-use and time-boxed.],
    [`EmailVerificationResendCooldownSeconds`], [60],
      [Without it, the resend endpoint would deliver unlimited mail to any
       address a caller names.],
    [`RequireVerifiedEmailForLogin`], [`true`],
      [A flag rather than a branch, so the rule is visible in configuration
       instead of buried in the sign-in path.],
    [`MaxFailedLoginAttempts`], [5],
      [Blunts guessing without punishing a mistyped password.],
    [`LockoutMinutes`], [15],
      [Long enough to make automation expensive, short enough that a locked-out
       user is not locked out for the day.],
    [`PasswordResetTokenMinutes`], [10],
      [Shorter on purpose: a live reset code is a higher-value target than a
       verification code, because it changes a credential rather than confirming
       one.],
    [`PasswordResetResendCooldownSeconds`], [60],
      [The same argument as the verification cooldown, applied to the more
       sensitive of the two flows.],
    [`PasswordResetMaxFailedAttempts`], [5],
      [A separate counter from sign-in. Guessing a six-digit code and guessing a
       password are different attacks and should not share a budget.],
  ),
  caption: [Every identity setting, with its shipped value. Ten settings, none
    of them compiled in.],
)

= Interface

The identity surfaces are the first thing a visitor meets, so both language and
theme are evidenced here rather than asserted.

#shots(
  "/assets/screenshots/login-en-light.png",
  "/assets/screenshots/login-ar-dark.png",
  [Sign-in, in English on the light token set and Arabic on the dark one. The
   direction flips, the layout mirrors, and the display face changes to the
   Arabic pair. The form, its fields and its affordances are the same in both.],
)

#shot(
  "/assets/screenshots/register-en-light.png",
  [Registration. The account created here cannot sign in yet — the next screen
   is not optional.],
)

#shot(
  "/assets/screenshots/verify-email-ar-dark.png",
  [Verification. The screen asks for the address as well as the code, which is
   the interface consequence of the pairing described above. The resend link is
   present but the endpoint behind it enforces its own cooldown; the interface
   is not the thing preventing abuse.],
)

#shots(
  "/assets/screenshots/forgot-password-en-light.png",
  "/assets/screenshots/reset-password-en-light.png",
  [Requesting a reset, and completing one. The request screen responds the same
   way for a registered and an unregistered address, for the same reason
   registration does.],
)

#shot(
  "/assets/screenshots/onboarding-en-light.png",
  [Onboarding. It collects interests that shape discovery, and it is skippable —
   the account is fully usable without it. Making it mandatory would gate the
   platform on a preference rather than on an identity.],
)

#shots(
  "/assets/screenshots/profile-public-en-light.png",
  "/assets/screenshots/profile-public-ar-dark.png",
  [The public profile — the outward face of an identity, readable without an
   account. What appears here is what the account holder chose to publish, not
   what the platform inferred.],
)

#delivered[
  Profile and account are deliberately separate surfaces. Changing a biography
  is trivial; changing an email address invalidates a verified identity and must
  re-verify. One combined form would either over-protect the trivial or
  under-protect the consequential.
]

= Data

This report owns three tables directly.

#figure(
  table(
    columns: (32mm, 1fr, 1fr),
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

`Investor` and `Innovator` are specialisations of `User`, persisted in one table
with a discriminator column. They share almost every column and differ mainly in
what they are related to, so a separate table per specialisation would add a
join to every authentication call for no benefit.

= Backend

Three excerpts show how the rules above are enforced rather than described.

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

#figure(
  ```cs
  [Required]
  [DataType(DataType.Password)]
  // Shares AccountRules with registration and reset, so changing a password can
  // never land somewhere signup would have refused.
  [PasswordPolicy]
  public string NewPassword { get; set; } = string.Empty;
  ```,
  caption: [Password change. The policy is one attribute over one shared rule
    set, which is why the three paths that can set a password cannot drift apart.],
)

The third excerpt is the smallest and the one most worth reading twice.
Registration, reset and change are three different endpoints written at three
different times, and each one sets a password. Expressing the policy as a shared
attribute rather than as three validations is what stops a password being
accepted at reset that registration would have rejected.

= Key Endpoints

#figure(
  table(
    columns: (16mm, 52mm, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Method], [Path], [Purpose]),
    [`POST`], [`api/auth/register`], [Create an unverified account and issue a
      verification code.],
    [`POST`], [`api/auth/verify-email`], [Confirm the address; sign-in becomes
      permitted.],
    [`POST`], [`api/auth/resend-verification`], [Issue a new code, subject to the
      cooldown.],
    [`POST`], [`api/auth/login`], [Issue an access and refresh token pair.],
    [`POST`], [`api/auth/refresh`], [Rotate the pair; detect replay.],
    [`POST`], [`api/auth/forgot-password`], [Send a short-lived reset code.],
    [`POST`], [`api/auth/reset-password`], [Complete a reset against a live code.],
    [`POST`], [`api/auth/change-password`], [Change a password for a signed-in
      user.],
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
    columns: (44mm, 1fr),
    align: (left + top, left + top),
    table.header([Library], [Role here]),
    [`BCrypt.Net`], [Password hashing with a per-password salt and a tunable
      work factor.],
    [`Microsoft.AspNetCore.Authentication.JwtBearer`], [Validates the access
      token on every request and populates the caller's identity and role.],
    [`MailKit`], [Sends verification and reset messages over SMTP, behind an
      interface so the transport can be replaced by configuration.],
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
  nothing. The forgot-password endpoint answers the same way, for the same
  reason.
]

#challenge("A resend endpoint is a mail cannon aimed at a stranger")[
  Verification and reset both offer to send another code. An endpoint that
  accepts an address and sends mail, with no limit, lets a caller deliver
  unlimited mail to someone who never asked for it — from our domain, damaging
  our sender reputation rather than theirs.

  *Solution.* Both flows record when they last sent and refuse inside a
  sixty-second window. The limit is stored on the row rather than held in
  memory, so restarting the API does not reset it.
]

#challenge("A long-lived refresh token is a standing risk")[
  An access token expires in an hour. A refresh token lives for a fortnight, and
  a captured one would be usable for that whole period.

  *Solution.* Tokens are stored hashed and rotated on every use. A rotated token
  presented again is treated as evidence of capture, and the entire chain is
  invalidated. During screenshot capture for this project the mechanism fired
  under concurrent requests and ended the session — the defence working as
  designed, and the reason the capture scripts clear storage between roles
  rather than calling `logout`.
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

Only the direct relationships are listed. Every later part reads identity; none
re-implements it.

#figure(
  table(
    columns: (34mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Report], [Relationship], [Boundary]),
    [2 · Foundation & Design System],
      [*This part depends on it.* Every screen above is drawn from tokens
       declared there, in either language and either theme.],
      [No identity screen defines a colour or a typeface of its own.],
    [4 · Ventures & Lifecycle],
      [*Depends on this part.* A venture's owner is an identity established
       here.],
      [That part never decides identity or role; it reads the caller's role and
       acts on it.],
    [7 · Commitment & Pipeline],
      [*Depends on this part.* The rule that a founder cannot back their own
       venture is a comparison between two identities.],
      [Money-adjacent endpoints re-check account state rather than trusting the
       token alone.],
    [12 · Administration & Evaluation],
      [*Extends this part.* Suspension and the security log continue the account
       lifecycle defined here.],
      [Administrative power is itself recorded against the identity that used
       it.],
  ),
  caption: [Direct relationships only. Reports 5, 6, 8 to 11 reach identity
    through one of the four above rather than directly.],
)

= Summary

#delivered[
  Registration with mandatory email verification by a code bound to the address
  that requested it. Rate-limited resend on both the verification and reset
  flows. Sign-in issuing a short-lived access token and a refresh token stored
  hashed and rotated on every use, with replay detection that invalidates the
  chain. Time-boxed password reset with its own attempt budget, and password
  change under the same shared policy. Account lockout, server-side role checks,
  skippable onboarding, public profiles separated from account settings, and
  administrative suspension.

  *Ten settings, all supplied by configuration.* No lifetime, cooldown or
  threshold in this part is compiled in.
]

*Still open in this part.* Access tokens remain irrevocable before expiry, with
the mitigation and its limit stated above. Identity verification against a
government document, and anti-money-laundering onboarding, are outside the
delivered scope — the platform proves an address is reachable, and claims
nothing further about who owns it.

*What this enables.* Report 4 can now assume every actor is authenticated and
carries a role, which is what allows a venture to have an owner and a review
queue to have an administrator.
