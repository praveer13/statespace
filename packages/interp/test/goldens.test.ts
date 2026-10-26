// GATE-interp: INS-interp against every kernel-checked golden of LAB-3's pool (labs/LAB-3/challenge/goldens.json),
// which labs/reference/mini-plinth/build_goldens.py computed from the Lean reference and kernel-checked. n is printed.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { canonical, execWith, parseProgram, REF_PROGRAM, typecheck } from '../src/index.ts'
import type { Call, Cmd, Outcome, Policy, Program, State, TypeOutcome } from '../src/index.ts'

const POOL = fileURLToPath(new URL('../../../labs/LAB-3/challenge/goldens.json', import.meta.url))

interface Golden {
  readonly pool: 'eval' | 'typing'
  readonly id: string
  readonly theorem: string
  readonly program?: string
  readonly policy?: Policy
  readonly pre?: State
  readonly call?: Call
  readonly outcome?: Outcome
  readonly command?: Cmd
  readonly verdict?: TypeOutcome
}

const pool = JSON.parse(readFileSync(POOL, 'utf8')) as { programs: (Program & { id: string })[]; goldens: Golden[] }

test('the toy-syntax reference program is the program the Lean reference exports', () => {
  const lean = pool.programs.find((p) => p.id === 'refProgram')!
  assert.equal(canonical({ commands: REF_PROGRAM.commands }), canonical({ commands: lean.commands }))
})

test('every evaluator golden: INS-interp gives the kernel-checked outcome', (t) => {
  const programs = new Map(pool.programs.map((p) => [p.id, p]))
  let n = 0
  for (const g of pool.goldens.filter((x) => x.pool === 'eval')) {
    const got = execWith(g.policy!, programs.get(g.program!)!, g.call!, g.pre!)
    assert.equal(canonical(got), canonical(g.outcome), `${g.theorem} under ${JSON.stringify(g.policy)}`)
    n++
  }
  t.diagnostic(`evaluator goldens agreed: ${n}`)
  assert.ok(n > 0)
})

test('every typing golden: INS-interp gives the kernel-checked verdict', (t) => {
  let n = 0
  for (const g of pool.goldens.filter((x) => x.pool === 'typing')) {
    assert.equal(canonical(typecheck(g.command!)), canonical(g.verdict), g.theorem)
    n++
  }
  t.diagnostic(`typing goldens agreed: ${n}`)
  assert.ok(n > 0)
})

test('the roadmap text parses verbatim', () => {
  const p = parseProgram('entity Account; command Transfer(from, to, amount); requires balance(from) >= amount; do move amount from from to to.')
  assert.equal(p.commands[0]!.params.map((x) => x.ty).join(','), 'account,account,amount')
})
