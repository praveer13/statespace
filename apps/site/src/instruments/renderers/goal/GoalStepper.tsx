// The Goal Replay stepper (INS-goal-replay): the cell's proof tactic by tactic, with the goal Lean printed before
// each tactic and at the end of the proof. The strips come from the instrument origin as a run reply's witness;
// they are untrusted data there, so this file checks their shape and renders every field through text only
// (ARCHITECTURE.md section 5.7). No Lean runs in the tab: the goals are Lean 4.35.0's own output at build time.

import { useState, type KeyboardEvent } from 'react'
import type { RunReply } from '../../protocol.ts'
import './goal.css'

interface GoalState {
  readonly when: 'before' | 'end'
  readonly tactic: string | null
  readonly line: number
  readonly goals: readonly string[] | null
}
interface GoalStrip {
  readonly decl: string
  readonly kind: string
  readonly lines: readonly [number, number]
  readonly states: readonly GoalState[]
}
interface GoalMessage {
  readonly severity: string
  readonly line: number
  readonly text: string
}
export interface GoalCell {
  readonly run: string
  readonly banner: string
  readonly lesson: string
  readonly cell: number
  readonly elaborated: 'clean' | 'with-errors' | 'needs-context'
  readonly errors: number
  readonly strips: readonly GoalStrip[]
  readonly messages: readonly GoalMessage[]
}

const isStr = (x: unknown): x is string => typeof x === 'string'
const isInt = (x: unknown): x is number => typeof x === 'number' && Number.isInteger(x) && x >= 0

function asState(v: unknown): GoalState | null {
  const s = v as Record<string, unknown> | null
  if (s === null || typeof s !== 'object') return null
  if (s.when !== 'before' && s.when !== 'end') return null
  if (!(s.tactic === null || isStr(s.tactic)) || !isInt(s.line)) return null
  if (!(s.goals === null || (Array.isArray(s.goals) && s.goals.every(isStr)))) return null
  return { when: s.when, tactic: s.tactic, line: s.line, goals: s.goals as readonly string[] | null }
}

/** The witness as a goal cell, or null when it is not one. */
export function asGoalCell(witness: string | null): GoalCell | null {
  if (witness === null) return null
  let v: Record<string, unknown>
  try {
    v = JSON.parse(witness) as Record<string, unknown>
  } catch {
    return null
  }
  if (v === null || typeof v !== 'object' || v.schema !== 'statespace/goal-cell@1') return null
  if (!isStr(v.run) || !isStr(v.banner) || !isStr(v.lesson) || !isInt(v.cell) || !isInt(v.errors)) return null
  if (v.elaborated !== 'clean' && v.elaborated !== 'with-errors' && v.elaborated !== 'needs-context') return null
  if (!Array.isArray(v.strips) || !Array.isArray(v.messages)) return null
  const strips: GoalStrip[] = []
  for (const x of v.strips as unknown[]) {
    const s = x as Record<string, unknown> | null
    if (s === null || typeof s !== 'object' || !isStr(s.decl) || !isStr(s.kind) || !Array.isArray(s.states) || !Array.isArray(s.lines)) return null
    const [a, b] = s.lines as unknown[]
    if (!isInt(a) || !isInt(b)) return null
    const states = (s.states as unknown[]).map(asState)
    if (states.length === 0 || states.some((t) => t === null)) return null
    strips.push({ decl: s.decl, kind: s.kind, lines: [a, b], states: states as GoalState[] })
  }
  const messages: GoalMessage[] = []
  for (const x of v.messages as unknown[]) {
    const m = x as Record<string, unknown> | null
    if (m === null || typeof m !== 'object' || !isStr(m.severity) || !isInt(m.line) || !isStr(m.text)) return null
    messages.push({ severity: m.severity, line: m.line, text: m.text })
  }
  return { run: v.run, banner: v.banner, lesson: v.lesson, cell: v.cell, elaborated: v.elaborated, errors: v.errors, strips, messages }
}

