#!/usr/bin/env node
// Record RUN-audit-gate and RUN-audit-blind-gate (W1-T40): each gate on this repository as its lane runs it, on the
// W1-shaped fixture pool written as files, and its planted-fault self-check; the tests; and, for GATE-audit-blind,
// the calibration of its verdict rule (calibrate.mjs). Every log goes under runs/RUN-*/ and the verdict lines are
// copied from them, with private paths replaced by <sandbox>.
//
//   W1T40_SCRATCH=<a scratch folder> node scripts/spikes/W1-T40/record.mjs     a few minutes; no network, no Docker
//
// Spine section 9.5 registers no run for this task; the IDs are proposed once a scanned document cites them.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileRecord, hostEnvironment, normalizePaths, posix, REPO, sha256, sha256File } from '../../runs/registry.mjs';

const TASK = 'W1-T40';
const node = process.execPath;
const base = process.env.W1T40_SCRATCH ?? os.tmpdir();
const scratch = fs.mkdtempSync(path.join(base, 'w1t40-record-'));
const sandbox = [scratch, base, os.tmpdir()].filter(Boolean).sort((a, b) => b.length - a.length);
const childEnv = { ...process.env, TMPDIR: scratch };

const fx = await import(path.join(REPO, 'scripts', 'spikes', 'W1-T40', 'lib', 'fixtures.mjs'));

const LIB = path.join(REPO, 'scripts', 'spikes', 'W1-T40', 'lib');

/**
 * A scratch tree sharing the repository's registry, spine, tracker, runs and paths, with the fixture pool in
 * content/audit. `battery` puts the stand-in keying battery (or a module's source) where GEN-spot-the-gap will live; `judgment`, a Desk
 * module's source, where W1-T32's will live (packages/ then holds only the registry and those modules); `world` puts a
 * stand-in Clearinghouse serving fair incidents keyed G7 at S1 where W3-T14's will live; `mutate(docs)` edits the pool.
 */
function fixtureTree(name, { battery = false, judgment = null, world = false, mutate = null } = {}) {
  const t = path.join(scratch, name);
  fs.mkdirSync(t);
  fs.writeFileSync(path.join(t, 'package.json'), '{ "type": "module" }\n');
  for (const d of ['docs', 'tracker', 'runs', 'research']) fs.symlinkSync(path.join(REPO, d), path.join(t, d));
  const write = (rel, text) => {
    fs.mkdirSync(path.dirname(path.join(t, rel)), { recursive: true });
    fs.writeFileSync(path.join(t, rel), text);
  };
  if (battery || judgment) {
    fs.mkdirSync(path.join(t, 'packages', 'ids', 'src'), { recursive: true });
    fs.symlinkSync(path.join(REPO, 'packages', 'ids', 'src', 'registry.json'), path.join(t, 'packages', 'ids', 'src', 'registry.json'));
    if (battery) write('packages/generators/src/spot-the-gap/index.ts', typeof battery === 'string' ? battery : `import { fixtureBattery, boxPort, BOX_ENGINE } from ${JSON.stringify(path.join(LIB, 'fixtures.mjs'))}\nexport const auditBattery = fixtureBattery()\nexport const ports = { [BOX_ENGINE]: boxPort }\n`);
    if (judgment) write('packages/learner/judgment/index.ts', judgment);
  } else fs.symlinkSync(path.join(REPO, 'packages'), path.join(t, 'packages'));
  if (world) write('apps/instruments/src/engines/clearinghouse/audit.ts', `import { fixtureWorldIncidents } from ${JSON.stringify(path.join(LIB, 'fixtures.mjs'))}\nexport const auditFamilies = []\nexport function auditIncidentBlocks(seed: number, blocks: number) { return fixtureWorldIncidents(seed, blocks, { klass: 'G7', stage: 'S1' }) }\n`);
  fs.mkdirSync(path.join(t, 'content'));
  for (const d of fs.readdirSync(path.join(REPO, 'content'))) if (d !== 'audit') fs.symlinkSync(path.join(REPO, 'content', d), path.join(t, 'content', d));
  fs.mkdirSync(path.join(t, 'content', 'audit'));
  const docs = fx.w1Pool();
  if (mutate) mutate(docs);
  for (const a of docs) fs.writeFileSync(path.join(t, 'content', 'audit', `${a.id}.json`), `${JSON.stringify(a, null, 2)}\n`);
  return t;
}

/** A Desk module (W1-T32's contract) whose scorer drops `ba` and shows v1's figure as `balanced-accuracy` (AUDIT-DESK 1.4). */
const v1DeskModule = [
  `import { referenceCompose } from ${JSON.stringify(path.join(LIB, 'blind.mjs'))}`,
  `import { fixtureAuditFigures, v1BalancedAccuracy } from ${JSON.stringify(path.join(LIB, 'fixtures.mjs'))}`,
  `import { loadRegistry } from ${JSON.stringify(path.join(LIB, 'pool.mjs'))}`,
  "export const AUDIT_SURFACES = ['desk', 'today', 'part-c']",
  'export const composeAuditSitting = referenceCompose',
  `export const auditFigures = fixtureAuditFigures(loadRegistry(${JSON.stringify(REPO)}).topClasses, { drop: (id) => id === 'ba', extra: [{ id: 'balanced-accuracy', kind: 'decision', of: v1BalancedAccuracy }] })`,
].join('\n') + '\n';

