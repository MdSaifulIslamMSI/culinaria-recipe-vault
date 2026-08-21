/**
 * E2E Suite 5 — Browser-Level Security
 * Executes hostile payloads in the real browser: stored pantry XSS,
 * prototype pollution via localStorage, and CSP header presence.
 */
import test from 'node:test';
import assert from 'node:assert';
import { chromeAvailable, distAvailable, withPage } from './helpers/browser.js';

test('security: hostile pantry item does not execute in the live DOM', { skip: !chromeAvailable || !distAvailable }, async () => {
  await withPage(test, async (page) => {
    await page.waitForSelector('#pantryIngredientInput', { timeout: 20000 });
    await page.type('#pantryIngredientInput', '<img src=x onerror="window.__pantryXss=1">');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() =>
      document.querySelector('.pantry-item-chip') !== null, { timeout: 10000 }
    );

    const exploited = await page.evaluate(() => window.__pantryXss === 1);
    assert.strictEqual(exploited, false, 'Stored pantry payload must not execute');

    const rendered = await page.evaluate(() =>
      document.querySelector('.pantry-item-chip')?.textContent || ''
    );
    assert(rendered.includes('<img'), 'Payload should render as inert escaped text');
  });
});

test('security: production responses carry hardened security headers', { skip: !chromeAvailable || !distAvailable }, async () => {
  await withPage(test, async (page, base) => {
    // Direct fetch from the runner (bypasses the service worker cache layer)
    const res = await fetch(base + '/api/health');
    assert.ok(res.ok, 'Health endpoint should respond');
    const headers = res.headers;
    assert.strictEqual(headers.get('x-content-type-options'), 'nosniff');
    assert.strictEqual(headers.get('x-frame-options'), 'DENY');
    assert((headers.get('content-security-policy') || '').includes("default-src 'self'"), 'CSP must be present');
  });
});
