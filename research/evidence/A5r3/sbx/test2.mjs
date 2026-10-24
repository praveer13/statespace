import { chromium, firefox, webkit } from 'playwright-core';
const engines = { chromium, firefox, webkit };
for (const kind of ['umd']) for (const name of ['chromium', 'firefox', 'webkit']) {
  const b = await engines[name].launch(); const p = await b.newPage();
  const logs = []; p.on('console', (m) => logs.push(m.text().slice(0, 200)));
  await p.goto('http://localhost:8080/app/index.html#' + kind);
  try { await p.waitForFunction(() => window.__result, null, { timeout: 60000 }); console.log(kind, name, JSON.stringify(await p.evaluate(() => window.__result)), logs.length ? 'console:' + logs.join(' | ') : ''); }
  catch (e) { console.log(kind, name, 'TIMEOUT', logs.join(' | ')); }
  await b.close();
}
