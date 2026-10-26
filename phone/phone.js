// W0-S02 main origin page (stands in for https://<course-domain>/): the measurement page for a phone.
// It embeds the instrument frame as ARCHITECTURE.md section 5.3 shows, runs the origin-checked
// MessagePort handshake, and runs the sessions of the protocol in docs/spikes/W0-S02.md: a first visit
// (consent, cache fill, engine load, solver cases, memory, a worker restart) and return visits (what a
// later session finds in the frame's cache). Every session is appended to a ledger in this origin's
// localStorage, so a later session can say how long the cache has lived, and a session that ended early
// (a tab killed for memory) is recorded as interrupted. The Playwright harness drives the same functions
// through window.__ss. Spike code, not product code.
'use strict';

const cfg = document.documentElement.dataset;
const INSTRUMENT_ORIGIN = cfg.instrumentOrigin === 'auto'
  ? `${location.protocol}//${location.hostname}:${cfg.instPort}` : cfg.instrumentOrigin;
const BUILD = cfg.build;
const SCHEMA = 'w0-s02/report@1';
const LEDGER_KEY = 'w0s02.ledger';
const DECLARED_KEY = 'w0s02.declared';
const Z3_REQ_VERSION = '5.3.1';
const LADDER = [100000, 1000000, 5000000];
// ?fill=beat asks the instrument frame to keep its service worker alive during the fill (decision record, 4.8); the default is the plan's
let FILL_PARAM = 'single';
try { FILL_PARAM = new URLSearchParams(location.search).get('fill') === 'beat' ? 'beat' : 'single'; } catch { /* no URL parameters */ }
const now = () => performance.now();
// crypto.randomUUID needs a secure context, and the page must also run over plain HTTP from a laptop on the local network
const uid = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, '0')).join('');
const r1 = (v) => Math.round(v * 10) / 10;
const $ = (id) => document.getElementById(id);

// ---- the bus client ---------------------------------------------------------------------------
let iframe = null;
let port = null;
let readySeen = false;
const pending = new Map();
let resolveReady;
const ready = new Promise((r) => { resolveReady = r; });

window.addEventListener('message', (e) => {
  // Exactly one hello: from the instrument origin, from our own frame, for our build.
  if (port || e.origin !== INSTRUMENT_ORIGIN || !iframe || e.source !== iframe.contentWindow) return;
  const d = e.data;
  if (!d || d.t !== 'hello' || d.bus !== 1 || d.build !== BUILD) return;
  const ch = new MessageChannel();
  port = ch.port1;
  port.onmessage = onPortMessage;
  iframe.contentWindow.postMessage({ t: 'connect', bus: 1, build: BUILD, nonce: uid() }, INSTRUMENT_ORIGIN, [ch.port2]);
});

function onPortMessage(e) {
  const d = e.data;
  if (d && d.t === 'ready' && !readySeen) { readySeen = true; resolveReady({ ok: true, engines: d.engines, at_ms: r1(now()) }); return; }
  if (d && typeof d.id === 'string' && pending.has(d.id)) {
    const p = pending.get(d.id);
    pending.delete(d.id);
    clearTimeout(p.timer);
    p.resolve(d);
  }
}

function call(msg, timeoutMs = 600000) {
  const id = uid();
  return new Promise((resolve) => {
    const timer = setTimeout(() => { pending.delete(id); resolve({ t: 'error', id, code: 'terminated', detail: 'main-side watchdog' }); }, timeoutMs);
    pending.set(id, { resolve, timer });
    port.postMessage({ ...msg, id });
  });
}

function embed() {
  iframe = document.createElement('iframe');
  iframe.src = `${INSTRUMENT_ORIGIN}/b/${BUILD}/host.html`;
  iframe.title = 'statespace instruments';
  iframe.hidden = true;
  iframe.referrerPolicy = 'no-referrer';
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin'); // adopted by W0-S01
  document.body.append(iframe);
}

// ---- ledger and declared facts ----------------------------------------------------------------
function readJson(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function writeJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}
let ledger = readJson(LEDGER_KEY, { first_fill_epoch_ms: null, sessions: [] });
let storageWorks = writeJson('w0s02.probe', 1);
const saveLedger = () => { storageWorks = writeJson(LEDGER_KEY, ledger); };
// A session that never finished is a finding: the tab was killed, or the page crashed, during that phase.
for (const s of ledger.sessions) if (!s.finished_at && !s.interrupted) s.interrupted = true;
saveLedger();

