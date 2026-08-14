import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function testYouTubeEmbed() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err));

  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });

  // Open recipe 53376 (Sweet and Sour Chicken)
  console.log('Searching for Sweet and Sour Chicken...');
  await page.evaluate(() => {
    const input = document.getElementById('recipeSearchInput');
    input.value = 'Sweet and Sour Chicken';
    document.getElementById('searchSubmitBtn').click();
  });
  await new Promise(r => setTimeout(r, 1500));
  await page.waitForSelector('.recipe-card');
  await page.evaluate(() => document.querySelector('.recipe-card').click());
  await page.waitForSelector('.video-section-wrap', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 500));

  // Click play
  console.log('Clicking play on the video guide...');
  await page.evaluate(() => {
    const btn = document.querySelector('.btn-facade-play') || document.querySelector('.video-facade-card');
    btn.click();
  });
  await new Promise(r => setTimeout(r, 3000));

  const frameInfo = await page.evaluate(() => {
    const iframe = document.querySelector('.video-frame-container iframe');
    return {
      iframeExists: Boolean(iframe),
      src: iframe ? iframe.src : null,
      width: iframe ? iframe.offsetWidth : 0,
      height: iframe ? iframe.offsetHeight : 0
    };
  });

  console.log('Iframe Info:', frameInfo);
  await browser.close();
}

testYouTubeEmbed().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
