// A label is generated from the runs: these tests read the ten S1 specimens' labels from the committed cabinet, and show
// that each part follows its run and not its record, by changing the run's side and watching the label change.

import assert from 'node:assert/strict'
import test from 'node:test'
import { stampText } from '../../../../../../packages/stamps/src/index.ts'
import { canonicalJson, sha256Hex } from '../../../../../../packages/ledger/src/index.ts'
import { witnessSteps } from '../model/blocks.ts'
import { buildLabel, deriveMain, minimalView, rich, runTokens } from '../model/label.ts'
import { entryOf, loadCabinet } from './helpers.mjs'

/** What the spine's section 5.1 and DESIGN.md sections 5.2 and 6.5 say each S1 label's stamp is. */
const STAMPS = {
  'SP-1.1': 'REFUTED [R] · 1 step',
  'SP-1.2': 'REFUTED [R] · 2 steps',
  'SP-1.3': 'REFUTED [R] · 1 step',
  'SP-1.4': 'REFUTED [R] · 1 step',
  'SP-1.5': 'REFUTED [R] · 1 step',
  'SP-1.7': 'UNKNOWN [?] · incomplete (theory arithmetic)',
  'SP-1.8': 'UNKNOWN [?] · canceled at rlimit 5e6',
  'SP-1.9': 'REFUTED [R] · 1 step',
  'SP-1.10': 'REFUTED [R] · 1 step',
}

const clone = (v) => structuredClone(v)
const stampOf = (entry) => {
  const d = deriveMain(entry.evidence)
  return d.kind === 'stamp' ? stampText(d.stamp) : d
}

test('the ten S1 labels carry the stamp their run earns: REFUTED over a replayed witness, UNKNOWN with its reason', () => {
  const cabinet = loadCabinet()
  assert.deepEqual(cabinet.specimens.map((e) => e.record.id), ['SP-1.1', 'SP-1.2', 'SP-1.3', 'SP-1.4', 'SP-1.5', 'SP-1.6', 'SP-1.7', 'SP-1.8', 'SP-1.9', 'SP-1.10'])
  for (const e of cabinet.specimens) {
    if (e.record.id === 'SP-1.6') continue
    assert.equal(stampOf(e), STAMPS[e.record.id], e.record.id)
  }
  // the label's own stamp is the derivation's, and the stamp is the deriver's object, never text
  const label = buildLabel(entryOf('SP-1.1'))
  assert.equal(label.derivation.kind, 'stamp')
  assert.equal(label.derivation.stamp.source, 'RUN-z3-starter')
})

test('contradictory premises earn no stamp, and say why: the premise query is unsat, so the claim would hold vacuously', () => {
  const d = buildLabel(entryOf('SP-1.6')).derivation
  assert.equal(d.kind, 'none')
  assert.match(d.text, /the premise query is unsat: the premises are contradictory, so any claim over them holds vacuously/)
  assert.equal(d.defeater.text, 'the premises are unsatisfiable, so the claim holds vacuously')
  // read as the violation query it also answers, with the premise query beside it, the same lines would be a PROVED with an open doubt
  const e = clone(entryOf('SP-1.6'))
  e.evidence.main = { ...e.evidence.also[0], direction: 'violation', premise: { run: 'RUN-z3-vacuous-unsat', query: 'max0_range_premises', lines: e.evidence.main.lines } }
  const proved = deriveMain(e.evidence)
  assert.equal(proved.kind, 'stamp')
  assert.equal(stampText(proved.stamp), 'PROVED [P] · Z3 5.3.1 unsat · uncertified · rlimit 5e6')
  assert.ok(proved.stamp.defeaters.some((x) => /holds vacuously/.test(x.text)))
})

