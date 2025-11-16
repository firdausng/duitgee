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
wrangler d1 migrations apply "duitgee"                    # Apply migrations locally
wrangler d1 migrations apply "duitgee" --remote --env production  # Apply to production
```

**Auth Database (duitgee-auth)**
```sh
# Generate auth schema from better-auth config
pnpm dlx @better-auth/cli@latest generate --config ./better-auth.config.ts --output ./src/lib/server/db/better-auth-schema.ts

# Generate and apply auth migrations
pnpm drizzle-kit generate --config=auth-drizzle.config.ts
wrangler d1 migrations apply "duitgee-auth"               # Local
wrangler d1 migrations apply "duitgee-auth" --remote --env production  # Production
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
   - Contains vaults, expenses, expense templates

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

**Current API modules:**
- `/api/vaults`: Vault management (create, get, list)
- `/api/vaults/:vaultId/expenses`: Expense management (create, get, list with pagination/filters)

**API Development Pattern:**
Each API module follows this structure:
1. Route definition file: `*-api.ts` (e.g., `expenses-api.ts`)
2. Handler files: `*Handler.ts` for each operation
3. Schema file: `src/lib/server/schemas/*.ts` for validation
4. Uses `hono-openapi` for route documentation
5. Uses `valibot` for request/response validation

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
- Default values for common expenses
- Usage tracking (`usageCount`, `lastUsedAt`)

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

1. Create handler file in appropriate module (e.g., `src/lib/server/api/vaults/createVaultHandler.ts`)
2. Create/update validation schema in `src/lib/server/schemas/`
3. Add route to API file (e.g., `vaults-api.ts`) with OpenAPI documentation
4. Use session from context: `const session = c.get('currentSession')`
5. Apply audit fields using utilities from `src/lib/server/utils/audit.ts`

### Database Schema Changes

1. Modify `src/lib/server/db/schema.ts`
2. Run `pnpm run db:generate` to create migration
3. Run `wrangler d1 migrations apply "duitgee"` to apply locally
4. Test changes thoroughly before applying to production

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
