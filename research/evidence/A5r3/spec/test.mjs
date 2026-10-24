import { chromium, firefox, webkit } from 'playwright-core';
const engines = { chromium, firefox, webkit };
for (const name of ['chromium', 'firefox', 'webkit']) {
  const b = await engines[name].launch(); const p = await b.newPage();
  await p.goto('http://localhost:8080/index.html');
  await p.waitForFunction(() => window.__result, null, { timeout: 300000 });
  console.log(name, JSON.stringify(await p.evaluate(() => window.__result)));
  await b.close();
}
