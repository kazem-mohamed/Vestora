#import "/lib/vestora.typ": *
#import "/lib/theme.typ": *

= Deployment and Operations <ch:deployment>

This chapter covers getting the system running and keeping it running. The two
are treated together because separating them produces documentation that
explains how to deploy and not how to operate — which is the more common failure
of the two.

== Environment Strategy

#figure(
  table(
    columns: (26mm, 1fr, 1fr),
    align: (left + top, left + top, left + top),
    table.header([Environment], [Purpose], [Payment provider]),
    [Development], [Local machines. Runs against the shared hosted database
      (§16.3).], [Simulated],
    [Staging], [Pre-release verification against a production-like
      configuration.], [Simulated or Stripe sandbox],
    [Production], [The deployed system.], [Configured; simulated by default],
  ),
  caption: [Environments and their payment configuration.],
)

Environments differ only by configuration. There is no code path conditioned on
the environment name, because a system that behaves differently in production
than in staging has not been tested in staging.

== Hosting Architecture

The API and the real-time hub deploy as a single artefact to a managed ASP.NET
Core host. The web application deploys separately. The database is a managed SQL
Server instance on the same provider.

There is one instance of each. No load balancer, no autoscaling, no read
replica. §17.7 identifies which of those would be needed first and at what
point; describing an architecture the project does not have would be worse than
describing a small one accurately.

*The hub is co-located with the API deliberately.* It shares the authentication
pipeline and the data context (§12.1), and separating it would require a
backplane the hosting arrangement does not provide (§12.7).

== Database Hosting and Connection Security

The database is hosted rather than self-administered. The connection string
carries credentials and is supplied by environment configuration only — it
appears in no file in the repository, and the application refuses to start
without it (§16.6).

The consequence for development is discussed as a challenge in §18.5: there is
no local database, so all developers share one schema. This is convenient and
carries a real cost, and it is recorded as a limitation rather than as a
practice.

== Build and Release

The release sequence is:

+ Apply any pending migrations against the target database (§7.7).
+ Build and publish the API artefact.
+ Build the web application.
+ Deploy both.
+ Run the API test collection against the deployed environment as a smoke check
  (§15.4).

Migrations run *before* the application that depends on them, and additive
migrations (§7.7) are what make this ordering safe: a schema with a new nullable
column is compatible with the previous application version, so the two steps do
not have to be simultaneous.

*Continuous integration.* There is none. Builds and deployments are performed
manually against a checklist (§16.11). This is a genuine gap — automated builds
on every change would have caught several integration failures earlier — and it
is recorded in §19.4. The hosting arrangement provides no managed CI, and
introducing an external runner was judged out of scope against the schedule.

== Configuration Management

All environment-varying values are configuration, never constants. This is a
rule with no exceptions, and the categories are:

#figure(
  table(
    columns: (44mm, 1fr),
    align: (left + top, left + top),
    table.header([Category], [Examples]),
    [Connection], [Database connection string.],
    [Identity], [Token signing key, access and refresh lifetimes, lockout
      threshold and window (§5.6).],
    [Payments], [Provider selection, provider keys, webhook signing secret,
      platform fee in basis points, checkout expiry (§11.9).],
    [Email], [SMTP host, port, credentials, sender identity (§5.9).],
    [Uploads], [Maximum size, permitted content types (§10.12).],
    [Origins], [The allowed cross-origin list (§10.11).],
  ),
  caption: [Configuration categories. Every value here differs by environment
    or is a secret.],
)

The reason this is a rule rather than a preference: a value compiled into the
application cannot be changed without a release, which means an urgent change —
tightening a lockout threshold under attack, disabling a provider — requires a
deployment at exactly the moment a deployment is least welcome.

== Secrets Management

Secrets are never committed. They are supplied by the platform's own
configuration mechanism in production and by the local user-secrets store in
development, so that a working development machine holds secrets outside the
repository directory entirely.

