import puppeteer from 'puppeteer-core';

async function testPantry() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });

  // 1. Switch to Pantry tab
  await page.click('#tabPantry');
  await new Promise(r => setTimeout(r, 200));

  // 2. Click "Clear All"
  await page.click('#btnClearPantry');
  await new Promise(r => setTimeout(r, 200));

  // 3. Verify results header is hidden and cards grid is empty
  const headerVisible = await page.$eval('#pantryResultsHeader', el => !el.classList.contains('hidden'));
  const cardsCount = await page.$$eval('#pantryCardsGrid .recipe-card', el => el.length);
  const basketCount = await page.$eval('#pantryBasketCount', el => el.innerText);

  console.log('✅ Basket Count:', basketCount);
  console.log('✅ Results Header Visible:', headerVisible);
  console.log('✅ Matched Cards Rendered:', cardsCount);

  if (headerVisible || cardsCount > 0) {
    console.error('❌ FAILED: Pantry still shows results on 0 ingredients!');
    process.exit(1);
  } else {
    console.log('🎉 SUCCESS: Pantry results cleanly reset when basket is 0!');
  }

  await browser.close();
}

testPantry().catch(console.error);
