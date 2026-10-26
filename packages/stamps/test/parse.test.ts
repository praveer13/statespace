// The verdict-line parsers on the formats the runs registry holds: TLC's report and configuration, a solver's
// verdict with its model or reason, Lean's and lake comparator's messages, and the trace module's record.

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ParseError, deriveStamp, isErrorLine, parseLeanReport, parseSolverLines, parseTlcConstants, parseTlcReport, parseTraceRecord, rawFromLean, rawFromReply, rawFromSolver, rawFromTlc, rawFromTraces, stampText, type Derivation, type RawOutput } from '../src/index.ts'

const tlc = { name: 'TLC', version: '1.8.0' }
const lean = { name: 'Lean', version: '4.35.0' }
const z3 = { name: 'Z3', version: '5.3.1' }

/** A derivation in one string: the stamp's text, the "modulo" reading, or `none:<reason>`. */
const read = (raw: RawOutput): string => {
  const d: Derivation = deriveStamp(raw, { lane: 'reported', source: 'test' })
  return d.kind === 'stamp' ? stampText(d.stamp) : d.kind === 'modulo' ? d.text : `none:${d.reason}`
}

test('TLC configuration constants, in order and verbatim, comments and keywords aside', () => {
  assert.deepEqual(parseTlcConstants('CONSTANTS Init = 100  Amount = 80  Workers = {w1, w2}\nINIT Init_\nNEXT Next\nINVARIANT NoOverspend\n'), [
    ['Init', '100'],
    ['Amount', '80'],
    ['Workers', '{w1, w2}'],
  ])
  assert.deepEqual(parseTlcConstants('\\* a comment\nCONSTANT\n  N = 3\n  Procs <- ProcSet\nSPECIFICATION Spec\n'), [
    ['N', '3'],
    ['Procs', 'ProcSet'],
  ])
  assert.deepEqual(parseTlcConstants('INIT Init\nNEXT Next\n'), [])
})

test("TLC's report: no error and complete, a deadlock stop, a violation with its trace", () => {
  const complete = parseTlcReport(['Model checking completed. No error has been found.', '5 states generated, 4 distinct states found, 0 states left on queue.', 'The depth of the complete state graph search is 3.'])
  assert.deepEqual([complete.result, complete.complete, complete.distinctStates, complete.depth], ['no-error', true, 4, 3])
  const deadlock = parseTlcReport(['Error: Deadlock reached.', '11 states generated, 10 distinct states found, 3 states left on queue.'])
  assert.deepEqual([deadlock.result, deadlock.complete, deadlock.distinctStates, deadlock.leftOnQueue], ['deadlock', false, 10, 3])
  const violated = parseTlcReport(['Error: Invariant NoOverspend is violated.', 'State 1: <Initial predicate>', 'State 2: <Read(w1)>', 'State 3: <Write(w1)>'])
  assert.deepEqual([violated.result, violated.property, violated.traceStates], ['violated', 'NoOverspend', 3])
  const liveness = parseTlcReport(['Error: Temporal property EventuallyResolves was violated.', 'State 1: <Initial predicate>', 'State 2: <Try>'])
  assert.equal(liveness.property, 'EventuallyResolves')
  assert.equal(parseTlcReport(['29,745 states generated, 12,345 distinct states found, 0 states left on queue.']).distinctStates, 12345)
})