#adr(
  "10",
  "Fail to start on a missing secret rather than falling back",
  background: [A missing signing key or provider secret can be defaulted to a
    placeholder so the application starts. The application then runs with a
    known key, or silently accepts unverified webhooks.],
  decision: [Validate required configuration at startup and refuse to start when
    any is absent.],
  consequences: [A misconfigured deployment fails loudly and immediately instead
    of running insecurely. The cost is that a first-time setup must supply
    every secret before the application will run at all — which is the correct
    inconvenience.],
)

That decision is the difference between a misconfiguration being a visible
outage and being a silent vulnerability. An application that starts with a
default signing key is not degraded; it is compromised, and nothing indicates
it.

== Logging

Logging is structured and levelled. Levels are used for their meaning:
`Information` for lifecycle events, `Warning` for handled conditions that
should not recur, `Error` for unhandled failures.

*What is never logged.* Passwords, tokens, connection strings, provider secrets,
and full request bodies on authentication endpoints. A log stream is frequently
the least protected copy of the data a system holds.

*What is logged beyond the stream.* Security-relevant and administrative events
are written to durable tables — `SecurityLog` and `AdminAuditLog` (§10.13) —
because a log stream is not queryable evidence and, on this hosting
arrangement, is not retained indefinitely.

== Monitoring and Health Checks

A health endpoint reports whether the application is running and whether it can
reach the database. This distinction matters: an application that is up but
cannot reach its database is not healthy, and an endpoint that reports only
process liveness would say it is.

*What is monitored.* Application availability through the health endpoint, and
database availability through it.

*What is not monitored.* There is no metrics pipeline, no request-rate or
latency dashboard, and no distributed tracing. Performance figures in
@ch:performance come from deliberate measurement runs rather than from
continuous collection.

This is the weakest area of the project's operational posture and it is stated
plainly. The hosting arrangement provides limited observability (§5.11), and
building a metrics pipeline was traded against delivering the domain. §19.4
records it.

== Error Reporting

Unhandled exceptions are caught centrally, logged with full detail, and returned
to the client as a generic failure carrying a correlation identifier. The
identifier is the useful part: a user reporting a problem can quote it, and it
locates the exact log entry without the response body having disclosed anything
(§10.11).

There is no automated alerting. Failures are discovered by inspection or by
report. Recorded in §19.4.

== Backup, Rollback and Recovery

/ Database backup: The provider performs scheduled backups with point-in-time
  restore inside its retention window. This is a dependency, not an
  implementation, and the project's obligation is to know its bounds (§7.8).

/ Schema recovery: Fully reproducible from the migration history in version
  control. An empty instance plus migrations yields the current schema.

/ Application rollback: Redeploy the previous artefact. Safe only when no
  migration has been applied since; a migration that dropped or renamed a
  column would make the previous version incompatible. This is why additive
  migrations are preferred (§7.7) — they keep rollback available.

/ Uploaded files: Not backed up. Images, documents and attachments live outside
  the database and have no backup arrangement. This is a real gap, recorded in
  §7.8 and §19.4.

== Release Checklist

Because releases are manual (§16.4), they follow a written checklist rather than
recollection.

#plate(label: "Pre-release")[
  1. All tests pass locally.
  2. Pending migrations reviewed — confirm each is additive, or plan for the
     loss of rollback.
  3. Configuration diff reviewed; any new required setting present in the
     target environment.
  4. New secrets provisioned before deployment, not after (§16.6).
]

#plate(label: "Release")[
  5. Apply migrations to the target database.
  6. Deploy the API artefact.
  7. Deploy the web application.
]

#plate(label: "Post-release")[
  8. Health endpoint returns healthy, including database reachability.
  9. API smoke collection passes against the deployed environment (§15.4).
  10. Sign-in, venture listing and a checkout against the simulated provider
      verified by hand.
  11. Error log inspected for anything new.
]

Step 4 exists because it has been forgotten. A deployment that starts before its
secrets are in place fails at startup by design (ADR-10) — which is the correct
behaviour and an avoidable outage.
