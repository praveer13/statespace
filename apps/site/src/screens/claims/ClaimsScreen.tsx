// SCR-claims, the happy path's version: the claims your answers minted. A lesson mints the claim templates it establishes
// once every question on it that this build can answer is answered; the record is read at read time and nothing is
// stored (I2). Above them, the claim cards your imported lab receipts mint or update, each with its strip and a
// rests-on view, derived from the tab's read-only copy of the receipts. The report arrives with the lab bundle.

import { Link } from 'react-router'
import type { LedgerEvent } from '@statespace/ledger'
import { claimName, loadPage, useLoaded } from '../../app/content.ts'
import { useEvents, useStore } from '../../app/ledger.ts'
import { claimCards } from '../bench/receipt-model.ts'
import { useReceipts } from '../bench/useReceipts.ts'
import '../bench/receipt.css'
import { ClaimCard } from './ClaimCard.tsx'
import { answers, pagesTouched, progressOf } from '../../app/progress.ts'
import { useTitle } from '../../app/title.ts'
import { InlineMd } from '../../components/markdown/Markdown.tsx'
import { Loading } from '../../components/page/states.tsx'
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

/** The volume a claim belongs to, from its ID (CL-5.2 belongs to S5), or undefined. */
const stageOf = (claim: string): number | undefined => {
  const m = /^CL-([1-9][0-9]?)\./.exec(claim)
  const n = m === null ? NaN : Number(m[1])
  return n >= 1 && n <= 10 ? n : undefined
}

export function ClaimsScreen() {
  useTitle('Claims')
  const store = useStore()
  const events = useEvents(store)
  const record = events.status === 'ready' ? events.events : events.status === 'unavailable' ? [] : null
  const { receipts } = useReceipts(store)
  const cards = claimCards(receipts, claimName)
  const minted = useLoaded(async () => (record === null ? null : mintedBy(record)), [record === null ? 'wait' : record.length, record?.[record.length - 1]?.id ?? ''])

  return (
    <article className="screen claims">
      <header className="screen-head claims-head">
        <h1>Claims</h1>
        <p className="lede claims-lede">What your work establishes, each claim with what it rests on. A lesson mints its claims once you have answered its questions, and an imported lab receipt mints or updates the cards it names.</p>
        <nav aria-label="Claims and specimens" className="claims-tabs">
          <span aria-current="page" className="claims-tab">
            Claims
          </span>
          <Link to="/specimens" className="claims-tab">
            Specimens
          </Link>
        </nav>
      </header>

      <section aria-labelledby="claims-lab" className="claims-lab">
        <h2 id="claims-lab">From your lab receipts</h2>
        {cards.length === 0 ? (
          <p className="claims-more-text">
            None yet. Run <code>statespace check</code> on a lab stage, then import its receipt on the <Link to="/bench">Bench</Link>; the cards it
            names appear here with their stamps.
          </p>
        ) : (
          <ol className="ccards">
            {cards.map((c) => (
              <ClaimCard key={c.key} card={c} />
            ))}
          </ol>
        )}
      </section>

      <h2 className="claims-sub">From your answers</h2>
      {minted.status === 'error' ? <p className="status">Your claims could not be worked out ({minted.message}).</p> : null}
      {minted.status === 'loading' || (minted.status === 'ready' && minted.value === null) ? <Loading what="your claims" /> : null}
      {minted.status === 'ready' && minted.value !== null ? (
        minted.value.length === 0 ? (
          <div className="claims-empty">
            <p>
              No claims yet. {events.status === 'unavailable' ? 'This browser is not keeping a practice record. ' : ''}Answer the questions of a
              lesson that establishes a claim, such as S1.L3, and the claim appears here.
            </p>
          </div>
        ) : (
          <ol className="claims-list">
            {minted.value.map((m) => (
              <li key={m.claim} className="claims-row" data-vol={stageOf(m.claim)}>
                <p className="claims-id">
                  <span className="claims-vol" aria-hidden="true" />
                  <span className="visually-hidden">Claim </span>
                  {m.claim}
                  {stageOf(m.claim) === undefined ? null : <span className="claims-stage">S{stageOf(m.claim)}</span>}
                </p>
                <p className="claims-name">{claimName(m.claim) !== undefined ? <InlineMd text={claimName(m.claim) as string} /> : m.claim}</p>
                <p className="claims-by">
                  Minted by your answers in <Link to={`/lessons/${m.lesson}`}>{m.lesson}</Link>.
                </p>
              </li>
            ))}
          </ol>
        )
      ) : null}

      <section aria-labelledby="claims-specimens" className="claims-more">
        <h2 id="claims-specimens">Specimens</h2>
        <p className="claims-more-text">
          Counterexamples are kept beside their fixes, each labeled from the run that found it. <Link to="/specimens">Open the specimen cabinet</Link>.
        </p>
      </section>
    </article>
  )
}
