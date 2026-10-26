// Tests of the pure part of the S1 recording script (lib.mjs), and one run of `record.mjs check` on the
// committed records. Run with: node --test "scripts/spikes/W1-T12/*.test.mjs"
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import * as lib from './lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..');

// A script's log: human lines, and one "@@" line per record.
const logOf = (recs, extra = []) => [...extra, ...recs.map((r) => `@@ ${JSON.stringify(r)}`)].join('\n') + '\n';
const R = (q, verdict, more = {}) => ({ q, verdict, rlimit: 5000000, smt2_sha256: `sha-${q}`, ...more });
// the three queries of RUN-z3-demorgan, as a configuration prints them
const demorgan = (model = { a: '0', amount: '1', b: '0' }, over = {}) => [
  R('mis_negation', 'unsat', over.mis),
  R('correct_negation', 'sat', { model, replays: true, replay: 'ok', ...over.correct }),
  R('negation_equivalence', 'unsat'),
];

test('atRecords reads the "@@" lines and humanLines drops the machine and timing lines', () => {
  const log = 'z3 5.3.1 rlimit=5000000\n[q] unsat\n@@ {"q":"q","verdict":"unsat"}\n-- exit 0 in 4 ms\n\n';
  assert.deepEqual(lib.atRecords(log), [{ q: 'q', verdict: 'unsat' }]);
  assert.deepEqual(lib.humanLines(log), ['z3 5.3.1 rlimit=5000000', '[q] unsat']);
});

test('mergeQueries: configurations that agree give one verdict, one export and a replaying witness', () => {
  const merged = lib.mergeQueries({ native: demorgan(), 'pyodide-node': demorgan() }, null);
  assert.equal(merged.queries.mis_negation.verdict, 'unsat');
  assert.equal(merged.summary.verdicts_agree, true);
  assert.equal(merged.summary.exports_identical, true);
  assert.equal(merged.summary.witnesses_replay, true);
  assert.equal(merged.queries.correct_negation.witnesses_differ_across_engines, false);
  assert.equal(merged.queries.correct_negation.witness_replays, true);
  assert.deepEqual(merged.summary.engines, ['native', 'pyodide-node']);
});

test('mergeQueries: a bit-vector witness keeps its signed reading', () => {
  const rec = (signed) => [R('bv', 'sat', { model: { X: '9223372036854775809' }, model_signed: signed, replays: true })];
  const merged = lib.mergeQueries({ native: rec({ X: '-9223372036854775807' }) }, null);
  assert.deepEqual(merged.queries.bv.witness_signed, { X: '-9223372036854775807' });
  assert.equal(lib.mergeQueries({ native: [R('int', 'sat', { model: { a: '1' }, replays: true })] }, null).queries.int.witness_signed, undefined);
});

test('mergeQueries: a different model is reported by engine and is no failure while it replays', () => {
  const other = demorgan({ a: '5', amount: '9', b: '2' });
  const merged = lib.mergeQueries({ native: demorgan(), 'pyodide-chromium': other }, null);
  const q = merged.queries.correct_negation;
  assert.equal(q.witnesses_differ_across_engines, true);
  assert.deepEqual(q.witnesses_by_engine['pyodide-chromium'], { a: '5', amount: '9', b: '2' });
  assert.equal(q.engines_agree, true);
  assert.ok(lib.buildChecks('RUN-z3-demorgan', merged, { cvc5Expected: false }).every((c) => c.pass));
});

test('mergeQueries: raw exports that differ are reported by engine and are no failure once the renamed text agrees', () => {
  const withRaw = (raw) => demorgan(undefined, {}).map((r) => ({ ...r, smt2_raw_sha256: raw }));
  const same = lib.mergeQueries({ native: withRaw('r1'), x: withRaw('r1') }, null);
  assert.equal(same.summary.raw_exports_identical, true);
  assert.equal(same.queries.mis_negation.smt2_raw_sha256_by_engine, undefined);
  const differ = lib.mergeQueries({ native: withRaw('r1'), 'pyodide-node': withRaw('r2') }, null);
  assert.equal(differ.summary.raw_exports_identical, false);
  assert.equal(differ.summary.exports_identical, true);
  assert.deepEqual(differ.queries.mis_negation.smt2_raw_sha256_by_engine, { native: 'r1', 'pyodide-node': 'r2' });
  assert.ok(lib.buildChecks('RUN-z3-demorgan', differ, { cvc5Expected: false }).every((c) => c.pass));
});

