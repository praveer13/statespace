import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Claim, IR, LedgerEvent, RecordTypes } from '../src/index.ts'

// These checks are for the compiler: `npm run typecheck` fails if a generated type stops accepting a valid
// record or starts accepting an invalid shape. Running them under node:test only confirms the file loads.

test('generated types accept the records the schemas accept', () => {
  const claim: Claim = {
    schema: 'statespace/claim@1',
    id: 'transfer-conserves',
    template: 'CL-2.1',
    proposition: 'total is unchanged by every allowed transfer, over Int',
    statement: { path: 'labs/LAB-2/challenge/Challenge.lean', theorem: 'transfer_conserves' },
    assumptions: [{ text: 'balances are unbounded integers', seam: 'SEAM-1' }],
    model: 'two accounts over Int',
    method: { receipt: 'receipts/LAB-2.2/lab-2.2-20261024.json' },
    correspondence: { text: 'the Lean definition is the semantics' },
    if_weakened: { specimen: 'specimens/sp-2-2.yaml' },
    requirement: { text: 'money is neither created nor destroyed by a transfer' },
    rests_on: [],
    supersedes: null,
  }
  const event: LedgerEvent = {
    id: 'ev-1',
    v: 1,
    kind: 'call',
    ref: 'call:S1.L3/c1',
    provenance: 'own',
    exposure: 'unseen',
    at: '2026-10-24T05:20:00+01:00',
    tz: 60,
    day: '2026-10-24',
    dev: 'dev-9f3a',
  }
  const ir: IR = { schema: 'statespace/ir@1', policy: { zero: 'reject', self: 'allow', guard: 'error', overflow: { mode: 'unbounded' } } }
  const byTag: RecordTypes['statespace/claim@1'] = claim
  assert.equal(byTag.id, 'transfer-conserves')
  assert.equal(event.kind, 'call')
  assert.equal(ir.schema, 'statespace/ir@1')
})

test('generated types reject shapes the schemas reject', () => {
  // @ts-expect-error a claim must carry its requirement row
  const missing: Claim = { schema: 'statespace/claim@1', id: 'a', proposition: 'p', assumptions: [], model: 'm', method: { text: 't' }, correspondence: { text: 'c' }, if_weakened: { text: 'w' } }
  // @ts-expect-error the schema tag is a constant
  const wrongTag: IR = { schema: 'statespace/ir@2' }
  // @ts-expect-error a closed object has no unknown keys: a stamp is never typed into a card
  const stamped: Claim['requirement'] = { text: 'r', stamp: '[P]' }
  // @ts-expect-error provenance is one of four words
  const provenance: LedgerEvent['provenance'] = 'own-ish'
  assert.ok(missing && wrongTag && stamped && provenance)
})
