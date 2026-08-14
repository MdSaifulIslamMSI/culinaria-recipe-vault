import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACTS_DIR = 'C:\\Users\\mdsai\\.gemini\\antigravity\\brain\\0a4a9d16-d2aa-4a8f-898f-c4748dc51157';

const VIEWPORTS = [
  { name: 'samsung_s20_360x780', width: 360, height: 780 },
  { name: 'iphone_14_pro_393x852', width: 393, height: 852 },
  { name: 'pixel_7_412x915', width: 412, height: 915 }
];

async function verifyMobile() {
  console.log('📱 =================================================================');
  console.log('🔍 [MOBILE RESPONSIVE RIGOROUS VERIFICATION]');
  console.log('📱 =================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  for (const vp of VIEWPORTS) {
    console.log(`\n📐 Testing Viewport: ${vp.name} (${vp.width}x${vp.height})...`);
    await page.setViewport({ width: vp.width, height: vp.height, isMobile: true, hasTouch: true });
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 600));

    // Check horizontal overflow on Explore
    const exploreOverflow = await page.evaluate(() => {
      const scrollW = document.documentElement.scrollWidth;
      const clientW = document.documentElement.clientWidth;
      return scrollW - clientW;
    });

    console.log(`  - Explore view horizontal overflow: ${exploreOverflow}px (Expected: 0px)`);

    // Capture Explore screenshot
    const exploreScreenshotPath = path.join(ARTIFACTS_DIR, `mobile_explore_${vp.name}.png`);
    await page.screenshot({ path: exploreScreenshotPath });
    console.log(`  - Saved screenshot: ${exploreScreenshotPath}`);

    // Switch to Pantry Matcher
    await page.click('#tabPantryMobile');
    await new Promise(r => setTimeout(r, 500));

    // Check horizontal overflow on Pantry
    const pantryOverflow = await page.evaluate(() => {
      const scrollW = document.documentElement.scrollWidth;
      const clientW = document.documentElement.clientWidth;
      return scrollW - clientW;
    });

    console.log(`  - Pantry view horizontal overflow: ${pantryOverflow}px (Expected: 0px)`);

    // Verify Add Item button is within container
    const isAddBtnInside = await page.evaluate(() => {
      const btn = document.getElementById('btnAddPantryItem');
      const card = document.querySelector('.pantry-builder-card');
      if (!btn || !card) return false;
      const btnRect = btn.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      return btnRect.right <= cardRect.right + 2;
    });

    console.log(`  - "+ Add Item" contained inside card: ${isAddBtnInside}`);

    // Capture Pantry screenshot
    const pantryScreenshotPath = path.join(ARTIFACTS_DIR, `mobile_pantry_${vp.name}.png`);
    await page.screenshot({ path: pantryScreenshotPath });
    console.log(`  - Saved screenshot: ${pantryScreenshotPath}`);

    if (exploreOverflow > 0 || pantryOverflow > 0 || !isAddBtnInside) {
      console.error(`❌ FAILED on ${vp.name}!`);
      process.exit(1);
    }
  }

  await browser.close();
  console.log('\n🎉 All tested mobile viewports passed the overflow and containment checks.');
}

verifyMobile().catch(err => {
  console.error(err);
  process.exit(1);
});
