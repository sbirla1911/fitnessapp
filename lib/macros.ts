// Pure macro-target math. No I/O, no imports — safe to unit-test in isolation.
//
// Pipeline: Mifflin–St Jeor BMR -> TDEE (activity factor) -> calorie target
// (goal adjustment) -> macro split (protein/fat by bodyweight, carbs as
// remainder, fibre by calories).

export type Sex = "male" | "female";

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";

export type Goal = "cut" | "maintain" | "bulk";

export interface MacroInputs {
  sex: Sex;
  age: number; // years
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
}

export interface MacroTargets {
  bmr: number; // kcal/day
  tdee: number; // kcal/day
  calories: number; // kcal/day, goal-adjusted
  proteinG: number;
  carbsG: number;
  fatG: number;
  fibreG: number;
}

// Standard multipliers used across the fitness literature.
export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

// Calorie adjustment applied to TDEE per goal.
export const GOAL_ADJUSTMENT: Record<Goal, number> = {
  cut: -0.2, // 20% deficit
  maintain: 0,
  bulk: 0.12, // 12% surplus
};

// Protein grams per kg bodyweight, nudged by goal (more on a cut to spare muscle).
export const PROTEIN_G_PER_KG: Record<Goal, number> = {
  cut: 2.0,
  maintain: 1.8,
  bulk: 1.8,
};

const FAT_G_PER_KG = 0.9;
const FIBRE_G_PER_1000_KCAL = 14;
const KCAL_PER_G_PROTEIN = 4;
const KCAL_PER_G_CARB = 4;
const KCAL_PER_G_FAT = 9;

function round(n: number): number {
  return Math.round(n);
}

/** Mifflin–St Jeor basal metabolic rate (kcal/day). */
export function bmr(input: Pick<MacroInputs, "sex" | "age" | "heightCm" | "weightKg">): number {
  const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age;
  return input.sex === "male" ? base + 5 : base - 161;
}

/** Total daily energy expenditure = BMR x activity factor. */
export function tdee(input: MacroInputs): number {
  return bmr(input) * ACTIVITY_FACTORS[input.activityLevel];
}

/**
 * Full macro target set. Protein and fat are anchored to bodyweight; carbs take
 * whatever calories remain (floored at 0); fibre scales with total calories.
 */
export function computeTargets(input: MacroInputs): MacroTargets {
  const bmrValue = bmr(input);
  const tdeeValue = bmrValue * ACTIVITY_FACTORS[input.activityLevel];
  const calories = tdeeValue * (1 + GOAL_ADJUSTMENT[input.goal]);

  const proteinG = PROTEIN_G_PER_KG[input.goal] * input.weightKg;
  const fatG = FAT_G_PER_KG * input.weightKg;

  const proteinKcal = proteinG * KCAL_PER_G_PROTEIN;
  const fatKcal = fatG * KCAL_PER_G_FAT;
  const carbsKcal = Math.max(0, calories - proteinKcal - fatKcal);
  const carbsG = carbsKcal / KCAL_PER_G_CARB;

  const fibreG = (calories / 1000) * FIBRE_G_PER_1000_KCAL;

  return {
    bmr: round(bmrValue),
    tdee: round(tdeeValue),
    calories: round(calories),
    proteinG: round(proteinG),
    carbsG: round(carbsG),
    fatG: round(fatG),
    fibreG: round(fibreG),
  };
}
