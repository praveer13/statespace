#!/usr/bin/env node
// W0-S04: run the harness in Chromium, Firefox and WebKit. Runs inside the
// container mcr.microsoft.com/playwright:v1.63.0-noble (see run-all.sh), with
// the repository at /repo, the cache at /cache and playwright-core 1.63.0
// installed under /cache/pw. Writes runs/RUN-spectacle-s5s8/spectacle/<engine>.json.
//
// Plan per engine: (1) every job on the main thread, module mode "fetch",
// graph check skipped (speed and blocking); (2) every job in a classic worker,
// mode "fetch", with the TLC graph check and trace replay; (3) the jobs with a
// local EXTENDS in a worker under modes "shim" and "overrides"; (4) the
// watchdog: terminate() during a long job, then a fresh worker.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { startServer, CSP } from './harness/serve.mjs';

const require = createRequire('/cache/pw/package.json');
const pw = require('playwright-core');

const REPO = '/repo';
const HERE = path.join(REPO, 'scripts/spikes/W0-S04');
const CACHE = '/cache';
const PORT = 8090;
const OUT = path.join(REPO, 'runs/RUN-spectacle-s5s8/spectacle');
const engines = (process.env.W0S04_ENGINES || 'chromium,firefox,webkit').split(',');
const uid = +(process.env.HOST_UID || 0), gid = +(process.env.HOST_GID || 0);

async function main() {
  const { server, log } = await startServer({
    port: PORT,
    roots: {
      spectacle: path.join(CACHE, 'spectacle'),
      harness: path.join(HERE, 'harness'),
      specs: path.join(CACHE, 'work'),
      jobs: path.join(CACHE, 'jobs')
    }
  });
  const index = JSON.parse(fs.readFileSync(path.join(CACHE, 'jobs/index.json'), 'utf8'));
  const only = process.env.W0S04_ONLY ? process.env.W0S04_ONLY.split(',') : null;
  const jobs = index.filter((e) => !only || only.includes(e.id)).map((e) => Object.assign(e, JSON.parse(fs.readFileSync(path.join(CACHE, 'jobs', e.id + '.json'), 'utf8'))));
  // Module-loading comparison on a representative subset: one- and two-level
  // local EXTENDS, an unresolvable bundled module, a community module, a missing one.
  const MODE_SUBSET = ['s5-holds-crashon', 's5-holds-unsafe', 's5-ind-strong', 's8-outbox-cw2-nodedup', 's8-outbox-full', 's8-outbox-live-crash', 's8-trace', 'probe-community', 'probe-missing'];
  const extendsIds = jobs.filter((j) => MODE_SUBSET.includes(j.id)).map((j) => j.id);
  fs.mkdirSync(OUT, { recursive: true });

  for (const name of engines) {
    const ids = jobs.filter((j) => !j.engines || j.engines.includes(name)).map((j) => j.id);
    const browser = await pw[name].launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    const consoleErrors = [];
    page.on('console', (m) => { if (m.type() === 'error' && consoleErrors.length < 50) consoleErrors.push(m.text().slice(0, 300)); });
    page.on('pageerror', (e) => { if (consoleErrors.length < 50) consoleErrors.push('pageerror: ' + String(e).slice(0, 300)); });
    const result = { engine: name, browserVersion: browser.version(), csp: CSP, steps: {} };
    log.splice(0, log.length);
    await page.goto(`http://127.0.0.1:${PORT}/harness/page.html`);
    await page.waitForFunction(() => window.w0s04Ready === true, null, { timeout: 60000 });
    result.userAgent = await page.evaluate(() => navigator.userAgent);
    result.crossOriginIsolated = await page.evaluate(() => self.crossOriginIsolated);
    result.pageLoadRequests = log.splice(0, log.length);

    const run = async (key, step) => {
      const t0 = Date.now();
      const r = await page.evaluate((s) => window.w0s04(s), step);
      r.stepWallS = (Date.now() - t0) / 1000;
      r.requests = log.splice(0, log.length);
      result.steps[key] = r;
      process.stderr.write(`${name} ${key}: ${r.error ? 'ERROR ' + r.error.slice(0, 200) : (r.results ? r.results.filter((x) => x.ok).length + '/' + r.results.length + ' ok' : 'done')} in ${r.stepWallS.toFixed(1)} s\n`);
    };
    // The main-thread pass measures blocking; scale configurations run in the worker only.
    const mainIds = jobs.filter((j) => ids.includes(j.id) && j.kind !== 'scale').map((j) => j.id);
    await run('main-fetch', { kind: 'main', ids: mainIds, opts: { mode: 'fetch', skipGraph: true, wallMs: 300000 } });
    await run('worker-fetch', { kind: 'worker', ids, opts: { mode: 'fetch', wallMs: 300000 } });
    await run('worker-shim', { kind: 'worker', ids: extendsIds, opts: { mode: 'shim', skipGraph: true, wallMs: 300000 } });
    await run('worker-overrides', { kind: 'worker', ids: extendsIds, opts: { mode: 'overrides', skipGraph: true, wallMs: 300000 } });
    await run('watchdog', { kind: 'watchdog', longId: 's8-outbox-full2', shortId: 's5-m1-w2', afterMs: 500 });
    result.consoleErrors = consoleErrors;
    await browser.close();
    const file = path.join(OUT, only ? `smoke-${name}.json` : `${name}.json`);
    fs.writeFileSync(file, JSON.stringify(result, null, 1) + '\n');
    if (uid) fs.chownSync(file, uid, gid);
  }
  server.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
