-- Run this once in your Supabase project's SQL Editor.
-- No user accounts: the app writes/reads via the service-role key on the server,
-- which bypasses RLS. RLS is enabled with NO policies (default-deny) so the anon
-- key can't touch these tables even if it leaked.

create table if not exists plans (
  slug        text primary key,            -- short random id (see lib/supabase.ts)
  created_at  timestamptz not null default now(),
  inputs      jsonb not null,              -- the Profile the visitor entered
  targets     jsonb not null,              -- computed MacroTargets
  plan        jsonb not null               -- validated WeekPlan (incl. groceryList)
);

create table if not exists generation_log (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  ip_hash     text not null                -- sha256(ip + RATE_LIMIT_SALT); no raw IPs
);

create index if not exists generation_log_created_at_idx on generation_log (created_at);
create index if not exists generation_log_ip_created_idx  on generation_log (ip_hash, created_at);

alter table plans           enable row level security;
alter table generation_log  enable row level security;

-- The server uses the service_role key (which has BYPASSRLS). Table-level GRANTs
-- are still required and aren't always applied by default in newer projects, so
-- grant them explicitly. anon/authenticated get nothing (RLS default-deny anyway).
grant all on table plans          to service_role;
grant all on table generation_log to service_role;
grant usage, select on all sequences in schema public to service_role;
