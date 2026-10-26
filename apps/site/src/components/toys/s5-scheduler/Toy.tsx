// A game for S5.L3, "Be the scheduler": the learner chooses which worker moves next in the Theater's own spec
// (DoubleSpend: 100 in the account, an amount of 80, two workers) and tries to pay out more than the account holds.
// The page builds the spec's whole state graph itself, breadth first, and draws where the learner's behavior has gone.
// "Show me" plays the first violation the search meets and lays out every complete schedule, so the bug reads as a
// class of schedules, not one trace. The grain can be switched to the lesson's atomic repair, and the constants to the
// exit question's three workers and 40.

import { useId, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ToyFrame } from '../ToyFrame.tsx'
import { CONFIGS, enabled, explore, firstViolation, key, long, schedules, short, staleWrite, step, violated, initial } from './model.ts'
import type { Action, Config, Grain, Node, State } from './model.ts'
import './scheduler.css'

const W = 480
const PAD_X = 22
const PAD_Y = 18

interface Placed {
  readonly x: number
  readonly y: number
}

/** Columns by depth, rows in the order breadth-first search found them, centred in the column. */
function layout(nodes: readonly Node[], h: number): Map<string, Placed> {
  const depths = Math.max(...nodes.map((n) => n.depth))
  const colW = (W - PAD_X * 2) / Math.max(1, depths)
  const out = new Map<string, Placed>()
  const byDepth = new Map<number, Node[]>()
  for (const n of nodes) byDepth.set(n.depth, [...(byDepth.get(n.depth) ?? []), n])
  const most = Math.max(...[...byDepth.values()].map((l) => l.length))
  const gap = Math.min(40, (h - PAD_Y * 2) / Math.max(1, most - 1))
  for (const [d, layer] of byDepth) {
    const top = h / 2 - (gap * (layer.length - 1)) / 2
    layer.forEach((n, i) => out.set(n.id, { x: PAD_X + d * colW, y: top + i * gap }))
  }
  return out
}

const workerName = (w: number): string => `worker ${w + 1}`

function sayStep(c: Config, before: State, a: Action, after: State): ReactNode {
  const who = workerName(a.w)
  switch (a.kind) {
    case 'Read':
      return after.pc[a.w] === 'write' ? (
        <>
          <code>{long(a)}</code>: {who} copies {before.bal} into <code>seen</code> and passes the guard, {before.bal} &ge; {c.amount}.
        </>
      ) : (
        <>
          <code>{long(a)}</code>: {who} copies {before.bal}, which is below {c.amount}, so it stops without writing.
        </>
      )
    case 'Write':
      return (
        <>
          <code>{long(a)}</code>: {who} sets <code>bal</code> to its copy minus {c.amount}, {before.seen[a.w]} &minus; {c.amount} ={' '}
          {after.bal}, and <code>spent</code> becomes {after.spent}.
          {staleWrite(before, a) ? <> Its copy was stale: the balance was {before.bal} when it wrote.</> : null}
        </>
      )
    case 'Spend':
      return after.spent > before.spent ? (
        <>
          <code>{long(a)}</code>: {who} tests {before.bal} &ge; {c.amount} and writes {after.bal} in the same step; <code>spent</code> becomes{' '}
          {after.spent}.
        </>
      ) : (
        <>
          <code>{long(a)}</code>: {who} tests {before.bal} &ge; {c.amount}, which fails, so it stops without writing.
        </>
      )
  }
}

function sayWhere(c: Config, g: Grain, s: State, total: number): ReactNode {
  if (violated(c, s))
    return (
      <>
        {' '}
        <strong>
          <code>NoOverspend</code> fails: {s.spent} paid out of {c.init}.
        </strong>{' '}
        The guard ran before every write, but it tested a copy.
      </>
    )
  if (enabled(s).length === 0)
    return g === 'atomic' ? (
      <>
        {' '}
        <strong>Every worker is done, with {s.spent} paid out of {c.init}.</strong> No order of <code>Spend</code> steps overpays here: none of the
        atomic spec&apos;s {total} states breaks <code>NoOverspend</code>.
      </>
    ) : (
      <>
        {' '}
        <strong>Every worker is done, with {s.spent} paid out of {c.init}.</strong> This schedule stays within the account. Start over and try another
        order.
      </>
    )
  return null
}

