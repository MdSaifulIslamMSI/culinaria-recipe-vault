import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\mdsai\\.gemini\\antigravity\\brain\\0a4a9d16-d2aa-4a8f-898f-c4748dc51157';

async function capturePreferencesDrawer() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });

  // Open preferences drawer
  await page.click('#btnChefPreferences');
  await new Promise(r => setTimeout(r, 600));

  const screenshotPath = path.join(ARTIFACT_DIR, 'chef_preferences_10_toggles_drawer.png');
  await page.screenshot({ path: screenshotPath });
  console.log(`📸 Screenshot saved: ${screenshotPath}`);

  await browser.close();
}

capturePreferencesDrawer().catch(err => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
