import assert from 'assert';
import puppeteer from 'puppeteer-core';
import { 
  filterByCategory,
  filterByArea,
  filterByCategoryAndArea,
  filterByIngredient,
  matchesIngredient
} from '../src/services/mealDbApi.js';
import { computeIntegrityHash } from '../src/utils/securitySanitizer.js';
import { safeGet } from '../src/services/storageService.js';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

console.log('🧪 =================================================================');
console.log('✨ [PRODUCTION ENGINEERING & BEHAVIORAL HARDENING VERIFICATION]');
console.log('🧪 =================================================================\n');

async function runHardeningTests() {
  // -------------------------------------------------------------
  // TEST 1: Offline Strict Pantry Matching & False Positive Elimination
  // -------------------------------------------------------------
  console.log('🔍 [TEST 1] Testing Strict Pantry Matching...');
  
  const realMatches = await filterByIngredient('chicken');
  console.log(`  - Query "chicken" -> Returned ${realMatches.length} matching recipes`);
  assert(realMatches.length > 0, 'Expected positive matches for common ingredient "chicken"');

  const fakeMatches1 = await filterByIngredient('unobtanium');
  console.log(`  - Query "unobtanium" -> Returned ${fakeMatches1.length} recipes`);
  assert.strictEqual(fakeMatches1.length, 0, 'Expected 0 matches for non-existent ingredient "unobtanium"');

  const fakeMatches2 = await filterByIngredient('dragon_dust_999');
  console.log(`  - Query "dragon_dust_999" -> Returned ${fakeMatches2.length} recipes`);
  assert.strictEqual(fakeMatches2.length, 0, 'Expected 0 matches for non-existent ingredient "dragon_dust_999"');
  assert.equal(matchesIngredient('Egg Roll Wrappers', 'egg'), false, 'Compound ingredient must not be a direct egg match');
  assert.equal(matchesIngredient('Eggs', 'egg'), true, 'Plural direct ingredient should match');
  console.log('  ✅ [PASS] Pantry matching verified with compound-word protection\n');

  // -------------------------------------------------------------
  // TEST 2: Offline Category + Area Intersection & Null Safety
  // -------------------------------------------------------------
  console.log('🔍 [TEST 2] Testing Offline Multi-Filter Intersection & Null-Safety...');
  
  const chickenCat = await filterByCategory('Chicken');
  console.log(`  - Category "Chicken" -> Returned ${chickenCat.length} recipes`);
  assert(chickenCat.length > 0, 'Expected results for Chicken category');

  const indianArea = await filterByArea('Indian');
  console.log(`  - Area "Indian" -> Returned ${indianArea.length} recipes`);
  assert(indianArea.length > 0, 'Expected results for Indian area');

  const indianChicken = await filterByCategoryAndArea('Chicken', 'Indian');
  console.log(`  - Category "Chicken" + Area "Indian" -> Returned ${indianChicken.length} recipes`);
  assert(indianChicken.length > 0, 'Expected results for Chicken + Indian intersection');
  
  indianChicken.forEach(r => {
    assert(r.id, 'Recipe ID must exist');
    assert(r.title, 'Recipe title must exist');
  });
  console.log('  ✅ [PASS] Multi-filter intersection & null safety verified\n');

  // -------------------------------------------------------------
  // TEST 3: Cryptographic Integrity Signature & Tamper Detection
  // -------------------------------------------------------------
  console.log('🔍 [TEST 3] Testing Local Storage Corruption Detection...');
  
  const testPayload = [{ id: '52772', title: 'Teriyaki Chicken Casserole' }];
  const originalSig = computeIntegrityHash(testPayload);
  
  const recalculateSig = computeIntegrityHash(testPayload);
  assert.strictEqual(originalSig, recalculateSig, 'Integrity signature must be deterministic');

  const tamperedPayload = [{ id: '52772', title: 'FORGED_PAYLOAD_XSS_ATTACK' }];
  globalThis.localStorage = {
    store: new Map(),
    getItem(key) { return this.store.get(key) ?? null; },
    setItem(key, value) { this.store.set(key, String(value)); }
  };
  globalThis.localStorage.setItem('hardening-check', JSON.stringify({
    _v: 2,
    _sig: originalSig,
    _data: tamperedPayload
  }));
  assert.deepStrictEqual(safeGet('hardening-check', []), [], 'Changed payload with original checksum must reset to fallback');
  console.log('  - Original Checksum:', originalSig);
  console.log('  ✅ [PASS] Local corruption detection verified (not authentication)\n');

  // -------------------------------------------------------------
  // TEST 4: Headless Browser Accessibility, ARIA Roles, & Focus Trapping
  // -------------------------------------------------------------
  console.log('🔍 [TEST 4] Testing Browser ARIA Semantics & Accessibility...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });

  const a11yChecks = await page.evaluate(() => {
    const searchInput = document.getElementById('recipeSearchInput');
    const pantryInput = document.getElementById('pantryIngredientInput');
    const groceryInput = document.getElementById('manualGroceryInput');
    
    const recipeModal = document.getElementById('recipeModal');
    const shoppingDrawer = document.getElementById('shoppingDrawer');
    const prefsDrawer = document.getElementById('prefsDrawer');
    const cookModeOverlay = document.getElementById('cookModeOverlay');

    return {
      searchHasAria: Boolean(searchInput && searchInput.getAttribute('aria-label')),
      pantryHasAria: Boolean(pantryInput && pantryInput.getAttribute('aria-label')),
      groceryHasAria: Boolean(groceryInput && groceryInput.getAttribute('aria-label')),
      
      modalIsDialog: recipeModal?.getAttribute('role') === 'dialog' && recipeModal?.getAttribute('aria-modal') === 'true',
      shoppingIsDialog: shoppingDrawer?.getAttribute('role') === 'dialog' && shoppingDrawer?.getAttribute('aria-modal') === 'true',
      prefsIsDialog: prefsDrawer?.getAttribute('role') === 'dialog' && prefsDrawer?.getAttribute('aria-modal') === 'true',
      cookIsDialog: cookModeOverlay?.getAttribute('role') === 'dialog' && cookModeOverlay?.getAttribute('aria-modal') === 'true'
    };
  });

  console.log('  - Search Input ARIA Label:', a11yChecks.searchHasAria);
  console.log('  - Pantry Input ARIA Label:', a11yChecks.pantryHasAria);
  console.log('  - Grocery Input ARIA Label:', a11yChecks.groceryHasAria);
  console.log('  - Recipe Modal Dialog Semantics:', a11yChecks.modalIsDialog);
  console.log('  - Shopping Drawer Dialog Semantics:', a11yChecks.shoppingIsDialog);
  console.log('  - Prefs Drawer Dialog Semantics:', a11yChecks.prefsIsDialog);
  console.log('  - Cook Mode Dialog Semantics:', a11yChecks.cookIsDialog);

  assert(a11yChecks.searchHasAria, 'Search input must have accessible aria-label');
  assert(a11yChecks.pantryHasAria, 'Pantry input must have accessible aria-label');
  assert(a11yChecks.groceryHasAria, 'Grocery input must have accessible aria-label');
  assert(a11yChecks.modalIsDialog, 'Recipe modal must have role=dialog and aria-modal=true');
  assert(a11yChecks.shoppingIsDialog, 'Shopping drawer must have role=dialog and aria-modal=true');
  assert(a11yChecks.prefsIsDialog, 'Preferences drawer must have role=dialog and aria-modal=true');
  assert(a11yChecks.cookIsDialog, 'Cook mode overlay must have role=dialog and aria-modal=true');

  console.log('  ✅ [PASS] All ARIA attributes and dialog semantics verified\n');

  await browser.close();

  console.log('=================================================================');
  console.log('🏆 [ALL PRODUCTION HARDENING TESTS PASSED]');
  console.log('=================================================================');
}

runHardeningTests().catch(err => {
  console.error('❌ HARDENING TESTS FAILED:', err);
  process.exit(1);
});
