// SCR-claims, the happy path's version: the claims your answers minted. A lesson mints the claim templates it establishes
// once every question on it that this build can answer is answered; the record is read at read time and nothing is
// stored (I2). The claim strips, the rests-on view and the report arrive with the claim cards of the labs.

import { Link } from 'react-router'
import type { LedgerEvent } from '@statespace/ledger'
import { claimName, loadPage, useLoaded } from '../../app/content.ts'
import { useEvents, useStore } from '../../app/ledger.ts'
import { answers, pagesTouched, progressOf } from '../../app/progress.ts'
import { useTitle } from '../../app/title.ts'
import { InlineMd } from '../../components/markdown/Markdown.tsx'
import { Loading } from '../../components/page/states.tsx'
import '../../components/page/page.css'
import './claims.css'

interface Minted {
  readonly claim: string
  readonly lesson: string
}

async function mintedBy(events: readonly LedgerEvent[]): Promise<Minted[]> {
  const done = answers(events)
  const out: Minted[] = []
  for (const id of pagesTouched(events)) {
    const page = await loadPage(id)
    if (page === null || !progressOf(page, done).finished) continue
    for (const claim of page.establishes?.claims ?? []) if (!out.some((m) => m.claim === claim)) out.push({ claim, lesson: id })
  }
  return out
}

export function ClaimsScreen() {
  useTitle('Claims')
  const store = useStore()
  const events = useEvents(store)
  const record = events.status === 'ready' ? events.events : events.status === 'unavailable' ? [] : null
  const minted = useLoaded(async () => (record === null ? null : mintedBy(record)), [record === null ? 'wait' : record.length, record?.[record.length - 1]?.id ?? ''])

  return (
    <article className="screen claims">
      <header className="screen-head">
        <p className="kicker">Claims</p>
        <h1>Claims</h1>
        <p className="lede">What your work establishes, each claim with what it rests on. A lesson mints its claims once you have answered its questions.</p>
        <nav aria-label="Claims and specimens" className="claims-tabs">
          <span aria-current="page">Claims</span>
          <Link to="/specimens">Specimens</Link>
        </nav>
      </header>

      {minted.status === 'error' ? <p className="status">Your claims could not be worked out ({minted.message}).</p> : null}
      {minted.status === 'loading' || (minted.status === 'ready' && minted.value === null) ? <Loading what="your claims" /> : null}
      {minted.status === 'ready' && minted.value !== null ? (
        minted.value.length === 0 ? (
          <div className="sheet prose">
            <p>
              No claims yet. {events.status === 'unavailable' ? 'This browser is not keeping a practice record. ' : ''}Answer the questions of a
              lesson that establishes a claim, such as S1.L3, and the claim appears here.
            </p>
          </div>
        ) : (
          <ul className="claims-list">
            {minted.value.map((m) => (
              <li key={m.claim} className="ref-card">
                <p className="kicker">Claim · {m.claim}</p>
                <p className="ref-card-title">{claimName(m.claim) !== undefined ? <InlineMd text={claimName(m.claim) as string} /> : m.claim}</p>
                <p className="ref-card-text">
                  Minted by your answers in <Link to={`/lessons/${m.lesson}`}>{m.lesson}</Link>.
                </p>
              </li>
            ))}
          </ul>
        )
      ) : null}

      <section aria-labelledby="claims-specimens">
        <h2 id="claims-specimens">Specimens</h2>
        <p className="prose">
          Counterexamples are kept beside their fixes, each labeled from the run that found it. <Link to="/specimens">Open the specimen cabinet</Link>.
        </p>
      </section>
    </article>
  )
}
