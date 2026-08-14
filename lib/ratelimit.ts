import { createHash } from "node:crypto";
import { getSupabase } from "./supabase";

// Per-IP and global daily caps to keep us under the Gemini free-tier ceiling and
// guard against abuse (there are no accounts). Counts come from generation_log.

const PER_IP = Number(process.env.RATE_LIMIT_PER_IP_PER_DAY ?? "5");
const GLOBAL = Number(process.env.RATE_LIMIT_GLOBAL_PER_DAY ?? "200");

/** Extract the client IP from Vercel/proxy headers. */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Salted hash so we never store raw IPs. */
export function hashIp(ip: string): string {
  const salt = process.env.RATE_LIMIT_SALT ?? "";
  return createHash("sha256").update(`${ip}:${salt}`).digest("hex");
}

export type RateResult =
  | { ok: true }
  | { ok: false; reason: "per_ip" | "global" };

/** Check both caps against the last 24h. Does not record anything. */
export async function checkRateLimit(ipHash: string): Promise<RateResult> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const supabase = getSupabase();

  const [{ count: ipCount }, { count: globalCount }] = await Promise.all([
    supabase
      .from("generation_log")
      .select("*", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", since),
    supabase
      .from("generation_log")
      .select("*", { count: "exact", head: true })
      .gte("created_at", since),
  ]);

  if ((globalCount ?? 0) >= GLOBAL) return { ok: false, reason: "global" };
  if ((ipCount ?? 0) >= PER_IP) return { ok: false, reason: "per_ip" };
  return { ok: true };
}

/** Record a successful generation for future rate-limit checks. */
export async function recordGeneration(ipHash: string): Promise<void> {
  await getSupabase().from("generation_log").insert({ ip_hash: ipHash });
}

export function limitMessage(reason: "per_ip" | "global"): string {
  return reason === "per_ip"
    ? `You've reached today's limit of ${PER_IP} plans. Please try again tomorrow.`
    : "The app is busy right now — we've hit today's overall limit. Please try again later.";
}
