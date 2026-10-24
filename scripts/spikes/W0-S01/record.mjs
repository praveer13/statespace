// W0-S01: turn one harness output directory into runs/RUN-origin-subdomain.json and
// runs/RUN-origin-subdomain/. Dependency-free.
//
// Usage: node record.mjs <work-dir> <out-dir> <runs-dir>
//
// Writes, under <runs-dir>/RUN-origin-subdomain/:
//   meta.json        versions, launch flags, build id and origins
//   sessions.jsonl   one line per browser session (engine x configuration x session)
//   negative.jsonl   one line per engine: hostile embedder, host opened top-level
//   topnav.jsonl     one line per engine, configuration and target: top navigation by a never-activated frame
//   matrix.txt       the verdict lines, one per session
//   manifest.json    the engine manifest the service worker verified (paths, SHA-256, sizes)
//   engines.json     the download pins and hashes from fetch-engines.mjs
//   environment.txt, firefox-pref.txt, harness.txt   copied from the container
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../../..');
const ID = 'RUN-origin-subdomain';
const [workDir, outDir, runsDir] = process.argv.slice(2);
if (!workDir || !outDir || !runsDir) { console.error('usage: node record.mjs <work-dir> <out-dir> <runs-dir>'); process.exit(2); }

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const results = readJson(path.join(outDir, 'results.json'));
const engines = readJson(path.join(workDir, 'engines', 'engines.json'));
const build = readJson(path.join(workDir, 'build', 'build.json'));
const manifest = readJson(path.join(workDir, 'build', 'instruments', 'b', build.buildId, 'manifest.json'));
const envText = fs.readFileSync(path.join(outDir, 'environment.txt'), 'utf8');
const env = Object.fromEntries(envText.trim().split('\n').map((l) => [l.slice(0, l.indexOf(':')), l.slice(l.indexOf(':') + 1).trim()]));
const imageDigest = fs.readFileSync(path.join(outDir, 'image-digest.txt'), 'utf8').trim();

// Paths in recorded text are normalized, and in remote mode the real course domain becomes
// <course-domain> (OD-5); nothing private may reach the public repository.
const REMOTE = results.remote === true;
const COURSE_DOMAIN = process.env.COURSE_DOMAIN || '';
if (REMOTE && !COURSE_DOMAIN) { console.error('remote mode needs COURSE_DOMAIN, so it can be scrubbed'); process.exit(2); }
const scrub = (s) => {
  let t = s.split(path.resolve(workDir)).join('<work-dir>').split(os.homedir()).join('<home>')
    .replace(/\/tmp\/w0s01-profiles/g, '<profiles>');
  if (COURSE_DOMAIN) t = t.split(COURSE_DOMAIN).join('<course-domain>');
  return t;
};

const MAIN = build.origins.main;
const DECOY = '/engines/decoy/tampered.bin';
const ASSETS = manifest.engines.z3.assets.length;

// --- checks ------------------------------------------------------------------------------------
const checks = [];
const check = (id, pass, detail) => { checks.push({ id, pass: !!pass, detail }); return !!pass; };
const runOk = (r) => r && r.t === 'result' && r.reply && Array.isArray(r.reply.verdict) &&
  r.reply.verdict[0] === 'sat' && r.reply.verdict[1] === 'unsat' && r.reply.witnessOk === true &&
  r.reply.provenance && r.reply.provenance.version === '5.3.1' && String(r.reply.line).startsWith('5.3.1 ');
const servedEngine = (s) => ((s.diagEnd && s.diagEnd.swLog && s.diagEnd.swLog.served) || []).filter((x) => x.path.includes('/engines/'));
const hostOf = (o) => new URL(o).hostname;
const parentUnreadable = (p) => p &&
  p.parentLocalStorage.threw === 'SecurityError' && p.parentDocumentCookie.threw === 'SecurityError' &&
  p.parentIndexedDB.threw === 'SecurityError' && !p.ownLocalStorageHasToken && !p.ownSessionStorageHasToken &&
  Array.isArray(p.idbDatabases) && !p.idbDatabases.includes('statespace-evidence') && !p.mainShellCacheVisible &&
  !p.hostOnlyCookieVisible && p.worker && Array.isArray(p.worker.idbDatabases) &&
  !p.worker.idbDatabases.includes('statespace-evidence') && !p.worker.cacheNames.includes('main-shell');

