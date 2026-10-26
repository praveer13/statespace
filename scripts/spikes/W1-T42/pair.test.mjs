// Tests of the Z3 corpus and the comparison of GATE-conformance's built-in pair (lib/z3-corpus.mjs, lib/pair.mjs).
// Run: node --test scripts/spikes/W1-T42/pair.test.mjs

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { REPO } from './lib/engines.mjs';
import { FAITHFUL, resultsText, standInEngine } from './lib/fixtures.mjs';
import { compareZ3Pair } from './lib/pair.mjs';
import { PRELUDE, QUERIES, parseResults, programFor } from './lib/z3-corpus.mjs';
import { SPECIMEN_ID, readSpineSpecimens } from './lib/specimens.mjs';

const outcome = (id, over = {}) => {
  const engine = standInEngine(id, over);
  return { id, describe: engine.describe, probe: engine.probe, run: { exitCode: over.exitCode ?? 0, timedOut: over.timedOut ?? false, stderr: over.stderr ?? '', stdout: over.text ?? resultsText(), durationMs: 5 } };
};
const compare = (nativeOver, pyodideOver, queries = QUERIES) => compareZ3Pair({ queries, native: outcome('native', nativeOver), pyodide: outcome('pyodide', pyodideOver) });
const checks = (r) => [...new Set(r.findings.map((f) => f.check))].sort();

test('the corpus holds the recipient wrap, one query per specimen S1 states a verdict for, and nothing twice', () => {
  const ids = QUERIES.map((q) => q.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.includes('bv64-recipient-wrap'), 'spine 11.2: "the recipient wrap included"');
  assert.ok(ids.includes('unknown-pow') && ids.includes('rlimit-cubes'));
  const { specimens } = readSpineSpecimens(REPO);
  const known = new Set(specimens.map((s) => s.id));
  for (const q of QUERIES) {
    assert.ok(q.specimen === '' || (SPECIMEN_ID.test(q.specimen) && known.has(q.specimen)), `${q.id} names ${q.specimen}, which the spine does not list`);
    assert.ok(['sat', 'unsat', 'unknown'].includes(q.expect.verdict));
    if (q.expect.verdict === 'sat') assert.equal(typeof q.witness, 'function', `${q.id} is sat and needs a property for its witness`);
    if (q.expect.verdict !== 'sat') assert.equal(q.witness, undefined, `${q.id} has no witness to check`);
  }
  for (const specimen of ['SP-1.1', 'SP-1.4', 'SP-1.5', 'SP-1.6', 'SP-1.7', 'SP-1.8']) assert.ok(QUERIES.some((q) => q.specimen === specimen), `${specimen} has a same-query pair`);
});

test('the program holds one def and one run_query per query, after the prelude', () => {
  const text = programFor();
  assert.ok(text.startsWith(PRELUDE));
  assert.equal((text.match(/^def build_\d+\(\):$/gm) ?? []).length, QUERIES.length);
  assert.equal((text.match(/^run_query\("/gm) ?? []).length, QUERIES.length);
  assert.match(text, /s\.set\('rlimit', 5000000\)/);
});

test('RESULT lines are read by query id; an unreadable or doubled line is a problem, never a silent gap', () => {
  const { results, problems } = parseResults('noise\nRESULT {"id":"a","verdict":"sat"}\nRESULT {"id":"a","verdict":"unsat"}\nRESULT {oops\nRESULT {"verdict":"sat"}\n');
  assert.equal(results.size, 1);
  assert.equal(problems.length, 3);
});

test('two engines that give the faithful answers agree on every query, and the witnesses are valid', () => {
  const r = compare();
  assert.deepEqual(r.findings, []);
  assert.equal(r.compared, QUERIES.length);
  assert.equal(r.equal, QUERIES.length);
  assert.equal(r.witnessesEqual, QUERIES.filter((q) => q.expect.verdict === 'sat').length, 'the stand-ins print equal witnesses; equal values are counted, never required');
});

test('every faithful stand-in witness satisfies its property, so a failing property is a real fault', () => {
  for (const q of QUERIES.filter((q) => q.witness)) assert.equal(q.witness(FAITHFUL[q.id].model), null, q.id);
});

test('a verdict that differs between the engines is a finding', () => {
  const r = compare({}, { text: resultsText((id, x) => (id === 'bv64-recipient-wrap' ? { verdict: 'unsat' } : x)) });
  assert.ok(checks(r).includes('verdict'));
  assert.equal(r.equal, QUERIES.length - 1);
});

test('witnesses are never compared by value: two different valid witnesses agree', () => {
  const r = compare({}, { text: resultsText((id, x) => (id === 'bv64-recipient-wrap' ? { verdict: 'sat', model: { A: '9223372036854775807', B: '9223372036854775807', X: '1' } } : x)) });
  assert.deepEqual(r.findings, []);
  assert.equal(r.witnessesEqual, QUERIES.filter((q) => q.expect.verdict === 'sat').length - 1);
});

test('a witness that breaks the property is a finding, whichever engine produced it', () => {
  const bad = resultsText((id, x) => (id === 'bv64-unsigned-guard-signed-check' ? { verdict: 'sat', model: { A: '10', X: '5' } } : x));
  assert.deepEqual(checks(compare({ text: bad }, {})), ['witness']);
  assert.deepEqual(checks(compare({}, { text: bad })), ['witness']);
  const outsideRange = resultsText((id, x) => (id === 'optimize-min' ? { verdict: 'sat', model: { a: '0', b: '0', amount: '2' } } : x));
  assert.ok(checks(compare({ text: outsideRange }, {})).includes('witness'), 'the optimum is 1, not any satisfying amount');
});

test('the reason of an unknown must be the same, and must be the authored one', () => {
  const r = compare({}, { text: resultsText((id, x) => (id === 'unknown-pow' ? { verdict: 'unknown', reason: 'unknown' } : x)) });
  assert.deepEqual(checks(r), ['expectation', 'reason']);
});

test('an authored answer that both engines miss is a finding of its own', () => {
  const both = { text: resultsText((id, x) => (id === 'starter-guarded' ? { verdict: 'sat', model: {} } : x)) };
  assert.deepEqual(checks(compare(both, both)), ['expectation']);
});

test('a missing answer, a raised exception, a failed program, a late program and a moved pin are each a finding', () => {
  assert.deepEqual(checks(compare({ text: resultsText((id, x) => (id === 'vacuous-premises' ? null : x)) }, {})), ['missing']);
  assert.deepEqual(checks(compare({}, { text: resultsText((id, x) => (id === 'optimize-min' ? { error: 'Z3Exception: boom' } : x)) })), ['error']);
  assert.ok(checks(compare({ exitCode: 1, stderr: 'Traceback\nValueError' }, {})).includes('engine'));
  assert.ok(checks(compare({}, { timedOut: true })).includes('engine'));
  assert.deepEqual(checks(compare({ z3: '5.4.0' }, {})), ['pin']);
});