test('a TLC report becomes the raw output of its row, and refuses to guess what it does not say', () => {
  const ctx = { engine: tlc, constants: [['N', '2']] as const }
  assert.equal(rawFromTlc(parseTlcReport(['Model checking completed. No error has been found.', '5 states generated, 4 distinct states found, 0 states left on queue.']), ctx).kind, 'tlc-complete')
  assert.equal(rawFromTlc(parseTlcReport(['Error: Deadlock reached.', '11 states generated, 10 distinct states found, 3 states left on queue.']), ctx).kind, 'tlc-deadlock')
  const v = rawFromTlc(parseTlcReport(['Error: Invariant I is violated.', 'State 1: <Initial predicate>', 'State 2: <A>']), ctx)
  assert.deepEqual(v.kind === 'tlc-violation' && v.witness, { length: 1, unit: 'actions', states: 2 })
  assert.throws(() => rawFromTlc(parseTlcReport(['Error: Invariant I is violated.']), ctx), ParseError)
  assert.throws(() => rawFromTlc(parseTlcReport(['TLC2 Version 2026.10.20.183001']), ctx), ParseError)
  assert.equal(rawFromTlc(parseTlcReport(['5 states generated, 4 distinct states found, 1 states left on queue.']), { ...ctx, bound: 'depth 4' }).kind, 'model-check-bounded')
})

test("TLC: an Error: line outside its verdict vocabulary is no verdict, even with a bound stated", () => {
  const ctx = { engine: tlc, constants: [['N', '2']] as const, bound: 'depth 4' }
  // the lines of RUN-tlc-tracemodule's cut-line and paper-ioenv configurations
  assert.throws(() => rawFromTlc(parseTlcReport(['Error: TLC threw an unexpected exception.', 'Error: The behavior up to this point is:', '5 states generated, 4 distinct states found, 1 states left on queue.']), ctx), ParseError)
  assert.throws(() => rawFromTlc(parseTlcReport(['Error: Parsing or semantic analysis failed.']), ctx), ParseError)
  // its verdict vocabulary stays a verdict: the deadlock stop and its trace header
  assert.equal(rawFromTlc(parseTlcReport(['Error: Deadlock reached.', 'Error: The behavior up to this point is:', '11 states generated, 10 distinct states found, 3 states left on queue.']), ctx).kind, 'tlc-deadlock')
})

test('solver lines: the verdict, the model after sat (over several lines), the reason after unknown', () => {
  assert.deepEqual(parseSolverLines(['[1.2 starter: overdraft search] sat (0.00s) [b = 0, amount = 1, a = 0]']), { verdict: 'sat', model: '[b = 0, amount = 1, a = 0]' })
  assert.deepEqual(parseSolverLines(['[1.5 BitVec64 signed: guarded DESTINATION wrap] sat (0.00s) [A = 9223372036854775806,', ' B = 9223372036850581504,', ' X = 4194304]']), {
    verdict: 'sat',
    model: '[A = 9223372036854775806, B = 9223372036850581504, X = 4194304]',
  })
  assert.deepEqual(parseSolverLines(['[1.3 guard added] unsat (0.00s) ']), { verdict: 'unsat' })
  assert.deepEqual(parseSolverLines(['[Int x**y == 8, y>1] unknown (0.00s) smt tactic failed to show goal to be sat/unsat (incomplete (theory arithmetic)) ']), { verdict: 'unknown', reason: 'incomplete (theory arithmetic)' })
  assert.deepEqual(parseSolverLines(['2806ms py: rlimit-case unknown canceled 1.1 s']), { verdict: 'unknown', reason: 'canceled' })
  assert.deepEqual(parseSolverLines(['unknown', '(:reason-unknown "canceled")']), { verdict: 'unknown', reason: 'canceled' })
  assert.deepEqual(parseSolverLines(["cvc5 b'1.4.2-modified' -> unsat"]), { verdict: 'unsat' })
  assert.deepEqual(parseSolverLines(['recipient-wrap sat [M = 9223372036854775803, B = 9223336852482686975]']), { verdict: 'sat', model: '[M = 9223372036854775803, B = 9223336852482686975]' })
  assert.deepEqual(parseSolverLines(['[issue input 1 (truth: sat, y=2)] -> unknown']), { verdict: 'unknown' })
  assert.deepEqual(parseSolverLines(['z3 5.3.1 rlimit=5000000', '[corrected_guard] unsat']), { verdict: 'unsat' })
  assert.deepEqual(parseSolverLines(['[minimize_hold] sat minimum h = 1 [h = 1, held_p = 1]']), { verdict: 'sat', model: '[h = 1, held_p = 1]' })
  // the cvc5 cross-check configurations of the S1 runs (RUN-z3-boot-variant's cvc5-bench)
  assert.deepEqual(parseSolverLines(['cvc5 1.4.2 [git 282d5e0 on branch HEAD]', 'corrected_guard: unsat']), { verdict: 'unsat' })
  assert.throws(() => parseSolverLines(['Z3Exception: unsat core is not available']), ParseError)
  assert.throws(() => parseSolverLines(['error: sat solver failed']), ParseError)
  assert.throws(() => parseSolverLines(['no verdict here']), ParseError)
})

