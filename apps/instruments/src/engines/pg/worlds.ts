// The worlds a cell can name, loaded before its code as the recorded run's prelude was. Each file is a byte-for-byte
// copy of the recorded run's input under runs/inputs/S7/ (the SHA-256 below is the one its run record lists), so
// the tab runs the cell against the same world as the Bench did. A cell names a world by id; it never sends SQL
// for the prelude.

import noReadPolicies from './worlds/S7.L4-world-no-read-policies.sql?raw'
import allPolicies from './worlds/S7.L4-world-all-policies.sql?raw'

export interface PgWorld {
  readonly id: string
  /** The recorded run input this file copies, and its SHA-256 there. */
  readonly source: string
  readonly sha256: string
  readonly sql: string
}

export const PG_WORLDS: Readonly<Record<string, PgWorld>> = {
  'S7.L4-world-no-read-policies': {
    id: 'S7.L4-world-no-read-policies',
    source: 'runs/inputs/S7/RUN-pg-rls-semantics/world-no-read-policies.sql',
    sha256: '82bbec5cc7762c0acec024f73a419fa27dfeb8dec56af4958700e0cdf7c867e9',
    sql: noReadPolicies,
  },
  'S7.L4-world-all-policies': {
    id: 'S7.L4-world-all-policies',
    source: 'runs/inputs/S7/RUN-pg-rls-owner/world-all-policies.sql',
    sha256: '0ed3d43ff8e641b45763711cd0f308577052b9d78806a96b2a02358693bda975',
    sql: allPolicies,
  },
}
