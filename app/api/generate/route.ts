import { NextResponse } from "next/server";
import { ProfileSchema } from "@/lib/schema";
import { computeTargets } from "@/lib/macros";
import { generateWeekPlan, GeminiError } from "@/lib/gemini";
import { insertPlan, makeSlug } from "@/lib/supabase";
import {
  clientIp,
  hashIp,
  checkRateLimit,
  recordGeneration,
  limitMessage,
} from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // 1. Rate limit (per-IP + global daily caps).
  const ipHash = hashIp(clientIp(req));
  try {
    const rl = await checkRateLimit(ipHash);
    if (!rl.ok) {
      return NextResponse.json({ error: limitMessage(rl.reason) }, { status: 429 });
    }
  } catch (err) {
    // If the rate-limit store is unreachable, fail closed with a clear message
    // rather than risk unbounded spend on the shared key.
    return NextResponse.json(
      { error: `Service unavailable: ${String((err as Error)?.message ?? err)}` },
      { status: 503 },
    );
  }

  // 2. Validate the visitor's input.
  const body = await req.json().catch(() => null);
  const parsed = ProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check your inputs.", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const profile = parsed.data;

  // 3. Compute targets + generate + persist.
  try {
    const targets = computeTargets({
      sex: profile.sex,
      age: profile.age,
      heightCm: profile.heightCm,
      weightKg: profile.weightKg,
      activityLevel: profile.activityLevel,
      goal: profile.goal,
    });
    const plan = await generateWeekPlan(profile, targets);

    const slug = makeSlug();
    await insertPlan(slug, profile, targets, plan);
    await recordGeneration(ipHash);

    return NextResponse.json({ slug });
  } catch (err) {
    const message =
      err instanceof GeminiError
        ? err.message
        : `Something went wrong generating your plan: ${String((err as Error)?.message ?? err)}`;
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
