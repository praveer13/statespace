// /defence: every stage's Defence as a ruled list, with where each stands, derived from the record. Every one opens.

import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { deriveDefence } from '@statespace/learner/signoff'
import { loadStages, useLoaded } from '../../app/content.ts'
import { useEvents, useStore } from '../../app/ledger.ts'
import { useTitle } from '../../app/title.ts'
import { Failed, Loading } from '../../components/page/states.tsx'
import { splitTitle } from '../../components/volume/volumes.ts'
import { planOf, stageInk } from './plan.ts'
import { outcomeLine } from './Standing.tsx'
import { stageKcs } from './useDefence.ts'
import './defence.css'

export function DefenceIndex() {
  useTitle('Defences')
  const stages = useLoaded(loadStages, [])
  const store = useStore()
  const ev = useEvents(store)
  if (stages.status === 'loading') return <Loading what="the stages" />
  if (stages.status === 'error') return <Failed message={stages.message} />
  const events = ev.status === 'ready' ? ev.events : []
  return (
    <article className="screen dfn">
      <header className="screen-head ws-head">
        <h1>Defences</h1>
        <p className="lede">Each stage is signed off by a four-part Defence, untimed and over at least two sittings. Every one is open now.</p>
      </header>
      <ul className="rows">
        {stages.value
          .filter((s) => planOf(s.id) !== undefined)
          .map((s) => (
            <li key={s.id} style={{ '--vol': stageInk(s.id) } as CSSProperties}>
              <Link to={`/defence/${s.id}`} className="row">
                <span className="row-id">
                  <span className="dfn-chip" aria-hidden="true" />
                  {s.id}
                </span>
                <span className="row-body">
                  <span className="row-title">{splitTitle(s.title).name}</span>
                  <span className="row-meta">{outcomeLine(deriveDefence(s.id, events, { kcs: stageKcs(s.id) }))}</span>
                </span>
              </Link>
            </li>
          ))}
      </ul>
    </article>
  )
}
