// The keep/kill experiment seed in the event log (keep/kill rules, common.experiment_seed; spine section 12,
// item 58). expSeed is one uint32 drawn once from the platform's cryptographic random source when the
// comparisons are turned on in SCR-settings, before the first event is written, and stored with the instant
// it was drawn and the SHA-256 of the rules file. It is never redrawn and travels in the log's export. When a
// merge meets a different draw, the one drawn first governs (on equal instants, the smaller value); the
// order and the merge are in log.ts.
//
// Pure: no DOM, storage or network. The app draws the random value and passes it in.

import { LedgerError } from './canonical.ts'
import type { ExpSeedDraw } from './event.ts'
import { normalizeExpSeedDraw } from './event.ts'
import { RULES_SHA256 } from './keepkill/rules.ts'
import type { Log } from './log.ts'
import { stampTime } from './time.ts'

export { RULES_SHA256 }

/** Why a draw is refused: one exists already (never redrawn), or events exist (the switch comes before the first event). */
export type DrawRefusal = 'already-drawn' | 'events-exist'

/** Whether the log may take a draw now. */
export function canDrawExpSeed(log: Log): { ok: true } | { ok: false; reason: DrawRefusal } {
  if (log.expSeeds.length > 0) return { ok: false, reason: 'already-drawn' }
  if (log.events.size > 0) return { ok: false, reason: 'events-exist' }
  return { ok: true }
}

export interface DrawInput {
  /** A uint32 from the platform's cryptographic random source (crypto.getRandomValues). */
  readonly expSeed: number
  readonly nowMs: number
  /** Minutes east of UTC at nowMs. */
  readonly tz: number
  readonly dev: string
  /** The rules' SHA-256; the snapshot's by default. */
  readonly rulesSha256?: string
}

/** A validated draw, stamped from the injected clock. Throws a LedgerError when it is not a valid draw. */
export function createExpSeedDraw(input: DrawInput): ExpSeedDraw {
  const { at } = stampTime(input.nowMs, input.tz)
  return normalizeExpSeedDraw({ expSeed: input.expSeed, drawnAt: at, rulesSha256: input.rulesSha256 ?? RULES_SHA256, dev: input.dev })
}

/** A draw for this log, or a LedgerError saying why the log refuses one. */
export function drawFor(log: Log, input: DrawInput): ExpSeedDraw {
  const verdict = canDrawExpSeed(log)
  if (!verdict.ok) {
    throw new LedgerError(
      'refused',
      verdict.reason === 'already-drawn' ? 'expSeed is never redrawn: the log holds a draw already' : 'the comparisons can be turned on only before the first event is written',
    )
  }
  return createExpSeedDraw(input)
}
