/**
 * Stateless REST API Routes for Culinaria Backend
 */
import { Router } from 'express';
import curatedRecipes from '../../src/data/curated500Recipes.js';
import { INGREDIENT_SUBSTITUTIONS } from '../../src/services/recommendationEngine.js';

const router = Router();
const startTime = Date.now();

// Demonym Normalization Dictionary
const AREA_DEMONYM_MAP = {
  'indian': ['indian', 'india'],
  'american': ['american', 'united states', 'usa', 'us'],
  'british': ['british', 'uk', 'united kingdom', 'england'],
  'canadian': ['canadian', 'canada'],
  'chinese': ['chinese', 'china'],
  'croatian': ['croatian', 'croatia'],
  'dutch': ['dutch', 'netherlands', 'holland'],
  'egyptian': ['egyptian', 'egypt'],
  'filipino': ['filipino', 'philippines'],
  'french': ['french', 'france'],
  'greek': ['greek', 'greece'],
  'irish': ['irish', 'ireland'],
  'italian': ['italian', 'italy'],
  'jamaican': ['jamaican', 'jamaica'],
  'japanese': ['japanese', 'japan'],
  'kenyan': ['kenyan', 'kenya'],
  'malaysian': ['malaysian', 'malaysia'],
  'mexican': ['mexican', 'mexico'],
  'moroccan': ['moroccan', 'morocco'],
  'polish': ['polish', 'poland'],
  'portuguese': ['portuguese', 'portugal'],
  'russian': ['russian', 'russia'],
  'spanish': ['spanish', 'spain'],
  'thai': ['thai', 'thailand'],
  'tunisian': ['tunisian', 'tunisia'],
  'turkish': ['turkish', 'turkey'],
  'ukrainian': ['ukrainian', 'ukraine'],
  'vietnamese': ['vietnamese', 'vietnam']
};

function matchesArea(targetArea, recipeArea) {
  if (!targetArea || !recipeArea) return false;
  const t = targetArea.toLowerCase().trim();
  const r = recipeArea.toLowerCase().trim();
  if (t === r) return true;
  for (const aliases of Object.values(AREA_DEMONYM_MAP)) {
    if (aliases.includes(t) && aliases.includes(r)) return true;
  }
  return false;
}

/**
 * GET /api/health
 * Telemetry, server uptime, memory usage, and catalog status
 */
router.get('/health', (req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  const memory = process.memoryUsage();

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds,
    nodeVersion: process.version,
    memory: {
      rssMB: Math.round(memory.rss / 1024 / 1024),
      heapUsedMB: Math.round(memory.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(memory.heapTotal / 1024 / 1024)
    },
    catalog: {
      totalRecipes: curatedRecipes.length,
      categoriesCount: new Set(curatedRecipes.map(r => r.strCategory).filter(Boolean)).size,
      areasCount: new Set(curatedRecipes.map(r => r.strArea).filter(Boolean)).size
    }
  });
});

/**
 * GET /api/recipes/search
 * Search recipes by query text, category, or cuisine area
 */
router.get('/recipes/search', (req, res) => {
  const q = (req.query.q || '').trim().toLowerCase();
  const category = (req.query.category || '').trim();
  const area = (req.query.area || '').trim();

  let results = curatedRecipes;

  if (category) {
    results = results.filter(r => (r.strCategory || '').toLowerCase() === category.toLowerCase());
  }

  if (area) {
    results = results.filter(r => matchesArea(area, r.strArea));
  }

  if (q) {
    results = results.filter(r => {
      const title = (r.strMeal || '').toLowerCase();
      const tags = (r.strTags || '').toLowerCase();
      const cat = (r.strCategory || '').toLowerCase();
      const ar = (r.strArea || '').toLowerCase();

      if (title.includes(q) || tags.includes(q) || cat.includes(q) || ar.includes(q)) {
        return true;
      }

      for (let i = 1; i <= 20; i++) {
        const ing = (r[`strIngredient${i}`] || '').toLowerCase();
        if (ing && ing.includes(q)) return true;
      }
      return false;
    });
  }

  res.json({
    total: results.length,
    recipes: results.slice(0, 100) // Capped for optimal latency
  });
});

