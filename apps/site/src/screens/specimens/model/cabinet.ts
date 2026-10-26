// The cabinet as a screen shows it: the specimens a learner has mounted, in a drawer for each stage, filtered, with the
// counts of the chips and the re-find schedule (spine section 10.1: SCR-specimens; DESIGN.md SCR-specimens). Derived from
// the cabinet's evidence, the learner's events and the learner's local date, and stored nowhere (I2).
//
// A stage with no specimen yet keeps its drawer, labeled "none yet", and is never hidden. A specimen the learner has not
// met is not listed at all: its label would give away the lesson's calls, and a list of what is still to come would be a
// teaser (DESIGN.md SCR-audit: "no teasers").
//
// Pure: no DOM, storage or network, and no clock: the caller passes today in.

import type { LedgerEvent } from '@statespace/ledger'
import { buildLabel } from './label.ts'
import type { LabelView } from './label.ts'
import { refindSchedule, statesOf } from './status.ts'
import type { ScheduledRefind, SpecimenState } from './status.ts'
import type { Cabinet, CabinetEntry, CabinetStage } from './types.ts'

export type StatusFilter = 'all' | 'mounted' | 'kept' | 'incidents'
export const STATUS_FILTERS: readonly StatusFilter[] = ['all', 'mounted', 'kept', 'incidents']

export interface Filters {
  readonly show: StatusFilter
  /** A stage ID such as S1, or null for every stage. */
  readonly stage: string | null
  /** A KC ID, or null for every KC. */
  readonly kc: string | null
}

export const NO_FILTERS: Filters = { show: 'all', stage: null, kc: null }

export type Held = Exclude<SpecimenState, { status: 'unmet' }>

export interface Row {
  readonly entry: CabinetEntry
  readonly label: LabelView
  readonly state: Held
  readonly stage: string
}

export interface Drawer {
  readonly stage: CabinetStage
  readonly rows: readonly Row[]
  /** How many specimens the learner holds in this stage, whatever the filters hide: an empty drawer says "none yet" only when this is 0. */
  readonly held: number
}

export interface CabinetView {
  readonly drawers: readonly Drawer[]
  /** The chips' counts, over the stage and KC the learner picked. */
  readonly counts: Readonly<Record<StatusFilter, number>>
  readonly schedule: readonly ScheduledRefind[]
  /** The title of every specimen the learner holds, whatever the filters hide: the schedule links to them. */
  readonly titles: ReadonlyMap<string, string>
  /** The stages and KCs a filter can pick: those of the specimens the learner holds. */
  readonly stageOptions: readonly CabinetStage[]
  readonly kcOptions: readonly { readonly id: string; readonly name: string }[]
  /** Whether any specimen listed is an unreviewed draft (DESIGN.md section 6.15: the draft banner). */
  readonly anyDraft: boolean
  /** none-met: nothing is mounted yet. no-match: something is, and the filters hide all of it. */
  readonly empty: 'none-met' | 'no-match' | null
  readonly held: number
}

/** The stage a record belongs to: its SP-n.k, else its lab stage's lab, else its lesson's stage. Null when it names none. */
export function stageOf(entry: CabinetEntry): string | null {
  const r = entry.record
  const m = /^SP-([1-9][0-9]*)\./.exec(r.id) ?? /^LAB-([1-9][0-9]*)\./.exec(r.found_in.lab_stage ?? '') ?? /^S([1-9][0-9]*)\./.exec(r.found_in.lesson ?? '')
  return m === null ? null : `S${m[1]}`
}

const numbers = (id: string): number[] => (id.match(/[0-9]+/g) ?? []).map(Number)

/** Specimen IDs in the order of their numbers: SP-1.2 before SP-1.10. */
export function compareIds(a: string, b: string): number {
  const x = numbers(a)
  const y = numbers(b)
  for (let i = 0; i < Math.max(x.length, y.length); i += 1) {
    const d = (x[i] ?? 0) - (y[i] ?? 0)
    if (d !== 0) return d
  }
  return a < b ? -1 : a > b ? 1 : 0
}

const isHeld = (s: SpecimenState): s is Held => s.status !== 'unmet'

export function buildView(cabinet: Cabinet, events: readonly LedgerEvent[], today: string, filters: Filters = NO_FILTERS): CabinetView {
  const states = statesOf(events, cabinet.specimens.map((e) => ({ id: e.record.id, ...(e.record.mount === undefined ? {} : { mount: e.record.mount }) })))
  const held: Row[] = []
  for (const entry of cabinet.specimens) {
    const state = states.get(entry.record.id)
    const stage = stageOf(entry)
    if (state !== undefined && isHeld(state) && stage !== null) held.push({ entry, label: buildLabel(entry), state, stage })
  }
  held.sort((a, b) => compareIds(a.entry.record.id, b.entry.record.id))

  const picked = held.filter((r) => (filters.stage === null || r.stage === filters.stage) && (filters.kc === null || r.entry.record.kcs.includes(filters.kc)))
  const counts: Record<StatusFilter, number> = {
    all: picked.length,
    mounted: picked.filter((r) => r.state.status === 'mounted').length,
    kept: picked.filter((r) => r.state.status === 'kept').length,
    incidents: picked.filter((r) => r.entry.record.incident !== undefined).length,
  }
  const shown = picked.filter((r) => (filters.show === 'all' ? true : filters.show === 'incidents' ? r.entry.record.incident !== undefined : r.state.status === filters.show))

  const drawers: Drawer[] = cabinet.stages
    .filter((s) => filters.stage === null || s.id === filters.stage)
    .map((stage) => ({ stage, rows: shown.filter((r) => r.stage === stage.id), held: held.filter((r) => r.stage === stage.id).length }))

  const stageIds = new Set(held.map((r) => r.stage))
  const kcs = new Map<string, string>()
  for (const r of held) for (const kc of r.entry.record.kcs) kcs.set(kc, r.entry.kcNames[kc] ?? kc)

  return {
    drawers,
    counts,
    schedule: refindSchedule(states, today),
    titles: new Map(held.map((r) => [r.entry.record.id, r.label.title] as const)),
    stageOptions: cabinet.stages.filter((s) => stageIds.has(s.id)),
    kcOptions: [...kcs].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name) || (a.id < b.id ? -1 : 1)),
    anyDraft: shown.some((r) => r.label.draft),
    empty: held.length === 0 ? 'none-met' : shown.length === 0 ? 'no-match' : null,
    held: held.length,
  }
}
