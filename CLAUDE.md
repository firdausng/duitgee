# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DuitGee is a SvelteKit application for expense tracking and vault management, deployed on Cloudflare Workers. It uses a dual-database architecture with separate databases for authentication and application data.

## Development Commands

### Local Development
```sh
pnpm install                    # Install dependencies
pnpm run dev                    # Start dev server
pnpm run dev -- --open          # Start dev server and open browser
```

### Testing
```sh
pnpm run test:unit              # Run unit tests (vitest)
pnpm run test:e2e               # Run e2e tests (playwright)
pnpm run test                   # Run all tests
pnpm run check                  # Type check with svelte-check
pnpm run check:watch            # Type check in watch mode
```

The project uses two separate test environments:
- **Client tests**: Browser environment using Playwright for `*.svelte.{test,spec}.{js,ts}` files
- **Server tests**: Node environment for all other test files, excluding client tests

### Database Management

**Main Database (duitgee)**
```sh
pnpm run db:generate            # Generate migrations from schema
pnpm run db:push                # Push schema changes to DB
pnpm run db:migrate             # Run migrations
pnpm run db:studio              # Open Drizzle Studio
wrangler d1 migrations apply "duitgee-app"                    # Apply migrations locally
wrangler d1 migrations apply "duitgee-ap" --remote --env production  # Apply to production
```

**Auth Database (duitgee-auth)**
```sh
# Generate auth schema from better-auth config
pnpm dlx @better-auth/cli@latest generate --config ./better-auth.config.ts --output ./src/lib/server/db/better-auth-schema.ts

# Generate and apply auth migrations
pnpm drizzle-kit generate --config=auth-drizzle.config.ts
wrangler d1 migrations apply "duitgee-app-auth"               # Local
wrangler d1 migrations apply "duitgee-app-auth" --remote --env production  # Production
```

**Seeding Data**
```sh
# Main database
npx wrangler d1 execute duitgee --file=./seed/0001_setup_categories.sql
npx wrangler d1 execute duitgee --remote --env production --file=./seed/0001_setup_categories.sql

# Auth database
npx wrangler d1 execute duitgee-auth --file=./seed/auth/0001_add_admin.sql
npx wrangler d1 execute duitgee-auth --remote --env production --file=./seed/auth/0001_add_admin.sql
```

### Build and Deployment
```sh
pnpm run build                  # Build for production
pnpm run preview                # Preview production build locally
pnpm run deploy                 # Build and deploy to Cloudflare
wrangler deploy --env production  # Deploy to production environment
pnpm run cf-typegen             # Generate Cloudflare Worker types
```

## Architecture

### Dual Database Architecture

The application uses **two separate SQLite databases** on Cloudflare D1:

1. **duitgee-auth**: Authentication database managed by Better Auth
   - Configuration: `auth-drizzle.config.ts`
   - Schema: `src/lib/server/db/better-auth-schema.ts` (auto-generated)
   - Contains users, sessions, organizations, teams

2. **duitgee**: Application database for business logic
   - Configuration: `drizzle.config.ts`
   - Schema: `src/lib/server/db/schema.ts`
   - Contains vaults, expenses, expense templates, funds, fund cycles, fund transactions

### Authentication System

Authentication is handled by **Better Auth** with the following plugins:
- `bearer()`: JWT bearer token authentication
- `admin()`: Admin role support
- `organization()`: Multi-tenant organizations with teams
- `anonymous()`: Anonymous user support with account linking

**Key Points:**
- Auth plugin configuration in `src/lib/server/better-auth/options.ts`
- Organization creation restricted to admin users
- Anonymous users can link accounts (vault migration handled in `onLinkAccount` hook)
- Auth routes exposed at `/api/auth/*` via Hono router

### API Architecture

The API is built using **Hono** framework and mounted to SvelteKit via catch-all route at `src/routes/[...path]/+server.ts`.

**API Structure:**
- Base router: `src/lib/server/api/index.ts`
- All routes prefixed with `/api`
- Authentication middleware checks session for all routes except `/api/auth/*`
- OpenAPI documentation at `/openapi.json`
- Scalar API reference at `/scalar`

**RPC-Style Endpoints with CQRS:**

The API follows RPC (Remote Procedure Call) style with CQRS (Command Query Responsibility Segregation) principles:
- **Queries** (read operations) use `GET` method with query parameters
- **Commands** (write operations) use `POST` method with JSON body
- Action-oriented naming (e.g., `getVaults`, `createExpense`, `acceptInvitation`)

**Current API Endpoints:**

