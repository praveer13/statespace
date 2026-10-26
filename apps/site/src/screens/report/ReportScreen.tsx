// SCR-report: the learner's claim graph as the report the course ends with (roadmap outcome (g); README "The end";
// W5-T06). The page opens with the next erosion when one has fired, so its forecast comes before anything else. Then
// the report itself, section by section, each line a stamp packages/stamps derived; the lines you add (a setting read
// back, what lies outside your models); and the export, as Markdown and as JSON, saved to your machine and nowhere else.

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import type { LedgerEvent } from '@statespace/ledger'
import { claimName, loadPage, useLoaded } from '../../app/content.ts'
import { useEvents, useStore } from '../../app/ledger.ts'
import { answers, pagesTouched, progressOf } from '../../app/progress.ts'
import { useTitle } from '../../app/title.ts'
import { InlineMd } from '../../components/markdown/Markdown.tsx'
import { Loading } from '../../components/page/states.tsx'
import { Stamp } from '../../components/stamp/index.ts'
import { useReceipts } from '../bench/useReceipts.ts'
import { EROSIONS, erosionOf, stageNumber } from './data.ts'
import { ErosionEvent } from './ErosionEvent.tsx'
import { buildReport, reportJson, reportMarkdown, SECTIONS, yourLines, type MintedClaim, type Report } from './model.ts'
import { useErosionReading } from './useErosions.ts'
import './report.css'

async function mintedBy(events: readonly LedgerEvent[]): Promise<MintedClaim[]> {
  const done = answers(events)
  const out: MintedClaim[] = []
  for (const id of pagesTouched(events)) {
    const page = await loadPage(id)
    if (page === null || !progressOf(page, done).finished) continue
    for (const claim of page.establishes?.claims ?? []) if (!out.some((m) => m.claim === claim)) out.push({ claim, lesson: id })
  }
  return out
}

