#!/usr/bin/env node
// W0-T07: checks content/governance/keepkill-rules.yaml against its sources and writes the test
// vectors its prose promises.
//
//   node scripts/spikes/W0-T07/check.mjs --out <dir> [--pyyaml <file with PyYAML's JSON of the rules>]
//
// Checks: the YAML subset parser of packages/ids reads the file (and, given --pyyaml, reads it
// exactly as PyYAML does); every ID it cites resolves in the registry GATE-links uses; comparison
// 1's units are the KC graph of spine section 4, comparison 2's are the KCs GEN-proof-structure
// lists, comparison 3's are the KCs of its nine families (ASSESSMENT.md section 4); hash32 here
// equals packages/rng's on every key; the lowest bit of hash32 is the parity identity the file
// cites; every allocation is balanced. Writes allocation-vectors.json and interval-vectors.json to
// --out and prints a JSON summary. Exit 0 when every check holds.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

if (!process.features.typescript && !process.env.W0T07_STRIP) {
  const again = spawnSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', ...process.argv.slice(1)], { stdio: 'inherit', env: { ...process.env, W0T07_STRIP: '1' } });
  process.exit(again.status ?? 1);
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const at = (...p) => path.join(ROOT, ...p);
const read = (...p) => fs.readFileSync(at(...p), 'utf8');
const argv = process.argv.slice(2);
const opt = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};
const OUT = opt('--out');
const PYYAML = opt('--pyyaml');
if (!OUT) {
  console.error('usage: check.mjs --out <dir> [--pyyaml <file>]');
  process.exit(2);
}

const RULES = 'content/governance/keepkill-rules.yaml';
const lib = await import(pathToFileURL(at('scripts', 'spikes', 'W0-T07', 'keepkill.mjs')).href);
const { parseYaml } = await import(pathToFileURL(at('packages', 'ids', 'src', 'yaml-subset.ts')).href);
const { scanText } = await import(pathToFileURL(at('packages', 'ids', 'src', 'grammar.ts')).href);
const rng = await import(pathToFileURL(at('packages', 'rng', 'src', 'index.ts')).href);

const checks = [];
const check = (name, ok, detail) => {
  checks.push({ name, ok: Boolean(ok), detail });
  return ok;
};
const sortKeys = (v) => (Array.isArray(v) ? v.map(sortKeys) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])])) : v);

// ------------------------------------------------------------------ parse
const text = read(RULES);
const rules = parseYaml(text);
check('yaml subset parser', rules && typeof rules === 'object', 'packages/ids/src/yaml-subset.ts reads the file');
if (PYYAML) {
  const py = JSON.parse(fs.readFileSync(PYYAML, 'utf8'));
  const same = JSON.stringify(sortKeys(py)) === JSON.stringify(sortKeys(rules));
  check('two parsers agree', same, same ? 'PyYAML and the subset parser give the same document' : 'PyYAML and the subset parser differ');
}
const P = rules.parameters;
const byNumber = Object.fromEntries(rules.comparisons.map((c) => [c.number, c]));
check('four comparisons', rules.comparisons.length === 4 && [1, 2, 3, 4].every((n) => byNumber[n]), rules.comparisons.map((c) => `${c.number} ${c.id}`).join('; '));
check('no counterexample-only arm', typeof byNumber[3].neither_arm_is_counterexample_only === 'string' && /class/.test(byNumber[3].default) && /class/.test(byNumber[3].alternative), 'both arms of comparison 3 show the class');

// ------------------------------------------------------------------ IDs resolve
const registry = JSON.parse(read('packages', 'ids', 'src', 'registry.json'));
const known = new Set(registry.entries.map((e) => e.id));
const tokens = scanText(text);
const unresolved = [...new Set(tokens.map((t) => t.id))].filter((id) => !known.has(id));
check('IDs resolve', unresolved.length === 0, `${tokens.length} ID tokens, ${new Set(tokens.map((t) => t.id)).size} distinct; unresolved: ${unresolved.join(', ') || 'none'}`);