const sessions = [];
const matrix = [];
for (const [engine, e] of Object.entries(results.engines)) {
  const perConfig = {};
  for (const [cid, c] of Object.entries(e.configs)) {
    const [s1, s2, s3] = c.sessions;
    const later = [s2, s3].filter(Boolean); // remote mode has no offline session
    const inst = c.instrumentOrigin;
    const all = c.sessions;
    const crossOrigin = all.every((s) => s.handshake && s.handshake.ok && runOk(s.run)) &&
      [s1, s2].every((s) => s.probe && s.probe.worker && s.probe.worker.origin === inst) &&
      s1.harnessFrameCheck && s1.harnessFrameCheck.frameOrigin === inst && inst !== MAIN;
    const storage = [s1, s2].every((s) => parentUnreadable(s.probe)) &&
      s1.harnessFrameCheck.parentLocalStorage.threw === 'SecurityError' &&
      s1.harnessFrameCheck.parentLocationHref.threw === 'SecurityError';
    const consent = s1.runWithoutConsent && s1.runWithoutConsent.code === 'consent-required' &&
      later.every((s) => s.caps && s.caps.cached === true && s.caps.needsConsent === false);
    const integrity = s1.peekBeforeFill && s1.peekBeforeFill.controlled === true && s1.peekBeforeFill.status === 504 &&
      s1.warm && s1.warm.reply && s1.warm.reply.filled === ASSETS &&
      s1.warm.reply.rejected.length === 1 && s1.warm.reply.rejected[0].path.endsWith(DECOY) && s1.capsAfter.cached === true;
    const persist = later.every((s) => s.diagStart && s.diagStart.controlledAtLoad === true &&
      s.diagStart.caches && s.diagStart.caches['ss-engines-v1'] && s.diagStart.caches['ss-engines-v1'].entries === ASSETS &&
      runOk(s.run) && servedEngine(s).length >= ASSETS &&
      servedEngine(s).every((x) => x.from === 'engine-cache' && x.client === 'worker') &&
      !((s.requests.byHost[hostOf(inst)] || {}).engineAssets));
    const offline = REMOTE || (s3 && s3.offlineHosts.includes(hostOf(inst)));
    const evict = REMOTE || (s3 && s3.evict && s3.evict.unregistered === true && s3.evict.cacheNamesAfter.length === 0 && s3.capsAfterEvict.cached === false);
    perConfig[cid] = { crossOrigin, storage, consent, integrity, persist: persist && offline, evict };
    check(`${engine} ${cid}: Z3 runs in a module worker on the instrument origin, framed cross-origin, in all three sessions`, crossOrigin,
      `${inst} framed by ${MAIN}; ${all.map((s) => `s${s.session} ${s.run && s.run.reply ? s.run.reply.line : 'no result'}`).join('; ')}`);
    check(`${engine} ${cid}: the parent's storage is unreadable from the frame and its worker`, storage,
      'window.parent localStorage, document and indexedDB throw SecurityError; the parent\'s marker is absent from the frame\'s localStorage, sessionStorage, IndexedDB list, Cache API names and host-only cookies; same in the worker');
    check(`${engine} ${cid}: consent is enforced before the first load and not asked again from the cache`, consent,
      `s1 without consent: ${s1.runWithoutConsent && s1.runWithoutConsent.code}; cached after restart: ${later.map((s) => `s${s.session} ${s.caps && s.caps.cached}`).join(', ')}`);
    check(`${engine} ${cid}: the service worker caches only bytes whose SHA-256 matches the manifest, and serves engine assets only from that cache`, integrity,
      `before the fill an engine asset came back ${s1.peekBeforeFill && s1.peekBeforeFill.status}; filled ${s1.warm && s1.warm.reply && s1.warm.reply.filled} of ${ASSETS}; rejected ${(s1.warm && s1.warm.reply && s1.warm.reply.rejected || []).map((r) => r.path.split('/').pop()).join(', ')}`);
    check(`${engine} ${cid}: the framed service worker and its engine cache persist across browser restarts${REMOTE ? '' : ', offline included'}`, persist && offline,
      later.map((s) => `s${s.session}: controlled at load ${s.diagStart && s.diagStart.controlledAtLoad}, ${s.diagStart && s.diagStart.caches['ss-engines-v1'] ? s.diagStart.caches['ss-engines-v1'].entries : 0} entries, ${servedEngine(s).filter((x) => x.from === 'engine-cache').length} engine fetches served from the cache to a worker, ${REMOTE ? 'no server request log (remote)' : `${(s.requests.byHost[hostOf(inst)] || {}).engineAssets || 0} engine requests reached the server`}${s.offlineHosts.length ? ', instrument host answering 503' : ''}`).join('; '));
    if (!REMOTE) {
      check(`${engine} ${cid}: evict clears the caches and unregisters the worker`, evict,
        `unregistered ${s3.evict && s3.evict.unregistered}; caches after ${JSON.stringify(s3.evict && s3.evict.cacheNamesAfter)}`);
    }

    for (const s of all) {
      const d = s.diagStart || {};
      const entries = d.caches && d.caches['ss-engines-v1'] ? d.caches['ss-engines-v1'].entries : 0;
      const instReq = s.requests.byHost[hostOf(inst)] || { total: 0, engineAssets: 0 };
      matrix.push([
        `${engine} ${e.version}`, `${cid} s${s.session}${s.offlineHosts.length ? ' (instrument host offline)' : ''}`,
        `handshake ${s.handshake && s.handshake.ok ? 'ok' : 'FAILED'}`,
        `controlled at load ${d.controlledAtLoad ? 'yes' : 'no'}`,
        `engine cache at start ${entries}/${ASSETS}`,
        s.run && s.run.reply ? `z3 "${s.run.reply.line}" witness ${s.run.reply.witnessOk ? 'checked' : 'FAILED'} ready ${s.run.reply.stats.readyMs} ms` : `z3 ${s.run ? s.run.code : 'no run'}`,
        REMOTE ? 'instrument-host requests not logged (remote)' : `instrument-host requests ${instReq.total} (engine ${instReq.engineAssets})`,
        s.probe ? `parent storage ${parentUnreadable(s.probe) ? 'unreadable' : 'READABLE'}` : 'parent storage (not probed)',
      ].join(' | '));
      const { hostState, ...rest } = s;
      sessions.push(s.handshake && s.handshake.ok ? rest : s);
    }
  }
  // Sandbox parity: configuration B behaves as A on every measured mechanic.
  const a = perConfig.A;
  const b = perConfig.B;
  const blocked = (t) => t && t.navigated === false && t.attempt && t.attempt.threw === 'SecurityError';
  const bTop = Object.entries((e.topnavClean && e.topnavClean.B) || {});
  check(`${engine}: sandbox="allow-scripts allow-same-origin" changes no measured mechanic and blocks top navigation`,
    a && b && ['crossOrigin', 'storage', 'consent', 'integrity', 'persist', 'evict'].every((k) => a[k] === b[k] && b[k]) &&
    bTop.length > 0 && bTop.every(([, r]) => blocked(r.topnav)),
    `B top navigation by a never-activated frame: ${bTop.map(([k, r]) => `${k} target navigated ${r.topnav && r.topnav.navigated} (${r.topnav && r.topnav.attempt ? r.topnav.attempt.threw : '-'})`).join('; ')}`);
  // Handshake: second port, hostile embedder, top-level host.
  const sc = e.configs.A.sessions[0].secondConnect;
  const n = e.negative;
  const hostile = n.hostStateUnderAttacker || {};
  const attackOk = REMOTE && !n.attack ? true : n.attack && n.attack.helloReceived.length === 0 &&
    Object.values(n.attack.answeredOnForgedPort).every((v) => v === null);
  check(`${engine}: the handshake adopts one port, from the allowed parent only`,
    sc && sc.answeredOnSecondPort === null && attackOk &&
    Object.values(hostile).every((h) => h.adopted === false && h.registrations === 0) &&
    n.topLevelHost && n.topLevelHost.refused === 'top-level' && n.topLevelHost.registrations === 0,
    [
      `second port answered: ${sc && sc.answeredOnSecondPort}`,
      n.attack ? `hostile page got ${n.attack.helloReceived.length} hello messages` : 'hostile embedder not run (no attacker origin)',
      ...Object.entries(hostile).map(([k, h]) => `${k} frame: ancestorOrigins ${JSON.stringify(h.ancestorOrigins)}, ${h.refused ? `refused (${h.refused})` : `connect rejected (${(h.rejectedWindowMessages || []).map((r) => r.reason).join(', ')})`}`),
      `top-level host: ${n.topLevelHost && n.topLevelHost.refused}`,
    ].join('; '));
}

