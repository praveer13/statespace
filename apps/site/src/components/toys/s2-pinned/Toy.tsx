// A game for S2.L10: fool the pinned statements. The learner picks one of six transfers and which statements are
// pinned; the page checks every pinned statement on a small grid of states and reads R the same way. A transfer that
// every pinned statement allows and R forbids has fooled the pin. With the lesson's four, the idle transfer does; once
// `transfer_moves` is pinned, none of the six can. Everything is computed here, over a small grid only.

import { useId, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ToyFrame } from '../ToyFrame.tsx'
import { AMT, BAL_HI, BAL_LO, EXAMPLE, EXIT, FOUR, GRID_STATES, IMPLS, PROPS, SEQ_AMT, SEQ_MAX, THEOREM, foolers, transfer, verdict } from './model.ts'
import type { Impl, Ledger, Prop, Witness } from './model.ts'
import './pinned.css'

const num = (n: number): string => (n < 0 ? `−${-n}` : String(n))
const led = (s: Ledger): string => `(${num(s.a)}, ${num(s.b)})`

const IMPL_TEXT: Record<Impl, { readonly name: string; readonly does: string }> = {
  pinned: { name: 'The pinned transfer', does: 'an allowed transfer moves n from a to b' },
  idle: { name: 'Idle', does: 'returns its input, whatever the amount' },
  short: { name: 'Short by one', does: 'an allowed transfer moves n − 1, and nothing for 0' },
  'no-guard': { name: 'No guard', does: 'always moves n, allowed or not' },
  backwards: { name: 'Backwards', does: 'an allowed transfer moves n from b to a' },
  mints: { name: 'Mints', does: 'an allowed transfer credits n + 1' },
}

const PROP_TEXT: Record<Prop, string> = {
  conserves: 'the total is unchanged',
  rejected: 'a disallowed transfer changes nothing',
  nonneg: 'from non-negative balances, both stay non-negative',
  sequence: 'the total is unchanged after a list of transfers',
  moves: 'an allowed transfer yields exactly (a − n, b + n)',
}

/** The exit item's amount under this transfer, when it is not the outcome R requires. */
function sayExit(impl: Impl): string {
  const t = transfer(impl, EXIT.s, EXIT.n)
  const want = { a: EXIT.s.a - EXIT.n, b: EXIT.s.b + EXIT.n }
  if (t.a === want.a && t.b === want.b) return ''
  return ` The exit item's amount ${EXIT.n} from ${led(EXIT.s)} gives ${led(t)} under this transfer, where R requires ${led(want)}.`
}

function sayWitness(w: Witness): string {
  const amt = typeof w.n === 'number' ? `amount ${num(w.n)}` : `amounts [${w.n.map(num).join(', ')}]`
  return `${led(w.s)}, ${amt}, gives ${led(w.after)}`
}

