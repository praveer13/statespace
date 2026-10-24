// W0-S02: turn the harness outputs and any real-device reports into runs/RUN-phone-pyodide.json and
// runs/RUN-phone-pyodide/. Dependency-free.
//
// Usage:
//   node record.mjs <work-dir> <out-dir> <runs-dir>
//       record the emulated run: compacts the container outputs into <runs-dir>/RUN-phone-pyodide/, then composes
//       the record from them
//   node record.mjs --merge-devices [--runs <runs-dir>] [--allow-desktop]
//       compose again from the files already in <runs-dir>/RUN-phone-pyodide/ plus every device report in its
//       devices/ folder (a report the phone page copied; docs/spikes/W0-S02.md section 7). No Docker needed. A report
//       whose user agent is not a phone or tablet is refused unless --allow-desktop is given, so a desktop
//       browser's report never counts as a real device.
//
// Course domains. In a device report from the real origins, set COURSE_DOMAIN to the real domain: every
// occurrence is rewritten to <course-domain> (OD-5), and a report with an e-mail address or a private path in it
// is refused.
import fs from 'node:fs';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { summarize, summarizeCell, metrics, wrapDeviceSession, median, round1 } from './summarize.mjs';
import { deriveBudget, toMarkdown, RULE } from './derive-budget.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../../..');
const ID = 'RUN-phone-pyodide';
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeJson = (p, v) => fs.writeFileSync(p, JSON.stringify(v, null, 1) + '\n');

const argv = process.argv.slice(2);
const MERGE = argv.includes('--merge-devices');
const ALLOW_DESKTOP = argv.includes('--allow-desktop');
const flagValue = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : null; };
const positional = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--runs');
const RUNS_DIR = path.resolve(MERGE ? (flagValue('--runs') || path.join(REPO, 'runs')) : positional[2] || path.join(REPO, 'runs'));
const OUT = path.join(RUNS_DIR, ID);
const COURSE_DOMAIN = process.env.COURSE_DOMAIN || '';

// ---- scrubbing ---------------------------------------------------------------------------------------
const PRIVATE = [os.homedir(), '/home/', '/Users/', '/tmp/claude'];
function scrubString(s, workDir) {
  let t = s;
  if (workDir) t = t.split(workDir).join('<work-dir>');
  t = t.replace(/\/tmp\/w0s02-profiles/g, '<profiles>').split('/work/').join('<work-dir>/');
  if (COURSE_DOMAIN) t = t.split(COURSE_DOMAIN).join('<course-domain>');
  return t;
}
function scrub(v, workDir) {
  if (typeof v === 'string') return scrubString(v, workDir);
  if (Array.isArray(v)) return v.map((x) => scrub(x, workDir));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, scrub(x, workDir)]));
  return v;
}
function assertClean(text, what) {
  for (const p of PRIVATE) if (p && text.includes(p)) throw new Error(`${what}: contains a private path (${p.slice(0, 8)}...)`);
  if (/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(text)) throw new Error(`${what}: contains an e-mail address`);
  if (COURSE_DOMAIN && text.includes(COURSE_DOMAIN)) throw new Error(`${what}: still names the course domain`);
}

// Raw sessions are kept whole except the service worker's served-file lists, which are reduced to counts.
function compact(rec) {
  const c = JSON.parse(JSON.stringify(rec));
  const reduce = (f) => {
    if (f && f.sw_log && Array.isArray(f.sw_log.served)) {
      const by = {};
      for (const e of f.sw_log.served) by[`${e.from}`] = (by[`${e.from}`] || 0) + 1;
      f.sw_log = { instance: f.sw_log.instance, served_count: f.sw_log.served.length, by_source: by, engine_files_from_engine_cache: f.sw_log.served.filter((e) => e.from === 'engine-cache' && /pyodide|python_stdlib|z3_solver|lock/.test(e.path)).length };
    }
  };
  if (c.session) { reduce(c.session.frame_at_start); reduce(c.session.frame_at_end); }
  return c;
}

// ---- 1. gather the harness outputs (mode a) ----------------------------------------------------------
function gather(workDir, outDir) {
  fs.mkdirSync(OUT, { recursive: true });
  for (const f of fs.readdirSync(OUT)) if (/^(results|meta|environment|harness)-/.test(f)) fs.rmSync(path.join(OUT, f));
  const names = fs.readdirSync(outDir);
  for (const n of names) {
    const src = path.join(outDir, n);
    if (/^results-.*\.json$/.test(n)) {
      const d = readJson(src);
      d.sessions = d.sessions.map(compact);
      writeJson(path.join(OUT, n), scrub(d, workDir));
    } else if (/^meta-.*\.json$/.test(n)) {
      writeJson(path.join(OUT, n), scrub(readJson(src), workDir));
    } else if (/^(environment|harness)-.*\.txt$/.test(n)) {
      fs.writeFileSync(path.join(OUT, n), scrubString(fs.readFileSync(src, 'utf8').replace(/\u0000/g, ''), workDir));
    } else if (n === 'zip-contents.json') {
      writeJson(path.join(OUT, n), readJson(src));
    }
  }
  const build = readJson(path.join(workDir, 'build', 'build.json'));
  writeJson(path.join(OUT, 'build.json'), build);
  fs.copyFileSync(path.join(workDir, 'build', 'instruments', 'b', build.buildId, 'manifest.json'), path.join(OUT, 'manifest.json'));
  writeJson(path.join(OUT, 'engines.json'), readJson(path.join(workDir, 'engines', 'engines.json')));
  const pw = readJson(path.join(workDir, 'node', 'node_modules', 'playwright-core', 'package.json')).version;
  return { pw, imageDigest: fs.existsSync(path.join(outDir, 'image-digest.txt')) ? fs.readFileSync(path.join(outDir, 'image-digest.txt'), 'utf8').trim() : null };
}