// --- observations (recorded facts, not pass or fail) ----------------------------------------------
const observations = {};
for (const [engine, e] of Object.entries(results.engines)) {
  const o = (observations[engine] = { version: e.version, configs: {} });
  for (const [cid, c] of Object.entries(e.configs)) {
    const [s1, s2, s3] = c.sessions;
    o.configs[cid] = {
      ancestorOrigins: c.sessions.map((s) => (s.diagStart || {}).ancestorOrigins),
      topNavigation: Object.fromEntries(Object.entries((e.topnavClean && e.topnavClean[cid]) || {}).map(([k, r]) => [k, r.topnav]).map(([k, t]) => [k, t ? {
        navigated: t.navigated, threw: t.attempt ? t.attempt.threw || null : null, delayMs: t.delayMs,
        parentActivationAtRequest: t.parentActivationAtRequest,
        frameActivationAtRequest: t.reply && t.reply.frameActivationAtRequest,
        frameActivationAtAttempt: t.attempt ? t.attempt.frameActivationAtAttempt : 'frame gone (navigated)',
      } : null])),
      documentDomain: s1.domainProbe,
      domainCookieVisibleToFrame: s1.probe ? s1.probe.domainCookieVisible : null,
      firstPartyViewOfInstrumentOrigin: s2.firstPartyView,
      readyMs: c.sessions.map((s) => (s.run && s.run.reply ? s.run.reply.stats.readyMs : null)),
      requestsAfterRestart: REMOTE ? 'no request log in remote mode' : { s2: s2.requests.list, s3: s3.requests.list },
      persisted: c.sessions.map((s) => (s.diagStart || {}).persisted),
    };
  }
}