*Vaults API:*
- `GET /api/getVaults` - Get user's vaults list
- `GET /api/getVault?vaultId=xxx` - Get single vault by ID with all members
- `POST /api/createVault` - Create a new vault
- `POST /api/updateVault` - Update an existing vault
- `POST /api/deleteVault` - Soft delete a vault

*Expenses API:*
- `GET /api/getExpenses?vaultId=xxx&page=1&limit=10` - Get expenses list with pagination/filters
- `GET /api/getExpense?vaultId=xxx&id=xxx` - Get single expense
- `POST /api/createExpense` - Create new expense
- `POST /api/createExpenses` - Create up to 20 expenses in one batch
- `POST /api/updateExpense` - Update an existing expense
- `POST /api/deleteExpense` - Soft delete an expense
- `GET /api/exportExpenses?vaultId=xxx&...` - Stream all expenses as CSV (free; gated by `expense:export`)
- `POST /api/previewImportExpenses` - Multipart `(vaultId, file)`; parses + validates a CSV without writing. Returns `{ importToken, totalRows, validRows, errors, newTagNames }`
- `POST /api/confirmImportExpenses` - JSON `{ vaultId, importToken, skipInvalid, rows }` echoed from preview; persists rows in 50-row batches stamped with `importBatchId`
- `POST /api/undoImportExpenses` - JSON `{ vaultId, importBatchId }`; soft-deletes every expense from a previous import

*Expense Templates API:*
- `GET /api/getExpenseTemplates?vaultId=xxx` - Get all expense templates for a vault
- `GET /api/getExpenseTemplate?vaultId=xxx&id=xxx` - Get single expense template
- `POST /api/createExpenseTemplate` - Create new expense template
- `POST /api/updateExpenseTemplate` - Update an existing expense template
- `POST /api/deleteExpenseTemplate` - Soft delete an expense template

*Invitations API:*
- `POST /api/createInvitation` - Invite user to vault
- `POST /api/acceptInvitation` - Accept vault invitation

*Funds API:*
- `GET /api/getFunds?vaultId=xxx` - Get all active funds for a vault (returns `Array<{ fund, activeCycle, policy }>`)
- `GET /api/getFund?vaultId=xxx&fundId=xxx` - Get a single fund with active cycle
- `GET /api/getFundCycles?vaultId=xxx&fundId=xxx` - Get cycle history (returns `{ cycles, historyAllowed }`)
- `GET /api/getPendingReimbursements?vaultId=xxx&fundId=xxx` - Get pending reimbursements for a fund (returns `{ fund, pendingReimbursements }`)
- `GET /api/getVaultPendingReimbursements?vaultId=xxx` - Get all pending reimbursements across all funds
- `POST /api/createFund` - Create a new fund
- `POST /api/updateFund` - Update fund name/description/color
- `POST /api/topUpFund` - Add balance to a fund (creates `top_up` transaction)
- `POST /api/settleReimbursements` - Mark pending reimbursements as settled for a specific fund
- `POST /api/settleVaultReimbursements` - Mark pending reimbursements as settled across all funds
- `POST /api/transferFunds` - Transfer balance between two funds in the same vault

**API Development Pattern:**

Each API module follows this structure:
1. Route definition file: `*-api.ts` (e.g., `expenses-api.ts`)
2. Handler files: `*Handler.ts` for each operation
3. Schema file: `src/lib/schemas/*.ts` for validation
4. Uses `hono-openapi` for route documentation
5. Uses `valibot` for request/response validation

**RPC Naming Conventions:**
- Action-oriented verbs: `get`, `create`, `update`, `delete`, `accept`, `send`, etc.
- Plural for collections: `getVaults`, `getExpenses`
- Singular for single items: `getVault`, `createExpense`, `acceptInvitation`
- GET for safe operations (no side effects, cacheable)
- POST for state changes (create, update, modify operations)

### Vault Permission System

The application implements a role-based access control (RBAC) system for vault operations.

**Vault Roles:**
- `owner`: Full control over the vault
- `admin`: Can manage vault and expenses but cannot delete vault
- `member`: Can only create expenses

**Permission Matrix:**

| Permission | Owner | Admin | Member |
|------------|-------|-------|--------|
| Create Expenses | ✅ | ✅ | ✅ |
| Edit Expenses | ✅ | ✅ | ❌ |
| Delete Expenses | ✅ | ✅ | ❌ |
| Manage Members | ✅ | ✅ | ❌ |
| Edit Vault | ✅ | ✅ | ❌ |
| Delete Vault | ✅ | ❌ | ❌ |

