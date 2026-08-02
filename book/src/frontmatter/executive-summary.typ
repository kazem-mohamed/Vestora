#import "/lib/vestora.typ": fm-heading, plate
#import "/lib/theme.typ": *

#fm-heading[Executive Summary]

== The problem

A founder with a credible early-stage venture and no investor network has few
routes to capital. Banks want collateral and trading history; venture capital
operates on introductions; reward-based crowdfunding sells products, not
equity. On the other side, an individual willing to place a modest amount into
an early venture has no dependable way to find one, judge it, or follow what
happens to the money afterwards.

== What was built

Vestora is a web platform that carries a venture through its whole life rather
than to the point of payment. Founders submit a venture, which is reviewed by
an administrator before it becomes visible. Investors discover ventures through
search and filtering, save them, follow founders, request documents, and commit
capital. After funding, founders publish milestones and updates; investors track
commitments in a portfolio view. Both sides communicate in real time inside the
platform, and administrators moderate content, handle reports and see the
activity of the platform as a whole.

== How it is engineered

#table(
  columns: (34mm, 1fr),
  align: (left + top, left + top),
  table.header([Layer], [Choice]),
  [Front end], [React with Next.js, Tailwind CSS and a component library built
   on Radix primitives],
  [API], [ASP.NET Core, a REST surface across twenty-three controllers],
  [Data], [SQL Server through Entity Framework Core, evolved over a versioned
   migration history],
  [Identity], [JSON Web Tokens with rotating refresh tokens, email
   verification, lockout on repeated failure, and role-based authorisation],
  [Payments], [A provider abstraction with funding rules held in the domain;
   webhooks are signature-verified and idempotent],
  [Real time], [SignalR for messaging, presence, typing indicators and read
   receipts],
)

== What distinguishes it

Three properties are worth stating plainly, because each was a decision with a
cost.

+ *Funding totals are derived, never stored.* An investment that has been
  approved is not the same thing as an investment that has been paid, and the
  system cannot conflate the two. The rule is enforced by database constraints
  rather than by discipline.

+ *A venture's administrative status is separate from its commercial stage.*
  Moderation and fundraising progress move independently, so an approval can
  never silently reset a funding stage, and a funding event can never
  un-reject a venture.

+ *Payment rules do not live in the payment integration.* The provider
  interface handles transport only. Switching or adding a provider cannot
  change what the platform considers a valid commitment.

== Status

The platform is implemented and running against a hosted database. Payment runs
against a simulated provider by default, with a Stripe-compatible path
— including signature-verified webhook handling — available by configuration;
@ch:payments describes the separation precisely and states what has and has not
been exercised against a live provider. Verification, deployment and
performance results are reported in Chapters 15 to 17, and the outcome is
assessed against the original objectives in Chapter 19.

#pagebreak(weak: true)
