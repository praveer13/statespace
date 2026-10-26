// The resolver refuses a record whose pointers do not say what the label needs. Each test plants one fault in a small
// set of runs and a record, and requires the resolver to name it; the controls show the same record passing.

import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveEvidence, runFacts, runsOf } from '../model/evidence.ts'

const Z3 = { engine: 'z3', version: '5.3.1', started_at: '2026-10-26T02:12:27.403Z', recorded_at: '2026-10-26T02:20:00.000Z', budget: { rlimit: 5000000 } }

/** Runs shaped like W1's: a replay line under each sat, an Optimize query, a plain query under it, and an unsat core. */
const RUNS = {
  'RUN-a': {
    id: 'RUN-a',
    ...Z3,
    verdict_lines: [
      'z3 5.3.1 rlimit=5000000',
      '[witness] sat [amount = 1, b = 1, a = 0]',
      '  replay ok: a=0 b=1 amount=1: a >= 0 ok',
      '[bare] sat [x = 1]',
      '[fixed] unsat',
      '[minimize] sat minimum amount = 1 [amount = 1, b = 1, a = 0]',
      '  replay ok: a=0 b=1 amount=1: a >= 0 ok',
      '[no_smaller] unsat',
      '[premises] unsat',
      '[violation] unsat',
      '[core] unsat unsat_core=[\'p\', \'q\']',
      '  core check: the core alone is unsat; dropping any one member leaves it sat',
      '[core_unchecked] unsat unsat_core=[\'p\']',
      '[maybe] unknown (0.00s) smt tactic failed (incomplete quantifiers)',
      '[note] the harness says something that is no verdict',
      '[chain] sat [x = 0, x_p = 1, x_pp = 2, y_p = 1]',
      '  replay ok: x=0: x_pp > x ok',
      '[chain3] sat [x = 0, x_p = 1, x_pp = 2, x_ppp = 3]',
      '  replay ok: x=0: x_ppp > x ok',
    ],
    values: { queries: { core: { core_constraints: ['p > 0', 'q <= 0'] }, minimize: { objective: 'amount' } } },
  },
  'RUN-replay': {
    id: 'RUN-replay',
    engine: 'python',
    version: '3.13.12',
    started_at: '2026-10-26T03:00:00.000Z',
    verdict_lines: ['[bare_replay] replay ok: x=1: x > 0 ok', '[wrong_replay] replay ok: x=2: x > 0 ok', '[failed_replay] replay FAILED: x=1: x > 5 FAILED', '[not_a_replay] x=1'],
  },
  'RUN-optimize-w0': { id: 'RUN-optimize-w0', ...Z3, verdict_lines: ['[S1.2 minimal amount via Optimize] sat [amount = 1, b = 0, a = 0]', '[plain] sat [amount = 1]', '[minimal size via Optimize] sat [amount = 1, b = 0, a = 0]'] },
  // a run that records the objective of its Optimize query beside lines that print only the model
  'RUN-optimize-recorded': { id: 'RUN-optimize-recorded', ...Z3, verdict_lines: ['[smallest via Optimize] sat [amount = 1, b = 0, a = 0]'], values: { queries: { 'smallest via Optimize': { objective: 'amount' } } } },
}
const source = { get: (id) => RUNS[id] }

const record = (patch = {}) => {
  const base = {
    schema: 'statespace/specimen@1',
    id: 'SP-9.9',
    title: 'A test specimen',
    kcs: ['KC-1.violation-as-sat'],
    found_in: { lesson: 'S1.L1' },
    violates: 'The property.',
    because: 'The cause.',
    class: 'a class',
    cured_by: { text: 'The fix.' },
    evidence: { main: { run: 'RUN-a', query: 'witness', direction: 'violation' }, minimal: { kind: 'none' } },
  }
  const out = structuredClone(base)
  for (const [path, value] of Object.entries(patch)) {
    const keys = path.split('.')
    let at = out
    for (const k of keys.slice(0, -1)) at = at[k]
    if (value === undefined) delete at[keys.at(-1)]
    else at[keys.at(-1)] = value
  }
  return out
}
const problemsOf = (patch) => resolveEvidence(record(patch), source).problems

