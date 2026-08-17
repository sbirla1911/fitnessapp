import { GoogleGenAI, Type } from "@google/genai";
import { WeekPlanSchema, type Profile, type Targets, type WeekPlan } from "./schema";

// flash-lite-latest: current lightweight model — faster and with a higher free-tier
// daily quota than gemini-2.5-flash (which caps at 20 requests/day on the free tier).
const MODEL = "gemini-flash-lite-latest";

export class GeminiError extends Error {}

function getClient(): GoogleGenAI {
  const key = (process.env.GEMINI_API_KEY ?? "").trim();
  if (!key || key.startsWith("AIza-your-key")) {
    throw new GeminiError(
      "GEMINI_API_KEY is not set. Copy .env.example to .env and add your key from https://aistudio.google.com/apikey",
    );
  }
  return new GoogleGenAI({ apiKey: key });
}

// Structured-output schema handed to Gemini so it returns exactly our shape.
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    days: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          day: { type: Type.INTEGER, description: "0 through 6" },
          workout: {
            type: Type.OBJECT,
            properties: {
              isRest: { type: Type.BOOLEAN },
              title: { type: Type.STRING },
              exercises: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    sets: { type: Type.INTEGER },
                    reps: { type: Type.STRING },
                    rest: { type: Type.STRING },
                  },
                  required: ["name", "sets", "reps", "rest"],
                },
              },
            },
            required: ["isRest", "title", "exercises"],
          },
          meals: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                slot: { type: Type.STRING },
                name: { type: Type.STRING },
                ingredients: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      quantity: { type: Type.NUMBER },
                      unit: { type: Type.STRING },
                    },
                    required: ["name", "quantity", "unit"],
                  },
                },
                macros: {
                  type: Type.OBJECT,
                  properties: {
                    kcal: { type: Type.NUMBER },
                    protein: { type: Type.NUMBER },
                    carbs: { type: Type.NUMBER },
                    fat: { type: Type.NUMBER },
                    fibre: { type: Type.NUMBER },
                  },
                  required: ["kcal", "protein", "carbs", "fat", "fibre"],
                },
              },
              required: ["slot", "name", "ingredients", "macros"],
            },
          },
        },
        required: ["day", "workout", "meals"],
      },
    },
    groceryList: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          quantity: { type: Type.NUMBER },
          unit: { type: Type.STRING },
          category: { type: Type.STRING },
        },
        required: ["name", "quantity", "unit", "category"],
      },
    },
  },
  required: ["days", "groceryList"],
};

const SYSTEM_INSTRUCTION = `You are a certified strength coach and nutritionist creating a personalized one-week plan.
Rules:
- Output MUST be a full 7-day plan, day 0 through day 6.
- Each day's meals should sum close to the user's daily macro targets (within ~10% on calories AND protein).
- PROTEIN IS THE PRIORITY: always reach at least the daily protein target (adjust carbs/fat to make room). Every meal should include a substantial protein source.
- Provide realistic macros per meal (kcal, protein, carbs, fat, fibre in grams).
- Respect the user's dietary pattern, allergies, disliked foods, and preferred cuisines strictly.
- Rotate a small set (3-4) of meals per slot across the week so the grocery list stays practical.
- Provide resistance/cardio workouts only on the requested number of training days; the rest are rest/mobility days (isRest = true, exercises may be light mobility or empty).
- Match workouts to the user's location, equipment, experience level, session length, focus areas, and injuries.
- Use metric units (g, ml, piece) for ingredients.
- The groceryList should aggregate ingredient quantities needed for the whole week.
This is general fitness guidance, not medical advice.`;

function buildUserPrompt(profile: Profile, targets: Targets): string {
  return `Create a 7-day plan (day 0 through day 6).

DAILY MACRO TARGETS (hard constraints):
- Calories: ${targets.calories} kcal
- Protein: ${targets.proteinG} g
- Carbs: ${targets.carbsG} g
- Fat: ${targets.fatG} g
- Fibre: ${targets.fibreG} g

USER PROFILE:
- Sex: ${profile.sex}, Age: ${profile.age}, Height: ${profile.heightCm} cm, Weight: ${profile.weightKg} kg
- Activity: ${profile.activityLevel}, Goal: ${profile.goal}

NUTRITION PREFERENCES:
- Dietary pattern: ${profile.dietaryPattern}
- Meals per day: ${profile.mealsPerDay}
- Preferred cuisines: ${profile.cuisines || "no preference"}
- Allergies: ${profile.allergies || "none"}
- Disliked foods: ${profile.dislikedFoods || "none"}

WORKOUT PREFERENCES:
- Training days per week: ${profile.workoutDaysPerWeek}
- Location: ${profile.workoutLocation}
- Equipment: ${profile.equipment || "standard"}
- Experience: ${profile.experienceLevel}
- Session length: ${profile.sessionLengthMin} min
- Focus areas: ${profile.focusAreas || "balanced"}
- Injuries/limitations: ${profile.injuries || "none"}

Return the plan strictly as JSON matching the provided schema.`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isRetryable(err: unknown): boolean {
  const msg = String((err as Error)?.message ?? err);
  return /429|RESOURCE_EXHAUSTED|503|UNAVAILABLE|500|deadline/i.test(msg);
}

/**
 * Generate and validate a week plan in a single structured-output call. Retries
 * transient (rate-limit / 5xx) errors with backoff; throws GeminiError with a
 * clear message otherwise. The grocery list is re-aggregated from meals in code
 * (lib/grocery.ts) at display time, so the model's groceryList is only a hint.
 */
export async function generateWeekPlan(
  profile: Profile,
  targets: Targets,
): Promise<WeekPlan> {
  const ai = getClient();
  const contents = buildUserPrompt(profile, targets);

  const maxAttempts = 3;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const resp = await ai.models.generateContent({
        model: MODEL,
        contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema,
          temperature: 0.5,
        },
      });
      const text = resp.text;
      if (!text) throw new GeminiError("Gemini returned an empty response.");

      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        throw new GeminiError("Gemini returned invalid JSON.");
      }

      const parsed = WeekPlanSchema.safeParse(json);
      if (!parsed.success) {
        throw new GeminiError(
          `Plan failed validation: ${parsed.error.issues
            .slice(0, 3)
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; ")}`,
        );
      }
      return parsed.data;
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts && isRetryable(err)) {
        await sleep(1500 * attempt);
        continue;
      }
      break;
    }
  }

  if (lastErr instanceof GeminiError) throw lastErr;
  throw new GeminiError(
    `Gemini request failed: ${String((lastErr as Error)?.message ?? lastErr)}`,
  );
}