test('a witness that has not replayed earns no REFUTED, and one that failed to replay earns none either', () => {
  const e = clone(entryOf('SP-1.1'))
  delete e.evidence.main.replay
  const pending = deriveMain(e.evidence)
  assert.equal(pending.kind, 'none')
  assert.equal(pending.reason, 'replay-pending')
  e.evidence.main.replay = { run: 'RUN-specimens-replay', query: 'sp_1_1_starter', lines: ['[sp_1_1_starter] replay FAILED: a=0 b=0 amount=1: a - amount = -1 < 0 FAILED'] }
  const failed = deriveMain(e.evidence)
  assert.equal(failed.kind, 'none')
  assert.equal(failed.reason, 'no-replay')
})

test('the direction comes from the record and the length from the witness: change either and the stamp the lines earn changes', () => {
  const e = clone(entryOf('SP-1.2'))
  assert.equal(stampOf(e), 'REFUTED [R] · 2 steps')
  // the resolved evidence holds no length to edit: the stamp reads the model the run printed
  assert.equal('steps' in e.evidence.main, false)
  assert.equal('steps' in entryOf('SP-1.2').record.evidence.main, true, 'the record states it, and the build holds the statement to the witness')
  // the same query with a witness that chains one step less is a witness of one step, and one with no primed variable is one transfer
  const replay = e.evidence.main.lines.slice(1)
  e.evidence.main.lines = ['[at_most_once_buggy] sat [avail = 0, merchant = 0, merchant_p = 1, held = 2]', ...replay]
  assert.equal(stampOf(e), 'REFUTED [R] · 1 step')
  e.evidence.main.lines = ['[at_most_once_buggy] sat [avail = 0, merchant = 0, held = 2]', ...replay]
  assert.equal(stampOf(e), 'REFUTED [R] · 1 step')
  e.evidence.main.lines = ['[at_most_once_buggy] sat [merchant = 0, merchant_p = 1, merchant_pp = 2, merchant_ppp = 3]', ...replay]
  assert.equal(stampOf(e), 'REFUTED [R] · 3 steps')
  e.evidence.main.direction = 'premise'
  assert.equal(deriveMain(e.evidence).kind, 'none')
})

test('a witness\'s length is the longest chain of primes among its variables, and nothing else in a name is a prime', () => {
  assert.equal(witnessSteps('[a = 0, b = 0, amount = 1]'), 1)
  assert.equal(witnessSteps('[]'), 1)
  assert.equal(witnessSteps(''), 1)
  assert.equal(witnessSteps('[merchant = 0, merchant_p = 1]'), 1)
  assert.equal(witnessSteps('[merchant = 0, merchant_p = 1, merchant_pp = 2]'), 2)
  assert.equal(witnessSteps('[x_ppp = 3, x = 0]'), 3)
  // a name that merely holds a p: no underscore before the run of p's, or more name after it
  for (const name of ['top', 'p', 'pp', 'x_pa', 'x_p1', 'x_pp_y', 'help', 'x_P']) assert.equal(witnessSteps(`[${name} = 1]`), 1, name)
  assert.equal(witnessSteps('[top_p = 1]'), 1, 'one prime is one step, the least a witness has')
})

test('the tool, the date and the rlimit are the run record\'s: change the run and the label follows', () => {
  const e = clone(entryOf('SP-1.8'))
  assert.equal(buildLabel(e).foundIn.tool, 'Z3 5.3.1')
  e.evidence.runs['RUN-z3-budget-pyodide'].version = '5.3.2'
  e.evidence.runs['RUN-z3-budget-pyodide'].rlimit = 100000
  e.evidence.runs['RUN-z3-budget-pyodide'].date = '2027-01-05'
  const label = buildLabel(e)
  assert.equal(label.foundIn.tool, 'Z3 5.3.2')
  assert.equal(label.provenance.checkedBy, 'Z3 5.3.2 · RUN-z3-budget-pyodide')
  assert.equal(label.provenance.drawn, '2027-01-05')
  assert.equal(stampOf(e), 'UNKNOWN [?] · canceled at rlimit 1e5')
})

