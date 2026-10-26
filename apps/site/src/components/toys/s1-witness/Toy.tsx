// A game for Boot (S1.L0): get a transfer past the pull request's guard and overdraw the sender. The learner picks two
// whole-number balances and an amount; the page runs the transfer's guard on them and says, in words, whether the pick
// is a witness and why. "Show me" reveals the smallest witness and the whole map for that amount. The guard can be
// switched to the lesson's fix, which leaves the grid with no witness. Everything is computed here, over 0 to 9 only.

import { useId, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ToyFrame } from '../ToyFrame.tsx'
import { GRID_PICKS, MAX, judge, picksFor, smallestWitness, witnessCount } from './model.ts'
import type { Guard, Pick, Verdict } from './model.ts'
import './witness.css'

const CELL = 24
const LEFT = 44
const TOP = 12
const SIZE = CELL * (MAX + 1)
const W = LEFT + SIZE + 12
const H = TOP + SIZE + 44

/** Grid position of a pick: sender along the bottom, recipient up the side. */
const cx = (a: number): number => LEFT + a * CELL + CELL / 2
const cy = (b: number): number => TOP + (MAX - b) * CELL + CELL / 2

const whose = (g: Guard): string => (g === 'as-written' ? 'recipient' : 'sender')

/** A balance as printed: a true minus sign below zero. */
const num = (n: number): string => (n < 0 ? `\u2212${-n}` : String(n))

function parse(text: string): number | null {
  if (!/^\s*\d{1,2}\s*$/.test(text)) return null
  const n = Number(text)
  return n >= 0 && n <= MAX ? n : null
}

function sayVerdict(g: Guard, p: Pick, v: Verdict): ReactNode {
  switch (v.kind) {
    case 'not-positive':
      return (
        <>
          <strong>Rejected, not a witness.</strong> An amount of 0 fails the first test, <code>amount &lt;= 0</code>, so the
          transfer raises Rejected.
        </>
      )
    case 'guard-rejects':
      return (
        <>
          <strong>Rejected, not a witness.</strong> The guard compares the amount, {p.amount}, with the {whose(g)}&apos;s {v.checked}.
          That is not enough, so the transfer raises Rejected.
        </>
      )
    case 'fine':
      return (
        <>
          <strong>Through, but not a witness.</strong> The {whose(g)}&apos;s {v.checked} covers {p.amount}, so the transfer goes
          through, and the sender ends at {num(v.after)}. Nobody is below zero.
        </>
      )
    case 'witness':
      return (
        <>
          <strong>A witness.</strong> The guard checks the {whose(g)}&apos;s {v.checked}, which covers {p.amount}, so the transfer
          goes through, and the sender&apos;s {p.a} ends at {num(v.after)}. The guard read the wrong balance.
        </>
      )
  }
}

interface Try {
  readonly guard: Guard
  readonly pick: Pick
  readonly n: number
}

function Mark({ p, v, fresh }: { readonly p: Pick; readonly v: Verdict; readonly fresh: boolean }) {
  const x = cx(p.a)
  const y = cy(p.b)
  const land = fresh ? ' toy-land' : ''
  if (v.kind === 'witness') return <rect className={`line-violation tw-witness${land}`} x={x - 6} y={y - 6} width={12} height={12} />
  if (v.kind === 'fine') return <circle className={`tw-fine${land}`} cx={x} cy={y} r={5} />
  return <circle className={`tw-rejected${land}`} cx={x} cy={y} r={4} />
}

