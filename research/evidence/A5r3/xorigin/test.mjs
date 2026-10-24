import { chromium, firefox, webkit } from 'playwright-core';
const engines = { chromium, firefox, webkit };
for (const name of ['chromium', 'firefox', 'webkit']) {
  const b = await engines[name].launch(); const p = await b.newPage();
  await p.goto('http://localhost:8080/index.html');
  try { await p.waitForFunction(() => window.__result, null, { timeout: 90000 }); console.log(name, JSON.stringify(await p.evaluate(() => window.__result))); }
  catch (e) { console.log(name, 'TIMEOUT'); }
  await b.close();
}
