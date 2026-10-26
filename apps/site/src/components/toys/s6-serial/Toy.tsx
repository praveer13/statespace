// A game for S6.L8: pick one of the lesson's recorded histories, then replay its two committed transactions one at a
// time, in an order you choose, through a tiny reference semantics. Each step shows the state it starts from, what the
// semantics returns and what the transaction committed with. The goal is an order that matches every output, or the
// call that none does. "Run the checker" tries both orders and prints the bound beside its verdict.

import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { ToyFrame } from '../ToyFrame.tsx'
import { BOUND, HISTORIES, ORDERS, check, history, replay, sayCommand, sayOutput, sayState } from './model.ts'
import type { History, HistoryId, ReplayStep, Txn } from './model.ts'
import './serial.css'

const orderName = (o: readonly Txn[]): string => `txn ${o[0]}, then txn ${o[1]}`
const key = (o: readonly Txn[]): string => o.join('')

function Mark({ match, land = false }: { readonly match: boolean; readonly land?: boolean }) {
  return (
    <svg className={`tso-mark${land ? ' toy-land' : ''}`} data-match={match ? 'yes' : 'no'} width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">
      <rect className="tso-mark-box" data-match={match ? 'yes' : 'no'} x={-6} y={-6} width={12} height={12} />
      {match ? null : <path className="tso-mark-x" d="M-4 -4L4 4M4 -4L-4 4" />}
    </svg>
  )
}

function Chain({ h, steps, fresh }: { readonly h: History; readonly steps: readonly ReplayStep[]; readonly fresh: boolean }) {
  return (
    <ol className="tso-chain">
      <li className="tso-state">
        <span className="tso-state-name">α(D₀)</span>
        <code>{sayState(h.d0)}</code>
      </li>
      {steps.map((st, i) => (
        <li key={`${st.id}${i}`} className="tso-step" data-match={st.match ? 'yes' : 'no'}>
          <p className="tso-step-head">
            <Mark match={st.match} land={fresh} />
            Replay txn {st.id}: <code>{sayCommand(h.txns.find((t) => t.id === st.id)?.cmd ?? { k: 'report', accts: [] })}</code>
          </p>
          <dl className="tso-compare">
            <dt>The semantics returns</dt>
            <dd>
              <code>{sayOutput(st.replayed)}</code>
            </dd>
            <dt>It committed with</dt>
            <dd>
              <code>{sayOutput(st.committed)}</code>
            </dd>
          </dl>
          <p className="tso-verdict">{st.match ? 'Matches.' : 'Differs: this order does not explain the transaction.'}</p>
          <p className="tso-state">
            <span className="tso-state-name">S{i + 1}</span>
            <code>{sayState(st.after)}</code>
          </p>
        </li>
      ))}
    </ol>
  )
}

