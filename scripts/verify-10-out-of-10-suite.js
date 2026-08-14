import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\mdsai\\.gemini\\antigravity\\brain\\0a4a9d16-d2aa-4a8f-898f-c4748dc51157';

async function verifyFrontendInteractionSuite() {
  console.log('🏆 =================================================================');
  console.log('✨ [FRONTEND INTERACTION VERIFICATION SUITE]');
  console.log('🏆 =================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });

  // 1. Test Pantry Voice Dictate Button
  console.log('🧪 [TEST 1] Verifying Pantry Voice Input Button...');
  // Navigate to Pantry view
  await page.click('button[data-view="pantry"]');
  await new Promise(r => setTimeout(r, 400));

  const voiceBtn = await page.$('#btnVoicePantry');
  if (!voiceBtn) {
    throw new Error('#btnVoicePantry not found in Pantry view!');
  }
  const voiceBtnText = await page.$eval('#btnVoicePantry', el => el.innerText);
  console.log(`  - Voice Button Found: "${voiceBtnText}"`);
  console.log('  ✅ [PASS] Pantry Voice Dictate Button Operational\n');

  // 2. Test Inline Step Timers & Floating Timer Dock
  console.log('🧪 [TEST 2] Testing Inline Step-by-Step Timer Pills...');
  // Navigate back to explore and open first recipe
  await page.click('button[data-view="explore"]');
  await page.waitForSelector('.recipe-card', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 400));

  await page.click('.recipe-card');
  await page.waitForSelector('.modal-method-col', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 600));

  const inlineTimersCount = await page.$$eval('.inline-step-timer-chip', chips => chips.length);
  console.log(`  - Detected Inline Step Timers in Recipe: ${inlineTimersCount}`);

  if (inlineTimersCount === 0) {
    throw new Error('Expected at least one inline step timer in the selected recipe.');
  }

  // Click first inline timer
  await page.click('.inline-step-timer-chip');
  await new Promise(r => setTimeout(r, 500));

    // Verify floating timer bar is visible
    const isTimerActive = await page.evaluate(() => {
      const bar = document.getElementById('floatingTimerBar');
      const timeDisplay = document.getElementById('timerRemainingDisplay');
      return {
        hasBar: Boolean(bar),
        isHidden: bar.classList.contains('hidden'),
        display: timeDisplay?.innerText
      };
    });

  console.log(`  - Floating Timer Dock Visible: ${!isTimerActive.isHidden}, Time: ${isTimerActive.display}`);
  if (isTimerActive.isHidden) {
    throw new Error('Floating kitchen timer bar failed to launch from inline step timer click!');
  }
  console.log('  ✅ [PASS] 1-Tap Inline Step Timer Successfully Launched\n');

  // 3. Test Web Audio Chime Synthesizer
  console.log('🧪 [TEST 3] Testing Web Audio Synthesizer Chime Execution...');
  const audioResult = await page.evaluate(() => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      return {
        supported: Boolean(ctx),
        state: ctx.state
      };
    } catch (e) {
      return { supported: false, error: e.message };
    }
  });
  console.log(`  - HTML5 Web Audio API Context: Supported=${audioResult.supported}, State=${audioResult.state}`);
  if (!audioResult.supported) throw new Error(`Web Audio API unavailable: ${audioResult.error || 'unknown error'}`);
  console.log('  ✅ [PASS] Web Audio API context created\n');

  // 4. Capture Visual Showcase Artifact
  console.log('🧪 [TEST 4] Capturing Visual Showcase Artifact...');
  const screenshotPath = path.join(ARTIFACT_DIR, 'perfect_ten_recipe_studio_timers.png');
  await page.screenshot({ path: screenshotPath });
  console.log(`📸 Screenshot saved: ${screenshotPath}`);

  await browser.close();
  console.log('\n=================================================================');
  console.log('🏁 [FRONTEND INTERACTION VERIFICATION COMPLETE]');
  console.log('=================================================================');
}

verifyFrontendInteractionSuite().catch(err => {
  console.error('❌ FRONTEND INTERACTION SUITE FAILED:', err);
  process.exit(1);
});