test('a witness is shown as its run printed it, one assignment to a row, and nothing else of it is typed', () => {
  const l = buildLabel(entryOf('SP-1.1'))
  assert.equal(l.main.kind, 'witness')
  assert.equal(l.main.heading, 'Z3 returned sat')
  assert.deepEqual(l.main.rows, [{ name: 'b', value: '0' }, { name: 'amount', value: '1' }, { name: 'a', value: '0' }])
  assert.equal(l.main.replay, 'a=0 b=0 amount=1: a >= 0 ok, b >= 0 ok, amount > 0 ok, a - amount = -1 < 0 ok')
  assert.deepEqual(l.also.map((b) => [b.kind, b.heading, b.rows.length]), [['witness', 'Z3 returned sat', 3], ['answer', 'Z3 returned unsat', 0]])
  assert.equal(l.main.caption, null)
  assert.deepEqual(l.also[1].caption, [{ kind: 'text', text: 'The same query once the guard ' }, { kind: 'code', text: 'amount ≤ a' }, { kind: 'text', text: ' is added.' }])
  // a model of 64-bit values keeps every digit, and the Pyodide witness is another witness that replays
  const bv = buildLabel(entryOf('SP-1.4'))
  assert.deepEqual(bv.main.rows.map((r) => `${r.name}=${r.value}`), ['A=9223372036854775806', 'B=9223372036850581504', 'X=4194304'])
  assert.deepEqual(bv.also[0].rows.map((r) => r.name), ['M', 'B'])
  assert.match(bv.also[0].replay, /^M=9223372036854775803 B=9223336852482686975/)
  // a verdict is shown as a verdict, with its reason; a line with no verdict is shown as the line
  assert.equal(buildLabel(entryOf('SP-1.7')).main.heading, 'Z3 returned unknown: incomplete (theory arithmetic)')
  const timeout = buildLabel(entryOf('SP-1.8')).also[0]
  assert.equal(timeout.kind, 'raw')
  assert.match(timeout.heading, /^timeout-case \(s\.set\('timeout',2000\)\): exit=124 after 25s/)
})

test('"minimal?" is read from the run: an Optimize value, a checked core, or an honest no', () => {
  assert.deepEqual(minimalView(entryOf('SP-1.1').evidence.minimal), { text: 'yes: `amount = 1` under an Optimize objective', basis: null, runs: ['RUN-z3-optimize-min'], minimal: true })
  assert.deepEqual(minimalView(entryOf('SP-1.2').evidence.minimal).text, 'yes: `h = 1` under an Optimize objective')
  assert.equal(minimalView(entryOf('SP-1.2').evidence.minimal).basis, 'A plain query for anything smaller is unsat.')
  assert.equal(minimalView(entryOf('SP-1.3').evidence.minimal).text, 'yes: `minted = 1` under an Optimize objective')
  const core = minimalView(entryOf('SP-1.6').evidence.minimal)
  assert.equal(core.text, 'yes: an unsat core of 2 constraints: `amount <= MAX_TRANSFER` and `amount > 0`')
  assert.equal(core.basis, 'Alone it is unsat, and dropping any one of them leaves it sat.')
  assert.deepEqual(minimalView(entryOf('SP-1.4').evidence.minimal), { text: 'not minimized', basis: null, runs: [], minimal: false })
  assert.equal(minimalView(entryOf('SP-1.7').evidence.minimal).text, '— a verdict, not a witness')
  // the value follows the run's line: another minimum, another label
  const e = clone(entryOf('SP-1.1'))
  e.evidence.minimal.block.lines = ['[S1.2 minimal amount via Optimize] sat [amount = 7, b = 0, a = 0]']
  assert.equal(minimalView(e.evidence.minimal).text, 'yes: `amount = 7` under an Optimize objective')
})

test('the compact provenance block: Sheet, Rev, Drawn and Checked by come from the record and the run', () => {
  for (const e of loadCabinet().specimens) {
    const p = buildLabel(e).provenance
    assert.equal(p.sheet, e.record.id)
    assert.equal(e.rev, sha256Hex(canonicalJson(e.record)), `${e.record.id}'s Rev is the hash of its record`)
    assert.equal(p.rev, e.rev.slice(0, 12))
    assert.match(p.rev, /^[0-9a-f]{12}$/)
    assert.match(p.drawn, /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)
    assert.match(p.checkedBy, /^Z3 5\.3\.1 · RUN-/)
  }
  // an unknown date is a dash, never a guess
  const e = clone(entryOf('SP-1.1'))
  e.evidence.runs['RUN-z3-starter'].date = null
  assert.equal(buildLabel(e).provenance.drawn, null)
})

