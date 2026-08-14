"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Profile, Targets, WeekPlan } from "@/lib/schema";
import { aggregateGroceries, dayMacroTotals } from "@/lib/grocery";

export default function PlanView({
  inputs,
  targets,
  plan,
}: {
  inputs: Profile;
  targets: Targets;
  plan: WeekPlan;
}) {
  const [tab, setTab] = useState<"workouts" | "meals" | "grocery">("workouts");
  const [copied, setCopied] = useState(false);
  const groceries = useMemo(() => aggregateGroceries(plan), [plan]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  const goalLabel =
    inputs.goal === "cut" ? "lose fat" : inputs.goal === "bulk" ? "build muscle" : "maintain";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your 7-day plan</h1>
          <p className="text-sm text-neutral-500">
            {inputs.sex === "male" ? "M" : "F"} · {inputs.age} · {inputs.weightKg}kg ·{" "}
            {goalLabel} · {inputs.workoutDaysPerWeek} days/wk · {inputs.dietaryPattern.replace("_", "-")}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={copyLink}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
          <Link
            href="/"
            className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-semibold text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900"
          >
            Make your own
          </Link>
        </div>
      </div>

      {/* Daily macro targets */}
      <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/40">
        <h2 className="mb-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
          Daily targets
        </h2>
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
          <Stat label="Calories" value={`${targets.calories}`} unit="kcal" />
          <Stat label="Protein" value={`${targets.proteinG}`} unit="g" />
          <Stat label="Carbs" value={`${targets.carbsG}`} unit="g" />
          <Stat label="Fat" value={`${targets.fatG}`} unit="g" />
          <Stat label="Fibre" value={`${targets.fibreG}`} unit="g" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-neutral-200 dark:border-neutral-800">
        <TabButton active={tab === "workouts"} onClick={() => setTab("workouts")}>Workouts</TabButton>
        <TabButton active={tab === "meals"} onClick={() => setTab("meals")}>Meals</TabButton>
        <TabButton active={tab === "grocery"} onClick={() => setTab("grocery")}>Grocery list</TabButton>
      </div>

      {tab === "workouts" && (
        <div className="space-y-3">
          {plan.days.map((d) => (
            <div key={d.day} className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
              <div className="mb-1">
                <span className="text-xs uppercase tracking-wide text-neutral-400">Day {d.day + 1}</span>
                <h3 className="font-semibold">{d.workout.title}</h3>
              </div>
              {d.workout.exercises.length > 0 && (
                <ul className="mt-2 space-y-1 text-sm">
                  {d.workout.exercises.map((ex, i) => (
                    <li key={i} className="flex justify-between gap-4">
                      <span>{ex.name}</span>
                      <span className="text-neutral-500">
                        {ex.sets} × {ex.reps}{ex.rest ? ` · rest ${ex.rest}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "meals" && (
        <div className="space-y-3">
          {plan.days.map((d) => {
            const totals = dayMacroTotals(plan, d.day);
            return (
              <div key={d.day} className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wide text-neutral-400">Day {d.day + 1}</span>
                  <span className="text-xs text-neutral-500">
                    {Math.round(totals.kcal)}/{targets.calories} kcal ·{" "}
                    {Math.round(totals.protein)}/{targets.proteinG}g P
                  </span>
                </div>
                <ul className="space-y-2">
                  {d.meals.map((m, i) => (
                    <li key={i} className="flex items-start justify-between gap-3 border-t border-neutral-100 pt-2 first:border-t-0 first:pt-0 dark:border-neutral-800/60">
                      <span>
                        <span className="text-xs font-medium text-neutral-500">{m.slot}</span>
                        <br />
                        <span className="text-sm font-medium">{m.name}</span>
                        <span className="block text-xs text-neutral-500">
                          {m.ingredients.map((g) => `${g.quantity}${g.unit} ${g.name}`).join(", ")}
                        </span>
                      </span>
                      <span className="shrink-0 text-right text-xs text-neutral-500">
                        {Math.round(m.macros.kcal)} kcal<br />{Math.round(m.macros.protein)}g P
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {tab === "grocery" && <GroceryList items={groceries} />}
    </div>
  );
}

function GroceryList({ items }: { items: ReturnType<typeof aggregateGroceries> }) {
  const byCategory = new Map<string, typeof items>();
  for (const it of items) {
    const arr = byCategory.get(it.category) ?? [];
    arr.push(it);
    byCategory.set(it.category, arr);
  }
  const categories = Array.from(byCategory.keys()).sort();
  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-500">{items.length} items for the week</p>
      {categories.map((cat) => (
        <div key={cat} className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <h3 className="mb-2 text-sm font-semibold">{cat}</h3>
          <ul className="space-y-1 text-sm">
            {byCategory.get(cat)!.map((it, i) => (
              <li key={i} className="flex justify-between gap-4">
                <span>{it.name}</span>
                <span className="text-neutral-500">{it.quantity} {it.unit}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
        active
          ? "border-neutral-900 text-neutral-900 dark:border-white dark:text-white"
          : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
      }`}
    >
      {children}
    </button>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-md bg-white/60 p-2 dark:bg-neutral-900/60">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="font-semibold">
        {value} <span className="text-xs font-normal text-neutral-500">{unit}</span>
      </div>
    </div>
  );
}
