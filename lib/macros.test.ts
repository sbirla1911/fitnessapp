import { test } from "node:test";
import assert from "node:assert/strict";
import { bmr, tdee, computeTargets, type MacroInputs } from "./macros.ts";

// Reference profile A — hand-computed:
// BMR = 10*80 + 6.25*180 - 5*30 + 5 = 1780
// TDEE = 1780 * 1.55 = 2759
// maintain -> calories = 2759
// protein = 1.8*80 = 144g (576 kcal); fat = 0.9*80 = 72g (648 kcal)
// carbs = (2759 - 576 - 648) / 4 = 383.75 -> 384; fibre = 2759/1000*14 = 38.6 -> 39
const male: MacroInputs = {
  sex: "male",
  age: 30,
  heightCm: 180,
  weightKg: 80,
  activityLevel: "moderate",
  goal: "maintain",
};

test("BMR (Mifflin–St Jeor, male)", () => {
  assert.equal(bmr(male), 1780);
});

test("TDEE applies the moderate activity factor", () => {
  assert.equal(Math.round(tdee(male)), 2759);
});

test("computeTargets — male, maintain", () => {
  const t = computeTargets(male);
  assert.deepEqual(t, {
    bmr: 1780,
    tdee: 2759,
    calories: 2759,
    proteinG: 144,
    carbsG: 384,
    fatG: 72,
    fibreG: 39,
  });
});

// Reference profile B — hand-computed:
// BMR = 10*60 + 6.25*165 - 5*25 - 161 = 1345.25 -> 1345
// TDEE = 1345.25 * 1.2 = 1614.3 -> 1614
// cut -> calories = 1614.3 * 0.8 = 1291.44 -> 1291
// protein(cut) = 2.0*60 = 120g (480 kcal); fat = 0.9*60 = 54g (486 kcal)
// carbs = (1291.44 - 480 - 486) / 4 = 81.36 -> 81; fibre = 1291.44/1000*14 = 18.08 -> 18
const female: MacroInputs = {
  sex: "female",
  age: 25,
  heightCm: 165,
  weightKg: 60,
  activityLevel: "sedentary",
  goal: "cut",
};

test("computeTargets — female, cut (deficit + higher protein/kg)", () => {
  const t = computeTargets(female);
  assert.deepEqual(t, {
    bmr: 1345,
    tdee: 1614,
    calories: 1291,
    proteinG: 120,
    carbsG: 81,
    fatG: 54,
    fibreG: 18,
  });
});

test("carbs never go negative when protein+fat exceed calories", () => {
  const extreme = computeTargets({
    sex: "female",
    age: 60,
    heightCm: 150,
    weightKg: 120, // very high bodyweight -> huge protein+fat kcal
    activityLevel: "sedentary",
    goal: "cut",
  });
  assert.ok(extreme.carbsG >= 0);
});
