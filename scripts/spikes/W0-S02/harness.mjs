// W0-S02 harness: drives Chromium, Firefox and WebKit through the phone measurement page, inside
// mcr.microsoft.com/playwright:v1.63.0-noble (see run.sh and container.sh). It runs the same sessions the owner
// runs on a phone (the page's own runSession), and adds what only a harness can see: the server's log of bytes
// sent, and the memory of the browser's processes, read from /proc.
//
// Environment:
//   PW_MODULE   path to playwright-core's entry                    BUILD_DIR   the build (build.mjs output)
//   OUT_DIR     where results-<label>-<engine>.json goes             SERVER_JS   path to server.mjs
//   ENGINES     comma list (default chromium,firefox,webkit)         LABEL       the CPU tier's label, for file names
//   PLAN        one of: matrix, extras, link, quick                  PROFILE_DIR where persistent profiles live
//   REPEAT      cold and warm repeats in the matrix plan (default 3)
//
// Plans (one persistent browser profile per sequence; a "session" is one browser process: launch, work, close):
//   matrix   cold-1 (a fresh profile: consent, fill, engine, cases, rlimit ladder, worker restart), warm-1 (a restart on
//            that profile: the full set again), warm-2 .. warm-N (restarts: engine ready and first verdict only),
//            cold-2 .. cold-N (fresh profiles: fill, engine ready and first verdict only)
//   extras   on a warm profile: an offline restart (the instrument host answers 503 to everything) and the timeout case
//   link     cold sessions through a shaped link, one per profile in LINKS, and one more at the slow link with the host's heartbeat
//   ui       one session started and read through the page's own buttons, as a person would (Run, Copy, Save, Clear)
//   quick    one cold and one warm session, minimal, for a smoke test
//   full1    one cold and one warm session with every case, the ladder, the restart and the timeout case, for a smoke test
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const PW = await import(process.env.PW_MODULE || 'playwright-core');
const OUT = process.env.OUT_DIR || '/tmp/w0s02-out';
const PROFILES = process.env.PROFILE_DIR || '/tmp/w0s02-profiles';
const BUILD_DIR = process.env.BUILD_DIR;
const SERVER_JS = process.env.SERVER_JS;
const ENGINES = (process.env.ENGINES || 'chromium,firefox,webkit').split(',');
const LABEL = process.env.LABEL || 'tier';
const PLAN = process.env.PLAN || 'matrix';
const REPEAT = Number(process.env.REPEAT || 3);
const TAG = `${LABEL}-${PLAN}`; // file names: one container is one tier and one plan
const MAIN_PORT = 8097;
const INST_PORT = 8098;
const CONTROL = 'http://127.0.0.1:9000';
const BUILD = JSON.parse(fs.readFileSync(path.join(BUILD_DIR, 'build.json'), 'utf8'));
// Stand-ins for a good and a poor mobile link: chosen, not measured (decision record, section 3).
const LINKS = { lte: { bps: 10_000_000, rttMs: 50 }, slow: { bps: 1_600_000, rttMs: 150 } };

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(PROFILES, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...m) => console.error(new Date().toISOString().slice(11, 19), ...m);

// ---- the server, as a child process --------------------------------------------------------------
const server = spawn(process.execPath, [SERVER_JS, '--build', BUILD_DIR, '--main-port', String(MAIN_PORT), '--inst-port', String(INST_PORT), '--control-port', '9000', '--quiet'], { stdio: ['ignore', 'inherit', 'inherit'] });
async function control(pathname, body) {
  const res = await fetch(CONTROL + pathname, body ? { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } } : undefined);
  return res.json();
}
for (let i = 0; ; i++) {
  try { await control('/log?phase=none'); break; } catch { if (i > 100) throw new Error('server did not start'); await sleep(100); }
}

// ---- process memory ----------------------------------------------------------------------------------
// The browser's processes are every process in this container except this harness and the server.
const EXCLUDE = new Set([process.pid, server.pid]);
function memory(withPss) {
  let rss = 0;
  let pss = 0;
  let n = 0;
  for (const pid of fs.readdirSync('/proc').filter((d) => /^\d+$/.test(d))) {
    if (EXCLUDE.has(Number(pid))) continue;
    try {
      const m = /VmRSS:\s+(\d+) kB/.exec(fs.readFileSync(`/proc/${pid}/status`, 'utf8'));
      if (!m) continue;
      rss += Number(m[1]) * 1024;
      n++;
      if (withPss) {
        const p = /Pss:\s+(\d+) kB/.exec(fs.readFileSync(`/proc/${pid}/smaps_rollup`, 'utf8'));
        if (p) pss += Number(p[1]) * 1024;
      }
    } catch { /* the process ended */ }
  }
  return withPss ? { rss_bytes: rss, pss_bytes: pss, processes: n } : { rss_bytes: rss, processes: n };
}
const loadavg = () => fs.readFileSync('/proc/loadavg', 'utf8').split(' ').slice(0, 3).map(Number);