export default function WitnessGame() {
  const uid = useId().replace(/[^a-zA-Z0-9-]/g, '')
  const [guard, setGuard] = useState<Guard>('as-written')
  const [aText, setA] = useState('5')
  const [bText, setB] = useState('5')
  const [mText, setM] = useState('3')
  const [tries, setTries] = useState<readonly Try[]>([])
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(new Set())
  const [status, setStatus] = useState<ReactNode>('Pick two balances and an amount, then try the transfer.')

  const a = parse(aText)
  const b = parse(bText)
  const m = parse(mText)
  const valid = a !== null && b !== null && m !== null
  const amount = m ?? 0
  const open = revealed.has(`${guard}:${amount}`)
  const shown = useMemo(() => picksFor(amount).map((p) => ({ p, v: judge(guard, p) })), [guard, amount])
  const mine = tries.filter((t) => t.guard === guard && t.pick.amount === amount)
  const last = tries.length > 0 ? tries[tries.length - 1] : undefined
  const witnessesHere = shown.filter((s) => s.v.kind === 'witness').length

  const attempt = (p: Pick): void => {
    setTries((ts) => [...ts.filter((t) => !(t.guard === guard && t.pick.a === p.a && t.pick.b === p.b && t.pick.amount === p.amount)), { guard, pick: p, n: ts.length }])
    setStatus(sayVerdict(guard, p, judge(guard, p)))
  }

  const tryIt = (): void => {
    if (!valid) {
      setStatus(`Balances and amounts here are whole numbers from 0 to ${MAX}.`)
      return
    }
    attempt({ a, b, amount: m })
  }

  const showMe = (): void => {
    const w = smallestWitness(guard, amount > 0 ? amount : undefined) ?? smallestWitness(guard)
    if (w === null) {
      setRevealed((r) => new Set(r).add(`${guard}:${amount}`))
      setStatus(
        <>
          <strong>No witness in this grid.</strong> With the guard reading the sender, a transfer goes through only when the
          amount is at most the sender&apos;s balance, so the sender ends at zero or above. This page checked only the{' '}
          {GRID_PICKS.toLocaleString('en')} picks from 0 to {MAX}; Z3&apos;s <code>unsat</code> for the fixed guard, above, is about
          every whole number.
        </>,
      )
      return
    }
    setA(String(w.a))
    setB(String(w.b))
    setM(String(w.amount))
    setRevealed((r) => new Set(r).add(`${guard}:${w.amount}`))
    setTries((ts) => [...ts, { guard, pick: w, n: ts.length }])
    const v = judge(guard, w)
    const here = picksFor(w.amount).filter((p) => judge(guard, p).kind === 'witness').length
    setStatus(
      <>
        <strong>Here is one:</strong> sender {w.a}, recipient {w.b}, amount {w.amount}. The guard checks the recipient&apos;s {w.b},
        which covers {w.amount}, so the transfer goes through, and the sender&apos;s {w.a} ends at {v.kind === 'witness' ? num(v.after) : ''}.
        The map now shows every pick with amount {w.amount}: {here} of its {(MAX + 1) ** 2} are witnesses, and{' '}
        {witnessCount(guard)} of the grid&apos;s {GRID_PICKS.toLocaleString('en')} are.
      </>,
    )
  }

  const pickCell = (p: Pick): void => {
    setA(String(p.a))
    setB(String(p.b))
    attempt(p)
  }

  const label =
    `Map of sender balance (across) against recipient balance (up), 0 to ${MAX}, for an amount of ${amount}, under the ` +
    `${guard === 'as-written' ? "pull request's" : 'fixed'} guard. ` +
    (open
      ? `Every pick is shown: ${witnessesHere === 0 ? 'none is a witness' : witnessesHere === 1 ? 'one is a witness' : `${witnessesHere} are witnesses`}.`
      : `${mine.length} ${mine.length === 1 ? 'pick' : 'picks'} tried at this amount, ${mine.filter((t) => judge(guard, t.pick).kind === 'witness').length} of them witnesses.`)

  const ticks = Array.from({ length: MAX + 1 }, (_, i) => i)
  const edge = amount > 0 && amount <= MAX + 1

  return (
    <ToyFrame
      title="Get past the guard"
      kind="Game"
      caption={
        <>
          Balances and amounts are whole numbers from 0 to {MAX}. The page runs the transfer&apos;s guard on each pick itself and
          reports what happens; no solver runs here, and the grid says nothing about numbers beyond it.
        </>
      }
    >
      <p className="toy-goal">
        Goal: choose balances and an amount that get past the guard and leave the sender below zero.
      </p>

      <fieldset className="toy-choice">
        <legend>The guard</legend>
        <label>
          <input type="radio" name={`${uid}-guard`} checked={guard === 'as-written'} onChange={() => setGuard('as-written')} />
          <span>
            As the pull request wrote it: <code>amount &gt; dst.balance</code> rejects
          </span>
        </label>
        <label>
          <input type="radio" name={`${uid}-guard`} checked={guard === 'fixed'} onChange={() => setGuard('fixed')} />
          <span>
            Fixed: <code>amount &gt; src.balance</code> rejects
          </span>
        </label>
      </fieldset>

      <form
        className="toy-controls"
        onSubmit={(e) => {
          e.preventDefault()
          tryIt()
        }}
      >
        <label className="toy-field">
          <span className="toy-field-name">Sender, src</span>
          <input className="toy-number" type="number" inputMode="numeric" min={0} max={MAX} step={1} value={aText} aria-invalid={a === null} onChange={(e) => setA(e.target.value)} />
        </label>
        <label className="toy-field">
          <span className="toy-field-name">Recipient, dst</span>
          <input className="toy-number" type="number" inputMode="numeric" min={0} max={MAX} step={1} value={bText} aria-invalid={b === null} onChange={(e) => setB(e.target.value)} />
        </label>
        <label className="toy-field">
          <span className="toy-field-name">Amount</span>
          <input className="toy-number" type="number" inputMode="numeric" min={0} max={MAX} step={1} value={mText} aria-invalid={m === null} onChange={(e) => setM(e.target.value)} />
        </label>
        <div className="toy-actions">
          <button type="submit" className="toy-button" data-primary="true">
            Try this transfer
          </button>
          <button type="button" className="toy-button" onClick={showMe}>
            Show me
          </button>
        </div>
      </form>

      <p className="toy-status" aria-live="polite">
        {status}
      </p>

      <div className="tw-map">
        <svg className="toy-svg tw-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
          <g className="tw-axis">
            {ticks.map((i) => (
              <text key={`x${i}`} x={cx(i)} y={TOP + SIZE + 16} textAnchor="middle">
                {i}
              </text>
            ))}
            {ticks.map((i) => (
              <text key={`y${i}`} x={LEFT - 10} y={cy(i) + 4} textAnchor="end">
                {i}
              </text>
            ))}
            <text className="tw-axis-name" x={LEFT + SIZE / 2} y={TOP + SIZE + 36} textAnchor="middle">
              sender, src
            </text>
            <text className="tw-axis-name" x={12} y={TOP + SIZE / 2} textAnchor="middle" transform={`rotate(-90 12 ${TOP + SIZE / 2})`}>
              recipient, dst
            </text>
          </g>
          <rect className="tw-frame" x={LEFT} y={TOP} width={SIZE} height={SIZE} />
          {open && edge ? (
            <g className="tw-bounds">
              {guard === 'as-written' ? (
                <line x1={LEFT} x2={LEFT + SIZE} y1={cy(amount) + CELL / 2} y2={cy(amount) + CELL / 2} />
              ) : (
                <line x1={cx(amount) - CELL / 2} x2={cx(amount) - CELL / 2} y1={TOP} y2={TOP + SIZE} />
              )}
              <line className="tw-zero" x1={cx(amount) - CELL / 2} x2={cx(amount) - CELL / 2} y1={TOP} y2={TOP + SIZE} />
            </g>
          ) : null}
          <g className="tw-cells">
            {shown.map(({ p }) => (
              <circle key={`u${p.a},${p.b}`} className="tw-unknown" cx={cx(p.a)} cy={cy(p.b)} r={1.6} />
            ))}
          </g>
          <g>
            {open
              ? shown.map(({ p, v }) => <Mark key={`r${p.a},${p.b}`} p={p} v={v} fresh={false} />)
              : mine.map((t) => <Mark key={`t${t.pick.a},${t.pick.b}`} p={t.pick} v={judge(guard, t.pick)} fresh={t === last} />)}
          </g>
          {a !== null && b !== null ? <circle key={`h${a},${b},${amount}`} className="tw-here toy-land" cx={cx(a)} cy={cy(b)} r={10} /> : null}
          <g className="tw-hit" aria-hidden="true">
            {shown.map(({ p }) => (
              <rect key={`c${p.a},${p.b}`} x={cx(p.a) - CELL / 2} y={cy(p.b) - CELL / 2} width={CELL} height={CELL} onClick={() => pickCell(p)} />
            ))}
          </g>
        </svg>
        {open && edge ? (
          <p className="tw-bounds-note">
            {guard === 'as-written'
              ? `The horizontal rule is the guard: picks on or above it have a recipient holding at least ${amount}, so they get through. The vertical rule is the overdraft line: senders left of it hold less than ${amount} and would end below zero. Witnesses sit above the one and left of the other.`
              : `The guard and the overdraft line are one vertical rule now: a pick gets through only when the sender holds at least ${amount}, which is exactly when the sender stays at zero or above.`}
          </p>
        ) : null}
        <ul className="toy-legend" aria-label="Key">
          <li>
            <svg className="toy-key" width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">
              <rect className="line-violation tw-witness" x={-6} y={-6} width={12} height={12} />
            </svg>
            witness: through, sender below zero
          </li>
          <li>
            <svg className="toy-key" width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">
              <circle className="tw-fine" r={5} />
            </svg>
            through, nobody below zero
          </li>
          <li>
            <svg className="toy-key" width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">
              <circle className="tw-rejected" r={4} />
            </svg>
            rejected
          </li>
          <li>
            <svg className="toy-key" width="22" height="22" viewBox="-11 -11 22 22" aria-hidden="true">
              <circle className="tw-here" r={9} />
            </svg>
            your pick
          </li>
        </ul>
      </div>
    </ToyFrame>
  )
}
