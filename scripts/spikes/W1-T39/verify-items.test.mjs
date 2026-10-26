// Tests of GATE-items (scripts/verify-items.mjs, W1-T39): the planted fixtures and the weakened lints they catch, the
// statistics, the readers of verdicts and scenes, and the gate end to end over pages written in the content format and
// read by the content build's own reader. Run: node --test scripts/spikes/W1-T39/verify-items.test.mjs
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { after, describe, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { WEAKENINGS } from './weakenings.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const gate = await import(join(REPO, 'scripts', 'verify-items.mjs'));
const generatorsGate = await import(join(REPO, 'scripts', 'verify-generators.mjs'));
const raw = generatorsGate.loadRegistry(REPO);
const registry = { misconceptions: raw.misconceptions, generators: raw.generators };

const capture = () => {
  const out = [];
  const err = [];
  return { io: { out: (s) => out.push(s), err: (s) => err.push(s) }, out, err };
};

let full;
const selfCheck = () => (full ??= gate.selfCheck(registry));

describe('the planted fixtures', () => {
  test('every check is tripped by its planted fixture and the clean controls are green', async () => {
    const results = await selfCheck();
    assert.deepEqual(results.filter((r) => !r.pass).map((r) => `${r.rule}/${r.check}: ${r.name}: ${r.detail}`), []);
    const held = new Set(results.filter((r) => r.pass && r.check !== 'clean').map((r) => `${r.rule}/${r.check}`));
    for (const pair of gate.CHECKS) assert.ok(held.has(pair), `no planted fixture trips ${pair}`);
    assert.ok(results.some((r) => r.check === 'clean' && r.pass));
  });

  test('each pool a rule is read on has a planted fixture that trips a check there', async () => {
    const pools = new Set((await selfCheck()).filter((r) => r.pass && r.pool).map((r) => r.pool));
    for (const p of ['family:GEN-planted', 'family:GEN-planted/t2', 'family:GEN-call-it', 'family:GEN-fixture', 'page:S9.L1', 'stage:S9/authored', 'stage:S9', 'drawers', 'S4-S9', 'generators']) assert.ok(pools.has(p), p);
  });

  test('CHECKS names every rule, every strategy the gate runs and every vendored strategy, once', () => {
    assert.deepEqual([...new Set(gate.CHECKS.map((p) => p.slice(0, p.indexOf('/'))))].sort(), [...gate.RULES].sort());
    for (const s of gate.STRATEGIES) assert.ok(gate.CHECKS.includes(`${s.rule}/${s.id}`), s.id);
    for (const s of gate.CUE_STRATEGIES) assert.ok(gate.CHECKS.includes(`cue/${s.name}`), s.name);
    assert.equal(new Set(gate.CHECKS).size, gate.CHECKS.length);
    assert.deepEqual(gate.coverage([]).filter((r) => r.detail !== 'no planted fixture tripped this check'), []);
    assert.equal(gate.coverage([]).length, gate.CHECKS.length);
  });

  test('a finding outside CHECKS is refused', () => {
    assert.throws(() => gate.finding('blind', 'always-middle', 'pool', 'message'), /not one of GATE-items' CHECKS/);
    assert.equal(gate.finding('blind', 'always-last', 'pool', 'message').check, 'always-last');
  });

  test('each runtime-model line is matched by one marker alone, and every marker by a line', () => {
    for (const [what, line] of gate.PLANTED_MODEL_LINES) assert.equal(gate.MODEL_MARKERS.filter((re) => re.test(line)).length, 1, what);
    for (const re of gate.MODEL_MARKERS) assert.ok(gate.PLANTED_MODEL_LINES.some(([, line]) => re.test(line)), String(re));
    assert.equal(new Set(gate.PLANTED_MODEL_LINES.map((_, k) => gate.plantedSourcePath(k))).size, gate.PLANTED_MODEL_LINES.length);
  });

  test('the planted vocabularies hold the words of the gate\'s lists, written out apart from them', () => {
    assert.deepEqual([...gate.PLANTED_HEDGE_WORDS].sort(), [...gate.HEDGE_WORDS].sort());
    assert.deepEqual([...gate.PLANTED_FIX_WORDS].sort(), [...gate.FIX_WORDS].sort());
    assert.deepEqual([...gate.PLANTED_BUDGET_WORDS].sort(), [...gate.BUDGET_WORDS].sort());
    assert.deepEqual(gate.readerMismatches(), []);
  });

  test("the planted tree is found by the gate's discovery and read by the content build's reader as the gate expects", async () => {
    const { pages, runs, sources, wrong } = await gate.readPlantedTree();
    assert.deepEqual(wrong, []);
    assert.deepEqual(pages.map((p) => p.id), gate.PLANTED_PAGE_IDS);
    assert.deepEqual([...runs.keys()], [gate.PLANTED_RUN.id]);
    assert.equal(sources.length, gate.PLANTED_MODEL_LINES.length);
    assert.equal(gate.ctiActiveOf(pages), true);
    assert.equal(gate.ctiActiveOf([]), false);
    assert.equal(gate.ctiActiveOf([], ['GEN-cti-or-bug']), true);
    assert.equal(gate.ctiActiveOf([], [], true), true);
  });

  test('the second-rank fixture: 117 of 300 at the first length rank, 81 at the second, against a bar of 90.0, on both samples', async () => {
    const cues = await import(join(REPO, 'vendor', 'kernelspace', 'scripts', 'item-cues.ts'));
    const c = (await gate.plantedCases(registry)).find((x) => x.name === 'a family whose key is often strictly the longest');
    const [f] = c.model.families;
    const q = (i) => ({ q: '', options: i.options.map((o) => gate.plain(o.text)), correct: [i.key] });
    for (const items of [f.items, f.replicate]) {
      const at = (rank) => gate.sdBar(items, (i) => cues.pickRank(q(i), rank, true));
      assert.equal(at(0).x.toFixed(1), '117.0');
      assert.equal(at(1).x.toFixed(1), '81.0');
      assert.equal(at(0).bar.toFixed(1), '90.0');
      assert.equal(items.filter(gate.keyStrictlyLongest).length, 87);
    }
  });

  test('the two-half fixtures: last-is-sound and narrative-blind beat the bar only with both their halves', async () => {
    const cases = await gate.plantedCases(registry);
    const callsOf = (name) => cases.find((x) => x.name === name).model.pages.flatMap((p) => p.calls);
    const strategy = (id) => gate.STRATEGIES.find((s) => s.id === id);
    // An independent pick among the options of one verdict class, uniform when the call offers none of it.
    const among = (i, cls) => {
      const offered = i.options.flatMap((o, k) => (gate.verdictOf(o.text) === cls ? [k] : []));
      return offered.length === 0 ? 1 / i.options.length : offered.includes(i.key) ? 1 / offered.length : 0;
    };
    const last = callsOf('pages whose last calls lean holds and whose other calls lean violated, each half of last-is-sound alone below the bar');
    const at = (calls, pick) => gate.sdBar(calls, pick);
    assert.equal(last.length, 36);
    assert.equal(at(last, strategy('last-is-sound').pick).x, 20);
    assert.equal(at(last, strategy('last-is-sound').pick).bar.toFixed(1), '17.7');
    assert.equal(at(last, (i) => (i.lastInPage ? among(i, 'holds') : 1 / 3)).x.toFixed(1), '14.0');
    assert.equal(at(last, (i) => among(i, i.lastInPage ? 'holds' : 'unknown')).x, 12);
    assert.equal(at(last, (i) => among(i, 'violated')).x, 14);
    const nb = callsOf('40 calls on which the narrative-blind strategy beats chance + 2 SD only with both its halves');
    assert.equal(nb.length, 40);
    assert.equal(at(nb, strategy('narrative-blind').pick).x, 21);
    assert.equal(at(nb, strategy('narrative-blind').pick).bar.toFixed(1), '19.3');
    assert.equal(at(nb, (i) => (i.scene.scene === 'first-run' ? among(i, 'violated') : 1 / 3)).x.toFixed(1), '18.3');
    assert.equal(at(nb, (i) => (i.scene.scene === 'fix' ? among(i, 'holds') : 1 / 3)).x.toFixed(1), '16.0');
    assert.equal(at(nb, (i) => among(i, 'violated')).x, 19);
  });

  test('the formula centroid fixture: the key is the centroid through its comparison symbols alone, 125.3 of 300 against 90.0', async () => {
    const c = (await gate.plantedCases(registry)).find((x) => x.name.startsWith('one-edit mutants of a formula'));
    const [f] = c.model.families;
    const centroid = gate.STRATEGIES.find((s) => s.id === 'centroid');
    assert.equal(gate.sdBar(f.items, centroid.pick).x.toFixed(1), '125.3');
    assert.equal(gate.sdBar(f.items, centroid.pick).bar.toFixed(1), '90.0');
    assert.equal(gate.sdBar(f.replicate, centroid.pick).x.toFixed(1), '139.3');
    // The options share every word and number and have one length, so only the symbols tell the key apart.
    for (const i of [...f.items, ...f.replicate]) {
      assert.equal(new Set(i.options.map((o) => [...gate.tokensOf(o.text)].filter((t) => /[\p{L}\p{N}]/u.test(t)).sort().join(' '))).size, 1);
      assert.equal(new Set(i.options.map((o) => gate.textLength(o.text))).size, 1);
    }
  });

  test('structure/sample: a family drawn from fewer than 200 seeds per template and band is a finding, one built from items is not', async () => {
    const fam = (seedsPerCell) => ({ id: 'GEN-planted', fixture: true, mode: 'offered', live: ['t1'], pending: [], items: [], replicate: [], boundIssues: [], notes: [], ...(seedsPerCell === undefined ? {} : { seedsPerCell }) });
    const sample = (f) => gate.checkModel({ families: [f], pages: [], registry, ctiActive: false, sources: [], runs: new Map() }).findings.filter((x) => x.check === 'sample');
    assert.equal(sample(fam(199)).length, 1);
    assert.match(sample(fam(199))[0].message, /sampled at 199 seed\(s\) per template and band; the gate's pool is 200/);
    assert.deepEqual(sample(fam(200)), []);
    assert.deepEqual(sample(fam(250)), []);
    assert.deepEqual(sample(fam(undefined)), []);
    assert.equal(gate.parseArgs([]).seeds, 200);
    assert.equal(gate.parseArgs(['--seeds', '100']).seeds, 100);
  });

  test("GEN-fixture's shipped t3 cue trips always-longest at 200 seeds per template and band and not at 100", async () => {
    const { generator } = await gate.shippedCueFixture();
    for (const [seeds, trips] of [[200, true], [100, false]]) {
      const found = gate.strategyFindings(gate.familyPool(await gate.sampleFamily(generator, {}, { seeds })));
      assert.equal(found.some((x) => x.check === 'always-longest'), trips, `${seeds} seeds`);
    }
  });

  test('a planted case that names refs holds only when each of them has a finding', async () => {
    const choice = (ref, texts) => ({ kind: 'choice', source: 'authored', ref, stem: '', prompt: 'Planted.', call: false, preInstruction: false, options: texts.map((text, j) => ({ id: 'ABC'[j], text, why: 'Why.', mis: j ? 'dp:G1' : undefined })), keys: [0], key: 0 });
    const items = [choice('item:S9.L1#1', ['a key of thirty characters ok', 'twenty characters ok', 'twenty characters no']), choice('item:S9.L1#2', ['first answer', 'other answer', 'third answer'])];
    const model = { families: [], pages: [{ id: 'S9.L1', file: '', stage: 'S9', tier: 'core', calls: [], items, uses: [], cti: 0 }], registry, ctiActive: false, sources: [], runs: new Map() };
    const base = { name: 'refs', rule: 'length', check: 'ratio', pool: 'stage:S9/authored', model };
    assert.equal((await gate.runCase({ ...base, refs: ['item:S9.L1#1'] })).pass, true);
    const r = await gate.runCase({ ...base, refs: ['item:S9.L1#1', 'item:S9.L1#2'] });
    assert.equal(r.pass, false);
    assert.match(r.detail, /no length\/ratio finding for item:S9\.L1#2/);
  });

  test('a family module that does not load, or a family asked for that does not exist, is a finding', () => {
    assert.equal(gate.moduleFindings([{ dir: 'x', error: 'packages/generators/src/x/index.ts exports no generator' }])[0].check, 'module');
    assert.deepEqual(gate.moduleFindings([{ dir: 'core', generator: { id: 'GEN-fixture' } }], ['GEN-fixture']), []);
    assert.match(gate.moduleFindings([], ['GEN-absent'])[0].message, /no family GEN-absent/);
  });

  test('--self-check exits 0 and prints one line per case', async () => {
    const c = capture();
    assert.equal(await gate.main(['--self-check'], c.io), 0);
    assert.match(c.out.at(-1), /^GATE-items self-check: green/);
    assert.ok(c.out.filter((l) => l.startsWith('held')).length >= gate.CHECKS.length);
  });
});

// Each weakening (weakenings.mjs) is a change a careless edit could make to the gate; the weakened copy imports
// everything else from this repository, and the planted fixtures of its pair must no longer all hold, or, for a change
// to how a run samples the families, the weakened gate's own run on GEN-fixture must carry a finding of its pair.
describe('a weakened lint fails the planted fixtures of its check', () => {
  const source = readFileSync(join(REPO, 'scripts', 'verify-items.mjs'), 'utf8');
  const anchor = "const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');";
  const dir = mkdtempSync(join(tmpdir(), 'w1t39-weakened-'));
  after(() => rmSync(dir, { recursive: true, force: true }));

  test('the planted fixtures of every weakened pair hold on the gate as it is', async () => {
    const results = await gate.selfCheck(registry, { controls: false, pairs: [...new Set(WEAKENINGS.map((w) => w[1]))] });
    assert.deepEqual(results.filter((r) => !r.pass).map((r) => `${r.name}: ${r.detail}`), []);
  });

  WEAKENINGS.forEach(([what, pair, from, to, via = 'self-check'], i) => {
    test(`${what} (${pair})`, async () => {
      assert.equal(source.split(anchor).length - 1, 1, 'the gate finds its repository the usual way');
      assert.equal(source.split(from).length - 1, 1, 'the weakened text occurs once in the gate');
      const file = join(dir, `weakened-${i}.mjs`);
      writeFileSync(file, source.replace(anchor, `const REPO = ${JSON.stringify(REPO)};`).replace(from, to));
      const weakened = await import(pathToFileURL(file).href);
      if (via === 'run') {
        const { model } = await weakened.collect(weakened.parseArgs(['--family', 'GEN-fixture']));
        const found = weakened.checkModel(model).findings.filter((f) => `${f.rule}/${f.check}` === pair);
        assert.ok(found.length > 0, `the weakened gate's run on GEN-fixture carries no ${pair} finding`);
        return;
      }
      const results = await weakened.selfCheck(registry, { controls: false, pairs: [pair] });
      assert.ok(results.some((r) => !r.pass), `the weakened gate still trips ${pair} on every planted fixture`);
    });
  });
});

describe('the bar of ASSESSMENT.md section 7.3', () => {
  test('40 three-way calls: chance 13.3, SD 2.98, so no blind strategy may get more than 19 right', () => {
    const items = Array.from({ length: 40 }, () => ({ kind: 'choice', options: [{}, {}, {}] }));
    const at = (k) => gate.sdBar(items, (i) => (items.indexOf(i) < k ? 1 : 0));
    const r = at(19);
    assert.equal(r.mu.toFixed(1), '13.3');
    assert.equal(r.sd.toFixed(2), '2.98');
    assert.equal(r.bar.toFixed(1), '19.3');
    assert.equal(at(19).fail, false);
    assert.equal(at(20).fail, true);
  });

  test('a true/false set of m statements has a chance of 1 in 2^m', () => {
    assert.equal(gate.chanceOf({ kind: 'multi-tf', statements: [{}, {}, {}, {}, {}] }), 1 / 32);
    assert.equal(gate.chanceOf({ kind: 'choice', options: [{}, {}, {}, {}] }), 1 / 4);
  });

  test('the two samples are graded, distinct and disjoint', () => {
    const p = gate.sampleSeeds(gate.SAMPLE_LABELS.primary, 200);
    const r = gate.sampleSeeds(gate.SAMPLE_LABELS.replicate, 200);
    assert.equal(new Set(p).size, 200);
    assert.ok([...p, ...r].every((s) => s >= 0 && s < 0x80000000));
    assert.equal(p.filter((s) => r.includes(s)).length, 0);
    assert.deepEqual(gate.sampleSeeds(gate.SAMPLE_LABELS.primary, 200), p);
  });

  test('a generated pool fails a strategy only when the replicate fails it too', () => {
    const item = (key) => ({ kind: 'choice', source: 'generated', key, keys: [key], options: [{ text: 'a' }, { text: 'b' }, { text: 'c' }, { text: 'd' }], stem: '', prompt: '' });
    const lastHeavy = Array.from({ length: 200 }, (_, i) => item(i % 3 === 0 ? 3 : i % 4));
    const even = Array.from({ length: 200 }, (_, i) => item(i % 4));
    const rows = [];
    const once = gate.strategyFindings({ id: 'p', generated: true, items: lastHeavy, replicate: even }, rows);
    assert.ok(!once.some((f) => f.check === 'always-last'));
    const twice = gate.strategyFindings({ id: 'p', generated: true, items: lastHeavy, replicate: lastHeavy });
    assert.ok(twice.some((f) => f.check === 'always-last'));
  });
});

describe('families and the stage pools', () => {
  const call = (template, i, keyText) => {
    const texts = ['`sat`', '`unsat`', '`unknown`'];
    const order = [texts[i % 3], texts[(i + 1) % 3], texts[(i + 2) % 3]];
    const key = order.indexOf(keyText);
    const options = order.map((text, j) => ({ id: 'ABC'[j], text, why: 'Why.', mis: j === key ? undefined : 'dp:Z1' }));
    return { kind: 'choice', source: 'generated', family: 'GEN-call-it', template, band: 1, ref: `gen:GEN-call-it:${template}:b1:${i}`, stem: '', prompt: 'What will Z3 return?', options, keys: [key], key, call: true, preInstruction: false, verdicts: order.map(gate.verdictOf), keyVerdict: gate.verdictOf(keyText) };
  };
  // t1 balanced; t2 keyed sat on 70% of its items.
  const family = (sample) => ({
    id: 'GEN-call-it',
    fixture: false,
    mode: 'offered',
    live: ['t1', 't2'],
    pending: [],
    boundIssues: [],
    notes: [],
    items: [...Array.from({ length: 300 }, (_, i) => call('t1', i, ['`sat`', '`unsat`', '`unknown`'][(i + sample) % 3])), ...Array.from({ length: 300 }, (_, i) => call('t2', i, (i * 7 + sample) % 10 < 7 ? '`sat`' : '`unsat`'))],
  });
  const fam = { ...family(0), replicate: family(1).items };
  const page = { id: 'S1.L1', file: '', stage: 'S1', tier: 'core', calls: [], items: [], uses: [{ family: 'GEN-call-it', template: 't1', role: 'exit', ref: 'S1.L1/s1 exit GEN-call-it t1' }], cti: 0 };

  test('a template no page names is held to the stage rules on its family pool', () => {
    const r = gate.checkModel({ families: [fam], pages: [page], registry, ctiActive: false, sources: [], runs: new Map() });
    const balance = r.findings.filter((f) => f.check === 'generated-balance');
    assert.equal(balance.length, 1);
    assert.equal(balance[0].pool, 'family:GEN-call-it');
    // the stage pool holds the authored items and the named template only
    const stage = r.pools.find((p) => p.id === 'stage:S1');
    assert.deepEqual(stage.templates, ['GEN-call-it/t1']);
    assert.equal(stage.n, 300);
  });

  test('a finding on a family names the template that carries the cue', () => {
    const r = gate.checkModel({ families: [fam], pages: [], registry, ctiActive: false, sources: [], runs: new Map() });
    const reject = r.findings.find((f) => f.check === 'always-reject');
    assert.ok(reject, r.findings.map((f) => f.check).join(', '));
    assert.match(reject.message, /by template: t1 [\d.]+ of 300 \(chance 100\.0\), t2 210\.0 of 300 \(chance 100\.0\)/);
  });
});

describe('verdicts, scenes and surprises', () => {
  test('verdictOf reads the verdict an option names', () => {
    const cases = {
      '`sat`': 'violated',
      '`unsat`': 'holds',
      '`unknown`': 'unknown',
      'proved: `unsat`': 'holds',
      'no verdict: `unknown`': 'unknown',
      'conservation fails (`sat`)': 'violated',
      'conservation holds (`unsat`)': 'holds',
      proved: 'holds',
      counterexample: 'violated',
      'no counterexample': 'holds',
      "can't tell": 'unknown',
      '`1`': 'value',
      'one more than the balance in the first witness': 'value',
      'Yes: some inputs get past the guard.': 'value',
      'the hold is captured twice': 'value',
      'the gate fails closed': 'value',
    };
    for (const [text, want] of Object.entries(cases)) assert.equal(gate.verdictOf(text), want, text);
  });

  test('a scene opens with the first call of a segment; a later call framed as a fix predicts holds', () => {
    assert.equal(gate.sceneOf({ call: {} }, 0).scene, 'first-run');
    assert.equal(gate.sceneOf({ md: 'Now with the fixed guard.', call: {} }, 1).scene, 'fix');
    assert.equal(gate.sceneOf({ md: 'A second query on the same model.', call: {} }, 1).scene, 'first-run');
    assert.equal(gate.sceneOf({ md: 'Fix it later.', call: {} }, 0).scene, 'first-run');
    assert.equal(gate.sceneOf({ call: { scene: 'fix' } }, 0).scene, 'fix');
    assert.equal(gate.narrativePrediction('first-run'), 'violated');
    assert.equal(gate.narrativePrediction('fix'), 'holds');
  });

  test('a later call is a fix when the narrative since the previous call frames one, wherever it sits', () => {
    const lead = ['Now fix the transfer: add the guard `amount <= balance`, and run the same query again.'];
    assert.equal(gate.sceneOf({ call: {} }, 1, lead).scene, 'fix');
    assert.equal(gate.sceneOf({ call: {} }, 1, lead[0]).scene, 'fix', 'one text, not a list');
    assert.match(gate.sceneOf({ call: {} }, 1, lead).why, /the narrative since the previous call frames an edit as a fix \("fix"\)/);
    assert.equal(gate.sceneOf({ call: {} }, 0, lead).scene, 'first-run');
    assert.equal(gate.sceneOf({ call: {} }, 1, ['Run `fix(guard)` first.']).scene, 'first-run');
    // each text is read without its code, so a code span left open in one text does not swallow the next
    assert.equal(gate.sceneOf({ md: 'Now fix it, and run `q` again.', call: {} }, 1, ['A stray ` mark.']).scene, 'fix');
    assert.deepEqual(gate.narrativeOf({ type: 'prose', md: 'p' }), ['p']);
    assert.deepEqual(gate.narrativeOf({ type: 'card', variant: 'twin', title: 't', md: 'c' }), ['t', 'c']);
    assert.deepEqual(gate.narrativeOf({ type: 'instrument', md: 'm', direction: 'd', code: { text: 'fix()' }, after: 'a' }), ['m', 'd', 'a']);
    assert.deepEqual(gate.narrativeOf({ type: 'instrument', md: 'm', call: { prompt: 'q' } }), []);
    assert.deepEqual(gate.narrativeOf({ type: 'item', choice: { prompt: 'Which fix?' } }), []);
  });

  test('a genuine surprise: the narrative-blind strategy predicts the wrong verdict', () => {
    const call = (keyVerdict, scene) => ({ keyVerdict, scene: { scene } });
    assert.equal(gate.isSurprise(call('holds', 'first-run')), true);
    assert.equal(gate.isSurprise(call('violated', 'first-run')), false);
    assert.equal(gate.isSurprise(call('violated', 'fix')), true);
    assert.equal(gate.isSurprise(call('unknown', 'fix')), true);
    assert.equal(gate.isSurprise(call('value', 'first-run')), false);
    assert.equal(gate.isSurprise(call('unknown', 'none')), false);
  });

  test('verdict items skip the per-item length rules; others do not', () => {
    const it = (texts) => ({ kind: 'choice', options: texts.map((text) => ({ text })) });
    assert.equal(gate.isVerdictItem(it(['`sat`', '`unsat`', '`unknown`'])), true);
    assert.equal(gate.isVerdictItem(it(['proved: `unsat`', 'no verdict: `unknown`'])), true);
    assert.equal(gate.isVerdictItem(it(['`1`', '`0`', 'one more than the balance'])), false);
  });

  test('text helpers: what the learner reads, and the prose of an option', () => {
    assert.equal(gate.plain('a `sat` and **bold** [link](https://example.org)'), 'a sat and bold link');
    assert.equal(gate.normalized('`sat`'), gate.normalized('sat.'));
    assert.equal(gate.isProse('`x ≥ 0 ∧ y < 1`'), false);
    assert.equal(gate.isProse('the guard always rejects it'), true);
  });
});

// ------------------------------------------------------------------ pages in the content format, end to end

const root = mkdtempSync(join(tmpdir(), 'w1t39-'));
after(() => rmSync(root, { recursive: true, force: true }));
for (const d of ['packages', 'runs', 'tracker']) symlinkSync(join(REPO, d), join(root, d));

const front = (id, tier, title) => `---\nid: ${id}\ntier: ${tier}\ntitle: "${title}"\ndraft: true\nkcs: [KC-1.violation-as-sat]\n---\n`;
const verdicts3 = (key, mis = ['dp:Z1', 'dp:Z5', 'dp:Z6']) => {
  const opts = [['`sat`', 'A model exists for this query.'], ['`unsat`', 'No model exists for this query.'], ['`unknown`', 'Small linear queries are decided.']];
  return opts.map(([t, w], i) => `- ${'ABC'[i]}. ${t}\n  - why: ${w}${'ABC'[i] === key ? '' : `\n  - mis: ${mis[i]}`}`).join('\n');
};
const cell = (n, key, options, extra = '') => `:::instrument ins=INS-z3 cell=${n} recorded=RUN-z3-starter\n${extra}\`\`\`python\nprint(s.check())\n\`\`\`\n\n@call key=${key} surprise=yes\nWhat will Z3 return?\n\n${options}\n:::\n`;
const three = (a, b, c, key, mis = ['dp:Z1', 'dp:Z5', 'dp:Z6']) => [a, b, c].map((t, i) => `- ${'ABC'[i]}. ${t}\n  - why: Why ${'ABC'[i]}.${'ABC'[i] === key ? '' : `\n  - mis: ${mis[i]}`}`).join('\n');

// S1's eleven calls after Boot, as curriculum/S01-counterexample.md section 2.7 tallies them, and Boot's call.
const S1 = {
  'S1.L0': front('S1.L0', 'boot', 'Start here') + `\n## The pull request {minutes=3}\n\n` + cell(1, 'B', three('No: the guard checks funds before the debit.', 'Yes: some inputs get past the guard.', 'Only when the amount exceeds both balances.', 'B', ['dp:G8', '', 'dp:Z3'])),
  'S1.L1': front('S1.L1', 'core', 'Negate, then search') + `\n## Negating English {minutes=13}\n\n` + cell(1, 'B', verdicts3('B', ['dp:Z5', '', 'dp:Z6'])) + `\n## The smallest bug {minutes=13}\n\n` + cell(2, 'A', three('`1`', '`0`', "one more than the sender's balance in the first witness", 'A', ['', 'dp:Z5', 'dp:Z3'])),
  'S1.L2': front('S1.L2', 'bridge', 'Three answers: sat, unsat, unknown') + `\n## Three answers {minutes=14}\n\n` + cell(1, 'C', verdicts3('C', ['dp:Z6', 'dp:Z5', ''])) + cell(2, 'B', `- A. proved: \`unsat\`\n  - why: No solution exists, but Z3 has not shown it.\n  - mis: dp:Z6\n- B. no verdict: \`unknown\`\n  - why: The reason says the budget ran out.`),
  'S1.L3': front('S1.L3', 'bridge', 'The guard, and what unsat says') + `\n## The guard {minutes=14}\n\n` + cell(1, 'A', verdicts3('A', ['', 'dp:Z1', 'dp:Z6'])) + cell(2, 'B', verdicts3('B', ['dp:G4', '', 'dp:Z6']), 'A default config sets the transfer limit to zero.\n\n'),
  'S1.L4': front('S1.L4', 'bridge', 'Two-state properties') + `\n## Conservation {minutes=14}\n\n` + cell(1, 'A', three('proved', 'counterexample', '`unknown`', 'A', ['', 'dp:G6', 'dp:Z6'])) + `\n## Two captures {minutes=14}\n\n` + cell(2, 'B', three('conservation fails (`sat`)', 'conservation holds (`unsat`)', '`unknown`', 'B', ['dp:O2', '', 'dp:Z6'])),
  'S1.L5': front('S1.L5', 'core', 'The encoding is the claim') + `\n## The sender at 64 bits {minutes=13}\n\n` + cell(1, 'A', verdicts3('A', ['', 'dp:Z4', 'dp:Z6'])) + `\n## The total at 64 bits {minutes=13}\n\n` + cell(2, 'A', three('proved', 'counterexample', '`unknown`', 'A', ['', 'dp:Z7', 'dp:Z6'])) + `\n## Signed and unsigned {minutes=13}\n\n` + cell(3, 'A', verdicts3('A', ['', 'dp:Z5', 'dp:Z6'])),
};

const writePages = (pages) => {
  rmSync(join(root, 'content'), { recursive: true, force: true });
  for (const [id, text] of Object.entries(pages)) {
    const dir = join(root, 'content', 'stages', id.split('.')[0]);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${id}.md`), text);
  }
};

describe('pages in the content format', () => {
  test("S1's calls as the curriculum tallies them pass the call rules", async () => {
    writePages(S1);
    const { pages, notes } = await gate.loadPages(root);
    assert.deepEqual(notes, []);
    assert.equal(pages.length, 6);
    const calls = pages.flatMap((p) => p.calls).filter((c) => !c.preInstruction);
    assert.equal(calls.length, 11);
    assert.equal(calls.filter(gate.isSurprise).length, 7);
    assert.deepEqual(calls.map((c) => c.keyVerdict), ['holds', 'value', 'unknown', 'unknown', 'violated', 'holds', 'holds', 'holds', 'violated', 'holds', 'violated']);
    assert.equal(pages.find((p) => p.id === 'S1.L0').calls[0].ref, 'cell:S1.L0#1');
    const r = gate.checkModel({ families: [], pages, registry, ctiActive: false, sources: [], runs: new Map() });
    assert.deepEqual(r.findings.map((f) => `${f.rule}/${f.check} ${f.pool}: ${f.message}`), []);
    const pool = r.pools.find((p) => p.id === 'stage:S1/authored');
    assert.equal(pool.calls, 11);
    assert.equal(pool.surprises, 7);
  });

  test('a stage whose calls are all sat on first runs fails the surprise share, the balance and the blind strategies', async () => {
    const all = Object.fromEntries(['S1.L1', 'S1.L2', 'S1.L3'].map((id, k) => [id, front(id, 'core', 'x') + `\n## One {minutes=12}\n\n` + cell(1, 'A', verdicts3('A', ['', 'dp:Z1', 'dp:Z6'])) + `\n## Two {minutes=12}\n\n` + cell(2 + k, 'A', verdicts3('A', ['', 'dp:Z1', 'dp:Z6']))]));
    writePages(all);
    const { pages } = await gate.loadPages(root);
    const r = gate.checkModel({ families: [], pages, registry, ctiActive: false, sources: [], runs: new Map() });
    const got = new Set(r.findings.map((f) => `${f.rule}/${f.check}`));
    for (const want of ['calls/surprises', 'calls/balance', 'blind/always-reject', 'blind/narrative-blind', 'blind/always-first']) assert.ok(got.has(want), `${want} in ${[...got].join(', ')}`);
  });

  // ASSESSMENT.md section 5.5's most predictable narrative, the bug and then its fix: on seven pages a first run keyed
  // sat, a fix keyed unsat, and a new segment's query keyed sat; on three more, unknowns and a first-run unsat. Under the
  // definition 8 of the 30 calls are genuine surprises (26.7%), so the stage fails, wherever the narrative frames the fix.
  test('a stage whose fixes are framed before the cell fails the surprise share, wherever the framing sits', async () => {
    const FIX = 'Now fix the transfer: add the guard `amount <= balance`, and run the same query again.';
    const opts = (key) => verdicts3(key, ['dp:Z1', 'dp:Z1', 'dp:Z6']);
    const callCell = (n, key, { md = '', after = '' } = {}) => `:::instrument ins=INS-z3 cell=${n} recorded=RUN-z3-starter\n${md ? `${md}\n\n` : ''}\`\`\`python\nprint(s.check())\n\`\`\`\n\n@call key=${key}\nWhat will Z3 return?\n\n${opts(key)}\n${after ? `\n@after\n${after}\n` : ''}:::\n`;
    const placements = {
      "the cell's own text": [callCell(1, 'A'), callCell(2, 'B', { md: FIX })],
      'a prose block': [callCell(1, 'A'), `\n${FIX}\n\n`, callCell(2, 'B')],
      "a card's text": [callCell(1, 'A'), `\n:::card variant=twin title="Next"\n${FIX}\n:::\n\n`, callCell(2, 'B')],
      "a free-run cell's text": [callCell(1, 'A'), `\n:::instrument ins=INS-z3 cell=9 recorded=RUN-z3-starter call=false\n${FIX}\n\n\`\`\`python editable\nprint(s.check())\n\`\`\`\n:::\n\n`, callCell(2, 'B')],
      "the previous call's @after": [callCell(1, 'A', { after: FIX }), callCell(2, 'B')],
    };
    for (const [where, [first, ...rest]] of Object.entries(placements)) {
      const pages = {};
      for (let p = 1; p <= 7; p++) pages[`S2.L${p}`] = front(`S2.L${p}`, 'core', 'x') + `\n## The bug and its fix {minutes=12}\n\nRun the violation query on the transfer as it is.\n\n${first}${rest.join('')}\n## A second property {minutes=12}\n\nA new query, on the recipient.\n\n${callCell(3, 'A')}`;
      for (const p of [8, 9]) pages[`S2.L${p}`] = front(`S2.L${p}`, 'core', 'x') + `\n## Budgets {minutes=12}\n\n${callCell(1, 'C')}${callCell(2, 'C')}${callCell(3, 'C')}`;
      pages['S2.L10'] = front('S2.L10', 'core', 'x') + `\n## Mixed {minutes=12}\n\n${callCell(1, 'C')}\nA different property of the same model.\n\n${callCell(2, 'B')}\nAnd the sender, unguarded.\n\n${callCell(3, 'A')}`;
      writePages(pages);
      const { pages: read, notes } = await gate.loadPages(root);
      assert.deepEqual(notes, [], where);
      const calls = read.flatMap((p) => p.calls);
      assert.equal(calls.length, 30, where);
      for (let p = 1; p <= 7; p++) assert.equal(calls.find((c) => c.ref === `cell:S2.L${p}#2`).scene.scene, 'fix', `${where}: cell:S2.L${p}#2`);
      const r = gate.checkModel({ families: [], pages: read, registry, ctiActive: false, sources: [], runs: new Map() });
      assert.equal(r.pools.find((x) => x.id === 'stage:S2/authored').surprises, 8, where);
      const surprises = r.findings.find((f) => f.check === 'surprises');
      assert.ok(surprises, `${where}: no calls/surprises finding`);
      assert.match(surprises.message, /^8 of 30 calls are genuine surprises \(26\.7%; at least 30%\)/, where);
      assert.match(r.findings.find((f) => f.check === 'narrative-blind')?.message ?? '', /scores 22\.0 of 30 \(chance 10\.0 \+ 2 SD 5\.2 = 15\.2\)/, where);
    }
  });

  test('a distractor without a misconception key and an unregistered key are named by their cell', async () => {
    writePages({ 'S1.L1': front('S1.L1', 'core', 'x') + `\n## One {minutes=12}\n\n` + cell(1, 'B', three('`sat`', '`unsat`', '`unknown`', 'B', ['dp:Q999', '', 'dp:Z6']).replace('  - mis: dp:Z6\n', '').replace(/\n  - mis: dp:Z6$/, '')) });
    const { pages } = await gate.loadPages(root);
    const r = gate.checkModel({ families: [], pages, registry, ctiActive: false, sources: [], runs: new Map() });
    assert.ok(r.findings.some((f) => f.check === 'registered' && f.ref === 'cell:S1.L1#1'));
    assert.ok(r.findings.some((f) => f.check === 'tag' && f.ref === 'cell:S1.L1#1'));
  });

  test('a call keyed by a budget-stopped run passes when its code states the rlimit, and fails when nothing does', async () => {
    const budgetCell = (code) => `:::instrument ins=INS-z3 cell=1 recorded=RUN-z3-budget-pyodide\n\`\`\`python\n${code}\n\`\`\`\n\n@call key=B run=RUN-z3-budget-pyodide surprise=yes\nWhat will Z3 return within the budget?\n\n- A. proved: \`unsat\`\n  - why: Not within the budget.\n  - mis: dp:Z6\n- B. no verdict: \`unknown\`\n  - why: The reason says canceled.\n:::\n`;
    for (const [code, ok] of [["s.set('rlimit', 5000000)", true], ['s.add(x > 2)', false]]) {
      writePages({ 'S1.L2': front('S1.L2', 'bridge', 'x') + `\n## Budget {minutes=12}\n\n` + budgetCell(code) });
      const { pages } = await gate.loadPages(root);
      const runs = new Map([['RUN-z3-budget-pyodide', { budget: { rlimit: 5000000 }, verdict_lines: ['2806ms py: rlimit-case unknown canceled 1.1 s'] }]]);
      const r = gate.checkModel({ families: [], pages, registry, ctiActive: false, sources: [], runs });
      assert.equal(r.findings.some((f) => f.rule === 'bound'), !ok, code);
    }
  });

  test('the CTI dose counts GEN-cti-or-bug items across S4 to S9 once active', async () => {
    const item = (n) => Array.from({ length: n }, () => '::item role=segment family=GEN-cti-or-bug template=t1 kcs=KC-4.cti-or-bug\n').join('\n');
    writePages({ 'S4.L5': front('S4.L5', 'core', 'x') + `\n## CTI {minutes=12}\n\n${item(2)}`, 'S5.L4': front('S5.L4', 'core', 'x') + `\n## CTI {minutes=12}\n\n${item(1)}` });
    let { pages } = await gate.loadPages(root);
    assert.equal(pages.reduce((n, p) => n + p.cti, 0), 3);
    assert.ok(gate.ctiFindings(pages, true).length === 1);
    assert.ok(gate.ctiFindings(pages, false).length === 0);
    writePages({ 'S4.L5': front('S4.L5', 'core', 'x') + `\n## CTI {minutes=12}\n\n${item(2)}`, 'S9.L4': front('S9.L4', 'core', 'x') + `\n## CTI {minutes=12}\n\n${item(2)}` });
    ({ pages } = await gate.loadPages(root));
    assert.deepEqual(gate.ctiFindings(pages, true), []);
  });
});

describe('the command line', () => {
  test('an unknown argument exits 2', async () => {
    const c = capture();
    assert.equal(await gate.main(['--nope'], c.io), 2);
    assert.match(c.err.join('\n'), /unknown argument --nope/);
  });

  test('a --root that does not exist exits 2 rather than pass with nothing checked', async () => {
    const c = capture();
    assert.equal(await gate.main(['--root', join(root, 'no-such-tree')], c.io), 2);
    assert.match(c.err.join('\n'), /does not exist/);
  });

  test('--json reports the families with their pending templates and the planted fixtures; a run below 200 seeds is red', async () => {
    writePages(S1);
    const c = capture();
    const code = await gate.main(['--root', root, '--seeds', '20', '--json'], c.io);
    const report = JSON.parse(c.out.join('\n'));
    assert.equal(report.exit, code);
    // 20 seeds per template and band is a preview: every family fails structure/sample, and the planted fixtures hold.
    assert.equal(code, 1);
    assert.ok(report.families.length > 0);
    for (const f of report.families) {
      assert.equal(f.seedsPerCell, 20);
      assert.ok(report.findings.some((x) => x.check === 'sample' && x.pool === `family:${f.id}`), f.id);
    }
    assert.ok(report.families.some((f) => f.id === 'GEN-fixture' && f.mode === 'served' && Array.isArray(f.pending)));
    assert.ok(report.planted.every((p) => p.pass));
    assert.ok(report.pools.some((p) => p.id === 'stage:S1/authored' && p.calls === 11));
    // The S1 pages themselves raise nothing; whatever is found belongs to the generator families.
    assert.deepEqual(report.findings.filter((f) => !String(f.pool).startsWith('family:')), []);
  });
});
