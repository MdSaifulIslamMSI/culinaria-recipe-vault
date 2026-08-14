/**
 * TheMealDB API Client with Offline-Resilient Fallbacks & Smart Step Parsing
 * Open-source, CORS-friendly, free recipe database service
 */

import { getFavorites } from './storageService.js';

const BASE_URL = 'https://www.themealdb.com/api/json/v1/1';
const cache = new Map();

// Built-in curated gourmet recipes for instantaneous load & offline resilience
const CURATED_FALLBACK_RECIPES = [
  {
    idMeal: "52772",
    strMeal: "Teriyaki Chicken Casserole",
    strCategory: "Chicken",
    strArea: "Japanese",
    strInstructions: "Preheat oven to 350°F (175°C). Combine chicken, soy sauce, brown sugar, ginger, and garlic in a bowl.\r\nIn a small bowl, mix cornstarch and water until smooth; stir into soy sauce mixture.\r\nSpread cooked rice into a 9x13 inch baking dish.\r\nLayer stir-fry vegetables over rice, then top with chicken mixture.\r\nBake for 30 minutes in preheated oven until chicken is cooked through and sauce is bubbling.\r\nGarnish with toasted sesame seeds and sliced green onions before serving.",
    strMealThumb: "https://www.themealdb.com/images/media/meals/wvpsxx1468256321.jpg",
    strYoutube: "https://www.youtube.com/watch?v=4aZr5hZXP_s",
    strIngredient1: "Chicken Breast", strMeasure1: "3/4 lb",
    strIngredient2: "Soy Sauce", strMeasure2: "1/2 cup",
    strIngredient3: "Brown Sugar", strMeasure3: "1/4 cup",
    strIngredient4: "Garlic", strMeasure4: "2 cloves",
    strIngredient5: "Ginger", strMeasure5: "1 tsp minced",
    strIngredient6: "Cornstarch", strMeasure6: "1 tbsp",
    strIngredient7: "Jasmine Rice", strMeasure7: "2 cups cooked",
    strIngredient8: "Stir-fry Vegetables", strMeasure8: "2 cups",
    strIngredient9: "Sesame Seeds", strMeasure9: "1 tbsp"
  },
  {
    idMeal: "52844",
    strMeal: "Classic Lasagna Bolognese",
    strCategory: "Pasta",
    strArea: "Italian",
    strInstructions: "Heat olive oil in a large skillet over medium-high heat. Add ground beef, onions, and minced garlic; cook until browned.\r\nStir in crushed tomatoes, tomato paste, basil, oregano, salt, and black pepper. Simmer sauce for 20 minutes.\r\nPreheat oven to 375°F (190°C).\r\nIn a 9x13 inch baking dish, spread a thin layer of meat sauce.\r\nLayer lasagna noodles, ricotta cheese mixture, mozzarella, and meat sauce. Repeat for 3 layers.\r\nCover with aluminum foil and bake for 25 minutes. Uncover and bake for an additional 15 minutes until cheese is golden and bubbling.\r\nRest for 10 minutes before slicing.",
    strMealThumb: "https://www.themealdb.com/images/media/meals/wtsvxx1511296896.jpg",
    strYoutube: "https://www.youtube.com/watch?v=gfhfsBPt46s",
    strIngredient1: "Ground Beef", strMeasure1: "500g",
    strIngredient2: "Lasagna Sheets", strMeasure2: "12 sheets",
    strIngredient3: "Crushed Tomatoes", strMeasure3: "800g",
    strIngredient4: "Mozzarella Cheese", strMeasure4: "300g shredded",
    strIngredient5: "Ricotta Cheese", strMeasure5: "250g",
    strIngredient6: "Garlic", strMeasure6: "3 cloves",
    strIngredient7: "Olive Oil", strMeasure7: "2 tbsp",
    strIngredient8: "Fresh Basil", strMeasure8: "1 handful"
  },
  {
    idMeal: "52959",
    strMeal: "Baked Salmon with Garlic Herb Butter",
    strCategory: "Seafood",
    strArea: "Mediterranean",
    strInstructions: "Preheat oven to 400°F (200°C) and line a rimmed baking sheet with parchment paper.\r\nPlace salmon fillets skin-side down on the prepared baking sheet. Season generously with sea salt and cracked black pepper.\r\nIn a small pan, melt butter over low heat with minced garlic, lemon juice, and fresh dill.\r\nSpoon the garlic herb butter mixture evenly over each salmon fillet.\r\nBake for 12 to 15 minutes until salmon is tender and flakes easily with a fork.\r\nBroil on high for 2 minutes for a crisp golden crust. Garnish with lemon slices and fresh parsley.",
    strMealThumb: "https://www.themealdb.com/images/media/meals/1548772327.jpg",
    strYoutube: "https://www.youtube.com/watch?v=sq5y252b4pA",
    strIngredient1: "Salmon Fillets", strMeasure1: "4 fillets (600g)",
    strIngredient2: "Butter", strMeasure2: "4 tbsp melted",
    strIngredient3: "Garlic", strMeasure3: "4 cloves minced",
    strIngredient4: "Lemon", strMeasure4: "1 whole juiced",
    strIngredient5: "Fresh Dill", strMeasure5: "2 tbsp chopped",
    strIngredient6: "Parsley", strMeasure6: "1 tbsp"
  },
  {
    idMeal: "52855",
    strMeal: "Authentic Birria Tacos",
    strCategory: "Beef",
    strArea: "Mexican",
    strInstructions: "Sear seasoned beef chuck roast in a large Dutch oven until deeply caramelized on all sides.\r\nToast dried guajillo and ancho chiles in a dry pan for 2 minutes, then rehydrate in warm broth.\r\nBlend chiles with roasted tomatoes, garlic, apple cider vinegar, Mexican oregano, cumin, and beef broth until velvety smooth.\r\nPour consommé over beef, bring to a simmer, cover and braise on low heat for 3 hours until fork-tender.\r\nShred the beef. Dip corn tortillas into the warm crimson broth, place on a hot skillet, top with shredded beef, diced white onion, cilantro, and Oaxaca cheese.\r\nFold in half and crisp for 2 minutes per side. Serve immediately with a bowl of hot consommé for dipping.",
    strMealThumb: "https://www.themealdb.com/images/media/meals/yypvst1511386427.jpg",
    strYoutube: "https://www.youtube.com/watch?v=0h3jO_9Qk4o",
    strIngredient1: "Beef Chuck Roast", strMeasure1: "1 kg",
    strIngredient2: "Corn Tortillas", strMeasure2: "12 tortillas",
    strIngredient3: "Guajillo Chiles", strMeasure3: "4 dried",
    strIngredient4: "Oaxaca Cheese", strMeasure4: "200g shredded",
    strIngredient5: "White Onion", strMeasure5: "1 diced",
    strIngredient6: "Cilantro", strMeasure6: "1 bunch",
    strIngredient7: "Beef Broth", strMeasure7: "4 cups",
    strIngredient8: "Garlic", strMeasure8: "6 cloves"
  },
  {
    idMeal: "52771",
    strMeal: "Spicy Creamy Arrabiata Penne",
    strCategory: "Vegetarian",
    strArea: "Italian",
    strInstructions: "Bring a large pot of salted water to a rapid boil. Cook penne pasta until al dente (approx 10 minutes).\r\nIn a wide pan, heat extra virgin olive oil over medium heat. Sauté sliced garlic and red chili flakes for 1 minute until fragrant.\r\nAdd San Marzano whole peeled tomatoes, crushing them with a wooden spoon. Simmer gently for 15 minutes.\r\nStir in a touch of heavy cream and freshly grated Parmigiano-Reggiano.\r\nToss cooked penne directly into the sauce along with a splash of starchy pasta water.\r\nFinish with fresh torn basil leaves and a drizzle of spicy olive oil.",
    strMealThumb: "https://www.themealdb.com/images/media/meals/ustsqw1468250014.jpg",
    strYoutube: "https://www.youtube.com/watch?v=1IszT_guI08",
    strIngredient1: "Penne Pasta", strMeasure1: "400g",
    strIngredient2: "San Marzano Tomatoes", strMeasure2: "800g",
    strIngredient3: "Garlic", strMeasure3: "4 cloves sliced",
    strIngredient4: "Red Chili Flakes", strMeasure4: "1 tsp",
    strIngredient5: "Olive Oil", strMeasure5: "3 tbsp",
    strIngredient6: "Parmesan Cheese", strMeasure6: "50g grated",
    strIngredient7: "Fresh Basil", strMeasure7: "8 leaves"
  },
  {
    idMeal: "52893",
    strMeal: "Rich Chocolate Lava Soufflé",
    strCategory: "Dessert",
    strArea: "French",
    strInstructions: "Preheat oven to 425°F (220°C). Butter four 6-ounce ramekins and dust with cocoa powder.\r\nMelt dark chocolate (70%) and unsalted butter together in a heatproof bowl set over simmering water; stir until glossy.\r\nIn a separate bowl, whisk whole eggs, egg yolks, and confectioners sugar until pale and fluffy.\r\nFold the melted chocolate into the egg mixture, then gently sift in all-purpose flour and a pinch of salt.\r\nDivide batter evenly among prepared ramekins.\r\nBake for 12 minutes until edges are firm but the centers remain soft and molten.\r\nLet rest for 1 minute, invert onto dessert plates, and dust with powdered sugar and fresh raspberries.",
    strMealThumb: "https://www.themealdb.com/images/media/meals/yqsrrm1483186027.jpg",
    strYoutube: "https://www.youtube.com/watch?v=cM3i7G0e5mY",
    strIngredient1: "Dark Chocolate 70%", strMeasure1: "200g",
    strIngredient2: "Unsalted Butter", strMeasure2: "100g",
    strIngredient3: "Powdered Sugar", strMeasure3: "1/2 cup",
    strIngredient4: "Eggs", strMeasure4: "2 whole + 2 yolks",
    strIngredient5: "Flour", strMeasure5: "3 tbsp",
    strIngredient6: "Vanilla Extract", strMeasure6: "1 tsp"
  }
];