**Permission Utilities:**

Located in `src/lib/server/utils/vaultPermissions.ts`:

```typescript
// Get user's role in a vault
const role = await getUserVaultRole(userId, vaultId, env);

// Check if user has specific permission
const canEdit = await checkVaultPermission(userId, vaultId, 'canEditVault', env);

// Enforce permission (throws error if denied)
await requireVaultPermission(session, vaultId, 'canDeleteVault', env);
```

**Using Permissions in Handlers:**

All vault operation handlers should enforce permissions:

```typescript
export const updateVault = async (
    session: App.AuthSession,
    data: UpdateVaultRequest,
    env: Cloudflare.Env
) => {
    // Enforce permission check
    await requireVaultPermission(session, data.id, 'canEditVault', env);

    // Proceed with operation...
};
```

**Permission Types:**

Available permission keys (defined in `VaultPermissions` interface):
- `canCreateExpenses`: Create new expenses and expense templates
- `canEditExpenses`: Edit existing expenses and expense templates
- `canDeleteExpenses`: Delete expenses and expense templates
- `canViewExpenses`: View expenses and expense templates (all members have this)
- `canManageMembers`: Invite/remove vault members
- `canEditVault`: Update vault settings
- `canDeleteVault`: Soft delete the vault

### Database Schema and Audit Pattern

**Audit Fields:**
All tables include audit fields for tracking changes:
- `createdBy`, `createdAt`: Record creation tracking
- `updatedBy`, `updatedAt`: Update tracking
- `deletedBy`, `deletedAt`: Soft delete support

**Important:** Audit fields use string user IDs **without foreign key constraints** to support microservice architecture. Use the utility functions in `src/lib/server/utils/audit.ts`:
- `createAuditFields(context)`: For inserts
- `updateAuditFields(context)`: For updates
- `deleteAuditFields(context)`: For soft deletes
- `initialAuditFields(context)`: For initial creation (both create + update fields)

**Date Handling:**
All timestamps use ISO 8601 format with UTC timezone via `@date-fns/utc` and `date-fns`:
```ts
import { UTCDate } from "@date-fns/utc";
import { formatISO } from "date-fns";

// In schema defaults
createdAt: text('created_at').$defaultFn(() => formatISO(new UTCDate()))
```

### DateTime Handling

The application follows a **"Store UTC, Display Local"** pattern for all datetime operations:

- **Storage**: All dates are stored in UTC ISO 8601 format in the database
- **Display**: Dates are converted to user's local timezone for display and input
- **Library**: Uses `date-fns` for consistent datetime operations across client and server

**DateTime Utility Functions** (in `src/lib/utils.ts`):

```ts
import { format, parseISO, formatISO } from "date-fns";

/**
 * Convert UTC ISO string to local datetime-local format
 * Use: Loading server data into datetime-local inputs
 */
export const utcToLocalDatetimeString = (utcIsoString: string): string => {
    const date = parseISO(utcIsoString);
    return format(date, "yyyy-MM-dd'T'HH:mm");
};
// Example: "2025-12-08T10:30:00.000Z" → "2025-12-08T18:30"

/**
 * Convert local datetime-local string to UTC ISO format
 * Use: Sending form data to API
 */
export const localDatetimeToUtcIso = (localDatetime: string): string => {
    const date = new Date(localDatetime);
    return date.toISOString();
};
// Example: "2025-12-08T18:30" → "2025-12-08T10:30:00.000Z"
// IMPORTANT: Uses toISOString() not formatISO() to ensure 'Z' suffix

/**
 * Format Date object to local datetime-local format
 * Use: Setting default values in forms
 */
export const formatDatetimeLocal = (date: Date | string): string => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, "yyyy-MM-dd'T'HH:mm");
};
// Example: new Date() → "2025-12-08T18:30"
```

**Common Patterns:**

*Loading data from server for editing:*
```ts
// +page.server.ts
import { utcToLocalDatetimeString } from '$lib/utils';

const form = await superValidate({
    date: utcToLocalDatetimeString(expenseData.date)
}, valibot(schema));
```

*Submitting form data to API:*
```svelte
<!-- +page.svelte -->
<script>
import { localDatetimeToUtcIso } from '$lib/utils';

const payload = {
    ...form.data,
    date: localDatetimeToUtcIso(form.data.date)
};
</script>
```

*Setting default date/time in forms:*
```svelte
<script>
import { formatDatetimeLocal } from '$lib/utils';

// Set to current local time
if (!$form.date) {
    $form.date = formatDatetimeLocal(new Date());
}
</script>

<Input type="datetime-local" bind:value={$form.date} />
```

