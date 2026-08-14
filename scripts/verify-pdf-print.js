import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACTS_DIR = 'C:\\Users\\mdsai\\.gemini\\antigravity\\brain\\0a4a9d16-d2aa-4a8f-898f-c4748dc51157';

async function testPdfPrint() {
  console.log('🖨️ =================================================================');
  console.log('🔍 [PRINTABLE RECIPE & PDF INTEGRITY VERIFICATION]');
  console.log('🖨️ =================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });

  // Open first recipe modal
  await page.waitForSelector('.recipe-card');
  await page.click('.recipe-card');
  await new Promise(r => setTimeout(r, 600));

  // Emulate print media
  await page.emulateMediaType('print');

  // Verify background is hidden and recipe modal content is visible
  const isMainContentHidden = await page.$eval('.main-content', el => {
    return window.getComputedStyle(el).display === 'none';
  });

  const isModalVisible = await page.$eval('#modalRecipeContent', el => {
    return window.getComputedStyle(el).display !== 'none';
  });

  const modalTitle = await page.$eval('.modal-dish-title', el => el.innerText);

  console.log(`  - Main background content hidden in print: ${isMainContentHidden}`);
  console.log(`  - Recipe studio modal visible in print: ${isModalVisible}`);
  console.log(`  - Active dish being printed: "${modalTitle}"`);

  // Generate actual PDF
  const pdfPath = path.join(ARTIFACTS_DIR, 'culinaria_recipe_print_preview.pdf');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '1.2cm', right: '1cm', bottom: '1.2cm', left: '1cm' }
  });

  console.log(`  - Generated PDF saved to: ${pdfPath}`);

  // Capture screenshot of print-rendered modal
  const screenshotPath = path.join(ARTIFACTS_DIR, 'culinaria_recipe_print_emulated.png');
  await page.screenshot({ path: screenshotPath });
  console.log(`  - Saved print-emulated screenshot to: ${screenshotPath}`);

  await browser.close();

  if (!isMainContentHidden || !isModalVisible) {
    console.error('❌ FAILED: Print stylesheet is not cleanly isolating the recipe modal!');
    process.exit(1);
  }

  console.log('\n🎉 SUCCESS: Print stylesheet generates a pristine recipe card without background artifacts!');
}

testPdfPrint().catch(err => {
  console.error(err);
  process.exit(1);
});