const declared = () => ({
  device: ($('f-device') && $('f-device').value || '').slice(0, 120),
  served_from: $('f-hosting') ? $('f-hosting').value : '',
  connection: $('f-net') ? $('f-net').value : '',
  notes: ($('f-notes') && $('f-notes').value || '').slice(0, 400),
});

// ---- helpers for the flows --------------------------------------------------------------------
const say = (text) => {
  console.log(text); // the harness prints these live when VERBOSE is set
  const el = $('log');
  if (el) el.textContent += `${text}\n`;
  const st = $('status');
  if (st) st.textContent = text;
};
let hookMs = 0; // time spent in the harness's pauses, so that no session's numbers hide them
async function hook(name) {
  if (typeof window.__phase !== 'function') return;
  const t = now();
  try { await window.__phase(name); } catch { /* harness gone */ }
  hookMs += now() - t;
}
const unwrap = (r) => {
  if (r && r.t === 'result') return r.reply;
  const e = new Error(`${r && r.code}: ${r && r.detail}`);
  e.bus = r;
  throw e;
};

async function step(s, name, fn) {
  const t0 = now();
  s.phase_reached = name;
  saveLedger();
  try { return await fn(); } catch (err) {
    (s.errors ||= []).push({ step: name, error: String((err && err.message) || err).slice(0, 300), after_ms: r1(now() - t0) });
    say(`  ${name} failed: ${String((err && err.message) || err).slice(0, 120)}`);
    return undefined;
  }
}

const mark = (s, name) => { s.marks[name] = r1(now()); };
const w = (s, msg, wallMs = 600000) => call({ t: 'w', msg, wallMs }, wallMs + 30000);

async function runCase(s, name, args = {}, wallMs = 120000) {
  const r = await w(s, { t: 'case', name, args }, wallMs);
  if (r.t === 'error') return { name, args, error: r.code, detail: r.detail, host_call_ms: r.host_call_ms };
  return r.reply;
}

async function ladder(s) {
  const rows = [];
  for (const name of ['rlimit-nia', 'rlimit-bv']) {
    for (const rlimit of LADDER) {
      const c = await runCase(s, name, { rlimit });
      rows.push({ case: name, rlimit, verdict: c.verdict ?? null, reason: c.reason ?? null, solve_ms: c.solve_ms ?? null, call_ms: c.call_ms ?? null, error: c.error ?? null });
    }
  }
  return rows;
}

function verdictOk(c) { return c && c.first === 'sat' && c.second === 'unsat' && c.witness_ok === true && c.version === Z3_REQ_VERSION; }

// ---- main-thread responsiveness ---------------------------------------------------------------
// A 50 ms timer on this page's main thread, which the instrument frame may share. The excess of a tick over 50 ms is
// time the thread was busy or starved. Ticks are summed per phase, with a quiet stretch first as the device's own
// baseline. Long tasks (Chromium) are listed with their start times and assigned to the phase windows. This is the
// Boot gate's question: does the page stay interactive while the engine loads?
const LAG_TICK_MS = 50;
const lag = { phase: null, last: now(), stats: {}, windows: [], long: [], longSupported: false };
setInterval(() => {
  const t = now();
  const late = Math.max(0, t - lag.last - LAG_TICK_MS);
  lag.last = t;
  if (!lag.phase) return;
  const a = (lag.stats[lag.phase] ||= { ticks: 0, late_ms_total: 0, late_ms_max: 0, ticks_over_100: 0, ticks_over_250: 0 });
  a.ticks++; a.late_ms_total += late; a.late_ms_max = Math.max(a.late_ms_max, late);
  if (late > 100) a.ticks_over_100++;
  if (late > 250) a.ticks_over_250++;
}, LAG_TICK_MS);
function setLag(phase) {
  const t = now();
  if (lag.phase) lag.windows[lag.windows.length - 1].t1 = t;
  lag.phase = phase;
  if (phase) lag.windows.push({ phase, t0: t, t1: null });
}
try {
  if (typeof PerformanceObserver === 'function' && (PerformanceObserver.supportedEntryTypes || []).includes('longtask')) {
    new PerformanceObserver((list) => { for (const e of list.getEntries()) lag.long.push({ start: e.startTime, duration: e.duration }); }).observe({ type: 'longtask', buffered: true });
    lag.longSupported = true;
  }
} catch { /* not offered */ }
function lagReport() {
  const out = { tick_ms: LAG_TICK_MS, phases: JSON.parse(JSON.stringify(lag.stats)), long_tasks_supported: lag.longSupported };
  for (const w of lag.windows) {
    const inside = lag.long.filter((e) => e.start >= w.t0 && e.start < (w.t1 ?? Infinity));
    const ph = (out.phases[w.phase] ||= { ticks: 0, late_ms_total: 0, late_ms_max: 0, ticks_over_100: 0, ticks_over_250: 0 });
    ph.long_tasks = (ph.long_tasks || 0) + inside.length;
    ph.long_task_max_ms = Math.max(ph.long_task_max_ms || 0, ...inside.map((e) => Math.round(e.duration)));
  }
  for (const a of Object.values(out.phases)) a.late_ms_total = Math.round(a.late_ms_total);
  return out;
}
const lagResetAll = () => { lag.stats = {}; lag.windows = []; lag.long = []; };

