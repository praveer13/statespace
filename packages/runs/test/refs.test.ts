import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { FACT_ID, isPlaceholder, maskReferences, referencesIn, RUN_ID } from '../src/index.ts'
import { ROOT } from './helpers.ts'

test('a tag with paths, a template with a path, a citation and a fact reference', () => {
  const text = 'TLC finds 11 [X RUN-tlc-full#values.distinct_states.w2, RUN-tlc-full] and {{run:RUN-z3-starter#values.model}}; see {{run:RUN-scaffold}} and {{fact:tool.pyodide.latest}}.'
  const refs = referencesIn(text).map((r) => [r.form, r.id, r.path])
  assert.deepEqual(refs, [
    ['tag', 'RUN-tlc-full', 'values.distinct_states.w2'],
    ['tag', 'RUN-tlc-full', null],
    ['template', 'RUN-z3-starter', 'values.model'],
    ['template', 'RUN-scaffold', null],
    ['fact', 'tool.pyodide.latest', null],
  ])
})

test('a path may hold a parenthesised argument list with a comma: values.canread(1,3)', () => {
  const [r] = referencesIn('Fixedpoint derives it [X RUN-z3-fixedpoint#values.canread(1,3)].')
  assert.equal(r?.id, 'RUN-z3-fixedpoint')
  assert.equal(r?.path, 'values.canread(1,3)')
})

test('code spans: a placeholder there is a format mention; a real ID there is still a reference', () => {
  const refs = referencesIn('Write `[X RUN-id#values.<name>]` or `{{run:RUN-id#values.<name>}}`, as in `{{run:RUN-pg-catalog#values.t1_recorded}}`; `{{fact:<id>}}` too.')
  assert.deepEqual(
    refs.map((r) => [r.id, r.inCode, isPlaceholder(r)]),
    [
      ['RUN-id', true, true],
      ['RUN-id', true, true],
      ['RUN-pg-catalog', true, false],
      ['<id>', true, true],
    ],
  )
  // RUN-id and ID name the format anywhere, as in GATE-runs; {{run:}} with no ID names the form itself.
  assert.equal(isPlaceholder(referencesIn('the {{run:RUN-id}} form')[0]!), true)
  assert.equal(isPlaceholder(referencesIn('the {{run:}} form')[0]!), true)
})

test('maskReferences keeps every offset', () => {
  const text = 'It finds 11 [X RUN-tlc-full#values.distinct_states.w2] states, {{run:RUN-a#values.b}}.'
  const masked = maskReferences(text)
  assert.equal(masked.length, text.length)
  assert.equal(masked.indexOf('11'), text.indexOf('11'))
  assert.ok(!masked.includes('RUN-'))
})

test('the ID grammars', () => {
  for (const ok of ['RUN-tlc-full', 'RUN-z3-bv64-pyodide', 'RUN-lean-asset']) assert.ok(RUN_ID.test(ok), ok)
  for (const bad of ['RUN-', 'RUN-Tlc', 'run-tlc', 'RUN-tlc--full', 'RUN-tlc_full']) assert.ok(!RUN_ID.test(bad), bad)
  for (const ok of ['tool.pyodide.latest', 'incident.lean-kernel-14576', 'twin.lean4.toolchain']) assert.ok(FACT_ID.test(ok), ok)
  for (const bad of ['tool', 'Tool.x', 'tool..x', 'tool.x.', 'tool.x_y']) assert.ok(!FACT_ID.test(bad), bad)
})

test('on every document of the tree, the run references agree with the ones GATE-runs reads', async () => {
  // GATE-runs' own reader (scripts/runs/registry.mjs) works line by line; so does this comparison.
  const reg = (await import(join(ROOT, 'scripts', 'runs', 'registry.mjs'))) as {
    referencesOf: (text: string) => Array<{ form: string; id: string; line: number }>
  }
  const numbers = (await import(join(ROOT, 'scripts', 'runs', 'numbers-rules.mjs'))) as { listFiles: (root: string) => string[] }
  let compared = 0
  for (const file of numbers.listFiles(ROOT)) {
    const text = readFileSync(join(ROOT, file), 'utf8')
    const theirs = reg.referencesOf(text).map((r) => `${r.line} ${r.form} ${r.id}`)
    const ours: string[] = []
    text.split('\n').forEach((line, i) => {
      if (/^\s*(```|~~~)/.test(line)) return // GATE-runs skips the fence lines themselves
      for (const r of referencesIn(line)) if (r.form !== 'fact') ours.push(`${i + 1} ${r.form} ${r.id}`)
    })
    assert.deepEqual(ours.sort(), theirs.sort(), file)
    compared += theirs.length
  }
  assert.ok(compared > 1000, `compared ${compared} references`)
})
