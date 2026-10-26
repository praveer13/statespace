// INS-derivation's live result (docs/DESIGN.md section 6.8): the derivation as a numbered list of steps, each with
// its rule, Z3's raw answer, then "valid" or "not valid" with the state Z3 found. Each step is marked by the line
// language (section 4.1): a step Z3 refuted with a state carries the heavy violation rule; a step stopped by the
// rlimit carries the bounded (dotted) rule; the board's givens carry the assumed (dashed) rule; everything else is
// a solid ink or hairline rule. A step that fails because a step it rests on failed is marked "follow-on" and is
// not counted twice. ↑ and ↓ (and Home, End) move between steps. Everything renders through text (ARCHITECTURE.md
// section 5.7).

import { useRef, type KeyboardEvent } from 'react'
import type { RunReply } from '../../protocol.ts'
import './derivation.css'

type Result = 'valid' | 'not-valid' | 'unknown' | 'stated' | 'unread'

interface Check {
  readonly q: string
  readonly raw: string | null
  readonly state?: readonly string[] | null
}

interface Step {
  readonly n: number
  readonly text: string
  readonly caption: string | null
  readonly rule: string | null
  readonly result: Result
  readonly error?: string
  readonly checks: readonly Check[]
  readonly rests_on: readonly number[]
  readonly follow_on: readonly number[]
  readonly after_failed: readonly number[]
}

interface HeaderRow {
  readonly kind: 'command' | 'post' | 'claim' | 'given'
  readonly name?: string
  readonly text: string
  readonly error?: string
  readonly read?: readonly string[]
}

interface Board {
  readonly board: 1
  readonly z3: string
  readonly rlimit: number
  readonly header: readonly HeaderRow[]
  readonly steps: readonly Step[]
  readonly notes: readonly string[]
  readonly not_valid: readonly number[]
}

function parseBoard(w: string | null): Board | null {
  if (w === null) return null
  try {
    const v = JSON.parse(w) as Partial<Board>
    return v.board === 1 && Array.isArray(v.steps) && Array.isArray(v.header) ? (v as Board) : null
  } catch {
    return null
  }
}

const n = (x: number): string => x.toLocaleString('en-US')

const WORD: Readonly<Record<Result, string>> = {
  valid: 'valid',
  'not-valid': 'not valid',
  unknown: 'unknown',
  stated: 'stated, not checked',
  unread: 'not read',
}

const HEAD: Readonly<Record<HeaderRow['kind'], string>> = { command: 'Command', post: 'Post', claim: 'Claim', given: 'Given' }

/** The line class a step's result carries (DESIGN.md section 4.1); the classes themselves are product truth. */
function lineClass(s: Step): string {
  if (s.result === 'not-valid' && s.follow_on.length === 0) return 'line-violation'
  if (s.result === 'unknown') return 'line-bounded'
  return ''
}

/** The step's own text, without the rule column the Board shows on its own line. */
const stepText = (s: Step): string => s.text.replace(/\s+rule:.*$/, '')

const lines = (ns: readonly number[]): string => `line${ns.length > 1 ? 's' : ''} ${ns.join(', ')}`

