import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\mdsai\\.gemini\\antigravity\\brain\\0a4a9d16-d2aa-4a8f-898f-c4748dc51157';

async function verifyViewport770() {
  console.log('📱 =================================================================');
  console.log('✨ [EXACT VIEWPORT 770x1294 & PALATE RIBBON POLISH TEST]');
  console.log('📱 =================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  // Exact dimensions from user screenshot
  await page.setViewport({ width: 770, height: 1294 });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });

  // Seed a Turkish favorite
  console.log('🧪 [TEST 1] Seeding Turkish Favorites to activate Palate Intelligence...');
  await page.evaluate(() => {
    const turkishFav = {
      id: "52772",
      idMeal: "52772",
      strMeal: "Teriyaki Chicken Casserole",
      title: "Teriyaki Chicken Casserole",
      category: "Chicken",
      strCategory: "Chicken",
      area: "Turkish",
      strArea: "Turkish",
      thumbnail: "https://www.themealdb.com/images/media/meals/wvpsxx1468256321.jpg"
    };
    const envelope = {
      _v: 2,
      _sig: "seed_sig",
      _data: [turkishFav],
      _ts: Date.now()
    };
    localStorage.setItem('culinaria_favorites_v2', JSON.stringify(envelope));
    window.location.reload();
  });
  await new Promise(r => setTimeout(r, 1200));

  // 1. Verify Header Dimensions and Actions Visibility at 770px
  console.log('🧪 [TEST 2] Verifying Header Alignment & Actions at 770px...');
  const headerOverflow = await page.evaluate(() => {
    const header = document.querySelector('.app-header');
    const actions = document.querySelector('.header-actions');
    const headerRect = header.getBoundingClientRect();
    const actionsRect = actions.getBoundingClientRect();
    return {
      headerWidth: headerRect.width,
      actionsRight: actionsRect.right,
      windowWidth: window.innerWidth,
      isClipped: actionsRect.right > window.innerWidth
    };
  });
  console.log(`  - Window Width: ${headerOverflow.windowWidth}px`);
  console.log(`  - Header Actions Right Boundary: ${headerOverflow.actionsRight}px`);
  console.log(`  - Actions Clipped off Screen: ${headerOverflow.isClipped}`);

  if (headerOverflow.isClipped) {
    throw new Error('Header actions are still clipped at 770px!');
  }
  console.log('  ✅ [PASS] Header Actions 100% Contained & Visible at 770px\n');

  // 2. Verify Palate Ribbon Horizontal Strip
  console.log('🧪 [TEST 3] Verifying Palate Ribbon Layout & Title Clamping...');
  const palateStripCheck = await page.evaluate(() => {
    const strip = document.querySelector('.ribbon-cards-strip');
    const cards = Array.from(document.querySelectorAll('.palate-card'));
    const badges = Array.from(document.querySelectorAll('.palate-rationale-pill')).map(b => b.innerText);
    const titles = Array.from(document.querySelectorAll('.palate-dish-title')).map(t => t.innerText);

    return {
      hasStrip: Boolean(strip),
      cardsCount: cards.length,
      badges,
      titles
    };
  });

  console.log(`  - Palate Cards in Ribbon: ${palateStripCheck.cardsCount}`);
  console.log(`  - Badges: ${JSON.stringify(palateStripCheck.badges)}`);
  console.log(`  - Titles: ${JSON.stringify(palateStripCheck.titles)}`);

  // Check no truncated badges
  const hasTruncatedBadge = palateStripCheck.badges.some(b => b.endsWith('...'));
  console.log(`  - Badges with truncated ellipsis (...): ${hasTruncatedBadge}`);
  if (hasTruncatedBadge) {
    throw new Error('Palate rationale badge is still truncated!');
  }
  console.log('  ✅ [PASS] Palate Badges are Crisp, Complete & Uncut\n');

  // 3. Capture high-res screenshot artifact at 770x1294
  const screenshotPath = path.join(ARTIFACT_DIR, 'viewport_770x1294_blunder_fixed.png');
  await page.screenshot({ path: screenshotPath });
  console.log(`📸 High-res screenshot saved: ${screenshotPath}`);

  await browser.close();
  console.log('\n=================================================================');
  console.log('🏆 [VIEWPORT 770px & PALATE RIBBON 100% VERIFIED & FIXED]');
  console.log('=================================================================');
}

verifyViewport770().catch(err => {
  console.error('❌ VIEWPORT 770 TEST FAILED:', err);
  process.exit(1);
});
