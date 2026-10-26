// SCR-today (DESIGN.md SCR-today; M-today, M-welcome-back): the home for return visits. Today's set comes first: a
// 10-12-minute session composed by the scheduler in packages/learner/src/schedule (due items on fresh seeds from the KC
// graph and the record, at most one audit case, re-finds of mounted specimens at least 7 days later, sure-and-wrong
// returns), or a welcome-back set after a week or more away. Beside it: where you stopped (the resume card), cards for
// anything that has changed, and the week in one gain-framed line. All of it is derived at read time (I2).
//
// In the Little Library world the place you stopped is a small cover in that volume's ink, the lesson's title, its
// colophon and one action. The week is told in ranges, never as a count to keep up with. The page itself belongs to no
// volume, so its accent is the series black (--vol-10).

import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { deriveRhythm, planToday } from '@statespace/learner/schedule'
import type { Rhythm } from '@statespace/learner/schedule'
import { tierFormat } from '@statespace/content'
import type { Tier } from '@statespace/content'
import type { LedgerEvent } from '@statespace/ledger'
import { courseLessons, loadPage, useLoaded } from '../../app/content.ts'
import { useEvents, useStore } from '../../app/ledger.ts'
import { answers, lastLesson, progressOf } from '../../app/progress.ts'
import { useTitle } from '../../app/title.ts'
import { Loading } from '../../components/page/states.tsx'
import { CoverArt } from '../../components/volume/CoverArt.tsx'
import { Session, composition } from './Session.tsx'
import { changesOf, introductionsOf, loadSources, refindsOf } from './sources.ts'
import { localToday, useWeekPlan } from '../week/plan.ts'
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
  const recordKey = [record === null ? 'wait' : record.length, record?.[record.length - 1]?.id ?? '']
  const next = useLoaded(async () => (record === null ? null : whereNext(record)), recordKey)
  const [today] = useState(localToday)
  const srcs = useLoaded(loadSources, [])
  const changes = useLoaded(async () => (record === null ? null : changesOf(record)), recordKey)
  const [week] = useWeekPlan(store)
  const ready = next.status === 'ready' && next.value !== null ? next.value : null
  const plan = useMemo(() => {
    if (record === null || srcs.status !== 'ready') return null
    const { templates, callTemplates, audits } = srcs.value
    return planToday({
      events: record,
      today,
      introduced: introductionsOf(record),
      templatesOf: (kc) => templates.get(kc) ?? [],
      callTemplates,
      audits,
      refinds: refindsOf(record, today),
      changes: changes.status === 'ready' && changes.value !== null ? changes.value : [],
    })
  }, [record, srcs, changes, today])
  const rhythm = useMemo(() => (record === null ? null : deriveRhythm(record, today, week.plan)), [record, today, week.plan])
  // One erosion forecast a session at most (spine section 5.4): the fired erosion on the oldest open seam. The seams
  // load lazily, so they do not weigh on Today's first paint.
  const erosions = useLoaded(async () => (record === null ? null : (await import('../report/useErosions.ts')).erosionsOf(record)), recordKey)
  const fired = erosions.status === 'ready' ? erosions.value?.next : undefined
  const forecast = fired !== undefined && fired.status === 'fired' ? fired : undefined
  const defenceStage = ready?.stage ?? 'S1'

  return (
    <article className="screen today">
      <header className="screen-head td-head">
        <h1>Today</h1>
        <p className="td-date">
          <time dateTime={today}>{new Date(`${today}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</time>
        </p>
        <p className="lede td-lede td-composition">{plan !== null && plan.cards.length > 0 ? composition(plan) : 'A 10 to 12 minute session, three to five times a week. Stop after any step and nothing is lost.'}</p>
      </header>

      <div className="td-layout">
        <div className="td-main">
          {srcs.status === 'error' ? <p className="status">Today's set could not be put together ({srcs.message}).</p> : null}
          {plan === null && srcs.status !== 'error' ? <Loading what="today's set" /> : null}
          {plan !== null && record !== null ? <Session plan={plan} events={record} store={store} /> : null}
          {plan !== null && plan.mode === 'bench' ? <BenchExtras /> : null}
        </div>

        <div className="td-side">
          {next.status === 'error' ? <p className="status">Where you left off could not be worked out ({next.message}).</p> : null}
          {ready !== null ? <NextCard next={ready} unavailable={events.status === 'unavailable'} /> : null}

          {plan !== null && plan.changes.length > 0 ? (
            <section className="td-section" aria-labelledby="today-changes">
              <h2 id="today-changes">This has changed</h2>
              <ul className="td-rows">
                {plan.changes.map((c) => (
                  <li key={c.id}>
                    <Link to={c.href} className="td-row">
                      <span className="td-row-title">{c.title}</span>
                      <span className="td-row-meta">{c.detail}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {forecast !== undefined ? (
            <section className="td-section" aria-labelledby="today-erosion">
              <h2 id="today-erosion">An earlier assumption is in question</h2>
              <ul className="td-rows">
                <li>
                  <Link to={`/report/erosions/${forecast.id}`} className="td-row">
                    <span className="td-row-title">{forecast.id} · forecast which part cracks</span>
                    <span className="td-row-meta">a specimen from your record meets {forecast.seam}; make your call before you read it</span>
                  </Link>
                </li>
              </ul>
            </section>
          ) : null}

          {rhythm !== null ? <WeekLine rhythm={rhythm} hours={week.plan.hours} /> : null}

          <section className="td-section" aria-labelledby="today-more">
            <h2 id="today-more">Also here</h2>
            <ul className="td-rows">
              <li>
                <Link to="/mirror" className="td-row">
                  <span className="td-row-title">The Mirror</span>
                  <span className="td-row-meta">how your calls compare with how sure you said you were</span>
                </Link>
              </li>
              <li>
                <Link to="/week" className="td-row">
                  <span className="td-row-title">Your week</span>
                  <span className="td-row-meta">your range of hours, the Keep block and the weekly rhythm</span>
                </Link>
              </li>
              <li>
                <Link to={`/defence/${defenceStage}`} className="td-row">
                  <span className="td-row-title">The {defenceStage} Defence</span>
                  <span className="td-row-meta">the four-part sign-off, open whenever you want to take it, over two sessions or more</span>
                </Link>
              </li>
              <li>
                <Link to="/world" className="td-row">
                  <span className="td-row-title">The Clearinghouse</span>
                  <span className="td-row-meta">this week's incidents in the shared ledger world</span>
                </Link>
              </li>
              <li>
                <Link to="/stages" className="td-row">
                  <span className="td-row-title">All stages</span>
                  <span className="td-row-meta">every lesson, lab and drawer, in order</span>
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

/** "Back at the bench" adds the last claim card and the next artifact restated (DESIGN.md SCR-today). */
function BenchExtras() {
  return (
    <section className="td-section" aria-labelledby="today-bench">
      <h2 id="today-bench">Then, at the bench</h2>
      <ul className="td-rows">
        <li>
          <Link to="/claims" className="td-row">
            <span className="td-row-title">Read your last claim card</span>
            <span className="td-row-meta">restate what it says before you read it, then compare</span>
          </Link>
        </li>
        <li>
          <Link to="/stages" className="td-row">
            <span className="td-row-title">Restate the next piece of your lab</span>
            <span className="td-row-meta">in a sentence of your own, before you open the Bench</span>
          </Link>
        </li>
      </ul>
    </section>
  )
}

/** The week in one line, gain-framed: met weeks out of the weeks counted so far, never a count of what was missed. */
function WeekLine({ rhythm, hours }: { readonly rhythm: Rhythm; readonly hours: readonly [number, number] }) {
  return (
    <section className="td-section" aria-labelledby="today-week">
      <h2 id="today-week">This week</h2>
      <dl className="td-colophon td-week">
        <div>
          <dt>Rhythm</dt>
          <dd>
            {rhythm.onBreak !== undefined
              ? `On a break until ${rhythm.onBreak.to}; the window is paused.`
              : rhythm.starting
                ? 'Starts counting this week.'
                : `Met in ${rhythm.met} of the last ${rhythm.of} ${rhythm.of === 1 ? 'week' : 'weeks'}.`}
            {rhythm.current.status === 'met' ? ' This week is met.' : ''}
          </dd>
        </div>
        <div>
          <dt>Your range</dt>
          <dd>
            {hours[0]} to {hours[1]} hours a week
          </dd>
        </div>
        <div>
          <dt>A session</dt>
          <dd>10 to 12 minutes, 3 to 5 times a week, inside the Keep block</dd>
        </div>
      </dl>
      <p className="td-week-link">
        <Link to="/week">Your week</Link>
      </p>
    </section>
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
