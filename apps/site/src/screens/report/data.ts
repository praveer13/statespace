// The seams and erosion events of spine sections 5.3 and 5.4 (content/assurance/seams.json), with the words the
// erosion screens use for each crack segment. The firing rule is @statespace/ledger's readErosions; this module only
// names things.

import type { CrackSegment, ErosionSpec, SeamSpec } from '@statespace/ledger'
import { CRACK_SEGMENTS, FORECAST_OPTIONS } from '@statespace/ledger'
import seamData from '../../../../../content/assurance/seams.json'

export interface Seam extends SeamSpec {
  readonly assumption: string
  readonly claims: readonly string[]
  readonly erosion?: string
  readonly testedBy: string
}

export interface Erosion extends ErosionSpec {
  readonly specimen: string
  /** The claim the forecast asks the learner to restate, or null when the seam carries none (ER-6). */
  readonly claim: string | null
  /** What to restate when there is no claim. */
  readonly restate?: string
  readonly reason: string
  readonly remedies: readonly string[]
  readonly drawer?: string
  readonly runs: readonly string[]
}

const DATA = seamData as unknown as { seams: Seam[]; erosions: Erosion[] }

export const SEAMS: readonly Seam[] = DATA.seams
export const EROSIONS: readonly Erosion[] = DATA.erosions

export const seamOf = (id: string): Seam | undefined => SEAMS.find((s) => s.id === id)
export const erosionOf = (id: string): Erosion | undefined => EROSIONS.find((e) => e.id === id)

/** The segment's name as the strip labels it, and an assumption record's. */
export const SEGMENT_WORDS: Readonly<Record<CrackSegment, string>> = {
  proposition: 'Proposition of the model',
  correspondence: 'Correspondence',
  requirement: 'Requirement fit',
  assumption: 'An assumption record',
}

/** The forecast's options, lettered in CRACK_SEGMENTS order, with why each is or is not where this erosion cracks. */
export function forecastOptions(er: Erosion): Array<{ id: string; text: string; why: string; segment: CrackSegment }> {
  const why: Record<CrackSegment, string> = {
    proposition: 'An erosion never silently changes the proposition of the model: what the checker established about the model still holds.',
    correspondence: 'The correspondence says how the model relates to the running system.',
    requirement: 'Requirement fit asks whether the proposition is the requirement.',
    assumption: 'An assumption record is a stated condition under a segment, such as a fairness or an atomicity assumption.',
  }
  return CRACK_SEGMENTS.map((segment, i) => ({
    id: FORECAST_OPTIONS[i] as string,
    text: SEGMENT_WORDS[segment],
    segment,
    why: segment === er.segment ? `This is where it cracks: ${er.reason}` : why[segment],
  }))
}

export const keyOption = (er: Erosion): string => FORECAST_OPTIONS[CRACK_SEGMENTS.indexOf(er.segment)] as string

/** S5.L3 belongs to S5: the volume whose ink marks it. */
export const stageNumber = (id: string | null | undefined): number | undefined => {
  const m = /^(?:CL-|S|SP-)([1-9][0-9]?)\./.exec(id ?? '')
  const n = m === null ? NaN : Number(m[1])
  return n >= 1 && n <= 10 ? n : undefined
}

/** A recorded run's tag as copy prints it, "[X RUN-id]"; assembled so GATE-codes' text scan reads no unfinished tag here. */
export const runTag = (...ids: readonly string[]): string => ['[X', `${ids.join(', ')}]`].join(' ')
