// A game for S4.L6: drive the holds model by hand from Init and try to reach the state the inductive step complains
// about, where holds exceed the balance, and then a negative balance. On the twin, whose Hold forgets holds already
// placed, two Holds and a Capture get there. On the good model nothing does, and "Show me" runs the page's bounded
// search from Init and draws every state it reached, printing its bound. Everything is computed here; no solver runs.

import { useId, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ToyFrame } from '../ToyFrame.tsx'
import { BOUND, MAX_INIT, STEP_CTI, apply, enabled, guardText, inv, limit, pastBalance, replay, search } from './model.ts'
import type { Model, Op, State, Step } from './model.ts'
import './cti.css'

const BAL_LO = -3
const BAL_HI = 6
const HELD_HI = 7
const MAX_STEPS = 12
const CELL = 30
const LEFT = 40
const TOP = 26
const COLS = BAL_HI - BAL_LO + 1
const ROWS = HELD_HI + 1
const W = LEFT + COLS * CELL + 12
const H = TOP + ROWS * CELL + 44

const x = (bal: number): number => LEFT + (bal - BAL_LO) * CELL + CELL / 2
const y = (held: number): number => TOP + (HELD_HI - held) * CELL + CELL / 2
const inWindow = (s: State): boolean => s.bal >= BAL_LO && s.bal <= BAL_HI && s.held >= 0 && s.held <= HELD_HI

const num = (n: number): string => (n < 0 ? `−${-n}` : String(n))
const st = (s: State): string => `bal ${num(s.bal)}, held ${s.held}`
const k = (s: State): string => `${s.bal},${s.held}`

function parse(text: string, lo: number, hi: number): number | null {
  if (!/^\s*\d{1,2}\s*$/.test(text)) return null
  const n = Number(text)
  return n >= lo && n <= hi ? n : null
}

const OPS: readonly Op[] = ['Hold', 'Capture', 'Release']

function Dot({ s, fresh }: { readonly s: State; readonly fresh: boolean }) {
  const land = fresh ? ' toy-land' : ''
  if (!inv(s)) return <rect className={`line-violation cr-broken${land}`} x={x(s.bal) - 7} y={y(s.held) - 7} width={14} height={14} />
  return <circle className={`cr-visit${land}`} cx={x(s.bal)} cy={y(s.held)} r={5} />
}

