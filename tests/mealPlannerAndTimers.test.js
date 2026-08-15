/**
 * Automated Tests for MealPlannerService, Multi-Timer Manager & OpenAPI Docs
 */
import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import app from '../server/index.js';
import { mealPlannerService } from '../src/services/mealPlannerService.js';
import { timerManager } from '../src/services/timerManager.js';

const storageMock = new Map();
globalThis.localStorage = {
  getItem: (key) => storageMock.get(key) || null,
  setItem: (key, val) => storageMock.set(key, String(val)),
  removeItem: (key) => storageMock.delete(key),
  clear: () => storageMock.clear()
};

let server;
let baseUrl;

test.before(async () => {
  await new Promise((resolve) => {
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

test('MealPlanner: schedules meals and aggregates ingredients to grocery list', () => {
  mealPlannerService.clearWeek();
  const emptyPlan = mealPlannerService.getPlan();
  assert.strictEqual(emptyPlan['Monday'].lunch, null);

  const sampleRecipe = {
    id: '52772',
    title: 'Teriyaki Chicken Casserole',
    thumbnail: 'https://example.com/thumb.jpg',
    category: 'Chicken',
    area: 'Japanese',
    ingredients: [
      { name: 'Chicken Breast', measure: '3/4 lb' },
      { name: 'Soy Sauce', measure: '1/2 cup' }
    ]
  };

  mealPlannerService.assignRecipe('Monday', 'dinner', sampleRecipe);
  const updatedPlan = mealPlannerService.getPlan();
  assert.strictEqual(updatedPlan['Monday'].dinner.title, 'Teriyaki Chicken Casserole');
  assert.strictEqual(mealPlannerService.getPlannedCount(), 1);

  // Test ingredient export
  const exported = mealPlannerService.exportIngredientsToShoppingList();
  assert.strictEqual(exported, 2, 'Expected 2 ingredients to be exported to grocery list');

  // Test slot removal
  mealPlannerService.removeSlot('Monday', 'dinner');
  assert.strictEqual(mealPlannerService.getPlannedCount(), 0);
});

test('Multi-Timer Manager: manages multiple concurrent named timers', () => {
  timerManager.clearAll();
  assert.strictEqual(timerManager.getAll().length, 0);

  const timer1 = timerManager.createTimer('Pasta Boil', 480);
  const timer2 = timerManager.createTimer('Salmon Sear', 180);

  assert.strictEqual(timerManager.getAll().length, 2);
  assert.strictEqual(timer1.title, 'Pasta Boil');
  assert.strictEqual(timer2.title, 'Salmon Sear');

  // Add time
  timerManager.addTime(timer1.id, 60);
  assert.strictEqual(timer1.totalSeconds, 540);

  // Pause and Resume
  timerManager.pauseTimer(timer2.id);
  assert.strictEqual(timer2.status, 'paused');
  timerManager.resumeTimer(timer2.id);
  assert.strictEqual(timer2.status, 'running');

  // Format time check
  assert.strictEqual(timerManager.formatTime(90), '01:30');
  assert.strictEqual(timerManager.formatTime(300), '05:00');

  // Remove
  timerManager.removeTimer(timer1.id);
  assert.strictEqual(timerManager.getAll().length, 1);
  timerManager.clearAll();
});

test('OpenAPI Docs: /api/docs and /api/docs/openapi.json return valid spec', async () => {
  const resHtml = await fetch(`${baseUrl}/docs/`);
  assert.strictEqual(resHtml.status, 200);
  const html = await resHtml.text();
  assert(html.includes('Culinaria REST API'));

  const resJson = await fetch(`${baseUrl}/docs/openapi.json`);
  assert.strictEqual(resJson.status, 200);
  const spec = await resJson.json();
  assert.strictEqual(spec.openapi, '3.1.0');
  assert(spec.paths['/recipes/search']);
  assert(spec.paths['/recipes/pantry']);
});
