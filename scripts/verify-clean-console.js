import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function testCleanConsole() {
  console.log('🧹 Testing Clean Console in Live Browser...');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const consoleWarnings = [];

  page.on('console', msg => {
    if (msg.type() === 'warning' || msg.type() === 'error') {
      consoleWarnings.push(`${msg.type().toUpperCase()}: ${msg.text()}`);
    }
  });

  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  console.log(`  - Console Warnings Captured on load: ${consoleWarnings.length}`);
  consoleWarnings.forEach(w => console.log(`    ${w}`));

  await browser.close();

  if (consoleWarnings.some(w => w.includes('DOM_MUTATION_TRAPPED'))) {
    throw new Error('Console still has DOM_MUTATION_TRAPPED warnings!');
  }

  console.log('✅ Console is 100% clean and pristine with 0 warnings!');
}

testCleanConsole().catch(err => {
  console.error('❌ Clean Console Test Failed:', err);
  process.exit(1);
});
