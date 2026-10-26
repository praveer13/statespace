// SCR-assurance's model: the course's own claims, each stamp derived by packages/stamps from the raw output the claim
// records (content/assurance/course.json), never typed, by the same rules as a learner's. A red night (status/nightly.json,
// written by the nightly lane; ARCHITECTURE.md section 13.4) that names a gate backing a claim, directly or through the
// seam content/assurance/gate-claims.json ties it to, marks that claim "unverified since <date>" with no code change.

import { deriveStamp, type RawOutput, type Stamp } from '@statespace/stamps'
import course from '../../../../../content/assurance/course.json'
import gateClaims from '../../../../../content/assurance/gate-claims.json'

export interface CourseClaim {
  readonly id: string
  readonly section: string
  readonly seam?: string
  readonly text: string
  readonly raw: RawOutput
  readonly runs: readonly string[]
  readonly gates: readonly string[]
  readonly limit: string
}

export interface CourseErosion {
  readonly id: string
  readonly date: string
  readonly bump: string
  readonly kind: 'erosion' | 'rerun' | 'simulated'
  readonly text: string
  readonly touches: readonly string[]
  readonly runs: readonly string[]
}

interface CourseData {
  readonly sections: ReadonlyArray<{ readonly id: string; readonly title: string; readonly readme: string }>
  readonly claims: readonly CourseClaim[]
  readonly erosionLog: readonly CourseErosion[]
  readonly pins: ReadonlyArray<{ readonly tool: string; readonly pin: string; readonly detail: string; readonly runs: readonly string[] }>
  readonly cannot: readonly string[]
  readonly honor: string
  readonly expect: string
}

export const COURSE = course as unknown as CourseData

/** The nightly lane's status file, when the build has one: the night's date and the gates that failed. */
interface Nightly {
  readonly date?: string
  readonly failed?: ReadonlyArray<string | { readonly gate: string; readonly claims?: readonly string[] }>
}

const nightlyFiles = import.meta.glob<Nightly>('../../../../../status/nightly.json', { eager: true, import: 'default' })
export const NIGHTLY: Nightly | undefined = Object.values(nightlyFiles)[0]

const GATE_SEAMS = gateClaims as Record<string, readonly string[]>

export interface StampedClaim {
  readonly claim: CourseClaim
  readonly stamp: Stamp | null
  /** Why no stamp, when the raw output earns none. */
  readonly none?: string
  /** The date of the red night that touches it, if one does. */
  readonly unverifiedSince?: string
  readonly redGates: readonly string[]
}

export function stampedClaims(nightly: Nightly | undefined = NIGHTLY): StampedClaim[] {
  const failed = (nightly?.failed ?? []).map((f) => (typeof f === 'string' ? { gate: f, claims: [] as readonly string[] } : { gate: f.gate, claims: f.claims ?? [] }))
  return COURSE.claims.map((c) => {
    const d = deriveStamp(c.raw, { lane: 'reported', source: c.runs.join(', ') || c.id })
    const red = failed.filter((f) => c.gates.includes(f.gate) || f.claims.includes(c.id) || (c.seam !== undefined && (GATE_SEAMS[f.gate] ?? []).includes(c.seam)))
    const base = { claim: c, redGates: red.map((r) => r.gate), ...(red.length > 0 && nightly?.date !== undefined ? { unverifiedSince: nightly.date } : {}) }
    return d.kind === 'stamp' ? { ...base, stamp: d.stamp } : { ...base, stamp: null, none: d.kind === 'none' ? d.text : d.text }
  })
}
