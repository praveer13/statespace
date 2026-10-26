// A game for S5.L7, after "Weak or strong": the retrying hold read against a Fair line the learner writes. Choose
// none, weak or strong fairness for each of Try, Busy, Capture and Timeout, and where Timeout applies; the page reads
// each of the model's three unresolved endings (the retry cycle, stuttering in held, stuttering in pending) against each
// conjunct with the lesson's reading rule, and says whether any of them is a fair behavior that never resolves. The goal
// is the lesson's own: make every hold resolve while keeping fairness on your own system's actions.

import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { ToyFrame } from '../ToyFrame.tsx'
import { ACTIONS, OWNER, PRESETS, fairLine, fairOf, isEnabled, judge, providerPromises } from './model.ts'
import type { ActionName, Fair, Fairness, Judged, Lasso, Reading, TimeoutScope } from './model.ts'
import './fairness.css'

const W = 440
const H = 240
const X1 = 150
const X2 = 290
const Y1 = 64
const Y2 = 172
const BW = 96
const BH = 32

/** The four unresolved states, as a ring: held 0 -Try-> pending 1 -Busy-> held 1 -Try-> pending 0 -Busy-> held 0. */
const RING = [
  { id: 'h0', st: 'held', label: 'held 0', x: X1, y: Y1 },
  { id: 'p1', st: 'pending', label: 'pending 1', x: X2, y: Y1 },
  { id: 'h1', st: 'held', label: 'held 1', x: X2, y: Y2 },
  { id: 'p0', st: 'pending', label: 'pending 0', x: X1, y: Y2 },
] as const

type RingId = (typeof RING)[number]['id']

/** The ring's four steps, box edge to box edge. */
const RING_EDGES: ReadonlyArray<{ from: RingId; to: RingId; action: ActionName; d: string; lx: number; ly: number }> = [
  { from: 'h0', to: 'p1', action: 'Try', d: `M${X1 + BW / 2} ${Y1} L${X2 - BW / 2} ${Y1}`, lx: (X1 + X2) / 2, ly: Y1 - 8 },
  { from: 'p1', to: 'h1', action: 'Busy', d: `M${X2} ${Y1 + BH / 2} L${X2} ${Y2 - BH / 2}`, lx: X2 + 8, ly: (Y1 + Y2) / 2 + 4 },
  { from: 'h1', to: 'p0', action: 'Try', d: `M${X2 - BW / 2} ${Y2} L${X1 + BW / 2} ${Y2}`, lx: (X1 + X2) / 2, ly: Y2 + 20 },
  { from: 'p0', to: 'h0', action: 'Busy', d: `M${X1} ${Y2 - BH / 2} L${X1} ${Y1 + BH / 2}`, lx: X1 - 8, ly: (Y1 + Y2) / 2 + 4 },
]

/** Steps that leave the ring and resolve the hold, drawn as stubs with the action's name. */
function stubs(scope: TimeoutScope): Array<{ key: string; action: ActionName; x1: number; y1: number; x2: number; y2: number; lx: number; ly: number; anchor: 'start' | 'end' | 'middle' }> {
  const L = 34
  const out = [
    { key: 'h0-T', action: 'Timeout' as const, x1: X1 - BW / 2, y1: Y1, x2: X1 - BW / 2 - L, y2: Y1, lx: X1 - BW / 2 - L - 4, ly: Y1 + 4, anchor: 'end' as const },
    { key: 'h1-T', action: 'Timeout' as const, x1: X2 + BW / 2, y1: Y2, x2: X2 + BW / 2 + L, y2: Y2, lx: X2 + BW / 2 + L + 4, ly: Y2 + 4, anchor: 'start' as const },
    { key: 'p1-C', action: 'Capture' as const, x1: X2 + BW / 2, y1: Y1, x2: X2 + BW / 2 + L, y2: Y1, lx: X2 + BW / 2 + L + 4, ly: Y1 + 4, anchor: 'start' as const },
    { key: 'p0-C', action: 'Capture' as const, x1: X1 - BW / 2, y1: Y2, x2: X1 - BW / 2 - L, y2: Y2, lx: X1 - BW / 2 - L - 4, ly: Y2 + 4, anchor: 'end' as const },
  ]
  if (scope === 'unresolved')
    out.push(
      { key: 'p1-T', action: 'Timeout' as const, x1: X2, y1: Y1 - BH / 2, x2: X2, y2: Y1 - BH / 2 - 26, lx: X2 + 6, ly: Y1 - BH / 2 - 16, anchor: 'start' as const },
      { key: 'p0-T', action: 'Timeout' as const, x1: X1, y1: Y2 + BH / 2, x2: X1, y2: Y2 + BH / 2 + 26, lx: X1 - 6, ly: Y2 + BH / 2 + 22, anchor: 'end' as const },
    )
  return out
}

