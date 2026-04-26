# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

DuitGee is a **collaborative expense tracker for couples (works solo too)** built on SvelteKit + Cloudflare Workers. Two value props drive every feature: **reduce misunderstanding and friction** between partners managing shared money, and **spot gaps in spending behavior** (creeping installments, dining-out drift, forgotten subscriptions).

Stack: SvelteKit on Cloudflare Workers; dual D1 databases (Better Auth on `duitgee-auth`, app data on `duitgee`); R2 for attachments; Workers AI for receipt scan + period insights.

**Read [`docs/internal/product.md`](docs/internal/product.md) before suggesting features or writing user-facing copy.** It captures the purpose, the two value props, who DuitGee is for (and isn't), and the hard product rules that derive from those.

## Hard rules

- **Never run DB migrations yourself.** Generate them with `pnpm run db:generate`, then stop and tell the user. Do not run `db:push`, `db:migrate`, or `wrangler d1 migrations apply`.
- **Always check role permission first, then plan entitlement** in handlers (see `docs/internal/architecture/permissions-and-plans.md`).
- **Plan philosophy: Pro enhances, Free is fully usable.** Never gate a core workflow. Gate scale/automation/depth, not basic functionality.
- **Charting is locked to `layerchart` via shadcn-svelte's Chart component.** Do not introduce a second chart library.
- **Statistics: server-side `GROUP BY` queries only** — never send raw expense lists to the client for client-side aggregation.
- **D1 has no transactions.** Use `client.batch([...])` for multi-step writes (especially fund operations).
- **Datetime: store UTC ISO 8601 with `Z` suffix.** Use `toISOString()` not `formatISO()` (the latter includes timezone offset).
- **Audit fields use string user IDs, no FK constraints** (microservice-friendly). Use helpers in `src/lib/server/utils/audit.ts`.
- **Notification helpers are best-effort** — never roll back the underlying action because notification delivery failed.
- **API: action-oriented RPC naming** (`getX`, `createX`, `deleteX`). GET for queries, POST for commands.
- **Always confirm with the user before destructive ops.** Never force-push to main, never `--no-verify`, etc.

## Common commands

### Dev / test / build
```sh
pnpm install
pnpm run dev                    # Dev server (add `-- --open` to open browser)
pnpm run test:unit              # vitest
pnpm run test:e2e               # playwright
pnpm run check                  # svelte-check (also `:watch`)
pnpm run build
pnpm run preview
pnpm run deploy                 # Build + deploy to Cloudflare
pnpm run cf-typegen             # Generate Worker types
wrangler deploy --env production
```

Test environments: client tests for `*.svelte.{test,spec}.{js,ts}` (Playwright/browser); server tests for everything else (Node).

### Database — generate only (user applies)
```sh
pnpm run db:generate            # Main DB migrations
pnpm run db:studio              # Drizzle Studio

# Auth schema (regenerate after Better Auth config changes)
pnpm dlx @better-auth/cli@latest generate --config ./better-auth.config.ts --output ./src/lib/server/db/better-auth-schema.ts
pnpm drizzle-kit generate --config=auth-drizzle.config.ts
```

### Seeding (user runs)
```sh
npx wrangler d1 execute duitgee --file=./seed/0001_setup_categories.sql
npx wrangler d1 execute duitgee-auth --file=./seed/auth/0001_add_admin.sql
# add `--remote --env production` for prod
```

## Architecture at a glance

- **Frontend**: Svelte 5 + SvelteKit, shadcn-svelte UI, Tailwind 4, sveltekit-superforms + Valibot for forms.
- **API**: Hono mounted at `src/routes/[...path]/+server.ts`. RPC + CQRS naming. OpenAPI at `/openapi.json`, Scalar UI at `/scalar`.
- **Auth**: Better Auth with `bearer()`, `admin()`, `organization()`, `anonymous()` plugins. Routes at `/api/auth/*`.
- **Hooks**: `setupServicesHandler` → `checkSessionHandler` in `src/hooks.server.ts`.
- **Two gating systems**:
  - Role permissions (per user per vault) via `requireVaultPermission()`
  - Plan entitlements (per vault, all members) via `requireVaultEntitlement()`
- **Platform**: Cloudflare Workers; D1 for both DBs; access env via `c.env` (Hono) or `event.platform.env` (SvelteKit).

## Detailed reference

Deep-dive docs live in `docs/internal/architecture/`:

- **API endpoints, RPC conventions, adding endpoints** → [`docs/internal/architecture/api.md`](docs/internal/architecture/api.md)
- **Database schema, audit pattern, datetime, data model, fund rules** → [`docs/internal/architecture/database.md`](docs/internal/architecture/database.md)
- **Vault permissions, plans, entitlements, plan design philosophy** → [`docs/internal/architecture/permissions-and-plans.md`](docs/internal/architecture/permissions-and-plans.md)
- **CSV import/export, Unidentified Expenses, Notifications, Statistics + AI Insights** → [`docs/internal/architecture/features.md`](docs/internal/architecture/features.md)
- **Frontend stack, Superforms, UI components, hooks, auth usage** → [`docs/internal/architecture/frontend.md`](docs/internal/architecture/frontend.md)

Read the relevant doc(s) before working on a task that touches that area — don't guess.

## Working with the codebase — quick map

- **Adding an API endpoint**: schema in `src/lib/schemas/[feature].ts`, handler in `src/lib/server/api/[module]/[action]Handler.ts`, route in `*-api.ts`, mount in `src/lib/server/api/index.ts`. Full tutorial in `api.md`.
- **Adding a form**: schema in `src/lib/schemas/`, server `+page.server.ts` with `superValidate()`, client `+page.svelte` with `superForm()` + `valibotClient()`. Full tutorial in `frontend.md`.
- **Adding a UI component**: `src/lib/components/ui/[name]/`, follow shadcn-svelte patterns. Template in `frontend.md`.
- **Schema change**: edit `src/lib/server/db/schema.ts`, run `pnpm run db:generate`, **stop**, hand off to the user.
- **Auth change**: edit `src/lib/server/better-auth/options.ts`, regenerate auth schema, generate migration, **stop**.

## Configuration files

- `drizzle.config.ts` — main DB
- `auth-drizzle.config.ts` — auth DB
- `better-auth.config.ts` — Better Auth (used in migrations)
- `svelte.config.js` — Cloudflare adapter
- `vite.config.ts` — Tailwind + test setup
- `playwright.config.ts` — E2E tests
- `wrangler.jsonc` — Cloudflare Worker config

Environment: the app expects `DATABASE_URL` (validated in `src/lib/server/db/index.ts`).
