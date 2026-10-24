// W0-S01 harness: drives Chromium, Firefox and WebKit through the instrument-origin scenarios.
//
// Runs inside mcr.microsoft.com/playwright:v1.63.0-noble (see run.sh). Environment:
//   PW_MODULE      path to playwright-core's entry (default: 'playwright-core')
//   BUILD_JSON     build.json written by build.mjs
//   OUT_DIR        where results.json goes
//   PROFILE_DIR    where persistent browser profiles live (default /tmp/w0s01-profiles)
//   FF_TEMPLATE    a directory holding cert9.db, key4.db and pkcs11.txt that trust the test CA
//   CONTROL_URL    the server's control endpoint (default http://127.0.0.1:9000)
//   ENGINES        comma list (default chromium,firefox,webkit); CONFIGS comma list (default A,B,C)
//   REMOTE=1       run against deployed origins (no local server): sessions s1 and s2 only, no
//                  request log, and the hostile-embedder test only when an attacker origin exists
//
// Configurations (one persistent profile each, three browser sessions each):
//   A  same-site, plain iframe: the hosting plan (ARCHITECTURE.md section 5.2)
//   B  same-site, iframe sandbox="allow-scripts allow-same-origin" (section 5.3 asks W0-S01)
//   C  cross-site, plain iframe: another static host on its own domain (the fallback's worst case)
// Sessions: s1 online and cold; s2 online after a browser restart; s3 after a restart with the
// instrument hostname answering 503 to everything, so only the persisted service worker and its
// caches can serve it. A "session" is a browser process: launchPersistentContext, then close.
import fs from 'node:fs';
import path from 'node:path';

const PW = await import(process.env.PW_MODULE || 'playwright-core');
const OUT = process.env.OUT_DIR || '/tmp/w0s01-out';
const PROFILES = process.env.PROFILE_DIR || '/tmp/w0s01-profiles';
const FF_TEMPLATE = process.env.FF_TEMPLATE || null;
const CONTROL = process.env.CONTROL_URL || 'http://127.0.0.1:9000';
const BUILD = JSON.parse(fs.readFileSync(process.env.BUILD_JSON, 'utf8'));
const O = BUILD.origins;
const ENGINES = (process.env.ENGINES || 'chromium,firefox,webkit').split(',');
const CONFIG_IDS = (process.env.CONFIGS || 'A,B,C').split(',');
const REMOTE = process.env.REMOTE === '1';

const CONFIGS = {
  A: { id: 'A', label: 'same-site, plain iframe (the hosting plan)', page: `${O.main}/index.html`, inst: O.inst },
  B: { id: 'B', label: 'same-site, sandbox="allow-scripts allow-same-origin"', page: `${O.main}/sandboxed.html`, inst: O.inst },
  C: { id: 'C', label: 'cross-site, plain iframe (another static host on its own domain)', page: `${O.main}/xsite.html`, inst: O.xsite },
};
const Z3_REQ = { engine: 'z3', version: '5.3.1', input: 'roadmap-starter', budget: { rlimit: 5000000, wallMs: 120000 } };
const hostOf = (origin) => new URL(origin).hostname;

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(PROFILES, { recursive: true });

async function waitForControl(ms = 10000) {
  if (REMOTE) return;
  const t0 = Date.now();
  for (;;) {
    try { await fetch(`${CONTROL}/log?phase=none`); return; } catch (err) {
      if (Date.now() - t0 > ms) throw new Error(`control endpoint not reachable: ${err}`);
      await new Promise((r) => setTimeout(r, 100));
    }
  }
}

async function control(pathname, body) {
  if (REMOTE) return body ? {} : [];
  const res = await fetch(CONTROL + pathname, body
    ? { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }
    : undefined);
  return res.json();
}

function summarizeRequests(list) {
  const byHost = {};
  for (const r of list) {
    const h = (byHost[r.host] ||= { total: 0, engineAssets: 0, engineBytes: 0, statuses: {} });
    h.total++;
    h.statuses[r.status] = (h.statuses[r.status] || 0) + 1;
    if (r.path.includes('/engines/')) { h.engineAssets++; h.engineBytes += r.bytes; }
  }
  return { byHost, list: list.map((r) => `${r.status} ${r.host}${r.path}`) };
}

// --- launch options -------------------------------------------------------------------------
const launch = { chromium: { headless: true }, firefox: { headless: true }, webkit: { headless: true } };