function save(name: string, type: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function ReportScreen() {
  useTitle('Report')
  const store = useStore()
  const events = useEvents(store)
  const record = events.status === 'ready' ? events.events : events.status === 'unavailable' ? [] : null
  const reading = useErosionReading(record)
  const { receipts } = useReceipts(store)
  const minted = useLoaded(async () => (record === null ? null : mintedBy(record)), [record === null ? 'wait' : record.length, record?.[record.length - 1]?.id ?? ''])
  const yours = useMemo(() => (record === null ? [] : yourLines(record)), [record])
  const report = useMemo<Report | null>(() => {
    if (reading === null || minted.status !== 'ready' || minted.value === null) return null
    return buildReport({ receipts, minted: minted.value, erosions: reading, yours, title: claimName, now: new Date() })
  }, [reading, minted, receipts, yours])
  const [status, setStatus] = useState('')

  // The erosion this visit opened with stays on the page after its call is recorded, so the crack draws in place.
  const [held, setHeld] = useState<string | undefined>(undefined)
  const firstNext = reading?.next?.id
  useEffect(() => {
    if (held === undefined && firstNext !== undefined) setHeld(firstNext)
  }, [held, firstNext])
  const shownId = held ?? firstNext
  const next = shownId !== undefined ? reading?.erosions.find((e) => e.id === shownId) : undefined
  const nextEr = shownId !== undefined ? erosionOf(shownId) : undefined
  const counts = report === null ? null : { claims: new Set([...Object.values(report.sections).flat().filter((l) => l.role === 'primary').map((l) => l.claim), ...report.awaiting.map((a) => a.claim)]).size, assumptions: report.sections.assumed.length, erosions: report.erosions.length }

  return (
    <article className="screen report">
      <header className="screen-head report-head">
        <h1>Report</h1>
        <p className="report-lede">
          Your claim graph as the report the course ends with: what you proved, model-checked, tested, enforced, configured and assumed, and what is not
          covered, each with its tool versions and its limits. It is worked out in this tab from your record and your receipts, and it leaves only when
          you save it.
        </p>
        {counts !== null ? (
          <p className="report-counts">
            {counts.claims} {counts.claims === 1 ? 'claim' : 'claims'} · {counts.assumptions} {counts.assumptions === 1 ? 'assumption' : 'assumptions'} · {counts.erosions}{' '}
            {counts.erosions === 1 ? 'erosion' : 'erosions'}. Start with what they rest on.
          </p>
        ) : null}
      </header>

      {next !== undefined && nextEr !== undefined ? (
        <section aria-labelledby="report-next" className="report-next">
          <h2 id="report-next" className="report-h2">
            {next.status === 'cracked' ? 'The erosion you just called' : 'An erosion has fired'}
          </h2>
          <p className="report-text">
            It {next.status === 'cracked' ? 'came' : 'comes'} from your oldest open erodible seam, {next.seam}. <Link to={`/report/erosions/${next.id}`}>Open {next.id} on its own page</Link>.
          </p>
          <ErosionEvent er={nextEr} state={next} store={store} level={3} />
        </section>
      ) : null}

      {report === null ? (
        minted.status === 'error' ? (
          <p className="status">Your report could not be worked out ({minted.message}).</p>
        ) : (
          <Loading what="your report" />
        )
      ) : (
        <>
          <section aria-labelledby="report-export" className="report-export">
            <h2 id="report-export" className="report-h2">
              Export
            </h2>
            <p className="report-text">
              Markdown to read and publish; JSON (report@1, draft) for tools, with its own SHA-256 over the canonical form. Both are written from what this
              page shows.
            </p>
            <div className="actions">
              <button
                type="button"
                className="button button-primary"
                onClick={() => {
                  save('statespace-report.md', 'text/markdown', reportMarkdown(report))
                  setStatus('Saved statespace-report.md.')
                }}
              >
                Save as Markdown
              </button>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => {
                  void reportJson(report).then((json) => {
                    save('statespace-report.json', 'application/json', json)
                    setStatus('Saved statespace-report.json.')
                  })
                }}
              >
                Save as JSON
              </button>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => {
                  void navigator.clipboard?.writeText(reportMarkdown(report)).then(
                    () => setStatus('The Markdown is on your clipboard.'),
                    () => setStatus('This browser would not copy; save the file instead.'),
                  )
                }}
              >
                Copy Markdown
              </button>
            </div>
            <p className="report-status" role="status">
              {status}
            </p>
          </section>

          <section aria-labelledby="report-what" className="report-block">
            <h2 id="report-what" className="report-h2">
              What this report establishes
            </h2>
            <p className="report-text">{report.establishes}</p>
            <p className="report-text">It does not establish:</p>
            <ul className="report-bullets">
              {report.doesNotEstablish.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </section>

          {SECTIONS.map((s) => {
            const lines = report.sections[s.key]
            if (s.key === 'refuted-or-unknown' && lines.length === 0) return null
            return (
              <section key={s.key} aria-labelledby={`report-${s.key}`} className="report-block" data-section={s.key}>
                <h2 id={`report-${s.key}`} className="report-h2">
                  {s.title} <span className="report-n">{lines.length}</span>
                </h2>
                {lines.length === 0 ? (
                  <p className="report-empty">{s.empty}</p>
                ) : (
                  <ol className="report-lines">
                    {lines.map((l, i) => (
                      <li key={`${l.claim}-${i}`} className="report-line" data-vol={stageNumber(l.claim)}>
                        <p className="report-claim">
                          <span className="report-vol" aria-hidden="true" />
                          <span className="report-id">{l.claim}</span>
                          <span className="report-title">
                            <InlineMd text={l.title} />
                          </span>
                        </p>
                        <div className="report-stamp">
                          <Stamp stamp={l.stamp} />
                        </div>
                        <p className="report-meta">
                          {l.role === 'supporting' ? 'Supporting stamp. ' : ''}
                          {l.role === 'seam' ? 'A seam your record planted, ' : 'From '}
                          {l.source}.{l.seams.length > 0 && l.role !== 'seam' ? ` Rests on ${l.seams.join(', ')}.` : ''}
                        </p>
                        {l.cracked.length > 0 ? (
                          <p className="report-crack">
                            <svg className="report-crack-mark" viewBox="0 0 24 10" aria-hidden="true" focusable="false">
                              <polyline className="line-crack" points="0,2 4,8 8,2 12,8 16,2 20,8 24,2" />
                            </svg>
                            Cracked by {l.cracked.map((id, j) => (
                              <span key={id}>
                                {j > 0 ? ', ' : ''}
                                <Link to={`/report/erosions/${id}`}>{id}</Link>
                              </span>
                            ))}
                            . The stamp stays; the crack and the remedy are in the erosion log.
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            )
          })}

          <section aria-labelledby="report-awaiting" className="report-block">
            <h2 id="report-awaiting" className="report-h2">
              In your record, no stamp yet <span className="report-n">{report.awaiting.length}</span>
            </h2>
            {report.awaiting.length === 0 ? (
              <p className="report-empty">None. Answer the questions of a lesson that establishes a claim, such as S1.L3, and it appears here until a receipt stamps it.</p>
            ) : (
              <ol className="report-lines">
                {report.awaiting.map((a) => (
                  <li key={a.claim} className="report-line" data-vol={stageNumber(a.claim)}>
                    <p className="report-claim">
                      <span className="report-vol" aria-hidden="true" />
                      <span className="report-id">{a.claim}</span>
                      <span className="report-title">
                        <InlineMd text={a.title} />
                      </span>
                    </p>
                    <p className="report-meta">
                      {a.via === 'answers' ? (
                        <>
                          Minted by your answers in <Link to={`/lessons/${a.from}`}>{a.from}</Link>. No stamp until a lab receipt carries it.
                        </>
                      ) : (
                        <>
                          Named by <code>{a.from}</code>, whose runs earn no stamp: {a.why}.
                        </>
                      )}
                      {a.seams.length > 0 ? ` Rests on ${a.seams.join(', ')}.` : ''}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <YourLineForm store={store} count={yours.length} />

          <section aria-labelledby="report-matrix" className="report-block">
            <h2 id="report-matrix" className="report-h2">
              Checker matrix
            </h2>
            {report.matrix.length === 0 ? (
              <p className="report-empty">
                No receipt yet. Run <code>statespace check</code> on a lab stage and import its receipt on the <Link to="/bench">Bench</Link>.
              </p>
            ) : (
              <div className="report-table-wrap">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th scope="col">Claim</th>
                      {report.checkers.map((c) => (
                        <th key={c} scope="col">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.matrix.map((m) => (
                      <tr key={m.claim}>
                        <th scope="row">{m.claim}</th>
                        {report.checkers.map((c) => (
                          <td key={c}>{m.by.includes(c) ? 'ran' : '—'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section aria-labelledby="report-hashes" className="report-block">
            <h2 id="report-hashes" className="report-h2">
              Statement hashes and tools
            </h2>
            {report.statements.length === 0 && report.tools.length === 0 ? (
              <p className="report-empty">None until a receipt arrives.</p>
            ) : (
              <dl className="report-dl">
                {report.statements.map((s) => (
                  <div key={`${s.claim}${s.path}`}>
                    <dt>
                      {s.claim} · <code>{s.path}</code>
                    </dt>
                    <dd>
                      <code className="report-hash">{s.sha256}</code> ({s.kind}, as reported)
                    </dd>
                  </div>
                ))}
                {report.tools.map((t) => (
                  <div key={`${t.name}${t.version}`}>
                    <dt>
                      {t.name} {t.version}
                    </dt>
                    <dd>{t.pinned ? 'pinned' : 'not pinned'}{t.sha256 !== null ? <> · <code className="report-hash">{t.sha256}</code></> : null}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>

          <section aria-labelledby="report-erosions" className="report-block">
            <h2 id="report-erosions" className="report-h2">
              Erosion log
            </h2>
            <ol className="report-erosions">
              {EROSIONS.map((er) => {
                const st = reading?.erosions.find((e) => e.id === er.id)
                const entry = report.erosions.find((e) => e.id === er.id)
                return (
                  <li key={er.id} className="report-erosion" data-status={st?.status ?? 'dormant'}>
                    <Link to={`/report/erosions/${er.id}`} className="report-erosion-id">
                      {er.id}
                    </Link>
                    <span className="report-erosion-what">
                      {er.seam} · {er.specimen}
                      {er.claim !== null ? ` · ${er.claim}` : ''}
                    </span>
                    <span className="report-erosion-state">
                      {st?.status === 'cracked'
                        ? `cracked · forecast ${entry?.forecast ?? ''}`
                        : st?.status === 'fired'
                          ? 'fired · forecast waiting'
                          : 'not fired in your record'}
                    </span>
                  </li>
                )
              })}
            </ol>
            <p className="report-text">
              Three seams are tested and held: SEAM-13, SEAM-14 and SEAM-15. They never crack. <Link to="/assurance">The course's own claims</Link> stand on
              them.
            </p>
          </section>

          <section aria-labelledby="report-defeaters" className="report-block">
            <h2 id="report-defeaters" className="report-h2">
              Defeater log
            </h2>
            <p className="report-text report-mofn">
              {report.defeaters.retired} of {report.defeaters.identified} retired
            </p>
            {report.defeaters.open.length > 0 ? (
              <ul className="report-bullets">
                {report.defeaters.open.map((d, i) => (
                  <li key={i}>
                    Open · {d.claim}: {d.text}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section aria-labelledby="report-limits" className="report-block">
            <h2 id="report-limits" className="report-h2">
              Limits
            </h2>
            <ul className="report-bullets">
              {report.limits.map((l) => (
                <li key={l}>{l}</li>
              ))}
              {report.trusted.map((t) => (
                <li key={`${t.claim}${t.component}`}>
                  {t.claim} trusts {t.component} ({t.status}).
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </article>
  )
}

function YourLineForm({ store, count }: { readonly store: ReturnType<typeof useStore>; readonly count: number }) {
  const [kind, setKind] = useState<'configured' | 'not-covered'>('not-covered')
  const [what, setWhat] = useState('')
  const [source, setSource] = useState('')
  const [at, setAt] = useState('')
  const [msg, setMsg] = useState('')
  const ready = kind === 'not-covered' ? what.trim() !== '' : what.trim() !== '' && source.trim() !== '' && at.trim() !== ''
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!ready || store === null || store === undefined) return
    const data = kind === 'not-covered' ? { report: kind, what: what.trim() } : { report: kind, setting: what.trim(), source: source.trim(), at: at.trim() }
    store.record({ kind: 'note', ref: `note:${Date.now()}`, provenance: 'own', exposure: 'seen', data }).then(
      () => {
        setMsg(kind === 'not-covered' ? 'Added under Not covered.' : 'Added under Configured.')
        setWhat('')
        setSource('')
        setAt('')
      },
      (err: unknown) => setMsg(`Not added: ${err instanceof Error ? err.message : String(err)}.`),
    )
  }
  return (
    <section aria-labelledby="report-yours" className="report-block">
      <h2 id="report-yours" className="report-h2">
        Add a line of your own <span className="report-n">{count}</span>
      </h2>
      <p className="report-text">
        Some lines no template covers: a setting you read back from the running system, or what lies outside your models. They are stamped by what you
        write, as self-assessed.
      </p>
      <form className="report-form" onSubmit={submit}>
        <fieldset className="report-kind">
          <legend className="report-label">Section</legend>
          <label>
            <input type="radio" name="report-kind" checked={kind === 'not-covered'} onChange={() => setKind('not-covered')} /> Not covered
          </label>
          <label>
            <input type="radio" name="report-kind" checked={kind === 'configured'} onChange={() => setKind('configured')} /> Configured
          </label>
        </fieldset>
        <label className="report-field">
          <span className="report-label">{kind === 'not-covered' ? 'What lies outside the model' : 'The setting'}</span>
          <input value={what} onChange={(e) => setWhat(e.target.value)} placeholder={kind === 'not-covered' ? 'response timing of the document view' : 'default_transaction_isolation = serializable'} />
        </label>
        {kind === 'configured' ? (
          <>
            <label className="report-field">
              <span className="report-label">Read back from</span>
              <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="SHOW on the production replica" />
            </label>
            <label className="report-field">
              <span className="report-label">When</span>
              <input value={at} onChange={(e) => setAt(e.target.value)} placeholder="2026-10-26" />
            </label>
          </>
        ) : null}
        <div className="actions">
          <button type="submit" className="button button-primary" disabled={!ready || !store}>
            Add the line
          </button>
        </div>
        <p className="report-status" role="status">
          {msg}
        </p>
      </form>
    </section>
  )
}
