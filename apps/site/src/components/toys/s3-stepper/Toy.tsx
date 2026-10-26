// An interactive for S3.L4: step a call through the small-step relation one rule at a time and watch where it ends,
// in `done`, in `err`, or stuck with no rule. The guard's tree is drawn at each step, with the redex inked and a node
// with no rule framed on the violation line. The learner picks one of four calls from the lesson and either the
// reference relation or the lesson's first draft, which has no rule for a false guard. Computed here, over these four
// calls only.

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ToyFrame } from '../ToyFrame.tsx'
import { CALLS, PHASES, START, focus, show, showCall, showCfg, showState, trace } from './model.ts'
import type { Call, Cfg, E, Path, Relation, Stepped } from './model.ts'
import './stepper.css'

// ------------------------------------------------------------------ the guard's tree

interface TNode {
  readonly key: string
  readonly label: string
  readonly value: boolean
  readonly x: number
  readonly y: number
  readonly w: number
  readonly parent: string | null
}

const SLOT = 128
const LEVEL = 64
const NODE_H = 30

function label(e: E): string {
  switch (e.k) {
    case 'num':
      return e.n < 0 ? `−${-e.n}` : String(e.n)
    case 'acct':
      return `acct ${e.a}`
    case 'var':
      return e.x
    case 'bal':
      return 'balance'
    case 'ge':
      return '>='
    case 'tt':
      return 'true'
    case 'ff':
      return 'false'
  }
}

/** Lay the tree out with leaves in slots and each parent over the middle of its children. */
function layout(e: E): { nodes: TNode[]; width: number; height: number } {
  const nodes: TNode[] = []
  let slot = 0
  let depth = 0
  const go = (x: E, path: string, d: number, parent: string | null): number => {
    depth = Math.max(depth, d)
    const kids: [E, string][] = x.k === 'bal' ? [[x.e, 'e']] : x.k === 'ge' ? [[x.l, 'l'], [x.r, 'r']] : []
    let cx: number
    if (kids.length === 0) {
      cx = slot * SLOT + SLOT / 2
      slot++
    } else {
      const xs = kids.map(([k, p]) => go(k, path + p, d + 1, path))
      cx = xs.reduce((a, b) => a + b, 0) / xs.length
    }
    const text = label(x)
    nodes.push({ key: path, label: text, value: kids.length === 0, x: cx, y: 20 + d * LEVEL, w: Math.max(44, text.length * 9 + 22), parent })
    return cx
  }
  go(e, '', 0, null)
  // Room on the right for the "steps next" or "no rule" note beside a node.
  return { nodes, width: Math.max(1, slot) * SLOT + 72, height: 20 + depth * LEVEL + NODE_H + 8 }
}

const joinPath = (p: Path): string => p.join('')

function Tree({ e, mark, stuck, stepNo }: { readonly e: E; readonly mark: string | null; readonly stuck: boolean; readonly stepNo: number }) {
  const { nodes, width, height } = useMemo(() => layout(e), [e])
  const byKey = new Map(nodes.map((n) => [n.key, n]))
  const f = mark === null ? null : byKey.get(mark)
  const alt =
    `The guard as a tree: ${show(e)}.` +
    (f === undefined || f === null ? '' : stuck ? ` No rule applies at ${f.label}.` : ` The next step rewrites the ${f.label} node.`)
  return (
    <svg className="toy-svg ss-tree" viewBox={`0 0 ${width} ${height}`} style={{ maxWidth: `${Math.max(width, 200)}px` }} role="img" aria-label={alt}>
      <g className="ss-edges">
        {nodes.map((n) => {
          const p = n.parent === null ? undefined : byKey.get(n.parent)
          return p === undefined ? null : <line className="ss-edge" key={`l${n.key}`} x1={p.x} y1={p.y + NODE_H} x2={n.x} y2={n.y} />
        })}
      </g>
      {nodes.map((n) => {
        const here = n.key === mark
        const cls = here ? (stuck ? 'ss-node ss-stuck' : 'ss-node ss-redex') : 'ss-node'
        return (
          <g key={here ? `n${n.key}-${stepNo}` : `n${n.key}`} className={here ? `${cls} toy-land` : cls}>
            <rect
              className={here && stuck ? 'ss-box line-violation ss-stuck-frame' : 'ss-box'}
              x={n.x - n.w / 2}
              y={n.y}
              width={n.w}
              height={NODE_H}
              rx={n.value ? NODE_H / 2 : 0}
            />
            <text className="ss-label" x={n.x} y={n.y + NODE_H / 2 + 5} textAnchor="middle">
              {n.label}
            </text>
            {here ? (
              <text className="ss-node-note" x={n.x + n.w / 2 + 8} y={n.y + NODE_H / 2 + 4} textAnchor="start">
                {stuck ? 'no rule' : 'steps next'}
              </text>
            ) : null}
          </g>
        )
      })}
    </svg>
  )
}

