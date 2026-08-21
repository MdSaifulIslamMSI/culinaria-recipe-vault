import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

test('closed frontend overlays are hidden from assistive technology on first paint', () => {
  const html = read('index.html');
  const ids = [
    'shoppingDrawer',
    'prefsDrawer',
    'recipeModalBackdrop',
    'cookModeOverlay',
    'rouletteModalBackdrop'
  ];

  ids.forEach((id) => {
    const tag = html.match(new RegExp(`<[^>]+id="${id}"[^>]*>`))?.[0];
    assert.ok(tag, `expected #${id} in index.html`);
    assert.match(tag, /aria-hidden="true"/, `expected #${id} to start aria-hidden`);
    assert.match(tag, /\binert\b/, `expected #${id} to start inert`);
  });
});

test('frontend overlays explicitly toggle inert state when opened', () => {
  [
    'src/components/ShoppingListDrawer.js',
    'src/components/PreferencesDrawer.js',
    'src/components/MealPlannerDrawer.js',
    'src/components/RouletteModal.js',
    'src/components/CookingStudioModal.js'
  ].forEach((relativePath) => {
    const source = read(relativePath);
    assert.match(source, /setOpenState\(isOpen\)/, `expected open state helper in ${relativePath}`);
    assert.match(source, /setOverlayState\(/, `expected shared inert toggle in ${relativePath}`);
  });
});

test('all interactive overlays register with the shared keyboard coordinator', () => {
  [
    'src/components/ShoppingListDrawer.js',
    'src/components/PreferencesDrawer.js',
    'src/components/MealPlannerDrawer.js',
    'src/components/RouletteModal.js',
    'src/components/CookingStudioModal.js'
  ].forEach((relativePath) => {
    const source = read(relativePath);
    assert.match(source, /registerOverlay\(\{/, `expected overlay registration in ${relativePath}`);
  });

  const manager = read('src/utils/overlayManager.js');
  assert.match(manager, /addEventListener\('keydown'/, 'coordinator must own global keydown');
  assert.match(manager, /acquireScrollLock/, 'coordinator must refcount scroll locks');
});

test('responsive frontend includes reduced-motion and mobile touch-target safeguards', () => {
  const css = read('src/styles/main.css');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /\.action-btn\s*\{[\s\S]*?min-height: 44px !important;/);
  assert.match(css, /\.theme-toggle\s*\{[\s\S]*?height: 44px;/);
});
