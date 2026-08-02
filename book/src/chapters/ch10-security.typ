#import "/lib/vestora.typ": *
#import "/lib/theme.typ": *

= Security, Authentication and Authorisation <ch:security>

A platform that records financial commitments is a target. This chapter states
what was defended against, how, and — where a defence is partial — what remains
exposed.

== Threat Model

Threats are enumerated using STRIDE against the system's four trust boundaries:
browser to API, API to database, API to payment provider, and API to SMTP relay.

#figure(
  table(
    columns: (26mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Threat], [Concrete scenario], [Control]),

    [Spoofing],
    [An attacker signs in as another user through credential stuffing or a
     stolen token.],
    [BCrypt password hashing, lockout after five failures, short access-token
     lifetime, refresh-token rotation (§10.5–§10.7).],

    [Tampering],
    [A client submits an investment amount or a venture status it is not
     entitled to set.],
    [Server-side validation of every mutation; state transitions validated
     against `PipelineStages`; no client-supplied identity is trusted.],

    [Repudiation],
    [An administrator denies having rejected a venture; a user denies a
     sign-in.],
    [`AdminAuditLog` and `SecurityLog` as durable tables, not log lines
     (§10.13).],

    [Information disclosure],
    [Error responses leak internal structure; one user reads another's
     messages or documents.],
    [Generic error responses (§6.7); ownership checked on every read of
     user-scoped data.],

    [Denial of service],
    [Repeated sign-in or password-reset requests exhaust resources or spam a
     mailbox.],
    [Lockout thresholds and per-action cooldowns on verification and reset
     (§10.3, §10.4).],

    [Elevation of privilege],
    [A standard account reaches an administrative endpoint.],
    [Role-based authorisation on every administrative route; the
     administrative role cannot be self-assigned (§10.8).],
  ),
  caption: [STRIDE threat enumeration and the control applied to each.],
)

== OWASP Top Ten Mitigation Mapping

#figure(
  table(
    columns: (44mm, 1fr),
    align: (left + top, left + top),
    table.header([Risk], [Position in this system]),
    [Broken access control],
    [Authorisation is checked server-side on every state-changing endpoint and
     on every read of user-scoped data. The matrix is in §10.9.],
    [Cryptographic failures],
    [Passwords are BCrypt-hashed with a per-password salt. Refresh tokens are
     stored as hashes, never in plaintext. Transport is TLS.],
    [Injection],
    [All data access goes through parameterised EF Core queries. There is no
     string-concatenated SQL in the codebase.],
    [Insecure design],
    [The funding invariant is enforced by database constraints rather than by
     application discipline (§7.6).],
    [Security misconfiguration],
    [The application refuses to start when a required secret is missing rather
     than falling back to a default (§16.6).],
    [Vulnerable components],
    [Dependencies are pinned and updated deliberately. This is the weakest
     area: there is no automated dependency scanning. Recorded in §19.4.],
    [Authentication failures],
    [Lockout, verified email required for sign-in, time-boxed single-use
     tokens, rotation on refresh.],
    [Data integrity failures],
    [Webhook payloads are signature-verified before any state change
     (§11.4).],
    [Logging and monitoring failures],
    [Security events are written to durable, queryable tables. Alerting is
     limited; see §16.9.],
    [Server-side request forgery],
    [The API makes outbound requests only to configured provider endpoints;
     no user-supplied URL is fetched.],
  ),
  caption: [OWASP Top Ten mapping. Two rows record gaps rather than controls.],
)

#note[
  Two rows above admit a weakness rather than claiming a control. A mapping
  table in which every row is satisfied is a table that has not been checked.
]

== Registration and Email Verification

Registration creates an unverified account and sends a single-use token valid
for sixty minutes. Sign-in is refused until the address is confirmed, so an
account cannot be created against an address the registrant does not control.

Two details matter. First, resend is rate-limited by a cooldown, so the
endpoint cannot be used to flood a third party's mailbox. Second, registration
responds identically whether or not the address is already registered — a
differing response would turn the endpoint into an account-existence oracle.

#full-page-figure(
  "/assets/diagrams/out/seq-registration.svg",
  caption: [Registration and email verification. The response is identical
    whether or not the address is already registered, so the endpoint is not an
    account-existence oracle.],
)

== One-Time Password Flow

Where a confirmation code is used in place of a link, the code is short-lived,
single-use, and bound to the account that requested it. Verification failures
are counted, and the attempt counter is what limits guessing — a six-digit code
is trivially brute-forced if attempts are unbounded, and the code length is not
what provides the security.

== JWT Issuance and Claims

On successful sign-in the API issues a signed access token carrying the user
identifier, the account type and the role. The token is a bearer credential:
possession is sufficient, so its lifetime is the primary control on the damage
a leaked token can do.

#figure(
  table(
    columns: (44mm, 1fr),
    align: (left, left),
    table.header([Property], [Value and reasoning]),
    [Algorithm], [HMAC with a symmetric key supplied by configuration.],
    [Lifetime], [60 minutes. Long enough to avoid refresh churn, short enough
      to bound exposure.],
    [Claims], [Identifier, account type, role. No personal data — a token
      travels in headers and is logged by intermediaries.],
    [Key source], [Configuration only. The application refuses to start
      without it (§16.6).],
  ),
  caption: [Access token properties.],
)

== Session Lifecycle: Refresh, Logout, Revocation

