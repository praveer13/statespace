// The series: each stage is a numbered volume with its own cover ink (tokens.css --vol-<n>) and its own cover figure.
// The figure is chosen from what the stage is about, so a cover says something true about its volume. Pure data.

import type { Motif } from './CoverArt.tsx'

export interface Volume {
  /** The stage ID, S1 to S10. */
  readonly id: string
  /** The volume number printed on the spine. */
  readonly n: number
  readonly motif: Motif
  /** The cover ink, as a CSS value (tokens.css --vol-<n>). */
  readonly ink: string
}

const MOTIFS: readonly Motif[] = ['lattice', 'derivation', 'syntax', 'obligation', 'lasso', 'ladder', 'hasse', 'crash', 'square', 'strata']

/** The volume for a stage ID, or undefined for an ID outside S1–S10. */
export function volumeOf(stageId: string): Volume | undefined {
  const m = /^S(\d{1,2})$/.exec(stageId)
  if (m === null) return undefined
  const n = Number(m[1])
  const motif = MOTIFS[n - 1]
  if (motif === undefined) return undefined
  return { id: stageId, n, motif, ink: `var(--vol-${n})` }
}

/** "Counterexample (Z3Py)" → { name: "Counterexample", tools: "Z3Py" }. */
export function splitTitle(title: string): { readonly name: string; readonly tools: string } {
  const m = /^(.*?)\s*\((.*)\)\s*$/.exec(title)
  return m === null ? { name: title, tools: '' } : { name: m[1] ?? title, tools: m[2] ?? '' }
}