// ---- one browser session -----------------------------------------------------------------------------
const launchOpts = { chromium: { headless: true }, firefox: { headless: true }, webkit: { headless: true } };
const freshProfile = (engine, name) => {
  const dir = path.join(PROFILES, `${engine}-${name}`);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};
const summarizeRequests = (list) => {
  const bySite = {};
  for (const r of list) {
    const s = (bySite[r.site] ||= { requests: 0, engine_requests: 0, engine_body_bytes: 0, body_bytes: 0, statuses: {} });
    s.requests++;
    s.body_bytes += r.body_bytes;
    s.statuses[r.status] = (s.statuses[r.status] || 0) + 1;
    if (r.path.includes('/engines/')) { s.engine_requests++; s.engine_body_bytes += r.body_bytes; s.engine_sent_bytes = (s.engine_sent_bytes || 0) + (r.sent_bytes ?? r.body_bytes); }
  }
  return {
    by_site: bySite,
    engine_files: list.filter((r) => r.path.includes('/engines/')).map((r) => ({ file: r.path.split('/').pop(), status: r.status, encoding: r.encoding, body_bytes: r.body_bytes, sent_bytes: r.sent_bytes ?? r.body_bytes, raw_bytes: r.raw_bytes, t_ms: r.t_ms, ms: r.ms, ...(r.aborted_ms != null ? { aborted_ms: r.aborted_ms } : {}) })),
  };
};

async function session(engine, dir, label, opts, env = {}) {
  const phase = `${TAG}-${engine}-${label}`;
  await control('/phase', { name: phase, offline: env.offline || [] });
  await control('/link', env.link || { bps: null, rttMs: 0 });
  const rec = { label, engine, tier: LABEL, options: opts, env: { offline: env.offline || [], link: env.link || null }, started_at: new Date().toISOString(), load_start: loadavg() };
  const t0 = Date.now();
  let ctx = null;
  const samples = [];
  let peak = 0;
  let sampler = null;
  const consoleLinesRef = { lines: [] };
  try {
    ctx = await PW[engine].launchPersistentContext(dir, { ...launchOpts[engine], viewport: { width: 360, height: 740 } });
    const page = ctx.pages()[0] || (await ctx.newPage());
    const consoleLines = consoleLinesRef.lines;
    page.on('console', (m) => { if (process.env.VERBOSE) log(`  [${engine} page] ${m.text().slice(0, 200)}`); if (consoleLines.length < 40) consoleLines.push(`${m.type()}: ${m.text()}`.slice(0, 240)); });
    page.on('pageerror', (e) => { if (consoleLines.length < 40) consoleLines.push(`pageerror: ${String(e).slice(0, 240)}`); });
    rec.browser_version = ctx.browser() ? ctx.browser().version() : null;
    await sleep(500);
    samples.push({ name: 'blank', ...memory(true) });
    await page.exposeFunction('__phase', async (name) => { samples.push({ name, at_ms: Date.now() - t0, ...memory(true) }); });
    sampler = setInterval(() => { peak = Math.max(peak, memory(false).rss_bytes); }, 250);
    for (let attempt = 1; ; attempt++) {
      await page.goto(`http://localhost:${MAIN_PORT}/index.html`, { waitUntil: 'load', timeout: 60000 });
      try { await page.waitForFunction(() => window.__ss, null, { timeout: 30000 }); break; } catch (err) {
        // A fresh Firefox profile once failed to run the page's script on its first load; record it and load again.
        (rec.load_retries ||= []).push({ attempt, ready_state: await page.evaluate(() => document.readyState).catch(() => null), ss: await page.evaluate(() => typeof window.__ss).catch(() => null), console: consoleLines.slice(-8) });
        if (attempt >= 2) throw err;
      }
    }
    rec.user_agent = await page.evaluate(() => navigator.userAgent);
    const limitMs = env.limitMs || 20 * 60 * 1000;
    let limitTimer;
    const limit = new Promise((r) => { limitTimer = setTimeout(() => r({ harness_timeout_ms: limitMs }), limitMs); });
    const result = await Promise.race([page.evaluate((o) => window.__ss.runSession(o), { ...opts, label }), limit]);
    clearTimeout(limitTimer);
    rec.session = result;
    if (opts.screenshot) await page.screenshot({ path: path.join(OUT, `screen-${phase}.png`), fullPage: true }).catch(() => {});
    rec.console = consoleLines;
  } catch (err) {
    rec.error = String((err && err.stack) || err).slice(0, 1200);
  } finally {
    rec.console = rec.console || consoleLinesRef.lines;
    if (sampler) clearInterval(sampler);
    samples.push({ name: 'before-close', ...memory(true) });
    if (ctx) await ctx.close().catch(() => {});
    await sleep(300);
    samples.push({ name: 'after-close', ...memory(true) });
  }
  rec.duration_s = (Date.now() - t0) / 1000;
  rec.load_end = loadavg();
  rec.memory = { samples, peak_rss_bytes: peak };
  rec.requests = summarizeRequests(await control(`/log?phase=${encodeURIComponent(phase)}`));
  const s = rec.session;
  log(`${engine} ${label}: ${rec.error ? 'ERROR ' + rec.error.slice(0, 100) : s && s.harness_timeout_ms ? 'TIMEOUT' : s && s.fill && s.fill.failed ? `fill failed (${s.fill.failed}) after ${Math.round(s.fill.host_ms / 1000)} s` : `${s && s.kind} ready ${s && s.init && s.init.phases && s.init.phases.ready_ms} ms, verdict ${s && s.starter && s.starter.line}`} (${rec.duration_s.toFixed(1)} s)`);
  return rec;
}

