// Tests of the notes record.mjs writes into the Z3 records: each sentence that states a fact about a recording is
// built from the configurations, values and logs it describes, and these tests feed the builders data in which
// the fact is true and data in which it is not. Then the committed records are checked against their own data: the
// exports-identical detail against the queries' exports, and a browser configuration's two spans against each other.
// (`record.mjs check` also builds every generated note again from the committed record and compares.)
// Run with: node --test "scripts/spikes/W1-T12/*.test.mjs"
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import * as lib from './lib.mjs';
import { Z3_RUNS, clockSentence, cvc5Note, exportNote, shapeNote, timingNote, tourNote, witnessNote, z3Notes } from './record.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..');
const ALL = Z3_RUNS.map((r) => r.id);
const RUN = (id) => Z3_RUNS.find((r) => r.id === id);

// configurations as record.mjs builds them: the host ones have no image, the container ones name theirs
const cfg = (id, more = {}) => ({ id, image: /^pyodide-(chromium|firefox|webkit)$|^cvc5-bench$/.test(id) ? `img-${id}` : null, environment: {}, ...more });
const CONFIGS = ['native', 'pyodide-node', 'pyodide-chromium', 'pyodide-firefox', 'pyodide-webkit', 'cvc5-bench'].map((id) => cfg(id));
const at = (ms) => `${ms.map((m, i) => `@@ ${JSON.stringify({ q: `q${i}`, verdict: 'unsat', ...(m === undefined ? {} : { ms: m }) })}`).join('\n')}\n`;
const LOGS = { native: at([1.23, 0.4]), 'pyodide-node': at([2.5, 1.07]), 'pyodide-chromium': at([2.1, 0.4]), 'pyodide-firefox': at([2, 0]), 'pyodide-webkit': at([3, 1]) };

