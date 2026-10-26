// The Call It sheet (M-call-it; spine section 8.5; DESIGN.md sections 6.2 and 6.3): commit a verdict and a confidence before a
// first run. Three taps with their bands printed (guess, below 67%; think so, 67 to 80%; sure, above 80%), the item's chance
// level beside them, and the payoffs shown before the tap as feedback only. The first call is final: once the log holds it,
// the whole fieldset is disabled, taps and the help box change nothing, and the only way the record changes is the log itself.
//
// A fieldset of native radios, in turn: the answer, then how likely it is right, then the action (DESIGN.md section 10.3).
// The sheet writes nothing itself: `onCommit` does (see CallItCell), and returns the call that now stands.

import { useEffect, useId, useReducer, useRef } from 'react'
import type { RefObject } from 'react'
import type { CallDraft } from '@statespace/learner/mirror'
import { BANDS, CONFIDENCES, chanceLine, payoffOf } from '@statespace/learner/mirror'
import type { Confidence } from '@statespace/learner/mirror'
import '../../styles/tokens.css'
import './call-it.css'
import { COPY } from './copy.ts'
import { Inline, plainText } from './inline.tsx'
import { answered, callDraftOf, initialSession, ready, reduceSession } from './model.ts'
import type { Session, SessionAction } from './model.ts'
import type { CallItem, CallOption, CallStatement, Draft, RecordedCall } from './types.ts'
import { shapeOf } from './types.ts'

/** What `onCommit` answers: the call that stands, whether this one or an earlier one, or why nothing was recorded. */
export type CommitOutcome =
  | { readonly status: 'recorded'; readonly call: RecordedCall }
  | { readonly status: 'already'; readonly call: RecordedCall }
  | { readonly status: 'refused'; readonly message: string }

export interface CallItProps {
  readonly item: CallItem
  /** The call that counts for this question, from the log, or undefined while it has not been called. */
  readonly recorded?: RecordedCall | undefined
  /** Writes the call and answers with the one that stands. Called once per commit; the sheet never calls it twice for a question. */
  readonly onCommit: (draft: CallDraft) => Promise<CommitOutcome>
  /** After the call is recorded (not for a call made earlier): the host's run starts here. */
  readonly onCommitted?: (call: RecordedCall, status: 'recorded' | 'already') => void
  /** The action's words. A cell says what it will do: "Run Z3 here". */
  readonly actionLabel?: string
  /** Show the result: matched or missed, the payoff and the whys. The host turns it on after the run, or at once for an item with no run. */
  readonly revealed?: boolean
  /** `sheet` docks the fieldset at the bottom of its cell on phones (DESIGN.md section 6.2); `inline` is the flow layout. */
  readonly layout?: 'inline' | 'sheet'
  /** The expert skip, once the KC is solid: a call on this cell is not asked, and nothing is recorded. */
  readonly skip?: { readonly onSkip: () => void }
  /** The "I had help with this call" box. Default on. */
  readonly helpToggle?: boolean
  /** A millisecond clock for time on task. */
  readonly clock?: () => number
}

const systemNow = (): number => globalThis.performance?.now() ?? 0

/**
 * While the action bar is docked (layout "sheet", on a phone), the page reserves its height as scroll padding (call-it.css), so
 * the browser never scrolls a focused control under it (WCAG 2.4.11; DESIGN.md section 6.2). The height is the bar's own, measured.
 * Only the bar docks, never the question: the bar is the action alone, the same height in every state (the help box and the
 * reason the action is off stay in the flow above it), so nothing moves under the learner's finger, and nothing inside the sheet
 * scrolls.
 */
function useDockHeight(root: RefObject<HTMLDivElement | null>, docked: boolean): void {
  useEffect(() => {
    const bar = root.current?.querySelector<HTMLElement>('.ci-actions') ?? null
    if (!docked || bar === null || typeof ResizeObserver === 'undefined') return
    const style = document.documentElement.style
    const set = (): void => style.setProperty('--ci-dock-height', `${Math.ceil(bar.getBoundingClientRect().height)}px`)
    set()
    const watch = new ResizeObserver(set)
    watch.observe(bar)
    return () => {
      watch.disconnect()
      style.removeProperty('--ci-dock-height')
    }
  }, [root, docked])
}

/** What the read-only fieldset shows once the call is on record. */
function draftOfRecorded(r: RecordedCall): Draft {
  return { picked: r.picked, answers: r.answers ?? {}, conf: r.conf, help: r.provenance === 'assisted' }
}

/** The sheet for one question. Given another question it starts again: nothing of the last question's taps or call stays on it. */
export function CallIt(props: CallItProps) {
  return <CallItSheet key={`${props.item.identity.ref}#${props.item.identity.seed ?? ''}`} {...props} />
}

