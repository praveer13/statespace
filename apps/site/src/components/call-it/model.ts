// The sheet's logic without the DOM: what a draft needs before it can be committed, how it is graded, and a session that
// freezes the moment the log holds the call. Pure, so the rules (verdict, then confidence, then the action; nothing changes
// after the call) are held by tests in Node, and the browser tests check that the markup follows them.

import type { Confidence, CallDraft } from '@statespace/learner/mirror'
import { isConfidence } from '@statespace/learner/mirror'
import type { LedgerEvent } from '@statespace/ledger'
import { shapeOf } from './types.ts'
import type { CallItem, Draft, RecordedCall } from './types.ts'

export const EMPTY_DRAFT: Draft = Object.freeze({ picked: null, answers: Object.freeze({}), conf: null, help: false })

export type DraftAction =
  | { readonly t: 'pick'; readonly id: string }
  | { readonly t: 'mark'; readonly id: string; readonly value: boolean }
  | { readonly t: 'conf'; readonly conf: Confidence }
  | { readonly t: 'help'; readonly on: boolean }

/** The draft after one tap. An id the item does not offer changes nothing. */
export function reduceDraft(draft: Draft, action: DraftAction, item: CallItem): Draft {
  switch (action.t) {
    case 'pick':
      return item.form === 'choice' && item.options.some((o) => o.id === action.id) ? { ...draft, picked: action.id } : draft
    case 'mark':
      return item.form === 'set' && item.statements.some((s) => s.id === action.id) ? { ...draft, answers: { ...draft.answers, [action.id]: action.value } } : draft
    case 'conf':
      return isConfidence(action.conf) ? { ...draft, conf: action.conf } : draft
    case 'help':
      return { ...draft, help: action.on === true }
  }
}

/** The verdict is complete: an option is picked, or every statement of the set is marked. */
export function answered(item: CallItem, draft: Draft): boolean {
  if (item.form === 'choice') return draft.picked !== null && item.options.some((o) => o.id === draft.picked)
  return item.statements.every((s) => typeof draft.answers[s.id] === 'boolean')
}

/** The action may be taken: a verdict and a confidence, in that order of appearance (DESIGN.md section 6.2). */
export function ready(item: CallItem, draft: Draft): boolean {
  return answered(item, draft) && draft.conf !== null
}

export interface Graded {
  readonly ok: boolean
  readonly resp: { readonly picked: string } | { readonly answers: Readonly<Record<string, boolean>> }
  /**
   * The misconception key the response matched. For a choice, the picked option's key; for a set, the key of the first wrong
   * statement that carries one (a wrong answer on a statement with no key, a true statement as a rule, never hides a key further
   * down). The event has room for one key, and `resp.answers` keeps every statement's mark, so a reader can still tell which
   * others were held.
   */
  readonly mis?: string
}

/** Grade a complete draft against the item's key. A set is right only when every statement is (spine section 8.5). */
export function grade(item: CallItem, draft: Draft): Graded {
  if (item.form === 'choice') {
    const picked = draft.picked as string
    const option = item.options.find((o) => o.id === picked)
    const ok = picked === item.key
    return { ok, resp: { picked }, ...(ok || option?.mis === undefined ? {} : { mis: option.mis }) }
  }
  const answers: Record<string, boolean> = {}
  for (const s of item.statements) answers[s.id] = draft.answers[s.id] as boolean
  const wrong = item.statements.filter((s) => answers[s.id] !== s.truth)
  const mis = wrong.map((s) => s.mis).find((key): key is string => key !== undefined)
  return { ok: wrong.length === 0, resp: { answers }, ...(mis === undefined ? {} : { mis }) }
}

/** The call to plan: the committed draft, graded, with the item's shape, tag and time on task. */
export function callDraftOf(item: CallItem, draft: Draft, ms: number): CallDraft {
  const g = grade(item, draft)
  return {
    identity: item.identity,
    conf: draft.conf as Confidence,
    resp: g.resp,
    ok: g.ok,
    ...(g.mis === undefined ? {} : { mis: g.mis }),
    provenance: draft.help ? 'assisted' : 'own',
    shape: shapeOf(item),
    ...(item.kc === undefined ? {} : { kc: item.kc }),
    ms,
    ...(item.rev === undefined ? {} : { itemRev: item.rev }),
    ...(item.engine === undefined ? {} : { engine: item.engine }),
    ...(item.extra === undefined ? {} : { extra: item.extra }),
  }
}

/** A call event reduced to what the sheet shows; undefined when the event is not a call. */
export function recordedFrom(e: LedgerEvent): RecordedCall | undefined {
  if (!isConfidence(e.conf)) return undefined
  const resp = e.resp as { picked?: unknown; answers?: unknown } | undefined
  const picked = typeof resp?.picked === 'string' ? resp.picked : null
  const raw = resp?.answers
  const answers =
    typeof raw === 'object' && raw !== null && !Array.isArray(raw) && Object.values(raw).every((v) => typeof v === 'boolean') ? (raw as Record<string, boolean>) : null
  return { id: e.id, conf: e.conf, ok: typeof e.ok === 'boolean' ? e.ok : null, picked, answers, provenance: e.provenance }
}

export type Phase = 'choosing' | 'committing' | 'recorded'

export interface Session {
  readonly phase: Phase
  readonly draft: Draft
  readonly recorded: RecordedCall | null
  /** What the learner should be told: a call made elsewhere stands, or a call could not be saved. */
  readonly notice: { readonly kind: 'elsewhere' } | { readonly kind: 'failed'; readonly message: string } | null
}

export type SessionAction =
  | DraftAction
  | { readonly t: 'commit' }
  | { readonly t: 'recorded'; readonly call: RecordedCall; readonly mine: boolean }
  | { readonly t: 'failed'; readonly message: string }
  /** The log was read again: the call that counts is this one, or none was found. */
  | { readonly t: 'log'; readonly call: RecordedCall | null }

export const initialSession = (recorded: RecordedCall | null = null): Session => ({ phase: recorded === null ? 'choosing' : 'recorded', draft: EMPTY_DRAFT, recorded, notice: null })

/**
 * One step of a session. Once the log holds the call, nothing the learner does changes it: taps, the help box and a second
 * commit are ignored, and the only thing that moves the record is the log itself (the call that counts, by fold order).
 */
export function reduceSession(s: Session, a: SessionAction, item: CallItem): Session {
  switch (a.t) {
    case 'pick':
    case 'mark':
    case 'conf':
    case 'help':
      return s.phase === 'choosing' ? { ...s, draft: reduceDraft(s.draft, a, item), notice: null } : s
    case 'commit':
      return s.phase === 'choosing' && ready(item, s.draft) ? { ...s, phase: 'committing', notice: null } : s
    case 'recorded':
      return { ...s, phase: 'recorded', recorded: a.call, notice: a.mine ? null : { kind: 'elsewhere' } }
    case 'failed':
      return s.phase === 'committing' ? { ...s, phase: 'choosing', notice: { kind: 'failed', message: a.message } } : s
    case 'log':
      // A read of the log that finds no call never reopens the sheet: it may be older than the call just written, and a reset
      // clears the page's record only when the page is loaded again. A read that finds a call makes it the one on show.
      return a.call === null ? s : { ...s, phase: 'recorded', recorded: a.call }
  }
}
