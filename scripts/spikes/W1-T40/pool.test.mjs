// Tests of the pool contract (lib/pool.mjs) and of the fixtures the self-checks rely on (lib/fixtures.mjs).
//   node --test scripts/spikes/W1-T40/*.test.mjs

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import * as pool from './lib/pool.mjs';
import * as fx from './lib/fixtures.mjs';

const registry = pool.loadRegistry(pool.REPO);
const normalize = (docs) => {
  const problems = [];
  const anchors = docs.map((doc) => pool.normalizeAnchor(doc, { file: `content/audit/${doc.id}.yaml`, name: `${doc.id}.yaml`, registry, problems }));
  return { loaded: { anchors, present: true }, problems };
};

test('a key is none, a class, or {class, also}; `primary` is refused because GATE-kc reads it as a KC tag key', () => {
  assert.deepEqual(pool.readKey('none'), { truth: 'sound', primary: null, also: [], error: null });
  assert.deepEqual(pool.readKey('G2'), { truth: 'flawed', primary: 'G2', also: [], error: null });
  assert.deepEqual(pool.readKey({ class: 'G4', also: ['G8', 'G4'] }), { truth: 'flawed', primary: 'G4', also: ['G8'], error: null });
  assert.match(pool.readKey({ primary: 'G4' }).error, /GATE-kc/);
  assert.match(pool.readKey(undefined).error, /needs a key/);
  assert.match(pool.readKey({ class: 'G4', also: 'G8' }).error, /list/);
});

test('a key line is stated only at word boundaries, after collapsing white space', () => {
  assert.equal(pool.lineStates('[cl11_premises] sat [amount = 1, b = 0, a = 1]', '[cl11_premises] sat'), true);
  assert.equal(pool.lineStates('[max0_guarded_premises] unsat', 'sat'), false);
  assert.equal(pool.lineStates('[max0_guarded_premises] unsat', 'unsat'), true);
  assert.equal(pool.lineStates("info: 'with_sorry' depends on axioms:   [sorryAx]", "'with_sorry' depends on axioms: [sorryAx]"), true);
  assert.equal(pool.lineStates('Error: Deadlock reached.', 'Deadlock'), true);
  assert.equal(pool.lineStates('Error: Deadlock reached.', ''), false);
});

test('texts become lines; a diff is sized by its changed lines', () => {
  assert.deepEqual(pool.linesOf('a\nb\n'), ['a', 'b']);
  assert.deepEqual(pool.linesOf(''), []);
  assert.equal(pool.diffSize(['--- a/x', '+++ b/x', '@@ -1 +1 @@', '-old', '+new']), 2);
  assert.equal(pool.diffSize(['a plain note', '', 'another']), 2);
});

test("a run's verdict lines include each configuration's, with its id", () => {
  const rec = pool.loadRun(pool.REPO, 'RUN-tlc-doublespend');
  const lines = pool.verdictLinesOf(rec);
  assert.ok(lines.some((l) => l.config === null));
  assert.ok(lines.some((l) => l.config === '1.8.0-deadlock' && /Invariant NoOverspend is violated/.test(l.line)));
});

test("spine section 6.2's classes and key runs are read", () => {
  const sp = pool.loadSpineAnchors(pool.REPO);
  assert.equal(sp.size, 25);
  assert.equal(sp.get('AUD-1.1').class, 'G2');
  assert.equal(sp.get('AUD-2.2').class, 'G6a');
  assert.equal(sp.get('AUD-4.2').class, 'none');
  assert.ok(sp.get('AUD-1.2').runs.includes('RUN-z3-bv64'));
  assert.ok(sp.get('AUD-1.1').runs.includes('RUN-z3-vacuous-unsat'));
});

test('the tracker gives each task its status', () => {
  const t = pool.loadTracker(pool.REPO);
  assert.ok(t.has('W1-T40'));
  assert.equal(t.get('W0-S11').status, 'done');
});

