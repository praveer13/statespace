// W0-S02: derive the Boot timing budget from the figures of RUN-phone-pyodide. Dependency-free.
//
// Usage: node derive-budget.mjs [--runs <runs-dir>]   (default: runs/ of this repository)
//        prints the budget tables as Markdown and the JSON that record.mjs stores in the run record
//
// The rule, in one paragraph. The reference profile is the slowest the run recorded: every real device when
// any device report is on file, else the emulated 0.25-CPU tier in each engine. A quantity's reference value
// is the largest median among the reference profiles (for a real device, which holds few sessions, the largest value in
// its sessions); its budget is that value times 1.25, rounded up to the
// next 500 ms. Network time is added from the measured wire bytes by arithmetic (one round trip and the
// transfer for each file, the files fetched one after another as the service worker fetches them), and the
// arithmetic is checked against the runs through a shaped link. The margin, the rounding, the links and the
// wall-clock factor below are course parameters [D]; every other number is read from the run.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const RULE = {
  margin: 1.25,
  round_ms: 500,
  reference_tier: 'cpu0.25',
  unthrottled_tier: 'cpu20',
  // stand-ins for a poor and a good mobile link: chosen, not measured
  links: { slow: { mbps: 1.6, rtt_ms: 150 }, lte: { mbps: 10, rtt_ms: 50 } },
  link_table_mbps: [1, 2, 5, 10, 25],
  link_table_rtt_ms: 100,
  wall_factor: 2,
  ci_floor_ms: 250, // a CI threshold below this is noise on a shared runner
  lag_round_ms: 50,
  lag_floor_ms: 100, // a 50 ms tick that comes 100 ms late is where a tap starts to feel the wait [D]
  wall_min_ms: 10000,
  cell_wall_ms: [2000, 5000],
};

const ceilTo = (v, step) => (v == null ? null : Math.ceil(v / step) * step);
const add = (...v) => (v.some((x) => x == null) ? null : v.reduce((a, b) => a + b, 0));
const max = (a) => { const b = a.filter((x) => x != null); return b.length ? Math.max(...b) : null; };
// One value from a recorded statistic: the median for an emulated tier, which holds three sessions, and the largest value
// for a real device, which holds few and where a slow tap is the case to plan for.
const pick = (st, mode) => (st == null ? null : mode === 'max' ? Math.max(...st.values) : st.median);
const get = (cell, grp, key, mode) => (cell && cell[grp] && cell[grp][key] ? pick(cell[grp][key], mode) : null);

// The quantities of one profile (an engine at a tier, or a device), from its summarized cell.
export function quantities(cell, mode = 'median') {
  const ladder = (k) => (cell.ladder[k] && cell.ladder[k].solve_ms ? pick(cell.ladder[k].solve_ms, mode) : null);
  return {
    handshake_ms: get(cell, 'cold', 'handshake_ms', mode) ?? get(cell, 'warm', 'handshake_ms', mode),
    warm_live_ms: add(get(cell, 'warm', 'worker_spawn_ms', mode), get(cell, 'warm', 'engine_start_ms', mode)),
    // from the consent tap to the first verdict on an unshaped link: the service worker's activation wait, the fill, the worker's
    // creation and the engine start (the shaped-link runs show what the network adds)
    cold_cpu_ms: get(cell, 'cold', 'consent_to_verdict_ms', mode),
    respawn_ms: cell.respawn_to_verdict_ms ? pick(cell.respawn_to_verdict_ms, mode) : null,
    nia_1e5_ms: ladder('rlimit-nia:100000'), nia_1e6_ms: ladder('rlimit-nia:1000000'), nia_5e6_ms: ladder('rlimit-nia:5000000'),
    bv_1e5_ms: ladder('rlimit-bv:100000'), bv_1e6_ms: ladder('rlimit-bv:1000000'), bv_5e6_ms: ladder('rlimit-bv:5000000'),
    yardstick_js_ms: cell.yardstick && cell.yardstick.js_ms ? pick(cell.yardstick.js_ms, mode) : null,
    yardstick_wasm_ms: cell.yardstick && cell.yardstick.wasm_ms ? pick(cell.yardstick.wasm_ms, mode) : null,
    heap_mib: cell.heap_mib ? cell.heap_mib.after_import_z3 : null,
    // the latest tick of the 50 ms main-thread timer in any session, during the fill and the engine start
    lag_max_ms: cell.main_thread ? max(['fill', 'start'].map((ph) => (cell.main_thread[ph] && cell.main_thread[ph].late_ms_max ? cell.main_thread[ph].late_ms_max.max : null))) : null,
  };
}

