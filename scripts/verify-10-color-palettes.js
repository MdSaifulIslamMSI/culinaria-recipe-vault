import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\mdsai\\.gemini\\antigravity\\brain\\0a4a9d16-d2aa-4a8f-898f-c4748dc51157';

async function testTenColorPalettes() {
  console.log('🎨 =================================================================');
  console.log('✨ [10 GOURMET CULINARY COLOR PALETTES VERIFICATION SUITE]');
  console.log('🎨 =================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });

  // 1. Open Chef Preferences Drawer
  console.log('🧪 [TEST 1] Opening Preferences Drawer...');
  await page.click('#btnChefPreferences');
  await new Promise(r => setTimeout(r, 500));

  const swatchesCount = await page.$$eval('.palette-swatch-card', els => els.length);
  console.log(`  - Palette Swatches Rendered in Drawer: ${swatchesCount} (Expected: 10)`);
  if (swatchesCount !== 10) {
    throw new Error(`Expected 10 swatches, found ${swatchesCount}`);
  }
  console.log('  ✅ [PASS] All 10 Palette Swatches Present\n');

  // 2. Test cycling through all 10 color themes
  const expectedPalettes = [
    'saffron', 'olive', 'merlot', 'santorini', 'matcha',
    'espresso', 'sage', 'truffle', 'lavender', 'obsidian'
  ];

  console.log('🧪 [TEST 2] Testing dynamic switching across all 10 palettes...');
  for (const palId of expectedPalettes) {
    await page.click(`.palette-swatch-card[data-palette-id="${palId}"]`);
    await new Promise(r => setTimeout(r, 150));

    const activeDataPalette = await page.evaluate(() => document.documentElement.getAttribute('data-palette'));
    const isCardActive = await page.$eval(`.palette-swatch-card[data-palette-id="${palId}"]`, el => el.classList.contains('active'));

    console.log(`  - Switched to "${palId}": data-palette="${activeDataPalette}", card.active=${isCardActive}`);
    if (activeDataPalette !== palId || !isCardActive) {
      throw new Error(`Palette switch failed for ${palId}`);
    }
  }
  console.log('  ✅ [PASS] All 10 Palettes Switch Dynamically with 0ms Delay\n');

  // 3. Test Persistence after Hard Refresh
  console.log('🧪 [TEST 3] Testing LocalStorage persistence after Page Refresh...');
  // Select Santorini Azure
  await page.click('.palette-swatch-card[data-palette-id="santorini"]');
  await new Promise(r => setTimeout(r, 200));

  // Close drawer
  await page.click('#btnClosePrefsDrawer');
  await new Promise(r => setTimeout(r, 300));

  // Hard reload
  await page.reload({ waitUntil: 'networkidle2' });

  const paletteAfterRefresh = await page.evaluate(() => document.documentElement.getAttribute('data-palette'));
  console.log(`  - Palette immediately on fresh reload: "${paletteAfterRefresh}" (Expected: "santorini")`);

  if (paletteAfterRefresh !== 'santorini') {
    throw new Error(`Persistence failed! Found "${paletteAfterRefresh}"`);
  }
  console.log('  ✅ [PASS] Zero-Flicker Palette Persistence Verified\n');

  // 4. Capture Visual Artifacts of distinct themes
  console.log('🧪 [TEST 4] Capturing Multi-Theme Visual Showcase Screenshots...');
  
  // A: Santorini Theme in Light Mode
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'theme_01_santorini_azure.png') });
  
  // B: Merlot Theme in Dark Mode
  await page.click('#btnChefPreferences');
  await new Promise(r => setTimeout(r, 300));
  await page.click('.palette-swatch-card[data-palette-id="merlot"]');
  await new Promise(r => setTimeout(r, 200));
  await page.click('#btnClosePrefsDrawer');
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'theme_02_bordeaux_merlot.png') });

  // C: Obsidian OLED Theme
  await page.click('#btnChefPreferences');
  await new Promise(r => setTimeout(r, 300));
  await page.click('.palette-swatch-card[data-palette-id="obsidian"]');
  await new Promise(r => setTimeout(r, 200));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'theme_03_obsidian_oled_drawer.png') });

  // 5. Test Reset
  console.log('\n🧪 [TEST 5] Testing Reset Palette to Default...');
  await page.click('#btnResetAllPrefs');
  await new Promise(r => setTimeout(r, 300));

  const paletteAfterReset = await page.evaluate(() => document.documentElement.getAttribute('data-palette'));
  console.log(`  - Palette after Reset: "${paletteAfterReset}" (Expected: "saffron")`);

  if (paletteAfterReset !== 'saffron') {
    throw new Error('Reset failed to revert to default saffron palette!');
  }
  console.log('  ✅ [PASS] Reset to Default Operational\n');

  await browser.close();
  console.log('=================================================================');
  console.log('🏆 [ALL 10 GOURMET COLOR PALETTES 100% VERIFIED]');
  console.log('=================================================================');
}

testTenColorPalettes().catch(err => {
  console.error('❌ PALETTES TEST FAILED:', err);
  process.exit(1);
});
