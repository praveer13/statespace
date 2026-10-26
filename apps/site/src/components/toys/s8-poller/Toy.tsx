// A game for "A poller and a late commit" (S8.L3): be the scheduler for two writers and a poller, and leave a committed
// outbox row that no poll will ever deliver. Under the "mark" design the poller reads ids above its high-water mark, so
// a row whose id was taken early and committed late falls below it. Under the "status" design the poller reads every
// committed row not yet delivered, and the page's search finds no way to strand one. Everything is computed here.

import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { ToyFrame } from '../ToyFrame.tsx'
import { ACTIONS, INIT, WRITERS, actionName, batch, enabled, everyEndDelivers, run, shortestStranding, step, stranded, traceText } from './model.ts'
import type { Action, Design, State, Writer } from './model.ts'
import './poller.css'

const list = (xs: readonly number[]): string => (xs.length === 0 ? 'none' : xs.map((i) => `row ${i}`).join(', '))

function sayStep(d: Design, before: State, a: Action, after: State): ReactNode {
  switch (a.kind) {
    case 'Insert':
      return `Writer ${a.w} inserted and took id ${after.idOf[a.w]}. The row is not visible to the poller until it commits.`
    case 'CommitRow': {
      const id = after.idOf[a.w]
      if (d === 'mark' && id <= after.mark)
        return (
          <>
            Writer {a.w} committed row {id}, but the mark is already at {after.mark}. The poller reads only ids above it.
          </>
        )
      return `Writer ${a.w} committed row ${id}. The next poll can read it.`
    }
    case 'Poll': {
      const read = batch(d, before)
      return d === 'mark'
        ? `The poller delivered ${list(read)} and raised the mark to ${after.mark}.`
        : `The poller claimed and delivered ${list(read)}, the committed rows not yet delivered.`
    }
  }
}

function rowState(d: Design, s: State, id: number): { text: string; kind: 'open' | 'committed' | 'delivered' | 'stranded' } {
  if (s.delivered.includes(id)) return { text: 'delivered', kind: 'delivered' }
  if (stranded(d, s).includes(id)) return { text: 'committed, below the mark, never delivered', kind: 'stranded' }
  if (s.committedIds.includes(id)) return { text: 'committed, waiting for a poll', kind: 'committed' }
  return { text: 'inserted, not committed: invisible to the poller', kind: 'open' }
}

