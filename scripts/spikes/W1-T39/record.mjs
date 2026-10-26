#!/usr/bin/env node
// Record RUN-items-gate (W1-T39): GATE-items on this repository as the fast lane runs it, its JSON and verbose reports,
// the planted-fixture self-check, the tests (the weakened lints among them), and GEN-fixture with the t3 cue it shipped
// with put back (shipped-cue.mjs), served by its own engine at the gate's sample, which the gate must fail. Every log
// goes under runs/RUN-items-gate/ and the verdict lines are copied from them.
//
//   node scripts/spikes/W1-T39/record.mjs        about two minutes; no container, no network
//
// Spine section 9.5 registers no run for W1-T39. The ID is not in packages/ids/proposals.json, because GATE-links fails a
// proposal that no scanned document uses; the first scanned document that cites it proposes it.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileRecord, hostEnvironment, normalizePaths, posix, REPO, sha256, sha256File } from '../../runs/registry.mjs';
import { WEAKENINGS } from './weakenings.mjs';

const RUN_ID = 'RUN-items-gate';
const TASK = 'W1-T39';
const OUT = path.join(REPO, 'runs', RUN_ID);
const node = process.execPath;
const norm = (text) => normalizePaths(text, { sandbox: [os.tmpdir()] });

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const keep = (l) => /^(GATE-items|  ok |  FAIL|  ----|FAIL |held |planted fixtures|# (tests|pass|fail) )/.test(l);

/** Run one step, keep its normalized log, and return its configuration entry. */
function step(id, purpose, { cmd = node, args, expect = [0], lines = keep }) {
  const started = new Date();
  const t0 = process.hrtime.bigint();
  const r = spawnSync(cmd, args, { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 28 });
  const duration_s = Math.round((Number(process.hrtime.bigint() - t0) / 1e9) * 1000) / 1000;
  const text = norm(`${r.stdout ?? ''}${r.stderr ?? ''}`);
  const log = path.join(OUT, `${id}.log`);
  fs.writeFileSync(log, text);
  console.log(`${RUN_ID} ${id}: exit ${r.status} (expected ${expect.join(' or ')}), ${duration_s} s`);
  return {
    entry: {
      id,
      origin: 'recorded',
      purpose,
      started_at: started.toISOString(),
      duration_s,
      argv: [path.basename(cmd) === path.basename(node) ? 'node' : cmd, ...args.map(norm)],
      exit_code: r.status,
      expected_exit_codes: expect,
      verdict_lines: text.split('\n').filter((l) => l.trim() !== '' && lines(l)).slice(0, 80),
      outputs: [fileRecord(REPO, posix(path.relative(REPO, log)), { kind: 'log' })],
    },
    text,
    ok: expect.includes(r.status),
  };
}

const fast = step('fast', 'GATE-items as the fast lane runs it: every family, every page, and the planted fixtures', { args: ['scripts/verify-items.mjs'], expect: [0, 1] });
const json = step('fast-json', 'the same run as JSON, for the values below', { args: ['scripts/verify-items.mjs', '--json'], expect: [0, 1] });
const verbose = step('verbose', 'the same run with every strategy\'s score, both samples, and the notes', { args: ['scripts/verify-items.mjs', '--verbose'], expect: [0, 1] });
const self = step('self-check', 'the planted fixtures: one or more per rule/check pair of CHECKS, each of which must trip its own check on its own pool, each fixture of a limit just past it, each half of a two-half strategy and each verdict of a rule that counts verdicts with a fixture of its own, each branch of the centroid\'s tokenizer with a fixture of its own, the planted tree found by the gate\'s own discovery and read by the content build\'s reader (its scenes framed in each place a narrative can sit), GEN-call-it-shaped instances read by the gate\'s own sampler and instance reader, the default sample checked against 200 seeds per template and band, and the clean controls, which must stay green', { args: ['scripts/verify-items.mjs', '--self-check'] });
const tests = step('tests', `the tests: the planted fixtures, ${WEAKENINGS.length} weakened copies of the gate (each must fail the planted fixtures of the check it weakens, or, for a change to how a run samples the families, turn the gate's own run on GEN-fixture red: a strategy, check, reader or pool taken out, a strategy a neighbour stands in for or one of its two halves dropped, a verdict left out of a rule that counts them, a limit, the bar or the sample loosened a little, half of a condition dropped, a word of a vocabulary dropped, added or read case-sensitively, a reader losing a field, a source of narrative or a branch of the centroid's tokenizer dropped, discovery broken), the bar of ASSESSMENT.md section 7.3, the readers of verdicts and scenes, and the gate over pages in the content format read by the content build's own reader, among them a stage whose fixes are framed in each of five places before or in the cell`, { args: ['--test', 'scripts/spikes/W1-T39/verify-items.test.mjs'] });
const shipped = step('shipped-cue', 'GEN-fixture with the t3 cue it shipped with (the dp:Z5 mutant "drop a conjunct" put back where the family now offers dp:G5 "flip the connective only"), served by its own box engine at the gate\'s 200 seeds per template and band, as GATE-items sampled the family before W1-T39 changed it, and judged by every rule of the gate; the gate must fail it', { args: ['scripts/spikes/W1-T39/shipped-cue.mjs'], lines: (l) => /"(rule|check|score|bar|replicateScore|replicateBar|message)"/.test(l) });
const steps = [fast, json, verbose, self, tests, shipped];

// ------------------------------------------------------------------ values and checks
const report = JSON.parse(json.text);
const cue = JSON.parse(shipped.text);
const byRule = {};
for (const f of report.findings) byRule[`${f.rule}/${f.check}`] = (byRule[`${f.rule}/${f.check}`] ?? 0) + 1;
const row = (pool, strategy) => report.rows.find((r) => r.pool === pool && r.strategy === strategy) ?? null;
const round = (x) => (x === null || x === undefined ? null : Math.round(x * 10) / 10);
const longest = row('family:GEN-fixture', 'always-longest');
const cueRatio = cue.findings.find((f) => f.rule === 'length' && f.check === 'ratio');
const cueRatioMatch = cueRatio ? /^(\S+): (\d+) of (\d+) keys exceed [\d.]+ times their distractors' mean length \(largest ([\d.]+)/.exec(cueRatio.message) : null;
const cases = report.planted.filter((p) => p.check !== 'clean');
const controls = report.planted.filter((p) => p.check === 'clean');
const checksTotal = Number(/each of the (\d+) checks/.exec(self.text)?.[1] ?? Number.NaN);
const pairsHeld = new Set(cases.filter((p) => p.pass).map((p) => `${p.rule}/${p.check}`));
const weakened = tests.text.split('\n').filter((l) => /^\s+ok \d+ - .+ \([a-z-]+\/[^)]+\)\s*$/.test(l)).length;
const byRun = WEAKENINGS.filter((w) => w[4] === 'run').length;
const versionOf = (pkg) => JSON.parse(fs.readFileSync(path.join(REPO, 'node_modules', pkg, 'package.json'), 'utf8')).version;

