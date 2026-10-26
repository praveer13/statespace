// SCR-lab: a staged lab (DESIGN.md SCR-lab), read here and built on the learner's laptop, set as a lab manual from its
// stage's volume: a head with the volume's small cover, a plan of the time each step takes, then each stage as a
// numbered step with what it asks, its minutes, its checks as a ruled checklist (plain text, never ticked here) and the
// command that checks it. The receipts, the hint ladder and Prove-it arrive with the Bench's later builds.

import type { CSSProperties } from 'react'
import { Link, useParams } from 'react-router'
import { DRAFT_BANNER } from '@statespace/content'
import { loadLabs, useLoaded } from '../../app/content.ts'
import { useTitle } from '../../app/title.ts'
import { InlineMd, Markdown } from '../../components/markdown/Markdown.tsx'
import { Failed, Loading, Missing } from '../../components/page/states.tsx'
import { CoverArt } from '../../components/volume/CoverArt.tsx'
import { volumeOf } from '../../components/volume/volumes.ts'
import '../../components/volume/volume.css'
import './lab.css'

/** `statespace check lab1.3` names LAB-1.3 by its short form (labs/README.md section 5). */
const shortName = (id: string): string => id.replace(/^LAB-/, 'lab')

/** The step number within its lab: LAB-1.3 → "3". */
const stepOf = (id: string): string => id.split('.').pop() ?? id

/** The anchor a step's plan segment points at. */
const anchorOf = (id: string): string => `step-${id.replace(/\./g, '-')}`

export function LabScreen() {
  const { lab: id = '' } = useParams()
  const labs = useLoaded(loadLabs, [])
  const lab = labs.status === 'ready' ? labs.value.find((l) => l.id === id) : undefined
  useTitle(lab !== undefined ? `${lab.id} · ${lab.title}` : id)
  if (labs.status === 'loading') return <Loading what="the lab" />
  if (labs.status === 'error') return <Failed message={labs.message} />
  if (lab === undefined) return <Missing what="lab" id={id} />
  const planned = lab.stages.filter((s) => !s.stretch).reduce((n, s) => n + s.minutes, 0)
  const v = volumeOf(lab.stage)

  return (
    <article className="screen lab" style={{ '--vol': v?.ink ?? 'var(--vol-10)' } as CSSProperties}>
      <nav className="lab-crumbs" aria-label="Breadcrumb">
        <Link to={`/stages/${lab.stage}`}>{lab.stage}</Link>
        <span aria-hidden="true"> / </span>
        <Link to="/bench">Bench</Link>
        <span aria-hidden="true"> / </span>
        <span aria-current="page">{lab.id}</span>
      </nav>

      <header className="screen-head lab-head">
        <div className="lab-head-text">
          <h1>
            <InlineMd text={lab.title.charAt(0).toUpperCase() + lab.title.slice(1)} />
          </h1>
          <p className="meta lab-head-meta">
            <code>{lab.id}</code> · {lab.stages.length} stages · about {planned} min planned · laptop work
          </p>
        </div>
        {v !== undefined ? (
          <Link to={`/stages/${lab.stage}`} className="mini-cover lab-cover" aria-label={`Volume ${v.n}, stage ${lab.stage}`}>
            <CoverArt kind={v.motif} id={`lab-${lab.id}`} />
            <span className="mini-cover-n">{v.n}</span>
          </Link>
        ) : null}
      </header>

      <div className="lab-intro">
        {!lab.authored ? <p className="banner">{DRAFT_BANNER}</p> : null}
        {lab.summary !== null ? <Markdown md={lab.summary} className="lab-summary" /> : null}
        <p className="lede">
          You build this lab on your own machine, in your own repository. Each stage ends in a check: run it with the{' '}
          <code>statespace</code> command line, which the <Link to="/bench">Bench</Link> page shows how to install.
        </p>
      </div>

      <figure className="lab-plan" aria-labelledby="lab-plan-cap">
        <ol className="lab-plan-bar">
          {lab.stages.map((s) => (
            <li key={s.id} className="lab-plan-seg" data-stretch={s.stretch ? 'true' : undefined} style={{ flexGrow: Math.max(s.minutes, 1) }}>
              <a href={`#${anchorOf(s.id)}`} aria-label={`Step ${stepOf(s.id)}, about ${s.minutes} min${s.stretch ? ', stretch, optional' : ''}`}>
                {stepOf(s.id)}
              </a>
            </li>
          ))}
        </ol>
        <figcaption id="lab-plan-cap" className="lab-plan-cap">
          The steps, each as wide as its minutes. Filled steps make up the {planned} planned minutes
          {lab.stages.some((s) => s.stretch) ? '; outlined steps are stretch work, and optional' : ''}.
        </figcaption>
      </figure>

      <ol className="lab-stages">
        {lab.stages.map((s) => (
          <li key={s.id} id={anchorOf(s.id)} className="lab-stage" data-stretch={s.stretch ? 'true' : undefined}>
            <p className="lab-step-n" aria-hidden="true">
              {stepOf(s.id)}
            </p>
            <div className="lab-step-body">
              <h2 className="lab-stage-title">
                <InlineMd text={s.title} />
              </h2>
              <p className="lab-step-meta">
                <code>{s.id}</code> · about {s.minutes} min
                {s.weekend ? ' · weekend' : ''}
                {s.stretch ? ' · stretch, optional' : ''}
              </p>
              {s.what !== null ? <Markdown md={s.what} className="lab-what" /> : null}
              {s.checks.length > 0 ? (
                <div className="lab-checklist">
                  <h3 className="lab-checks-head">{s.checks.length === 1 ? 'The check' : 'The checks'}</h3>
                  <ul className="lab-checks">
                    {s.checks.map((c) => (
                      <li key={c.id} className="lab-check">
                        <span className="lab-check-box" aria-hidden="true" />
                        <div className="lab-check-text">
                          <p className="lab-check-label">
                            <code>{c.id}</code> <InlineMd text={c.label} />
                          </p>
                          {c.passes !== null ? (
                            <p className="lab-check-passes">
                              <InlineMd text={c.passes} />
                            </p>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <p className="lab-command">
                Check it: <code>statespace check {shortName(s.id).toLowerCase()}</code>
              </p>
            </div>
          </li>
        ))}
      </ol>
    </article>
  )
}