test('found in names the lesson and the other runs the label draws on; a dated incident carries its date and its source', () => {
  const l = buildLabel(entryOf('SP-1.1'))
  assert.deepEqual([l.foundIn.lesson, l.foundIn.tool, l.foundIn.run.id], ['S1.L1', 'Z3 5.3.1', 'RUN-z3-starter'])
  assert.deepEqual(l.otherRuns.map((r) => r.id), ['RUN-specimens-replay', 'RUN-z3-boot-variant', 'RUN-z3-optimize-min'])
  assert.deepEqual(buildLabel(entryOf('SP-1.8')).otherRuns.map((r) => r.id), ['RUN-phone-pyodide'])
  assert.equal(buildLabel(entryOf('SP-1.1')).incident, null)
  assert.deepEqual(buildLabel(entryOf('SP-1.9')).incident, { date: '2010-08-15', sourceTitle: 'Bitcoin wiki, CVE-2010-5139', sourceUrl: 'https://en.bitcoin.it/wiki/CVE-2010-5139', toyModel: true })
  assert.equal(buildLabel(entryOf('SP-1.10')).incident.date, '2006-06-02')
  assert.deepEqual(buildLabel(entryOf('SP-1.1')).kcs.map((k) => k.id), ['KC-1.violation-as-sat', 'KC-1.witness-class'])
  assert.ok(buildLabel(entryOf('SP-1.1')).kcs.every((k) => k.name !== k.id))
})

test('text with code spans and run chips is cut into its parts', () => {
  assert.deepEqual(rich('Guard with `amount ≤ a`, then {{run:RUN-z3-starter}} says so.'), [
    { kind: 'text', text: 'Guard with ' },
    { kind: 'code', text: 'amount ≤ a' },
    { kind: 'text', text: ', then ' },
    { kind: 'run', text: 'RUN-z3-starter' },
    { kind: 'text', text: ' says so.' },
  ])
  assert.deepEqual(rich('no markup'), [{ kind: 'text', text: 'no markup' }])
  assert.deepEqual(rich('an unmatched ` backtick'), [{ kind: 'text', text: 'an unmatched ` backtick' }])
  assert.deepEqual(rich('`a` and `b`'), [{ kind: 'code', text: 'a' }, { kind: 'text', text: ' and ' }, { kind: 'code', text: 'b' }])
  assert.deepEqual(rich(''), [])
  assert.deepEqual(runTokens('x {{run:RUN-a}} y {{run:RUN-b-2}} {{fact:z}}'), ['RUN-a', 'RUN-b-2'])
  // markup in the record is text to the screen, never HTML: the parts carry plain strings only
  assert.deepEqual(rich('<b>x</b> `<i>`'), [{ kind: 'text', text: '<b>x</b> ' }, { kind: 'code', text: '<i>' }])
})

test('every S1 record\'s words are plain English or code spans, with no bare status word and no stamp typed in', () => {
  for (const e of loadCabinet().specimens) {
    const words = [e.record.title, e.record.violates, e.record.because, e.record.class, e.record.cured_by.text, ...(e.record.evidence.also ?? []).map((a) => a.caption)].join(' ')
    const outsideCode = words.replace(/`[^`]*`/g, '').replace(/"[^"]*"/g, '')
    assert.doesNotMatch(outsideCode, /\b(verified|correct|safe|proven|guaranteed)\b/i, e.record.id)
    assert.doesNotMatch(words, /\b(PROVED|REFUTED|UNKNOWN|MODEL-CHECKED|TESTED|ENFORCED|CONFIGURED|ASSUMED)\s*\[/, e.record.id)
    assert.doesNotMatch(words, /\[(P|M|T|E|C|A|\?|N|R)\]/, e.record.id)
  }
})