// ---- keeping the measurement valid on a phone ---------------------------------------------------
// A page that is hidden (the screen locks, another app comes forward) has its timers and workers slowed or frozen,
// so a session that was hidden at any moment is flagged and left out of the medians. A screen wake lock is asked for
// during a session where the browser offers one.
const vis = { hiddenMs: 0, hiddenCount: 0, since: document.visibilityState === 'hidden' ? now() : null };
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { vis.since = now(); vis.hiddenCount++; } else if (vis.since != null) { vis.hiddenMs += now() - vis.since; vis.since = null; }
});
const visSnapshot = () => ({ ms: vis.hiddenMs + (vis.since != null ? now() - vis.since : 0), count: vis.hiddenCount, hiddenNow: document.visibilityState === 'hidden' });
let wakeLock = null;
async function takeWakeLock() {
  try {
    if (!('wakeLock' in navigator)) return 'unsupported';
    // a browser that never answers must not stall the session
    const got = await Promise.race([navigator.wakeLock.request('screen'), new Promise((r) => setTimeout(() => r('no answer within 2 s'), 2000))]);
    if (typeof got === 'string') return got;
    wakeLock = got;
    return 'held';
  } catch (err) { return `refused: ${err.name}`; }
}
async function releaseWakeLock() { try { if (wakeLock) await wakeLock.release(); } catch { /* already released */ } wakeLock = null; }

