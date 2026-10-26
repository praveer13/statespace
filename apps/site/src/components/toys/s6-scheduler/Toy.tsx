// A game for S6.L6: two sessions run one compilation of a debit at one isolation level, and the learner decides which
// session takes its next step. The page applies a small model of the PostgreSQL rules the lesson names (snapshots,
// row locks, the READ COMMITTED re-check, first-updater-wins, the read-write cycle check) and says, in words, what
// each step did and what the whole history comes to. "Show me" plays the lesson's own interleaving; "Every order"
// runs every schedule of this tiny model and counts the verdicts.

import { useId, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ToyFrame } from '../ToyFrame.tsx'
import {
  LESSON_ORDER,
  LEVEL_NAME,
  PATTERN_NAME,
  SIDS,
  START_BALANCE,
  VERDICT_NAME,
  advance,
  balances,
  everyOrder,
  finished,
  play,
  program,
  runnable,
  sql,
  start,
  summary,
} from './model.ts'
import type { Event, Level, Pattern, Sess, Sid, Verdict, World } from './model.ts'
import './scheduler.css'

const PATTERNS: readonly Pattern[] = ['rmw', 'cond', 'holds', 'opposite']
const LEVELS: readonly Level[] = ['rc', 'rr', 'ser']

const GOAL: Record<Pattern, string> = {
  rmw: 'find an order in which both debits of 80 take effect against a balance of 100',
  cond: 'find an order in which both debits of 80 take effect against a balance of 100',
  holds: 'find an order in which both holds of 80 take effect against a balance of 100',
  opposite: 'find an order in which the two transfers deadlock, and one in which both go through',
}

function laneState(w: World, sid: Sid): string {
  const me: Sess = w.s[sid]
  if (me.status === 'waiting') return `waiting for txn ${me.waitOn ?? ''}'s row lock`
  if (me.end === null) return me.pc === 0 ? 'not started' : 'running'
  switch (me.end.kind) {
    case 'commit':
      return me.zero ? 'committed, 0 rows updated' : 'committed'
    case 'refused':
      return 'refused by its guard, rolled back'
    case 'deadlock':
      return 'aborted: deadlock'
    case 'serialization':
      return me.end.at === 'commit' ? 'aborted at COMMIT: serialization failure' : 'aborted: serialization failure'
  }
}

/** The world in words: what is committed now. */
function committedLine(w: World): string {
  const b = balances(w)
  const accts = Object.entries(b)
    .map(([row, v]) => `account ${row} holds ${v < 0 ? `−${-v}` : v}`)
    .join(', ')
  if (w.pattern !== 'holds') return `Committed: ${accts}.`
  const held = w.holds.reduce((n, h) => n + h.amt, 0)
  return `Committed: ${accts}, with ${held} held.`
}

// ------------------------------------------------------------------ the history, drawn

const LANE_Y: Record<Sid, number> = { A: 26, B: 70 }
const LEFT = 52

function Mark({ e, x, fresh }: { readonly e: Event; readonly x: number; readonly fresh: boolean }) {
  const y = LANE_Y[e.sid]
  const land = fresh ? ' toy-land' : ''
  switch (e.kind) {
    case 'stmt':
      return <circle className={`tsch-stmt${land}`} cx={x} cy={y} r={5} />
    case 'zero':
    case 'wait':
      return <circle className={`tsch-ring${land}`} cx={x} cy={y} r={5} />
    case 'commit':
      return <rect className={`tsch-commit${land}`} x={x - 6} y={y - 6} width={12} height={12} />
    case 'refuse':
      return <rect className={`tsch-ring${land}`} x={x - 5.5} y={y - 5.5} width={11} height={11} />
    case 'abort':
      return (
        <g className={land.trim()}>
          <rect className="tsch-ring" x={x - 6} y={y - 6} width={12} height={12} />
          <path className="tsch-x" d={`M${x - 4} ${y - 4}L${x + 4} ${y + 4}M${x + 4} ${y - 4}L${x - 4} ${y + 4}`} />
        </g>
      )
  }
}

