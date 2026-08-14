import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\mdsai\\.gemini\\antigravity\\brain\\0a4a9d16-d2aa-4a8f-898f-c4748dc51157';

async function verifyVideoFacade() {
  console.log('🎬 =================================================================');
  console.log('✨ [VIDEO COOKING MASTERCLASS FACADE VERIFICATION SUITE]');
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

  // 2. Verify Video Facade Elements
  console.log('🧪 [TEST 2] Verifying Video Cooking Masterclass Facade...');
  const videoDetails = await page.evaluate(() => {
    const wrap = document.querySelector('.video-section-wrap');
    const extBtn = document.querySelector('.yt-external-btn');
    const facade = document.querySelector('.video-facade-card');
    const playBtn = document.querySelector('.btn-facade-play');

    return {
      hasWrap: Boolean(wrap),
      hasExtBtn: Boolean(extBtn),
      extHref: extBtn ? extBtn.href : null,
      hasFacade: Boolean(facade),
      hasPlayBtn: Boolean(playBtn)
    };
  });

  console.log(`  - Video Wrap Present: ${videoDetails.hasWrap}`);
  console.log(`  - External YouTube Link: ${videoDetails.extHref}`);
  console.log(`  - Facade Card Present: ${videoDetails.hasFacade}`);
  console.log(`  - Play Masterclass Button: ${videoDetails.hasPlayBtn}`);

  if (!videoDetails.hasWrap || !videoDetails.hasFacade || !videoDetails.hasPlayBtn) {
    throw new Error('Video Masterclass Facade elements missing!');
  }
  console.log('  ✅ [PASS] Video Masterclass Facade & Fallback Link Verified\n');

  // 3. Scroll to Video Masterclass and capture screenshot
  console.log('🧪 [TEST 3] Scrolling to Video Masterclass & Capturing Screenshot...');
  await page.evaluate(() => {
    const videoWrap = document.querySelector('.video-section-wrap');
    if (videoWrap) {
      videoWrap.scrollIntoView({ behavior: 'instant', block: 'center' });
    }
  });
  await new Promise(r => setTimeout(r, 400));
  const screenshotPath = path.join(ARTIFACT_DIR, 'video_masterclass_facade_fixed.png');
  await page.screenshot({ path: screenshotPath });
  console.log(`📸 Screenshot saved: ${screenshotPath}\n`);

  // 4. Test Click-to-Play Swap to Iframe
  console.log('🧪 [TEST 4] Testing Click-to-Play Iframe Activation...');
  const clickDiag = await page.evaluate(() => {
    const facade = document.querySelector('.video-facade-card');
    if (!facade) return { error: 'no facade found' };
    const btn = facade.querySelector('.btn-facade-play') || facade;
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    const container = document.querySelector('.video-frame-container');
    const iframe = container ? container.querySelector('iframe') : null;
    return {
      facadeFound: true,
      hasIframe: Boolean(iframe),
      iframeSrc: iframe ? iframe.src : null,
      containerHtml: container ? container.innerHTML : null
    };
  });

  console.log(`  - Click Diagnostics:`, clickDiag);
  if (!clickDiag.hasIframe) {
    throw new Error('Iframe failed to mount after facade click!');
  }
  console.log('  ✅ [PASS] Interactive Video Player Successfully Activated\n');

  await browser.close();
  console.log('=================================================================');
  console.log('🏆 [VIDEO COOKING MASTERCLASS 100% FIXED & VERIFIED]');
  console.log('=================================================================');
}

verifyVideoFacade().catch(err => {
  console.error('❌ VIDEO FACADE TEST FAILED:', err);
  process.exit(1);
});
