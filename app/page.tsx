"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const field =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";
const label =
  "block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1";

export default function LandingPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not generate your plan. Please try again.");
        setBusy(false);
        return;
      }
      router.push(`/plan/${data.slug}`);
    } catch {
      setError("Network error. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="overflow-hidden rounded-2xl border border-neutral-200 shadow-sm dark:border-neutral-800">
          {/* Hero image lives at public/hero.jpg */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/hero.jpg"
            alt="Sunrise over a running track beside a fresh, balanced meal bowl — move, nourish, thrive"
            className="h-auto w-full"
          />
        </div>
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Your personalized workout &amp; meal plan
          </h1>
          <p className="mx-auto max-w-xl text-neutral-500">
            Tell us about your body and food preferences. We&apos;ll calculate your
            macro targets and build a full 7-day workout routine, meal plan, and
            grocery list — free, no sign-up.
          </p>
        </div>
      </section>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {busy ? (
        <div className="rounded-lg border border-neutral-200 p-8 text-center dark:border-neutral-800">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900 dark:border-neutral-700 dark:border-t-white" />
          <p className="font-medium">Building your plan…</p>
          <p className="mt-1 text-sm text-neutral-500">
            Designing workouts, meals, and your grocery list. This can take up to
            a minute — hang tight.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-6">
          <Section title="About you">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Select name="sex" title="Sex" defaultValue="male" options={[["male", "Male"], ["female", "Female"]]} />
              <Input name="age" title="Age" type="number" defaultValue="30" />
              <Input name="heightCm" title="Height (cm)" type="number" defaultValue="175" />
              <Input name="weightKg" title="Weight (kg)" type="number" step="0.1" defaultValue="75" />
              <Select name="activityLevel" title="Activity" defaultValue="moderate" options={[["sedentary", "Sedentary"], ["light", "Light"], ["moderate", "Moderate"], ["active", "Active"], ["very_active", "Very active"]]} />
              <Select name="goal" title="Goal" defaultValue="maintain" options={[["cut", "Lose fat"], ["maintain", "Maintain"], ["bulk", "Build muscle"]]} />
            </div>
          </Section>

          <Section title="Food preferences">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Select name="dietaryPattern" title="Diet" defaultValue="non_veg" options={[["non_veg", "Non-veg"], ["eggetarian", "Eggetarian"], ["veg", "Vegetarian"], ["vegan", "Vegan"]]} />
              <Input name="mealsPerDay" title="Meals / day" type="number" defaultValue="3" />
              <Input name="cuisines" title="Preferred cuisines" placeholder="Indian, Mediterranean" />
              <Input name="allergies" title="Allergies" placeholder="peanuts, shellfish" />
              <Input name="dislikedFoods" title="Foods to avoid" placeholder="mushrooms" />
            </div>
          </Section>

          <Section title="Workout preferences">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Input name="workoutDaysPerWeek" title="Training days / week" type="number" defaultValue="4" />
              <Select name="workoutLocation" title="Where" defaultValue="gym" options={[["gym", "Gym"], ["home", "Home"], ["hybrid", "Hybrid"]]} />
              <Select name="experienceLevel" title="Experience" defaultValue="beginner" options={[["beginner", "Beginner"], ["intermediate", "Intermediate"], ["advanced", "Advanced"]]} />
              <Input name="sessionLengthMin" title="Session (min)" type="number" defaultValue="60" />
              <Input name="equipment" title="Equipment" placeholder="barbell, dumbbells" />
              <Input name="focusAreas" title="Focus areas" placeholder="upper body, core" />
              <Input name="injuries" title="Injuries / limits" placeholder="left knee" />
            </div>
          </Section>

          <button
            type="submit"
            className="w-full rounded-md bg-neutral-900 px-4 py-3 text-sm font-semibold text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900"
          >
            Generate my plan →
          </button>
        </form>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <legend className="px-1 text-sm font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

function Input({
  name,
  title,
  type = "text",
  defaultValue,
  step,
  placeholder,
}: {
  name: string;
  title: string;
  type?: string;
  defaultValue?: string;
  step?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className={label} htmlFor={name}>{title}</label>
      <input id={name} name={name} type={type} step={step} defaultValue={defaultValue} placeholder={placeholder} className={field} />
    </div>
  );
}

function Select({
  name,
  title,
  defaultValue,
  options,
}: {
  name: string;
  title: string;
  defaultValue?: string;
  options: [string, string][];
}) {
  return (
    <div>
      <label className={label} htmlFor={name}>{title}</label>
      <select id={name} name={name} defaultValue={defaultValue} className={field}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </div>
  );
}