test('the timing note keeps the session and the docker run apart, and says who shared the session', () => {
  const note = timingNote(RUN('RUN-z3-demorgan'), CONFIGS, LOGS, ALL);
  assert.match(note, /^started_at and duration_s of a configuration that ran its own command \(native, pyodide-node and cvc5-bench\)/);
  assert.match(note, /session_wall_ms, from started_at to when the last script had finished/);
  assert.match(note, /docker_run_wall_ms, the docker run from docker_run_started_at, when the recording script started it, to its exit/);
  assert.match(note, /shared by the 9 Z3 records of runs\/inputs\/S1/);
  assert.doesNotMatch(note, /whole session's wall time/);
  // a recording of some runs only says which records share its session
  assert.match(timingNote(RUN('RUN-z3-demorgan'), CONFIGS, LOGS, ['RUN-z3-demorgan']), /shared by the Z3 records made in the same recording \(RUN-z3-demorgan\)/);
  // a recording without browsers says nothing about sessions
  const bare = timingNote(RUN('RUN-z3-demorgan'), CONFIGS.filter((c) => !/chromium|firefox|webkit/.test(c.id)), LOGS, ALL);
  assert.doesNotMatch(bare, /session|docker_run|browser/);
  assert.match(bare, /budget\.harness_timeout_s is the wall time after which the recording script would have stopped a configuration's command\.$/);
});

test('the clock sentence says how fine each browser\'s figures were, from its log', () => {
  assert.equal(
    clockSentence(RUN('RUN-z3-demorgan'), LOGS, ['pyodide-chromium', 'pyodide-firefox', 'pyodide-webkit']),
    "The ms figure on an @@ line is the script's own measurement of that query's solver call, rounded to hundredths of a millisecond; in this record's browser logs pyodide-firefox and pyodide-webkit gave whole milliseconds, and pyodide-chromium gave multiples of 0.1 ms, on all 2 queries, so a browser figure of a few milliseconds is a rough one.",
  );
  // a browser whose figures are as fine as native ones is not called coarse
  const fine = clockSentence(RUN('RUN-z3-demorgan'), { 'pyodide-chromium': at([2.13, 0.47]) }, ['pyodide-chromium']);
  assert.match(fine, /pyodide-chromium gave figures finer than 0\.1 ms, on all 2 queries\.$/);
  assert.doesNotMatch(fine, /rough/);
  // lines without a figure (an unsat core's) are counted apart
  assert.match(clockSentence(RUN('RUN-z3-vacuous-unsat'), { 'pyodide-webkit': at([2, undefined, 3]) }, ['pyodide-webkit']), /on the 2 of its 3 queries that carry one/);
  assert.match(clockSentence(RUN('RUN-z3-smtlib-tour'), { 'pyodide-webkit': at([2, 5]) }, ['pyodide-webkit']), /that file's evaluation.*on all 2 files/);
  assert.equal(clockSentence(RUN('RUN-z3-demorgan'), LOGS, []), '');
  assert.deepEqual(lib.msGranularity(at([2, 0, 13])), { kind: 'whole', with_ms: 3, lines: 3 });
  assert.deepEqual(lib.msGranularity(at([0.1, 0.2, 0.30000000000000004])), { kind: 'tenths', with_ms: 3, lines: 3 });
  assert.deepEqual(lib.msGranularity(''), { kind: null, with_ms: 0, lines: 0 });
});

// values as lib.mergeQueries builds them
const Q = (verdict, more = {}) => ({ verdict, smt2_sha256: `sha-${verdict}-${Math.random()}`, rlimit: 5000000, engines: { native: verdict, 'cvc5-bench': verdict }, engines_agree: true, ...more });
const OPT = (more = {}) => Q('sat', { smt2_sha256: null, engines: { native: 'sat' }, witness: { m: '1' }, witness_replays: true, objective: 'minted', minimum: '1', ...more });
const values = (queries, more = {}) => ({ queries, engines: ['native', 'pyodide-node'], verdicts_agree: true, witnesses_replay: true, exports_identical: true, raw_exports_identical: true, cvc5: { configuration: 'cvc5-bench', version: 'cvc5 1.4.2 [git x]', queries_checked: Object.values(queries).filter((q) => q.smt2_sha256 !== null).length, agree: 0 }, ...more });

test('the export note speaks of exports only for the queries that have one', () => {
  const v = values({ clamp_mint: Q('sat'), minimize_minted: OPT(), no_smaller_mint: Q('unsat'), minimize_minted_patch_exact: OPT() }, { raw_exports_identical: false });
  v.queries.clamp_mint.smt2_raw_sha256_by_engine = { native: 'r1', 'pyodide-node': 'r2' };
  const note = exportNote(CONFIGS, v);
  assert.match(note, /on 1 of the 2 queries that have an export/);
  assert.match(note, /\(null for minimize_minted and minimize_minted_patch_exact, which have no export\)\.$/);
  assert.doesNotMatch(note, /every query's|for every query/);
  // every query exported: no null clause; the int twin sets no rlimit and the note says so
  const all = exportNote([...CONFIGS, cfg('int-twin-original')], values({ a: Q('sat'), b: Q('unsat') }));
  assert.match(all, /^Every query ran with rlimit 5000000 \(spine section 9\.1; values\.queries\.<query>\.rlimit\); z3_negamt\.py, which int-twin-original runs as it is, sets none\./);
  assert.match(all, /the raw text of every export happened to be identical/);
  assert.doesNotMatch(all, /null for/);
  // exports that differ are not called the same
  assert.match(exportNote(CONFIGS, values({ a: Q('sat') }, { exports_identical: false })), /The renamed text is not the same in every Z3 configuration/);
});

test('the shape note names the queries without an export, and says witness_signed and cvc5 only where they apply', () => {
  const v = values({ clamp_mint: Q('sat', { witness: { a: '1' } }), minimize_minted: OPT(), no_smaller_mint: Q('unsat') });
  const note = shapeNote(RUN('RUN-z3-refund-mint'), v);
  assert.match(note, /the SHA-256 of its SMT-LIB export \(null for the 1 query without one: minimize_minted\)/);
  assert.match(note, /cvc5's on the 2 queries it ran/);
  assert.doesNotMatch(note, /witness_signed/);
  const bv = values({ q: Q('sat', { witness: { X: '9223372036854775809' }, witness_signed: { X: '-9223372036854775807' } }) });
  assert.match(shapeNote(RUN('RUN-z3-bv64-negamt'), bv), /witness_signed reads its bit-vector values as signed integers/);
  assert.doesNotMatch(shapeNote(RUN('RUN-z3-bv64-negamt'), bv), /null for/);
});

test('the witness note names the configurations whose models differ, and blames the shared worker only when they are browsers', () => {
  const differ = (by) => values({ q: Q('sat', { witness: { a: '0' }, witness_replays: true, witnesses_differ_across_engines: true, witnesses_by_engine: by }) }, { engines: Object.keys(by) });
  const browsers = witnessNote(RUN('RUN-z3-btc2010'), CONFIGS, differ({ native: { a: '0' }, 'pyodide-node': { a: '0' }, 'pyodide-chromium': { a: '5' } }));
  assert.match(browsers, /the models that differ from the primary configuration's are those of pyodide-chromium\./);
  assert.match(browsers, /That is the likely reason, and this record does not establish it\.$/);
  const node = witnessNote(RUN('RUN-z3-btc2010'), CONFIGS, differ({ native: { a: '0' }, 'pyodide-node': { a: '7' }, 'pyodide-chromium': { a: '0' } }));
  assert.match(node, /those of pyodide-node\. This record does not establish why the models differ\.$/);
  assert.doesNotMatch(node, /likely reason/);
  const same = witnessNote(RUN('RUN-z3-demorgan'), CONFIGS, values({ q: Q('sat', { witness: { a: '0' }, witness_replays: true, witnesses_differ_across_engines: false }) }));
  assert.match(same, /returned the same model for every sat query/);
  assert.match(same, /cvc5-bench gives verdicts only/);
});

test('the cvc5 note counts what cvc5 ran and names the plain query behind each query without an export', () => {
  const v = values({ clamp_mint: Q('sat'), minimize_minted: OPT(), no_smaller_mint: Q('unsat') });
  const note = cvc5Note(RUN('RUN-z3-refund-mint'), v);
  assert.match(note, /ran 2 of the 3 queries, each file under a 60 s limit \(budget\.per_file_timeout_s\): every sat or unsat query that has an SMT-LIB export/);
  assert.match(note, /The 1 Optimize answer has no export, and each is checked by a plain query that cvc5 ran .* \(minimize_minted by no_smaller_mint\)/);
  assert.equal(cvc5Note(RUN('RUN-z3-demorgan'), { queries: {} }), 'cvc5 did not run.');
});

const TOUR_LOG = (over = {}, api = false) => {
  const files = {
    starter: 'sat\n(\n  (define-fun a () Int\n    0)\n)',
    starter_guarded: 'unsat',
    starter_guarded_get_model: 'unsat\n(error "line 8 column 10: model is not available")',
    unknown_theory: 'unknown\n(:reason-unknown "smt tactic failed")',
    unknown_canceled: 'unknown\n(:reason-unknown "canceled")',
    ...over,
  };
  return `z3\n${Object.entries(files).map(([f, out]) => `== ${f}.smt2\n${out}\n${api ? `@@ ${JSON.stringify({ q: f, error: f === 'starter_guarded_get_model', ms: 1 })}` : '-- exit 0 in 3 ms'}`).join('\n')}\n`;
};
const TOUR_VALUES = { files: { starter_guarded_get_model: { verdict: 'unsat', error: 'line 8 column 10: model is not available', command_line_exit_code: 1 } } };

test('the tour note compares the API configurations\' text with the command line\'s, from the logs', () => {
  const same = tourNote(TOUR_VALUES, { 'cli-native': TOUR_LOG(), 'api-native': TOUR_LOG({}, true), 'pyodide-node': TOUR_LOG({}, true) });
  assert.match(same, /the API configurations \(api-native and pyodide-node\) call Z3_eval_smtlib2_string.*printed the same text as the command line on every file\./);
  assert.match(same, /On starter_guarded_get_model an interpreter error raised an exception under the API .*; the command line printed the same text and exited 1/);
  const differs = tourNote(TOUR_VALUES, { 'cli-native': TOUR_LOG(), 'api-native': TOUR_LOG({ unknown_theory: 'unknown\n(:reason-unknown "other")' }, true) });
  assert.match(differs, /printed text that differs from the command line's on unknown_theory in api-native\./);
  assert.doesNotMatch(differs, /same text as the command line on every file/);
});

test('z3Notes keeps its order: the citing note first, the placeholders right after the argv note', () => {
  const v = values({ a: Q('sat', { witness: { a: '0' }, witness_replays: true, witnesses_differ_across_engines: false }) });
  const notes = z3Notes(RUN('RUN-z3-demorgan'), CONFIGS, v, LOGS, ['extra'], ALL);
  assert.match(notes[0], /^Recorded by W1-T12\./);
  const argvAt = notes.findIndex((n) => n.includes('(next note)'));
  assert.match(notes[argvAt + 1], /^Placeholders in argv:/);
  assert.equal(notes.at(-1), 'extra');
});

// ------------------------------------------------------------------------------------------ the committed records
const records = () => ALL.map((id) => [id, JSON.parse(fs.readFileSync(path.join(REPO, 'runs', `${id}.json`), 'utf8'))]);

test('the committed records: each exports-identical detail matches the queries\' exports', () => {
  for (const [id, rec] of records()) {
    if (!rec.values.queries) continue;
    const none = Object.entries(rec.values.queries).filter(([, q]) => q.smt2_sha256 === null).map(([k]) => k);
    const detail = rec.checks.find((c) => c.id === 'exports-identical').detail;
    if (none.length) {
      assert.doesNotMatch(detail, /every query/, `${id}: ${detail}`);
      for (const q of none) assert.ok(detail.includes(q), `${id}: the detail does not name ${q}, which has no export`);
      assert.match(detail, new RegExp(`each of the ${Object.keys(rec.values.queries).length - none.length} queries that have an export`), id);
    } else assert.match(detail, /for every query, all \d+ of them$/, `${id}: ${detail}`);
  }
});

test('the committed records: a browser configuration\'s session lies inside its docker run, and the timing note names both spans', () => {
  for (const [id, rec] of records()) {
    const browsers = rec.configs.filter((c) => /^pyodide-(chromium|firefox|webkit)$/.test(c.id));
    assert.equal(browsers.length, 3, `${id}: three browser configurations`);
    for (const c of browsers) {
      const e = c.environment;
      assert.equal(e.session_wall_ms_for_all_scripts, undefined, `${id}/${c.id}: the old, misleading name`);
      const dockerStart = Date.parse(e.docker_run_started_at);
      const sessionStart = Date.parse(c.started_at);
      assert.ok(Number.isInteger(e.session_wall_ms) && Number.isInteger(e.docker_run_wall_ms) && Number.isFinite(dockerStart), `${id}/${c.id}: both spans recorded`);
      assert.ok(dockerStart <= sessionStart, `${id}/${c.id}: the docker run starts before the session`);
      assert.ok(sessionStart + e.session_wall_ms <= dockerStart + e.docker_run_wall_ms, `${id}/${c.id}: the session ends before the docker run does`);
      assert.ok(e.session_wall_ms < e.docker_run_wall_ms, `${id}/${c.id}: the session is the shorter span`);
      assert.ok(c.duration_s * 1000 <= e.session_wall_ms, `${id}/${c.id}: one script's time lies inside the session`);
      assert.equal(Math.round(c.duration_s * 1000), e.script_ms, `${id}/${c.id}: duration_s is the script's own time`);
      assert.equal(c.budget.harness_timeout_s, 900, `${id}/${c.id}: the docker run's limit`);
    }
    const timing = rec.notes.find((n) => n.startsWith('started_at and duration_s'));
    assert.ok(timing.includes('session_wall_ms') && timing.includes('docker_run_wall_ms') && timing.includes('docker_run_started_at'), id);
    assert.doesNotMatch(JSON.stringify(rec), /whole session's wall time|session_wall_ms_for_all_scripts/, id);
  }
});