function StepRow({ s, rlimit, tabIndex }: { readonly s: Step; readonly rlimit: number; readonly tabIndex: number }) {
  const raws = s.checks.map((c) => c.raw).filter((r): r is string => r !== null)
  const refuted = s.checks.find((c) => c.raw === 'sat' && c.state !== undefined && c.state !== null)
  const cls = ['dv-step', lineClass(s)].filter((x) => x !== '').join(' ')
  const summary = `Line ${s.n}, ${WORD[s.result]}${s.follow_on.length > 0 ? `, follow-on of ${lines(s.follow_on)}` : ''}`
  return (
    <li className={cls} data-result={s.result} data-follow-on={s.follow_on.length > 0 ? 'true' : undefined} tabIndex={tabIndex} aria-label={summary}>
      <span className="dv-n" aria-hidden="true">
        {s.n}
      </span>
      <div className="dv-main">
        <div className="dv-text" role="region" aria-label={`Line ${s.n} as written`} tabIndex={-1}>
          <code>{stepText(s)}</code>
        </div>
        {s.rule !== null ? <p className="dv-rule">rule: {s.rule}</p> : null}
        <p className="dv-result">
          {raws.length > 0 ? (
            <>
              <span className="dv-label">Z3:</span> <code className="dv-raw">{raws.join(', ')}</code> →{' '}
            </>
          ) : null}
          <strong className="dv-word">{WORD[s.result]}</strong>
          {s.result === 'unknown' ? <span className="dv-bound"> within rlimit {n(rlimit)}</span> : null}
          {s.follow_on.length > 0 ? <span className="dv-follow"> · follow-on of {lines(s.follow_on)}, not counted again</span> : null}
          {s.follow_on.length === 0 && s.after_failed.length > 0 && s.result !== 'not-valid' ? (
            <span className="dv-follow"> · rests on {lines(s.after_failed)}, which did not follow</span>
          ) : null}
        </p>
        {s.error !== undefined ? <p className="dv-why">{s.error}</p> : null}
        {refuted !== undefined && refuted.state !== undefined && refuted.state !== null ? (
          <div className="dv-state">
            <p className="dv-state-head">The state Z3 found ({refuted.q})</p>
            <p className="dv-state-body">
              <code>{refuted.state.join('; ')}</code>
            </p>
          </div>
        ) : null}
        {s.checks.length > 0 ? (
          <ul className="dv-queries" aria-label={`The queries for line ${s.n}`}>
            {s.checks.map((c, i) => (
              <li key={i}>
                {c.q}
                {c.raw !== null ? (
                  <>
                    : <code>{c.raw}</code>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </li>
  )
}

export function DerivationBoard({ reply }: { readonly reply: RunReply }) {
  const board = parseBoard(reply.witness)
  const list = useRef<HTMLOListElement>(null)
  if (board === null) {
    return (
      <div className="dv">
        {reply.output.length > 0 ? (
          <div className="code-block cell-live-out" role="region" aria-label="What the Board printed" tabIndex={0}>
            <pre>{reply.output.map((l) => l.text).join('\n')}</pre>
          </div>
        ) : null}
        <p className="dv-why">{reply.error ?? 'The Board returned no derivation.'}</p>
      </div>
    )
  }
  const counted = board.not_valid.length
  const followOn = board.steps.filter((s) => s.follow_on.length > 0).length
  const checked = board.steps.filter((s) => s.checks.some((c) => c.raw !== null)).length
  const onKey = (e: KeyboardEvent<HTMLOListElement>): void => {
    const items = [...(list.current?.querySelectorAll<HTMLLIElement>(':scope > li') ?? [])]
    const at = items.findIndex((li) => li === document.activeElement)
    const go = (i: number): void => {
      e.preventDefault()
      items[Math.max(0, Math.min(items.length - 1, i))]?.focus()
    }
    if (e.key === 'ArrowDown') go(at < 0 ? 0 : at + 1)
    else if (e.key === 'ArrowUp') go(at < 0 ? 0 : at - 1)
    else if (e.key === 'Home') go(0)
    else if (e.key === 'End') go(items.length - 1)
  }
  return (
    <div className="dv">
      <p className="dv-head">
        Derivation Board · Z3 {board.z3} checked {checked} of {board.steps.length} steps · rlimit {n(board.rlimit)} per query
      </p>
      {board.header.length > 0 ? (
        <dl className="dv-header">
          {board.header.map((h, i) => (
            <div key={i} className={h.kind === 'given' ? 'dv-hrow dv-given line-assumed' : 'dv-hrow'}>
              <dt>{HEAD[h.kind]}</dt>
              <dd>
                <code>{h.text}</code>
                {h.kind === 'given' ? <span className="dv-assumed"> · assumed in every query</span> : null}
                {h.error !== undefined ? <span className="dv-why"> · not read: {h.error}</span> : null}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      <ol className="dv-steps" ref={list} aria-label="The derivation, one step per line; arrow keys move between steps" onKeyDown={onKey}>
        {board.steps.map((s, i) => (
          <StepRow key={`${s.n}-${i}`} s={s} rlimit={board.rlimit} tabIndex={i === 0 ? 0 : -1} />
        ))}
      </ol>
      <p className="dv-tally">
        {counted === 0 ? 'Every checked step follows from what it rests on.' : `${counted} ${counted === 1 ? 'step does' : 'steps do'} not follow: ${lines(board.not_valid)}.`}
        {followOn > 0 ? ` ${followOn} more ${followOn === 1 ? 'fails' : 'fail'} only because an earlier step did (follow-on).` : ''}
      </p>
      {board.notes.length > 0 ? (
        <ul className="dv-notes" aria-label="Lines the Board did not read">
          {board.notes.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
