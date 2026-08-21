/**
 * High-Performance Stateless REST API Routes for Culinaria Backend
 */
import { Router } from 'express';
import crypto from 'crypto';
import { recipeEngine } from '../services/recipeEngine.js';
import { validateRequestInput } from '../middleware/security.js';

const router = Router();
const startTime = Date.now();

// Apply request validation to all API routes
router.use(validateRequestInput);

/**
 * Deterministic ETag Generator
 */
function computeEtag(data) {
  const json = typeof data === 'string' ? data : JSON.stringify(data);
  return '"' + crypto.createHash('md5').update(json).digest('hex') + '"';
}

/**
 * Cache-Control & 304 Freshness Helper for static API responses
 */
function sendCachedJson(req, res, data, maxAgeSec = 300) {
  const hash = computeEtag(data);
  res.setHeader('ETag', hash);
  res.setHeader('Cache-Control', `public, max-age=${maxAgeSec}, stale-while-revalidate=600`);
  
  const clientEtag = req.headers['if-none-match'];
  const matchesClientCache = Boolean(clientEtag) && clientEtag
    .split(',')
    .map(tag => tag.trim())
    .some(tag => tag === hash || tag === `W/${hash}`);
  if (matchesClientCache) {
    return res.status(304).end();
  }
  return res.json(data);
}

/**
 * GET /api/health
 * Telemetry, server uptime, memory usage, and catalog status
 */
router.get('/health', (req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  const memory = process.memoryUsage();

  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds,
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    pid: process.pid,
    memory: {
      rssMB: Math.round(memory.rss / 1024 / 1024),
      heapUsedMB: Math.round(memory.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(memory.heapTotal / 1024 / 1024)
    },
    catalog: {
      totalRecipes: recipeEngine.recipes.length,
      categoriesCount: recipeEngine.getCategories().length,
      areasCount: recipeEngine.getAreas().length
    }
  });
});

/**
 * GET /api/recipes/search
 * High-speed multi-filter search using inverted token index & demonym resolution
 */
router.get('/recipes/search', (req, res) => {
  const q = String(req.query.q || '').trim();
  const category = String(req.query.category || '').trim();
  const area = String(req.query.area || '').trim();
  const limit = parseInt(req.query.limit, 10) || 100;

  const result = recipeEngine.search({ q, category, area, limit });
  sendCachedJson(req, res, result, 120);
});

/**
 * GET /api/recipes/random
 * Retrieves a random recipe from the catalog (Chef Roulette)
 */
router.get('/recipes/random', (req, res) => {
  const recipe = recipeEngine.getRandom();
  res.setHeader('Cache-Control', 'no-cache, no-store');
  res.json({ recipe });
});

/**
 * GET /api/recipes/categories
 * Returns list of distinct categories with dish counts
 */
router.get('/recipes/categories', (req, res) => {
  sendCachedJson(req, res, { categories: recipeEngine.getCategories() }, 600);
});

/**
 * GET /api/recipes/areas
 * Returns list of distinct areas/cuisines with dish counts
 */
router.get('/recipes/areas', (req, res) => {
  sendCachedJson(req, res, { areas: recipeEngine.getAreas() }, 600);
});

/**
 * POST /api/recipes/pantry
 * Multi-ingredient combinatorial matching with calculated percentages
 */
router.post('/recipes/pantry', (req, res) => {
  if (!req.body || !Array.isArray(req.body.ingredients)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Body must be a JSON object with an "ingredients" array.'
    });
  }

  const limit = parseInt(req.body.limit, 10) || 50;
  const result = recipeEngine.matchPantry(req.body.ingredients, limit);
  sendCachedJson(req, res, result, 60);
});

/**
 * GET /api/recipes/substitutions
 * Ingredient substitution lookup
 */
router.get('/recipes/substitutions', (req, res) => {
  const ingredient = String(req.query.ingredient || '').trim();
  const result = recipeEngine.getSubstitution(ingredient);
  sendCachedJson(req, res, result, 600);
});

/**
 * GET /api/recipes/:id
 * O(1) single recipe lookup by ID
 */
router.get('/recipes/:id', (req, res) => {
  const id = String(req.params.id || '').replace(/[^a-zA-Z0-9_-]/g, '');
  if (!id) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid recipe identifier' });
  }

  const recipe = recipeEngine.getById(id);
  if (!recipe) {
    return res.status(404).json({ error: 'Recipe Not Found', id });
  }

  sendCachedJson(req, res, { recipe }, 600);
});

export default router;
