/**
 * E2E Suite 4 — Video Facade
 * The YouTube facade must render without embedding iframes on load and
 * provide a working external link (with or without a known video ID).
 */
import test from 'node:test';
import assert from 'node:assert';
import { chromeAvailable, distAvailable, withPage } from './helpers/browser.js';

test('video: facade renders in modal without lazy iframe', { skip: !chromeAvailable || !distAvailable }, async () => {
  await withPage(test, async (page) => {
    await page.waitForSelector('.recipe-card .card-view-btn', { timeout: 20000 });
    await page.click('.recipe-card .card-view-btn');
    await page.waitForSelector('#recipeModal.open, #recipeModalBackdrop.open', { timeout: 20000 });
    await page.waitForSelector('.video-facade-card', { timeout: 20000 });

    const iframeCount = await page.$$eval('#modalRecipeContent iframe', els => els.length);
    assert.strictEqual(iframeCount, 0, 'No YouTube iframe should load before user interaction');

    const href = await page.$eval('.video-facade-card', el => el.getAttribute('href'));
    assert(href && href.includes('youtube.com'), 'Facade should link to YouTube');
    assert(href.startsWith('https://'), 'Video link must be https');
  });
});