test('a record whose pointers hold resolves, and its evidence is the lines of the runs, verbatim', () => {
  const r = resolveEvidence(record(), source)
  assert.deepEqual(r.problems, [])
  assert.deepEqual(r.evidence.main.lines, ['[witness] sat [amount = 1, b = 1, a = 0]', '  replay ok: a=0 b=1 amount=1: a >= 0 ok'])
  assert.equal('steps' in r.evidence.main, false, 'the evidence holds the lines and the label reads the witness length from them')
  assert.deepEqual(r.evidence.runs['RUN-a'], { id: 'RUN-a', engine: 'z3', version: '5.3.1', date: '2026-10-26', rlimit: 5000000 })
  assert.deepEqual(runsOf(record()), ['RUN-a'])
})

test('a run chip gives the run its engine, version, the day it ran (else the day it was recorded) and its rlimit', () => {
  assert.equal(runFacts({ id: 'RUN-x', engine: 'z3', version: '5.3.1', started_at: null, recorded_at: '2026-10-24T14:32:22.348Z' }).date, '2026-10-24')
  assert.equal(runFacts({ id: 'RUN-x', engine: 'z3', version: '5.3.1', started_at: '2026-10-20', recorded_at: '2026-10-24T14:32:22.348Z' }).date, '2026-10-20')
  assert.equal(runFacts({ id: 'RUN-x', engine: 'z3', version: '5.3.1' }).date, null)
  assert.equal(runFacts({ id: 'RUN-x', engine: 'z3', version: '5.3.1', budget: {} }).rlimit, null)
  assert.equal(runFacts({ id: 'RUN-x', engine: 'z3', version: '5.3.1', budget: { rlimit: 0 } }).rlimit, null)
})

test('a run that is not recorded, and a query that its run does not hold, are refused', () => {
  assert.match(problemsOf({ 'evidence.main.run': 'RUN-missing' })[0], /RUN-missing is not recorded/)
  assert.match(problemsOf({ 'evidence.main.query': 'nope' })[0], /no verdict line of the run begins with the query "nope"/)
  assert.equal(resolveEvidence(record({ 'evidence.main.query': 'nope' }), source).evidence, null)
  const twice = { get: (id) => (id === 'RUN-a' ? { ...RUNS['RUN-a'], verdict_lines: ['[witness] sat [x = 1]', '[witness] sat [x = 2]'] } : undefined) }
  assert.match(resolveEvidence(record(), twice).problems[0], /2 verdict lines/)
  // a run that records no engine or no version cannot name its tool
  const nameless = { get: () => ({ id: 'RUN-a', verdict_lines: ['[witness] sat [x = 1]', '  replay ok: x=1: ok'] }) }
  assert.match(resolveEvidence(record(), nameless).problems[0], /records no engine or no version/)
})