test('solver lines: a verdict stands only where a verdict stands, and an SMT-LIB error means no verdict', () => {
  // a verdict word inside a harness label is not the verdict
  assert.deepEqual(parseSolverLines(['[check sat of guard] unsat (0.00s)']), { verdict: 'unsat' })
  assert.deepEqual(parseSolverLines(['[lower-bound (sat: y=2)] unknown unknown']).verdict, 'unknown')
  // an error line anywhere: no verdict, whatever follows it
  assert.throws(() => parseSolverLines(['(error "line 2 column 11: unknown constant y")', 'unsat']), ParseError)
  assert.throws(() => parseSolverLines(['(error "line 2 column 11: invalid command")', 'sat']), ParseError)
  assert.throws(() => parseSolverLines(['sat', '(error "line 4 column 10: model is not available")']), ParseError)
  // RUN-z3-verdict-lines: (simplify sat) prints sat before a question that fails, so by default an error after the
  // answer is no verdict too; under the Bench CLI's grammar (receipts), which refuses such scripts, the answer stands
  assert.throws(() => parseSolverLines(['sat', '(error "line 3 column 21: unknown constant nonexistent")']), ParseError)
  assert.deepEqual(parseSolverLines(['unsat', '(error "line 5 column 10: model is not available")'], { errorAfterVerdict: 'keep' }), { verdict: 'unsat' })
  assert.throws(() => parseSolverLines(['(error "line 2 column 11: unknown constant q")', 'sat'], { errorAfterVerdict: 'keep' }), ParseError)
  assert.throws(() => parseSolverLines(['(error "line 3 column 0: invalid assert command, \')\' expected")'], { errorAfterVerdict: 'keep' }), ParseError)
  assert.throws(() => parseSolverLines(['statespace: z3 printed no verdict line (exit code 1)']), ParseError)
  assert.deepEqual(parseSolverLines(['unknown', '(:reason-unknown "said ""no""")']), { verdict: 'unknown', reason: 'said "no"' })
  // a sentence, two verdicts on one line, or two queries' lines: no verdict
  assert.throws(() => parseSolverLines(['the query is not sat']), ParseError)
  assert.throws(() => parseSolverLines(['datalog canread(1,3) sat canread(1,4) unsat']), ParseError)
  assert.throws(() => parseSolverLines(['[a] sat [x = 1]', '[b] unsat']), ParseError)
})

test('an error line is the engine saying error, not a line that mentions one', () => {
  for (const l of ['error: build failed', "error: Axiom 'x._native.native_decide.ax_1_1' is not permitted; it is used by 'x'", 'BitsBad.lean:2:67: error: The prover found a counterexample', '(error "line 2 column 11: unknown constant y")', 'error'])
    assert.ok(isErrorLine(l), l)
  for (const l of ['== weak comparator(no-sandbox) rc=1 :: error: Challenge and solution theorem statement do not match', 'errors: 0', 'warning: declaration uses `sorry`', 'Error: Deadlock reached.', 'no error here'])
    assert.ok(!isErrorLine(l), l)
})

test("a solver verdict is read in its query's direction, and not at all without one", () => {
  const unsat = parseSolverLines(['unsat'])
  assert.equal(rawFromSolver(unsat, { solver: z3, direction: 'violation' }).kind, 'smt-unsat')
  assert.equal(rawFromSolver(unsat, { solver: z3, direction: 'premise' }).kind, 'smt-premise')
  assert.equal(rawFromSolver(unsat, { solver: z3 }).kind, 'smt-direction-unknown')
  const sat = rawFromSolver(parseSolverLines(['sat [x = 1]']), { solver: z3, direction: 'violation' })
  assert.equal(sat.kind === 'smt-sat' && sat.replay, 'pending')
})

