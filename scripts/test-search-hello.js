import puppeteer from 'puppeteer-core';

async function testSearch() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
  await page.type('#recipeSearchInput', 'hello');
  await new Promise(r => setTimeout(r, 600));
  const suggestionHTML = await page.$eval('.search-suggestions-dropdown', el => el.innerHTML);
  console.log('✅ Suggestions Output for "hello":\n', suggestionHTML);
  await browser.close();
}

testSearch().catch(console.error);