/** A Desk module (W1-T32's contract) whose composer returns no sitting for any Desk session and the reference composer's sittings on the other surfaces. */
const nullDeskModule = [
  `import { referenceCompose } from ${JSON.stringify(path.join(LIB, 'blind.mjs'))}`,
  `import { fixtureAuditFigures } from ${JSON.stringify(path.join(LIB, 'fixtures.mjs'))}`,
  `import { loadRegistry } from ${JSON.stringify(path.join(LIB, 'pool.mjs'))}`,
  "export const AUDIT_SURFACES = ['desk', 'today', 'part-c']",
  "export function composeAuditSitting(args) { return args.surface === 'desk' ? null : referenceCompose(args) }",
  `export const auditFigures = fixtureAuditFigures(loadRegistry(${JSON.stringify(REPO)}).topClasses)`,
].join('\n') + '\n';

/** A Desk module (W1-T32's contract) whose composer returns no sitting for the first Desk session it is asked for, the rule's edge, and fills every other one. */
const oneDeclinedModule = [
  `import { referenceCompose } from ${JSON.stringify(path.join(LIB, 'blind.mjs'))}`,
  `import { fixtureAuditFigures } from ${JSON.stringify(path.join(LIB, 'fixtures.mjs'))}`,
  `import { loadRegistry } from ${JSON.stringify(path.join(LIB, 'pool.mjs'))}`,
  "export const AUDIT_SURFACES = ['desk', 'today', 'part-c']",
  'let asked = 0',
  "export function composeAuditSitting(args) { return args.surface === 'desk' && asked++ === 0 ? null : referenceCompose(args) }",
  `export const auditFigures = fixtureAuditFigures(loadRegistry(${JSON.stringify(REPO)}).topClasses)`,
].join('\n') + '\n';

/** A battery in GEN-spot-the-gap's place that wraps the stand-in and returns each flawed key's lines as loadBearing, the spelling of the case it receives, not load_bearing. */
const misspelledBattery = [
  `import { fixtureBattery, boxPort, BOX_ENGINE } from ${JSON.stringify(path.join(LIB, 'fixtures.mjs'))}`,
  'const inner = fixtureBattery()',
  "export const auditBattery = { engines: inner.engines, async key(c, port) { const k = await inner.key(c, port); return k && k.evidence && k.primary !== 'none' ? { ...k, evidence: { type: k.evidence.type, loadBearing: k.evidence.load_bearing } } : k } }",
  'export const ports = { [BOX_ENGINE]: boxPort }',
].join('\n') + '\n';

/** AUD-1.1's flawed member with load-bearing lines that are not its unsat core (statement:6 and statement:7). */
const wrongLines = (docs) => {
  docs.find((d) => d.id === 'AUD-1.1').cases.find((c) => c.id === 'flawed').evidence.load_bearing = ['statement:3', 'statement:7'];
};

/** AUD-1.2's six variant pairs replaced by byte-identical copies of its pair v1, relabeled copy-1 to copy-6. */
const relabeledCopies = (docs) => {
  const a = docs.find((d) => d.id === 'AUD-1.2');
  const v1 = a.variants.filter((c) => c.pair === 'v1');
  a.variants = [1, 2, 3, 4, 5, 6].flatMap((k) => v1.map((c) => ({ ...structuredClone(c), id: c.id.replace(/^v1-/, `copy-${k}-`), pair: `copy-${k}`, artifact: `copy-${k}` })));
};

/** Run one step, keep its normalized log, and return its configuration entry. */
function step(out, id, purpose, { cmd = node, args, shown, expect = [0], keep }) {
  const started = new Date();
  const t0 = process.hrtime.bigint();
  const r = spawnSync(cmd, args, { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 28, env: childEnv });
  const duration_s = Math.round((Number(process.hrtime.bigint() - t0) / 1e9) * 1000) / 1000;
  const text = normalizePaths(`${r.stdout ?? ''}${r.stderr ?? ''}`, { sandbox });
  const log = path.join(out, `${id}.log`);
  fs.writeFileSync(log, text);
  const lines = text.split('\n').filter((l) => l.trim() !== '');
  console.log(`${path.basename(out)} ${id}: exit ${r.status} (expected ${expect.join(' or ')}), ${duration_s} s`);
  return {
    entry: {
      id,
      origin: 'recorded',
      purpose,
      started_at: started.toISOString(),
      duration_s,
      argv: shown,
      exit_code: r.status,
      expected_exit_codes: expect,
      verdict_lines: lines.filter(keep).slice(0, 80),
      outputs: [fileRecord(REPO, posix(path.relative(REPO, log)), { kind: 'log' })],
    },
    text,
    ok: expect.includes(r.status),
  };
}

const manifest = (dir) => {
  const files = [];
  const walk = (rel) => {
    for (const e of fs.readdirSync(path.join(REPO, rel), { withFileTypes: true })) {
      const child = `${rel}/${e.name}`;
      if (e.isDirectory()) walk(child);
      else if (e.name !== 'README.md') files.push(child); // the README cites this run; it is not an input of it
    }
  };
  walk(dir);
  const lines = files.map((f) => `${sha256File(path.join(REPO, f))}  ${f}`).sort();
  return { path: dir, sha256: sha256(Buffer.from(`${lines.join('\n')}\n`)), sha256_method: 'SHA-256 of the sorted "sha256  path" lines of every file under the path but README.md', files: files.length };
};

const commonInputs = [
  { ...manifest('scripts/spikes/W1-T40'), role: 'the gates\' library, fixtures, calibration, tests and this recording script' },
  { ...fileRecord(REPO, 'packages/ids/src/registry.json'), role: 'the spine registry (anchors, stages, gap classes, KCs, lessons, labs)' },
  { ...fileRecord(REPO, 'docs/spine/SPINE.md'), role: 'section 6.2, the anchors\' classes and key runs' },
  { ...fileRecord(REPO, 'content/stages/budget.yaml'), role: 'the two published paths' },
  { ...fileRecord(REPO, 'tracker/tasks.yaml'), role: 'the landing tasks of pending declarations' },
  { ...fileRecord(REPO, 'packages/rng/src/draw.ts'), role: 'the seeded draws' },
];

