import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\mdsai\\.gemini\\antigravity\\brain\\0a4a9d16-d2aa-4a8f-898f-c4748dc51157';

async function verifyVideoFacade() {
  console.log('🎬 =================================================================');
  console.log('✨ [VIDEO COOKING MASTERCLASS FINAL LAUNCHER VERIFICATION]');
  console.log('🎬 =================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });

  // 1. Open first recipe modal
  console.log('🧪 [TEST 1] Opening Recipe Studio Modal...');
  await page.waitForSelector('.recipe-card', { timeout: 10000 });
  await page.click('.recipe-card');
  await page.waitForSelector('.modal-method-col', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 600));

  // 2. Verify Video Elements
  console.log('🧪 [TEST 2] Verifying Video Masterclass Card & Direct YouTube Link...');
  const details = await page.evaluate(() => {
    const wrap = document.querySelector('.video-section-wrap');
    const facadeLink = document.querySelector('.video-facade-card');
    const headerBtn = document.querySelector('.yt-external-btn');
    const footerStrip = document.querySelector('.video-footer-strip');
    const footerLink = document.querySelector('.video-footer-link');

    return {
      hasWrap: Boolean(wrap),
      facadeHref: facadeLink ? facadeLink.href : null,
      headerHref: headerBtn ? headerBtn.href : null,
      hasFooterStrip: Boolean(footerStrip),
      footerHref: footerLink ? footerLink.href : null
    };
  });

  console.log('  - Facade Link URL:', details.facadeHref);
  console.log('  - Header Button URL:', details.headerHref);
  console.log('  - Footer Link URL:', details.footerHref);

  if (!details.hasWrap || !details.facadeHref || !details.headerHref) {
    throw new Error('Video Masterclass elements missing!');
  }
  console.log('  ✅ [PASS] Video Masterclass Direct Launcher Links Verified\n');

  // 3. Scroll to Video Masterclass and capture screenshot
  console.log('🧪 [TEST 3] Scrolling to Video Masterclass & Capturing Screenshot...');
  await page.evaluate(() => {
    const videoWrap = document.querySelector('.video-section-wrap');
    if (videoWrap) {
      videoWrap.scrollIntoView({ behavior: 'instant', block: 'center' });
    }
  });
  await new Promise(r => setTimeout(r, 400));
  const screenshotPath = path.join(ARTIFACT_DIR, 'video_guide_facade_verified.png');
  await page.screenshot({ path: screenshotPath });
  console.log(`📸 Screenshot saved: ${screenshotPath}\n`);

  await browser.close();
  console.log('=================================================================');
  console.log('🏁 [VIDEO GUIDE CHECKS COMPLETE]');
  console.log('=================================================================');
}

verifyVideoFacade().catch(err => {
  console.error('❌ VIDEO TEST FAILED:', err);
  process.exit(1);
});