test('mergeQueries: a verdict that differs, a witness that does not replay and an export that differs are all caught', () => {
  const flipped = demorgan(undefined, { mis: { verdict: 'sat' } });
  assert.equal(lib.mergeQueries({ native: demorgan(), x: flipped }, null).summary.verdicts_agree, false);
  const noReplay = demorgan(undefined, { correct: { replays: false } });
  const m1 = lib.mergeQueries({ native: demorgan(), x: noReplay }, null);
  assert.equal(m1.summary.witnesses_replay, false);
  assert.equal(lib.buildChecks('RUN-z3-demorgan', m1, { cvc5Expected: false }).find((c) => c.id === 'correct_negation').pass, false);
  const otherExport = demorgan(undefined, { mis: { smt2_sha256: 'changed' } });
  const m2 = lib.mergeQueries({ native: demorgan(), x: otherExport }, null);
  assert.equal(m2.summary.exports_identical, false);
  assert.equal(lib.buildChecks('RUN-z3-demorgan', m2, { cvc5Expected: false }).find((c) => c.id === 'exports-identical').pass, false);
});

test('buildChecks fails on an expectation the run contradicts, a missing query and a query nobody expected', () => {
  const wrong = lib.mergeQueries({ native: demorgan(undefined, { mis: { verdict: 'sat' } }) }, null);
  const c1 = lib.buildChecks('RUN-z3-demorgan', wrong, { cvc5Expected: false });
  assert.match(c1.find((c) => c.id === 'mis_negation').detail, /verdict sat, expected unsat/);
  const missing = lib.mergeQueries({ native: demorgan().slice(0, 2) }, null);
  const c2 = lib.buildChecks('RUN-z3-demorgan', missing, { cvc5Expected: false });
  assert.match(c2.find((c) => c.id === 'negation_equivalence').detail, /printed no such query/);
  const extra = lib.mergeQueries({ native: [...demorgan(), R('surprise', 'sat')] }, null);
  const c3 = lib.buildChecks('RUN-z3-demorgan', extra, { cvc5Expected: false });
  assert.equal(c3.find((c) => c.id === 'no-unexpected-queries').pass, false);
});

test('the exports-identical detail says which configurations and queries were compared, never an export a query lacks', () => {
  const two = lib.mergeQueries({ native: demorgan(), 'pyodide-node': demorgan() }, null);
  const all = lib.buildChecks('RUN-z3-demorgan', two, { cvc5Expected: false }).find((c) => c.id === 'exports-identical');
  assert.equal(all.pass, true);
  assert.equal(all.detail, 'the 2 Z3 configurations (native, pyodide-node) exported the same SMT-LIB text for every query, all 3 of them');
  // the verifier's case: Optimize answers and unsat cores have no export, so "for every query" would be false
  const opt = (q) => R(q, 'sat', { model: { c: '0' }, replays: true, objective: 'minted', minimum: '1', smt2_sha256: null });
  const core = R('max0_range_core', 'unsat', { unsat_core: ['a', 'b'], core_constraints: [], core_alone_unsat: true, core_minimal: true, smt2_sha256: null });
  const recs = [...demorgan(), opt('minimize_minted'), opt('minimize_minted_patch_exact'), core];
  const some = lib.exportsDetail(lib.mergeQueries({ native: recs, x: recs }, null));
  assert.equal(some, 'the 2 Z3 configurations (native, x) exported the same SMT-LIB text for each of the 3 queries that have an export; the other 3 (minimize_minted, minimize_minted_patch_exact: Optimize answers; max0_range_core: an unsat core) have none in any configuration');
  const one = lib.exportsDetail(lib.mergeQueries({ native: [R('a', 'unsat'), opt('m')] }, null));
  assert.equal(one, 'the 1 Z3 configuration (native) exported the same SMT-LIB text for the 1 query that has an export; the other 1 (m: an Optimize answer) has none in any configuration');
  // a text that differs, and an export in one configuration and none in another: the detail names them and says
  // nothing is the same
  const differ = lib.buildChecks('RUN-z3-demorgan', lib.mergeQueries({ native: demorgan(), x: demorgan(undefined, { mis: { smt2_sha256: 'changed' } }) }, null), { cvc5Expected: false }).find((c) => c.id === 'exports-identical');
  assert.equal(differ.pass, false);
  assert.match(differ.detail, /^the 2 Z3 configurations \(native, x\) did not all export the same SMT-LIB text for 1 query: mis_negation /);
  const half = lib.exportsDetail(lib.mergeQueries({ native: recs, x: recs.map((r) => (r.q === 'minimize_minted' ? { ...r, smt2_sha256: 'sha-x' } : r)) }, null));
  assert.match(half, /did not all export the same SMT-LIB text for 1 query: minimize_minted /);
  assert.doesNotMatch(half, /exported the same/);
});