function writeRecord(id, record) {
  fs.writeFileSync(path.join(REPO, 'runs', `${id}.json`), `${JSON.stringify(record, null, 2)}\n`);
  console.log(`${id}: ${record.pass ? 'pass' : 'FAIL'} (${record.checks.filter((c) => !c.pass).map((c) => c.id).join(', ') || 'every check passed'})`);
}

const environment = { ...hostEnvironment(), node: process.version, container: null };
const lastLine = (text) => text.trim().split('\n').at(-1) ?? '';

// ------------------------------------------------------------------ RUN-audit-blind-gate

{
  const RUN_ID = 'RUN-audit-blind-gate';
  const OUT = path.join(REPO, 'runs', RUN_ID);
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const keep = (l) => /^(GATE-audit-blind|  ok |  FAIL|FAIL |held |  stage-only|  note: |# (tests|pass|fail) )/.test(l);
  const tree = fixtureTree('blind-tree');
  const steps = [];
  const fast = step(OUT, 'fast', 'GATE-audit-blind as the fast lane runs it, on this repository, whose pool does not exist yet', { args: ['scripts/verify-audit-blind.mjs'], shown: ['node', 'scripts/verify-audit-blind.mjs'], keep });
  steps.push(fast);
  // The calibration runs before the self-check, which reads the inflation it measured (runs/RUN-audit-blind-gate/calibration.json).
  const calibFile = path.join(OUT, 'calibration.json');
  const calib = step(OUT, 'calibration', 'the verdict rule on the valid fixture pool over 100 seed configurations, under the single-stream rule (1 replicate) and the gate\'s rule (8 replicates), and its power on a planted position cue over 40 configurations each; with the spread of the replicate-mean z, and, under the position cue at three strengths and a topic cue at two, how much more widely the test each cue moves most spreads than the null predicts, which checks the noise inflation the printed detection threshold allows for', { args: ['scripts/spikes/W1-T40/calibrate.mjs', '--configs', '100', '--power-configs', '40', '--out', calibFile], shown: ['node', 'scripts/spikes/W1-T40/calibrate.mjs', '--configs', '100', '--power-configs', '40', '--out', `runs/${RUN_ID}/calibration.json`], keep: () => false });
  calib.entry.outputs.push(fileRecord(REPO, posix(path.relative(REPO, calibFile)), { kind: 'report' }));
  steps.push(calib);
  const fixture = step(OUT, 'fixture-pool', 'the gate on the W1-shaped fixture pool written as files under content/audit/ of a scratch tree: green, with its bound as its last line', { args: ['scripts/verify-audit-blind.mjs', '--root', tree], shown: ['node', 'scripts/verify-audit-blind.mjs', '--root', '<sandbox>/blind-tree'], keep });
  steps.push(fixture);
  const json = step(OUT, 'fixture-pool-json', 'the same run as JSON: the bound and the stage-only floor', { args: ['scripts/verify-audit-blind.mjs', '--root', tree, '--json'], shown: ['node', 'scripts/verify-audit-blind.mjs', '--root', '<sandbox>/blind-tree', '--json'], keep: () => false });
  steps.push(json);
  const worldTree = fixtureTree('blind-tree-world', { world: true });
  const worldJson = step(OUT, 'fixture-pool-world-json', 'the same pool with a stand-in Clearinghouse in W3-T14\'s place serving fair incidents keyed G7 at S1, a class the pool lacks at a stage it holds, as JSON: the incidents are tested in their own stream, and every path stream\'s verdicts and the stage-only floor must equal those of fixture-pool-json', { args: ['scripts/verify-audit-blind.mjs', '--root', worldTree, '--json'], shown: ['node', 'scripts/verify-audit-blind.mjs', '--root', '<sandbox>/blind-tree-world', '--json'], keep: () => false });
  steps.push(worldJson);
  const v1Tree = fixtureTree('blind-tree-v1-scorer', { judgment: v1DeskModule });
  const v1Scorer = step(OUT, 'fixture-pool-v1-scorer', 'the same pool with a Desk module in W1-T32\'s place whose scorer drops ba and shows v1\'s mean of TPR and precision on rejections as balanced-accuracy: the gate must fail on the missing ba', { args: ['scripts/verify-audit-blind.mjs', '--root', v1Tree], shown: ['node', 'scripts/verify-audit-blind.mjs', '--root', '<sandbox>/blind-tree-v1-scorer'], expect: [1], keep: (l) => keep(l) && !/^ {2}(ok|FAIL) /.test(l) });
  steps.push(v1Scorer);
  const nullDeskTree = fixtureTree('blind-tree-null-desk', { judgment: nullDeskModule });
  const nullDesk = step(OUT, 'fixture-pool-null-desk', 'the same pool with a Desk module in W1-T32\'s place whose composer returns no sitting for any Desk session and the reference composer\'s sittings elsewhere: the gate must fail on each path\'s Desk stream, because the reference composer fills every one of those sittings', { args: ['scripts/verify-audit-blind.mjs', '--root', nullDeskTree], shown: ['node', 'scripts/verify-audit-blind.mjs', '--root', '<sandbox>/blind-tree-null-desk'], expect: [1], keep: (l) => keep(l) && !/^ {2}(ok|FAIL) /.test(l) });
  steps.push(nullDesk);
  const oneTree = fixtureTree('blind-tree-one-declined', { judgment: oneDeclinedModule });
  const oneDeclined = step(OUT, 'fixture-pool-one-declined', 'the same pool with a Desk module in W1-T32\'s place whose composer returns no sitting for the first Desk session it is asked for and fills every other one, the null rule at its edge: the gate must fail with one declined sitting, because the reference composer fills it', { args: ['scripts/verify-audit-blind.mjs', '--root', oneTree], shown: ['node', 'scripts/verify-audit-blind.mjs', '--root', '<sandbox>/blind-tree-one-declined'], expect: [1], keep: (l) => keep(l) && !/^ {2}(ok|FAIL) /.test(l) });
  steps.push(oneDeclined);
  const self = step(OUT, 'self-check', 'one planted fault at a time, each of which must fail the gate: composers that serve a sound case last, favor the topic, draw cases so that a stage predicts soundness (advisory, failing under --strict), serve an all-flawed Desk session, one sound case more or one fewer than the share allows on the Desk and in Part C, a Today block one serve short or one over, one case twice, both members of a pair together or a case outside the eligible ones, or throw; composers that return no Desk sitting where the reference composer fills them, none after S1 while filling the rest, a single one, or none at all, and one that never serves a family it is offered; flawed forms with longer diffs (under --strict); scorers whose ba is v1\'s figure, counts only correct findings, or is half a point off; a leaky Clearinghouse; a three-line case, an anchor whose stage is not a stage, an anchor never served, found on each path, a case without a key read from files; judgment modules without the contract, at the wrong place, without auditFigures or AUDIT_SURFACES, naming a surface the gate does not know, listing its composer for none of the surfaces the gate composes, or exported under a missing file, and one read from files that lists every surface and declines every Part C draw; a scorer figure of a kind the gate has no null for; a sound case served last, scored by the Desk\'s own scorer; Desk scorers that drop ba (showing v1\'s figure under another name), give it as NaN, or drop tpr or tnr, each found on every path stream, every per-class figure, the per-class precision or the Part C pass rate, found on both Part C streams; Clearinghouse incidents without a stage, tagged with a lesson in place of a stage, keyed with a class that is not a gap class, or flawed without load-bearing lines (a pool case\'s shape); Clearinghouse modules without auditIncidentBlocks, or whose auditIncidentBlocks returns nothing, one block fewer than asked for or an empty block, while one that returns the blocks asked for is read. It also checks that the clean fixture passes with its bound printed; the bound (2 SD, 1,000 permutations, the detection threshold\'s formula, an inflation allowance no smaller than the largest the calibration measured) and, on a constructed result, each figure\'s widest SD among the blocking tests on every stream; the stage-only floor\'s classes; the reference scorer\'s figures on hand-built Desk and Part C streams, which the stand-in Desk scorer must match from the decision objects; the streams of README section 7.1 (Desk sizes, Today blocks, Part C draws from the Defence stage\'s own cases, a lab done once its non-stretch stages are, no sitting with more than half its slots above its median diff); the reference composer\'s draws (every k the share allows, shuffled slots, Today\'s sound share), its unseen-first Today blocks and its cap on the topic stage; the four blocking strategies tested on every stream; the verdict rule on replicates with known figures (2.05 SD fails, 1.95 SD passes, means of 2.5, 1.5 and 2.1 SD over the replicates, a figure shown in 4 of 8 replicates is tested and in 3 of 8 is not, and over replicates whose SDs differ, 0.04 and 0.02, 2.1 root-mean SDs fail and 1.9 pass); the sound share\'s ranges; the blind line choice of up to three lines; that a scorer filing part-c-pass with the decision figures still has last-is-sound tested on it; that fair incidents pass; and that fair incidents of a class the pool lacks (G7 at S1) leave every path stream\'s verdicts, the floor and the findings on a planted topic cue as they were', { args: ['scripts/verify-audit-blind.mjs', '--self-check'], shown: ['node', 'scripts/verify-audit-blind.mjs', '--self-check'], keep });
  steps.push(self);
  const mutants = step(OUT, 'mutants', 'GATE-audit-blind\'s rules weakened one at a time in a scratch copy of the gates and lib/ (scripts/spikes/W1-T40/mutants.mjs): the verdict rule and its edges, the SD pooled over the replicates, the bound and the SD it takes per figure, the nulls, the strategies and the blind line choice, the base rates, the stage-only floor, the scorer\'s checks and required figures, the composer\'s rules with the sound share\'s edges, the composer\'s contract (declined sittings down to one, families never served, the surfaces a module lists), the Clearinghouse module\'s return and its incidents\' shape, the reference scorer\'s definitions, the streams of README section 7.1 and the reference composer\'s draws and cap, the pool\'s shape problems and the module contracts, plus, made stricter, the values at an edge that pass; its self-check must fail on every one', { args: ['scripts/spikes/W1-T40/mutants.mjs', '--gate', 'blind'], shown: ['node', 'scripts/spikes/W1-T40/mutants.mjs', '--gate', 'blind'], keep: (l) => /^(mutants: |survived |error )/.test(l) });
  steps.push(mutants);

  const report = JSON.parse(json.text);
  const withWorld = JSON.parse(worldJson.text);
  const worldGroup = withWorld.groups.find((g) => g.surface === 'clearinghouse');
  const pathGroups = withWorld.groups.filter((g) => g.path !== 'world');
  const c = JSON.parse(fs.readFileSync(calibFile, 'utf8'));
  const checks = [
    { id: 'fast-lane-green', pass: fast.ok && /GATE-audit-blind: green/.test(lastLine(fast.text)) },
    { id: 'fixture-pool-green', pass: fixture.ok && /^GATE-audit-blind: green; bound: /.test(lastLine(fixture.text)) },
    // The world's incidents never move a path stream: the strategies on a path know the pool's base rates only.
    { id: 'incidents-leave-paths-unchanged', pass: worldJson.ok && withWorld.exit === 0 && Boolean(worldGroup) && worldGroup.streams.length === 8 && JSON.stringify(pathGroups) === JSON.stringify(report.groups) && JSON.stringify(withWorld.floor) === JSON.stringify(report.floor) },
    { id: 'desk-scorer-without-ba-fails', pass: v1Scorer.ok && /^FAIL {2}scorer {2}.*the scorer shows no ba, /m.test(v1Scorer.text) },
    // A null where the reference composer fills the sitting is a declined sitting, not one the pool cannot fill.
    { id: 'desk-composer-declining-fails', pass: nullDesk.ok && ['default', 'builder'].every((p) => new RegExp(`^FAIL {2}composer {2}${p}/desk {2}the composer returned no sitting for ([0-9]+) of the \\1 desk sittings asked for, where the reference composer fills each from the same eligible cases`, 'm').test(nullDesk.text)) && !/note: could not compose [a-z]+: desk /.test(nullDesk.text) },
    // A single declined sitting is a finding (the rule at its edge).
    { id: 'one-declined-sitting-fails', pass: oneDeclined.ok && (oneDeclined.text.match(/^FAIL {2}composer {2}\S+ {2}the composer returned no sitting for /gm) ?? []).length === 1 && /^FAIL {2}composer {2}[a-z]+\/desk {2}the composer returned no sitting for 1 of the [0-9]+ desk sittings asked for, /m.test(oneDeclined.text) },
    { id: 'prints-its-bound', pass: report.bound !== null && report.bound.widest.length > 0 && / bound: .* a pass means no blocking strategy's advantage over chance, averaged over 8 replicate streams, exceeded 2 SD of one stream \(at most .*\); an expected advantage above 2\.76 SD is caught with 95% probability \(at most .*\)$/.test(lastLine(fixture.text)) },
    { id: 'self-check-holds', pass: self.ok && /self-check: green/.test(self.text) },
    // Every weakened rule fails the self-check (scripts/spikes/W1-T40/mutants.mjs).
    { id: 'every-mutant-killed', pass: mutants.ok && /^mutants: ([0-9]+) of \1 killed, 0 survived, 0 errors/m.test(mutants.text) },
    { id: 'gate-rule-no-false-alarm', pass: calib.ok && c.validPool.gateRule.failingConfigs === 0 },
    // The detection threshold assumes the replicate mean of a test's z spreads by 1 / sqrt(8) under the null and by at
    // most 1.3 times that under a cue: on the valid pool the spread must match the null's within 0.05, and under every
    // planted cue the test the cue moves most must spread no more than the inflation the threshold allows.
    {
      id: 'bound-approximation-holds',
      pass: calib.ok && Math.abs(c.validPool.gateRule.z.sd - c.validPool.gateRule.z.sdUnderTheApproximation) <= 0.05 && c.noiseInflation.holds === true && c.noiseInflation.measured.length === 5,
    },
  ];
  writeRecord(RUN_ID, {
    id: RUN_ID,
    title: 'GATE-audit-blind: green on this repository (no pool yet) and on the W1-shaped fixture pool with its bound printed, unmoved on every path stream by a stand-in world\'s incidents of a class the pool lacks, failing on a Desk scorer that drops ba and on Desk composers that decline every Desk sitting or a single one, the planted-fault self-check holding and failing on every weakened rule, and the verdict rule calibrated on a valid pool and two planted cues',
    task: TASK,
    origin: 'recorded',
    engine: 'node',
    version: process.versions.node,
    binary: 'node (the host binary; no container)',
    binary_sha256: sha256File(node),
    image: null,
    recorded_at: new Date().toISOString(),
    started_at: steps[0].entry.started_at,
    duration_s: Math.round(steps.reduce((s, x) => s + x.entry.duration_s, 0) * 1000) / 1000,
    argv: fixture.entry.argv,
    inputs: [{ ...fileRecord(REPO, 'scripts/verify-audit-blind.mjs'), role: 'gate' }, ...commonInputs],
    budget: { permutations_per_strategy_and_figure: 1000, replicates: 8, margin_sd: 2, detect_inflation: 1.3, calibration_configs: 100, power_configs: 40, network: 'none' },
    exit_code: fixture.entry.exit_code,
    verdict_lines: fixture.entry.verdict_lines,
    outputs: steps.flatMap((s) => s.entry.outputs),
    values: {
      bound_line: lastLine(fixture.text).replace(/^GATE-audit-blind: green; /, ''),
      bound: report.bound,
      stage_only_floor: report.floor,
      composers: report.composers,
      scorer: report.scorer,
      world: { clearinghouse: withWorld.composers.clearinghouse, streams: worldGroup?.streams ?? [], tests: worldGroup?.verdicts.length ?? 0, tests_that_could_vary: worldGroup?.verdicts.filter((v) => v.sd > 0).length ?? 0, path_streams_unchanged: JSON.stringify(pathGroups) === JSON.stringify(report.groups), floor_unchanged: JSON.stringify(withWorld.floor) === JSON.stringify(report.floor) },
      self_check_cases: (self.text.match(/^held /gm) ?? []).length,
      mutants: (/^mutants: .*$/m.exec(mutants.text) ?? [null])[0],
      calibration: c,
    },
    checks,
    pass: checks.every((x) => x.pass),
    environment,
    primary_config: 'fixture-pool',
    configs: steps.map((s) => s.entry),
    unrecorded: [{ field: 'image', reason: 'every configuration ran on the host with no container' }],
    notes: [
      'The repository has no audit pool yet (content/audit/ arrives with W1-T33 and W1-T34), so the fast-lane configuration shows the gate saying so; the fixture-pool configuration is where the gate simulates, on the W1-shaped pool of scripts/spikes/W1-T40/lib/fixtures.mjs written as files.',
      'The composer and the scorer are the gate\'s reference implementations of AUDIT-DESK 5.2-5.3 and 6.1-6.6 until W1-T32 exports the contract of scripts/spikes/W1-T40/README.md section 5.',
      'fixture-pool-world-json puts a stand-in Clearinghouse (lib/fixtures.mjs fixtureWorldIncidents) where W3-T14\'s will live. Its incidents are keyed G7 at S1, a class the pool lacks at a stage it holds, so a gate that let them into the paths\' base rates would move those streams; the check incidents-leave-paths-unchanged compares every path stream\'s verdicts and the floor with fixture-pool-json, value for value.',
      'fixture-pool-v1-scorer puts a Desk module where W1-T32\'s will live whose scorer drops ba and shows v1\'s figure as balanced-accuracy. A constant strategy passes the permutation null by construction, so always-reject\'s inflated v1 figure would pass as chance and the constant-strategy check on ba would have no ba to read; the gate fails on the missing ba itself (README section 5, the figures the Desk must show).',
      'fixture-pool-null-desk puts a Desk module where W1-T32\'s will live whose composer returns no sitting for any Desk session. A null says no sitting keeps the rules; the gate asks its reference composer for each such sitting, which fills every one of them on this pool, so each path\'s Desk stream fails with a composer finding instead of passing untested with a note that the pool is too small (README section 5).',
      'Calibration: every configuration differs only in the gate\'s seed. "failingConfigs" counts configurations in which some blocking test failed; "z" summarizes advantage / SD over every blocking test that could vary, and its "sd" is what the bound\'s normal approximation predicts as 1 / sqrt(replicates) under the null. Under each planted cue, "dominantTest" is the test with the largest mean z: "failed" counts the configurations in which it failed, "predictedFailures" is configs × Phi((mean z - 2) × sqrt(replicates)) with the null\'s spread and "predictedWithItsSpread" uses its own; "noiseInflation" is each such test\'s spread over the null\'s, against the 1.3 the threshold allows.',
      'The bound\'s two thresholds: a pass establishes that no blocking strategy\'s advantage, averaged over the 8 replicate streams, exceeded 2 SD of one stream; the gate catches with 95% probability an expected advantage above 2 + 1.645 × 1.3 / sqrt(8) = 2.76 SD, allowing the replicate mean 1.3 times the null\'s noise because a cue\'s own realization varies from stream to stream (the calibration measures the inflation under its planted cues).',
      'mutants: each mutant of scripts/spikes/W1-T40/mutants.mjs replaces one exact piece of a gate\'s source in a scratch copy, which weakens one rule that the gate\'s header, the README or the spine names (blind-mean-not-max and those named *-strict make it stricter instead: the maximum over the replicates for their mean, and a valid value at the edge of a rule failed), and runs that gate\'s self-check; every one must make it fail. The list holds one plain weakening per rule and per edge of a rule that compares a count, a mean or a set, not every weakening a rule admits.',
      'fixture-pool-one-declined puts a Desk module where W1-T32\'s will live whose composer returns no sitting for the first Desk session it is asked for and fills every other one: a single declined sitting, which the reference composer fills, is a composer finding, the rule at its edge.',
      'The self-check reads the largest noise inflation the calibration measured from runs/RUN-audit-blind-gate/calibration.json, so the calibration configuration runs before it.',
      'This ran on the development host, not on a CI runner.',
      'Spine section 9.5 registers no run for this task; the ID is proposed once a scanned document cites it.',
    ],
  });
}

// ------------------------------------------------------------------ RUN-audit-gate

{
  const RUN_ID = 'RUN-audit-gate';
  const OUT = path.join(REPO, 'runs', RUN_ID);
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const keep = (l) => /^(GATE-audit|  exemplars|  Clearinghouse|  note: |FAIL |held |ok |not ok |# (tests|pass|fail) )/.test(l);
  const bare = fixtureTree('audit-tree');
  const withBattery = fixtureTree('audit-tree-battery', { battery: true });
  const copiesTree = fixtureTree('audit-tree-relabeled-copies', { battery: true, mutate: relabeledCopies });
  const misspelledTree = fixtureTree('audit-tree-battery-misspelled-lines', { battery: misspelledBattery, mutate: wrongLines });
  const steps = [];
  const nightly = step(OUT, 'nightly', 'GATE-audit as the nightly lane runs it, on this repository, whose pool does not exist yet', { args: ['scripts/verify-audit.mjs'], shown: ['node', 'scripts/verify-audit.mjs'], keep });
  steps.push(nightly);
  const noBattery = step(OUT, 'fixture-pool-no-battery', 'the gate on the W1-shaped fixture pool with no keying battery: it fails closed on every case it cannot re-key and names W1-T25', { args: ['scripts/verify-audit.mjs', '--root', bare], shown: ['node', 'scripts/verify-audit.mjs', '--root', '<sandbox>/audit-tree'], expect: [1], keep });
  steps.push(noBattery);
  const battery = step(OUT, 'fixture-pool-battery', 'the gate on the same pool with the stand-in battery in GEN-spot-the-gap\'s place: every pair member and variant re-keyed on the box engine or keyed by its executed run, and six structurally distinct exemplars or more for G2, G4 and G5 (each S1 anchor\'s seven flawed cases differ in label and in their texts beyond numeric literals)', { args: ['scripts/verify-audit.mjs', '--root', withBattery], shown: ['node', 'scripts/verify-audit.mjs', '--root', '<sandbox>/audit-tree-battery'], keep });
  steps.push(battery);
  const copies = step(OUT, 'fixture-pool-relabeled-copies', 'the same pool with the battery, AUD-1.2\'s six variant pairs replaced by byte-identical copies of its pair v1 relabeled copy-1 to copy-6: the gate must fail, each copy after the first repeating copy-1 under another label and G4 short of six exemplars', { args: ['scripts/verify-audit.mjs', '--root', copiesTree], shown: ['node', 'scripts/verify-audit.mjs', '--root', '<sandbox>/audit-tree-relabeled-copies'], expect: [1], keep });
  steps.push(copies);
  const misspelled = step(OUT, 'fixture-pool-battery-misspelled-lines', 'the same pool with AUD-1.1\'s flawed member declaring load-bearing lines that are not its unsat core, and a battery in GEN-spot-the-gap\'s place that wraps the stand-in and returns each flawed key\'s lines as loadBearing, the spelling of the case it receives: the gate must fail on every flawed key that carries no evidence {type, load_bearing}, instead of reading the missing lines as agreement', { args: ['scripts/verify-audit.mjs', '--root', misspelledTree], shown: ['node', 'scripts/verify-audit.mjs', '--root', '<sandbox>/audit-tree-battery-misspelled-lines'], expect: [1], keep });
  steps.push(misspelled);
  const self = step(OUT, 'self-check', 'one planted fault at a time in the fixture pool, each of which must fail the gate: the anchor (its ID, registration, file name, stage, class, medium, scheduling, KCs, its "based on" card with its incident, date, date marks and source and without code, spine 6.2\'s key-run cell, the pair, the anchor\'s class on a flawed member, the variants field); the cases (form, id, duplicates, keys and acceptable classes, a key that writes primary, a sound key with acceptable classes, acceptable classes that are not a list, statement, texts); typed evidence (missing, of the wrong type, without its artifact, a sound case\'s restatement with no scenarios or two while three pass, no load-bearing lines or four, malformed, out of range or repeated ones, line-anchored evidence on three lines while four pass); key runs and key lines (missing, not a run ID, not on disk, malformed, empty, not stated, stated only inside a word, not stated in the configuration named); the keying battery (another class or a subclass of the case\'s, a flawed case keyed sound, an acceptable set narrower, wider, or of the same size with another class, another evidence type, load-bearing lines that differ, hold one line more or hold part of the core, a vacuous sound case, unknown, no port, no key, no battery, a variant whose statement, diff or receipt drifted, or whose statement gained a blank first line, while a faithful regenerate passes, and the case as the battery receives it); the key\'s shape (keys that spell their lines loadBearing, flawed keys without evidence, with evidence null or without its type, with their acceptable classes as text or as numbers, or with an empty class, G2 keys without their recomputed lines or with their lines as numbers, sound keys without their primary class); exemplars (five while exactly six pass, one shared label, relabeled copies, copies that differ only in white space, copies re-seeded in decimal literals or in every literal form README section 3 names, a flipped sign included, empty variants lists); pending declarations (variants on an anchor that ships with them, done or unknown tasks, a re-keying with no task, malformed or without a key run, a re-key still pending once its engine has a port); variants (no pair, no sound form, two claims, no operator, an operator the spine does not list or one that cannot key the class, a generator reference to template t5, to band 4 or with a seed past the uint32 range, while t4, band 3 and seed 2^32 - 1 pass); nine Clearinghouse faults (a naive baseline above its bar, a naive mean exactly at it, a naive mean that meets it though its first and lowest seed does not, a reference below its bar, a reference mean below it though its first and highest seed reaches it, scores that change between executions, reference scores alone that change, no recorded seeds, a score that is not a number), with a reference exactly at its bar passing; --strict on a pending re-key, pending variants and an empty pool; --only naming a missing anchor; and three file faults (a file that does not parse, one that holds no mapping, two files for one anchor). The clean pool must pass, in memory and read from files, with a draft file named with an underscore and a readme beside it', { args: ['scripts/verify-audit.mjs', '--self-check'], shown: ['node', 'scripts/verify-audit.mjs', '--self-check'], keep });
  steps.push(self);
  const tests = step(OUT, 'tests', 'the tests of both gates and their library', { args: ['--test', 'scripts/spikes/W1-T40/pool.test.mjs', 'scripts/spikes/W1-T40/blind.test.mjs', 'scripts/spikes/W1-T40/gates.test.mjs'], shown: ['node', '--test', 'scripts/spikes/W1-T40/*.test.mjs'], keep: (l) => /^# (tests|pass|fail) /.test(l) || /^not ok /.test(l) });
  steps.push(tests);
  const mutants = step(OUT, 'mutants', 'GATE-audit\'s rules weakened one at a time in a scratch copy of the gates and lib/ (scripts/spikes/W1-T40/mutants.mjs): the exemplar count, the battery\'s comparisons in both directions and the key\'s shape, the regenerated texts, the pending declarations, --strict and --only, the Clearinghouse at its bar and over every seed, and every rule of the pool contract with the edges of its counts and literal forms, plus, made stricter, the values at an edge that pass; its self-check must fail on every one', { args: ['scripts/spikes/W1-T40/mutants.mjs', '--gate', 'audit'], shown: ['node', 'scripts/spikes/W1-T40/mutants.mjs', '--gate', 'audit'], keep: (l) => /^(mutants: |survived |error )/.test(l) });
  steps.push(mutants);
  const checks = [
    { id: 'nightly-green', pass: nightly.ok && /GATE-audit: green/.test(lastLine(nightly.text)) },
    { id: 'fails-closed-without-battery', pass: noBattery.ok && /no keying battery, so 44 cases cannot be re-keyed/.test(noBattery.text) },
    { id: 'fixture-pool-green-with-battery', pass: battery.ok && /^GATE-audit: green \(8 anchors, 52 cases, 44 re-keyed, 8 pending re-key\)/.test(lastLine(battery.text)) && /^ {2}exemplars: .*G2 7; G4 7; G5 8/m.test(battery.text) },
    // An exemplar differs structurally (AUDIT-DESK 4): relabeled copies are findings, and G4 is short of six.
    { id: 'relabeled-copies-fail', pass: copies.ok && /^FAIL {2}exemplars {2}G4 {2}G4 has 2 exemplars/m.test(copies.text) && (copies.text.match(/^FAIL {2}exemplars {2}AUD-1\.2\/copy-[2-6]-flawed {2}repeats AUD-1\.2\/copy-1-flawed /gm) ?? []).length === 5 },
    // A key that leaves out a field, or spells it otherwise, is a finding, never agreement (README section 4).
    { id: 'battery-key-shape-fails', pass: misspelled.ok && /^FAIL {2}battery {2}AUD-1\.1\/flawed {2}the battery's key carries no evidence \{type, load_bearing\} for a flawed case/m.test(misspelled.text) && /^GATE-audit: FAIL /.test(lastLine(misspelled.text)) },
    { id: 'self-check-holds', pass: self.ok && /self-check: green/.test(self.text) },
    { id: 'tests-pass', pass: tests.ok && /^# fail 0/m.test(tests.text) },
    // Every weakened rule fails the self-check (scripts/spikes/W1-T40/mutants.mjs).
    { id: 'every-mutant-killed', pass: mutants.ok && /^mutants: ([0-9]+) of \1 killed, 0 survived, 0 errors/m.test(mutants.text) },
  ];
  writeRecord(RUN_ID, {
    id: RUN_ID,
    title: 'GATE-audit: green on this repository (no pool yet), failing closed on the W1-shaped fixture pool without a keying battery, green on it with the stand-in battery and failing on relabeled copies counted as exemplars and on a battery whose keys spell their load-bearing lines otherwise, the planted-fault self-check holding and failing on every weakened rule, and the tests passing',
    task: TASK,
    origin: 'recorded',
    engine: 'node',
    version: process.versions.node,
    binary: 'node (the host binary; no container)',
    binary_sha256: sha256File(node),
    image: null,
    recorded_at: new Date().toISOString(),
    started_at: steps[0].entry.started_at,
    duration_s: Math.round(steps.reduce((s, x) => s + x.entry.duration_s, 0) * 1000) / 1000,
    argv: battery.entry.argv,
    inputs: [{ ...fileRecord(REPO, 'scripts/verify-audit.mjs'), role: 'gate' }, { ...fileRecord(REPO, 'scripts/verify-audit-blind.mjs'), role: 'the other gate, which the tests also run' }, ...commonInputs, { ...fileRecord(REPO, 'packages/generators/src/core/fixture/engine.ts'), role: 'the box engine the stand-in battery runs' }],
    budget: { network: 'none', engines: 'the generator framework\'s box engine (fixture-box), in-process' },
    exit_code: battery.entry.exit_code,
    verdict_lines: battery.entry.verdict_lines,
    outputs: steps.flatMap((s) => s.entry.outputs),
    values: {
      fixture: { anchors: 8, cases: 52, rekeyed: 44, pending_rekey: 8 },
      exemplars_line: (battery.text.split('\n').find((l) => l.startsWith('  exemplars:')) ?? '').trim(),
      relabeled_copies: { exemplars_line: (copies.text.split('\n').find((l) => l.startsWith('  exemplars:')) ?? '').trim(), verdict: lastLine(copies.text) },
      self_check_cases: (self.text.match(/^held /gm) ?? []).length,
      tests: (/^# pass ([0-9]+)/m.exec(tests.text) ?? [])[1] ?? null,
      mutants: (/^mutants: .*$/m.exec(mutants.text) ?? [null])[0],
    },
    checks,
    pass: checks.every((x) => x.pass),
    environment,
    primary_config: 'fixture-pool-battery',
    configs: steps.map((s) => s.entry),
    unrecorded: [{ field: 'image', reason: 'every configuration ran on the host with no container' }],
    notes: [
      'The repository has no audit pool yet (W1-T33, W1-T34) and no keying battery (W1-T25); the fixture configurations run the gate on the W1-shaped pool of scripts/spikes/W1-T40/lib/fixtures.mjs written as files, first with no battery, then with the stand-in battery placed where GEN-spot-the-gap will live.',
      'The stand-in battery keys G2 and sound cases by running the box engine (the premises, their smallest unsat subset, the violation query) and reads the other classes from a recorded verdict; it tests the gate, not the classes. The eight cases of AUD-2.2, AUD-2.3, AUD-2.4 and AUD-5.3 wait for their engines\' lanes (W2-T01, W3-T05) and are keyed by their executed runs meanwhile.',
      'Exemplars (AUDIT-DESK 4): a flawed case counts only when its label (operator, artifact, medium) is new for its class and its statement, diff and receipt differ from every exemplar counted there once white space is collapsed and numeric literals are replaced; a new label on a counted structure is a finding. The fixture\'s S1 variants are structurally distinct (six contradictions with their own unsat cores for G2, six arithmetic slips for G4, six inconclusive or bounded results reported as verdicts for G5), and fixture-pool-relabeled-copies plants the copies the rule exists to catch.',
      'fixture-pool-battery-misspelled-lines: the key a battery returns carries primary, also and evidence {type, load_bearing} (README section 4). A battery that returns its lines as loadBearing, the spelling of the case it receives, would otherwise have its lines read as absent and the comparison skipped, so AUD-1.1\'s wrong lines would pass; the gate fails on each flawed key whose evidence it cannot read.',
      'mutants: each mutant of scripts/spikes/W1-T40/mutants.mjs replaces one exact piece of the gate\'s source in a scratch copy, which weakens one rule that the gate\'s header, the README or the spine names (those named *-strict make it stricter instead, failing a valid value at the edge of a rule), and runs the gate\'s self-check; every one must make it fail. The list holds one plain weakening per rule and per edge, not every weakening a rule admits.',
      'This ran on the development host, not on a CI runner.',
      'Spine section 9.5 registers no run for this task; the ID is proposed once a scanned document cites it.',
    ],
  });
}

fs.rmSync(scratch, { recursive: true, force: true });
