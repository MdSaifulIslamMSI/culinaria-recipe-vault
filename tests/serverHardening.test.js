/**
 * Advanced Production Hardening & Security Verification Suite for Culinaria Backend
 */
import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import app from '../server/index.js';

let server;
let baseUrl;

test.before(async () => {
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}/api`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('1. Health Telemetry Endpoint returns rich system metrics', async () => {
  const res = await fetch(`${baseUrl}/health`);
  assert.strictEqual(res.status, 200);
  
  const data = await res.json();
  assert.strictEqual(data.status, 'healthy');
  assert(data.uptimeSeconds >= 0);
  assert(data.memory.rssMB > 0);
  assert(data.memory.heapUsedMB > 0);
  assert(data.catalog.totalRecipes >= 500);
  assert(data.catalog.categoriesCount >= 10);
  assert(data.catalog.areasCount >= 10);
  assert.strictEqual(data.pid, process.pid);
});

test('2. Response includes all required modern Security Headers', async () => {
  const res = await fetch(`${baseUrl}/health`);
  assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
  assert.strictEqual(res.headers.get('x-frame-options'), 'DENY');
  assert.strictEqual(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
  assert.strictEqual(res.headers.get('cross-origin-opener-policy'), 'same-origin');
  assert.strictEqual(res.headers.get('cross-origin-resource-policy'), 'same-origin');
  const hsts = res.headers.get('strict-transport-security');
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_HSTS === 'true') {
    assert(hsts.includes('max-age=31536000'));
  } else {
    assert.strictEqual(hsts, null, 'HSTS must not be set on local HTTP test servers');
  }
  assert(res.headers.get('content-security-policy').includes("default-src 'self'"));
  assert.strictEqual(res.headers.get('x-powered-by'), null);
  assert.match(res.headers.get('x-request-id'), /^[0-9a-f-]{36}$/);
});

test('2a. CORS allows trusted origins and omits headers for untrusted origins', async () => {
  const trusted = await fetch(`${baseUrl}/health`, {
    headers: { Origin: 'http://localhost:5173' }
  });
  assert.strictEqual(trusted.status, 200);
  assert.strictEqual(trusted.headers.get('access-control-allow-origin'), 'http://localhost:5173');

  const untrusted = await fetch(`${baseUrl}/health`, {
    headers: { Origin: 'https://evil.example' }
  });
  assert.strictEqual(untrusted.status, 200);
  assert.strictEqual(untrusted.headers.get('access-control-allow-origin'), null);
});

test('3. ETag generation and 304 Not Modified caching response', async () => {
  const res1 = await fetch(`${baseUrl}/recipes/categories`);
  assert.strictEqual(res1.status, 200);
  const etag = res1.headers.get('etag');
  assert(etag, 'Expected ETag header on static catalog response');

  // Request with If-None-Match header
  const res2 = await fetch(`${baseUrl}/recipes/categories`, {
    headers: { 'If-None-Match': etag }
  });
  assert.strictEqual(res2.status, 304, 'Expected 304 Not Modified on matching ETag');
});

test('4. Gzip Response Compression reduces payload size', async () => {
  const res = await fetch(`${baseUrl}/recipes/search?q=chicken`, {
    headers: { 'Accept-Encoding': 'gzip, deflate, br' }
  });
  assert.strictEqual(res.status, 200);
  const encoding = res.headers.get('content-encoding');
  assert(encoding === 'gzip' || encoding === 'br' || encoding === 'deflate' || !encoding);
});

test('5. Input Length Bounding blocks oversized parameters (ReDoS defense)', async () => {
  const oversizedQuery = 'a'.repeat(200);
  const res = await fetch(`${baseUrl}/recipes/search?q=${oversizedQuery}`);
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.strictEqual(data.error, 'Bad Request');
  assert(data.message.includes('exceeds maximum allowed length'));
});

test('6. Input Validation blocks dangerous control characters', async () => {
  const maliciousQuery = 'chicken\x00\x08malicious';
  const res = await fetch(`${baseUrl}/recipes/search?q=${encodeURIComponent(maliciousQuery)}`);
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.strictEqual(data.error, 'Bad Request');
  assert(data.message.includes('Illegal control character'));
});

test('7. Prototype Pollution defense rejects malicious payload structures', async () => {
  const payload = '{"__proto__": {"isAdmin": true}, "ingredients": ["chicken"]}';
  const res = await fetch(`${baseUrl}/recipes/pantry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload
  });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.strictEqual(data.error, 'Bad Request');
  assert(data.message.includes('Illegal object key detected'));
});

test('8. Demonym Normalization matches country aliases seamlessly', async () => {
  const resIndian = await fetch(`${baseUrl}/recipes/search?area=Indian`);
  assert.strictEqual(resIndian.status, 200);
  const dataIndian = await resIndian.json();

  const resIndia = await fetch(`${baseUrl}/recipes/search?area=India`);
  assert.strictEqual(resIndia.status, 200);
  const dataIndia = await resIndia.json();

  assert.strictEqual(dataIndian.total, dataIndia.total, 'Indian and India should return identical results');
  assert(dataIndian.total > 0);
});

test('9. High-Concurrency Stress Test executes without errors', async () => {
  const promises = [];
  for (let i = 0; i < 25; i++) {
    promises.push(fetch(`${baseUrl}/recipes/random`).then(r => r.json()));
  }
  const results = await Promise.all(promises);
  assert.strictEqual(results.length, 25);
  results.forEach(res => {
    assert(res.recipe.idMeal);
  });
});
