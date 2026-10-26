// SCR-stage: one stage at a glance (DESIGN.md SCR-stage), as a volume of the series: its cover in the volume's ink with
// the stage's figure, its colophon (what it holds and the runs it cites), then its lessons in order with their format,
// minutes and whether they are written, its lab and the lab's stages, and its drawers. Formats are plain words; tier
// names stay in data.

import type { CSSProperties } from 'react'
import { Link, useParams } from 'react-router'
import { DRAFT_BANNER, tierFormat } from '@statespace/content'
import type { Tier } from '@statespace/content'
import { loadStages, useLoaded } from '../../app/content.ts'
import { useTitle } from '../../app/title.ts'
import { InlineMd, Markdown } from '../../components/markdown/Markdown.tsx'
import { Failed, Loading, Missing } from '../../components/page/states.tsx'
import { CoverArt } from '../../components/volume/CoverArt.tsx'
import { splitTitle, volumeOf } from '../../components/volume/volumes.ts'
import { question, sizeLine, summarize } from './summary.ts'
import '../../components/page/page.css'
import '../../components/volume/volume.css'
import './stages.css'

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

  const v = volumeOf(stage.id)
  const { name, tools } = splitTitle(stage.title)
  const sum = summarize(stage)
  const runs = Object.keys(stage.runs).sort()

  return (
    <article className="volume" style={{ '--vol': v?.ink ?? 'var(--vol-10)' } as CSSProperties}>
      <header className="volume-cover">
        <div className="volume-cover-inner">
          <div className="volume-cover-text">
            <nav className="volume-crumbs" aria-label="Breadcrumb">
              <Link to="/stages">Stages</Link>
              <span aria-hidden="true"> / </span>
              <span aria-current="page">{stage.id}</span>
            </nav>
            <h1 className="volume-title">
              <span className="volume-title-n" aria-hidden="true">
                {v?.n ?? ''}
              </span>
              <span>{name}</span>
            </h1>
            {tools !== '' ? <p className="volume-cover-tools">{tools}</p> : null}
            <p className="volume-cover-q">{question(stage)}</p>
            {first !== undefined ? (
              <div className="volume-cover-actions">
                <Link to={`/lessons/${first.id}`} className="flag" aria-describedby="volume-first">
                  <span className="flag-verb">Start</span>
                  <span className="flag-vol">{first.id}</span>
                </Link>
                <p id="volume-first" className="volume-first">
                  First lesson: <em>{first.title}</em>
                </p>
              </div>
            ) : null}
          </div>
          {v !== undefined ? (
            <div className="volume-cover-art">
              <CoverArt kind={v.motif} id={`cover-${stage.id}`} />
            </div>
          ) : null}
        </div>
      </header>

      <div className="volume-body-wrap wrap">
        <section className="colophon" aria-labelledby="stage-colophon">
          <h2 id="stage-colophon">Colophon</h2>
          <dl className="colophon-table">
            <div>
              <dt>Address</dt>
              <dd>
                <code>{stage.id}</code>
              </dd>
            </div>
            <div>
              <dt>Holds</dt>
              <dd>{sizeLine(sum)}</dd>
            </div>
            {stage.lab !== null ? (
              <div>
                <dt>Lab</dt>
                <dd>
                  <Link to={`/labs/${stage.lab.id}`}>{stage.lab.id}</Link>, on your laptop
                </dd>
              </div>
            ) : null}
            <div>
              <dt>Drawers</dt>
              <dd>{stage.drawers.length === 0 ? 'none' : `${stage.drawers.length}, open whenever you like`}</dd>
            </div>
            {runs.length > 0 ? (
              <div>
                <dt>Runs cited</dt>
                <dd className="colophon-runs">
                  {runs.map((r) => (
                    <code key={r}>{r}</code>
                  ))}
                </dd>
              </div>
            ) : null}
          </dl>
          {authored?.draft === true ? <p className="banner">{DRAFT_BANNER}</p> : null}
          {authored?.summary !== undefined ? <Markdown md={authored.summary} /> : null}
        </section>

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

      <nav className="pager volume-pager" aria-label="Previous and next stages">
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
      </div>
    </article>
  )
}
