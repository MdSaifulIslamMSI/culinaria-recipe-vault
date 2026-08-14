/**
 * Haute Cuisine Recommendation & Taste Intelligence Engine
 * Provides Vector-Inspired Ingredient Matching, Multi-Factor Course Pairing,
 * Personalized Palate Profiling, and Instant Culinary Substitutions.
 */

import { getFavorites } from './storageService.js';
import curatedRecipes from '../data/curated500Recipes.json' with { type: 'json' };

/* ==========================================================================
   1. Culinary Substitution Knowledge Base (45+ Professional Chef Alts)
   ========================================================================== */
export const INGREDIENT_SUBSTITUTIONS = {
  'heavy cream': {
    substitute: '3/4 cup Whole Milk + 1/3 cup Melted Butter (or Greek Yogurt)',
    note: 'Perfect for creamy sauces, soups, and velvety reductions.',
    ratio: '1:1 ratio'
  },
  'cream': {
    substitute: 'Whole milk + touch of butter or Coconut cream (dairy-free)',
    note: 'Whisk gently into hot liquids to prevent curdling.',
    ratio: '1:1 ratio'
  },
  'buttermilk': {
    substitute: '1 cup Whole Milk + 1 tbsp Fresh Lemon Juice (rest for 5 mins)',
    note: 'Yields identical acidity for tenderizing marinades and fluffy baking.',
    ratio: '1:1 ratio'
  },
  'mirin': {
    substitute: 'Dry White Wine (or Sake) + 1/2 tsp Cane Sugar',
    note: 'Provides the characteristic Japanese sweet glaze and umami.',
    ratio: '1:1 ratio'
  },
  'white wine': {
    substitute: 'Chicken or Vegetable Broth + 1 tsp White Wine Vinegar or Lemon Juice',
    note: 'Adds the necessary bright acidity to deglaze fond without alcohol.',
    ratio: '1:1 ratio'
  },
  'red wine': {
    substitute: 'Beef Broth + 1 tbsp Red Wine Vinegar or Pomegranate Juice',
    note: 'Delivers deep tannins and rich color for braised beef or stews.',
    ratio: '1:1 ratio'
  },
  'soy sauce': {
    substitute: 'Tamari (Gluten-Free) or Coconut Aminos or Worcestershire + Pinch of Salt',
    note: 'Maintains savory glutamate depth with lower sodium.',
    ratio: '1:1 ratio'
  },
  'shallots': {
    substitute: 'Finely minced Red / Yellow Onion + 1/4 clove Minced Garlic',
    note: 'Emulates the sweet, delicate allium flavor profile.',
    ratio: '1:1 ratio'
  },
  'garlic': {
    substitute: '1/8 tsp Garlic Powder per fresh clove (or minced Shallot)',
    note: 'Stir in during aromatic saute for optimal aroma.',
    ratio: '1 clove = 1/8 tsp powder'
  },
  'parmesan': {
    substitute: 'Pecorino Romano, Grana Padano, or Nutritional Yeast (vegan)',
    note: 'Delivers sharp, nutty crystallization and salty umami.',
    ratio: '1:1 ratio'
  },
  'parmesan cheese': {
    substitute: 'Pecorino Romano or Aged Asiago',
    note: 'Grate finely over pasta and risottos.',
    ratio: '1:1 ratio'
  },
  'ricotta': {
    substitute: 'Blended Cottage Cheese or Silken Tofu + 1 tsp Lemon Juice',
    note: 'Silky, high-protein alternative for lasagna and stuffed shells.',
    ratio: '1:1 ratio'
  },
  'sour cream': {
    substitute: 'Full-Fat Plain Greek Yogurt or Crème Fraîche',
    note: 'Adds luscious tang with lower saturated fat.',
    ratio: '1:1 ratio'
  },
  'cornstarch': {
    substitute: '2 tbsp All-Purpose Flour or 1 tbsp Arrowroot Powder per tbsp',
    note: 'Make a cold slurry first to prevent clumping in hot sauces.',
    ratio: '1 tbsp cornstarch = 2 tbsp flour'
  },
  'fish sauce': {
    substitute: '1 tbsp Soy Sauce + 1/2 tsp Lime Juice + 1 minced Anchovy (optional)',
    note: 'Provides vital Southeast Asian funk and fermented savoriness.',
    ratio: '1:1 ratio'
  },
  'sesame oil': {
    substitute: 'Toasted Sesame Seeds steeped in Peanut Oil or Avocado Oil',
    note: 'Use as a finishing oil for fragrant Asian stir-fries.',
    ratio: '1:1 ratio'
  },
  'fresh ginger': {
    substitute: '1/4 tsp Ground Dry Ginger per 1 tbsp grated fresh ginger',
    note: 'Ground ginger is more concentrated; use sparingly.',
    ratio: '1 tbsp fresh = 1/4 tsp ground'
  },
  'fresh cilantro': {
    substitute: 'Flat-Leaf Italian Parsley + Fresh Lime Zest (or Fresh Mint)',
    note: 'Ideal for those sensitive to cilantro aldehydes.',
    ratio: '1:1 ratio'
  },
  'dijon mustard': {
    substitute: 'Spicy Brown Mustard or 1/2 tsp Dry Mustard Powder + Splash of White Vinegar',
    note: 'Essential emulsifier for classic French vinaigrettes.',
    ratio: '1:1 ratio'
  },
  'brown sugar': {
    substitute: '1 cup Granulated White Sugar + 1 tbsp Dark Molasses or Maple Syrup',
    note: 'Recreates moisture and caramel notes in sauces and glazes.',
    ratio: '1:1 ratio'
  },
  'tomato paste': {
    substitute: '3 tbsp Tomato Puree / Sauce simmered until reduced by half',
    note: 'Cook in oil first to deepen color and eliminate raw acidity.',
    ratio: '3 tbsp sauce = 1 tbsp paste'
  },
  'tahini': {
    substitute: 'Smooth Sunflower Seed Butter or Natural Peanut Butter + Sesame Oil',
    note: 'Creates velvety hummus and Mediterranean dressings.',
    ratio: '1:1 ratio'
  }
};

