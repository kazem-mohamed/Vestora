# AGENTS.md — rules for AI models working on Vestora

Read this first. Then read `docs/` — start with `docs/01-OVERVIEW.md`.
**Do not trust your training data about this codebase.** Verify against the source.

---

## What this project is

A two-sided funding platform. Founders (`Innovator`) publish ventures; investors (`Investor`) request to back them; founders approve, negotiate in a deal room, then request the agreed money; the investor pays in a **sandbox**. Admins moderate and reconcile.

```
MyAppApi/MyAppApi/     .NET 8 Web API · EF Core · SQL Server · SignalR
Frontend/vestora/      Next.js 16 · React 19 · TypeScript · Tailwind v4
docs/                  the documentation set
```

---

## Where the truth lives

| Question | File |
|---|---|
| What does this word mean? | `docs/01-OVERVIEW.md` §3 (glossary) |
| How is the system wired? | `docs/02-ARCHITECTURE.md` |
| What columns/constraints exist? | `docs/03-DATA-MODEL.md` |
| What endpoints exist? | `docs/04-API-REFERENCE.md` |
| **What rules must not break?** | **`docs/05-BUSINESS-RULES.md`** ← read before any money/permission change |
| Routes, components, design system? | `docs/06-FRONTEND.md` |
| How do I run it? | `docs/07-SETUP.md` |
| How do I add a feature? | `docs/08-CONVENTIONS.md` |
| What is missing? | `docs/09-STATUS.md` |
| What can each role actually do? | `docs/10-ROLES-AND-CAPABILITIES.md` |
| How does one investment go end to end? | `docs/11-INVESTMENT-FLOW.md` |

**Code source-of-truth files** — read these directly before changing related behaviour:

- `Services/FundingMath.cs` — every monetary figure in the product
- `Services/PipelineStages.cs` — the relationship stages
- `Services/AccountRules.cs` ↔ `Frontend/vestora/src/lib/validation/rules.ts` — validation, **mirrored, keep in sync**
- `Data/AppDbContext.cs` — relationships, indexes, query filters
- `Services/Payments/PaymentService.cs` — the funding lifecycle
- `Frontend/vestora/src/lib/types/api.ts` — the type contract
- `Frontend/vestora/src/lib/api/client.ts` — the only HTTP transport

---

## Non-negotiable rules

1. **Money vocabulary.** `Interest` ≥ `Committed` ≥ `Funded`. Founder approval is **committed**, never "raised". Only a `Succeeded` `PaymentTransaction` is **funded**.
2. **Never compute a funding figure outside `FundingMath`.**
3. **`Investment.Status` and `Investment.Stage` are different axes.** Status = funding gate. Stage = what is happening between two people. Do not merge them.
4. **Role checks are not ownership checks.** Add both.
5. **Payments: record the `PaymentEvent` before applying any effect.** Terminal transaction rows are immutable — a retry is a new row.
6. **`DateTime.UtcNow` only.** Every persisted date is UTC; new serializers must register `UtcDateTimeConverter`.
7. **Every money column needs `HasPrecision(18, 2)`.**
8. **Never claim what the platform cannot prove.** No "Verified" badge, no trust score. Copy says "reviewed", never "vetted".
9. **Never delete a relationship row on decline.** Set `Status` and `Stage` to `Declined`.
10. **Payments are sandbox-only.** The app refuses to start on a non-`sk_test_` Stripe key. Do not remove that check.
11. **Frontend: no `fetch` outside `lib/api/`. No hardcoded strings — use `t()`. No physical CSS directions — use logical ones.**
12. **Secrets never go in a committed file.** `appsettings.json` holds empty placeholders on purpose.

---

## Working style expected here

- **Match the surrounding code.** No Clean Architecture, no repositories — controllers talk to `AppDbContext` directly. Services exist only for auth and payments. Do not introduce new patterns.
- **Surgical changes.** Touch only what the task requires. Do not reformat, rename, or "improve" adjacent code.
- **The doc comments in this codebase explain *why*.** Read them; they are the design rationale, not noise. Keep that density when you add code near them.
- **Next.js 16 has breaking changes** vs. most training data. See `Frontend/vestora/AGENTS.md`. Check `node_modules/next/dist/docs/` before relying on an API.
- **The database is remote and shared.** Never run `dotnet ef database update` without saying so.
- **The test suite covers the domain layer only** — 48 xUnit tests over `FundingMath` and `PipelineStages` (`cd MyAppApi && dotnet test MyAppApi.Tests/MyAppApi.Tests.csproj`). There are **no** integration, authorisation, payment or end-to-end tests. A green run proves the arithmetic and the stage vocabulary, nothing else. State how you verified a change; do not claim it works if you did not run it.
- **The project is under git**, with history pushed to GitHub (`origin/main`). Branch or commit before a large deletion — `git` is the only undo there is.

---

## Before you report a change as done

- [ ] Any funding number computed outside `FundingMath`?
- [ ] Any new endpoint missing an ownership check?
- [ ] Any payment mutation before the `PaymentEvent` insert?
- [ ] Any rule changed in `AccountRules.cs` without mirroring `rules.ts` (or vice versa)?
- [ ] Any DTO changed without updating `lib/types/api.ts`?
- [ ] Any new visible string missing from both `en` and `ar` dictionaries?
- [ ] Any physical CSS direction (`ml-`, `left-`) that breaks RTL?
- [ ] Did `dotnet build`, `dotnet test` and `npm run build` all pass?
- [ ] Did you change a funding figure or a pipeline stage without adding the case to `MyAppApi.Tests`?
