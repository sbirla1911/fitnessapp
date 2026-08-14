import type { GroceryItem, WeekPlan } from "./schema";

// Re-aggregate the grocery list from the meals actually planned, so the list is
// always the source-of-truth sum of ingredients. Categories are assigned in code
// (see categorizeIngredient) rather than by the LLM, keeping generation lean.

function normalizeKey(name: string, unit: string): string {
  return `${name.trim().toLowerCase()}|${unit.trim().toLowerCase()}`;
}

// Ordered keyword rules — first match wins, so put more specific rules first.
// Order matters for collisions: grains before eggs ("egg noodles" → grains), and
// bare "pepper" lives only in Produce so "bell peppers" isn't read as a condiment.
const CATEGORY_RULES: [RegExp, string][] = [
  [/whey|casein|protein powder|protein isolate/, "Protein Supplements"],
  [/peanut butter|almond butter|nut butter/, "Nuts & Seeds"],
  [/chicken|beef|pork|turkey|lamb|mutton|mince|bacon|\bham\b|sausage|steak/, "Meat & Poultry"],
  [/salmon|tuna|fish|shrimp|prawn|\bcod\b|tilapia|sardine|mackerel|seafood/, "Fish & Seafood"],
  [/rice|oat|bread|pasta|noodle|quinoa|lentil|\bdal\b|bean|chickpea|flour|wheat|barley|couscous|tortilla|wrap|roti|cereal|potato|\bpeas?\b/, "Grains, Legumes & Starches"],
  [/\beggs?\b/, "Eggs"],
  [/milk|yogh?urt|cheese|paneer|butter|cream|curd|ghee|tofu/, "Dairy & Alternatives"],
  [/almond|walnut|cashew|peanut|pistachio|hazelnut|\bnuts?\b|\bseeds?\b|chia|flax|tahini/, "Nuts & Seeds"],
  [/banana|berry|berries|apple|orange|spinach|broccoli|carrot|tomato|onion|garlic|pepper|cucumber|lettuce|kale|avocado|lemon|lime|mushroom|zucchini|cabbage|cauliflower|corn|celery|ginger|cilantro|herb|vegetable|fruit|greens|salad|asparagus|eggplant|aubergine|squash|beet|radish|leek|scallion|chill?i|okra|sprout|grape|mango|pear|peach|melon|pineapple/, "Produce"],
  [/oil|sauce|vinegar|\bsalt\b|spice|paste|ketchup|mustard|honey|syrup|mayo|stock|broth|seasoning|masala/, "Oils & Condiments"],
];

/** Assign a shopping-aisle category from an ingredient name. */
export function categorizeIngredient(name: string): string {
  const n = name.trim().toLowerCase();
  for (const [re, cat] of CATEGORY_RULES) if (re.test(n)) return cat;
  return "Other";
}

/** Sum every meal ingredient across the week by (name, unit). */
export function aggregateGroceries(plan: WeekPlan): GroceryItem[] {
  const totals = new Map<
    string,
    { name: string; unit: string; quantity: number; category: string }
  >();

  for (const day of plan.days) {
    for (const meal of day.meals) {
      for (const ing of meal.ingredients) {
        const key = normalizeKey(ing.name, ing.unit);
        const existing = totals.get(key);
        if (existing) {
          existing.quantity += ing.quantity;
        } else {
          totals.set(key, {
            name: ing.name.trim(),
            unit: ing.unit.trim(),
            quantity: ing.quantity,
            category: categorizeIngredient(ing.name),
          });
        }
      }
    }
  }

  return Array.from(totals.values())
    .map((t) => ({
      name: t.name,
      unit: t.unit,
      quantity: Math.round(t.quantity * 100) / 100,
      category: t.category,
    }))
    .sort(
      (a, b) =>
        a.category.localeCompare(b.category) || a.name.localeCompare(b.name),
    );
}

/** Daily macro totals summed from a day's meals. */
export function dayMacroTotals(plan: WeekPlan, day: number) {
  const meals = plan.days.find((d) => d.day === day)?.meals ?? [];
  return meals.reduce(
    (acc, m) => ({
      kcal: acc.kcal + m.macros.kcal,
      protein: acc.protein + m.macros.protein,
      carbs: acc.carbs + m.macros.carbs,
      fat: acc.fat + m.macros.fat,
      fibre: acc.fibre + m.macros.fibre,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 },
  );
}