// ------------------------------------------------------------------ units against their sources
const spine = read('docs', 'spine', 'SPINE.md');
const graph = spine.slice(spine.indexOf('## 4. KC graph v0'), spine.indexOf('**Confusable sets for interleaving**'));
const kcRows = graph.split('\n').filter((l) => /^\| KC-/.test(l)).map((l) => l.split('|').map((s) => s.trim()));
const spineKcs = kcRows.map((c) => ({ id: c[1], stage: c[3] }));
const spineByStage = {};
for (const k of spineKcs) (spineByStage[k.stage] ??= []).push(k.id);
const assessment = read('docs', 'ASSESSMENT.md');
const familyKcs = (family) => {
  const m = new RegExp(`^### 4\\.[0-9]+ ${family}\\n\\n\\*\\*KCs\\.\\*\\* (.*)$`, 'm').exec(assessment);
  if (!m) throw new Error(`no KC line for ${family} in docs/ASSESSMENT.md`);
  return [...m[1].matchAll(/KC-[0-9]+\.[a-z0-9-]*[a-z0-9]/g)].map((x) => x[0]);
};
const sameList = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const stageOf = (kc) => `S${/^KC-([0-9]+)\./.exec(kc)[1]}`;
const flat = (units) => Object.values(units).flat();
const unitChecks = {};
for (const c of rules.comparisons.filter((x) => x.units && typeof x.units === 'object')) {
  for (const [stage, list] of Object.entries(c.units)) {
    const wrong = list.filter((kc) => stageOf(kc) !== stage);
    check(`comparison ${c.number} ${stage} stage`, wrong.length === 0, wrong.length === 0 ? `${list.length} KCs, each in ${stage}` : `outside ${stage}: ${wrong.join(', ')}`);
  }
  const all = flat(c.units);
  check(`comparison ${c.number} no duplicates`, new Set(all).size === all.length, `${all.length} units`);
  check(`comparison ${c.number} units known`, all.every((kc) => known.has(kc)), 'every unit is a registered KC');
}
{
  const c = byNumber[1];
  const ok = Object.keys(spineByStage).every((s) => sameList(c.units[s], spineByStage[s])) && Object.keys(c.units).length === Object.keys(spineByStage).length;
  unitChecks[1] = { units: flat(c.units).length, source: 'docs/spine/SPINE.md section 4, every KC row, in table order' };
  check('comparison 1 equals the KC graph', ok, `${flat(c.units).length} units; the spine table has ${spineKcs.length} KC rows`);
}
{
  const c = byNumber[2];
  const src = familyKcs('GEN-proof-structure');
  unitChecks[2] = { units: flat(c.units).length, source: 'docs/ASSESSMENT.md section 4.14 (GEN-proof-structure), in its order' };
  check('comparison 2 equals GEN-proof-structure', sameList(flat(c.units), src), `${flat(c.units).length} units; the family lists ${src.length}`);
}
{
  const c = byNumber[3];
  const union = new Set(c.families.flatMap((f) => familyKcs(f)));
  const ordered = spineKcs.map((k) => k.id).filter((id) => union.has(id));
  unitChecks[3] = { units: flat(c.units).length, families: c.families.length, source: 'docs/ASSESSMENT.md sections 4.3-4.11, the union of the nine families, in spine order' };
  check('comparison 3 equals its families', sameList(flat(c.units), ordered), `${flat(c.units).length} units; the ${c.families.length} families list ${union.size} distinct KCs`);
}

// ------------------------------------------------------------------ parameters as the prose states them
const prose = JSON.stringify(rules);
const mentions = [
  ['min_outcomes_per_arm', /at least 20 units with an outcome/],
  ['harm_read_outcomes_per_arm', /at least 10 units with an outcome/],
  ['switch_min_points', /at least 10 points/],
  ['final_read_days_after_last_sign_off', /60 days after the latest sign-off date/],
  ['cap_days_after_first_event', /730\s+days after the first\s+learner-zero event|730 days after the first learner-zero event/],
  ['min_windows_per_arm', /2 complete windows/],
  ['window_margin_weeks', /at least 2 more weeks/],
];
const expected = { min_outcomes_per_arm: 20, harm_read_outcomes_per_arm: 10, switch_min_points: 10, final_read_days_after_last_sign_off: 60, cap_days_after_first_event: 730, min_windows_per_arm: 2, window_margin_weeks: 2 };
for (const [name, re] of mentions) check(`parameter ${name}`, P[name] === expected[name] && re.test(prose), `${P[name]} in parameters and in the prose`);
check('parameter non_inferiority_margin_points', P.non_inferiority_margin_points === 5 && prose.includes('L > −0.05'), '5 points; the prose writes L > −0.05');
check('parameter z', P.z === lib.Z, `${P.z}`);