// ---- the session ------------------------------------------------------------------------------
async function runSession(opts = {}) {
  const o = { cases: true, ladder: true, respawn: true, timeoutCase: false, consent: true, label: null, fill: FILL_PARAM, fillTimeoutMs: 600000, retryFill: false, ...opts };
  const index = ledger.sessions.length + 1;
  const s = {
    n: index, label: o.label, started_at: new Date().toISOString(), started_epoch_ms: Date.now(),
    since_first_fill_ms: ledger.first_fill_epoch_ms ? Date.now() - ledger.first_fill_epoch_ms : null,
    online: navigator.onLine, declared: declared(), options: o, marks: {}, phase_reached: 'start',
    after_eviction: !!ledger.evicted_pending,
  };
  ledger.sessions.push(s);
  saveLedger();
  const log = (t) => say(`session ${index}: ${t}`);
  const vis0 = visSnapshot();
  const hook0 = hookMs;
  lagResetAll();
  const nav = performance.getEntriesByType('navigation')[0];
  s.page_load = nav ? { dom_content_loaded_ms: r1(nav.domContentLoadedEventEnd), load_ms: r1(nav.loadEventEnd) } : null;
  s.wake_lock = await takeWakeLock();
  try {
    log('connecting to the instrument frame');
    const hs = await Promise.race([ready, new Promise((r) => setTimeout(() => r({ ok: false }), 60000))]);
    // Times are ms since this page's navigation start. The frame is created when the page loads, so on a
    // return visit the handshake is usually over before the session starts.
    s.handshake = { ok: !!hs.ok, embed_at_ms: r1(window.__embedAt), ready_at_ms: hs.at_ms ?? null, embed_to_ready_ms: hs.ok ? r1(hs.at_ms - window.__embedAt) : null };
    s.marks.session_start = r1(now());
    s.marks.handshake_ready = hs.at_ms ?? null;
    if (!hs.ok) throw new Error('no ready from the instrument frame within 60 s');
    s.env = await step(s, 'env', async () => unwrap(await call({ t: 'env' })));
    s.caps_at_start = await step(s, 'caps', async () => unwrap(await call({ t: 'caps' })));
    s.frame_at_start = await step(s, 'diag-start', async () => unwrap(await call({ t: 'diag' })));
    await hook('connected');
    setLag('idle');
    await new Promise((r) => setTimeout(r, 1000)); // a quiet second: the timer's own jitter on this device
    setLag(null);
    const cached = !!(s.caps_at_start && s.caps_at_start.cached);
    s.kind = cached ? 'return-visit' : 'first-visit';

    if (!cached) {
      if (s.caps_at_start && s.caps_at_start.needsConsent) {
        s.consent_gate = await step(s, 'consent-gate', async () => {
          const r = await call({ t: 'run', consent: false });
          return { without_consent: r.t === 'error' ? r.code : 'allowed', detail: r.detail ?? null };
        });
      }
      log(`downloading the engine (${s.caps_at_start ? (s.caps_at_start.firstLoadBytes / 1e6).toFixed(2) : '?'} MB on the wire)`);
      mark(s, 'consent');
      setLag('fill');
      // on a slow connection a browser may stop the instrument frame's service worker during a long download (decision record, 4.8)
      const slowHint = setTimeout(() => log('still downloading after 75 s; if this line does not change for several minutes, the browser may have stopped the download: reload the page with ?fill=beat at the end of its address and run again'), 75000);
      s.fill = await step(s, 'fill', async () => unwrap(await call({ t: 'warm', consent: o.consent, fill: o.fill, fillTimeoutMs: o.fillTimeoutMs }, o.fillTimeoutMs + 60000)));
      clearTimeout(slowHint);
      setLag(null);
      mark(s, 'filled');
      await hook('after-fill');
      if (s.fill && s.fill.failed) {
        // what the cache kept, and, when asked (the harness does), a second request with the heartbeat: it should skip the files
        // that were verified before the stop and fetch only the rest (decision record, 4.8)
        s.caps_after_stop = await step(s, 'caps-after-stop', async () => unwrap(await call({ t: 'caps' })));
        if (o.retryFill) {
          s.fill_retry = await step(s, 'fill-retry', async () => unwrap(await call({ t: 'warm', consent: o.consent, fill: 'beat', fillTimeoutMs: o.fillTimeoutMs }, o.fillTimeoutMs + 60000)));
          s.caps_after_retry = await step(s, 'caps-after-retry', async () => unwrap(await call({ t: 'caps' })));
        }
        const same = s.fill.sw_instance_before === s.fill.sw_instance_after;
        throw new Error(`the download did not finish (${s.fill.failed} after ${Math.round(s.fill.host_ms / 1000)} s); the service worker ${same ? 'was still the same one' : 'had been stopped and started again'}`);
      }
    }

    // The first call to the worker pays for creating it: the module scripts load, the worker starts, a reply returns.
    setLag('start');
    s.worker_spawn = await step(s, 'spawn', async () => unwrap(await w(s, { t: 'ping' })));
    log('starting Pyodide and Z3');
    mark(s, 'init_start');
    s.init = await step(s, 'init', async () => unwrap(await w(s, { t: 'init' })));
    mark(s, 'ready');
    const starter = await step(s, 'starter', () => runCase(s, 'starter'));
    mark(s, 'first_verdict');
    setLag(null);
    s.starter = starter;
    s.starter_ok = verdictOk(starter);
    log(`first verdict: ${starter && starter.line}`);
    // Harness hooks run only between timed stretches, never inside one.
    await hook('first-verdict');
    // The yardstick runs after the engine has started, so that the start is measured from an idle CPU, as a tap would find it.
    log('measuring the CPU yardstick');
    s.cpu = await step(s, 'cpu', async () => unwrap(await w(s, { t: 'cpu' })));

    setLag('cases');
    if (o.cases) {
      s.cases = {};
      for (const name of ['unknown', 'fixedpoint', 'bv64-wrap']) s.cases[name] = await step(s, name, () => runCase(s, name));
    }
    if (o.ladder) {
      log('timing rlimit');
      s.rlimit_ladder = await step(s, 'ladder', () => ladder(s));
    }
    s.memory = await step(s, 'mem', async () => unwrap(await w(s, { t: 'mem' })));
    setLag(null);
    await hook('after-cases');

    if (o.respawn) {
      log('stopping the worker and starting another');
      const term = await step(s, 'terminate', async () => unwrap(await call({ t: 'wterm' })));
      const t0 = now();
      const init2 = await step(s, 'respawn-init', async () => unwrap(await w(s, { t: 'init' })));
      const v2 = await step(s, 'respawn-starter', () => runCase(s, 'starter'));
      s.respawn = { terminate: term, init: init2 && init2.phases, init_host_call_ms: init2 && init2.host_call_ms, starter_ok: verdictOk(v2), to_verdict_ms: r1(now() - t0) };
      await hook('after-respawn');
    }

    if (o.timeoutCase) {
      log('the timeout case (the watchdog stops it)');
      await hook('before-timeout');
      const t0 = now();
      const r = await step(s, 'timeout', () => w(s, { t: 'case', name: 'timeout', args: { timeoutMs: 2000 } }, 25000));
      s.timeout_case = r && r.t === 'error'
        ? { returned: false, stopped_by: r.code, watchdog_ms: 25000, wall_ms: r1(now() - t0) }
        : { returned: true, wall_ms: r1(now() - t0), result: r && r.reply };
      await hook('after-timeout-stop');
      const t1 = now();
      const init3 = await step(s, 'after-timeout-init', async () => unwrap(await w(s, { t: 'init' })));
      const v3 = await step(s, 'after-timeout-starter', () => runCase(s, 'starter'));
      s.timeout_case.next_request = { ok: verdictOk(v3), init_phases_ready_ms: init3 && init3.phases && init3.phases.ready_ms, to_verdict_ms: r1(now() - t1) };
      await hook('after-timeout-next');
    }

    // The same loop again at the end: a slower second reading means the device slowed down during the session.
    s.cpu_end = await step(s, 'cpu-end', async () => unwrap(await w(s, { t: 'cpu', quick: true })));
    s.frame_marker_write = await step(s, 'marker', async () => unwrap(await call({ t: 'marker', action: 'write' })));
    s.frame_at_end = await step(s, 'diag-end', async () => unwrap(await call({ t: 'diag' })));
    if (s.kind === 'first-visit' && s.fill && (s.fill.filled || s.fill.already_cached)) {
      ledger.first_fill_epoch_ms = ledger.first_fill_epoch_ms || Date.now();
    }
    if (s.kind === 'first-visit') ledger.evicted_pending = false;
  } catch (err) {
    (s.errors ||= []).push({ step: s.phase_reached, error: String((err && err.message) || err).slice(0, 300) });
  }
  s.page = {
    js_heap: typeof performance.memory === 'object' && performance.memory
      ? { used: performance.memory.usedJSHeapSize, total: performance.memory.totalJSHeapSize, limit: performance.memory.jsHeapSizeLimit } : null,
  };
  setLag(null);
  s.main_thread = lagReport();
  s.harness_pause_ms = r1(hookMs - hook0);
  const vis1 = visSnapshot();
  s.visibility = { hidden_at_start: vis0.hiddenNow, hidden_events: vis1.count - vis0.count, hidden_ms: r1(vis1.ms - vis0.ms) };
  await releaseWakeLock();
  s.ledger_storage_works = storageWorks;
  s.finished_at = new Date().toISOString();
  s.phase_reached = 'done';
  saveLedger();
  const hidden = s.visibility.hidden_at_start || s.visibility.hidden_events > 0;
  say(hidden
    ? `session ${index} done, but the page was hidden during it, so its timings are not valid: run it again with the screen on and this tab in front`
    : s.errors && s.errors.length ? `session ${index} done with ${s.errors.length} step${s.errors.length > 1 ? 's' : ''} failed: the report lists them` : `session ${index} done`);
  render();
  return s;
}

