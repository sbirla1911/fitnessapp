# PlateAndPlan

A free, public, **no-account** web app: visitors enter their body metrics and food/workout
preferences and instantly get a personalized **7-day workout routine + meal plan + grocery
list**, engineered to hit their calculated macro targets. Every plan gets its own
**shareable link**.

## Stack

- **Next.js 16** (App Router) + TypeScript, deployed on **Vercel**
- **Supabase Postgres** — stores generated plans (by slug) + a rate-limit log; accessed
  server-side with the service-role key (no user auth)
- **Gemini** (`gemini-flash-lite-latest`) via `@google/genai`, server-side only
- **Zod** validation on the generated plan

## How it works

1. Landing form → `POST /api/generate`
2. Server rate-limits (per-IP + global daily caps), computes macro targets
   ([lib/macros.ts](lib/macros.ts)), calls Gemini ([lib/gemini.ts](lib/gemini.ts)),
   validates with Zod, saves the plan to Supabase under a random slug.
3. Redirect to `/plan/<slug>` — a read-only, shareable view with workouts, meals (macros vs
   target), and an aggregated grocery list.

No accounts, no check-offs, no personal data in URLs. Only a salted **hash** of the IP is
stored, for rate limiting.

## Run locally & deploy

See **[DEPLOY.md](DEPLOY.md)** for the full walkthrough (Supabase project + env vars +
Vercel). Quick local version once you have a Supabase project and `.env`:

```bash
npm install
npm run dev      # http://localhost:3100
```

## Tests

```bash
npm test         # macro math unit tests
```

General fitness guidance, not medical advice. Meal macros are AI-estimated; each day's totals
are shown next to your computed targets.
