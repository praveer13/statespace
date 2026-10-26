// Writes tests/fixtures/learner-state.json, the one learner-state fixture that drives the Playwright screenshots and the axe
// runs (DESIGN.md section 12, "One fixture"; spine A7-24), so that no two sheets can disagree.
//
//   node scripts/spikes/W1-T41/fixtures/build-learner-state.mjs           write the file
//   node scripts/spikes/W1-T41/fixtures/build-learner-state.mjs --check   fail when the committed file differs
//
// The fixture is synthetic: a learner invented to give every W1 screen something to show, in the shapes the architecture
// specifies, and it is not learner data and not a run. What it holds:
//   events   practice events in the shape of event@1 (ARCHITECTURE.md section 7.2), a week of Project 00 from the first Boot
//            call to LAB-1's two claims, with right and wrong answers at every confidence, own, assisted and agent work,
//            and seen and unseen items. The browser's only record is its events (V2-17), and everything else on a screen is
//            derived from them (I2).
//   mirror   the lab repo's files as `statespace export` would carry them, the read-only mirror the phone screens show
//            (ARCHITECTURE.md section 8.3), each as its path and its text: two statements, the receipts that cover them, and
//            the claim cards CL-1.1 and CL-1.2 as claims/*.yaml. Receipts and claims validate against receipt@1 and claim@1; a
//            statement's hash is the statement-hash@1 rule's (schemas/README.md section 3), and each receipt-import event names
//            its receipt's SHA-256.
// No tool ran to make the receipts: their tool pins and verdict lines are copied from the schema fixture
// schemas/fixtures/receipt/valid/z3-unsat-cross-checked.json, and receipt() below puts in the stage, the date, the check, the claim
// template and each statement's path and hash. The verdict they carry is true of both statements by construction [D]: in
// guard.smt2 the guard `amount <= a` contradicts the violation `a - amount < 0`, and in conservation.smt2 the term
// `(a - amount) + (b + amount)` equals `a + b` for all integers, so neither statement has a model.

import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = join(HERE, '../../../..')
const OUT = join(REPO, 'tests/fixtures/learner-state.json')

const sha256 = (text) => createHash('sha256').update(text).digest('hex')

/** A claim as the lab repo holds it, claims/<id>.yaml: block mappings, double-quoted strings (a JSON string is a YAML one). */
function toYaml(value, indent = 0) {
  const pad = ' '.repeat(indent)
  const scalar = (v) => (typeof v === 'string' ? JSON.stringify(v) : String(v))
  const lines = []
  for (const [k, v] of Object.entries(value)) {
    if (Array.isArray(v) && v.length === 0) lines.push(`${pad}${k}: []`)
    else if (Array.isArray(v)) {
      lines.push(`${pad}${k}:`)
      for (const item of v) {
        const [first, ...rest] = toYaml(item, indent + 4).split('\n').filter(Boolean)
        lines.push(`${pad}  - ${(first ?? '').trimStart()}`, ...rest)
      }
    } else if (v !== null && typeof v === 'object') {
      lines.push(`${pad}${k}:`, toYaml(v, indent + 2).trimEnd())
    } else lines.push(`${pad}${k}: ${scalar(v)}`)
  }
  return `${lines.join('\n')}\n`
}

const { statementHashOfBytes } = await import('../../../../packages/schema/src/index.ts')
/** statement-hash@1 (schemas/README.md section 3), computed by the repository's own implementation. */
const statementHash = (text) => statementHashOfBytes(Buffer.from(text, 'utf8'))

const STATEMENTS = {
  'claims/guard.smt2': `; CL-1.1 (LAB-1.3): the corrected guard never overdraws the sender, over Int.
; Premises, the guard, and the violation. unsat means no such transfer exists.
(set-logic QF_LIA)
(declare-const a Int)
(declare-const b Int)
(declare-const amount Int)
(assert (>= a 0))
(assert (>= b 0))
(assert (> amount 0))
(assert (<= amount a))
(assert (< (- a amount) 0))
(check-sat)
`,
  'claims/conservation.smt2': `; CL-1.2 (LAB-1.5): a transfer conserves the total, over Int.
; The violation asks for a transfer after which the total differs.
(set-logic QF_LIA)
(declare-const a Int)
(declare-const b Int)
(declare-const amount Int)
(assert (>= a 0))
(assert (>= b 0))
(assert (> amount 0))
(assert (<= amount a))
(assert (not (= (+ (- a amount) (+ b amount)) (+ a b))))
(check-sat)
`,
}

const template = JSON.parse(readFileSync(join(REPO, 'schemas/fixtures/receipt/valid/z3-unsat-cross-checked.json'), 'utf8'))

const STATEMENT_HASH = Object.fromEntries(await Promise.all(Object.entries(STATEMENTS).map(async ([path, text]) => [path, await statementHash(text)])))

