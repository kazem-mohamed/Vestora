#import "/lib/vestora.typ": fm-heading, plate
#import "/lib/theme.typ": *

#fm-heading[Abstract]

Early-stage founders and individual investors are separated by a market that
serves neither of them well. Founders without an existing network struggle to
reach capital; investors have no structured way to discover, evaluate and track
small ventures. Reward-based crowdfunding platforms solved the first half of
this problem for consumer products, but they do not model equity, do not
support the diligence an investor needs, and end their involvement at the point
of payment.

*Vestora* is a web platform that addresses the full relationship rather than
the transaction. It supports the venture from submission through
administrative review, publication, funding and post-funding reporting, and it
gives investors discovery, saved searches, a watchlist, a document request
channel and a portfolio view over their commitments.

The system is built as an ASP.NET Core REST API over SQL Server with Entity
Framework Core, and a React front end using Next.js. Access is controlled by
JSON Web Tokens with refresh-token rotation, layered over role-based
authorisation and an account lifecycle that covers email verification,
lockout after repeated failed sign-in attempts, and administrative suspension.
Payment is handled through a provider abstraction so that funding rules live in
the domain rather than in an integration, with signature-verified,
idempotent webhook processing. Messaging, presence, typing indicators and read
receipts are delivered over SignalR.

Two design commitments shape most of the system. First, funding totals are
*derived* rather than stored, so an approved investment and a funded one can
never be confused. Second, a venture's administrative *status* is modelled
separately from its commercial *stage*, so moderation decisions and fundraising
progress cannot overwrite one another. Both are enforced at the database level
rather than by convention.

This document records the requirements, the architecture, the decisions and
their trade-offs, the security and payment models, the verification strategy,
and an evaluation of the result against the objectives set out at the start.

#v(4mm)

#plate(label: "Keywords")[
  Equity crowdfunding · Web application architecture · ASP.NET Core · React ·
  Entity Framework Core · JSON Web Tokens · Role-based access control ·
  Payment integration · Real-time communication · SignalR
]

#pagebreak(weak: true)