export default function SerialOrderGame() {
  const uid = useId().replace(/[^a-zA-Z0-9-]/g, '')
  const [hid, setHid] = useState<HistoryId>('report')
  const [order, setOrder] = useState<readonly [Txn, Txn] | null>(null)
  const [tried, setTried] = useState<ReadonlyMap<string, boolean>>(new Map())
  const [status, setStatus] = useState<ReactNode>('Choose an order to replay, or say that none explains the history.')
  const h = history(hid)
  const shown = order === null ? null : replay(h, order)

  const choose = (id: HistoryId): void => {
    setHid(id)
    setOrder(null)
    setTried(new Map())
    const nh = history(id)
    setStatus(`${nh.name} at ${nh.level}. Choose an order to replay, or say that none explains the history.`)
  }

  const tryOrder = (o: readonly [Txn, Txn]): void => {
    const r = replay(h, o)
    setOrder(o)
    setTried((m) => new Map(m).set(key(o), r.passes))
    const bad = r.steps.find((s) => !s.match)
    const commit = key(o) === key(h.commitOrder) ? ' This is the commit order.' : ' This is not the commit order.'
    setStatus(
      r.passes ? (
        <>
          <strong>This order explains the history.</strong> Replayed as {orderName(o)}, every transaction gets the output it
          committed with.{commit}
        </>
      ) : (
        <>
          <strong>This order fails.</strong> Replayed as {orderName(o)}, txn {bad?.id} would return {sayOutput(bad?.replayed ?? { k: 'insufficient' })}, but it
          committed with {sayOutput(bad?.committed ?? { k: 'insufficient' })}.{commit}
        </>
      ),
    )
  }

  const sayNone = (): void => {
    const c = check(h)
    setOrder(null)
    if (c.accepted === null) {
      setStatus(
        <>
          <strong>Right: none.</strong> Both orders fail, so no serial explanation exists and the history holds an anomaly.
          Try each order to see where it breaks.
        </>,
      )
    } else {
      setStatus(
        <>
          <strong>One order does explain this history.</strong> Try both and find it.
        </>,
      )
    }
  }

  const runChecker = (): void => {
    const c = check(h)
    if (c.accepted !== null) {
      setOrder(c.accepted)
      setTried((m) => new Map(m).set(key(c.accepted as readonly Txn[]), true))
    } else {
      setOrder(null)
      setTried(new Map(ORDERS.map((o) => [key(o), false])))
    }
    setStatus(
      <>
        <strong>This page&apos;s checker (bound: at most {BOUND} transactions) tried {c.tried} orders:</strong>{' '}
        {c.accepted !== null
          ? `it accepts the history under ${orderName(c.accepted)}${key(c.accepted) === key(h.commitOrder) ? ', which is also the commit order' : `, though the commit order was ${orderName(h.commitOrder)}`}. An acceptance shows only that this history had a serial explanation.`
          : 'it rejects the history. No serial order gives both transactions their committed outputs, so this history shows an anomaly.'}
      </>,
    )
  }

  return (
    <ToyFrame
      title="Find a serial order"
      kind="Game"
      caption={
        <>
          The lesson&apos;s histories of two committed transactions, replayed through a tiny reference semantics written in this
          page, from α(D₀). The page computes each replay itself; it is not the course&apos;s checker, no database runs here, and
          with two transactions there are only two orders to try.
        </>
      }
    >
      <p className="toy-goal">Goal: find an order that gives every transaction the output it committed with, or say that none does.</p>

      <fieldset className="toy-choice">
        <legend>History</legend>
        {HISTORIES.map((x) => (
          <label key={x.id}>
            <input type="radio" name={`${uid}-h`} checked={hid === x.id} onChange={() => choose(x.id)} />
            <span>
              {x.name}, {x.level}
            </span>
          </label>
        ))}
      </fieldset>

      <div className="tso-history">
        <p className="tso-commit" id={`${uid}-what`}>
          What happened, with accounts at <code>{sayState(h.d0)}</code>
        </p>
        <div className="tso-table-wrap" tabIndex={0} role="region" aria-labelledby={`${uid}-what`}>
        <table className="tso-table">
          <thead>
            <tr>
              <th scope="col">Txn</th>
              <th scope="col">Command</th>
              <th scope="col">What the history shows</th>
              <th scope="col">Committed with</th>
            </tr>
          </thead>
          <tbody>
            {h.txns.map((t) => (
              <tr key={t.id}>
                <th scope="row">{t.id}</th>
                <td>
                  <code>{sayCommand(t.cmd)}</code>
                </td>
                <td>{t.trace.join('; ')}</td>
                <td>
                  <code>{sayOutput(t.out)}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <p className="tso-commit">
          Commit order: txn {h.commitOrder[0]} first, then txn {h.commitOrder[1]}.
        </p>
      </div>

      <div className="toy-actions">
        {ORDERS.map((o) => (
          <button key={key(o)} type="button" className="toy-button" data-primary="true" onClick={() => tryOrder(o)}>
            Replay {o[0]}, then {o[1]}
            {tried.has(key(o)) ? (tried.get(key(o)) ? ' (explains it)' : ' (fails)') : ''}
          </button>
        ))}
        <button type="button" className="toy-button" onClick={sayNone}>
          No order explains it
        </button>
        <button type="button" className="toy-button" onClick={runChecker}>
          Run the checker
        </button>
      </div>

      <p className="toy-status" aria-live="polite">
        {status}
      </p>

      {shown !== null && order !== null ? (
        <div className="tso-replay" aria-label={`Replay of ${orderName(order)}`} role="group">
          <Chain key={`${hid}${key(order)}`} h={h} steps={shown.steps} fresh />
        </div>
      ) : null}

      <ul className="toy-legend" aria-label="Key">
        <li>
          <Mark match />
          replayed output matches
        </li>
        <li>
          <Mark match={false} />
          replayed output differs
        </li>
      </ul>
    </ToyFrame>
  )
}
