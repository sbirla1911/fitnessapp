# Deploying PlateAndPlan

A public, no-account web app: visitors enter their metrics + preferences and get a
personalized 7-day workout + meal plan + grocery list at a shareable link. Runs on
**Render** (a normal Node web service, so long ~60-100s AI generations aren't cut off)
with a **Supabase Postgres** database and **Gemini** for generation.

There are two kinds of steps below: **you** (things needing your accounts/keys —
I can't create accounts or sign in for you) and **already done** (built into the repo).

---

## 1. Supabase (your account)

1. Create a project at https://supabase.com (free tier is fine).
2. Open **SQL Editor** → paste the contents of [`supabase/schema.sql`](supabase/schema.sql)
   → **Run**. This creates the `plans` and `generation_log` tables with RLS on
   (default-deny — the app reaches them via the service-role key on the server).
3. Go to **Project Settings → API** and copy:
   - **Project URL** → `SUPABASE_URL`
   - **service_role** secret key → `SUPABASE_SERVICE_ROLE_KEY`
     (the secret one, **not** the `anon` key — it must stay server-side only)

## 2. Local run (optional, to test before deploying)

```bash
cd fitness-app
cp .env.example .env
```

Fill `.env`:

```
GEMINI_API_KEY=AIza...
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...              # service_role secret
RATE_LIMIT_SALT=<any long random string>
RATE_LIMIT_PER_IP_PER_DAY=5
RATE_LIMIT_GLOBAL_PER_DAY=200
```

```bash
npm install
npm run dev        # http://localhost:3100
```

## 3. Push to GitHub (your account)

The app lives in `fitness-app/` with its own git repo. `.env` and secrets are gitignored —
**never commit them**.

```bash
cd fitness-app
git init && git add -A && git commit -m "PlateAndPlan"
# create an empty repo on github.com, then:
git remote add origin git@github.com:<you>/plateandplan.git
git push -u origin main
```

## 4. Render (your account)

The repo includes a [`render.yaml`](render.yaml) blueprint, so setup is one click.

1. https://render.com → sign up (GitHub login is easiest).
2. **New → Blueprint** → connect the GitHub repo → Render reads `render.yaml` and proposes a
   free web service named `plateandplan`.
3. Fill in the secret env vars it asks for (`sync:false` ones): `GEMINI_API_KEY`,
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. `RATE_LIMIT_SALT` is auto-generated; the two
   caps default to 5 / 200.
4. **Apply / Create** → Render runs `npm install && npm run build`, then `npm run start`.
   You'll get a `https://plateandplan.onrender.com` URL (rename the service to change it).

> **Prefer manual setup?** New → **Web Service** → pick the repo →
> Build: `npm install && npm run build`, Start: `npm run start`, Instance type: **Free**,
> and add the six env vars above yourself.

## 5. Smoke test the live site

- Open the Render URL, fill the form, **Generate my plan**, wait ~60-90s → you land on
  `/plan/<slug>`.
- Copy the link, open it in a private window → the same plan renders.
- In Supabase → Table Editor → `plans` you should see the row; `generation_log` should
  have a row whose `ip_hash` is a hash (no raw IP).

---

## Why Render, not Vercel

A full 7-day generation takes **~60–100s** on Gemini's free tier. Vercel's free (Hobby) tier
**hard-caps every request at 60s**, so generations get killed. Render web services are normal
long-running Node servers with no such short cap, so the request completes. Trade-off: on the
**free** Render tier the service **sleeps after ~15 min idle**, so the first visit after a
lull has a ~30-50s cold start before the (already slow) generation. Upgrading to Render's
paid tier removes the sleep; or move to Gemini paid billing to make generation itself faster.

## Costs & limits

- **Gemini free tier** is a hard ceiling (~a few hundred requests/day, low requests/min).
  The global daily cap (`RATE_LIMIT_GLOBAL_PER_DAY`) keeps you under it and shows visitors a
  friendly "try again later" when hit.
- To scale up / speed up: enable **billing** on your Google AI key and raise the caps —
  **env-var change only**, no code changes.
- Supabase + Render free tiers comfortably cover early traffic.

## If abuse shows up

Without accounts, per-IP caps are the main guard. If needed, add a
[Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) challenge to the form —
a later enhancement, not required to launch.
