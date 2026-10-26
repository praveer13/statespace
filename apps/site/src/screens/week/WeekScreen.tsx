// SCR-week · Your week (DESIGN.md SCR-week; M-set-your-week, M-weekly-review, M-monthly-retro; spine sections 3.0 and
// 3.11). The plan is a range of hours planned at the pessimistic end, two Bench blocks and the Keep block, which is
// computed from the schedule rather than fixed. The rhythm reads "met in k of the last 12 weeks" (target 8 or more), with
// a 7-day repair, two reserve weeks in every 12 and declared breaks that pause the window. Stage plans are ranges beside
// the roadmap's, and the arc is a projection, never "behind". The rules live in packages/learner/src/schedule/week.ts;
// this screen draws them and keeps the learner's settings in working state (plan.ts).

import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { DEFAULT_ITEM_MINUTES, MEET_SESSIONS, RESERVE_WEEKS, RHYTHM_TARGET, WINDOW_WEEKS, arcWeeks, deriveCards, deriveRhythm, keepBlock, medianItemMinutes, stageWeeks, stageWorkHours } from '@statespace/learner/schedule'
import type { KeepBlock, Rhythm, WeekPlan, WeekRow } from '@statespace/learner/schedule'
import { useEvents, useStore } from '../../app/ledger.ts'
import { useTitle } from '../../app/title.ts'
import { Loading } from '../../components/page/states.tsx'
import type { LedgerStore } from '../../storage/index.ts'
import { introductionsOf } from '../today/sources.ts'
import { localToday, reviewKey, useWeekPlan } from './plan.ts'
import { ARC_HOURS, STAGE_PLANS } from './stages.ts'
import './week.css'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

