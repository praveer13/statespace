// A Spectacle run's live result (INS-spectacle, and live runs in INS-theater cells): the verdict in TLC's words,
// TLC's counts set beside the recorded TLC run when the figure shows one, the counterexample as a trace table, and
// the step graph the search explored, by depth. Everything renders through text and SVG elements built by React,
// never markup from the reply (ARCHITECTURE.md section 5.7). The recorded run above stays the course's evidence.

import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { RunReply } from '../../protocol.ts'
import { parseTlaRun, type TlaGraph, type TlaRun } from './witness.ts'
import './tla.css'

const n = (x: number): string => x.toLocaleString('en-US')
const plural = (k: number, one: string, many: string): string => `${n(k)} ${k === 1 ? one : many}`

// ---------------------------------------------------------------- the recorded TLC run, read from the figure

interface Counts {
  readonly generated: number
  readonly distinct: number
  readonly left: number | null
  readonly depth: number | null
  readonly verdict: 'violated' | 'deadlock' | 'ok' | null
  readonly invariant: string | null
}

const num = (s: string): number => Number(s.replace(/,/g, ''))

/** TLC's summary lines in a recorded run's text, or null when it prints none. */
export function tlcCounts(text: string): Counts | null {
  const c = /([\d,]+) states? generated,\s*([\d,]+) distinct states? found(?:,\s*([\d,]+) states? left on queue)?/.exec(text)
  if (c === null) return null
  const d = /depth of the complete state graph search is (\d+)/.exec(text)
  const inv = /Invariant (\w+) is violated/.exec(text)
  const verdict = inv !== null ? 'violated' : /Deadlock reached/.test(text) ? 'deadlock' : /No error has been found/.test(text) ? 'ok' : null
  return {
    generated: num(c[1] as string),
    distinct: num(c[2] as string),
    left: c[3] !== undefined ? num(c[3]) : null,
    depth: d !== null ? Number(d[1]) : null,
    verdict,
    invariant: inv !== null ? (inv[1] as string) : null,
  }
}

interface Recorded {
  readonly id: string
  readonly counts: Counts
}

function useRecordedTlc(ref: React.RefObject<HTMLElement | null>): Recorded | null {
  const [rec, setRec] = useState<Recorded | null>(null)
  useLayoutEffect(() => {
    const fig = ref.current?.closest('figure')
    if (fig === null || fig === undefined) return
    for (const panel of fig.querySelectorAll('.cell-output:not([data-pending])')) {
      const counts = tlcCounts(panel.querySelector('pre')?.textContent ?? '')
      if (counts === null) continue
      setRec({ id: panel.querySelector('.cell-output-label code')?.textContent ?? 'the recorded run', counts })
      return
    }
  }, [ref])
  return rec
}

const verdictWords = (v: Counts['verdict'] | TlaRun['verdict'], inv: string | null): string =>
  v === 'violated' ? `invariant ${inv ?? '?'} violated` : v === 'deadlock' ? 'deadlock' : v === 'ok' ? 'no error' : v === 'stopped' ? 'stopped at the budget' : 'no verdict line'

function Compare({ run, rec }: { readonly run: TlaRun; readonly rec: Recorded | null }) {
  if (rec === null) return <p className="tla-compare">The recorded run above prints no TLC counts, so this tab has nothing to set its counts beside.</p>
  const r = rec.counts
  const diffs: string[] = []
  if (r.generated !== run.tlc.generated) diffs.push(`states generated ${n(run.tlc.generated)} here, ${n(r.generated)} recorded`)
  if (r.distinct !== run.tlc.distinct) diffs.push(`distinct states ${n(run.tlc.distinct)} here, ${n(r.distinct)} recorded`)
  if (r.left !== null && r.left !== run.tlc.left) diffs.push(`left on queue ${n(run.tlc.left)} here, ${n(r.left)} recorded`)
  if (r.depth !== null && r.depth !== run.tlc.depth) diffs.push(`depth ${run.tlc.depth} here, ${r.depth} recorded`)
  if (r.verdict !== null && (r.verdict !== run.verdict || r.invariant !== run.invariant)) diffs.push(`${verdictWords(run.verdict, run.invariant)} here, ${verdictWords(r.verdict, r.invariant)} recorded`)
  const theirs = `${n(r.generated)} generated, ${n(r.distinct)} distinct${r.left !== null ? `, ${n(r.left)} left on queue` : ''}${r.depth !== null ? `, depth ${r.depth}` : ''}, ${verdictWords(r.verdict, r.invariant)}`
  return (
    <p className="tla-compare">
      TLC&apos;s recorded run <code>{rec.id}</code>: {theirs}.{' '}
      {diffs.length === 0 ? (
        <strong>This tab&apos;s search gives the same counts and the same verdict.</strong>
      ) : (
        <>
          <strong>This run differs:</strong> {diffs.join('; ')}. Check the cell&apos;s configuration lines against the recorded run&apos;s flags; an edited spec is a different model.
        </>
      )}
    </p>
  )
}

