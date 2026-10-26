// A Stamp is made only by packages/stamps (I2): its brand is a private class field, which an object literal never
// carries, so the compiler refuses a stamp typed by hand and a spread copy of a derived one. The package's typecheck
// (`tsc -p test`) reads every @ts-expect-error below: were one of these lines to type-check as a Stamp, its directive
// would go unused and the typecheck would fail. Where a type check cannot see (a cast, JSON.parse typed as a stamp,
// Object.assign onto a stamp, a copy handed to stampText), GATE-stamps' hand check reads the apps; its self-check
// plants each form.

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { deriveStamp, stampText, type Stamp } from '../src/index.ts'

function derived(): Stamp {
  const d = deriveStamp({ kind: 'smt-unsat', solver: { name: 'Z3', version: '5.3.1' }, rlimit: 5000000 }, { lane: 'reported', source: 'INS-z3' })
  if (d.kind !== 'stamp') throw new Error('an unsat of a violation query derives a stamp')
  return d.stamp
}

test('a spread copy of a derived stamp is not a Stamp, whatever field it changes, and neither is a stamp typed by hand', () => {
  const s = derived()
  // @ts-expect-error a compact view that cuts the qualifier short drops "uncertified"
  const short: Stamp = { ...s, qualifier: s.qualifier.slice(0, 1) }
  // @ts-expect-error a receipt's stamp relabelled as re-checked here claims a lane it never had
  const relabelled: Stamp = { ...s, lane: 'rechecked-here' }
  // @ts-expect-error a spread that drops the open defeaters drops "encoding unverified"
  const clean: Stamp = { ...s, defeaters: [] }
  // @ts-expect-error a spread that changes the word
  const reworded: Stamp = { ...s, word: 'REFUTED' }
  // @ts-expect-error a spread that changes the source
  const moved: Stamp = { ...s, source: 'receipts/other.json' }
  // @ts-expect-error even an unchanged spread copy is no stamp
  const copy: Stamp = { ...s }
  // @ts-expect-error a stamp typed by hand, every field present
  const typed: Stamp = { code: '[P]', word: 'PROVED', qualifier: ['Z3 5.3.1 unsat'], lane: 'reported', source: 's', row: 'smt-unsat', defeaters: [] }

  // the derived stamp is frozen; the copies are plain objects that only a cast could pass off as stamps
  assert.ok(Object.isFrozen(s))
  for (const x of [short, relabelled, clean, reworded, moved, copy, typed]) assert.equal(Object.isFrozen(x), false)
  assert.equal(stampText(s), 'PROVED [P] · Z3 5.3.1 unsat · uncertified · rlimit 5e6')
})
