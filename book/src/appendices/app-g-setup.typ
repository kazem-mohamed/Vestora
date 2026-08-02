#import "/lib/vestora.typ": *
#import "/lib/theme.typ": *

= Installation and Setup Guide <app:setup>

== Prerequisites

#figure(
  table(
    columns: (44mm, 1fr),
    align: (left + top, left + top),
    table.header([Requirement], [Notes]),
    [.NET SDK], [Matching the version pinned in the project file.],
    [Node.js and npm], [For the web application.],
    [SQL Server], [A local instance, or credentials for the hosted database.
      The project itself runs against the hosted instance (§16.3).],
    [Git], [To obtain the source.],
  ),
  caption: [Prerequisites.],
)

== Configuration

The application *will not start* without its required configuration (ADR-10,
§16.6). This is intentional: a system that starts with a placeholder signing key
is not degraded, it is compromised, and nothing indicates it.

Nothing below is committed to the repository. In development these values live
in the local user-secrets store; in production they are supplied by the hosting
platform's configuration.

#figure(
  table(
    columns: (52mm, 1fr),
    align: (left + top, left + top),
    table.header([Setting], [Purpose]),
    [Database connection string], [Reaches the SQL Server instance.],
    [Token signing key], [Signs access tokens. Must be a strong secret
      (§10.5).],
    [Token lifetimes], [Access and refresh validity; lockout threshold and
      window (§5.6).],
    [Payment provider selection], [`simulated` or `stripe`. Defaults to
      simulated (§11.9).],
    [Payment provider keys], [Required only when the provider is `stripe`.],
    [Webhook signing secret], [Verifies provider callbacks (§11.4).],
    [Platform fee], [Basis points (§2.6).],
    [SMTP host, port, credentials, sender], [Transactional mail (§5.9).],
    [Upload limits], [Maximum size and permitted content types (§10.12).],
    [Allowed origins], [Cross-origin allow-list (§10.11).],
  ),
  caption: [Required configuration. A missing value fails startup rather than
    defaulting.],
)

== Running the API

```bash
cd MyAppApi/MyAppApi
dotnet restore
dotnet ef database update     # applies all migrations (§7.7)
dotnet run
```

The API serves the interactive OpenAPI browser in development only (§9.8).

== Running the Web Application

```bash
cd Frontend/vestora
npm install
npm run dev
```

The client needs the API's base address in its own environment configuration.

== Verifying the Installation

Run these in order. Each one exercises a different part of the stack, so a
failure localises the problem.

+ *Health endpoint returns healthy.* Confirms the process is up *and* that it
  can reach the database — an application that is up but cannot reach its
  database is not healthy (§16.8).
+ *Register and verify an account.* Exercises the database, the token flow and
  SMTP.
+ *Create and approve a venture.* Exercises authorisation and the moderation
  pipeline.
+ *Commit and check out against the simulated provider.* Exercises the full
  funding chain (§11.3) without any external dependency.
+ *Open a conversation in two browsers.* Exercises the real-time hub, presence
  and read receipts (@ch:realtime).

== Common Problems

#figure(
  table(
    columns: (56mm, 1fr),
    align: (left + top, left + top),
    table.header([Symptom], [Cause]),
    [The application exits immediately at startup.],
      [A required setting is absent. This is ADR-10 working as designed; the
       log names the missing key.],
    [Sign-in fails with a valid password.],
      [The address is unverified (§10.3), or the account is locked after
       repeated failures (§10.7).],
    [Timestamps display incorrectly.],
      [Confirm the UTC converter is in the serialisation pipeline (§6.7). This
       defect is invisible when client and server share a timezone (§18.1).],
    [Webhook calls are rejected.],
      [The signing secret does not match, or a proxy has re-encoded the body —
       verification is over the raw bytes (§11.4).],
    [A migration fails on the shared database.],
      [It was applied by another developer. Pull before migrating (§18.5).],
  ),
  caption: [Common setup problems and their causes.],
)
