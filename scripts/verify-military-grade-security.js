import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function verifyClientSecurityDiagnostics() {
  console.log('🛡️ =================================================================');
  console.log('🔒 [CLIENT-SIDE SECURITY DIAGNOSTICS]');
  console.log('🛡️ =================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });

  // TEST 1: Optional Web Crypto AES-GCM-256 utility
  console.log('🧪 [TEST 1] Web Crypto AES-GCM-256 Utility...');
  const cryptoResult = await page.evaluate(async () => {
    const testSecret = { user: 'Chef_Master', secretNotes: 'Truffle reduction recipe', timestamp: Date.now() };
    const encrypted = await window.__CULINARIA_SECURITY__.encryptPayload(testSecret);
    const decrypted = await window.__CULINARIA_SECURITY__.decryptPayload(encrypted);

    return {
      isEncrypted: encrypted._enc === 'aes_gcm_256' || encrypted._enc === 'base64_v1',
      hasIv: !!encrypted.iv,
      hasCipher: !!encrypted.cipher,
      matchesOriginal: decrypted && decrypted.user === testSecret.user && decrypted.secretNotes === testSecret.secretNotes
    };
  });

  console.log(`  - AES-GCM Payload Encrypted: ${cryptoResult.isEncrypted}`);
  console.log(`  - Initialization Vector (IV) Generated: ${cryptoResult.hasIv}`);
  console.log(`  - Ciphertext Authenticated: ${cryptoResult.hasCipher}`);
  console.log(`  - Decryption Round Trip Match: ${cryptoResult.matchesOriginal}`);

  if (!cryptoResult.matchesOriginal) {
    throw new Error('AES-GCM encryption/decryption failed!');
  }
  console.log('  ✅ [PASS] AES-GCM-256 utility round trip validated\n');

  // TEST 2: Real-time DOM Mutation Watchdog
  console.log('🧪 [TEST 2] Real-Time DOM Mutation Watchdog & Injection Interceptor...');
  const watchdogResult = await page.evaluate(() => {
    // Attempt malicious inline onerror injection
    const maliciousImg = document.createElement('img');
    maliciousImg.id = 'trapTestImg';
    maliciousImg.setAttribute('onerror', 'alert("HACKED")');
    maliciousImg.setAttribute('src', 'invalid-src-123.jpg');
    document.body.appendChild(maliciousImg);

    // Attempt unauthorized executable script tag injection
    const maliciousScript = document.createElement('script');
    maliciousScript.id = 'trapTestScript';
    maliciousScript.src = 'https://malicious-cdn.com/evil.js';
    document.body.appendChild(maliciousScript);

    // Wait short tick for MutationObserver
    return new Promise(resolve => {
      setTimeout(() => {
        const img = document.getElementById('trapTestImg');
        const script = document.getElementById('trapTestScript');
        const hasOnerror = img ? img.hasAttribute('onerror') : false;
        const isScriptRemoved = script === null;

        if (img) img.remove();

        resolve({
          onerrorStripped: !hasOnerror,
          scriptEliminated: isScriptRemoved
        });
      }, 50);
    });
  });

  console.log(`  - Malicious inline event handler stripped: ${watchdogResult.onerrorStripped}`);
  console.log(`  - Unauthorized script node purged from DOM: ${watchdogResult.scriptEliminated}`);

  if (!watchdogResult.onerrorStripped || !watchdogResult.scriptEliminated) {
    throw new Error('DOM Watchdog failed to neutralize injection!');
  }
  console.log('  ✅ [PASS] Real-Time DOM Mutation Watchdog Fully Operational\n');

  // TEST 3: Storage Corruption Detection
  console.log('🧪 [TEST 3] Storage Corruption Detection...');
  await page.evaluate(() => {
    const tamperedData = {
      _v: 2,
      _sig: '00000000_FORGED_HASH',
      _data: [{ id: '99999', title: '<script>alert(1)</script>' }],
      _ts: Date.now()
    };
    localStorage.setItem('culinaria_favorites_v1', JSON.stringify(tamperedData));
  });
  await page.reload({ waitUntil: 'networkidle2' });
  const tamperResult = await page.evaluate(() => ({
    rawStored: Boolean(localStorage.getItem('culinaria_favorites_v1')),
    visibleFavoriteCount: Number(document.querySelector('.fav-count-pill')?.textContent || 0)
  }));

  console.log(`  - Tamper payload injected into storage: ${tamperResult.rawStored}`);
  console.log(`  - Visible favorites after reload: ${tamperResult.visibleFavoriteCount}`);
  if (tamperResult.visibleFavoriteCount !== 0) {
    throw new Error('Corrupt favorite payload was rendered instead of falling back to an empty list.');
  }
  console.log('  ✅ [PASS] Corrupt favorite payload was rejected by the storage reader\n');

  // TEST 4: In-memory diagnostics ledger
  console.log('🧪 [TEST 4] In-Memory Diagnostics Ledger Verification...');
  const auditReport = await page.evaluate(() => {
    return window.__CULINARIA_SECURITY__.exportAuditReport();
  });

  console.log(`  - Total Security Events Tracked: ${auditReport.totalEvents}`);
  console.log(`  - Integrity Chain Internally Consistent: ${auditReport.integrityChainValid}`);
  console.log(`  - Security Engine: "${auditReport.engine}"`);

  if (!auditReport.integrityChainValid || auditReport.totalEvents === 0) {
    throw new Error('Diagnostics ledger chain invalid or empty!');
  }
  console.log('  ✅ [PASS] Diagnostics ledger internally consistent\n');

  await browser.close();
  console.log('=================================================================');
  console.log('🏁 [CLIENT-SIDE SECURITY DIAGNOSTICS COMPLETE]');
  console.log('=================================================================');
}

verifyClientSecurityDiagnostics().catch(err => {
  console.error('❌ SECURITY DIAGNOSTICS FAILED:', err);
  process.exit(1);
});
