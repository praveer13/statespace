// An interactive for S2.L7: the induction in `runPos_conserves`, unrolled over one run the learner sets up. The page
// runs `runPos` itself and lays the states out as a chain; each step shows the `cons` case's goal, the state its run
// starts from, and the state `ih` is about. With `generalizing s` the hypothesis covers every state, so each step can
// use it at the state the transfer moved to. Without it the hypothesis is pinned to the first state, the goal has moved
// on, and the case stays open. The goals shown are written by this page in the shape of the lesson's replay.

import { useId, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ToyFrame } from '../ToyFrame.tsx'
import { MAX_LEN, allowed, parseAmounts, parseBalance, showLedger, showList, steps, total, trace } from './model.ts'
import type { Ledger, Mode, Step } from './model.ts'
import './generalize.css'

const num = (n: number): string => (n < 0 ? `−${-n}` : String(n))

function Sub({ k }: { readonly k: number }) {
  return (
    <>
      s<sub>{k}</sub>
    </>
  )
}

interface Run {
  readonly s0: Ledger
  readonly ns: readonly number[]
  readonly states: readonly Ledger[]
}

function hypotheses(mode: Mode): string {
  // With `generalizing s`, Lean reverts s, inducts, and reintroduces s after ih; without it, s stays first.
  if (mode === 'generalizing') return ['n : Int', 'ns : List Int', 'ih : ∀ (s : Ledger), total (runPos s ns) = total s', 's : Ledger'].join('\n')
  return ['s : Ledger', 'n : Int', 'ns : List Int', 'ih : total (runPos s ns) = total s'].join('\n')
}

function goalText(step: Step, mode: Mode): string {
  switch (step.kind) {
    case 'statement':
      return '⊢ total (runPos s ns) = total s'
    case 'nil':
      return 'case nil\n⊢ total (runPos s []) = total s'
    case 'cons':
      return `case cons, after unfolding runPos once\n${hypotheses(mode)}\n⊢ total (runPos (transferPos s n) ns) = total s`
  }
}

/** What this step means for this run, in words. */
function explain(step: Step, mode: Mode, run: Run): ReactNode {
  const { ns, states } = run
  const last = states[states.length - 1] as Ledger
  const t0 = total(run.s0)
  switch (step.kind) {
    case 'statement':
      return (
        <>
          <strong>The claim for this run.</strong> Starting from {showLedger(run.s0)} with <code>{showList(ns)}</code>, the run ends at{' '}
          {showLedger(last)}. The total is {num(t0)} at the start and {num(total(last))} at the end. The proof has to show this for every start and every list,
          not only for these numbers.
        </>
      )
    case 'nil':
      return (
        <>
          <strong>The base case closes.</strong> The list is used up at <Sub k={step.at} /> = {showLedger(states[step.at] as Ledger)}.{' '}
          <code>runPos s []</code> is <code>s</code>, so both sides are the same total and <code>rfl</code> closes it.
          {mode === 'generalizing'
            ? ' Every step of the run is covered.'
            : ns.length === 0
              ? ' With an empty list there is no cons step, so nothing goes wrong yet. Add an amount to see where this header stops.'
              : ''}
        </>
      )
    case 'cons': {
      const n = ns[step.at] as number
      const rest = ns.slice(step.at + 1)
      const from = states[step.at] as Ledger
      const to = states[step.at + 1] as Ledger
      const moved = allowed(from, n)
      if (step.closes)
        return (
          <>
            <strong>
              Step {step.at + 1}: the case closes at <Sub k={step.ihAt} />.
            </strong>{' '}
            Here <code>s</code> is {showLedger(from)}, <code>n</code> is {num(n)} and <code>ns</code> is <code>{showList(rest)}</code>. The
            transfer {moved ? `moves ${num(n)}` : 'is rejected and returns the same state'}, so the run carries on from{' '}
            <code>transferPos s n</code> = {showLedger(to)}. Because <code>ih</code> says <code>{'∀ s'}</code>, it can be used at that
            state: total {num(total(to))} at the end. Then <code>transferPos_conserves</code> takes {num(total(to))} back to {num(total(from))}.
          </>
        )
      return (
        <>
          <strong>Step 1: the case stays open.</strong> <code>ih</code> is about a run from <code>s</code> = {showLedger(from)}. The goal
          is about a run from <code>transferPos s n</code>, which here is {showLedger(to)}. Nothing in <code>ih</code> matches, so it has
          nothing to rewrite.
          {moved
            ? ''
            : ` The first transfer happens to be rejected, so the two states hold the same numbers. The proof still stops: n is a variable there, and the case has to work for every amount, not for ${num(n)}.`}{' '}
          The theorem is true; the hypothesis is too narrow.
        </>
      )
    }
  }
}

