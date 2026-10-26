// SCR-today, the happy path's version: continue where you left off. The lesson of the most recent answer in the practice
// record is where the learner was; if every question there is answered, the next lesson in course order that is not
// finished is next. With nothing in the record, the course starts with Start here (S1.L0). Derived at read time (I2).
// The plan of due items, re-finds and audit cases (DESIGN.md SCR-today) arrives with the scheduler.

import { Link } from 'react-router'
import type { LedgerEvent } from '@statespace/ledger'
import { courseLessons, loadPage, useLoaded } from '../../app/content.ts'
import { useEvents, useStore } from '../../app/ledger.ts'
import { answers, lastLesson, progressOf } from '../../app/progress.ts'
import { useTitle } from '../../app/title.ts'
import { Loading } from '../../components/page/states.tsx'
import './today.css'

interface Next {
  readonly kind: 'start' | 'continue' | 'next' | 'end'
  readonly id?: string
  readonly title?: string
  readonly stage?: string
  readonly answered?: number
  readonly total?: number
}

async function whereNext(events: readonly LedgerEvent[]): Promise<Next> {
  const lessons = await courseLessons()
  const last = lastLesson(events)
  const at = last === undefined ? -1 : lessons.findIndex((l) => l.id === last)
  const first = lessons[0]
  if (at < 0) return { kind: 'start', id: first?.id ?? 'S1.L0', title: first?.title ?? 'Start here', stage: first?.stage.id ?? 'S1' }
  const done = answers(events)
  for (let k = at; k < lessons.length; k++) {
    const l = lessons[k]
    if (l === undefined) break
    const page = await loadPage(l.id)
    const p = page === null ? null : progressOf(page, done)
    if (p === null || !p.finished) {
      return { kind: k === at ? 'continue' : 'next', id: l.id, title: l.title, stage: l.stage.id, ...(p !== null ? { answered: p.answered, total: p.total } : {}) }
    }
  }
  return { kind: 'end' }
}

export function TodayScreen() {
  useTitle('Today')
  const store = useStore()
  const events = useEvents(store)
  const record = events.status === 'ready' ? events.events : events.status === 'unavailable' ? [] : null
  const next = useLoaded(async () => (record === null ? null : whereNext(record)), [record === null ? 'wait' : record.length, record?.[record.length - 1]?.id ?? ''])

  return (
    <article className="screen today">
      <header className="screen-head">
        <p className="kicker">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h1>Today</h1>
        <p className="lede">Pick up where you left off. Stop after any step and nothing is lost.</p>
      </header>

      {next.status === 'error' ? <p className="status">Where you left off could not be worked out ({next.message}).</p> : null}
      {next.status === 'loading' || (next.status === 'ready' && next.value === null) ? <Loading what="where you left off" /> : null}
      {next.status === 'ready' && next.value !== null ? <NextCard next={next.value} unavailable={events.status === 'unavailable'} /> : null}

      <section aria-labelledby="today-more">
        <h2 id="today-more">Also here</h2>
        <ul className="rows">
          <li>
            <Link to="/stages" className="row">
              <span className="row-id">▸</span>
              <span className="row-body">
                <span className="row-title">All stages</span>
                <span className="row-meta">every lesson, lab and drawer, in order</span>
              </span>
            </Link>
          </li>
          <li>
            <Link to="/mirror" className="row">
              <span className="row-id">▸</span>
              <span className="row-body">
                <span className="row-title">The Mirror</span>
                <span className="row-meta">how your calls compare with how sure you said you were</span>
              </span>
            </Link>
          </li>
          <li>
            <Link to="/specimens" className="row">
              <span className="row-id">▸</span>
              <span className="row-body">
                <span className="row-title">The specimen cabinet</span>
                <span className="row-meta">the counterexamples you have met, labeled from their runs</span>
              </span>
            </Link>
          </li>
        </ul>
      </section>
    </article>
  )
}

function NextCard({ next, unavailable }: { readonly next: Next; readonly unavailable: boolean }) {
  if (next.kind === 'end') {
    return (
      <section className="sheet today-card" aria-labelledby="today-next">
        <p className="kicker">The whole course</p>
        <h2 id="today-next">Every lesson with questions is answered</h2>
        <p className="lede">Revisit any stage, or open a lab on the Bench.</p>
        <p className="actions">
          <Link to="/stages" className="button button-primary">
            All stages
          </Link>
        </p>
      </section>
    )
  }
  const label = next.kind === 'start' ? 'Start here' : next.kind === 'continue' ? 'Continue' : 'Next'
  return (
    <section className="sheet today-card" aria-labelledby="today-next">
      <p className="kicker">
        {label} · {next.id}
      </p>
      <h2 id="today-next">{next.title}</h2>
      <p className="lede">
        {next.kind === 'start'
          ? 'The course begins with a short first session: an agent says its change is safe, and you call it before the solver answers.'
          : next.kind === 'continue'
            ? next.total !== undefined
              ? `You have answered ${next.answered ?? 0} of its ${next.total} questions.`
              : 'This is where you were.'
            : 'You finished the lesson before it.'}
      </p>
      {unavailable ? <p className="meta">This browser is not keeping a practice record, so Today cannot remember where you were.</p> : null}
      <p className="actions">
        <Link to={`/lessons/${next.id ?? 'S1.L0'}`} className="button button-primary">
          {next.kind === 'start' ? 'Start the course' : `Open ${next.id}`}
        </Link>
        {next.stage !== undefined ? (
          <Link to={`/stages/${next.stage}`} className="button button-secondary">
            Stage {next.stage}
          </Link>
        ) : null}
      </p>
    </section>
  )
}