// Time to fetch the engine over a link, fetched file after file: a round trip and the transfer for each.
export function fillNetMs(assets, mbps, rttMs) {
  return Math.round(assets.reduce((n, a) => n + rttMs + (a.wire * 8 * 1000) / (mbps * 1e6), 0));
}

// summary: summarize() output (emulated tiers); devices: {id: {engine_family, cell}}; build: build.json
export function deriveBudget(summary, build, devices = {}, rule = RULE) {
  const assets = build.manifest.assets;
  const deviceIds = Object.keys(devices);
  const real = deviceIds.length > 0;
  const refCells = real
    ? deviceIds.map((id) => ({ id, kind: 'real-device', engine: devices[id].engine_family, cell: devices[id].cell }))
    : Object.entries(summary.tiers[rule.reference_tier] || {}).map(([engine, cell]) => ({ id: `${rule.reference_tier}/${engine}`, kind: 'emulated', engine, cell }));
  const profiles = refCells.map((p) => ({ id: p.id, kind: p.kind, engine: p.engine, q: quantities(p.cell, p.kind === 'real-device' ? 'max' : 'median') }));
  const ref = (k) => max(profiles.map((p) => p.q[k]));
  const budget = (k) => ceilTo(ref(k) == null ? null : ref(k) * rule.margin, rule.round_ms);

  // CI mapping: the same quantities on the unthrottled tier, per engine, and the ratio to the reference
  const ci = {};
  for (const engine of ['chromium', 'firefox', 'webkit']) {
    const cell = summary.tiers[rule.unthrottled_tier] && summary.tiers[rule.unthrottled_tier][engine];
    if (!cell) continue;
    const q20 = quantities(cell);
    const matching = profiles.filter((p) => p.engine === engine || p.engine === 'unknown');
    const k = {};
    for (const key of ['handshake_ms', 'warm_live_ms', 'cold_cpu_ms', 'respawn_ms', 'yardstick_js_ms']) {
      const r = max(matching.map((p) => p.q[key]));
      k[key] = r != null && q20[key] ? Math.round((r / q20[key]) * 100) / 100 : null;
    }
    ci[engine] = { unthrottled: q20, k };
  }

  // What the CI gate may assert for each engine on a runner as fast as the machine that recorded the unthrottled tier:
  // the budget divided by the ratio of the reference to the unthrottled value. A slower or faster runner multiplies it by
  // yardstick_runner / yardstick_here.
  const ciThresholds = {};
  for (const [engine, v] of Object.entries(ci)) {
    ciThresholds[engine] = { yardstick_here_ms: v.unthrottled.yardstick_js_ms };
    for (const key of ['handshake_ms', 'warm_live_ms', 'cold_cpu_ms', 'respawn_ms']) {
      const b = budget(key);
      ciThresholds[engine][key] = b != null && v.k[key] ? Math.max(rule.ci_floor_ms, Math.floor(b / v.k[key])) : null;
    }
    ciThresholds[engine].main_thread_throttle_rate = v.k.yardstick_js_ms == null ? null : Math.round(v.k.yardstick_js_ms);
  }

  // Cold live verdict, from consent, on each link
  const coldRef = ref('cold_cpu_ms');
  const links = {};
  for (const [name, l] of Object.entries(rule.links)) {
    const net = fillNetMs(assets, l.mbps, l.rtt_ms);
    links[name] = { mbps: l.mbps, rtt_ms: l.rtt_ms, fill_net_ms: net, cold_live_ms: coldRef == null ? null : Math.round(net + coldRef), budget_ms: coldRef == null ? null : ceilTo((net + coldRef) * rule.margin, rule.round_ms) };
  }
  const linkTable = rule.link_table_mbps.map((mbps) => {
    const net = fillNetMs(assets, mbps, rule.link_table_rtt_ms);
    return { mbps, rtt_ms: rule.link_table_rtt_ms, fill_net_ms: net, cold_live_ms: coldRef == null ? null : Math.round(net + coldRef) };
  });

  // rlimit: wall time at the reference profile for the ladder, and the watchdog that clears the default rlimit
  const nia5 = ref('nia_5e6_ms');
  const bv5 = ref('bv_5e6_ms');
  const slowest5 = max([nia5, bv5]);
  const wall = slowest5 == null ? null : Math.max(rule.wall_min_ms, ceilTo(slowest5 * rule.wall_factor, 1000));
  const wallByRlimit = Object.fromEntries([['1e5', 100000], ['1e6', 1000000], ['5e6', 5000000]].map(([label, r]) => {
    const slowest = max([ref(`nia_${label}_ms`), ref(`bv_${label}_ms`)]);
    return [r, slowest == null ? null : Math.max(rule.wall_min_ms, ceilTo(slowest * rule.wall_factor, 1000))];
  }));
  const fits = (wallMs) => {
    const out = {};
    for (const q of ['nia', 'bv']) {
      const rows = [['1e5', 100000], ['1e6', 1000000], ['5e6', 5000000]].map(([label, r]) => [r, ref(`${q}_${label}_ms`)]);
      const ok = rows.filter(([, ms]) => ms != null && ms <= wallMs);
      out[q] = ok.length ? ok[ok.length - 1][0] : null;
    }
    return out;
  };

  return {
    rule,
    reference: { kind: real ? 'real-device' : 'emulated', profiles: profiles.map((p) => ({ id: p.id, kind: p.kind, engine: p.engine })) },
    provisional: !real,
    profiles,
    reference_values: Object.fromEntries(['handshake_ms', 'warm_live_ms', 'cold_cpu_ms', 'respawn_ms', 'nia_5e6_ms', 'bv_5e6_ms', 'yardstick_js_ms', 'heap_mib', 'lag_max_ms'].map((k) => [k, ref(k)])),
    budget_ms: {
      consent_sheet_ready: budget('handshake_ms'),
      warm_live_verdict: budget('warm_live_ms'),
      cold_cpu_part: budget('cold_cpu_ms'),
      worker_restart_after_stop: budget('respawn_ms'),
      watchdog_wall_ms_default: wall,
      main_thread_latest_tick: ref('lag_max_ms') == null ? null : Math.max(rule.lag_floor_ms, ceilTo(ref('lag_max_ms') * rule.margin, rule.lag_round_ms)),
    },
    watchdog_wall_ms_by_default_rlimit: wallByRlimit,
    ci_thresholds_ms: ciThresholds,
    cold_live_by_link: links,
    link_table: linkTable,
    rlimit: {
      reference_ms: Object.fromEntries(['nia_1e5_ms', 'nia_1e6_ms', 'nia_5e6_ms', 'bv_1e5_ms', 'bv_1e6_ms', 'bv_5e6_ms'].map((k) => [k, ref(k)])),
      largest_ladder_rlimit_within: { ...Object.fromEntries(rule.cell_wall_ms.map((ms) => [`${ms} ms`, fits(ms)])), [`${wall} ms (the watchdog)`]: wall == null ? null : fits(wall) },
    },
    ci_mapping: {
      note: 'The gate asserts q_runner <= budget * (yardstick_runner / yardstick_here) / k, with k the reference-to-unthrottled ratio below and yardstick_here the unthrottled tier\'s JS yardstick; it needs the yardstick run on the runner.',
      engines: ci,
    },
  };
}