**Important Notes:**
- **Always convert** when crossing client-server boundary
- **datetime-local inputs** expect format: `YYYY-MM-DDTHH:mm` (no timezone)
- **API expects** ISO 8601 format with **'Z' suffix**: `YYYY-MM-DDTHH:mm:ss.sssZ`
- **Storage format** must use UTC with 'Z' suffix for consistency
- **Filter dates** for API queries also need conversion via `localDatetimeToUtcIso()`
- Use `date-fns` for parsing/formatting, but use **`toISOString()`** for UTC conversion (not `formatISO()`)
- **Critical**: `formatISO()` includes timezone offset (e.g., `+08:00`) while `toISOString()` always uses 'Z'

### Data Model

**Vaults:** Containers for expenses with access control
- Can be public (personal) or shared (team/organization)
- Creator and ownership tracking
- Support for team and organization association

**Expenses:** Individual expense records
- Required vault association (cascade delete)
- Optional user assignment (`paidBy` can be null for vault-level expenses)
- Category and payment type tracking
- Optional template association

**Expense Templates:** Reusable expense patterns
- Vault-scoped templates
- Default values for common expenses including fund (`defaultFundId`, `defaultFundPaymentMode`)
- Usage tracking (`usageCount`, `lastUsedAt`)

**Funds:** Named pools of money within a vault
- Vault-scoped, with `status` (`active` | `archived`)
- Tracks `balance` (cache), `color`, `icon`, `iconType`
- Replenishment policy: `replenishmentType` (`manual` | `fixed_amount` | `top_to_ceiling`), `replenishmentAmount`, `ceilingAmount`, `replenishmentSchedule`
- Linked to expenses via `fundId` and `fundPaymentMode` on the `expenses` table

**Fund Cycles:** Accounting periods for a fund
- One active cycle per fund at a time (`status`: `active` | `closed`)
- Aggregates: `topUpAmount`, `totalSpent`, `totalReimbursed`
- `openingBalance`, `closingBalance` (set on close)

**Fund Transactions:** Immutable ledger entries
- Types: `top_up`, `expense_paid`, `pending_reimbursement`, `reimbursement`, `expense_reversal`, `reimbursement_reversal`, `transfer_in`, `transfer_out`
- `pending_reimbursement` has `amount = 0` (no immediate balance change); settled later via `settleReimbursements`
- Linked to `cycleId` and optionally `expenseId`

**Key Fund Business Rules:**
- Deleting an expense with a fund tag reverses the fund transaction (see `detachFundFromExpense` in `fundExpenseHelpers.ts`)
- After settlement, `expense.fundPaymentMode` stays `pending_reimbursement` permanently — always check the actual `fundTransactions.type` from the DB, not the expense field
- D1 does not support transactions; use `client.batch([...])` for multi-step fund operations
- Schema column names: `topUpAmount` (not `totalTopUps`), `totalSpent` (not `totalExpenses`) — no transfer aggregate columns exist on `fundCycles`

**Fund UI Routes:**
- `/vaults/[vaultId]/funds` — Fund list
- `/vaults/[vaultId]/funds/new` — Create fund
- `/vaults/[vaultId]/funds/[fundId]` — Fund detail with active cycle stats
- `/vaults/[vaultId]/funds/[fundId]/edit` — Edit fund
- `/vaults/[vaultId]/funds/[fundId]/topup` — Top up fund
- `/vaults/[vaultId]/funds/[fundId]/reimbursements` — Pending reimbursements for one fund
- `/vaults/[vaultId]/funds/[fundId]/cycles` — Cycle history
- `/vaults/[vaultId]/reimbursements` — Cross-fund reimbursements (vault-level)
- `/vaults/[vaultId]/transfer` — Transfer between funds

### Plans & Entitlements System

The app has a **two-tier plan system** that gates fund features per vault. This is separate from the role-based permission system.

**Plans** (`src/lib/configurations/plans.ts`):

| Plan ID | Name | Included Entitlements |
|---------|------|-----------------------|
| `plan_free` | Free | `fund:create`, `recurring:create`, `expense:export` |
| `plan_pro` | Pro | All entitlements |

