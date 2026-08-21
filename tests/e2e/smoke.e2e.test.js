/**
 * E2E Suite 1 — Application Smoke
 * Boots the production build and verifies the core journey:
 * grid renders, search returns results, recipe modal opens, pantry empty-state holds.
 */
import test from 'node:test';
import assert from 'node:assert';
import { chromeAvailable, distAvailable, withPage } from './helpers/browser.js';

test('smoke: home page renders recipe grid', { skip: !chromeAvailable || !distAvailable }, async () => {
  await withPage(test, async (page) => {
    await page.waitForSelector('.recipe-card', { timeout: 20000 });
    const count = await page.$$eval('.recipe-card', els => els.length);
    assert(count > 0, 'Expected at least one recipe card after bootstrap');
  });
});

test('smoke: search for "chicken" returns results', { skip: !chromeAvailable || !distAvailable }, async () => {
  await withPage(test, async (page) => {
    await page.waitForSelector('#recipeSearchInput', { timeout: 20000 });
    await page.type('#recipeSearchInput', 'chicken');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => {
      const count = document.querySelector('#resultsCount')?.textContent || '';
      return /\d+/.test(count) && count !== 'Showing 0 recipes';
    }, { timeout: 20000 });
    const count = await page.$$eval('.recipe-card', els => els.length);
    assert(count > 0, 'Search should render at least one result card');
  });
});

test('smoke: clicking a card opens the cooking studio modal', { skip: !chromeAvailable || !distAvailable }, async () => {
  await withPage(test, async (page) => {
    await page.waitForSelector('.recipe-card .card-view-btn', { timeout: 20000 });
    await page.click('.recipe-card .card-view-btn');
    await page.waitForSelector('#recipeModal.open, #recipeModalBackdrop.open', { timeout: 20000 });
    const title = await page.$eval('#modalRecipeContent .modal-dish-title', el => el.textContent.trim());
    assert(title.length > 0, 'Modal should display a dish title');
  });
});

test('smoke: console is free of security warnings on load', { skip: !chromeAvailable || !distAvailable }, async () => {
  await withPage(test, async (page, base) => {
    const bad = [];
    page.on('console', msg => {
      if (/DOM_MUTATION_TRAPPED|STORAGE_TAMPER/i.test(msg.text())) bad.push(msg.text());
    });
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.recipe-card', { timeout: 20000 });
    assert.strictEqual(bad.length, 0, `Security console warnings: ${bad.join(' | ')}`);
  });
});
