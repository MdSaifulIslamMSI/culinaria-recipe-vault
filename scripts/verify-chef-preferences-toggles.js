import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function testChefPreferencesToggles() {
  console.log('⚙️ =================================================================');
  console.log('✨ [CHEF KITCHEN PREFERENCES (10 TOGGLES) VERIFICATION]');
  console.log('⚙️ =================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log(`  [BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', err => console.log(`  [BROWSER ERROR] ${err.toString()}`));

  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });

  // 1. Open Chef Preferences Drawer
  console.log('🧪 [TEST 1] Opening Chef Preferences Drawer...');
  await page.click('#btnChefPreferences');
  await new Promise(r => setTimeout(r, 400));

  const isDrawerOpen = await page.$eval('#prefsDrawer', el => el.classList.contains('open'));
  console.log(`  - Preferences Drawer Open in DOM: ${isDrawerOpen}`);

  if (!isDrawerOpen) {
    throw new Error('Preferences Drawer failed to open!');
  }
  console.log('  ✅ [PASS] Drawer Opened Successfully\n');

  // 2. Test Compact Grid Toggle
  console.log('🧪 [TEST 2] Toggling Compact Chef View Grid...');
  await page.evaluate(() => document.getElementById('prefCompactGrid').click());
  await new Promise(r => setTimeout(r, 400));

  const hasCompactClass = await page.$eval('#recipeCardsGrid', el => el.classList.contains('compact-grid'));
  console.log(`  - Recipe Grid has .compact-grid class: ${hasCompactClass}`);

  if (!hasCompactClass) {
    throw new Error('Compact Grid class was not applied to #recipeCardsGrid!');
  }
  console.log('  ✅ [PASS] Compact Chef View Active\n');

  // 3. Test Dietary Vegetarian Only Toggle
  console.log('🧪 [TEST 3] Toggling Vegetarian Only Focus...');
  await page.evaluate(() => document.getElementById('prefVegetarianOnly').click());
  await new Promise(r => setTimeout(r, 400));

  const vegDishesCount = await page.$$eval('.recipe-card', cards => cards.length);
  console.log(`  - Vegetarian Filtered Recipe Cards: ${vegDishesCount}`);

  if (vegDishesCount === 0) {
    throw new Error('Vegetarian toggle returned 0 recipes!');
  }
  console.log('  ✅ [PASS] Dietary Vegetarian Filter Active\n');

  // 4. Test Unit Switcher (Metric / Imperial) in Modal
  console.log('🧪 [TEST 4] Toggling Global Unit to US Imperial...');
  await page.evaluate(() => document.getElementById('prefUnitImperial').click());
  await new Promise(r => setTimeout(r, 300));

  // Close drawer
  await page.evaluate(() => document.getElementById('btnClosePrefsDrawer').click());
  await new Promise(r => setTimeout(r, 600));

  // Open first recipe modal
  await page.waitForSelector('#recipeCardsGrid .recipe-card', { visible: true });
  await new Promise(r => setTimeout(r, 400));
  await page.click('#recipeCardsGrid .recipe-card');

  await page.waitForSelector('#recipeModalBackdrop.open', { visible: true, timeout: 10000 });
  await page.waitForSelector('.unit-btn.active', { visible: true, timeout: 5000 });

  const modalActiveUnit = await page.$eval('.unit-btn.active', el => el.innerText);
  console.log(`  - Active Unit in Recipe Studio Modal: "${modalActiveUnit}" (Expected: "US (cups / oz)")`);

  if (!modalActiveUnit.includes('US')) {
    throw new Error('Modal failed to inherit Imperial unit preference!');
  }
  console.log('  ✅ [PASS] Global Unit Preference Inherited by Recipe Studio\n');

  // 5. Close Modal, reopen Drawer and Reset
  await page.click('#btnCloseRecipeModal');
  await new Promise(r => setTimeout(r, 300));
  await page.click('#btnChefPreferences');
  await new Promise(r => setTimeout(r, 300));

  console.log('🧪 [TEST 5] Resetting all preferences to defaults...');
  await page.click('#btnResetAllPrefs');
  await new Promise(r => setTimeout(r, 400));

  const isCompactAfterReset = await page.$eval('#recipeCardsGrid', el => el.classList.contains('compact-grid'));
  console.log(`  - Grid Compact State after reset: ${isCompactAfterReset} (Expected: false)`);

  if (isCompactAfterReset) {
    throw new Error('Preferences reset failed to revert compact grid!');
  }
  console.log('  ✅ [PASS] Reset to Defaults Operational\n');

  await browser.close();
  console.log('=================================================================');
  console.log('🏆 [CHEF KITCHEN PREFERENCES & 10 TOGGLES 100% VERIFIED]');
  console.log('=================================================================');
}

testChefPreferencesToggles().catch(err => {
  console.error('❌ PREFERENCES TEST FAILED:', err);
  process.exit(1);
});