test('a query printed twice, or printed by a configuration other than the primary, fails no-unexpected-queries', () => {
  const unexpected = (byConfig) => lib.buildChecks('RUN-z3-demorgan', lib.mergeQueries(byConfig, null), { cvc5Expected: false }).find((c) => c.id === 'no-unexpected-queries');
  assert.equal(unexpected({ native: demorgan(), x: demorgan() }).pass, true);
  const twice = unexpected({ native: [...demorgan(), R('mis_negation', 'sat')] });
  assert.equal(twice.pass, false);
  assert.match(twice.detail, /native printed mis_negation twice/);
  const elsewhere = unexpected({ native: demorgan(), 'pyodide-chromium': [...demorgan(), R('surprise', 'sat')] });
  assert.equal(elsewhere.pass, false);
  assert.match(elsewhere.detail, /pyodide-chromium printed surprise, which native did not/);
  // the merge itself still walks the primary's queries, so values are unchanged by a stray
  assert.deepEqual(Object.keys(lib.mergeQueries({ native: demorgan(), x: [...demorgan(), R('surprise', 'sat')] }, null).queries), ['mis_negation', 'correct_negation', 'negation_equivalence']);
});

test('buildChecks requires cvc5 to say what Z3 said on every sat or unsat query it was given', () => {
  const merged = (cvc5) => lib.mergeQueries({ native: demorgan() }, cvc5);
  const good = lib.cvc5Log('cvc5 1.4.2 [git abc]\nmis_negation: unsat\ncorrect_negation: sat\nnegation_equivalence: unsat\n');
  assert.ok(lib.buildChecks('RUN-z3-demorgan', merged(good)).every((c) => c.pass));
  const bad = lib.cvc5Log('cvc5 1.4.2 [git abc]\nmis_negation: sat\ncorrect_negation: sat\nnegation_equivalence: unsat\n');
  assert.equal(lib.buildChecks('RUN-z3-demorgan', merged(bad)).find((c) => c.id === 'mis_negation').pass, false);
  const silent = lib.cvc5Log('cvc5 1.4.2 [git abc]\nmis_negation: \ncorrect_negation: sat\nnegation_equivalence: unsat\n');
  assert.equal(silent.verdicts.mis_negation, null);
  assert.equal(lib.buildChecks('RUN-z3-demorgan', merged(silent)).find((c) => c.id === 'mis_negation').pass, false);
  assert.equal(good.version, 'cvc5 1.4.2 [git abc]');
});