const one = (x: number): string => (Math.round(x * 10) / 10).toFixed(1).replace(/\.0$/, '')
const dateWords = (day: string): string => new Date(`${day}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

export function WeekScreen() {
  useTitle('Your week')
  const store = useStore()
  const events = useEvents(store)
  const [today] = useState(localToday)
  const [planState, save] = useWeekPlan(store)
  const record = events.status === 'ready' ? events.events : events.status === 'unavailable' ? [] : null
  const plan = planState.plan

  const derived = useMemo(() => {
    if (record === null) return null
    const introduced = introductionsOf(record)
    const cards = deriveCards({ events: record, introduced })
    const logged = medianItemMinutes(record)
    const itemMinutes = logged === undefined ? DEFAULT_ITEM_MINUTES : Math.round(logged * 2) / 2
    const clearinghouse = [...introduced.keys()].some((k) => /^KC-([3-9]|10)\./.test(k))
    const keep = keepBlock({ cards, today, hours: plan.hours[0], itemMinutes, clearinghouse })
    return { rhythm: deriveRhythm(record, today, plan), keep, logged: logged !== undefined }
  }, [record, today, plan])

  return (
    <article className="screen week">
      <header className="screen-head wk-head">
        <h1>Your week</h1>
        <p className="lede wk-lede">Plan in ranges, at the pessimistic end. Nothing here is a deadline, and a short week costs nothing.</p>
        <p className="wk-back">
          <Link to="/today">Back to Today</Link>
        </p>
      </header>
      {derived === null || planState.status === 'loading' ? (
        <Loading what="your week" />
      ) : (
        <div className="wk-layout">
          <div className="wk-col">
            <Range plan={plan} save={save} unavailable={planState.status === 'unavailable'} />
            <Keep keep={derived.keep} logged={derived.logged} hours={plan.hours} />
            <RhythmView rhythm={derived.rhythm} plan={plan} save={save} today={today} />
          </div>
          <div className="wk-col">
            <Review store={store} monday={derived.rhythm.current.start} />
            <Retro plan={plan} save={save} />
            <Stages plan={plan} />
          </div>
        </div>
      )}
    </article>
  )
}

/** A range drawn as a dimension line on a 0..max axis: a solid line with end ticks (DESIGN.md section 1.2). */
function Dimension({ lo, hi, max, label, faint }: { readonly lo: number; readonly hi: number; readonly max: number; readonly label?: string; readonly faint?: boolean }) {
  const W = 300
  const x = (v: number): number => Math.round((Math.max(0, Math.min(max, v)) / max) * W * 10) / 10
  return (
    <svg className={`wk-dim${faint === true ? ' wk-dim-faint' : ''}`} viewBox={`0 0 ${W} 22`} aria-hidden="true" focusable="false">
      <path className="wk-axis" d={`M0 18 H${W}`} />
      <path className="wk-line" d={`M${x(lo)} 9 H${x(hi)} M${x(lo)} 4 V14 M${x(hi)} 4 V14`} />
      {label !== undefined ? <title>{label}</title> : null}
    </svg>
  )
}

function Range({ plan, save, unavailable }: { readonly plan: WeekPlan; readonly save: (p: WeekPlan) => Promise<void>; readonly unavailable: boolean }) {
  const [lo, setLo] = useState(String(plan.hours[0]))
  const [hi, setHi] = useState(String(plan.hours[1]))
  const [days, setDays] = useState<number[]>([...plan.benchDays])
  const [note, setNote] = useState<string | undefined>(undefined)
  useEffect(() => {
    setLo(String(plan.hours[0]))
    setHi(String(plan.hours[1]))
    setDays([...plan.benchDays])
  }, [plan])
  const low = Number(lo)
  const high = Number(hi)
  const valid = Number.isFinite(low) && Number.isFinite(high) && low >= 2 && high <= 20 && low <= high
  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    if (!valid) return
    await save({ ...plan, hours: [low, high], benchDays: [...days].sort() })
    setNote(unavailable ? 'Set for this visit. This browser is not keeping a record, so it will not be remembered.' : 'Saved.')
  }
  const toggle = (d: number): void => setDays((xs) => (xs.includes(d) ? xs.filter((x) => x !== d) : [...xs, d]))
  return (
    <section className="wk-section" aria-labelledby="wk-range">
      <h2 id="wk-range">Your range</h2>
      <form className="wk-form" onSubmit={(e) => void submit(e)}>
        <fieldset className="wk-hours">
          <legend>Hours a week</legend>
          <label>
            <span>From</span>
            <input type="number" inputMode="decimal" min={2} max={20} step={0.5} value={lo} onChange={(e) => setLo(e.target.value)} />
          </label>
          <label>
            <span>to</span>
            <input type="number" inputMode="decimal" min={2} max={20} step={0.5} value={hi} onChange={(e) => setHi(e.target.value)} />
          </label>
        </fieldset>
        {valid ? (
          <div className="wk-figure">
            <Dimension lo={low} hi={high} max={12} label={`${lo} to ${hi} hours`} />
            <div className="wk-axis-labels" aria-hidden="true">
              <span>0 h</span>
              <span>6 h</span>
              <span>12 h</span>
            </div>
          </div>
        ) : (
          <p className="wk-note">A range from 2 to 20 hours, low end first.</p>
        )}
        <p className="wk-text">
          Planned at the pessimistic end: the week reads your low end, {valid ? one(low) : '‹low›'} hours, and stage estimates are allowed 1.6 times their printed figure,
          because plans run long. That leaves about {valid ? one(stageWorkHours(low)) : '‹n›'} hours of stage work after the Keep block.
        </p>
        <fieldset className="wk-days">
          <legend>Two Bench blocks, 90 to 150 minutes each, on days you pick</legend>
          <div className="wk-day-list">
            {DAY_ORDER.map((d) => (
              <label key={d} className="wk-day">
                <input type="checkbox" checked={days.includes(d)} onChange={() => toggle(d)} />
                <span>{DAYS[d]}</span>
              </label>
            ))}
          </div>
          <p className="wk-note">Pick two or three days; any time on those days will do.{days.length > 0 && (days.length < 2 || days.length > 3) ? ` You have ${days.length}.` : ''}</p>
        </fieldset>
        <p className="actions">
          <button type="submit" className="button button-primary" disabled={!valid}>
            Save the plan
          </button>
          <span role="status" className="wk-note">
            {note}
          </span>
        </p>
      </form>
    </section>
  )
}

function Keep({ keep, logged, hours }: { readonly keep: KeepBlock; readonly logged: boolean; readonly hours: readonly [number, number] }) {
  const [a, b] = keep.minutes
  return (
    <section className="wk-section" aria-labelledby="wk-keep">
      <h2 id="wk-keep">The Keep block</h2>
      <p className="wk-text">
        Computed from your schedule, not a constant: about <strong>{a === b ? a : `${a} to ${b}`} minutes a week</strong>. Today's sessions, audit cases and re-finds run inside it.
      </p>
      <dl className="wk-terms">
        {keep.terms.map((t) => (
          <div key={t.what}>
            <dt>{t.what}</dt>
            <dd>{t.minutes[0] === t.minutes[1] ? `${t.minutes[0]} min` : `${t.minutes[0]}–${t.minutes[1]} min`}</dd>
          </div>
        ))}
      </dl>
      <p className="wk-note">
        {keep.reviews} {keep.reviews === 1 ? 'idea comes' : 'ideas come'} round in the next 7 days, at about {keep.itemMinutes} minutes an item
        {logged ? ', your own median from logged times.' : ' [D], until five of your answers have logged times.'} The plan at {one(hours[0])} hours a week is {keep.planned[0]}–{keep.planned[1]} minutes [D].
      </p>
      {keep.over ? <p className="wk-text">This runs past the planned figure, so the week's stage work is lowered; the Keep block stays as it is.</p> : null}
    </section>
  )
}

const STATUS_WORD: Record<WeekRow['status'], string> = { met: 'met', 'made-up': 'made up', reserve: 'reserve week', open: 'open', paused: 'paused' }

function RhythmView({ rhythm, plan, save, today }: { readonly rhythm: Rhythm; readonly plan: WeekPlan; readonly save: (p: WeekPlan) => Promise<void>; readonly today: string }) {
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const addBreak = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    if (from === '' || to === '' || to < from) return
    await save({ ...plan, breaks: [...plan.breaks, { from, to }] })
  }
  const current = rhythm.current
  return (
    <section className="wk-section" aria-labelledby="wk-rhythm">
      <h2 id="wk-rhythm">Rhythm</h2>
      <p className="wk-big">
        {rhythm.onBreak !== undefined
          ? `On a break until ${dateWords(rhythm.onBreak.to)}; the window is paused.`
          : rhythm.starting
            ? 'Starts counting this week.'
            : `Met in ${rhythm.met} of the last ${rhythm.of} ${rhythm.of === 1 ? 'week' : 'weeks'}.`}
      </p>
      <p className="wk-text">
        The aim is {RHYTHM_TARGET} or more of {WINDOW_WEEKS}. A week is met by {MEET_SESSIONS} sessions of graded or Bench work [D]. A week that falls short can be made up within the 7 days after it, and {RESERVE_WEEKS} reserve weeks in every {WINDOW_WEEKS} are built into the plan.
      </p>
      {rhythm.weeks.length > 0 ? (
        <ol className="wk-weeks">
          {rhythm.weeks.map((w) => (
            <li key={w.start} className="wk-week" data-status={w.status}>
              <span className="wk-cell" aria-hidden="true" />
              <span className="wk-week-date">{dateWords(w.start)}</span>
              <span className="wk-week-status">{STATUS_WORD[w.status]}</span>
            </li>
          ))}
        </ol>
      ) : null}
      <p className="wk-text">
        This week{' '}
        {current.status === 'met'
          ? 'is met.'
          : current.sessions === 0
            ? `starts fresh: ${current.needs === 1 ? 'one session meets it' : `${current.needs} sessions meet it`}.`
            : `holds ${current.sessions} ${current.sessions === 1 ? 'session' : 'sessions'}; ${current.needs} meet it.`}
      </p>
      <form className="wk-form wk-break" onSubmit={(e) => void addBreak(e)}>
        <fieldset>
          <legend>Declare a break</legend>
          <label>
            <span>From</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            <span>to</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <button type="submit" className="button button-secondary">
            Add the break
          </button>
        </fieldset>
      </form>
      {plan.breaks.length > 0 ? (
        <ul className="wk-breaks">
          {plan.breaks.map((b, i) => (
            <li key={`${b.from}-${b.to}-${i}`}>
              <span>
                {dateWords(b.from)} to {dateWords(b.to)}
              </span>
              <button type="button" className="wk-link" onClick={() => void save({ ...plan, breaks: plan.breaks.filter((_, j) => j !== i) })}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

function Review({ store, monday }: { readonly store: LedgerStore | null | undefined; readonly monday: string }) {
  const [text, setText] = useState('')
  const [note, setNote] = useState<string | undefined>(undefined)
  useEffect(() => {
    if (store === null || store === undefined) return
    let live = true
    void store
      .getWorking(reviewKey(monday))
      .then((v) => {
        if (live && typeof v === 'string') setText(v)
      })
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [store, monday])
  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    if (store === null || store === undefined) {
      setNote('This browser is not keeping a record, so the review was not kept.')
      return
    }
    await store.setWorking(reviewKey(monday), text)
    setNote('Kept on this device.')
  }
  return (
    <section className="wk-section" aria-labelledby="wk-review">
      <h2 id="wk-review">Weekly review</h2>
      <p className="wk-text">
        Five minutes over your <Link to="/claims">claims</Link>. Nobody grades it and it earns nothing; it is for you.
      </p>
      <form className="wk-form" onSubmit={(e) => void submit(e)}>
        <label className="wk-area">
          <span>What can you now reason about that you could not a week ago?</span>
          <textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        <p className="actions">
          <button type="submit" className="button button-secondary">
            Keep the review
          </button>
          <span role="status" className="wk-note">
            {note}
          </span>
        </p>
      </form>
      <p className="wk-note">If someone you respect reads your claim cards, this is a good week to send them one. That is optional.</p>
    </section>
  )
}

function Retro({ plan, save }: { readonly plan: WeekPlan; readonly save: (p: WeekPlan) => Promise<void> }) {
  const [a, setA] = useState(plan.ifThen[0] ?? '')
  const [b, setB] = useState(plan.ifThen[1] ?? '')
  const [note, setNote] = useState<string | undefined>(undefined)
  useEffect(() => {
    setA(plan.ifThen[0] ?? '')
    setB(plan.ifThen[1] ?? '')
  }, [plan])
  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    await save({ ...plan, ifThen: [a, b].map((s) => s.trim()).filter((s) => s !== '') })
    setNote('Kept.')
  }
  return (
    <section className="wk-section" aria-labelledby="wk-retro">
      <h2 id="wk-retro">Monthly retro</h2>
      <p className="wk-text">Fifteen minutes once a month, and again at a stage's start or after time away: one or two plans of the form "if this happens, then I will do that".</p>
      <form className="wk-form" onSubmit={(e) => void submit(e)}>
        <label className="wk-area">
          <span>First plan</span>
          <input type="text" value={a} placeholder="If Tuesday's block slips, then I do it Wednesday at 7" onChange={(e) => setA(e.target.value)} />
        </label>
        <label className="wk-area">
          <span>Second plan (optional)</span>
          <input type="text" value={b} onChange={(e) => setB(e.target.value)} />
        </label>
        <p className="actions">
          <button type="submit" className="button button-secondary">
            Keep the plans
          </button>
          <span role="status" className="wk-note">
            {note}
          </span>
        </p>
      </form>
    </section>
  )
}

function Stages({ plan }: { readonly plan: WeekPlan }) {
  const [lo, hi] = plan.hours
  const arc = arcWeeks(ARC_HOURS, lo, hi)
  const max = 12
  return (
    <section className="wk-section" aria-labelledby="wk-stages">
      <h2 id="wk-stages">Stage plans</h2>
      <p className="wk-text">
        Each stage's planned hours [D], in weeks at your range, beside the roadmap's time. The whole course projects to about{' '}
        <strong>
          {Math.round(arc[0])} to {Math.round(arc[1])} weeks
        </strong>{' '}
        at {one(lo)} to {one(hi)} hours a week, planned at the pessimistic end with two reserve weeks in every twelve. It is a range, and it moves as your logged times replace the estimates.
      </p>
      <div className="wk-table-wrap">
        <table className="wk-table">
          <thead>
            <tr>
              <th scope="col">Stage</th>
              <th scope="col">Plan [D]</th>
              <th scope="col">At your range</th>
              <th scope="col">Roadmap</th>
            </tr>
          </thead>
          <tbody>
            {STAGE_PLANS.map((s) => {
              const w = stageWeeks(s.hours, lo, hi)
              return (
                <tr key={s.id}>
                  <th scope="row">
                    <span className="wk-stage-id">{s.id}</span> {s.title}
                  </th>
                  <td>
                    {one(s.hours[0])}–{one(s.hours[1])} h
                  </td>
                  <td>
                    {one(w[0])}–{one(w[1])} weeks
                    <Dimension lo={w[0]} hi={w[1]} max={max} />
                    {s.roadmapWeeks !== null ? <Dimension lo={s.roadmapWeeks[0]} hi={s.roadmapWeeks[1]} max={max} faint /> : null}
                  </td>
                  <td>{s.roadmap}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="wk-note">In each row the upper line is your range and the lighter line the roadmap's, on one axis of 0 to 12 weeks.</p>
    </section>
  )
}
