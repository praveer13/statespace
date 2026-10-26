// INS-pglite on the site: a lesson's SQL cell runs on PGlite 0.5.11 (PostgreSQL 18.6) on the instrument origin,
// one session on one connection. A cell written against S7.L4's template world (it opens with
// `SET search_path = app`) names that world, and the worker loads the recorded run's own prelude before the code:
// the world without the read policies when the cell creates them, the world with every policy otherwise.

import type { LiveInstrument } from '../../registry.ts'
import { PgOutput } from './PgOutput.tsx'

/** The world a cell's SQL is written against, by the same test the recorder used to pick its prelude. */
export function pgWorld(code: string): string | undefined {
  if (!/^\s*SET\s+search_path\s*=\s*app\b/im.test(code)) return undefined
  return /CREATE\s+POLICY\s+read_team\b/i.test(code) ? 'S7.L4-world-no-read-policies' : 'S7.L4-world-all-policies'
}

export const PG_LIVE: LiveInstrument = {
  ins: 'INS-pglite',
  engine: 'pglite',
  version: '0.5.11',
  name: 'PGlite',
  lang: 'sql',
  // No engine budget: the watchdog is the stop. A lesson cell runs in milliseconds on a live instance and the
  // 200-world RLS differential took 1.3 s in Chromium [X RUN-pglite-rls]; 10 s covers a slow laptop [D].
  budget: { wallMs: 10_000 },
  input: (code) => {
    const world = pgWorld(code)
    return world === undefined ? { code } : { code, world }
  },
  budgetLine: (b) => `watchdog ${(b.wallMs / 1000).toLocaleString('en-US')} s`,
  Output: PgOutput,
}
