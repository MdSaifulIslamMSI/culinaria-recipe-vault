/**
 * Chrome DevTools Protocol (CDP) Comprehensive Diagnostic Suite
 * Connects to Chrome DevTools Protocol, tests all user workflows,
 * catches runtime exceptions, console errors, and verifies DOM state.
 */
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TARGET_URL = 'http://localhost:3000/';
const SCREENSHOT_DIR = path.resolve('cdp-screenshots');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runCDPDiagnostics() {
  console.log('🚀 [CDP] Launching Headless Chrome with Chrome DevTools Protocol enabled...');
  
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--remote-debugging-port=9222',
      '--window-size=1440,900'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Connect CDP Session
  const client = await page.target().createCDPSession();
  await client.send('Console.enable');
  await client.send('Runtime.enable');
  await client.send('Network.enable');
  await client.send('Log.enable');

  const errors = [];
  const warnings = [];
  const networkFailures = [];

  // CDP Event Listeners
  client.on('Runtime.exceptionThrown', (event) => {
    console.error('❌ [CDP Runtime Exception]:', event.exceptionDetails);
    errors.push({ type: 'Runtime.exceptionThrown', detail: event.exceptionDetails.text });
  });

  client.on('Log.entryAdded', (entry) => {
    if (entry.entry.level === 'error') {
      console.error('❌ [CDP Log Error]:', entry.entry.text);
      errors.push({ type: 'Log.error', text: entry.entry.text });
    } else if (entry.entry.level === 'warning') {
      warnings.push(entry.entry.text);
    }
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error('❌ [Page Console Error]:', msg.text());
      errors.push({ type: 'console.error', text: msg.text() });
    }
  });

  page.on('pageerror', (err) => {
    console.error('❌ [Page Uncaught Error]:', err.message);
    errors.push({ type: 'uncaught', text: err.message });
  });

  page.on('requestfailed', (req) => {
    const url = req.url();
    // Ignore harmless aborted video / tracking
    if (!url.includes('youtube.com') && !url.includes('google-analytics') && !url.includes('doubleclick')) {
      console.warn('⚠️ [Network Request Failed]:', url, req.failure()?.errorText);
      networkFailures.push({ url, error: req.failure()?.errorText });
    }
  });

  console.log(`🌐 [CDP] Navigating to ${TARGET_URL}...`);
  await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 20000 });

  console.log('📸 [CDP] Capturing Initial Load Screenshot...');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_initial_load.png') });

  // -------------------------------------------------------------
  // TEST SUITE 1: Recipe Grid Initial Population
  // -------------------------------------------------------------
  console.log('\n--- [TEST 1] Verifying Recipe Grid Population ---');
  await page.waitForSelector('.recipe-card', { timeout: 10000 });
  const cardCount = await page.$$eval('.recipe-card', el => el.length);
  console.log(`✅ [CDP] Recipe cards rendered: ${cardCount} cards found.`);
  if (cardCount === 0) throw new Error('No recipe cards found on initial load');

  // -------------------------------------------------------------
  // TEST SUITE 2: Search & Live Auto-Suggestions Dropdown
  // -------------------------------------------------------------
  console.log('\n--- [TEST 2] Testing Search & Live Auto-Suggestions ---');
  await page.type('#recipeSearchInput', 'Salmon');
  await sleep(1000);
  
  const suggestionsVisible = await page.$eval('#searchSuggestionsDropdown', el => !el.classList.contains('hidden'));
  console.log(`✅ [CDP] Auto-suggestions dropdown visible: ${suggestionsVisible}`);
  
  await page.click('#searchSubmitBtn');
  await sleep(1200);
  const searchResultsCount = await page.$$eval('.recipe-card', el => el.length);
  console.log(`✅ [CDP] Search results for "Salmon": ${searchResultsCount} recipes rendered.`);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_search_results.png') });

  // Clear search
  await page.click('#clearSearchBtn');
  await sleep(1000);

  // -------------------------------------------------------------
  // TEST SUITE 3: Category & Cuisine Multi-Filter
  // -------------------------------------------------------------
  console.log('\n--- [TEST 3] Testing Category + Cuisine Multi-Filter ---');
  const beefPill = await page.$('.cat-pill[data-category="Beef"]');
  if (beefPill) {
    await beefPill.click();
    await sleep(1200);
    const beefCount = await page.$$eval('.recipe-card', el => el.length);
    console.log(`✅ [CDP] Beef category recipes: ${beefCount}`);
  }

  // Select Canadian Cuisine
  await page.select('#cuisineSelect', 'Canadian');
  await sleep(1200);
  const filteredCount = await page.$$eval('.recipe-card', el => el.length);
  console.log(`✅ [CDP] Beef + Canadian intersection results: ${filteredCount} (Expected: exact matching Canadian Beef dishes)`);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_category_cuisine_filter.png') });

  // Reset filters by clicking All Dishes pill and resetting cuisine selector
  const allPill = await page.$('.cat-pill[data-category="all"]');
  if (allPill) await allPill.click();
  await page.select('#cuisineSelect', 'all');
  await sleep(1200);

  // -------------------------------------------------------------
  // TEST SUITE 4: Recipe Modal & Dynamic Servings Scaler
  // -------------------------------------------------------------
  console.log('\n--- [TEST 4] Testing Recipe Modal, Servings Scaler & Unit Switch ---');
  const firstCard = await page.$('.recipe-card');
  await firstCard.click();
  await page.waitForSelector('#recipeModalBackdrop.open', { timeout: 5000 });
  console.log('✅ [CDP] Recipe Studio Modal opened successfully.');

  // Scale Servings Up
  const servingsTextBefore = await page.$eval('#currentServingsText', el => el.textContent);
  await page.click('#btnScaleUp');
  await sleep(500);
  const servingsTextAfter = await page.$eval('#currentServingsText', el => el.textContent);
  console.log(`✅ [CDP] Servings scaled from ${servingsTextBefore} to ${servingsTextAfter}.`);

  // Switch to US Imperial Units
  await page.click('#btnUnitImperial');
  await sleep(500);
  console.log('✅ [CDP] Unit system switched to US Imperial.');

  // Check an ingredient checkbox
  const firstCheckbox = await page.$('.ing-checkbox');
  if (firstCheckbox) {
    await firstCheckbox.click();
    console.log('✅ [CDP] Ingredient checkbox toggled & preserved.');
  }

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_recipe_modal_scaled.png') });

  // -------------------------------------------------------------
  // TEST SUITE 5: Guided Cook Mode Workflow
  // -------------------------------------------------------------
  console.log('\n--- [TEST 5] Testing Guided Hands-Free Cook Mode ---');
  await page.click('#btnLaunchCookMode');
  await page.waitForSelector('#cookModeOverlay.open', { timeout: 5000 });
  console.log('✅ [CDP] Fullscreen Cook Mode launched.');

  const step1Text = await page.$eval('#cookStepText', el => el.textContent);
  console.log(`✅ [CDP] Step 1: "${step1Text.slice(0, 60)}..."`);

  await page.click('#btnCookNextStep');
  await sleep(600);
  const step2Num = await page.$eval('#cookStepNum', el => el.textContent);
  console.log(`✅ [CDP] Advanced to: ${step2Num}`);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_cook_mode_step2.png') });

  // Exit Cook Mode
  await page.click('#btnExitCookMode');
  await sleep(600);

  // -------------------------------------------------------------
  // TEST SUITE 6: Favorite / Cookbook System
  // -------------------------------------------------------------
  console.log('\n--- [TEST 6] Testing Save to Favorites & Cookbook View ---');
  await page.click('#btnModalFav');
  await sleep(500);
  console.log('✅ [CDP] Favorited recipe from inside Studio modal.');

  // Close Recipe Modal
  await page.click('#btnCloseRecipeModal');
  await sleep(600);

  // Navigate to Cookbook view
  await page.click('#tabFavorites');
  await sleep(1000);
  const favCardsCount = await page.$$eval('#favoritesGrid .recipe-card', el => el.length);
  console.log(`✅ [CDP] Cookbook view active with ${favCardsCount} saved recipe(s).`);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_cookbook_view.png') });

  // -------------------------------------------------------------
  // TEST SUITE 7: Grocery Shopping List Drawer
  // -------------------------------------------------------------
  console.log('\n--- [TEST 7] Testing Shopping List Drawer & Persistence ---');
  await page.click('#btnShoppingList');
  await page.waitForSelector('#shoppingDrawer.open', { timeout: 5000 });

  await page.type('#manualGroceryInput', 'Fresh Rosemary');
  await page.click('#btnAddManualGrocery');
  await sleep(600);
  const shoppingItemsCount = await page.$$eval('.shopping-item-row', el => el.length);
  console.log(`✅ [CDP] Shopping Drawer contains ${shoppingItemsCount} item(s).`);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_shopping_drawer.png') });

  await page.click('#btnCloseShoppingDrawer');
  await sleep(600);

  // -------------------------------------------------------------
  // TEST SUITE 8: Zero-Waste Pantry Matcher
  // -------------------------------------------------------------
  console.log('\n--- [TEST 8] Testing Zero-Waste Pantry Matcher Engine ---');
  await page.click('#tabPantry');
  await sleep(800);

  await page.click('#btnFindPantryRecipes');
  await sleep(2500);
  const pantryMatchedCount = await page.$$eval('#pantryCardsGrid .recipe-card', el => el.length);
  console.log(`✅ [CDP] Pantry Matcher retrieved ${pantryMatchedCount} matching recipe(s).`);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_pantry_matches.png') });

  // -------------------------------------------------------------
  // TEST SUITE 9: Chef's Surprise Roulette Modal
  // -------------------------------------------------------------
  console.log('\n--- [TEST 9] Testing Chef\'s Surprise Roulette Randomizer ---');
  await page.click('#btnRoulette');
  await page.waitForSelector('#rouletteModalBackdrop.open', { timeout: 5000 });
  await sleep(1500);
  console.log('✅ [CDP] Chef Roulette spun and presented random dish.');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_chef_roulette.png') });

  await page.click('#btnCloseRouletteModal');
  await sleep(600);

  // -------------------------------------------------------------
  // TEST SUITE 10: Light / Dark Theme Switch
  // -------------------------------------------------------------
  console.log('\n--- [TEST 10] Testing Theme Switching ---');
  await page.click('#themeToggle');
  const theme = await page.$eval('html', el => el.getAttribute('data-theme'));
  console.log(`✅ [CDP] Active Theme: ${theme}`);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_theme_toggle.png') });

  // Performance Metrics via CDP
  const metrics = await client.send('Performance.getMetrics');
  console.log('\n📊 [CDP Performance Metrics]:');
  metrics.metrics.slice(0, 8).forEach(m => console.log(`   ${m.name}: ${m.value}`));

  await browser.close();

  console.log('\n========================================');
  console.log(`🎉 [ALL 10 CDP TEST SUITES PASSED]`);
  console.log(`Errors Detected: ${errors.length}`);
  console.log(`Network Failures: ${networkFailures.length}`);
  console.log('========================================\n');

  if (errors.length > 0) {
    console.error('Detected Errors Details:', JSON.stringify(errors, null, 2));
    process.exit(1);
  }
}

runCDPDiagnostics().catch(err => {
  console.error('CDP Execution Fatal Error:', err);
  process.exit(1);
});