function receipt({ stage, check, createdAt, statementPath, claimTemplate }) {
  const hash = STATEMENT_HASH[statementPath]
  const r = structuredClone(template)
  r.stage = stage
  r.createdAt = createdAt
  r.statements = [{ path: statementPath, kind: 'smt2', sha256: hash }]
  for (const run of r.runs) {
    run.inputSha256 = hash
    run.argv = run.argv.map((a) => (a.startsWith('claims/') ? statementPath : a))
  }
  r.z3.smtlibSha256 = hash
  r.checks = [{ id: check, pass: true }]
  r.claims = [{ template: claimTemplate }]
  return r
}

const receipts = {
  'receipts/LAB-1.3/lab-1.3-20261105.json': receipt({ stage: 'LAB-1.3', check: 'LAB-1.c3', createdAt: '2026-11-05T19:28:40Z', statementPath: 'claims/guard.smt2', claimTemplate: 'CL-1.1' }),
  'receipts/LAB-1.5/lab-1.5-20261108.json': receipt({ stage: 'LAB-1.5', check: 'LAB-1.c5', createdAt: '2026-11-08T20:39:12Z', statementPath: 'claims/conservation.smt2', claimTemplate: 'CL-1.2' }),
}
const receiptText = (r) => `${JSON.stringify(r, null, 2)}\n`
const receiptHash = Object.fromEntries(Object.entries(receipts).map(([p, r]) => [p, sha256(receiptText(r))]))

const claims = {
  'claims/guard-never-overdraws.yaml': {
    schema: 'statespace/claim@1',
    id: 'guard-never-overdraws',
    template: 'CL-1.1',
    proposition: 'the guarded transfer never overdraws the sender, over Int',
    statement: { path: 'claims/guard.smt2' },
    assumptions: [
      { text: 'balances are unbounded integers', seam: 'SEAM-1' },
      { text: 'the solver is sound', seam: 'SEAM-7' },
    ],
    model: 'two accounts over Int; a transfer debits the sender and credits the recipient',
    method: { receipt: 'receipts/LAB-1.3/lab-1.3-20261105.json' },
    correspondence: { text: 'the SMT-LIB encoding is not checked against code' },
    if_weakened: { text: 'drop the guard amount <= a: a sender holding 0 can send 1 and ends below zero' },
    requirement: { text: 'a transfer never leaves the sender owing money' },
    rests_on: [],
    supersedes: null,
  },
  'claims/transfer-conserves-total.yaml': {
    schema: 'statespace/claim@1',
    id: 'transfer-conserves-total',
    template: 'CL-1.2',
    proposition: 'a transfer conserves the total, over Int',
    statement: { path: 'claims/conservation.smt2' },
    assumptions: [{ text: 'balances are unbounded integers', seam: 'SEAM-1' }],
    model: 'two accounts over Int; the total is their sum',
    method: { receipt: 'receipts/LAB-1.5/lab-1.5-20261108.json' },
    correspondence: { text: 'the SMT-LIB encoding is not checked against code' },
    if_weakened: { text: 'credit the recipient one less than the amount debited: the total drops by one' },
    requirement: { text: 'money is neither created nor destroyed by a transfer' },
    rests_on: [],
    supersedes: null,
  },
}

// ------------------------------------------------------------------------------------------------ events
const DEV = 'dev-fixture'
let n = 0
function ev(day, time, kind, ref, rest = {}) {
  n += 1
  return {
    id: `fx-${String(n).padStart(3, '0')}`,
    v: 1,
    kind,
    ref,
    provenance: 'own',
    exposure: 'unseen',
    at: `${day}T${time}:00Z`,
    tz: 0,
    day,
    dev: DEV,
    ...rest,
  }
}
const Z3 = { engine: 'z3@5.3.1' }
const d2 = '2026-11-02'
const d3 = '2026-11-03'
const d4 = '2026-11-04'
const d5 = '2026-11-05'
const d6 = '2026-11-06'
const d7 = '2026-11-07'
const d8 = '2026-11-08'
const d9 = '2026-11-09'

