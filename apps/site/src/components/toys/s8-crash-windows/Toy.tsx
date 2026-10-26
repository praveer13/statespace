// A game for "Every crash window" (S8.L3): play the Outbox model for one command by hand, with the crash allowed in one
// window, and try to make the provider charge twice. Every action is a button that is enabled only when its guard holds
// in the current state, so the learner reads the guards by pressing them. "Show me" searches every reachable state of
// this tiny configuration and plays the shortest trace to a second charge, or says there is none in this model. The
// table below fills in as windows are settled, by hand or by the search. Everything is computed here; no TLC runs.

import { useId, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ToyFrame } from '../ToyFrame.tsx'
import {
  INIT,
  MAX_ATTEMPTS,
  WINDOWS,
  actionName,
  actionsIn,
  doubleCharged,
  inWindow,
  keyOf,
  run,
  shortestDoubleCharge,
  step,
  traceText,
} from './model.ts'
import type { Action, Config, State, Window } from './model.ts'
import './crash.css'

type WindowChoice = Window | 'none'

const STEPS = ['Commit', 'Dispatch', 'Accept', 'Persist', 'Ack'] as const

const BETWEEN: Record<Window, string> = {
  CW1: 'Commit and Dispatch',
  CW2: 'Dispatch and Accept',
  CW3: 'Accept and Persist',
  CW4: 'Persist and Ack',
}

/** A key as the model writes it: <<c1, 0>> names the intent, <<c1, a>> one attempt. */
const keyText = (cfg: Config, att: number): string => `<<c1, ${keyOf(cfg, att)}>>`

const list = (xs: readonly string[]): string => (xs.length === 0 ? 'none' : xs.join(', '))

/** What one action did, in words, for the status line. */
function sayStep(cfg: Config, before: State, a: Action, after: State): ReactNode {
  switch (a.kind) {
    case 'Commit':
      return 'Commit wrote c1 and its pending intent in one transaction.'
    case 'Dispatch':
      return (
        <>
          The worker sent attempt {after.attempts} with key <code>{keyText(cfg, after.attempts)}</code>. The intent is inflight.
        </>
      )
    case 'Timeout':
      return 'The timer fired before any reply arrived and returned the intent to pending. The first copy is still in flight.'
    case 'Accept': {
      if (after.charges > before.charges)
        return <>The provider took attempt {a.att} off the network, performed the effect and replied. Charges: {after.charges}.</>
      return (
        <>
          The provider has seen key <code>{keyText(cfg, a.att)}</code>, so it performed nothing and replied again.
        </>
      )
    }
    case 'Receive':
      return "The worker holds the reply in memory. Nothing durable records it yet."
    case 'Persist':
      return 'The worker stored the result in your database.'
    case 'Ack':
      return 'The worker acknowledged c1 from its stored result. The intent is done.'
    case 'Crash':
      return (
        <>
          The worker crashed in {cfg.window} and lost its memory
          {before.got ? ', including the reply it held' : ''}. Your database and the network keep theirs.
        </>
      )
    case 'Recover':
      return before.status === 'inflight' && !before.durable
        ? 'The worker restarted. The intent was inflight with no stored result, so recovery returned it to pending.'
        : before.status === 'inflight'
          ? 'The worker restarted. A result is stored, so recovery left the intent inflight for Ack.'
          : 'The worker restarted. Recovery found nothing inflight to return.'
  }
}

/** Why the shortest trace double-charges, for "Show me". */
function sayWhy(cfg: Config, t: readonly Action[]): string {
  const keys = cfg.dedup
    ? 'The provider honors keys, but the second attempt carried a new key, so to the provider it was a new request.'
    : 'The provider ignores keys, so it performed both.'
  const crashAt = t.findIndex((a) => a.kind === 'Crash')
  if (crashAt < 0)
    return `No crash was needed: the timer fired before any reply came back, the worker sent attempt 2, and the first copy was still in flight, so both were accepted. ${keys}`
  const acceptedFirst = t.slice(0, crashAt).some((a) => a.kind === 'Accept')
  return acceptedFirst
    ? `The provider accepted attempt 1, and the worker crashed in ${cfg.window} before it stored the reply. Recovery found no stored result, treated the intent as unanswered and sent attempt 2. ${keys}`
    : `The worker crashed in ${cfg.window}, after it sent attempt 1 and before the provider accepted it. Recovery found no stored result and sent attempt 2, and the first copy was never lost: it was still on its way. ${keys}`
}