const fairName = (f: Fairness, a: ActionName): string => (f === 'none' ? `no fairness on ${a}` : `${f}_vars(${a})`)

function sayReading(f: 'WF' | 'SF', a: ActionName, r: Reading): string {
  const c = `${f}_vars(${a})`
  switch (r.why) {
    case 'taken':
      return `${c} holds: ${a} is taken on the cycle.`
    case 'disabled-somewhere':
      return `${c} holds: ${a} is disabled at some state of the cycle, so it never stays enabled.`
    case 'disabled-everywhere':
      return `${c} holds: ${a} is disabled at every state of the cycle, so there is nothing to force.`
    case 'enabled-everywhere':
      return `${c} fails: ${a} is enabled at every state of the cycle and never taken.`
    case 'enabled-somewhere':
      return `${c} fails: ${a} is enabled again and again on the cycle and never taken.`
  }
}

function sayOverall(fair: Fair, scope: TimeoutScope, js: readonly Judged[]): ReactNode {
  const line = <code>{fairLine(fair)}</code>
  const starving = js.find((j) => j.fair)
  if (starving !== undefined)
    return (
      <>
        <strong>
          <code>EventuallyResolves</code> fails on this model.
        </strong>{' '}
        Under {line}, the lasso &ldquo;{starving.lasso.name}&rdquo; satisfies every conjunct, and the hold never resolves.
      </>
    )
  const promises = providerPromises(fair)
  if (promises.length > 0)
    return (
      <>
        <strong>
          <code>EventuallyResolves</code> holds on this model, on a promise about the provider.
        </strong>{' '}
        Under {line}, each way to stay unresolved breaks a conjunct, but {promises.map((a) => `${fair[a]}_vars(${a})`).join(' and ')} sits on the
        provider&apos;s action. Keep fairness on your own actions.
      </>
    )
  return (
    <>
      <strong>
        <code>EventuallyResolves</code> holds on this model, with fairness on your own actions only.
      </strong>{' '}
      Under {line}, each of the three ways to stay unresolved breaks a conjunct. That meets the goal. The conjunct is still an assumption, that your
      scheduler keeps running {scope === 'unresolved' && fair.Timeout !== 'none' ? 'the expiry step' : 'those steps'}, and the stamp shows it as [A].
    </>
  )
}

function LassoMark({ fair }: { readonly fair: boolean }) {
  return (
    <svg className="toy-key" width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">
      {fair ? <rect className="line-violation fa-starve" x={-5.5} y={-5.5} width={11} height={11} /> : <circle className="fa-ruled" r={4.5} />}
    </svg>
  )
}

/** The selected lasso drawn over the ring: the whole cycle, or a stuttering loop on each state of the kind. */
function Overlay({ lasso, fair }: { readonly lasso: Lasso; readonly fair: boolean }) {
  const cls = fair ? 'line-violation fa-lasso' : 'fa-lasso fa-lasso-ink'
  if (lasso.id === 'retry')
    return <path key={`${lasso.id}${fair}`} className={`${cls} toy-land`} d={`M${X1} ${Y1} L${X2} ${Y1} L${X2} ${Y2} L${X1} ${Y2} Z`} />
  const st = lasso.id === 'stutter-held' ? 'held' : 'pending'
  return (
    <g key={`${lasso.id}${fair}`} className="toy-land">
      {RING.filter((n) => n.st === st).map((n) => {
        const up = n.y === Y1
        const y0 = up ? n.y - BH / 2 : n.y + BH / 2
        const dy = up ? -30 : 30
        const x0 = n.x === X1 ? n.x + 20 : n.x - 20
        return <path key={n.id} className={cls} d={`M${x0 - 10} ${y0} C${x0 - 16} ${y0 + dy}, ${x0 + 16} ${y0 + dy}, ${x0 + 10} ${y0}`} />
      })}
    </g>
  )
}

