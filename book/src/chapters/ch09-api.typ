#import "/lib/vestora.typ": *
#import "/lib/theme.typ": *

= API Design and Implementation <ch:api>

== REST Principles Applied

The API is REST in the sense that matters practically: resources have stable
addresses, HTTP verbs carry meaning, and status codes are used for their defined
purpose rather than as decoration on a body that always says `success: true`.

It is not REST in the hypermedia sense. Responses do not carry links describing
available transitions, because the only client is one the team also writes and
the indirection would buy nothing.

Four rules are applied consistently:

+ *Verbs mean what they mean.* `GET` never changes state. `POST` creates or
  performs an action. `PUT` and `PATCH` update. `DELETE` removes.
+ *Status codes are load-bearing.* `200` succeeded, `201` created, `204`
  succeeded with nothing to say, `400` the request was malformed, `401` no
  valid identity, `403` valid identity without permission, `404` no such
  resource, `409` a state conflict, `422` semantically invalid.
+ *The distinction between `401` and `403` is preserved.* Conflating them
  destroys the client's ability to decide between re-authenticating and showing
  a refusal.
+ *Resources are nouns, actions are sub-resources.* An action that is not a
  create or an update on the resource itself becomes a named sub-path rather
  than a verb in a query string.

== Resource Modelling and URI Design

Resources follow the domain, not the tables. `FundingRequest` and
`PaymentTransaction` are separate entities (§11.1) but are not separately
addressable: a client opens a checkout on an *investment*, and the chain behind
it is an implementation detail.

#figure(
  table(
    columns: (52mm, 1fr),
    align: (left + top, left + top),
    table.header([Pattern], [Use]),
    [`/projects`], [Collection: list, filter, search, create.],
    [`/projects/{id}`], [A single venture.],
    [`/projects/{id}/updates`], [A sub-collection owned by the venture.],
    [`/projects/{id}/support`], [An action on the venture that is not a create
      on it.],
    [`/payments/webhook/stripe`], [A provider callback. Deliberately outside
      the resource tree — it is not a client-facing resource.],
  ),
  caption: [URI patterns and what each is for.],
)

Twenty-two controllers group these by area — authentication, projects,
investors, capital, payments, messages, notifications, follows, bookmarks,
engagement, deal room, reports, feed, signals, insights, founder and investor
dashboards, and three administrative areas covering moderation, revenue and
general administration. The full endpoint listing is in @app:api.

== Request and Response Contracts

*No entity is ever serialised directly.* Every boundary uses a data transfer
object, and this is a rule with no exceptions in the codebase.

Two reasons. First, a schema change would otherwise silently alter the public
contract — adding a column would add a field to every response that touches
that table. Second, entities carry navigation properties, and serialising one
either drags an object graph into the response or throws on a cycle.

DTOs are also where over-fetching is prevented. A venture card needs eight
fields; the entity has forty. The listing query projects into the card DTO in
the database rather than materialising entities and mapping them in memory
(§6.6).

== Validation Strategy

Validation has two layers with a clear division:

/ Structural, at the boundary: Is a required field present, is an amount
  positive, is an email shaped like an email. Declarative, runs before the
  controller body, and produces a `400` with a field-level error map. A service
  never sees a structurally invalid request.

/ Domain, in the service: Is this venture open to investment, is this
  transition permitted from the current stage, is this investor allowed to
  commit here. These depend on state a validator cannot see, and produce a
  `409` or `422` rather than a `400` — the request was well-formed, the world
  disagreed.

Collapsing these two would push database reads into the validation layer and
make error semantics ambiguous.

== Error Handling and Result Shaping

Every failure returns the same shape, so a client has one parser rather than
one per endpoint. Expected failures are carried by the service result object
(§6.5) and translated by a single shared extension; unexpected ones are caught
centrally, logged with detail, and returned without it.

#figure(
  ```cs
  // Outcome-to-HTTP mapping exists once for the whole API rather than
  // being re-decided in each of the twenty-two controllers.
  var result = await _projects.PublishAsync(id, userId, ct);
  return result.ToActionResult(this);
  ```,
  caption: [Uniform result translation at the controller seam.],
)

The internal detail of an exception never reaches the client. An error response
is an information disclosure surface (§10.11), and a stack trace in a response
body tells an attacker the framework, the version and the call path.

== Pagination, Filtering and Sorting

Every collection endpoint is paged. There is no endpoint that returns an
unbounded list, because such an endpoint is a denial-of-service surface that
grows with the platform's success.

Paged responses carry the items, the total count, the page and the page size,
so a client can render a pager without a second request. The page size is
capped server-side — a client asking for ten thousand rows receives the maximum,
not ten thousand.

Filtering and sorting are allow-listed. A sort field arriving from a client is
matched against a permitted set rather than interpolated into a query, which
closes the injection surface that dynamic ordering otherwise opens.

== API Documentation

The API is described by an OpenAPI document generated from the code and served
through an interactive browser in development. Generation from source rather
than hand-maintenance is the point: a hand-written specification is wrong the
moment a signature changes, and a specification nobody trusts is worse than
none.

The document is disabled outside development. An interactive schema browser is
a complete map of the attack surface, and there is no reason to publish one.

The full endpoint listing in @app:api is derived from the same source, so the
appendix and the running system cannot disagree.