/**
 * Robust step splitter: Handles newlines, numbered lists, and sentence blocks
 */
export function parseInstructionSteps(rawInstructions) {
  if (!rawInstructions || typeof rawInstructions !== 'string') {
    return ['Follow recipe preparation instructions and savor your creation!'];
  }

  // Split by newlines first
  let steps = rawInstructions
    .split(/\r?\n+/)
    .map(s => s.trim())
    .filter(s => s.length > 5 && !s.match(/^(step\s*\d+:?|instructions:?|method:?)/i));

  // If newlines did not split (e.g. single giant paragraph)
  if (steps.length <= 1 && rawInstructions.length > 80) {
    if (/(?:^|\s)\d+[\.\)]\s+/.test(rawInstructions)) {
      steps = rawInstructions
        .split(/(?:^|\s)\d+[\.\)]\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 5);
    } else if (/(?:^|\s)STEP\s*\d+:?\s*/i.test(rawInstructions)) {
      steps = rawInstructions
        .split(/(?:^|\s)STEP\s*\d+:?\s*/i)
        .map(s => s.trim())
        .filter(s => s.length > 5);
    } else {
      // Split by pairs of sentences
      const sentences = rawInstructions.match(/[^.!?]+[.!?]+(\s|$)/g);
      if (sentences && sentences.length > 1) {
        steps = [];
        let currentStep = '';
        sentences.forEach((sent, idx) => {
          currentStep += ' ' + sent.trim();
          if ((idx + 1) % 2 === 0 || idx === sentences.length - 1) {
            steps.push(currentStep.trim());
            currentStep = '';
          }
        });
      }
    }
  }

  return steps.length > 0 ? steps : [rawInstructions];
}