test('a core must be the two-constraint core, minimal, and the same in every configuration', () => {
  const core = (labels, minimal = true) => R('max0_range_core', 'unsat', { unsat_core: labels, core_constraints: [], core_alone_unsat: true, core_minimal: minimal, smt2_sha256: null });
  const premises = R('max0_range_premises', 'unsat'); // the core has no export; this query is checked in its place
  const ok = lib.mergeQueries({ native: [core(['amount_positive', 'amount_le_max_transfer']), premises], x: [core(['amount_le_max_transfer', 'amount_positive']), premises] }, null);
  const checks = lib.buildChecks('RUN-z3-vacuous-unsat', ok, { cvc5Expected: false });
  assert.equal(checks.find((c) => c.id === 'max0_range_core').pass, true);
  const wide = lib.mergeQueries({ native: [core(['amount_positive', 'amount_le_max_transfer', 'a_nonneg'])] }, null);
  assert.match(lib.buildChecks('RUN-z3-vacuous-unsat', wide, { cvc5Expected: false }).find((c) => c.id === 'max0_range_core').detail, /core/);
  const loose = lib.mergeQueries({ native: [core(['amount_positive', 'amount_le_max_transfer'], false)] }, null);
  assert.match(lib.buildChecks('RUN-z3-vacuous-unsat', loose, { cvc5Expected: false }).find((c) => c.id === 'max0_range_core').detail, /not minimal/);
});

test('a query without an export passes through the plain query named for it, and fails without one', () => {
  const opt = (minimum = '1') => R('minimize_minted', 'sat', { model: { c: '0', m: '0', r: '1' }, replays: true, replay: 'ok', objective: 'minted', minimum, smt2_sha256: null });
  const plain = (more = {}) => R('no_smaller_mint', 'unsat', more);
  const cvc = (v) => lib.cvc5Log(`cvc5 1.4.2 [git abc]\nno_smaller_mint: ${v}\n`);
  const checkOf = (recs, cvc5 = null, q = 'minimize_minted', run = 'RUN-z3-refund-mint') => lib.buildChecks(run, lib.mergeQueries({ native: recs }, cvc5), { cvc5Expected: cvc5 !== null }).find((c) => c.id === q);
  const good = checkOf([opt(), plain()], cvc('unsat'));
  assert.equal(good.pass, true, good.detail);
  assert.equal(good.checked_by, 'no_smaller_mint');
  assert.match(checkOf([opt()], cvc('unsat')).detail, /its plain query no_smaller_mint is missing/);
  assert.match(checkOf([opt('2'), plain()], cvc('unsat')).detail, /minimum 2, expected 1/);
  assert.match(checkOf([opt(), plain({ verdict: 'sat' })], cvc('sat')).detail, /its plain query no_smaller_mint is not unsat with one export in every configuration/);
  assert.match(checkOf([opt(), plain({ smt2_sha256: null })], cvc('unsat')).detail, /its plain query no_smaller_mint is not unsat with one export/);
  assert.match(checkOf([opt(), plain()], cvc('sat')).detail, /cvc5 said sat on its plain query no_smaller_mint/);
  assert.match(checkOf([opt(), plain()], lib.cvc5Log('cvc5 1.4.2 [git abc]\n')).detail, /cvc5 said nothing on its plain query no_smaller_mint/);
  // an unsat core is checked through the premises query of its scenario
  const core = R('max0_range_core', 'unsat', { unsat_core: ['amount_positive', 'amount_le_max_transfer'], core_constraints: [], core_alone_unsat: true, core_minimal: true, smt2_sha256: null });
  const coreCheck = checkOf([core, R('max0_range_premises', 'unsat')], null, 'max0_range_core', 'RUN-z3-vacuous-unsat');
  assert.equal(coreCheck.pass, true, coreCheck.detail);
  assert.equal(coreCheck.checked_by, 'max0_range_premises');
  assert.match(checkOf([core], null, 'max0_range_core', 'RUN-z3-vacuous-unsat').detail, /its plain query max0_range_premises is missing/);
  // a query without an export that names no plain query fails, and a query with one carries no checked_by
  assert.match(checkOf(demorgan(undefined, { mis: { smt2_sha256: null } }), null, 'mis_negation', 'RUN-z3-demorgan').detail, /no SMT-LIB export, and no plain query is named to check it/);
  assert.equal(checkOf(demorgan(), null, 'mis_negation', 'RUN-z3-demorgan').checked_by, undefined);
  // every pairing names an expected query and a plain query that the run expects to be unsat
  for (const [run, pairs] of Object.entries(lib.PLAIN_CHECKS)) {
    for (const [q, p] of Object.entries(pairs)) {
      assert.ok(Object.hasOwn(lib.EXPECT[run], q), `${run}: ${q} is not expected`);
      assert.equal(lib.EXPECT[run][p.checked_by], 'unsat', `${run}: ${p.checked_by} is not expected unsat`);
    }
  }
});