// the ui plan: a person's path through the page, in each engine, with the page's own buttons
async function uiSession(engine, dir) {
  const label = 'ui-1';
  const phase = `${TAG}-${engine}-${label}`;
  await control('/phase', { name: phase, offline: [] });
  await control('/link', { bps: null, rttMs: 0 });
  const rec = { label, engine, tier: LABEL, options: { ui: true }, env: { offline: [], link: null }, started_at: new Date().toISOString(), load_start: loadavg() };
  const t0 = Date.now();
  let ctx = null;
  try {
    ctx = await PW[engine].launchPersistentContext(dir, { ...launchOpts[engine], viewport: { width: 360, height: 740 }, acceptDownloads: true });
    const page = ctx.pages()[0] || (await ctx.newPage());
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
    await page.goto(`http://localhost:${MAIN_PORT}/index.html`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => window.__ss, null, { timeout: 30000 });
    rec.user_agent = await page.evaluate(() => navigator.userAgent);
    const text = (sel) => page.textContent(sel).then((t) => (t || '').trim());
    await page.fill('#f-device', `Playwright ${engine}, a test of the page's buttons`);
    await page.selectOption('#f-hosting', 'other');
    await page.selectOption('#f-net', 'wifi');
    const ui = { size_note: (await text('#size-note')).slice(0, 120) };
    await page.click('#run');
    await page.waitForFunction(() => /session 1 done/.test(document.getElementById('status').textContent), null, { timeout: 180000 });
    ui.status_after_run = await text('#status');
    ui.cards = await page.locator('#sessions li').count();
    ui.card_text = (await page.locator('#sessions li').first().innerText()).replace(/\n/g, ' / ').slice(0, 400);
    await page.click('#copy');
    await page.waitForFunction(() => /copied the report|copying is not allowed/.test(document.getElementById('status').textContent), null, { timeout: 15000 });
    ui.status_after_copy = await text('#status');
    const report = JSON.parse(await page.inputValue('#report'));
    ui.report = { schema: report.schema, sessions: report.sessions.length, declared: report.sessions[0] && report.sessions[0].declared, evictions: report.evictions.length, persist_requests: report.persist_requests.length };
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 10000 }).catch(() => null), page.click('#save')]);
    ui.download = dl ? dl.suggestedFilename() : null;
    await page.waitForFunction(() => /offered as a file/.test(document.getElementById('status').textContent), null, { timeout: 15000 }).catch(() => {});
    await page.click('#persist');
    await page.waitForFunction(() => /persistent storage/.test(document.getElementById('status').textContent), null, { timeout: 15000 }).catch(() => {});
    ui.status_after_persist = await text('#status');
    await page.click('#evict');
    await page.waitForFunction(() => /cleared the engine cache/.test(document.getElementById('status').textContent), null, { timeout: 15000 }).catch(() => {});
    ui.status_after_evict = await text('#status');
    await page.click('#clear-list');
    ui.cards_after_clear = await page.locator('#sessions li').count();
    ui.page_errors = errors;
    rec.ui = ui;
    await page.screenshot({ path: path.join(OUT, `screen-${phase}.png`), fullPage: true }).catch(() => {});
  } catch (err) {
    rec.error = String((err && err.stack) || err).slice(0, 1200);
  } finally {
    if (ctx) await ctx.close().catch(() => {});
  }
  rec.duration_s = (Date.now() - t0) / 1000;
  log(`${engine} ${label}: ${rec.error ? 'ERROR ' + rec.error.slice(0, 100) : `cards ${rec.ui.cards}, report sessions ${rec.ui.report.sessions}, download ${rec.ui.download}, after clearing the list ${rec.ui.cards_after_clear} cards`} (${rec.duration_s.toFixed(1)} s)`);
  return rec;
}

