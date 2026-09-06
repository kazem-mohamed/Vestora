#import "/lib/vestora.typ": *
#import "/lib/theme.typ": *

= Conclusion and Future Work <ch:conclusion>

== Summary of Contributions

This project set out to connect early-stage founders with individual investors,
and to remain correct about money and about state while doing it. §19.1 assesses
the seven objectives; this section states what the work contributes beyond
having met them.

*A state model that separates moderation from commerce.* A venture carries
administrative status, operational lifecycle and commercial stage as
independent fields with disjoint writers. The general form of the finding is not
specific to crowdfunding: *a field written by two actors for two reasons is two
fields*, and collapsing them destroys information at the moment a second actor
acts. §14.2 reproduces the five-step sequence in which a single column silently
erases funding progress.

*A derived-funding integrity model.* No column stores what a venture has raised.
Totals are computed from settled transactions through one service, and duplicate
settlement is prevented by a database constraint rather than by an application
check. The consequence is that an approved commitment is structurally distinct
from a funded one — which is the property that stops a platform reporting
progress no money supports.

*A provider-independent payment layer.* Domain rules sit above the provider
interface, which carries transport only. This is what makes the simulated
provider a legitimate test surface rather than a stand-in, and it is why the
funding logic could be verified without a merchant account.

*A working system.* Twenty-five API controllers over a relational model of more
than forty entities, a React front end of sixty-five routes, and a versioned
migration history that records how the schema arrived at its present shape.

*A document that says what it does not do.* The previous version of this
document (§1.2) claimed scalability, security and performance without evidence.
This one states its limitations in §19.4, marks unmeasured figures rather than
estimating them, and includes two rows in its own competitor comparison where
the platform loses. That is a contribution to the work's credibility, and it was
a deliberate change of standard.

== Lessons Learned

=== Technical

*If the model permits a defect, fixing the instance leaves the class.* The two
most expensive problems in the project — approval counting as funding, and
re-approval resetting commercial stage — presented as handler bugs and were
model defects. Patching either would have moved the symptom.

*Correct at rest is not correct on the wire.* Storage, serialisation and display
are three separate correctness surfaces. The timestamp defect in §18.1 passed
the first and failed the second, and was invisible in every environment where
the two agreed.

*An architectural boundary's value is unknown until it is tested.* The API
boundary was built for ordinary reasons and paid for itself when the entire
frontend was replaced without a business rule moving (§18.4).

*Constraints outperform conventions.* Four business rules in this system are
unique indexes (§7.5). Each could have been an application check, and each would
then have had a race.

=== Process

*Written scope is kept scope.* The out-of-scope list in §1.5.2 was written down,
and it held. Boundaries that live only in conversation do not.

*Record decisions when they are made.* The Architecture Decision Records in this
document were reconstructed from commit history months later (§18.8). They are
accurate and they cost several times what they would have cost at the time.

*Sequence security before surface.* Authentication hardening came after the
investment pipeline (§3.2). Retrofitting authorisation across an existing
endpoint surface cost more than building it in would have.

*A risk register is only useful if it contains likely risks.* Five of six
identified risks materialised (§3.7). That is what an honest register looks
like.

=== Personal

The team ends the project able to speak to two frontend frameworks from
experience rather than from documentation (§5.3); to explain why a payment
webhook must be signature-verified over the raw body, in constant time, before
any state change (§11.4); and to recognise a two-meanings-one-field defect on
sight, having paid for it twice.

== Future Work

Ordered by what should be done first, and why. The first three are corrections
of stated limitations; the remainder are extensions.

#figure(
  table(
    columns: (10mm, 1fr, 24mm, 1fr),
    align: (center + top, left + top, center + top, left + top),
    table.header([], [Work], [Addresses], [Why this position]),

    [1],
    [Operate the Stripe path against a live merchant account: real
     authorisation, disputes, settlement timing.],
    [§19.4, §11.9],
    [The single largest gap between this system and a deployable one. Every
     other extension is less valuable until money can actually move.],

    [2],
    [Identity verification and anti-money-laundering onboarding.],
    [§2.7],
    [Legally prerequisite to item 1 in any real deployment. Sequenced second
     only because item 1 is what proves the rest of the system.],

    [3],
    [Continuous integration, automated alerting and an observability
     pipeline.],
    [§16.4, §16.8, §16.9],
    [The operational floor. Items 4 onward add surface that cannot be safely
     operated without this.],

    [4],
    [Backplane for presence and a durable notification queue.],
    [§12.7, §17.7],
    [The first change that unlocks horizontal scaling. Must precede any second
     instance.],

    [5],
    [Object storage for uploads, behind a content delivery network.],
    [§7.8],
    [Closes the backup gap and removes file serving from the application.],

    [6],
    [Notification preferences and email digests.],
    [§13.7],
    [The most-requested absent feature; currently every notification is
     delivered in-app to every eligible recipient.],

    [7],
    [Non-image message attachments.],
    [§12.5],
    [A stated scope limitation with a clear path — the upload security controls
     of §10.12 already generalise.],

    [8],
    [Secondary transfer of a commitment between investors.],
    [§1.5.2],
    [A substantial domain extension. Requires items 1 and 2 first.],

    [9],
    [Assisted discovery: recommendation over the interaction history the
     platform already records.],
    [§13.3],
    [Deliberately last. Ranking is currently deterministic and explicable
     (§13.3), which was a requirement rather than a limitation. Any learned
     ranking must remain explicable to a founder who asks why their venture
     appears where it does — and there is not yet enough interaction history to
     learn from.],
  ),
  caption: [Future work, ordered by dependency and value.],
)

Item 9 is placed last deliberately, and the reason is a design position rather
than a schedule constraint. This platform's premise is that discovery should
depend on the venture rather than on privilege. An opaque ranking model
reintroduces exactly the unexplainable advantage the project set out to remove,
and adding one before it can be made explicable would undo the contribution in
§20.1.

== Closing

The problem this project addressed is not that capital is scarce or that ideas
are scarce. It is that the mechanism connecting them is networked, opaque and
ends at the transaction.

Vestora is one answer to that: a platform where a venture can be found on its
attributes, where an investor can see evidence rather than claims, where the
difference between an intention and a payment is never blurred, and where the
relationship continues after the money moves.

What is built works, within the limits §19.4 sets out. What is not built is
listed rather than implied. Both statements are part of the same claim to have
done this properly.