**Entitlement types** (`Entitlement` in `plans.ts`):
- `fund:create` — Create a fund (free + pro; limited to 1 on free)
- `fund:create_multiple` — Create more than one active fund per vault (pro)
- `fund:auto_replenishment` — Use `fixed_amount` or `top_to_ceiling` replenishment (pro)
- `fund:cycle_history` — View past fund cycles; free plan only sees the active cycle (pro)
- `fund:transfer` — Transfer balance between funds (pro)
- `fund:cross_fund_reimbursement` — View and settle reimbursements across all funds (pro)
- `recurring:create` — Create a recurring rule (free, capped at 5)
- `recurring:create_multiple` — Beyond the 5-rule cap (pro)
- `recurring:custom_interval` — Beyond daily/weekly/monthly/yearly (pro)
- `recurring:auto_generation` — Auto-generate recurring expenses (pro)
- `attachment:scan` — AI-powered receipt scanning (pro)
- `attachment:multiple` — Up to 20 attachments per expense (pro)
- `expense:export` — Download expenses as CSV (free + pro; data-out is a baseline trust feature)
- `expense:import` — Bulk-import expenses from CSV (pro)

**Storage:** Each vault has a `planId` column (default `'plan_free'`). No FK constraint — plan definitions live in code (`PLANS` array).

**Utility functions** (`src/lib/server/utils/entitlements.ts`):
```typescript
// In-memory lookup
getPlanById(id: string): Plan
hasEntitlement(planId: string, entitlement: FundEntitlement): boolean

// DB-backed checks
checkVaultEntitlement(vaultId, entitlement, env): Promise<boolean>   // returns true/false
requireVaultEntitlement(session, vaultId, entitlement, env): Promise<void>  // throws on failure
```

**Enforcement order in handlers:** always check role permission first, then entitlement:
```typescript
await requireVaultPermission(session, vaultId, 'canManageFunds', env);   // role gate
await requireVaultEntitlement(session, vaultId, 'fund:create', env);      // plan gate
```

**Subscription tiers** (`src/lib/configurations/subscriptions.ts`) — a *separate* system that limits how many vaults a user can create:
- `free`: max 1 vault
- `premium`: unlimited vaults

**Permissions vs. Entitlements at a glance:**

| | Role Permissions | Plan Entitlements |
|-|-----------------|------------------|
| Scope | Per user per vault | Per vault (all members) |
| Enforced by | `requireVaultPermission()` | `requireVaultEntitlement()` |
| Gates | CRUD actions by role | Feature availability by plan |
| Falls back to | Deny | `plan_free` |

### CSV Import / Export

The expenses module supports CSV export and import. Endpoints live in `src/lib/server/api/expenses/`; schemas in `src/lib/schemas/csv.ts`; CSV parser/serializer in `src/lib/server/utils/csv.ts` (papaparse-based).

**Endpoints:**
- `GET /api/exportExpenses` — streams a CSV via `ReadableStream` so the 128MB Worker heap is safe even on tens of thousands of expenses. Filters: `startDate`, `endDate`, `categoryName`, `memberIds`, `fundId`. Permission: any active vault member. Entitlement: `expense:export` (free).
- `POST /api/previewImportExpenses` — multipart `(vaultId, file)`. Parses + validates without writing. Returns `{ importToken, validRows, errors, newTagNames }`. Entitlement: `expense:import` (pro).
- `POST /api/confirmImportExpenses` — JSON body echoes the preview's normalized rows back. Auto-creates missing tags, then inserts expenses + tag assignments in `IMPORT_BATCH_SIZE` (=50) row batches. Stamps every row with `importBatchId` (the importToken).
- `POST /api/undoImportExpenses` — soft-deletes every expense with the given `importBatchId` for the vault.

**Hard limits** (in `src/lib/schemas/csv.ts`):
- `MAX_IMPORT_ROWS = 10_000` — files above this are rejected with guidance to split. Keeps imports under the 30s Worker CPU budget.
- `IMPORT_BATCH_SIZE = 50` — D1 has no cross-statement transactions; each batch is atomic but the import as a whole is not. On mid-import failure, prior batches are persisted; the response returns `{ success: false, importedCount, importBatchId, failedAtRow }` and the user can call `undoImportExpenses`.

**CSV column schema:**
`id, date, amount, category, paymentType, note, paidByEmail, tags (semicolon-joined), fundName, createdAt, createdBy`. Headers are stable. On import, `id`/`createdBy`/`fundName` are export-only and ignored. `paidByEmail` is resolved against active vault members (auth DB join); unknown emails error per row. Categories are looked up by name with case-insensitive match and fall through to free-form (matching `createExpense` behavior). Missing tags are auto-created on confirm.