export default function SchedulerGame() {
  const uid = useId().replace(/[^a-zA-Z0-9-]/g, '')
  const [cfgId, setCfgId] = useState('w2')
  const [grain, setGrain] = useState<Grain>('split')
  const [path, setPath] = useState<readonly Action[]>([])
  const [shown, setShown] = useState(false)
  const [status, setStatus] = useState<ReactNode>('Both workers are at the start. Choose which one moves first.')

  const cfg = CONFIGS.find((c) => c.id === cfgId) ?? CONFIGS[0]!
  const graph = useMemo(() => explore(cfg, grain), [cfg, grain])
  const all = useMemo(() => schedules(cfg, grain), [cfg, grain])
  const h = cfg.workers === 2 ? 200 : 300
  const pos = useMemo(() => layout(graph.nodes, h), [graph, h])

  const states = useMemo(() => {
    const out = [initial(cfg, grain)]
    for (const a of path) out.push(step(cfg, out[out.length - 1]!, a))
    return out
  }, [cfg, grain, path])
  const now = states[states.length - 1]!
  const choices = enabled(now)
  const bad = violated(cfg, now)
  const over = all.filter((s) => s.violates).length

  const reset = (c: Config, msg?: string): void => {
    setPath([])
    setShown(false)
    setStatus(msg ?? `Start over: ${c.init} in the account, nothing spent. Choose which worker moves first.`)
  }

  const take = (a: Action): void => {
    const after = step(cfg, now, a)
    const next = [...path, a]
    setPath(next)
    setStatus(
      <>
        Step {next.length}. {sayStep(cfg, now, a, after)}
        {sayWhere(cfg, grain, after, graph.nodes.length)}
      </>,
    )
  }

  const undo = (): void => {
    if (path.length === 0) return
    const next = path.slice(0, -1)
    setPath(next)
    setStatus(next.length === 0 ? 'Back at the start.' : `Undone. Back after step ${next.length}, ${long(next[next.length - 1]!)}.`)
  }

  const showMe = (): void => {
    const w = firstViolation(cfg, grain)
    setShown(true)
    if (w === null) {
      setPath([])
      setStatus(
        <>
          <strong>No schedule overpays in this spec.</strong> All {all.length} complete schedules stay within {cfg.init}: each{' '}
          <code>Spend</code> tests and writes in one step, so no copy can go stale. The page checked only this spec&apos;s {graph.nodes.length}{' '}
          states, for these constants.
        </>,
      )
      return
    }
    setPath(w)
    const end = w.reduce((s, a) => step(cfg, s, a), initial(cfg, grain))
    setStatus(
      <>
        <strong>Here is one: {w.map(short).join(', ')}</strong>, the first violation the page&apos;s breadth-first search meets, {w.length} actions,
        ending with {end.spent} paid out of {cfg.init}.{' '}
        {cfg.workers === 2 ? (
          <>
            It is the same trace as the counterexample in the recorded TLC run above. The whole class is below: {over} of the {all.length} complete schedules overpay, and they are exactly
            the ones that put both reads before both writes.
          </>
        ) : (
          <>
            {over} of the {all.length} complete schedules overpay. The {all.length - over} that do not are the one-at-a-time orders, where no
            worker moves between another&apos;s read and its write.
          </>
        )}
      </>,
    )
  }

  // The path through the graph, and the states the learner has visited.
  const pts = states.map((s) => pos.get(key(s))).filter((p): p is Placed => p !== undefined)
  const here = pos.get(key(now))
  const label =
    `State graph of the ${grain === 'split' ? 'read-then-write' : 'atomic'} spec with ${cfg.workers} workers, ${cfg.init} in the account and an ` +
    `amount of ${cfg.amount}: ${graph.nodes.length} reachable states in columns by depth, ${graph.layers.join(', ')}. ` +
    `${graph.nodes.filter((n) => violated(cfg, n.state)).length} of them break NoOverspend. ` +
    (path.length === 0 ? 'You are at the start state.' : `Your behavior so far: ${path.map(short).join(', ')}, at depth ${path.length}.`)

  return (
    <ToyFrame
      title="You are the scheduler"
      kind="Game"
      caption={
        <>
          The page builds this spec&apos;s whole state graph itself, breadth first, for the constants shown, and replays the steps you choose. It
          covers only that one model; no TLC runs here. The recorded run in the Theater above is the course&apos;s evidence.
        </>
      }
    >
      <p className="toy-goal">Goal: choose the order of the workers&apos; steps so that more is paid out than the account holds.</p>

      <div className="sc-settings">
        <fieldset className="toy-choice">
          <legend>The spec</legend>
          <label>
            <input
              type="radio"
              name={`${uid}-grain`}
              checked={grain === 'split'}
              onChange={() => {
                setGrain('split')
                reset(cfg, 'Read and write are separate steps again. Choose which worker moves first.')
              }}
            />
            <span>
              <code>Read</code> then <code>Write</code>, as in the Theater
            </span>
          </label>
          <label>
            <input
              type="radio"
              name={`${uid}-grain`}
              checked={grain === 'atomic'}
              onChange={() => {
                setGrain('atomic')
                reset(cfg, 'The guard and the write are now one action, Spend. Choose which worker moves first.')
              }}
            />
            <span>
              One atomic <code>Spend</code>, the repair
            </span>
          </label>
        </fieldset>
        <fieldset className="toy-choice">
          <legend>The constants</legend>
          {CONFIGS.map((c) => (
            <label key={c.id}>
              <input
                type="radio"
                name={`${uid}-cfg`}
                checked={cfgId === c.id}
                onChange={() => {
                  setCfgId(c.id)
                  reset(c, `${c.workers === 2 ? 'Two' : 'Three'} workers, ${c.init} in the account, an amount of ${c.amount}. Choose which worker moves first.`)
                }}
              />
              <span>
                {c.workers === 2 ? 'Two' : 'Three'} workers, <code>Init</code> {c.init}, <code>Amount</code> {c.amount}
              </span>
            </label>
          ))}
        </fieldset>
      </div>

      <div className="sc-bar" role="group" aria-label="Enabled actions: choose the next step">
        <span className="toy-field-name">Enabled now</span>
        <div className="toy-actions">
          {choices.length === 0 ? (
            <span className="sc-none">Nothing is enabled: the behavior stutters from here on.</span>
          ) : (
            choices.map((a) => (
              <button key={long(a)} type="button" className="toy-button sc-step" data-primary="true" onClick={() => take(a)}>
                <code>{long(a)}</code>
              </button>
            ))
          )}
        </div>
        <div className="toy-actions">
          <button type="button" className="toy-button" onClick={undo} disabled={path.length === 0}>
            Undo
          </button>
          <button type="button" className="toy-button" onClick={() => reset(cfg)} disabled={path.length === 0 && !shown}>
            Start over
          </button>
          <button type="button" className="toy-button" onClick={showMe}>
            Show me
          </button>
        </div>
      </div>

      <p className="toy-status" aria-live="polite">
        {status}
      </p>

      <div className="sc-frame" tabIndex={0} role="region" aria-label="Trace table">
        <table className="sc-trace">
          <caption className="sc-cap">
            The behavior so far
          </caption>
          <thead>
            <tr>
              <th scope="col">Step</th>
              <th scope="col">
                <code>bal</code>
              </th>
              <th scope="col">
                <code>spent</code>
              </th>
              {now.pc.map((_, w) => (
                <th key={w} scope="col">
                  w{w + 1}: <code>seen</code>, <code>pc</code>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {states.map((s, i) => {
              const a = i === 0 ? undefined : path[i - 1]
              const v = violated(cfg, s)
              return (
                <tr key={i} data-bad={v ? 'true' : undefined}>
                  <th scope="row">
                    {a === undefined ? 'start' : `${i}. ${short(a)}`}
                    {a !== undefined && staleWrite(states[i - 1]!, a) ? <span className="sc-flag"> stale copy</span> : null}
                  </th>
                  <td>{s.bal}</td>
                  <td>
                    {s.spent}
                    {v ? <span className="sc-flag"> over</span> : null}
                  </td>
                  {s.pc.map((p, w) => (
                    <td key={w}>
                      {grain === 'split' ? `${s.seen[w]}, ` : ''}
                      {p}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="sc-graph">
        <svg className="toy-svg sc-svg" viewBox={`0 0 ${W} ${h}`} role="img" aria-label={label}>
          <g className="sc-edges">
            {graph.edges.map((e) => {
              const a = pos.get(e.from)
              const b = pos.get(e.to)
              return a && b ? <line key={`${e.from}>${e.to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} /> : null
            })}
          </g>
          {pts.length > 1 ? <polyline className="sc-casing" points={pts.map((p) => `${p.x},${p.y}`).join(' ')} /> : null}
          {pts.length > 1 ? (
            <polyline className={bad ? 'line-violation sc-path' : 'sc-path sc-path-ink'} points={pts.map((p) => `${p.x},${p.y}`).join(' ')} />
          ) : null}
          <g>
            {graph.nodes.map((n) => {
              const p = pos.get(n.id)!
              const r = cfg.workers === 2 ? 6 : 3.6
              if (violated(cfg, n.state)) return <rect key={n.id} className="line-violation sc-over" x={p.x - r} y={p.y - r} width={r * 2} height={r * 2} />
              if (enabled(n.state).length === 0) return <circle key={n.id} className="sc-done" cx={p.x} cy={p.y} r={r - 0.75} />
              return <circle key={n.id} className="sc-node" cx={p.x} cy={p.y} r={r} />
            })}
          </g>
          {here ? <circle key={`here-${key(now)}`} className="sc-here toy-land" cx={here.x} cy={here.y} r={cfg.workers === 2 ? 12 : 8} /> : null}
          {graph.layers.map((_, d) => {
            const x = PAD_X + (d * (W - PAD_X * 2)) / Math.max(1, graph.layers.length - 1)
            return (
              <text key={d} className="sc-depth" x={x} y={h - 2} textAnchor="middle">
                {d}
              </text>
            )
          })}
        </svg>
        <p className="sc-layers">
          Depth along the bottom. States per depth: {graph.layers.join(', ')}; {graph.nodes.length} in all.
        </p>
        <ul className="toy-legend" aria-label="Key">
          <li>
            <svg className="toy-key" width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">
              <circle className="sc-node" r={5} />
            </svg>
            a state
          </li>
          <li>
            <svg className="toy-key" width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">
              <circle className="sc-done" r={4.5} />
            </svg>
            finished, within the account
          </li>
          <li>
            <svg className="toy-key" width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">
              <rect className="line-violation sc-over" x={-5.5} y={-5.5} width={11} height={11} />
            </svg>
            <code>NoOverspend</code> broken
          </li>
          <li>
            <svg className="toy-key" width="22" height="22" viewBox="-11 -11 22 22" aria-hidden="true">
              <circle className="sc-here" r={9} />
            </svg>
            where you are
          </li>
        </ul>
      </div>

      {shown ? (
        cfg.workers === 2 || grain === 'atomic' ? (
          <div className="sc-frame">
            <table className="sc-trace sc-all">
              <caption className="sc-cap">Every complete schedule of this spec</caption>
              <thead>
                <tr>
                  <th scope="col">Order</th>
                  <th scope="col">Paid out</th>
                  <th scope="col">Within {cfg.init}?</th>
                </tr>
              </thead>
              <tbody>
                {all.map((s) => (
                  <tr key={s.actions.map(short).join()} data-bad={s.violates ? 'true' : undefined}>
                    <th scope="row">
                      <code>{s.actions.map(short).join(', ')}</code>
                    </th>
                    <td>{s.final.spent}</td>
                    <td>{s.violates ? 'no, overpays' : 'yes'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="sc-layers">
            The {all.length} complete schedules are too many to list here: {over} overpay, and the {all.length - over} that stay within {cfg.init} are
            the orders that run each worker&apos;s read and write back to back.
          </p>
        )
      ) : null}
    </ToyFrame>
  )
}