function Timeline({ w, label }: { readonly w: World; readonly label: string }) {
  const n = Math.max(w.log.length, 6)
  const dx = Math.min(44, 400 / n)
  const width = LEFT + dx * n + 16
  const xs = w.log.map((_, i) => LEFT + dx * i + dx / 2)
  const s = summary(w)
  const broken = finished(w) && (s.verdict === 'lost-update' || s.verdict === 'write-skew')
  // A wait is drawn as a thin rule from where it started to the session's next event (or to the end, while waiting).
  const waits = w.log.flatMap((e, i) => {
    if (e.kind !== 'wait') return []
    const j = w.log.findIndex((f, k) => k > i && f.sid === e.sid)
    const x2 = j === -1 ? width - 12 : (xs[j] as number)
    return [{ sid: e.sid, x1: xs[i] as number, x2, key: i }]
  })
  return (
    <svg className="toy-svg tsch-svg" viewBox={`0 0 ${width} ${broken ? 118 : 96}`} role="img" aria-label={label}>
      {SIDS.map((sid) => (
        <g key={sid}>
          <text className="tsch-lane-name" x={4} y={LANE_Y[sid] + 4}>
            txn {sid}
          </text>
          <line className="tsch-lane" x1={LEFT} x2={width - 8} y1={LANE_Y[sid]} y2={LANE_Y[sid]} />
        </g>
      ))}
      {waits.map((wt) => (
        <line key={wt.key} className="tsch-waitline" x1={wt.x1} x2={wt.x2} y1={LANE_Y[wt.sid]} y2={LANE_Y[wt.sid]} />
      ))}
      {w.log.map((e, i) => (
        <g key={i}>
          <Mark e={e} x={xs[i] as number} fresh={i === w.log.length - 1} />
          <text className="tsch-n" x={xs[i]} y={e.sid === 'A' ? LANE_Y.A - 11 : LANE_Y.B + 20} textAnchor="middle">
            {i + 1}
          </text>
        </g>
      ))}
      {broken ? (
        <g>
          <line className="line-violation tsch-broken" x1={LEFT} x2={width - 8} y1={110} y2={110} />
          <text className="tsch-broken-text" x={4} y={101}>
            {s.taken} taken from a balance of {START_BALANCE}
          </text>
        </g>
      ) : null}
    </svg>
  )
}

// ------------------------------------------------------------------ the game