export default function PollerGame() {
  const uid = useId().replace(/[^a-zA-Z0-9-]/g, '')
  const [design, setDesign] = useState<Design>('mark')
  const [trace, setTrace] = useState<readonly Action[]>([])
  const [status, setStatus] = useState<ReactNode>('Each writer inserts a row, then commits it. Poll whenever you like.')

  const state = run(design, trace) ?? INIT
  const lost = stranded(design, state)
  const live = enabled(design, state)
  // Highest id first, so that "above the mark" reads as above the line.
  const ids = Array.from({ length: state.nextId - 1 }, (_, i) => state.nextId - 1 - i)
  const writerOf = (id: number): Writer | undefined => WRITERS.find((w) => state.idOf[w] === id && state.wpc[w] !== 'idle')

  const choose = (d: Design): void => {
    setDesign(d)
    setTrace([])
    setStatus(
      d === 'mark'
        ? 'Design mark: each poll reads committed rows above the mark, then raises the mark to the highest id it read. The trace starts again.'
        : 'Design status: each poll claims the committed rows not yet delivered. There is no mark. The trace starts again.',
    )
  }

  const act = (a: Action): void => {
    const after = step(design, state, a)
    if (after === null) return
    setTrace([...trace, a])
    const said = sayStep(design, state, a, after)
    const nowLost = stranded(design, after)
    const ended = enabled(design, after).length === 0
    if (nowLost.length > 0 && ended) {
      setStatus(
        <>
          <strong>Row {nowLost[0]} is stranded.</strong> {said} Nothing is enabled now: Poll needs a committed row above the
          mark, and there is none. <code>MarkInv</code> fails, and the poller can only wait, so eventual delivery fails too.
        </>,
      )
      return
    }
    if (nowLost.length > 0) {
      setStatus(
        <>
          <strong>Row {nowLost[0]} is below the mark and not delivered.</strong> {said} <code>MarkInv</code> fails here.
        </>,
      )
      return
    }
    if (ended) {
      setStatus(<>{said} Nothing more is enabled, and every committed row was delivered.</>)
      return
    }
    setStatus(said)
  }

  const showMe = (): void => {
    const r = shortestStranding(design)
    if (r.trace === null) {
      const ends = everyEndDelivers(design)
      setTrace([])
      setStatus(
        <>
          <strong>No row can be stranded in this design.</strong> The page reached all {r.states} states of two writers and one
          poller, and in every one a committed row not yet delivered is in the next poll&apos;s batch. Commit order does not
          matter, because a poll reads status, not ids.{' '}
          {ends.allDelivered
            ? `In each of the ${ends.ends} end states, every committed row has been delivered.`
            : 'Yet some end state leaves a committed row undelivered.'}{' '}
          This covers two writers with one row each; it is an illustration, not TLC&apos;s run.
        </>,
      )
      return
    }
    setTrace(r.trace)
    const end = run(design, r.trace) as State
    const pollLeft = enabled(design, end).some((a) => a.kind === 'Poll')
    setStatus(
      <>
        <strong>The shortest takes {r.trace.length} steps:</strong> {traceText(r.trace)}. Writer 1 took id 1 first, but writer 2
        committed first, so the poll delivered row 2 and moved the mark to {end.mark}. Row 1 committed afterwards, below the
        mark.{' '}
        {pollLeft
          ? 'No poll will read it.'
          : 'No poll is enabled now, so MarkInv fails and the poller can only wait: row 1 is never delivered.'}{' '}
        Ids are taken at INSERT and become visible at COMMIT, so id order is not commit order.
      </>,
    )
  }

  // The mark's line sits just above the highest row at or below it.
  const markBefore = (id: number, i: number): boolean =>
    design === 'mark' && id <= state.mark && (i === 0 || (ids[i - 1] as number) > state.mark)
  const markRow = (
    <tr className="pl-mark" key="mark">
      <th scope="row" colSpan={3}>
        mark = {state.mark} · polls read ids above this line
      </th>
    </tr>
  )

  return (
    <ToyFrame
      title="Strand a row below the mark"
      kind="Game"
      caption={
        <>
          The lesson&apos;s poller with two writers, each inserting one row. This page computes every step and searches all
          reachable states itself; no TLC or PostgreSQL runs here, and the search covers this two-writer model only.
        </>
      }
    >
      <p className="toy-goal">Goal: schedule the writers and the poller so that a committed row is never delivered.</p>

      <fieldset className="toy-choice pl-design">
        <legend>The poller reads</legend>
        <label>
          <input type="radio" name={`${uid}-design`} checked={design === 'mark'} onChange={() => choose('mark')} />
          <span>
            By mark: <code>i &gt; mark</code>
          </span>
        </label>
        <label>
          <input type="radio" name={`${uid}-design`} checked={design === 'status'} onChange={() => choose('status')} />
          <span>By status: not yet delivered</span>
        </label>
      </fieldset>

      <div className="pl-actions" role="group" aria-label="Actions">
        {ACTIONS.map((a) => (
          <button
            key={actionName(a)}
            type="button"
            className="toy-button"
            disabled={!live.some((b) => actionName(b) === actionName(a))}
            onClick={() => act(a)}
          >
            {actionName(a)}
          </button>
        ))}
      </div>

      <p className="toy-status" aria-live="polite">
        {status}
      </p>

      <div className="pl-table-wrap">
        <table className="pl-table">
          <caption>The outbox, highest id first{design === 'status' ? '. This design keeps no mark' : ''}</caption>
          <thead>
            <tr>
              <th scope="col">Id</th>
              <th scope="col">Writer</th>
              <th scope="col">State</th>
            </tr>
          </thead>
          <tbody>
            {ids.length === 0 ? (
              <tr>
                <td colSpan={3} className="pl-empty">
                  No rows yet.
                </td>
              </tr>
            ) : null}
            {ids.flatMap((id, i) => {
              const rs = rowState(design, state, id)
              const w = writerOf(id)
              const row = (
                <tr key={id} data-kind={rs.kind} className={rs.kind === 'stranded' ? 'line-violation' : undefined}>
                  <th scope="row">
                    <code>{id}</code>
                  </th>
                  <td>{w === undefined ? '' : `writer ${w}`}</td>
                  <td>
                    <span className="pl-mark-glyph" data-kind={rs.kind} aria-hidden="true" />
                    {rs.text}
                  </td>
                </tr>
              )
              return markBefore(id, i) ? [markRow, row] : [row]
            })}
            {design === 'mark' && ids.every((id) => id > state.mark) ? markRow : null}
          </tbody>
        </table>
      </div>

      <div className="pl-trace">
        <p className="pl-trace-line">
          <span className="pl-trace-name">Your schedule</span>{' '}
          {trace.length === 0 ? 'nothing yet' : trace.map((a, i) => `${i + 1}. ${actionName(a)}`).join('  ')}
        </p>
        <div className="toy-actions">
          <button
            type="button"
            className="toy-button"
            disabled={trace.length === 0}
            onClick={() => {
              setStatus(`Took back ${actionName(trace[trace.length - 1] as Action)}.`)
              setTrace(trace.slice(0, -1))
            }}
          >
            Undo a step
          </button>
          <button
            type="button"
            className="toy-button"
            disabled={trace.length === 0}
            onClick={() => {
              setTrace([])
              setStatus('Back at the start: no rows, mark 0.')
            }}
          >
            Start over
          </button>
          <button type="button" className="toy-button" data-primary="true" onClick={showMe}>
            Show me
          </button>
        </div>
      </div>
      {lost.length > 0 ? <p className="pl-lost">Stranded: {list(lost)}.</p> : null}
    </ToyFrame>
  )
}
