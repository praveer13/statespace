// Live instruments by `ins` id: what a lesson cell needs to run its code on the instrument origin. A cell whose
// `ins` is listed here gets live mode (an editable code area, Run, Stop, Reset, and the engine's output streamed
// into the result panel); every other cell keeps its recorded run alone.
//
// To plug in an engine on the site: add an entry keyed by its INS id. `engine` and `version` must equal the
// instruments build's registry (apps/instruments/src/engines/registry.ts), or the host answers version-mismatch.
// `input` turns the cell's text into the engine's `run.input`; `Output`, when given, replaces the default
// text renderer for the reply (it must render through text APIs only, section 5.7).

import type { ComponentType } from 'react'
import type { Budget, RunReply } from './protocol.ts'
import { PG_LIVE } from './renderers/pg/live.ts'
import { DatalogOutput } from './renderers/datalog/DatalogOutput.tsx'
import { GoalReplayOutput } from './renderers/goal/GoalStepper.tsx'
import { DerivationBoard } from './renderers/derivation/DerivationBoard.tsx'
import { SPECTACLE_LIVE, THEATER_LIVE } from './renderers/tla/live.ts'

export interface LiveInstrument {
  readonly ins: string
  /** The bus engine id. */
  readonly engine: string
  /** The one version the instruments build pins for that engine. */
  readonly version: string
  /** How the cell names the engine: "Z3". */
  readonly name: string
  /** The code language the cell's text is in; only cells in this language run live. */
  readonly lang: string
  readonly budget: Budget
  readonly input: (code: string) => unknown
  /** The budget as the result label prints it (I10). */
  readonly budgetLine: (b: Budget) => string
  readonly Output?: ComponentType<{ readonly reply: RunReply }>
  /**
   * Why a cell of this instrument keeps its recorded run alone, or null when it runs live. A cell the engine
   * cannot run as written (a fragment of a module, a module that EXTENDS a course module, a cell with no recorded
   * goals) says so in a sentence instead of offering a Run that could only fail.
   */
  readonly recordedOnly?: (code: string, at: CellAt) => string | null
}

/** Where a cell sits: its lesson and its cell number. */
export interface CellAt {
  readonly lesson: string
  readonly cell: number
}

const n = (x: number): string => x.toLocaleString('en-US')

export const LIVE_INSTRUMENTS: Readonly<Record<string, LiveInstrument>> = {
  'INS-z3': {
    ins: 'INS-z3',
    engine: 'z3',
    version: '5.3.1',
    name: 'Z3',
    lang: 'python',
    // W0-S02 section 5.2: the watchdog is twice the slowest run this rlimit allows on the reference profile, and
    // at least 10 s; for an rlimit of 5,000,000 that is 14.0 s [D].
    budget: { rlimit: 5_000_000, wallMs: 14_000 },
    input: (code) => ({ code }),
    budgetLine: (b) => (b.rlimit !== undefined ? `rlimit ${n(b.rlimit)}` : ''),
  },
  'INS-datalog': {
    ins: 'INS-datalog',
    engine: 'datalog',
    version: '5.3.1',
    name: 'Z3 Fixedpoint',
    lang: 'datalog',
    // No engine budget: rlimit and timeout do not bound a Fixedpoint join (W0-S03 section 4.5). The watchdog is
    // the stop; the 125,000-tuple join took 1.31 s in Chromium. W4-T07 calibrates the printed cap.
    budget: { wallMs: 14_000 },
    input: (code) => ({ code }),
    budgetLine: (b) => `watchdog ${n(b.wallMs / 1000)} s`,
    Output: DatalogOutput,
  },
  'INS-goal-replay': {
    ins: 'INS-goal-replay',
    engine: 'goal-replay',
    version: '4.35.0',
    name: 'Goal Replay',
    lang: 'lean',
    // No Lean in the tab: the worker looks the cell's text up in RUN-goal-replay's strips. The watchdog only guards
    // the 7 kB first load and a lookup.
    budget: { wallMs: 10_000 },
    input: (code) => ({ code }),
    budgetLine: () => 'goals from Lean at build time',
    Output: GoalReplayOutput,
    // RUN-goal-replay holds the strips of the S2 and S3 cells only; the S9 cells are not in it yet.
    recordedOnly: (_code, at) => (/^S[23]\./.test(at.lesson) ? null : 'RUN-goal-replay has no goal strips for this lesson yet'),
  },
  'INS-derivation': {
    ins: 'INS-derivation',
    engine: 'derivation',
    version: '5.3.1',
    name: 'Z3',
    lang: 'text',
    // One Z3 query per step, each with INS-z3's rlimit; a board has a handful of steps, so the watchdog covers
    // several of INS-z3's 14 s runs.
    budget: { rlimit: 5_000_000, wallMs: 30_000 },
    input: (code) => ({ code }),
    budgetLine: (b) => (b.rlimit !== undefined ? `rlimit ${n(b.rlimit)} per step` : ''),
    Output: DerivationBoard,
  },
  'INS-pglite': PG_LIVE,
  'INS-spectacle': SPECTACLE_LIVE,
  'INS-theater': THEATER_LIVE,
}

export const liveInstrument = (ins: string, lang: string | undefined): LiveInstrument | undefined => {
  const live = LIVE_INSTRUMENTS[ins]
  return live !== undefined && (lang === undefined || lang === live.lang) ? live : undefined
}

/**
 * The live engine for one cell, or why the cell keeps its recorded run alone. `reason` is set only when the
 * cell's instrument has a live engine and this cell is left out; a cell of an instrument with no live engine (the
 * Bench, the interpreters, the pair and history views) gets neither.
 */
export function liveCell(ins: string, lang: string | undefined, code: string, at: CellAt): { readonly live?: LiveInstrument; readonly reason?: string } {
  const entry = LIVE_INSTRUMENTS[ins]
  if (entry === undefined) return {}
  if (lang !== entry.lang) return { reason: `this cell is ${lang ?? 'prose'}, and ${entry.name} runs ${entry.lang} here` }
  const reason = entry.recordedOnly?.(code, at) ?? null
  return reason === null ? { live: entry } : { reason }
}
