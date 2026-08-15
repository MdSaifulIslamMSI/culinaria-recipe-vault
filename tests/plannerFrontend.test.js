import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

test('planner has a positioned drawer and a reachable recipe scheduling path', () => {
  const css = read('src/styles/main.css');
  const drawer = read('src/components/MealPlannerDrawer.js');
  const modal = read('src/components/CookingStudioModal.js');

  assert.match(css, /\.side-drawer\s*\{[\s\S]*?position:\s*fixed;/);
  assert.match(css, /\.side-drawer\.open\s*\{[\s\S]*?transform:\s*translateX\(0\)/);
  assert.match(drawer, /openForRecipe\(recipe\)/);
  assert.match(drawer, /btnSchedulePendingRecipe/);
  assert.match(modal, /btnPlanRecipe/);
  assert.match(modal, /culinaria:open-meal-planner-for-recipe/);
});

test('service worker and CSP have valid offline/font failure handling', () => {
  const serviceWorker = read('public/sw.js');
  const indexHtml = read('index.html');
  const serverSecurity = read('server/middleware/security.js');
  const headers = read('public/_headers');
  const render = read('render.yaml');

  assert.match(serviceWorker, /culinaria-pwa-v2\.1/);
  assert.match(serviceWorker, /return Response\.error\(\);/);
  assert.match(serviceWorker, /cachedResponse \|\| Response\.error\(\)/);
  assert.match(indexHtml, /connect-src[^>]*https:\/\/fonts\.googleapis\.com/);
  assert.match(serverSecurity, /connect-src[^;]*https:\/\/fonts\.googleapis\.com/);
  assert.match(headers, /connect-src[^;]*https:\/\/fonts\.googleapis\.com/);
  assert.match(render, /branch:\s*main/);
});
