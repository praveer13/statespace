// The S3 lesson cells of INS-interp, run as the lessons write them. The keys are the lessons' own.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runCell } from '../src/index.ts'

const texts = (cell: string) => runCell(cell).map((l) => l.text)

test('S3.L3 cell 1: a self-transfer commits and notifies a', () => {
  const [, call] = texts('start    mint -10 · a 10\nTransfer(a, a, 5)')
  assert.match(call!, /→ {2}ok · mint -10 · a 10 · notify a/)
})

test('S3.L3 cell 2: zero is badArgument "amount", decided at step 2', () => {
  const [, call] = texts('start    mint -100 · a 100 · b 0\nTransfer(a, b, 0)')
  assert.match(call!, /badArgument "amount"  \[decided at step 2/)
})

test('S3.L2 cell 1: Pay is rejected by unguardedDebit', () => {
  const [line] = texts('command Pay(from: account, to: account, amount: amount)\n  requires balance(to) >= amount\n  do move amount from from to to')
  assert.equal(line, 'Pay: rejected by unguardedDebit')
})

test('S3.L2 cell 2: hold, capture to sink, then release is holdNotOpen', () => {
  const lines = texts('start    mint -100 · a 100 · sink 0\n1   hold 30 on a\n2   capture h to sink\n3   release h')
  assert.match(lines.find((l) => l.startsWith('3'))!, /holdNotOpen 0/)
})

test('S3.L7 cell 1: overflow unbounded commits 2^63', () => {
  const lines = texts('policy   zero = reject · self = allow · guard = error · overflow = unbounded\nstart    mint -(2^63 - 1) · a 2^63 - 1 · b 0\n  Deposit(a, 1)')
  assert.match(lines.at(-1)!, /a 9223372036854775808/)
})

test('S3.L7 cell 3: guard silent turns guardFailed into an unchanged commit', () => {
  const lines = texts('before   zero = reject · self = allow · guard = error  · overflow = unbounded\nafter    zero = reject · self = allow · guard = silent · overflow = unbounded\nstart    mint -100 · a 100 · b 0\n  Transfer(a, b, 130)')
  assert.match(lines[1]!, /guardFailed "Transfer"/)
  assert.match(lines[2]!, /→ {2}ok · mint -100 · a 100 · b 0  \[decided at step 5/)
})

test('S3.L9 cell 1: force move type-checks and drives a to -1', () => {
  const lines = texts('command ForcePay(from, to, amount)\n  do force move amount from from to to\n\nstart    mint 0 · a 0 · b 0\n  ForcePay(a, b, 1)')
  assert.equal(lines[0], 'ForcePay: type-checks')
  assert.match(lines.at(-1)!, /ok · mint 0 · a -1 · b 1 · notify b/)
})
