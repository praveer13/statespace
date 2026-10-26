// The decision panel for S3.L7: four policy fields, the lesson's calls, and for each call its outcome, the step of the
// fixed order that decided it, what a caller sees, and whether `Inv` holds afterwards. Switching an option marks the
// calls that moved. "Show me" sets the policy under which every call commits, to show what a caller can no longer tell
// apart. Everything is computed here, for these five calls only.

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ToyFrame } from '../ToyFrame.tsx'
import { CASES, DEFAULT, STEP_NAMES, exec, inv, moved, seen, showCall, showPolicy, showState } from './model.ts'
import type { Outcome, Policy } from './model.ts'
import './policy.css'

type Field = keyof Policy

const FIELDS: readonly { field: Field; name: string; options: readonly [string, string] }[] = [
  { field: 'zero', name: 'zero', options: ['reject', 'noop'] },
  { field: 'self', name: 'self', options: ['allow', 'reject'] },
  { field: 'guard', name: 'guard', options: ['error', 'silent'] },
  { field: 'overflow', name: 'overflow', options: ['unbounded', 'bounded'] },
]

const PERMISSIVE: Policy = { zero: 'noop', self: 'allow', guard: 'silent', overflow: 'unbounded' }

const samePolicy = (a: Policy, b: Policy): boolean =>
  a.zero === b.zero && a.self === b.self && a.guard === b.guard && a.overflow === b.overflow

function outcomeText(o: Outcome): string {
  if (o.kind === 'error') return o.err
  return o.changed ? 'commits' : 'commits, state unchanged'
}

function outcomeLine(o: Outcome): string {
  return `${outcomeText(o)} at step ${o.step}`
}

const optLabel = (f: Field, o: string): string => (f === 'overflow' && o === 'bounded' ? 'bounded maxBal' : o)

