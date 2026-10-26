// SCR-lab: a staged lab (DESIGN.md SCR-lab), read here and built on the learner's laptop: each stage with what it asks,
// its minutes, its checks and the command that checks it. The receipts, the hint ladder and Prove-it arrive with the
// Bench's later builds.

import { Link, useParams } from 'react-router'
import { DRAFT_BANNER } from '@statespace/content'
import { loadLabs, useLoaded } from '../../app/content.ts'
import { useTitle } from '../../app/title.ts'
import { InlineMd, Markdown } from '../../components/markdown/Markdown.tsx'
import { Failed, Loading, Missing } from '../../components/page/states.tsx'
import './lab.css'

/** `statespace check lab1.3` names LAB-1.3 by its short form (labs/README.md section 5). */
const shortName = (id: string): string => id.replace(/^LAB-/, 'lab')

export function LabScreen() {
  const { lab: id = '' } = useParams()
  const labs = useLoaded(loadLabs, [])
  const lab = labs.status === 'ready' ? labs.value.find((l) => l.id === id) : undefined
  useTitle(lab !== undefined ? `${lab.id} · ${lab.title}` : id)
  if (labs.status === 'loading') return <Loading what="the lab" />
  if (labs.status === 'error') return <Failed message={labs.message} />
  if (lab === undefined) return <Missing what="lab" id={id} />
  const planned = lab.stages.filter((s) => !s.stretch).reduce((n, s) => n + s.minutes, 0)

  return (
    <article className="screen lab">
      <header className="screen-head">
        <p className="kicker">
          <Link to={`/stages/${lab.stage}`}>{lab.stage}</Link> ▸ <Link to="/bench">Bench</Link> ▸ {lab.id}
        </p>
        <h1>
          <InlineMd text={lab.title.charAt(0).toUpperCase() + lab.title.slice(1)} />
        </h1>
        <p className="meta">
          {lab.stages.length} stages · about {planned} min planned · laptop work
        </p>
        {!lab.authored ? <p className="banner">{DRAFT_BANNER}</p> : null}
        {lab.summary !== null ? <Markdown md={lab.summary} /> : null}
        <p className="lede">
          You build this lab on your own machine, in your own repository. Each stage ends in a check: run it with the{' '}
          <code>statespace</code> command line, which the <Link to="/bench">Bench</Link> page shows how to install.
        </p>
      </header>

      <ol className="lab-stages">
        {lab.stages.map((s) => (
          <li key={s.id} className="sheet lab-stage">
            <p className="kicker">
              {s.id} · about {s.minutes} min
              {s.weekend ? ' · weekend' : ''}
              {s.stretch ? ' · stretch, optional' : ''}
            </p>
            <h2 className="lab-stage-title">
              <InlineMd text={s.title} />
            </h2>
            {s.what !== null ? <Markdown md={s.what} /> : null}
            {s.checks.length > 0 ? (
              <ul className="lab-checks">
                {s.checks.map((c) => (
                  <li key={c.id}>
                    <code>{c.id}</code> <InlineMd text={c.label} />
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="lab-command">
              Check it: <code>statespace check {shortName(s.id).toLowerCase()}</code>
            </p>
          </li>
        ))}
      </ol>
    </article>
  )
}