const checks = [
  { id: 'self-check-holds', pass: self.ok && /self-check: green/.test(self.text) },
  { id: 'every-check-tripped-by-a-planted-fixture', pass: Number.isFinite(checksTotal) && pairsHeld.size === checksTotal && cases.every((p) => p.pass) },
  { id: 'clean-controls-green', pass: controls.length > 0 && controls.every((p) => p.pass) },
  { id: 'weakened-lints-caught', pass: tests.ok && weakened === WEAKENINGS.length },
  { id: 'tests-pass', pass: tests.ok },
  { id: 'shipped-t3-cue-fails', pass: shipped.ok && cue.alwaysLongest?.fail === true && cueRatioMatch !== null },
  { id: 'fix-framed-before-the-cell-fails', pass: /^\s+ok \d+ - a stage whose fixes are framed before the cell fails the surprise share, wherever the framing sits\s*$/m.test(tests.text) },
  { id: 'fast-lane-green', pass: fast.entry.exit_code === 0 && /^GATE-items: green/m.test(fast.text) },
];

const manifest = (dir) => {
  const files = [];
  const walk = (rel) => {
    for (const e of fs.readdirSync(path.join(REPO, rel), { withFileTypes: true })) {
      const child = `${rel}/${e.name}`;
      if (e.isDirectory()) walk(child);
      else files.push(child);
    }
  };
  walk(dir);
  const lines = files.map((f) => `${sha256File(path.join(REPO, f))}  ${f}`).sort();
  return { path: dir, sha256: sha256(Buffer.from(`${lines.join('\n')}\n`)), sha256_method: 'SHA-256 of the sorted "sha256  path" lines of every file under the path', files: files.length };
};