// ------------------------------------------------------------------ the words

const describeCall = (c: Call): string => (c.bypassed ? `${showCall(c)}, typing bypassed` : showCall(c))

function sayStep(st: Stepped, before: Cfg): ReactNode {
  const r = st.rules.join(' / ')
  const call = before.k === 'bind' || before.k === 'checked' || before.k === 'guard' || before.k === 'run' ? before.call : null
  switch (st.rules[0]) {
    case 'bind':
      return (
        <>
          <strong>bind.</strong> Arguments meet parameters: <code>from</code> is <code>acct {call?.from}</code>, <code>to</code> is{' '}
          <code>acct {call?.to}</code> and <code>amount</code> is <code>{call?.amount}</code>.
        </>
      )
    case 'checked':
      return (
        <>
          <strong>checked.</strong> Every account argument is in the state, so the call moves on to its guard.
        </>
      )
    case 'check_account':
      return (
        <>
          <strong>Final: an error.</strong> The account check finds no <code>{call?.to}</code> in the state. A missing account is a
          checked run-time outcome with its own rule, so the call steps to <code>{showCfg(st.next)}</code>.
        </>
      )
    case 'guard_true':
      return (
        <>
          <strong>guard_true.</strong> The guard is true, so the call runs its body.
        </>
      )
    case 'guard_false':
      return (
        <>
          <strong>Final: an error.</strong> The reference has a rule for a false guard, and it steps to{' '}
          <code>{showCfg(st.next)}</code>. An error is a defined outcome with a rule.
        </>
      )
    case 'run':
      return (
        <>
          <strong>Final: done.</strong> The postings debit <code>{call?.from}</code> by {call?.amount} and credit <code>{call?.to}</code> by the
          same, reading the updated state. The state is now <code>{st.next.k === 'done' ? showState(st.next.s) : ''}</code>, and the total is
          still 0.
        </>
      )
    case 'ge_num':
      return (
        <>
          <strong>ge_num.</strong> Both sides are numbers, so <code>&gt;=</code> compares them and the guard becomes{' '}
          <code>{st.next.k === 'guard' ? show(st.next.e) : ''}</code>.
        </>
      )
    default:
      return (
        <>
          <strong>{r}.</strong> {st.rules[0] === 'ge_left' ? 'The left side of >= steps first. ' : ''}
          {st.rules.includes('bal_acct') ? (
            <>
              <code>balance(acct {before.k === 'guard' ? findAcct(before.e) : ''})</code> steps to the literal balance from the state.
            </>
          ) : null}
        </>
      )
  }
}

function findAcct(e: E): string {
  if (e.k === 'acct') return e.a
  if (e.k === 'bal') return findAcct(e.e)
  if (e.k === 'ge') return findAcct(e.l) || findAcct(e.r)
  return ''
}