test('Lean: precedence from a sandbox failure down to an accepted solution', () => {
  const raw = (lines: string[], extra: { exitCode?: number; paranoid?: boolean } = {}) => rawFromLean(parseLeanReport(lines), { lean, ...extra })
  assert.equal(raw(['bwrap: No permissions to create new namespace', 'Your solution is okay!']).kind, 'lean-tool-error')
  assert.equal(raw(['bwrap: /usr/bin/bwrap', 'Your solution is okay!']).kind, 'lean-accepted', 'a path after "bwrap:" is where the binary is, not a failure')
  assert.equal(raw(['Lean default kernel accepts the solution'], { exitCode: 143 }).kind, 'lean-tool-error')
  assert.equal(raw(["error: Challenge and solution theorem statement do not match: 'transfer_conserves'"]).kind, 'lean-mismatch')
  assert.equal(raw(["error: Const does not match between challenge and target 'transfer'"]).kind, 'lean-mismatch')
  assert.equal(raw(["'oops' does not depend on any axioms", 'leanchecker found a problem in Probe.Bypass']).kind, 'lean-rejected')
  const sorry = raw(['warning: X.lean:4:8: declaration uses `sorry`', "info: X.lean:9:0: 'with_sorry' depends on axioms: [sorryAx]", "info: X.lean:7:0: 'n' depends on axioms: [n._native.native_decide.ax_1_1]"])
  assert.deepEqual(sorry.kind === 'lean-sorry' && [sorry.lemmas, sorry.count], [['with_sorry'], 1])
  assert.equal(raw(["'with_axiom' depends on axioms: [cheat]", "'n' depends on axioms: [n._native.native_decide.ax_1_1]"]).kind, 'lean-custom-axiom')
  assert.equal(raw(["'n' depends on axioms: [n._native.native_decide.ax_1_1]", 'Lean default kernel accepts the solution']).kind, 'lean-native')
  const ok = raw(["'transfer_conserves' depends on axioms: [propext, Quot.sound]", 'Your solution is okay!'])
  assert.deepEqual(ok.kind === 'lean-accepted' && ok.axioms, ['propext', 'Quot.sound'])
  const paranoid = raw(['Lean paranoid kernel accepts the solution', 'lean4lean kernel accepts the solution', 'Lean default kernel accepts the solution', 'Uses axioms: Classical.choice, propext, Quot.sound'], { paranoid: true })
  assert.deepEqual(paranoid.kind === 'lean-accepted' && [paranoid.checkers, paranoid.axioms], [3, ['Classical.choice', 'propext', 'Quot.sound']])
  assert.throws(() => raw(['Building and exporting']), ParseError)
})