export default function SchedulerGame() {
  const uid = useId().replace(/[^a-zA-Z0-9-]/g, '')
  const [pattern, setPattern] = useState<Pattern>('rmw')
  const [level, setLevel] = useState<Level>('rc')
  const [w, setW] = useState<World>(() => start('rmw', 'rc'))
  const [counted, setCounted] = useState<string | null>(null)
  const [status, setStatus] = useState<ReactNode>('Choose which transaction takes its next step.')

  const done = finished(w)
  const s = summary(w)
  const counts = useMemo(() => {
    if (counted !== `${pattern}:${level}`) return null
    const all = everyOrder(pattern, level)
    const by = new Map<Verdict, { n: number; serial: number }>()
    for (const o of all) {
      const c = by.get(o.summary.verdict) ?? { n: 0, serial: 0 }
      by.set(o.summary.verdict, { n: c.n + 1, serial: c.serial + (o.serial ? 1 : 0) })
    }
    return { total: all.length, rows: [...by.entries()] }
  }, [counted, pattern, level])

  const reset = (p: Pattern, l: Level, say?: ReactNode): void => {
    setPattern(p)
    setLevel(l)
    setW(start(p, l))
    setStatus(say ?? `${PATTERN_NAME[p]} at ${LEVEL_NAME[l]}. Choose which transaction takes its next step.`)
  }

  const step = (sid: Sid): void => {
    const next = advance(w, sid)
    setW(next)
    const fresh = next.log.slice(w.log.length)
    const said = fresh.map((e) => `Txn ${e.sid}: ${e.text}`).join(' ')
    if (finished(next)) setStatus(<><span>{said}</span> <strong>History complete.</strong> {summary(next).text}</>)
    else setStatus(said)
  }

  const showMe = (): void => {
    const played = play(pattern, level, LESSON_ORDER[pattern])
    setW(played)
    setStatus(
      <>
        <strong>The lesson&apos;s interleaving:</strong>{' '}
        {pattern === 'opposite' ? 'both debits first, then both credits.' : 'both sessions take their first step before either goes on.'}{' '}
        {summary(played).text}
      </>,
    )
  }

  const countAll = (): void => {
    setCounted(`${pattern}:${level}`)
    const all = everyOrder(pattern, level)
    const serial = all.filter((o) => o.serial).length
    setStatus(
      <>
        <strong>Every order counted.</strong> This tiny model has {all.length} complete schedules for {PATTERN_NAME[pattern]} at{' '}
        {LEVEL_NAME[level]}, {serial} of them serial. The table below sorts them by verdict.
      </>,
    )
  }

  const label =
    `History of ${PATTERN_NAME[pattern]} at ${LEVEL_NAME[level]}: ${w.log.length} events so far, numbered as in the list below. ` +
    (done ? s.text : `Txn A is ${laneState(w, 'A')}; txn B is ${laneState(w, 'B')}.`)

  return (
    <ToyFrame
      title="You are the scheduler"
      kind="Game"
      caption={
        <>
          Two sessions, the lesson&apos;s accounts and amounts, and a small model of the PostgreSQL rules this lesson names:
          per-statement or per-transaction snapshots, row locks, the READ COMMITTED re-check, first-updater-wins, the
          read-write cycle check and deadlock detection. The page computes every step itself; no database runs here, and the model covers these two
          sessions only. The recorded runs in the cells above are the evidence.
        </>
      }
    >
      <p className="toy-goal">Goal: {GOAL[pattern]}, or find that this level allows none. Then see what each isolation level does to that order.</p>

      <div className="tsch-pick">
        <fieldset className="toy-choice">
          <legend>Compilation</legend>
          {PATTERNS.map((p) => (
            <label key={p}>
              <input type="radio" name={`${uid}-pattern`} checked={pattern === p} onChange={() => reset(p, level)} />
              <span>{PATTERN_NAME[p]}</span>
            </label>
          ))}
        </fieldset>
        <fieldset className="toy-choice">
          <legend>Isolation level</legend>
          {LEVELS.map((l) => (
            <label key={l}>
              <input type="radio" name={`${uid}-level`} checked={level === l} onChange={() => reset(pattern, l)} />
              <span>{LEVEL_NAME[l]}</span>
            </label>
          ))}
        </fieldset>
      </div>

      <div className="tsch-lanes">
        {SIDS.map((sid) => {
          const me = w.s[sid]
          const prog = program(pattern, sid)
          const can = runnable(w, sid)
          return (
            <section key={sid} className="tsch-lane-box" aria-labelledby={`${uid}-${sid}`}>
              <h3 id={`${uid}-${sid}`} className="tsch-lane-head">
                Txn {sid} <span className="tsch-lane-state">{laneState(w, sid)}</span>
              </h3>
              <ol className="tsch-steps">
                {prog.map((st, i) => {
                  const state = i < me.pc ? 'done' : i === me.pc && me.status === 'waiting' ? 'waiting' : i === me.pc && me.end === null ? 'next' : 'later'
                  return (
                    <li key={i} className="tsch-step" data-state={state}>
                      <span className="tsch-step-mark" aria-hidden="true" />
                      <code>{sql(st, me.read)}</code>
                      <span className="visually-hidden">
                        {state === 'done' ? ' (done)' : state === 'waiting' ? ' (waiting)' : state === 'next' ? ' (next)' : ''}
                      </span>
                    </li>
                  )
                })}
              </ol>
              <button type="button" className="toy-button" data-primary={can ? 'true' : undefined} disabled={!can} onClick={() => step(sid)}>
                {can ? `Run txn ${sid}'s next step` : me.status === 'waiting' ? `Txn ${sid} is waiting` : `Txn ${sid} has ended`}
              </button>
            </section>
          )
        })}
      </div>

      <div className="toy-actions">
        <button type="button" className="toy-button" onClick={() => reset(pattern, level, 'Started over. Choose which transaction takes its next step.')}>
          Start over
        </button>
        <button type="button" className="toy-button" onClick={showMe}>
          Show me the lesson&apos;s order
        </button>
        <button type="button" className="toy-button" onClick={countAll}>
          Every order
        </button>
      </div>

      <p className="toy-status" aria-live="polite">
        {status}
      </p>

      <div className="tsch-history">
        <p className="tsch-committed">{committedLine(w)}</p>
        <Timeline w={w} label={label} />
        {w.log.length > 0 ? (
          <ol className="tsch-log">
            {w.log.map((e, i) => (
              <li key={i}>
                <span className="tsch-log-who">Txn {e.sid}</span> <code>{e.what}</code> <span className="tsch-log-text">{e.text}</span>
              </li>
            ))}
          </ol>
        ) : null}
        <ul className="toy-legend" aria-label="Key">
          <li>
            <svg className="toy-key" width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">
              <circle className="tsch-stmt" r={5} />
            </svg>
            statement ran
          </li>
          <li>
            <svg className="toy-key" width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">
              <circle className="tsch-ring" r={5} />
            </svg>
            waits, or 0 rows
          </li>
          <li>
            <svg className="toy-key" width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">
              <rect className="tsch-commit" x={-6} y={-6} width={12} height={12} />
            </svg>
            commit
          </li>
          <li>
            <svg className="toy-key" width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">
              <rect className="tsch-ring" x={-6} y={-6} width={12} height={12} />
              <path className="tsch-x" d="M-4 -4L4 4M4 -4L-4 4" />
            </svg>
            aborted (an open square alone: refused)
          </li>
          <li>
            <svg className="toy-key" width="22" height="14" viewBox="0 -7 22 14" aria-hidden="true">
              <line className="line-violation tsch-broken" x1={1} x2={21} y1={0} y2={0} />
            </svg>
            more taken than the account held
          </li>
        </ul>
      </div>

      {counts !== null ? (
        <div className="tsch-table-wrap">
          <table className="tsch-table">
            <caption>
              Every schedule of this model: {PATTERN_NAME[pattern]} at {LEVEL_NAME[level]}
            </caption>
            <thead>
              <tr>
                <th scope="col">Verdict</th>
                <th scope="col">Orders</th>
                <th scope="col">Of them serial</th>
              </tr>
            </thead>
            <tbody>
              {counts.rows.map(([v, c]) => (
                <tr key={v}>
                  <th scope="row">{VERDICT_NAME[v]}</th>
                  <td>{c.n}</td>
                  <td>{c.serial}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">All</th>
                <td>{counts.total}</td>
                <td>{counts.rows.reduce((n, [, c]) => n + c.serial, 0)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : null}
    </ToyFrame>
  )
}
