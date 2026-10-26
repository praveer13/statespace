// INS-pglite's run input: { code: string, world?: <a world id> }. The code is SQL the course authored or the
// learner typed into the cell (section 5.7); the world, when named, is one of the course's own fixtures.

import { LIMITS, byteLength } from '../../bus/protocol.ts'

export const PG_WORLD_IDS: readonly string[] = ['S7.L4-world-no-read-policies', 'S7.L4-world-all-policies']

export interface PgInput {
  readonly code: string
  readonly world?: string
}

export function checkPgInput(input: unknown): { code: 'invalid-input' | 'too-large'; detail: string } | null {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) return { code: 'invalid-input', detail: 'input must be {code: string, world?: string}' }
  const o = input as Record<string, unknown>
  const keys = Object.keys(o)
  if (typeof o.code !== 'string' || keys.some((k) => k !== 'code' && k !== 'world')) return { code: 'invalid-input', detail: 'input must be {code: string, world?: string}' }
  if (o.world !== undefined && (typeof o.world !== 'string' || !PG_WORLD_IDS.includes(o.world))) return { code: 'invalid-input', detail: `input.world must be one of ${PG_WORLD_IDS.join(', ')}` }
  if (byteLength(o.code) > LIMITS.textInputBytes) return { code: 'too-large', detail: `input above ${LIMITS.textInputBytes} bytes` }
  return null
}