// ------------------------------------------------------------------ hashing: equal to packages/rng, and the parity identity
const SEEDS = [0, 1, 2654435769, 4294967295];
const keyed = [];
for (const c of rules.comparisons.filter((x) => x.number !== 4)) for (const unit of flat(c.units)) for (const seed of SEEDS) keyed.push(lib.allocationKey(c.id, unit, seed));
for (const seed of SEEDS) keyed.push(lib.allocationKey(byNumber[4].id, 'window-1', seed));
const vendorMismatch = keyed.filter((k) => rng.hash32(k) !== lib.hash32(k));
check('hash32 equals packages/rng', vendorMismatch.length === 0, `${keyed.length} keys; mismatches: ${vendorMismatch.length}`);
const parityBreaks = keyed.filter((k) => (lib.hash32(k) & 1) !== (1 ^ lib.codeUnitParity(k)));
check('parity identity', parityBreaks.length === 0, `on all ${keyed.length} keys, the lowest bit of hash32 is 1 XOR the parity of the key's code units`);
// For one comparison and one seed, hash32 % 2 is then fixed by the unit's name alone:
let nameFixed = 0;
let groups = 0;
for (const c of rules.comparisons.filter((x) => x.number !== 4)) {
  for (const seed of SEEDS) {
    groups += 1;
    const offsets = new Set(flat(c.units).map((u) => (lib.hash32(lib.allocationKey(c.id, u, seed)) & 1) ^ lib.codeUnitParity(u)));
    if (offsets.size === 1) nameFixed += 1;
  }
}
check('hash32 % 2 follows the name', nameFixed === groups, `in ${nameFixed} of ${groups} (comparison, seed) groups, hash32 % 2 equals one constant XOR the parity of the unit ID's code units`);

// ------------------------------------------------------------------ allocation vectors
const allocation = { generated_by: 'scripts/spikes/W0-T07/keepkill.mjs', rule: 'content/governance/keepkill-rules.yaml common.allocation', seeds: SEEDS, note: 'example seeds, not learner-zero\'s expSeed, which is drawn on the device when the comparisons are turned on', comparisons: [] };
const balance = [];
for (const c of rules.comparisons.filter((x) => x.number !== 4)) {
  const perSeed = [];
  for (const seed of SEEDS) {
    const rows = lib.allocate(c, seed);
    const counts = Object.fromEntries(c.arms.map((a) => [a, rows.filter((r) => r.arm === a).length]));
    const strata = {};
    for (const r of rows) {
      strata[r.stratum] ??= Object.fromEntries(c.arms.map((a) => [a, 0]));
      strata[r.stratum][r.arm] += 1;
    }
    const worstStratum = Math.max(...Object.values(strata).map((s) => Math.abs(s[c.arms[0]] - s[c.arms[1]])));
    const total = Math.abs(counts[c.arms[0]] - counts[c.arms[1]]);
    balance.push({ comparison: c.number, seed, total, worstStratum });
    perSeed.push({ seed, counts, first_v_lowest_bit: rows[0].v & 1, units: rows.map((r) => ({ unit: r.unit, stratum: r.stratum, key: r.key, v: `0x${r.v.toString(16).padStart(8, '0')}`, position: r.position, arm: r.arm })) });
  }
  allocation.comparisons.push({ number: c.number, id: c.id, arms: c.arms, per_seed: perSeed });
}
const windows = SEEDS.map((seed) => {
  const w = lib.firstWindowArm(byNumber[4], seed);
  return { seed, key: w.key, v: `0x${w.v.toString(16).padStart(8, '0')}`, window_1: w.arm };
});
allocation.comparisons.push({ number: 4, id: byNumber[4].id, arms: byNumber[4].arms, first_window: windows });
check('allocation balanced', balance.every((b) => b.total <= 1 && b.worstStratum <= 1), `over ${balance.length} (comparison, seed) allocations the arms differ by at most one in every stratum and overall`);
const fmixVectors = [0, 1, 2, 0x7fffffff, 0x80000000, 0xffffffff, 0x811c9dc5].map((h) => ({ input: `0x${h.toString(16).padStart(8, '0')}`, fmix32: `0x${lib.fmix32(h).toString(16).padStart(8, '0')}` }));
const hashVectors = ['', 'a', 'foobar', lib.allocationKey('misconception-note', 'KC-1.only-if-direction', 0), lib.allocationKey('reserve-weeks', 'window-1', 4294967295)].map((s) => ({ input: s, hash32: `0x${lib.hash32(s).toString(16).padStart(8, '0')}` }));
allocation.hash32_vectors = hashVectors;
allocation.fmix32_vectors = fmixVectors;