/**
 * Finds substitution advice for any given ingredient name
 */
export function getIngredientSubstitution(ingredientName) {
  if (!ingredientName || typeof ingredientName !== 'string') return null;
  const normalized = ingredientName.toLowerCase().trim();

  // 1. Direct match
  if (INGREDIENT_SUBSTITUTIONS[normalized]) {
    return INGREDIENT_SUBSTITUTIONS[normalized];
  }

  // 2. Keyword partial search
  for (const [key, val] of Object.entries(INGREDIENT_SUBSTITUTIONS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return val;
    }
  }

  return null;
}

/* ==========================================================================
   2. Ingredient Vectorization & Similarity Math
   ========================================================================== */
function extractIngredientTokens(recipe) {
  if (!recipe) return new Set();
  const tokens = new Set();

  if (Array.isArray(recipe.ingredients)) {
    recipe.ingredients.forEach(ing => {
      const name = (typeof ing === 'string' ? ing : ing.name || '').toLowerCase();
      name.split(/\s+/).forEach(t => {
        const clean = t.replace(/[^a-z]/g, '');
        if (clean.length > 2 && !['and', 'the', 'for', 'with', 'fresh', 'chopped', 'diced', 'minced'].includes(clean)) {
          tokens.add(clean);
        }
      });
    });
  }

  return tokens;
}

function calculateJaccardSimilarity(setA, setB) {
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersectionCount = 0;
  for (const item of setA) {
    if (setB.has(item)) intersectionCount++;
  }
  const unionCount = setA.size + setB.size - intersectionCount;
  return unionCount === 0 ? 0 : intersectionCount / unionCount;
}

/* ==========================================================================
   3. Multi-Factor "You May Also Like" & Course Pairing Engine
   ========================================================================== */
