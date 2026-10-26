// GATE-items on the Call It fixtures (W1-T07's acceptance): the lesson pages of fixtures/tree/ and the generated instances of
// fixtures/generated/ are read by the gate's own discovery, the content build's reader and its instance reader, and judged by
// its rules. The gate must pass them, and it must not pass them blindly: each fault planted in a scratch copy of the fixtures is
// a finding of the rule it breaks, on the item it breaks it on.

import assert from 'node:assert/strict'
import test from 'node:test'
import { cleanup, gateOnInstances, gateOnPages, loadInstances, scratchRoot } from '../../../../../../scripts/spikes/W1-T07/lib/items-gate.mjs'

const onPages = async (edit) => {
  const root = scratchRoot(edit)
  try {
    return await gateOnPages(root)
  } finally {
    cleanup(root)
  }
}
const sameFindings = (r) => r.findings.map((f) => `${f.rule}/${f.check} ${f.ref ?? f.pool}`)

test('GATE-items is green on the authored Call It fixtures: three pages, seven calls, 5 of 7 genuine surprises, no verdict over 60%', async () => {
  const r = await onPages()
  assert.deepEqual(sameFindings(r), [])
  assert.deepEqual(r.notes, [])
  assert.deepEqual(r.model.pages.map((p) => p.id), ['S1.L1', 'S1.L2', 'S1.L3'])
  assert.deepEqual(r.pools, [{ id: 'stage:S1/authored', kind: 'authored', n: 7, calls: 7, surprises: 5 }])
  const calls = r.model.pages.flatMap((p) => p.calls)
  assert.equal(calls.length, 7)
  const verdicts = Object.fromEntries(['violated', 'holds', 'unknown', 'value'].map((v) => [v, calls.filter((c) => c.keyVerdict === v).length]))
  assert.deepEqual(verdicts, { violated: 1, holds: 3, unknown: 2, value: 1 })
  assert.ok(Math.max(...Object.values(verdicts)) / calls.length <= 0.6)
  // every call is read from a page the content build's reader accepted, with its options, whys and keys
  for (const c of calls) {
    assert.ok(c.options.length >= 2 && c.keys.length === 1, c.ref)
    assert.ok(c.options.every((o) => o.why), `${c.ref}: every option has a why`)
  }
})

test('GATE-items is green on the generated Call It fixtures: the four templates, three verdicts, sets of 2 and 3 true in 5', async () => {
  const r = await gateOnInstances()
  assert.deepEqual(sameFindings(r), [])
  assert.deepEqual(r.notes, [])
  const f = r.model.families[0]
  assert.deepEqual(f.live, ['t1', 't2', 't3', 't4'])
  assert.equal(f.items.length, 8)
  assert.deepEqual(f.items.filter((i) => i.kind === 'choice' && i.template === 't1').map((i) => i.keyVerdict).sort(), ['holds', 'unknown', 'violated'])
  assert.deepEqual(f.items.filter((i) => i.kind === 'multi-tf').map((i) => i.statements.filter((s) => s.truth).length), [2, 3])
  assert.equal(f.items.filter((i) => i.kind === 'multi-tf').every((i) => i.statements.length === 5), true)
})

// ---- the gate reads these fixtures: a fault in the pages is a finding

const edits = {
  'an option with no why': ['S1.L1', '  - why: Three linear integer constraints are decided outright.\n  - mis: dp:Z6\n', '  - mis: dp:Z6\n', 'why-tag/why', 'cell:S1.L1#1'],
  'a distractor with no misconception key': ['S1.L1', "  - why: Three linear integer constraints are decided outright.\n  - mis: dp:Z6\n", '  - why: Three linear integer constraints are decided outright.\n', 'why-tag/tag', 'cell:S1.L1#1'],
  'a misconception key the registry does not hold': ['S1.L1', '  - mis: dp:Z6\n', '  - mis: dp:Z99\n', 'why-tag/registered', 'cell:S1.L1#1'],
  'a key far longer than its distractors': ['S1.L1', '- A. `1`\n  - why: The minimizer', "- A. `1` after the minimizer sets the sender's balance to 0 and the amount to 1 in the first witness it finds\n  - why: The minimizer", 'length/ratio', 'cell:S1.L1#2'],
  'two options that read the same': ['S1.L2', '- B. no verdict: `unknown`', '- B. proved: `unsat`', 'distinct/text', 'cell:S1.L2#2'],
}
for (const [name, [page, find, replace, pair, ref]] of Object.entries(edits)) {
  test(`planted in the pages: ${name} is ${pair} on ${ref}`, async () => {
    let hit = 0
    const r = await onPages((id, text) => {
      if (id !== page) return text
      assert.ok(text.includes(find), `the fixture still holds the text the plant replaces: ${find.slice(0, 40)}`)
      hit += 1
      return text.replace(find, replace)
    })
    assert.equal(hit, 1)
    assert.ok(sameFindings(r).includes(`${pair} ${ref}`), `${pair} on ${ref} in ${JSON.stringify(sameFindings(r))}`)
  })
}

