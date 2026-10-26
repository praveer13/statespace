// SCR-stages: the ten stages in order (DESIGN.md SCR-stages; the list mirror of section 6.14), each with its title, the
// roadmap's question, its lessons and its minutes. Nothing locks: every row opens.

import { Link } from 'react-router'
import { loadStages, useLoaded } from '../../app/content.ts'
import { useTitle } from '../../app/title.ts'
import { Failed, Loading } from '../../components/page/states.tsx'
import { question, sizeLine, summarize } from './summary.ts'

export function StagesScreen() {
  useTitle('Stages')
  const stages = useLoaded(loadStages, [])
  if (stages.status === 'loading') return <Loading what="the stages" />
  if (stages.status === 'error') return <Failed message={stages.message} />
  return (
    <article className="screen">
      <header className="screen-head">
        <p className="kicker">The course</p>
        <h1>Stages</h1>
        <p className="lede">Ten stages, in order. Each has its lessons, a lab for the laptop and drawers of side material. Nothing locks: every stage and every lesson opens whenever you choose.</p>
      </header>
      <ol className="rows">
        {stages.value.map((s) => (
          <li key={s.id}>
            <Link to={`/stages/${s.id}`} className="row">
              <span className="row-id">{s.id}</span>
              <span className="row-body">
                <span className="row-title">{s.title}</span>
                <span className="row-text">{question(s)}</span>
                <span className="row-meta">{sizeLine(summarize(s))}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </article>
  )
}
