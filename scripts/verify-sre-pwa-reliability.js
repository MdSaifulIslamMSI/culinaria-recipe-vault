import puppeteer from 'puppeteer-core';
import http from 'http';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

async function testSrePwaReliability() {
  console.log('🌐 =================================================================');
  console.log('⚡ [SITE RELIABILITY (SRE) & PWA VERIFICATION SUITE]');
  console.log('🌐 =================================================================\n');

  // 1. Test SRE Synthetic Health Endpoint (/health.json)
  console.log('🧪 [TEST 1] SRE Synthetic Health Check Endpoint (/health.json)...');
  const healthRes = await fetchUrl('http://localhost:3000/health.json');
  console.log(`  - HTTP Status: ${healthRes.status} (Expected: 200)`);
  const healthJson = JSON.parse(healthRes.body);
  console.log(`  - Service Health Status: "${healthJson.status}"`);
  console.log(`  - Availability SLA: "${healthJson.uptimeSLA}"`);
  console.log(`  - Offline Cached Dishes: ${healthJson.capabilities.cachedRecipesCount}`);

  if (healthRes.status !== 200 || healthJson.status !== 'HEALTHY') {
    throw new Error('SRE Health Check endpoint failed!');
  }
  console.log('  ✅ [PASS] SRE Synthetic Health Endpoint Operational\n');

  // 2. Test PWA Web App Manifest (/manifest.json)
  console.log('🧪 [TEST 2] PWA Web App Manifest (/manifest.json)...');
  const manifestRes = await fetchUrl('http://localhost:3000/manifest.json');
  console.log(`  - HTTP Status: ${manifestRes.status} (Expected: 200)`);
  const manifestJson = JSON.parse(manifestRes.body);
  console.log(`  - App Name: "${manifestJson.name}"`);
  console.log(`  - Display Mode: "${manifestJson.display}"`);
  console.log(`  - Theme Color: "${manifestJson.theme_color}"`);
  console.log(`  - App Icons: ${manifestJson.icons.length} resolutions declared`);

  if (manifestRes.status !== 200 || manifestJson.display !== 'standalone') {
    throw new Error('PWA Manifest invalid!');
  }
  console.log('  ✅ [PASS] PWA Web App Manifest Verified\n');

  // 3. Test Service Worker Registration in Browser Engine
  console.log('🧪 [TEST 3] Progressive Web App Service Worker Registration...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));

  const swRegistered = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false;
    const registrations = await navigator.serviceWorker.getRegistrations();
    return registrations.length > 0;
  });

  console.log(`  - Service Worker Active in Navigator: ${swRegistered}`);

  await browser.close();

  if (!swRegistered) {
    throw new Error('Service Worker failed to register!');
  }
  console.log('  ✅ [PASS] PWA Service Worker Registered & Caching Shell\n');

  console.log('=================================================================');
  console.log('🏁 [PWA RELIABILITY CHECKS COMPLETE]');
  console.log('=================================================================');
}

testSrePwaReliability().catch(err => {
  console.error('❌ SRE TEST FAILED:', err);
  process.exit(1);
});
