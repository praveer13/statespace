import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { isOptimizeBlock, locateBlock, modelPairs, printedMinimum, readCore, readMinimum, readVerdict, replayOf, replayedValues, startsQuery } from '../model/blocks.ts'
import { REPO } from './helpers.mjs'

const run = (id) => JSON.parse(fs.readFileSync(path.join(REPO, 'runs', `${id}.json`), 'utf8')).verdict_lines

test('a query is found by the label of its verdict line, in every form the harnesses print', () => {
  // W0's harness: `[label] verdict`, with a model that continues over indented lines
  const bv = locateBlock(run('RUN-z3-bv64'), '1.5 BitVec64 signed: guarded DESTINATION wrap')
  assert.ok(bv.ok)
  assert.equal(bv.lines.length, 3)
  assert.match(bv.lines[0], /^\[1\.5 BitVec64 signed: guarded DESTINATION wrap\] sat/)
  assert.match(bv.lines[2], /^ X = 4194304\]$/)
  // W1's harness: the indented replay line belongs to the block
  const boot = locateBlock(run('RUN-z3-boot-variant'), 'variant_violation')
  assert.ok(boot.ok)
  assert.equal(boot.lines.length, 2)
  assert.match(boot.lines[1], /^\s+replay ok: /)
  // the Pyodide harness: `name verdict [model]`, and the budget harness's `<n>ms py: name verdict reason`
  assert.ok(locateBlock(run('RUN-z3-bv64-pyodide'), 'recipient-wrap').ok)
  const budget = locateBlock(run('RUN-z3-budget-pyodide'), 'rlimit-case')
  assert.ok(budget.ok)
  assert.match(budget.lines[0], /^2806ms py: rlimit-case unknown canceled/)
  // a name followed by a colon
  assert.ok(startsQuery('corrected_guard: unsat', 'corrected_guard'))
  // a run that prints no verdict for the query: the line is still the query's, and the label shows it as raw text
  const timeout = locateBlock(run('RUN-z3-budget-pyodide'), 'timeout-case')
  assert.ok(timeout.ok)
  assert.equal(readVerdict(timeout.lines), null)
})

test('a query names exactly one line: a missing name, a name in two lines and a longer name are refused', () => {
  const lines = ['[a_query] sat [x = 1]', '[a_query_longer] unsat', '  replay ok: x=1: x > 0 ok', '[twice] sat', '[twice] unsat']
  assert.ok(!locateBlock(lines, 'nope').ok)
  assert.match(locateBlock(lines, 'twice').problem, /2 verdict lines/)
  // `a_query` is not a prefix match of `a_query_longer`, and the block of `a_query_longer` carries its own replay line
  const longer = locateBlock(lines, 'a_query_longer')
  assert.ok(longer.ok)
  assert.equal(longer.lines.length, 2)
  assert.equal(locateBlock(lines, 'a_query').lines.length, 1)
  // an indented line never starts a block, and the empty name matches nothing
  assert.ok(!startsQuery('  [a_query] sat', 'a_query'))
  assert.ok(!startsQuery('[a_query] sat', ''))
})

test('a witness replays only when a line says replay ok, and a failure wins over an ok', () => {
  assert.equal(replayOf(['[q] sat [x = 1]', '  replay ok: x=1: x > 0 ok']), 'replayed')
  assert.equal(replayOf(['[sp_1_1_starter] replay ok: a=0: a >= 0 ok']), 'replayed')
  assert.equal(replayOf(['[q] sat [x = 1]']), 'pending')
  assert.equal(replayOf(['[q] sat [x = 1]', '  replay FAILED: x=1: x > 5 FAILED']), 'failed')
  assert.equal(replayOf(['  replay ok: x=1: ok', '  replay FAILED: y=2: nope']), 'failed')
  // the word inside a model or a sentence is not a replay line
  assert.equal(replayOf(['[q] sat [replay = 1]', 'note: nothing replay ok']), 'pending')
})

