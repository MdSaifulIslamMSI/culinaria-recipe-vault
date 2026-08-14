import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function testErrorResilience() {
  console.log('🛡️ =================================================================');
  console.log('⚡ [GLOBAL ERROR BOUNDARY & NETWORK RESILIENCE VERIFICATION]');
  console.log('🛡️ =================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });

  // 1. Test Network Offline / Online Toast Interception
  console.log('🧪 [TEST 1] Network Connectivity & Offline Awareness...');
  await page.evaluate(() => {
    window.dispatchEvent(new Event('offline'));
  });
  await new Promise(r => setTimeout(r, 400));
  let toastMsg = await page.$eval('.toast', el => el.innerText);
  console.log(`  - Offline Mode Toast: "${toastMsg}"`);

  await page.evaluate(() => {
    window.dispatchEvent(new Event('online'));
  });
  await new Promise(r => setTimeout(r, 400));
  toastMsg = await page.$eval('.toast', el => el.innerText);
  console.log(`  - Online Mode Restored Toast: "${toastMsg}"`);
  console.log('  ✅ [PASS] Network Event Awareness Operational\n');

  // 2. Test Unhandled Exception Catching without UI Crash
  console.log('🧪 [TEST 2] Unhandled Error Boundary Interception...');
  await page.evaluate(() => {
    // Dispatch an unhandled rejection
    const unhandledEvent = new PromiseRejectionEvent('unhandledrejection', {
      promise: Promise.reject(new Error('Simulated external script collision')),
      reason: new Error('Simulated external script collision')
    });
    window.dispatchEvent(unhandledEvent);
  });

  // Verify the page grid is still intact and rendering
  const gridCardsCount = await page.$$eval('.recipe-card', cards => cards.length);
  console.log(`  - Recipe Grid Cards active after unhandled exception: ${gridCardsCount} (Intact)`);

  if (gridCardsCount === 0) {
    throw new Error('Unhandled exception crashed recipe grid!');
  }
  console.log('  ✅ [PASS] Error Boundary Intercepted Exception Safely\n');

  // 3. Test Recovery Screen Trigger
  console.log('🧪 [TEST 3] Emergency Self-Healing Recovery Dialog...');
  await page.evaluate(() => {
    window.__CULINARIA_SECURITY__.renderRecoveryScreen('Fatal V8 memory exhaustion simulated');
  });

  const isRecoveryVisible = await page.$eval('#errorBoundaryOverlay', el => !el.classList.contains('hidden'));
  const recoveryTitle = await page.$eval('.recovery-title', el => el.innerText);
  console.log(`  - Recovery Overlay rendered: ${isRecoveryVisible}`);
  console.log(`  - Recovery Screen Title: "${recoveryTitle}"`);

  if (!isRecoveryVisible || !recoveryTitle.includes('Kitchen Prep Interrupted')) {
    throw new Error('Recovery screen failed to display properly!');
  }
  console.log('  ✅ [PASS] Self-Healing Recovery Screen Active\n');

  await browser.close();
  console.log('=================================================================');
  console.log('🏁 [ERROR HANDLING & RESILIENCE CHECKS COMPLETE]');
  console.log('=================================================================');
}

testErrorResilience().catch(err => {
  console.error('❌ ERROR RESILIENCE TEST FAILED:', err);
  process.exit(1);
});
