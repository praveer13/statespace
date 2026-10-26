// The Defence section of a stage page (SCR-stage): where the stage's Defence stands, from the record, and the way in.
// It never gates anything on the page around it.

import { Link } from 'react-router'
import { useEvents, useStore } from '../../app/ledger.ts'
import { planOf } from './plan.ts'
import { Standing } from './Standing.tsx'
import { useDefence } from './useDefence.ts'
import './defence.css'

export function StageDefence({ stage, lab }: { readonly stage: string; readonly lab: string | null }) {
  const store = useStore()
  const ev = useEvents(store)
  const view = useDefence(stage, ev.status === 'ready' ? ev.events : ev.status === 'unavailable' ? [] : null)
  const plan = planOf(stage)
  if (plan === undefined) return null
  return (
    <section aria-labelledby="stage-defence" className="dfn-stage">
      <h2 id="stage-defence">Defence</h2>
      <p className="lede">
        Four parts sign the stage off: {plan.aSize} probes on unseen seeds, {plan.bSize} mutations of your own {lab ?? 'lab'} artifact predicted first, four audit cases with at least one sound, and an explain-back. Untimed, over at least two sittings, in the week after the lab.
      </p>
      {view !== null ? <Standing view={view} compact /> : <p className="meta">Reading your record…</p>}
      <p className="actions">
        <Link to={`/defence/${stage}`} className="button button-primary">
          Open the {stage} Defence
        </Link>
      </p>
    </section>
  )
}
