// Tests of GATE-audit-blind's machinery (lib/blind.mjs): the paths, the reference composer and scorer, the nulls.
//   node --test scripts/spikes/W1-T40/*.test.mjs

import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as pool from './lib/pool.mjs';
import * as blind from './lib/blind.mjs';
import * as fx from './lib/fixtures.mjs';

const registry = pool.loadRegistry(pool.REPO);
const fixtureCases = () => {
  const problems = [];
  const anchors = fx.w1Pool().map((doc) => pool.normalizeAnchor(doc, { file: `content/audit/${doc.id}.yaml`, name: `${doc.id}.yaml`, registry, problems }));
  return pool.blindCases({ anchors, present: true }, problems);
};

test('the sound range is [ceil(0.3 n), floor(0.6 n)] in integers (AUDIT-DESK 5.2)', () => {
  assert.deepEqual(blind.soundRange(5), [2, 3]);
  assert.deepEqual(blind.soundRange(6), [2, 3]);
  assert.deepEqual(blind.soundRange(8), [3, 4]);
  assert.deepEqual(blind.soundRange(10), [3, 6]);
});

test('the published paths are read from content/stages/budget.yaml', async () => {
  const paths = await blind.loadPaths(pool.REPO, registry);
  const def = paths.find((p) => p.id === 'default');
  const builder = paths.find((p) => p.id === 'builder');
  assert.equal(def.blocks.length, 10);
  assert.equal(builder.blocks.length, 13);
  const s5early = builder.blocks.find((b) => b.id === 'S5-early');
  assert.ok(s5early.units.includes('LAB-5.1') && s5early.defence);
  const s5late = builder.blocks.find((b) => b.id === 'S5-late');
  assert.ok(s5late.units.includes('S5.L9') && !s5late.defence);
  assert.ok(def.blocks.every((b) => b.defence));
});

test('cases are served after the labs that teach their class, on each path', async () => {
  const cases = fixtureCases();
  const paths = await blind.loadPaths(pool.REPO, registry);
  const firstAfter = (pathId, anchor) => {
    const pos = blind.positionsOf(paths.find((p) => p.id === pathId), cases, registry);
    return pos.find((p) => p.eligible.some((i) => cases[i].anchor === anchor))?.block ?? null;
  };
  assert.equal(firstAfter('default', 'AUD-1.1'), 'S1');
  assert.equal(firstAfter('default', 'AUD-2.2'), 'S2');
  assert.equal(firstAfter('default', 'AUD-5.3'), 'S5');
  assert.equal(firstAfter('builder', 'AUD-5.3'), 'S5-early');
  assert.equal(firstAfter('builder', 'AUD-2.1'), 'S2');
});

test('the reference composer keeps the share rule, pairs apart and the topic cap', () => {
  const cases = fixtureCases();
  for (let seed = 1; seed <= 300; seed++) {
    for (const size of [5, 6, 8]) {
      const served = blind.referenceCompose({ surface: 'desk', cases, topic: 'S2', stagesDone: ['S1', 'S2'], size, seed });
      assert.ok(served, `seed ${seed} size ${size} composed`);
      assert.deepEqual(blind.sittingProblems({ surface: 'desk', cases, size }, served), []);
      const topic = served.filter((i) => cases[i].stage === 'S2').length;
      assert.ok(topic <= Math.floor(size / 2), 'at most half from the topic stage');
      assert.ok(served.some((i) => cases[i].stage !== 'S2'), 'at least one from an earlier stage');
    }
    const c = blind.referenceCompose({ surface: 'part-c', cases: cases.filter((x) => x.stage === 'S1'), topic: 'S1', stagesDone: ['S1'], size: 4, seed });
    const k = c.filter((i) => cases.filter((x) => x.stage === 'S1')[i].truth === 'sound').length;
    assert.ok(k === 1 || k === 2);
    assert.equal(blind.referenceCompose({ surface: 'today', cases, topic: 'S1', stagesDone: ['S1'], size: 10, seed }).length, 10);
  }
});