test('the vocabulary covers the registry: every class has an evidence row, every operator keys real classes', () => {
  for (const c of registry.classes.keys()) assert.ok(pool.EVIDENCE_BY_CLASS[c] ?? pool.EVIDENCE_BY_CLASS[registry.top(c)], `${c} has no evidence row`);
  for (const k of Object.keys(pool.EVIDENCE_BY_CLASS)) assert.ok(registry.classes.has(k), `${k} is not a gap class of the registry`);
  assert.equal(Object.keys(pool.OPERATORS).length, 25);
  for (const [slug, op] of Object.entries(pool.OPERATORS)) for (const c of op.classes) assert.equal(registry.top(c), c, `${slug} keys ${c}, which is not a top-level class`);
});

test('the W1-shaped fixture pool satisfies the whole contract', () => {
  const { loaded, problems } = normalize(fx.w1Pool());
  problems.push(...pool.contentProblems(loaded, { root: pool.REPO, registry, spineAnchors: pool.loadSpineAnchors(pool.REPO) }));
  assert.deepEqual(problems.map((p) => p.message), []);
  for (const a of loaded.anchors) for (const k of a.kcs) assert.equal(registry.kind(k), 'kc', `${a.id} tags ${k}`);
  const cases = pool.blindCases(loaded, problems);
  assert.equal(cases.length, 52);
  assert.equal(cases.filter((c) => c.truth === 'sound').length, 26);
});

test('a case with a shape problem is left out of the simulation, its anchor kept', () => {
  const docs = fx.w1Pool();
  delete docs[0].cases[1].key;
  const { loaded, problems } = normalize(docs);
  const cases = pool.blindCases(loaded, problems);
  assert.equal(cases.length, 51);
  assert.ok(!cases.some((c) => c.id === 'AUD-1.1/flawed'));
  assert.ok(cases.some((c) => c.id === 'AUD-1.1/sound'));
});

test('load-bearing references must point at non-blank lines of the case', () => {
  const docs = fx.w1Pool();
  docs[0].cases[1].evidence.load_bearing = ['statement:99', 'diff:1'];
  const { problems } = normalize(docs);
  assert.ok(problems.some((p) => /statement:99 is not a non-blank line/.test(p.message)));
});

test("the stand-in battery recomputes a premise set's unsat core on the box engine", async () => {
  const docs = fx.w1Pool();
  const { loaded } = normalize(docs);
  const battery = fx.fixtureBattery();
  const flawed = loaded.anchors[0].cases.find((c) => c.id === 'flawed');
  const got = await battery.key({ raw: flawed.raw }, fx.boxPort);
  assert.equal(got.primary, 'G2');
  assert.deepEqual([...got.evidence.load_bearing].sort(), ['statement:6', 'statement:7']);
  const sound = loaded.anchors[0].cases.find((c) => c.id === 'sound');
  assert.equal((await battery.key({ raw: sound.raw }, fx.boxPort)).primary, 'none');
  const unknown = await battery.key({ raw: sound.raw }, fx.unknownBoxPort);
  assert.equal(typeof unknown.discard, 'string');
});