export default function FairnessGame() {
  const uid = useId().replace(/[^a-zA-Z0-9-]/g, '')
  const [fair, setFair] = useState<Fair>(PRESETS[0]!.fair)
  const [scope, setScope] = useState<TimeoutScope>('held')
  const [pick, setPick] = useState<Lasso['id']>('retry')
  const [preset, setPreset] = useState('0')
  const [lead, setLead] = useState<ReactNode>(null)

  const js = judge(fair, scope)
  const chosen = js.find((j) => j.lasso.id === pick) ?? js[0]!
  const markId = `${uid}-arrow`

  const change = (next: Fair, nextScope: TimeoutScope, why: ReactNode = null): void => {
    setFair(next)
    setScope(nextScope)
    setLead(why)
    const starving = judge(next, nextScope).find((j) => j.fair)
    if (starving !== undefined) setPick(starving.lasso.id)
  }

  const setOne = (a: ActionName, f: Fairness): void => {
    setPreset('')
    change({ ...fair, [a]: f }, scope)
  }

  const showMe = (): void => {
    setPreset('4')
    change(
      fairOf({ Timeout: 'WF' }),
      'unresolved',
      <>
        With <code>Timeout</code> only at <code>held</code>, no fairness on <code>Try</code> and <code>Timeout</code> can do it: in{' '}
        <code>pending</code> both are disabled, so a provider that stays silent leaves the hold pending forever. Letting <code>Timeout</code> apply
        while pending, with <code>WF_vars(Timeout)</code>, makes it enabled at every state of all three lassos, so each one breaks the conjunct.{' '}
      </>,
    )
  }

  const label =
    `The retrying hold's four unresolved states in a ring: held 0, Try to pending 1, Busy to held 1, Try to pending 0, Busy back to held 0. ` +
    `Capture leaves each pending state; Timeout leaves each held state${scope === 'unresolved' ? ' and each pending state' : ''}. ` +
    `Drawn over it: the lasso "${chosen.lasso.name}", which is ${chosen.fair ? 'fair under this Fair line and never resolves' : 'not fair under this Fair line'}.`

  return (
    <ToyFrame
      title="Whose promise ends the cycle"
      kind="Game"
      caption={
        <>
          The page reads each lasso against each conjunct with the lesson&apos;s reading rule. The three lassos are every way this small model can stay
          unresolved forever, so &ldquo;holds&rdquo; here covers this model only. No TLC runs here, and every fairness conjunct is an assumption.
        </>
      }
    >
      <p className="toy-goal">
        Goal: write a <code>Fair</code> line under which every hold resolves, with fairness on your own system&apos;s actions only, <code>Try</code> and{' '}
        <code>Timeout</code>.
      </p>

      <div className="fa-controls">
        <label className="toy-field">
          <span className="toy-field-name">Load a Fair line from the lesson</span>
          <select
            className="fa-select"
            value={preset}
            onChange={(e) => {
              const i = e.target.value
              setPreset(i)
              const p = PRESETS[Number(i)]
              if (i !== '' && p !== undefined) change(p.fair, p.scope)
            }}
          >
            <option value="">Your own line</option>
            {PRESETS.map((p, i) => (
              <option key={p.label} value={String(i)}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="toy-choice">
          <legend>Timeout applies while</legend>
          <label>
            <input
              type="radio"
              name={`${uid}-scope`}
              checked={scope === 'held'}
              onChange={() => {
                setPreset('')
                change(fair, 'held')
              }}
            />
            <span>
              <code>st = &quot;held&quot;</code>, as in Hold
            </span>
          </label>
          <label>
            <input
              type="radio"
              name={`${uid}-scope`}
              checked={scope === 'unresolved'}
              onChange={() => {
                setPreset('')
                change(fair, 'unresolved')
              }}
            />
            <span>
              <code>held</code> or <code>pending</code>, as in HoldLive
            </span>
          </label>
        </fieldset>

        <div className="fa-actions">
          {ACTIONS.map((a) => (
            <fieldset key={a} className="fa-action">
              <legend>
                <code>{a}</code> <span className="fa-owner">{OWNER[a] === 'system' ? 'your system' : 'the provider'}</span>
              </legend>
              <div className="fa-seg">
                {(['none', 'WF', 'SF'] as const).map((f) => (
                  <label key={f}>
                    <input type="radio" name={`${uid}-${a}`} checked={fair[a] === f} onChange={() => setOne(a, f)} aria-label={fairName(f, a)} />
                    <span className="fa-cell" aria-hidden="true">{f}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>

        <div className="toy-actions">
          <button type="button" className="toy-button" onClick={showMe}>
            Show me
          </button>
        </div>
      </div>

      <pre className="fa-line">
        <code>{fairLine(fair)}</code>
      </pre>

      <p className="toy-status" aria-live="polite">
        {lead}
        {sayOverall(fair, scope, js)}
      </p>

      <div className="fa-graph">
        <svg className="toy-svg fa-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
          <defs>
            <marker id={markId} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path className="fa-head" d="M0 0 L8 4 L0 8 Z" />
            </marker>
          </defs>
          {RING_EDGES.map((e) => (
            <g key={`${e.from}${e.to}`}>
              <path className="fa-edge" d={e.d} markerEnd={`url(#${markId})`} />
              <text className="fa-act" x={e.lx} y={e.ly} textAnchor={e.action === 'Busy' ? (e.lx > X2 ? 'start' : 'end') : 'middle'}>
                {e.action}
              </text>
            </g>
          ))}
          {stubs(scope).map((s) => (
            <g key={s.key} className="fa-stub">
              <line className="fa-edge" x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} markerEnd={`url(#${markId})`} />
              <text className="fa-act" x={s.lx} y={s.ly} textAnchor={s.anchor}>
                {s.action}
              </text>
            </g>
          ))}
          <Overlay lasso={chosen.lasso} fair={chosen.fair} />
          {RING.map((n) => (
            <g key={n.id}>
              <rect className="fa-box" x={n.x - BW / 2} y={n.y - BH / 2} width={BW} height={BH} />
              <text className="fa-st" x={n.x} y={n.y + 4} textAnchor="middle">
                {n.label}
              </text>
            </g>
          ))}
        </svg>
        <p className="fa-note">
          The number is <code>tries</code>, which <code>Try</code> toggles, so the cycle passes all four states. A stub that leaves the ring resolves
          the hold: <code>Capture</code> to <code>captured</code>, <code>Timeout</code> to <code>released</code>.
        </p>
      </div>

      <fieldset className="fa-lassos">
        <legend>Every way this model can stay unresolved: choose one to draw</legend>
        {js.map((j) => (
          <label key={j.lasso.id} className="fa-lasso-row" data-picked={pick === j.lasso.id ? 'true' : undefined}>
            <input type="radio" name={`${uid}-lasso`} checked={pick === j.lasso.id} onChange={() => setPick(j.lasso.id)} />
            <span className="fa-lasso-body">
              <span className="fa-lasso-name">
                <LassoMark fair={j.fair} /> {j.lasso.name}
              </span>
              <span className="fa-lasso-verdict">
                {j.fair ? 'Fair, and the hold never resolves.' : 'Not fair: it breaks a conjunct, so it does not count.'}
              </span>
              {j.readings.length === 0 ? (
                <span className="fa-reading">With no fairness, nothing rules it out.</span>
              ) : (
                j.readings.map((r) => (
                  <span key={`${r.f}${r.action}`} className="fa-reading" data-fails={r.r.holds ? undefined : 'true'}>
                    {sayReading(r.f, r.action, r.r)}
                  </span>
                ))
              )}
              <span className="fa-reading fa-enabled">
                Enabled on it:{' '}
                {ACTIONS.filter((a) => j.lasso.cycle.some((st) => isEnabled(a, st, scope))).join(', ')}
                {j.lasso.taken.length > 0 ? `; taken: ${j.lasso.taken.join(', ')}` : '; nothing taken'}.
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      <ul className="toy-legend" aria-label="Key">
        <li>
          <LassoMark fair />
          <span>
            a fair lasso that never resolves: <code>EventuallyResolves</code> fails
          </span>
        </li>
        <li>
          <LassoMark fair={false} />
          <span>ruled out by a conjunct</span>
        </li>
      </ul>
    </ToyFrame>
  )
}
