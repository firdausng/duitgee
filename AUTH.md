# Duitgee Better Auth Setup

## Auth Migration

```sh
pnpm dlx @better-auth/cli@latest generate --config ./better-auth.config.ts --output ./src/lib/server/db/better-auth-schema.ts
pnpm drizzle-kit generate --config=auth-drizzle.config.ts
wrangler d1 migrations apply "duitgee-auth"
```

## Deploy Production

```sh
wrangler d1 migrations apply "duitgee-auth" --remote true --env production
pnpm run build
npx wrangler deploy --env production
```

## Seed Auth Data

local
```sh
npx wrangler d1 execute duitgee-auth --file=./seed/auth/0001_add_admin.sql
```

Production
```sh
npx wrangler d1 execute duitgee-auth --remote --file=./seed/auth/0001_add_admin.sql --env production
```