test('the committed refund-mint logs pass with their plain queries and fail without no_smaller_mint', () => {
  const rec = JSON.parse(fs.readFileSync(path.join(REPO, 'runs', 'RUN-z3-refund-mint.json'), 'utf8'));
  const read = (c) => fs.readFileSync(path.join(REPO, c.outputs.find((o) => o.endsWith('.log'))), 'utf8');
  const cvcText = read(rec.configs.find((c) => c.id === lib.CVC5_CONFIG));
  const logs = Object.fromEntries(rec.configs.filter((c) => c.id !== lib.CVC5_CONFIG).map((c) => [c.id, read(c)]));
  const whole = lib.deriveZ3('RUN-z3-refund-mint', logs, cvcText);
  assert.deepEqual(whole.checks.filter((c) => !c.pass), []);
  assert.equal(whole.checks.find((c) => c.id === 'minimize_minted').checked_by, 'no_smaller_mint');
  assert.equal(whole.checks.find((c) => c.id === 'minimize_minted_patch_exact').checked_by, 'no_smaller_mint_patch_exact');
  // the same logs with no_smaller_mint taken out of every configuration and out of cvc5's log
  const drop = (t) => t.split('\n').filter((l) => !l.includes('"q": "no_smaller_mint"') && !l.startsWith('[no_smaller_mint]') && l !== 'no_smaller_mint: unsat').join('\n');
  const cut = Object.fromEntries(Object.entries(logs).map(([k, t]) => [k, drop(t)]));
  for (const k of Object.keys(logs)) assert.notEqual(cut[k], logs[k], `${k}: nothing was taken out`);
  const broken = lib.deriveZ3('RUN-z3-refund-mint', cut, drop(cvcText));
  assert.match(broken.checks.find((c) => c.id === 'minimize_minted').detail, /its plain query no_smaller_mint is missing/);
  assert.equal(broken.checks.find((c) => c.id === 'minimize_minted_patch_exact').pass, true);
});

test('deriveZ3 reads the int twin of z3_negamt.py and replays its witness in BigInt', () => {
  const log = '[negative amount passes the guard, drains recipient] sat [amount = -1, b = 0, a = 0]\n';
  assert.deepEqual(lib.parseTwin(log), { query: 'negative amount passes the guard, drains recipient', verdict: 'sat', witness: { amount: '-1', b: '0', a: '0' } });
  const bnr = (q, verdict, more) => R(q, verdict, more);
  const native = [bnr('bv64_sender_noguard', 'sat', { model: { A: '1' }, replays: true }), bnr('bv64_sender_positive', 'unsat'), bnr('int_sender_noguard', 'unsat'), bnr('int_recipient_drain', 'sat', { model: { a: '0' }, replays: true }), bnr('int_zero_noop', 'unsat')];
  const { values, checks } = lib.deriveZ3('RUN-z3-bv64-negamt', { native: logOf(native), 'int-twin-original': log }, null);
  assert.equal(values.int_twin_original.witness_replays, true);
  assert.ok(checks.find((c) => c.id === 'int-twin-original').pass);
  const broken = lib.deriveZ3('RUN-z3-bv64-negamt', { native: logOf(native), 'int-twin-original': '[q] sat [amount = 1, b = 0, a = 0]\n' }, null);
  const brokenCheck = broken.checks.find((c) => c.id === 'int-twin-original');
  assert.equal(brokenCheck.pass, false);
  // a failing check's detail says what was seen, never the drain it did not show
  assert.equal(brokenCheck.detail, 'z3_negamt.py as it is on disk gave sat with a witness that does not replay, where sat with a negative amount that passes the guard and drains the recipient was expected');
  const twin = (log) => lib.deriveZ3('RUN-z3-bv64-negamt', { native: logOf(native), 'int-twin-original': log }, null).checks.find((c) => c.id === 'int-twin-original');
  assert.match(twin('[q] unsat\n').detail, /^z3_negamt\.py as it is on disk gave unsat with no witness, where/);
  assert.match(twin('Traceback (most recent call last):\n').detail, /^z3_negamt\.py as it is on disk printed no line of the form/);
  // a value that is not an integer fails the replay instead of stopping the check
  assert.equal(twin('[q] sat [amount = -1/2, b = 0, a = 0]\n').pass, false);
  assert.equal(checks.find((c) => c.id === 'int-twin-original').detail, 'z3_negamt.py as it is on disk: a negative amount passes the guard and drains the recipient');
});