test('a sitting that breaks the rules is reported', () => {
  const cases = fixtureCases();
  const flawed = cases.map((c, i) => [c, i]).filter(([c]) => c.truth === 'flawed').map(([, i]) => i);
  assert.match(blind.sittingProblems({ surface: 'desk', cases, size: 5 }, flawed.slice(0, 5)).join(' '), /share rule/);
  const pair = cases.findIndex((c) => c.id === 'AUD-1.1/sound');
  const other = cases.findIndex((c) => c.id === 'AUD-1.1/flawed');
  assert.match(blind.sittingProblems({ surface: 'part-c', cases, size: 2 }, [pair, other]).join(' '), /pairs apart/);
  assert.match(blind.sittingProblems({ surface: 'desk', cases, size: 5 }, [999]).join(' '), /not among the eligible/);
});

test("a composer's null is checked against the reference composer: declined where the reference fills the sitting, skipped where it cannot", async () => {
  const cases = fixtureCases();
  const P = blind.poolArrays(cases, registry.topClasses);
  const paths = await blind.loadPaths(pool.REPO, registry);
  const positions = blind.positionsOf(paths.find((p) => p.id === 'default'), cases, registry);
  const none = () => null;
  const desk = blind.drawStream({ label: 't', surface: 'desk', positions, cases, P, compose: none, cfg: blind.CONFIG, seed: 3 });
  assert.equal(desk.n, 0);
  assert.equal(desk.asked, positions.length * 3 * blind.CONFIG.desk.sessionsPerSize);
  assert.equal(desk.declined.length, desk.asked, 'every Desk sitting can be filled, so every null is a declined sitting');
  assert.deepEqual(desk.skipped, []);
  // Part C after S5 draws from AUD-5.3's one pair: no four-case sitting keeps pairs apart, so that null is skipped.
  const partC = blind.drawStream({ label: 't', surface: 'part-c', positions, cases, P, compose: none, cfg: blind.CONFIG, seed: 3 });
  assert.ok(partC.skipped.length > 0 && partC.skipped.every((s) => s.startsWith('part-c after S5 ')));
  assert.ok(partC.declined.length > 0 && partC.declined.every((s) => !s.startsWith('S5 ')));
  // The reference composer is not checked against itself, and its nulls are skipped sittings.
  const ref = blind.drawStream({ label: 't', surface: 'part-c', positions, cases, P, compose: blind.referenceCompose, cfg: blind.CONFIG, seed: 3 });
  assert.equal(ref.checked, false);
  assert.deepEqual(ref.declined, []);
  assert.deepEqual(ref.skipped, partC.skipped);
});

test('a composer that declines sittings, or never serves a family it is offered, is reported per path and surface', async () => {
  const cases = fixtureCases();
  const cfg = { ...blind.CONFIG, replicates: 1, permutations: 4 };
  const skipping = (anchor) => (args) => {
    const keep = args.cases.map((c, i) => [c, i]).filter(([c]) => c.anchor !== anchor);
    const served = blind.referenceCompose({ ...args, cases: keep.map(([c]) => c) });
    return served && served.map((j) => keep[j][1]);
  };
  const never = await blind.runBlind({ root: pool.REPO, registry, cases, cfg, composerFor: () => skipping('AUD-1.3'), onlySurfaces: ['desk'] });
  assert.deepEqual(never.neverServed.map((u) => [u.where, u.anchors]), [['default/desk', ['AUD-1.3']], ['builder/desk', ['AUD-1.3']]]);
  const s1 = await blind.runBlind({ root: pool.REPO, registry, cases, cfg, composerFor: () => (args) => (args.topic === 'S1' ? null : blind.referenceCompose(args)), onlySurfaces: ['desk'] });
  assert.deepEqual(s1.declined.map((d) => [d.where, d.declined, d.checked]), [['default/desk', 24, true], ['builder/desk', 24, true]]);
  assert.equal(s1.groups.length, 2, 'the rest of each Desk stream is still tested');
  const ref = await blind.runBlind({ root: pool.REPO, registry, cases, cfg, onlySurfaces: ['desk'] });
  assert.deepEqual([ref.declined, ref.neverServed], [[], []]);
});

test('constant strategies score exactly what their permutations score: balanced accuracy 0.5, SD 0', async () => {
  const cases = fixtureCases();
  const res = await blind.runBlind({ root: pool.REPO, registry, cases, cfg: { ...blind.CONFIG, replicates: 2, permutations: 40 } });
  for (const g of res.groups) {
    for (const v of g.verdicts.filter((x) => x.strategy === 'always-reject' || x.strategy === 'always-accept')) {
      assert.equal(v.sd, 0, `${g.path}/${g.surface} ${v.strategy} ${v.figure}`);
      assert.ok(Math.abs(v.advantage) < 1e-12);
      if (v.figure === 'ba') assert.equal(v.obs, 0.5);
    }
  }
});

