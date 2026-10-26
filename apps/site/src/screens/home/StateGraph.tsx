// The cover figure of the start page: Boot's transfer as a state space you explore by hand. Choose the guard and a
// depth; the page explores breadth-first to that depth and draws what it reached. The triangle holds every state with
// no balance below zero; an overdraft lands outside it. The line language holds here too: the frontier, explored only
// this far, is the bounded (dotted) line, and the path to the first overdraft is the witnessed-violation line.

import { useId, useMemo, useState } from 'react'
import { MAX_DEPTH, START, explore, isOverdraft, key, label, lattice, pathTo, place, type Guard, type State } from './graph.ts'

const UNIT = 26

/** Every state either guard can reach, so the figure keeps one frame while you explore. */
function frame() {
  const all = new Map<string, State>()
  for (const g of ['as-written', 'fixed'] as const) for (const [k, s] of explore(g, MAX_DEPTH).states) all.set(k, s)
  for (const s of lattice()) all.set(key(s), s)
  const pts = [...all.values()].map((s) => place(s, UNIT, 0, 0))
  const xs = pts.map(([x]) => x)
  const ys = pts.map(([, y]) => y)
  const pad = 14
  return { minX: Math.min(...xs) - pad, minY: Math.min(...ys) - pad, w: Math.max(...xs) - Math.min(...xs) + pad * 2, h: Math.max(...ys) - Math.min(...ys) + pad * 2 }
}

/** Neighbouring lattice states: one unit moved between two accounts. */
function latticeEdges(): Array<[State, State]> {
  const out: Array<[State, State]> = []
  const states = lattice()
  const has = new Set(states.map(key))
  for (const s of states)
    for (const [src, dst] of [[0, 1], [0, 2], [1, 2]] as const) {
      const t = [...s] as [number, number, number]
      t[src] -= 1
      t[dst] += 1
      if (has.has(key(t))) out.push([s, t])
    }
  return out
}

function status(guard: Guard, k: number, reached: number, over: number, witness: State | null, witnessDepth: number, exhausted: boolean): string {
  if (k === 0) return 'Depth 0: the start state alone. Raise the depth to explore.'
  const head = `Depth ${k}: ${reached} ${reached === 1 ? 'state' : 'states'} reached`
  if (witness === null) {
    const tail = exhausted ? ' That is every state this small model can reach, and says nothing beyond it.' : ''
    return guard === 'fixed' && exhausted ? `${head}, none overdrawn.${tail}` : `${head}, none overdrawn so far.${tail}`
  }
  const steps = witnessDepth === 1 ? 'one transfer' : `${witnessDepth === 2 ? 'two' : witnessDepth === 3 ? 'three' : String(witnessDepth)} transfers`
  const more = exhausted ? ' Going deeper adds nothing.' : ''
  return `${head}; ${over} are overdrafts. First found: ${label(witness)}, ${steps} from the start.${more}`
}

