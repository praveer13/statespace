import { chromium } from 'playwright-core';
const b = await chromium.launch(); const p = await b.newPage();
p.on('console', (m) => { if (m.type() === 'error') console.log('console.error', m.text().slice(0, 200)); });
await p.goto('http://localhost:8080/index.html');
await p.waitForFunction(() => window.__result, null, { timeout: 120000 });
console.log(JSON.stringify(await p.evaluate(() => window.__result)));
await b.close();