// ---- 2. device reports (real phones) -----------------------------------------------------------------
const MOBILE = /Android|iPhone|iPad|iPod|Mobile/;
function engineFamily(ua) {
  if (/iPhone|iPad|iPod/.test(ua)) return 'webkit'; // iOS browsers run on WebKit, except where a region allows other engines
  if (/Firefox\//.test(ua)) return 'firefox';
  if (/Chrome\/|Chromium\/|Edg\//.test(ua)) return 'chromium';
  if (/AppleWebKit\//.test(ua)) return 'webkit';
  return 'unknown';
}
function loadDevices() {
  const dir = path.join(OUT, 'devices');
  const out = {};
  if (!fs.existsSync(dir)) return out;
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.json')).sort()) {
    const raw = fs.readFileSync(path.join(dir, f), 'utf8');
    assertClean(raw, `devices/${f}`);
    const d = JSON.parse(raw);
    if (d.schema !== 'w0-s02/report@1' || !Array.isArray(d.sessions) || !d.sessions.length) throw new Error(`devices/${f}: not a w0-s02/report@1 with sessions`);
    const ua = (d.device && d.device.user_agent) || '';
    if (!MOBILE.test(ua) && !ALLOW_DESKTOP) throw new Error(`devices/${f}: the user agent is not a phone or tablet (use --allow-desktop only for a test of this script)`);
    const id = f.replace(/\.json$/, '').replace(/[^A-Za-z0-9._-]/g, '-');
    const family = engineFamily(ua);
    const flat = d.sessions.map((s) => metrics(wrapDeviceSession(s, { id, engine_family: family })));
    out[id] = { id, engine_family: family, device: d.device, declared: d.sessions.map((s) => s.declared).filter(Boolean)[0] || null, kit_build: d.kit && d.kit.build, sessions: d.sessions, flat, cell: summarizeCell(flat), file: `devices/${f}`, sha256: sha256(raw) };
  }
  return out;
}

// ---- 3. compose --------------------------------------------------------------------------------------
function compose(prov) {
  const files = fs.readdirSync(OUT).filter((n) => /^results-.*\.json$/.test(n)).sort().map((n) => readJson(path.join(OUT, n)));
  const build = readJson(path.join(OUT, 'build.json'));
  const manifest = readJson(path.join(OUT, 'manifest.json'));
  const zips = fs.existsSync(path.join(OUT, 'zip-contents.json')) ? readJson(path.join(OUT, 'zip-contents.json')) : [];
  const emulated = summarize(files);
  const devices = loadDevices();
  const budget = deriveBudget(emulated, build, Object.fromEntries(Object.values(devices).map((d) => [d.id, { engine_family: d.engine_family, cell: d.cell }])));

  const flat = files.filter((f) => f.plan !== 'ui').flatMap((f) => f.sessions.map((rec) => ({ rec, f, m: metrics({ ...rec, engine: f.engine, tier: f.tier }) })));
  const cold = flat.filter((x) => x.m.kind === 'first-visit');
  const warm = flat.filter((x) => x.m.kind === 'return-visit');
  const assets = build.manifest.assets;
  const WIRE = build.manifest.wireBytes;
  const RAW = build.manifest.bytes;
  const BR = build.manifest.brotli11Bytes;
  const unshaped = (x) => !(x.rec.env && x.rec.env.link);
  // a session whose download the service worker never finished is a finding of the link plan (checked below), not a failed session
  const stopped = (x) => !!x.m.fill_failed;

  // first load
  const wheel = assets.find((a) => a.path.endsWith('.whl'));
  const stdlib = assets.find((a) => a.path.endsWith('python_stdlib.zip'));
  const zipRepeat = ((zips.find((z) => z.file.endsWith('.whl')) || {}).repeated_large_entries || [])[0] || null;
  const observed = {};
  for (const x of cold.filter(unshaped)) (observed[x.f.engine] ||= new Set()).add(x.m.fill_wire_bytes);
  const serverLogged = new Set(cold.filter(unshaped).map((x) => x.rec.requests.by_site.instruments.engine_body_bytes));
  const first_load = {
    files: assets.map((a) => ({ file: a.path.split('/').pop(), raw_bytes: a.bytes, gzip5_bytes: a.wire, brotli11_bytes: a.brotli11, sha256: a.sha256 })),
    raw_bytes: RAW, gzip5_bytes: WIRE, brotli11_bytes: BR,
    gzip5_mb: round1(WIRE / 1e5) / 10, gzip5_mib: Math.round((WIRE / 1048576) * 100) / 100, raw_mb: round1(RAW / 1e5) / 10,
    observed_wire_bytes_by_engine: Object.fromEntries(Object.entries(observed).map(([k, v]) => [k, [...v]])),
    server_logged_engine_body_bytes: [...serverLogged],
    if_zip_like_files_sent_raw_bytes: WIRE - wheel.wire - stdlib.wire + wheel.bytes + stdlib.bytes,
    above_5_000_000: { gzip5: WIRE > 5000000, brotli11: BR > 5000000 },
    above_5_242_880: { gzip5: WIRE > 5242880, brotli11: BR > 5242880 },
    duplicate_in_wheel: zipRepeat,
    wire_basis: manifest.wire_encoding,
  };

  // checks
  const checks = [];
  const check = (id, pass, detail) => checks.push({ id, pass: !!pass, detail });
  const bad = flat.filter((x) => !stopped(x) && (x.rec.error || (x.rec.session && x.rec.session.harness_timeout_ms) || x.m.interrupted || (x.rec.session && x.rec.session.errors && x.rec.session.errors.length)));
  const tiers = [...new Set(files.filter((f) => f.plan !== 'ui').map((f) => f.tier))];
  const engines = [...new Set(files.map((f) => f.engine))];
  check('every session ran to the end without an error', flat.length > 0 && bad.length === 0,
    `${flat.length} sessions in ${engines.length} engines across ${tiers.length} container configurations (${tiers.join(', ')}); sessions with an error, a timeout or an interrupted run: ${bad.length}${bad.length ? ' (' + bad.map((x) => `${x.f.tier} ${x.f.engine} ${x.rec.label}`).join('; ') + ')' : ''}; sessions whose download did not finish, counted apart: ${flat.filter(stopped).length}`);
  const notOk = flat.filter((x) => !x.m.ok && !stopped(x));
  check('the roadmap starter returned "5.3.1 sat [...] unsat" with a checked witness in every session', notOk.length === 0, `${flat.length - flat.filter(stopped).length - notOk.length} of ${flat.length - flat.filter(stopped).length} sessions whose download finished; the model is checked against the property, never matched by value`);
  const gated = cold.filter((x) => x.rec.session.caps_at_start && x.rec.session.caps_at_start.needsConsent);
  check('an uncached engine above the threshold is refused without consent', gated.length > 0 && gated.every((x) => x.rec.session.consent_gate && x.rec.session.consent_gate.without_consent === 'consent-required'),
    `${gated.length} first-visit sessions: run without consent returned consent-required with the manifest's size (${[...new Set(gated.map((x) => x.rec.session.consent_gate && x.rec.session.consent_gate.detail))].join(', ')})`);
  const coldDone = cold.filter((x) => !stopped(x));
  const filled = coldDone.filter((x) => x.rec.session.fill && x.rec.session.fill.mode === 'service-worker');
  check('the service worker filled all six engine files, each verified against the manifest hash, and rejected none', filled.length === coldDone.length && filled.every((x) => x.rec.session.fill.filled === assets.length && x.rec.session.fill.rejected.length === 0 && x.rec.session.fill.bytes === RAW),
    `${filled.length} of ${coldDone.length} first-visit sessions whose download finished filled ${assets.length} of ${assets.length} files, ${RAW} bytes unpacked`);
  const plainCold = cold.filter(unshaped);
  check('the bytes on the wire equal the manifest\'s gzip level 5 total, as the browser reports them and as the server logged them', plainCold.length > 0 && plainCold.every((x) => x.m.fill_wire_bytes === WIRE && x.rec.requests.by_site.instruments.engine_body_bytes === WIRE),
    `${plainCold.length} first-visit sessions on an unshaped link: ${WIRE} bytes by Resource Timing or Content-Length and by the server log`);
  check('the first load is above 5 MB whether the host sends gzip level 5 or Brotli 11', WIRE > 5242880 && BR > 5242880, `gzip level 5 ${WIRE} bytes, Brotli 11 ${BR} bytes, raw ${RAW} bytes; both above 5,000,000 and 5,242,880`);
  const kept = warm.filter((x) => !(x.rec.env && x.rec.env.offline && x.rec.env.offline.length));
  check('after a browser restart the framed cache holds all six files, the service worker controls the frame from load, and no engine byte reaches the server', kept.length > 0 && kept.every((x) => x.m.cache_entries_at_start === assets.length && x.m.controlled_at_load === true && x.m.marker_present === true && x.m.engine_fetches_other === 0 && x.m.engine_requests_to_server === 0),
    `${kept.length} return-visit sessions: cache 6 of 6, controlled at load, frame marker present, every engine fetch from the engine cache, 0 engine requests to the server`);
  const off = flat.filter((x) => x.rec.env && x.rec.env.offline && x.rec.env.offline.length);
  check('with the instrument host answering 503 to every request, the restarted browser still ran Z3 from the cache', off.length > 0 && off.every((x) => x.m.ok && x.m.cache_entries_at_start === assets.length && x.m.engine_requests_to_server === 0),
    `${off.length} offline sessions (${off.map((x) => `${x.f.engine}`).join(', ')}): verdict returned, 0 engine requests`);
  const tos = flat.filter((x) => x.rec.session && x.rec.session.timeout_case);
  check('the timeout case never returned in a browser either: the wall-clock watchdog stopped the worker, and the next request ran', tos.length > 0 && tos.every((x) => x.rec.session.timeout_case.returned === false && x.rec.session.timeout_case.stopped_by === 'terminated' && x.rec.session.timeout_case.next_request && x.rec.session.timeout_case.next_request.ok),
    `${tos.length} engines (${tos.map((x) => x.f.engine).join(', ')}): s.set('timeout', 2000) on the cubes query had not returned when the 25 s watchdog ended the worker; the next request's verdict came ${tos.map((x) => `${x.rec.session.timeout_case.next_request.to_verdict_ms} ms`).join(', ')} later`);
  const withCases = flat.filter((x) => x.rec.session && x.rec.session.cases);
  const caseOk = (c) => c.unknown && c.unknown.verdict === 'unknown' && /incomplete \(theory arithmetic\)/.test(c.unknown.reason) &&
    c.fixedpoint && c.fixedpoint.canread_1_3 === 'sat' && c.fixedpoint.canread_1_4 === 'unsat' && c['bv64-wrap'] && c['bv64-wrap'].verdict === 'sat' && c['bv64-wrap'].witness_ok === true;
  check('the unknown case, Fixedpoint with stratified negation and the 64-bit recipient wrap give the recorded answers in a browser', withCases.length > 0 && withCases.every((x) => caseOk(x.rec.session.cases)),
    `${withCases.length} sessions: x**y == 8 with y > 1 gives unknown "incomplete (theory arithmetic)"; canread(1,3) sat and the revoked canread(1,4) unsat; B >= 0, M > 0, B + M < 0 over BitVec 64 is sat with a checked witness`);
  const ladders = flat.filter((x) => x.rec.session && x.rec.session.rlimit_ladder);
  const allUnknown = ladders.every((x) => x.rec.session.rlimit_ladder.every((r) => r.verdict === 'unknown'));
  const reasons = [...new Set(ladders.flatMap((x) => x.rec.session.rlimit_ladder.map((r) => `${r.case}@${r.rlimit}: ${r.reason}`)))].sort();
  check('every rlimit-bounded run on the hard queries ended in unknown, so the budget is what stopped it', ladders.length > 0 && allUnknown, `${ladders.length} sessions x 6 runs; reasons seen: ${reasons.join('; ')}`);
  const noCsp = flat.every((x) => !(x.rec.session && x.rec.session.env && x.rec.session.env.csp_violations && x.rec.session.env.csp_violations.length) && !(x.rec.session && x.rec.session.frame_at_end && x.rec.session.frame_at_end.csp_violations && x.rec.session.frame_at_end.csp_violations.length));
  check('no page reported a CSP violation under the instrument and main-origin meta CSPs of ARCHITECTURE.md section 15.4', noCsp, `${flat.length} sessions`);
  // the page's own buttons, as a person uses them
  const uiRows = files.filter((f) => f.plan === 'ui').flatMap((f) => f.sessions.map((r) => ({ engine: f.engine, r })));
  const uiOk = (r) => !r.error && r.ui && r.ui.cards >= 1 && r.ui.report && r.ui.report.schema === 'w0-s02/report@1' && r.ui.report.sessions === 1 &&
    r.ui.report.declared && /test of the page/.test(r.ui.report.declared.device) && r.ui.download === 'w0-s02-report.json' &&
    /cleared the engine cache/.test(r.ui.status_after_evict || '') && r.ui.cards_after_clear === 0 && !(r.ui.page_errors || []).length;
  check('the page\'s own buttons work in every engine: Run made a session card, Copy filled a report that parses and carries what was typed in the fields, Save offered a file, and the two clearing buttons did what they say',
    uiRows.length === engines.length && uiRows.every(({ r }) => uiOk(r)),
    uiRows.map(({ engine, r }) => `${engine}: ${r.error ? 'error' : `${r.ui.cards} card, report of ${r.ui.report.sessions} session, file ${r.ui.download}, ${r.ui.cards_after_clear} cards after clearing the list`}`).join('; '));
  // the CPU quota must reach the worker: the point of using it in place of DevTools throttling
  const jsBy = (tier, engine) => emulated.tiers[tier] && emulated.tiers[tier][engine] && emulated.tiers[tier][engine].yardstick.js_ms ? emulated.tiers[tier][engine].yardstick.js_ms.median : null;
  const ratios = {};
  for (const e of engines) for (const t of tiers.filter((x) => x !== RULE.unthrottled_tier && /^cpu/.test(x))) {
    const a = jsBy(t, e); const b = jsBy(RULE.unthrottled_tier, e);
    if (a && b) (ratios[t] ||= {})[e] = Math.round((a / b) * 100) / 100;
  }
  const slowestRatios = Object.values(ratios['cpu0.25'] || {});
  check('the CPU quota reaches the worker: the fixed JavaScript loop inside it runs at least twice as slow at 0.25 CPUs as unthrottled, in every engine', slowestRatios.length === engines.length && slowestRatios.every((r) => r >= 2),
    `loop time at each tier over the unthrottled tier: ${JSON.stringify(ratios)}`);
  // link arithmetic vs shaped-link runs
  const linkRows = [];
  const linkAll = [];
  for (const [name, byEngine] of Object.entries(emulated.link)) for (const [engine, list] of Object.entries(byEngine)) for (const r of list) {
    linkAll.push({ name, engine, ...r });
    if (r.ok) linkRows.push({ name, engine, fill_mode: r.fill_mode, mbps: r.link.bps / 1e6, rtt_ms: r.link.rttMs, measured_fill_ms: r.fill_ms });
  }
  // every shaped-link session either finished or says why not: the worker was stopped and started again during the fill, and the
  // browser closed the connection of the file it was reading
  const unfinished = linkAll.filter((r) => !r.ok);
  check('every session through a shaped link either ran to the end or recorded why its download did not finish: the service worker stopped and started again, the browser closed the file it was reading, and a second request with the heartbeat finished the download from the files the cache kept',
    linkAll.length > 0 && unfinished.every((r) => r.fill_failed && r.sw_restarted === true && r.closed_by_browser && r.after_stop && r.after_stop.cached_files < r.after_stop.of &&
      r.retry && r.retry.ok && r.retry.skipped === r.after_stop.cached_files && r.retry.filled === r.after_stop.of - r.after_stop.cached_files && r.retry.cached_files_after === assets.length),
    `${linkAll.length} link sessions, ${unfinished.length} did not finish${unfinished.length ? ': ' + unfinished.map((r) => `${r.engine} ${r.link.bps / 1e6} Mbit/s with ${r.fill_mode} fill (${r.fill_failed}, worker restarted ${r.sw_restarted}, ${r.closed_by_browser ? `the browser closed ${r.closed_by_browser.file} at ${Math.round(r.closed_by_browser.after_first_engine_request_ms / 100) / 10} s` : 'no closed connection seen'}; the cache then held ${r.after_stop ? `${r.after_stop.cached_files} of ${r.after_stop.of}` : '?'} files; the second request ${r.retry ? `skipped ${r.retry.skipped}, fetched ${r.retry.filled} in ${r.retry.ms} ms, and the cache then held ${r.retry.cached_files_after}` : 'was not made'})`).join('; ') : ''}`);
  // engine behaviors seen in the sessions that are not measurements but that a later task may trip over
  const quirks = { async_instantiate_in_the_pyodide_worker: {}, firefox_legacy_exception_handling_warning: {}, storage_quota_bytes: {}, storage_persisted_values: {} };
  for (const e of engines) {
    const rows = flat.filter((x) => x.f.engine === e);
    const asyncRows = rows.filter((x) => x.m.cpu_wasm_async);
    quirks.async_instantiate_in_the_pyodide_worker[e] = { sessions: asyncRows.length, did_not_settle_in_5_s: asyncRows.filter((x) => x.m.cpu_wasm_async.settled === false).length };
    quirks.firefox_legacy_exception_handling_warning[e] = { sessions: rows.length, with_the_warning: rows.filter((x) => (x.rec.console || []).some((l) => /exception handling 'try' instruction is deprecated/.test(l))).length };
    quirks.storage_quota_bytes[e] = [...new Set(rows.map((x) => x.rec.session && x.rec.session.env && x.rec.session.env.storage_estimate && x.rec.session.env.storage_estimate.quota).filter((v) => v != null))];
    quirks.storage_persisted_values[e] = [...new Set(rows.map((x) => x.rec.session && x.rec.session.env && x.rec.session.env.storage_persisted))];
  }
  // how often each reason string came back for each rlimit run, over every session that ran the ladder
  const rlimitReasons = {};
  for (const x of flat) for (const r of (x.rec.session && x.rec.session.rlimit_ladder) || []) {
    const k = `${r.case} @ ${r.rlimit}`;
    const t = (rlimitReasons[k] ||= {});
    t[`${r.verdict}: ${r.reason}`] = (t[`${r.verdict}: ${r.reason}`] || 0) + 1;
  }
  // the same rule with each emulated tier as the reference, so that the sensitivity to that choice can be read
  const budgetByTier = Object.fromEntries(Object.keys(emulated.tiers).sort().map((t) => {
    const b = deriveBudget(emulated, build, {}, { ...RULE, reference_tier: t });
    return [t, { ...b.budget_ms, cold_live_ms_by_link: Object.fromEntries(Object.entries(b.cold_live_by_link).map(([k, v]) => [k, v.budget_ms])) }];
  }));
  return { files, build, manifest, zips, emulated, devices, budget, budgetByTier, flat, checks, first_load, ratios, linkRows, linkAll, assets, quirks, rlimitReasons };
}

// ---- 4. the record ------------------------------------------------------------------------------------
function link_validation(c) {
  const rows = c.linkRows.map((r) => {
    const modeled = c.assets.reduce((n, a) => n + r.rtt_ms + (a.wire * 8 * 1000) / (r.mbps * 1e6), 0);
    return { link: r.name, engine: r.engine, fill_mode: r.fill_mode, mbps: r.mbps, rtt_ms: r.rtt_ms, measured_fill_ms: r.measured_fill_ms, arithmetic_ms: Math.round(modeled), measured_over_arithmetic: Math.round((r.measured_fill_ms / modeled) * 1000) / 1000 };
  });
  return rows;
}

function main() {
  let prov;
  if (!MERGE) {
    const [workDir, outDir] = positional;
    if (!workDir || !outDir) { console.error('usage: node record.mjs <work-dir> <out-dir> <runs-dir> | node record.mjs --merge-devices [--runs <dir>] [--allow-desktop]'); process.exit(2); }
    const g = gather(path.resolve(workDir), path.resolve(outDir));
    const metas = fs.readdirSync(OUT).filter((n) => /^meta-.*\.json$/.test(n)).map((n) => readJson(path.join(OUT, n)));
    const starts = metas.map((m) => Date.parse(m.started_at));
    const ends = metas.map((m) => Date.parse(m.finished_at));
    const env0 = fs.readFileSync(path.join(OUT, fs.readdirSync(OUT).find((n) => /^environment-/.test(n))), 'utf8');
    const inputs = [];
    const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => { const p = path.join(d, e.name); if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p); } else inputs.push(p); });
    walk(HERE);
    const inputList = inputs.sort().map((p) => ({ path: path.relative(REPO, p), sha256: sha256(fs.readFileSync(p)) }));
    const manifestText = inputList.map((i) => `${i.sha256}  ${i.path}\n`).join('');
    prov = {
      started_at: new Date(Math.min(...starts)).toISOString(), finished_at: new Date(Math.max(...ends)).toISOString(), duration_s: Math.round((Math.max(...ends) - Math.min(...starts)) / 100) / 10,
      recorded_at: new Date().toISOString(), playwright_core: g.pw, image_digest: g.imageDigest,
      node_host: process.version, zlib_host: process.versions.zlib, container_env_first: env0, inputs: inputList, input_sha256: sha256(Buffer.from(manifestText)),
      host: { os: `${os.type()} ${os.release()} ${os.arch()}`, cpu_count: os.cpus().length, ram_gib: Math.round(os.totalmem() / 2 ** 30) },
      docker: (() => { try { return execFileSync('docker', ['--version'], { encoding: 'utf8' }).trim(); } catch { return null; } })(),
    };
    writeJson(path.join(OUT, 'provenance.json'), prov);
  } else {
    prov = readJson(path.join(OUT, 'provenance.json'));
  }

  const c = compose(prov);
  const linkVal = link_validation(c);
  const linkOk = linkVal.length > 0 && linkVal.every((r) => r.measured_over_arithmetic >= 0.9 && r.measured_over_arithmetic <= 1.25);
  c.checks.push({
    id: 'the arithmetic for fetching the engine over a link (a round trip and the transfer for each file, one file after another) matches the runs through the shaped links within -10 % and +25 %',
    pass: linkOk, detail: linkVal.map((r) => `${r.link} ${r.engine} ${r.fill_mode} fill: measured ${r.measured_fill_ms} ms, arithmetic ${r.arithmetic_ms} ms`).join('; '),
  });
  const pass = c.checks.every((x) => x.pass);

  // summary.json: the derived tables
  const summary = {
    schema: 'w0-s02/summary@1', build: c.build.buildId, first_load: c.first_load, emulated: c.emulated,
    link_validation: linkVal,
    devices: Object.fromEntries(Object.values(c.devices).map((d) => [d.id, { engine_family: d.engine_family, device: d.device, declared: d.declared, kit_build: d.kit_build, cell: d.cell, sessions: d.flat.map((m) => ({ label: m.label, kind: m.kind, since_first_fill_ms: m.since_first_fill_ms, online: m.online, cache_entries_at_start: m.cache_entries_at_start, controlled_at_load: m.controlled_at_load, marker_present: m.marker_present, interrupted: m.interrupted, ok: m.ok })) }])),
    yardstick_ratio_to_unthrottled: c.ratios,
    engine_behaviors: c.quirks,
    rlimit_reasons: c.rlimitReasons,
    budget: c.budget,
    budget_by_reference_tier: c.budgetByTier,
  };
  writeJson(path.join(OUT, 'summary.json'), summary);
  writeJson(path.join(OUT, 'budget.json'), c.budget);
  fs.writeFileSync(path.join(OUT, 'budget.md'), toMarkdown(c.budget) + '\n');

  // verdict lines
  const lines = [];
  const T = c.emulated.tiers;
  for (const tier of Object.keys(T)) for (const engine of Object.keys(T[tier])) {
    const cell = T[tier][engine];
    const m = (g, k) => (cell[g] && cell[g][k] ? cell[g][k].median : null);
    const l5 = cell.ladder['rlimit-nia:5000000'] && cell.ladder['rlimit-nia:5000000'].solve_ms ? cell.ladder['rlimit-nia:5000000'].solve_ms.median : null;
    lines.push(`${tier} ${engine} | yardstick JS ${cell.yardstick.js_ms ? cell.yardstick.js_ms.median : '-'} ms | cold: fill ${m('cold', 'fill_ms')} ms, ready ${m('cold', 'ready_ms')} ms, start to first verdict ${m('cold', 'engine_start_ms')} ms, consent to verdict ${m('cold', 'consent_to_verdict_ms')} ms | warm: ready ${m('warm', 'ready_ms')} ms, start to first verdict ${m('warm', 'engine_start_ms')} ms | restart to verdict ${cell.respawn_to_verdict_ms ? cell.respawn_to_verdict_ms.median : '-'} ms | rlimit 5e6 cubes ${l5} ms | engine heap ${cell.heap_mib.after_import_z3} MiB | medians of ${cell.cold.n} cold and ${cell.warm.n} warm sessions`);
  }
  for (const [name, byEngine] of Object.entries(c.emulated.link)) for (const [engine, list] of Object.entries(byEngine)) for (const r of list) {
    lines.push(`link ${name} (${r.link.bps / 1e6} Mbit/s, ${r.link.rttMs} ms) ${engine} | ${r.fill_mode} fill | ${r.ok ? `fill ${r.fill_ms} ms, consent to verdict ${r.consent_to_verdict_ms} ms` : `no reply in ${r.fill_failed_after_ms} ms, worker restarted ${r.sw_restarted}${r.closed_by_browser ? `, the browser closed ${r.closed_by_browser.file} after ${r.closed_by_browser.sent_bytes} of ${r.closed_by_browser.body_bytes} bytes, ${r.closed_by_browser.after_first_engine_request_ms} ms after the first engine file was requested` : ''}${r.retry ? `; then the cache held ${r.after_stop ? r.after_stop.cached_files : '?'} files, and a second request skipped ${r.retry.skipped} and fetched ${r.retry.filled} in ${r.retry.ms} ms` : ''}`}`);
  }
  for (const [id, d] of Object.entries(c.devices)) lines.push(`device ${id} (${d.engine_family}) | ${d.sessions.length} sessions | real device`);
  if (!Object.keys(c.devices).length) lines.push('real devices: none recorded; the figures above are an emulation (docs/spikes/W0-S02.md section 3), and owner action 1 of section 7 records the phones');

  const meta = {};
  for (const n of fs.readdirSync(OUT).filter((x) => /^meta-.*\.json$/.test(x))) meta[n.replace(/^meta-|\.json$/g, '')] = readJson(path.join(OUT, n));
  const tierCpus = (label) => ({ cpu20: 20, 'cpu1': 1, 'cpu0.5': 0.5, 'cpu0.25': 0.25 }[label] ?? null);
  const configs = [];
  const seen = new Set();
  for (const f of c.files) {
    const key = `${f.tier}/${f.plan}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const cpus = tierCpus(f.tier);
    const quota = cpus && cpus !== 20 ? ['--cpu-period=10000', `--cpu-quota=${cpus * 10000}`] : [];
    const engineList = c.files.filter((x) => x.tier === f.tier && x.plan === f.plan).map((x) => x.engine);
    configs.push({
      id: key, emulated: true, label: `${f.plan} plan, ${cpus === 20 ? 'no CPU quota' : `${cpus} CPUs by CFS quota`}, ${engineList.join(', ')}`,
      argv: ['docker', 'run', '--rm', '--init', '--name', `w0s02-${f.tier}-${f.plan}`, '--memory=6g', '--shm-size=1g', ...quota, '-e', `LABEL=${f.tier}`, '-e', `PLAN=${f.plan}`, '-e', `ENGINES=${engineList.join(',')}`, '-e', 'REPEAT=3', '-v', '<scripts/spikes/W0-S02>:/s:ro', '-v', '<work-dir>:/work', 'mcr.microsoft.com/playwright:v1.63.0-noble', 'bash', '/s/container.sh'],
      cpu_quota: cpus === 20 ? null : { cpus, period_us: 10000, quota_us: cpus * 10000 },
      host_load_average: meta[`${f.tier}-${f.plan}`] ? { start: meta[`${f.tier}-${f.plan}`].load_start, end: meta[`${f.tier}-${f.plan}`].load_end } : null,
      outputs: c.files.filter((x) => x.tier === f.tier && x.plan === f.plan).map((x) => `runs/${ID}/results-${x.tier}-${x.plan}-${x.engine}.json`),
    });
  }
  for (const d of Object.values(c.devices)) {
    configs.push({ id: `device/${d.id}`, emulated: false, label: `real device report: ${d.declared && d.declared.device ? d.declared.device : 'not declared'}`, engine_family: d.engine_family, sessions: d.sessions.length, report: `runs/${ID}/${d.file}`, report_sha256: d.sha256, user_agent: d.device && d.device.user_agent });
  }

  const outputs = fs.readdirSync(OUT, { recursive: true, withFileTypes: false }).filter((n) => fs.statSync(path.join(OUT, n)).isFile()).sort().map((n) => ({ path: `runs/${ID}/${n}`, sha256: sha256(fs.readFileSync(path.join(OUT, n))), bytes: fs.statSync(path.join(OUT, n)).size }));
  const engines = readJson(path.join(OUT, 'engines.json'));
  const UA = {};
  for (const f of c.files) { const s = f.sessions.find((r) => r.user_agent); if (s && !UA[f.engine]) UA[f.engine] = s.user_agent; }
  const ver = { chromium: (UA.chromium || '').match(/Chrome\/([\d.]+)/), firefox: (UA.firefox || '').match(/Firefox\/([\d.]+)/), webkit: (UA.webkit || '').match(/Version\/([\d.]+)/) };
  const loadAvg = Object.values(meta).flatMap((m) => [m.load_start && m.load_start[0], m.load_end && m.load_end[0]]).filter((x) => x != null);

  const real = Object.keys(c.devices).length;
  const imageRef = prov.image_digest ? `mcr.microsoft.com/playwright:v1.63.0-noble@${prov.image_digest.split('@')[1]}` : null;
  const record = {
    id: ID,
    title: 'Pyodide 314.0.7 with the Z3 5.3.1 wheel on phones: first-load size, load time, memory, rlimit timing and cache persistence; an emulation on three desktop engines, and real-device sessions when they are on file (W0-S02)',
    task: 'W0-S02',
    status: real ? `real-device reports merged: ${real}` : 'emulated only: no real device is on file; the owner records phones (docs/spikes/W0-S02.md section 7)',
    engine: 'z3',
    version: '5.3.1',
    version_string: c.emulated.tiers[Object.keys(c.emulated.tiers)[0]] ? '5.3.1' : null,
    binary: 'z3_solver-5.3.1.0-py3-none-pyemscripten_2026_0_wasm32.whl from PyPI, loaded by pyodide.loadPackage in a module worker on the instrument origin',
    binary_sha256: engines.z3.sha256,
    runtime: {
      pyodide: { version: engines.pyodide.version, npm_tarball: engines.pyodide.url, npm_integrity: engines.pyodide.integrity, tarball_sha256: engines.pyodide.tarballSha256, license: engines.pyodide.license, engine_files: c.assets.map((a) => ({ file: a.path.split('/').pop(), bytes: a.bytes, sha256: a.sha256 })) },
      z3_wheel: { file: engines.z3.file, bytes: engines.z3.bytes, sha256: engines.z3.sha256 },
      playwright_core: prov.playwright_core,
      browsers: { chromium: ver.chromium && ver.chromium[1], firefox: ver.firefox && ver.firefox[1], webkit: ver.webkit && ver.webkit[1], webkit_build: "Playwright's WPE port on Linux, not Safari" },
      user_agents: UA,
    },
    image: imageRef,
    recorded_at: prov.recorded_at,
    started_at: prov.started_at,
    duration_s: prov.duration_s,
    argv: [['bash', 'scripts/spikes/W0-S02/run.sh', '<work-dir>'], ['node', 'scripts/spikes/W0-S02/record.mjs', '<work-dir>', '<work-dir>/out/<run-stamp>', 'runs']], // `run.sh <work-dir> --record` runs the two in this order
    inputs: prov.inputs,
    input_sha256: prov.input_sha256,
    input_sha256_method: 'SHA-256 of the sha256sum-style manifest of inputs[], one "<sha256>  <path>\\n" line per file, sorted by path',
    budget: {
      cpu_tiers: { 'cpu20': 'no quota (the host has 20 CPUs)', cpu1: '1 CPU', 'cpu0.5': '0.5 CPUs', 'cpu0.25': '0.25 CPUs', cfs_period_us: 10000 },
      sessions_per_engine_per_tier: 'matrix: cold-1 (every case, the rlimit ladder, a worker restart), warm-1 (the same after a browser restart), warm-2 and warm-3 (restarts, engine start only), cold-2 and cold-3 (fresh profiles, engine start only)',
      extras: 'at no quota: an offline restart (instrument host answers 503) and the 25 s timeout case',
      links: 'at no quota, cold sessions through a shaped link: 10 Mbit/s with 50 ms round trip, and 1.6 Mbit/s with 150 ms, the fill as planned (one message to the service worker, called failed after 180 s without a reply); and at 1.6 Mbit/s once more with the host sending the service worker a message every 15 s during the fill',
      z3_rlimit: { starter: 5000000, ladder: [100000, 1000000, 5000000], queries: ['rlimit-nia: x*x*x + y*y*y == z*z*z over Int, x, y, z > 2 (the query of RUN-z3-budget-pyodide)', 'rlimit-bv: factoring a 62-bit semiprime in BitVec 64'] },
      timeout_case_watchdog_ms: 25000,
      container_memory: '6g', containers_at_once: 1, consent_threshold_bytes: 5000000,
      derivation: { margin: RULE.margin, round_ms: RULE.round_ms, reference_tier: RULE.reference_tier, links: RULE.links },
    },
    exit_code: 0,
    exit_code_note: 'the harness and the recorder exited 0; each acceptance check is in checks[]',
    verdict_lines: lines,
    outputs,
    environment: {
      os: prov.host.os, cpu_count: prov.host.cpu_count, ram_gib: prov.host.ram_gib,
      container: { runtime: 'docker', image: 'mcr.microsoft.com/playwright:v1.63.0-noble', digest: imageRef ? imageRef.split('@')[1] : null, run_flags: ['--rm', '--init', '--memory=6g', '--shm-size=1g', '(CPU tiers add --cpu-period=10000 --cpu-quota=<cpus x 10000>)'], network: 'loopback inside the container; plain HTTP on localhost, one port per origin' },
      host_tools: { node: prov.node_host, node_zlib: prov.zlib_host, docker: prov.docker },
      container_environment: prov.container_env_first,
      load_average_range: loadAvg.length ? { min: Math.min(...loadAvg), max: Math.max(...loadAvg) } : null,
      load_note: 'other tasks used the machine and Docker at the same time, so unthrottled timings are indicative; the quota tiers are less affected while the host has idle CPUs',
      emulated: [
        'Phones: none was available. The CPU of a phone is emulated by a CFS quota on the whole container (every browser thread, the worker included), because DevTools CPU throttling did not reach the cross-origin worker [X RUN-browser-origin]; the fixed loops in the worker are the yardstick.',
        'Networks: a shared-link shaper in the stand-in server (bandwidth and a round trip per response); the links are chosen, not measured.',
        'Hosting: plain HTTP on localhost, two ports for two origins (same site, cross origin), with the headers and the gzip level 5 bytes that RUN-pglite-0511 found GitHub Pages sending; not GitHub Pages, no DNS, no TLS.',
        'Browsers: Playwright builds on Linux (Chromium, Firefox, and WebKit as its WPE port), headless; not Chrome for Android or Safari on iOS.',
        'Elapsed time: restarts seconds apart on a persistent profile; no days elapsed.',
      ],
    },
    configs,
    real_devices: {
      count: real,
      status: real ? 'merged' : 'none recorded',
      protocol: 'docs/spikes/W0-S02.md section 7',
      merge: 'save each device\'s copied report as runs/RUN-phone-pyodide/devices/<name>.json, then run: node scripts/spikes/W0-S02/record.mjs --merge-devices',
    },
    values: {
      build_id: c.build.buildId,
      pyodide: engines.pyodide.version, z3_wheel: engines.z3.version, z3: '5.3.1',
      first_load: c.first_load,
      yardstick_ratio_to_unthrottled: c.ratios,
      engine_behaviors: c.quirks,
      rlimit_reasons: c.rlimitReasons,
      link_validation: linkVal,
      boot_budget: c.budget,
      boot_budget_by_reference_tier: c.budgetByTier,
      summary_file: `runs/${ID}/summary.json`,
    },
    checks: c.checks,
    pass,
    observations: {
      engines: c.emulated.tiers,
      extras: c.emulated.extras,
      link: c.emulated.link,
      devices: Object.fromEntries(Object.values(c.devices).map((d) => [d.id, d.cell])),
    },
    notes: [
      'Question: how does Pyodide with the Z3 5.3.1 wheel behave on phones, from the instrument origin: load time, first-load size, memory, rlimit timing and cache persistence across sessions, and in browsers the timeout, unknown and Fixedpoint cases?',
      real ? 'Real devices: see configs[] with emulated false and values.boot_budget.reference.' : 'Answer on this machine: an emulation only. No phone was available, so every figure below that is not about bytes is a stand-in for a phone, and values.boot_budget is provisional.',
      'First-load sizes are exact: the same bytes in every engine, as the browser reports them (Resource Timing or Content-Length) and as the server logged them. What is assumed is the host: gzip level 5 is what GitHub Pages sent for four small public files [X RUN-pglite-0511], and no file as large as pyodide.asm.wasm has been measured there.',
      'rlimit is not a time budget. The same rlimit took a different wall time on the two query types, the second query ended sooner at 5e6 than at 1e6 once the SAT core cancelled itself, and the reason string changes with the stage that stopped (see checks[]).',
      'The yardstick (a fixed xorshift loop in JavaScript and in WebAssembly, run in the worker) is the common scale between the emulated tiers and a phone: a device report carries the same loop.',
      'WebAssembly.instantiate(bytes) did not settle in some Playwright WebKit sessions once Pyodide had loaded in the same worker; each session records the outcome (cpu.wasm_async_instantiate), and the yardstick times a module made by the synchronous constructors.',
      'The planned fill (one message to the instrument service worker, which fetches the six files and answers) did not finish in Firefox on the 1.6 Mbit/s link: the browser stopped the worker about a minute in. A message to the worker every 15 s let the same fill finish in all three engines (docs/spikes/W0-S02.md section 4.8; verdict_lines, checks[] and observations.link carry the figures).',
      'History of the link plan: its first attempt had no deadline on the fill, Firefox never answered at 1.6 Mbit/s, and that container was stopped by hand. The kit then gained the 180 s deadline, the check of the worker instance and the heartbeat variant, and the whole emulated run (every plan) was repeated on the changed kit. No figure of the first attempt is used here.',
    ],
  };
  assertClean(JSON.stringify(record), `${ID}.json`);
  writeJson(path.join(RUNS_DIR, `${ID}.json`), record);
  console.log(`${ID}: ${c.flat.length} emulated sessions, ${real} real devices, ${c.checks.length} checks, pass ${pass}`);
  for (const k of c.checks.filter((x) => !x.pass)) console.log(`  FAIL ${k.id}: ${k.detail}`);
  if (!pass) process.exitCode = 1;
}

try {
  main();
} catch (err) {
  console.error(`record.mjs: ${err && err.message ? err.message : err}`);
  process.exit(2);
}
