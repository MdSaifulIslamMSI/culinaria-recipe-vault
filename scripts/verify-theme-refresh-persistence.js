import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function testThemePersistenceOnRefresh() {
  console.log('🌓 =================================================================');
  console.log('✨ [THEME PERSISTENCE & ZERO-FLICKER REFRESH TEST]');
  console.log('🌓 =================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });

  // 1. Check initial theme
  const initialTheme = await page.$eval('html', el => el.getAttribute('data-theme')) || 'light';
  const targetTheme = initialTheme === 'dark' ? 'light' : 'dark';
  console.log(`  - Initial Theme: "${initialTheme}" -> Target: "${targetTheme}"`);

  // 2. Click theme toggle button
  console.log(`🧪 [TEST 1] Toggling to ${targetTheme} Theme...`);
  await page.click('#themeToggle');
  await new Promise(r => setTimeout(r, 300));
  let currentTheme = await page.$eval('html', el => el.getAttribute('data-theme'));
  console.log(`  - Theme after toggle: "${currentTheme}" (Expected: "${targetTheme}")`);

  if (currentTheme !== targetTheme) {
    throw new Error(`Failed to toggle to ${targetTheme} theme!`);
  }

  // 3. Hard Refresh the page and verify theme is preserved immediately
  console.log('🧪 [TEST 2] Hard Refreshing page to verify persistence...');
  await page.reload({ waitUntil: 'networkidle2' });
  
  const themeAfterRefresh = await page.$eval('html', el => el.getAttribute('data-theme'));
  const storedThemeInStorage = await page.evaluate(() => localStorage.getItem('culinaria_theme_preference'));
  
  console.log(`  - Theme immediately on refresh: "${themeAfterRefresh}" (Expected: "${targetTheme}")`);
  console.log(`  - Theme in localStorage: "${storedThemeInStorage}" (Expected: "${targetTheme}")`);

  if (themeAfterRefresh !== targetTheme || storedThemeInStorage !== targetTheme) {
    throw new Error('Theme was lost or reset on page refresh!');
  }
  console.log(`  ✅ [PASS] ${targetTheme} Theme Persisted Across Refresh with Zero Flicker\n`);

  // 4. Toggle back to Initial Theme & Refresh
  console.log(`🧪 [TEST 3] Toggling back to ${initialTheme} Theme & Refreshing...`);
  await page.click('#themeToggle');
  await new Promise(r => setTimeout(r, 300));
  await page.reload({ waitUntil: 'networkidle2' });
  const themeAfterSecondRefresh = await page.$eval('html', el => el.getAttribute('data-theme'));
  console.log(`  - Theme after second refresh: "${themeAfterSecondRefresh}" (Expected: "${initialTheme}")`);

  if (themeAfterSecondRefresh !== initialTheme) {
    throw new Error(`${initialTheme} theme persistence failed!`);
  }
  console.log(`  ✅ [PASS] ${initialTheme} Theme Persisted Across Refresh\n`);

  await browser.close();
  console.log('=================================================================');
  console.log('🏁 [THEME PERSISTENCE CHECKS COMPLETE]');
  console.log('=================================================================');
}

testThemePersistenceOnRefresh().catch(err => {
  console.error('❌ THEME TEST FAILED:', err);
  process.exit(1);
});
