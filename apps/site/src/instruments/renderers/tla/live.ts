// The live entries for TLA+ cells: INS-spectacle (the explorer) and, for its cells that hold a whole module,
// INS-theater. Both run Spectacle 5827c22 on the instrument origin behind the course's TLC-order search. A Theater
// figure still shows its recorded TLC run first; the live run under it is labelled as run in this tab.
//
// Budget: DECISIONS.md Log item 56 gives learner edits a 10 s wall-clock budget in the worker, with no state cap.
// The worker keeps 3 s of the watchdog for its reply, so a 13 s watchdog leaves the search its full 10 s.

import type { Budget } from '../../protocol.ts'
import type { LiveInstrument } from '../../registry.ts'
import { TlaOutput } from './TlaOutput.tsx'

const WALL_MS = 13_000
const engineSeconds = (b: Budget): number => Math.max(1, Math.min(10, Math.floor((b.wallMs - 3_000) / 1000)))

/** Modules Spectacle carries itself; any other EXTENDS target is a course module the tab cannot load yet. */
const STANDARD = new Set(['Naturals', 'Integers', 'Sequences', 'FiniteSets', 'TLC', 'Bags'])

/** Why a TLA+ cell cannot run in the tab as written, or null when it can (checked on the course's text). */
export function tlaRecordedOnly(code: string): string | null {
  if (!/^\s*-{4,}\s*MODULE\s+\w+/m.test(code)) return 'this cell is part of a module, not a whole one'
  const ext = /^\s*EXTENDS\s+([^\n]*)/m.exec(code)
  const course = (ext?.[1] ?? '').replace(/\\\*.*$/, '').split(',').map((s) => s.trim()).filter((s) => s !== '' && !STANDARD.has(s))
  if (course.length > 0) return `this module EXTENDS ${course.join(', ')}, a course module the tab cannot load yet`
  const cons = /^\s*CONSTANTS?\s+([^\n]*)/m.exec(code)
  const names = (cons?.[1] ?? '').replace(/\\\*.*$/, '').split(',').map((s) => s.trim()).filter((s) => s !== '')
  const given = (name: string): boolean => new RegExp(`^\\s*\\\\\\*.*\\b${name}\\s*=`, 'm').test(code)
  const missing = names.filter((c) => !given(c))
  if (missing.length > 0) return `this cell gives no value for ${missing.join(', ')}`
  return null
}

const base = {
  engine: 'spectacle',
  version: '5827c22',
  name: 'Spectacle',
  lang: 'tla',
  budget: { wallMs: WALL_MS },
  input: (code: string) => ({ code }),
  budgetLine: (b: Budget) => `wall-clock budget ${engineSeconds(b)} s`,
  Output: TlaOutput,
  recordedOnly: tlaRecordedOnly,
} as const

export const SPECTACLE_LIVE: LiveInstrument = { ...base, ins: 'INS-spectacle' }
export const THEATER_LIVE: LiveInstrument = { ...base, ins: 'INS-theater' }
