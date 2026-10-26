// SCR-stages: the ten stages in order, set as the series' catalogue (DESIGN.md SCR-stages): one ruled entry per volume
// with its cover, its number and title, its tools, the roadmap's question, and what it holds. Nothing locks: every
// entry opens.

import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { loadStages, useLoaded } from '../../app/content.ts'
import { useTitle } from '../../app/title.ts'
import { Failed, Loading } from '../../components/page/states.tsx'
import { CoverArt } from '../../components/volume/CoverArt.tsx'
import { splitTitle, volumeOf } from '../../components/volume/volumes.ts'
import '../../components/volume/volume.css'
import { question, sizeLine, summarize } from './summary.ts'
import './stages.css'

export function StagesScreen() {
  useTitle('Stages')
  const stages = useLoaded(loadStages, [])
  if (stages.status === 'loading') return <Loading what="the stages" />
  if (stages.status === 'error') return <Failed message={stages.message} />
  return (
    <article className="volumes wrap">
      <header className="volumes-head">
        <h1>Stages</h1>
        <p className="lede">
          Ten stages, in order, each a volume of the series: its lessons, a lab for the laptop and drawers of side material.
          Nothing locks: every stage and every lesson opens whenever you choose.
        </p>
      </header>
      <ol className="catalogue">
        {stages.value.map((s) => {
          const v = volumeOf(s.id)
          const { name, tools } = splitTitle(s.title)
          return (
            <li key={s.id} style={{ '--vol': v?.ink ?? 'var(--ink)' } as CSSProperties}>
              <Link to={`/stages/${s.id}`} className="catalogue-entry">
                <span className="mini-cover" aria-hidden="true">
                  {v !== undefined ? <CoverArt kind={v.motif} id={`list-${s.id}`} /> : null}
                </span>
                <span className="catalogue-title">
                  <span className="catalogue-n" aria-hidden="true">
                    {v?.n ?? ''}
                  </span>
                  <span className="catalogue-name">
                    <span className="visually-hidden">{s.id}, </span>
                    {name}
                  </span>
                </span>
                {tools !== '' ? <span className="catalogue-tools">{tools}</span> : null}
                <span className="catalogue-q">{question(s)}</span>
                <span className="catalogue-meta">
                  {sizeLine(summarize(s))
                    .split(' · ')
                    .map((part, i) => (
                      <span key={part} className="catalogue-meta-part">
                        {i > 0 ? ' · ' : ''}
                        {part}
                      </span>
                    ))}
                </span>
              </Link>
            </li>
          )
        })}
      </ol>
    </article>
  )
}