Refresh tokens are the part of the design that carries the real security
weight, because they are long-lived.

- They are stored *hashed*. A database disclosure does not yield usable tokens.
- The hash column carries a unique index, so two live tokens cannot collide.
- They *rotate*: every refresh issues a new token and invalidates the old one.
- Rotation makes replay detectable. Presentation of an already-rotated token
  indicates the token was captured, and the response is to invalidate the
  chain rather than to issue a new pair.

Logout invalidates the refresh token. It cannot invalidate an already-issued
access token — see the limitation in §10.10.

== Brute-Force Protection and Lockout

Failed sign-in attempts are counted per account. Five failures within the
window lock the account for fifteen minutes. The response to a locked account
does not differ from the response to a wrong password, so the mechanism does
not itself confirm that an account exists.

The threshold is a trade. Lower values frustrate legitimate users who mistype;
higher values widen the guessing window. Five and fifteen were chosen as
configuration values precisely so they can be tuned against observed behaviour
rather than argued about in code review.

#full-page-figure(
  "/assets/diagrams/out/seq-login.svg",
  landscape: false,
  caption: [Sign-in and refresh-token rotation. Presenting an already-rotated
    token invalidates the whole chain — the replay detection that was observed
    firing during screenshot capture (@app:screenshots).],
)

== Role-Based Access Control

Three roles exist: standard user, administrator, and the system itself for
background work. The distinction that matters is that *account type* — whether a
user acts as founder or investor — is not a security role. It determines which
surfaces are shown; it does not determine what the API permits.

Authorisation is enforced at the endpoint, not in the client. A hidden button
is a usability affordance, not a control.

== Authorisation Matrix

#figure(
  table(
    columns: (46mm, 1fr, 1fr, 1fr),
    align: (left + top, center, center, center),
    table.header([Action], [Owner], [Other user], [Admin]),
    [View a published venture], [Yes], [Yes], [Yes],
    [View an unpublished venture], [Yes], [No], [Yes],
    [Create or edit a venture], [Yes], [No], [No],
    [Approve or reject a venture], [No], [No], [Yes],
    [Commit an investment], [No#super[1]], [Yes], [No],
    [Approve an investment], [Yes], [No], [Yes],
    [Read a conversation], [Participants only], [No], [No#super[2]],
    [Download a requested document], [Yes], [If granted], [Yes],
    [Suspend an account], [No], [No], [Yes],
    [Read the audit log], [No], [No], [Yes],
  ),
  caption: [Authorisation matrix. #super[1] A founder may not invest in their
    own venture. #super[2] Administrators moderate reported content, not
    private conversations.],
)

The two footnotes are the interesting rows. A founder investing in their own
venture would let a venture inflate its own funding progress, so the rule is
enforced server-side. And administrators deliberately cannot read private
conversations: moderation operates on reported content, which is a narrower
power than reading everything.

== Account Lifecycle and Suspension

An account moves through registered, verified, active, suspended and closed.
Suspension exists as a first-class state because deletion is not available for
accounts with financial history (§7.6) — the referential rules prevent it, and
correctly so.

#note[
  *Stated limitation.* A stateless access token cannot be revoked before it
  expires. An account suspended at minute one of a token's sixty-minute life
  retains API access until it expires, unless the endpoint checks account state
  on each call. State-changing and money-adjacent endpoints perform that check;
  read-only endpoints largely do not, because the per-request cost is paid on
  every read. The residual exposure is up to sixty minutes of read access for a
  suspended account, and it is accepted rather than hidden.
]

== Input Validation and Sanitisation

Validation is server-side and declarative (§6.7). Client-side validation exists
for feedback only and is never trusted.

/ Injection: Parameterised queries throughout; no dynamic SQL.
/ Cross-site scripting: The client escapes by default. Rendering raw HTML from
  user input is not done anywhere in the codebase.
/ Cross-origin requests: The allowed origin list is configuration, not a
  wildcard.
/ Mass assignment: Requests bind to DTOs that expose only the fields a caller
  may set. An entity is never bound directly from a request body, so a field
  such as a venture's moderation status cannot be set by including it in the
  payload.

The last of these is worth emphasising because it is the most commonly missed.
Binding directly to an entity means every column is writable by anyone who
knows its name.

== File Upload Security

Uploads are the highest-risk input the platform accepts. Four controls apply,
and all four are configuration rather than constants:

- A maximum size of two megabytes per image.
- An allow-list of content types — JPEG, PNG, GIF and BMP. An allow-list, not a
  deny-list: anything unrecognised is refused.
- Content-type verification against the file's actual bytes rather than its
  declared header or its extension, both of which are attacker-controlled.
- Stored filenames are generated, never taken from the upload, so a crafted
  filename cannot traverse a path or collide with an existing file.

== Audit Logging and Data Privacy

Two durable tables carry evidence. `SecurityLog` records authentication events
against a user and a timestamp, indexed on that pair because audit queries are
always per-user and time-ordered. `AdminAuditLog` records administrative
actions — approvals, rejections, suspensions — with the acting administrator.

Both are tables rather than log lines for one reason: a log stream is not
evidence you can query, retain reliably, or present.

On privacy: the platform stores the minimum it needs. It holds no payment
instrument data at any point — card details are entered on the provider's
surface and never traverse the API, which keeps the platform outside the scope
that would otherwise apply. Personal data is limited to what a profile
displays and what authentication requires.