async function chromiumArgs() {
  // Playwright disables ThirdPartyStoragePartitioning by default; shipping Chrome has it on.
  // Read the default flag from the launched process, then relaunch without that one feature.
  const read = async (opts) => {
    const srv = await PW.chromium.launchServer(opts);
    const args = fs.readFileSync(`/proc/${srv.process().pid}/cmdline`, 'utf8').split('\0');
    await srv.close();
    return args.filter((a) => a.startsWith('--disable-features=') || a.startsWith('--enable-features='));
  };
  const before = await read({ headless: true });
  const dflt = before.find((a) => a.startsWith('--disable-features='));
  if (!dflt) return { before, after: before };
  const kept = dflt.slice('--disable-features='.length).split(',').filter((f) => f !== 'ThirdPartyStoragePartitioning');
  launch.chromium = { headless: true, ignoreDefaultArgs: [dflt], args: [`--disable-features=${kept.join(',')}`] };
  const after = await read(launch.chromium);
  return { before, after };
}

async function versions() {
  const out = {};
  for (const e of ENGINES) {
    const b = await PW[e].launch(launch[e]);
    out[e] = b.version();
    await b.close();
  }
  return out;
}

function freshProfile(engine, name) {
  const dir = path.join(PROFILES, `${engine}-${name}`);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  if (engine === 'firefox' && FF_TEMPLATE) {
    for (const f of ['cert9.db', 'key4.db', 'pkcs11.txt']) fs.copyFileSync(path.join(FF_TEMPLATE, f), path.join(dir, f));
  }
  return dir;
}