function sayStuck(c: Cfg): ReactNode {
  if (c.k === 'guard' && c.e.k === 'ff')
    return (
      <>
        <strong>Stuck at guard (false).</strong> The draft relation has no rule for a false guard, so a
        well-typed call has nowhere to go. The big-step evaluator answers <code>guardFailed</code> for the same call, so two
        semantics of one language disagree. Switch to the reference relation to add the rule.
      </>
    )
  return (
    <>
      <strong>Stuck.</strong> <code>{showCfg(c)}</code> is not final, and no rule applies: <code>ge_left</code> needs the left side to
      step, and <code>balance</code> steps only on an account value, not on <code>30</code>. Stuck is not an error; it is the absence
      of a rule. Typing&apos;s R-expr would have turned <code>Odd</code> away as <code>wrongType</code> before it ran.
    </>
  )
}

// ------------------------------------------------------------------ the toy

export default function StepperToy() {
  const uid = useId().replace(/[^a-zA-Z0-9-]/g, '')
  const [callId, setCallId] = useState<string>('over')
  const [rel, setRel] = useState<Relation>('draft')
  const [n, setN] = useState(0)
  // A button that disables itself would drop keyboard focus to the page, so focus moves to the control that still acts.
  const stepRef = useRef<HTMLButtonElement>(null)
  const againRef = useRef<HTMLButtonElement>(null)
  // The target is enabled only after the render, so the focus waits for it.
  const want = useRef<HTMLButtonElement | null>(null)
  const focusLater = (r: { readonly current: HTMLButtonElement | null }): void => {
    want.current = r.current
  }
  useEffect(() => {
    if (want.current !== null && !want.current.disabled) want.current.focus()
    want.current = null
  })

  const call = CALLS.find((c) => c.id === callId) ?? (CALLS[0] as Call)
  const t = useMemo(() => trace(rel, START, call), [rel, call])
  const at = Math.min(n, t.steps.length)
  const cur = t.cfgs[at] as Cfg
  const atEnd = at === t.steps.length
  const stuck = atEnd && t.end === 'stuck'

  // The guard to draw: the bound guard once bound, the guard as written before.
  const shownGuard: E | null = cur.k === 'bind' ? call.guard : cur.k === 'checked' ? cur.guard : cur.k === 'guard' ? cur.e : null
  const lastGuard = useMemo(() => {
    for (let i = at; i >= 0; i--) {
      const c = t.cfgs[i] as Cfg
      if (c.k === 'guard') return c.e
      if (c.k === 'checked') return c.guard
    }
    return call.guard
  }, [t, at, call])
  const treeE = shownGuard ?? lastGuard

  let mark: string | null = null
  if (cur.k === 'guard') {
    const fo = focus(cur.e)
    if (fo !== null) mark = joinPath(fo.at)
    else if (stuck) mark = ''
  }

  const status: ReactNode = stuck
    ? sayStuck(cur)
    : at === 0
      ? (
          <>
            The call is at <code>bind</code>. Take a step and watch which rule fires.
          </>
        )
      : sayStep(t.steps[at - 1] as Stepped, t.cfgs[at - 1] as Cfg)

  const choose = (id: string): void => {
    setCallId(id)
    setN(0)
  }
  const chooseRel = (r: Relation): void => {
    setRel(r)
    setN(0)
  }

  const visited = new Set<string>(t.cfgs.slice(0, at + 1).map((c) => c.k))
  const endPhase = t.end === 'err' ? 'err' : 'done'
  const phases: readonly string[] = [...PHASES.slice(0, 4), endPhase]

  return (
    <ToyFrame
      title="Step it, one rule at a time"
      caption={
        <>
          The page steps the lesson&apos;s expression rules (<code>bal_acct</code>, <code>bal_cong</code>, <code>ge_left</code>,{' '}
          <code>ge_right</code>, <code>ge_num</code>) and names its own phase steps, from the start state {showState(START)}. It is an
          illustration computed here: no Lean runs on this page, and it covers only these four calls.
        </>
      }
    >
      <p className="toy-goal">Take a call one step at a time and see where it ends: done, an error, or stuck with no rule.</p>

      <div className="ss-pickers">
        <fieldset className="toy-choice">
          <legend>The call</legend>
          {CALLS.map((c) => (
            <label key={c.id}>
              <input type="radio" name={`${uid}-call`} checked={callId === c.id} onChange={() => choose(c.id)} />
              <span>
                <code>{showCall(c)}</code>
                {c.bypassed ? ', typing bypassed' : ''}
              </span>
            </label>
          ))}
        </fieldset>
        <fieldset className="toy-choice">
          <legend>The relation</legend>
          <label>
            <input type="radio" name={`${uid}-rel`} checked={rel === 'draft'} onChange={() => chooseRel('draft')} />
            <span>First draft: no rule yet for a false guard</span>
          </label>
          <label>
            <input type="radio" name={`${uid}-rel`} checked={rel === 'reference'} onChange={() => chooseRel('reference')} />
            <span>Reference: a false guard steps to an error</span>
          </label>
        </fieldset>
      </div>

      <div className="toy-actions">
        <button
          ref={stepRef}
          type="button"
          className="toy-button"
          data-primary="true"
          disabled={atEnd}
          onClick={() => {
            setN(at + 1)
            if (at + 1 >= t.steps.length) focusLater(againRef)
          }}
        >
          Take a step
        </button>
        <button
          type="button"
          className="toy-button"
          disabled={atEnd}
          onClick={() => {
            setN(t.steps.length)
            focusLater(againRef)
          }}
        >
          Run to the end
        </button>
        <button
          ref={againRef}
          type="button"
          className="toy-button"
          disabled={at === 0}
          onClick={() => {
            setN(0)
            focusLater(stepRef)
          }}
        >
          Start again
        </button>
      </div>

      <p className="toy-status" aria-live="polite">
        {status}
      </p>

      <div className="ss-stage">
        <ol className="ss-phases" aria-label={`Phase of ${describeCall(call)}`}>
          {phases.map((p) => {
            const now = cur.k === p
            const past = !now && visited.has(p)
            return (
              <li
                key={p}
                className={now && stuck ? 'ss-phase line-violation' : 'ss-phase'}
                data-now={now ? 'true' : undefined}
                data-past={past ? 'true' : undefined}
                aria-current={now ? 'step' : undefined}
              >
                {p}
                {now && stuck ? <span className="ss-phase-note">, stuck</span> : null}
              </li>
            )
          })}
        </ol>

        <div className="ss-now">
          <span className="ss-now-name">Configuration {at}</span>
          <code className="ss-now-cfg">{showCfg(cur)}</code>
        </div>

        <Tree e={treeE} mark={mark} stuck={stuck} stepNo={at} />

        <ol className="ss-trace" aria-label="The trace so far" start={0}>
          {t.cfgs.slice(0, at + 1).map((c, i) => {
            const st = i === 0 ? null : (t.steps[i - 1] as Stepped)
            return (
              <li key={i} data-now={i === at ? 'true' : undefined}>
                <span className="ss-rule">{st === null ? 'start' : st.rules.join(' / ')}</span>
                <code>{showCfg(c)}</code>
              </li>
            )
          })}
        </ol>

        <ul className="toy-legend" aria-label="Key">
          <li>
            <svg className="toy-key" width="20" height="14" viewBox="0 0 20 14" aria-hidden="true">
              <rect className="ss-key-redex" x={1} y={1} width={18} height={12} />
            </svg>
            steps next
          </li>
          <li>
            <svg className="toy-key" width="20" height="14" viewBox="0 0 20 14" aria-hidden="true">
              <rect className="line-violation ss-stuck-frame" x={1.5} y={1.5} width={17} height={11} />
            </svg>
            no rule applies: stuck
          </li>
          <li>
            <svg className="toy-key" width="20" height="14" viewBox="0 0 20 14" aria-hidden="true">
              <rect className="ss-key-value" x={1} y={1} width={18} height={12} rx={6} />
            </svg>
            a value
          </li>
        </ul>
      </div>
    </ToyFrame>
  )
}