const plural = (n: number, one: string, many: string): string => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`

/** The messages Lean attached to the lines from this step up to the next one, inside the strip's declaration. */
function stepMessages(strip: GoalStrip, i: number, messages: readonly GoalMessage[]): GoalMessage[] {
  const st = strip.states[i]
  if (st === undefined || st.when === 'end') return []
  const next = strip.states.slice(i + 1).find((s) => s.when === 'before')
  const from = st.line
  const to = next !== undefined && next.line > st.line ? next.line - 1 : strip.lines[1]
  return messages.filter((m) => m.line >= from && m.line <= to)
}

function Goals({ goals }: { readonly goals: readonly string[] | null }) {
  if (goals === null) return <p className="goal-none">Lean reported no goal information at this point.</p>
  if (goals.length === 0) return <p className="goal-closed">No goals: this branch of the proof is closed.</p>
  return (
    <div className="goal-list">
      {goals.map((g, k) => (
        <div key={k} className="goal-one">
          {goals.length > 1 ? (
            <p className="goal-count">
              Goal {k + 1} of {goals.length}
            </p>
          ) : null}
          <div className="code-block goal-text" role="region" aria-label={goals.length > 1 ? `Goal ${k + 1} of ${goals.length}` : 'The goal'} tabIndex={0}>
            <pre>{g}</pre>
          </div>
        </div>
      ))}
    </div>
  )
}

function Messages({ messages, label }: { readonly messages: readonly GoalMessage[]; readonly label: string }) {
  if (messages.length === 0) return null
  return (
    <div className="goal-messages">
      <p className="goal-messages-head">{label}</p>
      <ul>
        {messages.map((m, k) => (
          <li key={k}>
            <span className="goal-sev">
              {m.severity} · line {m.line + 1}
            </span>
            <div className="code-block goal-msg" role="region" aria-label={`Lean ${m.severity} at line ${m.line + 1}`} tabIndex={0}>
              <pre>{m.text}</pre>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Stepper({ strip, messages }: { readonly strip: GoalStrip; readonly messages: readonly GoalMessage[] }) {
  const [at, setAt] = useState(0)
  const last = strip.states.length - 1
  const i = Math.min(at, last)
  const st = strip.states[i] as GoalState
  const go = (k: number): void => setAt(Math.max(0, Math.min(last, k)))
  const onKey = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      go(i + 1)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      go(i - 1)
    } else if (e.key === 'Home') {
      e.preventDefault()
      go(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      go(last)
    }
  }
  const own = stepMessages(strip, i, messages)
  return (
    <div className="goal-stepper" onKeyDown={onKey}>
      <ol className="goal-steps" aria-label={`Tactics of ${strip.decl}`}>
        {strip.states.map((s, k) => (
          <li key={k}>
            <button type="button" className="goal-step" aria-current={k === i ? 'step' : undefined} onClick={() => go(k)}>
              <span className="goal-step-n">{k + 1}</span>
              {s.when === 'end' ? <span className="goal-step-end">end of proof</span> : <code>{s.tactic}</code>}
            </button>
          </li>
        ))}
      </ol>
      <div className="goal-now" aria-live="polite">
        <p className="goal-now-head">
          <span className="goal-now-n">
            Step {i + 1} of {strip.states.length}
          </span>
          {' · '}
          {st.when === 'end' ? (
            'at the end of the proof'
          ) : (
            <>
              before <code>{st.tactic}</code> <span className="goal-line">(line {st.line + 1})</span>
            </>
          )}
        </p>
        <Goals goals={st.goals} />
        <Messages messages={own} label="What Lean said about this tactic" />
      </div>
      <div className="goal-nav">
        <button type="button" className="button button-secondary" onClick={() => go(i - 1)} disabled={i === 0}>
          Previous tactic
        </button>
        <button type="button" className="button button-primary" onClick={() => go(i + 1)} disabled={i === last}>
          Next tactic
        </button>
        <span className="goal-nav-note">or use the arrow keys</span>
      </div>
    </div>
  )
}

export function GoalStepperView({ cell }: { readonly cell: GoalCell }) {
  const [which, setWhich] = useState(0)
  const strip = cell.strips[Math.min(which, cell.strips.length - 1)]
  const covered = (m: GoalMessage): boolean => cell.strips.some((s) => s.states.some((_, k) => stepMessages(s, k, [m]).length > 0))
  const loose = cell.messages.filter((m) => !covered(m))
  return (
    <div className="goal-replay">
      <p className="goal-source">
        Goals Lean printed at build time through <code>$/lean/plainGoal</code>, recorded as <code>{cell.run}</code>: {cell.banner}.
      </p>
      {cell.elaborated === 'needs-context' ? (
        <p className="cell-pending">Lean cannot elaborate this cell on its own: it needs the definitions of the stage's template, so there is no goal to step through. Lean's messages are below.</p>
      ) : null}
      {cell.elaborated !== 'needs-context' && cell.strips.length === 0 ? <p className="cell-pending">This cell has no tactic proof to step through. Lean's messages are below.</p> : null}
      {cell.elaborated === 'with-errors' ? (
        <p className="goal-errors">Lean reports {plural(cell.errors, 'error', 'errors')} in this cell. The steps show where the proof stops working.</p>
      ) : null}
      {cell.strips.length > 1 ? (
        <div className="goal-decls" role="group" aria-label="Proofs in this cell">
          {cell.strips.map((s, k) => (
            <button key={k} type="button" className="goal-decl" aria-pressed={k === which} onClick={() => setWhich(k)}>
              {s.kind} <code>{s.decl}</code>
            </button>
          ))}
        </div>
      ) : null}
      {strip !== undefined ? <Stepper key={which} strip={strip} messages={cell.messages} /> : null}
      <Messages messages={loose} label={cell.strips.length > 0 ? "Lean's other messages for this cell" : "Lean's messages for this cell"} />
    </div>
  )
}

/** The live-instrument Output hook: the reply's witness as a stepper, or its text when it carries none. */
export function GoalReplayOutput({ reply }: { readonly reply: RunReply }) {
  const cell = asGoalCell(reply.witness)
  if (cell !== null) return <GoalStepperView cell={cell} />
  return (
    <div className="goal-replay">
      {reply.error !== null ? (
        <div className="code-block cell-live-err" role="region" aria-label="Why there are no goals" tabIndex={0}>
          <pre>{reply.error}</pre>
        </div>
      ) : (
        <div className="code-block cell-live-out" role="region" aria-label="What Goal Replay returned" tabIndex={0}>
          <pre>{reply.output.map((l) => l.text).join('\n')}</pre>
        </div>
      )}
    </div>
  )
}