/**
 * Normalizes raw MealDB recipe object into a clean structured format
 */
export function formatRecipe(meal) {
  if (!meal) return null;

  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const ing = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    if (ing && ing.trim()) {
      ingredients.push({
        id: `ing-${i}`,
        name: ing.trim(),
        measure: measure ? measure.trim() : 'As needed'
      });
    }
  }

  // Parse YouTube video ID
  let youtubeId = null;
  if (meal.strYoutube) {
    const match = meal.strYoutube.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (match && match[1]) {
      youtubeId = match[1];
    }
  }

  const tags = meal.strTags 
    ? meal.strTags.split(',').map(t => t.trim()).filter(Boolean)
    : [];

  const rawInstructions = meal.strInstructions || '';
  const steps = parseInstructionSteps(rawInstructions);

  let estimatedTime = 30;
  if (meal.strCategory === 'Dessert' || meal.strCategory === 'Baking') estimatedTime = 45;
  if (meal.strCategory === 'Beef' || meal.strCategory === 'Lamb' || meal.strCategory === 'Pork') estimatedTime = 50;
  if (meal.strCategory === 'Pasta' || meal.strCategory === 'Seafood') estimatedTime = 25;
  if (meal.strCategory === 'Breakfast' || meal.strCategory === 'Starter') estimatedTime = 15;

  return {
    id: meal.idMeal,
    title: meal.strMeal,
    category: meal.strCategory || 'Miscellaneous',
    area: meal.strArea || 'International',
    instructions: rawInstructions,
    steps,
    thumbnail: meal.strMealThumb,
    youtubeId,
    youtubeUrl: meal.strYoutube || null,
    sourceUrl: meal.strSource || null,
    tags,
    ingredients,
    estimatedTime,
    servings: 4
  };
}