// ---- the report -------------------------------------------------------------------------------
async function deviceFacts() {
  const d = {
    user_agent: navigator.userAgent,
    platform: navigator.platform || null,
    hardware_concurrency: navigator.hardwareConcurrency ?? null,
    device_memory_gib: navigator.deviceMemory ?? null,
    screen: { width: screen.width, height: screen.height, dpr: window.devicePixelRatio, inner_width: innerWidth, inner_height: innerHeight },
    secure_context: window.isSecureContext,
    cross_origin_isolated: window.crossOriginIsolated === true,
    touch_points: navigator.maxTouchPoints ?? null,
    ua_data: null,
  };
  try {
    if (navigator.userAgentData) {
      const hi = await navigator.userAgentData.getHighEntropyValues(['model', 'platformVersion', 'architecture', 'bitness', 'uaFullVersion']);
      d.ua_data = { mobile: navigator.userAgentData.mobile, platform: navigator.userAgentData.platform, brands: navigator.userAgentData.brands, ...hi };
    }
  } catch { /* not offered */ }
  return d;
}

async function report() {
  return {
    schema: SCHEMA,
    kit: { build: BUILD, pyodide: '314.0.7', z3_wheel: '5.3.1.0', z3: Z3_REQ_VERSION, ladder: LADDER },
    device: await deviceFacts(),
    first_fill_epoch_ms: ledger.first_fill_epoch_ms,
    evictions: ledger.evictions || [],
    persist_requests: ledger.persist_requests || [],
    sessions: ledger.sessions,
  };
}

