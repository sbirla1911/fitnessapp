import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Profile, Targets, WeekPlan } from "./schema";

// Server-only Supabase client using the SERVICE ROLE key. This must never be
// imported into a client component — the service-role key bypasses RLS.
let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see .env.example).",
    );
  }
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

// URL-safe slug. ~48 bits of entropy — plenty for unguessable share links at
// this scale, and short enough to paste.
const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
export function makeSlug(len = 8): string {
  const bytes = new Uint8Array(len);
  globalThis.crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

export interface StoredPlan {
  slug: string;
  createdAt: string;
  inputs: Profile;
  targets: Targets;
  plan: WeekPlan;
}

export async function insertPlan(
  slug: string,
  inputs: Profile,
  targets: Targets,
  plan: WeekPlan,
): Promise<void> {
  const { error } = await getSupabase()
    .from("plans")
    .insert({ slug, inputs, targets, plan });
  if (error) throw new Error(`Failed to save plan: ${error.message}`);
}

export async function getPlanBySlug(slug: string): Promise<StoredPlan | null> {
  const { data, error } = await getSupabase()
    .from("plans")
    .select("slug, created_at, inputs, targets, plan")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`Failed to load plan: ${error.message}`);
  if (!data) return null;
  return {
    slug: data.slug,
    createdAt: data.created_at,
    inputs: data.inputs as Profile,
    targets: data.targets as Targets,
    plan: data.plan as WeekPlan,
  };
}
