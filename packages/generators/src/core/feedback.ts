// M-layered-feedback (spine section 7; ASSESSMENT.md section 4.1, Feedback layers; DESIGN.md section 6.2):
//
//   layer 1  the verdict, the witness, the bound and the basis, always (an empty field shows a dash);
//   layer 2  the misconception note, open by default only in novice KCs (expertise reversal); a sure miss opens
//            it whatever the KC's treatment (ASSESSMENT.md section 5.7);
//   layer 3  after two misses on one misconception tag, the refutation card (M-refutation-card, whose cards
//            W2-T17 writes; this module only says when one is due).
//
// A probe is one shot: nothing shows until the whole item is submitted (spine section 8.4).
//
// The mechanic reads its keep/kill arm, comparison 1 (keepkill.ts): for an entered unit's practice items the arm
// sets the note's default state, except that a novice KC that is not solid keeps its note open in both arms (the
// comparison's safeguard). When the arm says "collapsed" and a sure miss opens the note anyway, the item records
// the arm with a fallback, so the read counts it as a deviation rather than hiding it (see the README).
//
// Pure: no DOM, storage or network.

import { COPY } from './copy.ts'
import { armRecord, NOTE_COMPARISON } from './keepkill.ts'
import type { ArmReading, ArmRecord } from './keepkill.ts'
import type { Grade, Json, MisconceptionKey, Mode, WitnessClass } from './types.ts'

/** A KC's scaffolding treatment as its stage spec declares it (spine section 2.1); none declared reads as novice. */
export type Treatment = 'novice' | 'expert'

export interface FeedbackContext {
  readonly mode: Mode
  /** True once the whole item is submitted. A probe shows nothing before; practice may show a part's feedback as it goes. */
  readonly final: boolean
  /** The primary KC's treatment; undefined means none declared, which reads as novice. */
  readonly treatment?: Treatment
  /** The call's confidence tap, when a call was asked. */
  readonly confidence?: 'guess' | 'think' | 'sure'
  /** Comparison 1's reading for the primary KC (readArm), when the caller has one. */
  readonly arm?: ArmReading
  /** Whether the primary KC is solid now (ASSESSMENT.md section 3.3); the safeguard keeps a non-solid novice KC's note open. */
  readonly solid?: boolean
  /** Misses on this grade's misconception tag before this one (M-refutation-card's trigger). */
  readonly priorMissesOnTag?: number
}

export interface Layer1 {
  readonly verdict: 'matched' | 'missed' | 'not graded'
  /** The grade's sentence. */
  readonly text: string
  /** The witness, or null when the verdict has none (shown as a dash). */
  readonly witness: Json | null
  /** The witness's class, shown in practice and after a probe (M-class-hint). */
  readonly class: WitnessClass | null
  /** The bound, or a dash when the check is exact (I10). */
  readonly bound: string
  /** What the verdict rests on. */
  readonly basis: string
  /** Why the answer is the key, after a match; null otherwise. */
  readonly explanation: string | null
}

export type Layer2Reason = 'novice' | 'expert' | 'safeguard' | 'arm' | 'sure-miss'

export interface Layer2 {
  readonly tag: MisconceptionKey
  readonly note: string
  readonly open: boolean
  /** What set the default state: the treatment, the comparison's safeguard, the arm, or a sure miss. */
  readonly reason: Layer2Reason
}

export interface Layer3 {
  readonly tag: MisconceptionKey
  /** Misses on the tag, this one included. */
  readonly misses: number
}

export interface LayeredFeedback {
  /** False for a probe before its final submission: nothing may show. */
  readonly shown: boolean
  readonly layer1: Layer1 | null
  readonly layer2: Layer2 | null
  readonly layer3: Layer3 | null
  /** The arm record the item's event carries in data.keepkill, when comparison 1 governed the note. */
  readonly armRecord: ArmRecord | null
}

const HIDDEN: LayeredFeedback = Object.freeze({ shown: false, layer1: null, layer2: null, layer3: null, armRecord: null })

/** The feedback layers for a grade. */
export function layeredFeedback(grade: Grade, ctx: FeedbackContext): LayeredFeedback {
  if (ctx.mode === 'probe' && !ctx.final) return HIDDEN
  const verdict = grade.ok === null ? 'not graded' : grade.ok ? 'matched' : 'missed'
  const layer1: Layer1 = {
    verdict,
    text: grade.why,
    witness: grade.witness ?? null,
    class: grade.class ?? null,
    bound: grade.bound ?? COPY.none,
    basis: grade.basis,
    explanation: grade.ok === true ? (grade.note ?? null) : null,
  }

  let layer2: Layer2 | null = null
  let record: ArmRecord | null = null
  if (grade.ok === false && grade.misconception !== undefined && grade.note !== undefined) {
    const treatment = ctx.treatment ?? 'novice'
    let open = treatment === 'novice'
    let reason: Layer2Reason = treatment
    const arm = ctx.mode === 'practice' && ctx.arm?.applies === true && ctx.arm.comparison === NOTE_COMPARISON ? ctx.arm : null
    if (arm !== null) {
      if (treatment === 'novice' && ctx.solid !== true) {
        open = true
        reason = 'safeguard'
      } else {
        open = arm.arm === 'open'
        reason = 'arm'
      }
    }
    let fallback: string | undefined
    if (ctx.confidence === 'sure' && !open) {
      open = true
      reason = 'sure-miss'
      if (arm !== null) fallback = 'sure-miss: ASSESSMENT.md section 5.7 opens the note after a sure miss'
    }
    layer2 = { tag: grade.misconception, note: grade.note, open, reason }
    if (arm !== null) record = armRecord(arm, fallback)
  }

  const layer3: Layer3 | null =
    grade.ok === false && grade.misconception !== undefined && (ctx.priorMissesOnTag ?? 0) + 1 >= 2 ? { tag: grade.misconception, misses: (ctx.priorMissesOnTag ?? 0) + 1 } : null

  return { shown: true, layer1, layer2, layer3, armRecord: record }
}
