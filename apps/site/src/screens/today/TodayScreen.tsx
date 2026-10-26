// SCR-today, the happy path's version: continue where you left off. The lesson of the most recent answer in the practice
// record is where the learner was; if every question there is answered, the next lesson in course order that is not
// finished is next. With nothing in the record, the course starts with Start here (S1.L0). Derived at read time (I2).
// Below it, a short set of generated questions on the KCs the learner has met (DueSet.tsx); the scheduled plan of due
// items, re-finds and audit cases (DESIGN.md SCR-today) arrives with the scheduler.
//
// In the Little Library world the place you stopped is the page's hero: the volume it belongs to as a small cover in
// that volume's ink, the lesson's title, its colophon and one primary action. The week is told in ranges, never as a
// count to keep up with. The page itself belongs to no volume, so its accent is the series black (--vol-10).

import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { tierFormat } from '@statespace/content'
import type { Tier } from '@statespace/content'
import type { LedgerEvent } from '@statespace/ledger'
import { courseLessons, loadPage, useLoaded } from '../../app/content.ts'
import { useEvents, useStore } from '../../app/ledger.ts'
import { answers, lastLesson, progressOf } from '../../app/progress.ts'
import { useTitle } from '../../app/title.ts'
import { Loading } from '../../components/page/states.tsx'
import { CoverArt } from '../../components/volume/CoverArt.tsx'
import { DueSet } from './DueSet.tsx'
import { splitTitle, volumeOf } from '../../components/volume/volumes.ts'
import '../../components/volume/volume.css'
import './today.css'

/** What is left of a volume from the next lesson on: its lessons and their printed minutes. */
interface Left {
  readonly lessons: number
  readonly minutes: number
}

interface Next {
  readonly kind: 'start' | 'continue' | 'next' | 'end'
  readonly id?: string
  readonly title?: string
  readonly stage?: string
  readonly stageTitle?: string
  readonly format?: string
  readonly minutes?: number | null
  readonly answered?: number
  readonly total?: number
  readonly left?: Left
}

type Lessons = Awaited<ReturnType<typeof courseLessons>>

/** The lessons of `at`'s stage from `at` on, and the minutes they print (lessons with no minutes yet add none). */
function leftFrom(lessons: Lessons, at: number): Left {
  const stage = lessons[at]?.stage.id
  let count = 0
  let minutes = 0
  for (let k = at; k < lessons.length; k++) {
    const l = lessons[k]
    if (l === undefined || l.stage.id !== stage) break
    count += 1
    minutes += l.minutes ?? 0
  }
  return { lessons: count, minutes }
}

const formatOf = (tier: string): string => tierFormat(tier as Tier)

