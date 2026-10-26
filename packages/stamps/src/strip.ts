// M-assurance-strip: every claim renders three segments, proposition of the model · correspondence · requirement
// fit, each with one primary stamp; requirement fit is never [P] (spine section 5.2; DESIGN.md section 5.6). A
// claim never collapses to one stamp. An agent's claim gets no strip at all: it renders as quoted UNREVIEWED
// text (I8). Pure.

import { spokenName } from './format.ts'
import type { Defeater, Derivation, Stamp } from './types.ts'

export const STRIP_SEGMENTS = ['proposition', 'correspondence', 'requirement'] as const
export type StripSegment = (typeof STRIP_SEGMENTS)[number]

/** The 12-px labels that head each segment (DESIGN.md section 5.6). */
export const SEGMENT_LABELS: Readonly<Record<StripSegment, string>> = {
  proposition: 'Proposition of the model',
  correspondence: 'Correspondence',
  requirement: 'Requirement fit',
}

/** An assumption a segment rests on: drawn as a dashed tick on the segment's edge, linked to its record. */
export interface StripAssumption {
  readonly text: string
  readonly seam?: string
}

export interface StripCell {
  /** The segment's one primary stamp; null while it is pending. */
  readonly primary: Stamp | null
  /** For a Lean result with sorryAx or a custom axiom: "PROVED modulo k assumed lemmas", never a [P]. */
  readonly modulo?: string
  /** Supporting stamps, which stack under the strip and show in it as a "+n" disclosure. */
  readonly supporting: readonly Stamp[]
  /** Open defeaters, which stack under the segment: those of the primary stamp, then any given. */
  readonly defeaters: readonly Defeater[]
  readonly assumptions: readonly StripAssumption[]
}

export interface Strip {
  /** The claim's ID or the learner's local id. */
  readonly claim: string
  /** The short proposition, as the claim card's header names it. */
  readonly title: string
  readonly cells: Readonly<Record<StripSegment, StripCell>>
}

export interface SegmentInput {
  /** A derivation from `deriveStamp`, or a stamp already derived. */
  readonly primary?: Derivation | Stamp | null
  readonly supporting?: readonly Stamp[]
  readonly defeaters?: readonly Defeater[]
  readonly assumptions?: readonly StripAssumption[]
}

export interface StripInput {
  readonly claim: string
  readonly title: string
  /** True for a card from proposals/: an agent's claim is never stamped (I8). */
  readonly agent?: boolean
  readonly proposition?: SegmentInput
  readonly correspondence?: SegmentInput
  readonly requirement?: SegmentInput
}

export type StripResult = { readonly ok: true; readonly strip: Strip } | { readonly ok: false; readonly problems: readonly string[] }

const isDerivation = (x: Derivation | Stamp): x is Derivation => 'kind' in x

function cellOf(seg: SegmentInput | undefined): { cell: StripCell; problems: string[] } {
  const problems: string[] = []
  let primary: Stamp | null = null
  let modulo: string | undefined
  let supporting: Stamp[] = [...(seg?.supporting ?? [])]
  const p = seg?.primary ?? null
  if (p !== null) {
    if (!isDerivation(p)) primary = p
    else if (p.kind === 'stamp') primary = p.stamp
    else if (p.kind === 'modulo') {
      modulo = p.text
      supporting = [...p.assumed, ...supporting]
    } else problems.push(`no stamp to show: ${p.text}`)
  }
  const defeaters = [...(primary?.defeaters ?? []), ...(seg?.defeaters ?? [])]
  const cell: StripCell = { primary, supporting, defeaters, assumptions: [...(seg?.assumptions ?? [])] }
  return { cell: modulo === undefined ? cell : { ...cell, modulo }, problems }
}

/**
 * Whether a requirement-fit cell holds a PROVED reading: [P] as its primary or a supporting stamp, or a Lean result
 * read "PROVED modulo k assumed lemmas". A checker's proof establishes the proposition, never that the proposition is
 * the requirement, so requirement fit is never PROVED in any form (spine section 5.2; DESIGN.md section 5.6). The
 * strip component asks the same question before it draws.
 */
export function provedInRequirement(cell: StripCell): boolean {
  return cell.primary?.code === '[P]' || cell.supporting.some((s) => s.code === '[P]') || cell.modulo !== undefined
}

/**
 * Build a claim's strip. It refuses an agent's claim (I8) and a requirement-fit segment holding [P], primary or
 * supporting, or a "PROVED modulo" reading (spine section 5.2; GATE-stamps).
 */
export function buildStrip(input: StripInput): StripResult {
  if (input.agent) return { ok: false, problems: ["an agent's claim is never stamped (I8): render it as quoted UNREVIEWED text"] }
  const problems: string[] = []
  const cells = {} as Record<StripSegment, StripCell>
  for (const segment of STRIP_SEGMENTS) {
    const { cell, problems: p } = cellOf(input[segment])
    cells[segment] = cell
    for (const msg of p) problems.push(`${SEGMENT_LABELS[segment]}: ${msg}`)
  }
  const req = cells.requirement
  if (req.primary?.code === '[P]' || req.supporting.some((s) => s.code === '[P]')) {
    problems.push('Requirement fit is never [P]: a checker establishes the proposition, never that it is the requirement')
  }
  if (req.modulo !== undefined) {
    problems.push(`Requirement fit is never PROVED, so not "${req.modulo}" either: a checker's proof establishes the proposition, never that it is the requirement`)
  }
  if (problems.length > 0) return { ok: false, problems }
  return { ok: true, strip: { claim: input.claim, title: input.title, cells } }
}

/**
 * The strip's accessible name (DESIGN.md section 5.9): "Claim CL-2.2, transfer non-negative. Proposition of the
 * model: Proved, code P: …. Correspondence: …. Requirement fit: …."
 */
export function stripSpokenName(strip: Strip): string {
  const segs = STRIP_SEGMENTS.map((s) => {
    const cell = strip.cells[s]
    const what = cell.primary ? spokenName(cell.primary) : (cell.modulo ?? 'pending')
    return `${SEGMENT_LABELS[s]}: ${what}.`
  })
  return [`Claim ${strip.claim}, ${strip.title}.`, ...segs].join(' ')
}
