// Warm-cache run timing on an in-browser Lean playground: load, pick an example, run, time to output.
const path = require('path');
const fs = require('fs');
const { chromium } = require(path.join(process.env.PW_DIR, 'node_modules/playwright-core'));
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const url = process.argv[2], out = process.argv[3];
  const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const cons = [];
  const t0 = Date.now();
  page.on('console', m => { const s = m.text(); if (/COMPILE|done in|error/i.test(s)) cons.push(`${Date.now() - t0}ms ${s.slice(0, 200)}`); });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  for (let i = 0; i < 480; i++) {
    const txt = await page.evaluate(() => document.body.innerText);
    if (!/LOADING|Starting persistent Lean instance/i.test(txt)) break;
    await sleep(500);
  }
  const tReady = Date.now() - t0;
  const dom = await page.evaluate(() => {
    const run = Array.from(document.querySelectorAll('*')).filter(e => e.children.length === 0 && /RUN CODE/i.test(e.textContent || '')).map(e => `${e.tagName}.${e.className}`);
    const sel = Array.from(document.querySelectorAll('select')).map(s => Array.from(s.options).map(o => o.textContent).slice(0, 40));
    const cm = !!document.querySelector('.cm-content'); const monaco = !!document.querySelector('.monaco-editor');
    const tas = Array.from(document.querySelectorAll('textarea')).map(t => ({ cls: t.className, vis: t.offsetParent !== null }));
    return { run, sel, cm, monaco, tas };
  });
  const results = [];
  async function runExample(label, waitRe) {
    const s = page.locator('select').first();
    await s.selectOption({ label });
    await sleep(300);
    const runEl = page.getByText(/RUN CODE/i).first();
    const before = await page.evaluate(() => document.body.innerText);
    const t1 = Date.now();
    await runEl.click({ timeout: 5000 });
    let tOut = null, txt = '';
    for (let i = 0; i < 600; i++) {
      txt = await page.evaluate(() => document.body.innerText);
      if (txt !== before && waitRe.test(txt)) { tOut = Date.now() - t1; break; }
      await sleep(100);
    }
    const outIdx = txt.indexOf('OUTPUT');
    results.push({ label, tOutMs: tOut, output: txt.slice(outIdx, outIdx + 700) });
  }
  try {
    await runExample('omega — linear arithmetic', /omega|theorem|✓|No errors|success|declared|axioms|error/i);
    await runExample('error: omega on a false goal', /error/i);
    await runExample('Std.HashMap — build a map', /HashMap|\[|\{|error/i);
  } catch (e) { results.push({ err: String(e).slice(0, 300) }); }
  await page.screenshot({ path: out + '-run.png' });
  fs.writeFileSync(out + '.json', JSON.stringify({ tReadyMs: tReady, dom, results, cons }, null, 2));
  console.log(JSON.stringify({ tReady, dom: { run: dom.run, cm: dom.cm, monaco: dom.monaco, tas: dom.tas, selCount: dom.sel.length }, results, cons: cons.slice(-12) }, null, 1));
  await browser.close();
})().catch(e => { console.error('PROBE FAILED', e); process.exit(1); });