test('a sat of a violation query must replay: its own lines say so, or the run it names replays this very witness', () => {
  // no replay anywhere
  assert.match(problemsOf({ 'evidence.main.query': 'bare' })[0], /no "replay ok" line/)
  // a replay in another run: the same values pass, other values and a failed replay do not
  const x1 = { 'evidence.main.query': 'bare', 'evidence.main.replay': { run: 'RUN-replay', query: 'bare_replay' } }
  assert.deepEqual(problemsOf(x1), [])
  assert.match(problemsOf({ ...x1, 'evidence.main.replay': { run: 'RUN-replay', query: 'wrong_replay' } })[0], /checks x = 2, and the witness has x = 1/)
  assert.match(problemsOf({ ...x1, 'evidence.main.replay': { run: 'RUN-replay', query: 'failed_replay' } }).join(' '), /does not say "replay ok"/)
  assert.match(problemsOf({ ...x1, 'evidence.main.replay': { run: 'RUN-replay', query: 'not_a_replay' } })[0], /does not say "replay ok"/)
  // a replay line that leaves a variable of the witness unchecked is not a replay of it
  const wide = { ...x1, 'evidence.main.query': 'witness', 'evidence.main.replay': { run: 'RUN-replay', query: 'bare_replay' } }
  assert.match(problemsOf(wide).join(' '), /checks amount = \(nothing\)|has amount = 1/)
  // a failed replay in the query's own lines is a fault even beside an ok
  const failing = { get: () => ({ id: 'RUN-a', ...Z3, verdict_lines: ['[witness] sat [x = 1]', '  replay FAILED: x=1: x > 5 FAILED'] }) }
  assert.match(resolveEvidence(record(), failing).problems.join(' '), /does not replay/)
})