function loadFromRuns(runsDir) {
  const dir = path.join(runsDir, 'RUN-phone-pyodide');
  const summary = JSON.parse(fs.readFileSync(path.join(dir, 'summary.json'), 'utf8'));
  const build = JSON.parse(fs.readFileSync(path.join(dir, 'build.json'), 'utf8'));
  return { summary: summary.emulated, build, devices: summary.devices || {} };
}

const sec = (ms) => (ms == null ? 'n/a' : ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`);

export function toMarkdown(b) {
  const L = [];
  L.push(`Reference: ${b.reference.kind}${b.provisional ? ' (provisional: no real device on file)' : ''}; profiles ${b.reference.profiles.map((p) => p.id).join(', ')}`);
  L.push('');
  L.push('| Quantity | Reference value | Budget (x1.25, up to 0.5 s) |');
  L.push('|---|---|---|');
  const r = b.reference_values;
  L.push(`| consent sheet ready (handshake) | ${sec(r.handshake_ms)} | ${sec(b.budget_ms.consent_sheet_ready)} |`);
  L.push(`| live verdict, cache warm (spawn + start + first solve) | ${sec(r.warm_live_ms)} | ${sec(b.budget_ms.warm_live_verdict)} |`);
  L.push(`| cold start, CPU part (consent to verdict on an unshaped link) | ${sec(r.cold_cpu_ms)} | ${sec(b.budget_ms.cold_cpu_part)} |`);
  L.push(`| worker restart after a stop, to the next verdict | ${sec(r.respawn_ms)} | ${sec(b.budget_ms.worker_restart_after_stop)} |`);
  L.push(`| page responsiveness: the latest tick of a 50 ms main-thread timer during the fill and the engine start | ${sec(r.lag_max_ms)} | ${sec(b.budget_ms.main_thread_latest_tick)} |`);
  L.push(`| watchdog wall-clock default (twice the slowest rlimit 5e6 run, at least ${sec(b.rule.wall_min_ms)}) | ${r.nia_5e6_ms == null && r.bv_5e6_ms == null ? 'n/a' : sec(Math.max(r.nia_5e6_ms ?? 0, r.bv_5e6_ms ?? 0))} | ${sec(b.budget_ms.watchdog_wall_ms_default)} |`);
  L.push('');
  L.push('| Watchdog `wallMs` for a default `rlimit` of | 100,000 | 1,000,000 | 5,000,000 |');
  L.push('|---|---:|---:|---:|');
  const w = b.watchdog_wall_ms_by_default_rlimit;
  L.push(`| twice the slowest run at the reference, at least ${sec(b.rule.wall_min_ms)} | ${sec(w[100000])} | ${sec(w[1000000])} | ${sec(w[5000000])} |`);
  L.push('');
  L.push('| Link | Fetch, arithmetic | Cold live verdict | Budget |');
  L.push('|---|---|---|---|');
  for (const [name, l] of Object.entries(b.cold_live_by_link)) L.push(`| ${name}: ${l.mbps} Mbit/s, ${l.rtt_ms} ms | ${sec(l.fill_net_ms)} | ${sec(l.cold_live_ms)} | ${sec(l.budget_ms)} |`);
  L.push('');
  L.push('| CI threshold at yardstick parity | Engine | Handshake | Warm live verdict | Cold, CPU part | Restart | Yardstick here (JS) | Main-thread throttle |');
  L.push('|---|---|---:|---:|---:|---:|---:|---:|');
  for (const [engine, t] of Object.entries(b.ci_thresholds_ms)) L.push(`| budget / ratio | ${engine} | ${sec(t.handshake_ms)} | ${sec(t.warm_live_ms)} | ${sec(t.cold_cpu_ms)} | ${sec(t.respawn_ms)} | ${t.yardstick_here_ms} ms | ${t.main_thread_throttle_rate}x |`);
  return L.join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf('--runs');
  const runsDir = i > 0 ? process.argv[i + 1] : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../runs');
  const { summary, build, devices } = loadFromRuns(runsDir);
  const b = deriveBudget(summary, build, devices);
  console.log(toMarkdown(b));
  if (process.argv.includes('--json')) console.log(JSON.stringify(b, null, 1));
}
