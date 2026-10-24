#!/usr/bin/env node
// How much of a plan change does GATE-budget see? (W0-T06)
//
// Plants one change at a time in a copy of the spine and runs the gate on it:
//   - every planned lab stage with its nominal minutes raised by 1, 5 and 15 (each is an addition to a stage's hours)
//   - every [stretch] lab stage raised by 100 minutes (the budget excludes stretch stages, so no change is expected to matter)
//   - every lesson with its tier flipped between bridge and core
// A change counts as seen when the gate then reports a failure of the rows, upper, keep or cadence check.
//
//   node scripts/spikes/W0-T06/mutation-sweep.mjs        prints the counts as JSON
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const gate = await import('../../verify-budget.mjs');
const { parseYaml } = await import('../../../packages/ids/src/yaml-subset.ts');

const real = gate.loadInputs(REPO);
const budget = parseYaml(real.budgetText);
const spine0 = real.spine;
const run = (spine) => gate.checkParsed(spine, structuredClone(budget), real.files);
const seen = (r) => r.findings.some((f) => f.severity === 'fail' && ['rows', 'upper', 'keep', 'cadence'].includes(f.check));

// the lab stage rows whose minutes cell is a plain number (LAB-10.8's cell reads "325 (9 passes)" and is left out)
const labRows = [...spine0.matchAll(/^\| (LAB-[0-9]+\.[0-9]+) \|(.*)\| ([0-9]+) \| (LAB-[0-9]+\.c[0-9]+:.*|—) \|$/gm)];
const planned = labRows.filter((m) => !/\[stretch\]/.test(m[2]));
const stretch = labRows.filter((m) => /\[stretch\]/.test(m[2]));
const raise = (m, by) => spine0.replace(m[0], m[0].replace(`| ${m[3]} | `, `| ${Number(m[3]) + by} | `));

const out = { baselineFailures: run(spine0).findings.filter((f) => f.severity === 'fail').length, labStages: {}, stretch: {}, tiers: {} };
for (const delta of [1, 5, 15]) {
  const escaped = planned.filter((m) => !seen(run(raise(m, delta)))).map((m) => m[1]);
  out.labStages[`+${delta} min`] = { planted: planned.length, seen: planned.length - escaped.length, escaped };
}
const stretchSeen = stretch.filter((m) => run(raise(m, 100)).findings.some((f) => f.severity === 'fail')).map((m) => m[1]);
out.stretch = { planted: stretch.length, '+100 min that changed the verdict': stretchSeen };
const lessonRows = [...spine0.matchAll(/^\| (S[0-9]+\.L[0-9]+) \| (bridge|core) \|/gm)];
const missed = lessonRows.filter((m) => !run(spine0.replace(m[0], `| ${m[1]} | ${m[2] === 'bridge' ? 'core' : 'bridge'} |`)).findings.some((f) => f.severity === 'fail')).map((m) => m[1]);
out.tiers = { planted: lessonRows.length, seen: lessonRows.length - missed.length, escaped: missed };
console.log(JSON.stringify(out, null, 2));