const events = [
  ev(d2, '08:10', 'call', 'call:S1.L0/c1', { ...Z3, conf: 'think', ok: true, resp: { picked: 'B' }, ms: 41000 }),
  ev(d3, '07:55', 'call', 'call:S1.L1/pq1', { conf: 'guess', ok: false, mis: 'dp:Z1', resp: { picked: 'A' }, ms: 22000 }),
  ev(d3, '08:02', 'call', 'call:S1.L1/pq2', { conf: 'think', ok: true, resp: { picked: 'A' }, ms: 18000 }),
  ev(d3, '08:20', 'call', 'call:S1.L1/c1', { ...Z3, conf: 'sure', ok: false, mis: 'dp:Z5', resp: { picked: 'A' }, ms: 35000 }),
  ev(d3, '08:34', 'item', 'item:GEN-call-it/t1', { ...Z3, seed: 123456789, itemRev: 'r1', conf: 'think', ok: true, ms: 52000 }),
  ev(d3, '08:48', 'item', 'item:GEN-negate-it/t4', { ...Z3, seed: 2025646420, itemRev: 'r1', conf: 'sure', ok: false, mis: 'dp:G1', ms: 64000 }),
  ev(d4, '07:50', 'item', 'item:GEN-negate-it/t4', { ...Z3, seed: 3037119331, itemRev: 'r1', conf: 'think', ok: true, ms: 47000 }),
  ev(d4, '08:05', 'item', 'item:GEN-find-the-witness/t1', { ...Z3, seed: 1011660321, itemRev: 'r1', conf: 'think', ok: true, ms: 91000 }),
  ev(d4, '08:12', 'item', 'item:GEN-call-it/t1', { ...Z3, exposure: 'seen', seed: 123456789, itemRev: 'r1', conf: 'sure', ok: true, ms: 12000 }),
  ev(d5, '19:10', 'lab-check', 'lab-check:LAB-1.c1', { ok: true, data: { status: 'pass' } }),
  ev(d5, '19:10', 'lab-check', 'lab-check:LAB-1.c2', { ok: true, data: { status: 'pass' } }),
  ev(d5, '19:11', 'lab-check', 'lab-check:LAB-1.c3', { ok: true, data: { status: 'pass' } }),
  ev(d5, '19:30', 'receipt-import', `receipt-import:${receiptHash['receipts/LAB-1.3/lab-1.3-20261105.json']}`, { ok: true, data: { sha256: receiptHash['receipts/LAB-1.3/lab-1.3-20261105.json'], lane: 'reported' } }),
  ev(d6, '07:48', 'item', 'item:GEN-which-stamp/t1', { seed: 777000111, itemRev: 'r1', conf: 'think', ok: true, ms: 28000 }),
  ev(d6, '07:55', 'item', 'item:GEN-which-stamp/t1', { provenance: 'assisted', exposure: 'seen', seed: 777000111, itemRev: 'r1', conf: 'guess', ok: false, mis: 'dp:G8', ms: 33000 }),
  ev(d6, '08:12', 'audit', 'audit:AUD-1.1/v1', { conf: 'sure', ok: true, ms: 240000 }),
  ev(d7, '07:40', 'item', 'item:GEN-spot-the-gap/t1', { seed: 52001, itemRev: 'r1', conf: 'think', ok: false, mis: 'dp:G3', ms: 76000 }),
  ev(d7, '07:51', 'item', 'item:GEN-spot-the-gap/t1', { seed: 52002, itemRev: 'r1', conf: 'guess', ok: true, ms: 58000 }),
  ev(d8, '20:05', 'lab-check', 'lab-check:LAB-1.c4', { ok: false, data: { status: 'fail' } }),
  ev(d8, '20:30', 'lab-check', 'lab-check:LAB-1.c4', { ok: true, data: { status: 'pass' } }),
  ev(d8, '20:41', 'receipt-import', `receipt-import:${receiptHash['receipts/LAB-1.5/lab-1.5-20261108.json']}`, { ok: true, data: { sha256: receiptHash['receipts/LAB-1.5/lab-1.5-20261108.json'], lane: 'reported' } }),
  ev(d9, '07:30', 'item', 'item:GEN-call-it/t1', { ...Z3, seed: 4100200300, itemRev: 'r1', conf: 'sure', ok: true, ms: 17000 }),
  ev(d9, '07:36', 'item', 'item:GEN-negate-it/t4', { provenance: 'agent', exposure: 'seen', seed: 3037119331, itemRev: 'r1', ok: true }),
  ev(d9, '07:41', 'note', 'note:1', { exposure: 'seen', resp: { text: 'Re-find the De Morgan slip from S1.L1.' } }),
]

// every file as the lab repo holds it: its path and its text
const claimFiles = Object.fromEntries(Object.entries(claims).map(([path, value]) => [path, toYaml(value)]))
const mirror = [
  ...Object.entries(STATEMENTS).map(([path, text]) => ({ path, kind: 'statement', text, sha256: sha256(text), statementHash: STATEMENT_HASH[path] })),
  ...Object.entries(receipts).map(([path, value]) => ({ path, kind: 'receipt', text: receiptText(value), sha256: receiptHash[path] })),
  ...Object.entries(claimFiles).map(([path, text]) => ({ path, kind: 'claim', text, sha256: sha256(text) })),
]

const fixture = {
  format: 'learner-state/1',
  description:
    'A synthetic learner for GATE-a11y and the Playwright screenshots (DESIGN.md section 12, one fixture). It is test data, not learner data and not a run. events are event@1 records; mirror holds the lab repo files that the read-only mirror shows. See scripts/spikes/W1-T41/README.md.',
  synthetic: true,
  now: '2026-11-09T09:30:00Z',
  device: DEV,
  events,
  mirror,
}

const text = `${JSON.stringify(fixture, null, 2)}\n`
if (process.argv.includes('--check')) {
  let current = ''
  try {
    current = readFileSync(OUT, 'utf8')
  } catch {
    // missing
  }
  if (current !== text) {
    console.error('tests/fixtures/learner-state.json is not what build-learner-state.mjs writes; run it without --check')
    process.exit(1)
  }
  console.log(`learner-state fixture: up to date (${events.length} events, ${mirror.length} mirror files)`)
} else {
  writeFileSync(OUT, text)
  console.log(`wrote tests/fixtures/learner-state.json: ${events.length} events, ${mirror.length} mirror files`)
}