const pagePools = report.pools.filter((p) => p.kind !== 'family');
const pagesNote = pagePools.length > 0
  ? `The page pools judged: ${pagePools.map((p) => p.id).join(', ')}.`
  : 'No lesson or drawer page existed when this was recorded; the S1 pages and the drawers are judged by the same run as they land.';
const al = cue.alwaysLongest;

const record = {
  id: RUN_ID,
  title: 'GATE-items on this repository: the generator fixture family\'s pool, a planted fixture for every check and the clean controls, the weakened lints, and the fixture with the t3 cue it shipped with',
  task: TASK,
  origin: 'recorded',
  engine: 'node',
  version: process.versions.node,
  binary: 'node (the host binary; no container)',
  binary_sha256: sha256File(node),
  image: null,
  recorded_at: new Date().toISOString(),
  started_at: fast.entry.started_at,
  duration_s: Math.round(steps.reduce((s, x) => s + x.entry.duration_s, 0) * 1000) / 1000,
  argv: fast.entry.argv,
  inputs: [
    { ...fileRecord(REPO, 'scripts/verify-items.mjs'), role: 'gate' },
    { ...fileRecord(REPO, 'vendor/kernelspace/scripts/item-cues.ts'), role: 'vendored strategies, imported unchanged' },
    { ...fileRecord(REPO, 'scripts/verify-generators.mjs'), role: 'GATE-generators\' discovery of families and the registry, shared' },
    { ...manifest('packages/generators/src/core'), role: 'the generator framework and its fixture family (with W1-T39\'s change to t3 and the re-recorded determinism.json), the pool judged here' },
    { ...manifest('packages/content/src'), role: 'the content build\'s reader of lessons and drawers' },
    { ...manifest('packages/rng/src'), role: 'seeded draws for the samples' },
    { ...fileRecord(REPO, 'packages/ids/src/registry.json'), role: 'the spine registry (misconception keys)' },
    { ...fileRecord(REPO, 'scripts/spikes/W1-T39/verify-items.test.mjs'), role: 'tests' },
    { ...fileRecord(REPO, 'scripts/spikes/W1-T39/weakenings.mjs'), role: 'the weakened copies of the gate the tests require the planted fixtures, or the gate\'s run, to catch' },
    { ...fileRecord(REPO, 'scripts/spikes/W1-T39/shipped-cue.mjs'), role: 'GEN-fixture with its shipped t3 cue put back, judged by the gate' },
    { ...fileRecord(REPO, 'scripts/spikes/W1-T39/W1-T21-t3-mutant.patch'), role: 'the change W1-T39 made to W1-T21\'s fixture family and README on 2026-10-25, kept as its record' },
    { ...fileRecord(REPO, 'scripts/spikes/W1-T39/record.mjs'), role: 'recording script' },
  ],
  budget: { seeds_per_template_and_band: 200, samples: ['primary', 'replicate'], sd_multiple: 2, vendored_cue_margin_points: 15, vendored_cue_min_items: 100, network: 'none' },
  exit_code: fast.entry.exit_code,
  verdict_lines: fast.entry.verdict_lines,
  outputs: steps.flatMap((s) => s.entry.outputs),
  values: {
    families: report.families.map((f) => ({ id: f.id, mode: f.mode, live: f.live, pending: f.pending, seeds_per_cell: f.seedsPerCell, items: f.items, replicate: f.replicate })),
    pages: pagePools.length,
    findings: report.findings.length,
    findings_by_check: byRule,
    checks: checksTotal,
    planted_cases: cases.length,
    planted_cases_held: cases.filter((p) => p.pass).length,
    clean_controls: controls.length,
    clean_controls_green: controls.filter((p) => p.pass).length,
    weakened_lints: WEAKENINGS.length,
    weakened_lints_by_run: byRun,
    weakened_lints_caught: weakened,
    fixture_always_longest: longest ? { score: round(longest.primary.x), chance: round(longest.primary.mu), bar: round(longest.primary.bar), replicate_score: round(longest.replicate?.x), replicate_bar: round(longest.replicate?.bar), n: longest.primary.n, fail: longest.fail } : null,
    shipped_t3_cue: {
      mode: cue.mode,
      seeds_per_cell: cue.seedsPerCell,
      always_longest: al,
      length_ratio: cueRatioMatch ? { cell: cueRatioMatch[1], over: Number(cueRatioMatch[2]), of: Number(cueRatioMatch[3]), largest: Number(cueRatioMatch[4]) } : null,
      findings: cue.findings.map((f) => `${f.rule}/${f.check}`),
    },
    tools: { typescript: versionOf('typescript'), yaml: versionOf('yaml') },
  },
  checks,
  pass: checks.every((c) => c.pass),
  environment: { ...hostEnvironment(), node: process.version, container: null },
  primary_config: 'fast',
  configs: steps.map((s) => s.entry),
  unrecorded: [{ field: 'image', reason: 'every step ran on the host with no container' }],
  notes: [
    `Families judged: ${report.families.map((f) => `${f.id} (${f.mode === 'served' ? 'served by its own engine' : 'as make() offers it'}, ${f.seedsPerCell} seeds per template and band)`).join(', ')}. ${pagesNote}`,
    `GEN-fixture's t3 carried a length cue as W1-T21 shipped it: the dp:Z5 mutant "drop a conjunct" was always the shortest option. The shipped-cue step puts that mutant back, serves the family by its box engine at ${cue.seedsPerCell} seeds per template and band as GATE-items sampled it before the change, and the gate fails it: always-longest ${al?.score} of ${al?.n} against a bar of ${al?.bar} (replicate ${al?.replicateScore} against ${al?.replicateBar})${cueRatioMatch ? `, and ${cueRatioMatch[1]} has ${cueRatioMatch[2]} of ${cueRatioMatch[3]} keys over 1.3 times their distractors' mean length` : ''}. As this round permits, W1-T39 made the change in W1-T21's files that the earlier rounds asked of W1-T21: "flip the connective only" (dp:G5) replaces that mutant in packages/generators/src/core/fixture/index.ts, the framework README's section 9 stops listing dp:Z5 among the fixture's tags (scripts/spikes/W1-T39/W1-T21-t3-mutant.patch), and scripts/spikes/W1-T21/record.mjs re-recorded determinism.json, whose t3 digests and family digest changed, in Node, Chromium, Firefox and WebKit, re-recording RUN-generators-gate with it. On the changed family always-longest scores ${longest ? `${round(longest.primary.x)} of ${longest.primary.n} against a bar of ${round(longest.primary.bar)}` : 'nothing'}.`,
    'Every finding carries a rule/check pair of the gate\'s CHECKS list (finding() refuses any other), and every pair has a planted fixture that must trip it; where a check is read on several pools (a family, one template of a family, a stage\'s authored items, a stage\'s pool, the drawers) a fixture trips it on each. The fixtures are built so that only the lint as written trips them: a fixture of a limit sits just past it (a key 1.31 times its distractors\' mean length, 91 of 300 keys strictly longest, 11 surprises in 37 calls, 31 of 51 and 181 of 300 calls one verdict, 60.25% and 39.75% true, 100 items for the vendored strategies, a score 0.1 over chance + 2 SD, 199 seeds per template and band); a strategy\'s fixture is one its neighbours do not trip, and each half of a two-half strategy (last-is-sound, narrative-blind, each odd-one-out flag) has a fixture that half alone stays under; each verdict has a fixture where a rule counts verdicts, and the CTI dose has fixtures for stages outside S4 to S9 and for each way it turns on; each word of a vocabulary the gate reads has its own fixture, and a capitalized verdict, fix, hedge and budget-stop word is read too; lesson pages (one numbered S10.L10), a drawer, a run record and generator sources are written to a scratch tree and found by the gate\'s own discovery, with fixes framed in a cell\'s own text, its @direction and its call\'s prompt, and before the cell in a prose block, a card\'s title or text, a free-run cell\'s text, @direction or @after, and the previous call\'s @after (each in one place alone; a call after a fix whose own narrative frames none is a new query, and a free-run cell\'s code is not narrative), and keys resting on the call\'s run and on the cell\'s recorded run; the centroid has a fixture for each branch of its tokenizer, one-edit mutants of a phrase (words) and of a formula\'s comparisons (symbols alone: the options share every word and number and have one length); GEN-call-it-shaped instances go through the gate\'s own sampler and instance reader; and GEN-fixture with the t3 cue it shipped with is sampled at the gate\'s 200 seeds per template and band, which the cue needs (at 100 it passes). The vendored strategies each get a generated pool keyed by their own pick.',
    'Scenes: the first call of a segment opens a scene whatever its words, and a later call is a fix when the narrative since the previous call frames an edit as one (that call\'s @after, the prose, cards and free-run cells between, and the cell\'s own text, @direction and prompt, never code). The tests run ASSESSMENT.md section 5.5\'s most predictable narrative (on seven pages a first run keyed sat, then a fix keyed unsat, then a new segment\'s query keyed sat; three more pages of unknowns and a first-run unsat) with the fix framed in each of five places, and the stage fails the surprise share in every one (8 of 30 calls, 26.7%) and the narrative-blind strategy too (22.0 of 30 against a bar of 15.2).',
    'A run\'s families carry the seeds each template and band was drawn from, and a family drawn from fewer than 200 fails structure/sample, so a smaller run (--seeds, a lowered default, or a change to how a run samples) is red, never green; the self-check also checks the default sample against 200, written out.',
    `The tests weaken the gate ${WEAKENINGS.length} ways (scripts/spikes/W1-T39/weakenings.mjs) and require the planted fixtures of the weakened check to fail on each copy, or, for the ${byRun} that change how a run samples the families, the weakened gate's own run on GEN-fixture to carry a structure/sample finding.`,
    'A generated pool fails a strategy only when the primary sample and a disjoint replicate sample both beat chance + 2 SD; an authored pool is exact. Seeds come from fixed labels in the graded half.',
    'This ran on the development host, not on a CI runner.',
    'Spine section 9.5 registers no run for this task; the ID is proposed once a scanned document cites it.',
  ],
};
fs.writeFileSync(path.join(REPO, 'runs', `${RUN_ID}.json`), `${JSON.stringify(record, null, 2)}\n`);
console.log(`${RUN_ID}: ${checks.filter((c) => c.pass).length} of ${checks.length} checks pass${record.pass ? '' : ` (${checks.filter((c) => !c.pass).map((c) => c.id).join(', ')} not)`}`);