/** Balances as rows of unit squares: ink squares right of the zero rule, violation squares left of it. */
function Balances({ before, after }: { readonly before: Ledger; readonly after: Ledger }) {
  const U = 12
  const NEG = 6
  const LEFT = 64
  const ZERO = LEFT + NEG * U
  const MAXV = 16
  const rows: { label: string; v: number }[] = [
    { label: 'before a', v: before.a },
    { label: 'before b', v: before.b },
    { label: 'after a', v: after.a },
    { label: 'after b', v: after.b },
  ]
  const ROW = 22
  const H = rows.length * ROW + 14
  const W = ZERO + MAXV * U + 40
  return (
    <svg className="toy-svg tp-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Before ${led(before)}, after ${led(after)}.`}>
      <line className="tp-zero" x1={ZERO} x2={ZERO} y1={2} y2={H - 4} />
      {rows.map((r, i) => {
        const y = 6 + i * ROW + (i >= 2 ? 8 : 0)
        const pos = Math.min(Math.max(r.v, 0), MAXV)
        const neg = Math.min(Math.max(-r.v, 0), NEG)
        return (
          <g key={r.label}>
            <text className="tp-row-label" x={0} y={y + 11}>
              {r.label}
            </text>
            {Array.from({ length: pos }, (_, k) => (
              <rect key={`p${k}`} className={i >= 2 ? 'tp-unit toy-land' : 'tp-unit'} x={ZERO + 2 + k * U} y={y} width={U - 3} height={U - 1} />
            ))}
            {Array.from({ length: neg }, (_, k) => (
              <rect key={`n${k}`} className={i >= 2 ? 'line-violation tp-debt toy-land' : 'line-violation tp-debt'} x={ZERO - (k + 1) * U + 1} y={y} width={U - 3} height={U - 1} />
            ))}
            <text className="tp-row-value" x={ZERO + 2 + pos * U + 6} y={y + 11}>
              {num(r.v)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export default function FoolThePin() {
  const uid = useId().replace(/[^a-zA-Z0-9-]/g, '')
  const [impl, setImpl] = useState<Impl>('pinned')
  const [pins, setPins] = useState<ReadonlySet<Prop>>(new Set(FOUR))
  const [shown, setShown] = useState<ReactNode>(null)

  const pinned = useMemo(() => PROPS.filter((p) => pins.has(p)), [pins])
  const v = useMemo(() => verdict(impl, pinned), [impl, pinned])
  const all = useMemo(() => Object.fromEntries(PROPS.map((p) => [p, verdict(impl, [p]).failing[0]?.w ?? null])) as Record<Prop, Witness | null>, [impl])
  const after = transfer(impl, EXAMPLE.s, EXAMPLE.n)

  const toggle = (p: Prop): void => {
    setShown(null)
    setPins((s) => {
      const n = new Set(s)
      if (n.has(p)) n.delete(p)
      else n.add(p)
      return n
    })
  }

  const pick = (i: Impl): void => {
    setShown(null)
    setImpl(i)
  }

  const showMe = (): void => {
    const f = foolers(pinned)
    const first = f[0]
    if (first === undefined) {
      setShown(
        <>
          <strong>None of the six fools these pins.</strong>{' '}
          {pins.has('moves')
            ? 'transfer_moves says exactly where an allowed transfer leaves the money, so every transfer that breaks R by moving the wrong amount breaks it too, and the other pins catch the rest. On this grid, R and the pins now agree for all six.'
            : 'Each transfer that breaks R also breaks one of the statements you pinned, on this grid.'}{' '}
          A different seventh transfer, or a state outside the grid, is beyond what this page looked at.
        </>,
      )
      return
    }
    setImpl(first)
    const r = verdict(first, pinned).r
    setShown(
      <>
        <strong>Here is one: {IMPL_TEXT[first].name}.</strong> Every pinned statement holds for it on the grid, and R does not:{' '}
        {r !== null ? `${sayWitness(r.w)}, and ${r.why}.` : ''}
        {sayExit(first)}
        {f.length > 1 ? ` ${f.slice(1).map((i) => IMPL_TEXT[i].name).join(' and ')} also fool${f.length > 2 ? '' : 's'} these pins.` : ''}
      </>,
    )
  }

  const status: ReactNode =
    shown ??
    (pinned.length === 0 ? (
      <>
        <strong>Nothing is pinned,</strong> so nothing can catch any transfer. Pin at least one statement.
      </>
    ) : v.failing.length > 0 ? (
      <>
        <strong>Caught.</strong> <code>{THEOREM[(v.failing[0] as { p: Prop }).p]}</code> fails for {IMPL_TEXT[impl].name.toLowerCase()}:{' '}
        {sayWitness((v.failing[0] as { w: Witness }).w)}.
        {v.failing.length > 1 ? ` ${v.failing.length - 1} more pinned ${v.failing.length === 2 ? 'statement fails' : 'statements fail'} too.` : ''}
      </>
    ) : v.r !== null ? (
      <>
        <strong>Fooled.</strong> Every pinned statement holds for {IMPL_TEXT[impl].name.toLowerCase()} on this grid, and R does not:{' '}
        {sayWitness(v.r.w)}, and {v.r.why}.{sayExit(impl)} Nothing pinned stops this transfer; the gap is in what was pinned, not in a proof.
      </>
    ) : (
      <>
        <strong>Nothing to fool.</strong> {IMPL_TEXT[impl].name} meets every pinned statement and R on this grid. Try another transfer.
      </>
    ))

  return (
    <ToyFrame
      title="Fool the pinned statements"
      kind="Game"
      caption={
        <>
          This page evaluates each statement as a property of the transfer you pick, on {GRID_STATES} states with balances from{' '}
          {num(BAL_LO)} to {BAL_HI}, amounts from {num(Math.min(...AMT))} to {Math.max(...AMT)}, and lists of up to {SEQ_MAX} amounts from{' '}
          {'{'}
          {SEQ_AMT.map(num).join(', ')}
          {'}'}. No checker runs here, and holding on this grid is not a proof. The R row is this page&apos;s own reading of the
          lesson&apos;s requirement; no checker reads that either.
        </>
      }
    >
      <p className="toy-goal">Goal: pick a transfer that every pinned statement allows and R forbids.</p>

      <div className="tp-pickers">
        <fieldset className="toy-choice">
          <legend>The transfer</legend>
          {IMPLS.map((i) => (
            <label key={i}>
              <input type="radio" name={`${uid}-impl`} checked={impl === i} onChange={() => pick(i)} />
              <span>
                <span className="tp-impl">{IMPL_TEXT[i].name}:</span> {IMPL_TEXT[i].does}
              </span>
            </label>
          ))}
        </fieldset>

        <fieldset className="toy-choice">
          <legend>Pinned in the challenge</legend>
          {PROPS.map((p) => (
            <label key={p}>
              <input type="checkbox" checked={pins.has(p)} onChange={() => toggle(p)} />
              <code>{THEOREM[p]}</code>
            </label>
          ))}
        </fieldset>
      </div>

      <div className="tp-table-wrap">
        <table className="tp-table">
          <caption className="tp-table-cap">Each statement on the grid, for {IMPL_TEXT[impl].name.toLowerCase()}</caption>
          <thead>
            <tr>
              <th scope="col">Statement</th>
              <th scope="col">On this grid</th>
            </tr>
          </thead>
          <tbody>
            {PROPS.map((p) => {
              const w = all[p]
              return (
                <tr key={p} data-pinned={pins.has(p)}>
                  <th scope="row">
                    <code>{THEOREM[p]}</code>
                    <span className="tp-says">{PROP_TEXT[p]}</span>
                    <span className="tp-pin">{pins.has(p) ? 'pinned' : 'not pinned'}</span>
                  </th>
                  <td>
                    {w === null ? (
                      <span className="tp-mark">
                        <svg className="tp-key" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                          <circle className="tp-holds" cx="6" cy="6" r="5" />
                        </svg>
                        holds on every state here
                      </span>
                    ) : (
                      <span className="tp-mark">
                        <svg className="tp-key" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                          <rect className="line-violation tp-fails" x="1" y="1" width="10" height="10" />
                        </svg>
                        fails: {sayWitness(w)}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
            <tr className="tp-r">
              <th scope="row">
                R, the requirement
                <span className="tp-says">money moves exactly; a refusal changes nothing; no negatives; no money made or lost</span>
                <span className="tp-pin">read by no checker</span>
              </th>
              <td>
                {v.r === null ? (
                  <span className="tp-mark">
                    <svg className="tp-key" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                      <circle className="tp-holds" cx="6" cy="6" r="5" />
                    </svg>
                    holds on every state here
                  </span>
                ) : (
                  <span className="tp-mark">
                    <svg className="tp-key" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                      <rect className="line-violation tp-fails" x="1" y="1" width="10" height="10" />
                    </svg>
                    fails: {sayWitness(v.r.w)}
                  </span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="toy-actions">
        <button type="button" className="toy-button" data-primary="true" onClick={showMe}>
          Show me
        </button>
      </div>

      <p className="toy-status" aria-live="polite">
        {status}
      </p>

      <div className="tp-example">
        <p className="tp-example-head">
          The lesson&apos;s transfer of {EXAMPLE.n} from {led(EXAMPLE.s)}, under {IMPL_TEXT[impl].name.toLowerCase()}: after is {led(after)}.
        </p>
        <Balances key={impl} before={EXAMPLE.s} after={after} />
      </div>
    </ToyFrame>
  )
}
