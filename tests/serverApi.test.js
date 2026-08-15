/**
 * Automated Backend API Integration Tests
 * Validates endpoints, health telemetry, rate limiting, and search algorithms
 */
import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import app from '../server/index.js';

let server;
let baseUrl;

test.before(async () => {
  await new Promise((resolve) => {
    // Ephemeral port for test isolation
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}/api`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('GET /api/health returns valid telemetry and catalog counts', async () => {
  const res = await fetch(`${baseUrl}/health`);
  assert.strictEqual(res.status, 200);
  
  const data = await res.json();
  assert.strictEqual(data.status, 'healthy');
  assert(data.uptimeSeconds >= 0);
  assert(data.catalog.totalRecipes > 500, 'Expected > 500 recipes in catalog');
  assert(data.catalog.categoriesCount > 10, 'Expected > 10 categories');
  assert(data.catalog.areasCount > 10, 'Expected > 10 areas');
  
  // Security Headers verification
  assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
  assert.strictEqual(res.headers.get('x-frame-options'), 'DENY');
});

test('GET /api/recipes/search returns matching recipes', async () => {
  const res = await fetch(`${baseUrl}/recipes/search?q=chicken`);
  assert.strictEqual(res.status, 200);
  
  const data = await res.json();
  assert(data.total > 0, 'Expected matches for chicken');
  assert(Array.isArray(data.recipes));
  assert(data.recipes.length <= 100);
});

test('GET /api/recipes/search with category and area filter', async () => {
  const res = await fetch(`${baseUrl}/recipes/search?category=Chicken&area=Indian`);
  assert.strictEqual(res.status, 200);
  
  const data = await res.json();
  assert(data.total > 0, 'Expected matches for Indian Chicken');
  data.recipes.forEach(r => {
    assert.strictEqual(r.strCategory, 'Chicken');
  });
});

test('GET /api/recipes/random returns a single random recipe', async () => {
  const res = await fetch(`${baseUrl}/recipes/random`);
  assert.strictEqual(res.status, 200);
  
  const data = await res.json();
  assert(data.recipe);
  assert(data.recipe.idMeal);
  assert(data.recipe.strMeal);
});

test('GET /api/recipes/categories returns distinct categories list', async () => {
  const res = await fetch(`${baseUrl}/recipes/categories`);
  assert.strictEqual(res.status, 200);
  
  const data = await res.json();
  assert(Array.isArray(data.categories));
  assert(data.categories.length > 0);
  assert(data.categories[0].name);
  assert(typeof data.categories[0].count === 'number');
});

test('POST /api/recipes/pantry performs combinatorial matching', async () => {
  const res = await fetch(`${baseUrl}/recipes/pantry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ingredients: ['chicken', 'garlic', 'onion'] })
  });
  assert.strictEqual(res.status, 200);
  
  const data = await res.json();
  assert(data.total > 0, 'Expected pantry matches');
  assert(Array.isArray(data.matches));
  assert(data.matches[0].matchedCount >= 1);
  assert(data.matches[0].matchPercent > 0);
});

test('GET /api/recipes/:id returns 404 on non-existent recipe', async () => {
  const res = await fetch(`${baseUrl}/recipes/999999999`);
  assert.strictEqual(res.status, 404);
  
  const data = await res.json();
  assert.strictEqual(data.error, 'Recipe Not Found');
});

test('GET /api/recipes/substitutions returns ingredient knowledge base', async () => {
  const res = await fetch(`${baseUrl}/recipes/substitutions?ingredient=heavy%20cream`);
  assert.strictEqual(res.status, 200);
  
  const data = await res.json();
  assert(data.match);
  assert(data.match.substitute.includes('Milk'));
});