test('tourTextDiffs names the files whose text differs from the command line\'s', () => {
  assert.deepEqual(lib.tourTextDiffs({ 'cli-native': TOUR(), 'api-native': TOUR() }), []);
  assert.deepEqual(lib.tourTextDiffs({ 'cli-native': TOUR(), 'api-native': TOUR({ unknown_theory: 'unknown\n(:reason-unknown "other")' }) }), [{ config: 'api-native', file: 'unknown_theory' }]);
  const cut = TOUR().replace(/== unknown_canceled\.smt2[\s\S]*$/, '');
  assert.deepEqual(lib.tourTextDiffs({ 'cli-native': TOUR(), x: cut }), [{ config: 'x', file: 'unknown_canceled' }]);
});

const TOUR = (over = {}) => {
  const files = {
    starter: 'sat\n(\n  (define-fun b () Int\n    0)\n  (define-fun amount () Int\n    1)\n  (define-fun a () Int\n    0)\n)',
    starter_guarded: 'unsat',
    starter_guarded_get_model: 'unsat\n(error "line 8 column 10: model is not available")',
    unknown_theory: 'unknown\n(:reason-unknown "smt tactic failed to show goal to be sat/unsat (incomplete (theory arithmetic))")',
    unknown_canceled: 'unknown\n(:reason-unknown "canceled")',
    ...over,
  };
  return `z3 5.3.1\n${Object.entries(files).map(([f, out]) => `== ${f}.smt2\n${out}\n-- exit 0 in 3 ms`).join('\n')}\n`;
};

test('the tour: sections, model, reason and error are read, and the starter replays', () => {
  const secs = lib.sections(TOUR());
  assert.deepEqual(secs.map((s) => s.file), lib.TOUR_FILES);
  const starter = lib.tourFacts(secs[0].lines);
  assert.equal(starter.verdict, 'sat');
  assert.deepEqual(starter.model, { b: 0n, amount: 1n, a: 0n });
  assert.equal(lib.replayStarter(starter.model).ok, true);
  assert.equal(lib.replayStarter({ a: 5n, b: 0n, amount: 1n }).ok, false);
  assert.equal(lib.modelOf('(define-fun a () Int\n    (- 7))').a, -7n);
  assert.equal(lib.tourFacts(secs[4].lines).reason_unknown, 'canceled');
  assert.match(lib.tourFacts(secs[2].lines).error, /model is not available/);
});

test('the tour: configurations that agree pass and a changed verdict or reason fails', () => {
  const good = lib.deriveTour({ 'cli-native': TOUR(), 'pyodide-node': TOUR() }, 'cvc5 1.4.2\nstarter: sat\nstarter_guarded: unsat\n');
  assert.ok(good.checks.every((c) => c.pass));
  assert.equal(good.values.files.starter.witness_replays, true);
  assert.equal(good.values.files.starter.witnesses_differ_across_engines, false);
  const wrongReason = lib.deriveTour({ 'cli-native': TOUR({ unknown_canceled: 'unknown\n(:reason-unknown "timeout")' }), 'pyodide-node': TOUR() }, null);
  const check = wrongReason.checks.find((c) => c.id === 'unknown_canceled');
  assert.equal(check.pass, false);
  assert.match(check.detail, /reason/);
  const cvcDisagrees = lib.deriveTour({ 'cli-native': TOUR() }, 'cvc5 1.4.2\nstarter: sat\nstarter_guarded: sat\n');
  assert.equal(cvcDisagrees.checks.find((c) => c.id === 'starter_guarded').pass, false);
});