async function whereNext(events: readonly LedgerEvent[]): Promise<Next> {
  const lessons = await courseLessons()
  const last = lastLesson(events)
  const at = last === undefined ? -1 : lessons.findIndex((l) => l.id === last)
  const first = lessons[0]
  if (at < 0) {
    return {
      kind: 'start',
      id: first?.id ?? 'S1.L0',
      title: first?.title ?? 'Start here',
      stage: first?.stage.id ?? 'S1',
      ...(first !== undefined ? { stageTitle: first.stage.title, format: formatOf(first.tier), minutes: first.minutes, left: leftFrom(lessons, 0) } : {}),
    }
  }
  const done = answers(events)
  for (let k = at; k < lessons.length; k++) {
    const l = lessons[k]
    if (l === undefined) break
    const page = await loadPage(l.id)
    const p = page === null ? null : progressOf(page, done)
    if (p === null || !p.finished) {
      return {
        kind: k === at ? 'continue' : 'next',
        id: l.id,
        title: l.title,
        stage: l.stage.id,
        stageTitle: l.stage.title,
        format: formatOf(l.tier),
        minutes: l.minutes,
        left: leftFrom(lessons, k),
        ...(p !== null ? { answered: p.answered, total: p.total } : {}),
      }
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
  const now = new Date()
  const ready = next.status === 'ready' && next.value !== null ? next.value : null

  return (
    <article className="screen today">
      <header className="screen-head td-head">
        <h1>Today</h1>
        <p className="lede td-lede">Pick up where you left off. Stop after any step and nothing is lost.</p>
        <p className="td-date">
          <time dateTime={`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`}>
            {now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </time>
        </p>
      </header>

      <div className="td-layout">
        <div className="td-main">
          {next.status === 'error' ? <p className="status">Where you left off could not be worked out ({next.message}).</p> : null}
          {next.status === 'loading' || (next.status === 'ready' && next.value === null) ? <Loading what="where you left off" /> : null}
          {ready !== null ? <NextCard next={ready} unavailable={events.status === 'unavailable'} /> : null}
          {record !== null ? <DueSet events={record} store={store} /> : null}
        </div>

        <div className="td-side">
          {ready !== null ? <Week next={ready} /> : null}

          <section className="td-section" aria-labelledby="today-more">
            <h2 id="today-more">Also here</h2>
            <ul className="td-rows">
              <li>
                <Link to="/stages" className="td-row">
                  <span className="td-row-title">All stages</span>
                  <span className="td-row-meta">every lesson, lab and drawer, in order</span>
                </Link>
              </li>
              <li>
                <Link to="/mirror" className="td-row">
                  <span className="td-row-title">The Mirror</span>
                  <span className="td-row-meta">how your calls compare with how sure you said you were</span>
                </Link>
              </li>
              <li>
                <Link to="/specimens" className="td-row">
                  <span className="td-row-title">The specimen cabinet</span>
                  <span className="td-row-meta">the counterexamples you have met, labeled from their runs</span>
                </Link>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </article>
  )
}

function NextCard({ next, unavailable }: { readonly next: Next; readonly unavailable: boolean }) {
  if (next.kind === 'end') {
    return (
      <section className="today-card td-hero td-hero-end" aria-labelledby="today-next" style={{ '--vol': 'var(--vol-10)' } as CSSProperties}>
        <h2 id="today-next" className="td-title">
          <span className="td-verb">The whole course</span>
          <span className="td-name">Every lesson with questions is answered</span>
        </h2>
        <div className="td-hero-text">
          <p className="td-lede-hero">Revisit any stage, or open a lab on the Bench.</p>
          <p className="actions td-actions">
            <Link to="/stages" className="button button-primary td-go">
              All stages
            </Link>
          </p>
        </div>
      </section>
    )
  }
  const label = next.kind === 'start' ? 'Start here' : next.kind === 'continue' ? 'Continue' : 'Next'
  const v = next.stage !== undefined ? volumeOf(next.stage) : undefined
  const vol = next.stageTitle !== undefined ? splitTitle(next.stageTitle) : undefined
  const id = next.id ?? 'S1.L0'
  return (
    <section className="today-card td-hero" aria-labelledby="today-next" style={{ '--vol': v?.ink ?? 'var(--vol-10)' } as CSSProperties}>
      {v !== undefined ? (
        <div className="td-cover mini-cover" aria-hidden="true">
          <CoverArt kind={v.motif} id={`today-cover-${v.id}`} />
          <span className="mini-cover-n">{v.n}</span>
        </div>
      ) : null}
      <h2 id="today-next" className="td-title">
        {label !== next.title ? <span className="td-verb">{label}</span> : null}
        <span className="td-name">{next.title}</span>
      </h2>
      <div className="td-hero-text">
        <p className="td-lede-hero">
          {next.kind === 'start'
            ? 'The course begins with a short first session: an agent says its change is "safe", and you call it before the solver answers.'
            : next.kind === 'continue'
              ? next.total !== undefined
                ? `You have answered ${next.answered ?? 0} of its ${next.total} questions.`
                : 'This is where you were.'
              : 'You finished the lesson before it.'}
        </p>
        {next.kind === 'continue' && next.total !== undefined && next.total > 0 ? <Answered answered={next.answered ?? 0} total={next.total} /> : null}
        <dl className="td-colophon">
          <div>
            <dt>Address</dt>
            <dd>
              <code>{id}</code>
            </dd>
          </div>
          {v !== undefined && vol !== undefined ? (
            <div>
              <dt>Volume</dt>
              <dd>
                <span className="td-swatch" aria-hidden="true" />
                {v.n} · {vol.name}
                {vol.tools !== '' ? <span className="td-tools"> {vol.tools}</span> : null}
              </dd>
            </div>
          ) : null}
          {next.format !== undefined ? (
            <div>
              <dt>Format</dt>
              <dd>
                {next.format}
                {next.minutes !== undefined && next.minutes !== null ? `, about ${next.minutes} minutes` : ''}
              </dd>
            </div>
          ) : null}
        </dl>
        {unavailable ? <p className="meta td-note">This browser is not keeping a practice record, so Today cannot remember where you were.</p> : null}
        <p className="actions td-actions">
          <Link to={`/lessons/${id}`} className="button button-primary td-go">
            {next.kind === 'start' ? 'Start the course' : `Open ${next.id}`}
          </Link>
          {next.stage !== undefined ? (
            <Link to={`/stages/${next.stage}`} className="button button-secondary">
              Stage {next.stage}
            </Link>
          ) : null}
        </p>
      </div>
    </section>
  )
}

/** The lesson's questions as a row of marks: filled squares for answered, open squares for the rest. The sentence above says it in words. */
function Answered({ answered, total }: { readonly answered: number; readonly total: number }) {
  const shown = Math.min(total, 24)
  return (
    <p className="td-marks" aria-hidden="true">
      {Array.from({ length: shown }, (_, i) => (
        <span key={i} className={i < answered ? 'td-mark td-mark-done' : 'td-mark'} />
      ))}
    </p>
  )
}

/** The week, told in ranges: the session's length, how often, and what is left of this volume at its printed minutes. */
function Week({ next }: { readonly next: Next }) {
  const left = next.left
  const v = next.stage !== undefined ? volumeOf(next.stage) : undefined
  return (
    <section className="td-section" aria-labelledby="today-week">
      <h2 id="today-week">This week</h2>
      <dl className="td-colophon td-week">
        <div>
          <dt>A session</dt>
          <dd>10 to 12 minutes, and you can stop after any step</dd>
        </div>
        <div>
          <dt>How often</dt>
          <dd>3 to 5 sessions a week</dd>
        </div>
        {left !== undefined && left.minutes > 0 && v !== undefined ? (
          <div>
            <dt>Volume {v.n}</dt>
            <dd>
              {left.lessons} {left.lessons === 1 ? 'lesson' : 'lessons'} from here, {left.minutes} to {Math.ceil(left.minutes * 1.6)} minutes
              <span className="td-why">The high end allows 1.6 times the printed minutes, because plans run long.</span>
            </dd>
          </div>
        ) : null}
      </dl>
    </section>
  )
}