function CallItSheet({ item, recorded, onCommit, onCommitted, actionLabel = COPY.action, revealed = false, layout = 'inline', skip, helpToggle = true, clock = systemNow }: CallItProps) {
  const uid = useId()
  const [session, dispatch] = useReducer((s: Session, a: SessionAction) => reduceSession(s, a, item), recorded ?? null, initialSession)
  const shownAt = useRef<number>(clock())
  const inflight = useRef(false)
  const root = useRef<HTMLDivElement>(null)
  useDockHeight(root, layout === 'sheet' && session.phase !== 'recorded')
  // The log is read again (a call from another tab arrives, the page finishes loading): the call that counts is the one shown.
  useEffect(() => {
    if (recorded !== undefined) dispatch({ t: 'log', call: recorded })
  }, [recorded])

  const frozen = session.phase !== 'choosing'
  const shape = shapeOf(item)
  const standing = session.recorded
  const view: Draft = session.phase === 'recorded' && standing !== null ? draftOfRecorded(standing) : session.draft
  const done = answered(item, view)
  const go = ready(item, session.draft)

  const commit = async (): Promise<void> => {
    if (inflight.current || session.phase !== 'choosing' || !go) return
    inflight.current = true
    dispatch({ t: 'commit' })
    let outcome: CommitOutcome
    try {
      outcome = await onCommit(callDraftOf(item, session.draft, Math.max(0, clock() - shownAt.current)))
    } catch (e) {
      outcome = { status: 'refused', message: e instanceof Error ? e.message : String(e) }
    }
    if (outcome.status === 'refused') dispatch({ t: 'failed', message: outcome.message })
    else {
      dispatch({ t: 'recorded', call: outcome.call, mine: outcome.status === 'recorded' })
      onCommitted?.(outcome.call, outcome.status)
    }
    inflight.current = false
  }

  const need = item.form === 'set' ? (done ? COPY.needConfidence : COPY.needAllStatements) : done ? COPY.needConfidence : COPY.needAnswer
  const ok = standing?.ok ?? null
  const payoff = standing !== null && ok !== null ? payoffOf(standing.conf, ok) : null

  return (
    <div ref={root} className="ci" data-state={session.phase} data-layout={layout} data-form={item.form}>
      <fieldset className="ci-fieldset" disabled={frozen}>
        <legend className="ci-legend">
          <span className="ci-label">{COPY.label}</span> <span className="ci-rule">{COPY.rule}</span>
        </legend>

        {item.stem !== undefined ? (
          <p className="ci-stem">
            <Inline text={item.stem} />
          </p>
        ) : null}

        {item.form === 'choice' ? (
          <fieldset className="ci-group">
            <legend className="ci-prompt">
              <Inline text={item.prompt} />
            </legend>
            <div className="ci-options">
              {item.options.map((o) => (
                <Option key={o.id} option={o} name={`${uid}-v`} checked={view.picked === o.id} onPick={() => dispatch({ t: 'pick', id: o.id })} />
              ))}
            </div>
          </fieldset>
        ) : (
          <div className="ci-group">
            <p className="ci-prompt">
              <Inline text={item.prompt} />
            </p>
            <ul className="ci-rows">
              {item.statements.map((s) => (
                <li key={s.id}>
                  <Row statement={s} name={`${uid}-s-${s.id}`} value={view.answers[s.id]} onMark={(value) => dispatch({ t: 'mark', id: s.id, value })} />
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="ci-chance">{chanceLine(shape)}</p>
        {item.bound !== undefined ? <p className="ci-bound">{COPY.bound(item.bound.replace(/[.\s]+$/, ''))}</p> : null}

        {done ? (
          <fieldset className="ci-group ci-conf">
            <legend className="ci-prompt">{COPY.howLikely}</legend>
            <div className="ci-taps">
              {CONFIDENCES.map((c) => (
                <Tap key={c} conf={c} name={`${uid}-c`} checked={view.conf === c} onTap={() => dispatch({ t: 'conf', conf: c })} />
              ))}
            </div>
            <p className="ci-payoffs">{COPY.payoffs}</p>
          </fieldset>
        ) : null}

      </fieldset>

      {session.phase !== 'recorded' ? (
        <>
          {helpToggle ? (
            <div className="ci-helpblock">
              <label className="ci-help">
                <input type="checkbox" checked={session.draft.help} disabled={frozen} onChange={(e) => dispatch({ t: 'help', on: e.currentTarget.checked })} aria-describedby={`${uid}-help`} />
                <span>{COPY.help}</span>
              </label>
              <p id={`${uid}-help`} className="ci-note">
                {COPY.helpHint}
              </p>
            </div>
          ) : null}
          {!go ? (
            <p id={`${uid}-need`} className="ci-need">
              {need}
            </p>
          ) : null}
          <div className="ci-actions">
            <button type="button" className="ci-action" disabled={!go || frozen} aria-describedby={go ? undefined : `${uid}-need`} onClick={() => void commit()}>
              {actionLabel}
            </button>
          </div>
        </>
      ) : null}

      {skip !== undefined && session.phase === 'choosing' ? (
        <button type="button" className="ci-skip" onClick={skip.onSkip}>
          {COPY.skip}
        </button>
      ) : null}

      <div className="ci-record" role="status" aria-live="polite">
        {session.phase === 'committing' ? <p>{COPY.saving}</p> : null}
        {session.notice?.kind === 'failed' ? <p className="ci-error">{COPY.failed(session.notice.message)}</p> : null}
        {session.notice?.kind === 'elsewhere' ? <p>{COPY.elsewhere}</p> : null}
        {session.phase === 'recorded' && standing !== null ? <Record item={item} call={standing} revealed={revealed} payoff={payoff} /> : null}
      </div>
    </div>
  )
}

function Option({ option, name, checked, onPick }: { readonly option: CallOption; readonly name: string; readonly checked: boolean; readonly onPick: () => void }) {
  return (
    <label className="ci-option">
      <input type="radio" name={name} value={option.id} checked={checked} onChange={onPick} />
      <span className="ci-opt-id">{option.id}</span>
      <span className="ci-opt-text">
        <Inline text={option.text} />
      </span>
    </label>
  )
}

function Row({ statement, name, value, onMark }: { readonly statement: CallStatement; readonly name: string; readonly value: boolean | undefined; readonly onMark: (v: boolean) => void }) {
  return (
    <fieldset className="ci-row">
      <legend className="ci-statement">
        <span className="ci-opt-id">{statement.id}</span> <Inline text={statement.text} />
      </legend>
      <div className="ci-tf">
        <label className="ci-tf-option">
          <input type="radio" name={name} value="true" checked={value === true} onChange={() => onMark(true)} />
          <span>{COPY.trueWord}</span>
        </label>
        <label className="ci-tf-option">
          <input type="radio" name={name} value="false" checked={value === false} onChange={() => onMark(false)} />
          <span>{COPY.falseWord}</span>
        </label>
      </div>
    </fieldset>
  )
}

function Tap({ conf, name, checked, onTap }: { readonly conf: Confidence; readonly name: string; readonly checked: boolean; readonly onTap: () => void }) {
  const band = BANDS[conf]
  return (
    <label className="ci-tap">
      <input type="radio" name={name} value={conf} checked={checked} onChange={onTap} />
      <span className="ci-tap-word">{band.tap}</span>
      <span className="ci-tap-band">{band.printed}</span>
    </label>
  )
}

/** The answer in words: the picked option, or the count of statements for a set. */
function answerText(item: CallItem, call: RecordedCall): string {
  if (item.form === 'set') return COPY.setSummary(item.statements.length)
  const o = item.options.find((x) => x.id === call.picked)
  return o === undefined ? (call.picked ?? '') : `${o.id}. ${plainText(o.text)}`
}

function Record({ item, call, revealed, payoff }: { readonly item: CallItem; readonly call: RecordedCall; readonly revealed: boolean; readonly payoff: number | null }) {
  const tap = BANDS[call.conf].tap
  const verdict = revealed && call.ok !== null ? (call.ok ? COPY.matched : COPY.missed) : null
  return (
    <div className="ci-recorded">
      <p className="ci-line">
        {verdict !== null ? (
          <>
            <strong>{verdict}</strong>{' '}
          </>
        ) : null}
        {COPY.recorded(answerText(item, call), tap)}
        {revealed && payoff !== null ? <span className="ci-payoff"> {COPY.payoff(payoff)}</span> : null}
        {call.provenance === 'assisted' ? <span className="ci-note"> {COPY.withHelp}</span> : null}
      </p>
      {revealed ? <Why item={item} call={call} /> : null}
    </div>
  )
}

function Why({ item, call }: { readonly item: CallItem; readonly call: RecordedCall }) {
  if (item.form === 'choice') {
    const picked = item.options.find((o) => o.id === call.picked)
    const key = item.options.find((o) => o.id === item.key)
    return (
      <div className="ci-why">
        {picked !== undefined ? (
          <p>
            <span className="ci-why-label">{COPY.whyYours}</span> <Inline text={picked.why} />
          </p>
        ) : null}
        {key !== undefined && key.id !== picked?.id ? (
          <>
            <p>
              <span className="ci-why-label">{COPY.answerWas}</span> {key.id}. <Inline text={key.text} />
            </p>
            <p>
              <span className="ci-why-label">{COPY.whyKey}</span> <Inline text={key.why} />
            </p>
          </>
        ) : null}
      </div>
    )
  }
  const answers = call.answers ?? {}
  return (
    <ul className="ci-why ci-why-rows">
      {item.statements.map((s) => {
        const said = answers[s.id]
        return (
          <li key={s.id}>
            <span className="ci-why-label">{COPY.yourStatement(s.id, said === undefined ? 'nothing' : said ? 'true' : 'false', s.truth ? 'true' : 'false')}</span> <Inline text={s.why} />
          </li>
        )
      })}
    </ul>
  )
}
