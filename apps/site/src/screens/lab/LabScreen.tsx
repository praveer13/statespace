// SCR-lab: a staged lab (DESIGN.md SCR-lab), read here and built on the learner's laptop, set as a lab manual from its
// stage's volume: a head with the volume's small cover, a plan of the time each step takes, then each stage as a
// numbered step with what it asks, its minutes, its checks as a ruled checklist (plain text, never ticked here) and the
// command that checks it. "Download the lab" offers /labs/<LAB-id>.zip with its size, and each check shows its latest
// imported result and who ran it, read from the receipt-import events at read time (I2). The hint ladder and Prove-it
// arrive with the Bench's later builds.

import { useEffect, useState, type CSSProperties } from 'react'
import { Link, useParams } from 'react-router'
import { DRAFT_BANNER } from '@statespace/content'
import { loadLabs, useLoaded } from '../../app/content.ts'
import { useEvents, useStore } from '../../app/ledger.ts'
import { useTitle } from '../../app/title.ts'
import { InlineMd, Markdown, RefsContext } from '../../components/markdown/Markdown.tsx'
import type { Refs } from '../../components/markdown/Markdown.tsx'
import { Failed, Loading, Missing } from '../../components/page/states.tsx'
import { CoverArt } from '../../components/volume/CoverArt.tsx'
import { volumeOf } from '../../components/volume/volumes.ts'
import '../../components/volume/volume.css'
import { LaneBadge } from '../../components/stamp/index.ts'
import { latestChecks, whenOf } from '../bench/receipt-model.ts'
import { CheckResultMark } from '../bench/ReceiptView.tsx'
import '../bench/receipt.css'
import './lab.css'

const BASE = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`

/** The lab's zip, which the lab build writes to the site's labs/ folder. */
const zipHref = (id: string): string => `${BASE}labs/${id}.zip`

type ZipState = { readonly status: 'checking' } | { readonly status: 'ready'; readonly bytes: number | null } | { readonly status: 'missing' }

/** Whether the zip is on the site, and its size from the server's Content-Length. */
function useZip(id: string): ZipState {
  const [state, setState] = useState<ZipState>({ status: 'checking' })
  useEffect(() => {
    let live = true
    setState({ status: 'checking' })
    fetch(zipHref(id), { method: 'HEAD', cache: 'no-cache' })
      .then((res) => {
        const type = res.headers.get('content-type') ?? ''
        // a static host answers an unknown path with the app's page; only a zip counts
        if (!res.ok || type.includes('text/html')) return setState({ status: 'missing' })
        const n = Number(res.headers.get('content-length'))
        if (live) setState({ status: 'ready', bytes: Number.isFinite(n) && n > 0 ? n : null })
      })
      .catch(() => {
        if (live) setState({ status: 'missing' })
      })
    return () => {
      live = false
    }
  }, [id])
  return state
}

/** 1,234,567 bytes → "1.2 MB" (decimal units, as a download dialog shows them). */
function sizeText(bytes: number): string {
  if (bytes < 1000) return `${bytes} B`
  if (bytes < 1_000_000) return `${(bytes / 1000).toFixed(bytes < 10_000 ? 1 : 0)} kB`
  return `${(bytes / 1_000_000).toFixed(1)} MB`
}

function Download({ id }: { readonly id: string }) {
  const zip = useZip(id)
  return (
    <div className="lab-download">
      {zip.status === 'ready' ? (
        <a className="lab-download-go" href={zipHref(id)} download={`${id}.zip`}>
          Download the lab
          <span className="lab-download-size">
            {id}.zip{zip.bytes !== null ? `, ${sizeText(zip.bytes)}` : ''}
          </span>
        </a>
      ) : (
        <p className="lab-download-off">
          <span className="lab-download-word">Download the lab</span>{' '}
          {zip.status === 'checking' ? 'Looking for the zip…' : `The zip for ${id} is not on the site yet.`}
        </p>
      )}
      <p className="lab-download-note">
        Unpack it into your <code>statespace-lab</code> repository's root. The first zip starts the repository; later ones add their folder.
      </p>
    </div>
  )
}

/** `statespace check lab1.3` names LAB-1.3 by its short form (labs/README.md section 5). */
const shortName = (id: string): string => id.replace(/^LAB-/, 'lab')

/** The step number within its lab: LAB-1.3 → "3". */
const stepOf = (id: string): string => id.split('.').pop() ?? id

/** The anchor a step's plan segment points at. */
const anchorOf = (id: string): string => `step-${id.replace(/\./g, '-')}`

export function LabScreen() {
  const { lab: id = '' } = useParams()
  const labs = useLoaded(loadLabs, [])
  const store = useStore()
  const events = useEvents(store)
  const results = latestChecks(events.status === 'ready' ? events.events : [])
  const lab = labs.status === 'ready' ? labs.value.find((l) => l.id === id) : undefined
  useTitle(lab !== undefined ? `${lab.id} · ${lab.title}` : id)
  if (labs.status === 'loading') return <Loading what="the lab" />
  if (labs.status === 'error') return <Failed message={labs.message} />
  if (lab === undefined) return <Missing what="lab" id={id} />
  const planned = lab.stages.filter((s) => !s.stretch).reduce((n, s) => n + s.minutes, 0)
  const v = volumeOf(lab.stage)
  // The lab record carries the runs its text cites, as a page does; without them every {{run:}} reads as pending.
  const refs: Refs = { runs: lab.runs ?? {}, facts: (lab.facts ?? {}) as Refs['facts'], unresolved: lab.unresolved ?? [] }

  return (
    <RefsContext.Provider value={refs}>
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
            <InlineMd text={(lab.title.charAt(0).toUpperCase() + lab.title.slice(1)).replace(/\.$/, '')} />
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
          <code>statespace</code> command line, which the <Link to="/bench">Bench</Link> page shows how to install, then import the receipt it
          writes on the Bench.
        </p>
        <Download id={lab.id} />
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
                    {s.checks.map((c) => {
                      const got = results.get(c.id)
                      return (
                      <li key={c.id} className="lab-check" data-result={got === undefined ? undefined : got.pass ? 'passed' : 'failed'}>
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
                          <p className="lab-check-latest">
                            {got === undefined ? (
                              <span className="lab-check-none">No receipt imported yet.</span>
                            ) : (
                              <>
                                <span className="visually-hidden">Latest imported result: </span>
                                <CheckResultMark pass={got.pass} />
                                <LaneBadge lane={got.lane} />
                                <span className="lab-check-when">
                                  {whenOf(got.createdAt)} · <code>{got.path}</code>
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                      </li>
                      )
                    })}
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
    </RefsContext.Provider>
  )
}