test('Lean: an acceptance needs exit 0, an accept line and no error line (spine section 9.6)', () => {
  const raw = (lines: string[], extra: { exitCode?: number } = {}) => rawFromLean(parseLeanReport(lines), { lean, ...extra })
  const notPermitted = "error: Axiom 'big_native._native.native_decide.ax_1_1' is not permitted; it is used by 'big_native'"
  const axiomsLine = "info: Ledger/Bad.lean:7:0: 'big_native' depends on axioms: [big_native._native.native_decide.ax_1_1]"
  // RUN-lean-axioms' check-bad configuration: lake check rejects the native axiom while it logs that the kernel accepts
  assert.equal(read(raw([notPermitted, 'Lean default kernel accepts the solution'])), 'none:checker-rejected')
  assert.equal(read(raw([axiomsLine, notPermitted, 'Lean default kernel accepts the solution'])), 'none:checker-rejected')
  // any other error beside an accept line: no verdict, so no stamp
  const other = raw(["error: Ledger/Basic.lean:12:2: unknown identifier 'foo'", 'Lean default kernel accepts the solution'])
  assert.equal(other.kind, 'lean-no-verdict')
  assert.equal(read(other), 'none:no-verdict')
  // an accept line with a non-zero exit: no verdict, from the receipt's exit code or from a harness's rc
  assert.equal(read(raw(['Lean default kernel accepts the solution'], { exitCode: 1 })), 'none:no-verdict')
  assert.equal(read(raw(['Your solution is okay!'], { exitCode: 1 })), 'none:no-verdict')
  assert.equal(read(raw(['== good comparator(no-sandbox) rc=1 :: Your solution is okay! '])), 'none:no-verdict')
  assert.equal(read(raw([axiomsLine, 'Lean default kernel accepts the solution'], { exitCode: 1 })), 'none:no-verdict')
  // the same lines with exit 0 are an acceptance, the native axiom read as kernel + compiler
  assert.equal(read(raw([axiomsLine, 'Lean default kernel accepts the solution'], { exitCode: 0 })), 'PROVED [P] · Lean 4.35.0 kernel + compiler · axioms listed')
  assert.equal(read(raw(['== good comparator(no-sandbox) rc=0 :: Your solution is okay! '])), 'PROVED [P] · Lean 4.35.0 kernel · axioms listed')
  // a native axiom with no accept line at all is no verdict, never [P]
  assert.throws(() => raw([axiomsLine]), ParseError)
  assert.throws(() => raw(['lake exit=0', "'by_native' depends on axioms: [by_native._native.native_decide.ax_1_1]"]), ParseError)
  // a rejection with its non-zero exit is still a rejection, and a mismatch still voids to [?]
  assert.equal(read(raw(['leanchecker found a problem in Probe.Bypass'], { exitCode: 1 })), 'none:checker-rejected')
  assert.equal(read(raw(["== weak comparator(no-sandbox) rc=1 :: error: Challenge and solution theorem statement do not match: 'transfer_conserves' "])), 'UNKNOWN [?] · statement mismatch')
  // RUN-lean-bv-decide's bits-bad configuration: a failed build is no verdict
  assert.equal(read(raw(['BitsBad.lean:2:67: error: The prover found a counterexample, consider the following assignment:', 'a = 0#64', 'amt = 9223372036854775808#64'], { exitCode: 1 })), 'none:no-verdict')
})

test("the trace module's record", () => {
  assert.deepEqual(parseTraceRecord('<<"trace-validation", [diameter |-> 11, verdict |-> "rejected", lines |-> 11, matched |-> 7, first_unmatched |-> 8, end_record |-> TRUE, paper_accepted |-> FALSE]>>'), {
    verdict: 'rejected',
    lines: 11,
    matched: 7,
    firstUnmatched: 8,
    endRecord: true,
  })
  assert.throws(() => parseTraceRecord('<<"registers", ("s:reach" :> <<3>>)>>'), ParseError)
})

test("a trace record's verdict must be the one its own counts give (RUN-tlc-tracemodule's three verdicts read; a record that contradicts itself is no verdict)", () => {
  const record = (verdict: string, lines: number, matched: number, first: number, end: boolean): string => `<<"trace-validation", [diameter |-> 15, verdict |-> "${verdict}", lines |-> ${lines}, matched |-> ${matched}, first_unmatched |-> ${first}, end_record |-> ${end ? 'TRUE' : 'FALSE'}, paper_accepted |-> FALSE]>>`
  // the accepted, rejected and partial configurations of RUN-tlc-tracemodule
  assert.equal(parseTraceRecord(record('accepted', 11, 11, 0, true)).verdict, 'accepted')
  assert.equal(parseTraceRecord(record('rejected', 11, 7, 8, true)).verdict, 'rejected')
  assert.equal(parseTraceRecord(record('partial', 8, 8, 0, false)).verdict, 'partial')
  // "accepted" over counts that say 3 of 11 lines matched and no end record; "accepted" without the end record;
  // "partial" with one; "rejected" where every line matched; a first unmatched line past the log's end
  for (const bad of [record('accepted', 11, 3, 4, false), record('accepted', 8, 8, 0, false), record('partial', 11, 11, 0, true), record('rejected', 11, 11, 0, true), record('rejected', 11, 11, 12, true)]) assert.throws(() => parseTraceRecord(bad), ParseError, bad)
  // a record that does not say whether the log ended with its end record, or has no count
  assert.throws(() => parseTraceRecord('<<"trace-validation", [verdict |-> "accepted", lines |-> 11, matched |-> 11, first_unmatched |-> 0]>>'), ParseError)
  assert.throws(() => parseTraceRecord('<<"trace-validation", [verdict |-> "accepted", lines |-> 11, first_unmatched |-> 0, end_record |-> TRUE]>>'), ParseError)
})