**No duplicate detection on import** — re-importing the same file twice doubles your data. By design: expenses have no natural unique key, and hash-dedup risks silent loss when the dedup is wrong. Surface this clearly in import UIs.

**Storage:** `expenses.importBatchId` (text, nullable) — null on regular expenses, set on imported ones. Indexed by `(vaultId, importBatchId)` for fast undo.

### Plan Design Philosophy for New Features

**Core principle: Pro enhances, Free is fully usable.**

The free plan must never leave users stuck or frustrated. Every core workflow must be completable on free. Pro adds power-user capabilities, depth, and scale — not access to basic functionality.

**Decision framework when building a new feature:**

Ask: *"Can a free user accomplish their core goal without this?"*
- **Yes → Pro candidate.** Gate the advanced/scaled version, keep the basic version free.
- **No → Must be free.** Do not gate anything that would break a core workflow.

**What belongs on Free:**
- Creating, editing, viewing the primary resource (e.g., one fund, all expenses)
- The simplest version of any new workflow
- Anything a user needs to understand the value of the feature before upgrading
- Error states and recovery paths — never gate these

**What belongs on Pro:**
- Doing the same thing at scale (e.g., multiple funds, bulk operations)
- Automation and scheduling (e.g., auto-replenishment)
- Cross-entity aggregation (e.g., cross-fund reimbursements, vault-wide reports)
- Historical data depth (e.g., past cycles beyond the current one)
- Advanced configuration options that power users need

**UX rules when gating:**
- Always show the feature exists — never hide Pro features entirely
- Show a clear, friendly message explaining the plan requirement (not a generic error)
- Never gate viewing data the user already created — only gate creating or advanced manipulation
- If a Pro feature becomes unavailable (e.g., plan downgrade), degrade gracefully: show data read-only, do not delete it

**Adding a new entitlement:**
1. Define it in `src/lib/configurations/plans.ts` under `FundEntitlement` type and add it to `plan_pro.entitlements`
2. Use `requireVaultEntitlement()` in the write handler and `checkVaultEntitlement()` in read handlers where partial access applies
3. Free users should still reach the page/screen — gate the action, not the navigation

### SvelteKit Hooks

The application uses a sequence of server hooks in `src/hooks.server.ts`:

1. **setupServicesHandler**: Initializes platform services (database, auth) and sets up session
2. **checkSessionHandler**: Additional session validation (implementation in `src/lib/server/hooks/`)

Both hooks work together to ensure authenticated access and proper service initialization.

### Frontend

- **Framework**: Svelte 5 with SvelteKit
- **UI Framework**: shadcn-svelte
- **Styling**: Tailwind CSS 4 with plugins (@tailwindcss/forms, @tailwindcss/typography)
- **UI Components**: Located in `src/lib/components/ui/` (uses tailwind-variants, clsx, tailwind-merge)
- **Forms**: sveltekit-superforms with valibot validation
- **Utilities**: `src/lib/utils.ts` for common utilities (includes `cn()` for class merging)
- **Analytics**: PostHog integration

**Available UI Components** (in `src/lib/components/ui/`):
- `Button`: Primary UI button with variants (default, destructive, outline, secondary, ghost, link) and sizes
- `Input`: Form input with two-way binding support via `$bindable()`
- `Label`: Accessible form labels
- `Card`: Card container with sub-components (CardHeader, CardTitle, CardDescription, CardContent, CardFooter)
- `Separator`: Visual divider for content sections

**Component Usage:**
```svelte
import { Button } from "$lib/components/ui/button";
import { Input } from "$lib/components/ui/input";
import { Label } from "$lib/components/ui/label";
```

### shadcn-svelte
llm txt file - https://www.shadcn-svelte.com/llms.txt

### Forms and Validation

The application uses **sveltekit-superforms** with **Valibot** for type-safe form handling:

**Form Validation Pattern:**
1. Create validation schema in `src/lib/schemas/` using Valibot
2. Use schema on server-side with `superValidate()` in load functions and actions
3. Use schema on client-side with `superForm()` and `valibotClient()` adapter
4. Validation happens both client and server-side from the same schema

**Example Form Implementation:**

*Schema (`src/lib/schemas/register.ts`):*
```ts
import * as v from 'valibot';

export const registerSchema = v.object({
    firstName: v.pipe(
        v.string('First name is required'),
        v.minLength(1, 'First name is required')
    ),
    email: v.pipe(
        v.string('Email is required'),
        v.email('Please enter a valid email address')
    )
});

export type RegisterSchema = v.InferOutput<typeof registerSchema>;
```

