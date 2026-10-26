// An interactive for S4.L3: push Inv back through Transfer one command at a time, the way the Derivation Board's cell 1
// does, then try a start state and watch the command run forward beside the formulas. At every program point the
// formula holds exactly when the run ends in Inv, which is what "weakest precondition" means. The guard's reading can
// be switched, and the game is to find a state where the assume reading and Mini-Plinth's reading part. Everything is
// computed in the page over a small grid of whole numbers; no solver runs here.

import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { ToyFrame } from '../ToyFrame.tsx'
import { HI, LO, disagree, grid, guardHolds, invHolds, linesFor, plainestDisagreement, run, top } from './model.ts'
import type { Line, Piece, Point, Reading, Run, State } from './model.ts'
import './wp.css'

const READINGS: ReadonlyArray<{ readonly r: Reading; readonly name: string; readonly gloss: string }> = [
  { r: 'requires', name: 'requires g', gloss: 'Mini-Plinth: Err, state unchanged' },
  { r: 'assume', name: 'assume g', gloss: 'a failing run is ignored' },
  { r: 'assert', name: 'assert g', gloss: "an error to rule out; Dijkstra's if reads the same" },
]

const COMMANDS = ['requires amount ≤ a', 'a := a − amount', 'b := b + amount'] as const

/** The command each push goes through: the first push crosses the last command. */
const PUSHED_THROUGH = ['b := b + amount', 'a := a − amount', 'the guard, amount ≤ a'] as const

const num = (n: number): string => (n < 0 ? `−${-n}` : String(n))

function parse(text: string, lo: number, hi: number): number | null {
  const t = text.trim().replace('−', '-')
  if (!/^-?\d{1,2}$/.test(t)) return null
  const n = Number(t)
  return n >= lo && n <= hi ? n : null
}

