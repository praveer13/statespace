// An explorer for S10.L6, "Witness, then decide": the agent's hold-capture commands on a grid of states, balance up
// the side and held funds across. The learner picks a pre-state and a step; the page says whether the step leaves the
// invariant, and if it does, whether any run from Init reaches that pre-state within the bound N. So a counterexample
// to induction and a real bug can be told apart by hand. The guard of Hold can be switched to the lesson's twin, and
// the invariant to the strengthened one. Everything is computed here, over this grid only.

import { useId, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ToyFrame } from '../ToyFrame.tsx'
import { BAL_MAX, BAL_MIN, COMMANDS, HELD_MAX, N, N_MAX, ctis, firstCti, gridStates, holds, inGrid, key, overdrawn, runTo, sayMove, search, shortestOverdraft, step } from './model.ts'
import type { Command, Guard, Inv, Move, State } from './model.ts'
import './cti.css'

const CELL = 28
const LEFT = 40
const TOP = 10
const COLS = HELD_MAX + 1
const ROWS = BAL_MAX - BAL_MIN + 1
const W = LEFT + COLS * CELL + 10
const H = TOP + ROWS * CELL + 42

const cx = (held: number): number => LEFT + held * CELL + CELL / 2
const cy = (bal: number): number => TOP + (BAL_MAX - bal) * CELL + CELL / 2

const num = (n: number): string => (n < 0 ? `−${-n}` : String(n))
const st = (s: State): string => `bal ${num(s.bal)}, held ${s.held}`
const invText = (inv: Inv): string => (inv === 'weak' ? 'bal >= 0' : '0 <= held <= bal')
const sayRun = (run: readonly Move[]): string => run.map((m) => `${sayMove(m)} to ${st(m.to)}`).join(', then ')

function parse(text: string, lo: number, hi: number): number | null {
  if (!/^\s*-?\d{1,2}\s*$/.test(text)) return null
  const n = Number(text)
  return n >= lo && n <= hi ? n : null
}

/** The edges of the invariant's region on the grid, as line segments, for an outline that needs no fill. */
function outline(inv: Inv): string {
  const inside = (bal: number, held: number): boolean => bal >= BAL_MIN && bal <= BAL_MAX && held >= 0 && held <= HELD_MAX && holds(inv, { bal, held })
  const d: string[] = []
  for (const s of gridStates()) {
    if (!inside(s.bal, s.held)) continue
    const x0 = cx(s.held) - CELL / 2
    const y0 = cy(s.bal) - CELL / 2
    if (!inside(s.bal + 1, s.held)) d.push(`M${x0} ${y0}h${CELL}`)
    if (!inside(s.bal - 1, s.held)) d.push(`M${x0} ${y0 + CELL}h${CELL}`)
    if (!inside(s.bal, s.held - 1)) d.push(`M${x0} ${y0}v${CELL}`)
    if (!inside(s.bal, s.held + 1)) d.push(`M${x0 + CELL} ${y0}v${CELL}`)
  }
  return d.join('')
}

interface Taken {
  readonly move: Move
  readonly leaves: boolean
  readonly n: number
}

function Arrow({ m, bad, id }: { readonly m: Move; readonly bad: boolean; readonly id: string }) {
  const x1 = cx(m.from.held)
  const y1 = cy(m.from.bal)
  const x2 = cx(m.to.held)
  const y2 = cy(m.to.bal)
  const len = Math.hypot(x2 - x1, y2 - y1) || 1
  const k = (len - 9) / len
  return (
    <line
      className={bad ? 'line-violation cti-arrow' : 'cti-arrow cti-arrow-ok'}
      x1={x1}
      y1={y1}
      x2={x1 + (x2 - x1) * k}
      y2={y1 + (y2 - y1) * k}
      markerEnd={`url(#${id}-${bad ? 'bad' : 'ok'})`}
    />
  )
}

