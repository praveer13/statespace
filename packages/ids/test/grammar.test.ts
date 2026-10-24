import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as generated from '../src/index.ts'
import { allIds, EXACT, idsOfKind, KIND_NAMES, KINDS, kindOfId, scanLine, scanText } from '../src/grammar.ts'

const ids = (line: string): string[] => scanLine(line).map((t) => t.id)

test('every kind has an example that matches its own format, and only its own', () => {
  for (const k of KINDS) {
    assert.ok(EXACT[k.kind].test(k.example), `${k.kind}: ${k.example}`)
    assert.equal(kindOfId(k.example), k.kind, k.example)
  }
})

test('the kinds of the grammar are the kinds of the generated module', () => {
  assert.deepEqual([...generated.KINDS], [...KIND_NAMES])
})

test('the formats of the spine ID table, one by one', () => {
  const cases: Record<string, string[]> = {
    stage: ['S1', 'S10'],
    lesson: ['S1.L0', 'S4.L6', 'S10.L7'],
    kc: ['KC-4.cti-or-bug', 'KC-1.violation-as-sat', 'KC-9.tcb'],
    lab: ['LAB-1', 'LAB-10'],
    'lab-stage': ['LAB-6.4', 'LAB-10.10'],
    'lab-check': ['LAB-6.c4', 'LAB-3.c10'],
    specimen: ['SP-1.1', 'SP-1.10'],
    'claim-template': ['CL-2.4'],
    seam: ['SEAM-1', 'SEAM-15'],
    erosion: ['ER-1', 'ER-12'],
    anchor: ['AUD-2.3'],
    'gap-class': ['G1', 'G13', 'G6c'],
    generator: ['GEN-cti-or-bug'],
    mechanic: ['M-call-it'],
    misconception: ['dp:G4', 'dp:Z1'],
    instrument: ['INS-z3', 'INS-bench-lean'],
    screen: ['SCR-today'],
    gate: ['GATE-numbers', 'GATE-audit-blind'],
    drawer: ['D-03', 'D-40'],
    run: ['RUN-tlc-doublespend', 'RUN-z3-bv64', 'RUN-lean-ih-ungeneralised'],
    wave: ['W0', 'W6'],
    task: ['W3-T11', 'W0-S05'],
    'owner-decision': ['OD-5', 'OD-16'],
    'brief-change': ['V2-07'],
    invariant: ['I1', 'I10'],
  }
  for (const [kind, list] of Object.entries(cases)) {
    for (const id of list) assert.equal(kindOfId(id), kind, id)
  }
  for (const bad of ['S0', 'S01', 'S4.l6', 'KC-4.Cti', 'KC-4.', 'LAB-6.c', 'D-3', 'V2-7', 'W7', 'W3-T', 'dp:g4', 'GATE-', 'RUN-']) {
    assert.equal(kindOfId(bad), null, bad)
  }
})

test('tokens are found in prose, tables, lists and emphasis', () => {
  assert.deepEqual(ids('Cashes ER-2 in S5.L3: the double spend SP-5.1 cracks SEAM-2.'), ['ER-2', 'S5.L3', 'SP-5.1', 'SEAM-2'])
  assert.deepEqual(ids('| S4.L6 | core | KC-4.cti-or-bug | INS-z3 (M-cti-workbench) | GEN-cti-or-bug |'), ['S4.L6', 'KC-4.cti-or-bug', 'INS-z3', 'M-cti-workbench', 'GEN-cti-or-bug'])
  assert.deepEqual(ids('- **GATE-numbers** and *GATE-facts*, _W0-T03_'), ['GATE-numbers', 'GATE-facts', 'W0-T03'])
  assert.deepEqual(ids("W0-T03's output; LAB-3.c4–LAB-3.c5's rungs; D-30–D-40."), ['W0-T03', 'LAB-3.c4', 'LAB-3.c5', 'D-30', 'D-40'])
  assert.deepEqual(ids('(S6.L3–S6.L5), W1–W2, I1–I10'), ['S6.L3', 'S6.L5', 'W1', 'W2', 'I1', 'I10'])
})

test('the most specific kind wins, and the inside of a token is not a second token', () => {
  assert.deepEqual(
    scanLine('dp:S5 LAB-3.c4 LAB-3.4 LAB-3 S1.L2 W0-S01 W0').map((t) => [t.id, t.kind]),
    [
      ['dp:S5', 'misconception'],
      ['LAB-3.c4', 'lab-check'],
      ['LAB-3.4', 'lab-stage'],
      ['LAB-3', 'lab'],
      ['S1.L2', 'lesson'],
      ['W0-S01', 'task'],
      ['W0', 'wave'],
    ],
  )
})

test('wildcards, placeholders, format strings and path fragments are not IDs', () => {
  assert.deepEqual(ids('INS-bench-*, RUN-lz-*, KC-1.*, GEN-*, dp:G*'), [])
  assert.deepEqual(ids('`{{run:RUN-id}}` and [X RUN-id], S{n}.L{k}, LAB-{n}.c{k}, W{n}-T{nn}'), [])
  assert.deepEqual(ids('see curriculum/S01-counterexample.md and docs/PLAN.md'), [])
  assert.deepEqual(ids('[the spine](docs/spine/SPINE.md#s1-counterexample) https://example.org/S1/D-01'), [])
  assert.deepEqual(ids('a [redacted: private design detail] marker is an intentional gap'), [])
})

test('a typo is a token that will not resolve, not text that goes unchecked', () => {
  assert.deepEqual(ids('S1.L11 S12 W3-T1 V2-7 OD-99 KC-4.cti-or-bgu G14 D-3 LAB-6.c44'), ['S1.L11', 'S12', 'W3-T1', 'V2-7', 'OD-99', 'KC-4.cti-or-bgu', 'G14', 'D-3', 'LAB-6.c44'])
})

test('line and column are one-based and point at the token', () => {
  const [t] = scanText('first line\n  see S4.L6 here')
  assert.deepEqual([t?.id, t?.line, t?.col], ['S4.L6', 2, 7])
})

test('idsOfKind and allIds keep order and drop repeats', () => {
  assert.deepEqual(idsOfKind('INS-z3, INS-pocket, INS-z3, GEN-call-it', 'instrument'), ['INS-z3', 'INS-pocket'])
  assert.deepEqual(allIds('W1-T14 gives SCR-instrument and SCR-receipt, W1-T14 again'), ['W1-T14', 'SCR-instrument', 'SCR-receipt'])
})