export default function PolicyToy() {
  const uid = useId().replace(/[^a-zA-Z0-9-]/g, '')
  const [policy, setPolicy] = useState<Policy>(DEFAULT)
  const [before, setBefore] = useState<Policy>(DEFAULT)
  const [switches, setSwitches] = useState(0)
  // Each action button disables itself once its policy is set, so focus moves to the other one instead of the page.
  const showRef = useRef<HTMLButtonElement>(null)
  const resetRef = useRef<HTMLButtonElement>(null)
  // The target is enabled only after the render, so the focus waits for it.
  const want = useRef<HTMLButtonElement | null>(null)
  useEffect(() => {
    if (want.current !== null && !want.current.disabled) want.current.focus()
    want.current = null
  })
  const [status, setStatus] = useState<ReactNode>(
    <>
      The reference defaults are set. Switch one option and watch which calls move.
    </>,
  )

  const rows = useMemo(
    () =>
      CASES.map((c) => {
        const now = exec(policy, c.call, c.start)
        const was = exec(before, c.call, c.start)
        return { c, now, was, moved: moved(was, now), holds: inv(now.kind === 'commit' ? now.state : c.start) }
      }),
    [policy, before],
  )

  const report = (from: Policy, to: Policy, lead: ReactNode): void => {
    const changed = CASES.filter((c) => moved(exec(from, c.call, c.start), exec(to, c.call, c.start)))
    const allInv = CASES.every((c) => {
      const o = exec(to, c.call, c.start)
      return inv(o.kind === 'commit' ? o.state : c.start)
    })
    setStatus(
      <>
        {lead}{' '}
        {changed.length === 0 ? (
          <>No call moved.</>
        ) : (
          <>
            {changed.length === 1 ? 'One call moved' : `${changed.length} calls moved`}:{' '}
            {changed.map((c, i) => (
              <span key={c.id}>
                {i > 0 ? '; ' : ''}
                <code>{showCall(c.call)}</code>, from {outcomeLine(exec(from, c.call, c.start))} to{' '}
                {outcomeLine(exec(to, c.call, c.start))}
              </span>
            ))}
            .
          </>
        )}{' '}
        {allInv ? <><code>Inv</code> still holds after every call.</> : <><code>Inv</code> fails after some call.</>}
      </>,
    )
  }

  const set = (f: Field, o: string): void => {
    const next = { ...policy, [f]: o } as Policy
    if (samePolicy(next, policy)) return
    setBefore(policy)
    setPolicy(next)
    setSwitches((n) => n + 1)
    report(policy, next, (
      <>
        <strong>
          {f} = {optLabel(f, o)}.
        </strong>
      </>
    ))
  }

  const showMe = (): void => {
    setBefore(policy)
    setPolicy(PERMISSIVE)
    setSwitches((n) => n + 1)
    const outs = CASES.map((c) => ({ c, o: exec(PERMISSIVE, c.call, c.start) }))
    const quiet = outs.filter(({ o }) => o.kind === 'commit' && !o.changed)
    const allCommit = outs.every(({ o }) => o.kind === 'commit')
    const allInv = outs.every(({ c, o }) => inv(o.kind === 'commit' ? o.state : c.start))
    const count = ['None', 'One', 'Two', 'Three', 'Four', 'All'][quiet.length] ?? String(quiet.length)
    setStatus(
      <>
        <strong>{allCommit ? 'Every call commits' : 'Not every call commits'}</strong> under <code>{showPolicy(PERMISSIVE)}</code>. {count}{' '}
        of the five change nothing, and a caller sees the same success from a zero amount, a self-transfer, an account that
        cannot cover the transfer and an account that does not exist.{' '}
        {allInv ? (
          <>
            <code>Inv</code> still holds after each one, as this page checks on these five calls: the decisions did not touch
            the theorem, only what a caller can tell apart.
          </>
        ) : (
          <>
            <code>Inv</code> fails after some call.
          </>
        )}
      </>,
    )
    want.current = resetRef.current
  }

  const reset = (): void => {
    if (samePolicy(policy, DEFAULT)) return
    setBefore(policy)
    setPolicy(DEFAULT)
    setSwitches((n) => n + 1)
    report(policy, DEFAULT, <strong>Back to the reference defaults.</strong>)
    want.current = showRef.current
  }

  return (
    <ToyFrame
      title="Switch a decision, watch the calls move"
      caption={
        <>
          The page runs the fixed order of checks from S3.L3 on each call under the policy you set, with balances as exact
          integers and maxBal = 2^63 − 1, and checks <code>Inv</code> on every state it returns. It is an illustration computed here:
          no Lean runs on this page, and it covers only these five calls.
        </>
      }
    >
      <p className="toy-goal">
        Goal: switch one decision at a time and see which calls move. Then try to make every call commit, and ask what a
        caller can still tell apart.
      </p>

      <div className="sp-fields">
        {FIELDS.map(({ field, name, options }) => (
          <fieldset key={field} className="toy-choice sp-field">
            <legend>{name}</legend>
            {options.map((o) => (
              <label key={o} data-on={policy[field] === o ? 'true' : undefined}>
                <input type="radio" name={`${uid}-${field}`} checked={policy[field] === o} onChange={() => set(field, o)} />
                <span>
                  {optLabel(field, o)}
                  {DEFAULT[field] === o ? <span className="sp-default"> (default)</span> : null}
                </span>
              </label>
            ))}
          </fieldset>
        ))}
      </div>

      <div className="toy-actions">
        <button ref={showRef} type="button" className="toy-button" data-primary="true" onClick={showMe} disabled={samePolicy(policy, PERMISSIVE)}>
          Show me: every call commits
        </button>
        <button ref={resetRef} type="button" className="toy-button" onClick={reset} disabled={samePolicy(policy, DEFAULT)}>
          Reference defaults
        </button>
      </div>

      <p className="toy-status" aria-live="polite">
        {status}
      </p>

      <div className="sp-table-frame">
        <table className="sp-table">
          <caption className="sp-table-cap">
            Policy: <code>{showPolicy(policy)}</code>
          </caption>
          <thead>
            <tr>
              <th scope="col">Call, from its start</th>
              <th scope="col">Outcome</th>
              <th scope="col">A caller sees</th>
              <th scope="col">
                <span className="sp-visually-hidden">Moved by the last switch</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ c, now, moved: m, holds }) => (
              <tr key={c.id} data-moved={m ? 'true' : undefined}>
                <th scope="row">
                  <code className="sp-call">{showCall(c.call)}</code>
                  <span className="sp-start">{showState(c.start)}</span>
                </th>
                <td data-label="Outcome">
                  <code className={now.kind === 'error' ? 'sp-err' : 'sp-ok'}>{outcomeText(now)}</code>
                  {now.kind === 'commit' && now.changed ? <span className="sp-after">{showState(now.state)}</span> : null}
                  <span className="sp-decided">
                    decided at <span className="sp-step">{now.step}</span> {STEP_NAMES[now.step]}
                  </span>
                  <span className="sp-inv">Inv {holds ? 'holds' : 'fails'}</span>
                </td>
                <td data-label="A caller sees">
                  <span className="sp-seen">
                    <svg className="sp-mark" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                      {now.kind === 'error' ? <circle className="sp-ring" cx="6" cy="6" r="4.5" /> : <rect className="sp-square" x="1.5" y="1.5" width="9" height="9" />}
                    </svg>
                    {seen(now)}
                  </span>
                </td>
                <td data-label="">
                  {m ? (
                    <span key={switches} className="sp-moved toy-land">
                      moved
                    </span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ToyFrame>
  )
}
