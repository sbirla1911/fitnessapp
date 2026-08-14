import { z } from "zod";

// ---------------------------------------------------------------------------
// Profile — captured in onboarding, persisted as the single `profile` row.
// ---------------------------------------------------------------------------

export const ProfileSchema = z.object({
  sex: z.enum(["male", "female"]),
  age: z.coerce.number().int().min(13).max(100),
  heightCm: z.coerce.number().min(120).max(230),
  weightKg: z.coerce.number().min(30).max(300),
  activityLevel: z.enum([
    "sedentary",
    "light",
    "moderate",
    "active",
    "very_active",
  ]),
  goal: z.enum(["cut", "maintain", "bulk"]),
  // Nutrition preferences
  dietaryPattern: z.enum(["non_veg", "veg", "vegan", "eggetarian"]),
  cuisines: z.string().default(""), // free text, comma-ish
  allergies: z.string().default(""),
  dislikedFoods: z.string().default(""),
  mealsPerDay: z.coerce.number().int().min(2).max(6).default(3),
  // Workout preferences
  workoutDaysPerWeek: z.coerce.number().int().min(1).max(7).default(4),
  workoutLocation: z.enum(["gym", "home", "hybrid"]).default("gym"),
  equipment: z.string().default(""),
  experienceLevel: z.enum(["beginner", "intermediate", "advanced"]).default(
    "beginner",
  ),
  sessionLengthMin: z.coerce.number().int().min(15).max(180).default(60),
  focusAreas: z.string().default(""),
  injuries: z.string().default(""),
});

export type Profile = z.infer<typeof ProfileSchema>;

// ---------------------------------------------------------------------------
// Computed macro targets (mirrors lib/macros.ts MacroTargets).
// ---------------------------------------------------------------------------

export const TargetsSchema = z.object({
  bmr: z.number(),
  tdee: z.number(),
  calories: z.number(),
  proteinG: z.number(),
  carbsG: z.number(),
  fatG: z.number(),
  fibreG: z.number(),
});

export type Targets = z.infer<typeof TargetsSchema>;

// ---------------------------------------------------------------------------
// Weekly plan — the contract the LLM must return (validated before persisting).
// ---------------------------------------------------------------------------

export const IngredientSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().nonnegative(),
  unit: z.string().min(1), // g, ml, piece, cup, tbsp, ...
});

export const MacrosSchema = z.object({
  kcal: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
  fibre: z.number().nonnegative(),
});

export const MealSchema = z.object({
  slot: z.string().min(1), // Breakfast, Lunch, Dinner, Snack, ...
  name: z.string().min(1),
  ingredients: z.array(IngredientSchema),
  macros: MacrosSchema,
});

export const ExerciseSchema = z.object({
  name: z.string().min(1),
  sets: z.number().int().nonnegative(),
  reps: z.string().min(1), // "8-12", "AMRAP", "30s" — keep as string
  rest: z.string().default(""), // "90s"
});

export const WorkoutSchema = z.object({
  isRest: z.boolean(),
  title: z.string().min(1), // "Push A", "Rest / Mobility"
  exercises: z.array(ExerciseSchema),
});

export const DayPlanSchema = z.object({
  day: z.number().int().min(0).max(6), // 0 = Sunday
  workout: WorkoutSchema,
  meals: z.array(MealSchema).min(1),
});

export const GroceryItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().nonnegative(),
  unit: z.string().min(1),
  category: z.string().default("Other"),
});

export const WeekPlanSchema = z.object({
  days: z.array(DayPlanSchema).length(7),
  groceryList: z.array(GroceryItemSchema),
});

export type Ingredient = z.infer<typeof IngredientSchema>;
export type Macros = z.infer<typeof MacrosSchema>;
export type Meal = z.infer<typeof MealSchema>;
export type Exercise = z.infer<typeof ExerciseSchema>;
export type Workout = z.infer<typeof WorkoutSchema>;
export type DayPlan = z.infer<typeof DayPlanSchema>;
export type GroceryItem = z.infer<typeof GroceryItemSchema>;
export type WeekPlan = z.infer<typeof WeekPlanSchema>;

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;
