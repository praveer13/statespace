// Tests of the two gate scripts as the lanes run them: exit codes, reports, the bound, the hooks for W1-T25,
// W1-T32 and W3-T14 read from files.
//   node --test scripts/spikes/W1-T40/*.test.mjs

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import * as pool from './lib/pool.mjs';
import * as fx from './lib/fixtures.mjs';

const REPO = pool.REPO;
const AUDIT = join(REPO, 'scripts', 'verify-audit.mjs');
const BLIND = join(REPO, 'scripts', 'verify-audit-blind.mjs');
const run = (script, args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', timeout: 240_000 });
const trees = [];
after(() => {
  for (const t of trees) rmSync(t, { recursive: true, force: true });
});

/** A tree that shares the repository's registry, spine, tracker, runs and paths, with its own content/audit. */
function tree(withPool) {
  const t = mkdtempSync(join(tmpdir(), 'w1t40-'));
  trees.push(t);
  writeFileSync(join(t, 'package.json'), '{ "type": "module" }\n');
  for (const d of ['packages', 'docs', 'tracker', 'runs', 'research']) symlinkSync(join(REPO, d), join(t, d));
  mkdirSync(join(t, 'content'));
  for (const d of readdirSync(join(REPO, 'content'))) if (d !== 'audit') symlinkSync(join(REPO, 'content', d), join(t, 'content', d));
  if (withPool) {
    mkdirSync(join(t, 'content', 'audit'));
    for (const a of fx.w1Pool()) writeFileSync(join(t, 'content', 'audit', `${a.id}.json`), `${JSON.stringify(a, null, 2)}\n`);
  }
  return t;
}

test('with no pool both gates pass and say why', () => {
  const t = tree(false);
  const a = run(AUDIT, ['--root', t]);
  assert.equal(a.status, 0, a.stdout + a.stderr);
  assert.match(a.stdout, /no audit pool yet/);
  const b = run(BLIND, ['--root', t]);
  assert.equal(b.status, 0, b.stdout + b.stderr);
  assert.match(b.stdout.trim().split('\n').at(-1), /green \(no pool yet\); bound: none/);
});

test('GATE-audit-blind prints its bound as its last line, and the JSON report carries it', () => {
  const t = tree(true);
  const b = run(BLIND, ['--root', t]);
  assert.equal(b.status, 0, b.stdout + b.stderr);
  const last = b.stdout.trim().split('\n').at(-1);
  assert.match(last, /^GATE-audit-blind: green; bound: 52 cases \(26 sound, 26 flawed\) in 8 anchors; 6 streams × 8 replicates/);
  // What a pass establishes, and what the gate catches with 95% probability: the replicate mean has noise of its own.
  assert.match(last, /a pass means no blocking strategy's advantage over chance, averaged over 8 replicate streams, exceeded 2 SD of one stream \(at most \+0\.[0-9]{3} on ba, \+0\.[0-9]{3} on recall-macro, \+0\.[0-9]{3} on part-c-pass\); an expected advantage above 2\.76 SD is caught with 95% probability \(at most \+0\.[0-9]{3} on ba, /);
  assert.doesNotMatch(last, /rules out/);
  const j = JSON.parse(run(BLIND, ['--root', t, '--json']).stdout);
  assert.equal(j.exit, 0);
  assert.equal(j.bound.pool.cases, 52);
  assert.ok(Math.abs(j.bound.rule.detectSd - (2 + (1.6448536269514722 * 1.3) / Math.sqrt(8))) < 1e-12);
  assert.equal(j.bound.rule.inflation, 1.3);
  const ba = j.bound.widest.find((w) => w.figure === 'ba');
  assert.ok(ba.margin > 0 && Math.abs(ba.margin - 2 * ba.sd) < 1e-12 && Math.abs(ba.detect - j.bound.rule.detectSd * ba.sd) < 1e-12);
  assert.equal(j.floor.length, 2);
  assert.equal(j.composers.desk, 'reference');
});

test('GATE-audit without the battery fails on every case it cannot re-key, and names W1-T25', () => {
  const t = tree(true);
  const a = run(AUDIT, ['--root', t]);
  assert.equal(a.status, 1);
  assert.match(a.stdout, /no keying battery, so 44 cases cannot be re-keyed/);
});

test('a usage error exits 2', () => {
  assert.equal(run(AUDIT, ['--frobnicate']).status, 2);
  assert.equal(run(BLIND, ['--replicates', '0']).status, 2);
});

test('both self-checks hold', () => {
  const a = run(AUDIT, ['--self-check']);
  assert.equal(a.status, 0, a.stdout);
  assert.match(a.stdout, /GATE-audit self-check: green/);
  const b = run(BLIND, ['--self-check']);
  assert.equal(b.status, 0, b.stdout);
  assert.match(b.stdout, /GATE-audit-blind self-check: green/);
});

/**
 * A tree whose packages/ holds only the files the gate reads, plus a battery module in GEN-spot-the-gap's place: the
 * stand-in battery, each key passed through `reshape` (source text of a function), over the fixture pool edited by `mutate`.
 */
function batteryTree(reshape = '(k) => k', mutate = null) {
  const t = mkdtempSync(join(tmpdir(), 'w1t40-battery-'));
  trees.push(t);
  mkdirSync(join(t, 'packages', 'ids', 'src'), { recursive: true });
  symlinkSync(join(REPO, 'packages', 'ids', 'src', 'registry.json'), join(t, 'packages', 'ids', 'src', 'registry.json'));
  mkdirSync(join(t, 'packages', 'generators', 'src', 'spot-the-gap'), { recursive: true });
  writeFileSync(
    join(t, 'packages', 'generators', 'src', 'spot-the-gap', 'index.ts'),
    [
      `import { fixtureBattery, boxPort, BOX_ENGINE } from ${JSON.stringify(join(REPO, 'scripts', 'spikes', 'W1-T40', 'lib', 'fixtures.mjs'))}`,
      'const inner = fixtureBattery()',
      `export const auditBattery = { engines: inner.engines, async key(c, port) { return (${reshape})(await inner.key(c, port)) } }`,
      'export const ports = { [BOX_ENGINE]: boxPort }',
    ].join('\n') + '\n',
  );
  for (const d of ['docs', 'tracker', 'runs', 'research']) symlinkSync(join(REPO, d), join(t, d));
  mkdirSync(join(t, 'content', 'audit'), { recursive: true });
  const docs = fx.w1Pool();
  if (mutate) mutate(docs);
  for (const a of docs) writeFileSync(join(t, 'content', 'audit', `${a.id}.json`), `${JSON.stringify(a, null, 2)}\n`);
  return t;
}

test("a battery exported by GEN-spot-the-gap's folder is found and used (W1-T25's hook)", async () => {
  const r = run(AUDIT, ['--root', batteryTree()]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /44 re-keyed by the battery \(packages\/generators\/src\/spot-the-gap\/index\.ts; ports: fixture-box\)/);
  assert.match(r.stdout, /exemplars: G1 1 \(variants pending: AUD-2\.1 \(W2-T13\)\); G2 7; G4 7; G5 8/);
});

test('a battery key that leaves out a field, or spells it otherwise, fails the gate instead of reading as agreement (README section 4)', () => {
  // AUD-1.1's flawed member declares the wrong lines (the recomputed unsat core is statement:6 and statement:7).
  const wrongLines = (docs) => (docs[0].cases[1].evidence.load_bearing = ['statement:3', 'statement:7']);
  for (const reshape of [
    '(k) => (k && k.evidence ? { ...k, evidence: { type: k.evidence.type, loadBearing: k.evidence.load_bearing } } : k)',
    '(k) => (k && k.evidence ? { ...k, evidence: { type: k.evidence.type } } : k)',
    '(k) => (k && k.evidence ? { primary: k.primary, also: k.also } : k)',
  ]) {
    const r = run(AUDIT, ['--root', batteryTree(reshape, wrongLines)]);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /^FAIL {2}battery {2}AUD-1\.1\/flawed {2}the battery's key carries no evidence \{type, load_bearing\} for a flawed case/m, reshape);
  }
  const noCore = run(AUDIT, ['--root', batteryTree("(k) => (k && k.primary === 'G2' ? { ...k, evidence: { ...k.evidence, load_bearing: [] } } : k)")]);
  assert.equal(noCore.status, 1, noCore.stdout + noCore.stderr);
  assert.match(noCore.stdout, /^FAIL {2}battery {2}AUD-1\.1\/flawed {2}the battery's key recomputed no load-bearing lines for a G2 case/m);
});

/** A tree whose packages/ holds only the registry and W1-T32's judgment module (never the repository's own packages). */
function judgmentTree(files) {
  const t = mkdtempSync(join(tmpdir(), 'w1t40-judgment-'));
  trees.push(t);
  mkdirSync(join(t, 'packages', 'ids', 'src'), { recursive: true });
  symlinkSync(join(REPO, 'packages', 'ids', 'src', 'registry.json'), join(t, 'packages', 'ids', 'src', 'registry.json'));
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(join(t, rel, '..'), { recursive: true });
    writeFileSync(join(t, rel), text);
  }
  for (const d of ['docs', 'tracker', 'runs', 'research']) symlinkSync(join(REPO, d), join(t, d));
  mkdirSync(join(t, 'content', 'audit'), { recursive: true });
  symlinkSync(join(REPO, 'content', 'stages'), join(t, 'content', 'stages'));
  for (const a of fx.w1Pool()) writeFileSync(join(t, 'content', 'audit', `${a.id}.json`), `${JSON.stringify(a, null, 2)}\n`);
  return t;
}

const LIB = join(REPO, 'scripts', 'spikes', 'W1-T40', 'lib');
const deskModule = [
  `import { referenceCompose } from ${JSON.stringify(join(LIB, 'blind.mjs'))}`,
  `import { fixtureAuditFigures } from ${JSON.stringify(join(LIB, 'fixtures.mjs'))}`,
  `import { loadRegistry } from ${JSON.stringify(join(LIB, 'pool.mjs'))}`,
  "export const AUDIT_SURFACES = ['desk', 'today', 'part-c']",
  'export const composeAuditSitting = referenceCompose',
  // As AUDIT-DESK 7.4 lists it, this module files the Part C pass rate with the decision figures.
  `export const auditFigures = fixtureAuditFigures(loadRegistry(${JSON.stringify(REPO)}).topClasses, { kinds: { 'part-c-pass': 'decision' } })`,
].join('\n') + '\n';

test("the Desk's composer and scorer are found and driven (W1-T32's hook), at its folder or through the package's export", () => {
  for (const files of [
    { 'packages/learner/judgment/index.ts': deskModule },
    { 'packages/learner/package.json': '{ "name": "@statespace/learner", "type": "module", "exports": { "./judgment": "./judgment/src/index.ts" } }\n', 'packages/learner/judgment/src/index.ts': deskModule },
  ]) {
    const t = judgmentTree(files);
    const r = run(BLIND, ['--root', t, '--json']);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const j = JSON.parse(r.stdout);
    assert.deepEqual([j.composers.desk, j.composers.today, j.composers['part-c'], j.scorer], Array(4).fill('the Desk (W1-T32)'));
    for (const g of j.groups.filter((x) => x.surface === 'part-c')) assert.ok(g.verdicts.some((v) => v.strategy === 'last-is-sound' && v.figure === 'part-c-pass' && v.sd > 0), `${g.path}: last-is-sound tested on part-c-pass`);
    assert.ok(j.notes.some((n) => n.startsWith('the scorer files part-c-pass as a "decision" figure')));
  }
});

test("a Desk scorer that drops ba and shows v1's figure under another name fails the gate (AUDIT-DESK 1.4 and 7.3)", () => {
  const v1Module = [
    `import { referenceCompose } from ${JSON.stringify(join(LIB, 'blind.mjs'))}`,
    `import { fixtureAuditFigures, v1BalancedAccuracy } from ${JSON.stringify(join(LIB, 'fixtures.mjs'))}`,
    `import { loadRegistry } from ${JSON.stringify(join(LIB, 'pool.mjs'))}`,
    "export const AUDIT_SURFACES = ['desk', 'today', 'part-c']",
    'export const composeAuditSitting = referenceCompose',
    `export const auditFigures = fixtureAuditFigures(loadRegistry(${JSON.stringify(REPO)}).topClasses, { drop: (id) => id === 'ba', extra: [{ id: 'balanced-accuracy', kind: 'decision', of: v1BalancedAccuracy }] })`,
  ].join('\n') + '\n';
  const r = run(BLIND, ['--root', judgmentTree({ 'packages/learner/judgment/index.ts': v1Module })]);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /FAIL {2}scorer {2}default\/desk, .*the scorer shows no ba, which the Desk shows on every stream with flawed and sound decisions/);
});

test("a Desk composer that declines every Desk sitting the reference composer fills fails the gate, instead of passing untested (W1-T32's hook)", () => {
  const nullDesk = deskModule.replace('export const composeAuditSitting = referenceCompose', "export function composeAuditSitting(a) { return a.surface === 'desk' ? null : referenceCompose(a) }");
  assert.notEqual(nullDesk, deskModule);
  const r = run(BLIND, ['--root', judgmentTree({ 'packages/learner/judgment/index.ts': nullDesk })]);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  for (const where of ['default/desk', 'builder/desk']) assert.match(r.stdout, new RegExp(`FAIL {2}composer {2}${where} {2}the composer returned no sitting for ([0-9]+) of the \\1 desk sittings asked for, where the reference composer fills each from the same eligible cases`));
  assert.doesNotMatch(r.stdout, /note: could not compose [a-z]+: desk /, 'no note calls those sittings impossible');
});

test('a Desk composer that declines a single Desk sitting the reference composer fills fails the gate (the rule at its edge)', () => {
  const once = deskModule.replace('export const composeAuditSitting = referenceCompose', "let asked = 0\nexport function composeAuditSitting(a) { return a.surface === 'desk' && asked++ === 0 ? null : referenceCompose(a) }");
  assert.notEqual(once, deskModule);
  const r = run(BLIND, ['--root', judgmentTree({ 'packages/learner/judgment/index.ts': once })]);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  const declined = r.stdout.split('\n').filter((l) => /^FAIL {2}composer {2}\S+ {2}the composer returned no sitting for /.test(l));
  assert.equal(declined.length, 1, declined.join('\n'));
  assert.match(declined[0], /^FAIL {2}composer {2}[a-z]+\/desk {2}the composer returned no sitting for 1 of the [0-9]+ desk sittings asked for, /);
});

test("a Clearinghouse module whose auditIncidentBlocks returns nothing, or fewer blocks than asked for, fails the gate instead of reading as no world", () => {
  for (const [body, message] of [
    ['return undefined', /auditIncidentBlocks\(seed, 60\) returned undefined, not a list of blocks/],
    ['return fixtureWorldIncidents(seed, blocks - 1)', /auditIncidentBlocks\(seed, 60\) returned 59 blocks where 60 were asked for/],
  ]) {
    const t = tree(true);
    const dir = join(t, 'apps', 'instruments', 'src', 'engines', 'clearinghouse');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'audit.ts'), `import { fixtureWorldIncidents } from ${JSON.stringify(join(LIB, 'fixtures.mjs'))}\nexport const auditFamilies = []\nexport function auditIncidentBlocks(seed: number, blocks: number) { ${body} }\n`);
    const r = run(BLIND, ['--root', t]);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, message);
  }
});

