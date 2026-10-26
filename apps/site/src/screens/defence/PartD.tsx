// Part D, explain-back (ASSESSMENT.md sections 6.1 and 6.7): a two-minute spoken explanation and a three-idea
// self-check. It is required for the Defence to pass and never credited. Nobody grades it, and no model listens: what
// you say stays with you. The self-check is [A] · self-assessed, and it is set beside Part A on the same skills as a
// signal about your own self-grading, never as a score. One explain-back:S{n} event records it.

import { useState } from 'react'
import { GRAPH, kcById } from '@statespace/kc'
import type { LedgerEvent } from '@statespace/ledger'
import type { PartAttempt } from '@statespace/learner/signoff'
import { defenceRef } from '@statespace/learner/signoff'
import { InlineMd } from '../../components/markdown/Markdown.tsx'
import type { LedgerStore } from '../../storage/index.ts'
import type { StagePlan } from './plan.ts'

export function PartD({ plan, partA, store, event }: { readonly plan: StagePlan; readonly partA: PartAttempt | null; readonly store: LedgerStore | null | undefined; readonly event: LedgerEvent | null }) {
  const [said, setSaid] = useState(false)
  const [ticks, setTicks] = useState<boolean[]>([false, false, false])
  const [state, setState] = useState<'idle' | 'writing' | 'failed'>('idle')
  const recorded = event !== null ? ((event.resp as { ideas?: unknown } | undefined)?.ideas as boolean[] | undefined) : undefined

  const write = async () => {
    if (!said || store === null || store === undefined) return
    setState('writing')
    try {
      await store.record({ kind: 'explain-back', ref: defenceRef(plan.stage, 'D', 0, ''), provenance: 'own', exposure: 'unseen', resp: { spoken: true, ideas: ticks }, data: { stage: plan.stage, ideas: plan.ideas.map((i) => i.kc) } })
      setState('idle')
    } catch {
      setState('failed')
    }
  }

  return (
    <div className="dfn-partd">
      <div className="question">
        <h3 className="exercise-head">
          <span className="exercise-word">Explain back</span> <span className="exercise-n">D</span> <span className="exercise-role">· aloud, about two minutes, with nothing open</span>
        </h3>
        <p className="dfn-prompt">
          <InlineMd text={plan.explain} />
        </p>
        <p className="dfn-note">Say it to yourself, a rubber duck or a recording on your own device. Nothing here listens or uploads. When you have finished, and not before, read the three ideas and mark the ones you said.</p>
        {event === null ? (
          <>
            <label className="dfn-help">
              <input type="checkbox" checked={said} onChange={(e) => setSaid(e.target.checked)} /> I have explained it aloud
            </label>
            <fieldset className="dfn-ideas" disabled={!said || state === 'writing'}>
              <legend className="dfn-legend">The three ideas: which did you say?</legend>
              {plan.ideas.map((idea, i) => (
                <label key={idea.kc} className="dfn-idea" data-picked={ticks[i] || undefined}>
                  <input type="checkbox" checked={ticks[i] ?? false} onChange={(e) => setTicks((t) => t.map((x, j) => (j === i ? e.target.checked : x)))} />
                  <span>
                    <InlineMd text={idea.text} />
                  </span>
                </label>
              ))}
            </fieldset>
            <div className="actions">
              <button type="button" className="button button-primary" disabled={!said || state === 'writing'} onClick={() => void write()}>
                Keep the self-check
              </button>
              {!said ? <span className="question-need">Explain it aloud first.</span> : null}
              {state === 'failed' ? <span className="question-need">It was not saved. Try again.</span> : null}
            </div>
          </>
        ) : (
          <SelfCheck plan={plan} ideas={recorded ?? [false, false, false]} partA={partA} />
        )}
      </div>
    </div>
  )
}

/** The self-check beside Part A on the same skills: a calibration signal, never a score. */
function SelfCheck({ plan, ideas, partA }: { readonly plan: StagePlan; readonly ideas: readonly boolean[]; readonly partA: PartAttempt | null }) {
  const marked = ideas.filter(Boolean).length
  return (
    <div role="status" className="dfn-selfcheck">
      <p className="dfn-plain">
        Kept. You marked {marked} of 3 ideas. <span className="dfn-code">[A]</span> self-assessed: it counts toward nothing, and the Defence needs only that it exists.
      </p>
      <table className="dfn-table">
        <caption>Your self-check beside Part A on the same skill</caption>
        <thead>
          <tr>
            <th scope="col">Idea</th>
            <th scope="col">You said it</th>
            <th scope="col">Part A on its skill</th>
          </tr>
        </thead>
        <tbody>
          {plan.ideas.map((idea, i) => {
            const items = partA?.items.filter((x) => x.kc === idea.kc) ?? []
            const right = items.filter((x) => x.credited).length
            return (
              <tr key={idea.kc}>
                <th scope="row">
                  <InlineMd text={kcById(GRAPH, idea.kc)?.name ?? idea.kc} />
                </th>
                <td>{ideas[i] ? 'yes' : 'no'}</td>
                <td className="num">{items.length === 0 ? 'no probe on it' : `${right} of ${items.length}`}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