const PG = [
  'server',
  'PostgreSQL 18.6 (Debian 18.6-1.pgdg13+2) on x86_64-pc-linux-gnu, compiled by gcc, 64-bit',
  'case bigint_at_max: credit 1 to a bigint balance of 9223372036854775807',
  'psql:/q/numeric_bound.sql:17: ERROR:  bigint out of range',
  'sqlstate 22003',
  'balance',
  '9223372036854775807',
  'case numeric19_below_bound: credit 1 to a numeric(19,0) balance of 9223372036854775807',
  'balance',
  '9223372036854775808',
  'case numeric19_at_bound: credit 1 to a numeric(19,0) balance of 9999999999999999999',
  'psql:/q/numeric_bound.sql:31: ERROR:  numeric field overflow',
  'DETAIL:  A field with precision 19, scale 0 must round to an absolute value less than 10^19.',
  'sqlstate 22003',
  'balance',
  '9999999999999999999',
  'case numeric_unbounded: credit 1 to a numeric balance of 9999999999999999999',
  'balance',
  '10000000000000000000',
].join('\n');

test('PostgreSQL log: errors, SQLSTATEs, details and balances are read per case', () => {
  const { values, checks } = lib.derivePg(PG);
  assert.equal(values.cases.numeric19_at_bound.detail, 'A field with precision 19, scale 0 must round to an absolute value less than 10^19.');
  assert.equal(values.cases.numeric19_below_bound.error, null);
  assert.equal(values.cases.numeric_unbounded.balance_after, '10000000000000000000');
  assert.ok(checks.every((c) => c.pass));
  const wrong = lib.derivePg(PG.replace('sqlstate 22003\nbalance\n9999999999999999999', 'sqlstate 22001\nbalance\n9999999999999999999'));
  assert.equal(wrong.checks.find((c) => c.id === 'numeric19_at_bound').pass, false);
  assert.equal(lib.derivePg(PG.replace('18.6', '17.11')).checks.find((c) => c.id === 'server-18.6').pass, false);
  assert.equal(checks.find((c) => c.id === 'psql-order').pass, true);
});

