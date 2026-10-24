// Cold-load an in-browser Lean playground with a net-log, wait for readiness, then type a proof and read output.
// usage: node probe-wasm2.cjs <url> <outPrefix>
const path = require('path');
const fs = require('fs');
const { chromium } = require(path.join(process.env.PW_DIR, 'node_modules/playwright-core'));

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const url = process.argv[2];
  const out = process.argv[3];
  const netlog = out + '.netlog.json';
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_EXE, headless: true,
    args: [`--log-net-log=${netlog}`, '--net-log-capture-mode=Default'],
  });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const cons = [];
  page.on('console', m => cons.push({ t: Date.now(), s: `[${m.type()}] ${m.text()}`.slice(0, 300) }));
  page.on('worker', w => cons.push({ t: Date.now(), s: `[worker] ${w.url()}` }));
  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  let tReady = null, last = '';
  for (let i = 0; i < 480; i++) { // up to 240 s
    const txt = await page.evaluate(() => document.body.innerText);
    last = txt;
    if (!/LOADING|Starting persistent Lean instance/i.test(txt)) { tReady = Date.now() - t0; break; }
    await sleep(500);
  }
  await page.screenshot({ path: out + '-ready.png' });
  const textReady = last.slice(0, 3000);
  // Try to run a proof: replace editor content and press Ctrl+Enter / click a Run-like button.
  const proof = 'theorem add_comm\' (a b : Nat) : a + b = b + a := by\n  omega\n#print axioms add_comm\'\nexample (x : Int) (h : 0 ≤ x) : 0 ≤ x + 1 := by grind\n';
  let tRun0 = Date.now(), tOut = null, outText = '';
  try {
    const ed = page.locator('.cm-content, .monaco-editor textarea, textarea').first();
    await ed.click({ timeout: 5000 });
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Delete');
    await page.keyboard.insertText(proof);
    tRun0 = Date.now();
    const runBtn = page.locator('button', { hasText: /run/i }).first();
    if (await runBtn.count()) await runBtn.click({ timeout: 3000 }); else await page.keyboard.press('Control+Enter');
    for (let i = 0; i < 240; i++) {
      const txt = await page.evaluate(() => document.body.innerText);
      if (/depends on axioms|does not depend|error/i.test(txt)) { tOut = Date.now() - tRun0; outText = txt; break; }
      await sleep(250);
    }
  } catch (e) { cons.push({ t: Date.now(), s: '[probe] run failed: ' + String(e).slice(0, 200) }); }
  await page.screenshot({ path: out + '-run.png' });
  const finalText = (await page.evaluate(() => document.body.innerText)).slice(0, 4000);
  const iso = await page.evaluate(() => self.crossOriginIsolated);
  await browser.close();
  // Parse the net-log: sum socket bytes received; list biggest URL jobs.
  let total = 0; const urls = new Map();
  try {
    const nl = JSON.parse(fs.readFileSync(netlog, 'utf8').replace(/,\s*$/, '') + (fs.readFileSync(netlog, 'utf8').trim().endsWith(']}') ? '' : ']}'));
    const types = Object.fromEntries(Object.entries(nl.constants.logEventTypes).map(([k, v]) => [v, k]));
    const srcUrl = new Map();
    for (const ev of nl.events) {
      const ty = types[ev.type];
      if (ty === 'URL_REQUEST_START_JOB' && ev.params && ev.params.url) srcUrl.set(ev.source.id, ev.params.url);
      if (ty === 'SOCKET_BYTES_RECEIVED' && ev.params && ev.params.byte_count) total += ev.params.byte_count;
      if (ty === 'URL_REQUEST_JOB_BYTES_READ' && ev.params && ev.params.byte_count) {
        const u = srcUrl.get(ev.source.id) || '?';
        urls.set(u, (urls.get(u) || 0) + ev.params.byte_count);
      }
    }
  } catch (e) { cons.push({ t: Date.now(), s: '[probe] netlog parse failed: ' + String(e).slice(0, 200) }); }
  const top = [...urls.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([u, b]) => ({ u, MB: +(b / 1e6).toFixed(2) }));
  const report = { url, crossOriginIsolated: iso, tReadyMs: tReady, tRunToOutputMs: tOut,
    socketMBReceived: +(total / 1e6).toFixed(1), topBodyMB: top, textReady, finalText,
    console: cons.map(c => `${c.t - t0}ms ${c.s}`).slice(-60) };
  fs.writeFileSync(out + '.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ tReady, tOut, socketMB: report.socketMBReceived, iso, top: top.slice(0, 8) }, null, 1));
})().catch(e => { console.error('PROBE FAILED', e); process.exit(1); });