test('the reference scorer gives an oracle full marks and counts a correct finding only with valid evidence', async () => {
  const cases = fixtureCases();
  const P = blind.poolArrays(cases, registry.topClasses);
  const paths = await blind.loadPaths(pool.REPO, registry);
  const positions = blind.positionsOf(paths[0], cases, registry);
  const S = blind.drawStream({ label: 't', surface: 'desk', positions, cases, P, compose: blind.referenceCompose, cfg: blind.CONFIG, seed: 7 });
  const dec = new Uint8Array(S.n);
  const named = new Int8Array(S.n).fill(-1);
  for (let i = 0; i < S.n; i++) {
    const c = S.caseIdx[i];
    if (P.truth[c]) {
      dec[i] = 1;
      named[i] = P.top[c];
    }
  }
  const lay = blind.figureLayout(registry.topClasses);
  const out = new Float64Array(lay.ids.length);
  const shown = new Uint8Array(lay.ids.length);
  blind.referenceScore(S, P, dec, named, out, shown, 'all');
  assert.equal(out[lay.ids.indexOf('tpr')], 1);
  assert.equal(out[lay.ids.indexOf('tnr')], 1);
  assert.equal(out[lay.ids.indexOf('ba')], 1);
  // Correct findings need the line draw to hit a load-bearing line, and line-anchored evidence for the named class.
  let expected = 0;
  let flawed = 0;
  for (let i = 0; i < S.n; i++) {
    const c = S.caseIdx[i];
    if (!P.truth[c]) continue;
    flawed++;
    if (S.hit[i] && P.ownLineAnchored[c]) expected++;
  }
  assert.equal(out[lay.ids.indexOf('tpr-correct')], expected / flawed);
});

test('one replicate reproduces AUDIT-DESK 7.4\'s rule: fail when observed exceeds chance + 2 SD', () => {
  const lay = { ids: ['tnr'], kinds: ['decision'] };
  const rep = (obs, mean, v) => new Map([['last-is-sound', { obs: Float64Array.of(obs), mean: Float64Array.of(mean), var: Float64Array.of(v), shown: Uint8Array.of(1), count: Int32Array.of(1000) }]]);
  const fail = blind.verdicts([rep(0.6, 0.5, 0.0016)], lay, ['last-is-sound'], 2)[0];
  assert.equal(fail.fail, true);
  assert.ok(Math.abs(fail.limit - 0.58) < 1e-12);
  const pass = blind.verdicts([rep(0.57, 0.5, 0.0016)], lay, ['last-is-sound'], 2)[0];
  assert.equal(pass.fail, false);
  // Replicates average the advantage, against the root mean variance of one stream.
  const two = blind.verdicts([rep(0.6, 0.5, 0.0016), rep(0.5, 0.5, 0.0016)], lay, ['last-is-sound'], 2)[0];
  assert.ok(Math.abs(two.advantage - 0.05) < 1e-12);
  assert.equal(two.fail, false);
});

test('one configuration gives one verdict: the simulation is deterministic', async () => {
  const cases = fixtureCases();
  const cfg = { ...blind.CONFIG, replicates: 2, permutations: 40 };
  const a = await blind.runBlind({ root: pool.REPO, registry, cases, cfg });
  const b = await blind.runBlind({ root: pool.REPO, registry, cases, cfg });
  assert.deepEqual(JSON.parse(JSON.stringify(a.groups)), JSON.parse(JSON.stringify(b.groups)));
});

test('the stage-only floor names each case\'s own stage class and is reported, never tested', async () => {
  const floor = await blind.stageOnlyFloor({ root: pool.REPO, registry, cases: fixtureCases() });
  assert.equal(floor.length, 2);
  assert.ok(floor.every((f) => typeof f.figures['recall-macro'] === 'number'));
});