test('a model is split into its assignments, in the order printed, and a bracket keeps its commas', () => {
  assert.deepEqual(modelPairs('[b = 0, amount = 1, a = 0]'), [['b', '0'], ['amount', '1'], ['a', '0']])
  assert.deepEqual(modelPairs('[f = [1 -> 2, else -> 0], status = HELD]'), [['f', '[1 -> 2, else -> 0]'], ['status', 'HELD']])
  assert.deepEqual(modelPairs('[]'), [])
  assert.deepEqual(modelPairs(''), [])
  const v = readVerdict(locateBlock(run('RUN-z3-bv64'), '1.5 BitVec64 signed: guarded DESTINATION wrap').lines)
  assert.deepEqual(modelPairs(v.model), [['A', '9223372036854775806'], ['B', '9223372036850581504'], ['X', '4194304']])
})

test('the values a replay line checks are the name=value tokens before its first colon', () => {
  const lines = locateBlock(run('RUN-specimens-replay'), 'sp_1_4_recipient_wrap').lines
  assert.deepEqual([...replayedValues(lines)], [['A', '9223372036854775806'], ['B', '9223372036850581504'], ['X', '4194304']])
  // later tokens, an inequality and a sentence are not values
  const w1 = replayedValues(['[q] sat', '  replay ok: held=2 h=1 merchant=0: state before: h > 0, held >= h, merchant gains 2 > h=1 ok'])
  assert.deepEqual([...w1], [['held', '2'], ['h', '1'], ['merchant', '0']])
  assert.equal(replayedValues(['[q] sat [x = 1]']).size, 0)
})

test('a minimum is read where W1 prints it and in the model where W0 does', () => {
  assert.equal(readMinimum(locateBlock(run('RUN-z3-double-capture'), 'minimize_hold').lines, 'h'), '1')
  // the objective of the refund query is a quantity that is no variable of the model: only the printed minimum has it
  assert.equal(readMinimum(locateBlock(run('RUN-z3-refund-mint'), 'minimize_minted').lines, 'minted'), '1')
  assert.equal(readMinimum(locateBlock(run('RUN-z3-optimize-min'), 'S1.2 minimal amount via Optimize').lines, 'amount'), '1')
  assert.equal(readMinimum(['[q] sat [amount = 1]'], 'size'), null)
  assert.equal(readMinimum(['[q] unsat'], 'amount'), null)
  // a different objective's minimum is not the objective's: the model's value of x is no minimum when h is what was minimized
  assert.equal(readMinimum(['[q] sat minimum h = 7 [h = 7, x = 1]'], 'x'), null)
  assert.equal(readMinimum(['[q] sat minimum h = 7 [h = 7, x = 1]'], 'h'), '7')
  assert.deepEqual(printedMinimum(['[q] sat minimum h = 7 [h = 7, x = 1]']), { objective: 'h', value: '7' })
  assert.deepEqual(printedMinimum(locateBlock(run('RUN-z3-refund-mint'), 'minimize_minted').lines), { objective: 'minted', value: '1' })
  assert.equal(printedMinimum(['[S1.2 minimal amount via Optimize] sat [amount = 1]']), null)
  assert.equal(printedMinimum(['[q] unsat']), null)
  assert.ok(isOptimizeBlock(['[S1.2 minimal amount via Optimize] sat [amount = 1]']))
  assert.ok(isOptimizeBlock(['[q] sat minimum h = 1 [h = 1]']))
  assert.ok(!isOptimizeBlock(['[1.2 starter: overdraft search] sat (0.00s) [b = 0, amount = 1, a = 0]']))
})

test('an unsat core is read with its own check, and a core without the check is not minimal', () => {
  const core = readCore(locateBlock(run('RUN-z3-vacuous-unsat'), 'max0_range_core').lines)
  assert.deepEqual(core, { members: ['amount_le_max_transfer', 'amount_positive'], minimal: true })
  assert.deepEqual(readCore(["[q] unsat unsat_core=['a']"]), { members: ['a'], minimal: false })
  assert.equal(readCore(['[q] unsat']), null)
})
