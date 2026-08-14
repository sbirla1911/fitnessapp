import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PlanView from "@/components/PlanView";
import { getPlanBySlug } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your plan — PlateAndPlan",
};

export default async function PlanPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const stored = await getPlanBySlug(slug);
  if (!stored) notFound();

  return (
    <PlanView
      inputs={stored.inputs}
      targets={stored.targets}
      plan={stored.plan}
    />
  );
}
