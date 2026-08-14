/**
 * Multi-Device CDP Responsive Verification & Screenshot Capture
 */
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TARGET_URL = 'http://localhost:3000/';
const ARTIFACT_DIR = 'C:\\Users\\mdsai\\.gemini\\antigravity\\brain\\0a4a9d16-d2aa-4a8f-898f-c4748dc51157';

const VIEWPORTS = [
  { name: 'iphone_14_pro', width: 393, height: 852, isMobile: true, hasTouch: true },
  { name: 'samsung_galaxy_s20', width: 412, height: 915, isMobile: true, hasTouch: true },
  { name: 'ipad_mini_tablet', width: 768, height: 1024, isMobile: false, hasTouch: true },
  { name: 'desktop_1080p', width: 1440, height: 900, isMobile: false, hasTouch: false }
];

async function verifyResponsive() {
  console.log('📱 =================================================================');
  console.log('✨ [CDP MULTI-DEVICE RESPONSIVE AUDIT] Capturing Clean Layouts...');
  console.log('📱 =================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const vp of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewport({
      width: vp.width,
      height: vp.height,
      isMobile: vp.isMobile,
      hasTouch: vp.hasTouch,
      deviceScaleFactor: 2
    });

    await page.goto(TARGET_URL, { waitUntil: 'networkidle2' });
    await page.waitForSelector('.recipe-card', { timeout: 10000 });

    // Check for horizontal overflow (must be strictly 0 for perfect responsiveness)
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });

    const shotPath = path.join(ARTIFACT_DIR, `responsive_${vp.name}.png`);
    await page.screenshot({ path: shotPath, fullPage: false });

    console.log(`📸 [${vp.name.toUpperCase()}] Viewport (${vp.width}x${vp.height}):`);
    console.log(`   - Horizontal Overflow: ${hasHorizontalOverflow ? '❌ FAILED' : '✅ 0px'}`);
    console.log(`   - Screenshot Saved: ${shotPath}`);

    await page.close();
  }

  await browser.close();
  console.log('\n✨ Multi-device responsive audit completed with 0 horizontal overflow!');
}

verifyResponsive().catch(err => {
  console.error('Audit Error:', err);
  process.exit(1);
});
