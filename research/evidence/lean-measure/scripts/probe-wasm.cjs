// Probe an in-browser (WASM) Lean playground: bytes downloaded, isolation, time to idle, UI text.
// usage: node probe-wasm.js <url> <outPrefix> [waitMs]
const path = require('path');
const { chromium } = require(path.join(process.env.PW_DIR, 'node_modules/playwright-core'));
const fs = require('fs');

(async () => {
  const url = process.argv[2];
  const out = process.argv[3];
  const waitMs = +(process.argv[4] || 90000);
  const exe = process.env.CHROME_EXE;
  const browser = await chromium.launch({ executablePath: exe, headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const client = await ctx.newCDPSession(page);
  await client.send('Network.enable');
  const reqs = new Map();
  let total = 0;
  const done = [];
  client.on('Network.requestWillBeSent', e => reqs.set(e.requestId, e.request.url));
  client.on('Network.loadingFinished', e => {
    total += e.encodedDataLength;
    done.push({ url: reqs.get(e.requestId), bytes: e.encodedDataLength, t: Date.now() });
  });
  const consoleLines = [];
  page.on('console', m => consoleLines.push(`[${m.type()}] ${m.text()}`.slice(0, 300)));
  page.on('pageerror', e => consoleLines.push(`[pageerror] ${String(e).slice(0, 300)}`));
  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  const tDom = Date.now() - t0;
  try { await page.waitForLoadState('networkidle', { timeout: waitMs }); } catch (e) { consoleLines.push('[probe] networkidle timeout'); }
  const tIdle = Date.now() - t0;
  const iso = await page.evaluate(() => self.crossOriginIsolated);
  const text = await page.evaluate(() => document.body.innerText.slice(0, 4000));
  const buttons = await page.evaluate(() => Array.from(document.querySelectorAll('button')).map(b => (b.innerText || b.getAttribute('aria-label') || '').trim()).filter(Boolean).slice(0, 40));
  await page.screenshot({ path: out + '.png' });
  done.sort((a, b) => b.bytes - a.bytes);
  const report = {
    url, tDomMs: tDom, tNetworkIdleMs: tIdle, crossOriginIsolated: iso,
    totalEncodedMB: +(total / 1e6).toFixed(1),
    top: done.slice(0, 12).map(d => ({ url: d.url, MB: +(d.bytes / 1e6).toFixed(2), atMs: d.t - t0 })),
    buttons, textHead: text, console: consoleLines.slice(-40)
  };
  fs.writeFileSync(out + '.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ url, tDom, tIdle, iso, totalMB: report.totalEncodedMB, buttons }, null, 1));
  await browser.close();
})().catch(e => { console.error('PROBE FAILED', e); process.exit(1); });
