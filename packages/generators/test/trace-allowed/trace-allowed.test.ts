import assert from 'node:assert/strict'
import { test } from 'node:test'
import { drawInstance, isDiscard } from '../../src/core/index.ts'
import type { Band, ChoicePart, KeyBase, TemplateId } from '../../src/core/index.ts'
import { enabledAfter, generator, judgeSequence, ports, replayTrace, traceAnswers } from '../../src/trace-allowed/index.ts'
import type { TraceAllowedInstance, TraceValue } from '../../src/trace-allowed/index.ts'
import { explore, initial } from '../../src/trace-allowed/model.ts'
import type { WorkerModel, WState } from '../../src/trace-allowed/model.ts'

const port = { run: (req: Parameters<(typeof ports)[string]['run']>[0]) => (ports[req.engine] as (typeof ports)[string]).run(req) } as (typeof ports)[string]
const RECORDED: WorkerModel = { init: 100, amount: 80, workers: 2, steps: 2 }
const trace = (actions: string[], claim = actions.length): TraceValue => ({ kind: 'trace', steps: actions.map((a) => [a]), claim })

test('the explorer agrees with TLC on the full DoubleSpend space at Init 100, Amount 80 (RUN-tlc-full)', () => {
  // distinct, generated, depth for 2, 3 and 4 workers, as RUN-tlc-full records them.
  const want: Record<number, [number, number, number]> = { 2: [11, 13, 5], 3: [45, 67, 7], 4: [191, 361, 9] }
  for (const [w, [distinct, generated, depth]] of Object.entries(want)) {
    const g = explore({ ...RECORDED, workers: Number(w) }, 10_000)
    assert.ok(g)
    assert.deepEqual([g.distinct, g.generated, g.depth], [distinct, generated, depth], `${w} workers`)
  }
})

test('the recorded double spend replays as a 4-action violating behavior; program order never overspends', () => {
  const g = explore(RECORDED, 10_000)
  assert.ok(g)
  // RUN-tlc-doublespend: Read(w1), Read(w2), Write(w1), Write(w2), 4 actions over 5 states, spent = 160.
  const v = trace(['Read(w1)', 'Read(w2)', 'Write(w1)', 'Write(w2)'])
  const r = replayTrace(RECORDED, g, v)
  assert.equal(r.allowed, true)
  assert.equal(r.violatesAt, 4)
  assert.equal(r.end?.spent, 160)
  assert.equal(traceAnswers(RECORDED, g, v), true)
  assert.equal(traceAnswers(RECORDED, g, { ...v, claim: 5 }), false, 'a length counted in states is wrong')
  // ASSESSMENT.md 4.8's never-violating prefix: Read(w1), Write(w1), Read(w2); w2 reads 20 and stops.
  const safe = replayTrace(RECORDED, g, trace(['Read(w1)', 'Write(w1)', 'Read(w2)']))
  assert.equal(safe.allowed, true)
  assert.equal(safe.violatesAt, null)
  assert.deepEqual(safe.end?.pc, ['done', 'done'])
  // A write before its read is no step of Next; two actions as one step is none either.
  assert.equal(replayTrace(RECORDED, g, trace(['Write(w1)'])).allowed, false)
  assert.equal(replayTrace(RECORDED, g, { kind: 'trace', steps: [['Read(w1)', 'Read(w2)']], claim: 1 }).allowed, false)
})

test('enabled sets and stuttering, worked by hand', () => {
  const g = explore(RECORDED, 10_000)
  assert.ok(g)
  assert.deepEqual(enabledAfter(g, []), ['Read(w1)', 'Read(w2)'])
  assert.deepEqual(enabledAfter(g, ['Read(w1)']), ['Read(w2)', 'Write(w1)'])
  assert.deepEqual(enabledAfter(g, ['Read(w1)', 'Write(w1)', 'Read(w2)']), [], 'w2 read 20 and stopped: only stuttering remains')
  const s0 = initial(RECORDED)
  const s1: WState = { ...s0, pc: ['write', 'read'], seen: [100, 0] }
  const s2: WState = { ...s1, pc: ['write', 'write'], seen: [100, 100] }
  assert.deepEqual(judgeSequence(g, [s0, s1, s1, s2, s2]), { kind: 'verdict', yes: true }, 'repeated states are stuttering steps')
  assert.deepEqual(judgeSequence(g, [s0, s2]), { kind: 'verdict', yes: false, reason: 'jump', at: 1 }, 'a skipped state is two actions')
  assert.deepEqual(judgeSequence(g, [s1]), { kind: 'verdict', yes: false, reason: 'jump', at: 0 }, 'a behavior starts in an initial state')
})

test('every template and band: the checker confirms the reference and every distractor misses with its tag', async () => {
  for (const t of ['t1', 't2', 't3'] as TemplateId[]) {
    for (const band of [1, 2, 3] as Band[]) {
      for (let seed = 1; seed <= 12; seed++) {
        const out = await drawInstance(generator, port, { seed: seed * 7919, band, template: t })
        assert.equal(out.status, 'drawn', `${t} b${band} seed ${seed}`)
        if (out.status !== 'drawn') continue
        const inst = out.instance as TraceAllowedInstance
        assert.deepEqual(generator.make(inst.seed, band, t), inst, 'make is deterministic')
        const k = await generator.key(inst, port)
        assert.ok(!isDiscard(k))
        const part = inst.item.parts[0] as ChoicePart
        const ref = part.options.find((o) => o.origin.kind === 'reference')
        assert.equal((k as KeyBase).choices[0]?.answer, ref?.id)
        for (const o of part.options) {
          const g = await generator.grade(inst, { main: o.id }, k as never, port)
          if (o.origin.kind === 'reference') assert.equal(g.ok, true)
          else {
            assert.equal(g.ok, false)
            assert.equal(g.misconception, o.origin.tag)
            assert.match(g.bound ?? '', /complete state graph of DoubleSpend/)
          }
        }
      }
    }
  }
})
