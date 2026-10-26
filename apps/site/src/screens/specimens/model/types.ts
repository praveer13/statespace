// The shapes of the specimen cabinet: the evidence a label is generated from, and the cabinet the site loads.
//
// A specimen record (schemas/specimen.schema.json) holds pointers to runs; the build resolves each pointer to the
// lines of the run it names (`resolveEvidence`, evidence.ts) and writes the result into the cabinet
// (data/cabinet.generated.json). The browser derives the label, the stamp and the status from that evidence and
// from the learner's events at read time, and stores none of them (I2). Pure types: nothing here runs.

import type { Specimen } from '@statespace/schema'

export type { Specimen }

/** What the label and a run chip say of a cited run: its id, the engine and version as it recorded them, and its date. */
export interface RunFacts {
  readonly id: string
  readonly engine: string
  readonly version: string
  /** The day the run executed, or the day it was recorded when it does not say (the run chip's rule); null when neither is known. */
  readonly date: string | null
  /** The run's own rlimit (budget.rlimit), which the stamp of an unknown prints; null when the run set none. */
  readonly rlimit: number | null
}

/** The lines of one query of one run, verbatim: its verdict line and the indented lines that continue it. */
export interface Block {
  readonly run: string
  readonly query: string
  readonly lines: readonly string[]
}

export interface MainEvidence extends Block {
  readonly direction: 'violation' | 'premise'
  /** The premise query beside a violation query's unsat. */
  readonly premise?: Block
  /** Where the witness replays, when the query's own lines do not say it. */
  readonly replay?: Block
}

export interface AlsoEvidence extends Block {
  readonly caption: string
  readonly replay?: Block
}

export type MinimalEvidence =
  | { readonly kind: 'optimize'; readonly objective: string; readonly block: Block; readonly confirm?: Block }
  | { readonly kind: 'core'; readonly block: Block; /** The constraints of the core in words, from the run's own values; empty when it records none. */ readonly constraints: readonly string[] }
  | { readonly kind: 'none' }
  | { readonly kind: 'not-applicable'; readonly why: string }

export interface Evidence {
  /** Every run the label draws on, by id. */
  readonly runs: Readonly<Record<string, RunFacts>>
  readonly main: MainEvidence
  readonly also: readonly AlsoEvidence[]
  readonly minimal: MinimalEvidence
}

/** One specimen of the cabinet: the record as authored, the evidence resolved from its runs, and the record's revision. */
export interface CabinetEntry {
  readonly record: Specimen
  readonly evidence: Evidence
  /** SHA-256 over the record's canonical JSON: the label's Rev. */
  readonly rev: string
  /** The names of the record's KCs, in words (the label shows a KC by its name). */
  readonly kcNames: Readonly<Record<string, string>>
}

export interface CabinetStage {
  readonly id: string
  readonly title: string
}

/** What the site loads: the stages (every one, so an empty drawer shows) and the specimens, in the order of their IDs. */
export interface Cabinet {
  readonly format: 'cabinet/1'
  readonly stages: readonly CabinetStage[]
  readonly specimens: readonly CabinetEntry[]
}

/** The part of a run record the resolver reads; run@1 types the rest (schemas/run.schema.json). */
export interface RunLike {
  readonly id: string
  readonly engine?: string
  readonly version?: string
  readonly started_at?: string | null
  readonly recorded_at?: string
  readonly budget?: { readonly rlimit?: unknown } & Readonly<Record<string, unknown>>
  readonly verdict_lines?: readonly string[]
  readonly values?: unknown
}

/** Where the resolver finds runs: the registry on disk for the build, a receipt's runs for a learner's own specimen. */
export interface RunSource {
  get(id: string): RunLike | undefined
}
