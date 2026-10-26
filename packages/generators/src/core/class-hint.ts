// M-class-hint (spine section 7; ASSESSMENT.md section 4.1, Modes; BRIEF section 3.3): practice shows a witness
// together with its class, because a bare counterexample invites patching the one case shown [dantoni15];
// probes are one shot, with everything after submission; and a fix must also kill a non-minimal witness of the
// class, not only the witness shown.
//
// The mechanic reads its keep/kill arm, comparison 3 (keepkill.ts). The default arm, class-named, shows the
// witness and its class at once. The alternative, contrast-then-class, shows a second witness of the same class,
// which the family's engine certifies is in the class and differs from the first in structure, asks what the two
// share (ungraded; it writes no evidence) and shows the class once the learner answers or skips. Neither arm is
// counterexample-only. When the alternative cannot be built, the default is shown and the record says why.
//
// Pure: no DOM, storage or network.

import { COPY } from './copy.ts'
import { armRecord, CLASS_COMPARISON } from './keepkill.ts'
import type { ArmReading, ArmRecord } from './keepkill.ts'
import type { Json, Mode, WitnessClass } from './types.ts'

/** The arms of comparison 3, the default first. */
export const CLASS_ARMS = ['class-named', 'contrast-then-class'] as const

export type ClassHintStep =
  | { readonly kind: 'witness'; readonly witness: Json }
  | { readonly kind: 'second-witness'; readonly witness: Json }
  | { readonly kind: 'compare'; readonly prompt: string; readonly graded: false }
  | { readonly kind: 'class'; readonly class: WitnessClass; readonly after: 'at-once' | 'answer-or-skip' }

export interface ClassHintPlan {
  /** False for a probe before its final submission. */
  readonly shown: boolean
  readonly steps: readonly ClassHintStep[]
  /** The arm record the item's event carries in data.keepkill, when comparison 3 governed the display. */
  readonly armRecord: ArmRecord | null
}

export interface ClassHintInput {
  readonly mode: Mode
  /** True once the whole item is submitted. */
  readonly final: boolean
  /** The witness the learner met: theirs, or the one the checker found. */
  readonly witness: Json
  readonly class: WitnessClass
  /** Comparison 3's reading for the item's primary KC (readArm). */
  readonly arm?: ArmReading
  /**
   * Builds the alternative arm's second witness: in the class, and different from the first in structure, as
   * the family's engine certifies; null when it cannot (the checker undecided, or no such witness in scope).
   */
  readonly second?: () => Promise<Json | null>
}

/** The steps that show a witness and its class, under the arm that governs them. */
export async function classHintPlan(input: ClassHintInput): Promise<ClassHintPlan> {
  if (input.mode === 'probe' && !input.final) return { shown: false, steps: [], armRecord: null }
  const named: ClassHintStep[] = [
    { kind: 'witness', witness: input.witness },
    { kind: 'class', class: input.class, after: 'at-once' },
  ]
  // Probes keep one shot and the default display in both arms (the rules' comparison 3, "manipulated").
  const arm = input.mode === 'practice' && input.arm?.applies === true && input.arm.comparison === CLASS_COMPARISON ? input.arm : null
  if (arm === null) return { shown: true, steps: named, armRecord: null }
  if (arm.arm !== 'contrast-then-class') return { shown: true, steps: named, armRecord: armRecord(arm) }
  const second = input.second === undefined ? null : await input.second()
  if (second === null) return { shown: true, steps: named, armRecord: armRecord(arm, 'no certified second witness of the class') }
  return {
    shown: true,
    steps: [
      { kind: 'witness', witness: input.witness },
      { kind: 'second-witness', witness: second },
      { kind: 'compare', prompt: COPY.comparePrompt, graded: false },
      { kind: 'class', class: input.class, after: 'answer-or-skip' },
    ],
    armRecord: armRecord(arm),
  }
}

/**
 * "A fix must also kill a non-minimal witness" (M-class-hint; LAB-1.4): a fix matches only when it kills the
 * witness shown and a non-minimal witness of the same class drawn at grade time. `kills` replays a witness
 * against the fixed artifact; an undecided replay leaves the fix ungraded.
 */
export async function fixKillsClass(args: {
  readonly kills: (witness: Json) => Promise<boolean | 'unknown'>
  readonly shown: Json
  readonly nonMinimal: Json
}): Promise<{ readonly ok: boolean | null; readonly survivors: readonly Json[] }> {
  const results = [await args.kills(args.shown), await args.kills(args.nonMinimal)]
  if (results.includes('unknown')) return { ok: null, survivors: [] }
  const survivors = [args.shown, args.nonMinimal].filter((_, i) => results[i] === false)
  return { ok: survivors.length === 0, survivors }
}
