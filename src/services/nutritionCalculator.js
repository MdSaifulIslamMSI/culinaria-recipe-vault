/**
 * Nutrition Calculator Service
 * Estimates macro-nutritional values (Calories, Protein, Carbs, Fat, Fiber)
 * based on ingredient profiles and recipe categories
 */

const INGREDIENT_PROFILES = [
  { match: /chicken|turkey|poultry/i, cal: 165, pro: 31, carb: 0, fat: 3.6 },
  { match: /beef|steak|mince|ground beef/i, cal: 250, pro: 26, carb: 0, fat: 15 },
  { match: /pork|bacon|ham|sausage/i, cal: 242, pro: 27, carb: 0, fat: 14 },
  { match: /salmon|tuna|fish|shrimp|prawn|cod/i, cal: 140, pro: 24, carb: 0, fat: 4 },
  { match: /egg/i, cal: 72, pro: 6, carb: 0.5, fat: 5 },
  { match: /cheese|mozzarella|parmesan|cheddar|feta/i, cal: 350, pro: 25, carb: 2, fat: 28 },
  { match: /milk|cream|yogurt|sour cream/i, cal: 120, pro: 6, carb: 10, fat: 7 },
  { match: /rice|basmati|jasmine/i, cal: 130, pro: 2.7, carb: 28, fat: 0.3 },
  { match: /pasta|spaghetti|noodle|macaroni/i, cal: 150, pro: 5.5, carb: 30, fat: 0.9 },
  { match: /potato|potatoes/i, cal: 87, pro: 2, carb: 20, fat: 0.1 },
  { match: /flour|bread|dough/i, cal: 364, pro: 10, carb: 76, fat: 1 },
  { match: /sugar|honey|syrup/i, cal: 387, pro: 0, carb: 100, fat: 0 },
  { match: /oil|olive oil|butter|ghee/i, cal: 884, pro: 0, carb: 0, fat: 100 },
  { match: /bean|lentil|chickpea|tofu/i, cal: 110, pro: 8, carb: 18, fat: 1.5 },
  { match: /avocado/i, cal: 160, pro: 2, carb: 8.5, fat: 14.7 },
  { match: /chocolate|cocoa/i, cal: 450, pro: 5, carb: 55, fat: 25 }
];

export function estimateNutrition(recipe, currentServings = 4) {
  if (!recipe) return { calories: 450, protein: 25, carbs: 45, fat: 18 };

  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  const baseServings = recipe.servings || 4;
  const ingredients = recipe.ingredients || [];

  if (ingredients.length === 0) {
    // Category-based fallback
    switch (recipe.category?.toLowerCase()) {
      case 'dessert':
        return { calories: 380, protein: 6, carbs: 54, fat: 16 };
      case 'pasta':
        return { calories: 520, protein: 22, carbs: 68, fat: 15 };
      case 'seafood':
        return { calories: 360, protein: 32, carbs: 18, fat: 11 };
      case 'vegetarian':
      case 'vegan':
        return { calories: 320, protein: 14, carbs: 42, fat: 9 };
      case 'beef':
      case 'lamb':
        return { calories: 580, protein: 38, carbs: 22, fat: 26 };
      default:
        return { calories: 460, protein: 28, carbs: 36, fat: 17 };
    }
  }

  // Calculate based on detected ingredient profiles
  let matchedProfiles = 0;
  ingredients.forEach(item => {
    const name = item.name.toLowerCase();
    for (const prof of INGREDIENT_PROFILES) {
      if (prof.match.test(name)) {
        totalCalories += prof.cal * 0.8;
        totalProtein += prof.pro * 0.8;
        totalCarbs += prof.carb * 0.8;
        totalFat += prof.fat * 0.8;
        matchedProfiles++;
        break;
      }
    }
  });

  // Base adjustments
  if (matchedProfiles === 0) {
    totalCalories = 1800;
    totalProtein = 90;
    totalCarbs = 180;
    totalFat = 65;
  } else {
    // Normalization buffer
    totalCalories = Math.max(totalCalories, 1400);
    totalProtein = Math.max(totalProtein, 50);
    totalCarbs = Math.max(totalCarbs, 80);
    totalFat = Math.max(totalFat, 35);
  }

  // Per serving calculation
  const perServingCalories = Math.round(totalCalories / baseServings);
  const perServingProtein = Math.round(totalProtein / baseServings);
  const perServingCarbs = Math.round(totalCarbs / baseServings);
  const perServingFat = Math.round(totalFat / baseServings);

  return {
    calories: perServingCalories,
    protein: perServingProtein,
    carbs: perServingCarbs,
    fat: perServingFat
  };
}
