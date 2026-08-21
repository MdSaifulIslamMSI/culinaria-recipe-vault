/**
 * Regression guards for the 10/10 hardening batch.
 * Static-source assertions follow the repo's existing plannerFrontend.test.js
 * pattern: they lock in invariants that previously regressed silently.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
const exists = (relativePath) => fs.existsSync(path.join(repoRoot, relativePath));

test('preferences drawer toggle IDs match the HTML markup exactly', () => {
  const html = read('index.html');
  const drawer = read('src/components/PreferencesDrawer.js');

  const wiredIds = [
    'prefKeepScreenAwake',
    'prefVoiceNarration',
    'prefVegetarianOnly',
    'prefHighProtein',
    'prefQuickUnder30',
    'prefShowMacros',
    'prefShowSommelier',
    'prefAutoSubs',
    'prefCompactGrid',
    'prefTimerSound'
  ];

  wiredIds.forEach((id) => {
    assert.match(html, new RegExp(`id="${id}"`), `index.html must contain #${id}`);
    assert.match(drawer, new RegExp(`['"]${id}['"]`), `PreferencesDrawer must wire #${id}`);
  });

  // The historical mismatched IDs must never return.
  ['prefQuick30', 'prefVegetarian"'].forEach((stale) => {
    assert.doesNotMatch(html, new RegExp(stale.replace('"', '\\b')), `stale id ${stale} must not exist`);
  });
});

test('timer chime respects the timerSound preference', () => {
  const timerManager = read('src/services/timerManager.js');
  assert.match(timerManager, /isTimerSoundEnabled\(\)/);
  assert.match(timerManager, /timerSound/);
});

test('unknown recipe IDs resolve to null instead of an arbitrary dish', () => {
  const api = read('src/services/mealDbApi.js');
  assert.doesNotMatch(api, /\|\| curatedRecipes\[0\]/, 'wrong-recipe fallback must stay deleted');
  assert.match(api, /return fallback \? formatRecipe\(fallback\) : null;/);
});

test('formatRecipe results are memoized to avoid repeated catalog sanitize passes', () => {
  const api = read('src/services/mealDbApi.js');
  assert.match(api, /formatMemo/, 'WeakMap memo must exist');
  assert.match(api, /buildFormattedRecipe/);
});

test('API cache is bounded with TTL and eviction', () => {
  const api = read('src/services/mealDbApi.js');
  assert.match(api, /CACHE_TTL_MS/);
  assert.match(api, /CACHE_MAX_ENTRIES/);
  assert.match(api, /expiresAt/);
});

test('random recipe fetch enforces a timeout like every other endpoint', () => {
  const api = read('src/services/mealDbApi.js');
  const randomFn = api.slice(api.indexOf('export async function getRandomRecipe'));
  assert.match(randomFn, /AbortController/);
  assert.match(randomFn, /controller\.abort\(\), 6000/);
});

test('CSP omits unsafe-inline and jsdelivr from script-src everywhere', () => {
  const indexHtml = read('index.html');
  const serverSecurity = read('server/middleware/security.js');
  const headers = read('public/_headers');

  [indexHtml, serverSecurity, headers].forEach((source, i) => {
    const scriptSrc = source.match(/script-src[^;]*/)?.[0] || '';
    assert.ok(scriptSrc, `script-src directive ${i} must exist`);
    assert.doesNotMatch(scriptSrc, /unsafe-inline/, `script-src ${i} must not allow unsafe-inline`);
    assert.doesNotMatch(source, /jsdelivr/, `source ${i} must not reference jsdelivr`);

    // The service worker re-fetches font binaries via fetch(), which is
    // governed by connect-src. Render serves sw.js with the server CSP, so a
    // missing fonts.gstatic.com entry blocks every Google Font on that host.
    const connectSrc = source.match(/connect-src[^;]*/)?.[0] || '';
    assert.match(connectSrc, /https:\/\/fonts\.gstatic\.com/, `connect-src ${i} must allow fonts.gstatic.com`);
  });
});

test('theme bootstrap is external so no inline scripts ship in index.html', () => {
  const html = read('index.html');
  assert.ok(exists('public/theme-init.js'), 'public/theme-init.js must exist');
  assert.match(html, /<script src="\.\/theme-init\.js"><\/script>/);
  assert.doesNotMatch(html, /<script>\s*\n/, 'no inline script blocks allowed');
});

test('dead security modules stay deleted', () => {
  assert.equal(exists('src/utils/zeroTrustDefense.js'), false);
  assert.equal(exists('src/utils/cryptoEngine.js'), false);
  const main = read('src/main.js');
  assert.doesNotMatch(main, /__CULINARIA_SECURITY__/);
  assert.doesNotMatch(main, /zeroTrustDefense|cryptoEngine/);
});

test('shuffle is unbiased Fisher-Yates, not sort-by-random', () => {
  const main = read('src/main.js');
  assert.match(main, /Fisher-Yates/);
  assert.doesNotMatch(main, /sort\(\(\) => 0\.5 - Math\.random\(\)\)/);
});

test('toasts are announced to assistive technology', () => {
  const html = read('index.html');
  const toastTag = html.match(/<[^>]+id="toastContainer"[^>]*>/)?.[0] || '';
  assert.match(toastTag, /aria-live="polite"/);
  assert.match(toastTag, /role="status"/);
});

test('server exits on unrecoverable process-level faults', () => {
  const server = read('server/index.js');
  const rejectionHandler = server.slice(server.indexOf("process.on('unhandledRejection'"));
  const exceptionHandler = server.slice(server.indexOf("process.on('uncaughtException'"));
  assert.match(rejectionHandler, /process\.exit\(1\)/);
  assert.match(exceptionHandler, /process\.exit\(1\)/);
});

test('docs page escapes interpolated spec fields', () => {
  const docs = read('server/routes/docs.js');
  assert.match(docs, /function escapeHtml/);
  assert.match(docs, /escapeHtml\(details\.summary\)/);
  assert.match(docs, /escapeHtml\(details\.description\)/);
});