// ------------------------------------------------------------------ interval and decision vectors
const wilsonCases = [[41, 52], [10, 12], [16, 20], [0, 20], [20, 20], [1, 1], [0, 1], [7, 12], [21, 21]];
const newcombeCases = [
  ['docs/EVIDENCE.md section 7.1 example', 18, 20, 14, 20],
  ['docs/EVIDENCE.md section 7.1 example', 45, 50, 35, 50],
  ['the floating-point trap (exactly 10 points)', 18, 20, 16, 20],
  ['precision near 0.8, 10 per arm', 8, 10, 8, 10],
  ['precision near 0.8, 20 per arm', 16, 20, 16, 20],
  ['precision near 0.8, 30 per arm', 24, 30, 24, 30],
  ['precision near 0.8, 50 per arm', 40, 50, 40, 50],
  ['edge', 0, 20, 0, 20],
  ['edge', 20, 20, 0, 20],
  ['edge', 20, 20, 20, 20],
  ['edge', 0, 10, 10, 10],
  ['edge', 1, 20, 0, 20],
  ['unequal arms', 56, 70, 48, 80],
  ['unequal arms', 9, 10, 3, 10],
  ['unequal arms', 6, 7, 2, 7],
  ['unequal arms', 5, 56, 0, 29],
  ['unequal arms', 0, 10, 0, 20],
  ['unequal arms', 10, 10, 0, 20],
];
const iv = {
  generated_by: 'scripts/spikes/W0-T07/keepkill.mjs',
  z: lib.Z,
  wilson: wilsonCases.map(([x, n]) => {
    const [l, u] = lib.wilson(x, n);
    return { x, n, l, u };
  }),
  newcombe: newcombeCases.map(([why, x1, n1, x2, n2]) => {
    const r = lib.newcombe(x1, n1, x2, n2);
    return { why, x1, n1, x2, n2, d: r.d, L: r.L, U: r.U, leads_by_10_points: lib.leadsByAtLeast(x1, n1, x2, n2, 10) };
  }),
};
const trap = { expression: '18/20 - 16/20', double: 18 / 20 - 16 / 20, below_0_10_in_doubles: 18 / 20 - 16 / 20 < 0.1, exact_test_10_points: lib.leadsByAtLeast(18, 20, 16, 20, 10) };
check('floating-point trap', trap.below_0_10_in_doubles && trap.exact_test_10_points, `${trap.expression} = ${trap.double} in doubles, below 0.1; the exact test finds 10 points`);
iv.floating_point_trap = trap;

