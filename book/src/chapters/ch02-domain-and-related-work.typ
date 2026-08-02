#import "/lib/vestora.typ": *
#import "/lib/theme.typ": *

= Domain Analysis and Related Work <ch:related>

#note[
  Claims in this chapter about how the field behaves are attributed to the
  crowdfunding literature in the bibliography. Claims about *this* platform are
  attributed to the sections that implement them. No statistic appears here
  without a source — which is why the chapter argues in structural terms rather
  than in numbers the project cannot independently verify.
]

== The Crowdfunding and Equity Investment Domain

Crowdfunding describes raising capital from many small contributors rather than
few large ones. The term covers four distinct models, and conflating them is
the most common error in discussions of the field.

#figure(
  table(
    columns: (30mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Model], [The contributor receives], [Consequence]),
    [Donation], [Nothing], [No return expectation; no regulatory perimeter.],
    [Reward], [A product or perk], [Effectively pre-ordering. The relationship
      ends on delivery.],
    [Lending], [Repayment with interest], [A credit product. Regulated as
      lending.],
    [Equity], [A stake in the venture], [A securities transaction. Regulated,
      and the relationship *begins* rather than ends at funding.],
  ),
  caption: [The four crowdfunding models and what distinguishes them.],
)

The last row is where this project sits, and the phrase "the relationship
begins" is the operative difference. A reward backer's involvement is complete
when the product ships. An equity holder's interest continues for as long as
they hold the stake, which means the platform's obligations continue too —
reporting, communication, and a durable record of what was committed.

*The intermediation problem.* Early-stage capital allocation is dominated by
networks rather than by information @agrawal2014 @vismara2016. This is not a market failure in the
ordinary sense — networks are an efficient screening mechanism for the party who
has one — but it produces an outcome in which the availability of capital
correlates with prior access rather than with the quality of the venture. A
platform that widens the top of the funnel addresses this only if it also
supplies the screening that the network was providing. Discovery without
evidence relocates the problem rather than solving it.

== Review of Existing Platforms

=== Reward-Based Platforms

The established reward platforms demonstrated that strangers will fund
strangers at scale when the mechanism is credible @mollick2014 @belleflamme2014. Their contribution to
this project is the mechanism, not the model: campaign pages, funding targets,
progress visibility and update feeds are all patterns worth inheriting.

Their limitations are structural rather than incidental:

- The contributor receives a product, so there is nothing to model as a holding
  and nothing to report on afterwards.
- Diligence is unsupported — there is no document channel and no verification,
  because a pre-order does not require one.
- Platform involvement ends at fulfilment.

=== Equity Platforms

Equity platforms model the holding correctly and support diligence, but they
are built for a different participant. Minimum commitments, accreditation
requirements and syndicate structures serve institutional and high-net-worth
investors @ahlers2015. The individual willing to place a small amount is outside
their intended market — not excluded by policy, but by product design.

They also tend to treat the platform as a transaction venue rather than an
ongoing relationship: the deal closes, and post-funding reporting is left to the
founder and the investor to arrange privately.

=== Regional Context

For a platform intended to serve the regional market, three conditions apply
that do not in the markets the incumbents were designed for @agrawal2014: payment
infrastructure is less uniform, the regulatory perimeter for equity offerings is
still developing, and the population of individual investors with prior
investing experience is small. The third condition has a direct design
consequence — an interface for this market cannot assume familiarity with
investment vocabulary, which shapes §8.5.

== Comparative Feature Analysis

#figure(
  table(
    columns: (46mm, 22mm, 22mm, 22mm),
    align: (left + top, center, center, center),
    table.header([Capability], [Reward\ platforms], [Equity\ platforms], [Vestora]),
    [Public discovery without an account], [Yes], [Often no], [Yes],
    [Search and filter by attribute], [Yes], [Limited], [Yes],
    [Models a holding rather than a purchase], [No], [Yes], [Yes],
    [Administrative review before publication], [Varies], [Yes], [Yes],
    [Document request and grant channel], [No], [Yes], [Yes],
    [In-platform direct messaging], [Limited], [Varies], [Yes],
    [Milestones and post-funding updates], [Partial], [Rare], [Yes],
    [Approved and funded modelled separately], [No], [Varies], [Yes],
    [Accessible to small individual amounts], [Yes], [No], [Yes],
    [Legal execution of the instrument], [N/A], [Yes], [*No*],
    [Identity and anti-money-laundering checks], [Partial], [Yes], [*No*],
  ),
  caption: [Capability comparison. The final two rows are capabilities Vestora
    does not have.],
)