export function getRelatedRecipes(currentRecipe, pool = curatedRecipes, limit = 3) {
  if (!currentRecipe || !pool || pool.length === 0) return [];

  const currentId = String(currentRecipe.id || currentRecipe.idMeal || '');
  const currentCategory = (currentRecipe.category || currentRecipe.strCategory || '').toLowerCase();
  const currentArea = (currentRecipe.area || currentRecipe.strArea || '').toLowerCase();
  const currentTokens = extractIngredientTokens(currentRecipe);

  const scored = [];

  pool.forEach(candidate => {
    const candidateId = String(candidate.id || candidate.idMeal || '');
    if (candidateId === currentId) return;

    const candidateCat = (candidate.category || candidate.strCategory || '').toLowerCase();
    const candidateArea = (candidate.area || candidate.strArea || '').toLowerCase();
    const candidateTokens = extractIngredientTokens(candidate);

    const ingSim = calculateJaccardSimilarity(currentTokens, candidateTokens);
    const sameArea = candidateArea === currentArea ? 0.35 : 0;
    const sameCat = candidateCat === currentCategory ? 0.25 : 0;

    // Course complementarity logic:
    // If current is Savory Main (Beef/Chicken/Seafood), reward Dessert/Starter/Side from same cuisine
    let complementBonus = 0;
    let pairingBadge = 'Similar Creation';

    if (['beef', 'chicken', 'seafood', 'pork', 'lamb', 'pasta'].includes(currentCategory)) {
      if (candidateCat === 'dessert' && candidateArea === currentArea) {
        complementBonus = 0.45;
        pairingBadge = `Sweet ${candidate.area || 'Regional'} Finish`;
      } else if (candidateCat === 'side' && candidateArea === currentArea) {
        complementBonus = 0.40;
        pairingBadge = 'Harmonious Side Pairing';
      } else if (candidateCat === 'starter' && candidateArea === currentArea) {
        complementBonus = 0.38;
        pairingBadge = 'Ideal First Course';
      } else if (candidateArea === currentArea) {
        pairingBadge = `${candidate.area || 'Regional'} Tradition`;
      }
    } else if (currentCategory === 'dessert') {
      if (candidateCat === 'dessert') {
        pairingBadge = 'Patisserie Alternative';
      } else if (candidateArea === currentArea) {
        pairingBadge = `Complementary ${candidate.area} Main`;
      }
    }

    const totalScore = (ingSim * 0.4) + sameArea + sameCat + complementBonus;

    scored.push({
      recipe: candidate,
      score: totalScore,
      pairingBadge
    });
  });

  // Sort by score descending and take top N
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

/* ==========================================================================
   4. Personalized "Curated For Your Palate" Ribbon Engine
   ========================================================================== */
export function getPersonalizedRecommendations(favorites = getFavorites(), pool = curatedRecipes, limit = 6) {
  if (!favorites || favorites.length === 0) {
    // Cold start fallback: Return top trending chef selections
    return pool.slice(0, limit).map(r => ({
      recipe: r,
      rationale: '🌟 Chef Signature Special'
    }));
  }

  const favIds = new Set(favorites.map(f => String(f.id || f.idMeal)));

  // Aggregate user affinity profile
  const categoryFreq = {};
  const areaFreq = {};
  const allFavTokens = new Set();

  favorites.forEach(f => {
    const cat = f.category || f.strCategory;
    const area = f.area || f.strArea;
    if (cat) categoryFreq[cat] = (categoryFreq[cat] || 0) + 1;
    if (area) areaFreq[area] = (areaFreq[area] || 0) + 1;

    extractIngredientTokens(f).forEach(t => allFavTokens.add(t));
  });

  // Find top preferred cuisine and category
  const topCategory = Object.keys(categoryFreq).sort((a, b) => categoryFreq[b] - categoryFreq[a])[0] || '';
  const topArea = Object.keys(areaFreq).sort((a, b) => areaFreq[b] - areaFreq[a])[0] || '';

  const candidates = pool.filter(r => !favIds.has(String(r.id || r.idMeal)));

  const scored = candidates.map(candidate => {
    const cat = candidate.category || candidate.strCategory || '';
    const area = candidate.area || candidate.strArea || '';
    const tokens = extractIngredientTokens(candidate);

    const ingSim = calculateJaccardSimilarity(allFavTokens, tokens);
    const catMatch = cat.toLowerCase() === topCategory.toLowerCase() ? 0.35 : 0;
    const areaMatch = area.toLowerCase() === topArea.toLowerCase() ? 0.40 : 0;

    const score = (ingSim * 0.45) + catMatch + areaMatch;

    let rationale = '✨ Recommended for your taste';
    if (areaMatch > 0 && catMatch > 0) {
      rationale = `Matches your passion for ${area} ${cat}`;
    } else if (areaMatch > 0) {
      rationale = `Because you enjoy ${area} cuisine`;
    } else if (catMatch > 0) {
      rationale = `Based on your favorite ${cat} dishes`;
    } else if (ingSim > 0.15) {
      rationale = 'Shares your favorite flavor aromatics';
    }

    return {
      recipe: candidate,
      score,
      rationale
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}