// --- one browser session ---------------------------------------------------------------------
async function session(engine, cfg, n, dir, offlineHosts, steps) {
  const phase = `${engine}-${cfg.id}-s${n}`;
  await control('/phase', { name: phase, offline: offlineHosts });
  const rec = { phase, engine, config: cfg.id, session: n, offlineHosts, startedAt: new Date().toISOString() };
  const t0 = Date.now();
  let ctx = null;
  const consoleLines = [];
  try {
    ctx = await PW[engine].launchPersistentContext(dir, launch[engine]);
    const page = ctx.pages()[0] || (await ctx.newPage());
    page.on('console', (m) => consoleLines.push(`${m.type()}: ${m.text()}`.slice(0, 300)));
    page.on('pageerror', (e) => consoleLines.push(`pageerror: ${String(e).slice(0, 300)}`));
    await page.goto(cfg.page, { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => window.__ss, null, { timeout: 15000 });
    rec.handshake = await page.evaluate(() => Promise.race([
      window.__ss.ready,
      new Promise((r) => setTimeout(() => r({ ok: false, reason: 'no ready within 30 s' }), 30000)),
    ]));
    const call = (msg, ms = 120000) => page.evaluate(([m, t]) => window.__ss.call(m, t), [msg, ms]);
    const token = await page.evaluate(() => window.__ss.token);
    if (rec.handshake && rec.handshake.ok) await steps({ page, ctx, call, token, rec });
    rec.mainLog = await page.evaluate(() => window.__ss.log).catch(() => null);
    rec.mainIgnoredWindowMessages = await page.evaluate(() => window.__ss.ignoredWindowMessages()).catch(() => null);
    rec.hostState = await hostFrameState(page, cfg);
    rec.frames = page.frames().map((f) => f.url());
  } catch (err) {
    rec.error = String((err && err.stack) || err).slice(0, 1200);
  } finally {
    if (ctx) await ctx.close().catch(() => {});
  }
  rec.durationS = (Date.now() - t0) / 1000;
  rec.console = consoleLines;
  rec.requests = summarizeRequests(await control(`/log?phase=${encodeURIComponent(phase)}`));
  return rec;
}

function instrumentFrame(page, cfg) {
  return page.frames().find((f) => f.url().startsWith(`${cfg.inst}/b/`));
}

async function hostFrameState(page, cfg) {
  const f = instrumentFrame(page, cfg);
  if (!f) return { error: 'no instrument frame' };
  return f.evaluate(() => window.__hostState).catch((e) => ({ error: String(e).slice(0, 200) }));
}

// The harness's own cross-origin check, independent of the host's probe code: evaluated in the
// framed document's main world, so the browser's cross-origin rules apply to it.
async function harnessFrameCheck(page, cfg) {
  const f = instrumentFrame(page, cfg);
  if (!f) return { error: 'no instrument frame' };
  return f.evaluate(() => {
    const tryIt = (fn) => { try { return { threw: null, value: String(fn()).slice(0, 60) }; } catch (e) { return { threw: e.name }; } };
    return {
      frameOrigin: location.origin,
      parentLocalStorage: tryIt(() => window.parent.localStorage.getItem('ss-evidence-marker')),
      parentLocationHref: tryIt(() => window.parent.location.href),
    };
  });
}

async function firstPartyView(ctx, cfg) {
  const p = await ctx.newPage();
  try {
    await p.goto(`${cfg.inst}/diag.html`, { waitUntil: 'load', timeout: 20000 });
    return await p.evaluate(() => window.__diag);
  } catch (err) {
    return { error: String(err).slice(0, 300) };
  } finally {
    await p.close().catch(() => {});
  }
}

async function topnavProbe(page, call, cfg, target) {
  // The frame attempts the navigation 6 s after the request, past the 5 s transient-activation
  // window; the parent's activation state is read first, since a Playwright evaluate may itself
  // count as a user gesture.
  const before = page.url();
  const out = { target, delayMs: 6000 };
  out.parentActivationAtRequest = await page.evaluate(() => window.__ss.activation()).catch(() => null);
  try { out.reply = reply(await call({ t: 'topnav', delayMs: 6000, target }, 5000)); } catch (err) { out.reply = { evalError: String(err).slice(0, 160) }; }
  await page.waitForTimeout(8500);
  out.navigated = page.url() !== before;
  out.urlAfter = page.url();
  if (!out.navigated) {
    const f = instrumentFrame(page, cfg);
    out.attempt = f ? await f.evaluate(() => window.__hostState.topnav).catch((e) => ({ error: String(e).slice(0, 160) })) : null;
  }
  return out;
}

const reply = (r) => (r && r.t === 'result' ? r.reply : r);

async function runConfig(engine, cfg) {
  const dir = freshProfile(engine, cfg.id);
  const out = { config: cfg.id, label: cfg.label, page: cfg.page, instrumentOrigin: cfg.inst, sessions: [] };

  out.sessions.push(await session(engine, cfg, 1, dir, [], async ({ page, call, token, rec }) => {
    rec.diagStart = reply(await call({ t: 'diag' }));
    rec.capsBefore = reply(await call({ t: 'caps' }));
    rec.runWithoutConsent = await call({ t: 'run', req: Z3_REQ });
    rec.peekBeforeFill = reply(await call({ t: 'peek' }));
    rec.warm = await call({ t: 'warm', engine: 'z3', consent: true }, 180000);
    rec.capsAfter = reply(await call({ t: 'caps' }));
    rec.run = await call({ t: 'run', req: Z3_REQ, consent: true }, 180000);
    rec.probe = reply(await call({ t: 'probe', token }));
    rec.harnessFrameCheck = await harnessFrameCheck(page, cfg);
    rec.diagEnd = reply(await call({ t: 'diag' }));
    if (cfg.id === 'A') rec.secondConnect = await page.evaluate(() => window.__ss.secondConnect());
    rec.domainProbe = reply(await call({ t: 'domainprobe' }));
  }));

  out.sessions.push(await session(engine, cfg, 2, dir, [], async ({ ctx, call, token, rec }) => {
    rec.diagStart = reply(await call({ t: 'diag' }));
    rec.caps = reply(await call({ t: 'caps' }));
    rec.run = await call({ t: 'run', req: Z3_REQ }, 180000); // no consent: it must come from the cache
    rec.probe = reply(await call({ t: 'probe', token }));
    rec.diagEnd = reply(await call({ t: 'diag' }));
    rec.firstPartyView = await firstPartyView(ctx, cfg);
  }));

  if (REMOTE) return out; // the offline session needs the local server
  out.sessions.push(await session(engine, cfg, 3, dir, [hostOf(cfg.inst)], async ({ call, rec }) => {
    rec.diagStart = reply(await call({ t: 'diag' }));
    rec.caps = reply(await call({ t: 'caps' }));
    rec.run = await call({ t: 'run', req: Z3_REQ }, 180000);
    rec.diagEnd = reply(await call({ t: 'diag' }));
    rec.evict = reply(await call({ t: 'evict' }));
    rec.capsAfterEvict = reply(await call({ t: 'caps' }));
  }));
  await control('/phase', { name: 'none', offline: [] });
  return out;
}

// Top navigation by a frame that never had user activation: a fresh profile, no harness evaluate
// inside the frame before the attempt; the frame reads its own activation state. One session per
// target, since a navigation that succeeds ends the page. Targets: 'main-origin' (a page on the
// main origin) and 'cross-site' (a page on the hostile origin, as a phishing redirect would be).
async function topnavClean(engine, cfg, target) {
  const dir = freshProfile(engine, `topnav-${cfg.id}-${target}`);
  const phase = `${engine}-${cfg.id}-topnav-${target}`;
  await control('/phase', { name: phase, offline: [] });
  const rec = { phase, config: cfg.id, target, startedAt: new Date().toISOString() };
  let ctx = null;
  try {
    ctx = await PW[engine].launchPersistentContext(dir, launch[engine]);
    const page = ctx.pages()[0] || (await ctx.newPage());
    await page.goto(cfg.page, { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => window.__ss, null, { timeout: 15000 });
    rec.handshake = await page.evaluate(() => Promise.race([
      window.__ss.ready.then((r) => ({ ok: r.ok })),
      new Promise((r) => setTimeout(() => r({ ok: false }), 30000)),
    ]));
    const call = (msg, ms = 120000) => page.evaluate(([m, t]) => window.__ss.call(m, t), [msg, ms]);
    if (rec.handshake.ok) rec.topnav = await topnavProbe(page, call, cfg, target);
  } catch (err) {
    rec.error = String((err && err.stack) || err).slice(0, 1200);
  } finally {
    if (ctx) await ctx.close().catch(() => {});
  }
  return rec;
}

async function negativeTests(engine) {
  const dir = freshProfile(engine, 'negative');
  const phase = `${engine}-negative`;
  await control('/phase', { name: phase, offline: [] });
  const rec = { phase, startedAt: new Date().toISOString() };
  const t0 = Date.now();
  let ctx = null;
  try {
    ctx = await PW[engine].launchPersistentContext(dir, launch[engine]);
    const page = ctx.pages()[0] || (await ctx.newPage());
    if (O.attacker) {
      await page.goto(`${O.attacker}/attack.html`, { waitUntil: 'load', timeout: 30000 });
      await page.waitForFunction(() => window.__attack, null, { timeout: 30000 });
      rec.attack = await page.evaluate(() => window.__attack);
      rec.hostStateUnderAttacker = {};
      for (const name of ['plain', 'noReferrer']) {
        const f = page.frame({ name });
        rec.hostStateUnderAttacker[name] = f ? await f.evaluate(async () => ({
          ...window.__hostState,
          registrations: 'serviceWorker' in navigator ? (await navigator.serviceWorker.getRegistrations()).length : 'no api',
        })) : { error: 'no frame' };
      }
    }
    await page.goto(`${O.inst}/b/${BUILD.buildId}/host.html`, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(500);
    rec.topLevelHost = await page.evaluate(async () => ({
      refused: window.__hostState && window.__hostState.refused,
      notice: document.getElementById('notice').textContent,
      registrations: 'serviceWorker' in navigator ? (await navigator.serviceWorker.getRegistrations()).length : 'no api',
    }));
  } catch (err) {
    rec.error = String((err && err.stack) || err).slice(0, 1200);
  } finally {
    if (ctx) await ctx.close().catch(() => {});
  }
  rec.durationS = (Date.now() - t0) / 1000;
  rec.requests = summarizeRequests(await control(`/log?phase=${encodeURIComponent(phase)}`));
  return rec;
}

await waitForControl();
const results = {
  remote: REMOTE,
  startedAt: new Date().toISOString(),
  playwrightCore: JSON.parse(fs.readFileSync(path.join(path.dirname(new URL(import.meta.resolve(process.env.PW_MODULE || 'playwright-core')).pathname), 'package.json'), 'utf8')).version,
  node: process.version,
  build: BUILD,
  z3Request: Z3_REQ,
  launch: {},
  engines: {},
};
if (ENGINES.includes('chromium')) results.launch.chromiumFeatureFlags = await chromiumArgs();
results.launch.options = launch;
results.versions = await versions();

for (const engine of ENGINES) {
  const t0 = Date.now();
  const e = { version: results.versions[engine], configs: {} };
  for (const id of CONFIG_IDS) {
    if (!CONFIGS[id] || !CONFIGS[id].inst) continue;
    e.configs[id] = await runConfig(engine, CONFIGS[id]);
    console.log(`${engine} ${id} done`);
  }
  e.topnavClean = {};
  for (const id of CONFIG_IDS) {
    if (!CONFIGS[id] || !CONFIGS[id].inst) continue;
    e.topnavClean[id] = {};
    for (const target of O.attacker ? ['main-origin', 'cross-site'] : ['main-origin']) {
      e.topnavClean[id][target] = await topnavClean(engine, CONFIGS[id], target);
    }
  }
  e.negative = await negativeTests(engine);
  e.durationS = (Date.now() - t0) / 1000;
  results.engines[engine] = e;
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2) + '\n');
}
results.finishedAt = new Date().toISOString();
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2) + '\n');
console.log('results written');
