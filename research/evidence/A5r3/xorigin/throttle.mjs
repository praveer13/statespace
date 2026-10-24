import { chromium } from 'playwright-core';
for (const [cpu, mbps] of [[1, 0], [4, 0], [6, 0], [4, 10]]) {
  const b = await chromium.launch(); const ctx = await b.newContext(); const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  if (mbps) { await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 40, downloadThroughput: mbps * 1e6 / 8, uploadThroughput: 5e6 / 8 }); }
  const t0 = Date.now();
  await p.goto('http://localhost:8080/index.html');
  try { await p.waitForFunction(() => window.__result, null, { timeout: 180000 }); const r = await p.evaluate(() => window.__result); console.log(`cpu=${cpu}x net=${mbps || 'unthrottled'}Mbps wall=${Date.now() - t0}ms workerReady=${r.worker && r.worker.readyMs}ms ${r.worker && r.worker.z3}`); }
  catch (e) { console.log(`cpu=${cpu}x TIMEOUT`); }
  await b.close();
}