export default function CtiExplorer() {
  const uid = useId().replace(/[^a-zA-Z0-9-]/g, '')
  const [guard, setGuard] = useState<Guard>('proposed')
  const [inv, setInv] = useState<Inv>('weak')
  const [balText, setBal] = useState('1')
  const [heldText, setHeld] = useState('2')
  const [cmd, setCmd] = useState<Command>('Capture')
  const [nText, setN] = useState('2')
  const [taken, setTaken] = useState<Taken | null>(null)
  const [run, setRun] = useState<readonly Move[] | null>(null)
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(new Set())
  const [status, setStatus] = useState<ReactNode>('Pick a pre-state and a step, then take it. Or click a square of the grid to pick the state.')

  const sr = useMemo(() => search(guard), [guard])
  const allCti = useMemo(() => ctis(guard, inv), [guard, inv])
  const ctiFrom = useMemo(() => new Set(allCti.map((m) => key(m.from))), [allCti])
  const path = useMemo(() => outline(inv), [inv])
  const open = revealed.has(`${guard}:${inv}`)

  const bal = parse(balText, BAL_MIN, BAL_MAX)
  const held = parse(heldText, 0, HELD_MAX)
  const n = parse(nText, 1, N_MAX)
  const pre: State | null = bal !== null && held !== null ? { bal, held } : null

  const reset = (): void => {
    setTaken(null)
    setRun(null)
  }

  const judgeCti = (m: Move): ReactNode => {
    const reach = runTo(sr, m.from)
    const tail = overdrawn(m.to) ? ', where the balance is negative' : ''
    if (reach === null)
      return (
        <>
          <strong>A counterexample to induction.</strong> {st(m.from)} meets <code>{invText(inv)}</code>, and {sayMove(m)} takes it
          to {st(m.to)}, outside it{tail}. Is the pre-state reachable? The search from Init finds no run to it within N = {N}{' '}
          steps on this grid. That is a bound, and within it nothing says the command is wrong.{' '}
          {inv === 'weak' ? 'The invariant forgot a fact: strengthen it, and check again.' : 'Strengthen the invariant again, or look at the command.'}
        </>
      )
    return (
      <>
        <strong>A real run.</strong> {st(m.from)} meets <code>{invText(inv)}</code>, and {sayMove(m)} takes it to {st(m.to)}
        {tail}. The search from Init reaches that pre-state in {reach.length} {reach.length === 1 ? 'step' : 'steps'}
        {reach.length > 0 ? `: ${sayRun(reach)}` : ', since it is an Init state'}.{' '}
        {overdrawn(m.to)
          ? 'A run from Init overdraws, so the command needs a fix.'
          : 'A run from Init leaves the invariant, so no strengthening rescues it: this guard lets held outgrow bal, and Show me finds the run that then overdraws.'}
      </>
    )
  }

  const take = (): void => {
    if (pre === null || n === null) {
      setStatus(`Balances here run from ${num(BAL_MIN)} to ${BAL_MAX}, held funds from 0 to ${HELD_MAX}, and n from 1 to ${N_MAX}.`)
      return
    }
    setRun(null)
    const r = step(guard, cmd, n, pre)
    if (!r.ok) {
      setTaken(null)
      setStatus(
        <>
          <strong>Refused.</strong> {r.why}, so {sayMove({ c: cmd, n })} does not run from {st(pre)}. Nothing moves.
        </>,
      )
      return
    }
    const m: Move = { c: cmd, n, from: pre, to: r.to }
    if (!inGrid(r.to)) {
      setTaken(null)
      setStatus(`${sayMove(m)} takes ${st(pre)} to ${st(r.to)}, off the grid this page draws and searches.`)
      return
    }
    const leaves = !holds(inv, r.to)
    setTaken((t) => ({ move: m, leaves, n: (t?.n ?? 0) + 1 }))
    if (!holds(inv, pre)) {
      setStatus(
        <>
          <strong>Not a counterexample.</strong> {st(pre)} does not meet <code>{invText(inv)}</code>, so a step from it says nothing
          about the inductive step. Pick a state inside the ruled outline.
        </>,
      )
      return
    }
    if (!leaves) {
      setStatus(
        <>
          <strong>Stays inside.</strong> {sayMove(m)} takes {st(pre)} to {st(r.to)}, which still meets <code>{invText(inv)}</code>.
        </>,
      )
      return
    }
    setStatus(judgeCti(m))
  }

  const showMe = (): void => {
    setRevealed((s) => new Set(s).add(`${guard}:${inv}`))
    const bad = shortestOverdraft(guard)
    if (bad !== null) {
      const last = bad[bad.length - 1]
      if (last !== undefined) {
        setBal(String(last.from.bal))
        setHeld(String(last.from.held))
        setCmd(last.c)
        setN(String(last.n))
      }
      setTaken(null)
      setRun(bad)
      setStatus(
        <>
          <strong>A real run.</strong> The search from Init finds a run of {bad.length} steps that overdraws:{' '}
          {bad[0] !== undefined ? `from ${st(bad[0].from)}, ` : ''}
          {sayRun(bad)}. The guard <code>n &lt;= bal</code> lets holds add up past the balance. The same shape of counterexample
          now calls for a fix to the command.
        </>,
      )
      return
    }
    setRun(null)
    const f = firstCti(guard, inv)
    if (f === null) {
      setTaken(null)
      setStatus(
        <>
          <strong>No counterexample on this grid.</strong> No step from inside <code>{invText(inv)}</code> leaves it, for any state
          drawn here and n from 1 to {N_MAX}. Init sits inside it, and inside it <code>bal &gt;= 0</code>. This page enumerated
          only this grid, which says nothing about states beyond it; the lesson&apos;s third check asks the same question of every
          integer.
        </>,
      )
      return
    }
    setBal(String(f.from.bal))
    setHeld(String(f.from.held))
    setCmd(f.c)
    setN(String(f.n))
    setTaken((t) => ({ move: f, leaves: true, n: (t?.n ?? 0) + 1 }))
    setStatus(
      <>
        <strong>Here is one:</strong> {st(f.from)}, then {sayMove(f)}, to {st(f.to)}. The grid holds {allCti.length} steps like it,
        from the empty squares, and every one starts with held above bal. The search from Init, to N = {N}, reaches none of
        those pre-states: every state it reaches has <code>0 &lt;= held &lt;= bal</code>. Keep the command, and strengthen the
        invariant.
      </>,
    )
  }

  const pickCell = (s: State): void => {
    setBal(String(s.bal))
    setHeld(String(s.held))
    setTaken(null)
    setRun(null)
    const d = sr.depth.get(key(s))
    setStatus(
      `Pre-state ${st(s)}: it ${holds(inv, s) ? 'meets' : 'does not meet'} ${invText(inv)}, and the search from Init ${
        d === undefined ? `does not reach it within N = ${N}` : `reaches it in ${d} ${d === 1 ? 'step' : 'steps'}`
      }. Now choose a step.`,
    )
  }

  const reached = gridStates().filter((s) => sr.depth.has(key(s)))
  const label =
    `Grid of states, balance from ${BAL_MAX} down to ${num(BAL_MIN)} and held funds from 0 to ${HELD_MAX}, with the region of ` +
    `${invText(inv)} outlined, under ${guard === 'proposed' ? "the agent's guard for Hold, n <= bal - held" : "the twin's guard for Hold, n <= bal"}. ` +
    (open
      ? `Shown: ${reached.length} states reached from Init within ${N} steps, and ${ctiFrom.size} pre-states with a step that leaves the invariant, ${[...ctiFrom].filter((k) => sr.depth.has(k)).length} of them reached. `
      : '') +
    (pre !== null ? `Your pre-state is ${st(pre)}. ` : '') +
    (taken !== null ? `Last step: ${sayMove(taken.move)} to ${st(taken.move.to)}, ${taken.leaves ? 'outside' : 'inside'} the invariant.` : '') +
    (run !== null ? `Shown run: ${sayRun(run)}.` : '')

  const balTicks = Array.from({ length: ROWS }, (_, i) => BAL_MAX - i)
  const heldTicks = Array.from({ length: COLS }, (_, i) => i)

  return (
    <ToyFrame
      title="Counterexample to induction, or a bug?"
      caption={
        <>
          Balances run from {num(BAL_MIN)} to {BAL_MAX}, held funds from 0 to {HELD_MAX} and amounts from 1 to {N_MAX}. The page takes
          each step, lists every step that leaves the invariant, and searches from Init to N = {N} itself, over this grid only; no
          solver runs here, and the grid says nothing about states beyond it.
        </>
      }
    >
      <p className="toy-goal">
        Goal: find a state that meets the invariant and a step that takes it out, then ask whether any run from Init gets there.
      </p>

      <div className="cti-switches">
        <fieldset className="toy-choice">
          <legend>The guard of Hold</legend>
          <label>
            <input
              type="radio"
              name={`${uid}-guard`}
              checked={guard === 'proposed'}
              onChange={() => {
                setGuard('proposed')
                reset()
              }}
            />
            <span>
              As the agent wrote it: <code>n &lt;= bal - held</code>
            </span>
          </label>
          <label>
            <input
              type="radio"
              name={`${uid}-guard`}
              checked={guard === 'twin'}
              onChange={() => {
                setGuard('twin')
                reset()
              }}
            />
            <span>
              The twin: <code>n &lt;= bal</code>
            </span>
          </label>
        </fieldset>
        <fieldset className="toy-choice">
          <legend>The invariant</legend>
          <label>
            <input
              type="radio"
              name={`${uid}-inv`}
              checked={inv === 'weak'}
              onChange={() => {
                setInv('weak')
                reset()
              }}
            />
            <span>
              Yours: <code>bal &gt;= 0</code>
            </span>
          </label>
          <label>
            <input
              type="radio"
              name={`${uid}-inv`}
              checked={inv === 'strong'}
              onChange={() => {
                setInv('strong')
                reset()
              }}
            />
            <span>
              Strengthened: <code>0 &lt;= held &lt;= bal</code>
            </span>
          </label>
        </fieldset>
      </div>

      <form
        className="toy-controls"
        onSubmit={(e) => {
          e.preventDefault()
          take()
        }}
      >
        <label className="toy-field">
          <span className="toy-field-name">bal</span>
          <input className="toy-number" type="number" inputMode="numeric" min={BAL_MIN} max={BAL_MAX} step={1} value={balText} aria-invalid={bal === null} onChange={(e) => setBal(e.target.value)} />
        </label>
        <label className="toy-field">
          <span className="toy-field-name">held</span>
          <input className="toy-number" type="number" inputMode="numeric" min={0} max={HELD_MAX} step={1} value={heldText} aria-invalid={held === null} onChange={(e) => setHeld(e.target.value)} />
        </label>
        <label className="toy-field">
          <span className="toy-field-name">Step</span>
          <select className="toy-number cti-select" value={cmd} onChange={(e) => setCmd(e.target.value as Command)}>
            {COMMANDS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="toy-field">
          <span className="toy-field-name">n</span>
          <input className="toy-number" type="number" inputMode="numeric" min={1} max={N_MAX} step={1} value={nText} aria-invalid={n === null} onChange={(e) => setN(e.target.value)} />
        </label>
        <div className="toy-actions">
          <button type="submit" className="toy-button" data-primary="true">
            Take this step
          </button>
          <button type="button" className="toy-button" onClick={showMe}>
            Show me
          </button>
        </div>
      </form>

      <p className="toy-status" aria-live="polite">
        {status}
      </p>

      <div className="cti-map">
        <svg className="toy-svg cti-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
          <defs>
            <marker id={`${uid}-ok`} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path className="cti-head-ok" d="M0 0L10 5L0 10z" />
            </marker>
            <marker id={`${uid}-bad`} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
              <path className="line-violation cti-head-bad" d="M0 0L10 5L0 10z" />
            </marker>
          </defs>
          <g className="cti-axis">
            {heldTicks.map((i) => (
              <text key={`x${i}`} x={cx(i)} y={TOP + ROWS * CELL + 15} textAnchor="middle">
                {i}
              </text>
            ))}
            {balTicks.map((b) => (
              <text key={`y${b}`} x={LEFT - 8} y={cy(b) + 4} textAnchor="end">
                {num(b)}
              </text>
            ))}
            <text className="cti-axis-name" x={LEFT + (COLS * CELL) / 2} y={TOP + ROWS * CELL + 35} textAnchor="middle">
              held
            </text>
            <text className="cti-axis-name" x={10} y={TOP + (ROWS * CELL) / 2} textAnchor="middle" transform={`rotate(-90 10 ${TOP + (ROWS * CELL) / 2})`}>
              bal
            </text>
          </g>
          <rect className="cti-frame" x={LEFT} y={TOP} width={COLS * CELL} height={ROWS * CELL} />
          <line className="cti-zero" x1={LEFT} x2={LEFT + COLS * CELL} y1={cy(0) + CELL / 2} y2={cy(0) + CELL / 2} />
          <path className="cti-inv" d={path} />
          <g>
            {gridStates().map((s) => {
              const k = key(s)
              const x = cx(s.held)
              const y = cy(s.bal)
              if (open && sr.depth.has(k) && overdrawn(s))
                return <rect key={k} className="line-violation cti-bad" x={x - 6} y={y - 6} width={12} height={12} />
              if (open && ctiFrom.has(k))
                return (
                  <g key={k}>
                    <rect className="cti-ctimark" x={x - 6} y={y - 6} width={12} height={12} />
                    {sr.depth.has(k) ? <circle className="cti-reached" cx={x} cy={y} r={2.5} /> : null}
                  </g>
                )
              if (open && sr.depth.has(k)) return <circle key={k} className="cti-reached" cx={x} cy={y} r={4} />
              return <circle key={k} className="cti-unknown" cx={x} cy={y} r={1.6} />
            })}
          </g>
          {run !== null ? (
            <g>
              {run.map((m, i) => (
                <Arrow key={`r${i}`} m={m} bad={i === run.length - 1} id={uid} />
              ))}
            </g>
          ) : null}
          {taken !== null ? (
            <g key={`t${taken.n}`}>
              <Arrow m={taken.move} bad={taken.leaves && holds(inv, taken.move.from)} id={uid} />
              {taken.leaves && holds(inv, taken.move.from) ? (
                <rect className="line-violation cti-post toy-land" x={cx(taken.move.to.held) - 6} y={cy(taken.move.to.bal) - 6} width={12} height={12} />
              ) : (
                <circle className="cti-postok toy-land" cx={cx(taken.move.to.held)} cy={cy(taken.move.to.bal)} r={5} />
              )}
            </g>
          ) : null}
          {pre !== null ? <circle className="cti-here" cx={cx(pre.held)} cy={cy(pre.bal)} r={10} /> : null}
          <g className="cti-hit" aria-hidden="true">
            {gridStates().map((s) => (
              <rect key={`c${key(s)}`} x={cx(s.held) - CELL / 2} y={cy(s.bal) - CELL / 2} width={CELL} height={CELL} onClick={() => pickCell(s)} />
            ))}
          </g>
        </svg>
        <ul className="toy-legend cti-legend" aria-label="Key">
          <li>
            <svg className="toy-key" width="22" height="14" viewBox="0 0 22 14" aria-hidden="true">
              <path className="cti-inv" d="M1 13V1h20" />
            </svg>
            the invariant&apos;s region, <code>{invText(inv)}</code>
          </li>
          <li>
            <svg className="toy-key" width="22" height="14" viewBox="0 0 22 14" aria-hidden="true">
              <line className="cti-zero" x1={1} x2={21} y1={7} y2={7} />
            </svg>
            the line below which bal is negative
          </li>
          <li>
            <svg className="toy-key" width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">
              <circle className="cti-reached" r={4} />
            </svg>
            reached from Init within {N} steps
          </li>
          <li>
            <svg className="toy-key" width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">
              <rect className="cti-ctimark" x={-6} y={-6} width={12} height={12} />
            </svg>
            a step from here leaves the invariant, and no run reaches here
          </li>
          <li>
            <svg className="toy-key" width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">
              <rect className="cti-ctimark" x={-6} y={-6} width={12} height={12} />
              <circle className="cti-reached" r={2.5} />
            </svg>
            a step from here leaves the invariant, and a run reaches here
          </li>
          <li>
            <svg className="toy-key" width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">
              <rect className="line-violation cti-bad" x={-6} y={-6} width={12} height={12} />
            </svg>
            outside the invariant after the step, or overdrawn by a run
          </li>
          <li>
            <svg className="toy-key" width="22" height="22" viewBox="-11 -11 22 22" aria-hidden="true">
              <circle className="cti-here" r={9} />
            </svg>
            your pre-state
          </li>
        </ul>
        {open ? null : <p className="cti-note">Show me also draws what the search from Init reaches, and every pre-state with a step that leaves the invariant.</p>}
      </div>
    </ToyFrame>
  )
}