The last two rows are stated deliberately. Vestora records commitments; it does
not execute share instruments and does not perform regulatory onboarding. Both
are in §1.5.2 as out of scope and in §2.7 as constraints on any real
deployment. A comparison table in which the author's system wins every row is
not a comparison.

== Gap Analysis: Where Vestora Differs

Three gaps emerge from the comparison, and each maps to a contribution in §1.6.

+ *The small individual investor is unserved at the equity end.* Reward
  platforms accept small amounts but do not model a holding; equity platforms
  model a holding but exclude small amounts. Vestora occupies the intersection.

+ *The post-funding relationship is nobody's product.* Reward platforms end at
  fulfilment; equity platforms end at close. Milestones, updates and a durable
  portfolio view (§14.3, §14.6) are the platform's answer.

+ *Commitment state is modelled loosely across the field.* Where a platform
  displays a single funding figure, it is usually not distinguishing intention
  from settlement. The separation in §14.1, enforced structurally in §7.6, is
  the project's most transferable contribution — it is not specific to
  crowdfunding.

== Stakeholder Analysis

#figure(
  table(
    columns: (30mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Stakeholder], [Interest], [Influence on design]),
    [Founders], [Reach capital; spend minimum time on the platform.],
      [Submission must be short; reporting must be lightweight.],
    [Investors], [Find ventures; assess them; know where their money is.],
      [Discovery, evidence channels, and unambiguous commitment state.],
    [Administrators], [Keep the platform credible; act defensibly.],
      [Queues, decisive actions, and an audit trail (§14.5).],
    [Regulators], [Investor protection; market integrity.],
      [Recorded consent, auditability, and the scope boundary in §2.7.],
    [The platform], [Sustainable operation.],
      [A fee on settled transactions only (§2.6).],
  ),
  caption: [Stakeholders and how each shaped the design.],
)

== Business Model and Revenue Strategy

The platform earns a percentage fee on *settled* transactions, expressed in
basis points and held in configuration (§11.8).

Two properties follow from charging on settlement rather than on listing or on
commitment. First, incentives align: the platform earns only when a founder
actually raises, so there is no revenue in publishing ventures that will not
fund. Second, the fee is computed from the same settled-transaction set that
funding totals are derived from (§7.6) — revenue and funding cannot disagree,
because they are aggregations over the same rows.

The fee amount is stored per transaction rather than recomputed at read time.
This is a deliberate exception to the derive-don't-store rule elsewhere in the
system, and the reason is that the fee schedule is *time-varying*: recomputing a
historical transaction's fee under today's rate would silently rewrite what was
actually charged.

Alternatives considered: a listing fee, rejected because it charges founders
before any value is delivered and creates an incentive to publish
indiscriminately; and a subscription for investors, rejected because it is a
barrier at exactly the point the platform is trying to remove one.

== Legal and Regulatory Considerations

Equity crowdfunding sits inside a securities perimeter in most jurisdictions
@vismara2016. A deployment of this platform to real transactions would require, at
minimum:

- *Authorisation* appropriate to the jurisdiction for facilitating investment
  in unlisted securities.
- *Identity verification and anti-money-laundering checks* on both sides of a
  transaction.
- *Risk disclosure* to investors, with recorded acknowledgement.
- *Custody arrangements* for funds in transit and a defined treatment of
  failed raises.
- *Data protection* compliance for the personal data the platform holds.

None of the first four is implemented. This is stated as a boundary, not
minimised: the project is a software engineering exercise that models the
mechanics of the domain, and the regulatory surface is documented so that the
distance between this system and a deployable one is visible rather than
implied.

The design does not obstruct that distance being closed. Recorded consent,
auditability (§10.13) and the separation of commitment from settlement (§14.1)
are all preconditions for the compliance work, and were built as if it would
happen.

== Summary

Reward platforms solved discovery and abandoned the relationship. Equity
platforms modelled the relationship and abandoned the small investor. The
capability comparison in §2.3 locates Vestora at the intersection, and the gap
analysis in §2.4 states what it adds — with two rows, honestly, where it does
less.
