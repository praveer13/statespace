// SCR-stage: one stage at a glance (DESIGN.md SCR-stage): its lessons in order with their format, minutes and whether
// they are written, its lab and the lab's stages, and its drawers. Formats are plain words; tier names stay in data.

import { Link, useParams } from 'react-router'
import { DRAFT_BANNER, tierFormat } from '@statespace/content'
import type { Tier } from '@statespace/content'
import { loadStages, useLoaded } from '../../app/content.ts'
import { useTitle } from '../../app/title.ts'
import { InlineMd, Markdown } from '../../components/markdown/Markdown.tsx'
import { Failed, Loading, Missing } from '../../components/page/states.tsx'
import { question, sizeLine, summarize } from './summary.ts'
import '../../components/page/page.css'

export function StageScreen() {
  const { stage: id = '' } = useParams()
  const stages = useLoaded(loadStages, [])
  const at = stages.status === 'ready' ? stages.value.findIndex((s) => s.id === id) : -1
  const stage = stages.status === 'ready' ? stages.value[at] : undefined
  useTitle(stage !== undefined ? `${stage.id} · ${stage.title}` : id)
  if (stages.status === 'loading') return <Loading what="the stage" />
  if (stages.status === 'error') return <Failed message={stages.message} />
  if (stage === undefined) return <Missing what="stage" id={id} />
  const prev = stages.value[at - 1]
  const next = stages.value[at + 1]
  const authored = stage.authored
  const first = stage.lessons[0]

  return (
    <article className="screen">
      <header className="screen-head">
        <p className="kicker">
          <Link to="/stages">Stages</Link> ▸ {stage.id}
        </p>
        <h1>{stage.title}</h1>
        <p className="lede">{question(stage)}</p>
        <p className="meta">{sizeLine(summarize(stage))}</p>
        {authored?.draft === true ? <p className="banner">{DRAFT_BANNER}</p> : null}
        {authored?.summary !== undefined ? <Markdown md={authored.summary} /> : null}
        {first !== undefined ? (
          <p className="actions">
            <Link to={`/lessons/${first.id}`} className="button button-primary">
              Start with {first.id}
            </Link>
          </p>
        ) : null}
      </header>

      <section aria-labelledby="stage-lessons">
        <h2 id="stage-lessons">Lessons</h2>
        <ol className="rows">
          {stage.lessons.map((l) => (
            <li key={l.id}>
              <Link to={`/lessons/${l.id}`} className="row">
                <span className="row-id">{l.id}</span>
                <span className="row-body">
                  <span className="row-title">{l.title}</span>
                  <span className="row-meta">
                    {tierFormat(l.tier as Tier)}
                    {l.built ? (l.minutes !== null ? ` · about ${l.minutes} min` : '') : ' · not written yet'}
                    {l.built && l.draft === true ? ' · draft' : ''}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {stage.lab !== null ? (
        <section aria-labelledby="stage-lab">
          <h2 id="stage-lab">Lab</h2>
          <p className="prose">
            <Link to={`/labs/${stage.lab.id}`}>
              {stage.lab.id} · {stage.lab.title}
            </Link>{' '}
            <span className="meta">· laptop work, checked on your machine</span>
          </p>
          <ol className="rows">
            {stage.labStages.map((s) => (
              <li key={s.id}>
                <Link to={`/labs/${stage.lab?.id ?? ''}`} className="row">
                  <span className="row-id">{s.id}</span>
                  <span className="row-body">
                    <span className="row-title">
                      <InlineMd text={s.title} />
                    </span>
                    <span className="row-meta">
                      about {s.minutes} min{s.stretch ? ' · stretch, optional' : ''}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {stage.drawers.length > 0 ? (
        <section aria-labelledby="stage-drawers">
          <h2 id="stage-drawers">Drawers</h2>
          <p className="lede">Side material: open whenever you like, and never required.</p>
          <ul className="rows">
            {stage.drawers.map((d) => (
              <li key={d.id}>
                <Link to={`/drawers/${d.id}`} className="row">
                  <span className="row-id">{d.id}</span>
                  <span className="row-body">
                    <span className="row-title">
                      <InlineMd text={d.title} />
                    </span>
                    {d.deferred ? <span className="row-meta">deferred</span> : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <nav className="pager" aria-label="Previous and next stages">
        {prev !== undefined ? (
          <Link to={`/stages/${prev.id}`} className="pager-link" rel="prev">
            <span className="kicker">Previous · {prev.id}</span>
            <span className="pager-title">{prev.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next !== undefined ? (
          <Link to={`/stages/${next.id}`} className="pager-link pager-next" rel="next">
            <span className="kicker">Next · {next.id}</span>
            <span className="pager-title">{next.title}</span>
          </Link>
        ) : null}
      </nav>
    </article>
  )
}
