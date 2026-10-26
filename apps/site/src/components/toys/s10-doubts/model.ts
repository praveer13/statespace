// CL-1.1's doubt log from S10.L7, "Doubts as m of n", and the events the lesson's rules D1, D2, D5, D7 and D8 apply to
// it. Pure and small: the page applies one event, recomputes the log and reads it as m|n, with the n - m others named,
// active ones first. Never a percentage, a sum or a score (D4).

export type Kind = 'rebutting' | 'undermining' | 'undercutting'
export type Status = 'active' | 'retired' | 'accepted'

export interface Doubt {
  readonly id: number
  readonly text: string
  readonly kind: Kind
  readonly status: Status
  /** What settled it, or the note it carries, in words. */
  readonly note: string
  /** Proposed by an AI, labeled as its proposal (D1). */
  readonly proposed?: boolean
  /** Dismissed without a link: the record and the rationale stay, and it is not retired (D8). */
  readonly dismissed?: boolean
}

export const START: readonly Doubt[] = [
  { id: 1, text: 'The premises may contradict each other', kind: 'undercutting', status: 'retired', note: 'Retired by receipt: the premise witness is satisfiable (LAB-1.c3)' },
  { id: 2, text: 'The unsat rests on one solver', kind: 'undermining', status: 'active', note: 'SEAM-7 cracked at ER-7 through SP-4.5' },
  { id: 3, text: 'The recipient can overflow in 64-bit arithmetic', kind: 'undermining', status: 'accepted', note: "Accepted residual, listed under NOT COVERED with CL-1.5's line" },
]

export type EventId = 'cvc5' | 'accept-both' | 'advisory' | 'fixed-receipt' | 'ai-proposes' | 'ai-retires' | 'dismiss'

export interface Event {
  readonly id: EventId
  readonly label: string
}

export const EVENTS: readonly Event[] = [
  { id: 'cvc5', label: "Import the cvc5 cross-check receipt, linked to doubt 2" },
  { id: 'accept-both', label: 'Accept "both solvers could be wrong" with a written rationale' },
  { id: 'advisory', label: 'An advisory lands for the Z3 version the receipt names' },
  { id: 'fixed-receipt', label: 'Link a receipt from a fixed Z3 version to the re-check doubt' },
  { id: 'ai-proposes', label: 'An AI proposes a doubt: "the encoding drops the frame for c"' },
  { id: 'ai-retires', label: 'The AI says its doubt no longer applies' },
  { id: 'dismiss', label: 'Dismiss the newest active doubt with a note, and no link' },
]

export interface Reading {
  readonly m: number
  readonly n: number
  /** The n - m doubts that are not retired, active ones first (D4). */
  readonly others: readonly Doubt[]
  /** D3, as far as this log goes: open while any doubt is active. */
  readonly open: boolean
}

export function read(log: readonly Doubt[]): Reading {
  const m = log.filter((d) => d.status === 'retired').length
  const active = log.filter((d) => d.status === 'active')
  const accepted = log.filter((d) => d.status === 'accepted')
  return { m, n: log.length, others: [...active, ...accepted], open: active.length > 0 }
}

export const say = (r: Reading): string => `${r.m}|${r.n}`

export type Outcome =
  | { readonly ok: true; readonly log: readonly Doubt[]; readonly rule: string; readonly why: string }
  | { readonly ok: false; readonly why: string }

const nextId = (log: readonly Doubt[]): number => log.reduce((a, d) => Math.max(a, d.id), 0) + 1
const find = (log: readonly Doubt[], f: (d: Doubt) => boolean): Doubt | undefined => log.find(f)
const set = (log: readonly Doubt[], id: number, patch: Partial<Doubt>): Doubt[] => log.map((d) => (d.id === id ? { ...d, ...patch } : d))

const BOTH = 'Both solvers could be wrong, and the certificate is incomplete'
const RECHECK = 'An advisory names the Z3 version the receipt ran'
const AI = 'The encoding drops the frame for c'