function stepLabel(step: Step): string {
  if (step.kind === 'statement') return 'the claim'
  if (step.kind === 'nil') return 'the base case'
  return `step ${step.at + 1}`
}

export default function GeneralizeStepper() {
  const uid = useId().replace(/[^a-zA-Z0-9-]/g, '')
  const [aText, setA] = useState('10')
  const [bText, setB] = useState('0')
  const [nsText, setNs] = useState('3, 0, 4, 9')
  const [mode, setMode] = useState<Mode>('generalizing')
  const [run, setRun] = useState<Run>(() => {
    const s0 = { a: 10, b: 0 }
    const ns = [3, 0, 4, 9]
    return { s0, ns, states: trace(s0, ns) }
  })
  const [at, setAt] = useState(0)
  const [note, setNote] = useState<string | null>(null)

  const all = useMemo(() => steps(mode, run.ns.length), [mode, run.ns.length])
  const i = Math.min(at, all.length - 1)
  const step = all[i] as Step

  const a = parseBalance(aText)
  const b = parseBalance(bText)
  const ns = parseAmounts(nsText)

  const apply = (): void => {
    if (a === null || b === null || ns === null) {
      setNote(`Balances are whole numbers from −99 to 99, and the list holds up to ${MAX_LEN} of them, separated by commas.`)
      return
    }
    const s0 = { a, b }
    setRun({ s0, ns, states: trace(s0, ns) })
    setAt(0)
    setNote(null)
  }

  const go = (d: number): void => {
    setNote(null)
    setAt(Math.max(0, Math.min(all.length - 1, i + d)))
  }

  // Which state each mark sits on at this step.
  const goalAt = step.kind === 'statement' ? 0 : step.kind === 'nil' ? step.at : step.at
  const ihAt = step.kind === 'cons' ? step.ihAt : null
  const movedTo = step.kind === 'cons' ? step.goalAt : null
  const stuck = step.kind === 'cons' && !step.closes

  const chainLabel =
    `The run's states: ${run.states.map((s, k) => `s${k} ${showLedger(s)}`).join(', ')}. ` +
    (step.kind === 'cons'
      ? stuck
        ? `The goal's run now starts from s${movedTo}; ih is about s${ihAt}.`
        : `The goal starts from s${goalAt}; ih is used at s${ihAt}.`
      : `The goal starts from s${goalAt}.`)

  return (
    <ToyFrame
      title="Which state does ih talk about?"
      caption={
        <>
          This page runs <code>runPos</code> on your numbers and writes each goal in the shape of the lesson&apos;s replay; no Lean runs
          here. The chain unrolls one <code>cons</code> case over the run: in the proof it is a single case with a variable{' '}
          <code>s</code>, used once per step.
        </>
      }
    >
      <p className="toy-goal">
        Goal: step through the induction and see where <code>ih</code> applies. Then take <code>generalizing s</code> away.
      </p>

      <form
        className="toy-controls"
        onSubmit={(e) => {
          e.preventDefault()
          apply()
        }}
      >
        <label className="toy-field">
          <span className="toy-field-name">Sender, a</span>
          <input className="toy-number" inputMode="numeric" value={aText} aria-invalid={a === null} onChange={(e) => setA(e.target.value)} />
        </label>
        <label className="toy-field">
          <span className="toy-field-name">Recipient, b</span>
          <input className="toy-number" inputMode="numeric" value={bText} aria-invalid={b === null} onChange={(e) => setB(e.target.value)} />
        </label>
        <label className="toy-field tg-list-field">
          <span className="toy-field-name">Amounts, ns</span>
          <input className="toy-number tg-list" value={nsText} aria-invalid={ns === null} aria-describedby={`${uid}-nshint`} onChange={(e) => setNs(e.target.value)} />
          <span id={`${uid}-nshint`} className="tg-hint">
            up to {MAX_LEN}, separated by commas
          </span>
        </label>
        <div className="toy-actions">
          <button type="submit" className="toy-button">
            Run these
          </button>
        </div>
      </form>

      <fieldset className="toy-choice tg-mode">
        <legend>The proof&apos;s header</legend>
        <label>
          <input type="radio" name={`${uid}-mode`} checked={mode === 'generalizing'} onChange={() => { setNote(null); setMode('generalizing') }} />
          <code>induction ns generalizing s with</code>
        </label>
        <label>
          <input type="radio" name={`${uid}-mode`} checked={mode === 'fixed'} onChange={() => { setNote(null); setMode('fixed') }} />
          <code>induction ns with</code>
        </label>
      </fieldset>

      <ol className="tg-chain" role="img" aria-label={chainLabel}>
        {run.states.map((s, k) => {
          const n = k > 0 ? (run.ns[k - 1] as number) : null
          const prev = k > 0 ? (run.states[k - 1] as Ledger) : null
          const isGoal = step.kind !== 'cons' && k === goalAt
          const isFrom = step.kind === 'cons' && !stuck && k === goalAt
          const isIh = k === ihAt
          const isMoved = stuck && k === movedTo
          return (
            <li key={k} className="tg-item" aria-hidden="true">
              {n !== null && prev !== null ? (
                <span className="tg-arrow" data-moved={allowed(prev, n)}>
                  <span className="tg-amt">{num(n)}</span>
                  <span className="tg-what">{allowed(prev, n) ? 'moved' : 'rejected'}</span>
                </span>
              ) : null}
              <span className="tg-state" data-goal={isGoal || isFrom} data-ih={isIh} data-moved-goal={isMoved}>
                <span className="tg-name">
                  <Sub k={k} />
                </span>
                <span className="tg-bal">{showLedger(s)}</span>
                <span className="tg-total">total {num(total(s))}</span>
                {isGoal || isFrom ? (
                  <span key={`g${i}`} className="tg-tag toy-land">
                    goal starts here
                  </span>
                ) : null}
                {isMoved ? (
                  <span key={`m${i}`} className="tg-tag toy-land">
                    goal&apos;s run starts here
                  </span>
                ) : null}
                {isIh ? (
                  <span key={`i${i}`} className="tg-tag tg-tag-ih toy-land">
                    {stuck ? 'ih is about this state' : 'ih used here'}
                  </span>
                ) : null}
              </span>
            </li>
          )
        })}
      </ol>

      <pre className="tg-goal" aria-label={`The goal at ${stepLabel(step)}`}>
        <code>{goalText(step, mode)}</code>
      </pre>

      <div className="toy-actions tg-steps">
        <button type="button" className="toy-button" onClick={() => go(-1)} disabled={i === 0}>
          Back
        </button>
        <button type="button" className="toy-button" data-primary="true" onClick={() => go(1)} disabled={i === all.length - 1}>
          Next step
        </button>
        <span className="tg-count">
          {stepLabel(step)}, {i + 1} of {all.length}
        </span>
      </div>

      <p className="toy-status" aria-live="polite">
        {note !== null ? (
          <>
            <strong>Not run.</strong> {note}
          </>
        ) : (
          explain(step, mode, run)
        )}
      </p>
    </ToyFrame>
  )
}