test('a judgment folder without the module the contract names fails the gate instead of falling back', () => {
  const t = judgmentTree({ 'packages/learner/judgment/src/index.ts': deskModule });
  const r = run(BLIND, ['--root', t]);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /FAIL {2}composer .*packages\/learner\/judgment\/ exists but has no index\.ts exporting AUDIT_SURFACES, composeAuditSitting and auditFigures/);
  const missing = judgmentTree({ 'packages/learner/package.json': '{ "exports": { "./judgment": "./judgment/index.ts" } }\n' });
  const m = run(BLIND, ['--root', missing]);
  assert.equal(m.status, 1, m.stdout + m.stderr);
  assert.match(m.stdout, /exports \.\/judgment as \.\/judgment\/index\.ts, which does not exist/);
});

test("the Clearinghouse's families and incidents are picked up once W3-T14 ships them", () => {
  const t = tree(true);
  const dir = join(t, 'apps', 'instruments', 'src', 'engines', 'clearinghouse');
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'audit.ts'),
    [
      'export const auditFamilies = [{ id: "CH-overdraft", bar: 0.7, seeds: [1, 2, 3], score: (policy: string, seed: number) => (policy === "naive" ? 0.4 : 0.9) + seed * 0 }]',
      'export function auditIncidentBlocks(seed: number, blocks: number) {',
      '  const out = []',
      '  for (let b = 0; b < blocks; b++) {',
      '    const block = []',
      '    for (let i = 0; i < 10; i++) {',
      '      const s = (seed + b * 31 + i * 7) % 5 < 2',
      '      block.push({ id: `i${b}.${i}`, family: "CH-overdraft", stage: "S1", key: s ? "none" : "G2", evidence: s ? { type: "restatement" } : { type: "declaration", load_bearing: ["statement:2", "statement:3"] }, statement: "a\\nb\\nc\\nd\\ne", diff: "+x" })',
      '    }',
      '    out.push(block)',
      '  }',
      '  return out',
      '}',
    ].join('\n') + '\n',
  );
  const a = run(AUDIT, ['--root', t]);
  assert.match(a.stdout, /Clearinghouse: CH-overdraft naive 0\.400 < bar 0\.7 <= reference 0\.900 over 3 seeds/);
  const b = run(BLIND, ['--root', t, '--json']);
  const j = JSON.parse(b.stdout);
  assert.ok(j.groups.some((g) => g.surface === 'clearinghouse' && g.streams.length === 8), b.stderr);
  assert.match(j.composers.clearinghouse, /replicate streams of 60 blocks/);
});