test("an external scorer's figure is tested against the gate's null for its id, whatever kind the scorer gives it", async () => {
  const cases = fixtureCases();
  const P = blind.poolArrays(cases, registry.topClasses);
  const paths = await blind.loadPaths(pool.REPO, registry);
  const positions = blind.positionsOf(paths[0], cases, registry);
  const S = blind.drawStream({ label: 't', surface: 'part-c', positions, cases, P, compose: blind.referenceCompose, cfg: blind.CONFIG, seed: 11 });
  const lay = blind.figureLayout(registry.topClasses);
  const score = blind.externalScorer(fx.fixtureAuditFigures(registry.topClasses, { kinds: { 'part-c-pass': 'decision', 'precision:none': 'class' } }), lay);
  const { dec, named } = blind.picksOf('last-is-sound', S, P);
  const out = new Float64Array(lay.ids.length + 64);
  const shown = new Uint8Array(lay.ids.length + 64);
  const pc = lay.ids.indexOf('part-c-pass');
  const pn = lay.ids.indexOf('precision:none');
  score(S, P, dec, named, out, shown, 'class');
  assert.equal(shown[pc], 1, 'part-c-pass is filled in the within-stage pass');
  assert.equal(shown[pn], 0, 'precision:none is not');
  score(S, P, dec, named, out, shown, 'decision');
  assert.equal(shown[pc], 0);
  assert.equal(shown[pn], 1);
  assert.equal(score.moduleKinds.get('part-c-pass'), 'decision');
  // The reference and the stand-in agree on every figure the Desk shows.
  const ref = new Float64Array(out.length);
  const refShown = new Uint8Array(out.length);
  blind.referenceScore(S, P, dec, named, ref, refShown, 'all');
  score(S, P, dec, named, out, shown, 'all');
  for (let j = 0; j < lay.ids.length; j++) {
    assert.equal(shown[j], refShown[j], lay.ids[j]);
    if (shown[j]) assert.ok(Math.abs(out[j] - ref[j]) < 1e-12, lay.ids[j]);
  }
});

test('a figure the scorer shows but no permutation pass gathers is reported, not dropped', async () => {
  const cases = fixtureCases();
  const lay = blind.figureLayout(registry.topClasses);
  const score = blind.externalScorer(fx.fixtureAuditFigures(registry.topClasses, { extra: [{ id: 'flag-rate', kind: 'rate', of: (ds) => ds.filter((d) => d.pick === 'gap').length / ds.length }] }), lay);
  const res = await blind.runBlind({ root: pool.REPO, registry, cases, cfg: { ...blind.CONFIG, replicates: 1, permutations: 4 }, score, layout: lay, onlySurfaces: ['part-c'] });
  assert.deepEqual(res.untested.map((u) => [u.figure, u.kind]), [['flag-rate', 'rate']]);
  assert.ok(!res.groups.some((g) => g.verdicts.some((v) => v.figure === 'flag-rate')));
});

test('a strategy knows the base rates of the cases its stream serves from: the pool on a path, the incidents in the Clearinghouse', () => {
  const cases = fixtureCases();
  const incident = (i, klass) => ({ ...cases[0], id: `clearinghouse/i${i}`, anchor: 'clearinghouse/world', pair: `clearinghouse/i${i}`, truth: 'flawed', top: klass, acceptableTop: [klass], evType: 'witness', scheduledAfter: ['CLEARINGHOUSE'] });
  const world = [...cases, ...Array.from({ length: 40 }, (_, i) => incident(i, 'G7'))];
  const served = Array.from({ length: 40 }, (_, i) => cases.length + i);
  const ci = (k) => registry.topClasses.indexOf(k);
  const alone = blind.poolArrays(cases, registry.topClasses);
  const P = blind.poolArrays(world, registry.topClasses, { incidents: served });
  assert.deepEqual(P.base.path, alone.base.path, "the incidents do not move the pool's base rates");
  assert.equal(P.base.path.poolTop, ci('G5'), "the pool's most frequent class");
  assert.equal(P.base.clearinghouse.poolTop, ci('G7'), "the incidents' most frequent class");
  assert.equal(P.base.clearinghouse.cases, 40);
  assert.equal(blind.baseRatesFor(P, 'desk'), P.base.path);
  assert.equal(blind.baseRatesFor(P, 'clearinghouse'), P.base.clearinghouse);
  // Without incident blocks the Clearinghouse's rates are the pool's, and they are never read.
  assert.equal(alone.base.clearinghouse, alone.base.path);
});

