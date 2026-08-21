/**
 * E2E Suite 2 — Responsive Layout
 * Verifies mobile (390x844), tablet (768x1024) and desktop (1920x1080)
 * render the primary grid without horizontal overflow.
 */
import test from 'node:test';
import assert from 'node:assert';
import { chromeAvailable, distAvailable, withPage } from './helpers/browser.js';

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1920, height: 1080 }
];

for (const vp of VIEWPORTS) {
  test(`responsive: ${vp.name} (${vp.width}x${vp.height}) renders grid without overflow`, { skip: !chromeAvailable || !distAvailable }, async () => {
    await withPage(test, async (page) => {
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.reload({ waitUntil: 'networkidle2' });
      await page.waitForSelector('.recipe-card', { timeout: 20000 });

      const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      assert(overflow <= 1, `Horizontal overflow of ${overflow}px detected at ${vp.name}`);

      const cards = await page.$$eval('.recipe-card', els => els.length);
      assert(cards > 0, `Grid should render cards at ${vp.name}`);
    });
  });
}