test("the world's incidents never move a path stream: fair incidents of a class the pool lacks (G7 at S1) leave every path stream's verdicts and the floor as they were", () => {
  const t = tree(true);
  const dir = join(t, 'apps', 'instruments', 'src', 'engines', 'clearinghouse');
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'audit.ts'),
    [
      `import { fixtureWorldIncidents } from ${JSON.stringify(join(LIB, 'fixtures.mjs'))}`,
      'export const auditFamilies = []',
      "export function auditIncidentBlocks(seed: number, blocks: number) { return fixtureWorldIncidents(seed, blocks, { klass: 'G7', stage: 'S1' }) }",
    ].join('\n') + '\n',
  );
  const withWorld = run(BLIND, ['--root', t, '--json']);
  const without = run(BLIND, ['--root', tree(true), '--json']);
  assert.equal(withWorld.status, 0, withWorld.stdout + withWorld.stderr);
  const a = JSON.parse(withWorld.stdout);
  const b = JSON.parse(without.stdout);
  const world = a.groups.find((g) => g.surface === 'clearinghouse');
  assert.ok(world && world.streams.length === 8 && world.streams.every((s) => s.decisions === 600), 'the incidents are tested in their own stream');
  const paths = a.groups.filter((g) => g.path !== 'world');
  assert.equal(paths.length, b.groups.length);
  assert.ok(paths.length > 0);
  for (let i = 0; i < paths.length; i++) assert.deepEqual(paths[i], b.groups[i], `${b.groups[i].path}/${b.groups[i].surface}`);
  assert.deepEqual(a.floor, b.floor);
  assert.equal(a.bound.pool.cases, b.bound.pool.cases, 'the bound counts the pool, not the incidents');
});