// ---- the page ---------------------------------------------------------------------------------
const mb = (n) => (n == null ? '?' : (n / 1e6).toFixed(2));
const ms = (n) => (n == null ? '?' : `${Math.round(n)} ms`);

function render() {
  const list = $('sessions');
  if (!list) return;
  list.textContent = '';
  for (const s of ledger.sessions) {
    const li = document.createElement('li');
    const h = document.createElement('h3');
    const hid = s.visibility && (s.visibility.hidden_at_start || s.visibility.hidden_events > 0);
    h.textContent = `Session ${s.n}: ${s.interrupted && !s.finished_at ? `ended during "${s.phase_reached}"` : (s.kind || 'unfinished')}${hid ? ' (page hidden: not valid)' : ''}${s.after_eviction ? ' (after clearing the cache)' : ''}`;
    li.append(h);
    const dl = document.createElement('dl');
    const ladderMs = s.rlimit_ladder ? (s.rlimit_ladder.find((r) => r.case === 'rlimit-nia' && r.rlimit === 5000000) || {}).solve_ms : null;
    const files = s.fill ? (s.fill.files || []) : [];
    const wire = s.fill ? (s.fill.wire_content_length || files.reduce((n, f) => n + ((f.resource_timing && f.resource_timing.encoded) || f.content_length || 0), 0)) : null;
    const rows = [
      ['Download', s.fill ? (s.fill.failed ? `did not finish: ${s.fill.failed} after ${Math.round(s.fill.host_ms / 1000)} s` : `${wire ? `${mb(wire)} MB` : 'size not reported by this browser'} in ${ms(s.fill.ms)}`) : null],
      ['Engine ready', s.init && s.init.phases ? ms(s.init.phases.ready_ms) : null],
      ['Asked to start, to first verdict', s.marks && s.marks.first_verdict && s.marks.init_start ? ms(s.marks.first_verdict - s.marks.init_start) : null],
      ['rlimit 5e6 (cubes query)', ladderMs != null ? ms(ladderMs) : null],
      ['Engine memory', s.init && s.init.phases && s.init.phases.heap_after_import_z3 ? `${(s.init.phases.heap_after_import_z3 / 1048576).toFixed(0)} MiB` : null],
      ['Cache found at start', s.frame_at_start && s.frame_at_start.caches && s.frame_at_start.caches['ss-engines-v1'] ? `${s.frame_at_start.caches['ss-engines-v1'].entries} of 6 files` : 'none'],
      ['Since the first download', s.since_first_fill_ms != null ? `${(s.since_first_fill_ms / 3600000).toFixed(1)} hours` : null],
    ];
    for (const [k, v] of rows) {
      if (v == null) continue;
      const dt = document.createElement('dt'); dt.textContent = k;
      const dd = document.createElement('dd'); dd.textContent = String(v);
      dl.append(dt, dd);
    }
    li.append(dl);
    list.append(li);
  }
}

