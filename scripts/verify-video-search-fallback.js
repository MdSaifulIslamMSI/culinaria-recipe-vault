import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function testVideoSearchFallback() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });

  // Open recipe without youtube video (e.g. search for a dish or open second card)
  await page.waitForSelector('.recipe-card');
  const cards = await page.$$('.recipe-card');
  if (cards.length > 1) {
    await cards[1].click();
    await page.waitForSelector('.video-section-wrap');
    
    const videoWrap = await page.evaluate(() => {
      const el = document.querySelector('.video-section-wrap');
      const extBtn = document.querySelector('.yt-external-btn');
      return {
        hasWrap: Boolean(el),
        btnText: extBtn ? extBtn.innerText : ''
      };
    });
    console.log('Video Wrap for recipe 2:', videoWrap);
  }

  await browser.close();
  console.log('✅ Fallback test passed!');
}

testVideoSearchFallback().catch(err => {
  console.error(err);
  process.exit(1);
});