test('every mutant of mutants.mjs applies to the current source, once, and a weakened rule fails its self-check', async () => {
  const { readFileSync } = await import('node:fs');
  const { MUTANTS } = await import('./mutants.mjs');
  assert.equal(new Set(MUTANTS.map((m) => m.id)).size, MUTANTS.length, 'mutant ids are unique');
  for (const m of MUTANTS) {
    const text = readFileSync(join(REPO, m.file), 'utf8');
    assert.equal(text.split(m.find).length - 1, 1, `${m.id}: its text occurs once in ${m.file}`);
    assert.notEqual(m.find, m.replace, `${m.id} changes the source`);
  }
  assert.ok(MUTANTS.some((m) => m.gate === 'audit') && MUTANTS.some((m) => m.gate === 'blind'));
  // Two of GATE-audit's, end to end: the six-exemplar threshold and the acceptable-set comparison.
  const r = spawnSync(process.execPath, [join(REPO, 'scripts', 'spikes', 'W1-T40', 'mutants.mjs'), '--only', 'audit-six,audit-key-acceptable', '--json'], { encoding: 'utf8', timeout: 240_000 });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const j = JSON.parse(r.stdout);
  assert.deepEqual(j.mutants.map((m) => [m.id, m.outcome]), [['audit-six', 'killed'], ['audit-key-acceptable', 'killed']]);
  assert.ok(j.mutants[0].failed.includes('a class whose anchors shipped with five exemplars, one short of six'));
});