const MIN = { cases: false, ladder: false, respawn: false };
const FULL = { cases: true, ladder: true, respawn: true };

async function runEngine(engine) {
  const out = { engine, tier: LABEL, plan: PLAN, started_at: new Date().toISOString(), build: BUILD.buildId, sessions: [] };
  const push = async (p) => { out.sessions.push(await p); fs.writeFileSync(path.join(OUT, `results-${TAG}-${engine}.json`), JSON.stringify(out, null, 1) + '\n'); };
  if (PLAN === 'quick') {
    const dir = freshProfile(engine, 'quick');
    await push(session(engine, dir, 'cold-1', MIN));
    await push(session(engine, dir, 'warm-1', MIN));
  } else if (PLAN === 'full1') {
    const dir = freshProfile(engine, 'full1');
    await push(session(engine, dir, 'cold-1', { ...FULL, timeoutCase: true, screenshot: engine === 'chromium' }));
    await push(session(engine, dir, 'warm-1', FULL));
  } else if (PLAN === 'matrix') {
    const dir = freshProfile(engine, 'main');
    await push(session(engine, dir, 'cold-1', { ...FULL, screenshot: engine === 'chromium' }));
    await push(session(engine, dir, 'warm-1', FULL));
    for (let k = 2; k <= REPEAT; k++) await push(session(engine, dir, `warm-${k}`, MIN));
    for (let k = 2; k <= REPEAT; k++) await push(session(engine, freshProfile(engine, `cold-${k}`), `cold-${k}`, MIN));
  } else if (PLAN === 'extras') {
    const dir = freshProfile(engine, 'extras');
    await push(session(engine, dir, 'cold-1', MIN));
    await push(session(engine, dir, 'offline-1', MIN, { offline: ['inst'] }));
    await push(session(engine, dir, 'timeout-1', { ...MIN, timeoutCase: true }));
  } else if (PLAN === 'ui') {
    await push(uiSession(engine, freshProfile(engine, 'ui')));
  } else if (PLAN === 'link') {
    // the planned fill (one message to the service worker) at both links; a fill that never answers is called failed after 180 s,
    // and the page then asks once more, with the heartbeat, to see what the cache kept
    for (const [name, l] of Object.entries(LINKS)) await push(session(engine, freshProfile(engine, `link-${name}`), `cold-link-${name}`, { ...MIN, fill: 'single', fillTimeoutMs: 180000, retryFill: true }, { link: { ...l, name }, limitMs: 20 * 60 * 1000 }));
    // and, at the slow link, the same fill with the host's heartbeat to the service worker (decision record, 4.8)
    await push(session(engine, freshProfile(engine, 'link-slow-beat'), 'cold-link-slow-beat', { ...MIN, fill: 'beat', fillTimeoutMs: 180000 }, { link: { ...LINKS.slow, name: 'slow' }, limitMs: 20 * 60 * 1000 }));
  }
  out.finished_at = new Date().toISOString();
  fs.writeFileSync(path.join(OUT, `results-${TAG}-${engine}.json`), JSON.stringify(out, null, 1) + '\n');
}

const meta = { label: LABEL, plan: PLAN, host_cpus: fs.readFileSync('/proc/cpuinfo', 'utf8').split('\n').filter((l) => l.startsWith('processor')).length, started_at: new Date().toISOString(), load_start: loadavg(), links: LINKS };
try {
  for (const engine of ENGINES) await runEngine(engine);
} finally {
  meta.finished_at = new Date().toISOString();
  meta.load_end = loadavg();
  fs.writeFileSync(path.join(OUT, `meta-${TAG}.json`), JSON.stringify(meta, null, 1) + '\n');
  server.kill();
}
log('done');
process.exit(0);
