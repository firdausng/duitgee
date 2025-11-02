# Duitgee

for Auth information, go here: [auth](/AUTH.md)

## Developing

Once you've created a project and installed dependencies with `pnpm install`, start a development server:

```sh
pnpm run dev

# or start the server and open the app in a new browser tab
pnpm run dev -- --open
```

## Building

To create a production version of your app:

```sh
pnpm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## App Migration

```sh
pnpm drizzle-kit generate
wrangler d1 migrations apply "duitgee"
```

## Deploy Production

```sh
wrangler d1 migrations apply "duitgee" --remote true --env production 
npx wrangler deploy --env production
```

## Seed Data

local
```sh
npx wrangler d1 execute duitgee --file=./seed/0001_setup_categories.sql
```

Production
```sh
npx wrangler d1 execute duitgee--remote --env production --file=./seed/0001_setup_categories.sql
```