/**
 * Fetch wrapper with cache & error handling
 */
async function fetchWithCache(endpoint) {
  const url = `${BASE_URL}/${endpoint}`;
  if (cache.has(url)) {
    return cache.get(url);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`MealDB API error: ${response.status}`);
    }
    const data = await response.json();
    cache.set(url, data);
    return data;
  } catch (error) {
    console.warn(`Fetch error for ${endpoint}, using fallback:`, error);
    return null;
  }
}

/**
 * Search recipes by name or keywords
 */
export async function searchRecipes(query = '') {
  const data = await fetchWithCache(`search.php?s=${encodeURIComponent(query)}`);
  if (data && data.meals && data.meals.length > 0) {
    return data.meals.map(formatRecipe);
  }

  if (!query) {
    return CURATED_FALLBACK_RECIPES.map(formatRecipe);
  }
  const q = query.toLowerCase();
  const matched = CURATED_FALLBACK_RECIPES.filter(m => 
    m.strMeal.toLowerCase().includes(q) || 
    m.strCategory.toLowerCase().includes(q) ||
    m.strArea.toLowerCase().includes(q)
  );
  return (matched.length > 0 ? matched : CURATED_FALLBACK_RECIPES).map(formatRecipe);
}

/**
 * Get full recipe details by ID
 */
export async function getRecipeById(id) {
  if (!id) return null;
  const strId = String(id);

  // 1. Check offline saved favorites first
  try {
    const favs = getFavorites();
    const favMatch = favs.find(r => String(r.id || r.idMeal) === strId);
    if (favMatch && favMatch.ingredients && favMatch.ingredients.length > 0 && favMatch.steps && favMatch.steps.length > 0) {
      return favMatch;
    }
  } catch (e) {
    // Continue
  }

  // 2. Fetch from API with cache
  const data = await fetchWithCache(`lookup.php?i=${encodeURIComponent(strId)}`);
  if (data && data.meals && data.meals[0]) {
    return formatRecipe(data.meals[0]);
  }

  // 3. Check curated fallback dataset
  const fallback = CURATED_FALLBACK_RECIPES.find(m => String(m.idMeal) === strId) || CURATED_FALLBACK_RECIPES[0];
  return formatRecipe(fallback);
}

/**
 * Get a random recipe (Roulette / Surprise Me)
 */
export async function getRandomRecipe() {
  try {
    const response = await fetch(`${BASE_URL}/random.php?_t=${Date.now()}`);
    const data = await response.json();
    if (data && data.meals && data.meals[0]) {
      return formatRecipe(data.meals[0]);
    }
  } catch (e) {
    console.warn(e);
  }

  const randomFallback = CURATED_FALLBACK_RECIPES[Math.floor(Math.random() * CURATED_FALLBACK_RECIPES.length)];
  return formatRecipe(randomFallback);
}

/**
 * Get all available categories
 */
export async function getCategories() {
  const data = await fetchWithCache('categories.php');
  if (data && data.categories) {
    return data.categories.map(c => ({
      id: c.idCategory,
      name: c.strCategory,
      thumbnail: c.strCategoryThumb,
      description: c.strCategoryDescription
    }));
  }

  return [
    { id: "1", name: "Beef" },
    { id: "2", name: "Chicken" },
    { id: "3", name: "Dessert" },
    { id: "4", name: "Lamb" },
    { id: "5", name: "Pasta" },
    { id: "6", name: "Pork" },
    { id: "7", name: "Seafood" },
    { id: "8", name: "Side" },
    { id: "9", name: "Starter" },
    { id: "10", name: "Vegan" },
    { id: "11", name: "Vegetarian" },
    { id: "12", name: "Breakfast" }
  ];
}

/**
 * Get all available areas / cuisines
 */
