// From a validated receipt@1 to stamps: solver runs read in their declared direction, cvc5 cross-checks and premise
// queries paired, Lean classified, TLC and trace validation, the I7 void, and the lanes. Every receipt section is
// the CLI's normalization of its runs and is never trusted alone (ARCHITECTURE.md section 10.3): a section the
// verdict lines do not back, or one they contradict, earns no stamp. The lines below are copied from executed runs
// (RUN-tlc-atomic, RUN-tlc-doublespend, RUN-tlc-tracemodule, RUN-lean-comparator, RUN-lean-axioms) or written in
// the Bench CLI's grammar (bench/statespace/lanes/z3.py).

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validate, type Receipt, type ReceiptRun } from '@statespace/schema'
import { deriveReceipt, directionOf, stampText, type ReceiptStamps } from '../src/index.ts'

const H = (c: string): string => c.repeat(64)

function receipt(runs: ReceiptRun[], extra: Partial<Receipt> = {}): Receipt {
  const r: Receipt = {
    schema: 'statespace/receipt@1',
    lab: 'LAB-1',
    stage: 'LAB-1.3',
    lane: 'reported',
    createdAt: '2026-11-02T10:00:00Z',
    cli: { name: 'statespace', version: '0.1.0' },
    environment: { devcontainer: null, os: { name: 'Linux', arch: 'x86_64' }, sandbox: 'off' },
    tools: [{ name: 'z3', version: '5.3.1', sha256: H('a'), pinned: true }],
    statements: [{ path: 'claims/cl-1-1.smt2', kind: 'smt2', sha256: H('b') }],
    runs,
    checks: [{ id: 'LAB-1.c3', pass: true }],
    provenance: { assisted: 'none', agent: false, guard: 'on' },
    ...extra,
  }
  const v = validate('receipt', r)
  assert.ok(v.ok, `the test receipt must be a valid receipt@1: ${JSON.stringify(v)}`)
  return r
}

const run = (engine: string, version: string, step: string | undefined, verdict: ReceiptRun['verdict'], verdictLines: string[], input = H('c'), budget: ReceiptRun['budget'] = { rlimit: 5000000 }): ReceiptRun => ({
  ...(step !== undefined ? { step } : {}),
  engine,
  version,
  argv: [engine, 'claims/cl-1-1.smt2'],
  inputSha256: input,
  budget,
  exitCode: 0,
  verdictLines,
  verdict,
})

const texts = (s: ReceiptStamps): string[] =>
  s.items.map((i) => (i.derivation.kind === 'stamp' ? stampText(i.derivation.stamp) : i.derivation.kind === 'modulo' ? i.derivation.text : `none:${i.derivation.reason}`))

test('step names the direction: violation or premise, optionally with a pairing name', () => {
  assert.deepEqual(directionOf('violation'), { direction: 'violation', name: '' })
  assert.deepEqual(directionOf('premise-guard'), { direction: 'premise', name: 'guard' })
  assert.deepEqual(directionOf('check'), { name: '' })
  assert.deepEqual(directionOf(undefined), { name: '' })
  // the Bench CLI's LAB-90 receipt names its premise query "premises"
  assert.deepEqual(directionOf('premises'), { direction: 'premise', name: '' })
  assert.deepEqual(directionOf('premises-guard'), { direction: 'premise', name: 'guard' })
  assert.deepEqual(directionOf('starter'), { name: '' })
})

test("the Bench CLI's own LAB-90.2 receipt: the violation's [P] is paired with its premise query", () => {
  const r = receipt([run('z3', '5.3.1', 'violation', 'unsat', ['unsat']), run('z3', '5.3.1', 'premises', 'sat', ['sat', '[amount = 1]'], H('d'))])
  const s = deriveReceipt(r, { source: 'r' })
  assert.deepEqual(texts(s), ['PROVED [P] · Z3 5.3.1 unsat · uncertified · rlimit 5e6', 'none:premise-witness'])
  assert.ok(s.items[0]?.raw.kind === 'smt-unsat' && s.items[0].raw.premise === 'sat')
  // and a vacuous premise query under that name still voids the reading
  const vacuous = deriveReceipt(receipt([run('z3', '5.3.1', 'violation', 'unsat', ['unsat']), run('z3', '5.3.1', 'premises', 'unsat', ['unsat'], H('d'))]), { source: 'r' })
  const d = vacuous.items[0]?.derivation
  assert.ok(d?.kind === 'stamp' && d.stamp.defeaters.some((x) => /vacuously/.test(x.text)))
})

test('LAB-1-shaped receipt: violation unsat with its premise witness and a cvc5 cross-check on the same input', () => {
  const r = receipt([
    run('z3', '5.3.1', 'violation-guard', 'unsat', ['unsat']),
    run('z3', '5.3.1', 'premise-guard', 'sat', ['sat', '[a = 1, b = 0, amount = 1]'], H('d')),
    run('cvc5', '1.4.2', 'violation-guard', 'unsat', ['unsat'], H('c'), {}),
  ])
  const s = deriveReceipt(r, { source: 'receipts/LAB-1.3/r.json' })
  assert.equal(s.lane, 'reported')
  assert.deepEqual(texts(s), ['PROVED [P] · Z3 5.3.1 and cvc5 1.4.2 agree · uncertified · rlimit 5e6', 'none:premise-witness'])
  assert.deepEqual(s.problems, [])
  const first = s.items[0]
  assert.ok(first && first.derivation.kind === 'stamp')
  assert.equal(first.derivation.stamp.source, 'receipts/LAB-1.3/r.json · runs[0] violation-guard')
})

test('a vacuous premise and an absent premise query are kept apart', () => {
  const vac = deriveReceipt(receipt([run('z3', '5.3.1', 'violation', 'unsat', ['unsat']), run('z3', '5.3.1', 'premise', 'unsat', ['unsat'], H('d'))]), { source: 'r' })
  const p = vac.items[0]
  assert.ok(p && p.derivation.kind === 'stamp' && p.derivation.stamp.defeaters.some((d) => /vacuously/.test(d.text)))
  const alone = deriveReceipt(receipt([run('z3', '5.3.1', 'violation', 'unsat', ['unsat'])]), { source: 'r' })
  assert.ok(alone.items[0]?.raw.kind === 'smt-unsat' && alone.items[0].raw.premise === 'not-run')
})

test('sat waits for its replay; unknown keeps the reason its lines carry and fails closed on a gate; no direction, no reading', () => {
  const r = receipt(
    [
      run('z3', '5.3.1', 'violation', 'sat', ['sat', '[b = 0, amount = 1, a = 0]']),
      run('z3', '5.3.1', 'violation-pow', 'unknown', ['unknown', '(:reason-unknown "canceled")'], H('e')),
      run('z3', '5.3.1', undefined, 'sat', ['sat'], H('f')),
    ],
    { z3: { smtlibSha256: H('e'), entry: 'cli', rlimit: 5000000, verdict: 'unknown', reason_unknown: 'canceled' } },
  )
  assert.deepEqual(texts(deriveReceipt(r, { source: 'r' })), ['none:replay-pending', 'UNKNOWN [?] · canceled at rlimit 5e6', 'none:direction-unknown'])
  const replayed = deriveReceipt(r, {
    source: 'r',
    replay: (_run, i) => (i === 0 ? { replay: 'replayed', witness: { length: 1, unit: 'steps' } } : undefined),
    guardsEnforcement: (_run, i) => i === 1,
  })
  assert.deepEqual(texts(replayed).slice(0, 2), ['REFUTED [R] · 1 step', 'UNKNOWN [?] · canceled at rlimit 5e6'])
  assert.equal(replayed.items[1]?.derivation.kind === 'stamp' && replayed.items[1].derivation.enforcement, 'fail-closed')
})

