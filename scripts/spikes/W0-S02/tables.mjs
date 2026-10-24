// W0-S02: print the result tables of docs/spikes/W0-S02.md as Markdown, from runs/RUN-phone-pyodide/summary.json,
// so that no figure in the decision record is typed by hand. Dependency-free.
//
// Usage: node tables.mjs [--runs <runs-dir>] [<table> ...]
//   tables: first-load, cold, warm, memory, rlimit, persistence, links, lag, extras, devices (default: all)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { toMarkdown } from './derive-budget.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const ri = argv.indexOf('--runs');
const RUNS = ri >= 0 ? argv[ri + 1] : path.resolve(HERE, '../../../runs');
const want = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--runs');
const S = JSON.parse(fs.readFileSync(path.join(RUNS, 'RUN-phone-pyodide', 'summary.json'), 'utf8'));
const T = S.emulated.tiers;
const ENGINES = ['chromium', 'firefox', 'webkit'];
const TIERS = Object.keys(T).sort((a, b) => Number(b.slice(3)) - Number(a.slice(3)));
const med = (x) => (x ? x.median : null);
const n0 = (v) => (v == null ? '-' : Math.round(v).toLocaleString('en-US'));
const n1 = (v) => (v == null ? '-' : (Math.round(v * 10) / 10).toLocaleString('en-US'));
const x = (v, base) => (v == null || !base ? '-' : `${(v / base).toFixed(1)}x`);
const tierName = (t) => (t === 'cpu20' ? 'no quota' : `${t.slice(3)} CPU${t === 'cpu1' ? '' : 's'}`);
const row = (cells) => `| ${cells.join(' | ')} |`;
const out = {};

out['first-load'] = () => {
  const f = S.first_load;
  const L = [row(['File', 'Raw bytes', 'gzip level 5', 'Brotli 11']), row(['---', '---:', '---:', '---:'])];
  for (const a of f.files) L.push(row([`\`${a.file}\``, n0(a.raw_bytes), n0(a.gzip5_bytes), a.brotli11_bytes == null ? '-' : n0(a.brotli11_bytes)]));
  L.push(row(['**Total, 6 files**', `**${n0(f.raw_bytes)}**`, `**${n0(f.gzip5_bytes)}**`, f.brotli11_bytes == null ? '-' : `**${n0(f.brotli11_bytes)}**`]));
  const b = JSON.parse(fs.readFileSync(path.join(RUNS, 'RUN-phone-pyodide', 'build.json'), 'utf8'));
  const inst = b.shell.filter((x) => x.site === 'instruments');
  const sum = (a, k) => a.reduce((n, x) => n + x[k], 0);
  return `${L.join('\n')}\n\nThe instrument origin's own files, which are not engine files (host page, host script, worker, cases, service worker, manifest): ${inst.length} files, ${n0(sum(inst, 'bytes'))} bytes raw, ${n0(sum(inst, 'wire'))} as gzip level 5. The main origin's three files: ${n0(sum(b.shell.filter((x) => x.site === 'main'), 'bytes'))} bytes raw, ${n0(sum(b.shell.filter((x) => x.site === 'main'), 'wire'))} as gzip.`;
};