/**
 * GET /api/recipes/random
 * Retrieves a random recipe from the catalog (Chef Roulette)
 */
router.get('/recipes/random', (req, res) => {
  const randomIndex = Math.floor(Math.random() * curatedRecipes.length);
  res.json({
    recipe: curatedRecipes[randomIndex]
  });
});

/**
 * GET /api/recipes/categories
 * Returns list of distinct categories with count
 */
router.get('/recipes/categories', (req, res) => {
  const counts = {};
  for (const r of curatedRecipes) {
    if (r.strCategory) {
      counts[r.strCategory] = (counts[r.strCategory] || 0) + 1;
    }
  }
  res.json({
    categories: Object.entries(counts).map(([name, count]) => ({ name, count }))
  });
});

/**
 * GET /api/recipes/areas
 * Returns list of distinct areas with count
 */
router.get('/recipes/areas', (req, res) => {
  const counts = {};
  for (const r of curatedRecipes) {
    if (r.strArea) {
      counts[r.strArea] = (counts[r.strArea] || 0) + 1;
    }
  }
  res.json({
    areas: Object.entries(counts).map(([name, count]) => ({ name, count }))
  });
});

/**
 * POST /api/recipes/pantry
 * Multi-ingredient combinatorial matching with match percentages
 */
router.post('/recipes/pantry', (req, res) => {
  const ingredients = Array.isArray(req.body?.ingredients) 
    ? req.body.ingredients.map(i => String(i).trim().toLowerCase()).filter(Boolean)
    : [];

  if (ingredients.length === 0) {
    return res.json({ total: 0, matches: [] });
  }

  const matches = [];

  for (const r of curatedRecipes) {
    const recipeIngredients = [];
    for (let i = 1; i <= 20; i++) {
      const ing = (r[`strIngredient${i}`] || '').trim().toLowerCase();
      if (ing) recipeIngredients.push(ing);
    }

    let matchedCount = 0;
    for (const p of ingredients) {
      const isMatched = recipeIngredients.some(rIng => {
        if (rIng === p) return true;
        if (rIng.includes(p) || p.includes(rIng)) {
          const words = rIng.split(/\s+/);
          return words.includes(p) || p.split(/\s+/).some(w => words.includes(w));
        }
        return false;
      });
      if (isMatched) matchedCount++;
    }

    if (matchedCount > 0) {
      const percent = Math.min(100, Math.round((matchedCount / ingredients.length) * 100));
      matches.push({
        recipe: r,
        matchedCount,
        totalProvided: ingredients.length,
        matchPercent: percent
      });
    }
  }

  matches.sort((a, b) => b.matchedCount - a.matchedCount || b.matchPercent - a.matchPercent);

  res.json({
    total: matches.length,
    matches: matches.slice(0, 50)
  });
});

/**
 * GET /api/recipes/substitutions
 * Ingredient substitution lookup
 */
router.get('/recipes/substitutions', (req, res) => {
  const query = (req.query.ingredient || '').trim().toLowerCase();
  if (!query) {
    return res.json({ substitutions: INGREDIENT_SUBSTITUTIONS });
  }

  const match = INGREDIENT_SUBSTITUTIONS[query] || null;
  res.json({
    ingredient: query,
    match
  });
});

/**
 * GET /api/recipes/:id
 * Single recipe lookup by ID
 */
router.get('/recipes/:id', (req, res) => {
  const id = String(req.params.id);
  const recipe = curatedRecipes.find(r => String(r.idMeal) === id);
  if (!recipe) {
    return res.status(404).json({ error: 'Recipe Not Found', id });
  }
  res.json({ recipe });
});

export default router;