test("the z3 section is the CLI's summary of one run: its reason never stands in for the lines', and it must agree with them", () => {
  // the section says canceled about a query no run read; the run's lines carry no reason: the stamp says what the lines say
  const silent = deriveReceipt(receipt([run('z3', '5.3.1', 'violation', 'unknown', ['unknown'], H('e'))], { z3: { smtlibSha256: H('9'), entry: 'cli', rlimit: 5000000, verdict: 'unknown', reason_unknown: 'canceled' } }), { source: 'r' })
  assert.deepEqual(texts(silent), ['UNKNOWN [?] · no reason given'])
  assert.deepEqual(silent.problems, ['z3: the section names a query that no Z3 run in the receipt read; it backs no stamp'])
  // the section disagrees with the run it summarises: no stamp
  const differs = deriveReceipt(receipt([run('z3', '5.3.1', 'violation', 'unknown', ['unknown', '(:reason-unknown "incomplete (theory arithmetic)")'], H('e'))], { z3: { smtlibSha256: H('e'), entry: 'cli', rlimit: 5000000, verdict: 'unknown', reason_unknown: 'canceled' } }), { source: 'r' })
  assert.deepEqual(differs.items, [])
  assert.match(differs.problems.join(), /the z3 section says unknown \(canceled\) but the run's verdict lines say unknown \(incomplete \(theory arithmetic\)\)/)
  const verdict = deriveReceipt(receipt([run('z3', '5.3.1', 'violation', 'unsat', ['unsat'])], { z3: { smtlibSha256: H('c'), entry: 'cli', rlimit: 5000000, verdict: 'sat' } }), { source: 'r' })
  assert.deepEqual(verdict.items, [])
  assert.match(verdict.problems.join(), /the z3 section says sat but the run's verdict lines say unsat/)
})

test('I7: a statement whose recomputed hash differs voids to [?]; re-checked here only when the tab re-ran it', () => {
  const r = receipt([run('z3', '5.3.1', 'violation', 'unsat', ['unsat'])])
  const s = deriveReceipt(r, { source: 'r', currentHashes: new Map([['claims/cl-1-1.smt2', H('9')]]), recheckedHere: true })
  assert.equal(s.lane, 'rechecked-here')
  assert.deepEqual(texts(s)[0], 'UNKNOWN [?] · statement hash changed')
  const same = deriveReceipt(r, { source: 'r', currentHashes: new Map([['claims/cl-1-1.smt2', H('b')]]) })
  assert.ok(!texts(same).includes('UNKNOWN [?] · statement hash changed'))
})

test('I7: a run that read the changed statement derives no stamp beside the [?]', () => {
  // the run read the statement itself (its input hash is the statement's recorded hash): its [P] is voided
  const r = receipt([run('z3', '5.3.1', 'violation', 'unsat', ['unsat'], H('b')), run('z3', '5.3.1', 'violation-other', 'unsat', ['unsat'], H('c'))])
  const s = deriveReceipt(r, { source: 'r', currentHashes: new Map([['claims/cl-1-1.smt2', H('9')]]) })
  assert.deepEqual(texts(s), ['UNKNOWN [?] · statement hash changed', 'PROVED [P] · Z3 5.3.1 unsat · uncertified · rlimit 5e6'])
  assert.deepEqual(s.problems, ['runs[0] violation: the statement it read has changed since the run, so its claim is voided to [?] (I7); no stamp'])
  // a tlc section whose spec is the changed statement
  const tlc = receipt([tlcRun('no-error', COMPLETE)], { ...lab5, statements: [{ path: 'specs/Transfer.tla', kind: 'tla', sha256: H('1') }], ...tlcSection('no-error', 4, true) })
  const t = deriveReceipt(tlc, { source: 'r', currentHashes: new Map([['specs/Transfer.tla', H('9')]]) })
  assert.deepEqual(texts(t), ['UNKNOWN [?] · statement hash changed'])
  assert.match(t.problems.join(), /tlc: the spec it checked has changed since the run/)
})

test('two Z3 runs on one violation query that answer unsat and sat contradict each other: no stamp for either side, in either order', () => {
  const cli = run('z3', '5.3.1', 'violation', 'unsat', ['unsat'])
  const api = { ...run('z3', '5.3.1', 'violation-api', 'sat', ['sat', '[a = 0]']), argv: ['python', '-P', '-m', 'statespace.lanes.z3', 'claims/cl-1-1.smt2'] }
  for (const runs of [[cli, api], [api, cli]]) {
    // even a replayed witness earns no [R] beside an unsat on the same input: one side, or the encoding, is wrong
    const s = deriveReceipt(receipt(runs), { source: 'r', replay: () => ({ replay: 'replayed', witness: { length: 1, unit: 'steps' } }) })
    assert.deepEqual(texts(s), ['none:shadow-mismatch', 'none:shadow-mismatch'])
    for (const item of s.items) assert.ok(item.derivation.kind === 'none' && item.derivation.defeater?.against === 'both-sides')
  }
})

// ------------------------------------------------------------------ Lean

type CheckerRow = { name: string; version: string; verdict: 'accepts' | 'rejects' | 'not-run' }
const lakeRun = (step: string, verdict: ReceiptRun['verdict'], lines: string[], { exitCode = 0, paranoid = false } = {}): ReceiptRun => ({
  step,
  engine: 'lake',
  version: '4.35.0',
  argv: step === 'axioms' ? ['lake', 'env', 'lean', 'Axioms.lean'] : ['lake', 'env', 'comparator', ...(paranoid ? ['--paranoid'] : []), 'comparator.json'],
  inputSha256: H('c'),
  budget: {},
  exitCode,
  verdictLines: lines,
  verdict,
})
const leanSection = (theorems: { name: string; axioms: string[] }[], { sorryCount = 0, checkers = [] as CheckerRow[], nativeAxioms = [] as string[] } = {}) => ({
  lean: { toolchain: 'leanprover/lean4:v4.35.0', checkers, theorems, nativeAxioms, sorryCount },
})
/** RUN-lean-comparator's paranoid configuration, verbatim. */
const PARANOID_LINES = [
  'Running Lean paranoid kernel on solution',
  'Lean paranoid kernel accepts the solution',
  'Running lean4lean kernel on solution',
  'lean4lean kernel accepts the solution',
  'Running nanoda kernel on solution',
  'nanoda kernel accepts the solution',
  'Running con-leche kernel on solution',
  'con-leche: accepted 1274 declarations (--verified)',
  'con-leche kernel accepts the solution',
  'Running con-ron kernel on solution',
  'con-ron: accepted 1274 declarations (--verified)',
  'con-ron kernel accepts the solution',
  'Running Lean default kernel on solution',
  'Lean default kernel accepts the solution',
]
const SIX: CheckerRow[] = ['Lean paranoid', 'lean4lean', 'nanoda', 'con-leche', 'con-ron', 'Lean default'].map((name) => ({ name, version: '4.35.0', verdict: 'accepts' }))
/** RUN-lean-axioms, verbatim. */
const CONSERVES = "info: Ledger/Basic.lean:27:0: 'transfer_conserves' depends on axioms: [propext, Quot.sound]"
const conserves = [{ name: 'transfer_conserves', axioms: ['propext', 'Quot.sound'] }]

test('Lean receipts: paranoid acceptance, sorry, a custom axiom, a mismatch, a sandbox failure', () => {
  const ok = receipt([lakeRun('axioms', 'passed', [CONSERVES]), lakeRun('comparator', 'accepted', PARANOID_LINES, { paranoid: true })], leanSection(conserves, { checkers: SIX }))
  const okStamps = deriveReceipt(ok, { source: 'r' })
  assert.deepEqual(texts(okStamps), ['PROVED [P] · Lean 4.35.0 kernel · axioms listed · 6 checkers'])
  assert.deepEqual(okStamps.problems, [])
  const plain = receipt([lakeRun('axioms', 'passed', [CONSERVES]), lakeRun('comparator', 'accepted', ['Your solution is okay!'])], leanSection(conserves))
  assert.deepEqual(texts(deriveReceipt(plain, { source: 'r' })), ['PROVED [P] · Lean 4.35.0 kernel · axioms listed'])
  const sorry = receipt(
    [lakeRun('axioms', 'passed', ['warning: Ledger/Bad.lean:4:8: declaration uses `sorry`', "info: Ledger/Bad.lean:9:0: 'helper' depends on axioms: [sorryAx]"]), lakeRun('comparator', 'accepted', ['Your solution is okay!'])],
    leanSection([{ name: 'helper', axioms: ['sorryAx'] }], { sorryCount: 1 }),
  )
  assert.deepEqual(texts(deriveReceipt(sorry, { source: 'r' })), ['PROVED modulo 1 assumed lemma'])
  const custom = receipt([lakeRun('axioms', 'passed', ["'t' depends on axioms: [cheat, propext]"]), lakeRun('comparator', 'accepted', ['Your solution is okay!'])], leanSection([{ name: 't', axioms: ['cheat', 'propext'] }]))
  assert.deepEqual(texts(deriveReceipt(custom, { source: 'r' })), ['PROVED modulo 1 assumed axiom'])
  const mismatch = receipt([lakeRun('comparator', 'rejected', ["error: Challenge and solution theorem statement do not match: 'transfer_conserves'"], { exitCode: 1 })], leanSection([]))
  assert.deepEqual(texts(deriveReceipt(mismatch, { source: 'r' })), ['UNKNOWN [?] · statement mismatch'])
  const sandbox = receipt([lakeRun('comparator', 'error', ['bwrap: No permissions to create new namespace'], { exitCode: 1 })], leanSection([]))
  assert.deepEqual(texts(deriveReceipt(sandbox, { source: 'r' })), ['none:tool-error'])
  // a bwrap line counts whatever the run's verdict says: the sandbox failed, so no verdict was reached
  const sandboxAccepted = receipt([lakeRun('comparator', 'accepted', ['bwrap: No permissions to create new namespace', 'Your solution is okay!'])], leanSection(conserves))
  assert.deepEqual(texts(deriveReceipt(sandboxAccepted, { source: 'r' })), ['none:tool-error'])
  // a run that ended in error with no bwrap line and no kill is no verdict, never read as a killed checker
  const failed = receipt([lakeRun('comparator', 'error', ["error: Ledger/Basic.lean:12:2: unknown identifier 'foo'"], { exitCode: 1 })], leanSection([]))
  const f = deriveReceipt(failed, { source: 'r' })
  assert.deepEqual(texts(f), ['none:no-verdict'])
  assert.match(f.items[0]?.derivation.kind === 'none' ? f.items[0].derivation.text : '', /unknown identifier 'foo'/)
  // a rejection needs a line of the closed list (spine section 9.6): a run marked rejected without one is no verdict
  const bareReject = receipt([lakeRun('comparator', 'rejected', ['Build failed.'], { exitCode: 1 })], leanSection(conserves))
  assert.deepEqual(texts(deriveReceipt(bareReject, { source: 'r' })), ['none:no-verdict'])
  const closedList = receipt([lakeRun('check', 'rejected', ["error: Axiom 'big_native._native.native_decide.ax_1_1' is not permitted; it is used by 'big_native'", 'Lean default kernel accepts the solution'], { exitCode: 1 })], leanSection([]))
  assert.deepEqual(texts(deriveReceipt(closedList, { source: 'r' })), ['none:checker-rejected'])
})

test("Lean receipts: [P] comes only from a Lean run's own accept line, exit 0 and no error line, never from the section's checker rows", () => {
  const acceptsRow: CheckerRow[] = [{ name: 'Lean default', version: '4.35.0', verdict: 'accepts' }]
  // no run at all, and a run that only passed, each beside a checker row that accepts
  const noRuns = deriveReceipt(receipt([], leanSection(conserves, { checkers: acceptsRow })), { source: 'r' })
  assert.deepEqual(noRuns.items, [])
  assert.match(noRuns.problems.join(), /lean: .*no Lean run/)
  const passedOk = deriveReceipt(receipt([lakeRun('axioms', 'passed', [CONSERVES]), lakeRun('build', 'passed', ['ok'])], leanSection(conserves, { checkers: acceptsRow })), { source: 'r' })
  assert.deepEqual(passedOk.items, [])
  assert.match(passedOk.problems.join(), /no Lean run accepted the solution with exit 0, an accept line and no error line/)
  // a run marked accepted whose lines hold no accept line
  const noLine = deriveReceipt(receipt([lakeRun('axioms', 'passed', [CONSERVES]), lakeRun('comparator', 'accepted', ['Build completed successfully.'])], leanSection(conserves)), { source: 'r' })
  assert.deepEqual(noLine.items, [])
  assert.match(noLine.problems.join(), /no Lean run accepted the solution/)
  // an "accepted" run with a non-zero exit, or with an error line, is no verdict
  assert.deepEqual(texts(deriveReceipt(receipt([lakeRun('axioms', 'passed', [CONSERVES]), lakeRun('comparator', 'accepted', ['Your solution is okay!'], { exitCode: 1 })], leanSection(conserves)), { source: 'r' })), ['none:no-verdict'])
  assert.deepEqual(texts(deriveReceipt(receipt([lakeRun('axioms', 'passed', [CONSERVES]), lakeRun('comparator', 'accepted', ['error: build failed', 'Lean default kernel accepts the solution'])], leanSection(conserves)), { source: 'r' })), ['none:no-verdict'])
  // a checker row that rejects still refuses: refusing never overclaims
  assert.deepEqual(texts(deriveReceipt(receipt([lakeRun('axioms', 'passed', [CONSERVES]), lakeRun('comparator', 'accepted', ['Your solution is okay!'])], leanSection(conserves, { checkers: [{ name: 'Lean default', version: '4.35.0', verdict: 'rejects' }] })), { source: 'r' })), ['none:checker-rejected'])
  // "6 checkers" counts the checkers the --paranoid run's lines show; a section that says otherwise is refused
  const fiveShown = PARANOID_LINES.filter((l) => !l.startsWith('nanoda'))
  const disagree = deriveReceipt(receipt([lakeRun('axioms', 'passed', [CONSERVES]), lakeRun('comparator', 'accepted', fiveShown, { paranoid: true })], leanSection(conserves, { checkers: SIX })), { source: 'r' })
  assert.deepEqual(disagree.items, [])
  assert.match(disagree.problems.join(), /the lean section says 6 checkers accept but the --paranoid run's lines show 5/)
})

test("Lean receipts: the section's axioms must be the ones the runs' #print axioms lines print", () => {
  const accepted = lakeRun('comparator', 'accepted', ['Your solution is okay!'])
  // no axioms line backs the section
  const unbacked = deriveReceipt(receipt([accepted], leanSection(conserves)), { source: 'r' })
  assert.deepEqual(unbacked.items, [])
  assert.match(unbacked.problems.join(), /lists axioms for transfer_conserves, but no Lean run's verdict lines print them/)
  // the section lists standard axioms; the lines print a custom one
  const hidden = deriveReceipt(receipt([lakeRun('axioms', 'passed', ["'transfer_conserves' depends on axioms: [propext, cheat]"]), accepted], leanSection(conserves)), { source: 'r' })
  assert.deepEqual(hidden.items, [])
  assert.match(hidden.problems.join(), /transfer_conserves: the lean section lists \[propext, Quot.sound\] but the verdict lines print \[propext, cheat\]/)
  // the lines print a theorem the section leaves out
  const extra = deriveReceipt(receipt([lakeRun('axioms', 'passed', [CONSERVES, "'helper' depends on axioms: [sorryAx]"]), accepted], leanSection(conserves)), { source: 'r' })
  assert.match(extra.problems.join(), /print axioms for helper, which the lean section does not list/)
  // a native axiom the section's nativeAxioms leaves out, and a sorry warning the section's count leaves out
  const NATIVE = "info: Ledger/Bad.lean:7:0: 'big_native' depends on axioms: [big_native._native.native_decide.ax_1_1]"
  const bigNative = [{ name: 'big_native', axioms: ['big_native._native.native_decide.ax_1_1'] }]
  const unlisted = deriveReceipt(receipt([lakeRun('axioms', 'passed', [NATIVE]), accepted], leanSection(bigNative)), { source: 'r' })
  assert.match(unlisted.problems.join(), /native axioms \[\] are not the _native axioms the verdict lines print/)
  const quietSorry = deriveReceipt(receipt([lakeRun('axioms', 'passed', ['warning: Ledger/Bad.lean:4:8: declaration uses `sorry`', CONSERVES]), accepted], leanSection(conserves)), { source: 'r' })
  assert.match(quietSorry.problems.join(), /counts no sorry, but the verdict lines warn of 1/)
  // with everything backed, a native axiom is [P] · kernel + compiler, and only with an acceptance
  const native = { nativeAxioms: ['big_native._native.native_decide.ax_1_1'] }
  assert.deepEqual(texts(deriveReceipt(receipt([lakeRun('axioms', 'passed', [NATIVE]), accepted], leanSection(bigNative, native)), { source: 'r' })), ['PROVED [P] · Lean 4.35.0 kernel + compiler · axioms listed'])
  const passedOnly = deriveReceipt(receipt([lakeRun('axioms', 'passed', [NATIVE]), lakeRun('build', 'passed', ['Build completed successfully.'])], leanSection(bigNative, native)), { source: 'r' })
  assert.deepEqual(passedOnly.items, [])
  assert.match(passedOnly.problems.join(), /no Lean run accepted the solution/)
})

// ------------------------------------------------------------------ solvers

test('a cvc5 run that no Z3 run takes as its cross-check or premise query is named, never dropped', () => {
  const cvc5Only = deriveReceipt(receipt([run('cvc5', '1.4.2', 'violation', 'unsat', ['unsat'], H('c'), {})]), { source: 'r' })
  assert.deepEqual(cvc5Only.items, [])
  assert.deepEqual(cvc5Only.problems, ['runs[0] violation: a cvc5 run with no Z3 run on the same input; no stamp'])
  // a cvc5 unsat beside a Z3 sat on the same input contradicts it: neither side is stamped
  const besideSat = deriveReceipt(receipt([run('z3', '5.3.1', 'violation', 'sat', ['sat', '[b = 0, amount = 1, a = 0]']), run('cvc5', '1.4.2', 'violation', 'unsat', ['unsat'], H('c'), {})]), { source: 'r' })
  assert.deepEqual(texts(besideSat), ['none:shadow-mismatch'])
  assert.deepEqual(besideSat.problems, ['runs[1] violation: the solver runs on its input disagree, one sat and another unsat; no stamp for any of them'])
  // beside a Z3 sat that it agrees with, a cvc5 sat takes no part: only a Z3 unsat of a violation query takes a cross-check
  const agreeingSat = deriveReceipt(receipt([run('z3', '5.3.1', 'violation', 'sat', ['sat', '[b = 0, amount = 1, a = 0]']), run('cvc5', '1.4.2', 'violation', 'sat', ['sat'], H('c'), {})]), { source: 'r' })
  assert.deepEqual(texts(agreeingSat), ['none:replay-pending'])
  assert.deepEqual(agreeingSat.problems, ['runs[1] violation: a cvc5 sat beside a Z3 sat on the same input; only a Z3 unsat of a violation query takes a cross-check; no stamp'])
  // a cvc5 premise query with no Z3 violation query to pair with
  const premise = deriveReceipt(receipt([run('cvc5', '1.4.2', 'premise-guard', 'sat', ['sat'], H('d'), {})]), { source: 'r' })
  assert.deepEqual(premise.problems, ['runs[0] premise-guard: a cvc5 premise query that no Z3 violation query pairs with; no stamp'])
  // a cross-check that a Z3 unsat takes is not named again
  const taken = deriveReceipt(receipt([run('z3', '5.3.1', 'violation', 'unsat', ['unsat']), run('cvc5', '1.4.2', 'violation', 'unsat', ['unsat'], H('c'), {})]), { source: 'r' })
  assert.deepEqual(taken.problems, [])
})

test('a cross-check or premise query is read from its own lines: one that disagrees with its verdict leaves the query unread', () => {
  // cvc5's verdict says unsat, its lines say sat: "agree" would hide a contradiction
  const cross = deriveReceipt(receipt([run('z3', '5.3.1', 'violation', 'unsat', ['unsat']), run('cvc5', '1.4.2', 'violation', 'unsat', ['sat'], H('c'), {})]), { source: 'r' })
  assert.deepEqual(cross.items, [])
  assert.deepEqual(cross.problems, ['runs[1] violation: the run says unsat but its verdict lines say sat; no stamp', 'runs[0] violation: it shares its input with runs[1] violation, whose verdict and verdict lines disagree; no stamp'])
  // the premise query's verdict says sat, its lines say unsat: the claim would hold vacuously
  const premise = deriveReceipt(receipt([run('z3', '5.3.1', 'violation-g', 'unsat', ['unsat']), run('z3', '5.3.1', 'premise-g', 'sat', ['unsat'], H('d'))]), { source: 'r' })
  assert.deepEqual(premise.items, [])
  assert.match(premise.problems.join(), /runs\[0\] violation-g: it pairs with runs\[1\] premise-g, whose verdict and verdict lines disagree/)
  // a cvc5 cross-check that ended in error is no verdict: the Z3 [P] stands alone, and the error is named
  const errored = deriveReceipt(receipt([run('z3', '5.3.1', 'violation', 'unsat', ['unsat']), run('cvc5', '1.4.2', 'violation', 'error', ['(error "unexpected end of file")'], H('c'), {})]), { source: 'r' })
  assert.deepEqual(texts(errored), ['PROVED [P] · Z3 5.3.1 unsat · uncertified · rlimit 5e6'])
  assert.match(errored.problems.join(), /runs\[1\] violation: the solver run ended in error/)
})

test('a solver run whose verdict lines carry no verdict, or another one, earns no stamp and says why', () => {
  const error = deriveReceipt(receipt([run('z3', '5.3.1', 'violation', 'unsat', ['(error "line 2 column 11: unknown constant y")', 'unsat'])]), { source: 'r' })
  assert.deepEqual(error.items, [])
  assert.match(error.problems.join(), /runs\[0\] violation: its verdict lines carry no verdict \(the solver reported an error/)
  const disagree = deriveReceipt(receipt([run('z3', '5.3.1', 'violation', 'unsat', ['sat', '[a = 0]'])]), { source: 'r' })
  assert.deepEqual(disagree.items, [])
  assert.deepEqual(disagree.problems, ['runs[0] violation: the run says unsat but its verdict lines say sat; no stamp'])
  // the Bench CLI's grammar: a model asked for after unsat errors, and the answer stands (RUN-z3-verdict-lines)
  const modelAfterUnsat = deriveReceipt(receipt([run('z3', '5.3.1', 'violation', 'unsat', ['unsat', '(error "line 5 column 10: model is not available")'])]), { source: 'r' })
  assert.deepEqual(texts(modelAfterUnsat), ['PROVED [P] · Z3 5.3.1 unsat · uncertified · rlimit 5e6'])
})

// ------------------------------------------------------------------ TLC and trace validation

const TLC_ARGV = ['java', '-jar', 'tla2tools.jar', '-workers', '1', '-config', 'DoubleSpend.cfg', 'DoubleSpend.tla']
/** A TLC run reads the spec the tlc section names: its input hash is the section's specSha256 (H('1') below). */
const tlcRun = (verdict: ReceiptRun['verdict'], verdictLines: string[], argv = TLC_ARGV, version = '1.8.0', input = H('1')): ReceiptRun => ({ engine: 'tlc', version, argv, inputSha256: input, budget: { workers: 1 }, exitCode: 0, verdictLines, verdict })
const tlcSection = (result: 'no-error' | 'violated' | 'deadlock' | 'stopped', distinctStates: number, complete: boolean, flags = ['-workers', '1']) => ({
  tlc: { specSha256: H('1'), configSha256: H('2'), constants: { Init: '100', Amount: '80' }, flags, distinctStates, depth: 4, result, complete },
})
const lab5 = { lab: 'LAB-5', stage: 'LAB-5.2', checks: [{ id: 'LAB-5.c2', pass: true }] }
/** RUN-tlc-atomic (w2-deadlock-off) and RUN-tlc-doublespend (1.8.0-default, and 1.8.0-deadlock with its trace), verbatim. */
const COMPLETE = ['Model checking completed. No error has been found.', '5 states generated, 4 distinct states found, 0 states left on queue.', 'The depth of the complete state graph search is 3.']
const DEADLOCK = ['Error: Deadlock reached.', 'Error: The behavior up to this point is:', '11 states generated, 10 distinct states found, 3 states left on queue.', 'The depth of the complete state graph search is 4.']
const VIOLATED = ['Error: Invariant NoOverspend is violated.', 'Error: The behavior up to this point is:', 'State 1: <Initial predicate>', 'State 2: <Withdraw line 12, col 3 to line 14, col 20 of module DoubleSpend>', '12 states generated, 11 distinct states found, 2 states left on queue.']

test('TLC: a complete exploration needs lines that show TLC completing with nothing left on the queue, and the same count', () => {
  const done = deriveReceipt(receipt([tlcRun('no-error', COMPLETE)], { ...lab5, ...tlcSection('no-error', 4, true) }), { source: 'r' })
  assert.deepEqual(texts(done), ['MODEL-CHECKED [M] · Init = 100, Amount = 80 · complete · 4 distinct states'])
  assert.deepEqual(done.problems, [])
  const dl = deriveReceipt(receipt([tlcRun('deadlock', DEADLOCK)], { ...lab5, ...tlcSection('deadlock', 10, false) }), { source: 'r' })
  assert.deepEqual(texts(dl), ['UNKNOWN [?] · stopped at deadlock, 10 distinct states'])
  const v = deriveReceipt(receipt([tlcRun('violated', VIOLATED)], { ...lab5, ...tlcSection('violated', 11, false) }), { source: 'r' })
  assert.deepEqual(texts(v), ['REFUTED [R] · 1 action (2 states)'])
  // a run whose lines state neither completeness nor a count earns no [M]
  const bare = deriveReceipt(receipt([tlcRun('no-error', ['Model checking completed. No error has been found.'])], { ...lab5, ...tlcSection('no-error', 4, true) }), { source: 'r' })
  assert.deepEqual(bare.items, [])
  assert.match(bare.problems.join(), /tlc: the section says complete, but the verdict lines do not show TLC completing/)
})

test('TLC: a section its run contradicts earns no stamp (a violation summarised as no error, states left on the queue, no run, another count)', () => {
  // (a) the run and its lines say violated; the section says no-error, complete
  const a = deriveReceipt(receipt([tlcRun('violated', VIOLATED)], { ...lab5, ...tlcSection('no-error', 3, true) }), { source: 'r' })
  assert.deepEqual(a.items, [])
  assert.match(a.problems.join(), /tlc: the section says no-error, runs\[0\] says violated and its verdict lines say violated/)
  // (b) the lines end with states left on the queue
  const b = deriveReceipt(receipt([tlcRun('no-error', ['Model checking completed. No error has been found.', '5 states generated, 4 distinct states found, 2 states left on queue.'])], { ...lab5, ...tlcSection('no-error', 4, true) }), { source: 'r' })
  assert.deepEqual(b.items, [])
  assert.match(b.problems.join(), /the section says complete, but the verdict lines do not show/)
  // (c) no TLC run at all
  const c = deriveReceipt(receipt([run('z3', '5.3.1', 'violation', 'unsat', ['unsat'])], { ...lab5, ...tlcSection('no-error', 4, true) }), { source: 'r' })
  assert.ok(!texts(c).some((t) => /MODEL-CHECKED/.test(t)))
  assert.match(c.problems.join(), /tlc: no TLC model-check run in the receipt backs the section/)
  // (d) the section says 4 distinct states; the lines say 40
  const d = deriveReceipt(receipt([tlcRun('no-error', ['Model checking completed. No error has been found.', '50 states generated, 40 distinct states found, 0 states left on queue.'])], { ...lab5, ...tlcSection('no-error', 4, true) }), { source: 'r' })
  assert.deepEqual(d.items, [])
  assert.match(d.problems.join(), /the section says 4 distinct states but the verdict lines say 40/)
})

test("TLC: the run the section reports carries its flags; a run's verdict that disagrees with its lines is refused; an error that is not a verdict is no verdict", () => {
  const flags = deriveReceipt(receipt([tlcRun('no-error', COMPLETE)], { ...lab5, ...tlcSection('no-error', 4, true, ['-workers', '1', '-deadlock']) }), { source: 'r' })
  assert.deepEqual(flags.items, [])
  assert.match(flags.problems.join(), /no TLC run's command line carries the section's flags \(-workers 1 -deadlock\)/)
  assert.match(flags.problems.join(), /runs\[0\]: a TLC run the tlc section does not report/)
  const verdict = deriveReceipt(receipt([tlcRun('violated', COMPLETE)], { ...lab5, ...tlcSection('no-error', 4, true) }), { source: 'r' })
  assert.deepEqual(verdict.items, [])
  const crash = deriveReceipt(receipt([tlcRun('stopped', ['Error: TLC threw an unexpected exception.'], [...TLC_ARGV, '-depth', '20'])], { ...lab5, ...tlcSection('stopped', 4, false, ['-workers', '1', '-depth', '20']) }), { source: 'r' })
  assert.deepEqual(crash.items, [])
  assert.match(crash.problems.join(), /TLC reported an error that is not a verdict/)
  // a stopped run with a stated bound is [M] · bound · partial, printing only a count its lines print
  const stopped = deriveReceipt(receipt([tlcRun('stopped', ['Progress(12) at 2026-11-02 10:00:00: 4,000 states generated (4,000 s/min), 900 distinct states found, 77 states left on queue.'], [...TLC_ARGV, '-depth', '20'])], { ...lab5, ...tlcSection('stopped', 900, false, ['-workers', '1', '-depth', '20']) }), { source: 'r' })
  assert.deepEqual(texts(stopped), ['MODEL-CHECKED [M] · depth 20 · Init = 100, Amount = 80 · partial'])
  // a TLC run with no tlc section is named, not dropped
  const orphan = deriveReceipt(receipt([tlcRun('no-error', COMPLETE)], lab5), { source: 'r' })
  assert.deepEqual(orphan.problems, ['runs[0]: a TLC run with no tlc section to give its constants; no stamp'])
})

/** RUN-tlc-tracemodule's accepted and rejected configurations, verbatim. */
const ACCEPTED_RECORD = '<<"trace-validation", [diameter |-> 15, verdict |-> "accepted", lines |-> 11, matched |-> 11, first_unmatched |-> 0, end_record |-> TRUE, paper_accepted |-> FALSE]>>'
const REJECTED_RECORD = '<<"trace-validation", [diameter |-> 11, verdict |-> "rejected", lines |-> 11, matched |-> 7, first_unmatched |-> 8, end_record |-> TRUE, paper_accepted |-> FALSE]>>'
const traceRun = (verdict: ReceiptRun['verdict'], record: string, version = '1.8.0'): ReceiptRun =>
  tlcRun(
    verdict,
    record === REJECTED_RECORD
      ? ['TLC2 Version 2026.10.20.183001 (rev: d2e1472)', record, 'Error: Postcondition TraceVerdict at line 68, col 3 to line 76, col 25 of module TraceValidation is false.', '38 states generated, 23 distinct states found, 0 states left on queue.']
      : ['TLC2 Version 2026.10.20.183001 (rev: d2e1472)', record, 'Model checking completed. No error has been found.', '56 states generated, 35 distinct states found, 0 states left on queue.'],
    ['java', '-jar', 'tla2tools.jar', '-workers', '1', '-config', 'Trace.cfg', 'Trace.tla'],
    version,
  )
const tracesSection = {
  lab: 'LAB-8',
  stage: 'LAB-8.6',
  checks: [{ id: 'LAB-8.c6', pass: true }],
  traces: {
    n: 2,
    seedListSha256: H('3'),
    verdicts: [
      { trace: 'traces/1.ndjson', verdict: 'accepted' as const, firstNonConformingLine: null },
      { trace: 'traces/2.ndjson', verdict: 'accepted' as const, firstNonConformingLine: null },
      { trace: 'traces/mutant.ndjson', verdict: 'rejected' as const, firstNonConformingLine: 8 },
    ],
  },
}

test("trace validation: the traces section must be the records the trace-validation runs print, with the runs' TLC version", () => {
  const runs = [traceRun('accepted', ACCEPTED_RECORD), traceRun('accepted', ACCEPTED_RECORD), traceRun('rejected', REJECTED_RECORD)]
  const unstated = deriveReceipt(receipt(runs, tracesSection), { source: 'r' })
  assert.equal(unstated.items.length, 0)
  assert.match(unstated.problems.join(), /safety-shaped or a liveness claim/)
  const ok = deriveReceipt(receipt(runs, tracesSection), { source: 'r', traceProperty: 'safety' })
  assert.deepEqual(texts(ok), ['TESTED [T] · 2 seeds · TLC 1.8.0 trace validation'])
  assert.deepEqual(ok.problems, [])
  const witnesses = ok.items[0]?.derivation.kind === 'stamp' ? ok.items[0].derivation.witnesses : undefined
  assert.deepEqual(witnesses, [{ trace: 'traces/mutant.ndjson', firstNonConformingLine: 8 }])
  // a traces section with no run behind it, which once printed "TLC  trace validation" with no version
  const noRun = deriveReceipt(receipt([tlcRun('passed', ['ok'])], tracesSection), { source: 'r', traceProperty: 'safety' })
  assert.deepEqual(noRun.items, [])
  assert.match(noRun.problems.join(), /traces: no TLC run in the receipt prints a trace-validation record/)
  const noVersion = deriveReceipt(receipt([traceRun('accepted', ACCEPTED_RECORD, ' '), traceRun('accepted', ACCEPTED_RECORD, ' '), traceRun('rejected', REJECTED_RECORD, ' ')], tracesSection), { source: 'r', traceProperty: 'safety' })
  assert.deepEqual(noVersion.items, [])
  assert.match(noVersion.problems.join(), /a trace-validation run names no TLC version/)
  // the section says accepted where the record says rejected, or names another line, or another number of traces
  const swapped = deriveReceipt(receipt([traceRun('accepted', ACCEPTED_RECORD), traceRun('rejected', REJECTED_RECORD), traceRun('rejected', REJECTED_RECORD)], tracesSection), { source: 'r', traceProperty: 'safety' })
  assert.deepEqual(swapped.items, [])
  assert.match(swapped.problems.join(), /traces\/2\.ndjson: the section says accepted but its record says rejected/)
  const verdicts = [...tracesSection.traces.verdicts.slice(0, 2), { trace: 'traces/mutant.ndjson', verdict: 'rejected' as const, firstNonConformingLine: 3 }]
  const line = deriveReceipt(receipt(runs, { ...tracesSection, traces: { ...tracesSection.traces, verdicts } }), { source: 'r', traceProperty: 'safety' })
  assert.match(line.problems.join(), /the section says line 3 but its record says line 8/)
  const short = deriveReceipt(receipt(runs.slice(0, 2), tracesSection), { source: 'r', traceProperty: 'safety' })
  assert.match(short.problems.join(), /the section lists 3 traces but 2 trace-validation runs print records/)
  // a run that says accepted over a record that rejects
  const lying = deriveReceipt(receipt([traceRun('accepted', ACCEPTED_RECORD), traceRun('accepted', ACCEPTED_RECORD), traceRun('accepted', REJECTED_RECORD)], tracesSection), { source: 'r', traceProperty: 'safety' })
  assert.match(lying.problems.join(), /runs\[2\] says accepted but the record it prints says rejected/)
})

test('goldens, and the sections a later stage derives, are named, never dropped or trusted alone', () => {
  const goldens = receipt([{ ...run('cargo', '1.96.0', 'goldens', 'passed', ['ok']), budget: {} }], {
    lab: 'LAB-3',
    stage: 'LAB-3.10',
    checks: [{ id: 'LAB-3.c10', pass: true }],
    goldens: { poolSha: H('4'), n: 40, passed: 40, failed: 0, noVerdict: 0 },
    pg: { serverVersion: 'PostgreSQL 18.6', isolationLevel: 'read-committed', sqlstateClasses: {} },
  })
  const g = deriveReceipt(goldens, { source: 'r' })
  assert.deepEqual(g.items, [])
  assert.deepEqual(g.problems, [
    'goldens: not derived until the goldens harness (W2-T25) prints verdict lines this package parses; no stamp',
    'pg: not derived before S6 and S7 (W4); no stamp',
    'runs[0] goldens: no deriver reads a cargo run yet; no stamp',
  ])
})

// ------------------------------------------------------------------ order never matters

/** Every order of a list of runs: the stamps must not depend on the order the CLI wrote them in. */
const orders = <T>(xs: readonly T[]): T[][] => (xs.length <= 1 ? [[...xs]] : xs.flatMap((x, i) => orders([...xs.slice(0, i), ...xs.slice(i + 1)]).map((rest) => [x, ...rest])))
/** The stamps and the kinds of no-stamp a receipt derives, sorted, so two orders of the same runs can be compared. */
const outcome = (s: ReceiptStamps): string[] => texts(s).sort()

test('A and B: a cvc5 sat beside the cvc5 unsat that would agree with a Z3 unsat on the same input is a disagreement, in every order', () => {
  const runs = [run('z3', '5.3.1', 'violation', 'unsat', ['unsat']), run('cvc5', '1.4.2', 'violation', 'unsat', ['unsat'], H('c'), {}), run('cvc5', '1.4.2', 'violation', 'sat', ['sat'], H('c'), {})]
  for (const o of orders(runs)) {
    const s = deriveReceipt(receipt(o), { source: 'r' })
    assert.deepEqual(outcome(s), ['none:shadow-mismatch'], JSON.stringify(o.map((r) => `${r.engine} ${r.verdict}`)))
    const d = s.items[0]?.derivation
    assert.ok(d?.kind === 'none' && d.defeater?.against === 'both-sides')
  }
})

test('C: a cvc5 premise query that says unsat beside a Z3 premise query that says sat leaves the violation query unstamped, in every order', () => {
  const runs = [run('z3', '5.3.1', 'violation', 'unsat', ['unsat']), run('z3', '5.3.1', 'premise', 'sat', ['sat', '[a = 1]'], H('d')), run('cvc5', '1.4.2', 'premise', 'unsat', ['unsat'], H('d'), {})]
  for (const o of orders(runs)) {
    const s = deriveReceipt(receipt(o), { source: 'r' })
    assert.ok(!texts(s).some((t) => t.startsWith('PROVED')), JSON.stringify(texts(s)))
    // the premise queries share an input, so they disagree with each other: neither stands as the premise witness
    assert.match(s.problems.join('\n'), /runs\[\d\] violation: the solver runs on|disagree/)
  }
})

test('D: two premise queries of one name that disagree leave the violation query unstamped; any unsat empties it, in every order', () => {
  const runs = [run('z3', '5.3.1', 'violation', 'unsat', ['unsat']), run('z3', '5.3.1', 'premise', 'sat', ['sat', '[a = 1]'], H('d')), run('z3', '5.3.1', 'premise', 'unsat', ['unsat'], H('e'))]
  for (const o of orders(runs)) {
    const s = deriveReceipt(receipt(o), { source: 'r' })
    assert.ok(!texts(s).some((t) => t.startsWith('PROVED')), JSON.stringify(texts(s)))
    assert.match(s.problems.join('\n'), /the premise queries with no name disagree: one says sat and another unsat; no stamp/)
    assert.match(s.problems.join('\n'), /the premise queries with no name read 2 different inputs/)
  }
  // two premise queries that both say unsat: the claim holds vacuously, in every order
  const vacuous = [run('z3', '5.3.1', 'violation', 'unsat', ['unsat']), run('z3', '5.3.1', 'premise', 'unsat', ['unsat'], H('d')), run('cvc5', '1.4.2', 'premise', 'unsat', ['unsat'], H('d'), {})]
  for (const o of orders(vacuous)) {
    const s = deriveReceipt(receipt(o), { source: 'r' })
    const p = s.items.find((i) => i.derivation.kind === 'stamp' && i.derivation.stamp.code === '[P]')?.derivation
    assert.ok(p?.kind === 'stamp' && p.stamp.defeaters.some((d) => /vacuously/.test(d.text)), JSON.stringify(texts(s)))
  }
})

test('E and F: a run with no direction that says sat on the input a Z3 violation query found unsat contradicts it, in every order', () => {
  for (const other of [run('cvc5', '1.4.2', undefined, 'sat', ['sat'], H('c'), {}), run('z3', '5.3.1', undefined, 'sat', ['sat'], H('c'))]) {
    for (const o of orders([run('z3', '5.3.1', 'violation', 'unsat', ['unsat']), other])) {
      const s = deriveReceipt(receipt(o), { source: 'r' })
      assert.ok(!texts(s).some((t) => t.startsWith('PROVED')), JSON.stringify(texts(s)))
      assert.ok(texts(s).includes('none:shadow-mismatch'))
    }
  }
})

test('"agree" needs every cvc5 run on the input to say unsat: an unknown beside an unsat leaves the Z3 [P] alone, in every order', () => {
  const runs = [run('z3', '5.3.1', 'violation', 'unsat', ['unsat']), run('cvc5', '1.4.2', 'violation', 'unsat', ['unsat'], H('c'), {}), run('cvc5', '1.4.2', 'violation', 'unknown', ['unknown'], H('c'), {})]
  for (const o of orders(runs)) assert.deepEqual(outcome(deriveReceipt(receipt(o), { source: 'r' })), ['PROVED [P] · Z3 5.3.1 unsat · uncertified · rlimit 5e6'])
  // two cvc5 runs that both say unsat agree; a cvc5 with no direction on the same input answers the same query
  const both = [run('z3', '5.3.1', 'violation', 'unsat', ['unsat']), run('cvc5', '1.4.2', 'violation', 'unsat', ['unsat'], H('c'), {}), run('cvc5', '1.4.2', undefined, 'unsat', ['unsat'], H('c'), {})]
  for (const o of orders(both)) assert.deepEqual(outcome(deriveReceipt(receipt(o), { source: 'r' })), ['PROVED [P] · Z3 5.3.1 and cvc5 1.4.2 agree · uncertified · rlimit 5e6'])
  // two cvc5 versions: no one checker agrees, so the [P] stands on Z3 alone and the reason is named
  const versions = deriveReceipt(receipt([run('z3', '5.3.1', 'violation', 'unsat', ['unsat']), run('cvc5', '1.4.2', 'violation', 'unsat', ['unsat'], H('c'), {}), run('cvc5', '1.4.2-modified', 'violation', 'unsat', ['unsat'], H('c'), {})]), { source: 'r' })
  assert.deepEqual(texts(versions), ['PROVED [P] · Z3 5.3.1 unsat · uncertified · rlimit 5e6'])
  assert.match(versions.problems.join(), /the cvc5 runs on its input name 2 versions \(1\.4\.2, 1\.4\.2-modified\)/)
})

test("the z3 section's headline: it must agree with one of the Z3 runs on its query, whatever their order", () => {
  const unsat = run('z3', '5.3.1', 'violation', 'unsat', ['unsat'], H('e'))
  const unknown = run('z3', '5.3.1', 'violation-again', 'unknown', ['unknown', '(:reason-unknown "canceled")'], H('e'))
  const section = { z3: { smtlibSha256: H('e'), entry: 'cli' as const, rlimit: 5000000, verdict: 'unknown' as const, reason_unknown: 'canceled' } }
  for (const o of [[unsat, unknown], [unknown, unsat]]) {
    const s = deriveReceipt(receipt(o, section), { source: 'r' })
    assert.deepEqual(outcome(s), ['PROVED [P] · Z3 5.3.1 unsat · uncertified · rlimit 5e6', 'UNKNOWN [?] · canceled at rlimit 5e6'])
  }
  // a section that agrees with neither run misreports them both
  const wrong = deriveReceipt(receipt([unsat, unknown], { z3: { smtlibSha256: H('e'), entry: 'cli', rlimit: 5000000, verdict: 'sat' } }), { source: 'r' })
  assert.deepEqual(wrong.items, [])
  assert.equal(wrong.problems.filter((p) => /the z3 section says sat/.test(p)).length, 2)
})

test("a solver run's rlimit is the one its command line passes; a budget that disagrees with it is refused", () => {
  const passed = (n: string, budget = 5000000): ReceiptRun => ({ ...run('z3', '5.3.1', 'violation', 'unsat', ['unsat'], H('c'), { rlimit: budget }), argv: ['z3', '-smt2', `rlimit=${n}`, 'claims/cl-1-1.smt2'] })
  assert.deepEqual(texts(deriveReceipt(receipt([passed('5000000')]), { source: 'r' })), ['PROVED [P] · Z3 5.3.1 unsat · uncertified · rlimit 5e6'])
  const disagree = deriveReceipt(receipt([passed('1')]), { source: 'r' })
  assert.deepEqual(disagree.items, [])
  assert.match(disagree.problems.join(), /its command line passes rlimit 1 but its budget records 5000000/)
  // the API runner's form
  const api = { ...run('z3', '5.3.1', 'violation', 'unsat', ['unsat'], H('c'), { rlimit: 5000000 }), argv: ['python', '-P', '-m', 'statespace.lanes.z3', '--rlimit', '7', 'claims/cl-1-1.smt2'] }
  assert.deepEqual(deriveReceipt(receipt([api]), { source: 'r' }).items, [])
})

// ------------------------------------------------------------------ I7 for every section

test('I7: a TLC run, a trace validation or a Lean check that read a statement whose hash changed is voided, whatever the section names', () => {
  const statements = [
    { path: 'specs/DoubleSpend.tla', kind: 'tla' as const, sha256: H('1') },
    { path: 'Ledger/Challenge.lean', kind: 'lean-challenge' as const, sha256: H('5') },
  ]
  const changed = new Map([
    ['specs/DoubleSpend.tla', H('9')],
    ['Ledger/Challenge.lean', H('8')],
  ])
  // TLC: the run read the changed spec, under a section that names another spec hash
  const tlc = receipt([tlcRun('no-error', COMPLETE)], { ...lab5, statements, ...tlcSection('no-error', 4, true), tlc: { ...tlcSection('no-error', 4, true).tlc, specSha256: H('7') } })
  const t = deriveReceipt(tlc, { source: 'r', currentHashes: changed })
  assert.ok(!texts(t).some((x) => x.startsWith('MODEL-CHECKED')), JSON.stringify(texts(t)))
  assert.match(t.problems.join(), /tlc: the spec it checked has changed since the run/)
  // and with no hash changed, a run that read another input than the section's spec is not the run it reports
  const other = deriveReceipt(tlc, { source: 'r' })
  assert.deepEqual(other.items, [])
  assert.match(other.problems.join(), /read an input whose SHA-256 is not the section's spec hash/)
  // trace validation: its runs record their configurations, so a changed TLA+ statement voids them
  const traces = receipt([traceRun('accepted', ACCEPTED_RECORD), traceRun('accepted', ACCEPTED_RECORD), traceRun('rejected', REJECTED_RECORD)], { ...tracesSection, statements })
  const tv = deriveReceipt(traces, { source: 'r', currentHashes: changed, traceProperty: 'safety' })
  assert.ok(!texts(tv).some((x) => x.startsWith('TESTED')), JSON.stringify(texts(tv)))
  assert.match(tv.problems.join(), /traces: the spec they were validated against has changed/)
  // Lean with no challengeSha in its section: a run that read the changed challenge, and a changed challenge module
  const comparator = { ...lakeRun('comparator', 'accepted', ['Your solution is okay!']), inputSha256: H('5') }
  const lean = receipt([lakeRun('axioms', 'passed', [CONSERVES]), comparator], { ...leanSection(conserves), statements })
  const l = deriveReceipt(lean, { source: 'r', currentHashes: changed })
  assert.ok(!texts(l).some((x) => x.startsWith('PROVED')), JSON.stringify(texts(l)))
  assert.match(l.problems.join(), /lean: the challenge it was checked against has changed/)
  const moduleOnly = deriveReceipt(receipt([lakeRun('axioms', 'passed', [CONSERVES]), lakeRun('comparator', 'accepted', ['Your solution is okay!'])], { ...leanSection(conserves), statements }), { source: 'r', currentHashes: new Map([['Ledger/Challenge.lean', H('8')]]) })
  assert.ok(!texts(moduleOnly).some((x) => x.startsWith('PROVED')))
  // nothing changed: each derives
  assert.deepEqual(texts(deriveReceipt(lean, { source: 'r' })), ['PROVED [P] · Lean 4.35.0 kernel · axioms listed'])
})

// ------------------------------------------------------------------ a part that cannot be stamped never costs the others

test("a version with no dotted number, a deadlock with no trace or a nightly toolchain is a problem, never a throw that loses the receipt's other stamps", () => {
  for (const version of ['dev', '5', 'z3-4.13.0']) {
    const s = deriveReceipt(receipt([run('z3', version, 'violation', 'unsat', ['unsat']), run('z3', '5.3.1', 'violation-other', 'unknown', ['unknown', '(:reason-unknown "canceled")'], H('e'))]), { source: 'r' })
    assert.deepEqual(texts(s), ['UNKNOWN [?] · canceled at rlimit 5e6'], version)
    assert.match(s.problems.join(), /runs\[0\] violation: smt-unsat: \[P\] names its checker and version first/)
  }
  const deadlock = deriveReceipt(receipt([tlcRun('deadlock', DEADLOCK), run('z3', '5.3.1', 'violation', 'unsat', ['unsat'])], { ...lab5, ...tlcSection('deadlock', 10, false) }), { source: 'r', tlc: { deadlockFreedom: true } })
  assert.deepEqual(texts(deadlock), ['PROVED [P] · Z3 5.3.1 unsat · uncertified · rlimit 5e6'])
  assert.match(deadlock.problems.join(), /tlc: a deadlock that violates deadlock freedom, but the verdict lines hold no trace/)
  const night = (r: ReceiptRun): ReceiptRun => ({ ...r, engine: 'lean', version: 'nightly-2026-10-01' })
  const nightly = deriveReceipt(receipt([night(lakeRun('axioms', 'passed', [CONSERVES])), night(lakeRun('comparator', 'accepted', ['Your solution is okay!'])), run('z3', '5.3.1', 'violation', 'unsat', ['unsat'])], { lean: { ...leanSection(conserves).lean, toolchain: 'leanprover/lean4:nightly-2026-10-01' } }), { source: 'r' })
  assert.deepEqual(texts(nightly), ['PROVED [P] · Z3 5.3.1 unsat · uncertified · rlimit 5e6'])
  assert.match(nightly.problems.join(), /lean: lean-accepted: \[P\] names its checker and version first/)
})

// ------------------------------------------------------------------ trace validation counts accepted traces, once each

test('trace validation: n seeds counts distinct accepted traces; a trace listed twice, a section n that is not the count, a record that contradicts itself and a seed that is not the run\'s are refused', () => {
  const v = (trace: string, seed?: number) => ({ trace, ...(seed !== undefined ? { seed } : {}), verdict: 'accepted' as const, firstNonConformingLine: null })
  const seeded = (seed: number, record = ACCEPTED_RECORD): ReceiptRun => ({ ...traceRun('accepted', record), budget: { seed } })
  const section = (n: number, verdicts: ReturnType<typeof v>[]) => ({ ...tracesSection, traces: { n, seedListSha256: H('3'), verdicts } })
  // one trace file and seed, validated three times and listed three times
  const thrice = deriveReceipt(receipt([seeded(1), seeded(1), seeded(1)], section(3, [v('traces/1.ndjson', 1), v('traces/1.ndjson', 1), v('traces/1.ndjson', 1)])), { source: 'r', traceProperty: 'safety' })
  assert.deepEqual(thrice.items, [])
  assert.match(thrice.problems.join(), /the trace traces\/1\.ndjson is listed twice/)
  // a section whose n is 12, against one accepted record
  const twelve = deriveReceipt(receipt([seeded(1)], section(12, [v('traces/1.ndjson', 1)])), { source: 'r', traceProperty: 'safety' })
  assert.deepEqual(twelve.items, [])
  assert.match(twelve.problems.join(), /the section's n is 12, but 1 of its traces were accepted/)
  // a record printed as accepted whose own counts say 3 of 11 lines matched, first unmatched 4, no end record
  const contradicts = '<<"trace-validation", [diameter |-> 15, verdict |-> "accepted", lines |-> 11, matched |-> 3, first_unmatched |-> 4, end_record |-> FALSE, paper_accepted |-> FALSE]>>'
  const lying = deriveReceipt(receipt([seeded(1, contradicts)], section(1, [v('traces/1.ndjson', 1)])), { source: 'r', traceProperty: 'safety' })
  assert.deepEqual(lying.items, [])
  assert.match(lying.problems.join(), /the record says accepted, but its counts .* say rejected/)
  // the section names a seed the run did not run with: by seed, no trace pairs with the run; in order, the seeds differ
  const seed = deriveReceipt(receipt([seeded(2)], section(1, [v('traces/1.ndjson', 1)])), { source: 'r', traceProperty: 'safety' })
  assert.deepEqual(seed.items, [])
  assert.match(seed.problems.join(), /runs\[0\] ran with seed 2, which no trace in the section names/)
  const inOrder = deriveReceipt(receipt([seeded(2), traceRun('accepted', ACCEPTED_RECORD)], section(2, [v('traces/1.ndjson', 1), v('traces/2.ndjson')])), { source: 'r', traceProperty: 'safety' })
  assert.deepEqual(inOrder.items, [])
  assert.match(inOrder.problems.join(), /the section says seed 1 but runs\[0\] ran with seed 2/)
  // two runs with one seed, or a seed the section names for two traces
  const twice = deriveReceipt(receipt([seeded(1), seeded(1)], section(2, [v('traces/1.ndjson', 1), v('traces/2.ndjson', 2)])), { source: 'r', traceProperty: 'safety' })
  assert.deepEqual(twice.items, [])
  assert.match(twice.problems.join(), /two trace-validation runs ran with seed 1/)
  const named = deriveReceipt(receipt([seeded(1), seeded(2)], section(2, [v('traces/1.ndjson', 1), v('traces/2.ndjson', 1)])), { source: 'r', traceProperty: 'safety' })
  assert.deepEqual(named.items, [])
  assert.match(named.problems.join(), /the section names seed 1 for 2 traces/)
  // a run that prints two records validated two traces in one run
  const two = deriveReceipt(receipt([tlcRun('accepted', [ACCEPTED_RECORD, ACCEPTED_RECORD], ['java', '-jar', 'tla2tools.jar', '-config', 'Trace.cfg', 'Trace.tla'])], section(2, [v('traces/1.ndjson'), v('traces/2.ndjson')])), { source: 'r', traceProperty: 'safety' })
  assert.match(two.problems.join(), /prints 2 trace-validation records; a run validates one trace/)
  // two distinct traces, each its own run: 2 seeds, in either order
  for (const o of [[seeded(1), seeded(2)], [seeded(2), seeded(1)]]) {
    const verdicts = o.map((r) => v(`traces/${r.budget.seed}.ndjson`, r.budget.seed))
    assert.deepEqual(texts(deriveReceipt(receipt(o, section(2, verdicts)), { source: 'r', traceProperty: 'safety' })), ['TESTED [T] · 2 seeds · TLC 1.8.0 trace validation'])
  }
})

test('violation queries on one input share one premise reading, whatever name each step gives them, in every order', () => {
  // the Bench CLI names a repeated step violation-2; both runs answer the query on one input
  const runs = [run('z3', '5.3.1', 'violation', 'unsat', ['unsat']), run('z3', '5.3.1', 'violation-2', 'unsat', ['unsat']), run('z3', '5.3.1', 'premise', 'unsat', ['unsat'], H('d'))]
  for (const o of orders(runs)) {
    const s = deriveReceipt(receipt(o), { source: 'r' })
    const proved = s.items.filter((i) => i.derivation.kind === 'stamp' && i.derivation.stamp.code === '[P]')
    assert.equal(proved.length, 2, JSON.stringify(texts(s)))
    for (const p of proved) assert.ok(p.derivation.kind === 'stamp' && p.derivation.stamp.defeaters.some((d) => /vacuously/.test(d.text)), JSON.stringify(o.map((r) => r.step)))
  }
  // in order pairing too, a seed the section names for two traces would count one trace twice
  const v = (trace: string, seed?: number) => ({ trace, ...(seed !== undefined ? { seed } : {}), verdict: 'accepted' as const, firstNonConformingLine: null })
  const twice = deriveReceipt(receipt([traceRun('accepted', ACCEPTED_RECORD), traceRun('accepted', ACCEPTED_RECORD)], { ...tracesSection, traces: { n: 2, seedListSha256: H('3'), verdicts: [v('traces/1.ndjson', 1), v('traces/2.ndjson', 1)] } }), { source: 'r', traceProperty: 'safety' })
  assert.deepEqual(twice.items, [])
  assert.match(twice.problems.join(), /the section names seed 1 for 2 traces/)
})

test("trace validation pairs each run with its trace by seed, so the runs' order does not matter; with no seeds they pair in the order both list them", () => {
  // an accepted trace (seed 1) and a rejected one (seed 2, at line 8), listed in that order by the section
  const accepted: ReceiptRun = { ...traceRun('accepted', ACCEPTED_RECORD), budget: { seed: 1 } }
  const rejected: ReceiptRun = { ...traceRun('rejected', REJECTED_RECORD), budget: { seed: 2 } }
  const verdicts = [
    { trace: 'traces/1.ndjson', seed: 1, verdict: 'accepted' as const, firstNonConformingLine: null },
    { trace: 'traces/2.ndjson', seed: 2, verdict: 'rejected' as const, firstNonConformingLine: 8 },
  ]
  const seededSection = { ...tracesSection, traces: { n: 1, seedListSha256: H('3'), verdicts } }
  for (const o of [[accepted, rejected], [rejected, accepted]]) {
    const s = deriveReceipt(receipt(o, seededSection), { source: 'r', traceProperty: 'safety' })
    assert.deepEqual(texts(s), ['TESTED [T] · 1 seed · TLC 1.8.0 trace validation'], JSON.stringify(s.problems))
    assert.deepEqual(s.problems, [])
    const d = s.items[0]?.derivation
    assert.deepEqual(d?.kind === 'stamp' ? d.witnesses : undefined, [{ trace: 'traces/2.ndjson', firstNonConformingLine: 8 }])
  }
  // the same runs with no seeds: the order both list them in is the only pairing, so swapped runs are refused, never misread
  const plainSection = { ...tracesSection, traces: { n: 1, seedListSha256: H('3'), verdicts: verdicts.map(({ trace, verdict, firstNonConformingLine }) => ({ trace, verdict, firstNonConformingLine })) } }
  const unseeded = (r: ReceiptRun): ReceiptRun => ({ ...r, budget: { workers: 1 } })
  assert.deepEqual(texts(deriveReceipt(receipt([unseeded(accepted), unseeded(rejected)], plainSection), { source: 'r', traceProperty: 'safety' })), ['TESTED [T] · 1 seed · TLC 1.8.0 trace validation'])
  const swapped = deriveReceipt(receipt([unseeded(rejected), unseeded(accepted)], plainSection), { source: 'r', traceProperty: 'safety' })
  assert.deepEqual(swapped.items, [])
  assert.match(swapped.problems.join(), /traces\/1\.ndjson: the section says accepted but its record says rejected/)
})

test("trace validation: seeded runs in any order give the same derivation, the rejected traces' witnesses in the section's order among it", () => {
  const atLine5 = REJECTED_RECORD.replace('matched |-> 7, first_unmatched |-> 8', 'matched |-> 4, first_unmatched |-> 5')
  const runs: ReceiptRun[] = [
    { ...traceRun('rejected', REJECTED_RECORD), budget: { seed: 11 } },
    { ...traceRun('rejected', atLine5), budget: { seed: 12 } },
    { ...traceRun('accepted', ACCEPTED_RECORD), budget: { seed: 13 } },
  ]
  const verdicts = [
    { trace: 'traces/1.ndjson', seed: 11, verdict: 'rejected' as const, firstNonConformingLine: 8 },
    { trace: 'traces/2.ndjson', seed: 12, verdict: 'rejected' as const, firstNonConformingLine: 5 },
    { trace: 'traces/3.ndjson', seed: 13, verdict: 'accepted' as const, firstNonConformingLine: null },
  ]
  const section = { ...tracesSection, traces: { n: 1, seedListSha256: H('3'), verdicts } }
  const seen = new Set(orders(runs).map((o) => JSON.stringify(deriveReceipt(receipt(o, section), { source: 'r', traceProperty: 'safety' }))))
  assert.equal(seen.size, 1, [...seen].join('\n'))
  const d = deriveReceipt(receipt(runs, section), { source: 'r', traceProperty: 'safety' }).items[0]?.derivation
  assert.deepEqual(d?.kind === 'stamp' ? d.witnesses : undefined, [
    { trace: 'traces/1.ndjson', firstNonConformingLine: 8 },
    { trace: 'traces/2.ndjson', firstNonConformingLine: 5 },
  ])
})

// ------------------------------------------------------------------ Lean: every run counts, in any order

test("Lean: axioms printed twice for one theorem count every axiom either line names, an unnamed list must be in the section, and the --paranoid runs must agree, in any order", () => {
  const accepted = lakeRun('comparator', 'accepted', ['Your solution is okay!'])
  const plain = lakeRun('axioms', 'passed', ["'transfer_conserves' depends on axioms: [propext, Quot.sound]"])
  const cheat = lakeRun('axioms-again', 'passed', ["'transfer_conserves' depends on axioms: [propext, Quot.sound, cheat]"])
  for (const o of orders([plain, cheat, accepted])) {
    const s = deriveReceipt(receipt(o, leanSection(conserves)), { source: 'r' })
    assert.deepEqual(s.items, [], JSON.stringify(o.map((r) => r.step)))
    assert.match(s.problems.join(), /transfer_conserves: the lean section lists \[propext, Quot.sound\] but the verdict lines print \[propext, Quot.sound, cheat\]/)
  }
  const unnamed = deriveReceipt(receipt([lakeRun('axioms', 'passed', [CONSERVES, 'Uses axioms: cheat']), accepted], leanSection(conserves)), { source: 'r' })
  assert.deepEqual(unnamed.items, [])
  assert.match(unnamed.problems.join(), /print the axioms \[cheat\] with no theorem's name/)
  const five = PARANOID_LINES.filter((l) => !l.startsWith('nanoda'))
  for (const o of orders([lakeRun('comparator', 'accepted', PARANOID_LINES, { paranoid: true }), lakeRun('comparator-again', 'accepted', five, { paranoid: true }), lakeRun('axioms', 'passed', [CONSERVES])])) {
    const s = deriveReceipt(receipt(o, leanSection(conserves)), { source: 'r' })
    assert.deepEqual(s.items, [])
    assert.match(s.problems.join(), /the --paranoid runs' lines show 5 and 6 accepting checkers/)
  }
  // with no version in the toolchain, the lean runs must name one (a lake run's version is Lake's own)
  const leanEngine = (r: ReceiptRun, version: string): ReceiptRun => ({ ...r, engine: 'lean', version })
  const versions = deriveReceipt(receipt([leanEngine(plain, '4.35.0'), leanEngine(accepted, '4.36.0')], { lean: { ...leanSection(conserves).lean, toolchain: 'leanprover/lean4:stable' } }), { source: 'r' })
  assert.match(versions.problems.join(), /the toolchain names no version and the Lean runs name 2 \(4\.35\.0, 4\.36\.0\)/)
  const lakeOnly = deriveReceipt(receipt([{ ...plain, version: '5.0.0-src+eb6cafb' }, { ...accepted, version: '5.0.0-src+eb6cafb' }], { lean: { ...leanSection(conserves).lean, toolchain: 'leanprover/lean4:stable' } }), { source: 'r' })
  assert.deepEqual(lakeOnly.items, [])
  assert.match(lakeOnly.problems.join(), /lean: no toolchain or run names the Lean version/)
})

test('Lean: two comparator runs that report a constant and a statement mismatch give one reading, the statement mismatch, in either order', () => {
  // a challenge with two theorems, each checked in its own comparator run, can report one kind of mismatch per run
  const constant = lakeRun('comparator', 'rejected', ['error: Const does not match: Ledger.balance'], { exitCode: 1 })
  const statement = lakeRun('comparator-paranoid', 'rejected', ['error: Challenge and solution theorem statement do not match'], { exitCode: 1, paranoid: true })
  for (const o of orders([constant, statement])) {
    const s = deriveReceipt(receipt(o, leanSection([])), { source: 'r' })
    assert.deepEqual(texts(s), ['UNKNOWN [?] · statement mismatch'], JSON.stringify(o.map((r) => r.step)))
    assert.deepEqual(s.items[0]?.raw, { kind: 'lean-mismatch', lean: { name: 'Lean', version: '4.35.0' }, mismatch: 'statement', line: 'error: Challenge and solution theorem statement do not match' })
  }
  // one run that prints both: the statement mismatch outranks the constant one wherever it stands among the lines
  const both = lakeRun('comparator', 'rejected', ['error: Const does not match: Ledger.balance', 'error: Challenge and solution theorem statement do not match'], { exitCode: 1 })
  assert.deepEqual(texts(deriveReceipt(receipt([both], leanSection([])), { source: 'r' })), ['UNKNOWN [?] · statement mismatch'])
  // two constant mismatches: the same reading, and the same line, in either order
  const other = lakeRun('comparator-again', 'rejected', ['error: Const does not match: Ledger.transfer'], { exitCode: 1 })
  const lines = orders([constant, other]).map((o) => JSON.stringify(deriveReceipt(receipt(o, leanSection([])), { source: 'r' }).items))
  assert.equal(new Set(lines).size, 1)
  assert.match(lines[0] ?? '', /statement mismatch \(a constant differs\)/)
})

test('Lean: every reading that names one run of several (a sandbox line, a killed checker, a rejection, an error that is no verdict) names the same one in any order', () => {
  const cases: ReceiptRun[][] = [
    [lakeRun('comparator', 'error', ['bwrap: No permissions to create new namespace'], { exitCode: 1 }), lakeRun('comparator-paranoid', 'error', ['bwrap: setting up uid map: Permission denied'], { exitCode: 1, paranoid: true })],
    [lakeRun('comparator', 'error', ['Running Lean default kernel on solution'], { exitCode: 143 }), lakeRun('comparator-paranoid', 'error', ['Running nanoda kernel on solution'], { exitCode: 137, paranoid: true })],
    [lakeRun('check', 'rejected', ["error: Axiom 'cheat' is not permitted; it is used by 'transfer_conserves'"], { exitCode: 1 }), lakeRun('check-again', 'rejected', ['nanoda kernel rejects the solution'], { exitCode: 1 })],
    [lakeRun('comparator', 'error', ["error: Ledger/Basic.lean:12:2: unknown identifier 'foo'"], { exitCode: 1 }), lakeRun('comparator-again', 'failed', ['error: build failed'], { exitCode: 2 }), lakeRun('build', 'error', ['Build failed.'], { exitCode: 3 })],
  ]
  for (const runs of cases) {
    const seen = new Set(orders(runs).map((o) => JSON.stringify(deriveReceipt(receipt(o, leanSection(conserves)), { source: 'r' }))))
    assert.equal(seen.size, 1, `${runs.map((r) => r.step).join(', ')}: ${[...seen].join(' | ')}`)
  }
  // and the checker rows a section says reject: the same row named, whatever their order
  const rows: CheckerRow[] = [{ name: 'nanoda', version: '0.3.0', verdict: 'rejects' }, { name: 'lean4lean', version: '4.35.0', verdict: 'rejects' }]
  const named = [rows, [...rows].reverse()].map((checkers) => JSON.stringify(deriveReceipt(receipt([lakeRun('comparator', 'accepted', ['Your solution is okay!'])], leanSection(conserves, { checkers })), { source: 'r' }).items))
  assert.equal(new Set(named).size, 1)
})