const startCols = (g, tier, e, base) => {
  const c = T[tier][e][g];
  return [n0(med(c.handshake_ms)), n0(med(c.worker_spawn_ms)), g === 'cold' ? n0(med(c.fill_ms)) : null, n0(med(c.ready_ms)), n0(med(c.engine_start_ms)), g === 'cold' ? n0(med(c.consent_to_verdict_ms)) : null].filter((v) => v !== null);
};
out.cold = () => {
  const L = [row(['Tier', 'Engine', 'Yardstick JS (ms)', 'Handshake', 'Worker creation', 'Fill', 'Ready', 'Start to first verdict', 'Consent to verdict', 'x unthrottled']), row(['---', '---', '---:', '---:', '---:', '---:', '---:', '---:', '---:', '---:'])];
  for (const t of TIERS) for (const e of ENGINES) {
    if (!T[t][e]) continue;
    const base = med(T.cpu20 && T.cpu20[e] && T.cpu20[e].cold.consent_to_verdict_ms);
    const c = T[t][e];
    L.push(row([tierName(t), e, n1(med(c.yardstick.js_ms)), ...startCols('cold', t, e), x(med(c.cold.consent_to_verdict_ms), base)]));
  }
  return L.join('\n');
};
out.warm = () => {
  const L = [row(['Tier', 'Engine', 'Handshake', 'Worker creation', 'Ready', 'Start to first verdict', 'Restart to verdict', 'x unthrottled (start)']), row(['---', '---', '---:', '---:', '---:', '---:', '---:', '---:'])];
  for (const t of TIERS) for (const e of ENGINES) {
    if (!T[t][e]) continue;
    const base = med(T.cpu20 && T.cpu20[e] && T.cpu20[e].warm.engine_start_ms);
    const c = T[t][e];
    L.push(row([tierName(t), e, ...startCols('warm', t, e), n0(med(c.respawn_to_verdict_ms)), x(med(c.warm.engine_start_ms), base)]));
  }
  return L.join('\n');
};
out.phases = () => {
  const L = [row(['Tier', 'Engine', 'Start', '`loadPyodide`', '`loadPackage` of the wheel', '`import z3`']), row(['---', '---', '---', '---:', '---:', '---:'])];
  const imports = [];
  for (const t of TIERS) for (const e of ENGINES) {
    const c = T[t][e];
    if (!c) continue;
    for (const g of ['cold', 'warm']) {
      const x = c[g];
      imports.push(med(x.import_ms));
      L.push(row([tierName(t), e, g, n0(med(x.load_pyodide_ms)), n0(med(x.load_wheel_ms)), n0(med(x.import_z3_ms))]));
    }
  }
  return `${L.join('\n')}\n\n(Milliseconds, medians. \`import('pyodide.mjs')\` took ${n0(Math.min(...imports))} to ${n0(Math.max(...imports))} ms in every cell and is left out.)`;
};
out.memory = () => {
  const L = [row(['Engine', 'Connected', 'First verdict', 'RSS added by the engine', 'PSS added', 'Peak RSS']), row(['---', '---:', '---:', '---:', '---:', '---:'])];
  for (const e of ENGINES) {
    const m = T.cpu20 && T.cpu20[e] && T.cpu20[e].rss_mib;
    if (!m) continue;
    L.push(row([e, n0(med(m.connected)), n0(med(m.first_verdict)), n0(med(m.engine_over_connected)), n0(med(m.pss_engine_over_connected)), n0(med(m.peak))]));
  }
  const h = T.cpu20 && T.cpu20.chromium && T.cpu20.chromium.heap_mib;
  return `${L.join('\n')}\n\n(MiB, medians at no quota.) Engine heap, the same in every engine: ${h ? `${h.after_pyodide} MiB after Pyodide, ${h.after_wheel} after the wheel, ${h.after_import_z3} after \`import z3\`, up to ${h.after_cases.max} after the three cases` : '-'}.`;
};
out.rlimit = () => {
  const keys = [['rlimit-nia', 100000], ['rlimit-nia', 1000000], ['rlimit-nia', 5000000], ['rlimit-bv', 100000], ['rlimit-bv', 1000000], ['rlimit-bv', 5000000]];
  const L = [row(['Tier', 'Engine', 'cubes 1e5', 'cubes 1e6', 'cubes 5e6', 'BV 1e5', 'BV 1e6', 'BV 5e6']), row(['---', '---', '---:', '---:', '---:', '---:', '---:', '---:'])];
  for (const t of TIERS) for (const e of ENGINES) {
    if (!T[t][e]) continue;
    L.push(row([tierName(t), e, ...keys.map(([q, r]) => n0(med(T[t][e].ladder[`${q}:${r}`] && T[t][e].ladder[`${q}:${r}`].solve_ms)))]));
  }
  const R = S.rlimit_reasons || {};
  const RL = [row(['Run', 'Answers and reasons, counted over every session']), row(['---', '---'])];
  for (const [k, v] of Object.entries(R)) RL.push(row([k.replace('rlimit-nia', 'cubes').replace('rlimit-bv', 'BV'), Object.entries(v).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t} (${n})`).join('; ')]));
  return `${L.join('\n')}\n\n(Milliseconds spent in \`check()\`, medians of the sessions that ran the ladder.)\n\n${RL.join('\n')}`;
};
out.persistence = () => {
  const L = [row(['Tier', 'Engine', 'Return visits', 'Six files in the cache', 'Controlled from the first request', 'Frame marker present', 'Engine fetches not from the cache', 'Engine requests to the server']), row(['---', '---', '---:', '---:', '---:', '---:', '---:', '---:'])];
  for (const t of TIERS) for (const e of ENGINES) {
    const p = T[t][e] && T[t][e].persistence;
    if (p) L.push(row([tierName(t), e, p.return_visits, p.cache_six_of_six, p.controlled_at_load, p.marker_present, p.engine_fetches_not_from_cache, p.engine_requests_to_server]));
  }
  return L.join('\n');
};
const FILL_NAME = { single: 'one message (the plan)', beat: 'a message every 15 s' };
out.links = () => {
  const L = [row(['Link', 'Engine', 'Fill by the service worker', 'Result', 'Fill (ms)', 'Arithmetic (ms)', 'Measured / arithmetic', 'Consent to verdict (ms)']), row(['---', '---', '---', '---', '---:', '---:', '---:', '---:'])];
  const order = (a, b) => ENGINES.indexOf(a[0]) - ENGINES.indexOf(b[0]);
  for (const name of ['lte', 'slow']) {
    for (const [engine, list] of Object.entries(S.emulated.link[name] || {}).sort(order)) for (const q of list) {
      const link = `${name === 'lte' ? '10' : '1.6'} Mbit/s, ${q.link.rttMs} ms`;
      if (q.ok) {
        const v = S.link_validation.find((r) => r.link === name && r.engine === engine && r.fill_mode === q.fill_mode) || {};
        L.push(row([link, engine, FILL_NAME[q.fill_mode] || q.fill_mode, 'verdict', n0(q.fill_ms), n0(v.arithmetic_ms), v.measured_over_arithmetic == null ? '-' : v.measured_over_arithmetic.toFixed(3), n0(q.consent_to_verdict_ms)]));
      } else {
        L.push(row([link, engine, FILL_NAME[q.fill_mode] || q.fill_mode, `no reply in ${n0(q.fill_failed_after_ms / 1000)} s${q.sw_restarted ? ' (the worker had been stopped and started again)' : ''}`, '-', '-', '-', '-']));
      }
    }
  }
  return L.join('\n');
};
out.lag = () => {
  const L = [row(['Tier', 'Engine', 'Idle: worst tick (ms)', 'Fill', 'Engine start', 'Ticks over 100 ms, of all, in the fill and the start']), row(['---', '---', '---:', '---:', '---:', '---:'])];
  const mx = (x) => (x ? x.max : null);
  for (const t of TIERS) for (const e of ENGINES) {
    const m = T[t] && T[t][e] && T[t][e].main_thread;
    if (!m) continue;
    const g = (ph) => (m[ph] ? n1(mx(m[ph].late_ms_max)) : '-');
    const over = (m.fill ? m.fill.ticks_over_100_total : 0) + (m.start ? m.start.ticks_over_100_total : 0);
    const all = (m.fill ? m.fill.ticks_total : 0) + (m.start ? m.start.ticks_total : 0);
    L.push(row([tierName(t), e, g('idle'), g('fill'), g('start'), `${over} of ${n0(all)}`]));
  }
  return L.join('\n');
};
out.extras = () => {
  const L = [];
  for (const [tier, byEngine] of Object.entries(S.emulated.extras)) for (const [e, list] of Object.entries(byEngine)) for (const r of list) {
    const m = r.metrics;
    L.push(row([tierName(tier), e, r.label, m.kind, m.ok ? 'verdict' : 'no verdict', n0(m.cache_entries_at_start), String(m.controlled_at_load), n0(m.engine_requests_to_server), n0(m.engine_start_ms)]));
  }
  return [row(['Tier', 'Engine', 'Session', 'Kind', 'Result', 'Cache found', 'Controlled at load', 'Engine requests to the server', 'Start to first verdict (ms)']), row(['---', '---', '---', '---', '---', '---:', '---', '---:', '---:']), ...L].join('\n');
};
out['timeout-memory'] = () => {
  const L = [row(['Engine', 'Before the unbounded query', 'Peak RSS of the session', 'After the watchdog stopped the worker', 'After the next verdict', 'Peak over before'])  , row(['---', '---:', '---:', '---:', '---:', '---:'])];
  for (const e of ENGINES) {
    const list = S.emulated.extras.cpu20 && S.emulated.extras.cpu20[e];
    const r = list && list.find((q) => q.label === 'timeout-1');
    if (!r) continue;
    const m = (v) => (v == null ? null : v / 1048576);
    const b = m(r.metrics.rss.before_timeout);
    L.push(row([e, n0(b), n0(m(r.metrics.rss.peak)), n0(m(r.metrics.rss.after_timeout_stop)), n0(m(r.metrics.rss.after_timeout_next)), n0(m(r.metrics.rss.peak) - b)]));
  }
  return `${L.join('\n')}\n\n(MiB of resident memory in the browser's processes, no quota, the 25 s \`timeout\` case: the cubes query with no \`rlimit\`.)`;
};
out['budget-tiers'] = () => {
  const B = S.budget_by_reference_tier || {};
  const sec = (ms) => (ms == null ? '-' : ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`);
  const L = [row(['Reference tier', 'Handshake', 'Warm live verdict', 'Cold, CPU part', 'Restart', 'Latest tick', 'Watchdog default', 'Cold live, 10 Mbit/s', 'Cold live, 1.6 Mbit/s']), row(['---', '---:', '---:', '---:', '---:', '---:', '---:', '---:', '---:'])];
  for (const t of TIERS) {
    const b = B[t];
    if (b) L.push(row([tierName(t), sec(b.consent_sheet_ready), sec(b.warm_live_verdict), sec(b.cold_cpu_part), sec(b.worker_restart_after_stop), sec(b.main_thread_latest_tick), sec(b.watchdog_wall_ms_default), sec(b.cold_live_ms_by_link.lte), sec(b.cold_live_ms_by_link.slow)]));
  }
  return L.join('\n');
};
out.budget = () => toMarkdown(S.budget);
out.devices = () => {
  const ids = Object.keys(S.devices || {});
  if (!ids.length) return 'No device report is on file.';
  const L = [row(['Device', 'Engine', 'Session', 'Kind', 'Hours since the first download', 'Cache found', 'Controlled at load', 'Frame marker', 'Verdict']), row(['---', '---', '---:', '---', '---:', '---:', '---', '---', '---'])];
  for (const id of ids) for (const s of S.devices[id].sessions) L.push(row([id, S.devices[id].engine_family, s.label, s.interrupted ? 'ended early' : s.kind, s.since_first_fill_ms == null ? '-' : n1(s.since_first_fill_ms / 3600000), n0(s.cache_entries_at_start), String(s.controlled_at_load), String(s.marker_present), s.ok ? 'yes' : 'no']));
  return L.join('\n');
};

for (const k of want.length ? want : Object.keys(out)) {
  if (!out[k]) { console.error(`unknown table ${k}`); process.exit(2); }
  console.log(`### ${k}\n\n${out[k]()}\n`);
}