/** Apply one event to the log under the lesson's rules, or say why it does not apply yet. */
export function apply(log: readonly Doubt[], e: EventId): Outcome {
  switch (e) {
    case 'cvc5': {
      const d2 = find(log, (d) => d.id === 2)
      if (d2 === undefined || d2.status !== 'active') return { ok: false, why: 'Doubt 2 is no longer active, so the receipt has nothing left to answer.' }
      const out = set(log, 2, { status: 'retired', note: 'Retired by the cvc5 receipt: an independent solver gave the same answer', dismissed: false })
      out.push({ id: nextId(log), text: BOTH, kind: 'undermining', status: 'active', note: 'Opened by D5 when the second solver agreed' })
      return { ok: true, log: out, rule: 'D1 and D5', why: 'The linked receipt retires doubt 2 (D1). An agreeing second solver opens a doubt that both could fail together (D5).' }
    }
    case 'accept-both': {
      const d = find(log, (x) => x.text === BOTH)
      if (d === undefined) return { ok: false, why: 'There is no "both solvers could be wrong" doubt yet. Import the cvc5 receipt first.' }
      if (d.status !== 'active') return { ok: false, why: `That doubt is already ${d.status === 'retired' ? 'retired' : 'an accepted residual'}.` }
      return { ok: true, log: set(log, d.id, { status: 'accepted', note: 'Accepted residual, with a written rationale; certificate checking is a deferred drawer (D-32)' }), rule: 'D2', why: 'Accepting a doubt with a written rationale moves it out of active. It is not retired, so m stays the same, and the log still names it.' }
    }
    case 'advisory': {
      if (find(log, (x) => x.text === RECHECK && x.status === 'active') !== undefined) return { ok: false, why: 'The re-check doubt from this advisory is already open.' }
      const out = [...log, { id: nextId(log), text: RECHECK, kind: 'undermining' as const, status: 'active' as const, note: 'Opened by D7: the advisory is newer than the receipt' }]
      return { ok: true, log: out, rule: 'D7', why: 'An advisory newer than a receipt opens a re-check doubt on every claim that cites that tool version. It is active: nothing yet shows the receipt is unaffected.' }
    }
    case 'fixed-receipt': {
      const d = find(log, (x) => x.text === RECHECK && x.status === 'active')
      if (d === undefined) return { ok: false, why: 'No re-check doubt is active, so the new receipt has nothing to retire. An advisory opens one.' }
      return { ok: true, log: set(log, d.id, { status: 'retired', note: 'Retired by a receipt on a fixed version (D7, D1)' }), rule: 'D7 and D1', why: 'A receipt on a fixed version is linked evidence, so it retires the re-check doubt.' }
    }
    case 'ai-proposes': {
      if (find(log, (x) => x.text === AI) !== undefined) return { ok: false, why: 'The AI has already proposed this doubt; it is in the log.' }
      const out = [...log, { id: nextId(log), text: AI, kind: 'undermining' as const, status: 'active' as const, note: "An AI's proposal, labeled as such", proposed: true }]
      return { ok: true, log: out, rule: 'D1', why: 'An AI may propose a doubt, labeled as its proposal. It enters the log as active, like any other.' }
    }
    case 'ai-retires': {
      const d = find(log, (x) => x.proposed === true)
      if (d === undefined) return { ok: false, why: 'The AI has proposed no doubt yet.' }
      return { ok: true, log: log.slice(), rule: 'D1', why: `Nothing changes. An AI never retires a doubt: only a linked specimen, receipt or written argument does, so doubt ${d.id} stays ${d.status === 'active' ? 'active' : d.status === 'accepted' ? 'an accepted residual' : 'retired'}.` }
    }
    case 'dismiss': {
      const active = log.filter((x) => x.status === 'active')
      if (active.length === 0) return { ok: false, why: 'No doubt is active, so there is nothing to dismiss.' }
      const d = active.filter((x) => x.dismissed !== true).at(-1)
      if (d === undefined) return { ok: false, why: 'Every active doubt has already been dismissed with a note. A second note changes nothing; only a link retires one (D1).' }
      return { ok: true, log: set(log, d.id, { dismissed: true, note: `${d.note}; dismissed with a note and no link` }), rule: 'D8', why: `Doubt ${d.id} keeps its record and the note, and counts as retired only under D1, so with no link it stays active and m does not move.` }
    }
  }
}

/**
 * The readings a learner might call before an event: the right one and the two usual slips, without repeats. One slip
 * counts a doubt as retired that is not (accepted, dismissed, or "retired" by an AI); the other drops a doubt from the
 * log (the new one left out, or one deleted). Never a percentage (D4).
 */
export function candidates(log: readonly Doubt[], e: EventId): string[] {
  const out = apply(log, e)
  const before = read(log)
  const right = out.ok ? read(out.log) : before
  const list: string[] = [say(right)]
  if (right.m + 1 <= right.n) list.push(`${right.m + 1}|${right.n}`)
  if (right.n - 1 >= Math.max(right.m, 1)) list.push(`${right.m}|${right.n - 1}`)
  list.push(say(before))
  const uniq = [...new Set(list)]
  // A stable order that does not always put the right reading first: sort by the text itself.
  return uniq.slice(0, 3).sort()
}
