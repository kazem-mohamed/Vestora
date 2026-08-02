# Vestora — Frontend

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4.

```bash
npm install && npm run dev
```

Runs on <http://localhost:3000>. Needs the API on `http://localhost:5078` — set in `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:5078
```

## Documentation

All project documentation lives at the repository root, in [`../../docs/`](../../docs/):

| | |
|---|---|
| [`06-FRONTEND.md`](../../docs/06-FRONTEND.md) | **Start here** — routes, components, state, design system, i18n, motion, gotchas |
| [`07-SETUP.md`](../../docs/07-SETUP.md) | Running the full stack, secrets, email, Stripe, troubleshooting |
| [`04-API-REFERENCE.md`](../../docs/04-API-REFERENCE.md) | Every endpoint this app consumes |
| [`05-BUSINESS-RULES.md`](../../docs/05-BUSINESS-RULES.md) | Rules that must not break |
| [`08-CONVENTIONS.md`](../../docs/08-CONVENTIONS.md) | How to add a feature end to end |

See also [`AGENTS.md`](AGENTS.md) — this Next.js version differs from most training data; read the relevant guide in `node_modules/next/dist/docs/` before relying on an API.

## Scripts

```bash
npm run dev
```
```bash
npm run build
```
```bash
npm run lint
```