function Formula({ pieces, mark }: { readonly pieces: readonly Piece[]; readonly mark: boolean }) {
  return (
    <code className="wp-formula">
      {'{ '}
      {pieces.map((p, i) =>
        p.fresh === true && mark ? (
          <span key={i} className="wp-fresh">
            {p.text}
          </span>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
      {' }'}
    </code>
  )
}

function pointText(p: Point): string {
  return p.reached ? `a = ${num(p.a)}, b = ${num(p.b)}` : ''
}

function outcomeText(r: Run): string {
  switch (r.outcome.kind) {
    case 'ran':
      return `ran: ends at a = ${num(r.outcome.a)}, b = ${num(r.outcome.b)}, ${r.endsInInv ? 'inside Inv' : 'outside Inv'}`
    case 'err':
      return `Err, state unchanged at a = ${num(r.outcome.a)}, b = ${num(r.outcome.b)}, ${r.endsInInv ? 'inside Inv' : 'outside Inv'}`
    case 'ignored':
      return 'guard fails, so the run is ignored and counts as fine'
    case 'error':
      return 'guard fails, so the run is an error and does not count as fine'
  }
}

export default function WpPush() {
  const uid = useId().replace(/[^a-zA-Z0-9-]/g, '')
  const [reading, setReading] = useState<Reading>('requires')
  const [pushed, setPushed] = useState(0)
  const [aText, setA] = useState('5')
  const [bText, setB] = useState('0')
  const [mText, setM] = useState('3')
  const [status, setStatus] = useState<ReactNode>('Inv sits under the last command. Push it back one command at a time.')

  const a = parse(aText, LO, HI)
  const b = parse(bText, LO, HI)
  const m = parse(mText, 0, HI)
  const state: State | null = a !== null && b !== null && m !== null ? { a, b, amount: m } : null
  const lines = linesFor(reading)
  const theRun = state !== null ? run(reading, state) : null
  const done = pushed === 3
  const total = grid().length
  const parting = grid().filter(disagree).length

  const push = (): void => {
    if (done) return
    const next = pushed + 1
    setPushed(next)
    const l = lines[next] as Line
    setStatus(
      <>
        <strong>Pushed back through {PUSHED_THROUGH[next - 1]}.</strong> Rule: {l.rule}.{' '}
        {next === 3
          ? 'That is the weakest precondition of the whole of Transfer: at every point, the formula holds exactly when the run from there ends in Inv. Now try start states below.'
          : 'The new part of the formula is underlined.'}
      </>,
    )
  }

  const restart = (): void => {
    setPushed(0)
    setStatus('Back to the start: only Inv, under the last command.')
  }

  const pickReading = (r: Reading): void => {
    setReading(r)
    if (pushed === 3) {
      const l = top(r)
      setStatus(
        <>
          <strong>The top line changed with the reading.</strong> Rule: {l.rule}. The three lines below it do not depend on the guard.
        </>,
      )
    }
  }

  const judgeHere = (s: State): ReactNode => {
    const req = top('requires').holds(s)
    const asm = top('assume').holds(s)
    if (req !== asm)
      return (
        <>
          <strong>They part here.</strong> The guard fails ({s.amount} ≤ {num(s.a)} is false) and Inv already fails, so the assume
          reading ignores the run and its formula holds, while Mini-Plinth returns Err, keeps the broken state, and its formula fails.{' '}
          {parting} of the page&apos;s {total} start states are like this, every one with a failing guard and Inv already broken.
        </>
      )
    if (!guardHolds(s))
      return (
        <>
          <strong>They agree here.</strong> The guard fails, but Inv {invHolds(s) ? 'holds already, so both formulas hold' : 'fails'}. A failing
          guard alone does not separate them; the state must also break Inv.
        </>
      )
    return (
      <>
        <strong>They agree here.</strong> The guard holds, so every reading runs the body, and the formulas reduce to the same thing.
      </>
    )
  }

  const showMe = (): void => {
    const w = plainestDisagreement()
    if (w === null) return
    setA(String(w.a))
    setB(String(w.b))
    setM(String(w.amount))
    setPushed(3)
    setStatus(judgeHere(w))
  }

  const changeState = (set: (v: string) => void, v: string, which: 'a' | 'b' | 'm'): void => {
    set(v)
    const na = which === 'a' ? parse(v, LO, HI) : a
    const nb = which === 'b' ? parse(v, LO, HI) : b
    const nm = which === 'm' ? parse(v, 0, HI) : m
    if (na === null || nb === null || nm === null) {
      setStatus(`a and b are whole numbers from ${num(LO)} to ${HI}, and amount from 0 to ${HI}.`)
      return
    }
    const s = { a: na, b: nb, amount: nm }
    if (pushed < 3) {
      const r = run(reading, s)
      setStatus(
        <>
          <strong>The run:</strong> {outcomeText(r)}. Push back to the top to compare the weakest precondition with it.
        </>,
      )
      return
    }
    setStatus(judgeHere(s))
  }

  // The listing, top to bottom: slot 3, the guard, slot 2, the debit, slot 1, the credit, slot 0.
  const slot = (i: number): ReactNode => {
    const filled = i <= pushed
    const l = lines[i] as Line
    const p = theRun?.points[3 - i]
    const here = filled && state !== null && p !== undefined
    const at = here && p.reached ? l.holds({ a: p.a, b: p.b, amount: state.amount }) : null
    return (
      <li className="wp-slot" data-filled={filled} key={`s${i}`}>
        {filled ? (
          <div key={`${i}:${reading}:${pushed === i}`} className={pushed === i && i > 0 ? 'wp-slot-in toy-land' : 'wp-slot-in'}>
            <Formula pieces={l.pieces} mark={pushed === i && i > 0} />
            <span className="wp-rule">{l.rule}</span>
          </div>
        ) : (
          <div className="wp-slot-in">
            <code className="wp-formula wp-blank">{'{ ? }'}</code>
            <span className="wp-rule">not derived yet</span>
          </div>
        )}
        {here ? (
          <span className="wp-at">
            {p.reached ? (
              <>
                <span className="wp-at-state">{pointText(p)}</span>
                <span className="wp-verdict" data-holds={at === true}>
                  {at === true ? 'holds' : 'fails'}
                </span>
              </>
            ) : (
              <span className="wp-at-state">not reached</span>
            )}
          </span>
        ) : null}
      </li>
    )
  }

  const cmd = (k: number): ReactNode => {
    const next = 2 - pushed === k
    return (
      <li className="wp-cmd" data-next={next && !done} key={`c${k}`}>
        <code>{COMMANDS[k]}</code>
        {next && !done ? <span className="wp-next">next to push through</span> : null}
        {k === 0 && theRun !== null && state !== null ? (
          <span className="wp-at-state">{guardHolds(state) ? 'guard holds' : `guard fails: ${theRun.outcome.kind === 'err' ? 'Err' : theRun.outcome.kind === 'ignored' ? 'run ignored' : 'error'}`}</span>
        ) : null}
      </li>
    )
  }

  return (
    <ToyFrame
      title="Push Inv back through Transfer"
      caption={
        <>
          The page derives each line by the lesson&apos;s rules and evaluates it on whole numbers, a and b from {num(LO)} to {HI} and
          amount from 0 to {HI}, {total} start states in all. It runs Transfer forward on the same numbers. No solver runs here, and
          the grid says nothing about numbers beyond it; the Board&apos;s Z3 queries above are about every integer.
        </>
      }
    >
      <p className="toy-goal">
        Goal: push <code>a ≥ 0 ∧ b ≥ 0</code> back to the top, then find a start state where the assume reading and Mini-Plinth&apos;s
        reading disagree.
      </p>

      <fieldset className="toy-choice wp-readings">
        <legend>The guard reads as</legend>
        {READINGS.map((x) => (
          <label key={x.r}>
            <input type="radio" name={`${uid}-reading`} checked={reading === x.r} onChange={() => pickReading(x.r)} />
            <span>
              <code>{x.name}</code>: {x.gloss}
            </span>
          </label>
        ))}
      </fieldset>

      <div className="toy-actions">
        <button type="button" className="toy-button" data-primary="true" onClick={push} disabled={done}>
          Push back one command
        </button>
        <button type="button" className="toy-button" onClick={restart} disabled={pushed === 0}>
          Start over
        </button>
      </div>

      <ol className="wp-prog" aria-label="Transfer with the formula at each point, top to bottom">
        {slot(3)}
        {cmd(0)}
        {slot(2)}
        {cmd(1)}
        {slot(1)}
        {cmd(2)}
        {slot(0)}
      </ol>

      <form className="toy-controls" onSubmit={(e) => e.preventDefault()} aria-label="A start state">
        <label className="toy-field">
          <span className="toy-field-name wp-var">a</span>
          <input className="toy-number" type="number" inputMode="numeric" min={LO} max={HI} step={1} value={aText} aria-invalid={a === null} onChange={(e) => changeState(setA, e.target.value, 'a')} />
        </label>
        <label className="toy-field">
          <span className="toy-field-name wp-var">b</span>
          <input className="toy-number" type="number" inputMode="numeric" min={LO} max={HI} step={1} value={bText} aria-invalid={b === null} onChange={(e) => changeState(setB, e.target.value, 'b')} />
        </label>
        <label className="toy-field">
          <span className="toy-field-name wp-var">amount</span>
          <input className="toy-number" type="number" inputMode="numeric" min={0} max={HI} step={1} value={mText} aria-invalid={m === null} onChange={(e) => changeState(setM, e.target.value, 'm')} />
        </label>
        <div className="toy-actions">
          <button type="button" className="toy-button" onClick={showMe}>
            Show me
          </button>
        </div>
      </form>

      <p className="toy-status" aria-live="polite">
        {status}
      </p>

      {state !== null && done ? (
        <div className="wp-table-wrap">
          <table className="wp-table">
            <caption>
              From a = {num(state.a)}, b = {num(state.b)}, amount = {state.amount}
            </caption>
            <thead>
              <tr>
                <th scope="col">Reading</th>
                <th scope="col">Weakest precondition here</th>
                <th scope="col">The run</th>
              </tr>
            </thead>
            <tbody>
              {READINGS.map((x) => {
                const r = run(x.r, state)
                const h = top(x.r).holds(state)
                return (
                  <tr key={x.r} data-current={x.r === reading}>
                    <th scope="row">
                      <code>{x.name}</code>
                    </th>
                    <td>
                      <span className="wp-verdict" data-holds={h}>
                        {h ? 'holds' : 'fails'}
                      </span>
                    </td>
                    <td>{outcomeText(r)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </ToyFrame>
  )
}