test('an unsat, an unknown and a premise query need no replay, and a replay or a length beside them is refused', () => {
  assert.deepEqual(problemsOf({ 'evidence.main.query': 'fixed' }), [])
  assert.deepEqual(problemsOf({ 'evidence.main.query': 'maybe' }), [])
  assert.deepEqual(problemsOf({ 'evidence.main.query': 'premises', 'evidence.main.direction': 'premise' }), [])
  assert.match(problemsOf({ 'evidence.main.query': 'fixed', 'evidence.main.replay': { run: 'RUN-replay', query: 'bare_replay' } })[0], /not a sat of a violation query/)
  assert.match(problemsOf({ 'evidence.main.query': 'fixed', 'evidence.main.steps': 2 })[0], /length is the length of a witness, and the query's verdict is unsat/)
  assert.match(problemsOf({ 'evidence.main.query': 'maybe', 'evidence.main.steps': 1 })[0], /length is the length of a witness, and the query's verdict is unknown/)
})

test('a witness\'s length is read from the witness: a length the record states is held to it, and a witness of several steps states its length', () => {
  const chain = (steps, query = 'chain') => ({ 'evidence.main.query': query, ...(steps === undefined ? {} : { 'evidence.main.steps': steps }) })
  // the controls: the length the witness has, stated or (for one transfer) left out
  assert.deepEqual(problemsOf(chain(2)), [])
  assert.deepEqual(problemsOf(chain(3, 'chain3')), [])
  assert.deepEqual(problemsOf({ 'evidence.main.steps': 1 }), [], 'one transfer, stated')
  assert.deepEqual(problemsOf({}), [], 'one transfer, left out')
  // a length the witness does not have: too long, too short, and any length over a witness of one transfer
  assert.match(problemsOf(chain(5))[0], /evidence\.main\.steps: the record states a witness of 5 steps, and the witness of RUN-a "chain" has 2 steps \(the longest run of primes/)
  assert.match(problemsOf(chain(1))[0], /states a witness of 1 step, and the witness of RUN-a "chain" has 2 steps/)
  assert.match(problemsOf(chain(2, 'chain3'))[0], /states a witness of 2 steps, and the witness of RUN-a "chain3" has 3 steps/)
  assert.match(problemsOf({ 'evidence.main.steps': 2 })[0], /states a witness of 2 steps, and the witness of RUN-a "witness" has 1 step /)
  // a witness of several steps over a record that states none: the label would otherwise say "1 step"
  assert.match(problemsOf(chain(undefined))[0], /evidence\.main\.steps: the witness of RUN-a "chain" has 2 steps .* and the record states no length: state steps: 2/)
  assert.match(problemsOf(chain(undefined, 'chain3'))[0], /has 3 steps .* state steps: 3/)
  // every one of them leaves the record out of the cabinet: a label is never built from a length the run does not have
  for (const patch of [chain(5), chain(undefined), { 'evidence.main.steps': 2 }]) assert.equal(resolveEvidence(record(patch), source).evidence, null)
  // a length is of the witness of a violation query: a premise query has none
  assert.match(problemsOf({ 'evidence.main.direction': 'premise', 'evidence.main.steps': 1 })[0], /a premise query/)
})

test('a main query whose lines carry no verdict is refused, and a record is never left out of the cabinet without a word', () => {
  const r = resolveEvidence(record({ 'evidence.main.query': 'note' }), source)
  assert.match(r.problems[0], /evidence\.main: RUN-a "note" carries no solver verdict/)
  assert.equal(r.evidence, null)
  assert.equal(r.problems.length, 1)
})

test('a premise query sits beside an unsat violation query, and carries a verdict', () => {
  const base = { 'evidence.main.query': 'violation', 'evidence.main.premise': { run: 'RUN-a', query: 'premises' } }
  assert.deepEqual(problemsOf(base), [])
  assert.equal(resolveEvidence(record(base), source).evidence.main.premise.query, 'premises')
  assert.match(problemsOf({ 'evidence.main.premise': { run: 'RUN-a', query: 'premises' } })[0], /sits beside the unsat of a violation query/)
  assert.match(problemsOf({ ...base, 'evidence.main.premise': { run: 'RUN-a', query: 'maybe' } })[0], /carries no sat or unsat/)
  assert.match(problemsOf({ ...base, 'evidence.main.premise': { run: 'RUN-a', query: 'gone' } })[0], /no verdict line/)
})

test('a sat that the label shows beside the main one replays too', () => {
  const also = (query, extra = {}) => ({ 'evidence.also': [{ run: 'RUN-a', query, caption: 'A caption.', ...extra }] })
  assert.deepEqual(problemsOf(also('witness')), [])
  assert.deepEqual(problemsOf(also('fixed')), [])
  assert.match(problemsOf(also('bare'))[0], /evidence\.also\[0\].*no "replay ok" line/)
  assert.deepEqual(problemsOf(also('bare', { replay: { run: 'RUN-replay', query: 'bare_replay' } })), [])
  assert.match(problemsOf(also('fixed', { replay: { run: 'RUN-replay', query: 'bare_replay' } }))[0], /not a sat/)
  assert.match(problemsOf(also('absent'))[0], /no verdict line/)
})

test('a minimal claim rests on an Optimize query with a value, a plain query under it that is unsat, or a core that was checked', () => {
  const min = (m) => ({ 'evidence.minimal': m })
  const optimize = { kind: 'optimize', run: 'RUN-a', query: 'minimize', objective: 'amount' }
  assert.deepEqual(problemsOf(min(optimize)), [])
  assert.deepEqual(problemsOf(min({ ...optimize, confirm: 'no_smaller' })), [])
  assert.match(problemsOf(min({ ...optimize, confirm: 'fixed_not_there' }))[0], /no verdict line/)
  assert.match(problemsOf(min({ ...optimize, confirm: 'witness' }))[0], /is not unsat/)
  // a plain sat is no Optimize: Z3's witness is minimal only under an explicit objective
  assert.match(problemsOf(min({ ...optimize, query: 'bare' }))[0], /does not say it ran under an Optimize objective/)
  assert.match(problemsOf(min({ ...optimize, query: 'fixed' }))[0], /is not a sat/)
  // the objective the lines print is the one that was minimized: a record that names another would show a value that was not minimized
  assert.match(problemsOf(min({ ...optimize, objective: 'size' }))[0], /prints the minimum of amount, and the record names the objective size/)
  assert.match(problemsOf(min({ ...optimize, objective: 'b' }))[0], /prints the minimum of amount, and the record names the objective b: the label would show a value that was not minimized/)
  assert.equal(resolveEvidence(record(min({ ...optimize, objective: 'b' })), source).evidence, null, 'the model holds a value for b (1), which a label must never call the minimum')
  // the W0 harness has no "minimum": the label says Optimize, and the model has the value
  assert.deepEqual(problemsOf(min({ kind: 'optimize', run: 'RUN-optimize-w0', query: 'S1.2 minimal amount via Optimize', objective: 'amount' })), [])
  // ... and then the name of the query is all that says what it minimized: it must mention the objective, whole, or the model's value of any variable would pass
  const w0 = { kind: 'optimize', run: 'RUN-optimize-w0', query: 'S1.2 minimal amount via Optimize', objective: 'amount' }
  for (const wrong of ['a', 'b', 'size']) assert.match(problemsOf(min({ ...w0, objective: wrong }))[0], new RegExp(`prints no minimum, the run records no objective for it and the query's name does not mention ${wrong}`), wrong)
  assert.equal(resolveEvidence(record(min({ ...w0, objective: 'a' })), source).evidence, null, 'the model holds a = 0, which a label must never call the minimum')
  assert.match(problemsOf(min({ ...w0, query: 'minimal size via Optimize', objective: 'size' }))[0], /holds no value for the objective size/)
  // where the lines print only the model, the objective the run records for the query is the one
  const recorded = { kind: 'optimize', run: 'RUN-optimize-recorded', query: 'smallest via Optimize', objective: 'amount' }
  assert.deepEqual(problemsOf(min(recorded)), [])
  assert.match(problemsOf(min({ ...recorded, objective: 'b' }))[0], /RUN-optimize-recorded records the objective amount for "smallest via Optimize", and the record names b/)
  assert.match(problemsOf(min({ kind: 'optimize', run: 'RUN-optimize-w0', query: 'plain', objective: 'amount' }))[0], /does not say it ran under an Optimize/)
  const core = { kind: 'core', run: 'RUN-a', query: 'core' }
  assert.deepEqual(problemsOf(min(core)), [])
  assert.deepEqual(resolveEvidence(record(min(core)), source).evidence.minimal.constraints, ['p > 0', 'q <= 0'])
  assert.match(problemsOf(min({ ...core, query: 'core_unchecked' }))[0], /does not say that its core alone is unsat/)
  assert.match(problemsOf(min({ ...core, query: 'fixed' }))[0], /prints no unsat core/)
  assert.match(problemsOf(min({ ...core, query: 'bare' }))[0], /is not an unsat/)
  assert.deepEqual(problemsOf(min({ kind: 'not-applicable', why: 'a verdict' })), [])
  assert.deepEqual(problemsOf(min({ kind: 'none' })), [])
  // an optimize or core claim with no run or query behind it
  assert.match(problemsOf(min({ kind: 'core' }))[0], /names the run and the query it rests on/)
})

test('a run chip in the words of the record is a citation: its run is recorded, and a value reference or another token is refused', () => {
  const r = resolveEvidence(record({ because: 'It is unsat {{run:RUN-optimize-w0}}.' }), source)
  assert.deepEqual(r.problems, [])
  assert.deepEqual(Object.keys(r.evidence.runs).sort(), ['RUN-a', 'RUN-optimize-w0'])
  assert.match(problemsOf({ because: 'It is unsat {{run:RUN-nowhere}}.' })[0], /RUN-nowhere is not recorded/)
  assert.match(problemsOf({ because: 'It is {{run:RUN-a#values.queries.core}}.' })[0], /value reference/)
  assert.match(problemsOf({ violates: 'It is {{fact:tool.z3}}.' })[0], /double-brace token other than/)
  assert.match(problemsOf({ 'cured_by.text': 'See {{run:RUN-gone}}.' })[0], /cured_by\.text: RUN-gone is not recorded/)
  // a double brace that is not a whole chip is refused too, so a token that is misspelled never reaches a screen as text
  assert.match(problemsOf({ because: 'Braces {{ like this }} are refused.' })[0], /double-brace token other than/)
  assert.match(problemsOf({ because: 'A chip {{run:RUN-a}' })[0], /double-brace token other than/)
})