interface Settled {
  readonly found: boolean
  readonly steps: number
  readonly states?: number
  readonly by: 'you' | 'search'
}

/** The lesson's table covers one crash, timers off and one key per intent; other settings show in the status line only. */
const tableCell = (cfg: Config): string | null =>
  cfg.window !== null && !cfg.freshKey && !cfg.timeouts ? `${cfg.window}:${cfg.dedup ? 'key' : 'none'}` : null

function settledText(s: Settled | undefined): string {
  if (s === undefined) return 'not yet'
  if (s.found) return `double charge, ${s.steps} steps (${s.by === 'you' ? 'you found it' : 'search'})`
  return `none in this model (search, ${s.states ?? 0} states)`
}

export default function CrashWindowGame() {
  const uid = useId().replace(/[^a-zA-Z0-9-]/g, '')
  const [win, setWin] = useState<WindowChoice>('CW2')
  const [dedup, setDedup] = useState(false)
  const [freshKey, setFreshKey] = useState(false)
  const [timeouts, setTimeouts] = useState(false)
  const [trace, setTrace] = useState<readonly Action[]>([])
  const [table, setTable] = useState<ReadonlyMap<string, Settled>>(new Map())
  const [status, setStatus] = useState<ReactNode>('Start with Commit. Only the actions whose guards hold are enabled.')

  const cfg: Config = useMemo(() => ({ window: win === 'none' ? null : win, dedup, freshKey, timeouts }), [win, dedup, freshKey, timeouts])
  const state = run(cfg, trace) ?? INIT
  const actions = actionsIn(cfg, state)
  const anyEnabled = actions.some((a) => step(cfg, state, a) !== null)
  const crashedAt = useMemo(() => {
    let s: State = INIT
    for (const a of trace) {
      if (a.kind === 'Crash') return cfg.window
      s = step(cfg, s, a) ?? s
    }
    return null
  }, [cfg, trace])
  const counts = (name: string): number => trace.filter((a) => a.kind === name).length

  const settle = (c: Config, s: Settled): void => {
    const cell = tableCell(c)
    if (cell === null) return
    setTable((t) => {
      const prev = t.get(cell)
      if (prev !== undefined && prev.found && !s.found) return t
      if (prev !== undefined && prev.by === 'you' && s.by === 'search') return t
      return new Map(t).set(cell, s)
    })
  }

  const reconfigure = (next: Partial<Config>, say: string): void => {
    if (next.window !== undefined) setWin(next.window ?? 'none')
    if (next.dedup !== undefined) setDedup(next.dedup)
    if (next.freshKey !== undefined) setFreshKey(next.freshKey)
    if (next.timeouts !== undefined) setTimeouts(next.timeouts)
    setTrace([])
    setStatus(`${say} The trace starts again from Init.`)
  }

  const act = (a: Action): void => {
    const after = step(cfg, state, a)
    if (after === null) return
    const t = [...trace, a]
    setTrace(t)
    const said = sayStep(cfg, state, a, after)
    if (doubleCharged(after) && !doubleCharged(state)) {
      settle(cfg, { found: true, steps: t.length, by: 'you' })
      setStatus(
        <>
          <strong>Second charge.</strong> The provider performed the effect again for attempt {a.kind === 'Accept' ? a.att : ''}.{' '}
          <code>NoDoubleCharge</code> fails on your trace of {t.length} steps: {traceText(t)}.
        </>,
      )
      return
    }
    const done = !actionsIn(cfg, after).some((b) => step(cfg, after, b) !== null)
    setStatus(
      done ? (
        <>
          {said} Nothing more is enabled: c1 ends {after.status} with {after.charges} {after.charges === 1 ? 'charge' : 'charges'}.
        </>
      ) : (
        said
      ),
    )
  }

  const undo = (): void => {
    if (trace.length === 0) return
    setTrace(trace.slice(0, -1))
    setStatus(`Took back ${actionName(trace[trace.length - 1] as Action)}.`)
  }

  const showMe = (): void => {
    const r = shortestDoubleCharge(cfg)
    if (r.trace === null) {
      setTrace([])
      settle(cfg, { found: false, steps: 0, states: r.states, by: 'search' })
      setStatus(
        <>
          <strong>No double charge in this model.</strong> The page reached all {r.states} states of this configuration (one
          command, {cfg.window === null ? 'no crash' : `one crash, only in ${cfg.window}`}, at most {MAX_ATTEMPTS} attempts) and
          none charges twice.{' '}
          {cfg.dedup && !cfg.freshKey && (cfg.timeouts || cfg.window === 'CW2' || cfg.window === 'CW3')
            ? 'Every attempt carries the one key, and the provider performs a key once.'
            : cfg.window === 'CW4'
              ? 'A crash here comes after Persist: recovery finds the stored result and leaves the intent for Ack, so nothing is sent again.'
              : cfg.window === 'CW1'
                ? 'A crash here comes before anything is sent, so the one request after recovery is the only one.'
                : 'Without a crash or a timer, the worker sends once.'}{' '}
          This covers only this tiny model. The lesson&apos;s claim rests on its recorded TLC run at the lesson&apos;s own constants.
        </>,
      )
      return
    }
    setTrace(r.trace)
    settle(cfg, { found: true, steps: r.trace.length, by: 'search' })
    setStatus(
      <>
        <strong>The shortest trace takes {r.trace.length} steps:</strong> {traceText(r.trace)}. {sayWhy(cfg, r.trace)}
      </>,
    )
  }

  const reqText = state.reqs.map((att) => `attempt ${att}, key ${keyText(cfg, att)}`)
  const replyText = state.replies.map((att) => `to attempt ${att}`)
  const seenText = cfg.dedup ? list(state.seen.map((k) => `<<c1, ${k}>>`)) : 'ignores keys'

  return (
    <ToyFrame
      title="Place the crash yourself"
      kind="Game"
      caption={
        <>
          The lesson&apos;s Outbox model for one command, c1, with at most one crash, in the window you choose, and at most{' '}
          {MAX_ATTEMPTS} attempts. This page computes every step and the search itself; no TLC runs here, and a result covers
          this tiny model only.
        </>
      }
    >
      <p className="toy-goal">Goal: with the crash allowed in one window, make the provider charge c1 twice, or find that it cannot.</p>

      <div className="cw-settings">
        <fieldset className="toy-choice cw-windows">
          <legend>Crash allowed in</legend>
          {WINDOWS.map((w) => (
            <label key={w}>
              <input type="radio" name={`${uid}-win`} checked={win === w} onChange={() => reconfigure({ window: w }, `A crash may now land in ${w}, between ${BETWEEN[w]}.`)} />
              <span>{w}</span>
            </label>
          ))}
          <label>
            <input type="radio" name={`${uid}-win`} checked={win === 'none'} onChange={() => reconfigure({ window: null }, 'No crash can happen now.')} />
            <span>no crash</span>
          </label>
        </fieldset>
        <fieldset className="toy-choice">
          <legend>The provider and the worker</legend>
          <label>
            <input type="checkbox" checked={dedup} onChange={(e) => reconfigure({ dedup: e.target.checked }, e.target.checked ? 'The provider now honors keys.' : 'The provider now ignores keys.')} />
            <span>Provider honors keys</span>
          </label>
          <label>
            <input type="checkbox" checked={freshKey} onChange={(e) => reconfigure({ freshKey: e.target.checked }, e.target.checked ? 'Every attempt now mints a new key.' : 'Every attempt now carries the intent’s one key.')} />
            <span>New key for every attempt</span>
          </label>
          <label>
            <input type="checkbox" checked={timeouts} onChange={(e) => reconfigure({ timeouts: e.target.checked }, e.target.checked ? 'The worker’s timer is on.' : 'The worker’s timer is off.')} />
            <span>Worker&apos;s timer on</span>
          </label>
        </fieldset>
      </div>

      <div className="cw-play">
        <ol className="cw-chain" aria-label="The chain for c1">
          {STEPS.map((name, i) => {
            const n = counts(name)
            const w = i < WINDOWS.length ? (WINDOWS[i] as Window) : null
            const extra = n > 1 && name === 'Accept' && doubleCharged(state)
            const notes = w === null ? [] : [cfg.window === w ? 'crash allowed' : null, inWindow(w, state) ? 'c1 is here' : null, crashedAt === w ? 'crashed here' : null].filter((x): x is string => x !== null)
            return [
              <li key={name} className={extra ? 'cw-step line-violation' : 'cw-step'} data-done={n > 0}>
                <span className="cw-step-mark" aria-hidden="true" />
                <span className="cw-step-name">{name}</span>
                <span className="cw-step-count">{n === 0 ? 'not yet' : n === 1 ? 'once' : `${n} times`}</span>
              </li>,
              w !== null ? (
                <li key={w} className="cw-gap" data-allowed={cfg.window === w} data-here={inWindow(w, state)}>
                  <span className="cw-gap-name">{w}</span>
                  {notes.length > 0 ? <span className="cw-gap-note">{notes.join(' · ')}</span> : null}
                </li>
              ) : null,
            ]
          })}
        </ol>

        <div className="cw-side">
          <div className="cw-actions" role="group" aria-label="Actions">
            {actions.map((a) => {
              const on = step(cfg, state, a) !== null
              return (
                <button key={actionName(a)} type="button" className="toy-button cw-act" disabled={!on} onClick={() => act(a)}>
                  {actionName(a)}
                </button>
              )
            })}
          </div>
          <p className="toy-status" aria-live="polite">
            {status}
          </p>
        </div>
      </div>

      <div className="cw-state">
        <section className="cw-part" aria-label="Your database">
          <h3 className="cw-head">Your database</h3>
          <dl>
            <dt>intent</dt>
            <dd>{state.status}</dd>
            <dt>result stored</dt>
            <dd>{state.durable ? 'yes' : 'no'}</dd>
            <dt>attempts</dt>
            <dd>{state.attempts}</dd>
          </dl>
        </section>
        <section className="cw-part" aria-label="The worker">
          <h3 className="cw-head">The worker</h3>
          <dl>
            <dt>worker</dt>
            <dd>{state.up ? 'up' : 'down'}</dd>
            <dt>reply in memory</dt>
            <dd>{state.got ? 'yes' : 'no'}</dd>
          </dl>
        </section>
        <section className="cw-part" aria-label="The network">
          <h3 className="cw-head">The network</h3>
          <dl>
            <dt>requests in flight</dt>
            <dd>{list(reqText)}</dd>
            <dt>replies sent</dt>
            <dd>{list(replyText)}</dd>
          </dl>
        </section>
        <section className="cw-part" aria-label="The provider">
          <h3 className="cw-head">The provider</h3>
          <dl>
            <dt>keys seen</dt>
            <dd>{seenText}</dd>
            <dt>charges for c1</dt>
            <dd className={doubleCharged(state) ? 'cw-charges line-violation' : 'cw-charges'}>
              {state.charges}
              {doubleCharged(state) ? ', NoDoubleCharge fails' : ''}
            </dd>
          </dl>
        </section>
      </div>

      <div className="cw-trace">
        <h3 className="cw-head">Your trace</h3>
        {trace.length === 0 ? (
          <p className="cw-empty">Init, nothing taken yet.</p>
        ) : (
          <ol>
            {trace.map((a, i) => (
              <li key={i} className={i === trace.length - 1 ? 'toy-land' : undefined}>
                {actionName(a)}
              </li>
            ))}
          </ol>
        )}
        <div className="toy-actions">
          <button type="button" className="toy-button" onClick={undo} disabled={trace.length === 0}>
            Undo a step
          </button>
          <button
            type="button"
            className="toy-button"
            onClick={() => {
              setTrace([])
              setStatus('Back at Init.')
            }}
            disabled={trace.length === 0}
          >
            Start over
          </button>
          <button type="button" className="toy-button" data-primary="true" onClick={showMe}>
            Show me
          </button>
        </div>
        {!anyEnabled && !doubleCharged(state) ? <p className="cw-empty">No action is enabled. This behavior has ended.</p> : null}
      </div>

      <div className="cw-table-wrap">
        <table className="cw-table">
          <caption>Your table: one crash, timer off, one key per intent</caption>
          <thead>
            <tr>
              <th scope="col">Window</th>
              <th scope="col">Provider ignores keys</th>
              <th scope="col">Provider honors one stable key</th>
            </tr>
          </thead>
          <tbody>
            {WINDOWS.map((w) => (
              <tr key={w}>
                <th scope="row">
                  <code>{w}</code>
                </th>
                {(['none', 'key'] as const).map((k) => {
                  const s = table.get(`${w}:${k}`)
                  return (
                    <td key={k} data-found={s?.found === true}>
                      {settledText(s)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ToyFrame>
  )
}
