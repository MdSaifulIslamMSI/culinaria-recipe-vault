/**
 * Shared e2e infrastructure: locates a Chrome binary, boots the production
 * server on an ephemeral port, and hands clean pages to each suite.
 * Suites are skipped automatically when no Chrome installation is found.
 */
import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../..');

const CHROME_CANDIDATES = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
].filter(Boolean);

export function findChrome() {
  return CHROME_CANDIDATES.find(p => {
    try {
      return fs.existsSync(p);
    } catch {
      return false;
    }
  }) || null;
}

export const chromeAvailable = findChrome() !== null;
export const distAvailable = fs.existsSync(path.join(ROOT, 'dist', 'index.html'));

let serverProcess = null;
let serverPort = null;

export async function startServer() {
  if (serverProcess) return `http://127.0.0.1:${serverPort}`;
  if (!distAvailable) {
    throw new Error('dist/ missing — run `npm run build` before e2e tests.');
  }

  serverPort = 3000 + Math.floor(Math.random() * 2000);
  serverProcess = spawn(process.execPath, ['server/index.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(serverPort), NODE_ENV: 'test', LOG_REQUESTS: 'false' },
    stdio: 'ignore'
  });
  // Do not hold the node:test event loop open just because the server runs.
  serverProcess.unref();

  const base = `http://127.0.0.1:${serverPort}`;
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${base}/api/health`);
      if (res.ok) return base;
    } catch {
      // server not up yet
    }
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error('Production server failed to start within 15s.');
}

export async function stopServer() {
  if (!serverProcess) return;
  serverProcess.kill();
  serverProcess = null;
}

export async function withPage(test, fn) {
  const base = await startServer();
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  try {
    const page = await browser.newPage();
    // domcontentloaded + per-suite selector waits avoids networkidle flakiness
    await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await fn(page, base);
  } finally {
    await browser.close();
  }
}