// --- write outputs ------------------------------------------------------------------------------
const dest = path.join(runsDir, ID);
fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });
const put = (name, text) => fs.writeFileSync(path.join(dest, name), scrub(text));
put('meta.json', JSON.stringify({
  startedAt: results.startedAt, finishedAt: results.finishedAt, playwrightCore: results.playwrightCore,
  containerNode: results.node, versions: results.versions, launch: results.launch, build: { buildId: build.buildId, origins: build.origins },
  z3Request: results.z3Request,
}, null, 2) + '\n');
put('sessions.jsonl', sessions.map((s) => JSON.stringify(s)).join('\n') + '\n');
put('negative.jsonl', Object.entries(results.engines).map(([k, e]) => JSON.stringify({ engine: k, ...e.negative })).join('\n') + '\n');
put('topnav.jsonl', Object.entries(results.engines).flatMap(([k, e]) => Object.values(e.topnavClean || {}).flatMap((byTarget) => Object.values(byTarget)).map((t) => JSON.stringify({ engine: k, ...t }))).join('\n') + '\n');
put('matrix.txt', matrix.join('\n') + '\n');
put('manifest.json', JSON.stringify(manifest, null, 2) + '\n');
put('engines.json', JSON.stringify(engines, null, 2) + '\n');
for (const f of ['environment.txt', 'firefox-pref.txt', 'harness.txt']) put(f, fs.readFileSync(path.join(outDir, f), 'utf8'));

const outputs = fs.readdirSync(dest).sort().map((f) => {
  const buf = fs.readFileSync(path.join(dest, f));
  return { path: `runs/${ID}/${f}`, sha256: sha256(buf), bytes: buf.length };
});

function listFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.name === 'node_modules') return [];
    return d.isDirectory() ? listFiles(p) : [p];
  });
}
const inputs = listFiles(HERE).map((p) => ({ path: path.relative(REPO, p), sha256: sha256(fs.readFileSync(p)) }))
  .sort((x, y) => (x.path < y.path ? -1 : 1));
const inputManifest = inputs.map((i) => `${i.sha256}  ${i.path}\n`).join('');

let dockerVersion = null;
try { dockerVersion = execFileSync('docker', ['version', '--format', '{{.Server.Version}}']).toString().trim(); } catch { /* recorded as null */ }
const t0 = Date.parse(results.startedAt);
const t1 = Date.parse(results.finishedAt);
const pass = checks.every((c) => c.pass);

const record = {
  id: ID,
  title: 'The instrument origin on a stand-in custom subdomain: Z3 cross-origin in three engines, parent storage, handshake, and the framed cache across browser restarts (W0-S01)',
  task: 'W0-S01',
  engine: 'z3',
  version: '5.3.1',
  version_string: '5.3.1',
  binary: `${engines.z3.file} from PyPI, installed by pyodide.loadPackage in a module worker on the instrument origin`,
  binary_sha256: engines.z3.sha256,
  runtime: {
    pyodide: { version: engines.pyodide.version, npm_tarball: engines.pyodide.url, npm_integrity: engines.pyodide.integrity, tarball_sha256: engines.pyodide.tarballSha256 },
    playwright_core: results.playwrightCore,
    browsers: Object.fromEntries(Object.entries(results.versions).map(([k, v]) => [k, { version: v }])),
    browser_builds: env.browsers,
  },
  image: `mcr.microsoft.com/playwright:v1.63.0-noble@${imageDigest.split('@')[1]}`,
  recorded_at: new Date().toISOString(),
  started_at: results.startedAt,
  duration_s: Math.round((t1 - t0) / 100) / 10,
  argv: ['scripts/spikes/W0-S01/run.sh', '<work-dir>', '--record'],
  inputs,
  input_sha256: sha256(Buffer.from(inputManifest)),
  input_sha256_method: 'SHA-256 of the sha256sum-style manifest of inputs[], one "<sha256>  <path>\\n" line per file, sorted by path',
  budget: {
    z3_rlimit: results.z3Request.budget.rlimit,
    wall_ms_per_request: results.z3Request.budget.wallMs,
    handshake_timeout_s: 30,
    top_navigation_delay_ms: 6000,
    consent_threshold_bytes: 5000000,
    consent_threshold_note: 'OD-6: ask before a first load above 5 MB; the byte value is a course parameter [D]',
    container_memory: '6g',
    container_memory_prep: '2g',
  },
  exit_code: 0,
  exit_code_note: 'the harness and the recorder exited 0; each acceptance check is in checks[]',
  verdict_lines: matrix,
  outputs,
  environment: {
    os: `${os.type()} ${os.release()} ${process.arch === 'x64' ? 'x86_64' : process.arch}`,
    cpu_count: os.cpus().length,
    ram_gib: Math.round(os.totalmem() / 2 ** 30),
    container: { runtime: 'docker', server_version: dockerVersion, image: 'mcr.microsoft.com/playwright:v1.63.0-noble', digest: imageDigest.split('@')[1] },
    container_os: env.os,
    container_node: env.node,
    container_ca_certificates: env['ca-certificates'],
    host_tools: { node: process.version },
    emulated: true,
    emulation: REMOTE ? [
      'real hosting: the sites were published on the real origins (recorded here as <course-domain>), with their real DNS, certificates and host headers',
      'emulated: a "desktop session" is one headless browser process on a persistent profile (Playwright launchPersistentContext, then close); sessions were seconds apart; not a real user\'s browser restart',
      'remote mode ran sessions s1 and s2 only and kept no server request log; the offline session and the hostile embedder need the local stand-in',
      'Playwright 1.63.0 defaults changed back toward the shipped browsers as in the local run (meta.json, firefox-pref.txt)',
    ] : [
      'emulated: no real custom subdomain, DNS or GitHub Pages. Stand-in hostnames under the reserved .test TLD (course-domain.test, instruments.course-domain.test, instruments.other-host.test, attacker.test) resolved to 127.0.0.1 inside the container and were served over HTTPS on port 443 by scripts/spikes/W0-S01/server.mjs, with headers like GitHub Pages sends (no COOP or COEP, Access-Control-Allow-Origin *, Cache-Control max-age=600, ETag) and no compression',
      'emulated: a throwaway test CA, made per run by certs.sh, was trusted in each engine\'s own store (the container\'s system store for WebKit, $HOME/.pki/nssdb for Chromium, each Firefox profile\'s cert9.db), standing in for a public certificate',
      'emulated: a "desktop session" is one headless browser process on a persistent profile (Playwright launchPersistentContext, then close); sessions were seconds apart, so no time-based eviction was exercised; not a real user\'s browser restart',
      'Playwright 1.63.0 defaults changed back toward the shipped browsers: Chromium ran without Playwright\'s --disable-features entry ThirdPartyStoragePartitioning (meta.json records both flag lists); Firefox ran with network.cookie.cookieBehavior 5, the value its build\'s defaults/preferences/firefox.js sets, instead of Playwright\'s 4 (firefox-pref.txt)',
      'left as Playwright sets it: Firefox fission.webContentIsolationStrategy 0 (frames share a process); process placement does not change the same-origin checks measured here',
    ],
  },
  configs: [
    { id: 'A', label: 'same-site, plain iframe: the hosting plan', main_page: `${MAIN}/index.html`, instrument_origin: build.origins.inst, iframe: 'hidden, title, referrerpolicy="no-referrer"' },
    { id: 'B', label: 'same-site, sandbox="allow-scripts allow-same-origin" (ARCHITECTURE.md section 5.3)', main_page: `${MAIN}/sandboxed.html`, instrument_origin: build.origins.inst, iframe: 'as A, plus sandbox="allow-scripts allow-same-origin"' },
    { id: 'C', label: 'cross-site, plain iframe: another static host on its own domain', main_page: `${MAIN}/xsite.html`, instrument_origin: build.origins.xsite, iframe: 'as A' },
  ],
  sessions_note: 'Each engine and configuration ran three browser sessions on one fresh persistent profile: s1 online and cold (consent, cache fill, run, probes, then the top-navigation probe last); s2 online after a restart (cache state read before any request, run without consent, probes, first-party view of the instrument origin); s3 after a restart with the instrument hostname answering 503 to every request (run without consent, then evict).',
  values: {
    build_id: build.buildId,
    engine_assets: ASSETS,
    engine_first_load_bytes_uncompressed: manifest.engines.z3.bytes,
    engine_first_load_note: 'the six engine files as served by the stand-in server, uncompressed; compressed first-load sizes on real devices are W0-S02\'s RUN-phone-pyodide',
    browsers: results.versions,
  },
  checks,
  pass,
  observations,
  notes: [
    'Question: does the instrument origin work on its own custom subdomain, with Z3 running cross-origin and the parent\'s storage unreadable in Chromium, Firefox and WebKit, and do the framed origin\'s Cache API and service worker persist across desktop sessions under storage partitioning?',
    'Answer on the stand-in: yes in all three engines and all three configurations; see checks[] and docs/spikes/W0-S01.md.',
    'Model values are not canonical: each run checks the witness against the property (witness_ok) rather than matching the printed model.',
    'The real deployment (DNS, GitHub Pages, a public certificate) is an owner action; run.sh and build.mjs take the real origins without committing them.',
  ],
};
fs.writeFileSync(path.join(runsDir, `${ID}.json`), scrub(JSON.stringify(record, null, 2)) + '\n');
console.log(`${ID}: ${checks.filter((c) => c.pass).length}/${checks.length} checks pass; outputs ${outputs.length} files`);
if (!pass) { for (const c of checks.filter((x) => !x.pass)) console.log(`FAIL ${c.id}: ${c.detail}`); process.exitCode = 1; }