export default function CtiReach() {
  const uid = useId().replace(/[^a-zA-Z0-9-]/g, '')
  const [model, setModel] = useState<Model>('twin')
  const [initText, setInit] = useState('2')
  const [nText, setN] = useState('1')
  const [steps, setSteps] = useState<readonly Step[]>([])
  const [shown, setShown] = useState(false)
  const [status, setStatus] = useState<ReactNode>('You start at Init with held = 0. Pick an amount and a command.')

  const [initBal, setInitBal] = useState(2)
  const init: State = { bal: initBal, held: 0 }
  const path = useMemo(() => replay(model, init, steps) ?? [init], [model, initBal, steps])
  const here = path[path.length - 1] as State
  const n = parse(nText, 1, 9)
  const found = useMemo(() => search(model, BOUND, initBal), [model, initBal])
  const everywhere = useMemo(() => search(model, BOUND), [model])
  const reachedAll = [...found.reached.values()]
  const inside = reachedAll.filter(inWindow)
  const outside = reachedAll.length - inside.length
  const insideBroken = inside.filter((s) => !inv(s)).length
  const broken = !inv(here)

  const reset = (b: number, why: string): void => {
    setSteps([])
    setShown(false)
    setStatus(`${why} You are at Init, bal ${b}, held 0.`)
  }

  const doOp = (op: Op): void => {
    if (n === null) {
      setStatus('The amount is a whole number from 1 to 9.')
      return
    }
    if (broken) {
      setStatus(<>The balance is already below zero, so the run has broken Inv. Undo a step or start again.</>)
      return
    }
    if (steps.length >= MAX_STEPS) {
      setStatus(`This page keeps a run to ${MAX_STEPS} steps. Undo a step or start again.`)
      return
    }
    if (!enabled(model, op, here, n)) {
      setStatus(
        <>
          <strong>
            {op}({n}) is rejected.
          </strong>{' '}
          Its guard is <code>{guardText(model, op)}</code>, here {n} ≤ {num(limit(model, op, here))}, which is false. The state stays at {st(here)}.
        </>,
      )
      return
    }
    const next = apply(model, here, { op, n }) as State
    if (!inWindow(next)) {
      setStatus(
        `The model allows ${op}(${n}), but it would leave the drawing, which stops at held ${HELD_HI} and bal ${num(BAL_LO)}. Try a smaller amount.`,
      )
      return
    }
    setSteps((ss) => [...ss, { op, n }])
    const count = steps.length + 1
    if (!inv(next))
      setStatus(
        <>
          <strong>Inv is broken after {count} steps from Init:</strong> {st(next)}. The state before the {op} had holds above the balance,
          the shape of the step query&apos;s counterexample, and you reached it from Init. That makes it reachable: fix the command.
        </>,
      )
    else if (pastBalance(next))
      setStatus(
        <>
          <strong>Holds exceed the balance:</strong> {st(next)}, after {count} steps from Init. This is the step query&apos;s territory, and you
          got here by a real run. A Capture of more than the balance now breaks Inv.
        </>,
      )
    else
      setStatus(
        <>
          {op}({n}) runs: {st(next)}. {model === 'good' ? `Hold checks the free balance, ${num(next.bal - next.held)} now.` : 'Hold checks only the balance.'}
        </>,
      )
  }

  const undo = (): void => {
    if (steps.length === 0) return
    const prev = path[path.length - 2] as State
    setSteps((ss) => ss.slice(0, -1))
    setStatus(`Undone. Back at ${st(prev)}.`)
  }

  const showMe = (): void => {
    setShown(true)
    const reachedN = found.reached.size
    if (found.trace !== null) {
      setSteps(found.trace.steps)
      const last = replay(model, found.trace.init, found.trace.steps)
      const end = last !== null ? (last[last.length - 1] as State) : init
      setStatus(
        <>
          <strong>Here is a shortest run from Init:</strong> {found.trace.steps.map((s) => `${s.op}(${s.n})`).join(', ')}, ending at {st(end)}. It is{' '}
          {found.trace.steps.length} steps long. The page searched every run of up to {BOUND} steps from bal {initBal}, stopping a run
          where Inv breaks, and reached {reachedN} states. The {inside.length} that fit the drawing are marked, small dots where Inv holds
          {insideBroken > 0 ? ` and small squares where it is broken (${insideBroken})` : ''}{outside > 0 ? `; ${outside} more lie beyond the drawing` : ''}. A run
          that breaks Inv makes the CTI a bug: fix Hold so it counts what is already held.
        </>,
      )
      return
    }
    setSteps([])
    setStatus(
      model === 'good' ? (
        <>
          <strong>None within {BOUND} steps.</strong> The page searched every run of up to {BOUND} steps from bal {initBal}, with every amount
          the guards allow, and reached {reachedN} states, {found.anyPastBalance ? 'some' : 'none'} with holds above the balance. Started from
          every balance 0 to {MAX_INIT}, it reaches {everywhere.reached.size} states,{' '}
          {everywhere.trace === null && !everywhere.anyPastBalance ? 'with the same answer' : 'and finds a different answer there'}. That is bounded: it says nothing about step {BOUND + 1}. The step query&apos;s
          counterexample is still there, so strengthen the invariant with <code>held ≤ bal</code>.
        </>
      ) : (
        <>
          <strong>None from bal {initBal} within {BOUND} steps.</strong> With bal 0 no Hold is enabled at all. Start from bal 1 or more and two
          Holds stack past the balance.
        </>
      ),
    )
  }

  const label =
    `Map of states, balance across from ${num(BAL_LO)} to ${BAL_HI}, held up from 0 to ${HELD_HI}, on the ${model === 'twin' ? 'twin' : 'good'} model. ` +
    `A diagonal marks held = bal; above it, holds exceed the balance. The step query's counterexample sits at bal 0, held 1. ` +
    `Your run has ${steps.length} ${steps.length === 1 ? 'step' : 'steps'} and stands at ${st(here)}${broken ? ', with Inv broken' : ''}.` +
    (shown
      ? ` The bounded search from bal ${initBal} reached ${found.reached.size} states; the ${inside.length} inside the map are drawn as small dots where Inv holds` +
        (insideBroken > 0 ? ` and small squares where it is broken (${insideBroken})` : '') +
        (outside > 0 ? `, and ${outside} lie beyond it.` : '.')
      : '')

  const cols = Array.from({ length: COLS }, (_, i) => BAL_LO + i)
  const rows = Array.from({ length: ROWS }, (_, i) => i)
  const zeroX = x(0) - CELL / 2
  // The boundary of held > bal runs between the cells, along held = bal + 1/2.
  const diag = { x1: x(-1), y1: y(-0.5), x2: x(BAL_HI + 0.5), y2: y(BAL_HI + 1) }

  return (
    <ToyFrame
      title="Reach the counterexample"
      kind="Game"
      caption={
        <>
          The holds model of S4.L4, small: one account, three commands, whole-number amounts. The page applies each guard itself, and
          its search from Init covers every run of up to {BOUND} steps from balances 0 to {MAX_INIT} and nothing longer. No solver
          runs here; the lesson&apos;s Z3 cell above asks the same questions of every integer.
        </>
      }
    >
      <p className="toy-goal">Goal: from Init, reach a state where holds exceed the balance, then drive the balance below zero.</p>

      <fieldset className="toy-choice">
        <legend>The model</legend>
        <label>
          <input
            type="radio"
            name={`${uid}-model`}
            checked={model === 'twin'}
            onChange={() => {
              setModel('twin')
              reset(initBal, 'The twin: Hold checks n ≤ bal.')
            }}
          />
          <span>
            Twin: <code>Hold(n)</code> requires <code>n ≤ bal</code>
          </span>
        </label>
        <label>
          <input
            type="radio"
            name={`${uid}-model`}
            checked={model === 'good'}
            onChange={() => {
              setModel('good')
              reset(initBal, 'The good model: Hold checks n ≤ bal − held.')
            }}
          />
          <span>
            Good: <code>Hold(n)</code> requires <code>n ≤ bal − held</code>
          </span>
        </label>
      </fieldset>

      <div className="toy-controls">
        <label className="toy-field">
          <span className="toy-field-name">Init bal</span>
          <input
            className="toy-number"
            type="number"
            inputMode="numeric"
            min={0}
            max={MAX_INIT}
            step={1}
            value={initText}
            aria-invalid={parse(initText, 0, MAX_INIT) === null}
            onChange={(e) => {
              setInit(e.target.value)
              const b = parse(e.target.value, 0, MAX_INIT)
              if (b === null) setStatus(`Init's balance here is a whole number from 0 to ${MAX_INIT}.`)
              else {
                setInitBal(b)
                reset(b, 'A new start.')
              }
            }}
          />
        </label>
        <label className="toy-field">
          <span className="toy-field-name">Amount n</span>
          <input className="toy-number" type="number" inputMode="numeric" min={1} max={9} step={1} value={nText} aria-invalid={n === null} onChange={(e) => setN(e.target.value)} />
        </label>
        <div className="toy-actions" role="group" aria-label="Commands">
          {OPS.map((op) => (
            <button key={op} type="button" className="toy-button" data-primary="true" onClick={() => doOp(op)}>
              {op}({n ?? 'n'})
            </button>
          ))}
        </div>
      </div>
      <div className="toy-actions">
        <button type="button" className="toy-button" onClick={undo} disabled={steps.length === 0}>
          Undo
        </button>
        <button type="button" className="toy-button" onClick={() => reset(initBal, 'Started again.')} disabled={steps.length === 0 && !shown}>
          Start again
        </button>
        <button type="button" className="toy-button" onClick={showMe}>
          Show me
        </button>
      </div>

      <p className="toy-status" aria-live="polite">
        {status}
      </p>

      <div className="cr-map">
        <svg className="toy-svg cr-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
          <g className="cr-axis">
            {cols.map((b) => (
              <text key={`x${b}`} x={x(b)} y={TOP + ROWS * CELL + 16} textAnchor="middle">
                {num(b)}
              </text>
            ))}
            {rows.map((h) => (
              <text key={`y${h}`} x={LEFT - 8} y={y(h) + 4} textAnchor="end">
                {h}
              </text>
            ))}
            <text className="cr-axis-name" x={LEFT + (COLS * CELL) / 2} y={TOP + ROWS * CELL + 36} textAnchor="middle">
              bal
            </text>
            <text className="cr-axis-name" x={LEFT - 8} y={TOP - 10} textAnchor="end">
              held
            </text>
          </g>
          <rect className="cr-frame" x={LEFT} y={TOP} width={COLS * CELL} height={ROWS * CELL} />
          <line className="cr-rule" x1={zeroX} x2={zeroX} y1={TOP} y2={TOP + ROWS * CELL} />
          <text className="cr-note" x={zeroX - 6} y={TOP - 10} textAnchor="end">
            bal &lt; 0
          </text>
          <line className="cr-rule" x1={diag.x1} y1={diag.y1} x2={diag.x2} y2={diag.y2} />
          <text className="cr-note" x={x(1.5)} y={y(6) + 4} textAnchor="middle">
            held &gt; bal
          </text>
          <g className="cr-grid">
            {cols.flatMap((b) => rows.map((h) => <circle key={`g${b},${h}`} cx={x(b)} cy={y(h)} r={1.4} />))}
          </g>
          {shown ? (
            <g className="cr-reached">
              {inside.map((s) =>
                inv(s) ? (
                  <circle key={`r${k(s)}`} cx={x(s.bal)} cy={y(s.held)} r={3} />
                ) : (
                  <rect key={`r${k(s)}`} className="cr-reached-broken" x={x(s.bal) - 3.5} y={y(s.held) - 3.5} width={7} height={7} />
                ),
              )}
            </g>
          ) : null}
          <g aria-hidden="true">
            <line className="line-assumed" x1={x(STEP_CTI.bal)} y1={y(STEP_CTI.held)} x2={x(-1) + 7} y2={y(0) - 7} />
            <rect className="cr-cti" x={x(STEP_CTI.bal) - 8} y={y(STEP_CTI.held) - 8} width={16} height={16} />
            <text className="cr-note" x={x(STEP_CTI.bal) - 12} y={y(STEP_CTI.held) - 12} textAnchor="end">
              CTI
            </text>
          </g>
          {path.length > 1 ? <polyline className="cr-path" points={path.map((s) => `${x(s.bal)},${y(s.held)}`).join(' ')} /> : null}
          {path.map((s, i) => (
            <Dot key={`p${i}:${k(s)}`} s={s} fresh={i === path.length - 1 && i > 0} />
          ))}
          <circle key={`h${k(here)}`} className="cr-here" cx={x(here.bal)} cy={y(here.held)} r={11} />
        </svg>

        <ul className="toy-legend" aria-label="Key">
          <li>
            <svg className="toy-key" width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">
              <circle className="cr-visit" r={5} />
            </svg>
            a state on your run
          </li>
          <li>
            <svg className="toy-key" width="16" height="16" viewBox="-8 -8 16 16" aria-hidden="true">
              <rect className="line-violation cr-broken" x={-7} y={-7} width={14} height={14} />
            </svg>
            Inv broken: bal below zero
          </li>
          <li>
            <svg className="toy-key" width="18" height="18" viewBox="-9 -9 18 18" aria-hidden="true">
              <rect className="cr-cti" x={-8} y={-8} width={16} height={16} />
            </svg>
            the step query&apos;s pre-state, bal 0, held 1
          </li>
          <li>
            <svg className="toy-key" width="28" height="10" viewBox="0 -5 28 10" aria-hidden="true">
              <line className="line-assumed" x1={0} y1={0} x2={28} y2={0} />
            </svg>
            its Capture(1): a step from an assumed state
          </li>
          {shown ? (
            <li>
              <svg className="toy-key" width="10" height="10" viewBox="-5 -5 10 10" aria-hidden="true">
                <circle className="cr-reached-key" r={3} />
              </svg>
              reached within {BOUND} steps, Inv holding
            </li>
          ) : null}
          {shown && insideBroken > 0 ? (
            <li>
              <svg className="toy-key" width="10" height="10" viewBox="-5 -5 10 10" aria-hidden="true">
                <rect className="cr-reached-broken" x={-3.5} y={-3.5} width={7} height={7} />
              </svg>
              reached within {BOUND} steps, Inv broken
            </li>
          ) : null}
        </ul>

        {steps.length > 0 ? (
          <ol className="cr-run" aria-label="Your run from Init">
            <li>
              Init: {st(init)}
            </li>
            {steps.map((s, i) => (
              <li key={i}>
                {s.op}({s.n}): {st(path[i + 1] as State)}
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </ToyFrame>
  )
}