test('planted in the pages: keys moved so that unsat answers 5 of 7 calls is calls/balance on the stage', async () => {
  const r = await onPages((id, text) => (id === 'S1.L2' ? text.replace('@call key=C surprise=yes', '@call key=B surprise=yes').replace('@call key=B surprise=yes run=RUN-z3-budget-pyodide', '@call key=A surprise=yes run=RUN-z3-budget-pyodide') : text))
  assert.ok(r.findings.some((f) => f.rule === 'calls' && f.check === 'balance' && f.pool === 'stage:S1/authored'), JSON.stringify(sameFindings(r)))
})

test('planted in the pages: a call that every segment reads as a first run, all keyed `sat`, is calls/surprises on the stage', async () => {
  // keys that follow the narrative-blind strategy (violated on a first run) leave no genuine surprise
  const r = await onPages((id, text) => text.replace(/@call key=[A-C]/g, '@call key=A').replace(/- A\. `?[^\n]*\n/g, (m) => m))
  assert.ok(r.findings.some((f) => f.rule === 'calls'), JSON.stringify(sameFindings(r)))
})

// ---- and in the generated instances

const mutate = (fn) => {
  const entries = structuredClone(loadInstances())
  fn(entries)
  return entries
}
const onInstances = (fn) => gateOnInstances(mutate(fn))
const set = (entries) => entries.find((e) => e.instance.template === 't4')
const verdict = (entries) => entries.find((e) => e.instance.template === 't1')

test('planted in the instances: a statement with no why is why-tag/why, a false statement with no key is why-tag/tag, an unregistered key is why-tag/registered', async () => {
  const noWhy = await onInstances((es) => { set(es).instance.item.parts[0].statements[0].why = '' })
  assert.ok(noWhy.findings.some((f) => f.rule === 'why-tag' && f.check === 'why'), JSON.stringify(sameFindings(noWhy)))
  const noTag = await onInstances((es) => { set(es).instance.item.parts[0].statements[1].origin = { kind: 'mutant', operator: 'x' } })
  assert.ok(noTag.findings.some((f) => f.rule === 'why-tag' && f.check === 'tag'), JSON.stringify(sameFindings(noTag)))
  const bogus = await onInstances((es) => { set(es).instance.item.parts[0].statements[1].origin = { kind: 'mutant', tag: 'dp:Z99', operator: 'x' } })
  assert.ok(bogus.findings.some((f) => f.rule === 'why-tag' && f.check === 'registered'), JSON.stringify(sameFindings(bogus)))
})

test('planted in the instances: a set whose statements are all true scores nothing for guessing and is multi-tf/count; a pool that is mostly true breaks the share', async () => {
  const all = await onInstances((es) => { for (const s of set(es).instance.item.parts[0].statements) s.origin = { kind: 'reference' } })
  assert.ok(all.findings.some((f) => f.rule === 'multi-tf' && f.check === 'count'), JSON.stringify(sameFindings(all)))
  const mostly = await onInstances((es) => {
    for (const e of es.filter((x) => x.instance.template === 't4')) for (const s of e.instance.item.parts[0].statements.slice(0, 4)) s.origin = { kind: 'reference' }
  })
  assert.ok(mostly.findings.some((f) => f.rule === 'multi-tf' && f.check === 'share'), JSON.stringify(sameFindings(mostly)))
})

test('planted in the instances: three-way verdicts that all key `sat` are calls/generated-balance, and always-last is not tripped by a key that moves', async () => {
  const lopsided = await onInstances((es) => {
    // value keys (an interval, an anomaly) count in the denominator and are no verdict: two more verdict items put `sat` over 60% of the calls
    for (const extra of [1, 2]) {
      const c = structuredClone(es.find((x) => x.instance.template === 't1'))
      c.instance.seed += extra
      es.push(c)
    }
    for (const e of es.filter((x) => x.instance.template === 't1')) {
      const p = e.instance.item.parts[0]
      const keyed = p.options.find((o) => o.text === '`sat`')
      for (const o of p.options) o.origin = o === keyed ? { kind: 'reference' } : { kind: 'mutant', tag: 'dp:Z1', operator: 'x' }
      e.key.choices[0].answer = keyed.id
    }
  })
  assert.ok(lopsided.findings.some((f) => f.rule === 'calls' && f.check === 'generated-balance'), JSON.stringify(sameFindings(lopsided)))
  const clean = await gateOnInstances()
  assert.equal(clean.findings.some((f) => f.rule === 'blind'), false)
})

test('planted in the instances: a key longer than its distractors in an interval or an anomaly question is length/ratio', async () => {
  const long = await onInstances((es) => {
    const t3 = es.find((x) => x.instance.template === 't3')
    const p = t3.instance.item.parts[0]
    const key = p.options.find((o) => o.origin.kind === 'reference')
    key.text = 'write skew, in which two transactions each read the same data and then write different rows'
  })
  assert.ok(long.findings.some((f) => f.rule === 'length'), JSON.stringify(sameFindings(long)))
  assert.ok(verdict(loadInstances()))
})
