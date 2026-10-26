// A game for S10.L7, "Doubts as m of n": CL-1.1's doubt log, and the events that change it. The learner picks an event,
// calls what the log reads after it, and applies it; the page applies the lesson's rule, redraws the log and says, in
// words, which rule decided and why. "Show me" applies the event without a call. Everything is computed here.

import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { ToyFrame } from '../ToyFrame.tsx'
import { EVENTS, START, apply, candidates, read, say } from './model.ts'
import type { Doubt, EventId, Status } from './model.ts'
import './doubts.css'

const STATUS: Record<Status, string> = { active: 'Active', retired: 'Retired', accepted: 'Accepted residual' }

function Mark({ s }: { readonly s: Status }) {
  return (
    <svg className="toy-key dl-mark" width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">
      {s === 'retired' ? <rect className="dl-retired" x={-6} y={-6} width={12} height={12} /> : s === 'accepted' ? <rect className="dl-accepted" x={-5.5} y={-5.5} width={11} height={11} /> : <circle className="dl-active" r={5.5} />}
    </svg>
  )
}

const kindWord = (d: Doubt): string => d.kind.charAt(0).toUpperCase() + d.kind.slice(1)

export default function DoubtLog() {
  const uid = useId().replace(/[^a-zA-Z0-9-]/g, '')
  const [log, setLog] = useState<readonly Doubt[]>(START)
  const [event, setEvent] = useState<EventId>('cvc5')
  const [call, setCall] = useState<string | null>(null)
  const [fresh, setFresh] = useState<ReadonlySet<number>>(new Set())
  const [status, setStatus] = useState<ReactNode>(
    'The log reads 1|3. Pick an event, call what the log reads after it, then apply it.',
  )

  const r = read(log)
  const options = candidates(log, event)

  const run = (withCall: boolean): void => {
    const out = apply(log, event)
    if (!out.ok) {
      setStatus(
        <>
          <strong>Not yet.</strong> {out.why}
        </>,
      )
      return
    }
    const after = read(out.log)
    const changed = new Set(
      out.log.filter((d) => {
        const was = log.find((x) => x.id === d.id)
        return was === undefined || was.status !== d.status || was.dismissed !== d.dismissed
      }).map((d) => d.id),
    )
    const verdict =
      withCall && call !== null ? (call === say(after) ? <strong>Your call holds: {say(after)}.</strong> : <strong>Not {call}: the log reads {say(after)}.</strong>) : <strong>The log reads {say(after)}.</strong>
    setLog(out.log)
    setFresh(changed)
    setCall(null)
    setStatus(
      <>
        {verdict} {out.rule}: {out.why}
      </>,
    )
  }

  const restart = (): void => {
    setLog(START)
    setFresh(new Set())
    setCall(null)
    setStatus('Back to the lesson’s log, before the cross-check. It reads 1|3.')
  }

  return (
    <ToyFrame
      title="Keep the doubt log"
      kind="Game"
      caption={
        <>
          The page applies the lesson&apos;s rules D1, D2, D5, D7 and D8 to CL-1.1&apos;s log itself and counts the result as m|n. It
          reads an argument as open while any doubt is active; D3&apos;s other condition, about the assumptions a claim rests on, is
          not drawn here. No tool runs, and a reading is a count, never a score.
        </>
      }
    >
      <p className="toy-goal">Goal: call what the log reads after each event, before the page applies the rule.</p>

      <div className="dl-reading">
        <p className="dl-count">
          <span className="dl-count-label">CL-1.1</span>
          <span className="dl-mn">{say(r)}</span>
          <span className="dl-count-label">retired of identified</span>
        </p>
        <p className="dl-others">
          {r.others.length === 0 ? (
            'Every doubt is retired.'
          ) : (
            <>
              Still named: {r.others.map((d) => `${d.id} (${STATUS[d.status].toLowerCase()})`).join(', ')}. The argument is{' '}
              <strong>{r.open ? 'open' : 'closed'}</strong>
              {r.open ? ', because a doubt is active.' : ' as far as this log goes.'}
            </>
          )}
        </p>
      </div>

      <div className="dl-table-wrap">
        <table className="dl-table">
          <caption className="dl-caption">CL-1.1&apos;s doubt log</caption>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Doubt, its kind and its record</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {log.map((d) => (
              <tr key={d.id} data-fresh={fresh.has(d.id) ? 'true' : undefined}>
                <td className="dl-id">{d.id}</td>
                <td>
                  {d.text}
                  {d.proposed === true ? <span className="dl-tag"> (an AI&apos;s proposal)</span> : null}
                  <span className="dl-note">
                    <span className="dl-kind">{kindWord(d)}.</span> {d.note}
                  </span>
                </td>
                <td className="dl-status">
                  <span className={fresh.has(d.id) ? 'dl-status-in toy-land' : 'dl-status-in'}>
                    <Mark s={d.status} />
                    {STATUS[d.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form
        className="dl-form"
        onSubmit={(e) => {
          e.preventDefault()
          run(true)
        }}
      >
        <fieldset className="toy-choice">
          <legend>The event</legend>
          {EVENTS.map((ev) => (
            <label key={ev.id}>
              <input
                type="radio"
                name={`${uid}-event`}
                checked={event === ev.id}
                onChange={() => {
                  setEvent(ev.id)
                  setCall(null)
                }}
              />
              <span>{ev.label}</span>
            </label>
          ))}
        </fieldset>
        <fieldset className="toy-choice dl-calls">
          <legend>Your call: the log reads</legend>
          {options.map((o) => (
            <label key={o}>
              <input type="radio" name={`${uid}-call`} checked={call === o} onChange={() => setCall(o)} />
              <span className="dl-call">{o}</span>
            </label>
          ))}
        </fieldset>
        <div className="toy-actions">
          <button type="submit" className="toy-button" data-primary="true" disabled={call === null}>
            Apply the event
          </button>
          <button type="button" className="toy-button" onClick={() => run(false)}>
            Show me
          </button>
          <button type="button" className="toy-button" onClick={restart}>
            Start over
          </button>
        </div>
      </form>

      <p className="toy-status" aria-live="polite">
        {status}
      </p>
    </ToyFrame>
  )
}