test('spine section 6 names the anchors that ship without variants: the only ones whose variants may wait', () => {
  assert.deepEqual(pool.loadSpineVariantless(pool.REPO).ids, ['AUD-2.1', 'AUD-2.2', 'AUD-2.3', 'AUD-2.4', 'AUD-5.3']);
  const root = mkdtempSync(join(tmpdir(), 'w1t40-spine-'));
  try {
    mkdirSync(join(root, 'docs', 'spine'), { recursive: true });
    const spine = (sentence) => writeFileSync(join(root, 'docs', 'spine', 'SPINE.md'), `## 6. The Audit Desk\n\n**Pool.** ${sentence}\n\n### 6.1 Gap taxonomy\n`);
    spine("The two W1 anchors from later stages (AUD-3.1 and AUD-3.2) ship keyed only by executed runs (RUN-a, whose claim is AUD-3.1's W1 sound member; RUN-b), without generated variants.");
    assert.deepEqual(pool.loadSpineVariantless(root).ids, ['AUD-3.1', 'AUD-3.2']);
    spine('Every anchor ships with its generated variants.');
    assert.deepEqual(pool.loadSpineVariantless(root), { ids: [], sentence: null });
    rmSync(join(root, 'docs'), { recursive: true });
    assert.equal(pool.loadSpineVariantless(root), null);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a case's structure sets aside numeric literals and white space, never digits inside identifiers (AUDIT-DESK 4)", () => {
  assert.equal(pool.structureText("s.set('rlimit', 5000000)\n  s.add(a >= -1)"), "s.set('rlimit', #) s.add(a >= #)");
  assert.equal(pool.structureText('seed 0x1000, 1e5, 2.5e-3'), 'seed #, #, #');
  assert.equal(pool.structureText('[cl11_violation] unsat in BitVec64 for G2'), '[cl11_violation] unsat in BitVec64 for G2');
  assert.equal(pool.structureText('a - 1 < x-1'), 'a - # < x-#');
  const docs = fx.w1Pool();
  const { loaded } = normalize(docs);
  const [a11, a12, a13] = loaded.anchors;
  // Every S1 flawed form of the fixture differs structurally from the others.
  for (const a of [a11, a12, a13]) {
    const flawed = a.cases.filter((c) => c.truth === 'flawed');
    assert.equal(new Set(flawed.map(pool.structureOf)).size, flawed.length, `${a.id}'s flawed forms are structurally distinct`);
  }
  // Re-seeded constants and re-spaced lines keep the structure; another operand changes it.
  const v1 = a13.cases.find((c) => c.id === 'v1-flawed');
  const reseeded = { text: { ...v1.text, statement: v1.text.statement.map((l) => l.replace('2000', '7000').replace(', ', ',    ')) } };
  assert.equal(pool.structureOf(reseeded), pool.structureOf(v1));
  const other = { text: { ...v1.text, statement: v1.text.statement.map((l) => l.replace("'timeout'", "'rlimit'")) } };
  assert.notEqual(pool.structureOf(other), pool.structureOf(v1));
});

test('an empty variants list is a finding, not an anchor shipped with no variant', () => {
  const docs = fx.w1Pool();
  docs[0].variants = [];
  const { problems } = normalize(docs);
  assert.ok(problems.some((p) => p.check === 'fields' && p.anchor === 'AUD-1.1' && /variants is an empty list/.test(p.message)));
});

test('the literal forms of the later media are set aside too: digit groups, Rust suffixes, octal, SMT-LIB bit-vectors, range bounds; projections are kept', () => {
  const same = (a, b) => assert.equal(pool.structureText(a), pool.structureText(b), `${a} and ${b} share a structure`);
  same("s.set('rlimit', 5_000_000)", "s.set('rlimit', 9_000_000)");
  same('(assert (= x #x0000000000000001))', '(assert (= x #x0000000000000007))');
  same('(assert (bvult x (_ bv1 64)))', '(assert (bvult x (_ bv7 64)))');
  same('(assert (= y #b0101))', '(assert (= y #b0011))');
  same('let x = 7u64 + 1_000u64 * 1.5f64;', 'let x = 9u64 + 2_000u64 * 2.5f64;');
  same('chmod 0o755', 'chmod 0o644');
  same('x \\in 1..10', 'x \\in 0..20');
  assert.equal(pool.structureText('(transfer a b amt).1 + (transfer a b amt).2 = t.0 + xs[0].5'), '(transfer a b amt).1 + (transfer a b amt).2 = t.0 + xs[#].5');
  assert.notEqual(pool.structureText('(_ bv1 64)'), pool.structureText('(_ BitVec 64)'));
  assert.notEqual(pool.structureText('(transfer a b amt).1'), pool.structureText('(transfer a b amt).2'), 'a projection is structure, not a constant');
  assert.equal(pool.structureText('x_1 + v1 + _1 + 1_ + 0x_1'), 'x_1 + v1 + _1 + 1_ + 0x_1', 'digits inside identifiers stay');
});