export function StateGraph() {
  const uid = useId().replace(/[^a-zA-Z0-9-]/g, '')
  const [guard, setGuard] = useState<Guard>('as-written')
  const [k, setK] = useState(2)
  const box = useMemo(frame, [])
  const edges = useMemo(latticeEdges, [])
  const grid = useMemo(lattice, [])
  const e = useMemo(() => explore(guard, k), [guard, k])

  const at = (s: State) => place(s, UNIT, 0, 0)
  const reached = [...e.states.values()]
  const over = reached.filter(isOverdraft)
  const path = e.witness === null ? [] : pathTo(e, e.witness).map((id) => at(e.states.get(id)!))
  const witnessDepth = e.witness === null ? 0 : (e.depth.get(key(e.witness)) ?? 0)
  const [sx, sy] = at(START)
  const corner = (s: State) => at(s)
  const [ax, ay] = corner([6, 0, 0])
  const [bx, by] = corner([0, 6, 0])
  const [cx, cy] = corner([0, 0, 6])
  
  return (
    <figure className="graph" aria-labelledby={`${uid}-cap`}>
      <svg className="graph-svg" viewBox={`${box.minX} ${box.minY} ${box.w} ${box.h}`} role="img" aria-labelledby={`${uid}-status`}>
        <g className="graph-grid">
          {edges.map(([s, t]) => {
            const [x1, y1] = at(s)
            const [x2, y2] = at(t)
            return <line key={`${key(s)}-${key(t)}`} x1={x1} y1={y1} x2={x2} y2={y2} />
          })}
        </g>
        <path className="graph-edge" d={`M${ax} ${ay} L${bx} ${by} L${cx} ${cy} Z`} />
        <g className="graph-unreached">
          {grid
            .filter((s) => !e.depth.has(key(s)))
            .map((s) => {
              const [x, y] = at(s)
              return <circle key={key(s)} cx={x} cy={y} r={2.6} />
            })}
        </g>
        <g className="graph-over">
          {over.map((s) => {
            const [x, y] = at(s)
            return <rect key={key(s)} className="line-violation graph-dot" x={x - 3.5} y={y - 3.5} width={7} height={7} />
          })}
        </g>
        {path.length > 1 ? <polyline className="graph-casing" points={path.map(([x, y]) => `${x},${y}`).join(' ')} /> : null}
        {path.length > 1 ? <polyline className="line-violation graph-witness" points={path.map(([x, y]) => `${x},${y}`).join(' ')} /> : null}
        <g className="graph-reached">
          {reached
            .filter((s) => !isOverdraft(s))
            .map((s) => {
              const [x, y] = at(s)
              return <circle key={key(s)} className="graph-dot" cx={x} cy={y} r={4.2} />
            })}
        </g>
        <g>
          {reached
            .filter((s) => !isOverdraft(s) && e.depth.get(key(s)) === k && !e.exhausted)
            .map((s) => {
              const [x, y] = at(s)
              return <circle key={key(s)} className="line-bounded graph-frontier" cx={x} cy={y} r={9} />
            })}
        </g>
        <circle className="graph-start" cx={sx} cy={sy} r={9} />
        {e.witness !== null
          ? (() => {
              const [wx, wy] = at(e.witness)
              return (
                <text className="graph-label" x={wx + 10} y={wy + 4}>
                  {label(e.witness)}
                </text>
              )
            })()
          : null}
      </svg>

      <div className="graph-controls">
        <fieldset className="graph-guard">
          <legend>The guard</legend>
          <label>
            <input type="radio" name={`${uid}-guard`} value="as-written" checked={guard === 'as-written'} onChange={() => setGuard('as-written')} />
            <span>
              As the pull request wrote it: <code>amount ≤ dst.balance</code>
            </span>
          </label>
          <label>
            <input type="radio" name={`${uid}-guard`} value="fixed" checked={guard === 'fixed'} onChange={() => setGuard('fixed')} />
            <span>
              Fixed: <code>amount ≤ src.balance</code>
            </span>
          </label>
        </fieldset>
        <label className="graph-depth">
          <span className="graph-depth-name">
            Explore to depth <output htmlFor={`${uid}-k`}>{k}</output>
          </span>
          <input id={`${uid}-k`} type="range" min={0} max={MAX_DEPTH} step={1} value={k} onChange={(ev) => setK(Number(ev.target.value))} />
        </label>
        <p id={`${uid}-status`} className="graph-status" aria-live="polite">
          {status(guard, k, reached.length, over.length, e.witness, witnessDepth, e.exhausted)}
        </p>
      </div>
      <figcaption id={`${uid}-cap`} className="graph-cap">
        Three accounts share 6 and start at (2, 2, 2). One step moves 1, 2 or 3 from one account to another when the guard
        allows it. The triangle holds every state with no balance below zero; its corners, left, top and right, are a, b and c
        holding all 6. This page explores the steps itself; no solver runs here.
      </figcaption>
    </figure>
  )
}