*Server (`+page.server.ts`):*
```ts
import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { registerSchema } from '$lib/schemas/register';

export const load = async () => {
    const form = await superValidate(valibot(registerSchema));
    return { form };
};

export const actions = {
    default: async ({ request }) => {
        const form = await superValidate(request, valibot(registerSchema));
        if (!form.valid) {
            return fail(400, { form });
        }
        // Process form.data
        return { form, message: { success: true } };
    }
};
```

*Client (`+page.svelte`):*
```svelte
<script lang="ts">
    import { superForm } from 'sveltekit-superforms';
    import { valibotClient } from 'sveltekit-superforms/adapters';
    import { registerSchema } from '$lib/schemas/register';

    let { data } = $props();

    const { form, errors, enhance, delayed } = superForm(data.form, {
        validators: valibotClient(registerSchema)
    });
</script>

<form method="POST" use:enhance>
    <Input name="firstName" bind:value={$form.firstName} disabled={$delayed} />
    {#if $errors.firstName}
        <p class="text-destructive text-sm">{$errors.firstName}</p>
    {/if}
</form>
```

**Key Features:**
- `$form`: Form data store
- `$errors`: Field-level error messages
- `$delayed`: Loading state (true during submission)
- `enhance`: Progressive enhancement action
- Automatic two-way binding with form fields

### Configuration Files

- `drizzle.config.ts`: Main DB configuration (schema: `src/lib/server/db/schema.ts`)
- `auth-drizzle.config.ts`: Auth DB configuration (schema: `src/lib/server/db/better-auth-schema.ts`)
- `better-auth.config.ts`: Better Auth configuration (used in migrations)
- `svelte.config.js`: SvelteKit config with Cloudflare adapter
- `vite.config.ts`: Vite config with Tailwind and test setup
- `playwright.config.ts`: E2E test configuration

## Working with the Codebase

### Creating a New Form with Superforms

1. **Create validation schema** in `src/lib/schemas/[feature].ts`:
   ```ts
   import * as v from 'valibot';

   export const myFormSchema = v.object({
       name: v.pipe(v.string(), v.minLength(1, 'Required')),
       email: v.pipe(v.string(), v.email())
   });
   ```

2. **Set up server load and actions** in `+page.server.ts`:
   ```ts
   import { superValidate } from 'sveltekit-superforms';
   import { valibot } from 'sveltekit-superforms/adapters';

   export const load = async () => {
       const form = await superValidate(valibot(myFormSchema));
       return { form };
   };

   export const actions = {
       default: async ({ request, platform }) => {
           const form = await superValidate(request, valibot(myFormSchema));
           if (!form.valid) return fail(400, { form });

           // Process form.data here

           return { form, message: { success: true } };
       }
   };
   ```

3. **Create form UI** in `+page.svelte`:
   ```svelte
   import { superForm } from 'sveltekit-superforms';
   import { valibotClient } from 'sveltekit-superforms/adapters';

   const { form, errors, enhance, delayed } = superForm(data.form, {
       validators: valibotClient(myFormSchema)
   });

   <form method="POST" use:enhance>
       <Input bind:value={$form.name} disabled={$delayed} />
       {#if $errors.name}<p>{$errors.name}</p>{/if}
   </form>
   ```

### Adding a New API Endpoint

Follow these steps to add a new RPC-style endpoint:

1. **Create validation schemas** in `src/lib/schemas/[feature].ts`:
   ```ts
   import * as v from 'valibot';

   // For POST commands (body validation)
   export const createItemSchema = v.object({
       name: v.string(),
       // ... other fields
   });

   // For GET queries (query parameter validation)
   export const getItemQuerySchema = v.object({
       id: v.string(),
   });
   ```

2. **Create handler file** in `src/lib/server/api/[module]/[action]Handler.ts`:
   ```ts
   import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
   import { updateAuditFields } from '$lib/server/utils/audit';

   export const updateItem = async (
       session: App.AuthSession,
       data: UpdateItem,
       env: Cloudflare.Env
   ) => {
       const client = drizzle(env.DB, { schema });

       // Enforce permission check (for vault-scoped operations)
       await requireVaultPermission(session, data.vaultId, 'canEditExpenses', env);

       // Implementation with audit fields...
       const [updated] = await client
           .update(items)
           .set({
               ...data,
               ...updateAuditFields({ userId: session.user.id })
           })
           .where(eq(items.id, data.id))
           .returning();

       return updated;
   };
   ```