const decisionCases = [
  { comparison: 3, label: 'clear benefit', input: { xb: 19, nb: 21, xa: 12, na: 21, phase: 'final', cheaperAlternative: false } },
  { comparison: 3, label: 'exactly 10 points, interval spans zero', input: { xb: 18, nb: 20, xa: 16, na: 20, phase: 'final', cheaperAlternative: false } },
  { comparison: 3, label: 'clear harm at the final read', input: { xb: 10, nb: 20, xa: 18, na: 20, phase: 'final', cheaperAlternative: false } },
  { comparison: 3, label: 'interim read, harm', input: { xb: 3, nb: 10, xa: 9, na: 10, phase: 'interim', cheaperAlternative: false } },
  { comparison: 3, label: 'interim read, no harm', input: { xb: 8, nb: 10, xa: 7, na: 10, phase: 'interim', cheaperAlternative: false } },
  { comparison: 3, label: 'below the minimum', input: { xb: 15, nb: 19, xa: 10, na: 21, phase: 'final', cheaperAlternative: false } },
  { comparison: 3, label: 'below the harm-read count', input: { xb: 5, nb: 9, xa: 8, na: 9, phase: 'final', cheaperAlternative: false } },
  { comparison: 2, label: 'non-inferior and cheaper (only with more units than comparison 2 lists)', input: { xb: 190, nb: 200, xa: 186, na: 200, phase: 'final', cheaperAlternative: true, alternativeCheaperInTime: true } },
  { comparison: 2, label: 'non-inferior but not cheaper', input: { xb: 190, nb: 200, xa: 186, na: 200, phase: 'final', cheaperAlternative: true, alternativeCheaperInTime: false } },
  { comparison: 2, label: 'cheaper, interval too wide', input: { xb: 17, nb: 20, xa: 17, na: 20, phase: 'final', cheaperAlternative: true, alternativeCheaperInTime: true } },
].map((c) => ({ ...c, result: lib.decideCommon(c.input, P) }));
const noteCases = [
  { label: 'open clearly better', input: { xo: 48, no: 52, xc: 30, nc: 52, phase: 'final' } },
  { label: 'collapsed clearly better', input: { xo: 28, no: 50, xc: 46, nc: 50, phase: 'final' } },
  { label: 'no clear difference', input: { xo: 40, no: 50, xc: 38, nc: 50, phase: 'final' } },
  { label: 'interim, open clearly worse', input: { xo: 3, no: 10, xc: 10, nc: 10, phase: 'interim' } },
].map((c) => ({ ...c, result: lib.decideNote(c.input, P) }));
const windowCases = [
  { label: 'ordered with the margin, secondary no worse', input: { reserve: [8, 9], noReserve: [11, 12], accReserve: { x: 10, n: 14 }, accNoReserve: { x: 11, n: 14 }, msReserve: [4, 5], msNoReserve: [5, 5], phase: 'final' } },
  { label: 'ordered, but accuracy worse', input: { reserve: [8, 9], noReserve: [11, 12], accReserve: { x: 11, n: 14 }, accNoReserve: { x: 10, n: 14 }, msReserve: [4, 5], msNoReserve: [5, 5], phase: 'final' } },
  { label: 'one window per arm', input: { reserve: [8], noReserve: [12], accReserve: { x: 5, n: 7 }, accNoReserve: { x: 6, n: 7 }, msReserve: [4], msNoReserve: [5], phase: 'final' } },
  { label: 'harm at a window end', input: { reserve: [10], noReserve: [7], accReserve: { x: 0, n: 0 }, accNoReserve: { x: 0, n: 0 }, msReserve: [4], msNoReserve: [3], phase: 'interim' } },
  { label: 'no KC with an outcome in one arm', input: { reserve: [8, 9], noReserve: [11, 12], accReserve: { x: 3, n: 4 }, accNoReserve: { x: 0, n: 0 }, msReserve: [4, 5], msNoReserve: [5, 5], phase: 'final' } },
].map((c) => ({ ...c, result: lib.decideWindows(c.input, P) }));
iv.decisions = { common: decisionCases, misconception_note: noteCases, reserve_weeks: windowCases };
const expectDecisions = ['switch', 'inconclusive', 'harm stop', 'harm stop', 'continue', 'not enough data', 'not enough data', 'switch', 'inconclusive', 'inconclusive'];
check('decision vectors', decisionCases.every((c, i) => c.result.decision === expectDecisions[i]), decisionCases.map((c) => `${c.label}: ${c.result.decision}`).join('; '));
const expectNote = ['open in every eligible KC', 'collapsed in every eligible KC', 'inconclusive: the shipped defaults stand', 'harm stop'];
check('comparison 1 vectors', noteCases.every((c, i) => c.result.decision === expectNote[i]), noteCases.map((c) => `${c.label}: ${c.result.decision}`).join('; '));
const expectWindows = ['switch', 'default stands', 'not enough data', 'harm stop', 'default stands'];
check('comparison 4 vectors', windowCases.every((c, i) => c.result.decision === expectWindows[i]), windowCases.map((c) => `${c.label}: ${c.result.decision}`).join('; '));

const chance = [[1, 1], [2, 1], [2, 2], [3, 2], [3, 3]].map(([a, d]) => lib.orderingChance(a, d));
iv.window_ordering_chance = chance;
check('window ordering chance', chance.find((c) => c.a === 2 && c.d === 2).oneIn === 6 && chance.find((c) => c.a === 3 && c.d === 3).oneIn === 20, chance.map((c) => `${c.a} against ${c.d}: 1 in ${c.oneIn}`).join('; '));

// ------------------------------------------------------------------ write
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'allocation-vectors.json'), `${JSON.stringify(allocation, null, 2)}\n`);
fs.writeFileSync(path.join(OUT, 'interval-vectors.json'), `${JSON.stringify(iv, null, 2)}\n`);
const precision = iv.newcombe.filter((r) => r.why.startsWith('precision')).map((r) => ({ per_arm: r.n1, half_width_points: Math.round(((r.U - r.L) / 2) * 1000) / 10, L: r.L, U: r.U }));
const summary = {
  ok: checks.every((c) => c.ok),
  checks,
  units: unitChecks,
  allocation_counts: allocation.comparisons.filter((c) => c.per_seed).map((c) => ({ number: c.number, per_seed: c.per_seed.map((s) => ({ seed: s.seed, counts: s.counts })) })),
  first_window: windows,
  precision,
  evidence_examples: iv.newcombe.filter((r) => r.why.startsWith('docs/EVIDENCE')).map((r) => ({ case: `${r.x1}/${r.n1} against ${r.x2}/${r.n2}`, L: r.L, U: r.U })),
  wilson_examples: iv.wilson.filter((r) => (r.x === 41 && r.n === 52) || (r.x === 10 && r.n === 12)),
  floating_point_trap: trap,
  window_ordering_chance: chance,
};
console.log(JSON.stringify(summary, null, 2));
process.exit(summary.ok ? 0 : 1);