// ---------------------------------------------------------------- the trace table

function TraceTable({ run }: { readonly run: TlaRun }) {
  if (run.trace.length === 0) return null
  const caption =
    run.verdict === 'violated' ? `The counterexample: ${plural(run.trace.length, 'state', 'states')}, ${plural(run.trace.length - 1, 'step', 'steps')}` : `The behavior to the deadlock: ${plural(run.trace.length, 'state', 'states')}`
  const last = run.trace.length - 1
  return (
    <div className="tla-frame" tabIndex={0} role="region" aria-label="Trace table">
      <table className="tla-trace">
        <caption className="tla-cap">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">State</th>
            <th scope="col">Action</th>
            {run.vars.map((v) => (
              <th key={v} scope="col">
                <code>{v}</code>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {run.trace.map((s, i) => {
            const prev = i > 0 ? run.trace[i - 1] : undefined
            return (
              <tr key={i} data-bad={i === last ? 'true' : undefined}>
                <th scope="row">
                  {i + 1}
                  {i === last ? <span className="tla-flag"> {run.verdict === 'violated' ? 'violates' : 'stuck'}</span> : null}
                </th>
                <td>
                  <code>{s.action ?? 'Initial predicate'}</code>
                </td>
                {run.vars.map((v, j) => {
                  const changed = prev !== undefined && prev.values[j] !== s.values[j]
                  return (
                    <td key={v} data-changed={changed ? 'true' : undefined}>
                      <code>{s.values[j] ?? ''}</code>
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------- the step graph

const W = 560
const PAD_X = 22
const PAD_Y = 18
const ROW = 26

function StepGraph({ run, graph }: { readonly run: TlaRun; readonly graph: TlaGraph }) {
  const layout = useMemo(() => {
    const layers = new Map<number, number[]>()
    graph.nodes.forEach((x, i) => {
      const l = layers.get(x.depth) ?? []
      l.push(i)
      layers.set(x.depth, l)
    })
    const depths = [...layers.keys()].sort((a, b) => a - b)
    const widest = Math.max(1, ...[...layers.values()].map((l) => l.length))
    const h = PAD_Y * 2 + (widest - 1) * ROW + 16
    const pos: { x: number; y: number }[] = new Array(graph.nodes.length)
    depths.forEach((d, di) => {
      const col = layers.get(d) as number[]
      const x = depths.length === 1 ? W / 2 : PAD_X + (di * (W - PAD_X * 2)) / (depths.length - 1)
      const top = PAD_Y + ((widest - col.length) * ROW) / 2
      col.forEach((idx, k) => {
        pos[idx] = { x, y: top + k * ROW }
      })
    })
    const out = new Set<number>()
    for (const [a, b] of graph.edges) if (a !== b) out.add(a)
    return { depths, layers, h, pos, hasOut: out }
  }, [graph])
  const { depths, layers, h, pos, hasOut } = layout
  const bad = run.verdict === 'violated' ? graph.trace[graph.trace.length - 1] : undefined
  const pts = graph.trace.map((i) => pos[i]).filter((p): p is { x: number; y: number } => p !== undefined)
  const pointList = pts.map((p) => `${p.x},${p.y}`).join(' ')
  const r = graph.nodes.length > 60 ? 3.6 : 6
  const label = `The step graph Spectacle explored: ${plural(graph.nodes.length, 'state', 'states')} over ${plural(depths.length, 'depth', 'depths')}${
    graph.trace.length > 0 ? `, with the ${run.verdict === 'violated' ? 'counterexample' : 'path to the deadlock'} drawn as a heavy line` : ''
  }. The trace table gives the same path as text.`
  const seen = new Set<string>()
  return (
    <div className="tla-graph">
      <svg className="tla-svg" viewBox={`0 0 ${W} ${h}`} role="img" aria-label={label}>
        <g className="tla-edges">
          {graph.edges.map(([a, b, act]) => {
            const k = `${a}>${b}`
            if (a === b || seen.has(k)) return null
            seen.add(k)
            const p = pos[a]
            const q = pos[b]
            return p && q ? (
              <line key={k} x1={p.x} y1={p.y} x2={q.x} y2={q.y}>
                <title>{act}</title>
              </line>
            ) : null
          })}
        </g>
        {pts.length > 1 ? <polyline className="tla-casing" points={pointList} /> : null}
        {pts.length > 1 ? <polyline className={bad !== undefined ? 'line-violation tla-path' : 'tla-path tla-path-ink'} points={pointList} /> : null}
        <g>
          {graph.nodes.map((node, i) => {
            const p = pos[i]
            if (p === undefined) return null
            const tip = node.values !== undefined ? run.vars.map((v, j) => `${v} = ${node.values?.[j] ?? ''}`).join('\n') : `state ${i + 1}`
            if (i === bad)
              return (
                <rect key={i} className="line-violation tla-over" x={p.x - r} y={p.y - r} width={r * 2} height={r * 2}>
                  <title>{tip}</title>
                </rect>
              )
            if (!hasOut.has(i))
              return (
                <circle key={i} className="tla-done" cx={p.x} cy={p.y} r={r - 0.75}>
                  <title>{tip}</title>
                </circle>
              )
            return (
              <circle key={i} className="tla-node" cx={p.x} cy={p.y} r={r}>
                <title>{tip}</title>
              </circle>
            )
          })}
        </g>
        {depths.map((d, di) => {
          const x = depths.length === 1 ? W / 2 : PAD_X + (di * (W - PAD_X * 2)) / (depths.length - 1)
          return (
            <text key={d} className="tla-depth" x={x} y={h - 2} textAnchor="middle">
              {d}
            </text>
          )
        })}
      </svg>
      <p className="tla-layers">
        Depth along the bottom (TLC counts the initial state as depth 1). States per depth: {depths.map((d) => (layers.get(d) as number[]).length).join(', ')};{' '}
        {plural(graph.nodes.length, 'state', 'states')} {graph.complete ? 'in all: every state the model can reach' : 'so far: the search stopped before the graph was complete'}.
      </p>
      <ul className="tla-legend" aria-label="Key">
        <li>
          <svg className="tla-key" width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">
            <circle className="tla-node" r={5} />
          </svg>
          a state with a successor
        </li>
        <li>
          <svg className="tla-key" width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">
            <circle className="tla-done" r={4.5} />
          </svg>
          no successor (or not expanded)
        </li>
        {bad !== undefined ? (
          <li>
            <svg className="tla-key" width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">
              <rect className="line-violation tla-over" x={-5.5} y={-5.5} width={11} height={11} />
            </svg>
            <code>{run.invariant}</code> broken
          </li>
        ) : null}
      </ul>
    </div>
  )
}

// ---------------------------------------------------------------- the result

function headline(run: TlaRun): string {
  if (run.verdict === 'violated') return `Error: Invariant ${run.invariant ?? '?'} is violated.`
  if (run.verdict === 'deadlock') return 'Error: Deadlock reached.'
  if (run.verdict === 'ok') return 'Model checking completed. No error has been found.'
  return `Stopped at the wall-clock budget of ${run.budgetMs / 1000} s: a partial search, with no error in the states it reached. The whole model runs on the Bench.`
}

export function TlaOutput({ reply }: { readonly reply: RunReply }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const run = useMemo(() => parseTlaRun(reply.witness), [reply.witness])
  const rec = useRecordedTlc(ref)
  const text = reply.output.map((l) => l.text).join('\n')
  return (
    <div className="tla-out" ref={ref}>
      {run !== null ? (
        <>
          <p className="tla-verdict">{headline(run)}</p>
          <p className="tla-counts">
            {plural(run.tlc.generated, 'state', 'states')} generated, {plural(run.tlc.distinct, 'distinct state', 'distinct states')} found, {plural(run.tlc.left, 'state', 'states')} left on queue; depth{' '}
            {run.tlc.depth}. Model <code>{run.module}</code>: <code>INIT {run.init}</code>, <code>NEXT {run.next}</code>
            {run.invariants.map((i) => (
              <span key={i}>
                , <code>INVARIANT {i}</code>
              </span>
            ))}
            , deadlock check {run.deadlock ? 'on' : 'off'}.
            {!run.invariantsNamed && run.invariants.length > 0 ? ' The invariants are the state predicates defined after Spec; name others with a line like \\* INVARIANT X.' : ''}
          </p>
          <Compare run={run} rec={rec} />
          <TraceTable run={run} />
          {run.graph !== null ? (
            <StepGraph run={run} graph={run.graph} />
          ) : (
            <p className="tla-layers">The search reached {plural(run.explored.distinct, 'state', 'states')}, too many to draw here.</p>
          )}
        </>
      ) : null}
      {reply.error !== null ? (
        <div className="code-block cell-live-err" role="region" aria-label="Why the model did not run" tabIndex={0}>
          <pre>{reply.error}</pre>
        </div>
      ) : null}
      {text !== '' ? (
        <details className="tla-text">
          <summary>What the run printed, in TLC&apos;s format</summary>
          <div className="code-block cell-live-out" role="region" aria-label="What the run printed" tabIndex={0}>
            <pre>{text}</pre>
          </div>
        </details>
      ) : null}
    </div>
  )
}