3. **Add route to API file** (e.g., `items-api.ts`) following RPC naming:
   ```ts
   import { Hono } from 'hono';
   import { describeRoute, resolver } from 'hono-openapi';
   import { vValidator } from '@hono/valibot-validator';

   export const itemsApi = new Hono<App.Api>()
       // Query: GET for read operations
       .get(
           '/getItems',
           describeRoute({ /* OpenAPI config */ }),
           vValidator('query', getItemsQuerySchema),
           async (c) => {
               const session = c.get('currentSession');
               const query = c.req.valid('query');
               // Call handler...
           }
       )
       // Command: POST for write operations
       .post(
           '/createItem',
           describeRoute({ /* OpenAPI config */ }),
           vValidator('json', createItemSchema),
           async (c) => {
               const session = c.get('currentSession');
               const data = c.req.valid('json');
               // Call handler...
           }
       );
   ```

4. **Mount the API** in `src/lib/server/api/index.ts`:
   ```ts
   .route('/', itemsApi)
   ```

5. **Apply audit fields** using utilities from `src/lib/server/utils/audit.ts`:
   - `initialAuditFields({ userId })` for new records
   - `updateAuditFields({ userId })` for updates
   - `deleteAuditFields({ userId })` for soft deletes

6. **Enforce permissions** (for vault-scoped operations):
   - Use `requireVaultPermission(session, vaultId, permission, env)` at the start of handlers
   - Throws error if user lacks required permission
   - See [Vault Permission System](#vault-permission-system) for available permissions

**Key Points:**
- Use action-oriented endpoint names (e.g., `/getItems`, `/createItem`, `/updateItem`)
- GET requests validate with `vValidator('query', schema)`
- POST requests validate with `vValidator('json', schema)`
- Always get session with: `const session = c.get('currentSession')`
- Enforce permissions for vault-scoped operations before proceeding
- Return consistent response format: `{ success: boolean, data?: any, error?: string }`

### Database Schema Changes

**IMPORTANT: Never run migrations yourself. Only generate them.**

1. Modify `src/lib/server/db/schema.ts`
2. Run `pnpm run db:generate` to create the migration file
3. **Stop here** — tell the user a migration was generated and they will apply it themselves
4. Do NOT run `db:push`, `db:migrate`, or any `wrangler d1 migrations apply` command

### Authentication Changes

1. Modify `src/lib/server/better-auth/options.ts` if changing auth config
2. Regenerate auth schema: `pnpm dlx @better-auth/cli@latest generate --config ./better-auth.config.ts --output ./src/lib/server/db/better-auth-schema.ts`
3. Generate migration: `pnpm drizzle-kit generate --config=auth-drizzle.config.ts`
4. Apply migration: `wrangler d1 migrations apply "duitgee-auth"`

**Server-Side Auth API Usage:**
```ts
import { authConfig } from '$lib/server/better-auth';

const auth = authConfig(platform.env);
const result = await auth.api.signUpEmail({
    body: { email, password, name }
});
```

**Client-Side Auth Usage:**
```ts
import { authClientBase } from "$lib/client/auth-client-base";

const authClient = authClientBase({ basePath: env.BASE_PATH });
await authClient.signUp.email({ email, password, name });
```

### Adding New UI Components

UI components follow shadcn-svelte patterns. All components are in `src/lib/components/ui/[component-name]/`:

1. Create component file: `[component-name].svelte`
2. Use `tailwind-variants` for variant styling
3. Export TypeScript types in module script
4. Support `$bindable()` for two-way binding where appropriate
5. Use `cn()` utility from `$lib/utils` for class merging
6. Create barrel export in `index.ts`

**Component Template:**
```svelte
<script lang="ts" module>
    import type { HTMLAttributes } from "svelte/elements";
    import type { WithElementRef } from "$lib/utils.js";

    export type MyComponentProps = WithElementRef<HTMLAttributes<HTMLDivElement>>;
</script>

<script lang="ts">
    import { cn } from "$lib/utils.js";

    let { class: className, ref = $bindable(null), children, ...restProps }: MyComponentProps = $props();
</script>

<div bind:this={ref} class={cn("base-classes", className)} {...restProps}>
    {@render children?.()}
</div>
```

### Environment Variables

The application expects `DATABASE_URL` environment variable for database connection. This is validated in `src/lib/server/db/index.ts`.

### Cloudflare Platform

- Application runs on Cloudflare Workers
- Uses Cloudflare D1 for databases
- Platform context available via `event.platform` in hooks and `platform` parameter in API handlers
- Access environment via `c.env` in Hono handlers or `event.platform.env` in SvelteKit