test('PostgreSQL log: an ERROR line after the case\'s echoes fails psql-order and nothing else', () => {
  // What `docker exec` printed when the two streams were captured apart: the stderr lines came after the echoes.
  const err = 'psql:/q/numeric_bound.sql:17: ERROR:  bigint out of range';
  const swapped = PG.replace(`${err}\n`, '').replace('9223372036854775807\ncase numeric19_below_bound', `9223372036854775807\n${err}\ncase numeric19_below_bound`);
  assert.notEqual(swapped, PG);
  const { values, checks } = lib.derivePg(swapped);
  const order = checks.find((c) => c.id === 'psql-order');
  assert.equal(order.pass, false);
  assert.match(order.detail, /^bigint_at_max: the ERROR line \(log line \d+\) comes after the case's sqlstate or balance echo$/);
  // the values read per case are still right, which is why only this check can see the fault
  assert.equal(values.cases.bigint_at_max.error, 'bigint out of range');
  assert.deepEqual(checks.filter((c) => c.id !== 'psql-order' && !c.pass), []);
  // and so is an ERROR and its DETAIL moved after the echoes of the second failing case
  const detail = 'DETAIL:  A field with precision 19, scale 0 must round to an absolute value less than 10^19.';
  const err2 = 'psql:/q/numeric_bound.sql:31: ERROR:  numeric field overflow';
  const swapped2 = PG.replace(`${err2}\n${detail}\n`, '').replace('9999999999999999999\ncase numeric_unbounded', `9999999999999999999\n${err2}\n${detail}\ncase numeric_unbounded`);
  assert.notEqual(swapped2, PG);
  assert.match(lib.derivePg(swapped2).checks.find((c) => c.id === 'psql-order').detail, /^numeric19_at_bound: /);
});

test('the committed PostgreSQL log is in psql\'s own order', () => {
  const log = fs.readFileSync(path.join(REPO, 'runs', 'RUN-pg-numeric-bound', 'postgres-18.log'), 'utf8');
  assert.deepEqual(lib.parsePg(log).order_problems, []);
  for (const [id, error] of [['bigint_at_max', 'bigint out of range'], ['numeric19_at_bound', 'numeric field overflow']]) {
    const caseLines = log.slice(log.indexOf(`case ${id}:`)).split('\n');
    assert.match(caseLines[1], new RegExp(`^psql:/q/numeric_bound\\.sql:\\d+: ERROR:  ${error}$`), `${id}: the ERROR line is the first line under its case`);
  }
});

const RUST = [
  '== toolchain', 'rustc 1.96.0 (ac68faa20 2026-05-25)', 'cargo 1.96.0 (30a34c682 2026-05-25)',
  '== build: cargo build  (the dev profile)', '   Compiling ovf v0.1.0 (/w)', '    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.07s',
  '== run: target/debug/ovf, stdout', 'b + x panicked (overflow check)', 'checked_add = None',
  '== run: target/debug/ovf, stderr', '', "thread 'main' (89) panicked at src/main.rs:6:41:", 'attempt to add with overflow',
  '== run: target/debug/ovf, exit code', '0',
  '== build: cargo build --release (the release profile)', '    Finished `release` profile [optimized] target(s) in 0.04s',
  '== run: target/release/ovf, stdout', 'b + x = -9223372036854775808 (wrapped; non-negativity broken; i128 total changed by -18446744073709551616)', 'checked_add = None',
  '== run: target/release/ovf, stderr',
  '== run: target/release/ovf, exit code', '0',
].join('\n');

test('Rust log: the dev profile panics, the release profile wraps, checked_add is None', () => {
  const { values, checks } = lib.deriveRust(RUST);
  assert.equal(values.debug.panic_message, 'attempt to add with overflow');
  assert.equal(values.release.b_plus_x, '-9223372036854775808');
  assert.equal(values.release.checked_add, 'None');
  assert.ok(checks.every((c) => c.pass));
  const noWrap = lib.deriveRust(RUST.replace('b + x = -9223372036854775808 (wrapped', 'b + x panicked (overflow check)\nb + x = 0 (not wrapped'));
  assert.equal(noWrap.checks.find((c) => c.id === 'release-build-wraps').pass, false);
});

test('helperBlock cuts a script between its markers and is null without them', () => {
  const src = 'x = 1\n# ---- helper block: one\nA = 2\n# ---- end of the helper block -----\ny = 3\n';
  assert.equal(lib.helperBlock(src), '# ---- helper block: one\nA = 2\n# ---- end of the helper block -----');
  assert.equal(lib.helperBlock('x = 1\n'), null);
});

test('the committed Z3 scripts carry one helper block, and every expected run has a script', () => {
  const blocks = new Set();
  for (const id of Object.keys(lib.EXPECT)) {
    const dir = path.join(REPO, 'runs', 'inputs', 'S1', id);
    const script = fs.readdirSync(dir).find((f) => f.endsWith('.py'));
    assert.ok(script, `${id} has no script`);
    const block = lib.helperBlock(fs.readFileSync(path.join(dir, script), 'utf8'));
    assert.ok(block, `${id}/${script} has no helper block`);
    blocks.add(block);
  }
  assert.equal(blocks.size, 1);
});

test('record.mjs check passes on the committed records and logs', () => {
  const r = spawnSync(process.execPath, [path.join(HERE, 'record.mjs'), 'check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /W1-T12 check: PASS/);
});