test('trace validation counts each trace once: a trace listed twice, by name or by its bytes, is no verdict', () => {
  const tlc = { name: 'TLC', version: '1.8.0' }
  const accepted = parseTraceRecord('<<"trace-validation", [verdict |-> "accepted", lines |-> 11, matched |-> 11, first_unmatched |-> 0, end_record |-> TRUE]>>')
  const rejected = parseTraceRecord('<<"trace-validation", [verdict |-> "rejected", lines |-> 11, matched |-> 7, first_unmatched |-> 8, end_record |-> TRUE]>>')
  const raw = rawFromTraces([{ trace: 'a', record: accepted }, { trace: 'b', record: accepted, seed: 2 }, { trace: 'm', record: rejected }], { engine: tlc, property: 'safety' })
  assert.deepEqual(read(raw), 'TESTED [T] · 2 seeds · TLC 1.8.0 trace validation')
  assert.throws(() => rawFromTraces([{ trace: 'a', record: accepted }, { trace: 'a', record: accepted }], { engine: tlc, property: 'safety' }), ParseError)
  assert.throws(() => rawFromTraces([{ trace: 'a', record: accepted, sha256: 'x' }, { trace: 'b', record: accepted, sha256: 'x' }], { engine: tlc, property: 'safety' }), ParseError)
})

test('a deadlock that violates deadlock freedom needs its trace, whichever entry reads it', () => {
  const tlc = { name: 'TLC', version: '1.8.0' }
  const lines = ['Error: Deadlock reached.', '11 states generated, 10 distinct states found, 3 states left on queue.']
  assert.throws(() => rawFromTlc(parseTlcReport(lines), { engine: tlc, constants: [], deadlockFreedom: true }), ParseError)
  assert.equal(read(rawFromTlc(parseTlcReport([...lines, 'State 1: <Initial predicate>', 'State 2: <Withdraw>']), { engine: tlc, constants: [], deadlockFreedom: true })), 'REFUTED [R] · 1 action (2 states)')
  const reply = { verdict: { kind: 'stopped', by: 'deadlock', distinct: 10 }, stats: {}, provenance: { engine: 'tlc', version: '1.8.0', budget: {} } }
  assert.equal(typeof rawFromReply(reply, { deadlockFreedom: true }), 'string')
  assert.equal(read(rawFromReply(reply, { deadlockFreedom: true, witness: { length: 3, unit: 'actions', states: 4 } }) as RawOutput), 'REFUTED [R] · 3 actions (4 states)')
})

test("a theorem whose axioms are printed twice keeps every axiom either line names, in any order", () => {
  for (const lines of [["'t' depends on axioms: [propext]", "'t' depends on axioms: [propext, cheat]"], ["'t' depends on axioms: [propext, cheat]", "'t' depends on axioms: [propext]"]]) {
    assert.deepEqual([...(parseLeanReport(lines).axioms.get('t') ?? [])].sort(), ['cheat', 'propext'])
  }
  assert.deepEqual([...(parseLeanReport(['Uses axioms: cheat', 'Uses axioms: propext']).axioms.get('') ?? [])].sort(), ['cheat', 'propext'])
})