async function refreshReportBox() {
  const box = $('report');
  if (box) box.value = JSON.stringify(await report(), null, 1);
}

function wireUi() {
  const saved = readJson(DECLARED_KEY, {});
  for (const [id, key] of [['f-device', 'device'], ['f-hosting', 'served_from'], ['f-net', 'connection'], ['f-notes', 'notes']]) {
    if ($(id) && saved[key]) $(id).value = saved[key];
    if ($(id)) $(id).addEventListener('change', () => writeJson(DECLARED_KEY, declared()));
  }
  $('run').addEventListener('click', async () => {
    $('run').disabled = true;
    try { await runSession({ timeoutCase: $('f-timeout').checked }); } finally { $('run').disabled = false; }
  });
  $('copy').addEventListener('click', async () => {
    await refreshReportBox();
    try { await navigator.clipboard.writeText($('report').value); say('copied the report'); } catch { $('report').select(); say('copying is not allowed here: the report is selected, copy it by hand'); }
  });
  $('save').addEventListener('click', async () => {
    const text = JSON.stringify(await report(), null, 1);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.download = 'w0-s02-report.json';
    document.body.append(a);
    a.click();
    a.remove();
    say('the report was offered as a file; if nothing was saved, use Copy the report');
  });
  // Clearing the cache lets the next session measure a first visit again; the list of sessions stays, and the next
  // session is marked as following a clearing, so that it does not count as a persistence result.
  $('evict').addEventListener('click', async () => {
    const r = await call({ t: 'evict' });
    (ledger.evictions ||= []).push({ at: new Date().toISOString() });
    ledger.evicted_pending = true;
    ledger.first_fill_epoch_ms = null;
    saveLedger();
    say(`cleared the engine cache: ${JSON.stringify(r.reply || r)}`);
  });
  $('clear-list').addEventListener('click', () => {
    ledger = { first_fill_epoch_ms: ledger.first_fill_epoch_ms, evictions: ledger.evictions || [], persist_requests: ledger.persist_requests || [], sessions: [] };
    saveLedger();
    render();
    say('cleared the list of sessions (the report starts again from the next session)');
  });
  $('persist').addEventListener('click', async () => {
    const r = await call({ t: 'persist' });
    const rec = { at: new Date().toISOString(), result: r.reply || r };
    (ledger.persist_requests ||= []).push(rec);
    saveLedger();
    say(`persistent storage: ${JSON.stringify(rec.result)}`);
  });
  const det = $('report-details');
  if (det) det.addEventListener('toggle', () => { if (det.open) refreshReportBox(); });
  render();
  const st = $('storage-note');
  if (st && !window.isSecureContext) st.textContent = 'This page is not in a secure context, so the browser offers no service worker or cache here: the measurement still runs, from the network each time, and cache persistence cannot be tested.';
}

window.__embedAt = now();
embed();
ready.then((r) => {
  const c = r.ok && r.engines && r.engines[0];
  const el = $('size-note');
  if (c && el) {
    el.textContent = c.cached
      ? 'The engine is already in this browser\'s cache from an earlier session. A run now measures what the browser kept.'
      : `The first run downloads ${(c.firstLoadBytes / 1e6).toFixed(2)} MB (${(c.firstLoadRawBytes / 1e6).toFixed(2)} MB once unpacked). Use Wi-Fi unless you mean to test a mobile connection.`;
  }
});
window.__ss = {
  config: { build: BUILD },
  ready,
  call,
  runSession,
  report,
  ledger: () => ledger,
  resetLedger: () => { ledger = { first_fill_epoch_ms: null, sessions: [] }; saveLedger(); },
  evict: () => call({ t: 'evict' }),
  marks: () => now(),
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireUi); else wireUi();