test("the figures the Desk must show: the reference shows every one, and a scorer that drops one is reported", async () => {
  const cases = fixtureCases();
  const P = blind.poolArrays(cases, registry.topClasses);
  const paths = await blind.loadPaths(pool.REPO, registry);
  const positions = blind.positionsOf(paths[0], cases, registry);
  const lay = blind.figureLayout(registry.topClasses);
  for (const surface of ['desk', 'part-c']) {
    const S = blind.drawStream({ label: 't', surface, positions, cases, P, compose: blind.referenceCompose, cfg: blind.CONFIG, seed: 5 });
    for (const st of ['always-reject', 'always-accept', 'last-is-sound', 'topic-is-class']) {
      const { dec, named } = blind.picksOf(st, S, P);
      const out = new Float64Array(lay.ids.length);
      const shown = new Uint8Array(lay.ids.length);
      blind.referenceScore(S, P, dec, named, out, shown, 'all');
      const req = blind.requiredFigures(S, P, dec, named, shown, lay);
      const ids = req.map((f) => f.id);
      for (const id of ['tpr', 'tnr', 'ba']) assert.ok(ids.includes(id), `${surface} ${st} requires ${id}`);
      assert.equal(ids.includes('part-c-pass'), surface === 'part-c');
      assert.ok(ids.some((id) => id.startsWith('recall:')) && ids.includes('recall-macro'));
      assert.equal(ids.some((id) => id.startsWith('precision:G')), st !== 'always-accept', 'precision once a class is named ten times');
      assert.deepEqual(req.filter((f) => !shown[f.j]), [], `the reference shows every required figure (${surface} ${st})`);
    }
  }
  const dropBa = blind.externalScorer(fx.fixtureAuditFigures(registry.topClasses, { drop: (id) => id === 'ba' }), lay);
  const res = await blind.runBlind({ root: pool.REPO, registry, cases, cfg: { ...blind.CONFIG, replicates: 1, permutations: 4 }, score: dropBa, layout: lay, onlySurfaces: ['desk'] });
  assert.deepEqual(res.missing.map((m) => [m.figure, m.where]), [['ba', ['default/desk', 'builder/desk']]]);
});

test('the bound: what a pass establishes (2 SD, averaged over R replicates) and what is caught with 95% probability', () => {
  assert.equal(blind.CONFIG.detectInflation, 1.3);
  const cases = fixtureCases();
  const result = {
    groups: [{ path: 'p', surface: 'desk', streams: [{ decisions: 100 }], verdicts: [
      { strategy: 'last-is-sound', figure: 'ba', sd: 0.01 },
      { strategy: 'always-reject', figure: 'ba', sd: 0 },
      { strategy: 'stage-majority', figure: 'ba', sd: 0.03 },
    ] }],
    replicates: 8,
    perms: 125,
    margin: 2,
  };
  const b = blind.boundOf(result, cases);
  // The replicate mean is allowed 1.3 times the null's noise (a cue's own realization varies from stream to stream).
  assert.equal(b.rule.inflation, blind.CONFIG.detectInflation);
  assert.ok(Math.abs(b.rule.detectSd - (2 + (blind.Z95 * 1.3) / Math.sqrt(8))) < 1e-12);
  assert.ok(Math.abs(b.rule.detectSd - 2.756) < 1e-3);
  assert.ok(Math.abs(blind.boundOf(result, cases, 2, { inflation: 1 }).rule.detectSd - 2.5815) < 1e-4, "the null's own noise alone: 2.58 SD");
  const ba = b.widest.find((w) => w.figure === 'ba');
  assert.equal(ba.strategy, 'last-is-sound', 'advisory strategies do not set the bound by default');
  assert.ok(Math.abs(ba.margin - 0.02) < 1e-12 && Math.abs(ba.detect - b.rule.detectSd * 0.01) < 1e-12);
  assert.equal(blind.boundOf(result, cases, 2, { strict: true }).widest.find((w) => w.figure === 'ba').strategy, 'stage-majority', 'under --strict every strategy blocks');
  assert.ok(Math.abs(blind.boundOf({ ...result, replicates: 1 }, cases).rule.detectSd - (2 + blind.Z95 * 1.3)) < 1e-12, 'one stream: 4.14 SD');
});
