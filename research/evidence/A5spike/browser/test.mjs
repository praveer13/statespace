import { chromium, firefox, webkit } from 'playwright-core';
for (const [name, bt] of [['chromium', chromium], ['firefox', firefox], ['webkit', webkit]]) {
  const browser = await bt.launch(); const page = await browser.newPage();
  const t0 = Date.now();
  try {
    await page.goto('http://localhost:8080/index.html');
    await page.waitForFunction(() => window.__result, null, { timeout: 120000 });
    const r = await page.evaluate(() => window.__result);
    console.log(name, JSON.stringify({ ...r, ua: undefined, wallMs: Date.now() - t0 }));
  } catch (e) { console.log(name, 'ERROR', String(e).slice(0, 300)); }
  await browser.close();
}
