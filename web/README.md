# `web/`

Next.js frontend for the legal ad intelligence SaaS.

## What lives here

- `app/`: App Router pages and layouts
- `lib/`: shared frontend utilities such as the Supabase client wrapper
- `public/`: static assets
- `postcss.config.mjs`: Tailwind/PostCSS entrypoint for the app root

## Local development

1. Install dependencies:

```bash
npm install
```

2. Provide frontend env vars in `web/.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

3. Start the app:

```bash
npm run dev
```

4. Build for production:

```bash
npm run build
```

## Notes

- The frontend package is intentionally self-contained. Install frontend dependencies from `web/`, not the repo root.
- Tailwind is configured through `postcss.config.mjs` and imported in `app/globals.css`.
- The dashboard reads from `ad_events` and is marked dynamic so builds do not attempt to prerender live Supabase data.
- Production builds currently use `next build --webpack` for a more predictable local bootstrapping path while the app is still being stabilized.
- The checked-in database types currently reflect the Phase 1 migration snapshot in `web/lib/database.types.ts`.
- Once this machine has a Supabase access token, regenerate types from the linked project with:

```bash
supabase gen types typescript --linked --schema public > web/lib/database.types.ts
```
