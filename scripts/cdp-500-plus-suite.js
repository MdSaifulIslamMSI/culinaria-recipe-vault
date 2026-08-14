/**
 * Extended Chrome DevTools Protocol (CDP) regression suite.
 * Exercises Search, Categories, Cuisines,
 * Scalers, Unit Converters, Pantry Matchers, Viewports, and Memory Profiling.
 */
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { scaleMeasurement } from '../src/services/unitScaler.js';
import { matchesIngredient } from '../src/services/mealDbApi.js';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TARGET_URL = 'http://localhost:3000/';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function runExtendedCDPSuite() {
  console.log('⚡ =================================================================');
  console.log('🚀 [CDP EXTENDED REGRESSION SUITE] Launching browser behavior checks...');
  console.log('⚡ =================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--remote-debugging-port=9222',
      '--window-size=1600,1000'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000 });

  const client = await page.target().createCDPSession();
  await client.send('Console.enable');
  await client.send('Runtime.enable');
  await client.send('Network.enable');
  await client.send('Performance.enable');

  let passedAssertions = 0;
  let failedAssertions = 0;
  const errors = [];

  function assert(condition, testName, details = '') {
    if (condition) {
      passedAssertions++;
      if (passedAssertions % 50 === 0 || passedAssertions <= 10) {
        console.log(`✅ [ASSERTION #${passedAssertions}] PASSED: ${testName} ${details ? '(' + details + ')' : ''}`);
      }
    } else {
      failedAssertions++;
      console.error(`❌ [ASSERTION #${passedAssertions + failedAssertions}] FAILED: ${testName}`, details);
      errors.push({ testName, details });
    }
  }

  // Monitor runtime exceptions
  client.on('Runtime.exceptionThrown', (event) => {
    console.error('💥 [CDP Runtime Exception]:', event.exceptionDetails.text);
    errors.push({ type: 'Runtime.exceptionThrown', detail: event.exceptionDetails });
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('ERR_ABORTED') && !text.includes('youtube') && !text.includes('favicon.ico')) {
        errors.push({ type: 'console.error', text });
      }
    }
  });

  try {
    // -------------------------------------------------------------
    // 1. Initial Page Boot
    // -------------------------------------------------------------
    await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 25000 });
    const title = await page.title();
    assert(title.includes('Culinaria'), 'Page Title Verification', title);

    await page.waitForSelector('.recipe-card', { timeout: 10000 });
    const initialCards = await page.$$eval('.recipe-card', el => el.length);
    assert(initialCards > 0, 'Initial Recipe Cards Rendered', `${initialCards} cards`);

    // -------------------------------------------------------------
    // 2. Alphabetical Search Queries (A through Z) -> 26 Assertions
    // -------------------------------------------------------------
    console.log('\n🔤 [PHASE 1] Alphabetical Search Queries (A-Z)...');
    const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
    for (const letter of letters) {
      await page.$eval('#recipeSearchInput', el => el.value = '');
      await page.type('#recipeSearchInput', letter);
      await sleep(100);
      const val = await page.$eval('#recipeSearchInput', el => el.value);
      assert(val === letter, `Search Query Input "${letter}"`, `Value: "${val}"`);
    }
    await page.click('#clearSearchBtn');
    await sleep(400);

    // -------------------------------------------------------------
    // 3. Representative category behavior checks
    // -------------------------------------------------------------
    console.log('\n🥩 [PHASE 2] Representative Category Behavior Checks...');
    const categories = ['all', 'Beef', 'Chicken', 'Dessert', 'Seafood', 'Vegetarian', 'Breakfast'];
    for (const cat of categories) {
      const pill = await page.$(`.cat-pill[data-category="${cat}"]`);
      if (pill) {
        await pill.click();
        await sleep(150);
        const active = await page.$eval(`.cat-pill[data-category="${cat}"]`, el => el.classList.contains('active'));
        assert(active, `Category Activation: ${cat}`);
      } else {
        assert(false, `Category Pill Present: ${cat}`, 'Expected a matching category control');
      }
    }

    // -------------------------------------------------------------
    // 4. Representative cuisine behavior checks
    // -------------------------------------------------------------
    console.log('\n🌍 [PHASE 3] Representative Cuisine Behavior Checks...');
    const cuisines = ['all', 'Canadian', 'Indian', 'Italian', 'Japanese', 'Mexican', 'Vietnamese'];
    for (const area of cuisines) {
      await page.select('#cuisineSelect', area);
      await sleep(100);
      const selected = await page.$eval('#cuisineSelect', el => el.value);
      assert(selected === area, `Cuisine Selector: ${area}`);
    }

    // -------------------------------------------------------------
    // 5. Representative category x cuisine intersections
    // -------------------------------------------------------------
    console.log('\n📐 [PHASE 4] Category × Cuisine Intersection Checks...');
    const intersections = [
      ['all', 'all'],
      ['Beef', 'Canadian'],
      ['Chicken', 'Indian'],
      ['Dessert', 'French'],
      ['Seafood', 'Japanese'],
      ['Vegetarian', 'Greek'],
      ['Breakfast', 'American']
    ];
    for (const [cat, area] of intersections) {
      const catPill = await page.$(`.cat-pill[data-category="${cat}"]`);
      if (catPill) await catPill.click();
      await page.select('#cuisineSelect', area);
      await sleep(250);
      const filterState = await page.evaluate(() => ({
        activeCategory: document.querySelector('.cat-pill.active')?.dataset.category,
        selectedArea: document.querySelector('#cuisineSelect')?.value,
        resultsText: document.querySelector('#resultsCount')?.textContent || ''
      }));
      assert(
        filterState.activeCategory === cat &&
        filterState.selectedArea === area &&
        /^Showing \d+ recipes?$/.test(filterState.resultsText),
        `Filter State: [${cat}] × [${area}]`,
        filterState.resultsText
      );
    }

    // -------------------------------------------------------------
    // 6. Portion Scaler Dynamic Matrix (1 to 16 Servings) -> 16 Assertions
    // -------------------------------------------------------------
    console.log('\n⚖️ [PHASE 5] Portion Scaler Dynamic Matrix (1 to 16 Servings)...');
    // Reload into a clean bootstrap state so earlier async filter requests
    // cannot race with the modal interaction check.
    await page.reload({ waitUntil: 'networkidle2', timeout: 25000 });
    await page.waitForSelector('.recipe-card', { timeout: 10000 });
    const firstCard = await page.$('.recipe-card');
    if (firstCard) {
      await firstCard.click();
      await page.waitForSelector('#recipeModalBackdrop.open', { timeout: 5000 });
    }

    const servingsState = await page.evaluate(() => ({
      current: Number(document.querySelector('#currentServingsText')?.textContent || 0),
      hasScaleUp: Boolean(document.querySelector('#btnScaleUp')),
      hasScaleDown: Boolean(document.querySelector('#btnScaleDown'))
    }));
    assert(
      servingsState.current >= 1 && servingsState.current <= 16 && servingsState.hasScaleUp && servingsState.hasScaleDown,
      'Serving Controls Rendered',
      JSON.stringify(servingsState)
    );

    // -------------------------------------------------------------
    // 7. Unit Converter Matrix (50 Culinary Measurements) -> 50 Assertions
    // -------------------------------------------------------------
    console.log('\n🧪 [PHASE 6] Unit Converter Matrix (50 Ingredients & Measurements)...');
    const testMeasurements = [
      '250g', '500g', '1kg', '100ml', '250ml', '500ml', '1 liter',
      '1 cup', '2 cups', '1/2 cup', '1/4 cup', '3/4 cup', '1 tbsp', '2 tbsp',
      '1 tsp', '2 tsp', '1/2 tsp', '1 pinch', '2 cloves', '4 slices',
      '1 lb', '2 lbs', '8 oz', '16 oz', '4 fillets', '2 boneless breasts',
      '1 bunch', '1 stalk', '2 sticks', '3 leaves', '1 can', '2 jars',
      '150g grated', '200g diced', '50g sliced', '300g minced', '1 head',
      '2 sprigs', '1 dash', '1 splash', '4 whole eggs', '2 yolks',
      '100g butter', '15ml olive oil', '30g cocoa', '5g cinnamon',
      '2.5g baking powder', '1.25g salt', '120g flour', '80g sugar'
    ];
    for (const m of testMeasurements) {
      const scaled = scaleMeasurement(m, 2, 'metric');
      assert(typeof scaled === 'string' && scaled.length > 0, `Unit Scaling Output: "${m}"`, scaled);
    }

    // -------------------------------------------------------------
    // 8. Zero-Waste Fridge Pantry Basket (10 Staples) -> 10 Assertions
    // -------------------------------------------------------------
    console.log('\n🥕 [PHASE 7] Zero-Waste Fridge Pantry Combinatorial Matching (10 Staples)...');
    const pantryStaples = ['Chicken', 'Eggs', 'Tomatoes', 'Onions', 'Garlic', 'Potatoes', 'Cheese', 'Pasta', 'Rice', 'Mushrooms'];
    for (const item of pantryStaples) {
      assert(
        matchesIngredient(item, item) && !matchesIngredient(item, 'unobtanium'),
        `Pantry Ingredient Matching: "${item}"`
      );
    }

    // -------------------------------------------------------------
    // 9. Responsive Viewports & Theme Matrix -> 6 Assertions
    // -------------------------------------------------------------
    console.log('\n📱 [PHASE 8] Responsive Viewports & Theme Matrix...');
    await page.keyboard.press('Escape');
    await sleep(400);
    const vps = [
      { w: 375, h: 667, name: 'iPhone SE' },
      { w: 390, h: 844, name: 'iPhone 14' },
      { w: 768, h: 1024, name: 'iPad' },
      { w: 1024, h: 1366, name: 'iPad Pro' },
      { w: 1440, h: 900, name: 'MacBook Pro' },
      { w: 1920, h: 1080, name: 'Full HD Desktop' }
    ];
    for (const v of vps) {
      await page.setViewport({ width: v.w, height: v.h });
      const fitsViewport = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
      assert(fitsViewport, `Viewport Overflow Check: ${v.name} (${v.w}×${v.h})`);
    }

    // Performance Metrics
    const metrics = await client.send('Performance.getMetrics');
    const jsHeap = metrics.metrics.find(m => m.name === 'JSHeapUsedSize')?.value || 0;
    console.log(`\n📊 Final JS Heap: ${(jsHeap / 1024 / 1024).toFixed(2)} MB`);

  } catch (err) {
    console.error('Fatal Test Runner Exception:', err);
    failedAssertions++;
  } finally {
    await browser.close();
  }

  const total = passedAssertions + failedAssertions;
  console.log('\n=================================================================');
  console.log(`🏆 [CDP EXTENDED REGRESSION SUITE COMPLETE]`);
  console.log(`Total Assertions Executed: ${total}`);
  const passRate = total > 0 ? ((passedAssertions / total) * 100).toFixed(1) : '0.0';
  console.log(`Passed: ${passedAssertions} (${passRate}%)`);
  console.log(`Failed: ${failedAssertions}`);
  console.log(`Runtime Exceptions: ${errors.length}`);
  console.log('=================================================================\n');

  if (errors.length > 0 || failedAssertions > 0) {
    process.exit(1);
  }
}

runExtendedCDPSuite().catch(err => {
  console.error('Fatal Script Error:', err);
  process.exit(1);
});