export async function getAreas() {
  const data = await fetchWithCache('list.php?a=list');
  if (data && data.meals) {
    return data.meals.map(m => m.strArea).filter(Boolean);
  }

  return ["American", "British", "Canadian", "Chinese", "French", "Greek", "Indian", "Italian", "Japanese", "Mexican", "Spanish", "Thai"];
}

/**
 * Filter recipes by category
 */
export async function filterByCategory(category) {
  if (!category || category === 'all') return searchRecipes('');
  const data = await fetchWithCache(`filter.php?c=${encodeURIComponent(category)}`);
  if (data && data.meals) {
    return data.meals.map(m => ({
      id: m.idMeal,
      title: m.strMeal,
      thumbnail: m.strMealThumb,
      category: category,
      area: '',
      estimatedTime: 30
    }));
  }

  return CURATED_FALLBACK_RECIPES.filter(m => m.strCategory.toLowerCase() === category.toLowerCase()).map(formatRecipe);
}

/**
 * Filter recipes by cuisine area
 */
export async function filterByArea(area) {
  if (!area || area === 'all') return searchRecipes('');
  const data = await fetchWithCache(`filter.php?a=${encodeURIComponent(area)}`);
  if (data && data.meals) {
    return data.meals.map(m => ({
      id: m.idMeal,
      title: m.strMeal,
      thumbnail: m.strMealThumb,
      category: '',
      area: area,
      estimatedTime: 30
    }));
  }

  return CURATED_FALLBACK_RECIPES.filter(m => m.strArea.toLowerCase() === area.toLowerCase()).map(formatRecipe);
}

/**
 * Accurate intersection filter for Category AND Cuisine Area
 */
export async function filterByCategoryAndArea(category = 'all', area = 'all') {
  if (category === 'all' && area === 'all') {
    return searchRecipes('');
  }
  if (category !== 'all' && area === 'all') {
    return filterByCategory(category);
  }
  if (category === 'all' && area !== 'all') {
    return filterByArea(area);
  }

  // Both category and area are active: fetch both and calculate true intersection
  const [catData, areaData] = await Promise.all([
    fetchWithCache(`filter.php?c=${encodeURIComponent(category)}`),
    fetchWithCache(`filter.php?a=${encodeURIComponent(area)}`)
  ]);

  const catMeals = (catData && catData.meals) ? catData.meals : [];
  const areaMeals = (areaData && areaData.meals) ? areaData.meals : [];

  if (catMeals.length === 0 || areaMeals.length === 0) {
    return [];
  }

  const areaIdSet = new Set(areaMeals.map(m => String(m.idMeal)));
  const matched = catMeals.filter(m => areaIdSet.has(String(m.idMeal)));

  return matched.map(m => ({
    id: m.idMeal,
    title: m.strMeal,
    thumbnail: m.strMealThumb,
    category: category,
    area: area,
    estimatedTime: 30
  }));
}

/**
 * Sanitizes and normalizes pantry ingredient query for MealDB
 */
export function sanitizeIngredientKey(name) {
  if (!name) return '';
  const clean = name.toLowerCase().trim()
    .replace(/\b(cloves?|pieces?|fillets?|slices?|chopped|fresh|diced|ground|whole)\b/gi, '')
    .trim();

  // Alias lookup for common pantry terms
  const aliases = {
    'chicken': 'chicken_breast',
    'egg': 'egg',
    'eggs': 'egg',
    'tomatoes': 'tomato',
    'potatoes': 'potato',
    'onions': 'onion',
    'garlic': 'garlic',
    'cheeses': 'cheese',
    'prawns': 'prawns',
    'shrimps': 'prawns'
  };

  return aliases[clean] || clean.replace(/\s+/g, '_');
}

/**
 * Filter recipes by single ingredient
 */
export async function filterByIngredient(ingredient) {
  const sanitized = sanitizeIngredientKey(ingredient);
  const data = await fetchWithCache(`filter.php?i=${encodeURIComponent(sanitized)}`);
  if (data && data.meals) {
    return data.meals.map(m => ({
      id: m.idMeal,
      title: m.strMeal,
      thumbnail: m.strMealThumb,
      category: 'Pantry Match',
      area: 'Global',
      estimatedTime: 30
    }));
  }

  return CURATED_FALLBACK_RECIPES.map(m => ({
    id: m.idMeal,
    title: m.strMeal,
    thumbnail: m.strMealThumb,
    category: 'Pantry Match',
    area: 'Global',
    estimatedTime: 30
  }));
}
